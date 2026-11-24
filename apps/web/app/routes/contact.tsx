import { Link } from "react-router";
import {
  PRIMARY_CTA,
  SUPPORT_EMAIL,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_HREF,
} from "../lib/marketing";
import type { Route } from "./+types/contact";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Contact us — iwantfreewebsite.com" },
    {
      name: "description",
      content:
        "Speak to the iwantfreewebsite.com team. Call 0800 852 7267 or email support@iwantfreewebsite.com. UK-based support for your managed website.",
    },
  ];
}

export default function Contact() {
  return (
    <main className="iwfw-page">
      <h1>Contact us</h1>
      <p className="iwfw-page__lead">
        Questions about getting your business online? We&apos;re happy to help
        — no technical jargon required.
      </p>

      <section className="iwfw-contact-cards">
        <article>
          <h2>Phone</h2>
          <p>
            <a href={SUPPORT_PHONE_HREF}>{SUPPORT_PHONE_DISPLAY}</a>
          </p>
          <p className="iwfw-page__fine">Freephone for UK callers</p>
        </article>
        <article>
          <h2>Email</h2>
          <p>
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          </p>
          <p className="iwfw-page__fine">We aim to reply as soon as we can</p>
        </article>
        <article>
          <h2>Already a customer?</h2>
          <p>
            Log in to open a support ticket from your dashboard — that is the
            fastest way for us to help with your site.
          </p>
          <p>
            <Link to="/get-started/account?mode=login">Log in</Link>
          </p>
        </article>
      </section>

      <section>
        <h2>Ready to get started?</h2>
        <p>
          Tell us about your business in a short questionnaire, choose a domain,
          then pay securely. We handle the rest.
        </p>
        <div className="iwfw-page__actions">
          <Link to="/get-started" className="iwfw-btn iwfw-btn--green">
            {PRIMARY_CTA}
          </Link>
          <Link to="/pricing" className="iwfw-btn iwfw-btn--outline">
            See what&apos;s included
          </Link>
        </div>
      </section>
    </main>
  );
}
