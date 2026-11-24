import { Form, Link, useNavigation } from "react-router";
import { createDb } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import { requireStaffSession } from "../lib/session.server";
import { formatAdminDate } from "../lib/admin-ops";
import {
  ensureDomainRenewalTasks,
  ensureOverdueWebsiteTasks,
  ensureWeeklyGbpTasks,
  listOpenOpsTasks,
  updateOpsTaskStatus,
} from "../lib/ops-tasks.server";
import { writeAuditLog, clientIpFromRequest } from "../lib/audit-log.server";
import {
  AdminCount,
  AdminPageHeader,
  AdminStatus,
  statusLabel,
} from "../components/admin-ui";
import type { Route } from "./+types/admin.ops";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Ops tasks — Admin" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  await requireStaffSession(request, context);
  const db = createDb(getEnv(context).DB);
  return { tasks: await listOpenOpsTasks(db) };
}

export async function action({ request, context }: Route.ActionArgs) {
  const auth = await requireStaffSession(request, context);
  const db = createDb(getEnv(context).DB);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const ip = clientIpFromRequest(request);

  if (intent === "ensure_gbp") {
    const result = await ensureWeeklyGbpTasks(db);
    await writeAuditLog(db, {
      actorUserId: auth.userId,
      action: "ops.ensure_gbp_weekly",
      entityType: "ops_tasks",
      diff: result,
      ip,
    });
    return {
      ok: true as const,
      message: `GBP tasks: ${result.created} created, ${result.skipped} skipped.`,
    };
  }

  if (intent === "ensure_renewals") {
    const result = await ensureDomainRenewalTasks(db);
    await writeAuditLog(db, {
      actorUserId: auth.userId,
      action: "ops.ensure_domain_renewals",
      entityType: "ops_tasks",
      diff: result,
      ip,
    });
    return {
      ok: true as const,
      message: `Renewal tasks: ${result.created} created, ${result.skipped} skipped.`,
    };
  }

  if (intent === "ensure_overdue") {
    const result = await ensureOverdueWebsiteTasks(db);
    await writeAuditLog(db, {
      actorUserId: auth.userId,
      action: "ops.ensure_website_overdue",
      entityType: "ops_tasks",
      diff: result,
      ip,
    });
    return {
      ok: true as const,
      message: `Overdue websites: ${result.created} created, ${result.skipped} skipped.`,
    };
  }

  if (intent === "mark_done" || intent === "mark_in_progress" || intent === "cancel") {
    const taskId = String(form.get("taskId") ?? "");
    if (!taskId) return { error: "Missing task." };
    const status =
      intent === "mark_done" ? "done" : intent === "cancel" ? "cancelled" : "in_progress";
    await updateOpsTaskStatus(db, taskId, status);
    await writeAuditLog(db, {
      actorUserId: auth.userId,
      action: `ops.task_${status}`,
      entityType: "ops_tasks",
      entityId: taskId,
      ip,
    });
    return { ok: true as const };
  }

  return { error: "Unknown action." };
}

function kindLabel(kind: string): string {
  switch (kind) {
    case "gbp_weekly_post":
      return "GBP post";
    case "gbp_review_reply":
      return "GBP reviews";
    case "domain_renewal":
      return "Domain renewal";
    case "website_overdue":
      return "Website overdue";
    default:
      return kind;
  }
}

export default function AdminOpsPage({ loaderData, actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";

  return (
    <div className="adm-page">
      <AdminPageHeader
        kicker="Operations"
        title="Ops tasks"
        lead="Weekly Google Business work and domain renewal reminders. Tasks are tracked here — nothing is published or purchased automatically."
        aside={<AdminCount value={loaderData.tasks.length} label="open" />}
      />

      <div className="adm-actions">
        <Form method="post">
          <input type="hidden" name="intent" value="ensure_gbp" />
          <button type="submit" className="adm-btn" disabled={busy}>
            {busy ? "Working…" : "Generate this week’s GBP tasks"}
          </button>
        </Form>
        <Form method="post">
          <input type="hidden" name="intent" value="ensure_renewals" />
          <button type="submit" className="adm-btn" disabled={busy}>
            {busy ? "Working…" : "Generate domain renewal reminders"}
          </button>
        </Form>
        <Form method="post">
          <input type="hidden" name="intent" value="ensure_overdue" />
          <button type="submit" className="adm-btn" disabled={busy}>
            {busy ? "Working…" : "Flag overdue websites"}
          </button>
        </Form>
      </div>

      {actionData && "message" in actionData && actionData.message ? (
        <p className="adm-alert adm-alert--ok" role="status">
          {actionData.message}
        </p>
      ) : null}
      {actionData && "error" in actionData && actionData.error ? (
        <p className="adm-alert adm-alert--error" role="alert">
          {actionData.error}
        </p>
      ) : null}

      <section className="adm-sheet" aria-label="Ops tasks">
        {loaderData.tasks.length === 0 ? (
          <p className="adm-empty">
            No open ops tasks. Generate GBP or renewal reminders above, or set a domain
            renews-at date on the Domains queue.
          </p>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th scope="col">Task</th>
                  <th scope="col">Client</th>
                  <th scope="col">Kind</th>
                  <th scope="col" className="is-num">
                    Due
                  </th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loaderData.tasks.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <strong>{t.title}</strong>
                      {t.notes ? <span className="adm-sub">{t.notes}</span> : null}
                    </td>
                    <td>
                      <Link to={`/admin/clients/${t.organisationId}`}>
                        {t.tradingName}
                      </Link>
                    </td>
                    <td>
                      <AdminStatus tone="neutral">{kindLabel(t.kind)}</AdminStatus>
                    </td>
                    <td className="is-num">{formatAdminDate(t.dueAt)}</td>
                    <td>
                      <AdminStatus
                        tone={t.status === "in_progress" ? "warning" : "neutral"}
                      >
                        {statusLabel(t.status)}
                      </AdminStatus>
                    </td>
                    <td>
                      <div className="adm-actions">
                        {t.status === "pending" ? (
                          <Form method="post">
                            <input type="hidden" name="intent" value="mark_in_progress" />
                            <input type="hidden" name="taskId" value={t.id} />
                            <button
                              type="submit"
                              className="adm-btn adm-btn--sm"
                              disabled={busy}
                            >
                              Start
                            </button>
                          </Form>
                        ) : null}
                        <Form method="post">
                          <input type="hidden" name="intent" value="mark_done" />
                          <input type="hidden" name="taskId" value={t.id} />
                          <button
                            type="submit"
                            className="adm-btn adm-btn--go adm-btn--sm"
                            disabled={busy}
                          >
                            Done
                          </button>
                        </Form>
                        <Form method="post">
                          <input type="hidden" name="intent" value="cancel" />
                          <input type="hidden" name="taskId" value={t.id} />
                          <button
                            type="submit"
                            className="adm-btn adm-btn--sm"
                            disabled={busy}
                          >
                            Cancel
                          </button>
                        </Form>
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
