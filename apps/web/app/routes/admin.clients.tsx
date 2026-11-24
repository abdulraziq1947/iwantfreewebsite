import { Form, Link, useSearchParams } from "react-router";
import { createDb } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import { requireStaffSession } from "../lib/session.server";
import { formatAdminDate } from "../lib/admin-ops";
import { listAdminClients } from "../lib/admin-ops.server";
import { filterAdminClients } from "../lib/admin-clients-filter";
import {
  AdminCount,
  AdminPageHeader,
  AdminStatus,
  statusLabel,
} from "../components/admin-ui";
import type { Route } from "./+types/admin.clients";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Clients — Admin" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  await requireStaffSession(request, context);
  const db = createDb(getEnv(context).DB);
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const live = (url.searchParams.get("live") ?? "all") as "all" | "live" | "not_live";
  const attention = (url.searchParams.get("attention") ?? "all") as "all" | "needs";
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

function subscriptionTone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "active" || status === "trialing") return "success";
  if (status === "past_due" || status === "unpaid") return "warning";
  if (status === "canceled" || status === "incomplete_expired") return "danger";
  return "neutral";
}

export default function AdminClientsPage({ loaderData }: Route.ComponentProps) {
  const [params] = useSearchParams();
  const { filters } = loaderData;
  const deleted = params.get("deleted") === "1";
  const filtered = params.toString() !== "" && !deleted;

  return (
    <div className="adm-page">
      <AdminPageHeader
        kicker="Clients"
        title="Client folders"
        lead="One folder per website. Filter by live status or staff attention, then open a folder for the brief, email, billing and launch controls."
        aside={
          <AdminCount
            value={loaderData.clients.length}
            label={filtered ? "matching" : "clients"}
            detail={`of ${loaderData.total} in total`}
          />
        }
      />

      {deleted ? (
        <p className="adm-alert adm-alert--ok" role="status">
          Client permanently deleted.
        </p>
      ) : null}

      <section className="adm-sheet" aria-label="Client list">
        <Form method="get" className="adm-toolbar">
          <label className="adm-field adm-toolbar__search">
            <span>Search</span>
            <input
              className="adm-input"
              type="search"
              name="q"
              placeholder="Business, contact name or email"
              defaultValue={filters.q}
            />
          </label>
          <label className="adm-field">
            <span>Website</span>
            <select className="adm-input" name="live" defaultValue={filters.live}>
              <option value="all">All</option>
              <option value="live">Live</option>
              <option value="not_live">Not live</option>
            </select>
          </label>
          <label className="adm-field">
            <span>Attention</span>
            <select
              className="adm-input"
              name="attention"
              defaultValue={filters.attention}
            >
              <option value="all">All</option>
              <option value="needs">Needs attention</option>
            </select>
          </label>
          <div className="adm-toolbar__actions">
            <button type="submit" className="adm-btn adm-btn--ink">
              Apply
            </button>
            {params.toString() ? (
              <Link to="/admin/clients" className="adm-btn">
                Clear
              </Link>
            ) : null}
          </div>
        </Form>

        {loaderData.clients.length === 0 ? (
          <p className="adm-empty">No clients match these filters.</p>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th scope="col">Business</th>
                  <th scope="col">Contact</th>
                  <th scope="col">Status</th>
                  <th scope="col">Website</th>
                  <th scope="col">Attention</th>
                  <th scope="col">Subscription</th>
                  <th scope="col" className="is-num">
                    Renews
                  </th>
                  <th scope="col" className="is-num">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody>
                {loaderData.clients.map((c) => (
                  <tr
                    key={c.id}
                    className={c.attentionCount > 0 ? "is-flagged" : undefined}
                  >
                    <td>
                      <Link to={`/admin/clients/${c.id}`} className="adm-table__primary">
                        {c.tradingName}
                      </Link>
                      <span className="adm-id">{c.id}</span>
                    </td>
                    <td>
                      <strong>{c.contactName ?? "—"}</strong>
                      <span className="adm-sub">{c.contactEmail ?? "—"}</span>
                    </td>
                    <td>
                      <AdminStatus tone={statusTone(c.status)}>
                        {statusLabel(c.status)}
                      </AdminStatus>
                    </td>
                    <td>
                      <AdminStatus tone={c.websiteLive ? "success" : "neutral"}>
                        {c.websiteLive ? "Live" : "Not live"}
                      </AdminStatus>
                    </td>
                    <td>
                      {c.attentionCount > 0 ? (
                        <AdminStatus tone="warning">{c.attentionCount} open</AdminStatus>
                      ) : (
                        <span className="adm-quiet">Clear</span>
                      )}
                    </td>
                    <td>
                      {c.subscriptionStatus ? (
                        <>
                          <AdminStatus tone={subscriptionTone(c.subscriptionStatus)}>
                            {statusLabel(c.subscriptionStatus)}
                          </AdminStatus>
                          {c.cancelAtPeriodEnd ? (
                            <span className="adm-sub">Cancels at period end</span>
                          ) : null}
                        </>
                      ) : (
                        <span className="adm-quiet">None</span>
                      )}
                    </td>
                    <td className="is-num">{formatAdminDate(c.currentPeriodEnd)}</td>
                    <td className="is-num">{formatAdminDate(c.createdAt)}</td>
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
