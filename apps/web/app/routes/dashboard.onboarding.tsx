import { Link } from "react-router";
import { Badge, Panel } from "@iwfw/ui";
import { createDb } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import { requireAuth } from "../lib/session.server";
import { getCustomerWorkspace } from "../lib/customer-org.server";
import {
  buildCustomerActions,
  buildJourneyStages,
  currentFocusCopy,
  domainTaskLabel,
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
  const focus = currentFocusCopy(stages);
  const actions = buildCustomerActions({
    needsSubscription: workspace.needsSubscription,
    briefReady: workspace.briefReady,
    domainTask: workspace.domainTask,
    data,
  });
  const stageLabel = websiteStageLabel({
    needsSubscription: workspace.needsSubscription,
    domainStatus: workspace.domainTask?.status,
    briefReady: workspace.briefReady,
  });

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
          <h1>What’s next for your website</h1>
          <p>
            You already sent your brief when you ordered. This page shows what
            we’re doing, what happens next, and optional extras you can still
            add.
          </p>
        </div>
        <Badge tone={workspace.needsSubscription ? "warning" : "success"}>
          {stageLabel}
        </Badge>
      </header>

      <Panel className="iwfw-dash-focus">
        <p className="iwfw-dash-focus__kicker">Current focus</p>
        <h2>{focus.title}</h2>
        <p>{focus.body}</p>
      </Panel>

      <div className="iwfw-dash-split">
        <Panel>
          <h2>Journey</h2>
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
              <dd>{data?.business.tradingName || workspace.primary?.tradingName || "—"}</dd>
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
            <div>
              <dt>About</dt>
              <dd className="iwfw-dash-pre">
                {data?.business.description?.trim() || "—"}
              </dd>
            </div>
          </dl>
          <p className="iwfw-dash-fine">
            Need a change? Message support — we won’t ask you to fill the same
            questionnaire again.
          </p>
          <Link to="/dashboard/support" className="iwfw-btn iwfw-btn--outline">
            Contact support
          </Link>
        </Panel>
      </div>

      <section aria-label="Optional actions">
        <div className="iwfw-dash-panel-head">
          <h2>Optional actions</h2>
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

      <Panel>
        <h2>What happens next</h2>
        <ul className="iwfw-dash-list">
          <li>Our team registers or connects your domain manually.</li>
          <li>We build your site from the brief, uploads and brand notes.</li>
          <li>You’ll get a preview to review before go-live.</li>
          <li>Business email and Google Business help follow once the domain is ready.</li>
        </ul>
        <div className="iwfw-dash-inline-actions">
          <Link to="/dashboard/website" className="iwfw-btn iwfw-btn--blue">
            Website status
          </Link>
          <Link to="/get-started?new=1" className="iwfw-btn iwfw-btn--outline">
            Add another site
          </Link>
        </div>
      </Panel>
    </div>
  );
}
