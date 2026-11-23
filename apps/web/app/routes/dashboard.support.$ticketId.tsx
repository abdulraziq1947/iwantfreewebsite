import { Form, Link, redirect, useNavigation } from "react-router";
import { Badge } from "@iwfw/ui";
import { createDb } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import { requireAuth } from "../lib/session.server";
import { formatAdminDate } from "../lib/admin-ops";
import { ticketCategoryLabel, ticketStatusLabel } from "../lib/support";
import {
  getTicketThread,
  markTicketRead,
  replyToTicket,
} from "../lib/support.server";
import type { Route } from "./+types/dashboard.support.$ticketId";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Support ticket — iwantfreewebsite" }];
}

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const auth = await requireAuth(request, context);
  const db = createDb(getEnv(context).DB);
  const organisationIds = auth.memberships.map((m) => m.organisationId);
  const thread = await getTicketThread(db, params.ticketId, {
    organisationIds:
      auth.staffRoles.length > 0 ? undefined : organisationIds,
  });
  if (!thread) throw new Response("Not found", { status: 404 });
  if (
    auth.staffRoles.length === 0 &&
    !organisationIds.includes(thread.ticket.organisationId)
  ) {
    throw new Response("Forbidden", { status: 403 });
  }
  await markTicketRead(db, params.ticketId, "customer");
  return { thread };
}

export async function action({ request, context, params }: Route.ActionArgs) {
  const auth = await requireAuth(request, context);
  const db = createDb(getEnv(context).DB);
  const form = await request.formData();
  const body = String(form.get("body") ?? "");
  const result = await replyToTicket(db, {
    ticketId: params.ticketId,
    userId: auth.userId,
    body,
    as: "customer",
    organisationIds: auth.memberships.map((m) => m.organisationId),
  });
  if ("error" in result) return result;
  throw redirect(`/dashboard/support/${params.ticketId}`);
}

export default function CustomerTicketPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { thread } = loaderData;
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const closed = thread.ticket.status === "closed";

  return (
    <div className="iwfw-dash-page">
      <header className="iwfw-dash-page__header">
        <div>
          <p className="iwfw-admin-page__eyebrow">
            <Link to="/dashboard/support">Support</Link>
          </p>
          <h1>{thread.ticket.subject}</h1>
          <p>
            {ticketCategoryLabel(thread.ticket.category)} ·{" "}
            <Badge>{ticketStatusLabel(thread.ticket.status)}</Badge>
          </p>
        </div>
      </header>

      <div className="iwfw-ticket-thread">
        {thread.messages.map((m) => (
          <article
            key={m.id}
            className={`iwfw-ticket-bubble${m.authorKind === "staff" ? " iwfw-ticket-bubble--staff" : ""}`}
          >
            <div className="iwfw-ticket-bubble__meta">
              <span>
                {m.authorKind === "staff" ? "Support team" : m.authorName}
              </span>
              <span>{formatAdminDate(m.createdAt)}</span>
            </div>
            <p>{m.body}</p>
          </article>
        ))}
      </div>

      <section className="iwfw-admin-panel" style={{ marginTop: "1rem" }}>
        <div className="iwfw-admin-panel__head">
          <h2>Reply</h2>
        </div>
        {closed ? (
          <p className="iwfw-admin-empty">This ticket is closed.</p>
        ) : (
          <Form method="post" className="iwfw-start__form">
            <label className="iwfw-field">
              <span>Message</span>
              <textarea
                className="iwfw-control"
                name="body"
                required
                rows={4}
                placeholder="Write a reply…"
              />
            </label>
            {actionData && "error" in actionData && actionData.error ? (
              <p className="iwfw-start__error" role="alert">
                {actionData.error}
              </p>
            ) : null}
            <button
              type="submit"
              className="iwfw-btn iwfw-btn--green"
              disabled={busy}
            >
              {busy ? "Sending…" : "Send reply"}
            </button>
          </Form>
        )}
      </section>
    </div>
  );
}
