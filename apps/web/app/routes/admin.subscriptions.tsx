import { Link } from "react-router";
import { createDb } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import { requireStaffSession } from "../lib/session.server";
import { formatAdminDate } from "../lib/admin-ops";
import { listAdminSubscriptions } from "../lib/admin-ops.server";
import {
  AdminCount,
  AdminPageHeader,
  AdminStatus,
  statusLabel,
} from "../components/admin-ui";
import type { Route } from "./+types/admin.subscriptions";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Subscriptions — Admin" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  await requireStaffSession(request, context);
  const db = createDb(getEnv(context).DB);
  return { subscriptions: await listAdminSubscriptions(db) };
}

function subTone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "active" || status === "trialing") return "success";
  if (status === "past_due" || status === "unpaid") return "warning";
  if (status === "canceled" || status === "incomplete_expired") return "danger";
  return "neutral";
}

export default function AdminSubscriptionsPage({ loaderData }: Route.ComponentProps) {
  return (
    <div className="adm-page">
      <AdminPageHeader
        kicker="Billing"
        title="Subscriptions"
        lead="Stripe-backed website plans. Estimated plan value is £39.99/mo per active-like subscription."
        aside={<AdminCount value={loaderData.subscriptions.length} label="total" />}
      />

      <section className="adm-sheet" aria-label="Subscriptions">
        {loaderData.subscriptions.length === 0 ? (
          <p className="adm-empty">No subscriptions yet.</p>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th scope="col">Client</th>
                  <th scope="col">Status</th>
                  <th scope="col">Plan</th>
                  <th scope="col">Period</th>
                  <th scope="col">Stripe ID</th>
                  <th scope="col" className="is-num">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {loaderData.subscriptions.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link
                        to={`/admin/clients/${s.organisationId}`}
                        className="adm-table__primary"
                      >
                        {s.tradingName}
                      </Link>
                      <span className="adm-id">{s.organisationId}</span>
                    </td>
                    <td>
                      <AdminStatus tone={subTone(s.status)}>
                        {statusLabel(s.status)}
                      </AdminStatus>
                      {s.cancelAtPeriodEnd ? (
                        <span className="adm-sub">Cancels at period end</span>
                      ) : null}
                    </td>
                    <td>{s.planLabel}</td>
                    <td className="is-num">
                      {formatAdminDate(s.currentPeriodStart)}
                      {" → "}
                      {formatAdminDate(s.currentPeriodEnd)}
                    </td>
                    <td>
                      <code className="adm-code">{s.stripeSubscriptionId}</code>
                    </td>
                    <td className="is-num">{formatAdminDate(s.createdAt)}</td>
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
