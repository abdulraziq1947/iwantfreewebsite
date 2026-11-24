import type { ReactNode } from "react";

type Tone = "success" | "warning" | "danger" | "neutral";

const TONE_CLASS: Record<Tone, string> = {
  success: "ok",
  warning: "warn",
  danger: "risk",
  neutral: "idle",
};

const STATUS_LABELS: Record<string, string> = {
  canceled: "Cancelled",
  past_due: "Past due",
  incomplete_expired: "Incomplete (expired)",
  checkout_open: "Checkout open",
  ready_for_checkout: "Ready for checkout",
  in_progress: "In progress",
  not_live: "Not live",
};

/** Raw enum values (Stripe, task and order statuses) as sentence-case British English. */
export function statusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  const known = STATUS_LABELS[status];
  if (known) return known;
  const text = status.replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Ticket status from the staff side of the conversation. */
export function staffTicketStatusLabel(status: string): string {
  switch (status) {
    case "open":
      return "Open";
    case "awaiting_staff":
      return "Needs reply";
    case "awaiting_customer":
      return "Waiting on customer";
    case "resolved":
      return "Resolved";
    case "closed":
      return "Closed";
    default:
      return statusLabel(status);
  }
}

/**
 * Status as a shape plus text, so meaning never depends on colour alone:
 * circle = fine, diamond = needs action, square = problem, ring = inactive.
 */
export function AdminStatus({
  tone = "neutral",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <span className={`adm-status adm-status--${TONE_CLASS[tone]}`}>
      <span className="adm-status__mark" aria-hidden="true" />
      {children}
    </span>
  );
}

export function AdminPageHeader({
  kicker,
  title,
  lead,
  aside,
}: {
  kicker: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <header className="adm-head">
      <div className="adm-head__text">
        <p className="adm-kicker">{kicker}</p>
        <h1 className="adm-head__title">{title}</h1>
        {lead ? <p className="adm-head__lead">{lead}</p> : null}
      </div>
      {aside ? <div className="adm-head__aside">{aside}</div> : null}
    </header>
  );
}

export function AdminCount({
  value,
  label,
  detail,
}: {
  value: number;
  label: string;
  detail?: string;
}) {
  return (
    <p className="adm-count">
      <strong>{value}</strong>
      <span>{label}</span>
      {detail ? <small>{detail}</small> : null}
    </p>
  );
}
