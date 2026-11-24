import { Form, Link, redirect, useNavigation } from "react-router";
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
import { Alert, StatusMark, ticketTone } from "../components/dash-ui";
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

function initialsFor(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase());
  return letters.join("") || "You";
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
    <div className="dash-page dash-page--narrow">
      <header className="dash-head dash-head--thread">
        <div className="dash-head__copy">
          <p className="dash-kicker">
            <Link to="/dashboard/support" className="dash-back">
              <span aria-hidden="true">←</span> Support
            </Link>
          </p>
          <h1 className="dash-h1 dash-h1--thread">{thread.ticket.subject}</h1>
          <p className="dash-thread-meta">
            <StatusMark tone={ticketTone(thread.ticket.status)}>
              {ticketStatusLabel(thread.ticket.status)}
            </StatusMark>
            <span>{ticketCategoryLabel(thread.ticket.category)}</span>
          </p>
        </div>
      </header>

      <ol className="dash-thread" aria-label="Messages">
        {thread.messages.map((m) => {
          const staff = m.authorKind === "staff";
          return (
            <li
              key={m.id}
              className={`dash-thread__msg${staff ? " is-staff" : ""}`}
            >
              <span className="dash-thread__avatar" aria-hidden="true">
                {staff ? "IW" : initialsFor(m.authorName)}
              </span>
              <article className="dash-thread__body">
                <header className="dash-thread__meta">
                  <strong>{staff ? "Support team" : m.authorName}</strong>
                  <span>{formatAdminDate(m.createdAt)}</span>
                </header>
                <p>{m.body}</p>
              </article>
            </li>
          );
        })}
      </ol>

      <section className="dash-panel dash-reply" aria-labelledby="dash-reply-title">
        <h2 id="dash-reply-title" className="dash-h2">
          Reply
        </h2>
        {closed ? (
          <p className="dash-empty">
            This ticket is closed. Open a new ticket from{" "}
            <Link to="/dashboard/support">Support</Link> if you need anything
            else.
          </p>
        ) : (
          <Form method="post" className="dash-form">
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
              <Alert tone="error">{actionData.error}</Alert>
            ) : null}
            <div>
              <button
                type="submit"
                className="dash-btn dash-btn--go"
                disabled={busy}
              >
                {busy ? "Sending…" : "Send reply"}
              </button>
            </div>
          </Form>
        )}
      </section>
    </div>
  );
}
