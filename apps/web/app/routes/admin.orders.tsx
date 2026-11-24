import { Link } from "react-router";
import { createDb } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import { requireStaffSession } from "../lib/session.server";
import { formatAdminDate } from "../lib/admin-ops";
import { listAdminOrders } from "../lib/admin-ops.server";
import {
  AdminCount,
  AdminPageHeader,
  AdminStatus,
  statusLabel,
} from "../components/admin-ui";
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
    <div className="adm-page">
      <AdminPageHeader
        kicker="Funnel"
        title="Orders"
        lead="Pending and paid checkout orders from the get-started funnel — including drafts still in progress."
        aside={<AdminCount value={loaderData.orders.length} label="total" />}
      />

      <section className="adm-sheet" aria-label="Orders">
        {loaderData.orders.length === 0 ? (
          <p className="adm-empty">No orders yet.</p>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th scope="col">Business</th>
                  <th scope="col">Contact</th>
                  <th scope="col">Domain</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="is-num">
                    Paid
                  </th>
                  <th scope="col" className="is-num">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {loaderData.orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      {o.organisationId ? (
                        <Link
                          to={`/admin/clients/${o.organisationId}`}
                          className="adm-table__primary"
                        >
                          {o.tradingName || "—"}
                        </Link>
                      ) : (
                        <strong>{o.tradingName || "—"}</strong>
                      )}
                      <span className="adm-id">{o.id}</span>
                    </td>
                    <td>
                      <strong>{o.fullName || "—"}</strong>
                      <span className="adm-sub">{o.email || "—"}</span>
                    </td>
                    <td>
                      {o.domainName ? (
                        <>
                          <strong>{o.domainName}</strong>
                          <span className="adm-sub">{o.domainMode ?? "—"}</span>
                        </>
                      ) : (
                        <span className="adm-quiet">None</span>
                      )}
                    </td>
                    <td>
                      <AdminStatus tone={orderTone(o.status)}>
                        {statusLabel(o.status)}
                      </AdminStatus>
                    </td>
                    <td className="is-num">{formatAdminDate(o.paidAt)}</td>
                    <td className="is-num">{formatAdminDate(o.createdAt)}</td>
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
