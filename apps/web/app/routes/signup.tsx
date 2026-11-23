import { Form, Link, redirect, useNavigation } from "react-router";
import { Button, Input, Panel } from "@iwfw/ui";
import { getConfig, getEnv } from "../lib/env.server";
import { getOptionalAuth } from "../lib/session.server";
import { redirectWithAuthCookies } from "../lib/auth-response.server";
import { registerCustomer } from "../lib/register-customer.server";
import type { Route } from "./+types/signup";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Sign up — iwantfreewebsite" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await getOptionalAuth(request, context);
  if (auth) throw redirect("/dashboard");
  // Prefer the conversion funnel; keep this route working for bookmarks.
  const url = new URL(request.url);
  if (!url.searchParams.has("legacy")) {
    throw redirect("/get-started");
  }
  return null;
}

export async function action({ request, context }: Route.ActionArgs) {
  const form = await request.formData();
  const result = await registerCustomer(getEnv(context), getConfig(context), {
    name: String(form.get("name") ?? ""),
    email: String(form.get("email") ?? ""),
    password: String(form.get("password") ?? ""),
    tradingName: String(form.get("tradingName") ?? ""),
  });
  if (!result.ok) {
    return { error: result.error };
  }
  return redirectWithAuthCookies(result.response, "/get-started/review");
}

export default function Signup({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      <h1 className="text-3xl font-bold">Create your account</h1>
      <p className="text-[var(--iwfw-muted)]">
        £39.99/month for design, hosting and renewals handled. Cancel anytime.
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
        Prefer the full package overview?{" "}
        <Link className="font-semibold text-[var(--iwfw-accent)]" to="/get-started">
          Get started
        </Link>
        . Already have an account?{" "}
        <Link
          className="font-semibold text-[var(--iwfw-accent)]"
          to="/get-started/account?mode=login"
        >
          Log in
        </Link>
      </p>
    </main>
  );
}
