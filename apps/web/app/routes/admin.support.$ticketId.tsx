import { Form, Link, redirect, useNavigation } from "react-router";
import { Badge } from "@iwfw/ui";
import { createDb } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import { requireStaffSession } from "../lib/session.server";
import { formatAdminDate } from "../lib/admin-ops";
import {
  isTicketStatus,
  ticketCategoryLabel,
  ticketStatusLabel,
} from "../lib/support";
import {
  getTicketThread,
  markTicketRead,
  replyToTicket,
  updateTicketStatus,
} from "../lib/support.server";
import type { Route } from "./+types/admin.support.$ticketId";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Support ticket — Admin" }];
}

export async function loader({ request, context, params }: Route.LoaderArgs) {
  await requireStaffSession(request, context);
  const db = createDb(getEnv(context).DB);
  const thread = await getTicketThread(db, params.ticketId);
  if (!thread) throw new Response("Not found", { status: 404 });
  await markTicketRead(db, params.ticketId, "staff");
  return { thread };
}

export async function action({ request, context, params }: Route.ActionArgs) {
  const auth = await requireStaffSession(request, context);
  const db = createDb(getEnv(context).DB);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "reply");

  if (intent === "status") {
    const statusRaw = String(form.get("status") ?? "");
    if (!isTicketStatus(statusRaw)) return { error: "Invalid status." };
    const result = await updateTicketStatus(db, {
      ticketId: params.ticketId,
      status: statusRaw,
      actorUserId: auth.userId,
    });
    if ("error" in result) return result;
    throw redirect(`/admin/support/${params.ticketId}`);
  }

  const result = await replyToTicket(db, {
    ticketId: params.ticketId,
    userId: auth.userId,
    body: String(form.get("body") ?? ""),
    as: "staff",
  });
  if ("error" in result) return result;
  throw redirect(`/admin/support/${params.ticketId}`);
}

export default function AdminTicketPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { thread } = loaderData;
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";

  return (
    <div className="iwfw-admin-page">
      <header className="iwfw-admin-page__header">
        <div>
          <p className="iwfw-admin-page__eyebrow">
            <Link to="/admin/support">Support</Link> ·{" "}
            <Link to={`/admin/clients/${thread.ticket.organisationId}`}>
              {thread.ticket.tradingName}
            </Link>
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
                {m.authorKind === "staff"
                  ? `${m.authorName} (staff)`
                  : m.authorName}
              </span>
              <span>{formatAdminDate(m.createdAt)}</span>
            </div>
            <p>{m.body}</p>
          </article>
        ))}
      </div>

      <div className="iwfw-admin-grid" style={{ marginTop: "1rem" }}>
        <section className="iwfw-admin-panel">
          <div className="iwfw-admin-panel__head">
            <h2>Reply</h2>
          </div>
          <Form method="post" className="iwfw-start__form">
            <input type="hidden" name="intent" value="reply" />
            <label className="iwfw-field">
              <span>Message</span>
              <textarea
                className="iwfw-control"
                name="body"
                required
                rows={5}
                placeholder="Reply to the customer…"
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
        </section>

        <section className="iwfw-admin-panel">
          <div className="iwfw-admin-panel__head">
            <h2>Status</h2>
          </div>
          <Form method="post" className="iwfw-start__form">
            <input type="hidden" name="intent" value="status" />
            <label className="iwfw-field">
              <span>Update status</span>
              <select
                className="iwfw-control"
                name="status"
                defaultValue={thread.ticket.status}
              >
                <option value="open">Open</option>
                <option value="awaiting_staff">Awaiting staff</option>
                <option value="awaiting_customer">Awaiting customer</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </label>
            <button
              type="submit"
              className="iwfw-btn iwfw-btn--outline"
              disabled={busy}
            >
              Save status
            </button>
          </Form>
        </section>
      </div>
    </div>
  );
}
