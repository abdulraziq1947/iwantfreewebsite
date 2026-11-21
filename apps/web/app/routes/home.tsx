import { Link } from "react-router";
import type { Route } from "./+types/home";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "iwantfreewebsite.com — Get a Professional Business Website" },
    {
      name: "description",
      content:
        "£39.99/month. No upfront website fee. No minimum contract. Cancel anytime. We build your website, set up your domain, host it, and help with your Google Business Profile.",
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
            <p className="iwfw-pill">Managed website service</p>
            <h1>Get a Professional Business Website</h1>
            <p className="iwfw-price-banner">
              <span>£39.99/month · No upfront website fee</span>
            </p>
            <p className="iwfw-hero__lead">
              <span className="iwfw-hero__lead-short">
                We build your website, domain, email, and Google Business
                Profile — you focus on the business.
              </span>
              <span className="iwfw-hero__lead-full">
                We build your website, set up your domain, host it, and manage
                your Google Business Profile posts and review replies. You focus
                on the business — we handle the website.
              </span>
            </p>
            <div className="iwfw-hero__ctas">
              <Link to="/get-started" className="iwfw-btn iwfw-btn--green">
                Get My Website Today
                <ArrowIcon />
              </Link>
              <a className="iwfw-speak" href="tel:08008527267">
                <span className="iwfw-speak__icon">
                  <PhoneIcon />
                </span>
                <span>
                  <strong>Speak to Us Today</strong>
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
            <span>Friendly Support</span>
          </div>
          <div className="iwfw-trust__item">
            <TrustIcon kind="setup" />
            <span>Quick Setup</span>
          </div>
          <div className="iwfw-trust__item">
            <TrustIcon kind="hosting" />
            <span>Reliable Hosting</span>
          </div>
          <div className="iwfw-trust__item">
            <TrustIcon kind="trusted" />
            <span>Trusted by Businesses</span>
          </div>
        </div>
      </section>

      <section id="included" className="iwfw-band">
        <div className="iwfw-band__inner iwfw-band__split">
          <div className="iwfw-include-panel">
            <h2>What&apos;s Included?</h2>
            <ul>
              <IncludeItem icon="globe" label="Professional business website" />
              <IncludeItem icon="domain" label="Domain name & hosting" />
              <IncludeItem icon="mail" label="Business email address" />
              <IncludeItem icon="shop" label="Weekly Google Business Profile post" />
              <IncludeItem icon="star" label="Google review replies" />
            </ul>
          </div>
          <div className="iwfw-price-panel">
            <p>All for just</p>
            <p className="iwfw-price-panel__amount">
              £39.99 <span>/month</span>
            </p>
            <Link to="/get-started" className="iwfw-btn iwfw-btn--green iwfw-btn--block">
              Get Started
            </Link>
          </div>
        </div>
      </section>

      <section id="examples" className="iwfw-band iwfw-band--muted">
        <div className="iwfw-band__inner">
          <h2>Some of the sites we&apos;ve built</h2>
          <p className="iwfw-band__lead">
            Live examples from real customers — preview below, or open the full
            site.
          </p>
          <ul className="iwfw-examples">
            {BUILT_SITES.map((site) => (
              <li key={site.href}>
                <a
                  className="iwfw-example"
                  href={site.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="iwfw-example__chrome" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                    <em>{site.host}</em>
                  </span>
                  <span className="iwfw-example__shot">
                    <img
                      src={site.image}
                      alt={`${site.name} website preview`}
                      width={960}
                      height={595}
                      loading="lazy"
                    />
                  </span>
                  <span className="iwfw-example__meta">
                    <span>
                      <strong>{site.name}</strong>
                      <em>{site.trade}</em>
                    </span>
                    <span className="iwfw-example__visit">
                      Visit site
                      <ArrowIcon />
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="how-it-works" className="iwfw-band">
        <div className="iwfw-band__inner">
          <h2>How It Works</h2>
          <p className="iwfw-band__lead">
            Three simple steps from signup to a live business website.
          </p>
          <ol className="iwfw-how">
            <li>
              <strong>1. Get started</strong>
              <p>Create your account and subscribe for £39.99/month. No upfront website fee.</p>
            </li>
            <li>
              <strong>2. Tell us about your business</strong>
              <p>Send your services, photos, contact details, and preferred domain.</p>
            </li>
            <li>
              <strong>3. We build and manage it</strong>
              <p>
                We launch your site and keep hosting, email, and Google Business
                Profile support running.
              </p>
            </li>
          </ol>
        </div>
      </section>

      <section id="faqs" className="iwfw-band iwfw-band--muted">
        <div className="iwfw-band__inner iwfw-faqs">
          <h2>FAQs</h2>
          <details open>
            <summary>Is there an upfront website fee?</summary>
            <p>
              No. There is no upfront website fee. You pay £39.99/month for the
              managed service.
            </p>
          </details>
          <details>
            <summary>Is there a minimum contract?</summary>
            <p>
              No. Cancel anytime. Your service continues until the end of the
              period you have already paid for.
            </p>
          </details>
          <details>
            <summary>What do I get for £39.99/month?</summary>
            <p>
              A managed business website, hosting, domain help, one business
              email mailbox, weekly Google Business Profile posts, and review
              replies.
            </p>
          </details>
          <details>
            <summary>Do you buy the domain for me?</summary>
            <p>
              You choose the domain. We purchase and renew it manually after
              payment — nothing is bought automatically.
            </p>
          </details>
        </div>
      </section>

      <section className="iwfw-band iwfw-band--close">
        <div className="iwfw-band__inner iwfw-close">
          <h2>Ready for a website that works for your business?</h2>
          <p>£39.99/month. No upfront website fee. Cancel anytime.</p>
          <div className="iwfw-close__actions">
            <Link to="/get-started" className="iwfw-btn iwfw-btn--green">
              Get My Website Today
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

const BUILT_SITES = [
  {
    name: "Fencing Company Derby",
    host: "fencingcompanyderby.co.uk",
    href: "https://fencingcompanyderby.co.uk/",
    trade: "Fencing contractor",
    image: "/examples/fencing.jpg",
  },
  {
    name: "Expert Removals Manchester",
    host: "manchesterremovalsgb.co.uk",
    href: "https://manchesterremovalsgb.co.uk/",
    trade: "Removals · multi-branch",
    image: "/examples/removals.jpg",
  },
  {
    name: "Super Plumbers",
    host: "superplumbers.co.uk",
    href: "https://superplumbers.co.uk/",
    trade: "Plumbing · multi-location",
    image: "/examples/plumbers.jpg",
  },
  {
    name: "Rubbish Removal Team",
    host: "rubbishremovalteam.co.uk",
    href: "https://rubbishremovalteam.co.uk/",
    trade: "Rubbish removal · regional coverage",
    image: "/examples/rubbish.jpg",
  },
] as const;

function SampleSite({ variant }: { variant: "desktop" | "mobile" }) {
  return (
    <div className={`iwfw-sample iwfw-sample--${variant}`}>
      <header>
        <strong>Your Business</strong>
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
          <p className="iwfw-sample__title">Trusted Local Plumbing Services</p>
          <ul>
            <li>Boiler repairs</li>
            <li>Emergency call-outs</li>
            <li>Bathroom fitting</li>
          </ul>
          <span className="iwfw-sample__quote">Get a Free Quote</span>
        </div>
        <div className="iwfw-sample__photo" />
      </div>
    </div>
  );
}

function IncludeItem({
  icon,
  label,
}: {
  icon: "globe" | "domain" | "mail" | "shop" | "star";
  label: string;
}) {
  return (
    <li>
      <span className="iwfw-include-panel__icon" aria-hidden="true">
        <IncludeIcon kind={icon} />
      </span>
      <span>{label}</span>
      <span className="iwfw-include-panel__check" aria-hidden="true">
        ✓
      </span>
    </li>
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
        <path fill="currentColor" d="M13 3l7 9h-5l2 9-9-11h5L13 3z" />
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
