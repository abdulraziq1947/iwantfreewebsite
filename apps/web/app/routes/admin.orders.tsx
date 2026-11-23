import { Badge } from "@iwfw/ui";
import { createDb } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import { requireStaffSession } from "../lib/session.server";
import { formatAdminDate, listAdminOrders } from "../lib/admin-ops.server";
import type { Route } from "./+types/admin.orders";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Orders — Admin" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  await requireStaffSession(request, context);
  const db = createDb(getEnv(context).DB);
  return { orders: await listAdminOrders(db) };
}

function orderTone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "paid") return "success";
  if (status === "checkout_open" || status === "ready_for_checkout") {
    return "warning";
  }
  if (status === "failed" || status === "expired" || status === "abandoned") {
    return "danger";
  }
  return "neutral";
}

export default function AdminOrdersPage({ loaderData }: Route.ComponentProps) {
  return (
    <div className="iwfw-admin-page">
      <header className="iwfw-admin-page__header">
        <div>
          <p className="iwfw-admin-page__eyebrow">Funnel</p>
          <h1>Orders</h1>
          <p>
            Pending and paid checkout orders from the get-started funnel —
            including drafts still in progress.
          </p>
        </div>
        <p className="iwfw-admin-page__count">{loaderData.orders.length} total</p>
      </header>

      <section className="iwfw-admin-panel">
        {loaderData.orders.length === 0 ? (
          <p className="iwfw-admin-empty">No orders yet.</p>
        ) : (
          <div className="iwfw-admin-table-wrap">
            <table className="iwfw-admin-table">
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Contact</th>
                  <th>Domain</th>
                  <th>Status</th>
                  <th>Paid</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {loaderData.orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <strong>{o.tradingName || "—"}</strong>
                      <span className="iwfw-admin-table__sub">{o.id}</span>
                    </td>
                    <td>
                      <strong>{o.fullName || "—"}</strong>
                      <span className="iwfw-admin-table__sub">
                        {o.email || "—"}
                      </span>
                    </td>
                    <td>
                      {o.domainName ? (
                        <>
                          <strong>{o.domainName}</strong>
                          <span className="iwfw-admin-table__sub">
                            {o.domainMode ?? "—"}
                          </span>
                        </>
                      ) : (
                        <span className="iwfw-admin-muted">None</span>
                      )}
                    </td>
                    <td>
                      <Badge tone={orderTone(o.status)}>{o.status}</Badge>
                    </td>
                    <td>{formatAdminDate(o.paidAt)}</td>
                    <td>{formatAdminDate(o.createdAt)}</td>
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
