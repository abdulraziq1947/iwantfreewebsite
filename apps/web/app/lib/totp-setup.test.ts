import { describe, expect, it } from "vitest";
import {
  extractTotpSecret,
  formatManualSetupKey,
  manualSetupKeyFromUri,
} from "./totp-setup";

const SAMPLE_URI =
  "otpauth://totp/iwantfreewebsite:staff%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=iwantfreewebsite&algorithm=SHA1&digits=6&period=30";

describe("totp-setup", () => {
  it("extracts the Base32 secret from an otpauth URI", () => {
    expect(extractTotpSecret(SAMPLE_URI)).toBe("JBSWY3DPEHPK3PXP");
  });

  it("rejects non-otpauth URIs and missing secrets", () => {
    expect(extractTotpSecret("https://example.com/?secret=ABC")).toBeNull();
    expect(extractTotpSecret("otpauth://totp/Label?issuer=x")).toBeNull();
    expect(extractTotpSecret("not-a-url")).toBeNull();
  });

  it("formats the manual setup key in groups", () => {
    expect(formatManualSetupKey("JBSWY3DPEHPK3PXP")).toBe("JBSW Y3DP EHPK 3PXP");
  });

  it("builds a copy-friendly manual key from the URI", () => {
    expect(manualSetupKeyFromUri(SAMPLE_URI)).toBe("JBSW Y3DP EHPK 3PXP");
  });
});
