import { createAuth } from "@iwfw/auth";
import {
  createDb,
  organisations,
  memberships,
  platformRoles,
  eq,
} from "@iwfw/db";
import type { WorkerEnvConfig } from "@iwfw/config";
import { newId } from "./ids";
import { log } from "./logger";
import { readAuthJson } from "./auth-response.server";

type EnvWithDb = { DB: D1Database };

export type RegisterCustomerInput = {
  name: string;
  email: string;
  password: string;
  tradingName: string;
};

export type RegisterCustomerResult =
  | { ok: true; response: Response; userId: string; organisationId: string }
  | { ok: false; error: string };

/** Create Better Auth user + prospect organisation + membership. */
export async function registerCustomer(
  env: EnvWithDb,
  config: WorkerEnvConfig,
  input: RegisterCustomerInput,
): Promise<RegisterCustomerResult> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const tradingName = input.tradingName.trim();

  if (!name || !email || !password || !tradingName) {
    return { ok: false, error: "Please complete all fields." };
  }
  if (password.length < 10) {
    return { ok: false, error: "Password must be at least 10 characters." };
  }

  try {
    const auth = createAuth(env.DB, config);
    const signUp = await auth.api.signUpEmail({
      body: { name, email, password },
      asResponse: true,
    });

    if (!signUp.ok) {
      const text = await signUp.text();
      log("warn", "signup_rejected", { body: text.slice(0, 200) });
      return {
        ok: false,
        error: "Could not create account. Email may already be in use.",
      };
    }

    const payload = await readAuthJson<{ user?: { id: string } }>(signUp);
    const userId = payload?.user?.id;
    if (!userId) {
      return {
        ok: false,
        error: "Account created but user id missing. Please log in.",
      };
    }

    const db = createDb(env.DB);
    const organisationId = newId("org");
    await db.insert(organisations).values({
      id: organisationId,
      tradingName,
      status: "prospect",
    });
    await db.insert(memberships).values({
      id: newId("mem"),
      organisationId,
      userId,
      role: "customer",
    });

    if (
      config.BOOTSTRAP_OWNER_EMAIL &&
      config.BOOTSTRAP_OWNER_EMAIL.toLowerCase() === email
    ) {
      const existing = await db
        .select()
        .from(platformRoles)
        .where(eq(platformRoles.userId, userId))
        .get();
      if (!existing) {
        await db.insert(platformRoles).values({
          id: newId("role"),
          userId,
          role: "platform_owner",
        });
        log("info", "bootstrap_owner_granted", { userId });
      }
    }

    return { ok: true, response: signUp, userId, organisationId };
  } catch (error) {
    log("error", "signup_failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return { ok: false, error: "Unable to sign up. Please try again." };
  }
}
