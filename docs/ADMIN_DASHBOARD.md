# Admin & VA Dashboards

## Roles (server-side RBAC)

| Role | Scope |
| --- | --- |
| Platform Owner | Full access + feature flags + financials |
| Administrator | Customers, billing ops, domains, staff assignment |
| Website Developer | Website projects, previews, content, deploys |
| GBP Manager | GBP tasks, drafts, evidence |
| Support Agent | Tickets, limited customer read |
| Customer | Customer dashboard only |

VA accounts typically use GBP Manager and/or Support Agent — never Platform Owner by default.

## Admin modules

- Customer management (org, users, status)
- Subscriptions & entitlements (read + limited manual grants)
- Onboarding progress
- **Domain purchase queue** (manual buy checklist, recheck, record purchase)
- **Domain renewal queue** (60/30/14/7 day tasks, escalation)
- Email provisioning status
- Website projects & deploy status
- GBP invite acceptance queue (`Invitation Sent` → manual verify → `Connected`)
- GBP help / no-profile assist queue
- GBP task board (weekly posts, review replies, evidence, activity logs)
- Rank tracking subscriptions & DataForSEO usage (when live)
- Staff management
- Support tickets
- Financial reporting (MRR, churn, domain COGS)
- Activity / audit logs
- Notifications / overdue views
- Feature flags (`rank_tracking_checkout_enabled`)

## Domain ops UI (critical)

For each purchase task show:

- Domain, org, payment status, registrant JSON
- Last check result (availability, tier, prices)
- Buttons: Recheck, Mark Customer Action Required, Record Purchased, Mark Failed
- **No** “Auto Register” control

Renewal queue sorted by expiry; SLA badges (red if <7 days and incomplete).

## Cancelled-during-build queue

List websites with `cancelled_before_complete` for capacity and courtesy follow-up.

## New customer notification

On first `invoice.paid` / Checkout completed: notify Platform Owner + Admin (email + in-app).
