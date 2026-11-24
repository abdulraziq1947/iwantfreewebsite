import {
  platformRoles as platformRoleValues,
  type PlatformRole,
} from "@iwfw/config";
import type { AuthContext } from "@iwfw/auth";

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
