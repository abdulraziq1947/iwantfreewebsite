import { Link } from "react-router";
import { BrandLogo } from "../components/brand-logo";
import { Reveal } from "../components/reveal";
import {
  CTA_REASSURANCE,
  HOME_FAQS,
  OFFER_LINE,
  PACKAGE_BENEFITS,
  PACKAGE_PRICE,
  POSITIONING_LINE,
  PRIMARY_CTA,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_HREF,
  WHO_FOR,
  WHO_FOR_EXAMPLES,
} from "../lib/marketing";
import type { Route } from "./+types/home";

export function meta(_args: Route.MetaArgs) {
  return [
    {
      title:
        "iwantfreewebsite.com — Professional website for UK businesses, £39.99/month",
    },
    {
      name: "description",
      content:
        "You run your business. We'll handle your website. Professional managed website, domain, hosting, business email and Google Business help for £39.99/month. No upfront design fee. Cancel anytime.",
    },
    {
      property: "og:title",
      content: "You run your business. We'll handle your website.",
    },
    {
      property: "og:description",
      content:
        "Everything your UK business needs to get online, professionally managed for £39.99 a month. No upfront design fee. Cancel anytime.",
    },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}

export default function Home() {
  return (
    <main className="iwfw-sales">
      <section className="iwfw-hero iwfw-hero--stage" aria-label="Introduction">
        <div className="iwfw-hero__glow" aria-hidden="true" />
        <div className="iwfw-hero__inner">
          <div className="iwfw-hero__copy iwfw-anim iwfw-anim--1">
            <p className="iwfw-hero__brand">
              <BrandLogo size={40} withWordmark />
            </p>
            <p className="iwfw-pill">Managed online presence for UK businesses</p>
            <h1>{POSITIONING_LINE}</h1>
            <p className="iwfw-price-banner">
              <span>
                {PACKAGE_PRICE}/month · No upfront design fee · Cancel anytime
              </span>
            </p>
            <p className="iwfw-hero__lead">
              A professional business website without spending hundreds upfront
              or wrestling with technology — everything managed for{" "}
              {PACKAGE_PRICE} a month.
            </p>
            <div className="iwfw-hero__ctas">
              <Link to="/get-started" className="iwfw-btn iwfw-btn--green iwfw-btn--pulse">
                {PRIMARY_CTA}
                <ArrowIcon />
              </Link>
              <a className="iwfw-speak" href={SUPPORT_PHONE_HREF}>
                <span className="iwfw-speak__icon">
                  <PhoneIcon />
                </span>
                <span>
                  <strong>Speak to us</strong>
                  <em>{SUPPORT_PHONE_DISPLAY}</em>
                </span>
              </a>
            </div>
            <p className="iwfw-hero__reassure">{CTA_REASSURANCE}</p>
          </div>

          <div className="iwfw-hero__visual iwfw-anim iwfw-anim--2" aria-hidden="true">
            <div className="iwfw-stage">
              <div className="iwfw-stage__browser iwfw-float-a">
                <div className="iwfw-stage__chrome">
                  <i />
                  <i />
                  <i />
                  <em>yourbusiness.co.uk</em>
                </div>
                <img
                  src="/examples/plumbers.jpg"
                  alt=""
                  width={960}
                  height={595}
                  fetchPriority="high"
                />
              </div>
              <div className="iwfw-stage__phone iwfw-float-b">
                <span className="iwfw-stage__notch" />
                <img
                  src="/examples/fencing.jpg"
                  alt=""
                  width={480}
                  height={840}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="iwfw-trust iwfw-anim iwfw-anim--3">
          <div className="iwfw-trust__item">
            <TrustIcon kind="uk" />
            <span>UK-based support</span>
          </div>
          <div className="iwfw-trust__item">
            <TrustIcon kind="stripe" />
            <span>Secure Stripe checkout</span>
          </div>
          <div className="iwfw-trust__item">
            <TrustIcon kind="cancel" />
            <span>No minimum contract</span>
          </div>
          <div className="iwfw-trust__item">
            <TrustIcon kind="transfer" />
            <span>Website &amp; domain transfer help</span>
          </div>
        </div>
      </section>

      <div className="iwfw-rail" aria-hidden="true">
        <div className="iwfw-rail__track">
          {[...BUILT_SITES, ...BUILT_SITES].map((site, i) => (
            <figure key={`${site.host}-${i}`} className="iwfw-rail__shot">
              <img src={site.image} alt="" width={960} height={595} loading="lazy" />
              <figcaption>{site.host}</figcaption>
            </figure>
          ))}
        </div>
      </div>

      <section id="catch" className="iwfw-band iwfw-band--catch">
        <Reveal>
          <div className="iwfw-band__inner iwfw-catch">
            <h2>So, what&apos;s the catch?</h2>
            <p className="iwfw-band__lead">
              Our offer can sound too good to be true. Here is exactly how it
              works — plainly.
            </p>
            <div className="iwfw-catch__grid">
              <div className="iwfw-catch__card">
                <h3>Why there is no upfront design fee</h3>
                <p>
                  Most website companies ask you to spend hundreds or thousands of
                  pounds before your website even goes live. We&apos;ve chosen a
                  different approach. Instead of a large design bill upfront, we
                  build your website as part of a simple{" "}
                  <strong>{PACKAGE_PRICE} monthly subscription</strong>.
                </p>
              </div>
              <div className="iwfw-catch__card">
                <h3>How we make money</h3>
                <p>
                  Our business model is based on ongoing subscriptions, not large
                  upfront invoices. You pay {PACKAGE_PRICE}/month from the
                  beginning for the full managed package — not after the site is
                  finished, and not for a &ldquo;free&rdquo; website with surprise
                  extras.
                </p>
              </div>
              <div className="iwfw-catch__card">
                <h3>What you pay for</h3>
                <p>
                  {PACKAGE_PRICE}/month (inclusive of VAT where applicable) covers
                  your professional website, hosting, domain registration and
                  renewals while you subscribe, one business email mailbox, Google
                  Business Profile help, and UK-based support.
                </p>
              </div>
              <div className="iwfw-catch__card">
                <h3>Why you are not locked in</h3>
                <p>
                  There is no minimum term and no cancellation fee. We want you to
                  stay because you are happy with the service — not because you
                  are tied into a contract. If you leave, we help transfer your
                  website and domain to you.
                </p>
              </div>
            </div>
            <p className="iwfw-catch__footer">
              Clear distinction:{" "}
              <strong>website design has no upfront fee</strong>. The managed
              service is a paid subscription of{" "}
              <strong>
                {PACKAGE_PRICE}
                /month
              </strong>{" "}
              from day one.
            </p>
          </div>
        </Reveal>
      </section>

      <section id="familiar" className="iwfw-band iwfw-band--muted">
        <Reveal>
          <div className="iwfw-band__inner">
            <h2>Sound familiar?</h2>
            <p className="iwfw-band__lead">
              If any of this feels like your situation, this service was built for
              people like you.
            </p>
            <ul className="iwfw-pain">
              {PAIN_POINTS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="iwfw-pain__solution">
              You should be running your business — not learning hosting, chasing
              designers or worrying about domain renewals. We handle your online
              presence so you can get on with the work that pays.
            </p>
            <Link to="/get-started" className="iwfw-btn iwfw-btn--green">
              {PRIMARY_CTA}
            </Link>
          </div>
        </Reveal>
      </section>

      <section id="compare" className="iwfw-band">
        <Reveal>
          <div className="iwfw-band__inner">
            <h2>Facebook is useful. It is not a website.</h2>
            <p className="iwfw-band__lead">
              Social profiles help — but customers still look for a proper online
              home for your business.
            </p>
            <div className="iwfw-compare">
              <div className="iwfw-compare__col iwfw-compare__col--muted">
                <h3>Relying on social only</h3>
                <ul>
                  <li>Algorithm decides who sees you</li>
                  <li>Looks temporary or unfinished</li>
                  <li>Harder to find on Google</li>
                  <li>Not yours if the platform changes</li>
                  <li>Mixing personal and business messages</li>
                </ul>
              </div>
              <div className="iwfw-compare__col iwfw-compare__col--accent">
                <h3>With a managed website</h3>
                <ul>
                  <li>Your own professional address</li>
                  <li>Customers take you more seriously</li>
                  <li>Clear place to enquire and call</li>
                  <li>Email that matches your business</li>
                  <li>We keep the technical side running</li>
                </ul>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <section id="included" className="iwfw-band iwfw-band--muted">
        <Reveal>
          <div className="iwfw-band__inner">
            <h2>Everything taken care of</h2>
            <p className="iwfw-band__lead">{OFFER_LINE}</p>
            <ul className="iwfw-benefits">
              {PACKAGE_BENEFITS.map((item) => (
                <li key={item.title}>
                  <strong>{item.title}</strong>
                  <span>{item.benefit}</span>
                </li>
              ))}
            </ul>
            <div className="iwfw-band__cta-row">
              <div className="iwfw-price-chip">
                <span>All for</span>
                <strong>
                  {PACKAGE_PRICE}
                  <em>/month</em>
                </strong>
              </div>
              <Link to="/get-started" className="iwfw-btn iwfw-btn--green">
                {PRIMARY_CTA}
              </Link>
            </div>
            <p className="iwfw-band__fine">
              Inclusive of VAT where applicable · Billed in advance · No minimum
              contract
            </p>
          </div>
        </Reveal>
      </section>

      <section id="month" className="iwfw-band">
        <Reveal>
          <div className="iwfw-band__inner">
            <h2>What we look after every month</h2>
            <p className="iwfw-band__lead">
              This is a managed service — not a one-off design dump and goodbye.
            </p>
            <ul className="iwfw-month">
              {MONTHLY_CARE.map((item) => (
                <li key={item.title}>
                  <span className="iwfw-month__icon" aria-hidden="true">
                    <MonthIcon kind={item.kind} />
                  </span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </section>

      <section id="how-it-works" className="iwfw-band iwfw-band--muted">
        <Reveal>
          <div className="iwfw-band__inner">
            <h2>How it works</h2>
            <p className="iwfw-band__lead">
              Getting started is straightforward. No technical knowledge needed.
            </p>
            <ol className="iwfw-how iwfw-how--rich">
              <li>
                <span className="iwfw-how__step">1</span>
                <strong>Tell us about your business</strong>
                <p>
                  Answer a short questionnaire — who you are, what you do, photos
                  if you have them, and the domain you want. No account needed
                  yet.
                </p>
              </li>
              <li>
                <span className="iwfw-how__step">2</span>
                <strong>Pay {PACKAGE_PRICE}/month securely</strong>
                <p>
                  Subscribe with Stripe (billed in advance). After payment, we
                  create your account and email a secure activation link.
                </p>
              </li>
              <li>
                <span className="iwfw-how__step">3</span>
                <strong>We build and manage it</strong>
                <p>
                  We register your domain (or work with one you already own),
                  build your site, set up business email, help with Google
                  Business Profile access, and keep hosting and renewals on
                  track. Follow progress in your dashboard.
                </p>
              </li>
            </ol>
          </div>
        </Reveal>
      </section>

      <section id="examples" className="iwfw-band">
        <Reveal>
          <div className="iwfw-band__inner">
            <h2>Website examples</h2>
            <p className="iwfw-band__lead">
              Live examples of the kind of professional sites we build for local
              businesses. Open any site to see the full experience.
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
        </Reveal>
      </section>

      <section id="why-us" className="iwfw-band iwfw-band--muted">
        <Reveal>
          <div className="iwfw-band__inner">
            <h2>Why choose us?</h2>
            <p className="iwfw-band__lead">
              Affordable managed online presence — not a cheap one-off website
              with unfinished edges.
            </p>
            <ul className="iwfw-why">
              {WHY_US.map((item) => (
                <li key={item.title}>
                  <strong>{item.title}</strong>
                  <span>{item.body}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </section>

      <section id="who" className="iwfw-band">
        <Reveal>
          <div className="iwfw-band__inner iwfw-who-block">
            <div>
              <h2>Who is this for?</h2>
              <p className="iwfw-band__lead">
                Built for busy UK small businesses that need to look professional
                online without becoming a tech project.
              </p>
              <ul className="iwfw-who">
                {WHO_FOR.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="iwfw-band__fine">
                For example: {WHO_FOR_EXAMPLES} If that sounds like you — or
                close — you&apos;re in the right place.
              </p>
            </div>
            <div className="iwfw-who-collage" aria-hidden="true">
              <img src="/examples/removals.jpg" alt="" loading="lazy" />
              <img src="/examples/rubbish.jpg" alt="" loading="lazy" />
              <img src="/examples/fencing.jpg" alt="" loading="lazy" />
            </div>
          </div>
        </Reveal>
      </section>

      <section id="support" className="iwfw-band iwfw-band--support">
        <Reveal>
          <div className="iwfw-band__inner iwfw-support">
            <div>
              <h2>Real people. UK-based support.</h2>
              <p>
                Stuck on a question before you buy? Prefer to talk it through?
                Call or email — no technical jargon required.
              </p>
            </div>
            <div className="iwfw-support__actions">
              <a className="iwfw-btn iwfw-btn--blue" href={SUPPORT_PHONE_HREF}>
                <PhoneIcon />
                Call {SUPPORT_PHONE_DISPLAY}
              </a>
              <a
                className="iwfw-btn iwfw-btn--outline"
                href="mailto:support@iwantfreewebsite.com"
              >
                Email support
              </a>
            </div>
          </div>
        </Reveal>
      </section>

      <section id="pricing" className="iwfw-band iwfw-band--muted">
        <Reveal>
          <div className="iwfw-band__inner iwfw-band__split">
            <div className="iwfw-include-panel">
              <h2>Transparent pricing</h2>
              <ul>
                {PACKAGE_BENEFITS.slice(0, 7).map((item) => (
                  <IncludeItem key={item.title} label={item.title} />
                ))}
              </ul>
              <p className="iwfw-include-panel__note">
                You do not need to buy hosting, domain renewals or a separate
                design project for the included services while your subscription
                is active.
              </p>
            </div>
            <div className="iwfw-price-panel">
              <p>Simple monthly subscription</p>
              <p className="iwfw-price-panel__amount">
                {PACKAGE_PRICE} <span>/month</span>
              </p>
              <p className="iwfw-price-panel__vat">
                Inclusive of VAT where applicable · Billed in advance
              </p>
              <Link
                to="/get-started"
                className="iwfw-btn iwfw-btn--green iwfw-btn--block"
              >
                {PRIMARY_CTA}
              </Link>
              <p className="iwfw-price-panel__fine">
                No upfront design fee · No minimum contract · Cancel anytime
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      <section id="cancel" className="iwfw-band">
        <Reveal>
          <div className="iwfw-band__inner iwfw-cancel">
            <h2>What if I change my mind?</h2>
            <p className="iwfw-band__lead">
              Buying a website should not feel like a trap. Here is what happens
              if you cancel.
            </p>
            <div className="iwfw-cancel__grid">
              <div>
                <h3>Cancel anytime</h3>
                <p>
                  There is no minimum term and no cancellation fee. Cancel from
                  your customer dashboard whenever you like. Your service
                  continues until the end of the period you have already paid
                  for.
                </p>
              </div>
              <div>
                <h3>Keep your website and domain</h3>
                <p>
                  Subject to our Terms, you retain ownership of your website
                  content and domain. After cancellation we help transfer them
                  to you — handled by our team, not an automatic switch.
                </p>
              </div>
              <div>
                <h3>What ends after you leave</h3>
                <p>
                  Hosting, domain renewals through us, business email on our
                  managed setup, and Google Business help end with the
                  subscription. After transfer, you arrange those services
                  independently.
                </p>
              </div>
            </div>
            <p className="iwfw-band__fine">
              Full details are in our{" "}
              <Link to="/terms">Terms &amp; Conditions</Link>.
            </p>
          </div>
        </Reveal>
      </section>

      <section id="faqs" className="iwfw-band iwfw-band--muted">
        <Reveal>
          <div className="iwfw-band__inner iwfw-faqs">
            <h2>Frequently asked questions</h2>
            {HOME_FAQS.map((faq, index) => (
              <details key={faq.q} open={index === 0}>
                <summary>{faq.q}</summary>
                <p>{faq.a}</p>
              </details>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="iwfw-band iwfw-band--close">
        <Reveal>
          <div className="iwfw-band__inner iwfw-close">
            <h2>Stop putting off getting your business online</h2>
            <p>
              Let&apos;s get your business online — without the big upfront bill.
              {PACKAGE_PRICE}/month for a fully managed website package. Cancel
              anytime.
            </p>
            <div className="iwfw-close__actions">
              <Link to="/get-started" className="iwfw-btn iwfw-btn--green">
                {PRIMARY_CTA}
              </Link>
              <a className="iwfw-btn iwfw-btn--outline" href={SUPPORT_PHONE_HREF}>
                Call {SUPPORT_PHONE_DISPLAY}
              </a>
            </div>
            <p className="iwfw-band__fine">{CTA_REASSURANCE}</p>
          </div>
        </Reveal>
      </section>

      <div className="iwfw-sticky-cta" role="region" aria-label="Get started">
        <div className="iwfw-sticky-cta__inner">
          <p>
            <strong>{PACKAGE_PRICE}/month</strong>
            <span>No upfront design fee · Cancel anytime</span>
          </p>
          <Link to="/get-started" className="iwfw-btn iwfw-btn--green">
            {PRIMARY_CTA}
          </Link>
        </div>
      </div>
    </main>
  );
}

const PAIN_POINTS = [
  "Been quoted hundreds — or thousands — for a website?",
  "Too busy running the business to build one yourself?",
  "Not sure where to start, or put it off for months?",
  "Worried about hidden charges or long contracts?",
  "Relying entirely on Facebook, Instagram or WhatsApp?",
  "Had a bad experience with a website company before?",
] as const;

const MONTHLY_CARE = [
  {
    kind: "host" as const,
    title: "Website hosting",
    body: "Your site stays online — we handle the hosting side so you do not have to.",
  },
  {
    kind: "domain" as const,
    title: "Domain renewals",
    body: "While you subscribe, we look after registration and renewals for your domain.",
  },
  {
    kind: "mail" as const,
    title: "Business email",
    body: "One professional mailbox on your domain so you look the part when you reply.",
  },
  {
    kind: "gbp" as const,
    title: "Google Business help",
    body: "Weekly posts and review-reply help when you give us Manager access.",
  },
];

const WHY_US = [
  {
    title: "No large upfront design fee",
    body: "Get a professional site without writing a big cheque before anything is live.",
  },
  {
    title: "One clear monthly price",
    body: `${PACKAGE_PRICE}/month for the managed package — design, hosting, domain care and more.`,
  },
  {
    title: "Fully managed for you",
    body: "We handle the technical work so you can focus on customers and jobs.",
  },
  {
    title: "UK-based support",
    body: `Call ${SUPPORT_PHONE_DISPLAY} or email us when you need help.`,
  },
  {
    title: "No minimum contract",
    body: "Cancel anytime. Stay because the service works for you.",
  },
  {
    title: "Transfer help if you leave",
    body: "Peace of mind that your website and domain can move with you.",
  },
] as const;

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

function IncludeItem({ label }: { label: string }) {
  return (
    <li>
      <span className="iwfw-include-panel__icon" aria-hidden="true">
        <CheckMini />
      </span>
      <span>{label}</span>
      <span className="iwfw-include-panel__check" aria-hidden="true">
        ✓
      </span>
    </li>
  );
}

function CheckMini() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M9.2 16.6L4.8 12.2l1.4-1.4 3 3 8-8 1.4 1.4-9.4 9.4z"
      />
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

function MonthIcon({ kind }: { kind: "host" | "domain" | "mail" | "gbp" }) {
  if (kind === "host") {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path
          fill="currentColor"
          d="M4 5h16a1 1 0 011 1v4H3V6a1 1 0 011-1zm-1 7h18v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zm3 2v2h2v-2H6zm4 0v2h2v-2h-2z"
        />
      </svg>
    );
  }
  if (kind === "domain") {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 2a10 10 0 100 20 10 10 0 000-20zm7.4 9h-3.1a15 15 0 00-1.2-5 8 8 0 014.3 5zM12 4c.9 0 2.3 1.9 3 5H9c.7-3.1 2.1-5 3-5zM4.6 11a8 8 0 014.3-5 15 15 0 00-1.2 5H4.6zM4.6 13h3.1a15 15 0 001.2 5 8 8 0 01-4.3-5zM12 20c-.9 0-2.3-1.9-3-5h6c-.7 3.1-2.1 5-3 5zm4.9-2a15 15 0 001.2-5h3.1a8 8 0 01-4.3 5z"
        />
      </svg>
    );
  }
  if (kind === "mail") {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path
          fill="currentColor"
          d="M3 6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6zm2 0l7 5 7-5H5zm14 2.2l-6.4 4.6a1 1 0 01-1.2 0L5 8.2V18h14V8.2z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1112 6a2.5 2.5 0 010 5.5z"
      />
    </svg>
  );
}

function TrustIcon({
  kind,
}: {
  kind: "uk" | "stripe" | "cancel" | "transfer";
}) {
  if (kind === "uk") {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 2a10 10 0 100 20 10 10 0 000-20zm7.4 9h-3.1a15 15 0 00-1.2-5 8 8 0 014.3 5zM12 4c.9 0 2.3 1.9 3 5H9c.7-3.1 2.1-5 3-5zM4.6 11a8 8 0 014.3-5 15 15 0 00-1.2 5H4.6zM4.6 13h3.1a15 15 0 001.2 5 8 8 0 01-4.3-5zM12 20c-.9 0-2.3-1.9-3-5h6c-.7 3.1-2.1 5-3 5zm4.9-2a15 15 0 001.2-5h3.1a8 8 0 01-4.3 5z"
        />
      </svg>
    );
  }
  if (kind === "stripe") {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5l8-3zm0 2.2L6 6.1v4.9c0 3.8 2.5 7.2 6 8.6 3.5-1.4 6-4.8 6-8.6V6.1l-6-1.9z"
        />
      </svg>
    );
  }
  if (kind === "cancel") {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 2a10 10 0 100 20 10 10 0 000-20zm-1 5h2v7h-2V7zm0 9h2v2h-2v-2z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7 7h7v2H9v6H7V7zm10 0v10h-7v-2h5V7h2z"
      />
    </svg>
  );
}
