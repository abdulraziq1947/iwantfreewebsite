import { Link } from "react-router";
import { Badge, Panel } from "@iwfw/ui";
import { createDb } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import { requireAuth } from "../lib/session.server";
import { getCustomerWorkspace } from "../lib/customer-org.server";
import {
  buildJourneyStages,
  currentFocusCopy,
  domainTaskLabel,
  websiteStageLabel,
} from "../lib/customer-progress";
import type { Route } from "./+types/dashboard.website";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Website — iwantfreewebsite" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireAuth(request, context);
  const db = createDb(getEnv(context).DB);
  const workspace = await getCustomerWorkspace(db, auth);
  return { workspace };
}

export default function WebsitePage({ loaderData }: Route.ComponentProps) {
  const { workspace } = loaderData;
  const stages = buildJourneyStages({
    needsSubscription: workspace.needsSubscription,
    briefReady: workspace.briefReady,
    domainTask: workspace.domainTask,
  });
  const focus = currentFocusCopy(stages);
  const stage = websiteStageLabel({
    needsSubscription: workspace.needsSubscription,
    domainStatus: workspace.domainTask?.status,
    briefReady: workspace.briefReady,
  });

  return (
    <div className="iwfw-dash-page">
      <header className="iwfw-dash-page__header">
        <div>
          <h1>Your website</h1>
          <p>
            Track build progress after payment. Your questionnaire from checkout
            is already with the team.
          </p>
        </div>
        <Badge tone={workspace.needsSubscription ? "warning" : "success"}>
          {stage}
        </Badge>
      </header>

      <Panel className="iwfw-dash-focus">
        <p className="iwfw-dash-focus__kicker">Now</p>
        <h2>{focus.title}</h2>
        <p>{focus.body}</p>
      </Panel>

      <div className="iwfw-dash-split">
        <Panel>
          <h2>Status</h2>
          <dl className="iwfw-dash-dl">
            <div>
              <dt>Business</dt>
              <dd>{workspace.primary?.tradingName ?? "—"}</dd>
            </div>
            <div>
              <dt>Build stage</dt>
              <dd>{stage}</dd>
            </div>
            <div>
              <dt>Brief</dt>
              <dd>
                {workspace.briefReady
                  ? "Received at checkout"
                  : "Waiting for order details"}
              </dd>
            </div>
            <div>
              <dt>Domain</dt>
              <dd>
                {workspace.domainTask
                  ? `${workspace.domainTask.domainName} · ${domainTaskLabel(workspace.domainTask.status)}`
                  : "Assigned after payment"}
              </dd>
            </div>
            <div>
              <dt>Live URL</dt>
              <dd>
                {workspace.domainTask?.status === "connected"
                  ? "Connected — ask support if you need the link"
                  : "Shared at go-live"}
              </dd>
            </div>
          </dl>
        </Panel>

        <Panel>
          <h2>What we’ll do</h2>
          <ul className="iwfw-dash-list">
            <li>Build from your checkout brief and uploaded images</li>
            <li>Register or connect the domain manually</li>
            <li>Send a preview for your approval before launch</li>
            <li>Set up business email once DNS is ready</li>
          </ul>
          <div className="iwfw-dash-inline-actions">
            {workspace.needsSubscription ? (
              <Link to="/get-started" className="iwfw-btn iwfw-btn--green">
                View package
              </Link>
            ) : (
              <Link to="/dashboard/onboarding" className="iwfw-btn iwfw-btn--blue">
                See full progress
              </Link>
            )}
            <Link to="/dashboard/media" className="iwfw-btn iwfw-btn--outline">
              Update images
            </Link>
          </div>
        </Panel>
      </div>

      <ol className="iwfw-dash-timeline">
        {stages.map((item) => (
          <li
            key={item.id}
            className={`iwfw-dash-timeline__item is-${item.state}`}
          >
            <span className="iwfw-dash-timeline__marker" aria-hidden />
            <div>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
