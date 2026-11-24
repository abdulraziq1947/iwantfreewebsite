import { Form, Link } from "react-router";
import { createDb } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import { requireStaffSession } from "../lib/session.server";
import { formatAdminDate } from "../lib/admin-ops";
import { listAdminDomainTasks, updateDomainTaskStatus } from "../lib/admin-ops.server";
import { setDomainRenewsAt } from "../lib/ops-tasks.server";
import { writeAuditLog, clientIpFromRequest } from "../lib/audit-log.server";
import {
  AdminCount,
  AdminPageHeader,
  AdminStatus,
  statusLabel,
} from "../components/admin-ui";
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
  const staff = await requireStaffSession(request, context);
  const form = await request.formData();
  const taskId = String(form.get("taskId") ?? "");
  const intent = String(form.get("intent") ?? "");
  if (!taskId || !intent) {
    return { error: "Missing task or action." };
  }
  const db = createDb(getEnv(context).DB);
  const ip = clientIpFromRequest(request);

  if (intent === "set_renews_at") {
    const raw = String(form.get("renewsAt") ?? "").trim();
    const renewsAt = raw ? new Date(`${raw}T00:00:00.000Z`) : null;
    if (raw && Number.isNaN(renewsAt?.getTime())) {
      return { error: "Invalid renewal date." };
    }
    await setDomainRenewsAt(db, taskId, renewsAt);
    await writeAuditLog(db, {
      actorUserId: staff.userId,
      action: "domain.set_renews_at",
      entityType: "domain_registration_tasks",
      entityId: taskId,
      diff: { renewsAt: renewsAt?.toISOString() ?? null },
      ip,
    });
    return { ok: true as const };
  }

  const result = await updateDomainTaskStatus(db, taskId, intent);
  if ("ok" in result) {
    await writeAuditLog(db, {
      actorUserId: staff.userId,
      action: `domain.${intent}`,
      entityType: "domain_registration_tasks",
      entityId: taskId,
      ip,
    });
  }
  return result;
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
    <div className="adm-page">
      <AdminPageHeader
        kicker="Pending tasks"
        title="Domain registration"
        lead="Manual domain work queue. Domains are never purchased automatically — update status as you progress each request. Set renews-at so Ops tasks can remind you before expiry."
        aside={<AdminCount value={loaderData.tasks.length} label="total" />}
      />

      <section className="adm-sheet" aria-label="Domain tasks">
        {loaderData.tasks.length === 0 ? (
          <p className="adm-empty">No domain tasks yet.</p>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th scope="col">Domain</th>
                  <th scope="col">Client</th>
                  <th scope="col">Mode</th>
                  <th scope="col">Status</th>
                  <th scope="col">Renews</th>
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
                      <strong>{t.domainName}</strong>
                      {t.adminNotes ? (
                        <span className="adm-sub">{t.adminNotes}</span>
                      ) : null}
                    </td>
                    <td>
                      <Link to={`/admin/clients/${t.organisationId}`}>
                        {t.tradingName}
                      </Link>
                    </td>
                    <td>{statusLabel(t.domainMode)}</td>
                    <td>
                      <AdminStatus tone={domainTone(t.status)}>
                        {statusLabel(t.status)}
                      </AdminStatus>
                      {t.registeredAt ? (
                        <span className="adm-sub">
                          Reg {formatAdminDate(t.registeredAt)}
                        </span>
                      ) : null}
                      {t.connectedAt ? (
                        <span className="adm-sub">
                          Conn {formatAdminDate(t.connectedAt)}
                        </span>
                      ) : null}
                    </td>
                    <td>
                      <Form method="post" className="adm-inline">
                        <input type="hidden" name="taskId" value={t.id} />
                        <input type="hidden" name="intent" value="set_renews_at" />
                        <input
                          className="adm-input"
                          type="date"
                          name="renewsAt"
                          defaultValue={t.renewsAt ? t.renewsAt.slice(0, 10) : undefined}
                        />
                        <button type="submit" className="adm-btn adm-btn--sm">
                          Save
                        </button>
                      </Form>
                    </td>
                    <td className="is-num">{formatAdminDate(t.createdAt)}</td>
                    <td>
                      <div className="adm-actions">
                        {ACTIONS.filter((a) => a.when.includes(t.status)).map((a) => (
                          <Form key={a.intent} method="post">
                            <input type="hidden" name="taskId" value={t.id} />
                            <input type="hidden" name="intent" value={a.intent} />
                            <button type="submit" className="adm-btn adm-btn--sm">
                              {a.label}
                            </button>
                          </Form>
                        ))}
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
