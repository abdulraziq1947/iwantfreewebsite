import { Link } from "react-router";
import { Badge, Panel } from "@iwfw/ui";
import { createDb } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import { requireAuth } from "../lib/session.server";
import { getCustomerWorkspace } from "../lib/customer-org.server";
import { onboardingProgress } from "../lib/onboarding";
import type { Route } from "./+types/dashboard.website";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Website — iwantfreewebsite" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireAuth(request, context);
  const db = createDb(getEnv(context).DB);
  const workspace = await getCustomerWorkspace(db, auth);
  const url = new URL(request.url);
  return {
    workspace,
    justSubmitted: url.searchParams.get("onboarding") === "done",
  };
}

export default function WebsitePage({ loaderData }: Route.ComponentProps) {
  const { workspace, justSubmitted } = loaderData;
  const onboarding = workspace.onboarding;
  const progress = onboarding
    ? onboardingProgress(onboarding.currentStep, onboarding.completed)
    : 0;

  const stage = !workspace.primary
    ? "No business yet"
    : workspace.needsSubscription
      ? "Awaiting subscription"
      : onboarding?.completed
        ? "Ready for production"
        : "Onboarding in progress";

  return (
    <div className="iwfw-dash-page">
      <header className="iwfw-dash-page__header">
        <div>
          <h1>Your website</h1>
          <p>
            Track setup, finish onboarding, and see when your site is ready to
            go live.
          </p>
        </div>
        <Badge tone={onboarding?.completed ? "success" : "warning"}>{stage}</Badge>
      </header>

      {justSubmitted && (
        <Panel className="iwfw-dash-callout">
          <h2>Onboarding submitted</h2>
          <p>
            Thanks — our team has what they need to start building. We’ll update
            this page as your preview becomes ready.
          </p>
        </Panel>
      )}

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
              <dt>Onboarding</dt>
              <dd>{onboarding?.completed ? "Submitted" : `${progress}% complete`}</dd>
            </div>
            <div>
              <dt>Live URL</dt>
              <dd>Assigned after launch</dd>
            </div>
          </dl>
        </Panel>

        <Panel>
          <h2>Next step</h2>
          {workspace.needsSubscription ? (
            <>
              <p className="iwfw-dash-copy">
                Subscribe for £39.99/month to unlock production. You can still
                start onboarding now so we’re ready.
              </p>
              <div className="iwfw-dash-inline-actions">
                <Link to="/pricing" className="iwfw-btn iwfw-btn--green">
                  View pricing
                </Link>
                <Link to="/dashboard/onboarding" className="iwfw-btn iwfw-btn--outline">
                  Start onboarding
                </Link>
              </div>
            </>
          ) : onboarding?.completed ? (
            <>
              <p className="iwfw-dash-copy">
                Your brief is with the team. Preview and approval steps will
                appear here when ready.
              </p>
              <Link to="/dashboard/onboarding" className="iwfw-btn iwfw-btn--outline">
                Review onboarding answers
              </Link>
            </>
          ) : (
            <>
              <p className="iwfw-dash-copy">
                Complete the onboarding wizard so we can build your website,
                domain, email, and Google Business Profile setup.
              </p>
              <Link to="/dashboard/onboarding" className="iwfw-btn iwfw-btn--green">
                Continue onboarding
              </Link>
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}
