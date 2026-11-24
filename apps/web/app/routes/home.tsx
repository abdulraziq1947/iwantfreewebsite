import { useEffect, useRef, useState, type RefObject } from "react";
import { Link } from "react-router";
import { Reveal } from "../components/reveal";
import {
  CTA_REASSURANCE,
  HOME_FAQS,
  OFFER_LINE,
  PACKAGE_BENEFITS,
  PACKAGE_PRICE,
  POSITIONING_LINE,
  PRIMARY_CTA,
  SUPPORT_EMAIL,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_HREF,
  WHO_FOR,
  WHO_FOR_EXAMPLES,
} from "../lib/marketing";
import type { Route } from "./+types/home";
import "../home.css";

export const links: Route.LinksFunction = () => [
  {
    rel: "preload",
    href: "/fonts/archivo-semiexpanded-800-latin.woff2",
    as: "font",
    type: "font/woff2",
    crossOrigin: "anonymous",
  },
];

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
      content: POSITIONING_LINE,
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
  const heroActionsRef = useRef<HTMLDivElement>(null);
  const stickyShown = useScrolledPast(heroActionsRef);

  return (
    <main className="hp">
      <Hero actionsRef={heroActionsRef} />
      <TradesTicker />
      <CatchSection />
      <FamiliarSection />
      <CompareSection />
      <IncludedSection />
      <HowSection />
      <ExamplesSection />
      <WhySection />
      <SupportSection />
      <PricingSection />
      <CancelSection />
      <FaqSection />
      <CloseSection />
      <StickyCta shown={stickyShown} />
    </main>
  );
}

/** True once the element has scrolled up and out of the viewport. */
function useScrolledPast(ref: RefObject<HTMLElement | null>) {
  const [past, setPast] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry) return;
      setPast(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);

  return past;
}

function Hero({ actionsRef }: { actionsRef: RefObject<HTMLDivElement | null> }) {
  return (
    <section className="hp-hero hp-dark" aria-labelledby="hp-hero-title">
      <div className="hp-wrap hp-hero__grid">
        <div className="hp-hero__copy">
          <p className="hp-kicker hp-kicker--inv hp-in">
            Managed websites for UK small businesses
          </p>
          <h1 id="hp-hero-title" className="hp-hero__title hp-in">
            <span className="hp-hero__soft">You run your business.</span>{" "}
            We&apos;ll handle{" "}
            <span className="hp-swash">
              your website.
              <svg
                className="hp-swash__line"
                viewBox="0 0 300 16"
                preserveAspectRatio="none"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M3 11.5C58 5.5 132 3 297 6.5" />
              </svg>
            </span>
          </h1>

          <ul className="hp-offer hp-in hp-in--2" aria-label="The offer at a glance">
            <li className="hp-offer__price">
              <strong>{PACKAGE_PRICE}</strong>
              <span>/month</span>
            </li>
            <li>
              <CheckIcon />
              No upfront design fee
            </li>
            <li>
              <CheckIcon />
              Cancel anytime
            </li>
          </ul>

          <p className="hp-hero__lead hp-in hp-in--2">
            A professional business website without spending hundreds upfront
            or wrestling with technology. Domain, hosting, business email and
            Google Business help — all managed for you.
          </p>

          <div className="hp-hero__actions hp-in hp-in--3" ref={actionsRef}>
            <Link to="/get-started" className="hp-btn hp-btn--go hp-btn--lg">
              {PRIMARY_CTA}
              <ArrowIcon />
            </Link>
            <a className="hp-call" href={SUPPORT_PHONE_HREF}>
              <span className="hp-call__icon" aria-hidden="true">
                <PhoneIcon />
              </span>
              <span className="hp-call__text">
                <small>Prefer to talk?</small>{" "}
                <strong>{SUPPORT_PHONE_DISPLAY}</strong>
              </span>
            </a>
          </div>
          <p className="hp-hero__fine hp-in hp-in--3">
            No technical knowledge needed · Secure checkout with Stripe
          </p>
        </div>

        <div className="hp-hero__visual hp-in hp-in--2">
          <span className="hp-stage-back hp-crop" aria-hidden="true">
            <img
              src={HERO_BACK_SITE.image}
              alt=""
              width={960}
              height={595}
              loading="lazy"
              decoding="async"
            />
          </span>
          <HeroDevice />
          <div className="hp-care">
            <p className="hp-care__title">Looked after every month</p>
            <ul>
              {MONTHLY_CARE.map((item) => (
                <li key={item.title}>
                  <span className="hp-care__tick" aria-hidden="true">
                    <CheckIcon />
                  </span>
                  {item.title}
                </li>
              ))}
            </ul>
          </div>
          <a className="hp-hero__examples" href="#examples">
            Real sites we&apos;ve built — see examples
            <ArrowIcon direction="down" />
          </a>
        </div>
      </div>

      <div className="hp-wrap">
        <ul className="hp-trust" aria-label="Why customers feel safe buying">
          {TRUST_POINTS.map((item) => (
            <li key={item.label}>
              <TrustIcon kind={item.kind} />
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function HeroDevice() {
  return (
    <div
      className="hp-device"
      role="img"
      aria-label="A browser window cycling through real websites we have built for UK trades businesses"
    >
      <div className="hp-device__bar">
        <span className="hp-dots">
          <i />
          <i />
          <i />
        </span>
        <span className="hp-device__url">
          <LockIcon />
          <span className="hp-device__hosts">
            {HERO_SITES.map((site) => (
              <span key={site.host} className="hp-cycle">
                {site.host}
              </span>
            ))}
          </span>
        </span>
      </div>
      <div className="hp-device__screen hp-crop">
        {HERO_SITES.map((site, i) => (
          <img
            key={site.host}
            className="hp-cycle"
            src={site.image}
            alt=""
            width={960}
            height={595}
            decoding="async"
            loading={i === 0 ? "eager" : "lazy"}
            fetchPriority={i === 0 ? "high" : "low"}
          />
        ))}
      </div>
    </div>
  );
}

function TradesTicker() {
  return (
    <div className="hp-ticker" aria-hidden="true">
      <p className="hp-ticker__label">Websites for</p>
      <div className="hp-ticker__viewport">
        <div className="hp-ticker__track">
          {[0, 1].map((copy) => (
            <ul key={copy}>
              {TRADES.map((trade) => (
                <li key={trade}>{trade}</li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </div>
  );
}

function CatchSection() {
  return (
    <section
      id="catch"
      className="hp-section hp-section--paper hp-catch"
      aria-labelledby="catch-title"
    >
      <div className="hp-wrap hp-catch__grid">
        <Reveal className="hp-catch__intro">
          <p className="hp-kicker">The honest answer</p>
          <h2 id="catch-title" className="hp-h2">
            So, what&apos;s the catch?
          </h2>
          <p className="hp-lead">
            Our offer can sound too good to be true. Here is exactly how it
            works — plainly.
          </p>

          <div className="hp-ledger">
            <p className="hp-ledger__head">What you actually pay</p>
            <dl>
              <div>
                <dt>Upfront design fee</dt>
                <dd>None</dd>
              </div>
              <div className="hp-ledger__total">
                <dt>Managed service</dt>
                <dd>
                  {PACKAGE_PRICE}/month
                  <small>from day one</small>
                </dd>
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
            <p className="hp-ledger__foot">
              Inclusive of VAT where applicable · Billed monthly in advance
            </p>
          </div>
        </Reveal>

        <ol className="hp-qa">
          {CATCH_ANSWERS.map((item, i) => (
            <Reveal as="li" key={item.title} delayMs={i * 70}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </Reveal>
          ))}
        </ol>
      </div>

      <Reveal className="hp-wrap">
        <p className="hp-catch__line">
          <span className="hp-catch__label">Clear distinction</span>
          Website design has <strong>no upfront fee</strong>. The managed
          service is a paid subscription of{" "}
          <mark className="hp-marker">{PACKAGE_PRICE}/month from day one</mark>.
        </p>
      </Reveal>
    </section>
  );
}

function FamiliarSection() {
  return (
    <section
      id="familiar"
      className="hp-section hp-familiar"
      aria-labelledby="familiar-title"
    >
      <div className="hp-wrap">
        <Reveal className="hp-head hp-head--split">
          <h2 id="familiar-title" className="hp-h2">
            Sound familiar?
          </h2>
          <p className="hp-lead">
            If any of this feels like your situation, this service was built for
            people like you.
          </p>
        </Reveal>

        <ul className="hp-pains">
          {PAIN_POINTS.map((item, i) => (
            <Reveal as="li" key={item} delayMs={(i % 3) * 70}>
              {item}
            </Reveal>
          ))}
        </ul>

        <Reveal className="hp-answer">
          <p className="hp-answer__text">
            You should be running your business — not learning hosting, chasing
            designers or worrying about domain renewals.{" "}
            <span>
              We handle your online presence so you can get on with the work
              that pays.
            </span>
          </p>
          <Link to="/get-started" className="hp-btn hp-btn--go">
            {PRIMARY_CTA}
            <ArrowIcon />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

function CompareSection() {
  return (
    <section
      id="compare"
      className="hp-section hp-section--paper hp-compare"
      aria-labelledby="compare-title"
    >
      <div className="hp-wrap">
        <Reveal className="hp-head hp-head--split">
          <div>
            <p className="hp-kicker">Social vs. website</p>
            <h2 id="compare-title" className="hp-h2">
              Facebook is useful. It is not a website.
            </h2>
          </div>
          <p className="hp-lead">
            Social profiles help — but customers still look for a proper online
            home for your business.
          </p>
        </Reveal>

        <Reveal>
          <table className="hp-table">
            <caption className="hp-sr">
              Relying on social media only, compared with a managed website
            </caption>
            <thead>
              <tr>
                <td className="hp-table__corner" />
                <th scope="col">Facebook or WhatsApp only</th>
                <th scope="col" className="hp-table__us">
                  A managed website
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map((row) => (
                <tr key={row.topic}>
                  <th scope="row">{row.topic}</th>
                  <td>
                    <CrossIcon />
                    <span>{row.social}</span>
                  </td>
                  <td className="hp-table__us">
                    <CheckIcon />
                    <span>{row.website}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>
      </div>
    </section>
  );
}

function IncludedSection() {
  return (
    <section
      id="included"
      className="hp-section hp-included"
      aria-labelledby="included-title"
    >
      <div className="hp-wrap hp-included__grid">
        <Reveal className="hp-included__aside">
          <p className="hp-kicker">The package</p>
          <h2 id="included-title" className="hp-h2">
            Everything taken care of
          </h2>
          <p className="hp-lead">{OFFER_LINE}</p>
          <p className="hp-figure">
            <strong>{PACKAGE_PRICE}</strong>
            <span>/month for the full package</span>
          </p>
          <Link to="/get-started" className="hp-btn hp-btn--go">
            {PRIMARY_CTA}
            <ArrowIcon />
          </Link>
          <p className="hp-fine">
            Inclusive of VAT where applicable · Billed in advance · No minimum
            contract
          </p>
        </Reveal>

        <ol className="hp-benefits">
          {PACKAGE_BENEFITS.map((item, i) => (
            <Reveal as="li" key={item.title} delayMs={(i % 2) * 70}>
              <span className="hp-benefits__n" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3>{item.title}</h3>
              <p>{item.benefit}</p>
            </Reveal>
          ))}
        </ol>
      </div>

      <Reveal className="hp-wrap">
        <div className="hp-monthly">
          <p className="hp-monthly__intro">
            <strong>What we look after every month.</strong> This is a managed
            service — not a one-off design dump and goodbye.
          </p>
          <ul>
            {MONTHLY_CARE.map((item) => (
              <li key={item.title}>
                <span className="hp-monthly__icon" aria-hidden="true">
                  <MonthIcon kind={item.kind} />
                </span>
                <strong>{item.title}</strong>
                <span>{item.body}</span>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}

function HowSection() {
  return (
    <section
      id="how-it-works"
      className="hp-section hp-dark hp-how"
      aria-labelledby="how-title"
    >
      <div className="hp-wrap">
        <Reveal className="hp-head hp-head--split">
          <h2 id="how-title" className="hp-h2">
            How it works
          </h2>
          <p className="hp-lead">
            Getting started is straightforward. No technical knowledge needed.
          </p>
        </Reveal>

        <Reveal>
          <ol className="hp-steps">
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <span className="hp-steps__n" aria-hidden="true">
                  {i + 1}
                </span>
                <h3>
                  <span className="hp-sr">Step {i + 1}: </span>
                  {step.title}
                </h3>
                <p>{step.body}</p>
                <p className="hp-steps__note">
                  <CheckIcon />
                  {step.note}
                </p>
              </li>
            ))}
          </ol>
        </Reveal>

        <Reveal className="hp-how__cta">
          <Link to="/get-started" className="hp-btn hp-btn--go hp-btn--lg">
            {PRIMARY_CTA}
            <ArrowIcon />
          </Link>
          <p>Start with the questionnaire — no account needed yet.</p>
        </Reveal>
      </div>
    </section>
  );
}

function ExamplesSection() {
  return (
    <section
      id="examples"
      className="hp-section hp-section--paper hp-examples"
      aria-labelledby="examples-title"
    >
      <div className="hp-wrap">
        <Reveal className="hp-head hp-head--split">
          <div>
            <p className="hp-kicker">Real work, live today</p>
            <h2 id="examples-title" className="hp-h2">
              Website examples
            </h2>
          </div>
          <p className="hp-lead">
            Live examples of the kind of professional sites we build for local
            businesses. Open any site to see the full experience.
          </p>
        </Reveal>

        <ul className="hp-gallery">
          {BUILT_SITES.map((site, i) => (
            <Reveal
              as="li"
              key={site.href}
              className={`hp-gallery__item hp-gallery__item--${i + 1}`}
              delayMs={(i % 2) * 90}
            >
              <a
                className="hp-shot"
                href={site.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="hp-frame">
                  <span className="hp-frame__bar" aria-hidden="true">
                    <span className="hp-dots">
                      <i />
                      <i />
                      <i />
                    </span>
                    <em>{site.host}</em>
                  </span>
                  <span className="hp-frame__img hp-crop">
                    <img
                      src={site.image}
                      alt={`Screenshot of the ${site.name} homepage at ${site.host}`}
                      width={960}
                      height={595}
                      loading="lazy"
                      decoding="async"
                    />
                  </span>
                </span>
                <span className="hp-shot__meta">
                  <span>
                    <strong>{site.name}</strong>
                    <em>{site.trade}</em>
                  </span>
                  <span className="hp-shot__visit">
                    Visit site
                    <ExternalIcon />
                    <span className="hp-sr"> (opens in a new tab)</span>
                  </span>
                </span>
              </a>
            </Reveal>
          ))}
        </ul>
        <p className="hp-fine hp-examples__note">
          Examples of the kind of websites we build. Each link opens the live
          site.
        </p>
      </div>
    </section>
  );
}

function WhySection() {
  return (
    <section id="why-us" className="hp-section hp-why" aria-labelledby="why-title">
      <div className="hp-wrap">
        <Reveal className="hp-head hp-head--split">
          <h2 id="why-title" className="hp-h2">
            Why choose us?
          </h2>
          <p className="hp-lead">
            Affordable managed online presence — not a cheap one-off website
            with unfinished edges.
          </p>
        </Reveal>

        <ul className="hp-reasons">
          {WHY_US.map((item, i) => (
            <Reveal as="li" key={item.title} delayMs={(i % 3) * 70}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </Reveal>
          ))}
        </ul>

        <div id="who" className="hp-who">
          <Reveal className="hp-who__copy">
            <h2 className="hp-h2 hp-h2--sm">Who is this for?</h2>
            <p className="hp-lead">
              Built for busy UK small businesses that need to look professional
              online without becoming a tech project.
            </p>
            <p className="hp-fine">
              For example: {WHO_FOR_EXAMPLES} If that sounds like you — or close
              — you&apos;re in the right place.
            </p>
          </Reveal>
          <ul className="hp-who__list">
            {WHO_FOR.map((item, i) => (
              <Reveal as="li" key={item} delayMs={i * 50}>
                <CheckIcon />
                {item}
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function SupportSection() {
  return (
    <section id="support" className="hp-support" aria-labelledby="support-title">
      <Reveal className="hp-wrap hp-support__grid">
        <div>
          <p className="hp-kicker hp-kicker--ink">UK-based support</p>
          <h2 id="support-title" className="hp-h2">
            Real people. <span className="hp-nowrap">UK-based</span> support.
          </h2>
          <p className="hp-support__text">
            Stuck on a question before you buy? Prefer to talk it through? Call
            or email — no technical jargon required.
          </p>
        </div>
        <div className="hp-support__contact">
          <a className="hp-support__phone" href={SUPPORT_PHONE_HREF}>
            <small>Call us</small>
            {SUPPORT_PHONE_DISPLAY}
          </a>
          <a className="hp-support__email" href={`mailto:${SUPPORT_EMAIL}`}>
            <MailIcon />
            {SUPPORT_EMAIL}
          </a>
        </div>
      </Reveal>
    </section>
  );
}

function PricingSection() {
  return (
    <section
      id="pricing"
      className="hp-section hp-dark hp-pricing"
      aria-labelledby="pricing-title"
    >
      <div className="hp-wrap hp-pricing__grid">
        <Reveal className="hp-pricing__copy">
          <p className="hp-kicker hp-kicker--inv">One simple plan</p>
          <h2 id="pricing-title" className="hp-h2">
            Transparent pricing
          </h2>
          <p className="hp-lead">
            One monthly subscription for the whole managed package. You do not
            need to buy hosting, domain renewals or a separate design project
            for the included services while your subscription is active.
          </p>
          <ul className="hp-pricing__terms">
            <li>No upfront design fee</li>
            <li>No minimum contract</li>
            <li>Cancel anytime</li>
          </ul>
        </Reveal>

        <Reveal className="hp-plan" delayMs={80}>
          <p className="hp-plan__name">Managed website package</p>
          <p className="hp-plan__price">
            <strong>{PACKAGE_PRICE}</strong>
            <span>/month</span>
          </p>
          <p className="hp-plan__vat">
            Inclusive of VAT where applicable · Billed in advance
          </p>
          <ul className="hp-plan__list">
            {PACKAGE_BENEFITS.slice(0, 7).map((item) => (
              <li key={item.title}>
                <CheckIcon />
                {item.title}
              </li>
            ))}
          </ul>
          <Link to="/get-started" className="hp-btn hp-btn--go hp-btn--block">
            {PRIMARY_CTA}
            <ArrowIcon />
          </Link>
          <p className="hp-plan__fine">
            No upfront design fee · No minimum contract · Cancel anytime
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function CancelSection() {
  return (
    <section
      id="cancel"
      className="hp-section hp-cancel"
      aria-labelledby="cancel-title"
    >
      <div className="hp-wrap">
        <Reveal className="hp-head hp-head--split">
          <h2 id="cancel-title" className="hp-h2">
            What if I change my mind?
          </h2>
          <p className="hp-lead">
            Buying a website should not feel like a trap. Here is what happens
            if you cancel.
          </p>
        </Reveal>

        <Reveal>
          <ol className="hp-timeline">
            {CANCEL_STEPS.map((step) => (
              <li key={step.title}>
                <p className="hp-timeline__when">{step.when}</p>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </Reveal>

        <p className="hp-fine hp-cancel__terms">
          Full details are in our{" "}
          <Link to="/terms">Terms &amp; Conditions</Link>.
        </p>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section
      id="faqs"
      className="hp-section hp-section--paper hp-faqs"
      aria-labelledby="faqs-title"
    >
      <div className="hp-wrap hp-faqs__grid">
        <Reveal className="hp-faqs__aside">
          <h2 id="faqs-title" className="hp-h2">
            Frequently asked questions
          </h2>
          <p className="hp-lead">
            Can&apos;t see your question? Call{" "}
            <a href={SUPPORT_PHONE_HREF}>{SUPPORT_PHONE_DISPLAY}</a> or email{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
          </p>
        </Reveal>

        <Reveal className="hp-faqs__list">
          {HOME_FAQS.map((faq, index) => (
            <details key={faq.q} className="hp-faq" open={index === 0}>
              <summary>
                <span>{faq.q}</span>
                <span className="hp-faq__icon" aria-hidden="true" />
              </summary>
              <p>{faq.a}</p>
            </details>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

function CloseSection() {
  return (
    <section className="hp-close hp-dark" aria-labelledby="close-title">
      <Reveal className="hp-wrap hp-close__inner">
        <h2 id="close-title" className="hp-close__title">
          Stop putting off getting your{" "}
          <span className="hp-underline">business online</span>
        </h2>
        <p className="hp-close__text">
          Let&apos;s get your business online — without the big upfront bill.{" "}
          {PACKAGE_PRICE}/month for a fully managed website package. Cancel
          anytime.
        </p>
        <div className="hp-close__actions">
          <Link to="/get-started" className="hp-btn hp-btn--go hp-btn--lg">
            {PRIMARY_CTA}
            <ArrowIcon />
          </Link>
          <a className="hp-btn hp-btn--ghost hp-btn--lg" href={SUPPORT_PHONE_HREF}>
            <PhoneIcon />
            Call {SUPPORT_PHONE_DISPLAY}
          </a>
        </div>
        <p className="hp-fine">{CTA_REASSURANCE}</p>
      </Reveal>

      <div className="hp-reel" aria-hidden="true">
        <div className="hp-reel__track">
          {[...BUILT_SITES, ...BUILT_SITES].map((site, i) => (
            <span key={`${site.host}-${i}`} className="hp-reel__shot hp-crop">
              <img src={site.image} alt="" width={960} height={595} loading="lazy" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function StickyCta({ shown }: { shown: boolean }) {
  return (
    <div
      className={`hp-sticky${shown ? " is-shown" : ""}`}
      role="region"
      aria-label="Get started"
      aria-hidden={!shown}
      inert={!shown}
    >
      <div className="hp-sticky__inner">
        <p>
          <strong>
            {PACKAGE_PRICE}
            <span>/month</span>
          </strong>
          <em>
            No upfront design fee
            <span className="hp-sticky__extra"> · Cancel anytime</span>
          </em>
        </p>
        <Link to="/get-started" className="hp-btn hp-btn--go">
          {PRIMARY_CTA}
        </Link>
      </div>
    </div>
  );
}

const TRADES = [
  "Plumbers",
  "Electricians",
  "Cleaners",
  "Builders",
  "Roofers",
  "Fencers",
  "Decorators",
  "Beauty professionals",
  "Consultants",
] as const;

const TRUST_POINTS = [
  { kind: "uk" as const, label: "UK-based support" },
  { kind: "stripe" as const, label: "Secure Stripe checkout" },
  { kind: "cancel" as const, label: "No minimum contract" },
  { kind: "transfer" as const, label: "Website & domain transfer help" },
];

const CATCH_ANSWERS = [
  {
    title: "Why there is no upfront design fee",
    body: `Most website companies ask you to spend hundreds or thousands of pounds before your website even goes live. We've chosen a different approach. Instead of a large design bill upfront, we build your website as part of a simple ${PACKAGE_PRICE} monthly subscription.`,
  },
  {
    title: "How we make money",
    body: `Our business model is based on ongoing subscriptions, not large upfront invoices. You pay ${PACKAGE_PRICE}/month from the beginning for the full managed package — not after the site is finished, and not for a “free” website with surprise extras.`,
  },
  {
    title: "What you pay for",
    body: `${PACKAGE_PRICE}/month (inclusive of VAT where applicable) covers your professional website, hosting, domain registration and renewals while you subscribe, one business email mailbox, Google Business Profile help, and UK-based support.`,
  },
  {
    title: "Why you are not locked in",
    body: "There is no minimum term and no cancellation fee. We want you to stay because you are happy with the service — not because you are tied into a contract. If you leave, we help transfer your website and domain to you.",
  },
] as const;

const PAIN_POINTS = [
  "Been quoted hundreds — or thousands — for a website?",
  "Too busy running the business to build one yourself?",
  "Not sure where to start, or put it off for months?",
  "Worried about hidden charges or long contracts?",
  "Relying entirely on Facebook, Instagram or WhatsApp?",
  "Had a bad experience with a website company before?",
] as const;

const COMPARE_ROWS = [
  {
    topic: "First impressions",
    social: "Looks temporary or unfinished",
    website: "Customers take you more seriously",
  },
  {
    topic: "Enquiries",
    social: "The algorithm decides who sees you",
    website: "A clear place to enquire and call",
  },
  {
    topic: "On Google",
    social: "Harder to find on Google",
    website: "A site of your own that Google can list",
  },
  {
    topic: "Your address",
    social: "Not yours if the platform changes",
    website: "Your own professional web address",
  },
  {
    topic: "Email",
    social: "Personal and business messages mixed together",
    website: "Email that matches your business",
  },
  {
    topic: "Upkeep",
    social: "Down to you",
    website: "We keep the technical side running",
  },
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

const STEPS = [
  {
    title: "Tell us about your business",
    body: "Answer a short questionnaire — who you are, what you do, photos if you have them, and the domain you want.",
    note: "No account needed yet",
  },
  {
    title: `Pay ${PACKAGE_PRICE}/month securely`,
    body: "Subscribe with Stripe (billed in advance). After payment, we create your account and email you a secure activation link.",
    note: "Secure Stripe checkout",
  },
  {
    title: "We build and manage it",
    body: "We register your domain (or work with one you already own), build your site, set up business email, help with Google Business Profile access, and keep hosting and renewals on track.",
    note: "Follow progress in your dashboard",
  },
] as const;

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

const CANCEL_STEPS = [
  {
    when: "Whenever you like",
    title: "Cancel anytime",
    body: "There is no minimum term and no cancellation fee. Cancel from your customer dashboard whenever you like. Your service continues until the end of the period you have already paid for.",
  },
  {
    when: "After you cancel",
    title: "Keep your website and domain",
    body: "Subject to our Terms, you retain ownership of your website content and domain. After cancellation we help transfer them to you — handled by our team, not an automatic switch.",
  },
  {
    when: "Once you have moved",
    title: "What ends after you leave",
    body: "Hosting, domain renewals through us, business email on our managed setup, and Google Business help end with the subscription. After transfer, you arrange those services independently.",
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

/** The dark-themed builds cycle in the hero browser; the light one sits behind it. */
const HERO_SITES = [2, 0, 3].map((i) => BUILT_SITES[i]!);
const HERO_BACK_SITE = BUILT_SITES[1];

function CheckIcon() {
  return (
    <svg
      className="hp-icon"
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

function CrossIcon() {
  return (
    <svg
      className="hp-icon"
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
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ArrowIcon({ direction = "right" }: { direction?: "right" | "down" }) {
  return (
    <svg
      className={`hp-arrow hp-arrow--${direction}`}
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

function ExternalIcon() {
  return (
    <svg
      className="hp-arrow"
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

function PhoneIcon() {
  return (
    <svg
      width="18"
      height="18"
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

function MailIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M3 6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6zm2 0l7 5 7-5H5zm14 2.2l-6.4 4.6a1 1 0 01-1.2 0L5 8.2V18h14V8.2z"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M7 10V7a5 5 0 0110 0v3h1a1 1 0 011 1v9a1 1 0 01-1 1H6a1 1 0 01-1-1v-9a1 1 0 011-1h1zm2 0h6V7a3 3 0 00-6 0v3z"
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
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 2a10 10 0 100 20 10 10 0 000-20zm7.4 9h-3.1a15 15 0 00-1.2-5 8 8 0 014.3 5zM12 4c.9 0 2.3 1.9 3 5H9c.7-3.1 2.1-5 3-5zM4.6 11a8 8 0 014.3-5 15 15 0 00-1.2 5H4.6zM4.6 13h3.1a15 15 0 001.2 5 8 8 0 01-4.3-5zM12 20c-.9 0-2.3-1.9-3-5h6c-.7 3.1-2.1 5-3 5zm4.9-2a15 15 0 001.2-5h3.1a8 8 0 01-4.3 5z"
        />
      </svg>
    );
  }
  if (kind === "stripe") {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5l8-3zm0 2.2L6 6.1v4.9c0 3.8 2.5 7.2 6 8.6 3.5-1.4 6-4.8 6-8.6V6.1l-6-1.9z"
        />
      </svg>
    );
  }
  if (kind === "cancel") {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 2a8 8 0 016.3 12.9L7.1 5.7A8 8 0 0112 4zM5.7 7.1l11.2 11.2A8 8 0 015.7 7.1z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16 3l5 5-5 5-1.4-1.4L17.2 9H4V7h13.2l-2.6-2.6L16 3zM8 11l1.4 1.4L6.8 15H20v2H6.8l2.6 2.6L8 21l-5-5 5-5z"
      />
    </svg>
  );
}
