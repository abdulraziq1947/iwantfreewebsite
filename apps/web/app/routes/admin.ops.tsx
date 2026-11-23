import { Form, Link, useNavigation } from "react-router";
import { Badge } from "@iwfw/ui";
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
    return { ok: true as const, message: `GBP tasks: ${result.created} created, ${result.skipped} skipped.` };
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
      intent === "mark_done"
        ? "done"
        : intent === "cancel"
          ? "cancelled"
          : "in_progress";
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

export default function AdminOpsPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";

  return (
    <div className="iwfw-admin-page">
      <header className="iwfw-admin-page__header">
        <div>
          <p className="iwfw-admin-page__eyebrow">Operations</p>
          <h1>Ops tasks</h1>
          <p>
            Weekly Google Business work and domain renewal reminders. Tasks are
            tracked here — nothing is published or purchased automatically.
          </p>
        </div>
        <p className="iwfw-admin-page__count">{loaderData.tasks.length} open</p>
      </header>

      <div className="iwfw-admin-actions" style={{ marginBottom: "1rem" }}>
        <Form method="post">
          <input type="hidden" name="intent" value="ensure_gbp" />
          <button type="submit" className="iwfw-btn iwfw-btn--outline" disabled={busy}>
            {busy ? "Working…" : "Generate this week’s GBP tasks"}
          </button>
        </Form>
        <Form method="post">
          <input type="hidden" name="intent" value="ensure_renewals" />
          <button type="submit" className="iwfw-btn iwfw-btn--outline" disabled={busy}>
            {busy ? "Working…" : "Generate domain renewal reminders"}
          </button>
        </Form>
        <Form method="post">
          <input type="hidden" name="intent" value="ensure_overdue" />
          <button type="submit" className="iwfw-btn iwfw-btn--outline" disabled={busy}>
            {busy ? "Working…" : "Flag overdue websites"}
          </button>
        </Form>
      </div>

      {actionData && "message" in actionData && actionData.message ? (
        <p className="iwfw-start__ok" role="status">
          {actionData.message}
        </p>
      ) : null}
      {actionData && "error" in actionData && actionData.error ? (
        <p className="iwfw-start__error" role="alert">
          {actionData.error}
        </p>
      ) : null}

      <section className="iwfw-admin-panel">
        {loaderData.tasks.length === 0 ? (
          <p className="iwfw-admin-empty">
            No open ops tasks. Generate GBP or renewal reminders above, or set a
            domain renews-at date on the Domains queue.
          </p>
        ) : (
          <div className="iwfw-admin-table-wrap">
            <table className="iwfw-admin-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Client</th>
                  <th>Kind</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loaderData.tasks.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <strong>{t.title}</strong>
                      {t.notes ? (
                        <span className="iwfw-admin-table__sub">{t.notes}</span>
                      ) : null}
                    </td>
                    <td>
                      <Link to={`/admin/clients/${t.organisationId}`}>
                        {t.tradingName}
                      </Link>
                    </td>
                    <td>
                      <Badge tone="neutral">{kindLabel(t.kind)}</Badge>
                    </td>
                    <td>{formatAdminDate(t.dueAt)}</td>
                    <td>
                      <Badge
                        tone={
                          t.status === "in_progress" ? "warning" : "neutral"
                        }
                      >
                        {t.status}
                      </Badge>
                    </td>
                    <td>
                      <div className="iwfw-admin-actions">
                        {t.status === "pending" ? (
                          <Form method="post">
                            <input type="hidden" name="intent" value="mark_in_progress" />
                            <input type="hidden" name="taskId" value={t.id} />
                            <button
                              type="submit"
                              className="iwfw-btn iwfw-btn--outline iwfw-btn--sm"
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
                            className="iwfw-btn iwfw-btn--green iwfw-btn--sm"
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
                            className="iwfw-btn iwfw-btn--outline iwfw-btn--sm"
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
