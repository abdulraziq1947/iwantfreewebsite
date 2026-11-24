import { Form, Link } from "react-router";
import { createDb } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import { requireStaffSession } from "../lib/session.server";
import { formatAdminDate } from "../lib/admin-ops";
import { listAdminTransfers, updateTransferTaskStatus } from "../lib/admin-ops.server";
import {
  AdminCount,
  AdminPageHeader,
  AdminStatus,
  statusLabel,
} from "../components/admin-ui";
import type { Route } from "./+types/admin.transfers";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Asset transfers — Admin" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  await requireStaffSession(request, context);
  const db = createDb(getEnv(context).DB);
  return { tasks: await listAdminTransfers(db) };
}

export async function action({ request, context }: Route.ActionArgs) {
  await requireStaffSession(request, context);
  const form = await request.formData();
  const taskId = String(form.get("taskId") ?? "");
  const intent = String(form.get("intent") ?? "");
  if (!taskId || !intent) {
    return { error: "Missing task or action." };
  }
  const db = createDb(getEnv(context).DB);
  return updateTransferTaskStatus(db, taskId, intent);
}

function transferTone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "completed") return "success";
  if (status === "pending" || status === "in_progress") return "warning";
  return "neutral";
}

export default function AdminTransfersPage({ loaderData }: Route.ComponentProps) {
  return (
    <div className="adm-page">
      <AdminPageHeader
        kicker="Pending tasks"
        title="Asset transfers"
        lead="Hand-off queue when a subscription ends — transfer site assets to the customer when due."
        aside={<AdminCount value={loaderData.tasks.length} label="total" />}
      />

      <section className="adm-sheet" aria-label="Asset transfers">
        {loaderData.tasks.length === 0 ? (
          <p className="adm-empty">No transfer tasks yet.</p>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th scope="col">Client</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="is-num">
                    Period end
                  </th>
                  <th scope="col" className="is-num">
                    Completed
                  </th>
                  <th scope="col" className="is-num">
                    Created
                  </th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loaderData.tasks.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <Link
                        to={`/admin/clients/${t.organisationId}`}
                        className="adm-table__primary"
                      >
                        {t.tradingName}
                      </Link>
                      {t.adminNotes ? (
                        <span className="adm-sub">{t.adminNotes}</span>
                      ) : null}
                    </td>
                    <td>
                      <AdminStatus tone={transferTone(t.status)}>
                        {statusLabel(t.status)}
                      </AdminStatus>
                    </td>
                    <td className="is-num">{formatAdminDate(t.periodEndAt)}</td>
                    <td className="is-num">{formatAdminDate(t.completedAt)}</td>
                    <td className="is-num">{formatAdminDate(t.createdAt)}</td>
                    <td>
                      <div className="adm-actions">
                        {t.status === "pending" ? (
                          <Form method="post">
                            <input type="hidden" name="taskId" value={t.id} />
                            <input type="hidden" name="intent" value="mark_in_progress" />
                            <button type="submit" className="adm-btn adm-btn--sm">
                              Start
                            </button>
                          </Form>
                        ) : null}
                        {t.status === "pending" || t.status === "in_progress" ? (
                          <Form method="post">
                            <input type="hidden" name="taskId" value={t.id} />
                            <input type="hidden" name="intent" value="mark_completed" />
                            <button
                              type="submit"
                              className="adm-btn adm-btn--go adm-btn--sm"
                            >
                              Complete
                            </button>
                          </Form>
                        ) : null}
                      </div>
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
