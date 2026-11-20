import { Form, Link, redirect, useNavigation } from "react-router";
import { Button, Input, Panel } from "@iwfw/ui";
import { createAuth } from "@iwfw/auth";
import { createDb, eq, platformRoles } from "@iwfw/db";
import { getConfig, getEnv } from "../lib/env.server";
import { getOptionalAuth } from "../lib/session.server";
import {
  readAuthJson,
  redirectWithAuthCookies,
} from "../lib/auth-response.server";
import { newId } from "../lib/ids";
import { log } from "../lib/logger";
import type { Route } from "./+types/login";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Log in — iwantfreewebsite" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await getOptionalAuth(request, context);
  if (auth) throw redirect("/dashboard");
  return null;
}

export async function action({ request, context }: Route.ActionArgs) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");

  try {
    const env = getEnv(context);
    const config = getConfig(context);
    const auth = createAuth(env.DB, config);
    const result = await auth.api.signInEmail({
      body: { email, password },
      asResponse: true,
    });

    if (!result.ok) {
      return { error: "Invalid email or password." };
    }

    // Local/staging bootstrap: grant platform_owner if email matches and no role yet.
    if (config.BOOTSTRAP_OWNER_EMAIL) {
      const payload = await readAuthJson<{ user?: { id: string; email?: string } }>(
        result,
      );
      const userId = payload?.user?.id;
      const userEmail = (payload?.user?.email ?? email).toLowerCase();
      if (
        userId &&
        userEmail === config.BOOTSTRAP_OWNER_EMAIL.toLowerCase()
      ) {
        const db = createDb(env.DB);
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
          log("info", "bootstrap_owner_granted_on_login", { userId });
        }
      }
    }

    return redirectWithAuthCookies(result, "/dashboard");
  } catch (error) {
    log("error", "login_failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return { error: "Unable to log in. Please try again." };
  }
}

export default function Login({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      <h1 className="text-3xl font-bold">Log in</h1>
      <Panel>
        <Form method="post" className="space-y-4">
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
              autoComplete="current-password"
              minLength={10}
            />
          </label>
          {actionData?.error && (
            <p className="text-sm text-[var(--iwfw-danger)]">{actionData.error}</p>
          )}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Signing in…" : "Log in"}
          </Button>
        </Form>
      </Panel>
      <p className="text-sm text-[var(--iwfw-muted)]">
        No account?{" "}
        <Link className="font-semibold text-[var(--iwfw-accent)]" to="/signup">
          Sign up
        </Link>
      </p>
    </main>
  );
}
