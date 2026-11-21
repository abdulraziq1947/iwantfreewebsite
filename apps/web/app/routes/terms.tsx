import { Link } from "react-router";
import { TERMS_VERSION } from "../lib/get-started";
import type { Route } from "./+types/terms";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Terms & Conditions (draft) — iwantfreewebsite.com" },
    { name: "robots", content: "noindex" },
  ];
}

export default function TermsPage() {
  return (
    <main className="iwfw-legal">
      <p className="iwfw-legal__draft">
        DRAFT FOR REVIEW — not final legal advice. Version {TERMS_VERSION}. Do
        not treat as published until you approve.
      </p>
      <h1>Terms &amp; Conditions</h1>
      <p className="iwfw-legal__lead">
        These draft terms describe the managed website subscription offered by
        iwantfreewebsite.com for UK businesses.
      </p>

      <section>
        <h2>1. The service</h2>
        <p>
          We provide a managed business website package for{" "}
          <strong>£39.99 per month</strong> (inclusive of VAT where applicable),
          with a <strong>£0 upfront website design fee</strong>. The package
          typically includes a professionally built website, hosting,
          assistance with domain registration/renewal (manual), one business
          email mailbox, weekly Google Business Profile posting support, help
          with Google review replies, and UK-based support, as described at
          checkout.
        </p>
      </section>

      <section>
        <h2>2. Contract length and cancellation</h2>
        <ul>
          <li>There is <strong>no minimum commitment</strong>.</li>
          <li>
            You may <strong>cancel anytime</strong> from your customer
            dashboard. There is <strong>no cancellation penalty</strong>.
          </li>
          <li>
            After you cancel, the subscription remains active until the{" "}
            <strong>end of the current paid billing period</strong>.
          </li>
          <li>
            We instruct Stripe (or our payment provider) so that{" "}
            <strong>further renewals do not occur</strong> after that date.
          </li>
          <li>
            Unless required by law, we do not automatically refund the remainder
            of a paid period for voluntary cancellation.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Ownership and manual transfer after cancellation</h2>
        <p>
          Subject to these Terms and any third-party registrar or hosting rules,
          you retain ownership of your website and domain assets associated with
          the subscription.
        </p>
        <ul>
          <li>
            Transfers are <strong>manual</strong>. We do not operate an
            automated asset-transfer system.
          </li>
          <li>
            When cancellation is scheduled, we create an{" "}
            <strong>internal asset transfer task</strong>, notify our admin
            team, and show transfer status in your dashboard:{" "}
            <strong>Pending</strong>, <strong>In progress</strong>, or{" "}
            <strong>Completed</strong>.
          </li>
          <li>
            When transfer is completed, we record the completion date and notify
            you.
          </li>
          <li>
            We do <strong>not</strong> automatically delete websites, domains,
            email mailboxes or customer files when a subscription ends. Assets
            are preserved until the manual transfer is completed (or you instruct
            otherwise in writing).
          </li>
          <li>
            We do <strong>not</strong> promise an exact transfer timeframe until
            an operational SLA is published. Timescales depend on registrar
            processes, DNS, and cooperation from you where needed.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Domains and email</h2>
        <p>
          Domain selection does not reserve or guarantee availability. Domains
          are purchased and renewed manually after payment, subject to
          availability and registrar rules. Email provisioning depends on domain
          DNS being correctly configured.
        </p>
      </section>

      <section>
        <h2>5. Acceptable use and content</h2>
        <p>
          You must provide accurate business information and only supply content
          you have rights to use. You must not use the service for unlawful,
          abusive or infringing content. We may suspend service for serious
          breaches.
        </p>
      </section>

      <section>
        <h2>6. Fees and taxes</h2>
        <p>
          Prices are shown in GBP. The advertised £39.99/month is inclusive of
          VAT where applicable. Tax treatment for live billing will be confirmed
          before production payments are enabled.
        </p>
      </section>

      <section>
        <h2>7. Liability</h2>
        <p>
          We provide the service with reasonable care and skill. Nothing in
          these Terms excludes liability that cannot be excluded under UK law.
          Draft wording on liability caps will be finalised with your legal
          review before publication.
        </p>
      </section>

      <section>
        <h2>8. Privacy</h2>
        <p>
          How we handle personal data is described in our{" "}
          <Link to="/privacy">Privacy Policy</Link> (also draft for review).
        </p>
      </section>

      <section>
        <h2>9. Contact</h2>
        <p>
          Support:{" "}
          <a href="mailto:support@iwantfreewebsite.com">
            support@iwantfreewebsite.com
          </a>{" "}
          · 0800 852 7267
        </p>
      </section>

      <p className="iwfw-legal__fine">
        <Link to="/get-started">← Back to get started</Link>
      </p>
    </main>
  );
}
