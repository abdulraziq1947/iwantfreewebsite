# Customer Dashboard

## Access

- Authenticated users with `customer` membership on an organisation.
- Server-side checks: session + `organisation_id` scope on every loader/action.
- Customers never see other organisations’ data.

## Sections

| Area | Contents |
| --- | --- |
| Overview | Status chips: website, domain, email, GBP, billing |
| Website | Progress, preview link, live link, change requests, approvals |
| Domain | Requested name, status timeline, expiry, renewal info, DNS help |
| Email | Provisioning status, webmail instructions, quota |
| Google Business | Status **Action Required** / **Invitation Sent** / **Connected**; Manager email + invite steps; help / no-profile actions; weekly post + review reply history with evidence (staff-recorded, not API-verified) |
| Rank tracking | **Only if entitlement active**; charts organic vs maps; else hidden or “not included” |
| Billing | Plan, next bill, cancel anytime CTA, invoices, payment method |
| Support | Tickets |
| Files | Uploads list + upload |
| Business info | Edit profile fields (re-queues review if live site) |
| Notifications | In-app feed |

## Billing UX copy

- “£39.99/month. No minimum contract. Cancel anytime.”
- Cancel flow shows effective date and offboarding facts.
- Rank add-on purchase button **absent** unless feature flag enabled.

## Google Business status rules

- **Action Required** — invite not done, help requested, no profile, or blocked.
- **Invitation Sent** — customer self-reported invite; awaiting staff acceptance. Copy must state confirmation is pending.
- **Connected** — only after admin/VA **manual** accept + verify in Google. Never set Connected from the customer confirmation click alone.

## Cancel-before-complete UX

If website `cancelled_before_complete`:

- Clear message that production is paused/stopped.
- Export/download content available.
- Reactivate CTA if still within policies.

## Accessibility & mobile

- Primary use on phones by tradespeople — large tap targets, simple language, minimal jargon.
