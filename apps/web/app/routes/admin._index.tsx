import { Link } from "react-router";
import { Badge } from "@iwfw/ui";
import { createDb } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import { requireStaffSession } from "../lib/session.server";
import {
  formatAdminDate,
  getAdminOverview,
} from "../lib/admin-ops.server";
import type { Route } from "./+types/admin._index";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Admin overview — iwantfreewebsite" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  await requireStaffSession(request, context);
  const db = createDb(getEnv(context).DB);
  return getAdminOverview(db);
}

export default function AdminHome({ loaderData }: Route.ComponentProps) {
  const { kpis } = loaderData;

  return (
    <div className="iwfw-admin-page">
      <header className="iwfw-admin-page__header">
        <div>
          <p className="iwfw-admin-page__eyebrow">Overview</p>
          <h1>Operations dashboard</h1>
          <p>
            New subscriptions, clients, estimated recurring revenue and open
            tasks — domains are never purchased automatically.
          </p>
        </div>
      </header>

      <section className="iwfw-admin-kpis" aria-label="Key metrics">
        <Kpi
          label="Estimated MRR"
          value={kpis.estimatedMrrLabel}
          hint={`${kpis.blockingSubscriptions} active-like plans`}
        />
        <Kpi
          label="Active clients"
          value={String(kpis.activeClients)}
          hint={`${kpis.totalOrganisations} organisations total`}
        />
        <Kpi
          label="New subs · 7 days"
          value={String(kpis.newSubscriptions7d)}
          hint={`${kpis.paidOrders7d} paid orders this week`}
        />
        <Kpi
          label="Open domain tasks"
          value={String(kpis.openDomainTasks)}
          hint={`${kpis.openTransferTasks} transfer · ${kpis.openCheckoutOrders} open checkout`}
        />
      </section>

      <div className="iwfw-admin-grid">
        <section className="iwfw-admin-panel">
          <div className="iwfw-admin-panel__head">
            <h2>New &amp; active subscriptions</h2>
            <Link to="/admin/subscriptions">View all</Link>
          </div>
          <AdminTable
            empty="No subscriptions yet."
            rows={loaderData.recentSubscriptions.map((s) => ({
              key: s.id,
              title: s.tradingName,
              meta: `${s.status}${s.cancelAtPeriodEnd ? " · cancelling" : ""} · renews ${formatAdminDate(s.currentPeriodEnd)}`,
              right: formatAdminDate(s.createdAt),
            }))}
          />
        </section>

        <section className="iwfw-admin-panel">
          <div className="iwfw-admin-panel__head">
            <h2>Recent clients</h2>
            <Link to="/admin/clients">View all</Link>
          </div>
          <AdminTable
            empty="No clients yet."
            rows={loaderData.recentClients.map((c) => ({
              key: c.id,
              title: c.tradingName,
              meta: c.status,
              right: formatAdminDate(c.createdAt),
              badge: c.status,
            }))}
          />
        </section>

        <section className="iwfw-admin-panel">
          <div className="iwfw-admin-panel__head">
            <h2>Pending domain tasks</h2>
            <Link to="/admin/domains">Manage</Link>
          </div>
          <AdminTable
            empty="No open domain tasks."
            rows={loaderData.pendingDomainTasks.map((t) => ({
              key: t.id,
              title: t.domainName,
              meta: `${t.tradingName} · ${t.domainMode} · ${t.status}`,
              right: formatAdminDate(t.createdAt),
            }))}
          />
        </section>

        <section className="iwfw-admin-panel">
          <div className="iwfw-admin-panel__head">
            <h2>Asset transfers</h2>
            <Link to="/admin/transfers">Manage</Link>
          </div>
          <AdminTable
            empty="No open transfer tasks."
            rows={loaderData.pendingTransfers.map((t) => ({
              key: t.id,
              title: t.tradingName,
              meta: `${t.status} · period end ${formatAdminDate(t.periodEndAt)}`,
              right: formatAdminDate(t.createdAt),
            }))}
          />
        </section>

        <section className="iwfw-admin-panel iwfw-admin-panel--wide">
          <div className="iwfw-admin-panel__head">
            <h2>Recent paid orders</h2>
            <Link to="/admin/orders">View all orders</Link>
          </div>
          <AdminTable
            empty="No paid orders yet."
            rows={loaderData.recentPaidOrders.map((o) => ({
              key: o.id,
              title: o.tradingName || o.email || o.id,
              meta: `${o.email ?? "—"} · ${o.domainName ?? "no domain"}`,
              right: formatAdminDate(o.paidAt),
            }))}
          />
        </section>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <article className="iwfw-admin-kpi">
      <p className="iwfw-admin-kpi__label">{label}</p>
      <p className="iwfw-admin-kpi__value">{value}</p>
      <p className="iwfw-admin-kpi__hint">{hint}</p>
    </article>
  );
}

function AdminTable({
  rows,
  empty,
}: {
  empty: string;
  rows: Array<{
    key: string;
    title: string;
    meta: string;
    right: string;
    badge?: string;
  }>;
}) {
  if (rows.length === 0) {
    return <p className="iwfw-admin-empty">{empty}</p>;
  }
  return (
    <ul className="iwfw-admin-list">
      {rows.map((row) => (
        <li key={row.key}>
          <div>
            <strong>
              {row.title}
              {row.badge ? (
                <>
                  {" "}
                  <Badge tone={row.badge === "active" ? "success" : "neutral"}>
                    {row.badge}
                  </Badge>
                </>
              ) : null}
            </strong>
            <p>{row.meta}</p>
          </div>
          <span>{row.right}</span>
        </li>
      ))}
    </ul>
  );
}
