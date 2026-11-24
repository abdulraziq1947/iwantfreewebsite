import { Form, Link, useNavigation } from "react-router";
import { createDb, eq, onboardingProfiles } from "@iwfw/db";
import { requireAuth } from "../lib/session.server";
import { getEnv, getConfig } from "../lib/env.server";
import { getCustomerWorkspace } from "../lib/customer-org.server";
import { parseOnboardingData } from "../lib/onboarding";
import { LEGAL_PRIVACY_EMAIL, LEGAL_ICO_URL } from "../lib/legal";
import { CookieSettingsButton } from "../components/cookie-consent";
import { Alert, PageHead } from "../components/dash-ui";
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
    <div className="dash-page">
      <PageHead
        kicker="Account"
        title="Account"
        lead="Your login details, privacy choices and business profile."
        aside={
          <Form method="post" action="/logout">
            <button type="submit" className="dash-btn dash-btn--line dash-btn--sm">
              Log out
            </button>
          </Form>
        }
      />

      <div className="dash-settings">
        <section className="dash-setting" aria-labelledby="dash-profile-title">
          <div className="dash-setting__intro">
            <h2 id="dash-profile-title" className="dash-h2">
              Profile
            </h2>
            <p>Your sign-in details and business name.</p>
          </div>
          <dl className="dash-rows">
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
        </section>

        <section className="dash-setting" aria-labelledby="dash-security-title">
          <div className="dash-setting__intro">
            <h2 id="dash-security-title" className="dash-h2">
              Security
            </h2>
            <p>Change your password whenever you like.</p>
          </div>
          <div className="dash-setting__body">
            <p className="dash-copy">
              Reset your password with a secure one-time email link. You&apos;ll
              stay signed in on this device until you log out.
            </p>
            <div>
              <Link to="/forgot-password" className="dash-btn dash-btn--line">
                Reset password
              </Link>
            </div>
            <p className="dash-fine">
              Prefer help from a person?{" "}
              <a href={`mailto:${LEGAL_PRIVACY_EMAIL}`}>Email support</a>.
            </p>
          </div>
        </section>

        <section className="dash-setting" aria-labelledby="dash-marketing-title">
          <div className="dash-setting__intro">
            <h2 id="dash-marketing-title" className="dash-h2">
              Marketing emails
            </h2>
            <p>Choose whether we send you tips and offers.</p>
          </div>
          <div className="dash-setting__body">
            <p className="dash-copy">
              Optional tips and offers only. Service messages about your
              website, billing or security are separate and may still be sent.
            </p>
            <Form method="post" className="dash-form">
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
              {actionData && "message" in actionData && actionData.message ? (
                <Alert tone="ok">{actionData.message}</Alert>
              ) : null}
              {actionData && "error" in actionData && actionData.error ? (
                <Alert tone="error">{actionData.error}</Alert>
              ) : null}
              <div>
                <button
                  type="submit"
                  className="dash-btn dash-btn--ink"
                  disabled={busy}
                >
                  {busy ? "Saving…" : "Save preference"}
                </button>
              </div>
            </Form>
          </div>
        </section>

        <section className="dash-setting" aria-labelledby="dash-privacy-title">
          <div className="dash-setting__intro">
            <h2 id="dash-privacy-title" className="dash-h2">
              Privacy &amp; cookies
            </h2>
            <p>Your rights under UK GDPR.</p>
          </div>
          <div className="dash-setting__body">
            <p className="dash-copy">
              Under UK GDPR you can ask to access, correct or delete personal
              data we hold about you (subject to legal limits). Email{" "}
              <a href={`mailto:${LEGAL_PRIVACY_EMAIL}?subject=Privacy%20request`}>
                {LEGAL_PRIVACY_EMAIL}
              </a>{" "}
              with “Privacy” in the subject. You can also complain to the{" "}
              <a href={LEGAL_ICO_URL} target="_blank" rel="noreferrer">
                ICO
              </a>
              .
            </p>
            <div className="dash-actions">
              <Link to="/privacy" className="dash-btn dash-btn--line dash-btn--sm">
                Privacy Policy
              </Link>
              <Link to="/cookies" className="dash-btn dash-btn--line dash-btn--sm">
                Cookie Policy
              </Link>
              <CookieSettingsButton className="dash-btn dash-btn--line dash-btn--sm" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
