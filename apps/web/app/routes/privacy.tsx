import { Link } from "react-router";
import { TERMS_VERSION } from "../lib/get-started";
import {
  LEGAL_CONTROLLER_NAME,
  LEGAL_ICO_URL,
  LEGAL_PRIVACY_EMAIL,
  LEGAL_SUPPORT_EMAIL,
  LEGAL_SUPPORT_PHONE_DISPLAY,
  LEGAL_SUPPORT_PHONE_HREF,
  PRIVACY_POLICY_VERSION,
  PROCESSORS,
} from "../lib/legal";
import type { Route } from "./+types/privacy";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Privacy Policy — iwantfreewebsite.com" },
    {
      name: "description",
      content:
        "How iwantfreewebsite.com handles personal data under UK GDPR and PECR for UK business customers and website visitors.",
    },
  ];
}

export default function PrivacyPage() {
  return (
    <main className="iwfw-legal">
      <h1>Privacy Policy</h1>
      <p className="iwfw-legal__lead">
        This policy explains how {LEGAL_CONTROLLER_NAME} handles personal data
        for UK business customers and website visitors under UK GDPR and the UK
        Privacy and Electronic Communications Regulations (PECR). Privacy notice
        version {PRIVACY_POLICY_VERSION}. Aligned with terms version{" "}
        {TERMS_VERSION}.
      </p>

      <section>
        <h2>1. Who is responsible</h2>
        <p>
          The data controller is the operator of {LEGAL_CONTROLLER_NAME}. For
          privacy questions or to exercise your rights, contact{" "}
          <a href={`mailto:${LEGAL_PRIVACY_EMAIL}`}>{LEGAL_PRIVACY_EMAIL}</a>{" "}
          (please put “Privacy” in the subject) or call{" "}
          <a href={LEGAL_SUPPORT_PHONE_HREF}>{LEGAL_SUPPORT_PHONE_DISPLAY}</a>.
        </p>
        <p>
          If you need our registered company name, Companies House number or
          postal address for a formal request, email us and we will provide the
          current details.
        </p>
      </section>

      <section>
        <h2>2. Whose data we process</h2>
        <ul>
          <li>People browsing this website.</li>
          <li>People starting or completing the get-started questionnaire.</li>
          <li>Customers with an account and subscription.</li>
          <li>
            People who contact us by phone, email or support ticket (including
            staff at your business you ask us to deal with).
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Data we collect</h2>
        <ul>
          <li>
            Identity and contact details (name, email, phone, business name,
            address).
          </li>
          <li>
            Account credentials (email and a securely hashed password — we do
            not store your password in plain text).
          </li>
          <li>
            Order and website brief information you submit (services, branding
            notes, domain preferences, Google Business Profile details, media
            you upload).
          </li>
          <li>
            Billing identifiers from Stripe (customer and subscription IDs). We
            do not store full card numbers.
          </li>
          <li>
            Technical data needed for security and sessions (for example IP
            address, browser type, and authentication cookies).
          </li>
          <li>
            Marketing preference if you actively opt in (never pre-ticked).
          </li>
          <li>
            Support correspondence and operational notes needed to deliver the
            service.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Why we use data (purposes and lawful bases)</h2>
        <ul>
          <li>
            <strong>Contract</strong> — create your account, build and host your
            website, manage your domain and mailbox while you subscribe, process
            payments, and handle cancellation / asset transfer.
          </li>
          <li>
            <strong>Legitimate interests</strong> — keep the platform secure
            (fraud prevention, abuse detection), improve reliability, and
            measure service usage with first-party server events where
            proportionate. You may object where the right applies.
          </li>
          <li>
            <strong>Legal obligation</strong> — tax, accounting and regulatory
            records.
          </li>
          <li>
            <strong>Consent</strong> — optional marketing emails (PECR) and any
            non-essential cookies or similar technologies (see the{" "}
            <Link to="/cookies">Cookie Policy</Link>). You can withdraw consent
            at any time without affecting the service you pay for.
          </li>
        </ul>
      </section>

      <section>
        <h2>5. Marketing emails (PECR)</h2>
        <p>
          We only send product tips or offers by email if you tick the optional
          marketing box at checkout (or later opt in). That box is never
          pre-ticked. Service messages about your account, billing, security or
          website are not marketing and may be sent as needed to perform the
          contract.
        </p>
        <p>
          To stop marketing emails, use the unsubscribe link in the message or
          email {LEGAL_SUPPORT_EMAIL} with “Unsubscribe” in the subject. You can
          also update the preference from your{" "}
          <Link to="/dashboard/account">account</Link> page when logged in.
        </p>
      </section>

      <section>
        <h2>6. Cookies and similar technologies</h2>
        <p>
          Essential cookies are required for login, security, checkout and
          remembering cookie choices. Optional analytics and marketing
          technologies are off by default and only used if you consent. Full
          details: <Link to="/cookies">Cookie Policy</Link>.
        </p>
      </section>

      <section>
        <h2>7. Who we share data with</h2>
        <p>
          We use trusted processors to run the service. We do not sell your
          personal data.
        </p>
        <ul>
          {PROCESSORS.map((p) => (
            <li key={p.name}>
              <strong>{p.name}</strong> — {p.role}.
            </li>
          ))}
        </ul>
        <p>
          Domain registrars and Google (for Google Business Profile access you
          grant) may also receive data needed to deliver those parts of the
          package. We may disclose information if required by law or to protect
          rights, safety or the service.
        </p>
      </section>

      <section>
        <h2>8. International transfers</h2>
        <p>
          Some processors (including Cloudflare and Stripe) may process data
          outside the UK. Where that happens we rely on appropriate safeguards
          such as the UK International Data Transfer Agreement / Addendum or
          adequacy decisions, as offered by those providers.
        </p>
      </section>

      <section>
        <h2>9. Retention</h2>
        <ul>
          <li>
            Account and service data — while you are a customer and for a
            reasonable period afterwards to complete transfer, resolve disputes
            and meet legal duties.
          </li>
          <li>
            After cancellation — website, domain, email and file assets until
            transfer is completed or you instruct otherwise.
          </li>
          <li>
            Billing and tax records — typically up to six years where required.
          </li>
          <li>
            Draft get-started orders — expire automatically (about 14 days) if
            unpaid.
          </li>
          <li>
            Cookie preference — about six months (or until you clear cookies).
          </li>
        </ul>
      </section>

      <section>
        <h2>10. Your rights (UK GDPR)</h2>
        <p>You may have the right to:</p>
        <ul>
          <li>Access your personal data</li>
          <li>Rectify inaccurate data</li>
          <li>Erase data (in some cases)</li>
          <li>Restrict or object to certain processing</li>
          <li>Data portability (in some cases)</li>
          <li>Withdraw consent where we rely on consent</li>
          <li>
            Complain to the Information Commissioner’s Office (
            <a href={LEGAL_ICO_URL} rel="noreferrer" target="_blank">
              ico.org.uk
            </a>
            )
          </li>
        </ul>
        <p>
          To make a request, email{" "}
          <a href={`mailto:${LEGAL_PRIVACY_EMAIL}?subject=Privacy%20request`}>
            {LEGAL_PRIVACY_EMAIL}
          </a>
          . We may need to verify your identity. We aim to respond within one
          month.
        </p>
      </section>

      <section>
        <h2>11. Children</h2>
        <p>
          This service is aimed at UK businesses and adults acting for a
          business. We do not knowingly offer accounts to children.
        </p>
      </section>

      <section>
        <h2>12. Security</h2>
        <p>
          We use HTTPS, access controls, hashed passwords, and infrastructure
          security provided by our hosting and payment partners. No method of
          transmission or storage is perfectly secure; please use a strong
          unique password.
        </p>
      </section>

      <section>
        <h2>13. Changes</h2>
        <p>
          We may update this policy. The version date above will change when we
          do. Material changes for existing customers will be highlighted where
          required.
        </p>
      </section>

      <p className="iwfw-legal__fine">
        <Link to="/cookies">Cookie Policy</Link> ·{" "}
        <Link to="/terms">Terms &amp; Conditions</Link> ·{" "}
        <Link to="/get-started">Get started</Link>
      </p>
    </main>
  );
}
