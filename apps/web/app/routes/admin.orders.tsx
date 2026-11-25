import { Form, Link, useNavigation, useSearchParams } from "react-router";
import { createDb } from "@iwfw/db";
import { getConfig, getEnv } from "../lib/env.server";
import { requireStaffSession } from "../lib/session.server";
import { formatAdminDate } from "../lib/admin-ops";
import { listAdminOrders } from "../lib/admin-ops.server";
import {
  canDeletePendingOrder,
  canRemindPendingOrder,
  deleteUnpaidPendingOrder,
  sendPendingOrderReminder,
} from "../lib/admin-orders.server";
import { clientIpFromRequest } from "../lib/audit-log.server";
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

const FILTERS = [
  { id: "all", label: "All" },
  { id: "funnel", label: "Unpaid funnel" },
  { id: "paid", label: "Paid" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

function parseFilter(value: string | null): FilterId {
  if (value === "funnel" || value === "paid") return value;
  return "all";
}

export async function loader({ request, context }: Route.LoaderArgs) {
  await requireStaffSession(request, context);
  const db = createDb(getEnv(context).DB);
  const orders = await listAdminOrders(db);
  return {
    orders: orders.map((o) => ({
      ...o,
      canDelete: canDeletePendingOrder(o).ok,
      canRemind: canRemindPendingOrder(o).ok,
    })),
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const staff = await requireStaffSession(request, context);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const orderId = String(form.get("orderId") ?? "").trim();
  if (!orderId) return { error: "Missing order." };

  const env = getEnv(context);
  const db = createDb(env.DB);
  const ip = clientIpFromRequest(request);

  if (intent === "remind") {
    const result = await sendPendingOrderReminder({
      db,
      config: getConfig(context),
      actorUserId: staff.userId,
      orderId,
      ip,
    });
    return result;
  }

  if (intent === "delete") {
    const result = await deleteUnpaidPendingOrder({
      db,
      env,
      actorUserId: staff.userId,
      orderId,
      ip,
    });
    if (result.ok) {
      return { ok: true as const, message: `Deleted order for ${result.label}.` };
    }
    return result;
  }

  return { error: "Unknown action." };
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

export default function AdminOrdersPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const [params] = useSearchParams();
  const filter = parseFilter(params.get("filter"));
  const orders = loaderData.orders.filter((o) => {
    if (filter === "funnel") return o.canDelete;
    if (filter === "paid") return o.status === "paid";
    return true;
  });
  const funnelCount = loaderData.orders.filter((o) => o.canDelete).length;

  return (
    <div className="adm-page">
      <AdminPageHeader
        kicker="Funnel"
        title="Orders"
        lead="Pending and paid checkout orders from the get-started funnel. Remind people who have not paid yet, or delete unfinished drafts."
        aside={<AdminCount value={loaderData.orders.length} label="total" />}
      />

      {actionData && "error" in actionData && actionData.error ? (
        <p className="adm-alert adm-alert--error" role="alert">
          {actionData.error}
        </p>
      ) : null}
      {actionData && "ok" in actionData && actionData.ok && "message" in actionData ? (
        <p className="adm-alert adm-alert--ok" role="status">
          {actionData.message}
        </p>
      ) : null}

      <nav className="adm-tabs" aria-label="Filter orders">
        {FILTERS.map((tab) => {
          const href =
            tab.id === "all" ? "/admin/orders" : `/admin/orders?filter=${tab.id}`;
          const active = filter === tab.id;
          const count =
            tab.id === "funnel"
              ? funnelCount
              : tab.id === "paid"
                ? loaderData.orders.filter((o) => o.status === "paid").length
                : loaderData.orders.length;
          return (
            <Link
              key={tab.id}
              to={href}
              className={active ? "is-active" : undefined}
            >
              {tab.label} ({count})
            </Link>
          );
        })}
      </nav>

      <section className="adm-sheet" aria-label="Orders">
        {orders.length === 0 ? (
          <p className="adm-empty">No orders in this view.</p>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table adm-table--orders">
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
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
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
                      {o.reminderSentAt ? (
                        <span className="adm-sub">
                          Reminded {formatAdminDate(o.reminderSentAt)}
                          {o.reminderSendCount > 1
                            ? ` · ${o.reminderSendCount}×`
                            : ""}
                        </span>
                      ) : null}
                    </td>
                    <td className="is-num">{formatAdminDate(o.paidAt)}</td>
                    <td className="is-num">{formatAdminDate(o.createdAt)}</td>
                    <td>
                      {o.canDelete || o.canRemind ? (
                        <div className="adm-actions">
                          {o.canRemind ? (
                            <Form method="post">
                              <input type="hidden" name="orderId" value={o.id} />
                              <input type="hidden" name="intent" value="remind" />
                              <button
                                type="submit"
                                className="adm-btn adm-btn--sm adm-btn--ink"
                                disabled={busy}
                                aria-label={`Send reminder to ${o.email}`}
                              >
                                Send reminder
                              </button>
                            </Form>
                          ) : null}
                          {o.canDelete ? (
                            <Form
                              method="post"
                              onSubmit={(event) => {
                                const who = o.tradingName || o.email || o.id;
                                if (
                                  !window.confirm(
                                    `Delete the unfinished order for ${who}? This cannot be undone.`,
                                  )
                                ) {
                                  event.preventDefault();
                                }
                              }}
                            >
                              <input type="hidden" name="orderId" value={o.id} />
                              <input type="hidden" name="intent" value="delete" />
                              <button
                                type="submit"
                                className="adm-btn adm-btn--sm adm-btn--danger"
                                disabled={busy}
                                aria-label={`Delete unfinished order for ${o.tradingName || o.email || o.id}`}
                              >
                                Delete
                              </button>
                            </Form>
                          ) : null}
                        </div>
                      ) : (
                        <span className="adm-quiet">—</span>
                      )}
                    </td>
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
