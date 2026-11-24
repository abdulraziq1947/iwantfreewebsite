import { data, Link } from "react-router";
import { goLiveSlaLabel } from "@iwfw/config";
import { getConfig } from "../lib/env.server";
import { requireAuth } from "../lib/session.server";
import { loadCustomerWorkspace } from "../lib/customer-workspace.server";
import { withActiveOrg } from "../lib/active-org";
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
import {
  ArrowIcon,
  ExternalIcon,
  PageHead,
  StatusMark,
  WebsiteList,
  websiteStageTone,
} from "../components/dash-ui";
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
  const shownUrl = liveUrl ?? previewUrl;
  const stageTone = websiteStageTone({
    needsSubscription: workspace.needsSubscription,
    briefReady: workspace.briefReady,
    domainStatus: workspace.domainTask?.status,
  });

  return (
    <div className="dash-page">
      <PageHead
        kicker={workspace.primary?.tradingName ?? "Website"}
        title="Your website"
        lead={
          isLive
            ? "Your site is live. Open the link below whenever you need it."
            : previewUrl
              ? "Your preview is ready. Have a look and tell us any changes before we publish."
              : "Preview and live links appear here. Domain and launch stay with our team."
        }
        aside={
          <>
            <StatusMark tone={stageTone}>{stage}</StatusMark>
            <NewWebsiteButton className="dash-btn dash-btn--line dash-btn--sm">
              New website
            </NewWebsiteButton>
          </>
        }
      />

      <WebsiteSwitcher
        orgs={workspace.orgs}
        activeId={activeId}
        hint="Preview, live status and Google Business for this page follow the selected website."
      />

      <section
        className={`dash-browser${isLive ? " is-live" : ""}${paidAndReady ? " is-ready" : ""}`}
        aria-labelledby="dash-browser-title"
      >
        <div className="dash-browser__bar">
          <span className="dash-browser__dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <p className="dash-browser__address">
            <span className="dash-sr">
              {liveUrl ? "Live address: " : previewUrl ? "Preview address: " : ""}
            </span>
            {shownUrl ? (
              <a href={shownUrl} target="_blank" rel="noreferrer">
                {shownUrl}
              </a>
            ) : (
              <span className="dash-browser__placeholder">
                Your web address will appear here
              </span>
            )}
          </p>
          {liveUrl ? (
            <span className="dash-browser__tag is-live">Live</span>
          ) : previewUrl ? (
            <span className="dash-browser__tag">Preview</span>
          ) : null}
        </div>

        <div className="dash-browser__body">
          <div className="dash-browser__copy">
            <p className="dash-kicker dash-kicker--plain">{banner.kicker}</p>
            <h2 id="dash-browser-title" className="dash-h2 dash-h2--lg">
              {banner.title}
            </h2>
            <p className="dash-copy">{banner.body}</p>
            {!isLive && paidAndReady && !previewUrl ? (
              <p className="dash-fine">
                Typical go-live: about {goLiveSla} after we have everything we
                need. This is a usual timeframe, not a guaranteed deadline.
              </p>
            ) : null}
          </div>
          <div className="dash-browser__cta">
            {liveUrl ? (
              <a
                href={liveUrl}
                className="dash-btn dash-btn--go"
                target="_blank"
                rel="noreferrer"
              >
                Visit live site
                <ExternalIcon />
              </a>
            ) : previewUrl ? (
              <a
                href={previewUrl}
                className="dash-btn dash-btn--go"
                target="_blank"
                rel="noreferrer"
              >
                Open preview
                <ExternalIcon />
              </a>
            ) : showGbp ? (
              <Link
                to={withActiveOrg("/dashboard/google-business", activeId)}
                className="dash-btn dash-btn--go"
              >
                Give Manager access
                <ArrowIcon />
              </Link>
            ) : (
              <Link
                to={withActiveOrg("/dashboard", activeId)}
                className="dash-btn dash-btn--line"
              >
                Back to overview
              </Link>
            )}
          </div>
        </div>
      </section>

      <WebsiteList
        orgs={workspace.orgs}
        activeId={activeId}
        intro="Each paid order is a separate website. Select one here, or start another."
        selectHref={(orgId) => withActiveOrg("/dashboard/website", orgId)}
        unselectedHint="Switch to manage"
        action={
          <NewWebsiteButton className="dash-btn dash-btn--line dash-btn--sm">
            New website
          </NewWebsiteButton>
        }
      />
    </div>
  );
}
