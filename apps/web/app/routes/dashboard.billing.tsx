import { data, Form, Link, redirect, useNavigation } from "react-router";
import { desc, eq, assetTransferTasks } from "@iwfw/db";
import { getConfig } from "../lib/env.server";
import { requireAuth } from "../lib/session.server";
import { loadCustomerWorkspace } from "../lib/customer-workspace.server";
import { orgStatusLabel, orgStatusTone } from "../lib/customer-dashboard";
import {
  createBillingPortalSession,
  getOrganisationSubscription,
  listOrganisationInvoices,
  setSubscriptionCancelAtPeriodEnd,
} from "../lib/billing.server";
import { WebsiteSwitcher } from "../components/website-switcher";
import {
  Alert,
  CheckIcon,
  ExternalIcon,
  PageHead,
  StatusMark,
  toneFromBadge,
  type DashTone,
} from "../components/dash-ui";
import type { Route } from "./+types/dashboard.billing";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Billing — iwantfreewebsite" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireAuth(request, context);
  const config = getConfig(context);
  const { db, workspace, headers } = await loadCustomerWorkspace(
    request,
    context,
    auth,
  );
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

  return data(
    {
      workspace,
      subscription,
      transfer,
      invoices: invoiceResult.invoices,
      invoiceError:
        "error" in invoiceResult ? invoiceResult.error : undefined,
    },
    headers ? { headers } : undefined,
  );
}

export async function action({ request, context }: Route.ActionArgs) {
  const auth = await requireAuth(request, context);
  const config = getConfig(context);
  const form = await request.formData();
  const orgFromForm = String(form.get("org") ?? "").trim() || null;
  const { db, workspace } = await loadCustomerWorkspace(
    request,
    context,
    auth,
  );
  const { getCustomerWorkspace } = await import("../lib/customer-org.server");
  const selected =
    orgFromForm && workspace.orgs.some((o) => o.id === orgFromForm)
      ? await getCustomerWorkspace(db, auth, config, {
          organisationId: orgFromForm,
        })
      : workspace;
  if (!selected.primary) {
    return { error: "No website account found." };
  }

  const intent = String(form.get("intent") ?? "");

  if (intent === "cancel") {
    return setSubscriptionCancelAtPeriodEnd({
      config,
      db,
      organisationId: selected.primary.id,
      cancelAtPeriodEnd: true,
    });
  }
  if (intent === "resume") {
    return setSubscriptionCancelAtPeriodEnd({
      config,
      db,
      organisationId: selected.primary.id,
      cancelAtPeriodEnd: false,
    });
  }
  if (intent === "portal") {
    const portal = await createBillingPortalSession({
      config,
      db,
      organisationId: selected.primary.id,
      returnUrl: `${config.APP_URL}/dashboard/billing?org=${encodeURIComponent(selected.primary.id)}`,
    });
    if ("error" in portal) return portal;
    throw redirect(portal.url);
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

function invoiceTone(status: string | null | undefined): DashTone {
  if (status === "paid") return "ok";
  if (status === "open") return "wait";
  if (status === "uncollectible") return "stop";
  return "muted";
}

function subscriptionTone(status: string): DashTone {
  if (status === "active" || status === "trialing") return "ok";
  if (status === "past_due" || status === "unpaid") return "stop";
  if (status === "incomplete") return "wait";
  return "muted";
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
    <div className="dash-page">
      <PageHead
        kicker={workspace.primary?.tradingName ?? "Account"}
        title="Billing"
        lead="£39.99 a month for your managed website, hosting and domain care. No minimum contract. Cancel anytime."
        aside={
          <StatusMark tone={toneFromBadge(orgStatusTone(status))}>
            {orgStatusLabel(status)}
          </StatusMark>
        }
      />

      <WebsiteSwitcher
        orgs={workspace.orgs}
        activeId={workspace.primary?.id}
        hint="Billing, invoices and cancellation apply to the selected website subscription."
      />

      <div className="dash-split dash-split--plan">
        <section className="dash-ledger" aria-labelledby="dash-plan-title">
          <h2 id="dash-plan-title" className="dash-ledger__head">
            Current plan
          </h2>
          <p className="dash-figure">
            <strong>£39.99</strong>
            <span>/month</span>
          </p>
          <ul className="dash-ticks">
            <li>
              <CheckIcon />
              Managed business website
            </li>
            <li>
              <CheckIcon />
              Hosting &amp; maintenance
            </li>
            <li>
              <CheckIcon />
              Domain help
            </li>
            <li>
              <CheckIcon />
              One business email mailbox
            </li>
            <li>
              <CheckIcon />
              Weekly Google Business Profile post
            </li>
            <li>
              <CheckIcon />
              Review reply help
            </li>
          </ul>

          {subscription ? (
            <>
              <dl className="dash-rows">
                <div>
                  <dt>Status</dt>
                  <dd>
                    <StatusMark tone={subscriptionTone(subscription.status)}>
                      {subscriptionStatusLabel(subscription.status)}
                    </StatusMark>
                  </dd>
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
              <Form method="post" className="dash-ledger__action">
                <input type="hidden" name="intent" value="portal" />
                {workspace.primary?.id ? (
                  <input type="hidden" name="org" value={workspace.primary.id} />
                ) : null}
                <button
                  type="submit"
                  className="dash-btn dash-btn--line"
                  disabled={busy}
                >
                  {busy ? "Opening…" : "Update payment method"}
                </button>
                <p className="dash-fine">
                  Opens Stripe’s secure customer portal to update your card.
                </p>
              </Form>
            </>
          ) : status === "prospect" ? (
            <Link
              to="/get-started"
              className="dash-btn dash-btn--go dash-btn--block"
            >
              Subscribe
            </Link>
          ) : (
            <p className="dash-ledger__foot">
              Subscription details will appear here once your payment is
              confirmed.
            </p>
          )}
        </section>

        <section className="dash-prose" aria-labelledby="dash-cancel-title">
          <h2 id="dash-cancel-title" className="dash-h2">
            Cancel anytime
          </h2>
          <p>
            No minimum term and no cancellation penalty. If you cancel, your
            subscription stays active until the end of the current paid billing
            period, and billing will not renew after that date. You can reverse a
            scheduled cancellation before the period ends.
          </p>
          <p>
            When your subscription ends, we help transfer your website and
            domain to you. We do not automatically delete your site, domain,
            email or files.
          </p>

          {actionData && "error" in actionData && actionData.error ? (
            <Alert tone="error">{actionData.error}</Alert>
          ) : null}
          {actionData && "ok" in actionData && actionData.ok ? (
            <Alert tone="ok">Billing preference updated.</Alert>
          ) : null}

          {activeLike && !subscription?.cancelAtPeriodEnd && (
            <Form method="post">
              <input type="hidden" name="intent" value="cancel" />
              {workspace.primary?.id ? (
                <input type="hidden" name="org" value={workspace.primary.id} />
              ) : null}
              <button
                type="submit"
                className="dash-btn dash-btn--line"
                disabled={busy}
              >
                {busy ? "Updating…" : "Cancel at end of billing period"}
              </button>
            </Form>
          )}

          {activeLike && subscription?.cancelAtPeriodEnd && (
            <Form method="post" className="dash-prose__form">
              <input type="hidden" name="intent" value="resume" />
              {workspace.primary?.id ? (
                <input type="hidden" name="org" value={workspace.primary.id} />
              ) : null}
              <p className="dash-fine">
                Cancellation is scheduled for{" "}
                {formatDate(subscription.currentPeriodEnd)}. You can keep your
                subscription by reversing this before that date.
              </p>
              <button
                type="submit"
                className="dash-btn dash-btn--go"
                disabled={busy}
              >
                {busy ? "Updating…" : "Keep my subscription"}
              </button>
            </Form>
          )}

          {!activeLike && (
            <p className="dash-fine">
              Cancellation controls appear when you have an active subscription.
            </p>
          )}

          {transfer ? (
            <div className="dash-prose__block">
              <h3 className="dash-h3">Website transfer</h3>
              <dl className="dash-rows">
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
            </div>
          ) : null}
        </section>
      </div>

      <section className="dash-section" aria-labelledby="dash-invoices-title">
        <div className="dash-section-head">
          <h2 id="dash-invoices-title" className="dash-h2">
            Invoices
          </h2>
        </div>
        {invoiceError ? (
          <p className="dash-empty">{invoiceError}</p>
        ) : invoices.length === 0 ? (
          <p className="dash-empty">
            Invoices appear here after your first payment.
          </p>
        ) : (
          <table className="dash-table">
            <thead>
              <tr>
                <th scope="col">Invoice</th>
                <th scope="col">Billed</th>
                <th scope="col">Period</th>
                <th scope="col" className="dash-table__num">
                  Amount
                </th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="dash-sr">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <th scope="row" data-label="Invoice">
                    {inv.number || "Invoice"}
                  </th>
                  <td data-label="Billed">{formatDate(inv.createdAt)}</td>
                  <td data-label="Period">
                    {inv.periodStart && inv.periodEnd
                      ? `${formatDate(inv.periodStart)} – ${formatDate(inv.periodEnd)}`
                      : "—"}
                  </td>
                  <td data-label="Amount" className="dash-table__num">
                    {formatMoney(inv.total, inv.currency)}
                    {inv.amountPaid > 0 && inv.amountPaid !== inv.total ? (
                      <small>
                        Paid {formatMoney(inv.amountPaid, inv.currency)}
                      </small>
                    ) : null}
                  </td>
                  <td data-label="Status">
                    <StatusMark tone={invoiceTone(inv.status)}>
                      {inv.status
                        ? inv.status.charAt(0).toUpperCase() +
                          inv.status.slice(1).replaceAll("_", " ")
                        : "—"}
                    </StatusMark>
                  </td>
                  <td className="dash-table__actions">
                    {inv.invoicePdfUrl ? (
                      <a
                        href={`/dashboard/billing/invoice/${inv.id}.pdf`}
                        className="dash-btn dash-btn--line dash-btn--sm"
                      >
                        Download PDF
                      </a>
                    ) : null}
                    {inv.hostedInvoiceUrl ? (
                      <a
                        href={inv.hostedInvoiceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="dash-link"
                      >
                        View online
                        <ExternalIcon />
                      </a>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
