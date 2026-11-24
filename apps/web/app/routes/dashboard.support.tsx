import { Form, Link, useNavigation } from "react-router";
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
import { SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_HREF } from "../lib/marketing";
import {
  Alert,
  ArrowIcon,
  PageHead,
  PhoneIcon,
  StatusMark,
  ticketTone,
} from "../components/dash-ui";
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

export default function SupportPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const hasUnread = loaderData.notifications.some((n) => !n.readAt);

  return (
    <div className="dash-page">
      <PageHead
        kicker="Account"
        title="Support"
        lead="Open a ticket for website changes, problems, billing questions or anything else. We reply in the same thread."
        aside={
          <a className="dash-call" href={SUPPORT_PHONE_HREF}>
            <span className="dash-call__icon">
              <PhoneIcon />
            </span>
            <span className="dash-call__text">
              <small>Prefer the phone?</small>
              <strong>{SUPPORT_PHONE_DISPLAY}</strong>
            </span>
          </a>
        }
      />

      <div className="dash-split dash-split--support">
        <section className="dash-panel" aria-labelledby="dash-new-ticket-title">
          <h2 id="dash-new-ticket-title" className="dash-h2">
            New ticket
          </h2>
          {!loaderData.primaryOrgId ? (
            <p className="dash-empty">
              No website account yet. Finish checkout first.
            </p>
          ) : (
            <Form method="post" className="dash-form">
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
                <Alert tone="error">{actionData.error}</Alert>
              ) : null}
              {actionData &&
              "ticketId" in actionData &&
              actionData.ticketId ? (
                <Alert tone="ok">
                  Ticket sent.{" "}
                  <Link to={`/dashboard/support/${actionData.ticketId}`}>
                    Open it
                  </Link>
                </Alert>
              ) : null}
              <div>
                <button
                  type="submit"
                  className="dash-btn dash-btn--go"
                  disabled={busy}
                >
                  {busy ? "Sending…" : "Send ticket"}
                </button>
              </div>
            </Form>
          )}
        </section>

        <section className="dash-section" aria-labelledby="dash-tickets-title">
          <div className="dash-section-head">
            <h2 id="dash-tickets-title" className="dash-h2">
              Your tickets
            </h2>
          </div>
          {loaderData.tickets.length === 0 ? (
            <p className="dash-empty">
              No tickets yet. Anything you send appears here, with our replies.
            </p>
          ) : (
            <ul className="dash-tickets">
              {loaderData.tickets.map((t) => (
                <li key={t.id}>
                  <Link
                    to={`/dashboard/support/${t.id}`}
                    className={`dash-tickets__link${t.unread > 0 ? " is-unread" : ""}`}
                  >
                    <span className="dash-tickets__subject">
                      {t.subject}
                      {t.unread > 0 ? (
                        <span className="dash-count">
                          {t.unread}
                          <span className="dash-sr"> unread</span>
                        </span>
                      ) : null}
                    </span>
                    <span className="dash-tickets__meta">
                      <StatusMark tone={ticketTone(t.status)}>
                        {ticketStatusLabel(t.status)}
                      </StatusMark>
                      <span>{ticketCategoryLabel(t.category)}</span>
                      <span>{formatAdminDate(t.lastMessageAt)}</span>
                    </span>
                    <ArrowIcon />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="dash-section" aria-labelledby="dash-support-notes-title">
        <div className="dash-section-head">
          <h2 id="dash-support-notes-title" className="dash-h2">
            Notifications
          </h2>
          {hasUnread ? (
            <Form method="post">
              <input type="hidden" name="intent" value="mark_notifications_read" />
              <button type="submit" className="dash-btn dash-btn--quiet dash-btn--sm">
                Mark all read
              </button>
            </Form>
          ) : null}
        </div>
        {loaderData.notifications.length === 0 ? (
          <p className="dash-empty">No notifications yet.</p>
        ) : (
          <ul className="dash-feed">
            {loaderData.notifications.map((n) => (
              <li key={n.id} className={n.readAt ? undefined : "is-unread"}>
                <div className="dash-feed__body">
                  <p className="dash-feed__title">
                    {!n.readAt ? <span className="dash-sr">New: </span> : null}
                    <Link to={n.href}>{n.title}</Link>
                  </p>
                  <p>{n.body}</p>
                </div>
                <p className="dash-feed__when">{formatAdminDate(n.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
