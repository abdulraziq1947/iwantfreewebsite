# Rank Tracking (DataForSEO)

## Commercial

- Optional add-on **£9.99/month**
- Max **5 keywords**
- Weekly Google **organic** + Google **Maps** checks
- One standard **3×3** Maps ranking grid
- History/charts in customer dashboard
- Activate/cancel independently of core plan

## Hard gate — do not sell early

Rank tracking **must not be purchasable** until operational:

| Control | Requirement |
| --- | --- |
| Feature flag `rank_tracking_checkout_enabled` | Default **false** |
| Stripe Checkout | Omit add-on Price unless flag true |
| Dashboard upsell | Hidden unless flag true |
| Marketing pages | No “buy tracking” CTA until flag true (may say “coming soon” only if marketing approves) |
| Onboarding section | Only if entitlement active |
| Enabling flag | Requires staging soak + acceptance tests + Platform Owner approval |

## DataForSEO (verified pricing basis)

Documented Standard queue base prices (subject to DataForSEO’s live pricing pages):

- Google Organic: **$0.0006** per SERP (10 results) Standard
- Google Maps: **$0.0006** per SERP (up to 100 results) Standard

Prefer **Standard task_post + polling/webhook** over Live for cost efficiency.

Maps grid: one task per `location_coordinate` (`lat,lng,zoom`). Batch multiple tasks per POST (API allows up to 100 tasks per request).

Identify listings via place id / title+domain matching stored on `rank_projects`.

## Default 3×3 grid

- Centre: customer target lat/lng (from onboarding)
- Spacing default: **805 m (0.5 mile)** between adjacent points — admin-configurable metres at project setup
- Nine fixed points; immutable after first successful weekly job unless admin resets with customer acknowledgement (history continuity)
- Locked settings: `language_code=en`, `se_domain=google.co.uk`, `device=mobile`, zoom e.g. `15z`

## Scheduling

```mermaid
flowchart LR
  Cron[Weekly_Cron] --> Q[Queue_rank_jobs]
  Q --> Post[DataForSEO_task_post]
  Post --> Poll[Poll_or_callback]
  Poll --> Store[Store_results_D1]
  Store --> Ledger[api_usage_ledger]
```

- Cron enqueues one job set per enabled project with active entitlement.
- Retries with exponential backoff; dead-letter queue + admin alert.
- Distinguish `result_type` = `organic` | `maps` in UI and schema.

## Cost controls

- Per-org monthly API budget (default soft cap with kill switch).
- Global daily spend alert.
- Depth defaults minimal (organic depth 10; maps depth ≤ 100).
- No operator keywords that multiply cost ×5 unless explicitly approved.
- Estimated cost ~**$0.12/customer/month** at 5 KW weekly organic + 9 maps points (50 Standard tasks/week) before retries — monitor actuals.

## Estimated monthly usage per customer

| Check | Tasks/week | Tasks/month (~4.3) |
| --- | --- | --- |
| Organic × 5 KW | 5 | ~22 |
| Maps 3×3 × 5 KW | 45 | ~194 |
| **Total** | **50** | **~215** |

## Cancellation

When add-on cancelled: finish current paid period jobs optional (prefer stop at period end); retain history per retention; no further API calls.
