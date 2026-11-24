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

Staff sign in at **`/admin/login`** (separate from customer `/get-started/account?mode=login`). Unauthenticated `/admin` requests redirect there. Customers who attempt staff sign-in are rejected without receiving a session cookie.

## Admin modules (shipped)

| Module | Route | Notes |
| --- | --- | --- |
| Staff login | `/admin/login` | Staff-only; customers redirected away |
| Overview | `/admin` | Ops snapshot |
| Clients | `/admin/clients` | Search, live/not-live, attention filters |
| Client folder | `/admin/clients/:orgId` | Brief, mark live/preview, mailbox, notify, billing; permanent delete (owner/admin) |
| Ops tasks | `/admin/ops` | GBP weekly + domain renewal reminders (manual generate; no auto-publish/purchase) |
| Subscriptions | `/admin/subscriptions` | Stripe-synced status |
| Orders | `/admin/orders` | Pending order funnel |
| Domains | `/admin/domains` | Manual registration queue + renews-at date |
| Transfers | `/admin/transfers` | Cancel → asset transfer tracking |
| Support | `/admin/support` | Tickets |
| Notifications | `/admin/notifications` | Staff feed |
| Images | `/admin/media` | Upload review |
| Team | `/admin/team` | Owner/administrator: create staff, grant roles, create customers |
| MFA | `/admin/security/mfa` | QR + manual key enrollment, recovery codes |

## Audit logs

Sensitive actions write to `audit_logs` (mark live, preview, mailbox upsert, org status, permanent delete, ops task changes, domain renews-at, staff/customer create). Passwords are redacted. Permanent delete requires typing the trading name and is limited to platform owners / administrators; active Stripe subscriptions must be cancelled first.

## Domain & GBP ops

- Domains are **never** purchased automatically.
- Set renews-at on the Domains queue; generate renewal reminder tasks from Ops.
- Generate this week’s GBP post/review tasks from Ops; complete/cancel manually.
- No “Auto Register” or “Auto Publish” controls.

## Deploy discipline

Apply D1 migrations before Worker deploy. `/api/health` returns 503 if required tables (including `ops_tasks`) are missing. See `docs/PRODUCTION_DEPLOYMENT.md`.
