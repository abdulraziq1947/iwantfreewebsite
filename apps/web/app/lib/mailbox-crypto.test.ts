import { describe, expect, it } from "vitest";
import { parseWorkerEnv } from "@iwfw/config";
import {
  decryptMailboxPassword,
  encryptMailboxPassword,
  isEncryptedMailboxPassword,
  redactMailboxSecret,
} from "./mailbox-crypto.server";

const config = parseWorkerEnv({
  APP_URL: "http://localhost:5173",
  APP_ENV: "development",
  BETTER_AUTH_SECRET: "x".repeat(32),
});

describe("mailbox crypto", () => {
  it("round-trips a password", async () => {
    const enc = await encryptMailboxPassword(config, "S3cret!mail");
    expect(enc).toBeTruthy();
    expect(isEncryptedMailboxPassword(enc)).toBe(true);
    expect(await decryptMailboxPassword(config, enc)).toBe("S3cret!mail");
  });

  it("passes through legacy plaintext", async () => {
    expect(await decryptMailboxPassword(config, "legacy-plain")).toBe(
      "legacy-plain",
    );
  });

  it("keeps plaintext readable when encryption key changes", async () => {
    const other = parseWorkerEnv({
      APP_URL: "http://localhost:5173",
      APP_ENV: "development",
      BETTER_AUTH_SECRET: "y".repeat(32),
      MAILBOX_ENCRYPTION_KEY: "dedicated-mailbox-key-for-tests-32b",
    });
    expect(await decryptMailboxPassword(other, "still-plain")).toBe(
      "still-plain",
    );
    const enc = await encryptMailboxPassword(config, "only-with-old-key");
    expect(await decryptMailboxPassword(other, enc)).toBeNull();
    expect(await decryptMailboxPassword(config, enc)).toBe("only-with-old-key");
  });

  it("redacts secrets for logs", () => {
    expect(redactMailboxSecret("anything")).toBe("[redacted-mailbox-secret]");
  });
});
