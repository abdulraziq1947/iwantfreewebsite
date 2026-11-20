import { Link } from "react-router";
import { Badge, Panel } from "@iwfw/ui";
import { createDb } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import { requireAuth } from "../lib/session.server";
import { getCustomerWorkspace } from "../lib/customer-org.server";
import { orgStatusLabel, orgStatusTone } from "../lib/customer-dashboard";
import { onboardingProgress } from "../lib/onboarding";
import type { Route } from "./+types/dashboard";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Dashboard — iwantfreewebsite" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireAuth(request, context);
  const db = createDb(getEnv(context).DB);
  const workspace = await getCustomerWorkspace(db, auth);
  return {
    userName: auth.name,
    workspace,
  };
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { workspace } = loaderData;
  const onboarding = workspace.onboarding;
  const progress = onboarding
    ? onboardingProgress(onboarding.currentStep, onboarding.completed)
    : 0;
  const firstName = loaderData.userName?.split(" ")[0] ?? "";

  return (
    <div className="iwfw-dash-page">
      <header className="iwfw-dash-page__header">
        <div>
          <h1>Welcome back{firstName ? `, ${firstName}` : ""}</h1>
          <p>
            Your website, onboarding, billing, domain, email, and Google
            Business tools in one place.
          </p>
        </div>
        {onboarding?.completed ? (
          <Link to="/dashboard/website" className="iwfw-btn iwfw-btn--blue">
            View website
          </Link>
        ) : (
          <Link to="/dashboard/onboarding" className="iwfw-btn iwfw-btn--green">
            Continue onboarding
          </Link>
        )}
      </header>

      {workspace.needsSubscription && (
        <Panel className="iwfw-dash-callout">
          <h2>Finish setup</h2>
          <p>
            Your account is ready. Subscribe for £39.99/month with no upfront
            website fee. You can complete onboarding now so we’re ready to build.
          </p>
          <div className="iwfw-dash-callout__actions">
            <Link to="/pricing" className="iwfw-btn iwfw-btn--green">
              See £39.99 plan
            </Link>
            <Link to="/dashboard/onboarding" className="iwfw-btn iwfw-btn--outline">
              Start onboarding
            </Link>
          </div>
        </Panel>
      )}

      <section className="iwfw-dash-grid" aria-label="Quick links">
        <DashCard
          title="Onboarding"
          body="Business details, services, domain, email, and Google Business invite."
          to="/dashboard/onboarding"
          status={onboarding?.completed ? "Submitted" : `${progress}% complete`}
        />
        <DashCard
          title="Website"
          body="Track build progress, preview, and go-live status."
          to="/dashboard/website"
          status={
            onboarding?.completed ? "Ready for production" : "Waiting on onboarding"
          }
        />
        <DashCard
          title="Billing"
          body="£39.99/month plan, invoices, and cancel anytime."
          to="/dashboard/billing"
          status={
            workspace.primary
              ? orgStatusLabel(workspace.primary.status)
              : "No plan yet"
          }
        />
        <DashCard
          title="Domain"
          body="Preferred domain and manual purchase status."
          to="/dashboard/domain"
          status="Managed with your plan"
        />
        <DashCard
          title="Email"
          body="Business mailbox preference and provisioning status."
          to="/dashboard/email"
          status="Included in plan"
        />
        <DashCard
          title="Google Business"
          body="Manager invite, weekly posts, and review replies."
          to="/dashboard/google-business"
          status={
            onboarding?.data.gbp.outcome === "invitation_sent"
              ? "Invitation sent"
              : "Action may be needed"
          }
        />
        <DashCard
          title="Support"
          body="Call or email the team whenever you need help."
          to="/dashboard/support"
          status="We’re here"
        />
        <DashCard
          title="Account"
          body="Your login details and logout."
          to="/dashboard/account"
          status={loaderData.userName}
        />
      </section>

      <Panel>
        <div className="iwfw-dash-panel-head">
          <h2>Your business</h2>
          <Badge tone="neutral">{workspace.orgs.length}</Badge>
        </div>
        <ul className="iwfw-dash-orgs">
          {workspace.orgs.map((org) => (
            <li key={org.id}>
              <div>
                <p className="iwfw-dash-orgs__name">{org.tradingName}</p>
                <p className="iwfw-dash-orgs__meta">Account status</p>
              </div>
              <Badge tone={orgStatusTone(org.status)}>
                {orgStatusLabel(org.status)}
              </Badge>
            </li>
          ))}
          {workspace.orgs.length === 0 && (
            <li className="iwfw-dash-orgs__empty">
              No business profile yet. Contact support if this looks wrong.
            </li>
          )}
        </ul>
      </Panel>
    </div>
  );
}

function DashCard({
  title,
  body,
  to,
  status,
}: {
  title: string;
  body: string;
  to: string;
  status: string;
}) {
  return (
    <Link to={to} className="iwfw-dash-card">
      <span className="iwfw-dash-card__status">{status}</span>
      <strong>{title}</strong>
      <p>{body}</p>
      <span className="iwfw-dash-card__go">Open →</span>
    </Link>
  );
}
