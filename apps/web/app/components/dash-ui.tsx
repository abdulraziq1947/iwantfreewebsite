import type { ReactNode } from "react";
import { Link } from "react-router";
import { orgStatusLabel, orgStatusTone } from "../lib/customer-dashboard";

/** Customer dashboard primitives. Styles live in `app/dashboard.css` under `.dash`. */

export type DashTone = "ok" | "wait" | "stop" | "info" | "muted";

/** Map the shared Badge tones onto the dashboard's status colours. */
export function toneFromBadge(
  tone: "success" | "warning" | "danger" | "neutral",
): DashTone {
  switch (tone) {
    case "success":
      return "ok";
    case "warning":
      return "wait";
    case "danger":
      return "stop";
    default:
      return "muted";
  }
}

/** Colour for `websiteStageLabel`: amber when the customer has something to sort. */
export function websiteStageTone(options: {
  needsSubscription: boolean;
  briefReady: boolean;
  domainStatus?: string | null;
}): DashTone {
  if (options.domainStatus === "connected") return "ok";
  if (
    options.needsSubscription ||
    !options.briefReady ||
    options.domainStatus === "unavailable"
  ) {
    return "wait";
  }
  return "info";
}

/** Support ticket colour: amber only when the ticket is waiting on the customer. */
export function ticketTone(status: string): DashTone {
  switch (status) {
    case "awaiting_customer":
      return "wait";
    case "resolved":
      return "ok";
    case "closed":
      return "muted";
    default:
      return "info";
  }
}

export function PageHead({
  kicker,
  title,
  lead,
  aside,
}: {
  kicker?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <header className="dash-head">
      <div className="dash-head__copy">
        {kicker ? <p className="dash-kicker">{kicker}</p> : null}
        <h1 className="dash-h1">{title}</h1>
        {lead ? <p className="dash-lead">{lead}</p> : null}
      </div>
      {aside ? <div className="dash-head__aside">{aside}</div> : null}
    </header>
  );
}

/** Status as a coloured dot and plain words, instead of a pill. */
export function StatusMark({
  tone = "muted",
  children,
}: {
  tone?: DashTone;
  children: ReactNode;
}) {
  return <span className={`dash-mark dash-mark--${tone}`}>{children}</span>;
}

export function Alert({
  tone,
  children,
}: {
  tone: "ok" | "error";
  children: ReactNode;
}) {
  return (
    <p
      className={`dash-alert dash-alert--${tone}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </p>
  );
}

export function ArrowIcon() {
  return (
    <svg
      className="dash-icon dash-icon--arrow"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ExternalIcon() {
  return (
    <svg
      className="dash-icon"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M8 16L17 7M9 7h8v8"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg
      className="dash-icon"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M5 12.5l4.2 4.2L19 7"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PhoneIcon() {
  return (
    <svg
      className="dash-icon"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M6.6 3.5h2.6l1.4 4.1-2 1.3a12 12 0 0 0 6.5 6.5l1.3-2 4.1 1.4v2.6a2 2 0 0 1-2.2 2A16.6 16.6 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export type DashWebsite = {
  id: string;
  tradingName: string;
  domainName?: string | null;
  status: string;
};

/** Every website (organisation) on the account, with a way to switch between them. */
export function WebsiteList({
  orgs,
  activeId,
  intro,
  selectHref,
  unselectedHint,
  action,
}: {
  orgs: DashWebsite[];
  activeId: string | null;
  intro: ReactNode;
  selectHref: (orgId: string) => string;
  unselectedHint: string;
  action?: ReactNode;
}) {
  return (
    <section className="dash-sites" aria-labelledby="dash-sites-title">
      <div className="dash-section-head">
        <div>
          <h2 id="dash-sites-title" className="dash-h2">
            Your websites
          </h2>
          <p className="dash-section-head__intro">{intro}</p>
        </div>
        {action}
      </div>
      <ul className="dash-sites__list">
        {orgs.map((org) => {
          const initial =
            org.tradingName.trim().charAt(0).toUpperCase() || "W";
          const selected = org.id === activeId;
          return (
            <li key={org.id} className={selected ? "is-selected" : undefined}>
              <span className="dash-sites__mark" aria-hidden="true">
                {initial}
              </span>
              <div className="dash-sites__body">
                <p className="dash-sites__name">{org.tradingName}</p>
                <p className="dash-sites__meta">
                  {org.domainName ? `${org.domainName} · ` : ""}
                  {selected ? "Selected" : unselectedHint}
                </p>
              </div>
              <StatusMark tone={toneFromBadge(orgStatusTone(org.status))}>
                {orgStatusLabel(org.status)}
              </StatusMark>
              {selected ? (
                <span className="dash-sites__current">Showing</span>
              ) : (
                <Link
                  to={selectHref(org.id)}
                  className="dash-btn dash-btn--line dash-btn--sm"
                  aria-label={`Select ${org.tradingName}`}
                >
                  Select
                </Link>
              )}
            </li>
          );
        })}
        {orgs.length === 0 ? (
          <li className="dash-sites__empty">
            No website yet. Start the package to create your first one.
          </li>
        ) : null}
      </ul>
    </section>
  );
}
