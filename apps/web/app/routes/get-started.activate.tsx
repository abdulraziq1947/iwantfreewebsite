import { Form, Link, redirect, useNavigation } from "react-router";
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
    <div className="iwfw-start">
      <header className="iwfw-start__intro">
        <p className="iwfw-start__kicker">Account activation</p>
        <h1>Choose your password</h1>
        <p className="iwfw-start__lead">
          Your subscription is confirmed. Set a password to open your dashboard.
          We never email plaintext passwords.
        </p>
      </header>

      <Form method="post" className="iwfw-start__card iwfw-start__form">
        <input type="hidden" name="intent" value="activate" />
        <input type="hidden" name="token" value={loaderData.token} />
        {!loaderData.hasToken && (
          <p className="iwfw-start__error" role="alert">
            This activation link is missing a token. Use the link from your
            email, or request a new one below.
          </p>
        )}
        <label className="iwfw-field">
          <span>New password (min 10 characters)</span>
          <input type="password" name="password" required minLength={10} />
        </label>
        <label className="iwfw-field">
          <span>Confirm password</span>
          <input type="password" name="confirm" required minLength={10} />
        </label>
        {actionData && "error" in actionData && actionData.error && (
          <p className="iwfw-start__error" role="alert">
            {actionData.error}
          </p>
        )}
        <button
          type="submit"
          className="iwfw-btn iwfw-btn--green"
          disabled={busy || !loaderData.hasToken}
        >
          {busy ? "Saving…" : "Activate & continue"}
        </button>
      </Form>

      {showResend && (
        <section className="iwfw-start__card" style={{ marginTop: "1.25rem" }}>
          <h2 style={{ marginTop: 0, fontSize: "1.15rem" }}>
            Need a new activation link?
          </h2>
          <p className="iwfw-start__fine">
            If your email never arrived or the link expired, enter the email you
            used at checkout. We only send a new link after a verified payment.
          </p>
          <Form method="post" className="iwfw-start__form">
            <input type="hidden" name="intent" value="resend" />
            <label className="iwfw-field">
              <span>Account email</span>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="you@business.co.uk"
              />
            </label>
            {actionData &&
              "resendError" in actionData &&
              actionData.resendError && (
                <p className="iwfw-start__error" role="alert">
                  {actionData.resendError}
                </p>
              )}
            {actionData &&
              "resendMessage" in actionData &&
              actionData.resendMessage && (
                <p className="iwfw-start__fine" role="status">
                  {actionData.resendMessage}
                </p>
              )}
            <button
              type="submit"
              className="iwfw-btn iwfw-btn--outline"
              disabled={busy}
            >
              {busy ? "Sending…" : "Email me a new link"}
            </button>
          </Form>
          <p className="iwfw-start__fine">
            Already activated? <Link to="/login">Log in</Link>
          </p>
        </section>
      )}
    </div>
  );
}
