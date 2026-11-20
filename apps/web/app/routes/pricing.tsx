import { Link } from "react-router";
import type { Route } from "./+types/pricing";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Pricing — iwantfreewebsite.com" },
    {
      name: "description",
      content:
        "£39.99/month for a managed UK business website. No upfront website fee. No minimum contract. Cancel anytime.",
    },
  ];
}

export default function Pricing() {
  return (
    <main className="iwfw-pricing">
      <h1>One plan. Everything you need online.</h1>
      <p className="iwfw-pricing__lead">
        £39.99/month. No upfront website fee. No minimum contract. Cancel
        anytime.
      </p>

      <div className="iwfw-pricing__plan">
        <p className="iwfw-pricing__price">
          £39.99
          <span>/month</span>
        </p>
        <ul className="iwfw-pricing__list">
          <li>Professional managed website built for your business</li>
          <li>Hosting, maintenance and UK support</li>
          <li>Domain help — we purchase and renew manually after you choose</li>
          <li>One business email mailbox</li>
          <li>Weekly Google Business Profile post</li>
          <li>Help replying to Google reviews</li>
        </ul>
        <p className="iwfw-pricing__note">
          Optional Google Rank Tracking (£9.99/month, up to 5 keywords) will be
          offered only once that feature is operational — it is not sold yet.
        </p>
        <div className="iwfw-pricing__cta">
          <Link to="/signup" className="iwfw-btn iwfw-btn--green">
            Start for £39.99/month
          </Link>
        </div>
      </div>
    </main>
  );
}
