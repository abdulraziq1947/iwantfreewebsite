import { Form, Link, useNavigation } from "react-router";
import { Panel } from "@iwfw/ui";
import { createDb, eq, onboardingProfiles } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import { requireAuth } from "../lib/session.server";
import { getCustomerWorkspace } from "../lib/customer-org.server";
import { QuestionnaireField } from "../components/questionnaire-field";
import type { Route } from "./+types/dashboard.email";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Email — iwantfreewebsite" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireAuth(request, context);
  const db = createDb(getEnv(context).DB);
  return getCustomerWorkspace(db, auth);
}

export async function action({ request, context }: Route.ActionArgs) {
  const auth = await requireAuth(request, context);
  const db = createDb(getEnv(context).DB);
  const workspace = await getCustomerWorkspace(db, auth);
  if (!workspace.primary || !workspace.onboarding) {
    return { error: "No organisation found." };
  }

  const form = await request.formData();
  const data = structuredClone(workspace.onboarding.data);
  data.email = {
    localPart: String(form.get("localPart") ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, ""),
    existingProvider: String(form.get("existingProvider") ?? "").trim(),
    migrationRequired: form.get("migrationRequired") === "on",
    mxOverwriteApproved: form.get("mxOverwriteApproved") === "on",
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

export default function EmailPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const current = loaderData.onboarding?.data.email;

  return (
    <div className="iwfw-dash-page">
      <header className="iwfw-dash-page__header">
        <div>
          <h1>Business email</h1>
          <p>
            One custom mailbox is included. We’ll provision it after your domain
            is connected — just tell us the address you prefer.
          </p>
        </div>
        <Link to="/dashboard/onboarding" className="iwfw-btn iwfw-btn--outline">
          Back to progress
        </Link>
      </header>

      <div className="iwfw-dash-split">
        <Panel>
          <h2>Mailbox preference</h2>
          <Form method="post" className="iwfw-start__form">
            <QuestionnaireField
              label="Mailbox name"
              name="localPart"
              defaultValue={current?.localPart || "info"}
              placeholder="info"
              hint="We’ll create name@your-domain once DNS is ready."
            />
            <QuestionnaireField
              label="Existing email provider"
              name="existingProvider"
              defaultValue={current?.existingProvider || ""}
              placeholder="Google Workspace, Microsoft 365, none…"
            />
            <label className="iwfw-check">
              <input
                type="checkbox"
                name="migrationRequired"
                defaultChecked={current?.migrationRequired}
              />
              <span>I need help migrating from an existing mailbox</span>
            </label>
            <label className="iwfw-check">
              <input
                type="checkbox"
                name="mxOverwriteApproved"
                defaultChecked={current?.mxOverwriteApproved}
              />
              <span>
                I understand MX changes may be needed when we set this up
              </span>
            </label>
            {actionData && "saved" in actionData && actionData.saved && (
              <p className="iwfw-start__ok" role="status">
                Preference saved.
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
              {busy ? "Saving…" : "Save preference"}
            </button>
          </Form>
        </Panel>

        <Panel>
          <h2>Status</h2>
          <dl className="iwfw-dash-dl">
            <div>
              <dt>Preferred mailbox</dt>
              <dd>
                {current?.localPart
                  ? `${current.localPart}@your-domain`
                  : "info@your-domain"}
              </dd>
            </div>
            <div>
              <dt>Mailbox status</dt>
              <dd>Provisioned after domain is connected</dd>
            </div>
          </dl>
          <p className="iwfw-dash-fine">
            You don’t need to re-enter your business details here — we already
            have them from checkout.
          </p>
        </Panel>
      </div>
    </div>
  );
}
