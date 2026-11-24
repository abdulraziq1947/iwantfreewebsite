import { Form, Link, redirect, useNavigation } from "react-router";
import { getConfig, getEnv } from "../lib/env.server";
import { getOptionalAuth } from "../lib/session.server";
import { redirectWithAuthCookies } from "../lib/auth-response.server";
import { registerCustomer } from "../lib/register-customer.server";
import { FormAlert, StepHeader } from "../components/start-funnel";
import { QuestionnaireField } from "../components/questionnaire-field";
import type { Route } from "./+types/signup";
import "../start.css";

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
    <main className="st-auth">
      <div className="st-wrap">
        <StepHeader
          kicker="Account"
          title="Create your account"
          lead="Prefer the guided path? Get started is £39.99/month, no upfront design fee, cancel anytime."
        />
        <Form method="post" className="st-sheet st-form">
          <QuestionnaireField
            label="Your name"
            name="name"
            required
            autoComplete="name"
            markOptional={false}
          />
          <QuestionnaireField
            label="Business / trading name"
            name="tradingName"
            required
            markOptional={false}
          />
          <QuestionnaireField
            label="Email"
            name="email"
            type="email"
            required
            autoComplete="email"
            markOptional={false}
          />
          <QuestionnaireField
            label="Password"
            name="password"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            hint="At least 10 characters"
            markOptional={false}
          />
          {actionData?.error ? (
            <FormAlert tone="error">{actionData.error}</FormAlert>
          ) : null}
          <button
            type="submit"
            className="st-btn st-btn--go st-btn--block"
            disabled={busy}
          >
            {busy ? "Creating…" : "Create account"}
          </button>
        </Form>
        <p className="st-fine">
          Prefer the full package? <Link to="/get-started">Get started</Link>
          {" · "}
          Already have an account?{" "}
          <Link to="/get-started/account?mode=login">Log in</Link>
        </p>
      </div>
    </main>
  );
}
