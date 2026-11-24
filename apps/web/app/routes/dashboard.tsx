import { data, Link } from "react-router";
import { goLiveSlaLabel } from "@iwfw/config";
import { getConfig } from "../lib/env.server";
import { requireAuth } from "../lib/session.server";
import { loadCustomerWorkspace } from "../lib/customer-workspace.server";
import { withActiveOrg } from "../lib/active-org";
import { orgStatusLabel } from "../lib/customer-dashboard";
import { mailboxStatusLabel } from "../lib/mailbox";
import {
  buildCustomerActions,
  buildJourneyStages,
  buildStatusBanner,
  liveWebsiteUrl,
  needsGbpInvite,
  previewWebsiteUrl,
  websiteStageLabel,
} from "../lib/customer-progress";
import { AttentionBoardCard } from "../components/attention-board";
import {
  NewWebsiteButton,
  WebsiteSwitcher,
} from "../components/website-switcher";
import {
  ArrowIcon,
  CheckIcon,
  ExternalIcon,
  PageHead,
  StatusMark,
  WebsiteList,
  websiteStageTone,
} from "../components/dash-ui";
import type { Route } from "./+types/dashboard";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Dashboard — iwantfreewebsite" }];
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
    {
      userName: auth.name,
      workspace,
      goLiveSla: goLiveSlaLabel(config),
    },
    headers ? { headers } : undefined,
  );
}

const STAGE_STATE_LABEL = {
  done: "Done",
  current: "In progress",
  upcoming: "Coming up",
} as const;

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { workspace, goLiveSla } = loaderData;
  const activeId = workspace.primary?.id ?? null;
  const firstName = loaderData.userName?.split(" ")[0] ?? "";
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
    goLiveSlaLabel: goLiveSla,
  });
  const actions = buildCustomerActions({
    needsSubscription: workspace.needsSubscription,
    briefReady: workspace.briefReady,
    domainTask: workspace.domainTask,
    data: workspace.onboarding?.data,
  });
  const gbpAction = actions.find((a) => a.id === "gbp");
  const showGbp =
    !workspace.needsSubscription &&
    needsGbpInvite(workspace.onboarding?.data);
  const stageLabel = websiteStageLabel({
    needsSubscription: workspace.needsSubscription,
    domainStatus: workspace.domainTask?.status,
    briefReady: workspace.briefReady,
  });
  const paidAndReady = !workspace.needsSubscription && workspace.briefReady;
  const isLive = workspace.domainTask?.status === "connected";
  const liveUrl = liveWebsiteUrl(workspace.domainTask);
  const previewUrl = previewWebsiteUrl(workspace.domainTask);
  const domainName = workspace.domainTask?.domainName;
  const stageTone = websiteStageTone({
    needsSubscription: workspace.needsSubscription,
    briefReady: workspace.briefReady,
    domainStatus: workspace.domainTask?.status,
  });
  const linkUrl = liveUrl ?? previewUrl;
  const mailbox = workspace.mailbox;

  const quickLinks = [
    {
      to: "/dashboard/website",
      label: "Website",
      value: stageLabel,
    },
    {
      to: "/dashboard/domain",
      label: "Domain",
      value: domainName || "Managed by us",
    },
    {
      to: "/dashboard/email",
      label: "Email",
      value: mailbox
        ? mailboxStatusLabel(mailbox.status)
        : "Choose your address",
    },
    {
      to: "/dashboard/media",
      label: "Images",
      value: workspace.primary?.tradingName
        ? `For ${workspace.primary.tradingName}`
        : "Upload anytime",
    },
    {
      to: "/dashboard/google-business",
      label: "Google Business",
      value: workspace.primary?.tradingName
        ? workspace.primary.tradingName
        : "Per website",
    },
    {
      to: "/dashboard/billing",
      label: "Billing",
      value: workspace.primary
        ? orgStatusLabel(workspace.primary.status)
        : "No plan yet",
    },
    {
      to: "/dashboard/support",
      label: "Support",
      value: "Message our team",
    },
  ];

  return (
    <div className="dash-page dash-overview">
      <PageHead
        kicker="Overview"
        title={`Welcome back${firstName ? `, ${firstName}` : ""}`}
        lead={
          isLive
            ? "Congratulations, your website is live. Share the link with your customers."
            : paidAndReady
              ? "You’re done on your side. We’ll build your website and let you know when it’s live."
              : "Where things stand, and what to do next."
        }
        aside={
          <div className="dash-plate">
            {workspace.primary?.tradingName ? (
              <p className="dash-plate__name">{workspace.primary.tradingName}</p>
            ) : null}
            {domainName ? <p className="dash-plate__domain">{domainName}</p> : null}
            <StatusMark tone={stageTone}>{stageLabel}</StatusMark>
          </div>
        }
      />

      <WebsiteSwitcher
        orgs={workspace.orgs}
        activeId={activeId}
        hint="Overview, images and Google Business follow the website you select."
      />

      <section
        className={`dash-build${paidAndReady ? " is-ready" : ""}${isLive ? " is-live" : ""}`}
        aria-labelledby="dash-build-title"
      >
        <div className="dash-build__main">
          <div className="dash-build__copy">
            <p className="dash-build__kicker">{banner.kicker}</p>
            <h2 id="dash-build-title" className="dash-build__title">
              {banner.title}
            </h2>
            <p className="dash-build__body">{banner.body}</p>
            {linkUrl ? (
              <p className="dash-build__url">
                <span>{liveUrl ? "Live at" : "Preview"}</span>
                <a href={linkUrl} target="_blank" rel="noreferrer">
                  {linkUrl}
                </a>
              </p>
            ) : null}
          </div>
          <div className="dash-build__cta">
            {workspace.needsSubscription ? (
              <Link to="/get-started" className="dash-btn dash-btn--go">
                See £39.99 plan
                <ArrowIcon />
              </Link>
            ) : liveUrl ? (
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
            ) : workspace.domainTask?.status === "unavailable" ? (
              <Link to="/dashboard/support" className="dash-btn dash-btn--go">
                Contact support
                <ArrowIcon />
              </Link>
            ) : (
              <Link
                to={withActiveOrg("/dashboard/website", activeId)}
                className="dash-btn dash-btn--line"
              >
                Website details
                <ArrowIcon />
              </Link>
            )}
          </div>
        </div>

        <div className="dash-build__journey">
          <div className="dash-build__journey-head">
            <h3>What happens next</h3>
            <p>Four simple stages. Domain and setup stay with our team.</p>
          </div>
          <ol className="dash-track">
            {stages.map((stage, index) => (
              <li
                key={stage.id}
                className={`dash-track__step is-${stage.state}`}
                aria-current={stage.state === "current" ? "step" : undefined}
              >
                <span className="dash-track__node" aria-hidden="true">
                  {stage.state === "done" ? <CheckIcon /> : index + 1}
                </span>
                <div className="dash-track__text">
                  <strong>
                    {stage.title}
                    <span className="dash-sr">
                      {` (${STAGE_STATE_LABEL[stage.state]})`}
                    </span>
                  </strong>
                  <p>{stage.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {workspace.attention &&
      workspace.attention.customerPendingCount > 0 ? (
        <AttentionBoardCard
          board={workspace.attention}
          perspective="customer"
          title="Needs your attention"
          gbpActions={
            <Link
              to={withActiveOrg("/dashboard/google-business", activeId)}
              className="dash-btn dash-btn--line dash-btn--sm"
            >
              {showGbp && gbpAction ? gbpAction.cta : "Update Google Business"}
            </Link>
          }
        />
      ) : null}

      <div className="dash-overview__lower">
        <section className="dash-index" aria-labelledby="dash-index-title">
          <h2 id="dash-index-title" className="dash-h2">
            Manage your website
          </h2>
          <ul className="dash-index__list">
            {quickLinks.map((item) => (
              <li key={item.to}>
                <Link
                  to={withActiveOrg(item.to, activeId)}
                  className="dash-index__link"
                >
                  <span className="dash-index__label">{item.label}</span>
                  <span className="dash-index__value">{item.value}</span>
                  <ArrowIcon />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <WebsiteList
          orgs={workspace.orgs}
          activeId={activeId}
          intro="Each paid order becomes its own site. Select one to manage its images and Google Business."
          selectHref={(orgId) => withActiveOrg("/dashboard", orgId)}
          unselectedHint="Select to manage"
          action={
            <NewWebsiteButton className="dash-btn dash-btn--line dash-btn--sm">
              New website
            </NewWebsiteButton>
          }
        />
      </div>
    </div>
  );
}
