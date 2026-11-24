import { describe, expect, it } from "vitest";
import { confirmDeletePhrase } from "./admin-delete-client.server";

describe("admin-delete-client", () => {
  it("requires exact trimmed trading name confirmation", () => {
    expect(confirmDeletePhrase("  Acme Ltd  ")).toBe("Acme Ltd");
    expect(confirmDeletePhrase("Acme Ltd")).toBe("Acme Ltd");
  });
});
