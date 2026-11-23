import { and, createDb, eq, memberships, platformRoles, user } from "@iwfw/db";
import {
  isStaffRole,
  type PlatformRole,
} from "@iwfw/config";

export type AuthContext = {
  userId: string;
  email: string;
  name: string;
  /** Better Auth two-factor enrollment flag (staff MFA gate). */
  twoFactorEnabled: boolean;
  staffRoles: PlatformRole[];
  memberships: Array<{ organisationId: string; role: "customer" }>;
};

export async function loadAuthContext(
  d1: D1Database,
  sessionUser: { id: string; email: string; name: string },
): Promise<AuthContext> {
  const db = createDb(d1);

  const roles = await db
    .select()
    .from(platformRoles)
    .where(eq(platformRoles.userId, sessionUser.id));

  const orgs = await db
    .select()
    .from(memberships)
    .where(eq(memberships.userId, sessionUser.id));

  const row = await db
    .select({ twoFactorEnabled: user.twoFactorEnabled })
    .from(user)
    .where(eq(user.id, sessionUser.id))
    .get();

  return {
    userId: sessionUser.id,
    email: sessionUser.email,
    name: sessionUser.name,
    twoFactorEnabled: Boolean(row?.twoFactorEnabled),
    staffRoles: roles
      .map((r) => r.role)
      .filter((r): r is PlatformRole => isStaffRole(r)),
    memberships: orgs.map((m) => ({
      organisationId: m.organisationId,
      role: "customer" as const,
    })),
  };
}

export function requireStaff(
  ctx: AuthContext,
  allowed: PlatformRole[] = [
    "platform_owner",
    "administrator",
    "website_developer",
    "gbp_manager",
    "support_agent",
  ],
): void {
  const ok = ctx.staffRoles.some((r) => allowed.includes(r));
  if (!ok) {
    throw new Response("Forbidden", { status: 403 });
  }
}

export function requireOrgMember(
  ctx: AuthContext,
  organisationId: string,
): void {
  if (ctx.staffRoles.length > 0) {
    // Staff may access across orgs; still prefer explicit checks in loaders.
    return;
  }
  const member = ctx.memberships.some(
    (m) => m.organisationId === organisationId,
  );
  if (!member) {
    throw new Response("Forbidden", { status: 403 });
  }
}

export function organisationIdsForCustomer(ctx: AuthContext): string[] {
  return ctx.memberships.map((m) => m.organisationId);
}

export async function assertOrganisationAccess(
  d1: D1Database,
  userId: string,
  organisationId: string,
  staffRoles: PlatformRole[],
): Promise<void> {
  if (staffRoles.length > 0) return;
  const db = createDb(d1);
  const row = await db
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, userId),
        eq(memberships.organisationId, organisationId),
      ),
    )
    .get();
  if (!row) {
    throw new Response("Forbidden", { status: 403 });
  }
}
