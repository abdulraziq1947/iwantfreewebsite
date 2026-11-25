import {
  createDb,
  desc,
  eq,
  organisations,
  subscriptions,
  pendingOrders,
  domainRegistrationTasks,
  assetTransferTasks,
  memberships,
  user,
  onboardingProfiles,
  customerUploads,
} from "@iwfw/db";
import {
  BLOCKING_SUBSCRIPTION_STATUSES,
  WEBSITE_PLAN_UNIT_AMOUNT,
  isBlockingSubscriptionStatus,
} from "./stripe.server";
import { formatGbpFromPence } from "./admin-ops";
import { parseOnboardingData } from "./onboarding";
import {
  buildJourneyStages,
  buildStatusBanner,
  domainTaskLabel,
  isBriefReady,
  needsGbpInvite,
  normaliseLiveUrl,
  websiteStageLabel,
  type DomainTaskSnapshot,
} from "./customer-progress";
import { categoryLabel, isUploadCategory } from "./image-sniff";
import { newId } from "./ids";
import {
  notifyCustomerDomainUpdate,
  notifyCustomerStatusUpdate,
  notifyGbpAccessGranted,
  notifyWebsiteLive,
  notifyWebsiteNotLive,
} from "./notifications.server";
import { buildAttentionBoard } from "./attention";
import type { WorkerEnvConfig } from "@iwfw/config";
import { getOrganisationMailbox } from "./mailbox.server";

export const ORG_STATUSES = [
  "prospect",
  "active",
  "cancelling",
  "cancelled",
  "churned",
] as const;

export type OrgStatus = (typeof ORG_STATUSES)[number];

export function isOrgStatus(value: string): value is OrgStatus {
  return (ORG_STATUSES as readonly string[]).includes(value);
}

type Db = ReturnType<typeof createDb>;

const OPEN_DOMAIN_STATUSES = ["pending", "in_progress", "registered"] as const;
const OPEN_TRANSFER_STATUSES = ["pending", "in_progress"] as const;

export async function getAdminOverview(db: Db) {
  const [
    orgs,
    subs,
    orders,
    domainTasks,
    transferTasks,
  ] = await Promise.all([
    db.select().from(organisations).orderBy(desc(organisations.createdAt)).all(),
    db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt)).all(),
    db.select().from(pendingOrders).orderBy(desc(pendingOrders.createdAt)).all(),
    db
      .select()
      .from(domainRegistrationTasks)
      .orderBy(desc(domainRegistrationTasks.createdAt))
      .all(),
    db
      .select()
      .from(assetTransferTasks)
      .orderBy(desc(assetTransferTasks.createdAt))
      .all(),
  ]);

  const activeClients = orgs.filter(
    (o) => o.status === "active" || o.status === "cancelling",
  );
  const blockingSubs = subs.filter((s) =>
    isBlocking(s.status),
  );
  const estimatedMrrPence = blockingSubs.length * WEBSITE_PLAN_UNIT_AMOUNT;

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const newSubsThisWeek = subs.filter(
    (s) => s.createdAt && s.createdAt.getTime() >= sevenDaysAgo,
  );
  const paidThisWeek = orders.filter(
    (o) => o.status === "paid" && o.paidAt && o.paidAt.getTime() >= sevenDaysAgo,
  );

  const openDomainTasks = domainTasks.filter((t) =>
    (OPEN_DOMAIN_STATUSES as readonly string[]).includes(t.status),
  );
  const openTransfers = transferTasks.filter((t) =>
    (OPEN_TRANSFER_STATUSES as readonly string[]).includes(t.status),
  );
  const openCheckout = orders.filter((o) =>
    ["draft", "ready_for_checkout", "checkout_open"].includes(o.status),
  );

  const orgName = new Map(orgs.map((o) => [o.id, o.tradingName]));

  return {
    kpis: {
      activeClients: activeClients.length,
      totalOrganisations: orgs.length,
      blockingSubscriptions: blockingSubs.length,
      estimatedMrrPence,
      estimatedMrrLabel: formatGbpFromPence(estimatedMrrPence),
      newSubscriptions7d: newSubsThisWeek.length,
      paidOrders7d: paidThisWeek.length,
      openDomainTasks: openDomainTasks.length,
      openTransferTasks: openTransfers.length,
      openCheckoutOrders: openCheckout.length,
    },
    recentSubscriptions: blockingSubs.slice(0, 8).map((s) => ({
      id: s.id,
      organisationId: s.organisationId,
      tradingName: orgName.get(s.organisationId) ?? "Unknown",
      status: s.status,
      cancelAtPeriodEnd: s.cancelAtPeriodEnd,
      currentPeriodEnd: s.currentPeriodEnd
        ? s.currentPeriodEnd.toISOString()
        : null,
      createdAt: s.createdAt ? s.createdAt.toISOString() : null,
    })),
    recentClients: orgs.slice(0, 8).map((o) => ({
      id: o.id,
      tradingName: o.tradingName,
      status: o.status,
      createdAt: o.createdAt ? o.createdAt.toISOString() : null,
    })),
    pendingDomainTasks: openDomainTasks.slice(0, 8).map((t) => ({
      id: t.id,
      domainName: t.domainName,
      domainMode: t.domainMode,
      status: t.status,
      organisationId: t.organisationId,
      tradingName: orgName.get(t.organisationId) ?? "Unknown",
      createdAt: t.createdAt ? t.createdAt.toISOString() : null,
    })),
    pendingTransfers: openTransfers.slice(0, 8).map((t) => ({
      id: t.id,
      organisationId: t.organisationId,
      tradingName: orgName.get(t.organisationId) ?? "Unknown",
      status: t.status,
      periodEndAt: t.periodEndAt ? t.periodEndAt.toISOString() : null,
      createdAt: t.createdAt ? t.createdAt.toISOString() : null,
    })),
    recentPaidOrders: orders
      .filter((o) => o.status === "paid")
      .slice(0, 8)
      .map((o) => ({
        id: o.id,
        email: o.email,
        tradingName: o.tradingName,
        domainName: o.domainName,
        paidAt: o.paidAt ? o.paidAt.toISOString() : null,
        organisationId: o.organisationId,
      })),
  };
}

function isBlocking(status: string) {
  return (BLOCKING_SUBSCRIPTION_STATUSES as readonly string[]).includes(status);
}

export async function listAdminClients(db: Db) {
  const orgs = await db
    .select()
    .from(organisations)
    .orderBy(desc(organisations.createdAt))
    .all();
  const subs = await db.select().from(subscriptions).all();
  const mems = await db.select().from(memberships).all();
  const users = await db.select().from(user).all();
  const domainTasks = await db.select().from(domainRegistrationTasks).all();

  const subByOrg = new Map<string, (typeof subs)[number]>();
  for (const s of subs) {
    const existing = subByOrg.get(s.organisationId);
    if (!existing || (s.createdAt?.getTime() ?? 0) > (existing.createdAt?.getTime() ?? 0)) {
      subByOrg.set(s.organisationId, s);
    }
  }

  const liveByOrg = new Set(
    domainTasks
      .filter((t) => t.status === "connected")
      .map((t) => t.organisationId),
  );

  const userById = new Map(users.map((u) => [u.id, u]));
  const membersByOrg = new Map<string, string[]>();
  for (const m of mems) {
    const list = membersByOrg.get(m.organisationId) ?? [];
    list.push(m.userId);
    membersByOrg.set(m.organisationId, list);
  }

  const profiles = await db.select().from(onboardingProfiles).all();
  const profileByOrg = new Map(
    profiles.map((p) => [p.organisationId, p]),
  );
  const uploads = await db.select().from(customerUploads).all();
  const uploadCountByOrg = new Map<string, number>();
  for (const u of uploads) {
    if (u.status !== "ready" || !u.organisationId) continue;
    uploadCountByOrg.set(
      u.organisationId,
      (uploadCountByOrg.get(u.organisationId) ?? 0) + 1,
    );
  }

  return orgs.map((o) => {
    const sub = subByOrg.get(o.id) ?? null;
    const memberIds = membersByOrg.get(o.id) ?? [];
    const primaryUser = memberIds
      .map((id) => userById.get(id))
      .find(Boolean);
    const websiteLive = liveByOrg.has(o.id);
    const profile = profileByOrg.get(o.id);
    const data = parseOnboardingData(profile?.dataJson);
    const briefReady = isBriefReady(data, Boolean(profile?.completedAt));
    const hasPaidAccess =
      o.status === "active" ||
      o.status === "cancelling" ||
      Boolean(sub && isBlockingSubscriptionStatus(sub.status));
    const domainRow = domainTasks.find((t) => t.organisationId === o.id);
    const domainTask: DomainTaskSnapshot = domainRow
      ? {
          domainName: domainRow.domainName,
          domainMode: domainRow.domainMode,
          status: domainRow.status,
          registeredAt: domainRow.registeredAt
            ? domainRow.registeredAt.toISOString()
            : null,
          connectedAt: domainRow.connectedAt
            ? domainRow.connectedAt.toISOString()
            : null,
          previewUrl: domainRow.previewUrl ?? null,
          liveUrl: domainRow.liveUrl ?? null,
        }
      : null;
    const attention = buildAttentionBoard({
      needsSubscription: !hasPaidAccess,
      briefReady,
      domainTask,
      data,
      uploadCount: uploadCountByOrg.get(o.id) ?? 0,
    });
    return {
      id: o.id,
      tradingName: o.tradingName,
      status: o.status,
      websiteLive,
      stripeCustomerId: o.stripeCustomerId,
      createdAt: o.createdAt ? o.createdAt.toISOString() : null,
      contactName: primaryUser?.name ?? null,
      contactEmail: primaryUser?.email ?? null,
      subscriptionStatus: sub?.status ?? null,
      cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
      currentPeriodEnd: sub?.currentPeriodEnd
        ? sub.currentPeriodEnd.toISOString()
        : null,
      attentionCount: attention.staffPendingCount,
    };
  });
}

export async function listAdminSubscriptions(db: Db) {
  const [subs, orgs] = await Promise.all([
    db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt)).all(),
    db.select().from(organisations).all(),
  ]);
  const orgName = new Map(orgs.map((o) => [o.id, o.tradingName]));
  return subs.map((s) => ({
    id: s.id,
    organisationId: s.organisationId,
    tradingName: orgName.get(s.organisationId) ?? "Unknown",
    stripeSubscriptionId: s.stripeSubscriptionId,
    stripePriceId: s.stripePriceId,
    status: s.status,
    cancelAtPeriodEnd: s.cancelAtPeriodEnd,
    currentPeriodStart: s.currentPeriodStart
      ? s.currentPeriodStart.toISOString()
      : null,
    currentPeriodEnd: s.currentPeriodEnd
      ? s.currentPeriodEnd.toISOString()
      : null,
    canceledAt: s.canceledAt ? s.canceledAt.toISOString() : null,
    createdAt: s.createdAt ? s.createdAt.toISOString() : null,
    planLabel: formatGbpFromPence(WEBSITE_PLAN_UNIT_AMOUNT) + "/mo",
  }));
}

export async function listAdminOrders(db: Db) {
  const orders = await db
    .select()
    .from(pendingOrders)
    .orderBy(desc(pendingOrders.createdAt))
    .all();
  return orders.map((o) => ({
    id: o.id,
    status: o.status,
    email: o.email,
    fullName: o.fullName,
    tradingName: o.tradingName,
    domainName: o.domainName,
    domainMode: o.domainMode,
    organisationId: o.organisationId,
    paidAt: o.paidAt ? o.paidAt.toISOString() : null,
    createdAt: o.createdAt ? o.createdAt.toISOString() : null,
    expiresAt: o.expiresAt ? o.expiresAt.toISOString() : null,
    reminderSentAt: o.reminderSentAt ? o.reminderSentAt.toISOString() : null,
    reminderSendCount: o.reminderSendCount ?? 0,
  }));
}

export async function listAdminDomainTasks(db: Db) {
  const [tasks, orgs] = await Promise.all([
    db
      .select()
      .from(domainRegistrationTasks)
      .orderBy(desc(domainRegistrationTasks.createdAt))
      .all(),
    db.select().from(organisations).all(),
  ]);
  const orgName = new Map(orgs.map((o) => [o.id, o.tradingName]));
  return tasks.map((t) => ({
    id: t.id,
    organisationId: t.organisationId,
    tradingName: orgName.get(t.organisationId) ?? "Unknown",
    domainName: t.domainName,
    domainMode: t.domainMode,
    status: t.status,
    adminNotes: t.adminNotes,
    renewsAt: t.renewsAt ? t.renewsAt.toISOString() : null,
    registeredAt: t.registeredAt ? t.registeredAt.toISOString() : null,
    connectedAt: t.connectedAt ? t.connectedAt.toISOString() : null,
    createdAt: t.createdAt ? t.createdAt.toISOString() : null,
  }));
}

export async function listAdminTransfers(db: Db) {
  const [tasks, orgs] = await Promise.all([
    db
      .select()
      .from(assetTransferTasks)
      .orderBy(desc(assetTransferTasks.createdAt))
      .all(),
    db.select().from(organisations).all(),
  ]);
  const orgName = new Map(orgs.map((o) => [o.id, o.tradingName]));
  return tasks.map((t) => ({
    id: t.id,
    organisationId: t.organisationId,
    tradingName: orgName.get(t.organisationId) ?? "Unknown",
    subscriptionId: t.subscriptionId,
    status: t.status,
    adminNotes: t.adminNotes,
    periodEndAt: t.periodEndAt ? t.periodEndAt.toISOString() : null,
    completedAt: t.completedAt ? t.completedAt.toISOString() : null,
    createdAt: t.createdAt ? t.createdAt.toISOString() : null,
  }));
}

export async function updateDomainTaskStatus(
  db: Db,
  taskId: string,
  intent: string,
) {
  const now = new Date();
  if (intent === "mark_in_progress") {
    await db
      .update(domainRegistrationTasks)
      .set({ status: "in_progress", updatedAt: now })
      .where(eq(domainRegistrationTasks.id, taskId));
    return { ok: true as const };
  }
  if (intent === "mark_registered") {
    await db
      .update(domainRegistrationTasks)
      .set({
        status: "registered",
        registeredAt: now,
        updatedAt: now,
      })
      .where(eq(domainRegistrationTasks.id, taskId));
    return { ok: true as const };
  }
  if (intent === "mark_connected") {
    const task = await db
      .select()
      .from(domainRegistrationTasks)
      .where(eq(domainRegistrationTasks.id, taskId))
      .get();
    if (!task) return { error: "Domain task not found." };
    const liveUrl =
      normaliseLiveUrl(task.liveUrl, task.domainName) ??
      `https://${task.domainName}`;
    await db
      .update(domainRegistrationTasks)
      .set({
        status: "connected",
        connectedAt: now,
        liveUrl,
        updatedAt: now,
      })
      .where(eq(domainRegistrationTasks.id, taskId));
    const org = await db
      .select()
      .from(organisations)
      .where(eq(organisations.id, task.organisationId))
      .get();
    if (org) {
      await notifyWebsiteLive(db, {
        organisationId: org.id,
        tradingName: org.tradingName,
        liveUrl,
      });
      if (org.status === "prospect") {
        await db
          .update(organisations)
          .set({ status: "active", updatedAt: now })
          .where(eq(organisations.id, org.id));
      }
    }
    return { ok: true as const };
  }
  if (intent === "mark_unavailable") {
    const task = await db
      .select()
      .from(domainRegistrationTasks)
      .where(eq(domainRegistrationTasks.id, taskId))
      .get();
    await db
      .update(domainRegistrationTasks)
      .set({ status: "unavailable", updatedAt: now })
      .where(eq(domainRegistrationTasks.id, taskId));
    if (task) {
      await notifyCustomerDomainUpdate(db, {
        organisationId: task.organisationId,
        domainName: task.domainName,
        status: "unavailable",
      });
    }
    return { ok: true as const };
  }
  return { error: "Unknown domain action." };
}

export async function updateTransferTaskStatus(
  db: Db,
  taskId: string,
  intent: string,
) {
  const now = new Date();
  if (intent === "mark_in_progress") {
    await db
      .update(assetTransferTasks)
      .set({ status: "in_progress", updatedAt: now })
      .where(eq(assetTransferTasks.id, taskId));
    return { ok: true as const };
  }
  if (intent === "mark_completed") {
    await db
      .update(assetTransferTasks)
      .set({
        status: "completed",
        completedAt: now,
        updatedAt: now,
      })
      .where(eq(assetTransferTasks.id, taskId));
    return { ok: true as const };
  }
  return { error: "Unknown transfer action." };
}

export async function updateOrganisationStatus(
  db: Db,
  organisationId: string,
  status: OrgStatus,
) {
  const org = await db
    .select()
    .from(organisations)
    .where(eq(organisations.id, organisationId))
    .get();
  if (!org) return { error: "Client not found." };

  await db
    .update(organisations)
    .set({ status, updatedAt: new Date() })
    .where(eq(organisations.id, organisationId));

  if (org.status !== status) {
    await notifyCustomerStatusUpdate(db, {
      organisationId,
      tradingName: org.tradingName,
      status,
    });
  }
  return { ok: true as const };
}

/** Staff confirm / revoke Google Business Manager access. */
export async function setGbpAccessGranted(
  db: Db,
  organisationId: string,
  granted: boolean,
) {
  const profile = await db
    .select()
    .from(onboardingProfiles)
    .where(eq(onboardingProfiles.organisationId, organisationId))
    .get();
  if (!profile) return { error: "No onboarding profile for this client." };

  const org = await db
    .select()
    .from(organisations)
    .where(eq(organisations.id, organisationId))
    .get();

  const data = parseOnboardingData(profile.dataJson);
  const wasGranted = Boolean(data.gbp.accessGranted);
  data.gbp = {
    ...data.gbp,
    accessGranted: granted,
    outcome: granted
      ? data.gbp.outcome || "invitation_sent"
      : data.gbp.outcome,
  };

  await db
    .update(onboardingProfiles)
    .set({
      dataJson: JSON.stringify(data),
      updatedAt: new Date(),
    })
    .where(eq(onboardingProfiles.id, profile.id));

  if (granted && !wasGranted && org) {
    await notifyGbpAccessGranted(db, {
      organisationId,
      tradingName: org.tradingName,
    });
  }

  return { ok: true as const };
}

/**
 * Mark the customer's website as live (journey “Go live” = domain connected).
 * Updates the latest domain task, or creates one from the brief if missing.
 * Notifies org members with a congratulations message.
 */
export async function markClientWebsiteLive(
  db: Db,
  organisationId: string,
  options?: { liveUrl?: string | null },
) {
  const org = await db
    .select()
    .from(organisations)
    .where(eq(organisations.id, organisationId))
    .get();
  if (!org) return { error: "Client not found." };

  const now = new Date();
  const existing = await db
    .select()
    .from(domainRegistrationTasks)
    .where(eq(domainRegistrationTasks.organisationId, organisationId))
    .orderBy(desc(domainRegistrationTasks.createdAt))
    .get();

  let domainName = existing?.domainName ?? "";
  let liveUrl: string;

  if (existing) {
    domainName = existing.domainName;
    liveUrl =
      normaliseLiveUrl(options?.liveUrl, domainName) ??
      normaliseLiveUrl(existing.liveUrl, domainName) ??
      `https://${domainName}`;
    await db
      .update(domainRegistrationTasks)
      .set({
        status: "connected",
        registeredAt: existing.registeredAt ?? now,
        connectedAt: now,
        liveUrl,
        updatedAt: now,
      })
      .where(eq(domainRegistrationTasks.id, existing.id));
  } else {
    const profile = await db
      .select()
      .from(onboardingProfiles)
      .where(eq(onboardingProfiles.organisationId, organisationId))
      .get();
    const data = parseOnboardingData(profile?.dataJson);
    domainName =
      data.domain.preferredDomain.trim() ||
      data.domain.existingDomain.trim() ||
      `${org.tradingName.toLowerCase().replace(/[^a-z0-9]+/g, "") || "site"}.co.uk`;
    const domainMode =
      data.domain.mode === "existing" ? "existing" : "new";
    liveUrl =
      normaliseLiveUrl(options?.liveUrl, domainName) ??
      `https://${domainName}`;

    await db.insert(domainRegistrationTasks).values({
      id: newId("dom"),
      organisationId,
      domainName,
      domainMode,
      status: "connected",
      registeredAt: now,
      connectedAt: now,
      liveUrl,
      createdAt: now,
      updatedAt: now,
      adminNotes: "Marked live from client folder",
    });
  }

  // Paid clients should be active once the site is live.
  if (org.status === "prospect") {
    await db
      .update(organisations)
      .set({ status: "active", updatedAt: now })
      .where(eq(organisations.id, organisationId));
  }

  await notifyWebsiteLive(db, {
    organisationId,
    tradingName: org.tradingName,
    liveUrl,
  });

  try {
    const { trackProductEvent } = await import("./analytics.server");
    await trackProductEvent(db, {
      name: "website_marked_live",
      organisationId,
      properties: { liveUrl },
    });
  } catch {
    // Non-fatal
  }

  return { ok: true as const, liveUrl };
}

/** Move the site back off “live” (domain task → in_progress). Preserves previewUrl. */
export async function unmarkClientWebsiteLive(
  db: Db,
  organisationId: string,
) {
  const existing = await db
    .select()
    .from(domainRegistrationTasks)
    .where(eq(domainRegistrationTasks.organisationId, organisationId))
    .orderBy(desc(domainRegistrationTasks.createdAt))
    .get();
  if (!existing) {
    return { error: "No domain / launch task to update." };
  }
  if (existing.status !== "connected") {
    return { error: "Website is not marked live." };
  }
  await db
    .update(domainRegistrationTasks)
    .set({
      status: "in_progress",
      connectedAt: null,
      liveUrl: null,
      updatedAt: new Date(),
    })
    .where(eq(domainRegistrationTasks.id, existing.id));

  const org = await db
    .select()
    .from(organisations)
    .where(eq(organisations.id, organisationId))
    .get();
  if (org) {
    await notifyWebsiteNotLive(db, {
      organisationId,
      tradingName: org.tradingName,
    });
  }
  return { ok: true as const };
}

/**
 * Set or clear a customer-facing preview URL without marking the site live.
 */
export async function setClientWebsitePreview(
  db: Db,
  organisationId: string,
  options: { previewUrl?: string | null },
) {
  const org = await db
    .select()
    .from(organisations)
    .where(eq(organisations.id, organisationId))
    .get();
  if (!org) return { error: "Client not found." };

  const raw = (options.previewUrl ?? "").trim();
  const previewUrl = raw ? normaliseLiveUrl(raw) : null;
  if (raw && !previewUrl) {
    return { error: "Enter a valid preview URL." };
  }

  const now = new Date();
  const existing = await db
    .select()
    .from(domainRegistrationTasks)
    .where(eq(domainRegistrationTasks.organisationId, organisationId))
    .orderBy(desc(domainRegistrationTasks.createdAt))
    .get();

  if (existing) {
    if (existing.status === "connected") {
      return {
        error:
          "Site is already live. Unmark live first if you need to share a preview instead.",
      };
    }
    await db
      .update(domainRegistrationTasks)
      .set({
        previewUrl,
        status:
          existing.status === "pending" || existing.status === "unavailable"
            ? "in_progress"
            : existing.status,
        updatedAt: now,
      })
      .where(eq(domainRegistrationTasks.id, existing.id));
    if (previewUrl && previewUrl !== existing.previewUrl) {
      try {
        const { notifyWebsitePreviewReady } = await import(
          "./notifications.server"
        );
        await notifyWebsitePreviewReady(db, {
          organisationId,
          tradingName: org.tradingName,
          previewUrl,
        });
        const { trackProductEvent } = await import("./analytics.server");
        await trackProductEvent(db, {
          name: "website_preview_shared",
          organisationId,
          properties: { previewUrl },
        });
      } catch {
        // Non-fatal
      }
    }
    return { ok: true as const, previewUrl };
  }

  const profile = await db
    .select()
    .from(onboardingProfiles)
    .where(eq(onboardingProfiles.organisationId, organisationId))
    .get();
  const data = parseOnboardingData(profile?.dataJson);
  const domainName =
    data.domain.preferredDomain.trim() ||
    data.domain.existingDomain.trim() ||
    `${org.tradingName.toLowerCase().replace(/[^a-z0-9]+/g, "") || "site"}.co.uk`;
  const domainMode = data.domain.mode === "existing" ? "existing" : "new";

  await db.insert(domainRegistrationTasks).values({
    id: newId("dom"),
    organisationId,
    domainName,
    domainMode,
    status: "in_progress",
    previewUrl,
    createdAt: now,
    updatedAt: now,
    adminNotes: "Preview URL set from client folder",
  });

  if (previewUrl) {
    try {
      const { notifyWebsitePreviewReady } = await import(
        "./notifications.server"
      );
      await notifyWebsitePreviewReady(db, {
        organisationId,
        tradingName: org.tradingName,
        previewUrl,
      });
      const { trackProductEvent } = await import("./analytics.server");
      await trackProductEvent(db, {
        name: "website_preview_shared",
        organisationId,
        properties: { previewUrl },
      });
    } catch {
      // Non-fatal
    }
  }

  return { ok: true as const, previewUrl };
}

export async function getAdminClientDetail(
  db: Db,
  organisationId: string,
  config: WorkerEnvConfig,
) {
  const org = await db
    .select()
    .from(organisations)
    .where(eq(organisations.id, organisationId))
    .get();
  if (!org) return null;

  const [
    mems,
    users,
    subs,
    orders,
    domainTasks,
    transfers,
    profile,
    uploads,
  ] = await Promise.all([
    db
      .select()
      .from(memberships)
      .where(eq(memberships.organisationId, organisationId))
      .all(),
    db.select().from(user).all(),
    db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organisationId, organisationId))
      .orderBy(desc(subscriptions.createdAt))
      .all(),
    db
      .select()
      .from(pendingOrders)
      .where(eq(pendingOrders.organisationId, organisationId))
      .orderBy(desc(pendingOrders.createdAt))
      .all(),
    db
      .select()
      .from(domainRegistrationTasks)
      .where(eq(domainRegistrationTasks.organisationId, organisationId))
      .orderBy(desc(domainRegistrationTasks.createdAt))
      .all(),
    db
      .select()
      .from(assetTransferTasks)
      .where(eq(assetTransferTasks.organisationId, organisationId))
      .orderBy(desc(assetTransferTasks.createdAt))
      .all(),
    db
      .select()
      .from(onboardingProfiles)
      .where(eq(onboardingProfiles.organisationId, organisationId))
      .get(),
    db
      .select()
      .from(customerUploads)
      .where(eq(customerUploads.organisationId, organisationId))
      .orderBy(desc(customerUploads.createdAt))
      .all(),
  ]);

  const userById = new Map(users.map((u) => [u.id, u]));
  const members = mems.map((m) => {
    const u = userById.get(m.userId);
    return {
      membershipId: m.id,
      userId: m.userId,
      role: m.role,
      name: u?.name ?? null,
      email: u?.email ?? null,
    };
  });

  const blockingSub =
    subs.find((s) => isBlockingSubscriptionStatus(s.status)) ?? null;
  const needsSubscription = !(
    org.status === "active" ||
    org.status === "cancelling" ||
    Boolean(blockingSub)
  );

  const onboardingData = parseOnboardingData(profile?.dataJson);
  const briefReady = isBriefReady(
    onboardingData,
    Boolean(profile?.completedAt),
  );

  const latestDomain = domainTasks[0] ?? null;
  const domainTask: DomainTaskSnapshot = latestDomain
    ? {
        domainName: latestDomain.domainName,
        domainMode: latestDomain.domainMode,
        status: latestDomain.status,
        registeredAt: latestDomain.registeredAt
          ? latestDomain.registeredAt.toISOString()
          : null,
        connectedAt: latestDomain.connectedAt
          ? latestDomain.connectedAt.toISOString()
          : null,
        previewUrl: latestDomain.previewUrl ?? null,
        liveUrl: latestDomain.liveUrl ?? null,
      }
    : null;

  const journey = buildJourneyStages({
    needsSubscription,
    briefReady,
    domainTask,
  });
  const banner = buildStatusBanner({
    needsSubscription,
    briefReady,
    domainTask,
    tradingName: org.tradingName,
  });

  const openDomainCount = domainTasks.filter((t) =>
    (OPEN_DOMAIN_STATUSES as readonly string[]).includes(t.status),
  ).length;
  const openTransferCount = transfers.filter((t) =>
    (OPEN_TRANSFER_STATUSES as readonly string[]).includes(t.status),
  ).length;

  const readyUploads = uploads.filter((u) => u.status === "ready");

  // Also pull uploads linked only via paid orders for this org
  const orderIds = orders.map((o) => o.id);
  let orderUploads = readyUploads;
  if (orderIds.length > 0 && readyUploads.length === 0) {
    const allReady = await db
      .select()
      .from(customerUploads)
      .where(eq(customerUploads.status, "ready"))
      .orderBy(desc(customerUploads.createdAt))
      .all();
    orderUploads = allReady.filter(
      (u) =>
        u.organisationId === organisationId ||
        (u.pendingOrderId && orderIds.includes(u.pendingOrderId)),
    );
  } else if (orderIds.length > 0) {
    const extras = await db
      .select()
      .from(customerUploads)
      .where(eq(customerUploads.status, "ready"))
      .orderBy(desc(customerUploads.createdAt))
      .all();
    const seen = new Set(readyUploads.map((u) => u.id));
    for (const u of extras) {
      if (
        !seen.has(u.id) &&
        u.pendingOrderId &&
        orderIds.includes(u.pendingOrderId)
      ) {
        orderUploads = [...orderUploads, u];
        seen.add(u.id);
      }
    }
  }

  const attention = buildAttentionBoard({
    needsSubscription,
    briefReady,
    domainTask,
    data: onboardingData,
    uploadCount: orderUploads.length,
    openDomainCount,
    openTransferCount,
  });
  const mailbox = await getOrganisationMailbox(db, organisationId, config);
  const required = [
    ...attention.staff
      .filter((i) => i.severity === "action")
      .map((i) => i.title + (i.body ? ` — ${i.body}` : "")),
    ...attention.customer
      .filter((i) => i.severity === "action")
      .map((i) => `Waiting on customer: ${i.title}`),
  ];

  return {
    org: {
      id: org.id,
      tradingName: org.tradingName,
      registeredCompanyName: org.registeredCompanyName,
      companiesHouseNumber: org.companiesHouseNumber,
      status: org.status,
      stripeCustomerId: org.stripeCustomerId,
      createdAt: org.createdAt ? org.createdAt.toISOString() : null,
      updatedAt: org.updatedAt ? org.updatedAt.toISOString() : null,
    },
    members,
    stageLabel: websiteStageLabel({
      needsSubscription,
      domainStatus: domainTask?.status,
      briefReady,
    }),
    banner,
    journey,
    required,
    attention,
    briefReady,
    needsSubscription,
    gbpNeeded: needsGbpInvite(onboardingData),
    mailbox,
    onboarding: {
      currentStep: profile?.currentStep ?? 0,
      completedAt: profile?.completedAt
        ? profile.completedAt.toISOString()
        : null,
      data: onboardingData,
    },
    subscriptions: subs.map((s) => ({
      id: s.id,
      status: s.status,
      cancelAtPeriodEnd: s.cancelAtPeriodEnd,
      stripeSubscriptionId: s.stripeSubscriptionId,
      stripePriceId: s.stripePriceId,
      currentPeriodStart: s.currentPeriodStart
        ? s.currentPeriodStart.toISOString()
        : null,
      currentPeriodEnd: s.currentPeriodEnd
        ? s.currentPeriodEnd.toISOString()
        : null,
      createdAt: s.createdAt ? s.createdAt.toISOString() : null,
      planLabel: formatGbpFromPence(WEBSITE_PLAN_UNIT_AMOUNT) + "/mo",
    })),
    orders: orders.map((o) => ({
      id: o.id,
      status: o.status,
      email: o.email,
      fullName: o.fullName,
      tradingName: o.tradingName,
      domainName: o.domainName,
      domainMode: o.domainMode,
      paidAt: o.paidAt ? o.paidAt.toISOString() : null,
      createdAt: o.createdAt ? o.createdAt.toISOString() : null,
    })),
    domainTasks: domainTasks.map((t) => ({
      id: t.id,
      domainName: t.domainName,
      domainMode: t.domainMode,
      status: t.status,
      adminNotes: t.adminNotes,
      previewUrl: t.previewUrl,
      liveUrl: t.liveUrl,
      registeredAt: t.registeredAt ? t.registeredAt.toISOString() : null,
      connectedAt: t.connectedAt ? t.connectedAt.toISOString() : null,
      createdAt: t.createdAt ? t.createdAt.toISOString() : null,
      statusLabel: domainTaskLabel(t.status),
    })),
    transfers: transfers.map((t) => ({
      id: t.id,
      status: t.status,
      adminNotes: t.adminNotes,
      periodEndAt: t.periodEndAt ? t.periodEndAt.toISOString() : null,
      completedAt: t.completedAt ? t.completedAt.toISOString() : null,
      createdAt: t.createdAt ? t.createdAt.toISOString() : null,
    })),
    uploads: orderUploads
      .filter((u) => u.status === "ready")
      .map((u) => ({
        id: u.id,
        category: u.category,
        categoryLabel: isUploadCategory(u.category)
          ? categoryLabel(u.category)
          : u.category,
        originalFilename: u.originalFilename,
        contentType: u.contentType,
        byteSize: u.byteSize,
        createdAt: u.createdAt ? u.createdAt.toISOString() : null,
        contentUrl: `/api/uploads/${u.id}/content`,
      })),
  };
}
