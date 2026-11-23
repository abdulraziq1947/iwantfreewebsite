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
} from "@iwfw/db";
import {
  BLOCKING_SUBSCRIPTION_STATUSES,
  WEBSITE_PLAN_UNIT_AMOUNT,
} from "./stripe.server";

type Db = ReturnType<typeof createDb>;

const OPEN_DOMAIN_STATUSES = ["pending", "in_progress", "registered"] as const;
const OPEN_TRANSFER_STATUSES = ["pending", "in_progress"] as const;

export function formatGbpFromPence(pence: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(pence / 100);
}

export function formatAdminDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

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

  const subByOrg = new Map<string, (typeof subs)[number]>();
  for (const s of subs) {
    const existing = subByOrg.get(s.organisationId);
    if (!existing || (s.createdAt?.getTime() ?? 0) > (existing.createdAt?.getTime() ?? 0)) {
      subByOrg.set(s.organisationId, s);
    }
  }

  const userById = new Map(users.map((u) => [u.id, u]));
  const membersByOrg = new Map<string, string[]>();
  for (const m of mems) {
    const list = membersByOrg.get(m.organisationId) ?? [];
    list.push(m.userId);
    membersByOrg.set(m.organisationId, list);
  }

  return orgs.map((o) => {
    const sub = subByOrg.get(o.id) ?? null;
    const memberIds = membersByOrg.get(o.id) ?? [];
    const primaryUser = memberIds
      .map((id) => userById.get(id))
      .find(Boolean);
    return {
      id: o.id,
      tradingName: o.tradingName,
      status: o.status,
      stripeCustomerId: o.stripeCustomerId,
      createdAt: o.createdAt ? o.createdAt.toISOString() : null,
      contactName: primaryUser?.name ?? null,
      contactEmail: primaryUser?.email ?? null,
      subscriptionStatus: sub?.status ?? null,
      cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
      currentPeriodEnd: sub?.currentPeriodEnd
        ? sub.currentPeriodEnd.toISOString()
        : null,
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
    await db
      .update(domainRegistrationTasks)
      .set({
        status: "connected",
        connectedAt: now,
        updatedAt: now,
      })
      .where(eq(domainRegistrationTasks.id, taskId));
    return { ok: true as const };
  }
  if (intent === "mark_unavailable") {
    await db
      .update(domainRegistrationTasks)
      .set({ status: "unavailable", updatedAt: now })
      .where(eq(domainRegistrationTasks.id, taskId));
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

export const ADMIN_NAV = [
  { to: "/admin", label: "Overview", end: true },
  { to: "/admin/clients", label: "Clients" },
  { to: "/admin/subscriptions", label: "Subscriptions" },
  { to: "/admin/orders", label: "Orders" },
  { to: "/admin/domains", label: "Domains" },
  { to: "/admin/transfers", label: "Transfers" },
  { to: "/admin/media", label: "Images" },
] as const;
