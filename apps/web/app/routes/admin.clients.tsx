import { Form, Link, useSearchParams } from "react-router";
import { Badge } from "@iwfw/ui";
import { createDb } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import { requireStaffSession } from "../lib/session.server";
import { formatAdminDate } from "../lib/admin-ops";
import { listAdminClients } from "../lib/admin-ops.server";
import { filterAdminClients } from "../lib/admin-clients-filter";
import type { Route } from "./+types/admin.clients";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Clients — Admin" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  await requireStaffSession(request, context);
  const db = createDb(getEnv(context).DB);
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const live = (url.searchParams.get("live") ?? "all") as
    | "all"
    | "live"
    | "not_live";
  const attention = (url.searchParams.get("attention") ?? "all") as
    | "all"
    | "needs";
  const clients = await listAdminClients(db);
  const filtered = filterAdminClients(clients, { q, live, attention });
  return {
    clients: filtered,
    total: clients.length,
    filters: { q, live, attention },
  };
}

function statusTone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "active") return "success";
  if (status === "cancelling" || status === "prospect") return "warning";
  if (status === "cancelled" || status === "churned") return "danger";
  return "neutral";
}

export default function AdminClientsPage({ loaderData }: Route.ComponentProps) {
  const [params] = useSearchParams();
  const { filters } = loaderData;
  const deleted = params.get("deleted") === "1";

  return (
    <div className="iwfw-admin-page">
      <header className="iwfw-admin-page__header">
        <div>
          <p className="iwfw-admin-page__eyebrow">Clients</p>
          <h1>Client folders</h1>
          <p>
            Search and filter by live status or staff attention. Open a client
            for brief, email, billing and launch controls.
          </p>
        </div>
        <p className="iwfw-admin-page__count">
          {loaderData.clients.length} shown · {loaderData.total} total
        </p>
      </header>

      {deleted ? (
        <p className="iwfw-admin-banner iwfw-admin-banner--ok" role="status">
          Client permanently deleted.
        </p>
      ) : null}

      <Form method="get" className="iwfw-admin-filters">
        <label className="iwfw-field">
          <span>Search</span>
          <input
            className="iwfw-control"
            type="search"
            name="q"
            placeholder="Business, email, name…"
            defaultValue={filters.q}
          />
        </label>
        <label className="iwfw-field">
          <span>Website</span>
          <select
            className="iwfw-control"
            name="live"
            defaultValue={filters.live}
          >
            <option value="all">All</option>
            <option value="live">Live</option>
            <option value="not_live">Not live</option>
          </select>
        </label>
        <label className="iwfw-field">
          <span>Attention</span>
          <select
            className="iwfw-control"
            name="attention"
            defaultValue={filters.attention}
          >
            <option value="all">All</option>
            <option value="needs">Needs attention</option>
          </select>
        </label>
        <button type="submit" className="iwfw-btn iwfw-btn--outline">
          Apply
        </button>
        {params.toString() ? (
          <Link to="/admin/clients" className="iwfw-btn iwfw-btn--outline">
            Clear
          </Link>
        ) : null}
      </Form>

      <section className="iwfw-admin-panel">
        {loaderData.clients.length === 0 ? (
          <p className="iwfw-admin-empty">No clients match these filters.</p>
        ) : (
          <div className="iwfw-admin-table-wrap">
            <table className="iwfw-admin-table">
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Contact</th>
                  <th>Org status</th>
                  <th>Website</th>
                  <th>Attention</th>
                  <th>Subscription</th>
                  <th>Renews</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {loaderData.clients.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>
                        <Link to={`/admin/clients/${c.id}`}>{c.tradingName}</Link>
                      </strong>
                      <span className="iwfw-admin-table__sub">{c.id}</span>
                    </td>
                    <td>
                      <strong>{c.contactName ?? "—"}</strong>
                      <span className="iwfw-admin-table__sub">
                        {c.contactEmail ?? "—"}
                      </span>
                    </td>
                    <td>
                      <Badge tone={statusTone(c.status)}>{c.status}</Badge>
                    </td>
                    <td>
                      <Badge tone={c.websiteLive ? "success" : "warning"}>
                        {c.websiteLive ? "Live" : "Not live"}
                      </Badge>
                    </td>
                    <td>
                      {c.attentionCount > 0 ? (
                        <Badge tone="warning">{c.attentionCount}</Badge>
                      ) : (
                        <span className="iwfw-admin-muted">Clear</span>
                      )}
                    </td>
                    <td>
                      {c.subscriptionStatus ? (
                        <>
                          <Badge
                            tone={
                              c.subscriptionStatus === "active" ||
                              c.subscriptionStatus === "trialing"
                                ? "success"
                                : "neutral"
                            }
                          >
                            {c.subscriptionStatus}
                          </Badge>
                          {c.cancelAtPeriodEnd ? (
                            <span className="iwfw-admin-table__sub">
                              Cancelling at period end
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <span className="iwfw-admin-muted">None</span>
                      )}
                    </td>
                    <td>{formatAdminDate(c.currentPeriodEnd)}</td>
                    <td>{formatAdminDate(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
