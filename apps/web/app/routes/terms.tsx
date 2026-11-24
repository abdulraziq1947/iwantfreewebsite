import { Link } from "react-router";
import { TERMS_VERSION } from "../lib/get-started";
import type { Route } from "./+types/terms";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Terms & Conditions — iwantfreewebsite.com" },
    {
      name: "description",
      content:
        "Terms for the iwantfreewebsite.com managed website subscription.",
    },
  ];
}

export default function TermsPage() {
  return (
    <main className="iwfw-legal">
      <h1>Terms &amp; Conditions</h1>
      <p className="iwfw-legal__lead">
        These terms describe the managed website subscription offered by
        iwantfreewebsite.com for UK businesses. Version {TERMS_VERSION}.
      </p>

      <section>
        <h2>1. The service</h2>
        <p>
          We provide a managed business website package for{" "}
          <strong>£39.99 per month</strong> (inclusive of VAT where applicable),
          billed in advance. The package typically includes a professionally
          built website, hosting, help with domain registration and renewal, one
          business email mailbox, Google Business Profile help (Manager access
          and posting guidance), help with Google review replies, and UK-based
          support, as described at checkout — so you are not left managing
          design, hosting and renewals as separate pieces.
        </p>
      </section>

      <section>
        <h2>2. Contract length and cancellation</h2>
        <ul>
          <li>
            There is <strong>no minimum commitment</strong>.
          </li>
          <li>
            You may <strong>cancel anytime</strong> from your customer
            dashboard. There is <strong>no cancellation penalty</strong>.
          </li>
          <li>
            After you cancel, the subscription remains active until the{" "}
            <strong>end of the current paid billing period</strong>.
          </li>
          <li>
            Further renewals will not occur after that date.
          </li>
          <li>
            Unless required by law, we do not automatically refund the remainder
            of a paid period for voluntary cancellation.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Ownership and transfer after cancellation</h2>
        <p>
          Subject to these Terms and any third-party registrar or hosting rules,
          you retain ownership of your website content and domain associated
          with the subscription.
        </p>
        <ul>
          <li>
            If you cancel, we will help transfer your website and domain to you.
            Transfers are handled by our team (not automated).
          </li>
          <li>
            Your dashboard shows transfer progress as{" "}
            <strong>Pending</strong>, <strong>In progress</strong>, or{" "}
            <strong>Completed</strong>. We notify you when it is done.
          </li>
          <li>
            We do <strong>not</strong> automatically delete websites, domains,
            email mailboxes or your files when a subscription ends. Assets are
            preserved until transfer is completed (or you instruct otherwise in
            writing).
          </li>
          <li>
            Transfer timescales depend on registrar processes, DNS, and your
            cooperation where needed. We will keep you updated.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Domains and email</h2>
        <p>
          Domain selection does not reserve or guarantee availability. Domains
          are registered and renewed after payment, subject to availability and
          registrar rules. Email depends on domain DNS being correctly
          configured.
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
          VAT where applicable.
        </p>
      </section>

      <section>
        <h2>7. Liability</h2>
        <p>
          We provide the service with reasonable care and skill. Nothing in
          these Terms excludes liability that cannot be excluded under UK law.
        </p>
      </section>

      <section>
        <h2>8. Privacy and cookies</h2>
        <p>
          How we handle personal data is described in our{" "}
          <Link to="/privacy">Privacy Policy</Link>. How we use cookies and
          similar technologies is described in our{" "}
          <Link to="/cookies">Cookie Policy</Link>.
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
