import type { ReactNode } from "react";
import { Link } from "react-router";
import {
  GET_STARTED_STEPS,
  PACKAGE_INCLUDES,
  PACKAGE_NAME,
  PACKAGE_PRICE_LABEL,
  PACKAGE_PRICE_PERIOD,
} from "../lib/get-started";
import { SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_HREF } from "../lib/marketing";

/** Presentational pieces shared by the get-started funnel and auth pages (styled in start.css). */

export type OrderContext = {
  tradingName?: string;
  domainName?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function filled(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/** Pull the business name and chosen domain from whichever step loader has them. */
export function readOrderContext(
  matches: ReadonlyArray<{ loaderData?: unknown }>,
): OrderContext {
  const context: OrderContext = {};
  for (const match of matches) {
    const data = match.loaderData;
    if (!isRecord(data)) continue;
    const questionnaire = isRecord(data.data) ? data.data : null;
    const business =
      questionnaire && isRecord(questionnaire.business)
        ? questionnaire.business
        : null;
    context.tradingName =
      filled(data.tradingName) ??
      filled(business?.tradingName) ??
      context.tradingName;
    context.domainName = filled(data.domainName) ?? context.domainName;
  }
  return context;
}

export function StepRail({ current }: { current: number }) {
  return (
    <nav className="st-rail" aria-label="Order progress">
      <ol>
        {GET_STARTED_STEPS.map((step, index) => {
          const state =
            index < current ? "done" : index === current ? "current" : "todo";
          const body = (
            <>
              <span className="st-rail__bar" aria-hidden="true" />
              <span className="st-rail__meta">
                <span className="st-rail__n" aria-hidden="true">
                  {state === "done" ? <CheckIcon /> : index + 1}
                </span>
                <span className="st-rail__label">{step.label}</span>
                {state === "done" ? (
                  <span className="st-sr"> (completed)</span>
                ) : null}
              </span>
            </>
          );
          return (
            <li key={step.key} data-state={state}>
              {state === "done" ? (
                <Link to={step.path}>{body}</Link>
              ) : (
                <span aria-current={state === "current" ? "step" : undefined}>
                  {body}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function StepHeader({
  kicker,
  title,
  lead,
}: {
  kicker: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
}) {
  return (
    <header className="st-head">
      <p className="st-kicker">{kicker}</p>
      <h1 className="st-title">{title}</h1>
      {lead ? <p className="st-lead">{lead}</p> : null}
    </header>
  );
}

export function OrderDocket({
  title = "Your order",
  tradingName,
  domainName,
}: OrderContext & { title?: string }) {
  return (
    <div className="st-docket">
      <h2 className="st-docket__kicker">{title}</h2>
      <p className="st-docket__name">{PACKAGE_NAME}</p>
      {tradingName ? (
        <p className="st-docket__for">for {tradingName}</p>
      ) : null}
      <p className="st-docket__price">
        <strong>{PACKAGE_PRICE_LABEL}</strong>
        <span>{PACKAGE_PRICE_PERIOD}</span>
      </p>
      <p className="st-docket__billing">
        Billed monthly in advance. Inclusive of VAT where applicable.
      </p>
      <dl className="st-ledger">
        {domainName ? (
          <div className="st-ledger__stack">
            <dt>Web address</dt>
            <dd>{domainName}</dd>
          </div>
        ) : null}
        <div>
          <dt>Upfront design fee</dt>
          <dd>None</dd>
        </div>
        <div>
          <dt>Minimum contract</dt>
          <dd>None</dd>
        </div>
        <div>
          <dt>Cancellation fee</dt>
          <dd>None</dd>
        </div>
      </dl>
      <h3 className="st-docket__sub">What’s included</h3>
      <ul className="st-docket__list">
        {PACKAGE_INCLUDES.map((item) => (
          <li key={item}>
            <CheckIcon />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <ul className="st-docket__trust">
        <li>
          <LockIcon />
          <span>Secure payment with Stripe</span>
        </li>
        <li>
          <PhoneIcon />
          <span>
            Questions? <a href={SUPPORT_PHONE_HREF}>{SUPPORT_PHONE_DISPLAY}</a>
          </span>
        </li>
      </ul>
    </div>
  );
}

export function FormAlert({
  tone,
  children,
}: {
  tone: "error" | "ok" | "info";
  children: ReactNode;
}) {
  return (
    <div
      className={`st-alert st-alert--${tone}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {tone === "ok" ? <CheckIcon /> : <AlertIcon />}
      <p>{children}</p>
    </div>
  );
}

/**
 * Enter in a text field submits with the first submit button in the form, so
 * this invisible "next" button sits ahead of Back / Save to keep Enter = Continue.
 */
export function DefaultSubmit({ disabled }: { disabled?: boolean }) {
  return (
    <button
      type="submit"
      name="intent"
      value="next"
      className="st-default-submit"
      tabIndex={-1}
      aria-hidden="true"
      disabled={disabled}
    />
  );
}

type IconProps = { className?: string };

export function CheckIcon({ className }: IconProps) {
  return (
    <svg
      className={className ?? "st-icon"}
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M5 12.5l4.2 4.2L19 7"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CrossIcon({ className }: IconProps) {
  return (
    <svg
      className={className ?? "st-icon"}
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M7 7l10 10M17 7L7 17"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ArrowIcon({
  direction = "right",
}: {
  direction?: "right" | "left";
}) {
  return (
    <svg
      className={`st-arrow st-arrow--${direction}`}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={direction === "right" ? "M5 12h14M13 6l6 6-6 6" : "M19 12H5M11 6l-6 6 6 6"}
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChevronIcon() {
  return (
    <svg
      className="st-chevron"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LockIcon() {
  return (
    <svg
      className="st-icon"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="5"
        y="10.5"
        width="14"
        height="10"
        rx="2.2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M8.5 10.5V8a3.5 3.5 0 017 0v2.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PhoneIcon() {
  return (
    <svg
      className="st-icon"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M7.2 3.8c.4-.4 1-.5 1.5-.3l2.2 1c.5.2.8.7.8 1.2v2.1c0 .4-.2.8-.6 1-.8.5-1.2 1.4-1 2.3.5 2 2.1 3.6 4.1 4.1.9.2 1.8-.2 2.3-1 .2-.3.6-.5 1-.5h2.1c.5 0 1 .3 1.2.8l1 2.2c.2.5.1 1.1-.3 1.5-1.3 1.3-3.2 1.9-5.1 1.5C10.4 19.1 4.9 13.6 4.3 7.4c-.3-1.9.3-3.8 1.5-5.1z"
        fill="currentColor"
      />
    </svg>
  );
}

export function AlertIcon() {
  return (
    <svg
      className="st-icon"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 7.5v5.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16.5" r="1.25" fill="currentColor" />
    </svg>
  );
}
