import { Form, Link, redirect, useNavigation, useSearchParams } from "react-router";
import { Badge } from "@iwfw/ui";
import { createDb } from "@iwfw/db";
import { getConfig, getEnv } from "../lib/env.server";
import { requireStaffSession } from "../lib/session.server";
import { formatAdminDate, formatGbpFromPence } from "../lib/admin-ops";
import {
  getAdminClientDetail,
  isOrgStatus,
  markClientWebsiteLive,
  setClientWebsitePreview,
  setGbpAccessGranted,
  unmarkClientWebsiteLive,
  updateOrganisationStatus,
} from "../lib/admin-ops.server";
import { notifyCustomerNeedsAttention } from "../lib/notifications.server";
import { upsertOrganisationMailbox } from "../lib/mailbox.server";
import { mailboxStatusLabel } from "../lib/mailbox";
import { listOrganisationInvoices } from "../lib/billing.server";
import { writeAuditLog, clientIpFromRequest } from "../lib/audit-log.server";
import {
  getOrganisationCostEstimate,
  penceFromPoundsInput,
  upsertOrganisationCosts,
} from "../lib/org-costs.server";
import { AttentionBoardCard } from "../components/attention-board";
import type { Route } from "./+types/admin.clients.$orgId";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "brief", label: "Project brief" },
  { id: "email", label: "Email" },
  { id: "images", label: "Images" },
  { id: "billing", label: "Billing" },
  { id: "tasks", label: "Tasks" },
] as const;

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Client — Admin" }];
}

export async function loader({ request, context, params }: Route.LoaderArgs) {
  await requireStaffSession(request, context);
  const db = createDb(getEnv(context).DB);
  const client = await getAdminClientDetail(
    db,
    params.orgId,
    getConfig(context),
  );
  if (!client) {
    throw new Response("Client not found", { status: 404 });
  }
  const invoices = await listOrganisationInvoices({
    config: getConfig(context),
    db,
    organisationId: params.orgId,
  });
  const costs = await getOrganisationCostEstimate(db, params.orgId);
  return {
    client,
    invoices: invoices.invoices,
    invoiceError: invoices.error,
    costs,
  };
}

export async function action({ request, context, params }: Route.ActionArgs) {
  const staff = await requireStaffSession(request, context);
  const db = createDb(getEnv(context).DB);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const tab = String(form.get("tab") ?? "overview");
  const ip = clientIpFromRequest(request);

  if (intent === "update_org_status") {
    const status = String(form.get("status") ?? "");
    if (!isOrgStatus(status)) return { error: "Invalid organisation status." };
    const result = await updateOrganisationStatus(db, params.orgId, status);
    if ("error" in result) return result;
    await writeAuditLog(db, {
      actorUserId: staff.userId,
      organisationId: params.orgId,
      action: "org.status_update",
      entityType: "organisations",
      entityId: params.orgId,
      diff: { status },
      ip,
    });
    throw redirect(`/admin/clients/${params.orgId}?tab=${tab}`);
  }

  if (intent === "mark_live") {
    const liveUrl = String(form.get("liveUrl") ?? "").trim();
    const result = await markClientWebsiteLive(db, params.orgId, {
      liveUrl: liveUrl || null,
    });
    if ("error" in result) return result;
    await writeAuditLog(db, {
      actorUserId: staff.userId,
      organisationId: params.orgId,
      action: "website.mark_live",
      entityType: "domain_registration_tasks",
      entityId: params.orgId,
      diff: { liveUrl: result.liveUrl },
      ip,
    });
    throw redirect(`/admin/clients/${params.orgId}?tab=${tab}`);
  }

  if (intent === "unmark_live") {
    const result = await unmarkClientWebsiteLive(db, params.orgId);
    if ("error" in result) return result;
    await writeAuditLog(db, {
      actorUserId: staff.userId,
      organisationId: params.orgId,
      action: "website.unmark_live",
      entityType: "domain_registration_tasks",
      entityId: params.orgId,
      ip,
    });
    throw redirect(`/admin/clients/${params.orgId}?tab=${tab}`);
  }

  if (intent === "set_preview") {
    const previewUrl = String(form.get("previewUrl") ?? "").trim();
    const result = await setClientWebsitePreview(db, params.orgId, {
      previewUrl: previewUrl || null,
    });
    if ("error" in result) return result;
    await writeAuditLog(db, {
      actorUserId: staff.userId,
      organisationId: params.orgId,
      action: "website.set_preview",
      entityType: "domain_registration_tasks",
      entityId: params.orgId,
      diff: { previewUrl: result.previewUrl },
      ip,
    });
    throw redirect(`/admin/clients/${params.orgId}?tab=${tab}`);
  }

  if (intent === "gbp_grant") {
    const result = await setGbpAccessGranted(db, params.orgId, true);
    if ("error" in result) return result;
    throw redirect(`/admin/clients/${params.orgId}?tab=${tab}`);
  }

  if (intent === "gbp_revoke") {
    const result = await setGbpAccessGranted(db, params.orgId, false);
    if ("error" in result) return result;
    throw redirect(`/admin/clients/${params.orgId}?tab=${tab}`);
  }

  if (intent === "notify_customer") {
    const title = String(form.get("title") ?? "").trim().slice(0, 120);
    const body = String(form.get("body") ?? "").trim().slice(0, 500);
    if (title.length < 3 || body.length < 3) {
      return { error: "Add a short title and message for the customer." };
    }
    await notifyCustomerNeedsAttention(db, {
      organisationId: params.orgId,
      title,
      body,
      href: "/dashboard",
    });
    throw redirect(`/admin/clients/${params.orgId}?tab=${tab}`);
  }

  if (intent === "save_mailbox") {
    const result = await upsertOrganisationMailbox(
      db,
      params.orgId,
      form,
      getConfig(context),
    );
    if ("error" in result) return result;
    await writeAuditLog(db, {
      actorUserId: staff.userId,
      organisationId: params.orgId,
      action: "mailbox.upsert",
      entityType: "organisation_mailboxes",
      entityId: params.orgId,
      diff: {
        emailAddress: String(form.get("emailAddress") ?? ""),
        status: String(form.get("status") ?? ""),
        password: form.get("password") ? "[set]" : undefined,
      },
      ip,
    });
    throw redirect(`/admin/clients/${params.orgId}?tab=email`);
  }

  if (intent === "save_costs") {
    await upsertOrganisationCosts(db, params.orgId, {
      domainAnnualPence: penceFromPoundsInput(form.get("domainAnnual")),
      mailboxMonthlyPence: penceFromPoundsInput(form.get("mailboxMonthly")),
      hostingMonthlyPence: penceFromPoundsInput(form.get("hostingMonthly")),
      otherMonthlyPence: penceFromPoundsInput(form.get("otherMonthly")),
      notes: String(form.get("costNotes") ?? ""),
    });
    await writeAuditLog(db, {
      actorUserId: staff.userId,
      organisationId: params.orgId,
      action: "org.costs_update",
      entityType: "organisation_costs",
      entityId: params.orgId,
      ip,
    });
    throw redirect(`/admin/clients/${params.orgId}?tab=billing`);
  }

  return { error: "Unknown action." };
}

function statusTone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "active" || status === "connected" || status === "paid") {
    return "success";
  }
  if (
    status === "cancelling" ||
    status === "prospect" ||
    status === "pending" ||
    status === "in_progress" ||
    status === "open"
  ) {
    return "warning";
  }
  if (status === "cancelled" || status === "churned" || status === "failed") {
    return "danger";
  }
  return "neutral";
}

export default function AdminClientDetailPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { client } = loaderData;
  const [params] = useSearchParams();
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const tab = TABS.some((t) => t.id === params.get("tab"))
    ? (params.get("tab") as (typeof TABS)[number]["id"])
    : "overview";
  const data = client.onboarding.data;
  const primary = client.members[0];
  const isLive = client.domainTasks.some((t) => t.status === "connected");
  const liveDomain =
    client.domainTasks.find((t) => t.status === "connected")?.domainName ??
    client.domainTasks[0]?.domainName ??
    null;

  return (
    <div className="iwfw-admin-page">
      <header className="iwfw-admin-page__header">
        <div>
          <p className="iwfw-admin-page__eyebrow">
            <Link to="/admin/clients">Clients</Link> / folder
          </p>
          <h1>{client.org.tradingName}</h1>
          <p>
            {client.stageLabel}. {client.banner.body}
          </p>
        </div>
        <div style={{ display: "grid", gap: "0.35rem", justifyItems: "end" }}>
          <Badge tone={statusTone(client.org.status)}>{client.org.status}</Badge>
          <Badge tone={isLive ? "success" : "warning"}>
            {isLive ? "Website live" : "Not live yet"}
          </Badge>
          <Badge tone="neutral">{client.stageLabel}</Badge>
        </div>
      </header>

      <nav className="iwfw-admin-tabs" aria-label="Client sections">
        {TABS.map((t) => (
          <Link
            key={t.id}
            to={`?tab=${t.id}`}
            className={tab === t.id ? "is-active" : undefined}
          >
            {t.label}
            {t.id === "images" ? ` (${client.uploads.length})` : null}
            {t.id === "email" && client.mailbox
              ? ` · ${mailboxStatusLabel(client.mailbox.status)}`
              : null}
            {t.id === "tasks"
              ? ` (${client.domainTasks.length + client.transfers.length})`
              : null}
          </Link>
        ))}
      </nav>

      {tab === "overview" ? (
        <div className="iwfw-admin-grid">
          <section className="iwfw-admin-panel">
            <div className="iwfw-admin-panel__head">
              <h2>Status &amp; launch</h2>
            </div>
            <p className="iwfw-admin-muted" style={{ marginBottom: "0.85rem" }}>
              When the site is ready for the customer, mark it live. That
              completes their “Go live” stage.
              {liveDomain ? ` Domain: ${liveDomain}.` : ""}
            </p>
            {actionData && "error" in actionData && actionData.error ? (
              <p className="iwfw-start__error" role="alert">
                {actionData.error}
              </p>
            ) : null}
            <Form method="post" className="iwfw-start__form" style={{ marginBottom: "1rem" }}>
              <input type="hidden" name="intent" value="update_org_status" />
              <input type="hidden" name="tab" value="overview" />
              <label className="iwfw-field">
                <span>Organisation status</span>
                <select
                  className="iwfw-control"
                  name="status"
                  defaultValue={client.org.status}
                >
                  <option value="prospect">Prospect</option>
                  <option value="active">Active</option>
                  <option value="cancelling">Cancelling</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="churned">Churned</option>
                </select>
              </label>
              <button
                type="submit"
                className="iwfw-btn iwfw-btn--outline"
                disabled={busy}
              >
                {busy ? "Saving…" : "Save status"}
              </button>
            </Form>
            {!isLive ? (
              <>
                <Form method="post" className="iwfw-start__form">
                  <input type="hidden" name="intent" value="set_preview" />
                  <input type="hidden" name="tab" value="overview" />
                  <label className="iwfw-field">
                    <span>Preview URL (before go-live)</span>
                    <input
                      className="iwfw-control"
                      type="url"
                      name="previewUrl"
                      placeholder="https://preview.example.com/…"
                      defaultValue={
                        client.domainTasks[0]?.previewUrl ?? undefined
                      }
                    />
                  </label>
                  <p className="iwfw-admin-muted">
                    Customers can open this while the site is still being
                    finished. Clear the field and save to remove it.
                  </p>
                  <button
                    type="submit"
                    className="iwfw-btn iwfw-btn--outline"
                    disabled={busy}
                  >
                    {busy ? "Saving…" : "Save preview URL"}
                  </button>
                </Form>
                <Form method="post" className="iwfw-start__form">
                  <input type="hidden" name="intent" value="mark_live" />
                  <input type="hidden" name="tab" value="overview" />
                  <label className="iwfw-field">
                    <span>Live website URL</span>
                    <input
                      className="iwfw-control"
                      type="url"
                      name="liveUrl"
                      placeholder={
                        liveDomain
                          ? `https://${liveDomain}`
                          : "https://example.co.uk"
                      }
                      defaultValue={
                        liveDomain ? `https://${liveDomain}` : undefined
                      }
                    />
                  </label>
                  <p className="iwfw-admin-muted">
                    Customers see this link and get a congratulations
                    notification. Mark live only when DNS and content are ready.
                  </p>
                  <button
                    type="submit"
                    className="iwfw-btn iwfw-btn--green"
                    disabled={busy}
                  >
                    {busy ? "Updating…" : "Mark website live"}
                  </button>
                </Form>
              </>
            ) : (
              <div className="iwfw-admin-actions">
                {client.domainTasks.find((t) => t.status === "connected")
                  ?.liveUrl ? (
                  <a
                    className="iwfw-btn iwfw-btn--green"
                    href={
                      client.domainTasks.find((t) => t.status === "connected")!
                        .liveUrl!
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open live site
                  </a>
                ) : null}
                <Form method="post">
                  <input type="hidden" name="intent" value="unmark_live" />
                  <input type="hidden" name="tab" value="overview" />
                  <button
                    type="submit"
                    className="iwfw-btn iwfw-btn--outline"
                    disabled={busy}
                  >
                    {busy ? "Updating…" : "Mark not live yet"}
                  </button>
                </Form>
              </div>
            )}
          </section>

          <section className="iwfw-admin-panel">
            <div className="iwfw-admin-panel__head">
              <h2>Where they are</h2>
            </div>
            <ul className="iwfw-admin-journey">
              {client.journey.map((stage) => (
                <li key={stage.id}>
                  <span
                    className={`iwfw-admin-journey__dot is-${stage.state}`}
                    aria-hidden
                  />
                  <div>
                    <strong>{stage.title}</strong>
                    <p>{stage.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <AttentionBoardCard
            board={client.attention}
            perspective="staff"
            title="Needs attention"
            gbpActions={
              client.attention.gbp.granted ? (
                <Form method="post">
                  <input type="hidden" name="intent" value="gbp_revoke" />
                  <input type="hidden" name="tab" value="overview" />
                  <button
                    type="submit"
                    className="iwfw-btn iwfw-btn--outline"
                    disabled={busy}
                  >
                    Revoke GMB granted
                  </button>
                </Form>
              ) : (
                <Form method="post">
                  <input type="hidden" name="intent" value="gbp_grant" />
                  <input type="hidden" name="tab" value="overview" />
                  <button
                    type="submit"
                    className="iwfw-btn iwfw-btn--green"
                    disabled={busy}
                  >
                    Mark GMB access granted
                  </button>
                </Form>
              )
            }
          />

          <section className="iwfw-admin-panel">
            <div className="iwfw-admin-panel__head">
              <h2>Notify customer</h2>
            </div>
            <p className="iwfw-admin-muted" style={{ marginBottom: "0.75rem" }}>
              Send a live alert when you need them to do something or you’ve
              made a change.
            </p>
            <Form method="post" className="iwfw-start__form">
              <input type="hidden" name="intent" value="notify_customer" />
              <input type="hidden" name="tab" value="overview" />
              <label className="iwfw-field">
                <span>Title</span>
                <input
                  className="iwfw-control"
                  name="title"
                  required
                  maxLength={120}
                  placeholder="We need a quick decision"
                />
              </label>
              <label className="iwfw-field">
                <span>Message</span>
                <textarea
                  className="iwfw-control"
                  name="body"
                  required
                  rows={3}
                  maxLength={500}
                  placeholder="Please reply in support with your preferred domain."
                />
              </label>
              <button
                type="submit"
                className="iwfw-btn iwfw-btn--green"
                disabled={busy}
              >
                {busy ? "Sending…" : "Send notification"}
              </button>
            </Form>
          </section>

          <section className="iwfw-admin-panel">
            <div className="iwfw-admin-panel__head">
              <h2>Contact</h2>
            </div>
            <dl className="iwfw-admin-dl">
              <div>
                <dt>Primary contact</dt>
                <dd>
                  {(primary?.name ?? data.business.contactName) || "—"}
                </dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{(primary?.email ?? data.business.email) || "—"}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{data.business.phone || "—"}</dd>
              </div>
              <div>
                <dt>Members</dt>
                <dd>
                  {client.members.length === 0
                    ? "—"
                    : client.members
                        .map((m) => `${m.name ?? "User"} <${m.email ?? "?"}>`)
                        .join("\n")}
                </dd>
              </div>
            </dl>
          </section>

          <section className="iwfw-admin-panel">
            <div className="iwfw-admin-panel__head">
              <h2>Organisation</h2>
            </div>
            <dl className="iwfw-admin-dl">
              <div>
                <dt>Registered name</dt>
                <dd>{client.org.registeredCompanyName || "—"}</dd>
              </div>
              <div>
                <dt>Companies House</dt>
                <dd>{client.org.companiesHouseNumber || "—"}</dd>
              </div>
              <div>
                <dt>Joined</dt>
                <dd>{formatAdminDate(client.org.createdAt)}</dd>
              </div>
              <div>
                <dt>Org ID</dt>
                <dd>
                  <code className="iwfw-admin-code">{client.org.id}</code>
                </dd>
              </div>
            </dl>
          </section>
        </div>
      ) : null}

      {tab === "brief" ? (
        <div className="iwfw-admin-brief-grid">
          <BriefCard
            title="Business"
            rows={[
              ["Trading name", data.business.tradingName],
              ["Description", data.business.description],
              ["Address", data.business.address],
              ["Service areas", data.business.serviceAreas],
            ]}
          />
          <BriefCard
            title="Services"
            rows={[
              ["Services", data.services.list],
              ["Prices", data.services.prices],
              ["USPs", data.services.usps],
              ["Offers", data.services.offers],
            ]}
          />
          <BriefCard
            title="Website"
            rows={[
              ["Style", data.website.style],
              ["Pages", data.website.pages],
              ["Existing site", data.website.existingWebsite],
              ["Testimonials", data.website.testimonials],
              [
                "Forms",
                [
                  data.website.contactForm ? "Contact" : null,
                  data.website.quoteForm ? "Quote" : null,
                  data.website.whatsapp ? "WhatsApp" : null,
                ]
                  .filter(Boolean)
                  .join(", ") || "—",
              ],
            ]}
          />
          <BriefCard
            title="Domain & email"
            rows={[
              ["Mode", data.domain.mode || "—"],
              ["Preferred", data.domain.preferredDomain],
              ["Existing", data.domain.existingDomain],
              ["Email local part", data.email.localPart],
              [
                "GBP / GMB",
                data.gbp.accessGranted
                  ? `Access granted${data.gbp.profileUrl ? ` · ${data.gbp.profileUrl}` : ""}`
                  : data.gbp.outcome || data.gbp.profileUrl || "Not granted",
              ],
            ]}
          />
          <BriefCard
            title="Branding"
            rows={[
              ["Colours", data.branding.brandColours],
              ["Socials", data.branding.socials],
              ["Example sites", data.branding.exampleSites],
              ["Media notes", data.branding.mediaNotes],
            ]}
          />
        </div>
      ) : null}

      {tab === "email" ? (
        <div className="iwfw-admin-grid">
          <section className="iwfw-admin-panel">
            <div className="iwfw-admin-panel__head">
              <h2>Customer preference</h2>
            </div>
            <dl className="iwfw-admin-dl">
              <div>
                <dt>Preferred local part</dt>
                <dd>{data.email.localPart || "info"}</dd>
              </div>
              <div>
                <dt>Existing provider</dt>
                <dd>{data.email.existingProvider || "—"}</dd>
              </div>
              <div>
                <dt>Migration needed</dt>
                <dd>{data.email.migrationRequired ? "Yes" : "No"}</dd>
              </div>
              <div>
                <dt>MX overwrite approved</dt>
                <dd>{data.email.mxOverwriteApproved ? "Yes" : "No"}</dd>
              </div>
            </dl>
            <p className="iwfw-admin-muted" style={{ marginTop: "0.75rem" }}>
              Enter the real mailbox details below once you’ve created the
              account with the provider. The customer sees them on Email in
              their dashboard (password is encrypted at rest and shown with
              Show/Hide).
            </p>
          </section>

          <section className="iwfw-admin-panel iwfw-admin-panel--wide">
            <div className="iwfw-admin-panel__head">
              <h2>Mailbox details</h2>
              {client.mailbox ? (
                <Badge
                  tone={
                    client.mailbox.status === "active"
                      ? "success"
                      : client.mailbox.status === "suspended"
                        ? "danger"
                        : "warning"
                  }
                >
                  {mailboxStatusLabel(client.mailbox.status)}
                </Badge>
              ) : (
                <Badge tone="neutral">Not set</Badge>
              )}
            </div>
            {actionData && "error" in actionData && actionData.error ? (
              <p className="iwfw-start__error" role="alert">
                {actionData.error}
              </p>
            ) : null}
            <Form method="post" className="iwfw-start__form">
              <input type="hidden" name="intent" value="save_mailbox" />
              <input type="hidden" name="tab" value="email" />
              <div className="iwfw-field-grid iwfw-field-grid--2">
                <label className="iwfw-field">
                  <span>Email address</span>
                  <input
                    className="iwfw-control"
                    name="emailAddress"
                    type="email"
                    required
                    defaultValue={client.mailbox?.emailAddress ?? ""}
                    placeholder="info@example.co.uk"
                  />
                </label>
                <label className="iwfw-field">
                  <span>Username</span>
                  <input
                    className="iwfw-control"
                    name="username"
                    defaultValue={client.mailbox?.username ?? ""}
                    placeholder="Usually the full email address"
                  />
                </label>
                <label className="iwfw-field">
                  <span>Password</span>
                  <input
                    className="iwfw-control"
                    name="password"
                    type="text"
                    autoComplete="off"
                    defaultValue={client.mailbox?.password ?? ""}
                    placeholder="Mailbox password from MXroute"
                  />
                </label>
                <label className="iwfw-field">
                  <span>Webmail URL</span>
                  <input
                    className="iwfw-control"
                    name="webmailUrl"
                    type="url"
                    defaultValue={client.mailbox?.webmailUrl ?? ""}
                    placeholder="https://…"
                  />
                </label>
                <label className="iwfw-field">
                  <span>Status</span>
                  <select
                    className="iwfw-control"
                    name="status"
                    defaultValue={client.mailbox?.status ?? "pending"}
                  >
                    <option value="pending">Being set up</option>
                    <option value="active">Ready to use</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </label>
              </div>
              <p className="iwfw-admin-muted">
                Customers see this password on their Email page (Show to reveal).
                Paste the MXroute mailbox password here when you create the
                account.
              </p>
              {client.mailbox?.password ? (
                <label className="iwfw-check">
                  <input type="checkbox" name="clearPassword" />
                  <span>Clear saved password</span>
                </label>
              ) : null}

              <fieldset className="iwfw-fieldset">
                <legend>IMAP (incoming)</legend>
                <div className="iwfw-field-grid iwfw-field-grid--2">
                  <label className="iwfw-field">
                    <span>Host</span>
                    <input
                      className="iwfw-control"
                      name="imapHost"
                      defaultValue={client.mailbox?.imapHost ?? ""}
                      placeholder="mail.example.com"
                    />
                  </label>
                  <label className="iwfw-field">
                    <span>Port</span>
                    <input
                      className="iwfw-control"
                      name="imapPort"
                      type="number"
                      defaultValue={client.mailbox?.imapPort ?? 993}
                    />
                  </label>
                  <label className="iwfw-field">
                    <span>Security</span>
                    <select
                      className="iwfw-control"
                      name="imapSecurity"
                      defaultValue={client.mailbox?.imapSecurity ?? "ssl"}
                    >
                      <option value="ssl">SSL/TLS</option>
                      <option value="starttls">STARTTLS</option>
                      <option value="none">None</option>
                    </select>
                  </label>
                </div>
              </fieldset>

              <fieldset className="iwfw-fieldset">
                <legend>SMTP (outgoing)</legend>
                <div className="iwfw-field-grid iwfw-field-grid--2">
                  <label className="iwfw-field">
                    <span>Host</span>
                    <input
                      className="iwfw-control"
                      name="smtpHost"
                      defaultValue={client.mailbox?.smtpHost ?? ""}
                      placeholder="mail.example.com"
                    />
                  </label>
                  <label className="iwfw-field">
                    <span>Port</span>
                    <input
                      className="iwfw-control"
                      name="smtpPort"
                      type="number"
                      defaultValue={client.mailbox?.smtpPort ?? 465}
                    />
                  </label>
                  <label className="iwfw-field">
                    <span>Security</span>
                    <select
                      className="iwfw-control"
                      name="smtpSecurity"
                      defaultValue={client.mailbox?.smtpSecurity ?? "ssl"}
                    >
                      <option value="ssl">SSL/TLS</option>
                      <option value="starttls">STARTTLS</option>
                      <option value="none">None</option>
                    </select>
                  </label>
                </div>
              </fieldset>

              <fieldset className="iwfw-fieldset">
                <legend>POP3 (optional)</legend>
                <div className="iwfw-field-grid iwfw-field-grid--2">
                  <label className="iwfw-field">
                    <span>Host</span>
                    <input
                      className="iwfw-control"
                      name="popHost"
                      defaultValue={client.mailbox?.popHost ?? ""}
                      placeholder="Leave blank if unused"
                    />
                  </label>
                  <label className="iwfw-field">
                    <span>Port</span>
                    <input
                      className="iwfw-control"
                      name="popPort"
                      type="number"
                      defaultValue={client.mailbox?.popPort ?? 995}
                    />
                  </label>
                  <label className="iwfw-field">
                    <span>Security</span>
                    <select
                      className="iwfw-control"
                      name="popSecurity"
                      defaultValue={client.mailbox?.popSecurity ?? "ssl"}
                    >
                      <option value="ssl">SSL/TLS</option>
                      <option value="starttls">STARTTLS</option>
                      <option value="none">None</option>
                    </select>
                  </label>
                </div>
              </fieldset>

              <label className="iwfw-field">
                <span>Customer notes</span>
                <textarea
                  className="iwfw-control"
                  name="customerNotes"
                  rows={3}
                  defaultValue={client.mailbox?.customerNotes ?? ""}
                  placeholder="Optional tip for the customer (e.g. change password after first login)"
                />
              </label>
              <label className="iwfw-field">
                <span>Admin notes (internal)</span>
                <textarea
                  className="iwfw-control"
                  name="adminNotes"
                  rows={2}
                  defaultValue={client.mailbox?.adminNotes ?? ""}
                />
              </label>
              <label className="iwfw-check">
                <input type="checkbox" name="notifyCustomer" defaultChecked />
                <span>Notify customer that email details were updated</span>
              </label>
              <button
                type="submit"
                className="iwfw-btn iwfw-btn--green"
                disabled={busy}
              >
                {busy ? "Saving…" : "Save mailbox details"}
              </button>
            </Form>
          </section>
        </div>
      ) : null}

      {tab === "images" ? (
        <section className="iwfw-admin-panel">
          {client.uploads.length === 0 ? (
            <p className="iwfw-admin-empty">No images uploaded yet.</p>
          ) : (
            <ul className="iwfw-admin-media">
              {client.uploads.map((u) => (
                <li key={u.id} className="iwfw-admin-media__item">
                  <img
                    src={u.contentUrl}
                    alt=""
                    className="iwfw-admin-media__thumb"
                    loading="lazy"
                  />
                  <div className="iwfw-admin-media__body">
                    <strong>{u.originalFilename}</strong>
                    <p>
                      {u.categoryLabel} · {formatAdminDate(u.createdAt)}
                    </p>
                  </div>
                  <a
                    href={u.contentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="iwfw-btn iwfw-btn--outline iwfw-admin__btn-sm"
                  >
                    Open
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {tab === "billing" ? (
        <div className="iwfw-admin-grid">
          <section className="iwfw-admin-panel">
            <div className="iwfw-admin-panel__head">
              <h2>Profitability estimate</h2>
            </div>
            <p className="iwfw-admin-muted">
              Simple estimate from £39.99/mo revenue minus staff-entered
              operating costs. Not accounting software.
            </p>
            <dl className="iwfw-dash-dl">
              <div>
                <dt>Revenue / month</dt>
                <dd>{formatGbpFromPence(loaderData.costs.revenuePence)}</dd>
              </div>
              <div>
                <dt>Est. costs / month</dt>
                <dd>{formatGbpFromPence(loaderData.costs.costMonthlyPence)}</dd>
              </div>
              <div>
                <dt>Est. profit / month</dt>
                <dd>{formatGbpFromPence(loaderData.costs.profitMonthlyPence)}</dd>
              </div>
            </dl>
            <Form method="post" className="iwfw-start__form">
              <input type="hidden" name="intent" value="save_costs" />
              <input type="hidden" name="tab" value="billing" />
              <label className="iwfw-field">
                <span>Domain cost £ / year</span>
                <input
                  className="iwfw-control"
                  name="domainAnnual"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={(loaderData.costs.domainAnnualPence / 100).toFixed(2)}
                />
              </label>
              <label className="iwfw-field">
                <span>Mailbox £ / month</span>
                <input
                  className="iwfw-control"
                  name="mailboxMonthly"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={(loaderData.costs.mailboxMonthlyPence / 100).toFixed(2)}
                />
              </label>
              <label className="iwfw-field">
                <span>Hosting £ / month</span>
                <input
                  className="iwfw-control"
                  name="hostingMonthly"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={(loaderData.costs.hostingMonthlyPence / 100).toFixed(2)}
                />
              </label>
              <label className="iwfw-field">
                <span>Other £ / month</span>
                <input
                  className="iwfw-control"
                  name="otherMonthly"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={(loaderData.costs.otherMonthlyPence / 100).toFixed(2)}
                />
              </label>
              <label className="iwfw-field">
                <span>Notes</span>
                <input
                  className="iwfw-control"
                  name="costNotes"
                  defaultValue={loaderData.costs.notes ?? ""}
                />
              </label>
              <button type="submit" className="iwfw-btn iwfw-btn--outline" disabled={busy}>
                {busy ? "Saving…" : "Save costs"}
              </button>
            </Form>
          </section>
          <section className="iwfw-admin-panel">
            <div className="iwfw-admin-panel__head">
              <h2>Subscriptions</h2>
            </div>
            {client.subscriptions.length === 0 ? (
              <p className="iwfw-admin-empty">No subscription yet.</p>
            ) : (
              <ul className="iwfw-admin-list">
                {client.subscriptions.map((s) => (
                  <li key={s.id}>
                    <div>
                      <strong>
                        {s.planLabel}{" "}
                        <Badge tone={statusTone(s.status)}>{s.status}</Badge>
                      </strong>
                      <p>
                        {formatAdminDate(s.currentPeriodStart)} →{" "}
                        {formatAdminDate(s.currentPeriodEnd)}
                        {s.cancelAtPeriodEnd ? " · cancelling" : ""}
                      </p>
                    </div>
                    <span>{formatAdminDate(s.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="iwfw-admin-panel">
            <div className="iwfw-admin-panel__head">
              <h2>Invoices</h2>
            </div>
            {loaderData.invoiceError ? (
              <p className="iwfw-admin-empty">{loaderData.invoiceError}</p>
            ) : loaderData.invoices.length === 0 ? (
              <p className="iwfw-admin-empty">No Stripe invoices yet.</p>
            ) : (
              <ul className="iwfw-invoice-list">
                {loaderData.invoices.map((inv) => (
                  <li key={inv.id}>
                    <div>
                      <strong>
                        {inv.number || inv.id}{" "}
                        <Badge tone={statusTone(inv.status || "")}>
                          {inv.status || "—"}
                        </Badge>
                      </strong>
                      <p className="iwfw-admin-muted">
                        {formatAdminDate(inv.createdAt)} ·{" "}
                        {formatGbpFromPence(inv.total)}
                      </p>
                    </div>
                    {inv.invoicePdfUrl ? (
                      <a
                        href={`/admin/clients/${client.org.id}/invoice/${inv.id}.pdf`}
                        className="iwfw-btn iwfw-btn--outline iwfw-admin__btn-sm"
                      >
                        PDF
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="iwfw-admin-panel iwfw-admin-panel--wide">
            <div className="iwfw-admin-panel__head">
              <h2>Orders</h2>
            </div>
            {client.orders.length === 0 ? (
              <p className="iwfw-admin-empty">No linked orders.</p>
            ) : (
              <ul className="iwfw-admin-list">
                {client.orders.map((o) => (
                  <li key={o.id}>
                    <div>
                      <strong>
                        {o.tradingName || o.id}{" "}
                        <Badge tone={statusTone(o.status)}>{o.status}</Badge>
                      </strong>
                      <p>
                        {o.email || "—"} · {o.domainName || "no domain"}
                      </p>
                    </div>
                    <span>{formatAdminDate(o.paidAt || o.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}

      {tab === "tasks" ? (
        <div className="iwfw-admin-grid">
          <section className="iwfw-admin-panel">
            <div className="iwfw-admin-panel__head">
              <h2>Domain tasks</h2>
              <Link to="/admin/domains">Queue</Link>
            </div>
            {client.domainTasks.length === 0 ? (
              <p className="iwfw-admin-empty">No domain tasks.</p>
            ) : (
              <ul className="iwfw-admin-list">
                {client.domainTasks.map((t) => (
                  <li key={t.id}>
                    <div>
                      <strong>
                        {t.domainName}{" "}
                        <Badge tone={statusTone(t.status)}>{t.status}</Badge>
                      </strong>
                      <p>
                        {t.domainMode} · {t.statusLabel}
                      </p>
                    </div>
                    <span>{formatAdminDate(t.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="iwfw-admin-panel">
            <div className="iwfw-admin-panel__head">
              <h2>Asset transfers</h2>
              <Link to="/admin/transfers">Queue</Link>
            </div>
            {client.transfers.length === 0 ? (
              <p className="iwfw-admin-empty">No transfer tasks.</p>
            ) : (
              <ul className="iwfw-admin-list">
                {client.transfers.map((t) => (
                  <li key={t.id}>
                    <div>
                      <strong>
                        Transfer{" "}
                        <Badge tone={statusTone(t.status)}>{t.status}</Badge>
                      </strong>
                      <p>Period end {formatAdminDate(t.periodEndAt)}</p>
                    </div>
                    <span>{formatAdminDate(t.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}

function BriefCard({
  title,
  rows,
}: {
  title: string;
  rows: Array<[string, string]>;
}) {
  return (
    <section className="iwfw-admin-panel">
      <div className="iwfw-admin-panel__head">
        <h2>{title}</h2>
      </div>
      <dl className="iwfw-admin-dl">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value?.trim() ? value : "—"}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
