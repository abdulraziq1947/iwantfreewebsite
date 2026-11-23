import { Link } from "react-router";
import { Badge, Panel } from "@iwfw/ui";
import { createDb } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import { requireAuth } from "../lib/session.server";
import { getCustomerWorkspace } from "../lib/customer-org.server";
import {
  buildJourneyStages,
  buildStatusBanner,
  domainTaskLabel,
  needsGbpInvite,
  websiteStageLabel,
} from "../lib/customer-progress";
import type { Route } from "./+types/dashboard.onboarding";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Progress — iwantfreewebsite" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireAuth(request, context);
  const db = createDb(getEnv(context).DB);
  const workspace = await getCustomerWorkspace(db, auth);
  return { workspace, userName: auth.name };
}

export default function ProgressPage({ loaderData }: Route.ComponentProps) {
  const { workspace } = loaderData;
  const data = workspace.onboarding?.data;
  const stages = buildJourneyStages({
    needsSubscription: workspace.needsSubscription,
    briefReady: workspace.briefReady,
    domainTask: workspace.domainTask,
  });
  const banner = buildStatusBanner({
    needsSubscription: workspace.needsSubscription,
    briefReady: workspace.briefReady,
    domainTask: workspace.domainTask,
    tradingName: workspace.primary?.tradingName,
  });
  const stageLabel = websiteStageLabel({
    needsSubscription: workspace.needsSubscription,
    domainStatus: workspace.domainTask?.status,
    briefReady: workspace.briefReady,
  });
  const showGbp =
    !workspace.needsSubscription && needsGbpInvite(data);
  const domainName =
    workspace.domainTask?.domainName ||
    data?.domain.preferredDomain ||
    data?.domain.existingDomain ||
    "—";

  return (
    <div className="iwfw-dash-page">
      <header className="iwfw-dash-page__header">
        <div>
          <p className="iwfw-dash-kicker">Progress</p>
          <h1>What’s happening</h1>
          <p>
            A simple view of your order. You already sent the brief at checkout —
            there’s no second questionnaire here.
          </p>
        </div>
        <Badge tone={workspace.needsSubscription ? "warning" : "success"}>
          {stageLabel}
        </Badge>
      </header>

      <Panel
        className={
          !workspace.needsSubscription && workspace.briefReady
            ? "iwfw-dash-focus iwfw-dash-focus--ready"
            : "iwfw-dash-focus"
        }
      >
        <p className="iwfw-dash-focus__kicker">{banner.kicker}</p>
        <h2>{banner.title}</h2>
        <p>{banner.body}</p>
        {showGbp && (
          <div className="iwfw-dash-callout__actions">
            <Link
              to="/dashboard/google-business"
              className="iwfw-btn iwfw-btn--green"
            >
              Give Manager access
            </Link>
            <Link to="/dashboard" className="iwfw-btn iwfw-btn--outline">
              Back to overview
            </Link>
          </div>
        )}
      </Panel>

      {showGbp && (
        <Panel className="iwfw-dash-optional">
          <div className="iwfw-dash-optional__copy">
            <p className="iwfw-dash-focus__kicker">Optional · meantime</p>
            <h2>Google Business Profile</h2>
            <p>
              While we build, you can invite us as Manager if you’d like weekly
              posts and help with review replies. Skip this if you don’t need it
              yet.
            </p>
          </div>
          <Link
            to="/dashboard/google-business"
            className="iwfw-btn iwfw-btn--green"
          >
            Give Manager access
          </Link>
        </Panel>
      )}

      <div className="iwfw-dash-split">
        <Panel>
          <h2>What happens next</h2>
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
        </Panel>

        <Panel>
          <h2>Your brief (from checkout)</h2>
          <dl className="iwfw-dash-dl">
            <div>
              <dt>Business</dt>
              <dd>
                {data?.business.tradingName ||
                  workspace.primary?.tradingName ||
                  "—"}
              </dd>
            </div>
            <div>
              <dt>Contact</dt>
              <dd>
                {[data?.business.contactName, data?.business.email]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </dd>
            </div>
            <div>
              <dt>Services</dt>
              <dd className="iwfw-dash-pre">
                {data?.services.list?.trim() || "—"}
              </dd>
            </div>
            <div>
              <dt>Domain</dt>
              <dd>
                {domainName}
                {workspace.domainTask
                  ? ` · ${domainTaskLabel(workspace.domainTask.status)}`
                  : ""}
              </dd>
            </div>
          </dl>
          <p className="iwfw-dash-fine">
            Need a change? Message support — we won’t ask you to fill the same
            form again.
          </p>
          <Link to="/dashboard/support" className="iwfw-btn iwfw-btn--outline">
            Contact support
          </Link>
        </Panel>
      </div>
    </div>
  );
}
