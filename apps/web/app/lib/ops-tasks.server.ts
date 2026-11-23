import {
  and,
  createDb,
  desc,
  eq,
  inArray,
  organisations,
  opsTasks,
  domainRegistrationTasks,
  onboardingProfiles,
} from "@iwfw/db";
import { newId } from "./ids";
import { parseOnboardingData } from "./onboarding";

type Db = ReturnType<typeof createDb>;

export const OPS_TASK_KINDS = [
  "gbp_weekly_post",
  "gbp_review_reply",
  "domain_renewal",
  "website_overdue",
  "other",
] as const;

export type OpsTaskKind = (typeof OPS_TASK_KINDS)[number];

function startOfUtcWeek(d = new Date()): Date {
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diff),
  );
  return monday;
}

function endOfUtcWeek(d = new Date()): Date {
  const start = startOfUtcWeek(d);
  return new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
}

/** Create this week's GBP post/reply tasks for live orgs (idempotent per week). */
export async function ensureWeeklyGbpTasks(db: Db) {
  const weekStart = startOfUtcWeek();
  const weekEnd = endOfUtcWeek();
  const weekLabel = weekStart.toISOString().slice(0, 10);

  const liveDomains = await db
    .select()
    .from(domainRegistrationTasks)
    .where(eq(domainRegistrationTasks.status, "connected"))
    .all();
  const orgIds = [...new Set(liveDomains.map((t) => t.organisationId))];
  if (orgIds.length === 0) {
    return { created: 0, skipped: 0 };
  }

  const orgs = await db
    .select()
    .from(organisations)
    .where(inArray(organisations.id, orgIds))
    .all();
  const profiles = await db
    .select()
    .from(onboardingProfiles)
    .where(inArray(onboardingProfiles.organisationId, orgIds))
    .all();
  const profileByOrg = new Map(
    profiles.map((p) => [p.organisationId, parseOnboardingData(p.dataJson)]),
  );

  const existing = await db
    .select()
    .from(opsTasks)
    .where(
      and(
        inArray(opsTasks.organisationId, orgIds),
        inArray(opsTasks.kind, ["gbp_weekly_post", "gbp_review_reply"]),
      ),
    )
    .all();

  let created = 0;
  let skipped = 0;
  const now = new Date();

  for (const org of orgs) {
    if (org.status === "cancelled" || org.status === "churned") continue;
    const data = profileByOrg.get(org.id);
    // Prefer orgs that confirmed GBP access; still queue for live sites.
    const hasGbp = Boolean(data?.gbp.accessGranted || data?.gbp.outcome);

    for (const kind of ["gbp_weekly_post", "gbp_review_reply"] as const) {
      const already = existing.some(
        (t) =>
          t.organisationId === org.id &&
          t.kind === kind &&
          t.dueAt &&
          t.dueAt >= weekStart &&
          t.dueAt <= weekEnd &&
          t.status !== "cancelled",
      );
      if (already) {
        skipped += 1;
        continue;
      }
      if (!hasGbp && kind === "gbp_review_reply") {
        skipped += 1;
        continue;
      }
      await db.insert(opsTasks).values({
        id: newId("ops"),
        organisationId: org.id,
        kind,
        status: "pending",
        title:
          kind === "gbp_weekly_post"
            ? `Weekly Google Business post · week of ${weekLabel}`
            : `Reply to Google reviews · week of ${weekLabel}`,
        notes: hasGbp
          ? null
          : "GBP Manager access not confirmed — confirm access before posting.",
        dueAt: weekEnd,
        createdAt: now,
        updatedAt: now,
      });
      created += 1;
    }
  }

  return { created, skipped };
}

/** Create domain renewal reminder tasks for renewsAt within the next N days. */
export async function ensureDomainRenewalTasks(
  db: Db,
  options?: { withinDays?: number },
) {
  const withinDays = options?.withinDays ?? 60;
  const now = new Date();
  const horizon = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);

  const tasks = await db.select().from(domainRegistrationTasks).all();
  const due = tasks.filter(
    (t) =>
      t.renewsAt &&
      t.renewsAt >= now &&
      t.renewsAt <= horizon &&
      t.status !== "cancelled",
  );
  if (due.length === 0) return { created: 0, skipped: 0 };

  const orgIds = due.map((t) => t.organisationId);
  const existing = await db
    .select()
    .from(opsTasks)
    .where(
      and(
        inArray(opsTasks.organisationId, orgIds),
        eq(opsTasks.kind, "domain_renewal"),
        inArray(opsTasks.status, ["pending", "in_progress"]),
      ),
    )
    .all();

  let created = 0;
  let skipped = 0;
  for (const task of due) {
    const already = existing.some(
      (t) =>
        t.organisationId === task.organisationId &&
        t.notes?.includes(task.domainName),
    );
    if (already) {
      skipped += 1;
      continue;
    }
    const renews = task.renewsAt!;
    await db.insert(opsTasks).values({
      id: newId("ops"),
      organisationId: task.organisationId,
      kind: "domain_renewal",
      status: "pending",
      title: `Domain renewal — ${task.domainName}`,
      notes: `Renew by ${renews.toISOString().slice(0, 10)}. Do not auto-purchase — confirm with customer if needed.`,
      dueAt: renews,
      createdAt: now,
      updatedAt: now,
    });
    created += 1;
  }
  return { created, skipped };
}

export async function listOpenOpsTasks(db: Db) {
  const [rows, orgs] = await Promise.all([
    db
      .select()
      .from(opsTasks)
      .where(inArray(opsTasks.status, ["pending", "in_progress"]))
      .orderBy(desc(opsTasks.dueAt))
      .all(),
    db.select().from(organisations).all(),
  ]);
  const orgName = new Map(orgs.map((o) => [o.id, o.tradingName]));
  return rows.map((t) => ({
    id: t.id,
    organisationId: t.organisationId,
    tradingName: orgName.get(t.organisationId) ?? "Unknown",
    kind: t.kind,
    status: t.status,
    title: t.title,
    notes: t.notes,
    dueAt: t.dueAt ? t.dueAt.toISOString() : null,
    createdAt: t.createdAt ? t.createdAt.toISOString() : null,
  }));
}

export async function updateOpsTaskStatus(
  db: Db,
  taskId: string,
  status: "pending" | "in_progress" | "done" | "cancelled",
) {
  const now = new Date();
  await db
    .update(opsTasks)
    .set({
      status,
      completedAt: status === "done" ? now : null,
      updatedAt: now,
    })
    .where(eq(opsTasks.id, taskId));
  return { ok: true as const };
}

export async function setDomainRenewsAt(
  db: Db,
  taskId: string,
  renewsAt: Date | null,
) {
  await db
    .update(domainRegistrationTasks)
    .set({ renewsAt, updatedAt: new Date() })
    .where(eq(domainRegistrationTasks.id, taskId));
  return { ok: true as const };
}

/**
 * Flag paid sites still not live after the soft SLA window (default 10 days).
 * Creates website_overdue ops tasks — does not change customer-facing promises.
 */
export async function ensureOverdueWebsiteTasks(
  db: Db,
  options?: { afterDays?: number },
) {
  const afterDays = options?.afterDays ?? 10;
  const cutoff = new Date(Date.now() - afterDays * 24 * 60 * 60 * 1000);

  const orgs = await db
    .select()
    .from(organisations)
    .where(inArray(organisations.status, ["active", "cancelling"]))
    .all();
  const domains = await db.select().from(domainRegistrationTasks).all();
  const liveOrgs = new Set(
    domains.filter((t) => t.status === "connected").map((t) => t.organisationId),
  );
  const candidates = orgs.filter(
    (o) =>
      !liveOrgs.has(o.id) &&
      o.createdAt &&
      o.createdAt <= cutoff,
  );
  if (candidates.length === 0) return { created: 0, skipped: 0 };

  const existing = await db
    .select()
    .from(opsTasks)
    .where(
      and(
        inArray(
          opsTasks.organisationId,
          candidates.map((c) => c.id),
        ),
        eq(opsTasks.kind, "website_overdue"),
        inArray(opsTasks.status, ["pending", "in_progress"]),
      ),
    )
    .all();

  let created = 0;
  let skipped = 0;
  const now = new Date();
  for (const org of candidates) {
    if (existing.some((t) => t.organisationId === org.id)) {
      skipped += 1;
      continue;
    }
    await db.insert(opsTasks).values({
      id: newId("ops"),
      organisationId: org.id,
      kind: "website_overdue",
      status: "pending",
      title: `Website overdue — ${org.tradingName}`,
      notes: `Paid / active for more than ${afterDays} days without mark-live. Check brief, domain and build progress.`,
      dueAt: now,
      createdAt: now,
      updatedAt: now,
    });
    created += 1;
  }
  return { created, skipped };
}
