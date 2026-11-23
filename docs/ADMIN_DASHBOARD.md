# Admin & VA Dashboards

## Roles (server-side RBAC)

| Role | Scope |
| --- | --- |
| Platform Owner | Full access + feature flags |
| Administrator | Customers, billing ops, domains |
| Website Developer | Website projects, previews |
| GBP Manager | GBP tasks |
| Support Agent | Tickets, limited customer read |
| Customer | Customer dashboard only |

Staff must enroll MFA before using `/admin` (except `/admin/security/mfa`).

## Admin modules (shipped)

| Module | Route | Notes |
| --- | --- | --- |
| Overview | `/admin` | Ops snapshot |
| Clients | `/admin/clients` | Search, live/not-live, attention filters |
| Client folder | `/admin/clients/:orgId` | Brief, mark live/preview, mailbox, notify, billing |
| Ops tasks | `/admin/ops` | GBP weekly + domain renewal reminders (manual generate; no auto-publish/purchase) |
| Subscriptions | `/admin/subscriptions` | Stripe-synced status |
| Orders | `/admin/orders` | Pending order funnel |
| Domains | `/admin/domains` | Manual registration queue + renews-at date |
| Transfers | `/admin/transfers` | Cancel → asset transfer tracking |
| Support | `/admin/support` | Tickets |
| Notifications | `/admin/notifications` | Staff feed |
| Images | `/admin/media` | Upload review |
| MFA | `/admin/security/mfa` | QR + manual key enrollment, recovery codes |

## Audit logs

Sensitive actions write to `audit_logs` (mark live, preview, mailbox upsert, org status, ops task changes, domain renews-at). Passwords are redacted.

## Domain & GBP ops

- Domains are **never** purchased automatically.
- Set renews-at on the Domains queue; generate renewal reminder tasks from Ops.
- Generate this week’s GBP post/review tasks from Ops; complete/cancel manually.
- No “Auto Register” or “Auto Publish” controls.

## Deploy discipline

Apply D1 migrations before Worker deploy. `/api/health` returns 503 if required tables (including `ops_tasks`) are missing. See `docs/PRODUCTION_DEPLOYMENT.md`.
