import { createDb, eq, organisationCosts } from "@iwfw/db";
import { WEBSITE_PLAN_UNIT_AMOUNT } from "./stripe.server";
import { estimateMonthlyProfitPence } from "./analytics.server";

type Db = ReturnType<typeof createDb>;

export async function getOrganisationCostEstimate(
  db: Db,
  organisationId: string,
) {
  const row = await db
    .select()
    .from(organisationCosts)
    .where(eq(organisationCosts.organisationId, organisationId))
    .get();
  const costs = {
    domainAnnualPence: row?.domainAnnualPence ?? 0,
    mailboxMonthlyPence: row?.mailboxMonthlyPence ?? 0,
    hostingMonthlyPence: row?.hostingMonthlyPence ?? 0,
    otherMonthlyPence: row?.otherMonthlyPence ?? 0,
    notes: row?.notes ?? null,
  };
  const estimate = estimateMonthlyProfitPence({
    planMonthlyPence: WEBSITE_PLAN_UNIT_AMOUNT,
    ...costs,
  });
  return { ...costs, ...estimate };
}

export async function upsertOrganisationCosts(
  db: Db,
  organisationId: string,
  input: {
    domainAnnualPence: number;
    mailboxMonthlyPence: number;
    hostingMonthlyPence: number;
    otherMonthlyPence: number;
    notes?: string | null;
  },
) {
  const now = new Date();
  const existing = await db
    .select()
    .from(organisationCosts)
    .where(eq(organisationCosts.organisationId, organisationId))
    .get();
  const values = {
    organisationId,
    domainAnnualPence: Math.max(0, Math.round(input.domainAnnualPence)),
    mailboxMonthlyPence: Math.max(0, Math.round(input.mailboxMonthlyPence)),
    hostingMonthlyPence: Math.max(0, Math.round(input.hostingMonthlyPence)),
    otherMonthlyPence: Math.max(0, Math.round(input.otherMonthlyPence)),
    notes: input.notes?.trim() || null,
    updatedAt: now,
  };
  if (existing) {
    await db
      .update(organisationCosts)
      .set(values)
      .where(eq(organisationCosts.organisationId, organisationId));
  } else {
    await db.insert(organisationCosts).values(values);
  }
  return { ok: true as const };
}

export function penceFromPoundsInput(raw: FormDataEntryValue | null): number {
  const n = Number(String(raw ?? "").trim());
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}
