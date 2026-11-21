import { Form, Link, useNavigation } from "react-router";
import { Badge, Panel } from "@iwfw/ui";
import { createDb, desc, eq, assetTransferTasks } from "@iwfw/db";
import { getConfig, getEnv } from "../lib/env.server";
import { requireAuth } from "../lib/session.server";
import { getCustomerWorkspace } from "../lib/customer-org.server";
import { orgStatusLabel, orgStatusTone } from "../lib/customer-dashboard";
import {
  getOrganisationSubscription,
  setSubscriptionCancelAtPeriodEnd,
} from "../lib/billing.server";
import type { Route } from "./+types/dashboard.billing";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Billing — iwantfreewebsite" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireAuth(request, context);
  const db = createDb(getEnv(context).DB);
  const workspace = await getCustomerWorkspace(db, auth);
  const subscription = workspace.primary
    ? await getOrganisationSubscription(db, workspace.primary.id)
    : null;
  const transfer = workspace.primary
    ? await db
        .select()
        .from(assetTransferTasks)
        .where(eq(assetTransferTasks.organisationId, workspace.primary.id))
        .orderBy(desc(assetTransferTasks.createdAt))
        .get()
    : null;

  return { workspace, subscription, transfer };
}

export async function action({ request, context }: Route.ActionArgs) {
  const auth = await requireAuth(request, context);
  const config = getConfig(context);
  const db = createDb(getEnv(context).DB);
  const workspace = await getCustomerWorkspace(db, auth);
  if (!workspace.primary) {
    return { error: "No organisation found." };
  }

  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  if (intent === "cancel") {
    return setSubscriptionCancelAtPeriodEnd({
      config,
      db,
      organisationId: workspace.primary.id,
      cancelAtPeriodEnd: true,
    });
  }
  if (intent === "resume") {
    return setSubscriptionCancelAtPeriodEnd({
      config,
      db,
      organisationId: workspace.primary.id,
      cancelAtPeriodEnd: false,
    });
  }
  return { error: "Unknown action." };
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function BillingPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { workspace, subscription, transfer } = loaderData;
  const status = workspace.primary?.status ?? "prospect";
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const activeLike =
    subscription &&
    ["active", "trialing", "past_due", "unpaid"].includes(subscription.status);

  return (
    <div className="iwfw-dash-page">
      <header className="iwfw-dash-page__header">
        <div>
          <h1>Billing</h1>
          <p>
            £39.99/month. No upfront website fee. No minimum contract. Cancel
            anytime.
          </p>
        </div>
        <Badge tone={orgStatusTone(status)}>{orgStatusLabel(status)}</Badge>
      </header>

      <div className="iwfw-dash-split">
        <Panel>
          <h2>Current plan</h2>
          <p className="iwfw-dash-price">
            £39.99 <span>/month</span>
          </p>
          <ul className="iwfw-dash-list">
            <li>Managed business website</li>
            <li>Hosting &amp; maintenance</li>
            <li>Domain help (manual purchase/renewal)</li>
            <li>One business email mailbox</li>
            <li>Weekly Google Business Profile post</li>
            <li>Review reply help</li>
          </ul>

          {subscription ? (
            <dl className="iwfw-dash-dl">
              <div>
                <dt>Subscription status</dt>
                <dd>{subscription.status}</dd>
              </div>
              <div>
                <dt>Current period ends</dt>
                <dd>{formatDate(subscription.currentPeriodEnd)}</dd>
              </div>
              <div>
                <dt>Cancel at period end</dt>
                <dd>{subscription.cancelAtPeriodEnd ? "Yes" : "No"}</dd>
              </div>
              <div>
                <dt>Stripe reference</dt>
                <dd>{subscription.stripeSubscriptionId}</dd>
              </div>
            </dl>
          ) : status === "prospect" ? (
            <Link
              to="/get-started"
              className="iwfw-btn iwfw-btn--green iwfw-btn--block"
            >
              Subscribe
            </Link>
          ) : (
            <p className="iwfw-dash-copy">
              Subscription details will appear here once Stripe confirms your
              payment via webhook.
            </p>
          )}
        </Panel>

        <Panel>
          <h2>Cancel anytime</h2>
          <p className="iwfw-dash-copy">
            No minimum term and no cancellation penalty. If you cancel, your
            subscription stays active until the end of the current paid billing
            period, and billing will not renew after that date. You can reverse a
            scheduled cancellation before the period ends.
          </p>
          <p className="iwfw-dash-copy">
            When the subscription actually ends, we create one manual asset
            transfer task. We do not auto-delete or transfer websites, domains,
            email or files.
          </p>

          {actionData && "error" in actionData && actionData.error && (
            <p className="iwfw-start__error" role="alert">
              {actionData.error}
            </p>
          )}
          {actionData && "ok" in actionData && actionData.ok && (
            <p className="iwfw-start__ok" role="status">
              Billing preference updated.
            </p>
          )}

          {activeLike && !subscription?.cancelAtPeriodEnd && (
            <Form method="post">
              <input type="hidden" name="intent" value="cancel" />
              <button
                type="submit"
                className="iwfw-btn iwfw-btn--outline"
                disabled={busy}
              >
                {busy ? "Updating…" : "Cancel at period end"}
              </button>
            </Form>
          )}

          {activeLike && subscription?.cancelAtPeriodEnd && (
            <Form method="post">
              <input type="hidden" name="intent" value="resume" />
              <p className="iwfw-dash-fine">
                Cancellation is scheduled for{" "}
                {formatDate(subscription.currentPeriodEnd)}. You can keep your
                subscription by reversing this before that date.
              </p>
              <button
                type="submit"
                className="iwfw-btn iwfw-btn--green"
                disabled={busy}
              >
                {busy ? "Updating…" : "Keep my subscription"}
              </button>
            </Form>
          )}

          {!activeLike && (
            <p className="iwfw-dash-fine">
              Cancellation controls appear when you have an active Stripe
              subscription.
            </p>
          )}

          <h2 className="iwfw-start__subhead">Asset transfer</h2>
          {transfer ? (
            <dl className="iwfw-dash-dl">
              <div>
                <dt>Status</dt>
                <dd>{transfer.status.replace("_", " ")}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{formatDate(transfer.createdAt)}</dd>
              </div>
              <div>
                <dt>Completed</dt>
                <dd>{formatDate(transfer.completedAt)}</dd>
              </div>
            </dl>
          ) : (
            <p className="iwfw-dash-fine">
              No transfer task yet. A task is created when the subscription ends
              (not when cancel is only scheduled).
            </p>
          )}

          <p className="iwfw-dash-fine">
            Optional Google Rank Tracking (£9.99/month) remains disabled until
            that feature is operational.
          </p>
        </Panel>
      </div>
    </div>
  );
}
