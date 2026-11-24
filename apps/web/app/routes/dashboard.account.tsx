import { Form, Link, useNavigation } from "react-router";
import { Panel } from "@iwfw/ui";
import { createDb, eq, onboardingProfiles } from "@iwfw/db";
import { requireAuth } from "../lib/session.server";
import { getEnv, getConfig } from "../lib/env.server";
import { getCustomerWorkspace } from "../lib/customer-org.server";
import { parseOnboardingData } from "../lib/onboarding";
import { LEGAL_PRIVACY_EMAIL, LEGAL_ICO_URL } from "../lib/legal";
import { CookieSettingsButton } from "../components/cookie-consent";
import type { Route } from "./+types/dashboard.account";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Account — iwantfreewebsite" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireAuth(request, context);
  const db = createDb(getEnv(context).DB);
  const workspace = await getCustomerWorkspace(db, auth, getConfig(context));
  const marketingOptIn = Boolean(
    workspace.onboarding?.data.checkout.marketingOptIn,
  );
  return {
    user: { name: auth.name, email: auth.email },
    workspace,
    marketingOptIn,
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const auth = await requireAuth(request, context);
  const db = createDb(getEnv(context).DB);
  const workspace = await getCustomerWorkspace(db, auth, getConfig(context));
  const orgId = workspace.primary?.id;
  if (!orgId) {
    return { error: "No organisation found." };
  }

  const form = await request.formData();
  const intent = String(form.get("intent") || "");
  if (intent !== "marketing") {
    return { error: "Unknown action." };
  }

  const marketingOptIn = form.get("marketingOptIn") === "on";
  const profile = await db
    .select()
    .from(onboardingProfiles)
    .where(eq(onboardingProfiles.organisationId, orgId))
    .get();
  if (!profile) {
    return { error: "Profile not found." };
  }

  const data = parseOnboardingData(profile.dataJson);
  data.checkout = {
    ...data.checkout,
    marketingOptIn,
  };

  await db
    .update(onboardingProfiles)
    .set({
      dataJson: JSON.stringify(data),
      updatedAt: new Date(),
    })
    .where(eq(onboardingProfiles.id, profile.id));

  return {
    ok: true,
    marketingOptIn,
    message: marketingOptIn
      ? "Marketing emails enabled."
      : "Marketing emails turned off.",
  };
}

export default function AccountPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const marketingOptIn =
    actionData && "marketingOptIn" in actionData
      ? Boolean(actionData.marketingOptIn)
      : loaderData.marketingOptIn;

  return (
    <div className="iwfw-dash-page">
      <header className="iwfw-dash-page__header">
        <div>
          <h1>Account</h1>
          <p>Your login details, privacy choices and business profile.</p>
        </div>
        <Form method="post" action="/logout">
          <button type="submit" className="iwfw-btn iwfw-btn--outline">
            Log out
          </button>
        </Form>
      </header>

      <div className="iwfw-dash-split">
        <Panel>
          <h2>Profile</h2>
          <dl className="iwfw-dash-dl">
            <div>
              <dt>Name</dt>
              <dd>{loaderData.user.name}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{loaderData.user.email}</dd>
            </div>
            <div>
              <dt>Business</dt>
              <dd>{loaderData.workspace.primary?.tradingName ?? "—"}</dd>
            </div>
          </dl>
        </Panel>
        <Panel>
          <h2>Security</h2>
          <p className="iwfw-dash-copy">
            Reset your password with a secure one-time email link. You&apos;ll stay
            signed in on this device until you log out.
          </p>
          <Link to="/forgot-password" className="iwfw-btn iwfw-btn--outline">
            Reset password
          </Link>
          <p className="iwfw-dash-fine" style={{ marginTop: "0.75rem" }}>
            Prefer help from a person?{" "}
            <a href={`mailto:${LEGAL_PRIVACY_EMAIL}`}>Email support</a>.
          </p>
        </Panel>
      </div>

      <div className="iwfw-dash-split" style={{ marginTop: "1rem" }}>
        <Panel>
          <h2>Marketing emails</h2>
          <p className="iwfw-dash-copy">
            Optional tips and offers only. Service messages about your website,
            billing or security are separate and may still be sent.
          </p>
          <Form method="post" className="iwfw-dash-form">
            <input type="hidden" name="intent" value="marketing" />
            <label className="iwfw-check">
              <input
                type="checkbox"
                name="marketingOptIn"
                defaultChecked={marketingOptIn}
                key={String(marketingOptIn)}
              />
              <span>Email me product tips and offers</span>
            </label>
            {actionData && "message" in actionData && actionData.message && (
              <p className="iwfw-dash-fine" role="status">
                {actionData.message}
              </p>
            )}
            {actionData && "error" in actionData && actionData.error && (
              <p className="iwfw-dash-fine" role="alert">
                {actionData.error}
              </p>
            )}
            <button
              type="submit"
              className="iwfw-btn iwfw-btn--blue"
              disabled={busy}
            >
              {busy ? "Saving…" : "Save preference"}
            </button>
          </Form>
        </Panel>
        <Panel>
          <h2>Privacy &amp; cookies</h2>
          <p className="iwfw-dash-copy">
            Under UK GDPR you can ask to access, correct or delete personal data
            we hold about you (subject to legal limits). Email{" "}
            <a href={`mailto:${LEGAL_PRIVACY_EMAIL}?subject=Privacy%20request`}>
              {LEGAL_PRIVACY_EMAIL}
            </a>{" "}
            with “Privacy” in the subject. You can also complain to the{" "}
            <a href={LEGAL_ICO_URL} target="_blank" rel="noreferrer">
              ICO
            </a>
            .
          </p>
          <div className="iwfw-dash-actions">
            <Link to="/privacy" className="iwfw-btn iwfw-btn--outline">
              Privacy Policy
            </Link>
            <Link to="/cookies" className="iwfw-btn iwfw-btn--outline">
              Cookie Policy
            </Link>
            <CookieSettingsButton className="iwfw-btn iwfw-btn--outline" />
          </div>
        </Panel>
      </div>
    </div>
  );
}
