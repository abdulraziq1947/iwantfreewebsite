import { useId, type ReactNode } from "react";
import { Link } from "react-router";
import { Badge } from "@iwfw/ui";
import type { AttentionBoard, AttentionItem } from "../lib/attention";
import { StatusMark } from "./dash-ui";

function severityTone(
  severity: AttentionItem["severity"],
): "success" | "warning" | "danger" | "neutral" {
  if (severity === "action") return "warning";
  if (severity === "waiting") return "neutral";
  return "neutral";
}

function gbpTone(
  state: AttentionBoard["gbp"]["state"],
): "success" | "warning" | "danger" | "neutral" {
  if (state === "granted") return "success";
  if (state === "help_requested") return "danger";
  if (state === "invite_sent" || state === "not_started") return "warning";
  return "neutral";
}

function ItemList({
  items,
  empty,
}: {
  items: AttentionItem[];
  empty: string;
}) {
  if (items.length === 0) {
    return <p className="iwfw-attention__empty">{empty}</p>;
  }
  return (
    <ul className="iwfw-attention__list">
      {items.map((item) => (
        <li key={item.id} className={`is-${item.severity}`}>
          <div className="iwfw-attention__item-head">
            <strong>{item.title}</strong>
            <Badge tone={severityTone(item.severity)}>
              {item.severity === "action"
                ? "Action"
                : item.severity === "waiting"
                  ? "Waiting"
                  : "Note"}
            </Badge>
          </div>
          <p>{item.body}</p>
          {item.to && item.cta ? (
            item.to.startsWith("http") ? (
              <a
                className="iwfw-attention__cta"
                href={item.to}
                target="_blank"
                rel="noreferrer"
              >
                {item.cta}
              </a>
            ) : (
              <Link className="iwfw-attention__cta" to={item.to}>
                {item.cta}
              </Link>
            )
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function ItemLink({ item, className }: { item: AttentionItem; className: string }) {
  if (!item.to || !item.cta) return null;
  return item.to.startsWith("http") ? (
    <a className={className} href={item.to} target="_blank" rel="noreferrer">
      {item.cta}
    </a>
  ) : (
    <Link className={className} to={item.to}>
      {item.cta}
    </Link>
  );
}

/** Customer dashboard version; styled by `.dash-attn` in `app/dashboard.css`. */
function CustomerAttention({
  board,
  title,
  gbpActions,
}: {
  board: AttentionBoard;
  title: string;
  gbpActions?: ReactNode;
}) {
  const headingId = useId();
  const pending = board.customerPendingCount;
  const items = board.customer.filter((i) => i.severity === "action");

  return (
    <section className="dash-attn" aria-labelledby={headingId}>
      <div className="dash-attn__head">
        <span className="dash-attn__count" aria-hidden="true">
          {pending}
        </span>
        <div>
          <h2 id={headingId} className="dash-h2">
            {title}
          </h2>
          <p className="dash-attn__lead">
            {`${pending} thing${pending === 1 ? "" : "s"} to do on your side.`}
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="dash-attn__empty">You’re all caught up.</p>
      ) : (
        <ul className="dash-attn__list">
          {items.map((item) => (
            <li key={item.id}>
              <div>
                <h3 className="dash-h3">{item.title}</h3>
                <p>{item.body}</p>
              </div>
              <ItemLink item={item} className="dash-btn dash-btn--ink dash-btn--sm" />
            </li>
          ))}
        </ul>
      )}

      <div className="dash-attn__gbp">
        <div>
          <p className="dash-attn__label">Google Business Profile</p>
          <p className="dash-attn__gbp-title">
            <strong>{board.gbp.label}</strong>
            <StatusMark tone={board.gbp.granted ? "ok" : "muted"}>
              {board.gbp.granted ? "Confirmed" : "Not confirmed"}
            </StatusMark>
          </p>
          <p>{board.gbp.detail}</p>
        </div>
        {gbpActions}
      </div>
    </section>
  );
}

export function AttentionBoardCard({
  board,
  perspective,
  title = "Needs attention",
  gbpActions,
}: {
  board: AttentionBoard;
  perspective: "customer" | "staff";
  title?: string;
  gbpActions?: ReactNode;
}) {
  const pending =
    perspective === "customer"
      ? board.customerPendingCount
      : board.staffPendingCount;

  // Customers only see this when they still have something to do.
  if (perspective === "customer" && pending === 0) {
    return null;
  }

  if (perspective === "customer") {
    return (
      <CustomerAttention board={board} title={title} gbpActions={gbpActions} />
    );
  }

  const customerActions = board.customer.filter((i) => i.severity === "action");

  return (
    <section
      className={`iwfw-attention ${pending > 0 ? "has-pending" : ""}`}
      aria-label={title}
    >
      <div className="iwfw-attention__head">
        <div>
          <p className="iwfw-attention__kicker">
            {pending > 0 ? "Action required" : "Status"}
          </p>
          <h2>{title}</h2>
          <p className="iwfw-attention__lead">
            {pending > 0
              ? `${pending} item${pending === 1 ? "" : "s"} need${pending === 1 ? "s" : ""} attention.`
              : "Nothing blocking right now."}
          </p>
        </div>
        <Badge tone={pending > 0 ? "warning" : "success"}>
          {pending > 0 ? `${pending} pending` : "Clear"}
        </Badge>
      </div>

      <div className="iwfw-attention__gbp">
        <div>
          <p className="iwfw-attention__gbp-label">Google Business Profile</p>
          <strong>{board.gbp.label}</strong>
          <p>{board.gbp.detail}</p>
        </div>
        <div className="iwfw-attention__gbp-side">
          <Badge tone={gbpTone(board.gbp.state)}>
            {board.gbp.granted ? "Confirmed" : "Not confirmed"}
          </Badge>
          {gbpActions}
        </div>
      </div>

      <div className="iwfw-attention__columns">
        <div>
          <h3>Staff actions</h3>
          <ItemList items={board.staff} empty="No staff actions open." />
        </div>
        <div>
          <h3>Waiting on customer</h3>
          <ItemList
            items={customerActions}
            empty="Customer has no open actions."
          />
        </div>
      </div>
    </section>
  );
}
