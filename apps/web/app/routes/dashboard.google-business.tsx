import { data, Form, Link, useNavigation } from "react-router";
import { Badge, Panel } from "@iwfw/ui";
import { eq, onboardingProfiles } from "@iwfw/db";
import { getConfig } from "../lib/env.server";
import { requireAuth } from "../lib/session.server";
import { getCustomerWorkspace } from "../lib/customer-org.server";
import { loadCustomerWorkspace } from "../lib/customer-workspace.server";
import { withActiveOrg } from "../lib/active-org";
import { QuestionnaireField } from "../components/questionnaire-field";
import {
  NewWebsiteButton,
  WebsiteSwitcher,
} from "../components/website-switcher";
import type { Route } from "./+types/dashboard.google-business";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Google Business — iwantfreewebsite" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireAuth(request, context);
  const config = getConfig(context);
  const { workspace, headers } = await loadCustomerWorkspace(
    request,
    context,
    auth,
  );
  return data(
    {
      workspace,
      gbpManagerEmail: config.GBP_MANAGER_EMAIL ?? "manager@iwantfreewebsite.com",
    },
    headers ? { headers } : undefined,
  );
}

export async function action({ request, context }: Route.ActionArgs) {
  const auth = await requireAuth(request, context);
  const form = await request.formData();
  // Prefer the website selected in the form so multi-site saves cannot land
  // on the wrong organisation if the cookie is stale.
  const orgFromForm = String(form.get("org") ?? "").trim() || null;
  const { db, workspace } = await loadCustomerWorkspace(
    request,
    context,
    auth,
  );
  const selected =
    orgFromForm && workspace.orgs.some((o) => o.id === orgFromForm)
      ? await getCustomerWorkspace(db, auth, getConfig(context), {
          organisationId: orgFromForm,
        })
      : workspace;
  if (!selected.primary || !selected.onboarding) {
    return { error: "No website account found." };
  }

  const outcome = String(form.get("outcome") ?? "");
  const allowed = ["invitation_sent", "help_requested", "no_profile", ""] as const;
  const dataClone = structuredClone(selected.onboarding.data);
  dataClone.gbp = {
    profileUrl: String(form.get("profileUrl") ?? "").trim(),
    outcome: (allowed.includes(outcome as (typeof allowed)[number])
      ? outcome
      : "") as typeof dataClone.gbp.outcome,
    publishDirectly: form.get("publishDirectly") === "on",
    // Staff-only flag — never cleared by the customer form.
    accessGranted: Boolean(dataClone.gbp.accessGranted),
  };

  const previousOutcome = selected.onboarding.data.gbp.outcome;
  await db
    .update(onboardingProfiles)
    .set({
      dataJson: JSON.stringify(dataClone),
      updatedAt: new Date(),
    })
    .where(eq(onboardingProfiles.id, selected.onboarding.id));

  if (
    dataClone.gbp.outcome &&
    dataClone.gbp.outcome !== previousOutcome &&
    !dataClone.gbp.accessGranted
  ) {
    const { notifyStaffGbpCustomerUpdate } = await import(
      "../lib/notifications.server"
    );
    await notifyStaffGbpCustomerUpdate(db, {
      organisationId: selected.primary.id,
      tradingName: selected.primary.tradingName,
      outcome: dataClone.gbp.outcome,
    });
  }

  return { ok: true, saved: true };
}

export default function GoogleBusinessPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const workspace = loaderData.workspace;
  const activeId = workspace.primary?.id ?? null;
  const tradingName = workspace.primary?.tradingName;
  const gbp = workspace.onboarding?.data.gbp;
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const granted = Boolean(gbp?.accessGranted);
  const label = granted
    ? "Access granted"
    : gbp?.outcome === "invitation_sent"
      ? "Invitation sent"
      : gbp?.outcome === "help_requested"
        ? "Help requested"
        : gbp?.outcome === "no_profile"
          ? "No profile yet"
          : "Not granted yet";

  return (
    <div className="iwfw-dash-page">
      <header className="iwfw-dash-page__header">
        <div>
          <h1>Google Business Profile</h1>
          <p>
            Weekly posts and review replies are included. Invite us as Manager —
            not Owner — for the selected website.
          </p>
        </div>
        <div className="iwfw-dash-page__header-actions">
          {workspace.orgs.length > 0 ? <NewWebsiteButton /> : null}
          <Badge tone={granted ? "success" : gbp?.outcome ? "warning" : "neutral"}>
            {label}
          </Badge>
        </div>
      </header>

      <WebsiteSwitcher
        orgs={workspace.orgs}
        activeId={activeId}
        hint="Each website can have its own Google Business Profile. Updates save against the selected site only."
      />

      {!workspace.primary ? (
        <Panel>
          <h2>No website yet</h2>
          <p className="iwfw-dash-copy">
            Finish checkout first, then come back to connect Google Business for
            that site.
          </p>
        </Panel>
      ) : (
        <div className="iwfw-dash-split" key={activeId ?? "none"}>
          <Panel>
            <h2>
              Manager invite
              {tradingName ? (
                <>
                  {" "}
                  · <span className="iwfw-dash-inline-site">{tradingName}</span>
                </>
              ) : null}
            </h2>
            <p className="iwfw-dash-copy">
              In Google Business Profile, invite this email as{" "}
              <strong>Manager</strong>:
            </p>
            <code className="iwfw-dash-code">{loaderData.gbpManagerEmail}</code>
            <Form method="post" className="iwfw-start__form" style={{ marginTop: "1rem" }}>
              {activeId ? (
                <input type="hidden" name="org" value={activeId} />
              ) : null}
              <QuestionnaireField
                label="Profile link (optional)"
                name="profileUrl"
                defaultValue={gbp?.profileUrl || ""}
                placeholder="https://g.page/…"
              />
              <fieldset className="iwfw-dash-fieldset">
                <legend>How’s the invite going?</legend>
                <label className="iwfw-check">
                  <input
                    type="radio"
                    name="outcome"
                    value="invitation_sent"
                    defaultChecked={gbp?.outcome === "invitation_sent"}
                  />
                  <span>I’ve sent the Manager invitation</span>
                </label>
                <label className="iwfw-check">
                  <input
                    type="radio"
                    name="outcome"
                    value="help_requested"
                    defaultChecked={gbp?.outcome === "help_requested"}
                  />
                  <span>I need help with this</span>
                </label>
                <label className="iwfw-check">
                  <input
                    type="radio"
                    name="outcome"
                    value="no_profile"
                    defaultChecked={gbp?.outcome === "no_profile"}
                  />
                  <span>I don’t have a profile yet</span>
                </label>
              </fieldset>
              <label className="iwfw-check">
                <input
                  type="checkbox"
                  name="publishDirectly"
                  defaultChecked={gbp?.publishDirectly}
                />
                <span>
                  Team may publish weekly posts without asking each time
                </span>
              </label>
              {actionData && "saved" in actionData && actionData.saved && (
                <p className="iwfw-start__ok" role="status">
                  Saved for {tradingName ?? "this website"} — thanks.
                </p>
              )}
              {"error" in (actionData ?? {}) && actionData?.error && (
                <p className="iwfw-start__error" role="alert">
                  {actionData.error}
                </p>
              )}
              <button
                type="submit"
                className="iwfw-btn iwfw-btn--green"
                disabled={busy}
              >
                {busy ? "Saving…" : "Save update"}
              </button>
            </Form>
          </Panel>

          <Panel>
            <h2>What’s included</h2>
            <ul className="iwfw-dash-list">
              <li>One Google Business Profile post each week</li>
              <li>Help replying to reviews</li>
              <li>Status tracking per website in your dashboard</li>
            </ul>
            <p className="iwfw-dash-fine">
              Access is marked connected only after our team accepts the invite
              in Google for this website.
            </p>
            <Link
              to={withActiveOrg("/dashboard", activeId)}
              className="iwfw-btn iwfw-btn--outline"
            >
              Back to overview
            </Link>
          </Panel>
        </div>
      )}
    </div>
  );
}
