import { describe, expect, it } from "vitest";
import type { AuthContext } from "@iwfw/auth";
import {
  assignableRolesFor,
  isAssignableRole,
  PLATFORM_ROLE_LABELS,
  TEAM_MANAGER_ROLES,
} from "./admin-team";

function auth(roles: AuthContext["staffRoles"]): AuthContext {
  return {
    userId: "user_1",
    email: "a@example.com",
    name: "Admin",
    twoFactorEnabled: true,
    staffRoles: roles,
    memberships: [],
  };
}

describe("admin-team helpers", () => {
  it("limits team managers to owner and administrator", () => {
    expect(TEAM_MANAGER_ROLES).toEqual([
      "platform_owner",
      "administrator",
    ]);
  });

  it("lets platform owners assign every staff role", () => {
    const roles = assignableRolesFor(auth(["platform_owner"]));
    expect(roles).toContain("platform_owner");
    expect(roles).toContain("support_agent");
    expect(isAssignableRole(auth(["platform_owner"]), "platform_owner")).toBe(
      true,
    );
  });

  it("blocks administrators from creating platform owners", () => {
    const roles = assignableRolesFor(auth(["administrator"]));
    expect(roles).not.toContain("platform_owner");
    expect(isAssignableRole(auth(["administrator"]), "platform_owner")).toBe(
      false,
    );
    expect(isAssignableRole(auth(["administrator"]), "support_agent")).toBe(
      true,
    );
  });

  it("labels every platform role", () => {
    expect(PLATFORM_ROLE_LABELS.administrator).toBe("Administrator");
    expect(Object.keys(PLATFORM_ROLE_LABELS).length).toBe(5);
  });
});
