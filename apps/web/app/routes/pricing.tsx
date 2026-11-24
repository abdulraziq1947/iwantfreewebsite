import { Link } from "react-router";
import {
  CTA_REASSURANCE,
  PACKAGE_BENEFITS,
  PACKAGE_PRICE,
  PRIMARY_CTA,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_HREF,
} from "../lib/marketing";
import type { Route } from "./+types/pricing";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Pricing — £39.99/month managed website | iwantfreewebsite.com" },
    {
      name: "description",
      content:
        "One clear price: £39.99/month for a professional managed website, domain, hosting, business email and Google Business help. No upfront design fee. No minimum contract. Cancel anytime.",
    },
    {
      property: "og:title",
      content: "£39.99/month managed website package",
    },
    {
      property: "og:description",
      content:
        "Professional website, domain, hosting, email and Google Business help. No upfront design fee. Cancel anytime.",
    },
  ];
}

export default function Pricing() {
  return (
    <main className="iwfw-pricing">
      <h1>Simple, transparent pricing</h1>
      <p className="iwfw-pricing__lead">
        One monthly subscription for everything your business needs to get
        online — professionally managed. No large upfront design fee. No
        juggling separate hosting and domain bills.
      </p>

      <div className="iwfw-pricing__plan">
        <p className="iwfw-pricing__eyebrow">Managed website package</p>
        <p className="iwfw-pricing__price">
          {PACKAGE_PRICE}
          <span>/month</span>
        </p>
        <p className="iwfw-pricing__vat">
          Inclusive of VAT where applicable · Billed in advance
        </p>
        <ul className="iwfw-pricing__list">
          {PACKAGE_BENEFITS.map((item) => (
            <li key={item.title}>
              <strong>{item.title}</strong>
              <span>{item.benefit}</span>
            </li>
          ))}
        </ul>
        <p className="iwfw-pricing__note">
          You pay {PACKAGE_PRICE}/month from checkout — that is the managed
          service subscription. Website design has no separate upfront fee. While
          you subscribe, you do not need to arrange the included hosting, domain
          renewals or mailbox separately.
        </p>
        <div className="iwfw-pricing__cta">
          <Link to="/get-started" className="iwfw-btn iwfw-btn--green">
            {PRIMARY_CTA}
          </Link>
          <p className="iwfw-pricing__reassure">{CTA_REASSURANCE}</p>
        </div>
      </div>

      <section className="iwfw-pricing__extra">
        <h2>What happens if I cancel?</h2>
        <p>
          Cancel anytime from your dashboard — no minimum term, no cancellation
          fee. Service continues until the end of the period you have already
          paid for. We then help transfer your website and domain to you. After
          you leave, you arrange hosting and related services yourself.
        </p>
        <p>
          Full details: <Link to="/terms">Terms &amp; Conditions</Link> ·{" "}
          <Link to="/#catch">So, what&apos;s the catch?</Link>
        </p>
      </section>

      <p className="iwfw-pricing__help">
        Questions before you start?{" "}
        <a href={SUPPORT_PHONE_HREF}>Call {SUPPORT_PHONE_DISPLAY}</a> or{" "}
        <Link to="/contact">contact us</Link>.
      </p>
    </main>
  );
}
