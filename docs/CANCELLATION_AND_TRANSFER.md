# Cancellation & asset ownership policy (confirmed)

**Status:** Confirmed for implementation. Do not re-open without explicit change.

## Customer cancellation

1. Customers can cancel anytime — **no minimum commitment**, **no cancellation penalty**.
2. Subscription remains active until the **end of the current paid billing period**.
3. Stripe must be configured so **no further renewals** occur after that date (`cancel_at_period_end`).
4. Customer cancels from the **dashboard** (once Stripe is connected).

## Ownership & transfer

5. The customer **retains ownership** of website and domain assets, subject to the Terms.
6. Transfers are **manual** — do **not** build automated asset transfer.
7. When cancellation is scheduled, **automatically create an internal asset transfer task**.
8. Notify the **admin team** and show transfer status in the **customer dashboard**.
9. Transfer progress: `pending` → `in_progress` → `completed`.
10. On completion: record **completion date** and **notify the customer**.

## Preservation

- Do **not** automatically delete websites, domains, emails or customer files when a subscription ends.
- Preserve assets until manual transfer is completed (or the customer instructs otherwise in writing).

## Messaging constraints

- Explain the manual transfer process in cancellation confirmation and Terms.
- Do **not** promise an exact transfer timeframe until an operational SLA is published.
- Do **not** deploy or modify production billing without approval.

## Planned data (Stage C/D — additive migration, not applied to production without approval)

Suggested table `asset_transfer_tasks`:

| Column | Notes |
| --- | --- |
| `id` | Primary key |
| `organisation_id` | FK, authorised via membership |
| `subscription_id` | Local subscriptions row / Stripe id |
| `status` | `pending` \| `in_progress` \| `completed` |
| `scheduled_at` | When cancel-at-period-end was set |
| `period_end_at` | Access/billing end |
| `completed_at` | Nullable |
| `admin_notes` | Internal |
| `created_at` / `updated_at` | Timestamps |

Admin notification: email (Resend) + admin UI list. Customer notification on `completed`.
