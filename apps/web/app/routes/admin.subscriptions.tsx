import { Badge } from "@iwfw/ui";
import { createDb } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import { requireStaffSession } from "../lib/session.server";
import { formatAdminDate } from "../lib/admin-ops";
import { listAdminSubscriptions } from "../lib/admin-ops.server";
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

export default function AdminSubscriptionsPage({
  loaderData,
}: Route.ComponentProps) {
  return (
    <div className="iwfw-admin-page">
      <header className="iwfw-admin-page__header">
        <div>
          <p className="iwfw-admin-page__eyebrow">Billing</p>
          <h1>Subscriptions</h1>
          <p>
            Stripe-backed website plans. Estimated plan value is £39.99/mo per
            active-like subscription.
          </p>
        </div>
        <p className="iwfw-admin-page__count">
          {loaderData.subscriptions.length} total
        </p>
      </header>

      <section className="iwfw-admin-panel">
        {loaderData.subscriptions.length === 0 ? (
          <p className="iwfw-admin-empty">No subscriptions yet.</p>
        ) : (
          <div className="iwfw-admin-table-wrap">
            <table className="iwfw-admin-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Status</th>
                  <th>Plan</th>
                  <th>Period</th>
                  <th>Stripe ID</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {loaderData.subscriptions.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.tradingName}</strong>
                      <span className="iwfw-admin-table__sub">
                        {s.organisationId}
                      </span>
                    </td>
                    <td>
                      <Badge tone={subTone(s.status)}>{s.status}</Badge>
                      {s.cancelAtPeriodEnd ? (
                        <span className="iwfw-admin-table__sub">
                          Cancels at period end
                        </span>
                      ) : null}
                    </td>
                    <td>{s.planLabel}</td>
                    <td>
                      {formatAdminDate(s.currentPeriodStart)}
                      {" → "}
                      {formatAdminDate(s.currentPeriodEnd)}
                    </td>
                    <td>
                      <code className="iwfw-admin-code">
                        {s.stripeSubscriptionId}
                      </code>
                    </td>
                    <td>{formatAdminDate(s.createdAt)}</td>
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
