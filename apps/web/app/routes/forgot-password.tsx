import { Form, Link, useNavigation } from "react-router";
import { Button, Input, Panel } from "@iwfw/ui";
import { createAuth } from "@iwfw/auth";
import { getConfig, getEnv } from "../lib/env.server";
import { getOptionalAuth, homePathForAuth } from "../lib/session.server";
import { log } from "../lib/logger";
import { redirect } from "react-router";
import type { Route } from "./+types/forgot-password";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Forgot password — iwantfreewebsite" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await getOptionalAuth(request, context);
  if (auth) throw redirect(homePathForAuth(auth));
  return null;
}

export async function action({ request, context }: Route.ActionArgs) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email) {
    return { error: "Enter the email for your account." };
  }

  const env = getEnv(context);
  const config = getConfig(context);
  try {
    const auth = createAuth(env.DB, config);
    await auth.api.requestPasswordReset({
      body: {
        email,
        redirectTo: `${config.APP_URL}/reset-password`,
      },
    });
  } catch (error) {
    log("warn", "password_reset_request_failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    // Still show success to avoid email enumeration.
  }

  return {
    ok: true as const,
    message:
      "If an account exists for that email, we’ve sent a reset link. Check your inbox and spam folder.",
  };
}

export default function ForgotPassword({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      <h1 className="text-3xl font-bold">Forgot password</h1>
      <p className="text-[var(--iwfw-muted)]">
        Enter your account email and we’ll send a one-time reset link.
      </p>
      <Panel>
        {actionData && "ok" in actionData && actionData.ok ? (
          <p role="status">{actionData.message}</p>
        ) : (
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
            {actionData && "error" in actionData && actionData.error ? (
              <p className="text-sm text-[var(--iwfw-danger)]" role="alert">
                {actionData.error}
              </p>
            ) : null}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Sending…" : "Send reset link"}
            </Button>
          </Form>
        )}
      </Panel>
      <p className="text-sm text-[var(--iwfw-muted)]">
        <Link
          className="font-semibold text-[var(--iwfw-accent)]"
          to="/get-started/account?mode=login"
        >
          Back to log in
        </Link>
      </p>
    </main>
  );
}
