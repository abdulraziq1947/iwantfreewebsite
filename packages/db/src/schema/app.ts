import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { user } from "./auth";

export const organisations = sqliteTable(
  "organisations",
  {
    id: text("id").primaryKey(),
    tradingName: text("trading_name").notNull(),
    registeredCompanyName: text("registered_company_name"),
    companiesHouseNumber: text("companies_house_number"),
    status: text("status", {
      enum: ["prospect", "active", "cancelling", "cancelled", "churned"],
    })
      .notNull()
      .default("prospect"),
    stripeCustomerId: text("stripe_customer_id"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
  },
  (t) => [
    uniqueIndex("organisations_stripe_customer_id_uidx").on(t.stripeCustomerId),
  ],
);

export const memberships = sqliteTable(
  "memberships",
  {
    id: text("id").primaryKey(),
    organisationId: text("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["customer"] })
      .notNull()
      .default("customer"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
  },
  (t) => [
    uniqueIndex("memberships_org_user_uidx").on(t.organisationId, t.userId),
    index("memberships_user_id_idx").on(t.userId),
  ],
);

export const platformRoles = sqliteTable(
  "platform_roles",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role", {
      enum: [
        "platform_owner",
        "administrator",
        "website_developer",
        "gbp_manager",
        "support_agent",
      ],
    }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
  },
  (t) => [
    uniqueIndex("platform_roles_user_role_uidx").on(t.userId, t.role),
    index("platform_roles_user_id_idx").on(t.userId),
  ],
);

export const featureFlags = sqliteTable("feature_flags", {
  key: text("key").primaryKey(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
});

export const onboardingProfiles = sqliteTable(
  "onboarding_profiles",
  {
    id: text("id").primaryKey(),
    organisationId: text("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    currentStep: integer("current_step").notNull().default(0),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    dataJson: text("data_json").notNull().default("{}"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
  },
  (t) => [
    uniqueIndex("onboarding_profiles_org_uidx").on(t.organisationId),
    index("onboarding_profiles_org_id_idx").on(t.organisationId),
  ],
);

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    actorUserId: text("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    organisationId: text("organisation_id").references(() => organisations.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    diffJson: text("diff_json"),
    ip: text("ip"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
  },
  (t) => [
    index("audit_logs_org_id_idx").on(t.organisationId),
    index("audit_logs_actor_user_id_idx").on(t.actorUserId),
  ],
);

export const checkoutSessions = sqliteTable(
  "checkout_sessions",
  {
    id: text("id").primaryKey(),
    organisationId: text("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    stripeSessionId: text("stripe_session_id").notNull(),
    stripePriceId: text("stripe_price_id").notNull(),
    status: text("status", {
      enum: ["open", "complete", "expired"],
    })
      .notNull()
      .default("open"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
  },
  (t) => [
    uniqueIndex("checkout_sessions_stripe_session_uidx").on(t.stripeSessionId),
    index("checkout_sessions_org_id_idx").on(t.organisationId),
  ],
);

export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    organisationId: text("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    stripeSubscriptionId: text("stripe_subscription_id").notNull(),
    stripeCustomerId: text("stripe_customer_id").notNull(),
    stripePriceId: text("stripe_price_id").notNull(),
    status: text("status").notNull(),
    cancelAtPeriodEnd: integer("cancel_at_period_end", { mode: "boolean" })
      .notNull()
      .default(false),
    currentPeriodStart: integer("current_period_start", {
      mode: "timestamp_ms",
    }),
    currentPeriodEnd: integer("current_period_end", { mode: "timestamp_ms" }),
    canceledAt: integer("canceled_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
  },
  (t) => [
    uniqueIndex("subscriptions_stripe_subscription_uidx").on(
      t.stripeSubscriptionId,
    ),
    index("subscriptions_org_id_idx").on(t.organisationId),
  ],
);

export const stripeEvents = sqliteTable("stripe_events", {
  stripeEventId: text("stripe_event_id").primaryKey(),
  type: text("type").notNull(),
  processedAt: integer("processed_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
});

export const assetTransferTasks = sqliteTable(
  "asset_transfer_tasks",
  {
    id: text("id").primaryKey(),
    organisationId: text("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    subscriptionId: text("subscription_id").references(() => subscriptions.id, {
      onDelete: "set null",
    }),
    status: text("status", {
      enum: ["pending", "in_progress", "completed"],
    })
      .notNull()
      .default("pending"),
    scheduledAt: integer("scheduled_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
    periodEndAt: integer("period_end_at", { mode: "timestamp_ms" }),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    adminNotes: text("admin_notes"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
  },
  (t) => [index("asset_transfer_tasks_org_id_idx").on(t.organisationId)],
);

/** Pre-payment website order (questionnaire + domain) before account exists. */
export const pendingOrders = sqliteTable(
  "pending_orders",
  {
    id: text("id").primaryKey(),
    resumeToken: text("resume_token").notNull(),
    status: text("status", {
      enum: [
        "draft",
        "ready_for_checkout",
        "checkout_open",
        "paid",
        "expired",
        "abandoned",
        "failed",
      ],
    })
      .notNull()
      .default("draft"),
    email: text("email"),
    fullName: text("full_name"),
    phone: text("phone"),
    tradingName: text("trading_name"),
    questionnaireJson: text("questionnaire_json").notNull().default("{}"),
    questionnaireStep: integer("questionnaire_step").notNull().default(0),
    domainMode: text("domain_mode", { enum: ["new", "existing"] }),
    domainName: text("domain_name"),
    domainAcknowledged: integer("domain_acknowledged", { mode: "boolean" })
      .notNull()
      .default(false),
    domainLastCheckedAt: integer("domain_last_checked_at", {
      mode: "timestamp_ms",
    }),
    domainLastAvailable: integer("domain_last_available", { mode: "boolean" }),
    termsVersion: text("terms_version"),
    termsAcceptedAt: integer("terms_accepted_at", { mode: "timestamp_ms" }),
    marketingOptIn: integer("marketing_opt_in", { mode: "boolean" })
      .notNull()
      .default(false),
    stripeCustomerId: text("stripe_customer_id"),
    stripeCheckoutSessionId: text("stripe_checkout_session_id"),
    stripePriceId: text("stripe_price_id"),
    organisationId: text("organisation_id").references(() => organisations.id, {
      onDelete: "set null",
    }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    paidAt: integer("paid_at", { mode: "timestamp_ms" }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
  },
  (t) => [
    uniqueIndex("pending_orders_resume_token_uidx").on(t.resumeToken),
    index("pending_orders_email_idx").on(t.email),
    uniqueIndex("pending_orders_stripe_session_uidx").on(
      t.stripeCheckoutSessionId,
    ),
  ],
);

export const domainRegistrationTasks = sqliteTable(
  "domain_registration_tasks",
  {
    id: text("id").primaryKey(),
    organisationId: text("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    pendingOrderId: text("pending_order_id").references(() => pendingOrders.id, {
      onDelete: "set null",
    }),
    domainName: text("domain_name").notNull(),
    domainMode: text("domain_mode", { enum: ["new", "existing"] }).notNull(),
    status: text("status", {
      enum: [
        "pending",
        "in_progress",
        "registered",
        "connected",
        "unavailable",
        "cancelled",
      ],
    })
      .notNull()
      .default("pending"),
    adminNotes: text("admin_notes"),
    /** Public URL shown to the customer once the site is live. */
    liveUrl: text("live_url"),
    registeredAt: integer("registered_at", { mode: "timestamp_ms" }),
    connectedAt: integer("connected_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
  },
  (t) => [
    index("domain_registration_tasks_org_id_idx").on(t.organisationId),
  ],
);

/** Per-customer mailbox access details (set by staff once provisioned). */
export const organisationMailboxes = sqliteTable(
  "organisation_mailboxes",
  {
    id: text("id").primaryKey(),
    organisationId: text("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    emailAddress: text("email_address").notNull(),
    username: text("username"),
    webmailUrl: text("webmail_url"),
    imapHost: text("imap_host"),
    imapPort: integer("imap_port").default(993),
    imapSecurity: text("imap_security", {
      enum: ["ssl", "starttls", "none"],
    }).default("ssl"),
    smtpHost: text("smtp_host"),
    smtpPort: integer("smtp_port").default(465),
    smtpSecurity: text("smtp_security", {
      enum: ["ssl", "starttls", "none"],
    }).default("ssl"),
    popHost: text("pop_host"),
    popPort: integer("pop_port").default(995),
    popSecurity: text("pop_security", {
      enum: ["ssl", "starttls", "none"],
    }).default("ssl"),
    status: text("status", {
      enum: ["pending", "active", "suspended"],
    })
      .notNull()
      .default("pending"),
    /** Shown to the customer (e.g. password delivery note). */
    customerNotes: text("customer_notes"),
    adminNotes: text("admin_notes"),
    provisionedAt: integer("provisioned_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
  },
  (t) => [
    uniqueIndex("organisation_mailboxes_org_uidx").on(t.organisationId),
  ],
);

export const accountActivationTokens = sqliteTable(
  "account_activation_tokens",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organisationId: text("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    pendingOrderId: text("pending_order_id").references(() => pendingOrders.id, {
      onDelete: "set null",
    }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    usedAt: integer("used_at", { mode: "timestamp_ms" }),
    /** Set after Resend accepts the activation email (never store the raw token). */
    emailSentAt: integer("email_sent_at", { mode: "timestamp_ms" }),
    /** Last send attempt (success or failure) — used for resend rate limiting. */
    lastEmailAttemptAt: integer("last_email_attempt_at", {
      mode: "timestamp_ms",
    }),
    emailSendCount: integer("email_send_count").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
  },
  (t) => [
    uniqueIndex("account_activation_tokens_hash_uidx").on(t.tokenHash),
    index("account_activation_tokens_user_id_idx").on(t.userId),
  ],
);

/** Short-lived upload authorisation for pre-account pending orders. */
export const uploadSessions = sqliteTable(
  "upload_sessions",
  {
    id: text("id").primaryKey(),
    pendingOrderId: text("pending_order_id")
      .notNull()
      .references(() => pendingOrders.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
    lastUsedAt: integer("last_used_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    uniqueIndex("upload_sessions_token_hash_uidx").on(t.tokenHash),
    index("upload_sessions_pending_order_id_idx").on(t.pendingOrderId),
  ],
);

export const customerUploads = sqliteTable(
  "customer_uploads",
  {
    id: text("id").primaryKey(),
    pendingOrderId: text("pending_order_id").references(() => pendingOrders.id, {
      onDelete: "set null",
    }),
    organisationId: text("organisation_id").references(() => organisations.id, {
      onDelete: "set null",
    }),
    category: text("category", {
      enum: [
        "logo",
        "business_photo",
        "team_photo",
        "portfolio",
        "other",
      ],
    }).notNull(),
    originalFilename: text("original_filename").notNull(),
    contentType: text("content_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    r2Key: text("r2_key").notNull(),
    status: text("status", {
      enum: ["ready", "deleted"],
    })
      .notNull()
      .default("ready"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    uniqueIndex("customer_uploads_r2_key_uidx").on(t.r2Key),
    index("customer_uploads_pending_order_id_idx").on(t.pendingOrderId),
    index("customer_uploads_organisation_id_idx").on(t.organisationId),
  ],
);

export const uploadRateLimits = sqliteTable("upload_rate_limits", {
  id: text("id").primaryKey(),
  windowStartedAt: integer("window_started_at", {
    mode: "timestamp_ms",
  }).notNull(),
  requestCount: integer("request_count").notNull().default(0),
});

/** Customer ↔ staff support tickets. */
export const supportTickets = sqliteTable(
  "support_tickets",
  {
    id: text("id").primaryKey(),
    organisationId: text("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    subject: text("subject").notNull(),
    category: text("category", {
      enum: ["issue", "request", "billing", "website", "other"],
    })
      .notNull()
      .default("issue"),
    status: text("status", {
      enum: [
        "open",
        "awaiting_customer",
        "awaiting_staff",
        "resolved",
        "closed",
      ],
    })
      .notNull()
      .default("open"),
    lastMessageAt: integer("last_message_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
    lastMessageBy: text("last_message_by", {
      enum: ["customer", "staff"],
    })
      .notNull()
      .default("customer"),
    customerUnreadCount: integer("customer_unread_count").notNull().default(0),
    staffUnreadCount: integer("staff_unread_count").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
  },
  (t) => [
    index("support_tickets_org_id_idx").on(t.organisationId),
    index("support_tickets_status_idx").on(t.status),
    index("support_tickets_last_message_at_idx").on(t.lastMessageAt),
  ],
);

export const ticketMessages = sqliteTable(
  "ticket_messages",
  {
    id: text("id").primaryKey(),
    ticketId: text("ticket_id")
      .notNull()
      .references(() => supportTickets.id, { onDelete: "cascade" }),
    authorUserId: text("author_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    authorKind: text("author_kind", {
      enum: ["customer", "staff"],
    }).notNull(),
    body: text("body").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
  },
  (t) => [
    index("ticket_messages_ticket_id_idx").on(t.ticketId),
    index("ticket_messages_created_at_idx").on(t.createdAt),
  ],
);

/** In-app notifications for customers and staff. */
export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organisationId: text("organisation_id").references(() => organisations.id, {
      onDelete: "set null",
    }),
    kind: text("kind", {
      enum: [
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
      ],
    }).notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    href: text("href").notNull(),
    readAt: integer("read_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
  },
  (t) => [
    index("notifications_user_id_idx").on(t.userId),
    index("notifications_user_unread_idx").on(t.userId, t.readAt),
  ],
);
