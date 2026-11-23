import { Form, Link, useNavigation } from "react-router";
import { Badge, Panel } from "@iwfw/ui";
import { createDb, eq, onboardingProfiles } from "@iwfw/db";
import { getConfig, getEnv } from "../lib/env.server";
import { requireAuth } from "../lib/session.server";
import { getCustomerWorkspace } from "../lib/customer-org.server";
import { QuestionnaireField } from "../components/questionnaire-field";
import type { Route } from "./+types/dashboard.google-business";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Google Business — iwantfreewebsite" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireAuth(request, context);
  const env = getEnv(context);
  const config = getConfig(context);
  const db = createDb(env.DB);
  const workspace = await getCustomerWorkspace(db, auth);
  return {
    workspace,
    gbpManagerEmail: config.GBP_MANAGER_EMAIL ?? "manager@iwantfreewebsite.com",
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const auth = await requireAuth(request, context);
  const db = createDb(getEnv(context).DB);
  const workspace = await getCustomerWorkspace(db, auth);
  if (!workspace.primary || !workspace.onboarding) {
    return { error: "No organisation found." };
  }

  const form = await request.formData();
  const outcome = String(form.get("outcome") ?? "");
  const allowed = ["invitation_sent", "help_requested", "no_profile", ""] as const;
  const data = structuredClone(workspace.onboarding.data);
  data.gbp = {
    profileUrl: String(form.get("profileUrl") ?? "").trim(),
    outcome: (allowed.includes(outcome as (typeof allowed)[number])
      ? outcome
      : "") as typeof data.gbp.outcome,
    publishDirectly: form.get("publishDirectly") === "on",
  };

  await db
    .update(onboardingProfiles)
    .set({
      dataJson: JSON.stringify(data),
      updatedAt: new Date(),
    })
    .where(eq(onboardingProfiles.id, workspace.onboarding.id));

  return { ok: true, saved: true };
}

export default function GoogleBusinessPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const gbp = loaderData.workspace.onboarding?.data.gbp;
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const label =
    gbp?.outcome === "invitation_sent"
      ? "Invitation sent"
      : gbp?.outcome === "help_requested"
        ? "Help requested"
        : gbp?.outcome === "no_profile"
          ? "No profile yet"
          : "Action helpful";

  return (
    <div className="iwfw-dash-page">
      <header className="iwfw-dash-page__header">
        <div>
          <h1>Google Business Profile</h1>
          <p>
            Weekly posts and review replies are included. Invite us as Manager —
            not Owner — when you’re ready.
          </p>
        </div>
        <Badge tone={gbp?.outcome === "invitation_sent" ? "success" : "neutral"}>
          {label}
        </Badge>
      </header>

      <div className="iwfw-dash-split">
        <Panel>
          <h2>Manager invite</h2>
          <p className="iwfw-dash-copy">
            In Google Business Profile, invite this email as <strong>Manager</strong>:
          </p>
          <code className="iwfw-dash-code">{loaderData.gbpManagerEmail}</code>
          <Form method="post" className="iwfw-start__form" style={{ marginTop: "1rem" }}>
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
              <span>Team may publish weekly posts without asking each time</span>
            </label>
            {actionData && "saved" in actionData && actionData.saved && (
              <p className="iwfw-start__ok" role="status">
                Saved — thanks.
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
            <li>Status tracking in your dashboard</li>
          </ul>
          <p className="iwfw-dash-fine">
            Access is marked connected only after our team accepts the invite in
            Google.
          </p>
          <Link to="/dashboard/onboarding" className="iwfw-btn iwfw-btn--outline">
            Back to progress
          </Link>
        </Panel>
      </div>
    </div>
  );
}
