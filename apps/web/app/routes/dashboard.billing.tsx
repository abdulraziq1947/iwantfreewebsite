import { Form, Link, useNavigation } from "react-router";
import { Badge, Panel } from "@iwfw/ui";
import { createDb, desc, eq, assetTransferTasks } from "@iwfw/db";
import { getConfig, getEnv } from "../lib/env.server";
import { requireAuth } from "../lib/session.server";
import { getCustomerWorkspace } from "../lib/customer-org.server";
import { orgStatusLabel, orgStatusTone } from "../lib/customer-dashboard";
import {
  getOrganisationSubscription,
  listOrganisationInvoices,
  setSubscriptionCancelAtPeriodEnd,
} from "../lib/billing.server";
import type { Route } from "./+types/dashboard.billing";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Billing — iwantfreewebsite" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireAuth(request, context);
  const config = getConfig(context);
  const db = createDb(getEnv(context).DB);
  const workspace = await getCustomerWorkspace(db, auth, getConfig(context));
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
  const invoiceResult = workspace.primary
    ? await listOrganisationInvoices({
        config,
        db,
        organisationId: workspace.primary.id,
      })
    : { invoices: [] as Awaited<
        ReturnType<typeof listOrganisationInvoices>
      >["invoices"] };

  return {
    workspace,
    subscription,
    transfer,
    invoices: invoiceResult.invoices,
    invoiceError:
      "error" in invoiceResult ? invoiceResult.error : undefined,
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const auth = await requireAuth(request, context);
  const config = getConfig(context);
  const db = createDb(getEnv(context).DB);
  const workspace = await getCustomerWorkspace(db, auth, getConfig(context));
  if (!workspace.primary) {
    return { error: "No website account found." };
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

function formatMoney(pence: number, currency = "GBP"): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
  }).format(pence / 100);
}

function subscriptionStatusLabel(status: string): string {
  switch (status) {
    case "active":
      return "Active";
    case "trialing":
      return "Trial";
    case "past_due":
      return "Payment past due";
    case "unpaid":
      return "Unpaid";
    case "canceled":
    case "cancelled":
      return "Cancelled";
    case "incomplete":
      return "Incomplete";
    default:
      return status.replaceAll("_", " ");
  }
}

function transferStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "in_progress":
      return "In progress";
    case "completed":
      return "Completed";
    default:
      return status.replaceAll("_", " ");
  }
}

export default function BillingPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { workspace, subscription, transfer, invoices, invoiceError } =
    loaderData;
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

      <section className="iwfw-dash-panel">
        <div className="iwfw-dash-panel-head">
          <h2>Invoices</h2>
        </div>
        {invoiceError ? (
          <p className="iwfw-dash-fine">{invoiceError}</p>
        ) : invoices.length === 0 ? (
          <p className="iwfw-dash-fine">
            Invoices appear here after your first payment.
          </p>
        ) : (
          <ul className="iwfw-invoice-list">
            {invoices.map((inv) => (
              <li key={inv.id}>
                <div>
                  <strong>
                    {inv.number || "Invoice"}{" "}
                    <Badge
                      tone={
                        inv.status === "paid"
                          ? "success"
                          : inv.status === "open"
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {inv.status || "—"}
                    </Badge>
                  </strong>
                  <p className="iwfw-dash-fine iwfw-dash-fine--tight">
                    Billed {formatDate(inv.createdAt)}
                    {inv.periodStart && inv.periodEnd
                      ? ` · period ${formatDate(inv.periodStart)} → ${formatDate(inv.periodEnd)}`
                      : ""}
                    {" · "}
                    {formatMoney(inv.total, inv.currency)}
                    {inv.amountPaid > 0 && inv.amountPaid !== inv.total
                      ? ` (paid ${formatMoney(inv.amountPaid, inv.currency)})`
                      : ""}
                  </p>
                </div>
                <div className="iwfw-dash-inline-actions">
                  {inv.invoicePdfUrl ? (
                    <a
                      href={`/dashboard/billing/invoice/${inv.id}.pdf`}
                      className="iwfw-btn iwfw-btn--green iwfw-btn--sm"
                    >
                      Download PDF
                    </a>
                  ) : null}
                  {inv.hostedInvoiceUrl ? (
                    <a
                      href={inv.hostedInvoiceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="iwfw-btn iwfw-btn--outline iwfw-btn--sm"
                    >
                      View online
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="iwfw-dash-split">
        <Panel>
          <h2>Current plan</h2>
          <p className="iwfw-dash-price">
            £39.99 <span>/month</span>
          </p>
          <ul className="iwfw-dash-list">
            <li>Managed business website</li>
            <li>Hosting &amp; maintenance</li>
            <li>Domain help</li>
            <li>One business email mailbox</li>
            <li>Weekly Google Business Profile post</li>
            <li>Review reply help</li>
          </ul>

          {subscription ? (
            <dl className="iwfw-dash-dl">
              <div>
                <dt>Status</dt>
                <dd>{subscriptionStatusLabel(subscription.status)}</dd>
              </div>
              <div>
                <dt>
                  {subscription.cancelAtPeriodEnd
                    ? "Ends on"
                    : "Renews / period ends"}
                </dt>
                <dd>{formatDate(subscription.currentPeriodEnd)}</dd>
              </div>
              <div>
                <dt>Cancellation</dt>
                <dd>
                  {subscription.cancelAtPeriodEnd
                    ? "Scheduled at period end"
                    : "Not scheduled"}
                </dd>
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
              Subscription details will appear here once your payment is
              confirmed.
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
            When your subscription ends, we help transfer your website and
            domain to you. We do not automatically delete your site, domain,
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
                {busy ? "Updating…" : "Cancel at end of billing period"}
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
              Cancellation controls appear when you have an active subscription.
            </p>
          )}

          {transfer ? (
            <>
              <h2 className="iwfw-start__subhead">Website transfer</h2>
              <dl className="iwfw-dash-dl">
                <div>
                  <dt>Status</dt>
                  <dd>{transferStatusLabel(transfer.status)}</dd>
                </div>
                <div>
                  <dt>Started</dt>
                  <dd>{formatDate(transfer.createdAt)}</dd>
                </div>
                <div>
                  <dt>Completed</dt>
                  <dd>{formatDate(transfer.completedAt)}</dd>
                </div>
              </dl>
            </>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
