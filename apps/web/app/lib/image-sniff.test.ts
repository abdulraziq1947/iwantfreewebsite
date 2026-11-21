import { describe, expect, it } from "vitest";
import {
  extensionForContentType,
  isUploadCategory,
  MAX_UPLOAD_BYTES,
  MAX_UPLOADS_PER_ORDER,
  sniffImageContentType,
} from "./image-sniff";

function bytes(...values: number[]) {
  return new Uint8Array(values).buffer;
}

describe("image content sniffing", () => {
  it("detects JPEG from magic bytes", () => {
    const jpeg = new Uint8Array(16);
    jpeg[0] = 0xff;
    jpeg[1] = 0xd8;
    jpeg[2] = 0xff;
    expect(sniffImageContentType(jpeg)).toBe("image/jpeg");
  });

  it("detects PNG from signature", () => {
    expect(
      sniffImageContentType(
        bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0),
      ),
    ).toBe("image/png");
  });

  it("detects WebP from RIFF/WEBP", () => {
    const webp = new Uint8Array(12);
    webp.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
    expect(sniffImageContentType(webp)).toBe("image/webp");
  });

  it("rejects non-images even with image extensions implied", () => {
    expect(sniffImageContentType(bytes(0x3c, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74, 0x3e, 0, 0, 0, 0))).toBeNull();
    expect(sniffImageContentType(bytes(0x25, 0x50, 0x44, 0x46, 0, 0, 0, 0, 0, 0, 0, 0))).toBeNull();
    expect(sniffImageContentType(new Uint8Array(8))).toBeNull();
  });

  it("maps content types to safe extensions", () => {
    expect(extensionForContentType("image/jpeg")).toBe("jpg");
    expect(extensionForContentType("image/png")).toBe("png");
    expect(extensionForContentType("image/webp")).toBe("webp");
  });
});

describe("upload limits and categories", () => {
  it("enforces 10 MB max and bounded file count", () => {
    expect(MAX_UPLOAD_BYTES).toBe(10 * 1024 * 1024);
    expect(MAX_UPLOADS_PER_ORDER).toBe(20);
  });

  it("accepts only known categories", () => {
    expect(isUploadCategory("logo")).toBe(true);
    expect(isUploadCategory("business_photo")).toBe(true);
    expect(isUploadCategory("team_photo")).toBe(true);
    expect(isUploadCategory("portfolio")).toBe(true);
    expect(isUploadCategory("other")).toBe(true);
    expect(isUploadCategory("exe")).toBe(false);
    expect(isUploadCategory("../logo")).toBe(false);
  });
});
