import { createDb } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import { requireStaffSession } from "../lib/session.server";
import {
  getNotificationsFeed,
  markAllNotificationsRead,
  markNotificationRead,
} from "../lib/notifications.server";
import type { Route } from "./+types/admin.notifications.feed";

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireStaffSession(request, context);
  const db = createDb(getEnv(context).DB);
  const feed = await getNotificationsFeed(db, auth.userId, 20);
  return Response.json(feed);
}

export async function action({ request, context }: Route.ActionArgs) {
  const auth = await requireStaffSession(request, context);
  const db = createDb(getEnv(context).DB);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  if (intent === "mark_all_read") {
    await markAllNotificationsRead(db, auth.userId);
    return Response.json({ ok: true });
  }
  if (intent === "mark_one_read") {
    const id = String(form.get("id") ?? "");
    if (id) await markNotificationRead(db, auth.userId, id);
    return Response.json({ ok: true });
  }
  return Response.json({ error: "Unknown action." }, { status: 400 });
}
