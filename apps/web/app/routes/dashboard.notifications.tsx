import { Form, Link } from "react-router";
import { createDb } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import { requireAuth } from "../lib/session.server";
import {
  getNotificationsFeed,
  markAllNotificationsRead,
  markNotificationRead,
} from "../lib/notifications.server";
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
    <div className="iwfw-dash-page">
      <header className="iwfw-dash-page__header">
        <div>
          <h1>Notifications</h1>
          <p>Live updates when we need you, or when something changes on your site.</p>
        </div>
        {loaderData.unread > 0 ? (
          <Form method="post">
            <input type="hidden" name="intent" value="mark_all_read" />
            <button type="submit" className="iwfw-btn iwfw-btn--outline">
              Mark all read
            </button>
          </Form>
        ) : null}
      </header>

      <section className="iwfw-admin-panel">
        {loaderData.items.length === 0 ? (
          <p className="iwfw-admin-empty">No notifications yet.</p>
        ) : (
          <ul className="iwfw-notify-page-list">
            {loaderData.items.map((n) => (
              <li key={n.id} className={n.readAt ? undefined : "is-unread"}>
                <div>
                  <strong>{n.title}</strong>
                  <p>{n.body}</p>
                  <p className="iwfw-notify-page-meta">
                    {n.createdAt
                      ? new Date(n.createdAt).toLocaleString("en-GB")
                      : ""}
                  </p>
                </div>
                <div className="iwfw-notify-page-actions">
                  <Link to={n.href} className="iwfw-btn iwfw-btn--outline">
                    Open
                  </Link>
                  {!n.readAt ? (
                    <Form method="post">
                      <input type="hidden" name="intent" value="mark_one_read" />
                      <input type="hidden" name="id" value={n.id} />
                      <button type="submit" className="iwfw-btn iwfw-btn--outline">
                        Mark read
                      </button>
                    </Form>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
