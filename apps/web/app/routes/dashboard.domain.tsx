import { data, Link } from "react-router";
import { desc, eq, domainRegistrationTasks } from "@iwfw/db";
import { requireAuth } from "../lib/session.server";
import { loadCustomerWorkspace } from "../lib/customer-workspace.server";
import { domainTaskLabel } from "../lib/customer-progress";
import { WebsiteSwitcher } from "../components/website-switcher";
import { PageHead, StatusMark, type DashTone } from "../components/dash-ui";
import { withActiveOrg } from "../lib/active-org";
import type { Route } from "./+types/dashboard.domain";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Domain — iwantfreewebsite" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireAuth(request, context);
  const { db, workspace, headers } = await loadCustomerWorkspace(
    request,
    context,
    auth,
  );
  const task = workspace.primary
    ? await db
        .select()
        .from(domainRegistrationTasks)
        .where(eq(domainRegistrationTasks.organisationId, workspace.primary.id))
        .orderBy(desc(domainRegistrationTasks.createdAt))
        .get()
    : null;
  return data({ workspace, task }, headers ? { headers } : undefined);
}

function domainTone(status: string | undefined): DashTone {
  switch (status) {
    case "connected":
      return "ok";
    case "unavailable":
      return "wait";
    case "cancelled":
      return "muted";
    case "pending":
    case "in_progress":
    case "registered":
      return "info";
    default:
      return "muted";
  }
}

function formatDay(value: string | Date | null | undefined): string {
  return value ? new Date(value).toLocaleDateString("en-GB") : "—";
}

export default function DomainPage({ loaderData }: Route.ComponentProps) {
  const domain = loaderData.workspace.onboarding?.data.domain;
  const task = loaderData.task;
  const statusLabel = task ? domainTaskLabel(task.status) : null;
  const activeId = loaderData.workspace.primary?.id ?? null;
  const domainName =
    task?.domainName || domain?.preferredDomain || domain?.existingDomain || "";
  const preference =
    domain?.mode === "existing"
      ? "Use existing domain"
      : domain?.mode === "new"
        ? "Register a new domain"
        : task
          ? task.domainMode === "existing"
            ? "Use existing domain"
            : "Register a new domain"
          : "Not set yet";

  return (
    <div className="dash-page dash-page--narrow">
      <PageHead
        kicker={loaderData.workspace.primary?.tradingName ?? "Your website"}
        title="Domain"
        lead="After payment, our team registers or connects your domain and keeps you updated here."
        aside={
          statusLabel ? (
            <StatusMark tone={domainTone(task?.status)}>{statusLabel}</StatusMark>
          ) : null
        }
      />

      <WebsiteSwitcher
        orgs={loaderData.workspace.orgs}
        activeId={loaderData.workspace.primary?.id}
        hint="Domain status is shown for the selected website."
      />

      <section className="dash-ledger dash-domain" aria-labelledby="dash-domain-title">
        <h2 id="dash-domain-title" className="dash-ledger__head">
          Your web address
        </h2>
        <p className={`dash-domain__name${domainName ? "" : " is-empty"}`}>
          {domainName || "Not chosen yet"}
        </p>
        <dl className="dash-rows">
          <div>
            <dt>Preference</dt>
            <dd>{preference}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>
              {statusLabel ? (
                <StatusMark tone={domainTone(task?.status)}>
                  {statusLabel}
                </StatusMark>
              ) : (
                "Not started yet"
              )}
            </dd>
          </div>
          <div>
            <dt>Registered</dt>
            <dd>{formatDay(task?.registeredAt)}</dd>
          </div>
          <div>
            <dt>Connected</dt>
            <dd>{formatDay(task?.connectedAt)}</dd>
          </div>
        </dl>
        <p className="dash-ledger__foot">
          Domain availability at checkout is provisional. We’ll complete
          registration and DNS setup for you, and status updates appear on this
          page.
        </p>
      </section>

      <div className="dash-actions">
        <Link
          to={withActiveOrg("/dashboard", activeId)}
          className="dash-btn dash-btn--line"
        >
          Back to overview
        </Link>
        <Link to="/dashboard/support" className="dash-btn dash-btn--quiet">
          Contact support
        </Link>
      </div>
    </div>
  );
}
