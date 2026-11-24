import { Link } from "react-router";
import { createDb } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import { requireStaffSession } from "../lib/session.server";
import { formatAdminDate } from "../lib/admin-ops";
import { ticketCategoryLabel } from "../lib/support";
import {
  listAdminTickets,
  listNotificationsForUser,
  markAllNotificationsRead,
} from "../lib/support.server";
import {
  AdminCount,
  AdminPageHeader,
  AdminStatus,
  staffTicketStatusLabel,
} from "../components/admin-ui";
import type { Route } from "./+types/admin.support";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Support tickets — Admin" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireStaffSession(request, context);
  const db = createDb(getEnv(context).DB);
  const [tickets, notifications] = await Promise.all([
    listAdminTickets(db),
    listNotificationsForUser(db, auth.userId, 15),
  ]);
  return { tickets, notifications };
}

export async function action({ request, context }: Route.ActionArgs) {
  const auth = await requireStaffSession(request, context);
  const form = await request.formData();
  if (String(form.get("intent")) === "mark_notifications_read") {
    await markAllNotificationsRead(createDb(getEnv(context).DB), auth.userId);
    return { ok: true as const };
  }
  return { error: "Unknown action." };
}

function tone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "resolved" || status === "closed") return "success";
  if (status === "awaiting_staff" || status === "open") return "warning";
  return "neutral";
}

export default function AdminSupportPage({ loaderData }: Route.ComponentProps) {
  return (
    <div className="adm-page">
      <AdminPageHeader
        kicker="Support"
        title="Customer tickets"
        lead="Reply to customer issues and requests. Unread counts show when they message you."
        aside={<AdminCount value={loaderData.tickets.length} label="total" />}
      />

      <div className="adm-grid">
        <section className="adm-sheet adm-sheet--wide" aria-labelledby="adm-ticket-q">
          <div className="adm-sheet__head">
            <h2 id="adm-ticket-q">Queue</h2>
          </div>
          {loaderData.tickets.length === 0 ? (
            <p className="adm-empty">No tickets yet.</p>
          ) : (
            <ul className="adm-tickets">
              {loaderData.tickets.map((t) => (
                <li key={t.id}>
                  <Link to={`/admin/support/${t.id}`}>
                    <strong>
                      {t.subject}
                      {t.unread > 0 ? (
                        <span className="adm-unread">
                          {t.unread}
                          <span className="adm-sr"> unread</span>
                        </span>
                      ) : null}
                    </strong>
                    <p>
                      {t.tradingName} · {ticketCategoryLabel(t.category)} ·{" "}
                      <AdminStatus tone={tone(t.status)}>
                        {staffTicketStatusLabel(t.status)}
                      </AdminStatus>{" "}
                      · {formatAdminDate(t.lastMessageAt)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="adm-sheet adm-sheet--wide" aria-labelledby="adm-ticket-n">
          <div className="adm-sheet__head">
            <h2 id="adm-ticket-n">Your notifications</h2>
          </div>
          {loaderData.notifications.length === 0 ? (
            <p className="adm-empty">No notifications yet.</p>
          ) : (
            <ul className="adm-list">
              {loaderData.notifications.map((n) => (
                <li key={n.id}>
                  <div>
                    <strong>
                      <Link to={n.href}>{n.title}</Link>
                    </strong>
                    <p>{n.body}</p>
                  </div>
                  <span>{formatAdminDate(n.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
