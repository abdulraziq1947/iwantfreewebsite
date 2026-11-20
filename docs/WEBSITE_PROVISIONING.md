# Website Provisioning

## Principles

- Reusable **industry templates**; do not create a unique codebase per customer when a template suffices.
- **Separate content from template source**: content in D1 (versioned revisions); templates in `templates/*` git.
- Each customer site is independently deployable/previewable.
- Company retains IP in templates/source; customer owns their content/media — see ownership section.

## Ownership & transfer (**legal / business approval required**)

| Asset | Rule |
| --- | --- |
| Customer copy, logos, photos, videos | Customer-owned; exportable |
| Template code, design system, shared components | Company IP |
| Hosting | Subscription service |
| Full source-code / website transfer package | **OPEN — must not be auto-promised in UI until approved** |

Mark all customer-facing transfer claims as contingent on published Terms after legal review.

## Template library

Industries at minimum: plumbers, electricians, roofers, cleaners, fencing, generic trades.

Each template provides:

- Page shells (Home, Services, About, Contact, Quote, Gallery, Testimonials as needed)
- Slots for content JSON
- Contact/quote form endpoints → platform lead API
- WhatsApp button optional
- Accessible, responsive, SEO defaults (titles, schema.org LocalBusiness where appropriate)

## Production pipeline

```mermaid
flowchart LR
  Onboard[Onboarding_complete] --> Project[Create_website_project]
  Project --> Fill[Populate_content]
  Fill --> Preview[Deploy_preview]
  Preview --> Approve[Customer_approval]
  Approve --> Live[Deploy_live]
  Live --> Domain[Attach_domain]
  Domain --> SSL[SSL_verify]
```

1. Admin/developer assigns template.
2. Structured content editor (admin) + customer-supplied onboarding data.
3. Preview URL on platform subdomain.
4. Customer approves in dashboard.
5. Promote to live; connect domain (DNS task).
6. Forms post to platform Worker → notify customer email + dashboard leads.
7. Revisions stored in `website_revisions`.
8. Updates via change-request tickets → new revision → preview → approve → promote.

## MVP hosting architecture

Per [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md):

- **MVP:** Workers Static Assets + content resolution; preview hostnames on our zone; live DNS for domains we control on Cloudflare — **Cloudflare for SaaS not required**.
- **Later:** Cloudflare for SaaS for external-DNS vanity hostnames at scale.

## Cancel before completion

If subscription cancelled during build:

- Set `cancelled_before_complete`.
- Stop further production work (see [CUSTOMER_JOURNEY.md](./CUSTOMER_JOURNEY.md)).
- Keep content/uploads for export through retention window.
- Do not deploy live after cancel confirmation unless reactivated.

## Export

- Content JSON + media zip via signed R2 links (admin or customer self-serve later).
- Source-code handover only under approved transfer product.

## Lead handling

- Turnstile on public forms.
- Rate limit per IP/domain.
- Store leads under `organisation_id`; email notification.
- Never share leads across tenants.
