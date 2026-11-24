import { Form, Link, useNavigation } from "react-router";
import { createAuth } from "@iwfw/auth";
import { getConfig, getEnv } from "../lib/env.server";
import { getOptionalAuth, homePathForAuth } from "../lib/session.server";
import { log } from "../lib/logger";
import { redirect } from "react-router";
import {
  FormAlert,
  StepHeader,
} from "../components/start-funnel";
import { QuestionnaireField } from "../components/questionnaire-field";
import type { Route } from "./+types/forgot-password";
import "../start.css";

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
    <main className="st-auth">
      <div className="st-wrap">
        <StepHeader
          kicker="Account"
          title="Forgot password"
          lead="Enter your account email and we’ll send a one-time reset link."
        />
        <div className="st-sheet">
          {actionData && "ok" in actionData && actionData.ok ? (
            <FormAlert tone="ok">{actionData.message}</FormAlert>
          ) : (
            <Form method="post" className="st-form">
              <QuestionnaireField
                label="Email"
                name="email"
                type="email"
                required
                autoComplete="email"
                markOptional={false}
              />
              {actionData && "error" in actionData && actionData.error ? (
                <FormAlert tone="error">{actionData.error}</FormAlert>
              ) : null}
              <button type="submit" className="st-btn st-btn--go st-btn--block" disabled={busy}>
                {busy ? "Sending…" : "Send reset link"}
              </button>
            </Form>
          )}
        </div>
        <p className="st-fine">
          <Link to="/get-started/account?mode=login">Back to log in</Link>
        </p>
      </div>
    </main>
  );
}
