import { Form, Link, useNavigation } from "react-router";
import { Badge, Panel } from "@iwfw/ui";
import { createDb, eq, onboardingProfiles } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import { requireAuth } from "../lib/session.server";
import { getCustomerWorkspace } from "../lib/customer-org.server";
import { QuestionnaireField } from "../components/questionnaire-field";
import {
  MAIL_CLIENT_GUIDES,
  mailboxSecurityLabel,
  mailboxStatusLabel,
} from "../lib/mailbox";
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
    return { error: "No website account found." };
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

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        <code className="iwfw-dash-code">{value}</code>
      </dd>
    </div>
  );
}

export default function EmailPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const current = loaderData.onboarding?.data.email;
  const mailbox = loaderData.mailbox;
  const domainName =
    loaderData.domainTask?.domainName ||
    loaderData.onboarding?.data.domain.preferredDomain ||
    loaderData.onboarding?.data.domain.existingDomain ||
    null;
  const preferredAddress =
    current?.localPart && domainName
      ? `${current.localPart}@${domainName}`
      : current?.localPart
        ? `${current.localPart}@your-domain`
        : null;
  const ready = mailbox?.status === "active";

  return (
    <div className="iwfw-dash-page">
      <header className="iwfw-dash-page__header">
        <div>
          <h1>Business email</h1>
          <p>
            {ready
              ? "Your mailbox is ready. Use webmail or add it to Outlook, Apple Mail, Gmail and your phone."
              : "One custom mailbox is included. Tell us the address you prefer — we’ll add login and setup details here once it’s ready."}
          </p>
        </div>
        {mailbox ? (
          <Badge tone={ready ? "success" : "warning"}>
            {mailboxStatusLabel(mailbox.status)}
          </Badge>
        ) : (
          <Link to="/dashboard/onboarding" className="iwfw-btn iwfw-btn--outline">
            Back to progress
          </Link>
        )}
      </header>

      {ready && mailbox ? (
        <>
          <section className="iwfw-dash-panel iwfw-mail-access">
            <div className="iwfw-dash-panel-head">
              <h2>Your mailbox access</h2>
              {mailbox.webmailUrl ? (
                <a
                  href={mailbox.webmailUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="iwfw-btn iwfw-btn--green"
                >
                  Open webmail
                </a>
              ) : null}
            </div>
            <dl className="iwfw-dash-dl">
              <CopyRow label="Email address" value={mailbox.emailAddress} />
              <CopyRow
                label="Username"
                value={mailbox.username || mailbox.emailAddress}
              />
              {mailbox.webmailUrl ? (
                <CopyRow label="Webmail" value={mailbox.webmailUrl} />
              ) : null}
            </dl>
            {mailbox.customerNotes ? (
              <p className="iwfw-dash-copy">{mailbox.customerNotes}</p>
            ) : (
              <p className="iwfw-dash-fine">
                Use the mailbox password we sent you (or that support shared).
                For security we don’t show the password on this page.
              </p>
            )}
          </section>

          <section className="iwfw-dash-panel">
            <div className="iwfw-dash-panel-head">
              <h2>Server settings (IMAP / SMTP)</h2>
            </div>
            <p className="iwfw-dash-fine" style={{ marginBottom: "0.85rem" }}>
              Use these when adding your email to Outlook, Apple Mail, Gmail,
              Samsung Email or any other app.
            </p>
            <div className="iwfw-mail-servers">
              <div>
                <h3>Incoming (IMAP)</h3>
                <dl className="iwfw-dash-dl">
                  <CopyRow
                    label="Server"
                    value={mailbox.imapHost || "—"}
                  />
                  <CopyRow
                    label="Port"
                    value={String(mailbox.imapPort ?? 993)}
                  />
                  <CopyRow
                    label="Security"
                    value={mailboxSecurityLabel(mailbox.imapSecurity)}
                  />
                </dl>
              </div>
              <div>
                <h3>Outgoing (SMTP)</h3>
                <dl className="iwfw-dash-dl">
                  <CopyRow
                    label="Server"
                    value={mailbox.smtpHost || "—"}
                  />
                  <CopyRow
                    label="Port"
                    value={String(mailbox.smtpPort ?? 465)}
                  />
                  <CopyRow
                    label="Security"
                    value={mailboxSecurityLabel(mailbox.smtpSecurity)}
                  />
                </dl>
              </div>
              {mailbox.popHost ? (
                <div>
                  <h3>Incoming (POP3) — optional</h3>
                  <dl className="iwfw-dash-dl">
                    <CopyRow label="Server" value={mailbox.popHost} />
                    <CopyRow
                      label="Port"
                      value={String(mailbox.popPort ?? 995)}
                    />
                    <CopyRow
                      label="Security"
                      value={mailboxSecurityLabel(mailbox.popSecurity)}
                    />
                  </dl>
                </div>
              ) : null}
            </div>
          </section>

          <section className="iwfw-dash-panel">
            <div className="iwfw-dash-panel-head">
              <h2>Set up on your devices</h2>
            </div>
            <ul className="iwfw-mail-guides">
              {MAIL_CLIENT_GUIDES.map((guide) => (
                <li key={guide.id}>
                  <strong>{guide.title}</strong>
                  {"body" in guide ? <p>{guide.body}</p> : null}
                  {"steps" in guide ? (
                    <ol>
                      {guide.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <div className="iwfw-dash-split">
          <Panel>
            <h2>Mailbox preference</h2>
            <Form method="post" className="iwfw-start__form">
              <QuestionnaireField
                label="Mailbox name"
                name="localPart"
                defaultValue={current?.localPart || "info"}
                placeholder="info"
                hint={
                  domainName
                    ? `We’ll aim for ${current?.localPart || "info"}@${domainName}`
                    : "We’ll create name@your-domain once DNS is ready."
                }
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
                <dd>{preferredAddress || "info@your-domain"}</dd>
              </div>
              <div>
                <dt>Mailbox status</dt>
                <dd>
                  {mailbox
                    ? mailboxStatusLabel(mailbox.status)
                    : "We’ll add webmail and app setup details here once your mailbox is ready"}
                </dd>
              </div>
            </dl>
            <p className="iwfw-dash-fine">
              When it’s ready you’ll see webmail, SMTP/IMAP settings, and
              step-by-step guides for Outlook, Apple Mail, Gmail and phones.
            </p>
          </Panel>
        </div>
      )}
    </div>
  );
}
