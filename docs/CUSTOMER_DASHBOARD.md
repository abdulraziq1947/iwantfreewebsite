# Customer Dashboard

## Access

- Authenticated users with `customer` membership on an organisation.
- Server-side checks: session + organisation scope on every loader/action.
- Customers never see other organisations’ data.

## Navigation (shipped)

| Area | Route | Contents |
| --- | --- | --- |
| Overview | `/dashboard` | Journey stages, status banner, attention board, SLA copy, website switcher |
| Website | `/dashboard/website` | Preview/live URLs + **New website** + multi-site list/select |
| Images | `/dashboard/media` | Uploads scoped to the selected website (`?org=` / cookie) |
| Billing | `/dashboard/billing` | Plan, invoices, Stripe Customer Portal (card), cancel/resume, transfer status |
| Domain | `/dashboard/domain` | Requested domain + staff-owned status (per selected website) |
| Email | `/dashboard/email` | Preference + mailbox credentials with Show/Copy (per website) |
| Google Business | `/dashboard/google-business` | Manager invite / status for the selected website |
| Support | `/dashboard/support` | Tickets |
| Notifications | `/dashboard/notifications` | In-app feed |
| Account | `/dashboard/account` | Profile + password reset link |

`/dashboard/onboarding` redirects to Overview (Progress nav removed).

## Billing UX copy

- “£39.99/month. No minimum contract. Cancel anytime.”
- Cancel schedules end of current paid period; resume available until then.
- Payment method updates go through Stripe Customer Portal.
- Rank add-on purchase button **absent** (feature flag off).

## Multiple websites

- Each paid organisation is a separate website.
- Customers pick the active website with the switcher (`?org=` persisted in `iwfw_active_org`).
- Images and Google Business updates always save against the selected website so staff see the right client folder.

## Google Business

- Customer confirms Manager invite / help needed **per website**.
- Staff track weekly posts and review replies on `/admin/ops` — customers do not see an automated post history yet.
- Attention items for GBP are deferred until the website is live.
- Admin client folders and `/admin/media` label assets with the website trading name.

## Website preview & live

- Staff set `preview_url` before go-live; customer opens Preview CTA.
- Staff mark live separately (`live_url` + `connected`); customer gets congratulations notification.
- Soft go-live window from `GO_LIVE_SLA_LABEL` (default “5–10 working days”) — not a hard SLA.

## Accessibility & mobile

- Primary use on phones — large tap targets, simple language.
- Desktop public topbar includes Log in for logged-out visitors.
