import { Link } from "react-router";
import { Badge, Panel } from "@iwfw/ui";
import { createDb } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import { requireAuth } from "../lib/session.server";
import { getCustomerWorkspace } from "../lib/customer-org.server";
import { orgStatusLabel, orgStatusTone } from "../lib/customer-dashboard";
import type { Route } from "./+types/dashboard.billing";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Billing — iwantfreewebsite" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireAuth(request, context);
  const db = createDb(getEnv(context).DB);
  return getCustomerWorkspace(db, auth);
}

export default function BillingPage({ loaderData }: Route.ComponentProps) {
  const status = loaderData.primary?.status ?? "prospect";

  return (
    <div className="iwfw-dash-page">
      <header className="iwfw-dash-page__header">
        <div>
          <h1>Billing</h1>
          <p>£39.99/month. No upfront website fee. No minimum contract. Cancel anytime.</p>
        </div>
        <Badge tone={orgStatusTone(status)}>{orgStatusLabel(status)}</Badge>
      </header>

      <div className="iwfw-dash-split">
        <Panel>
          <h2>Current plan</h2>
          <p className="iwfw-dash-price">
            £39.99 <span>/month</span>
          </p>
          <ul className="iwfw-dash-list">
            <li>Managed business website</li>
            <li>Hosting &amp; maintenance</li>
            <li>Domain help (manual purchase/renewal)</li>
            <li>One business email mailbox</li>
            <li>Weekly Google Business Profile post</li>
            <li>Review reply help</li>
          </ul>
          {status === "prospect" ? (
            <Link to="/get-started" className="iwfw-btn iwfw-btn--green iwfw-btn--block">
              Subscribe
            </Link>
          ) : (
            <p className="iwfw-dash-copy">
              Stripe customer portal and invoices will appear here once billing
              is connected for your account.
            </p>
          )}
        </Panel>

        <Panel>
          <h2>Cancel anytime</h2>
          <p className="iwfw-dash-copy">
            No minimum term and no cancellation penalty. If you cancel, your
            subscription stays active until the end of the current paid billing
            period, and billing will not renew after that date.
          </p>
          <p className="iwfw-dash-copy">
            You retain ownership of your website and domain assets (subject to
            the Terms). Our team manually transfers them after cancellation —
            transfers are not automated. We create an internal transfer task,
            show status here (Pending → In progress → Completed), and notify you
            when complete. We do not auto-delete websites, domains, email or
            files when the subscription ends.
          </p>
          <p className="iwfw-dash-fine">
            Transfer status will appear here once Stripe billing is connected.
            We do not promise an exact transfer timeframe until an operational
            SLA is published.
          </p>
          <button type="button" className="iwfw-btn iwfw-btn--outline" disabled>
            Cancel subscription (coming soon)
          </button>
          <p className="iwfw-dash-fine">
            Optional Google Rank Tracking (£9.99/month) remains disabled until
            that feature is operational.
          </p>
        </Panel>
      </div>
    </div>
  );
}
