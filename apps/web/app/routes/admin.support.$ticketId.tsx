import { Form, Link, redirect, useNavigation } from "react-router";
import { createDb } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import { requireStaffSession } from "../lib/session.server";
import { formatAdminDate } from "../lib/admin-ops";
import { isTicketStatus, ticketCategoryLabel } from "../lib/support";
import {
  getTicketThread,
  markTicketRead,
  replyToTicket,
  updateTicketStatus,
} from "../lib/support.server";
import {
  AdminPageHeader,
  AdminStatus,
  staffTicketStatusLabel,
} from "../components/admin-ui";
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

  const ticketTone =
    thread.ticket.status === "resolved" || thread.ticket.status === "closed"
      ? "success"
      : thread.ticket.status === "awaiting_staff" || thread.ticket.status === "open"
        ? "warning"
        : "neutral";

  return (
    <div className="adm-page">
      <AdminPageHeader
        kicker={
          <>
            <Link to="/admin/support">Support</Link>
            {" / "}
            <Link to={`/admin/clients/${thread.ticket.organisationId}`}>
              {thread.ticket.tradingName}
            </Link>
          </>
        }
        title={thread.ticket.subject}
        lead={
          <>
            {ticketCategoryLabel(thread.ticket.category)} ·{" "}
            <AdminStatus tone={ticketTone}>
              {staffTicketStatusLabel(thread.ticket.status)}
            </AdminStatus>
          </>
        }
      />

      <div className="adm-thread">
        {thread.messages.map((m) => (
          <article
            key={m.id}
            className={`adm-bubble${m.authorKind === "staff" ? " adm-bubble--staff" : ""}`}
          >
            <div className="adm-bubble__meta">
              <span>
                {m.authorKind === "staff" ? `${m.authorName} (staff)` : m.authorName}
              </span>
              <span>{formatAdminDate(m.createdAt)}</span>
            </div>
            <p>{m.body}</p>
          </article>
        ))}
      </div>

      <div className="adm-grid">
        <section className="adm-sheet" aria-labelledby="adm-reply-h">
          <div className="adm-sheet__head">
            <h2 id="adm-reply-h">Reply</h2>
          </div>
          <Form method="post" className="adm-form">
            <input type="hidden" name="intent" value="reply" />
            <label className="adm-field">
              <span>Message</span>
              <textarea
                className="adm-input"
                name="body"
                required
                rows={5}
                placeholder="Reply to the customer…"
              />
            </label>
            {actionData && "error" in actionData && actionData.error ? (
              <p className="adm-alert adm-alert--error" role="alert">
                {actionData.error}
              </p>
            ) : null}
            <button type="submit" className="adm-btn adm-btn--go" disabled={busy}>
              {busy ? "Sending…" : "Send reply"}
            </button>
          </Form>
        </section>

        <section className="adm-sheet" aria-labelledby="adm-tstatus-h">
          <div className="adm-sheet__head">
            <h2 id="adm-tstatus-h">Status</h2>
          </div>
          <Form method="post" className="adm-form">
            <input type="hidden" name="intent" value="status" />
            <label className="adm-field">
              <span>Update status</span>
              <select
                className="adm-input"
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
            <button type="submit" className="adm-btn" disabled={busy}>
              Save status
            </button>
          </Form>
        </section>
      </div>
    </div>
  );
}
