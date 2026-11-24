import { requireStaff, type AuthContext } from "@iwfw/auth";
import {
  accountActivationTokens,
  assetTransferTasks,
  checkoutSessions,
  createDb,
  customerUploads,
  domainRegistrationTasks,
  eq,
  inArray,
  memberships,
  notifications,
  onboardingProfiles,
  opsTasks,
  organisationCosts,
  organisationMailboxes,
  organisations,
  pendingOrders,
  platformRoles,
  subscriptions,
  supportTickets,
  ticketMessages,
  user,
} from "@iwfw/db";
import { writeAuditLog } from "./audit-log.server";
import { isBlockingSubscriptionStatus } from "./stripe.server";
import { getCustomerUploadsBucket } from "./uploads.server";
import { log } from "./logger";

type Db = ReturnType<typeof createDb>;

const DELETE_MANAGER_ROLES = ["platform_owner", "administrator"] as const;

export function assertCanPermanentlyDeleteClient(auth: AuthContext): void {
  requireStaff(auth, [...DELETE_MANAGER_ROLES]);
}

export function confirmDeletePhrase(tradingName: string): string {
  return tradingName.trim();
}

export async function permanentlyDeleteClientOrganisation(options: {
  db: Db;
  env: Env;
  actor: AuthContext;
  organisationId: string;
  confirmName: string;
  ip?: string | null;
}): Promise<
  | { ok: true; deletedUserIds: string[]; tradingName: string }
  | { ok: false; error: string }
> {
  assertCanPermanentlyDeleteClient(options.actor);

  const org = await options.db
    .select()
    .from(organisations)
    .where(eq(organisations.id, options.organisationId))
    .get();
  if (!org) {
    return { ok: false, error: "Client not found." };
  }

  const expected = confirmDeletePhrase(org.tradingName);
  if (!expected || options.confirmName.trim() !== expected) {
    return {
      ok: false,
      error: `Type the exact business name “${org.tradingName}” to confirm permanent deletion.`,
    };
  }

  const subs = await options.db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.organisationId, options.organisationId))
    .all();
  const blocking = subs.find((s) => isBlockingSubscriptionStatus(s.status));
  if (blocking) {
    return {
      ok: false,
      error:
        "This client still has an active Stripe subscription. Cancel it in Stripe (or wait until it ends), then delete.",
    };
  }

  const mems = await options.db
    .select()
    .from(memberships)
    .where(eq(memberships.organisationId, options.organisationId))
    .all();
  const memberUserIds = mems.map((m) => m.userId);

  const orders = await options.db
    .select()
    .from(pendingOrders)
    .where(eq(pendingOrders.organisationId, options.organisationId))
    .all();
  const orderIds = orders.map((o) => o.id);

  const orgUploads = await options.db
    .select()
    .from(customerUploads)
    .where(eq(customerUploads.organisationId, options.organisationId))
    .all();
  let orderUploads: typeof orgUploads = [];
  if (orderIds.length > 0) {
    orderUploads = await options.db
      .select()
      .from(customerUploads)
      .where(inArray(customerUploads.pendingOrderId, orderIds))
      .all();
  }
  const uploadById = new Map<string, (typeof orgUploads)[number]>();
  for (const row of [...orgUploads, ...orderUploads]) {
    uploadById.set(row.id, row);
  }
  const uploads = [...uploadById.values()];

  await writeAuditLog(options.db, {
    actorUserId: options.actor.userId,
    organisationId: options.organisationId,
    action: "org.permanently_deleted",
    entityType: "organisations",
    entityId: options.organisationId,
    diff: {
      tradingName: org.tradingName,
      status: org.status,
      stripeCustomerId: org.stripeCustomerId,
      memberUserIds,
      uploadCount: uploads.length,
      subscriptionIds: subs.map((s) => s.stripeSubscriptionId),
    },
    ip: options.ip,
  });

  const bucket = getCustomerUploadsBucket(options.env);
  if (bucket) {
    for (const upload of uploads) {
      try {
        await bucket.delete(upload.r2Key);
      } catch (error) {
        log("warn", "client_delete_r2_failed", {
          organisationId: options.organisationId,
          uploadId: upload.id,
          error: error instanceof Error ? error.message : "unknown",
        });
      }
    }
  }

  const uploadIds = uploads.map((u) => u.id);
  if (uploadIds.length > 0) {
    await options.db
      .delete(customerUploads)
      .where(inArray(customerUploads.id, uploadIds));
  }

  const tickets = await options.db
    .select({ id: supportTickets.id })
    .from(supportTickets)
    .where(eq(supportTickets.organisationId, options.organisationId))
    .all();
  const ticketIds = tickets.map((t) => t.id);
  if (ticketIds.length > 0) {
    await options.db
      .delete(ticketMessages)
      .where(inArray(ticketMessages.ticketId, ticketIds));
    await options.db
      .delete(supportTickets)
      .where(inArray(supportTickets.id, ticketIds));
  }

  await options.db
    .delete(opsTasks)
    .where(eq(opsTasks.organisationId, options.organisationId));
  await options.db
    .delete(domainRegistrationTasks)
    .where(eq(domainRegistrationTasks.organisationId, options.organisationId));
  await options.db
    .delete(assetTransferTasks)
    .where(eq(assetTransferTasks.organisationId, options.organisationId));
  await options.db
    .delete(subscriptions)
    .where(eq(subscriptions.organisationId, options.organisationId));
  await options.db
    .delete(checkoutSessions)
    .where(eq(checkoutSessions.organisationId, options.organisationId));
  await options.db
    .delete(onboardingProfiles)
    .where(eq(onboardingProfiles.organisationId, options.organisationId));
  await options.db
    .delete(organisationCosts)
    .where(eq(organisationCosts.organisationId, options.organisationId));
  await options.db
    .delete(organisationMailboxes)
    .where(eq(organisationMailboxes.organisationId, options.organisationId));
  await options.db
    .delete(accountActivationTokens)
    .where(eq(accountActivationTokens.organisationId, options.organisationId));
  await options.db
    .delete(notifications)
    .where(eq(notifications.organisationId, options.organisationId));
  await options.db
    .delete(memberships)
    .where(eq(memberships.organisationId, options.organisationId));

  if (orderIds.length > 0) {
    await options.db
      .delete(pendingOrders)
      .where(inArray(pendingOrders.id, orderIds));
  }

  await options.db
    .delete(organisations)
    .where(eq(organisations.id, options.organisationId));

  const deletedUserIds: string[] = [];
  for (const userId of memberUserIds) {
    const remaining = await options.db
      .select({ id: memberships.id })
      .from(memberships)
      .where(eq(memberships.userId, userId))
      .all();
    if (remaining.length > 0) continue;

    const roles = await options.db
      .select({ id: platformRoles.id })
      .from(platformRoles)
      .where(eq(platformRoles.userId, userId))
      .all();
    if (roles.length > 0) continue;

    await options.db.delete(user).where(eq(user.id, userId));
    deletedUserIds.push(userId);
  }

  log("info", "client_permanently_deleted", {
    organisationId: options.organisationId,
    actorUserId: options.actor.userId,
    deletedUserCount: deletedUserIds.length,
  });

  return {
    ok: true,
    deletedUserIds,
    tradingName: org.tradingName,
  };
}
