import { Link } from "react-router";
import { Badge, Panel } from "@iwfw/ui";
import { createDb } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import { requireAuth } from "../lib/session.server";
import { getCustomerWorkspace } from "../lib/customer-org.server";
import { orgStatusLabel, orgStatusTone } from "../lib/customer-dashboard";
import {
  buildCustomerActions,
  buildJourneyStages,
  currentFocusCopy,
  websiteStageLabel,
} from "../lib/customer-progress";
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
  const firstName = loaderData.userName?.split(" ")[0] ?? "";
  const stages = buildJourneyStages({
    needsSubscription: workspace.needsSubscription,
    briefReady: workspace.briefReady,
    domainTask: workspace.domainTask,
  });
  const focus = currentFocusCopy(stages);
  const actions = buildCustomerActions({
    needsSubscription: workspace.needsSubscription,
    briefReady: workspace.briefReady,
    domainTask: workspace.domainTask,
    data: workspace.onboarding?.data,
  });
  const stageLabel = websiteStageLabel({
    needsSubscription: workspace.needsSubscription,
    domainStatus: workspace.domainTask?.status,
    briefReady: workspace.briefReady,
  });

  return (
    <div className="iwfw-dash-page">
      <header className="iwfw-dash-page__header">
        <div>
          <h1>Welcome back{firstName ? `, ${firstName}` : ""}</h1>
          <p>
            Here’s where your website is, what happens next, and anything we
            still need from you — not the same questions you already answered.
          </p>
        </div>
        <div className="iwfw-dash-inline-actions">
          <Link to="/dashboard/onboarding" className="iwfw-btn iwfw-btn--blue">
            See progress
          </Link>
          <Link to="/get-started?new=1" className="iwfw-btn iwfw-btn--outline">
            Add another site
          </Link>
        </div>
      </header>

      {workspace.needsSubscription ? (
        <Panel className="iwfw-dash-callout">
          <h2>Finish setup</h2>
          <p>
            Your account is ready. Choose the £39.99/month plan to start domain
            registration and website build.
          </p>
          <div className="iwfw-dash-callout__actions">
            <Link to="/get-started" className="iwfw-btn iwfw-btn--green">
              See £39.99 plan
            </Link>
          </div>
        </Panel>
      ) : (
        <Panel className="iwfw-dash-focus">
          <p className="iwfw-dash-focus__kicker">What’s happening now</p>
          <h2>{focus.title}</h2>
          <p>{focus.body}</p>
          <p className="iwfw-dash-focus__meta">
            {workspace.primary?.tradingName ?? "Your business"} · {stageLabel}
          </p>
        </Panel>
      )}

      <section className="iwfw-dash-journey" aria-label="Website journey">
        <div className="iwfw-dash-panel-head">
          <h2>Your journey</h2>
          <Badge tone={workspace.needsSubscription ? "warning" : "success"}>
            {stageLabel}
          </Badge>
        </div>
        <ol className="iwfw-dash-timeline">
          {stages.map((stage) => (
            <li
              key={stage.id}
              className={`iwfw-dash-timeline__item is-${stage.state}`}
            >
              <span className="iwfw-dash-timeline__marker" aria-hidden />
              <div>
                <strong>{stage.title}</strong>
                <p>{stage.detail}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="iwfw-dash-fine">
          Domain purchase, hosting, email mailbox and go-live are handled by our
          team — never auto-purchased at checkout.
        </p>
      </section>

      <section aria-label="Helpful next steps">
        <div className="iwfw-dash-panel-head">
          <h2>Helpful next steps</h2>
        </div>
        <div className="iwfw-dash-actions">
          {actions.map((action) => (
            <article
              key={action.id}
              className={`iwfw-dash-action iwfw-dash-action--${action.tone}`}
            >
              <strong>{action.title}</strong>
              <p>{action.body}</p>
              <Link
                to={action.to}
                className={
                  action.tone === "primary"
                    ? "iwfw-btn iwfw-btn--green"
                    : "iwfw-btn iwfw-btn--outline"
                }
              >
                {action.cta}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="iwfw-dash-grid" aria-label="Quick links">
        <DashCard
          title="Website"
          body="Build stage, preview and go-live status."
          to="/dashboard/website"
          status={stageLabel}
        />
        <DashCard
          title="Domain"
          body="Manual registration and DNS connection status."
          to="/dashboard/domain"
          status={
            workspace.domainTask
              ? workspace.domainTask.status.replaceAll("_", " ")
              : "Queued after payment"
          }
        />
        <DashCard
          title="Images"
          body="Logos, business photos and project images."
          to="/dashboard/media"
          status="Private uploads"
        />
        <DashCard
          title="Billing"
          body="£39.99/month plan, invoices, cancel anytime."
          to="/dashboard/billing"
          status={
            workspace.primary
              ? orgStatusLabel(workspace.primary.status)
              : "No plan yet"
          }
        />
        <DashCard
          title="Support"
          body="Call or email whenever you need help."
          to="/dashboard/support"
          status="We’re here"
        />
        <DashCard
          title="Account"
          body="Login details and security."
          to="/dashboard/account"
          status={loaderData.userName}
        />
      </section>

      <Panel>
        <div className="iwfw-dash-panel-head">
          <h2>Your websites</h2>
          <Link to="/get-started?new=1" className="iwfw-btn iwfw-btn--outline">
            Add another site
          </Link>
        </div>
        <ul className="iwfw-dash-orgs">
          {workspace.orgs.map((org) => (
            <li key={org.id}>
              <div>
                <p className="iwfw-dash-orgs__name">{org.tradingName}</p>
                <p className="iwfw-dash-orgs__meta">
                  {org.id === workspace.primary?.id
                    ? "Current dashboard site"
                    : "Additional site"}
                </p>
              </div>
              <Badge tone={orgStatusTone(org.status)}>
                {orgStatusLabel(org.status)}
              </Badge>
            </li>
          ))}
          {workspace.orgs.length === 0 && (
            <li className="iwfw-dash-orgs__empty">
              No website yet. Start the package to create your first one.
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
