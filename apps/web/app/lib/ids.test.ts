import { describe, expect, it } from "vitest";
import { newId } from "./ids";

describe("newId", () => {
  it("creates prefixed ids", () => {
    const id = newId("org");
    expect(id.startsWith("org_")).toBe(true);
  });
});
