import { Form, redirect, useNavigation } from "react-router";
import { createAuth } from "@iwfw/auth";
import { createDb } from "@iwfw/db";
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
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");

  if (!token) return { error: "Missing activation token." };
  if (password !== confirm) return { error: "Passwords do not match." };

  const result = await consumeActivationToken({ db, token, password });
  if (!result.ok) return { error: result.error };

  // Sign in with Better Auth
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
  // Fallback for environments without getSetCookie
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
        <input type="hidden" name="token" value={loaderData.token} />
        {!loaderData.hasToken && (
          <p className="iwfw-start__error" role="alert">
            This activation link is missing a token. Use the link from your email.
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
        {actionData?.error && (
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
    </div>
  );
}
