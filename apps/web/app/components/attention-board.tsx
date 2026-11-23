import type { ReactNode } from "react";
import { Link } from "react-router";
import { Badge } from "@iwfw/ui";
import type { AttentionBoard, AttentionItem } from "../lib/attention";

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

  const primary =
    perspective === "customer"
      ? board.customer.filter((i) => i.severity === "action")
      : board.staff;
  const secondary =
    perspective === "customer"
      ? board.staff.filter(
          (i) =>
            i.severity === "action" ||
            i.id === "build-live" ||
            i.id === "await-pay",
        )
      : board.customer.filter((i) => i.severity === "action");
  const primaryLabel =
    perspective === "customer" ? "Your actions" : "Staff actions";
  const secondaryLabel =
    perspective === "customer"
      ? "Pending on our side"
      : "Waiting on customer";

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
          <p className="iwfw-attention__gbp-label">Google Business (GMB)</p>
          <strong>{board.gbp.label}</strong>
          <p>{board.gbp.detail}</p>
        </div>
        <div className="iwfw-attention__gbp-side">
          <Badge tone={gbpTone(board.gbp.state)}>
            {board.gbp.granted ? "Granted" : "Not granted"}
          </Badge>
          {gbpActions}
        </div>
      </div>

      <div className="iwfw-attention__columns">
        <div>
          <h3>{primaryLabel}</h3>
          <ItemList
            items={primary}
            empty={
              perspective === "customer"
                ? "You’re all caught up."
                : "No staff actions open."
            }
          />
        </div>
        <div>
          <h3>{secondaryLabel}</h3>
          <ItemList
            items={secondary}
            empty={
              perspective === "customer"
                ? "Nothing waiting on the team for you to track."
                : "Customer has no open actions."
            }
          />
        </div>
      </div>
    </section>
  );
}
