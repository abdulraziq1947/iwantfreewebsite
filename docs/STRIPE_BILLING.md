# Stripe Billing

## Products & prices (server-side only)

| Key | Amount | Role |
| --- | --- | --- |
| `website_monthly` | £39.99 / month | Mandatory core |
| `rank_tracking_monthly` | £9.99 / month | Optional add-on |

Store Stripe Price IDs in Worker secrets / env — never accept client-submitted amounts or price IDs without allowlist check.

## Feature gate — rank tracking

Checkout and in-dashboard “add tracking” **must** check feature flag `rank_tracking_checkout_enabled` (KV or `feature_flags` table).

- Flag **false** (default until Phase 7 complete): Checkout Session includes **only** website price. UI hides add-on.
- Flag **true**: optional unchecked checkbox; Session may include both line items.

## Checkout flow

1. Authenticated (or signup-then-checkout) user.
2. Server creates Stripe Customer if needed; links `organisations.stripe_customer_id`.
3. Create Checkout Session in `subscription` mode with allowlisted Price IDs.
4. Custom text: no minimum contract; cancel anytime; end of billing period; ownership summary links to Terms.
5. Success URL → onboarding; cancel URL → pricing/billing.

## Webhooks (idempotent)

Verify `Stripe-Signature`. Persist `stripe_events.stripe_event_id` uniquely before side effects.

Handle at minimum:

| Event | Action |
| --- | --- |
| `checkout.session.completed` | Ensure org, subscription rows, entitlements |
| `customer.subscription.created/updated` | Sync status, period end, items, cancel_at_period_end |
| `customer.subscription.deleted` | End entitlements at period boundary logic |
| `invoice.paid` | Refresh entitlement validity; unlock domain purchase tasks |
| `invoice.payment_failed` | Mark past_due; notify customer; dunning policy |
| `charge.dispute.created` | Freeze risky provisioning; alert admins |

## Entitlements mapping

| Stripe item | Entitlement keys |
| --- | --- |
| website_monthly active | `website_hosting`, `email`, `gbp`, `domain_renewal_cover` |
| rank_tracking_monthly active | `rank_tracking` |

Entitlements remain valid through `current_period_end` when `cancel_at_period_end` is set.

## Cancellation

- In-app: set Stripe subscription `cancel_at_period_end=true`.
- Show effective date.
- No ETF; no remaining-month clawback automation.
- No automatic prorated refunds for voluntary cancel.
- Add-on removable independently (delete subscription item or separate subscription — prefer **single subscription with items** for one tax invoice).

## Reactivation

- Clear `cancel_at_period_end` if still in period.
- Else new Checkout.

## Payment failures

1. Stripe retries per dashboard settings.
2. Email customer; banner in dashboard.
3. After grace (configurable, e.g. 7–14 days past_due): suspend hosting entitlement and pause GBP/rank jobs; **do not** auto-delete domain.
4. Admin can grant manual goodwill extension via entitlements `source=manual_grant` (audited).

## Customer billing management

- View plan, next payment, invoices (Stripe-hosted URLs or Customer Portal).
- Update payment method via Portal or SetupIntent.
- Prefer: **in-app status + Stripe Customer Portal** for card updates (decide final UX in OPEN_QUESTIONS).

## Security

- Webhook secret per environment.
- Restrict Portal configuration (no accidental price switching to arbitrary products).
- Admin Stripe actions audited.
