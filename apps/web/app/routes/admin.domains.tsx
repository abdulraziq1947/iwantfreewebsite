import { Form } from "react-router";
import { Badge } from "@iwfw/ui";
import { createDb } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import { requireStaffSession } from "../lib/session.server";
import { formatAdminDate } from "../lib/admin-ops";
import {
  listAdminDomainTasks,
  updateDomainTaskStatus,
} from "../lib/admin-ops.server";
import type { Route } from "./+types/admin.domains";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Domain tasks — Admin" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  await requireStaffSession(request, context);
  const db = createDb(getEnv(context).DB);
  return { tasks: await listAdminDomainTasks(db) };
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
  return updateDomainTaskStatus(db, taskId, intent);
}

function domainTone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "connected" || status === "registered") return "success";
  if (status === "pending" || status === "in_progress") return "warning";
  if (status === "unavailable" || status === "cancelled") return "danger";
  return "neutral";
}

const ACTIONS: Array<{ intent: string; label: string; when: string[] }> = [
  {
    intent: "mark_in_progress",
    label: "Start",
    when: ["pending"],
  },
  {
    intent: "mark_registered",
    label: "Registered",
    when: ["pending", "in_progress"],
  },
  {
    intent: "mark_connected",
    label: "Connected",
    when: ["pending", "in_progress", "registered"],
  },
  {
    intent: "mark_unavailable",
    label: "Unavailable",
    when: ["pending", "in_progress"],
  },
];

export default function AdminDomainsPage({ loaderData }: Route.ComponentProps) {
  return (
    <div className="iwfw-admin-page">
      <header className="iwfw-admin-page__header">
        <div>
          <p className="iwfw-admin-page__eyebrow">Pending tasks</p>
          <h1>Domain registration</h1>
          <p>
            Manual domain work queue. Domains are never purchased automatically —
            update status as you progress each request.
          </p>
        </div>
        <p className="iwfw-admin-page__count">{loaderData.tasks.length} total</p>
      </header>

      <section className="iwfw-admin-panel">
        {loaderData.tasks.length === 0 ? (
          <p className="iwfw-admin-empty">No domain tasks yet.</p>
        ) : (
          <div className="iwfw-admin-table-wrap">
            <table className="iwfw-admin-table">
              <thead>
                <tr>
                  <th>Domain</th>
                  <th>Client</th>
                  <th>Mode</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loaderData.tasks.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <strong>{t.domainName}</strong>
                      {t.adminNotes ? (
                        <span className="iwfw-admin-table__sub">
                          {t.adminNotes}
                        </span>
                      ) : null}
                    </td>
                    <td>{t.tradingName}</td>
                    <td>{t.domainMode}</td>
                    <td>
                      <Badge tone={domainTone(t.status)}>{t.status}</Badge>
                      {t.registeredAt ? (
                        <span className="iwfw-admin-table__sub">
                          Reg {formatAdminDate(t.registeredAt)}
                        </span>
                      ) : null}
                      {t.connectedAt ? (
                        <span className="iwfw-admin-table__sub">
                          Conn {formatAdminDate(t.connectedAt)}
                        </span>
                      ) : null}
                    </td>
                    <td>{formatAdminDate(t.createdAt)}</td>
                    <td>
                      <div className="iwfw-admin-actions">
                        {ACTIONS.filter((a) => a.when.includes(t.status)).map(
                          (a) => (
                            <Form key={a.intent} method="post">
                              <input type="hidden" name="taskId" value={t.id} />
                              <input
                                type="hidden"
                                name="intent"
                                value={a.intent}
                              />
                              <button
                                type="submit"
                                className="iwfw-btn iwfw-btn--outline iwfw-admin__btn-sm"
                              >
                                {a.label}
                              </button>
                            </Form>
                          ),
                        )}
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
