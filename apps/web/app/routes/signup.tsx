import { Form, Link, redirect, useNavigation } from "react-router";
import { Button, Input, Panel } from "@iwfw/ui";
import { createAuth } from "@iwfw/auth";
import {
  createDb,
  organisations,
  memberships,
  platformRoles,
  eq,
} from "@iwfw/db";
import { getConfig, getEnv } from "../lib/env.server";
import { getOptionalAuth } from "../lib/session.server";
import {
  readAuthJson,
  redirectWithAuthCookies,
} from "../lib/auth-response.server";
import { newId } from "../lib/ids";
import { log } from "../lib/logger";
import type { Route } from "./+types/signup";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Sign up — iwantfreewebsite" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await getOptionalAuth(request, context);
  if (auth) throw redirect("/dashboard");
  return null;
}

export async function action({ request, context }: Route.ActionArgs) {
  const form = await request.formData();
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const tradingName = String(form.get("tradingName") ?? "").trim();

  if (!name || !email || !password || !tradingName) {
    return { error: "Please complete all fields." };
  }
  if (password.length < 10) {
    return { error: "Password must be at least 10 characters." };
  }

  try {
    const env = getEnv(context);
    const config = getConfig(context);
    const auth = createAuth(env.DB, config);

    const signUp = await auth.api.signUpEmail({
      body: { name, email, password },
      asResponse: true,
    });

    if (!signUp.ok) {
      const text = await signUp.text();
      log("warn", "signup_rejected", { body: text.slice(0, 200) });
      return { error: "Could not create account. Email may already be in use." };
    }

    const payload = await readAuthJson<{ user?: { id: string } }>(signUp);
    const userId = payload?.user?.id;
    if (!userId) {
      return { error: "Account created but user id missing. Please log in." };
    }

    const db = createDb(env.DB);
    const orgId = newId("org");
    await db.insert(organisations).values({
      id: orgId,
      tradingName,
      status: "prospect",
    });
    await db.insert(memberships).values({
      id: newId("mem"),
      organisationId: orgId,
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

    return redirectWithAuthCookies(signUp, "/dashboard/onboarding");
  } catch (error) {
    log("error", "signup_failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return { error: "Unable to sign up. Please try again." };
  }
}

export default function Signup({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      <h1 className="text-3xl font-bold">Create your account</h1>
      <p className="text-[var(--iwfw-muted)]">
        £39.99/month after checkout (Phase 2). No minimum contract.
      </p>
      <Panel>
        <Form method="post" className="space-y-4">
          <label className="block text-sm font-semibold">
            Your name
            <Input className="mt-1" name="name" required autoComplete="name" />
          </label>
          <label className="block text-sm font-semibold">
            Business / trading name
            <Input className="mt-1" name="tradingName" required />
          </label>
          <label className="block text-sm font-semibold">
            Email
            <Input
              className="mt-1"
              name="email"
              type="email"
              required
              autoComplete="email"
            />
          </label>
          <label className="block text-sm font-semibold">
            Password
            <Input
              className="mt-1"
              name="password"
              type="password"
              required
              minLength={10}
              autoComplete="new-password"
            />
          </label>
          {actionData?.error && (
            <p className="text-sm text-[var(--iwfw-danger)]">{actionData.error}</p>
          )}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Creating…" : "Create account"}
          </Button>
        </Form>
      </Panel>
      <p className="text-sm text-[var(--iwfw-muted)]">
        Already have an account?{" "}
        <Link className="font-semibold text-[var(--iwfw-accent)]" to="/login">
          Log in
        </Link>
      </p>
    </main>
  );
}
