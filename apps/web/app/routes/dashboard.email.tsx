import { useState } from "react";
import { data as rrData, Form, Link, useNavigation } from "react-router";
import { Badge, Panel } from "@iwfw/ui";
import { eq, onboardingProfiles } from "@iwfw/db";
import { getConfig } from "../lib/env.server";
import { requireAuth } from "../lib/session.server";
import { getCustomerWorkspace } from "../lib/customer-org.server";
import { loadCustomerWorkspace } from "../lib/customer-workspace.server";
import { QuestionnaireField } from "../components/questionnaire-field";
import { WebsiteSwitcher } from "../components/website-switcher";
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
  const { workspace, headers } = await loadCustomerWorkspace(
    request,
    context,
    auth,
  );
  return rrData(workspace, headers ? { headers } : undefined);
}

export async function action({ request, context }: Route.ActionArgs) {
  const auth = await requireAuth(request, context);
  const form = await request.formData();
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

  const data = structuredClone(selected.onboarding.data);
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
    .where(eq(onboardingProfiles.id, selected.onboarding.id));

  return { ok: true, saved: true };
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div>
      <dt>{label}</dt>
      <dd className="iwfw-mail-copy-row">
        <code className="iwfw-dash-code">{value}</code>
        {value && value !== "—" ? (
          <button
            type="button"
            className="iwfw-btn iwfw-btn--outline iwfw-btn--sm"
            onClick={copy}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        ) : null}
        <span className="iwfw-sr-only" aria-live="polite">
          {copied ? `${label} copied to clipboard` : ""}
        </span>
      </dd>
    </div>
  );
}

function PasswordRow({ value }: { value: string }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className="iwfw-mail-password">
      <dt>Password</dt>
      <dd>
        <code className="iwfw-dash-code">
          {visible ? value : "•".repeat(Math.min(Math.max(value.length, 8), 16))}
        </code>
        <button
          type="button"
          className="iwfw-btn iwfw-btn--outline iwfw-mail-password__toggle"
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? "Hide" : "Show"}
        </button>
        <button
          type="button"
          className="iwfw-btn iwfw-btn--outline iwfw-btn--sm"
          onClick={copy}
        >
          {copied ? "Copied" : "Copy"}
        </button>
        <span className="iwfw-sr-only" aria-live="polite">
          {copied ? "Password copied to clipboard" : ""}
        </span>
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
          <Link to="/dashboard" className="iwfw-btn iwfw-btn--outline">
            Back to overview
          </Link>
        )}
      </header>

      <WebsiteSwitcher
        orgs={loaderData.orgs}
        activeId={loaderData.primary?.id}
        hint="Mailbox preferences and credentials are per website."
      />

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
              {mailbox.password ? (
                <PasswordRow value={mailbox.password} />
              ) : (
                <div>
                  <dt>Password</dt>
                  <dd>
                    <p className="iwfw-dash-fine" style={{ margin: 0 }}>
                      Not set yet — we’ll add it here when your mailbox is
                      ready.
                    </p>
                  </dd>
                </div>
              )}
              {mailbox.webmailUrl ? (
                <CopyRow label="Webmail" value={mailbox.webmailUrl} />
              ) : null}
            </dl>
            {mailbox.customerNotes ? (
              <p className="iwfw-dash-copy">{mailbox.customerNotes}</p>
            ) : (
              <p className="iwfw-dash-fine">
                Use this password for webmail and when adding the account to
                Outlook, Apple Mail, Gmail or your phone.
              </p>
            )}
          </section>

          <section className="iwfw-dash-panel">
            <div className="iwfw-dash-panel-head">
              <h2>Server settings for apps</h2>
            </div>
            <p className="iwfw-dash-fine" style={{ marginBottom: "1rem" }}>
              When your phone or computer asks for mail servers, use{" "}
              <strong>Incoming</strong> to receive mail and{" "}
              <strong>Outgoing</strong> to send mail. Username is usually your
              full email address; use the mailbox password we gave you.
            </p>
            <div className="iwfw-mail-servers">
              <article className="iwfw-mail-card iwfw-mail-card--in">
                <header className="iwfw-mail-card__head">
                  <p className="iwfw-mail-card__eyebrow">Incoming mail</p>
                  <h3>IMAP — receive emails</h3>
                  <p>
                    Enter these under Incoming / IMAP when Outlook, Apple Mail,
                    Gmail or another app asks how to download your mail.
                  </p>
                </header>
                <dl className="iwfw-dash-dl">
                  <CopyRow
                    label="IMAP server"
                    value={mailbox.imapHost || "—"}
                  />
                  <CopyRow
                    label="Port"
                    value={String(mailbox.imapPort ?? 993)}
                  />
                  <CopyRow
                    label="Security / encryption"
                    value={mailboxSecurityLabel(mailbox.imapSecurity)}
                  />
                  <CopyRow
                    label="Username"
                    value={mailbox.username || mailbox.emailAddress}
                  />
                </dl>
              </article>

              <article className="iwfw-mail-card iwfw-mail-card--out">
                <header className="iwfw-mail-card__head">
                  <p className="iwfw-mail-card__eyebrow">Outgoing mail</p>
                  <h3>SMTP — send emails</h3>
                  <p>
                    Enter these under Outgoing / SMTP so the same app can send
                    mail from your business address.
                  </p>
                </header>
                <dl className="iwfw-dash-dl">
                  <CopyRow
                    label="SMTP server"
                    value={mailbox.smtpHost || "—"}
                  />
                  <CopyRow
                    label="Port"
                    value={String(mailbox.smtpPort ?? 465)}
                  />
                  <CopyRow
                    label="Security / encryption"
                    value={mailboxSecurityLabel(mailbox.smtpSecurity)}
                  />
                  <CopyRow
                    label="Username"
                    value={mailbox.username || mailbox.emailAddress}
                  />
                </dl>
              </article>

              {mailbox.popHost ? (
                <article className="iwfw-mail-card iwfw-mail-card--pop">
                  <header className="iwfw-mail-card__head">
                    <p className="iwfw-mail-card__eyebrow">Optional</p>
                    <h3>POP3 — alternate incoming</h3>
                    <p>
                      Only needed if an app asks for POP instead of IMAP. Prefer
                      IMAP when you can.
                    </p>
                  </header>
                  <dl className="iwfw-dash-dl">
                    <CopyRow label="POP3 server" value={mailbox.popHost} />
                    <CopyRow
                      label="Port"
                      value={String(mailbox.popPort ?? 995)}
                    />
                    <CopyRow
                      label="Security / encryption"
                      value={mailboxSecurityLabel(mailbox.popSecurity)}
                    />
                    <CopyRow
                      label="Username"
                      value={mailbox.username || mailbox.emailAddress}
                    />
                  </dl>
                </article>
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
              {loaderData.primary?.id ? (
                <input type="hidden" name="org" value={loaderData.primary.id} />
              ) : null}
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
