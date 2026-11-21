import { Form, Link } from "react-router";
import { Panel, Badge } from "@iwfw/ui";
import { createDb, desc, eq, domainRegistrationTasks } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import { requireAuth } from "../lib/session.server";
import { getCustomerWorkspace } from "../lib/customer-org.server";
import type { Route } from "./+types/dashboard.domain";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Domain — iwantfreewebsite" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireAuth(request, context);
  const db = createDb(getEnv(context).DB);
  const workspace = await getCustomerWorkspace(db, auth);
  const task = workspace.primary
    ? await db
        .select()
        .from(domainRegistrationTasks)
        .where(eq(domainRegistrationTasks.organisationId, workspace.primary.id))
        .orderBy(desc(domainRegistrationTasks.createdAt))
        .get()
    : null;
  return { workspace, task };
}

export default function DomainPage({ loaderData }: Route.ComponentProps) {
  const domain = loaderData.workspace.onboarding?.data.domain;
  const task = loaderData.task;

  return (
    <div className="iwfw-dash-page">
      <header className="iwfw-dash-page__header">
        <div>
          <h1>Domain</h1>
          <p>
            We purchase and connect domains manually after payment. Nothing is
            bought automatically.
          </p>
        </div>
        {task && <Badge>{task.status.replaceAll("_", " ")}</Badge>}
      </header>

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
            <dd>{task?.domainName || domain?.preferredDomain || domain?.existingDomain || "—"}</dd>
          </div>
          <div>
            <dt>Registration task</dt>
            <dd>{task ? task.status.replaceAll("_", " ") : "None yet"}</dd>
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
          Availability at checkout was provisional. Our team completes registrar
          purchase and DNS setup — you will see status updates here.
        </p>
        <Link to="/dashboard/support" className="iwfw-btn iwfw-btn--outline">
          Contact support
        </Link>
      </Panel>
    </div>
  );
}
