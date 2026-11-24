import { Form, Link, redirect, useNavigation, useSearchParams } from "react-router";
import { createAuth } from "@iwfw/auth";
import { getConfig, getEnv } from "../lib/env.server";
import { getOptionalAuth, homePathForAuth } from "../lib/session.server";
import { log } from "../lib/logger";
import {
  FormAlert,
  StepHeader,
} from "../components/start-funnel";
import { QuestionnaireField } from "../components/questionnaire-field";
import type { Route } from "./+types/reset-password";
import "../start.css";

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
      <main className="st-auth">
        <div className="st-wrap">
          <StepHeader
            kicker="Account"
            title="Password updated"
            lead="You can log in with the new password."
          />
          <FormAlert tone="ok">Your password has been changed.</FormAlert>
          <p className="st-fine">
            <Link to="/get-started/account?mode=login">Customer log in</Link>
            {" · "}
            <Link to="/admin/login">Staff sign in</Link>
          </p>
          <p className="st-fine">
            Staff with MFA enabled will be asked for an authenticator code after
            the password step.
          </p>
        </div>
      </main>
    );
  }

  if (!loaderData.hasToken && !token) {
    return (
      <main className="st-auth">
        <div className="st-wrap">
          <StepHeader
            kicker="Account"
            title="Reset password"
            lead="This page needs a valid reset link from your email. Request a new link if yours has expired."
          />
          <p className="st-fine">
            <Link to="/forgot-password">Request a reset link</Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="st-auth">
      <div className="st-wrap">
        <StepHeader
          kicker="Account"
          title="Choose a new password"
          lead="Pick a password of at least 10 characters."
        />
        <Form method="post" className="st-sheet st-form">
          <input type="hidden" name="token" value={token} />
          <QuestionnaireField
            label="New password"
            name="password"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            markOptional={false}
          />
          <QuestionnaireField
            label="Confirm password"
            name="confirmPassword"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            markOptional={false}
          />
          {actionData && "error" in actionData && actionData.error ? (
            <FormAlert tone="error">{actionData.error}</FormAlert>
          ) : null}
          <button type="submit" className="st-btn st-btn--go st-btn--block" disabled={busy}>
            {busy ? "Saving…" : "Update password"}
          </button>
        </Form>
      </div>
    </main>
  );
}
