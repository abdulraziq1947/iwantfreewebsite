import { data, Link } from "react-router";
import { Badge } from "@iwfw/ui";
import { goLiveSlaLabel } from "@iwfw/config";
import { getConfig } from "../lib/env.server";
import { requireAuth } from "../lib/session.server";
import { loadCustomerWorkspace } from "../lib/customer-workspace.server";
import { withActiveOrg } from "../lib/active-org";
import { orgStatusLabel, orgStatusTone } from "../lib/customer-dashboard";
import {
  buildStatusBanner,
  liveWebsiteUrl,
  needsGbpInvite,
  previewWebsiteUrl,
  websiteStageLabel,
} from "../lib/customer-progress";
import {
  NewWebsiteButton,
  WebsiteSwitcher,
} from "../components/website-switcher";
import type { Route } from "./+types/dashboard.website";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Website — iwantfreewebsite" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireAuth(request, context);
  const config = getConfig(context);
  const { workspace, headers } = await loadCustomerWorkspace(
    request,
    context,
    auth,
  );
  return data(
    { workspace, goLiveSla: goLiveSlaLabel(config) },
    headers ? { headers } : undefined,
  );
}

export default function WebsitePage({ loaderData }: Route.ComponentProps) {
  const { workspace, goLiveSla } = loaderData;
  const activeId = workspace.primary?.id ?? null;
  const banner = buildStatusBanner({
    needsSubscription: workspace.needsSubscription,
    briefReady: workspace.briefReady,
    domainTask: workspace.domainTask,
    tradingName: workspace.primary?.tradingName,
    goLiveSlaLabel: goLiveSla,
  });
  const stage = websiteStageLabel({
    needsSubscription: workspace.needsSubscription,
    domainStatus: workspace.domainTask?.status,
    briefReady: workspace.briefReady,
  });
  const showGbp =
    !workspace.needsSubscription &&
    needsGbpInvite(workspace.onboarding?.data);
  const paidAndReady = !workspace.needsSubscription && workspace.briefReady;
  const isLive = workspace.domainTask?.status === "connected";
  const liveUrl = liveWebsiteUrl(workspace.domainTask);
  const previewUrl = previewWebsiteUrl(workspace.domainTask);

  return (
    <div className="iwfw-dash-page iwfw-dash-home">
      <header className="iwfw-dash-home__hero">
        <div className="iwfw-dash-home__hero-copy">
          <p className="iwfw-dash-home__eyebrow">Website</p>
          <h1>Your website</h1>
          <p className="iwfw-dash-home__lead">
            {isLive
              ? "Your site is live. Open the link below anytime."
              : previewUrl
                ? "Your preview is ready — review it and tell us any changes before we publish."
                : "Preview and live links appear here. Domain and launch stay with our team."}
          </p>
        </div>
        <div className="iwfw-dash-home__hero-side">
          <span className="iwfw-dash-home__pill">{stage}</span>
          <NewWebsiteButton className="iwfw-btn iwfw-btn--green">
            New website
          </NewWebsiteButton>
        </div>
      </header>

      <WebsiteSwitcher
        orgs={workspace.orgs}
        activeId={activeId}
        hint="Preview, live status and Google Business for this page follow the selected website."
      />

      <section
        className={`iwfw-dash-status ${paidAndReady ? "is-ready" : ""} ${isLive ? "is-live" : ""}`}
        aria-label="Current status"
      >
        <div className="iwfw-dash-status__copy">
          <p className="iwfw-dash-status__kicker">{banner.kicker}</p>
          <h2>{banner.title}</h2>
          <p>{banner.body}</p>
          {liveUrl ? (
            <p className="iwfw-dash-status__live-url">
              <a href={liveUrl} target="_blank" rel="noreferrer">
                {liveUrl}
              </a>
            </p>
          ) : previewUrl ? (
            <p className="iwfw-dash-status__live-url">
              <a href={previewUrl} target="_blank" rel="noreferrer">
                {previewUrl}
              </a>
            </p>
          ) : null}
          {!isLive && paidAndReady && !previewUrl ? (
            <p className="iwfw-dash-fine">
              Typical go-live: about {goLiveSla} after we have everything we
              need. This is a usual timeframe, not a guaranteed deadline.
            </p>
          ) : null}
        </div>
        <div className="iwfw-dash-status__actions">
          {liveUrl ? (
            <a
              href={liveUrl}
              className="iwfw-btn iwfw-btn--green"
              target="_blank"
              rel="noreferrer"
            >
              Visit live site
            </a>
          ) : previewUrl ? (
            <a
              href={previewUrl}
              className="iwfw-btn iwfw-btn--green"
              target="_blank"
              rel="noreferrer"
            >
              Open preview
            </a>
          ) : showGbp ? (
            <Link
              to={withActiveOrg("/dashboard/google-business", activeId)}
              className="iwfw-btn iwfw-btn--green"
            >
              Give Manager access
            </Link>
          ) : (
            <Link
              to={withActiveOrg("/dashboard", activeId)}
              className="iwfw-btn iwfw-btn--outline"
            >
              Back to overview
            </Link>
          )}
        </div>
      </section>

      <section className="iwfw-dash-panel iwfw-dash-sites">
        <div className="iwfw-dash-panel-head">
          <div>
            <h2>Your websites</h2>
            <p className="iwfw-dash-sites__intro">
              Each paid order is a separate website. Select one above, or start
              another.
            </p>
          </div>
          <NewWebsiteButton />
        </div>
        <ul className="iwfw-dash-orgs">
          {workspace.orgs.map((org) => {
            const initial =
              org.tradingName.trim().charAt(0).toUpperCase() || "W";
            const selected = org.id === activeId;
            return (
              <li key={org.id} className={selected ? "is-selected" : undefined}>
                <div className="iwfw-dash-orgs__body">
                  <span className="iwfw-dash-orgs__mark" aria-hidden>
                    {initial}
                  </span>
                  <div>
                    <p className="iwfw-dash-orgs__name">{org.tradingName}</p>
                    <p className="iwfw-dash-orgs__meta">
                      {org.domainName ? `${org.domainName} · ` : ""}
                      {selected ? "Selected" : "Switch to manage"}
                    </p>
                  </div>
                </div>
                <div className="iwfw-dash-orgs__actions">
                  <Badge tone={orgStatusTone(org.status)}>
                    {orgStatusLabel(org.status)}
                  </Badge>
                  {!selected ? (
                    <Link
                      to={withActiveOrg("/dashboard/website", org.id)}
                      className="iwfw-btn iwfw-btn--outline iwfw-btn--sm"
                    >
                      Select
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
          {workspace.orgs.length === 0 ? (
            <li className="iwfw-dash-orgs__empty">
              No website yet. Start the package to create your first one.
            </li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
