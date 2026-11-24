import { Form, Link } from "react-router";
import { createDb } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import { requireStaffSession } from "../lib/session.server";
import {
  getNotificationsFeed,
  markAllNotificationsRead,
  markNotificationRead,
} from "../lib/notifications.server";
import { AdminCount, AdminPageHeader } from "../components/admin-ui";
import type { Route } from "./+types/admin.notifications";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Notifications — Admin" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireStaffSession(request, context);
  const db = createDb(getEnv(context).DB);
  return getNotificationsFeed(db, auth.userId, 50);
}

export async function action({ request, context }: Route.ActionArgs) {
  const auth = await requireStaffSession(request, context);
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

export default function AdminNotificationsPage({ loaderData }: Route.ComponentProps) {
  return (
    <div className="adm-page">
      <AdminPageHeader
        kicker="Live ops"
        title="Notifications"
        lead="Prospects, customers, photo uploads, billing changes, mailbox updates, support, and GMB — refreshed as they happen."
        aside={
          <>
            <AdminCount
              value={loaderData.unread}
              label="unread"
              detail={`of ${loaderData.items.length} shown`}
            />
            {loaderData.unread > 0 ? (
              <Form method="post">
                <input type="hidden" name="intent" value="mark_all_read" />
                <button type="submit" className="adm-btn">
                  Mark all read
                </button>
              </Form>
            ) : null}
          </>
        }
      />

      <section className="adm-sheet" aria-label="Notifications">
        {loaderData.items.length === 0 ? (
          <p className="adm-empty">No notifications yet.</p>
        ) : (
          <ul className="adm-notify">
            {loaderData.items.map((n) => (
              <li key={n.id} className={n.readAt ? undefined : "is-unread"}>
                <div>
                  <strong>{n.title}</strong>
                  <p>{n.body}</p>
                  <p className="adm-notify__meta">
                    {n.kind.replaceAll("_", " ")}
                    {n.createdAt
                      ? ` · ${new Date(n.createdAt).toLocaleString("en-GB")}`
                      : ""}
                  </p>
                </div>
                <div className="adm-notify__actions">
                  <Link to={n.href} className="adm-btn adm-btn--sm">
                    Open
                  </Link>
                  {!n.readAt ? (
                    <Form method="post">
                      <input type="hidden" name="intent" value="mark_one_read" />
                      <input type="hidden" name="id" value={n.id} />
                      <button type="submit" className="adm-btn adm-btn--sm">
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
