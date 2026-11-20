import { Link } from "react-router";
import type { Route } from "./+types/home";

export function meta(_args: Route.MetaArgs) {
  return [
    {
      title:
        "iwantfreewebsite.com — Managed websites for UK trades & local businesses",
    },
    {
      name: "description",
      content:
        "£39.99/month. No upfront website fee. No minimum contract. Cancel anytime. We build and manage your website, domain, business email and Google Business Profile — so you can get back to the job.",
    },
  ];
}

export default function Home() {
  return (
    <main className="iwfw-sales">
      <section className="iwfw-hero" aria-label="Introduction">
        <div className="iwfw-hero__inner">
          <div className="iwfw-hero__copy iwfw-anim iwfw-anim--1">
            <p className="iwfw-hero__brand">iwantfreewebsite.com</p>
            <p className="iwfw-pill">
              <UkFlag />
              Built for UK trades &amp; local businesses
            </p>
            <h1>A website that brings in jobs — without the agency price tag</h1>
            <p className="iwfw-price-banner">
              <span>£39.99/month. No upfront website fee.</span>
            </p>
            <p className="iwfw-hero__lead">
              We design, host and look after your site, help with your domain,
              set up business email, and keep your Google Business Profile
              active. You stay on the tools — we keep you findable online.
            </p>
            <div className="iwfw-hero__ctas">
              <Link to="/signup" className="iwfw-btn iwfw-btn--green">
                Start for £39.99/month
                <ArrowIcon />
              </Link>
              <a className="iwfw-speak" href="tel:08008527267">
                <span className="iwfw-speak__icon">
                  <PhoneIcon />
                </span>
                <span>
                  <strong>Prefer to talk it through?</strong>
                  <em>0800 852 7267</em>
                </span>
              </a>
            </div>
          </div>

          <div className="iwfw-hero__visual iwfw-anim iwfw-anim--2" aria-hidden="true">
            <div className="iwfw-devices">
              <div className="iwfw-swoosh" />
              <div className="iwfw-laptop">
                <div className="iwfw-laptop__bezel">
                  <SampleSite variant="desktop" />
                </div>
                <div className="iwfw-laptop__base" />
              </div>
              <div className="iwfw-phone">
                <div className="iwfw-phone__notch" />
                <SampleSite variant="mobile" />
              </div>
            </div>
          </div>
        </div>

        <div className="iwfw-trust iwfw-anim iwfw-anim--3">
          <div className="iwfw-trust__item">
            <TrustIcon kind="support" />
            <span>UK team on the phone</span>
          </div>
          <div className="iwfw-trust__item">
            <TrustIcon kind="setup" />
            <span>No upfront website fee</span>
          </div>
          <div className="iwfw-trust__item">
            <TrustIcon kind="hosting" />
            <span>Hosting &amp; updates included</span>
          </div>
          <div className="iwfw-trust__item">
            <TrustIcon kind="trusted" />
            <span>Cancel anytime</span>
          </div>
        </div>
      </section>

      <section id="included" className="iwfw-band">
        <div className="iwfw-band__inner iwfw-band__split">
          <div className="iwfw-include-panel">
            <h2>Everything in the £39.99 plan</h2>
            <p className="iwfw-include-panel__intro">
              One clear monthly price. No surprise build invoices.
            </p>
            <ul>
              <IncludeItem
                icon="globe"
                label="Professional business website"
                detail="A clean site that shows your services and makes it easy to enquire."
              />
              <IncludeItem
                icon="domain"
                label="Domain help &amp; hosting"
                detail="Choose a domain; we purchase and renew it manually. Hosting is included while you subscribe."
              />
              <IncludeItem
                icon="mail"
                label="Business email mailbox"
                detail="One custom mailbox so customers contact you@yourbusiness — not a free webmail address."
              />
              <IncludeItem
                icon="shop"
                label="Weekly Google Business Profile post"
                detail="We publish a post each week to keep your listing looking active."
              />
              <IncludeItem
                icon="star"
                label="Google review replies"
                detail="We help reply to reviews so you look professional and stay visible."
              />
            </ul>
          </div>
          <div className="iwfw-price-panel">
            <p>Transparent pricing</p>
            <p className="iwfw-price-panel__amount">
              £39.99 <span>/month</span>
            </p>
            <p className="iwfw-price-panel__note">
              No upfront website fee. No minimum contract. Cancel anytime.
            </p>
            <Link to="/signup" className="iwfw-btn iwfw-btn--green iwfw-btn--block">
              Create my account
            </Link>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="iwfw-band iwfw-band--muted">
        <div className="iwfw-band__inner">
          <h2>How it works</h2>
          <p className="iwfw-band__lead">
            From signup to a live site — without briefings that drag on for weeks.
          </p>
          <ol className="iwfw-how">
            <li>
              <strong>1. Subscribe in minutes</strong>
              <p>
                Create your account for £39.99/month. No long contracts and no
                deposit for the website itself.
              </p>
            </li>
            <li>
              <strong>2. Send us the essentials</strong>
              <p>
                Business name, services, photos, contact details and the domain
                you want. We guide you through a simple checklist.
              </p>
            </li>
            <li>
              <strong>3. We launch and look after it</strong>
              <p>
                We build the site, help with domain and email, and keep Google
                Business Profile posts and review replies moving.
              </p>
            </li>
          </ol>
        </div>
      </section>

      <section id="faqs" className="iwfw-band">
        <div className="iwfw-band__inner iwfw-faqs">
          <h2>Questions people ask before they sign up</h2>
          <details open>
            <summary>Is the website really £0 upfront?</summary>
            <p>
              Yes. There is no upfront website fee. You pay £39.99/month for the
              managed service. Domain registration costs are handled separately
              when we purchase the name you choose.
            </p>
          </details>
          <details>
            <summary>Who is this for?</summary>
            <p>
              UK trades and local businesses that need a proper online presence —
              plumbers, electricians, builders, cleaners, salons, cafés and
              similar — without hiring an agency on a big project fee.
            </p>
          </details>
          <details>
            <summary>Can I cancel if it is not right for me?</summary>
            <p>
              Yes. There is no minimum contract. Cancel anytime and your service
              continues until the end of the period you have already paid for.
            </p>
          </details>
          <details>
            <summary>What exactly is included each month?</summary>
            <p>
              A managed business website, hosting and maintenance, domain help
              (manual purchase and renewals by our team), one business email
              mailbox, one Google Business Profile post per week, and help with
              review replies — plus access to your customer dashboard and
              support.
            </p>
          </details>
          <details>
            <summary>Do you buy and renew the domain automatically?</summary>
            <p>
              No automatic purchases. You search and select a domain; our team
              buys and renews it manually after payment. That keeps you in
              control and avoids surprise auto-charges.
            </p>
          </details>
          <details>
            <summary>Is rank tracking included?</summary>
            <p>
              Not yet. Optional Google Rank Tracking (£9.99/month, up to 5
              keywords) will only be offered once that feature is operational.
            </p>
          </details>
        </div>
      </section>

      <section className="iwfw-band iwfw-band--close">
        <div className="iwfw-band__inner iwfw-close">
          <h2>Stop losing work to competitors who show up online first</h2>
          <p>
            £39.99/month. No upfront website fee. No minimum contract. Cancel
            anytime.
          </p>
          <div className="iwfw-close__actions">
            <Link to="/signup" className="iwfw-btn iwfw-btn--green">
              Start for £39.99/month
            </Link>
            <a className="iwfw-btn iwfw-btn--outline" href="tel:08008527267">
              Call 0800 852 7267
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

function SampleSite({ variant }: { variant: "desktop" | "mobile" }) {
  return (
    <div className={`iwfw-sample iwfw-sample--${variant}`}>
      <header>
        <strong>Harris &amp; Son</strong>
        {variant === "desktop" && (
          <nav>
            <span>Home</span>
            <span>Services</span>
            <span>Contact</span>
          </nav>
        )}
      </header>
      <div className="iwfw-sample__hero">
        <div>
          <p className="iwfw-sample__title">Plumbing done properly, when you need it</p>
          <ul>
            <li>Boilers &amp; heating</li>
            <li>Same-day call-outs</li>
            <li>Bathroom installs</li>
          </ul>
          <span className="iwfw-sample__quote">Request a call-back</span>
        </div>
        <div className="iwfw-sample__photo" />
      </div>
    </div>
  );
}

function IncludeItem({
  icon,
  label,
  detail,
}: {
  icon: "globe" | "domain" | "mail" | "shop" | "star";
  label: string;
  detail: string;
}) {
  return (
    <li>
      <span className="iwfw-include-panel__icon" aria-hidden="true">
        <IncludeIcon kind={icon} />
      </span>
      <span className="iwfw-include-panel__text">
        <strong>{label}</strong>
        <span>{detail}</span>
      </span>
      <span className="iwfw-include-panel__check" aria-hidden="true">
        ✓
      </span>
    </li>
  );
}

function UkFlag() {
  return (
    <svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true">
      <rect width="18" height="12" fill="#012169" />
      <path d="M0 0l18 12M18 0L0 12" stroke="#fff" strokeWidth="2" />
      <path d="M0 0l18 12M18 0L0 12" stroke="#C8102E" strokeWidth="1" />
      <path d="M9 0v12M0 6h18" stroke="#fff" strokeWidth="3.5" />
      <path d="M9 0v12M0 6h18" stroke="#C8102E" strokeWidth="2" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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

function PhoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7.2 3.8c.4-.4 1-.5 1.5-.3l2.2 1c.5.2.8.7.8 1.2v2.1c0 .4-.2.8-.6 1-.8.5-1.2 1.4-1 2.3.5 2 2.1 3.6 4.1 4.1.9.2 1.8-.2 2.3-1 .2-.3.6-.5 1-.5h2.1c.5 0 1 .3 1.2.8l1 2.2c.2.5.1 1.1-.3 1.5-1.3 1.3-3.2 1.9-5.1 1.5C10.4 19.1 4.9 13.6 4.3 7.4c-.3-1.9.3-3.8 1.5-5.1z"
        fill="currentColor"
      />
    </svg>
  );
}

function TrustIcon({ kind }: { kind: "support" | "setup" | "hosting" | "trusted" }) {
  if (kind === "support") {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 3a7 7 0 00-7 7v2H4a1 1 0 00-1 1v3a1 1 0 001 1h2v-7a5 5 0 0110 0v7h2a1 1 0 001-1v-3a1 1 0 00-1-1h-1v-2a7 7 0 00-7-7zm-1 14h2a3 3 0 01-2 2.83V21h2v1H9v-1h2v-1.17A3 3 0 0111 17z"
        />
      </svg>
    );
  }
  if (kind === "setup") {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path
          fill="currentColor"
          d="M13 3l7 9h-5l2 9-9-11h5L13 3z"
        />
      </svg>
    );
  }
  if (kind === "hosting") {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5l8-3zm0 2.2L6 6.1v4.9c0 3.8 2.5 7.2 6 8.6 3.5-1.4 6-4.8 6-8.6V6.1l-6-1.9z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="currentColor"
        d="M9 11a3 3 0 110-6 3 3 0 010 6zm6 0a3 3 0 110-6 3 3 0 010 6zM4.5 18.2c.7-2.3 2.8-3.7 4.5-3.7.7 0 1.6.2 2.4.7.8-.5 1.7-.7 2.4-.7 1.7 0 3.8 1.4 4.5 3.7.2.5-.2 1.1-.7 1.1H5.2c-.5 0-.9-.6-.7-1.1z"
      />
    </svg>
  );
}

function IncludeIcon({
  kind,
}: {
  kind: "globe" | "domain" | "mail" | "shop" | "star";
}) {
  if (kind === "globe") {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 2a10 10 0 100 20 10 10 0 000-20zm7.4 9h-3.1a15 15 0 00-1.2-5 8 8 0 014.3 5zM12 4c.9 0 2.3 1.9 3 5H9c.7-3.1 2.1-5 3-5zM4.6 11a8 8 0 014.3-5 15 15 0 00-1.2 5H4.6zM4.6 13h3.1a15 15 0 001.2 5 8 8 0 01-4.3-5zM12 20c-.9 0-2.3-1.9-3-5h6c-.7 3.1-2.1 5-3 5zm4.9-2a15 15 0 001.2-5h3.1a8 8 0 01-4.3 5z"
        />
      </svg>
    );
  }
  if (kind === "domain") {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          fill="currentColor"
          d="M4 5h16a1 1 0 011 1v10a1 1 0 01-1 1h-7l2 3h-6l2-3H4a1 1 0 01-1-1V6a1 1 0 011-1zm1 2v8h14V7H5z"
        />
      </svg>
    );
  }
  if (kind === "mail") {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          fill="currentColor"
          d="M3 6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6zm2 0l7 5 7-5H5zm14 2.2l-6.4 4.6a1 1 0 01-1.2 0L5 8.2V18h14V8.2z"
        />
      </svg>
    );
  }
  if (kind === "shop") {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          fill="currentColor"
          d="M4 4h16l-1.2 4.8A3 3 0 0116 12H8a3 3 0 01-2.8-3.2L4 4zm2.5 10H17v6H6.5v-6z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2l2.4 6.6H21l-5.2 4 2 6.4L12 15.8 6.2 19l2-6.4L3 8.6h6.6L12 2z"
      />
    </svg>
  );
}
