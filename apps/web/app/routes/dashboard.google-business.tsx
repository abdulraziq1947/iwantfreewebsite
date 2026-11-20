import { Link } from "react-router";
import { Badge, Panel } from "@iwfw/ui";
import { createDb } from "@iwfw/db";
import { getConfig, getEnv } from "../lib/env.server";
import { requireAuth } from "../lib/session.server";
import { getCustomerWorkspace } from "../lib/customer-org.server";
import type { Route } from "./+types/dashboard.google-business";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Google Business — iwantfreewebsite" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireAuth(request, context);
  const env = getEnv(context);
  const config = getConfig(context);
  const db = createDb(env.DB);
  const workspace = await getCustomerWorkspace(db, auth);
  return {
    workspace,
    gbpManagerEmail: config.GBP_MANAGER_EMAIL ?? "manager@iwantfreewebsite.com",
  };
}

export default function GoogleBusinessPage({ loaderData }: Route.ComponentProps) {
  const gbp = loaderData.workspace.onboarding?.data.gbp;
  const label =
    gbp?.outcome === "invitation_sent"
      ? "Invitation sent"
      : gbp?.outcome === "help_requested"
        ? "Help requested"
        : gbp?.outcome === "no_profile"
          ? "No profile yet"
          : "Action required";

  return (
    <div className="iwfw-dash-page">
      <header className="iwfw-dash-page__header">
        <div>
          <h1>Google Business Profile</h1>
          <p>
            Weekly posts and review replies are included. Invite us as Manager —
            not Owner.
          </p>
        </div>
        <Badge tone={gbp?.outcome === "invitation_sent" ? "warning" : "neutral"}>
          {label}
        </Badge>
      </header>

      <div className="iwfw-dash-split">
        <Panel>
          <h2>Manager invite email</h2>
          <code className="iwfw-dash-code">{loaderData.gbpManagerEmail}</code>
          <p className="iwfw-dash-copy">
            Access is only marked Connected after our team accepts the invitation
            in Google and confirms Manager access.
          </p>
          <Link to="/dashboard/onboarding?step=6" className="iwfw-btn iwfw-btn--blue">
            Update onboarding step
          </Link>
        </Panel>
        <Panel>
          <h2>What’s included</h2>
          <ul className="iwfw-dash-list">
            <li>One Google Business Profile post each week</li>
            <li>Help replying to reviews</li>
            <li>Status tracking in your dashboard</li>
          </ul>
          <dl className="iwfw-dash-dl">
            <div>
              <dt>Profile URL</dt>
              <dd>{gbp?.profileUrl || "Not provided yet"}</dd>
            </div>
            <div>
              <dt>Publish preference</dt>
              <dd>
                {gbp?.publishDirectly
                  ? "Team may publish directly"
                  : "Ask before publishing"}
              </dd>
            </div>
          </dl>
        </Panel>
      </div>
    </div>
  );
}
