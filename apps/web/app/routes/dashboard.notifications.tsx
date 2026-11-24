import { Form, Link } from "react-router";
import { createDb } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import { requireAuth } from "../lib/session.server";
import {
  getNotificationsFeed,
  markAllNotificationsRead,
  markNotificationRead,
} from "../lib/notifications.server";
import { PageHead } from "../components/dash-ui";
import type { Route } from "./+types/dashboard.notifications";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Notifications — iwantfreewebsite" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireAuth(request, context);
  const db = createDb(getEnv(context).DB);
  return getNotificationsFeed(db, auth.userId, 50);
}

export async function action({ request, context }: Route.ActionArgs) {
  const auth = await requireAuth(request, context);
  const db = createDb(getEnv(context).DB);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  if (intent === "mark_all_read") {
    await markAllNotificationsRead(db, auth.userId);
  } else if (intent === "mark_one_read") {
    const id = String(form.get("id") ?? "");
    if (id) await markNotificationRead(db, auth.userId, id);
  }
  return { ok: true };
}

export default function CustomerNotificationsPage({
  loaderData,
}: Route.ComponentProps) {
  return (
    <div className="dash-page dash-page--narrow">
      <PageHead
        kicker="Account"
        title="Notifications"
        lead="Updates when we need something from you, or when something changes on your site."
        aside={
          loaderData.unread > 0 ? (
            <Form method="post">
              <input type="hidden" name="intent" value="mark_all_read" />
              <button type="submit" className="dash-btn dash-btn--line dash-btn--sm">
                Mark all read
              </button>
            </Form>
          ) : null
        }
      />

      {loaderData.items.length === 0 ? (
        <p className="dash-empty">
          No notifications yet. We’ll post updates here as your website moves
          along.
        </p>
      ) : (
        <ul className="dash-feed dash-feed--page">
          {loaderData.items.map((n) => (
            <li key={n.id} className={n.readAt ? undefined : "is-unread"}>
              <div className="dash-feed__body">
                <p className="dash-feed__title">
                  {!n.readAt ? <span className="dash-sr">New: </span> : null}
                  {n.title}
                </p>
                <p>{n.body}</p>
                <p className="dash-feed__when">
                  {n.createdAt
                    ? new Date(n.createdAt).toLocaleString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Europe/London",
                      })
                    : ""}
                </p>
              </div>
              <div className="dash-feed__actions">
                <Link
                  to={n.href}
                  className="dash-btn dash-btn--line dash-btn--sm"
                  aria-label={`Open: ${n.title}`}
                >
                  Open
                </Link>
                {!n.readAt ? (
                  <Form method="post">
                    <input type="hidden" name="intent" value="mark_one_read" />
                    <input type="hidden" name="id" value={n.id} />
                    <button
                      type="submit"
                      className="dash-btn dash-btn--quiet dash-btn--sm"
                      aria-label={`Mark as read: ${n.title}`}
                    >
                      Mark read
                    </button>
                  </Form>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
