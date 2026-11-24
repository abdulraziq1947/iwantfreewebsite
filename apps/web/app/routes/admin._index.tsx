import type { CSSProperties, ReactNode } from "react";
import { Link, useRouteLoaderData } from "react-router";
import { createDb } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import { requireStaffSession } from "../lib/session.server";
import { formatAdminDate } from "../lib/admin-ops";
import { getAdminOverview } from "../lib/admin-ops.server";
import { summariseProductEvents } from "../lib/analytics.server";
import { AdminPageHeader, AdminStatus, statusLabel } from "../components/admin-ui";
import type { loader as adminLayoutLoader } from "./admin-layout";
import type { Route } from "./+types/admin._index";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Admin overview — iwantfreewebsite" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  await requireStaffSession(request, context);
  const db = createDb(getEnv(context).DB);
  const [overview, analytics] = await Promise.all([
    getAdminOverview(db),
    summariseProductEvents(db, 30),
  ]);
  return { ...overview, analytics };
}

type Tone = "success" | "warning" | "danger" | "neutral";

function workTone(status: string): Tone {
  if (status === "connected" || status === "registered" || status === "completed") {
    return "success";
  }
  if (status === "pending" || status === "in_progress") return "warning";
  return "neutral";
}

function accountTone(status: string): Tone {
  if (status === "active" || status === "trialing") return "success";
  if (
    status === "past_due" ||
    status === "unpaid" ||
    status === "cancelling" ||
    status === "prospect"
  ) {
    return "warning";
  }
  if (status === "cancelled" || status === "canceled" || status === "churned") {
    return "danger";
  }
  return "neutral";
}

export default function AdminHome({ loaderData }: Route.ComponentProps) {
  const { kpis, analytics } = loaderData;
  const counts = analytics.counts;
  const shell = useRouteLoaderData<typeof adminLayoutLoader>("routes/admin-layout");

  const queues = [
    {
      to: "/admin/support",
      count: shell?.openTickets ?? 0,
      name: "Support tickets",
      detail: "Open, or waiting on a staff reply",
    },
    {
      to: "/admin/domains",
      count: kpis.openDomainTasks,
      name: "Domain tasks",
      detail: "To register or connect by hand",
    },
    {
      to: "/admin/orders",
      count: kpis.openCheckoutOrders,
      name: "Open checkouts",
      detail: "Drafts and checkouts not yet paid",
    },
    {
      to: "/admin/transfers",
      count: kpis.openTransferTasks,
      name: "Asset transfers",
      detail: "Hand-offs after a subscription ends",
    },
    {
      to: "/admin/notifications",
      count: shell?.notifyUnread ?? 0,
      name: "Unread notifications",
      detail: "Uploads, billing, mailbox, support and GMB updates",
    },
  ];
  const waiting = queues.filter((q) => q.count > 0).length;

  const funnel = [
    { label: "Signups", value: counts.signup_completed ?? 0, note: "Account created" },
    {
      label: "Checkouts started",
      value: counts.checkout_started ?? 0,
      note: "Reached Stripe",
    },
    { label: "Checkouts completed", value: counts.checkout_completed ?? 0, note: "Paid" },
    {
      label: "Activations",
      value: counts.activation_completed ?? 0,
      note: "Password set from email",
    },
  ];
  const funnelMax = Math.max(1, ...funnel.map((step) => step.value));

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="adm-page">
      <AdminPageHeader
        kicker="Overview"
        title="Operations overview"
        lead="Work waiting in each queue, what’s come in recently, and how the client book stands."
        aside={
          <p className="adm-head__date" suppressHydrationWarning>
            {today}
          </p>
        }
      />

      <div className="adm-overview">
        <section className="adm-sheet adm-queues" aria-labelledby="adm-queues-h">
          <div className="adm-sheet__head">
            <h2 id="adm-queues-h">Needs attention</h2>
            <p className="adm-sheet__meta">
              {waiting === 0
                ? "Every queue is clear"
                : `${waiting} of ${queues.length} queues have work waiting`}
            </p>
          </div>
          <ul className="adm-queues__list">
            {queues.map((q) => (
              <li key={q.to} className={q.count > 0 ? "is-waiting" : "is-clear"}>
                <Link to={q.to} className="adm-queues__row">
                  <span className="adm-queues__count">{q.count}</span>
                  <span className="adm-queues__name">
                    <strong>{q.name}</strong>
                    <span>{q.detail}</span>
                  </span>
                  <span className="adm-queues__go">
                    {q.count > 0 ? "Open queue" : "Clear"}
                    <span aria-hidden="true"> →</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="adm-queues__foot">
            Weekly GBP posts, renewals and overdue builds live in{" "}
            <Link to="/admin/ops">Ops tasks</Link>.
          </p>
        </section>

        <section className="adm-sheet adm-book" aria-labelledby="adm-book-h">
          <div className="adm-sheet__head">
            <h2 id="adm-book-h">Revenue &amp; clients</h2>
            <Link to="/admin/subscriptions" className="adm-sheet__link">
              Subscriptions
            </Link>
          </div>
          <div className="adm-book__hero">
            <p className="adm-book__label">Estimated MRR</p>
            <p className="adm-book__value">{kpis.estimatedMrrLabel}</p>
            <p className="adm-book__note">
              {kpis.blockingSubscriptions} active-like plan
              {kpis.blockingSubscriptions === 1 ? "" : "s"} at the standard monthly price
            </p>
          </div>
          <dl className="adm-ledger">
            <div>
              <dt>Active clients</dt>
              <dd>
                {kpis.activeClients}
                <small> of {kpis.totalOrganisations}</small>
              </dd>
            </div>
            <div>
              <dt>New subscriptions, 7 days</dt>
              <dd>{kpis.newSubscriptions7d}</dd>
            </div>
            <div>
              <dt>Paid orders, 7 days</dt>
              <dd>{kpis.paidOrders7d}</dd>
            </div>
          </dl>
        </section>

        <section className="adm-sheet adm-funnel" aria-labelledby="adm-funnel-h">
          <div className="adm-sheet__head">
            <h2 id="adm-funnel-h">Funnel</h2>
            <p className="adm-sheet__meta">Event counts, last 30 days</p>
          </div>
          <div className="adm-funnel__body">
            <ol className="adm-funnel__steps">
              {funnel.map((step) => (
                <li key={step.label}>
                  <span className="adm-funnel__label">{step.label}</span>
                  <span className="adm-funnel__value">{step.value}</span>
                  <span
                    className="adm-funnel__bar"
                    style={
                      { "--adm-w": `${(step.value / funnelMax) * 100}%` } as CSSProperties
                    }
                    aria-hidden="true"
                  />
                  <span className="adm-funnel__note">{step.note}</span>
                </li>
              ))}
            </ol>
            <dl className="adm-funnel__loss">
              <div
                className={
                  (counts.subscription_cancelled ?? 0) > 0 ? "is-loss" : undefined
                }
              >
                <dt>Cancelled</dt>
                <dd>{counts.subscription_cancelled ?? 0}</dd>
              </div>
              <div className={(counts.payment_failed ?? 0) > 0 ? "is-loss" : undefined}>
                <dt>Payment failed</dt>
                <dd>{counts.payment_failed ?? 0}</dd>
              </div>
            </dl>
          </div>
        </section>
      </div>

      <div className="adm-split">
        <TableSheet
          id="adm-ov-domains"
          title="Pending domain tasks"
          href="/admin/domains"
          linkLabel="Domain queue"
          empty="No open domain tasks."
          head={["Domain", "Client", "Status", "Logged"]}
          rows={loaderData.pendingDomainTasks.map((t) => ({
            key: t.id,
            cells: [
              <>
                <strong>{t.domainName}</strong>
                <span className="adm-sub">{statusLabel(t.domainMode)}</span>
              </>,
              <Link to={`/admin/clients/${t.organisationId}`}>{t.tradingName}</Link>,
              <AdminStatus tone={workTone(t.status)}>
                {statusLabel(t.status)}
              </AdminStatus>,
              formatAdminDate(t.createdAt),
            ],
          }))}
        />

        <TableSheet
          id="adm-ov-transfers"
          title="Asset transfers"
          href="/admin/transfers"
          linkLabel="Transfer queue"
          empty="No open transfer tasks."
          head={["Client", "Status", "Period ends", "Logged"]}
          rows={loaderData.pendingTransfers.map((t) => ({
            key: t.id,
            cells: [
              <Link to={`/admin/clients/${t.organisationId}`}>{t.tradingName}</Link>,
              <AdminStatus tone={workTone(t.status)}>
                {statusLabel(t.status)}
              </AdminStatus>,
              formatAdminDate(t.periodEndAt),
              formatAdminDate(t.createdAt),
            ],
          }))}
        />

        <TableSheet
          id="adm-ov-subs"
          title="New & active subscriptions"
          href="/admin/subscriptions"
          linkLabel="All subscriptions"
          empty="No subscriptions yet."
          head={["Client", "Status", "Renews", "Started"]}
          rows={loaderData.recentSubscriptions.map((s) => ({
            key: s.id,
            cells: [
              <Link to={`/admin/clients/${s.organisationId}`}>{s.tradingName}</Link>,
              <>
                <AdminStatus tone={accountTone(s.status)}>
                  {statusLabel(s.status)}
                </AdminStatus>
                {s.cancelAtPeriodEnd ? (
                  <span className="adm-sub">Cancels at period end</span>
                ) : null}
              </>,
              formatAdminDate(s.currentPeriodEnd),
              formatAdminDate(s.createdAt),
            ],
          }))}
        />

        <TableSheet
          id="adm-ov-clients"
          title="Recent clients"
          href="/admin/clients"
          linkLabel="All clients"
          empty="No clients yet."
          head={["Client", "Status", "Joined"]}
          rows={loaderData.recentClients.map((c) => ({
            key: c.id,
            cells: [
              <Link to={`/admin/clients/${c.id}`}>{c.tradingName}</Link>,
              <AdminStatus tone={accountTone(c.status)}>
                {statusLabel(c.status)}
              </AdminStatus>,
              formatAdminDate(c.createdAt),
            ],
          }))}
        />

        <TableSheet
          id="adm-ov-orders"
          wide
          title="Recent paid orders"
          href="/admin/orders"
          linkLabel="All orders"
          empty="No paid orders yet."
          head={["Business", "Email", "Domain", "Paid"]}
          rows={loaderData.recentPaidOrders.map((o) => ({
            key: o.id,
            cells: [
              o.organisationId ? (
                <Link to={`/admin/clients/${o.organisationId}`}>
                  {o.tradingName || o.email || o.id}
                </Link>
              ) : (
                <strong>{o.tradingName || o.email || o.id}</strong>
              ),
              o.email ?? "—",
              o.domainName ?? <span className="adm-quiet">No domain</span>,
              formatAdminDate(o.paidAt),
            ],
          }))}
        />
      </div>
    </div>
  );
}

function TableSheet({
  id,
  title,
  href,
  linkLabel,
  empty,
  head,
  rows,
  wide = false,
}: {
  id: string;
  title: string;
  href: string;
  linkLabel: string;
  empty: string;
  head: string[];
  rows: Array<{ key: string; cells: ReactNode[] }>;
  wide?: boolean;
}) {
  const last = head.length - 1;
  return (
    <section
      className={`adm-sheet${wide ? " adm-sheet--wide" : ""}`}
      aria-labelledby={id}
    >
      <div className="adm-sheet__head">
        <h2 id={id}>{title}</h2>
        <Link to={href} className="adm-sheet__link">
          {linkLabel}
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="adm-empty">{empty}</p>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table adm-table--compact">
            <thead>
              <tr>
                {head.map((label, i) => (
                  <th
                    key={label}
                    scope="col"
                    className={i === last ? "is-num" : undefined}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  {row.cells.map((cell, i) => (
                    <td key={i} className={i === last ? "is-num" : undefined}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
