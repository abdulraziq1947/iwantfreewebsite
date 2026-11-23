import { data, Link } from "react-router";
import { Panel, Badge } from "@iwfw/ui";
import { desc, eq, domainRegistrationTasks } from "@iwfw/db";
import { requireAuth } from "../lib/session.server";
import { loadCustomerWorkspace } from "../lib/customer-workspace.server";
import { domainTaskLabel } from "../lib/customer-progress";
import { WebsiteSwitcher } from "../components/website-switcher";
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

export default function DomainPage({ loaderData }: Route.ComponentProps) {
  const domain = loaderData.workspace.onboarding?.data.domain;
  const task = loaderData.task;
  const statusLabel = task ? domainTaskLabel(task.status) : null;

  return (
    <div className="iwfw-dash-page">
      <header className="iwfw-dash-page__header">
        <div>
          <h1>Domain</h1>
          <p>
            After payment, our team registers or connects your domain and keeps
            you updated here.
          </p>
        </div>
        {statusLabel ? <Badge>{statusLabel}</Badge> : null}
      </header>

      <WebsiteSwitcher
        orgs={loaderData.workspace.orgs}
        activeId={loaderData.workspace.primary?.id}
        hint="Domain status is shown for the selected website."
      />

      <Panel>
        <dl className="iwfw-dash-dl">
          <div>
            <dt>Preference</dt>
            <dd>
              {domain?.mode === "existing"
                ? "Use existing domain"
                : domain?.mode === "new"
                  ? "Register a new domain"
                  : task
                    ? task.domainMode === "existing"
                      ? "Use existing domain"
                      : "Register a new domain"
                    : "Not set yet"}
            </dd>
          </div>
          <div>
            <dt>Domain</dt>
            <dd>
              {task?.domainName ||
                domain?.preferredDomain ||
                domain?.existingDomain ||
                "—"}
            </dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{statusLabel ?? "Not started yet"}</dd>
          </div>
          <div>
            <dt>Registered</dt>
            <dd>
              {task?.registeredAt
                ? new Date(task.registeredAt).toLocaleDateString("en-GB")
                : "—"}
            </dd>
          </div>
          <div>
            <dt>Connected</dt>
            <dd>
              {task?.connectedAt
                ? new Date(task.connectedAt).toLocaleDateString("en-GB")
                : "—"}
            </dd>
          </div>
        </dl>
        <p className="iwfw-dash-fine">
          Domain availability at checkout is provisional. We’ll complete
          registration and DNS setup for you — status updates appear on this
          page.
        </p>
        <div className="iwfw-dash-inline-actions">
          <Link to="/dashboard" className="iwfw-btn iwfw-btn--outline">
            Back to overview
          </Link>
          <Link to="/dashboard/support" className="iwfw-btn iwfw-btn--outline">
            Contact support
          </Link>
        </div>
      </Panel>
    </div>
  );
}
