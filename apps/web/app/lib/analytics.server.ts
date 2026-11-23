import { createDb, desc, productEvents, sql } from "@iwfw/db";
import { newId } from "./ids";

type Db = ReturnType<typeof createDb>;

export const PRODUCT_EVENT_NAMES = [
  "signup_completed",
  "checkout_started",
  "checkout_completed",
  "activation_completed",
  "subscription_cancelled",
  "subscription_resumed",
  "payment_failed",
  "website_preview_shared",
  "website_marked_live",
] as const;

export type ProductEventName = (typeof PRODUCT_EVENT_NAMES)[number];

/** Fire-and-forget style insert; callers may await. Never throws to caller. */
export async function trackProductEvent(
  db: Db,
  input: {
    name: ProductEventName | string;
    organisationId?: string | null;
    userId?: string | null;
    properties?: Record<string, unknown> | null;
  },
): Promise<void> {
  try {
    await db.insert(productEvents).values({
      id: newId("evt"),
      name: input.name,
      organisationId: input.organisationId ?? null,
      userId: input.userId ?? null,
      propertiesJson: input.properties
        ? JSON.stringify(input.properties)
        : null,
    });
  } catch {
    // Analytics must not break product flows.
  }
}

export async function summariseProductEvents(db: Db, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      name: productEvents.name,
      count: sql<number>`count(*)`,
    })
    .from(productEvents)
    .where(sql`${productEvents.createdAt} >= ${since.getTime()}`)
    .groupBy(productEvents.name)
    .all();

  const recent = await db
    .select()
    .from(productEvents)
    .orderBy(desc(productEvents.createdAt))
    .limit(20)
    .all();

  return {
    days,
    counts: Object.fromEntries(rows.map((r) => [r.name, Number(r.count)])),
    recent: recent.map((r) => ({
      id: r.id,
      name: r.name,
      organisationId: r.organisationId,
      userId: r.userId,
      createdAt: r.createdAt ? r.createdAt.toISOString() : null,
    })),
  };
}

export function estimateMonthlyProfitPence(options: {
  planMonthlyPence: number;
  domainAnnualPence: number;
  mailboxMonthlyPence: number;
  hostingMonthlyPence: number;
  otherMonthlyPence: number;
}): {
  revenuePence: number;
  costMonthlyPence: number;
  profitMonthlyPence: number;
} {
  const domainMonthly = Math.round(options.domainAnnualPence / 12);
  const costMonthlyPence =
    domainMonthly +
    options.mailboxMonthlyPence +
    options.hostingMonthlyPence +
    options.otherMonthlyPence;
  return {
    revenuePence: options.planMonthlyPence,
    costMonthlyPence,
    profitMonthlyPence: options.planMonthlyPence - costMonthlyPence,
  };
}
