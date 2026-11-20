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
