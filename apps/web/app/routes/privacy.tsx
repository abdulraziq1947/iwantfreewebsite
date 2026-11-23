import { Link } from "react-router";
import { TERMS_VERSION } from "../lib/get-started";
import type { Route } from "./+types/privacy";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Privacy Policy — iwantfreewebsite.com" },
    {
      name: "description",
      content:
        "How iwantfreewebsite.com handles personal data for UK business customers.",
    },
  ];
}

export default function PrivacyPage() {
  return (
    <main className="iwfw-legal">
      <h1>Privacy Policy</h1>
      <p className="iwfw-legal__lead">
        This policy explains how iwantfreewebsite.com handles personal data for
        UK business customers and website visitors. Aligned with terms version{" "}
        {TERMS_VERSION}.
      </p>

      <section>
        <h2>1. Who we are</h2>
        <p>
          We are the operator of iwantfreewebsite.com. Contact:{" "}
          <a href="mailto:support@iwantfreewebsite.com">
            support@iwantfreewebsite.com
          </a>
          .
        </p>
      </section>

      <section>
        <h2>2. Data we collect</h2>
        <ul>
          <li>Account details (name, email, and secure password storage).</li>
          <li>
            Business and order information you submit (contact details, address,
            services, website preferences, domain preferences, Google Business
            Profile details).
          </li>
          <li>
            Billing identifiers from our payment provider (for example Stripe
            customer and subscription IDs). We do not store full card numbers.
          </li>
          <li>
            Technical data such as IP address and device information for
            security and session management.
          </li>
          <li>
            Optional marketing preferences if you opt in (never pre-ticked).
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Why we use data</h2>
        <ul>
          <li>To create and secure your account.</li>
          <li>To deliver and support the managed website service.</li>
          <li>To process subscription payments and prevent fraud.</li>
          <li>
            To manage cancellation and help transfer your website and domain if
            you leave.
          </li>
          <li>To send service messages; marketing only with consent.</li>
          <li>To meet legal and accounting obligations.</li>
        </ul>
      </section>

      <section>
        <h2>4. Sharing</h2>
        <p>
          We use trusted processors such as hosting and infrastructure
          (Cloudflare), authentication, payment (Stripe), and email delivery. We
          do not sell your personal data.
        </p>
      </section>

      <section>
        <h2>5. Retention</h2>
        <p>
          We keep account and service data while you are a customer. After
          cancellation we preserve website, domain, email and file assets until
          transfer is completed (or you instruct otherwise). Longer retention
          may apply where required by law.
        </p>
      </section>

      <section>
        <h2>6. Your rights</h2>
        <p>
          Under UK GDPR you may have rights to access, rectify, erase, restrict,
          object, and data portability, and to complain to the ICO. Contact
          support to exercise these rights.
        </p>
      </section>

      <section>
        <h2>7. Cookies</h2>
        <p>
          We use essential cookies for login sessions. Any non-essential cookies
          will be disclosed and consented to before use.
        </p>
      </section>

      <section>
        <h2>8. Changes</h2>
        <p>
          We may update this policy. Material changes will be highlighted before
          they apply to existing customers where required.
        </p>
      </section>

      <p className="iwfw-legal__fine">
        <Link to="/terms">Terms &amp; Conditions</Link> ·{" "}
        <Link to="/get-started">Get started</Link>
      </p>
    </main>
  );
}
