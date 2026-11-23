import {
  createDb,
  desc,
  eq,
  isNull,
  and,
  memberships,
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
