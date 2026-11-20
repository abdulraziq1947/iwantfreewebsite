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
            <Link to="/pricing" className="iwfw-btn iwfw-btn--green iwfw-btn--block">
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
            There is no minimum contract. If you cancel, service continues until
            the end of the period you have already paid for. Domain transfer,
            email migration, and hosting options are explained before you
            confirm.
          </p>
          <button type="button" className="iwfw-btn iwfw-btn--outline" disabled>
            Cancel subscription (coming soon)
          </button>
          <p className="iwfw-dash-fine">
            Optional Google Rank Tracking (£9.99/month) is not sold until that
            feature is operational.
          </p>
        </Panel>
      </div>
    </div>
  );
}
