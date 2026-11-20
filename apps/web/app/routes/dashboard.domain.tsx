import { Link } from "react-router";
import { Panel } from "@iwfw/ui";
import { createDb } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import { requireAuth } from "../lib/session.server";
import { getCustomerWorkspace } from "../lib/customer-org.server";
import type { Route } from "./+types/dashboard.domain";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Domain — iwantfreewebsite" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireAuth(request, context);
  const db = createDb(getEnv(context).DB);
  return getCustomerWorkspace(db, auth);
}

export default function DomainPage({ loaderData }: Route.ComponentProps) {
  const domain = loaderData.onboarding?.data.domain;

  return (
    <div className="iwfw-dash-page">
      <header className="iwfw-dash-page__header">
        <div>
          <h1>Domain</h1>
          <p>
            Choose a domain in onboarding. We purchase and renew it manually —
            nothing is bought automatically.
          </p>
        </div>
        <Link to="/dashboard/onboarding?step=4" className="iwfw-btn iwfw-btn--outline">
          Edit in onboarding
        </Link>
      </header>

      <Panel>
        <dl className="iwfw-dash-dl">
          <div>
            <dt>Preference</dt>
            <dd>
              {domain?.mode === "existing"
                ? "Use existing domain"
                : domain?.mode === "new"
                  ? "Register a new domain"
                  : "Not set yet"}
            </dd>
          </div>
          <div>
            <dt>Requested name</dt>
            <dd>
              {domain?.mode === "existing"
                ? domain.existingDomain || "—"
                : domain?.preferredDomain || "—"}
            </dd>
          </div>
          <div>
            <dt>No-guarantee acknowledged</dt>
            <dd>{domain?.acknowledgedNoGuarantee ? "Yes" : "Not yet"}</dd>
          </div>
          <div>
            <dt>Purchase status</dt>
            <dd>Awaiting team action after payment &amp; request</dd>
          </div>
        </dl>
      </Panel>
    </div>
  );
}
