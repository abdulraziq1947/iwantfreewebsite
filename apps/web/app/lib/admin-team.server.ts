import {
  hashPassword,
  requireStaff,
  type AuthContext,
} from "@iwfw/auth";
import {
  platformRoles as platformRoleValues,
  type PlatformRole,
} from "@iwfw/config";
import {
  account,
  createDb,
  desc,
  eq,
  memberships,
  organisations,
  platformRoles,
  user,
} from "@iwfw/db";
import { newId } from "./ids";
import { writeAuditLog } from "./audit-log.server";

type Db = ReturnType<typeof createDb>;

export const TEAM_MANAGER_ROLES: PlatformRole[] = [
  "platform_owner",
  "administrator",
];

export const PLATFORM_ROLE_LABELS: Record<PlatformRole, string> = {
  platform_owner: "Platform owner",
  administrator: "Administrator",
  website_developer: "Website developer",
  gbp_manager: "GBP manager",
  support_agent: "Support agent",
};

export function assertCanManageTeam(auth: AuthContext): void {
  requireStaff(auth, TEAM_MANAGER_ROLES);
}

export function assignableRolesFor(actor: AuthContext): PlatformRole[] {
  if (actor.staffRoles.includes("platform_owner")) {
    return [...platformRoleValues];
  }
  // Administrators may create ops roles but not elevate to platform_owner.
  return platformRoleValues.filter((role) => role !== "platform_owner");
}

export function isAssignableRole(
  actor: AuthContext,
  role: string,
): role is PlatformRole {
  return assignableRolesFor(actor).includes(role as PlatformRole);
}

export type StaffMemberRow = {
  userId: string;
  name: string;
  email: string;
  roles: PlatformRole[];
  createdAt: Date | null;
};

export async function listStaffMembers(db: Db): Promise<StaffMemberRow[]> {
  const rows = await db
    .select({
      userId: user.id,
      name: user.name,
      email: user.email,
      role: platformRoles.role,
      createdAt: user.createdAt,
    })
    .from(platformRoles)
    .innerJoin(user, eq(platformRoles.userId, user.id))
    .orderBy(desc(user.createdAt))
    .all();

  const byUser = new Map<string, StaffMemberRow>();
  for (const row of rows) {
    const existing = byUser.get(row.userId);
    if (existing) {
      if (!existing.roles.includes(row.role)) {
        existing.roles.push(row.role);
      }
      continue;
    }
    byUser.set(row.userId, {
      userId: row.userId,
      name: row.name,
      email: row.email,
      roles: [row.role],
      createdAt: row.createdAt ?? null,
    });
  }
  return [...byUser.values()];
}

async function createCredentialUser(
  db: Db,
  input: { name: string; email: string; password: string },
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (!name || !email || !password) {
    return { ok: false, error: "Please complete all fields." };
  }
  if (password.length < 10) {
    return { ok: false, error: "Password must be at least 10 characters." };
  }

  const existing = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .get();
  if (existing) {
    return { ok: false, error: "An account with that email already exists." };
  }

  const userId = newId("user");
  const now = new Date();
  const hashed = await hashPassword(password);
  await db.insert(user).values({
    id: userId,
    name,
    email,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(account).values({
    id: newId("acc"),
    accountId: userId,
    providerId: "credential",
    userId,
    password: hashed,
    createdAt: now,
    updatedAt: now,
  });
  return { ok: true, userId };
}

export async function createStaffMember(
  db: Db,
  actor: AuthContext,
  input: {
    name: string;
    email: string;
    password: string;
    role: string;
    ip?: string | null;
  },
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  assertCanManageTeam(actor);
  if (!isAssignableRole(actor, input.role)) {
    return { ok: false, error: "You cannot assign that staff role." };
  }

  const created = await createCredentialUser(db, input);
  if (!created.ok) return created;

  await db.insert(platformRoles).values({
    id: newId("role"),
    userId: created.userId,
    role: input.role,
  });

  await writeAuditLog(db, {
    actorUserId: actor.userId,
    action: "staff.created",
    entityType: "user",
    entityId: created.userId,
    diff: { email: input.email.trim().toLowerCase(), role: input.role },
    ip: input.ip,
  });

  return { ok: true, userId: created.userId };
}

export async function grantStaffRoleToExistingUser(
  db: Db,
  actor: AuthContext,
  input: { email: string; role: string; ip?: string | null },
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  assertCanManageTeam(actor);
  if (!isAssignableRole(actor, input.role)) {
    return { ok: false, error: "You cannot assign that staff role." };
  }

  const email = input.email.trim().toLowerCase();
  if (!email) {
    return { ok: false, error: "Email is required." };
  }

  const existing = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(eq(user.email, email))
    .get();
  if (!existing) {
    return {
      ok: false,
      error: "No account found for that email. Create a new staff account instead.",
    };
  }

  const roleRows = await db
    .select()
    .from(platformRoles)
    .where(eq(platformRoles.userId, existing.id))
    .all();
  if (roleRows.some((r) => r.role === input.role)) {
    return { ok: false, error: "That user already has this staff role." };
  }

  await db.insert(platformRoles).values({
    id: newId("role"),
    userId: existing.id,
    role: input.role,
  });

  await writeAuditLog(db, {
    actorUserId: actor.userId,
    action: "staff.role_granted",
    entityType: "user",
    entityId: existing.id,
    diff: { email, role: input.role },
    ip: input.ip,
  });

  return { ok: true, userId: existing.id };
}

export async function createCustomerUser(
  db: Db,
  actor: AuthContext,
  input: {
    name: string;
    email: string;
    password: string;
    tradingName: string;
    ip?: string | null;
  },
): Promise<
  | { ok: true; userId: string; organisationId: string }
  | { ok: false; error: string }
> {
  assertCanManageTeam(actor);

  const tradingName = input.tradingName.trim();
  if (!tradingName) {
    return { ok: false, error: "Business / trading name is required." };
  }

  const created = await createCredentialUser(db, input);
  if (!created.ok) return created;

  const organisationId = newId("org");
  await db.insert(organisations).values({
    id: organisationId,
    tradingName,
    status: "prospect",
  });
  await db.insert(memberships).values({
    id: newId("mem"),
    organisationId,
    userId: created.userId,
    role: "customer",
  });

  await writeAuditLog(db, {
    actorUserId: actor.userId,
    organisationId,
    action: "customer.created_by_admin",
    entityType: "user",
    entityId: created.userId,
    diff: {
      email: input.email.trim().toLowerCase(),
      tradingName,
    },
    ip: input.ip,
  });

  return { ok: true, userId: created.userId, organisationId };
}
