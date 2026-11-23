import { Form } from "react-router";
import { Badge } from "@iwfw/ui";
import { createDb } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import { requireStaffSession } from "../lib/session.server";
import { formatAdminDate } from "../lib/admin-ops";
import {
  listAdminTransfers,
  updateTransferTaskStatus,
} from "../lib/admin-ops.server";
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

function transferTone(
  status: string,
): "success" | "warning" | "danger" | "neutral" {
  if (status === "completed") return "success";
  if (status === "pending" || status === "in_progress") return "warning";
  return "neutral";
}

export default function AdminTransfersPage({
  loaderData,
}: Route.ComponentProps) {
  return (
    <div className="iwfw-admin-page">
      <header className="iwfw-admin-page__header">
        <div>
          <p className="iwfw-admin-page__eyebrow">Pending tasks</p>
          <h1>Asset transfers</h1>
          <p>
            Hand-off queue when a subscription ends — transfer site assets to
            the customer when due.
          </p>
        </div>
        <p className="iwfw-admin-page__count">{loaderData.tasks.length} total</p>
      </header>

      <section className="iwfw-admin-panel">
        {loaderData.tasks.length === 0 ? (
          <p className="iwfw-admin-empty">No transfer tasks yet.</p>
        ) : (
          <div className="iwfw-admin-table-wrap">
            <table className="iwfw-admin-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Status</th>
                  <th>Period end</th>
                  <th>Completed</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loaderData.tasks.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <strong>{t.tradingName}</strong>
                      {t.adminNotes ? (
                        <span className="iwfw-admin-table__sub">
                          {t.adminNotes}
                        </span>
                      ) : null}
                    </td>
                    <td>
                      <Badge tone={transferTone(t.status)}>{t.status}</Badge>
                    </td>
                    <td>{formatAdminDate(t.periodEndAt)}</td>
                    <td>{formatAdminDate(t.completedAt)}</td>
                    <td>{formatAdminDate(t.createdAt)}</td>
                    <td>
                      <div className="iwfw-admin-actions">
                        {t.status === "pending" ? (
                          <Form method="post">
                            <input type="hidden" name="taskId" value={t.id} />
                            <input
                              type="hidden"
                              name="intent"
                              value="mark_in_progress"
                            />
                            <button
                              type="submit"
                              className="iwfw-btn iwfw-btn--outline iwfw-admin__btn-sm"
                            >
                              Start
                            </button>
                          </Form>
                        ) : null}
                        {t.status === "pending" || t.status === "in_progress" ? (
                          <Form method="post">
                            <input type="hidden" name="taskId" value={t.id} />
                            <input
                              type="hidden"
                              name="intent"
                              value="mark_completed"
                            />
                            <button
                              type="submit"
                              className="iwfw-btn iwfw-btn--green iwfw-admin__btn-sm"
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
