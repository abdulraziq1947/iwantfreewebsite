import { describe, expect, it } from "vitest";
import { organisationIdsForCustomer, type AuthContext } from "./rbac";

describe("organisationIdsForCustomer", () => {
  it("returns membership org ids", () => {
    const ctx: AuthContext = {
      userId: "u1",
      email: "a@b.com",
      name: "A",
      staffRoles: [],
      memberships: [
        { organisationId: "org1", role: "customer" },
        { organisationId: "org2", role: "customer" },
      ],
    };
    expect(organisationIdsForCustomer(ctx)).toEqual(["org1", "org2"]);
  });
});
