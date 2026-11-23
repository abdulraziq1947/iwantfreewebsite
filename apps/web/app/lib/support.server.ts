import {
  createDb,
  desc,
  asc,
  eq,
  inArray,
  isNull,
  and,
  organisations,
  memberships,
  platformRoles,
  supportTickets,
  ticketMessages,
  notifications,
  user,
} from "@iwfw/db";
import { newId } from "./ids";
import {
  ticketStatusLabel,
  type TicketCategory,
  type TicketStatus,
} from "./support";

type Db = ReturnType<typeof createDb>;

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

async function createNotifications(
  db: Db,
  options: {
    userIds: string[];
    organisationId: string | null;
    kind:
      | "ticket_created"
      | "ticket_reply_customer"
      | "ticket_reply_staff"
      | "ticket_status"
      | "website_live";
    title: string;
    body: string;
    href: string;
  },
) {
  const now = new Date();
  for (const userId of options.userIds) {
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

/** Congratulate org members when their website goes live. */
export async function notifyWebsiteLive(
  db: Db,
  options: {
    organisationId: string;
    tradingName: string;
    liveUrl: string;
  },
) {
  const members = await orgMemberUserIds(db, options.organisationId);
  if (members.length === 0) return;
  await createNotifications(db, {
    userIds: members,
    organisationId: options.organisationId,
    kind: "website_live",
    title: "Congratulations — your website is live!",
    body: `${options.tradingName} is live at ${options.liveUrl}. Open your dashboard to visit the site.`,
    href: "/dashboard",
  });
}

export async function listCustomerTickets(db: Db, organisationIds: string[]) {
  if (organisationIds.length === 0) return [];
  const tickets = await db
    .select()
    .from(supportTickets)
    .where(inArray(supportTickets.organisationId, organisationIds))
    .orderBy(desc(supportTickets.lastMessageAt))
    .all();
  const orgs = await db
    .select()
    .from(organisations)
    .where(inArray(organisations.id, organisationIds))
    .all();
  const orgName = new Map(orgs.map((o) => [o.id, o.tradingName]));
  return tickets.map((t) => ({
    id: t.id,
    organisationId: t.organisationId,
    tradingName: orgName.get(t.organisationId) ?? "Your website",
    subject: t.subject,
    category: t.category,
    status: t.status,
    lastMessageAt: t.lastMessageAt ? t.lastMessageAt.toISOString() : null,
    lastMessageBy: t.lastMessageBy,
    unread: t.customerUnreadCount,
    createdAt: t.createdAt ? t.createdAt.toISOString() : null,
  }));
}

export async function listAdminTickets(db: Db) {
  const tickets = await db
    .select()
    .from(supportTickets)
    .orderBy(desc(supportTickets.lastMessageAt))
    .all();
  const orgs = await db.select().from(organisations).all();
  const orgName = new Map(orgs.map((o) => [o.id, o.tradingName]));
  return tickets.map((t) => ({
    id: t.id,
    organisationId: t.organisationId,
    tradingName: orgName.get(t.organisationId) ?? "Unknown",
    subject: t.subject,
    category: t.category,
    status: t.status,
    lastMessageAt: t.lastMessageAt ? t.lastMessageAt.toISOString() : null,
    lastMessageBy: t.lastMessageBy,
    unread: t.staffUnreadCount,
    createdAt: t.createdAt ? t.createdAt.toISOString() : null,
  }));
}

export async function getTicketThread(
  db: Db,
  ticketId: string,
  options?: { organisationIds?: string[] },
) {
  const ticket = await db
    .select()
    .from(supportTickets)
    .where(eq(supportTickets.id, ticketId))
    .get();
  if (!ticket) return null;
  if (
    options?.organisationIds &&
    !options.organisationIds.includes(ticket.organisationId)
  ) {
    return null;
  }

  const org = await db
    .select()
    .from(organisations)
    .where(eq(organisations.id, ticket.organisationId))
    .get();

  const messages = await db
    .select()
    .from(ticketMessages)
    .where(eq(ticketMessages.ticketId, ticketId))
    .orderBy(asc(ticketMessages.createdAt))
    .all();

  const authorIds = [...new Set(messages.map((m) => m.authorUserId))];
  const authors =
    authorIds.length > 0
      ? await db.select().from(user).where(inArray(user.id, authorIds)).all()
      : [];
  const authorById = new Map(authors.map((a) => [a.id, a]));

  return {
    ticket: {
      id: ticket.id,
      organisationId: ticket.organisationId,
      tradingName: org?.tradingName ?? "Unknown",
      subject: ticket.subject,
      category: ticket.category,
      status: ticket.status,
      lastMessageAt: ticket.lastMessageAt
        ? ticket.lastMessageAt.toISOString()
        : null,
      lastMessageBy: ticket.lastMessageBy,
      customerUnreadCount: ticket.customerUnreadCount,
      staffUnreadCount: ticket.staffUnreadCount,
      createdAt: ticket.createdAt ? ticket.createdAt.toISOString() : null,
    },
    messages: messages.map((m) => ({
      id: m.id,
      authorKind: m.authorKind,
      authorName: authorById.get(m.authorUserId)?.name ?? "Unknown",
      body: m.body,
      createdAt: m.createdAt ? m.createdAt.toISOString() : null,
    })),
  };
}

export async function createCustomerTicket(
  db: Db,
  options: {
    organisationId: string;
    userId: string;
    subject: string;
    category: TicketCategory;
    body: string;
  },
) {
  const subject = options.subject.trim().slice(0, 160);
  const body = options.body.trim().slice(0, 8000);
  if (subject.length < 3) return { error: "Please add a short subject." };
  if (body.length < 5) return { error: "Please describe your request." };

  const now = new Date();
  const ticketId = newId("tkt");
  const messageId = newId("tmsg");

  await db.insert(supportTickets).values({
    id: ticketId,
    organisationId: options.organisationId,
    createdByUserId: options.userId,
    subject,
    category: options.category,
    status: "awaiting_staff",
    lastMessageAt: now,
    lastMessageBy: "customer",
    customerUnreadCount: 0,
    staffUnreadCount: 1,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(ticketMessages).values({
    id: messageId,
    ticketId,
    authorUserId: options.userId,
    authorKind: "customer",
    body,
    createdAt: now,
  });

  const staffIds = await staffUserIds(db);
  await createNotifications(db, {
    userIds: staffIds,
    organisationId: options.organisationId,
    kind: "ticket_created",
    title: "New support ticket",
    body: subject,
    href: `/admin/support/${ticketId}`,
  });

  return { ok: true as const, ticketId };
}

export async function replyToTicket(
  db: Db,
  options: {
    ticketId: string;
    userId: string;
    body: string;
    as: "customer" | "staff";
    organisationIds?: string[];
  },
) {
  const body = options.body.trim().slice(0, 8000);
  if (body.length < 1) return { error: "Message cannot be empty." };

  const ticket = await db
    .select()
    .from(supportTickets)
    .where(eq(supportTickets.id, options.ticketId))
    .get();
  if (!ticket) return { error: "Ticket not found." };
  if (
    options.as === "customer" &&
    options.organisationIds &&
    !options.organisationIds.includes(ticket.organisationId)
  ) {
    return { error: "Forbidden." };
  }
  if (ticket.status === "closed") {
    return { error: "This ticket is closed." };
  }

  const now = new Date();
  await db.insert(ticketMessages).values({
    id: newId("tmsg"),
    ticketId: ticket.id,
    authorUserId: options.userId,
    authorKind: options.as,
    body,
    createdAt: now,
  });

  if (options.as === "staff") {
    await db
      .update(supportTickets)
      .set({
        lastMessageAt: now,
        lastMessageBy: "staff",
        status: ticket.status === "resolved" ? "resolved" : "awaiting_customer",
        customerUnreadCount: ticket.customerUnreadCount + 1,
        staffUnreadCount: 0,
        updatedAt: now,
      })
      .where(eq(supportTickets.id, ticket.id));

    const memberIds = await orgMemberUserIds(db, ticket.organisationId);
    await createNotifications(db, {
      userIds: memberIds,
      organisationId: ticket.organisationId,
      kind: "ticket_reply_staff",
      title: "Support replied",
      body: ticket.subject,
      href: `/dashboard/support/${ticket.id}`,
    });
  } else {
    await db
      .update(supportTickets)
      .set({
        lastMessageAt: now,
        lastMessageBy: "customer",
        status: "awaiting_staff",
        staffUnreadCount: ticket.staffUnreadCount + 1,
        customerUnreadCount: 0,
        updatedAt: now,
      })
      .where(eq(supportTickets.id, ticket.id));

    const staffIds = await staffUserIds(db);
    await createNotifications(db, {
      userIds: staffIds,
      organisationId: ticket.organisationId,
      kind: "ticket_reply_customer",
      title: "Customer replied",
      body: ticket.subject,
      href: `/admin/support/${ticket.id}`,
    });
  }

  return { ok: true as const };
}

export async function updateTicketStatus(
  db: Db,
  options: {
    ticketId: string;
    status: TicketStatus;
    actorUserId: string;
  },
) {
  const ticket = await db
    .select()
    .from(supportTickets)
    .where(eq(supportTickets.id, options.ticketId))
    .get();
  if (!ticket) return { error: "Ticket not found." };

  const now = new Date();
  await db
    .update(supportTickets)
    .set({ status: options.status, updatedAt: now })
    .where(eq(supportTickets.id, ticket.id));

  const memberIds = await orgMemberUserIds(db, ticket.organisationId);
  await createNotifications(db, {
    userIds: memberIds,
    organisationId: ticket.organisationId,
    kind: "ticket_status",
    title: "Ticket updated",
    body: `${ticket.subject} is now ${ticketStatusLabel(options.status)}.`,
    href: `/dashboard/support/${ticket.id}`,
  });

  return { ok: true as const };
}

export async function markTicketRead(
  db: Db,
  ticketId: string,
  side: "customer" | "staff",
) {
  const now = new Date();
  if (side === "customer") {
    await db
      .update(supportTickets)
      .set({ customerUnreadCount: 0, updatedAt: now })
      .where(eq(supportTickets.id, ticketId));
  } else {
    await db
      .update(supportTickets)
      .set({ staffUnreadCount: 0, updatedAt: now })
      .where(eq(supportTickets.id, ticketId));
  }
}

export async function listNotificationsForUser(
  db: Db,
  userId: string,
  limit = 20,
) {
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

export async function countOpenStaffTickets(db: Db) {
  const rows = await db.select().from(supportTickets).all();
  return rows.filter(
    (t) =>
      t.status === "open" ||
      t.status === "awaiting_staff" ||
      t.staffUnreadCount > 0,
  ).length;
}

export async function countCustomerUnreadTickets(
  db: Db,
  organisationIds: string[],
) {
  if (organisationIds.length === 0) return 0;
  const rows = await db
    .select()
    .from(supportTickets)
    .where(inArray(supportTickets.organisationId, organisationIds))
    .all();
  return rows.reduce((sum, t) => sum + t.customerUnreadCount, 0);
}
