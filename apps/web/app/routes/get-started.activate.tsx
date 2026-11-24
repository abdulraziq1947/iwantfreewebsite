import { Form, Link, redirect, useNavigation } from "react-router";
import {
  FormAlert,
  StepHeader,
} from "../components/start-funnel";
import { QuestionnaireField } from "../components/questionnaire-field";
import { createAuth } from "@iwfw/auth";
import { createDb } from "@iwfw/db";
import { requestActivationEmailResend } from "../lib/activation-email.server";
import { getConfig, getEnv } from "../lib/env.server";
import { consumeActivationToken } from "../lib/fulfill-order.server";
import type { Route } from "./+types/get-started.activate";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Activate your account — iwantfreewebsite.com" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  return { token, hasToken: Boolean(token) };
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = getEnv(context);
  const config = getConfig(context);
  const db = createDb(env.DB);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "activate");

  if (intent === "resend") {
    const email = String(form.get("email") ?? "");
    const result = await requestActivationEmailResend({ db, config, email });
    if (!result.ok) {
      return {
        resendError: result.error,
        resendStatus: result.status,
      };
    }
    return { resendMessage: result.message };
  }

  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");

  if (!token) return { error: "Missing activation token." };
  if (password !== confirm) return { error: "Passwords do not match." };

  const result = await consumeActivationToken({ db, token, password });
  if (!result.ok) return { error: result.error };

  try {
    const { trackProductEvent } = await import("../lib/analytics.server");
    await trackProductEvent(db, {
      name: "activation_completed",
      properties: { emailDomain: result.email.split("@")[1] ?? null },
    });
  } catch {
    // Non-fatal
  }

  const auth = createAuth(env.DB, config);
  const signIn = await auth.api.signInEmail({
    body: { email: result.email, password },
    asResponse: true,
  });
  if (!signIn.ok) {
    return {
      error:
        "Password saved. Please log in with your email and new password.",
      loginOnly: true,
    };
  }

  const headers = new Headers();
  const setCookie = signIn.headers.getSetCookie?.() || [];
  for (const c of setCookie) headers.append("Set-Cookie", c);
  const single = signIn.headers.get("set-cookie");
  if (single && setCookie.length === 0) headers.append("Set-Cookie", single);

  throw redirect("/dashboard", { headers });
}

export default function ActivateAccount({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const showResend =
    !loaderData.hasToken ||
    Boolean(actionData && "error" in actionData && actionData.error);

  return (
    <div className="st-step">
      <StepHeader
        kicker="Account activation"
        title="Choose your password"
        lead="Your subscription is confirmed. Set a password to open your dashboard. We never send your password by email."
      />

      <Form method="post" className="st-sheet st-form">
        <input type="hidden" name="intent" value="activate" />
        <input type="hidden" name="token" value={loaderData.token} />
        {!loaderData.hasToken ? (
          <FormAlert tone="error">
            This activation link is missing a token. Use the link from your
            email, or request a new one below.
          </FormAlert>
        ) : null}
        <QuestionnaireField
          label="New password"
          name="password"
          type="password"
          required
          minLength={10}
          hint="At least 10 characters"
          markOptional={false}
        />
        <QuestionnaireField
          label="Confirm password"
          name="confirm"
          type="password"
          required
          minLength={10}
          markOptional={false}
        />
        {actionData && "error" in actionData && actionData.error ? (
          <FormAlert tone="error">{actionData.error}</FormAlert>
        ) : null}
        <button
          type="submit"
          className="st-btn st-btn--go st-btn--block"
          disabled={busy || !loaderData.hasToken}
        >
          {busy ? "Saving…" : "Activate & continue"}
        </button>
      </Form>

      {showResend ? (
        <section className="st-card" style={{ marginTop: "1.15rem" }}>
          <h2>Need a new activation link?</h2>
          <p className="st-fine">
            If your email never arrived or the link expired, enter the email you
            used at checkout. We only send a new link after a verified payment.
          </p>
          <Form method="post" className="st-form">
            <input type="hidden" name="intent" value="resend" />
            <QuestionnaireField
              label="Account email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@business.co.uk"
              markOptional={false}
            />
            {actionData &&
            "resendError" in actionData &&
            actionData.resendError ? (
              <FormAlert tone="error">{actionData.resendError}</FormAlert>
            ) : null}
            {actionData &&
            "resendMessage" in actionData &&
            actionData.resendMessage ? (
              <FormAlert tone="ok">{actionData.resendMessage}</FormAlert>
            ) : null}
            <button type="submit" className="st-btn st-btn--quiet" disabled={busy}>
              {busy ? "Sending…" : "Email me a new link"}
            </button>
          </Form>
          <p className="st-fine">
            Already activated?{" "}
            <Link to="/get-started/account?mode=login">Log in</Link>
          </p>
        </section>
      ) : null}
    </div>
  );
}
