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

### 7. Google Business Profile (dedicated step)

This is a full onboarding step (not a footnote). Full product rules live in [GOOGLE_BUSINESS_MANAGEMENT.md](./GOOGLE_BUSINESS_MANAGEMENT.md).

**Always show**

- The platform’s **configurable Google Manager email** (`GBP_MANAGER_EMAIL`), copyable.
- Explicit rule: invite us as **Manager**, **not Owner**.

**Step-by-step invite instructions** (on-screen numbered list)

1. Open Google Business Profile as the profile owner.
2. Open Users / Managers.
3. Add user → paste the Manager email shown above.
4. Choose role **Manager** (not Owner).
5. Send the invitation.
6. Return to this page and confirm.

**Customer outcomes (required UI choices)**

| Action | Result |
| --- | --- |
| **I’ve sent the invitation** | Status → **Invitation Sent**; store claim timestamp; **notify admins**; create staff “accept invite” task. Does **not** mean Connected/verified. |
| **I need help** | Status stays **Action Required** (`help_requested`); create support/VA assist task; notify admins. |
| **I don’t have a Google Business Profile** | Status **Action Required** (`no_profile`); create assisted profile-setup task; notify admins. |

Also collect:

- Existing profile URL (optional if no profile).
- Preference: VA may publish posts/replies directly vs customer approval required.

**Verification rule (mandatory copy near confirmation)**

> Clicking “I’ve sent the invitation” tells our team to look for your invite. Access is only marked Connected after our team accepts the invitation in Google and confirms Manager access.

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
- Admin/VA: **immediately** when customer submits GBP “I’ve sent the invitation”, “I need help”, or “I don’t have a Google Business Profile”.

## Security

- Turnstile optional on heavy public endpoints; authenticated onboarding uses session + CSRF/same-site.
- Validate file types/sizes; virus-scan strategy TBD (OPEN); store only under org prefix in R2.
