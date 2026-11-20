import { Link } from "react-router";
import { Panel } from "@iwfw/ui";
import { createDb } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import { requireAuth } from "../lib/session.server";
import { getCustomerWorkspace } from "../lib/customer-org.server";
import type { Route } from "./+types/dashboard.email";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Email — iwantfreewebsite" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireAuth(request, context);
  const db = createDb(getEnv(context).DB);
  return getCustomerWorkspace(db, auth);
}

export default function EmailPage({ loaderData }: Route.ComponentProps) {
  const email = loaderData.onboarding?.data.email;

  return (
    <div className="iwfw-dash-page">
      <header className="iwfw-dash-page__header">
        <div>
          <h1>Business email</h1>
          <p>One custom mailbox is included with your subscription.</p>
        </div>
        <Link to="/dashboard/onboarding?step=5" className="iwfw-btn iwfw-btn--outline">
          Edit preference
        </Link>
      </header>

      <Panel>
        <dl className="iwfw-dash-dl">
          <div>
            <dt>Preferred mailbox</dt>
            <dd>{email?.localPart ? `${email.localPart}@your-domain` : "info@your-domain"}</dd>
          </div>
          <div>
            <dt>Existing provider</dt>
            <dd>{email?.existingProvider || "None noted"}</dd>
          </div>
          <div>
            <dt>Migration needed</dt>
            <dd>{email?.migrationRequired ? "Yes" : "No"}</dd>
          </div>
          <div>
            <dt>Mailbox status</dt>
            <dd>Provisioned after domain is connected</dd>
          </div>
        </dl>
      </Panel>
    </div>
  );
}
