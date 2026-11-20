# Onboarding Flow

## Goals

Guided multi-step onboarding after first successful payment. Progress saved so customers can return later. Collect everything needed for website production, domain ops, email, and GBP — without purchasing domains automatically.

## Preconditions

- Authenticated customer membership.
- Organisation with active (or trialing if ever added) website entitlement from Stripe webhook.
- If unpaid / incomplete Checkout → redirect to billing, not onboarding.

## Steps

### 1. Business information

- Business name
- Registered company name (if different)
- Contact person name
- Phone, email
- Business address
- Service areas
- Companies House number (optional)
- Business description

### 2. Services

- Service list + descriptions
- Optional prices
- Main service locations
- Special offers
- Unique selling points

### 3. Branding

- Logo, photos, videos → private R2 via signed upload
- Brand colours
- Social profiles
- Example websites they like

### 4. Website preferences

- Preferred style
- Required pages
- Contact form / quote form
- WhatsApp button
- Testimonials
- Existing website details

### 5. Domain

**New domain**

1. Enter preferred name; check live availability/price via registrar **check API** (`.com` / `.co.uk` only).
2. Block premium / over £15 reg or renew quote (configurable ceilings).
3. Customer selects candidate and acknowledges: **“Selecting a domain does not reserve or guarantee it. Our team will purchase it after payment confirmation, subject to final availability.”**
4. Collect **customer registrant details** (legal name/org, address, email, phone) for use **wherever the registrar supports customer-as-registrant**.
5. Save `domain_requests` status `requested`; create admin task when payment already confirmed (always post-Checkout).

**Existing domain**

- Enter domain; keep registrar; DNS instruction checklist; request assisted setup; optional delegated access notes.
- Never overwrite MX/SPF/DKIM/DMARC without explicit authorisation later.

### 6. Email

- Preferred mailbox local-part
- Existing email provider?
- Migration required?
- If existing provider: `mx_overwrite_approved` default false

### 7. Google Business Profile

- Existing profile URL?
- Instructions to invite designated company Google account as **Manager**
- Permission / approval preferences for posts and review replies
- Track access status (manual verification by VA/admin — no fake API claims)

### 8. Rank tracking (conditional)

Show **only if**:

1. Feature operational (`rank_tracking_checkout_enabled` or entitlement already active), **and**
2. Organisation has `rank_tracking` entitlement.

Collect up to five keywords, target location/centre point, website/GBP identifiers for matching Maps results.

If add-on not purchased/enabled: skip section; do not soft-sell unfinished product in onboarding.

## Save & resume

- Persist section drafts to `onboarding_profiles.data_json` after each step.
- `current_step` index; allow backward navigation.
- Completeness checklist for admin “ready for build”.

## Notifications

- Customer: progress reminders (Cron) if incomplete after N days.
- Admin: onboarding submitted / domain request ready.

## Security

- Turnstile optional on heavy public endpoints; authenticated onboarding uses session + CSRF/same-site.
- Validate file types/sizes; virus-scan strategy TBD (OPEN); store only under org prefix in R2.
