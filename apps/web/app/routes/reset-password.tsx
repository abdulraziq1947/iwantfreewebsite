import { Form, Link, redirect, useNavigation, useSearchParams } from "react-router";
import { Button, Input, Panel } from "@iwfw/ui";
import { createAuth } from "@iwfw/auth";
import { getConfig, getEnv } from "../lib/env.server";
import { getOptionalAuth, homePathForAuth } from "../lib/session.server";
import { log } from "../lib/logger";
import type { Route } from "./+types/reset-password";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Reset password — iwantfreewebsite" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await getOptionalAuth(request, context);
  if (auth) throw redirect(homePathForAuth(auth));
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  return { hasToken: Boolean(token) };
}

export async function action({ request, context }: Route.ActionArgs) {
  const form = await request.formData();
  const token = String(form.get("token") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirmPassword") ?? "");

  if (!token) {
    return { error: "This reset link is missing or invalid." };
  }
  if (password.length < 10) {
    return { error: "Password must be at least 10 characters." };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match." };
  }

  const env = getEnv(context);
  const config = getConfig(context);
  try {
    const auth = createAuth(env.DB, config);
    const result = await auth.api.resetPassword({
      body: { newPassword: password, token },
    });
    if (!result) {
      return { error: "Unable to reset password. Request a new link." };
    }
    return { ok: true as const };
  } catch (error) {
    log("warn", "password_reset_failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return {
      error:
        "This reset link is invalid or has expired. Request a new one and try again.",
    };
  }
}

export default function ResetPassword({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";

  if (actionData && "ok" in actionData && actionData.ok) {
    return (
      <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
        <h1 className="text-3xl font-bold">Password updated</h1>
        <Panel>
          <p role="status">
            Your password has been changed. You can log in with the new
            password.
          </p>
        </Panel>
        <p className="text-sm">
          <Link
            className="font-semibold text-[var(--iwfw-accent)]"
            to="/get-started/account?mode=login"
          >
            Customer log in
          </Link>
          {" · "}
          <Link
            className="font-semibold text-[var(--iwfw-accent)]"
            to="/admin/login"
          >
            Staff sign in
          </Link>
        </p>
        <p className="text-sm text-[var(--iwfw-muted)]">
          Staff with MFA enabled will be asked for an authenticator code after
          the password step.
        </p>
      </main>
    );
  }

  if (!loaderData.hasToken && !token) {
    return (
      <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
        <h1 className="text-3xl font-bold">Reset password</h1>
        <Panel>
          <p>
            This page needs a valid reset link from your email. Request a new
            link if yours has expired.
          </p>
        </Panel>
        <p className="text-sm">
          <Link
            className="font-semibold text-[var(--iwfw-accent)]"
            to="/forgot-password"
          >
            Request a reset link
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      <h1 className="text-3xl font-bold">Choose a new password</h1>
      <Panel>
        <Form method="post" className="space-y-4">
          <input type="hidden" name="token" value={token} />
          <label className="block text-sm font-semibold">
            New password
            <Input
              className="mt-1"
              name="password"
              type="password"
              required
              minLength={10}
              autoComplete="new-password"
            />
          </label>
          <label className="block text-sm font-semibold">
            Confirm password
            <Input
              className="mt-1"
              name="confirmPassword"
              type="password"
              required
              minLength={10}
              autoComplete="new-password"
            />
          </label>
          {actionData && "error" in actionData && actionData.error ? (
            <p className="text-sm text-[var(--iwfw-danger)]" role="alert">
              {actionData.error}
            </p>
          ) : null}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Saving…" : "Update password"}
          </Button>
        </Form>
      </Panel>
    </main>
  );
}
