import {
  createDb,
  desc,
  eq,
  isNull,
  and,
  memberships,
  organisations,
  pendingOrders,
  platformRoles,
  notifications,
} from "@iwfw/db";
import { newId } from "./ids";

type Db = ReturnType<typeof createDb>;

export const NOTIFICATION_KINDS = [
  "ticket_created",
  "ticket_reply_customer",
  "ticket_reply_staff",
  "ticket_status",
  "website_live",
  "website_update",
  "gbp_granted",
  "gbp_update",
  "status_update",
  "domain_update",
  "needs_attention",
  "new_prospect",
  "new_customer",
  "staff_message",
  "media_upload",
  "billing_update",
  "mailbox_update",
] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export type NotificationItem = {
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string;
  readAt: string | null;
  createdAt: string | null;
};

async function staffUserIds(db: Db): Promise<string[]> {
  const rows = await db.select().from(platformRoles).all();
  return [...new Set(rows.map((r) => r.userId))];
}

async function orgMemberUserIds(
  db: Db,
  organisationId: string,
): Promise<string[]> {
  const rows = await db
    .select()
    .from(memberships)
    .where(eq(memberships.organisationId, organisationId))
    .all();
  return rows.map((r) => r.userId);
}

export async function createNotifications(
  db: Db,
  options: {
    userIds: string[];
    organisationId: string | null;
    kind: NotificationKind;
    title: string;
    body: string;
    href: string;
  },
) {
  const unique = [...new Set(options.userIds.filter(Boolean))];
  if (unique.length === 0) return;
  const now = new Date();
  for (const userId of unique) {
    await db.insert(notifications).values({
      id: newId("ntf"),
      userId,
      organisationId: options.organisationId,
      kind: options.kind,
      title: options.title,
      body: options.body,
      href: options.href,
      createdAt: now,
    });
  }
}

export async function notifyStaffUsers(
  db: Db,
  options: {
    organisationId: string | null;
    kind: NotificationKind;
    title: string;
    body: string;
    href: string;
  },
) {
  const staffIds = await staffUserIds(db);
  await createNotifications(db, { ...options, userIds: staffIds });
}

/** One unread bell per org+kind so a burst of photo uploads does not spam staff. */
export async function notifyStaffUsersUnlessUnread(
  db: Db,
  options: {
    organisationId: string;
    kind: NotificationKind;
    title: string;
    body: string;
    href: string;
  },
) {
  const staffIds = await staffUserIds(db);
  if (staffIds.length === 0) return;
  const existing = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.organisationId, options.organisationId),
        eq(notifications.kind, options.kind),
        isNull(notifications.readAt),
      ),
    )
    .get();
  if (existing) return;
  await createNotifications(db, { ...options, userIds: staffIds });
}

export function staffBillingChangeFromStripe(
  previous: { status: string; cancelAtPeriodEnd: boolean } | null,
  next: { status: string; cancelAtPeriodEnd: boolean },
): { title: string; detail: string } | null {
  if (!previous) return null;
  if (previous.status !== next.status) {
    if (next.status === "canceled") {
      return {
        title: "Subscription ended",
        detail: "The Stripe subscription is now cancelled.",
      };
    }
    if (next.status === "past_due" || next.status === "unpaid") {
      return {
        title: "Subscription payment issue",
        detail: `Status is now ${next.status.replaceAll("_", " ")}.`,
      };
    }
    if (
      (previous.status === "past_due" ||
        previous.status === "unpaid" ||
        previous.status === "incomplete") &&
      next.status === "active"
    ) {
      return {
        title: "Subscription recovered",
        detail: "Payment succeeded and the plan is active again.",
      };
    }
    if (previous.status === "trialing" && next.status === "active") {
      return null;
    }
    return {
      title: "Subscription updated",
      detail: `Status changed from ${previous.status.replaceAll("_", " ")} to ${next.status.replaceAll("_", " ")}.`,
    };
  }
  if (previous.cancelAtPeriodEnd !== next.cancelAtPeriodEnd) {
    return next.cancelAtPeriodEnd
      ? {
          title: "Customer cancelled subscription",
          detail: "They asked to cancel at the end of the current period.",
        }
      : {
          title: "Customer resumed subscription",
          detail: "They kept the plan after cancelling.",
        };
  }
  return null;
}

async function organisationTradingName(
  db: Db,
  organisationId: string,
): Promise<string> {
  const org = await db
    .select({ tradingName: organisations.tradingName })
    .from(organisations)
    .where(eq(organisations.id, organisationId))
    .get();
  return org?.tradingName?.trim() || "A client";
}

export async function notifyOrgMembers(
  db: Db,
  options: {
    organisationId: string;
    kind: NotificationKind;
    title: string;
    body: string;
    href: string;
  },
) {
  const members = await orgMemberUserIds(db, options.organisationId);
  await createNotifications(db, {
    ...options,
    userIds: members,
  });
}

/** Congratulate org members when their website goes live. */
export async function notifyWebsiteLive(
  db: Db,
  options: {
    organisationId: string;
    tradingName: string;
    liveUrl: string;
  },
) {
  await notifyOrgMembers(db, {
    organisationId: options.organisationId,
    kind: "website_live",
    title: "Congratulations — your website is live!",
    body: `${options.tradingName} is live at ${options.liveUrl}. Open your dashboard to visit the site.`,
    href: "/dashboard",
  });
  await notifyStaffUsers(db, {
    organisationId: options.organisationId,
    kind: "website_live",
    title: "Website marked live",
    body: `${options.tradingName} is live at ${options.liveUrl}.`,
    href: `/admin/clients/${options.organisationId}`,
  });
}

export async function notifyWebsiteNotLive(
  db: Db,
  options: { organisationId: string; tradingName: string },
) {
  await notifyOrgMembers(db, {
    organisationId: options.organisationId,
    kind: "website_update",
    title: "Website status updated",
    body: `${options.tradingName} is no longer marked live. We’ll update you when it’s ready again.`,
    href: "/dashboard",
  });
}

export async function notifyWebsitePreviewReady(
  db: Db,
  options: {
    organisationId: string;
    tradingName: string;
    previewUrl: string;
  },
) {
  await notifyOrgMembers(db, {
    organisationId: options.organisationId,
    kind: "website_update",
    title: "Website preview ready",
    body: `A preview of ${options.tradingName} is ready to review at ${options.previewUrl}. Tell us any changes before we go live.`,
    href: "/dashboard/website",
  });
}

export async function notifyPaymentFailed(
  db: Db,
  options: { organisationId: string; tradingName?: string | null },
) {
  const name = options.tradingName?.trim() || "your account";
  await notifyOrgMembers(db, {
    organisationId: options.organisationId,
    kind: "needs_attention",
    title: "Payment failed — update your card",
    body: `We couldn’t take the latest payment for ${name}. Please update your payment method so your website and services stay active.`,
    href: "/dashboard/billing",
  });
  await notifyStaffUsersUnlessUnread(db, {
    organisationId: options.organisationId,
    kind: "billing_update",
    title: "Payment failed",
    body: `${options.tradingName?.trim() || "A client"} — card was declined or payment failed.`,
    href: `/admin/clients/${options.organisationId}?tab=billing`,
  });
}

export async function notifyGbpAccessGranted(
  db: Db,
  options: { organisationId: string; tradingName: string },
) {
  await notifyOrgMembers(db, {
    organisationId: options.organisationId,
    kind: "gbp_granted",
    title: "Google Business access confirmed",
    body: `We’ve confirmed Manager access for ${options.tradingName}. Weekly posts and review help can start.`,
    href: "/dashboard/google-business",
  });
}

export async function notifyCustomerStatusUpdate(
  db: Db,
  options: {
    organisationId: string;
    tradingName: string;
    status: string;
  },
) {
  await notifyOrgMembers(db, {
    organisationId: options.organisationId,
    kind: "status_update",
    title: "Account status updated",
    body: `${options.tradingName} is now marked “${options.status}”.`,
    href: "/dashboard",
  });
}

export async function notifyCustomerDomainUpdate(
  db: Db,
  options: {
    organisationId: string;
    domainName: string;
    status: string;
  },
) {
  const needsAttention = options.status === "unavailable";
  await notifyOrgMembers(db, {
    organisationId: options.organisationId,
    kind: needsAttention ? "needs_attention" : "domain_update",
    title: needsAttention
      ? "Action needed on your domain"
      : "Domain progress update",
    body: needsAttention
      ? `${options.domainName} looks unavailable — please contact support to pick another.`
      : `${options.domainName} is now ${options.status.replaceAll("_", " ")}.`,
    href: needsAttention ? "/dashboard/support" : "/dashboard/domain",
  });
}

export async function notifyCustomerNeedsAttention(
  db: Db,
  options: {
    organisationId: string;
    title: string;
    body: string;
    href?: string;
  },
) {
  await notifyOrgMembers(db, {
    organisationId: options.organisationId,
    kind: "needs_attention",
    title: options.title,
    body: options.body,
    href: options.href ?? "/dashboard",
  });
}

export async function notifyStaffNewProspect(
  db: Db,
  options: {
    tradingName: string;
    email?: string | null;
    orderId: string;
  },
) {
  await notifyStaffUsers(db, {
    organisationId: null,
    kind: "new_prospect",
    title: "New prospect started checkout",
    body: options.email
      ? `${options.tradingName || "New business"} · ${options.email}`
      : options.tradingName || "Someone started Get started",
    href: "/admin/orders",
  });
}

export async function notifyStaffNewCustomer(
  db: Db,
  options: {
    organisationId: string;
    tradingName: string;
    email?: string | null;
  },
) {
  await notifyStaffUsers(db, {
    organisationId: options.organisationId,
    kind: "new_customer",
    title: "New customer joined",
    body: options.email
      ? `${options.tradingName} · ${options.email}`
      : options.tradingName,
    href: `/admin/clients/${options.organisationId}`,
  });
}

export async function notifyStaffGbpCustomerUpdate(
  db: Db,
  options: {
    organisationId: string;
    tradingName: string;
    outcome: string;
  },
) {
  const label =
    options.outcome === "invitation_sent"
      ? "Manager invite sent — please accept"
      : options.outcome === "help_requested"
        ? "Customer needs help with GMB"
        : options.outcome === "no_profile"
          ? "Customer has no GMB profile yet"
          : "GMB status updated";
  await notifyStaffUsers(db, {
    organisationId: options.organisationId,
    kind: "gbp_update",
    title: label,
    body: options.tradingName,
    href: `/admin/clients/${options.organisationId}`,
  });
}

export async function notifyStaffMediaUploaded(
  db: Db,
  options: {
    organisationId?: string | null;
    pendingOrderId?: string | null;
    categoryLabel: string;
    filename: string;
  },
) {
  if (options.organisationId) {
    const tradingName = await organisationTradingName(
      db,
      options.organisationId,
    );
    await notifyStaffUsersUnlessUnread(db, {
      organisationId: options.organisationId,
      kind: "media_upload",
      title: "New images uploaded",
      body: `${tradingName} added ${options.categoryLabel.toLowerCase()}${options.filename ? ` (${options.filename})` : ""}.`,
      href: `/admin/clients/${options.organisationId}?tab=images`,
    });
    return;
  }

  if (!options.pendingOrderId) return;
  const order = await db
    .select({
      tradingName: pendingOrders.tradingName,
      email: pendingOrders.email,
    })
    .from(pendingOrders)
    .where(eq(pendingOrders.id, options.pendingOrderId))
    .get();
  const who =
    order?.tradingName?.trim() ||
    order?.email?.trim() ||
    "A prospect";
  await notifyStaffUsers(db, {
    organisationId: null,
    kind: "media_upload",
    title: "Prospect uploaded images",
    body: `${who} added ${options.categoryLabel.toLowerCase()}${options.filename ? ` (${options.filename})` : ""}.`,
    href: "/admin/media",
  });
}

export async function notifyStaffBillingChange(
  db: Db,
  options: {
    organisationId: string;
    tradingName?: string | null;
    title: string;
    detail: string;
  },
) {
  const name = options.tradingName?.trim() || "A client";
  await notifyStaffUsersUnlessUnread(db, {
    organisationId: options.organisationId,
    kind: "billing_update",
    title: options.title,
    body: `${name} — ${options.detail}`,
    href: `/admin/clients/${options.organisationId}?tab=billing`,
  });
}

export async function notifyStaffMailboxUpdate(
  db: Db,
  options: {
    organisationId: string;
    tradingName: string;
    localPart: string;
    migrationRequired: boolean;
  },
) {
  const extra = options.migrationRequired
    ? " They asked for help moving from an existing mailbox."
    : "";
  await notifyStaffUsersUnlessUnread(db, {
    organisationId: options.organisationId,
    kind: "mailbox_update",
    title: "Mailbox preference updated",
    body: `${options.tradingName} wants ${options.localPart || "a mailbox"}@their domain.${extra}`,
    href: `/admin/clients/${options.organisationId}?tab=email`,
  });
}

export async function listNotificationsForUser(
  db: Db,
  userId: string,
  limit = 20,
): Promise<NotificationItem[]> {
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .all();
  return rows.map((n) => ({
    id: n.id,
    kind: n.kind,
    title: n.title,
    body: n.body,
    href: n.href,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    createdAt: n.createdAt ? n.createdAt.toISOString() : null,
  }));
}

export async function countUnreadNotifications(db: Db, userId: string) {
  const rows = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
    .all();
  return rows.length;
}

export async function markNotificationRead(db: Db, userId: string, id: string) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(db: Db, userId: string) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}

export async function getNotificationsFeed(
  db: Db,
  userId: string,
  limit = 15,
) {
  const [items, unread] = await Promise.all([
    listNotificationsForUser(db, userId, limit),
    countUnreadNotifications(db, userId),
  ]);
  return { items, unread };
}
