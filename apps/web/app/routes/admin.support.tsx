import { Link } from "react-router";
import { Badge } from "@iwfw/ui";
import { createDb } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import { requireStaffSession } from "../lib/session.server";
import { formatAdminDate } from "../lib/admin-ops";
import { ticketCategoryLabel, ticketStatusLabel } from "../lib/support";
import {
  listAdminTickets,
  listNotificationsForUser,
  markAllNotificationsRead,
} from "../lib/support.server";
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
    <div className="iwfw-admin-page">
      <header className="iwfw-admin-page__header">
        <div>
          <p className="iwfw-admin-page__eyebrow">Support</p>
          <h1>Customer tickets</h1>
          <p>
            Reply to customer issues and requests. Unread counts show when they
            message you.
          </p>
        </div>
        <p className="iwfw-admin-page__count">
          {loaderData.tickets.length} total
        </p>
      </header>

      <div className="iwfw-admin-grid">
        <section className="iwfw-admin-panel iwfw-admin-panel--wide">
          <div className="iwfw-admin-panel__head">
            <h2>Queue</h2>
          </div>
          {loaderData.tickets.length === 0 ? (
            <p className="iwfw-admin-empty">No tickets yet.</p>
          ) : (
            <ul className="iwfw-ticket-list">
              {loaderData.tickets.map((t) => (
                <li key={t.id}>
                  <Link to={`/admin/support/${t.id}`}>
                    <div>
                      <strong>
                        {t.subject}
                        {t.unread > 0 ? (
                          <span className="iwfw-notify-badge">{t.unread}</span>
                        ) : null}
                      </strong>
                      <p>
                        {t.tradingName} · {ticketCategoryLabel(t.category)} ·{" "}
                        <Badge tone={tone(t.status)}>
                          {ticketStatusLabel(t.status)}
                        </Badge>{" "}
                        · {formatAdminDate(t.lastMessageAt)}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="iwfw-admin-panel iwfw-admin-panel--wide">
          <div className="iwfw-admin-panel__head">
            <h2>Your notifications</h2>
          </div>
          {loaderData.notifications.length === 0 ? (
            <p className="iwfw-admin-empty">No notifications yet.</p>
          ) : (
            <ul className="iwfw-admin-list">
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
