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
  setGbpAccessGranted,
  unmarkClientWebsiteLive,
  updateOrganisationStatus,
} from "../lib/admin-ops.server";
import { listOrganisationInvoices } from "../lib/billing.server";
import { AttentionBoardCard } from "../components/attention-board";
import type { Route } from "./+types/admin.clients.$orgId";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "brief", label: "Project brief" },
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
  const client = await getAdminClientDetail(db, params.orgId);
  if (!client) {
    throw new Response("Client not found", { status: 404 });
  }
  const invoices = await listOrganisationInvoices({
    config: getConfig(context),
    db,
    organisationId: params.orgId,
  });
  return { client, invoices: invoices.invoices, invoiceError: invoices.error };
}

export async function action({ request, context, params }: Route.ActionArgs) {
  await requireStaffSession(request, context);
  const db = createDb(getEnv(context).DB);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const tab = String(form.get("tab") ?? "overview");

  if (intent === "update_org_status") {
    const status = String(form.get("status") ?? "");
    if (!isOrgStatus(status)) return { error: "Invalid organisation status." };
    const result = await updateOrganisationStatus(db, params.orgId, status);
    if ("error" in result) return result;
    throw redirect(`/admin/clients/${params.orgId}?tab=${tab}`);
  }

  if (intent === "mark_live") {
    const liveUrl = String(form.get("liveUrl") ?? "").trim();
    const result = await markClientWebsiteLive(db, params.orgId, {
      liveUrl: liveUrl || null,
    });
    if ("error" in result) return result;
    throw redirect(`/admin/clients/${params.orgId}?tab=${tab}`);
  }

  if (intent === "unmark_live") {
    const result = await unmarkClientWebsiteLive(db, params.orgId);
    if ("error" in result) return result;
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
                  notification.
                </p>
                <button
                  type="submit"
                  className="iwfw-btn iwfw-btn--green"
                  disabled={busy}
                >
                  {busy ? "Updating…" : "Mark website live"}
                </button>
              </Form>
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
              ["GBP", data.gbp.outcome || data.gbp.profileUrl || "—"],
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
