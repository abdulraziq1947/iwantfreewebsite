import { Form, Link, useNavigation } from "react-router";
import { Badge } from "@iwfw/ui";
import { createDb } from "@iwfw/db";
import {getEnv, getConfig} from "../lib/env.server";
import { requireAuth } from "../lib/session.server";
import { getCustomerWorkspace } from "../lib/customer-org.server";
import { formatAdminDate } from "../lib/admin-ops";
import {
  isTicketCategory,
  ticketCategoryLabel,
  ticketStatusLabel,
} from "../lib/support";
import {
  createCustomerTicket,
  listCustomerTickets,
  listNotificationsForUser,
  markAllNotificationsRead,
} from "../lib/support.server";
import type { Route } from "./+types/dashboard.support";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Support — iwantfreewebsite" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireAuth(request, context);
  const db = createDb(getEnv(context).DB);
  const workspace = await getCustomerWorkspace(db, auth, getConfig(context));
  const organisationIds = auth.memberships.map((m) => m.organisationId);
  const [tickets, notifications] = await Promise.all([
    listCustomerTickets(db, organisationIds),
    listNotificationsForUser(db, auth.userId, 12),
  ]);
  return {
    tickets,
    notifications,
    primaryOrgId: workspace.primary?.id ?? organisationIds[0] ?? null,
    tradingName: workspace.primary?.tradingName ?? null,
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const auth = await requireAuth(request, context);
  const db = createDb(getEnv(context).DB);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  if (intent === "mark_notifications_read") {
    await markAllNotificationsRead(db, auth.userId);
    return { ok: true as const };
  }

  if (intent === "create") {
    const organisationId = String(form.get("organisationId") ?? "");
    const allowed = auth.memberships.some(
      (m) => m.organisationId === organisationId,
    );
    if (!allowed && auth.staffRoles.length === 0) {
      return { error: "You cannot open a ticket for that account." };
    }
    const categoryRaw = String(form.get("category") ?? "issue");
    const category = isTicketCategory(categoryRaw) ? categoryRaw : "issue";
    return createCustomerTicket(db, {
      organisationId,
      userId: auth.userId,
      subject: String(form.get("subject") ?? ""),
      category,
      body: String(form.get("body") ?? ""),
    });
  }

  return { error: "Unknown action." };
}

function toneForStatus(
  status: string,
): "success" | "warning" | "danger" | "neutral" {
  if (status === "resolved" || status === "closed") return "success";
  if (status === "awaiting_customer" || status === "awaiting_staff") {
    return "warning";
  }
  return "neutral";
}

export default function SupportPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";

  return (
    <div className="iwfw-dash-page">
      <header className="iwfw-dash-page__header">
        <div>
          <h1>Support</h1>
          <p>
            Open a ticket for website changes, issues, billing questions or
            anything else — we reply in the same thread.
          </p>
        </div>
      </header>

      <div className="iwfw-dash-split">
        <section className="iwfw-admin-panel">
          <div className="iwfw-admin-panel__head">
            <h2>New ticket</h2>
          </div>
          {!loaderData.primaryOrgId ? (
            <p className="iwfw-admin-empty">
              No website account yet — finish checkout first.
            </p>
          ) : (
            <Form method="post" className="iwfw-start__form">
              <input type="hidden" name="intent" value="create" />
              <input
                type="hidden"
                name="organisationId"
                value={loaderData.primaryOrgId}
              />
              <label className="iwfw-field">
                <span>Category</span>
                <select className="iwfw-control" name="category" defaultValue="issue">
                  <option value="issue">Issue</option>
                  <option value="request">Request / change</option>
                  <option value="website">Website</option>
                  <option value="billing">Billing</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="iwfw-field">
                <span>Subject</span>
                <input
                  className="iwfw-control"
                  name="subject"
                  required
                  minLength={3}
                  maxLength={160}
                  placeholder="Short summary"
                />
              </label>
              <label className="iwfw-field">
                <span>How can we help?</span>
                <textarea
                  className="iwfw-control"
                  name="body"
                  required
                  minLength={5}
                  rows={5}
                  placeholder="Tell us what’s going on…"
                />
              </label>
              {actionData && "error" in actionData && actionData.error ? (
                <p className="iwfw-start__error" role="alert">
                  {actionData.error}
                </p>
              ) : null}
              {actionData &&
              "ticketId" in actionData &&
              actionData.ticketId ? (
                <p className="iwfw-start__ok" role="status">
                  Ticket sent.{" "}
                  <Link to={`/dashboard/support/${actionData.ticketId}`}>
                    Open it
                  </Link>
                </p>
              ) : null}
              <button
                type="submit"
                className="iwfw-btn iwfw-btn--green"
                disabled={busy}
              >
                {busy ? "Sending…" : "Send ticket"}
              </button>
            </Form>
          )}
          <p className="iwfw-dash-fine" style={{ marginTop: "1rem" }}>
            Prefer the phone?{" "}
            <a href="tel:08008527267">0800 852 7267</a>
          </p>
        </section>

        <section className="iwfw-admin-panel">
          <div className="iwfw-admin-panel__head">
            <h2>Notifications</h2>
            {loaderData.notifications.some((n) => !n.readAt) ? (
              <Form method="post">
                <input type="hidden" name="intent" value="mark_notifications_read" />
                <button type="submit" className="iwfw-btn iwfw-btn--outline iwfw-admin__btn-sm">
                  Mark all read
                </button>
              </Form>
            ) : null}
          </div>
          {loaderData.notifications.length === 0 ? (
            <p className="iwfw-admin-empty">No notifications yet.</p>
          ) : (
            <ul className="iwfw-admin-list">
              {loaderData.notifications.map((n) => (
                <li key={n.id}>
                  <div>
                    <strong>
                      {!n.readAt ? (
                        <span className="iwfw-notify-badge" style={{ marginRight: 6 }}>
                          new
                        </span>
                      ) : null}
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

      <section className="iwfw-admin-panel" style={{ marginTop: "1rem" }}>
        <div className="iwfw-admin-panel__head">
          <h2>Your tickets</h2>
        </div>
        {loaderData.tickets.length === 0 ? (
          <p className="iwfw-admin-empty">No tickets yet.</p>
        ) : (
          <ul className="iwfw-ticket-list">
            {loaderData.tickets.map((t) => (
              <li key={t.id}>
                <Link to={`/dashboard/support/${t.id}`}>
                  <div>
                    <strong>
                      {t.subject}
                      {t.unread > 0 ? (
                        <span className="iwfw-notify-badge">{t.unread}</span>
                      ) : null}
                    </strong>
                    <p>
                      {ticketCategoryLabel(t.category)} ·{" "}
                      <Badge tone={toneForStatus(t.status)}>
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
    </div>
  );
}
