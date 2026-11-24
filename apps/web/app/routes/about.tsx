import { Link } from "react-router";
import {
  OFFER_LINE,
  PACKAGE_PRICE,
  POSITIONING_LINE,
  PRIMARY_CTA,
  SUPPORT_EMAIL,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_HREF,
} from "../lib/marketing";
import type { Route } from "./+types/about";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "About us — iwantfreewebsite.com" },
    {
      name: "description",
      content:
        "iwantfreewebsite.com is a UK-based managed website service for small businesses. You run your business — we handle your website for £39.99/month.",
    },
  ];
}

export default function About() {
  return (
    <main className="iwfw-page">
      <h1>About iwantfreewebsite.com</h1>
      <p className="iwfw-page__lead">{POSITIONING_LINE}</p>

      <section>
        <h2>What we do</h2>
        <p>
          We provide a fully managed online presence for UK small businesses —
          tradespeople, sole traders, local services and new businesses that
          need to look professional without becoming a technology project.
        </p>
        <p>{OFFER_LINE}</p>
      </section>

      <section>
        <h2>How we work</h2>
        <p>
          Instead of charging a large upfront design fee, we build your website
          as part of a simple {PACKAGE_PRICE} monthly subscription. That
          subscription covers hosting, domain care while you subscribe, one
          business email mailbox, Google Business Profile help, and UK-based
          support.
        </p>
        <p>
          We make money from ongoing subscriptions — so we succeed when you stay
          because the service is useful, not because you are locked into a long
          contract.
        </p>
      </section>

      <section>
        <h2>Who we help</h2>
        <p>
          People who are too busy running a business to wrestle with websites.
          People who have been quoted hundreds or thousands upfront. People
          still relying on Facebook or WhatsApp. People who want customers to
          take them seriously online.
        </p>
      </section>

      <section>
        <h2>Talk to us</h2>
        <p>
          Call{" "}
          <a href={SUPPORT_PHONE_HREF}>{SUPPORT_PHONE_DISPLAY}</a> or email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
        <div className="iwfw-page__actions">
          <Link to="/get-started" className="iwfw-btn iwfw-btn--green">
            {PRIMARY_CTA}
          </Link>
          <Link to="/pricing" className="iwfw-btn iwfw-btn--outline">
            See pricing
          </Link>
        </div>
      </section>
    </main>
  );
}
