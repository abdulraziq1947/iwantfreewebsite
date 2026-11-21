import { Link } from "react-router";
import type { Route } from "./+types/pricing";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Pricing — iwantfreewebsite.com" },
    {
      name: "description",
      content:
        "£39.99/month for a managed business website. No upfront website fee. No minimum contract. Cancel anytime.",
    },
  ];
}

export default function Pricing() {
  return (
    <main className="iwfw-pricing">
      <h1>Simple monthly pricing</h1>
      <p className="iwfw-pricing__lead">
        £39.99/month. No upfront website fee. No minimum contract. Cancel anytime.
      </p>

      <div className="iwfw-pricing__plan">
        <p className="iwfw-pricing__price">
          £39.99
          <span>/month</span>
        </p>
        <ul className="iwfw-pricing__list">
          <li>Professional business website</li>
          <li>Domain name &amp; hosting</li>
          <li>Business email address</li>
          <li>Weekly Google Business Profile post</li>
          <li>Google review replies</li>
        </ul>
        <p className="iwfw-pricing__note">
          Optional Google Rank Tracking (£9.99/month) will be offered only once
          that feature is operational.
        </p>
        <div className="iwfw-pricing__cta">
          <Link to="/get-started" className="iwfw-btn iwfw-btn--green">
            Get My Website Today
          </Link>
        </div>
      </div>
    </main>
  );
}
