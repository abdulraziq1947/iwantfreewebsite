import { Link } from "react-router";
import { Badge } from "@iwfw/ui";
import { createDb } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import { requireStaffSession } from "../lib/session.server";
import { formatAdminDate } from "../lib/admin-ops";
import { listAdminClients } from "../lib/admin-ops.server";
import type { Route } from "./+types/admin.clients";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Clients — Admin" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  await requireStaffSession(request, context);
  const db = createDb(getEnv(context).DB);
  return { clients: await listAdminClients(db) };
}

function statusTone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "active") return "success";
  if (status === "cancelling" || status === "prospect") return "warning";
  if (status === "cancelled" || status === "churned") return "danger";
  return "neutral";
}

export default function AdminClientsPage({ loaderData }: Route.ComponentProps) {
  return (
    <div className="iwfw-admin-page">
      <header className="iwfw-admin-page__header">
        <div>
          <p className="iwfw-admin-page__eyebrow">Clients</p>
          <h1>Client folders</h1>
          <p>
            Open a client to see their progress, brief, images, billing and open
            tasks.
          </p>
        </div>
        <p className="iwfw-admin-page__count">
          {loaderData.clients.length} total
        </p>
      </header>

      <section className="iwfw-admin-panel">
        {loaderData.clients.length === 0 ? (
          <p className="iwfw-admin-empty">No clients yet.</p>
        ) : (
          <div className="iwfw-admin-table-wrap">
            <table className="iwfw-admin-table">
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Contact</th>
                  <th>Org status</th>
                  <th>Website</th>
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
