import { Link } from "react-router";
import { CookieSettingsButton } from "../components/cookie-consent";
import { COOKIE_DISCLOSURES } from "../lib/cookie-consent";
import {
  COOKIE_POLICY_VERSION,
  LEGAL_CONTROLLER_NAME,
  LEGAL_SUPPORT_EMAIL,
} from "../lib/legal";
import type { Route } from "./+types/cookies";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Cookie Policy — iwantfreewebsite.com" },
    {
      name: "description",
      content:
        "How iwantfreewebsite.com uses cookies and similar technologies under UK PECR and UK GDPR.",
    },
  ];
}

export default function CookiesPage() {
  const essential = COOKIE_DISCLOSURES.filter((c) => c.category === "essential");
  const optional = COOKIE_DISCLOSURES.filter((c) => c.category !== "essential");

  return (
    <main className="iwfw-legal">
      <h1>Cookie Policy</h1>
      <p className="iwfw-legal__lead">
        This policy explains how {LEGAL_CONTROLLER_NAME} uses cookies and similar
        technologies on this website, in line with the UK Privacy and Electronic
        Communications Regulations (PECR) and UK GDPR. Version{" "}
        {COOKIE_POLICY_VERSION}.
      </p>

      <section>
        <h2>1. What are cookies?</h2>
        <p>
          Cookies are small text files stored on your device. Similar technologies
          include local storage and pixels. Some are essential for the service to
          work; others help with analytics or marketing and need your consent
          before we use them.
        </p>
      </section>

      <section>
        <h2>2. How we ask for consent</h2>
        <p>
          When you first visit, we show a cookie banner. You can{" "}
          <strong>Accept all</strong>, <strong>Reject non-essential</strong>, or{" "}
          <strong>Manage cookies</strong> by category. Essential cookies run
          without consent because the site cannot function securely without them.
          Optional analytics and marketing technologies stay off until you opt in.
        </p>
        <p>
          You can change your mind at any time:{" "}
          <CookieSettingsButton className="iwfw-legal__text-btn" />.
        </p>
      </section>

      <section>
        <h2>3. Essential cookies we use</h2>
        <CookieTable rows={essential} />
      </section>

      <section>
        <h2>4. Optional cookies</h2>
        {optional.length === 0 ? (
          <p>
            We do not currently set analytics or marketing cookies. If we add
            them later, they will only load after you enable the matching
            category in cookie settings, and this table will be updated.
          </p>
        ) : (
          <CookieTable rows={optional} />
        )}
        <p>
          Today there are no third-party analytics or advertising tags on this
          site. Server-side product events (for example signup or checkout
          success) are recorded in our own database when you use the service —
          those are not browser cookies.
        </p>
      </section>

      <section>
        <h2>5. Fonts and third-party requests</h2>
        <p>
          We self-host our website fonts so your browser does not contact Google
          Fonts (or similar) just to display type. Payment is handled on Stripe’s
          secure Checkout pages when you subscribe.
        </p>
      </section>

      <section>
        <h2>6. How long we keep your choice</h2>
        <p>
          Your cookie preference is stored in the{" "}
          <code>iwfw_consent</code> cookie for about six months. After that we may
          ask again. Clearing cookies in your browser will also clear the choice.
        </p>
      </section>

      <section>
        <h2>7. Browser controls</h2>
        <p>
          You can block or delete cookies in your browser settings. Blocking
          essential cookies may stop login, checkout or security features from
          working.
        </p>
      </section>

      <section>
        <h2>8. More information</h2>
        <p>
          For how we process personal data more broadly, see the{" "}
          <Link to="/privacy">Privacy Policy</Link>. Questions:{" "}
          <a href={`mailto:${LEGAL_SUPPORT_EMAIL}`}>{LEGAL_SUPPORT_EMAIL}</a>.
        </p>
      </section>

      <p className="iwfw-legal__fine">
        <Link to="/privacy">Privacy Policy</Link> ·{" "}
        <Link to="/terms">Terms &amp; Conditions</Link>
      </p>
    </main>
  );
}

function CookieTable({
  rows,
}: {
  rows: typeof COOKIE_DISCLOSURES;
}) {
  return (
    <div className="iwfw-legal__table-wrap">
      <table className="iwfw-legal__table">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Purpose</th>
            <th scope="col">Duration</th>
            <th scope="col">Provider</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <td>{row.name}</td>
              <td>{row.purpose}</td>
              <td>{row.duration}</td>
              <td>{row.provider}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
