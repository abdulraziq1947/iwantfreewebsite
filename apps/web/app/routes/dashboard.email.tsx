import { useState } from "react";
import { data as rrData, Form, Link, useNavigation } from "react-router";
import { eq, onboardingProfiles } from "@iwfw/db";
import { getConfig } from "../lib/env.server";
import { requireAuth } from "../lib/session.server";
import { getCustomerWorkspace } from "../lib/customer-org.server";
import { loadCustomerWorkspace } from "../lib/customer-workspace.server";
import { QuestionnaireField } from "../components/questionnaire-field";
import { WebsiteSwitcher } from "../components/website-switcher";
import {
  Alert,
  ExternalIcon,
  PageHead,
  StatusMark,
  type DashTone,
} from "../components/dash-ui";
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
      <dd className="dash-copyrow">
        <code className="dash-code">{value}</code>
        {value && value !== "—" ? (
          <button
            type="button"
            className="dash-copybtn"
            onClick={copy}
            aria-label={copied ? `${label} copied` : `Copy ${label.toLowerCase()}`}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        ) : null}
        <span className="dash-sr" aria-live="polite">
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
    <div>
      <dt>Password</dt>
      <dd className="dash-copyrow">
        <code className="dash-code">
          {visible ? value : "•".repeat(Math.min(Math.max(value.length, 8), 16))}
        </code>
        <button
          type="button"
          className="dash-copybtn"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
        >
          {visible ? "Hide" : "Show"}
        </button>
        <button
          type="button"
          className="dash-copybtn"
          onClick={copy}
          aria-label={copied ? "Password copied" : "Copy password"}
        >
          {copied ? "Copied" : "Copy"}
        </button>
        <span className="dash-sr" aria-live="polite">
          {copied ? "Password copied to clipboard" : ""}
        </span>
      </dd>
    </div>
  );
}

function mailboxTone(status: string | undefined): DashTone {
  if (status === "active") return "ok";
  if (status === "suspended") return "stop";
  return "wait";
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
    <div className="dash-page">
      <PageHead
        kicker={loaderData.primary?.tradingName ?? "Your website"}
        title="Business email"
        lead={
          ready
            ? "Your mailbox is ready. Use webmail, or add it to Outlook, Apple Mail, Gmail and your phone."
            : "One custom mailbox is included. Tell us the address you’d like, and we’ll add login and setup details here once it’s ready."
        }
        aside={
          mailbox ? (
            <StatusMark tone={mailboxTone(mailbox.status)}>
              {mailboxStatusLabel(mailbox.status)}
            </StatusMark>
          ) : (
            <Link to="/dashboard" className="dash-btn dash-btn--line dash-btn--sm">
              Back to overview
            </Link>
          )
        }
      />

      <WebsiteSwitcher
        orgs={loaderData.orgs}
        activeId={loaderData.primary?.id}
        hint="Mailbox preferences and credentials are per website."
      />

      {ready && mailbox ? (
        <>
          <section
            className="dash-ledger dash-mailbox"
            aria-labelledby="dash-mailbox-title"
          >
            <div className="dash-ledger__top">
              <h2 id="dash-mailbox-title" className="dash-ledger__head">
                Your mailbox access
              </h2>
              {mailbox.webmailUrl ? (
                <a
                  href={mailbox.webmailUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="dash-btn dash-btn--go"
                >
                  Open webmail
                  <ExternalIcon />
                </a>
              ) : null}
            </div>
            <p className="dash-mailbox__address">{mailbox.emailAddress}</p>
            <dl className="dash-rows dash-rows--copy">
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
                  <dd className="dash-rows__note">
                    Not set yet. We’ll add it here when your mailbox is ready.
                  </dd>
                </div>
              )}
              {mailbox.webmailUrl ? (
                <CopyRow label="Webmail" value={mailbox.webmailUrl} />
              ) : null}
            </dl>
            {mailbox.customerNotes ? (
              <p className="dash-ledger__foot dash-ledger__foot--note">
                {mailbox.customerNotes}
              </p>
            ) : (
              <p className="dash-ledger__foot">
                Use this password for webmail and when adding the account to
                Outlook, Apple Mail, Gmail or your phone.
              </p>
            )}
          </section>

          <section className="dash-section" aria-labelledby="dash-servers-title">
            <div className="dash-section-head">
              <div>
                <h2 id="dash-servers-title" className="dash-h2">
                  Server settings for apps
                </h2>
                <p className="dash-section-head__intro">
                  When your phone or computer asks for mail servers, use{" "}
                  <strong>Incoming</strong> to receive mail and{" "}
                  <strong>Outgoing</strong> to send it. Your username is usually
                  your full email address, with the mailbox password we gave
                  you.
                </p>
              </div>
            </div>
            <div className="dash-servers">
              <article className="dash-server">
                <header className="dash-server__head">
                  <p className="dash-server__eyebrow">Incoming mail</p>
                  <h3 className="dash-h3">IMAP: receive emails</h3>
                  <p>
                    Enter these under Incoming / IMAP when Outlook, Apple Mail,
                    Gmail or another app asks how to download your mail.
                  </p>
                </header>
                <dl className="dash-rows dash-rows--copy">
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

              <article className="dash-server">
                <header className="dash-server__head">
                  <p className="dash-server__eyebrow">Outgoing mail</p>
                  <h3 className="dash-h3">SMTP: send emails</h3>
                  <p>
                    Enter these under Outgoing / SMTP so the same app can send
                    mail from your business address.
                  </p>
                </header>
                <dl className="dash-rows dash-rows--copy">
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
                <article className="dash-server dash-server--optional">
                  <header className="dash-server__head">
                    <p className="dash-server__eyebrow">Optional</p>
                    <h3 className="dash-h3">POP3: alternative incoming</h3>
                    <p>
                      Only needed if an app asks for POP instead of IMAP. Use
                      IMAP when you can.
                    </p>
                  </header>
                  <dl className="dash-rows dash-rows--copy">
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

          <section className="dash-section" aria-labelledby="dash-guides-title">
            <div className="dash-section-head">
              <h2 id="dash-guides-title" className="dash-h2">
                Set up on your devices
              </h2>
            </div>
            <ul className="dash-guides">
              {MAIL_CLIENT_GUIDES.map((guide) => (
                <li key={guide.id}>
                  <h3 className="dash-h3">{guide.title}</h3>
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
        <div className="dash-split">
          <section className="dash-panel" aria-labelledby="dash-mail-pref-title">
            <h2 id="dash-mail-pref-title" className="dash-h2">
              Mailbox preference
            </h2>
            <Form method="post" className="dash-form">
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
                <span>I need help moving from an existing mailbox</span>
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
              {actionData && "saved" in actionData && actionData.saved ? (
                <Alert tone="ok">Preference saved.</Alert>
              ) : null}
              {"error" in (actionData ?? {}) && actionData?.error ? (
                <Alert tone="error">{actionData.error}</Alert>
              ) : null}
              <div>
                <button
                  type="submit"
                  className="dash-btn dash-btn--go"
                  disabled={busy}
                >
                  {busy ? "Saving…" : "Save preference"}
                </button>
              </div>
            </Form>
          </section>

          <section className="dash-prose" aria-labelledby="dash-mail-status-title">
            <h2 id="dash-mail-status-title" className="dash-h2">
              Status
            </h2>
            <dl className="dash-rows">
              <div>
                <dt>Preferred mailbox</dt>
                <dd>{preferredAddress || "info@your-domain"}</dd>
              </div>
              <div>
                <dt>Mailbox status</dt>
                <dd>
                  {mailbox ? (
                    <StatusMark tone={mailboxTone(mailbox.status)}>
                      {mailboxStatusLabel(mailbox.status)}
                    </StatusMark>
                  ) : (
                    "Not set up yet"
                  )}
                </dd>
              </div>
            </dl>
            <p className="dash-fine">
              {mailbox
                ? "When it’s ready you’ll see webmail, SMTP/IMAP settings, and step-by-step guides for Outlook, Apple Mail, Gmail and phones."
                : "We’ll add webmail and app setup details here once your mailbox is ready, including SMTP/IMAP settings and step-by-step guides for Outlook, Apple Mail, Gmail and phones."}
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
