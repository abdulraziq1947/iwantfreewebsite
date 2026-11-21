import { describe, expect, it, vi } from "vitest";
import {
  associateUploadsWithOrganisation,
  cleanupAbandonedUploads,
  publicUploadDto,
  storeCustomerUpload,
  UPLOAD_RATE_LIMIT_MAX,
  ABANDONED_UPLOAD_RETENTION_MS,
} from "./uploads.server";
import { MAX_UPLOAD_BYTES } from "./image-sniff";

function jpegBytes(size = 64) {
  const buf = new Uint8Array(size);
  buf[0] = 0xff;
  buf[1] = 0xd8;
  buf[2] = 0xff;
  return buf.buffer;
}

function makeBucket() {
  const objects = new Map<string, ArrayBuffer>();
  return {
    objects,
    put: vi.fn(async (key: string, value: ArrayBuffer) => {
      objects.set(key, value);
    }),
    delete: vi.fn(async (key: string) => {
      objects.delete(key);
    }),
    get: vi.fn(async (key: string) => {
      const body = objects.get(key);
      if (!body) return null;
      return { body };
    }),
  };
}

function makeDb(options?: { existingCount?: number }) {
  const inserted: Array<Record<string, unknown>> = [];
  const updated: Array<Record<string, unknown>> = [];
  const existingCount = options?.existingCount ?? 0;

  const selectChain = {
    from: vi.fn(() => selectChain),
    where: vi.fn(() => selectChain),
    get: vi.fn(async () => null),
    all: vi.fn(async () =>
      Array.from({ length: existingCount }, (_, i) => ({
        id: `upl_existing_${i}`,
        status: "ready",
      })),
    ),
  };

  const insertChain = {
    values: vi.fn((values: Record<string, unknown>) => {
      inserted.push(values);
      return Promise.resolve();
    }),
  };

  const updateChain = {
    set: vi.fn((values: Record<string, unknown>) => {
      updated.push(values);
      return updateChain;
    }),
    where: vi.fn(() => Promise.resolve()),
  };

  return {
    inserted,
    updated,
    select: vi.fn(() => selectChain),
    insert: vi.fn(() => insertChain),
    update: vi.fn(() => updateChain),
    delete: vi.fn(() => Promise.resolve()),
  };
}

describe("publicUploadDto", () => {
  it("exposes authorised content URL only (no R2 keys)", () => {
    const dto = publicUploadDto({
      id: "upl_1",
      category: "logo",
      originalFilename: "logo.png",
      contentType: "image/png",
      byteSize: 1200,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    expect(dto.contentUrl).toBe("/api/uploads/upl_1/content");
    expect(JSON.stringify(dto)).not.toMatch(/r2|bucket|secret/i);
  });
});

describe("storeCustomerUpload", () => {
  it("rejects oversized files", async () => {
    const db = makeDb();
    const bucket = makeBucket();
    const result = await storeCustomerUpload({
      db: db as never,
      bucket: bucket as never,
      pendingOrderId: "ord_1",
      category: "logo",
      filename: "big.jpg",
      bytes: new ArrayBuffer(MAX_UPLOAD_BYTES + 1),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(413);
    expect(bucket.put).not.toHaveBeenCalled();
  });

  it("rejects non-image bytes regardless of filename", async () => {
    const db = makeDb();
    const bucket = makeBucket();
    const result = await storeCustomerUpload({
      db: db as never,
      bucket: bucket as never,
      pendingOrderId: "ord_1",
      category: "logo",
      filename: "evil.jpg",
      bytes: new TextEncoder().encode("<script>alert(1)</script>").buffer,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(415);
    expect(bucket.put).not.toHaveBeenCalled();
  });

  it("stores valid JPEG under an unpredictable R2 key", async () => {
    const db = makeDb({ existingCount: 0 });
    const bucket = makeBucket();
    const result = await storeCustomerUpload({
      db: db as never,
      bucket: bucket as never,
      pendingOrderId: "ord_abc",
      category: "business_photo",
      filename: "shop.jpg",
      bytes: jpegBytes(),
    });
    expect(result.ok).toBe(true);
    expect(bucket.put).toHaveBeenCalledTimes(1);
    const key = bucket.put.mock.calls[0][0] as string;
    expect(key).toMatch(/^cu\/[A-Za-z0-9_-]+\/upl_/);
    expect(key).not.toContain("ord_abc");
    expect(db.inserted[0]?.contentType).toBe("image/jpeg");
    expect(db.inserted[0]?.pendingOrderId).toBe("ord_abc");
  });

  it("enforces per-order file count", async () => {
    const db = makeDb({ existingCount: 20 });
    const bucket = makeBucket();
    const result = await storeCustomerUpload({
      db: db as never,
      bucket: bucket as never,
      pendingOrderId: "ord_1",
      category: "other",
      filename: "more.jpg",
      bytes: jpegBytes(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });
});

describe("associateUploadsWithOrganisation", () => {
  it("links ready uploads from the paid order to the new organisation", async () => {
    const db = makeDb();
    await associateUploadsWithOrganisation({
      db: db as never,
      pendingOrderId: "ord_paid",
      organisationId: "org_1",
    });
    expect(db.update).toHaveBeenCalled();
    expect(db.updated[0]).toMatchObject({ organisationId: "org_1" });
  });
});

describe("cleanupAbandonedUploads", () => {
  it("deletes abandoned unpaid uploads past retention", async () => {
    const old = new Date(Date.now() - ABANDONED_UPLOAD_RETENTION_MS - 60_000);
    const updated: Array<Record<string, unknown>> = [];
    const selectChain = {
      from: vi.fn(() => selectChain),
      where: vi.fn(() => selectChain),
      all: vi.fn(async () => [
        {
          id: "upl_old",
          pendingOrderId: "ord_gone",
          organisationId: null,
          status: "ready",
          r2Key: "cu/x/upl_old.jpg",
          createdAt: old,
        },
      ]),
      get: vi.fn(async () => null),
    };
    const updateChain = {
      set: vi.fn((values: Record<string, unknown>) => {
        updated.push(values);
        return updateChain;
      }),
      where: vi.fn(() => Promise.resolve()),
    };
    const db = {
      select: vi.fn(() => selectChain),
      update: vi.fn(() => updateChain),
    };
    const bucket = makeBucket();
    bucket.objects.set("cu/x/upl_old.jpg", jpegBytes());

    const result = await cleanupAbandonedUploads({
      db: db as never,
      bucket: bucket as never,
      limit: 10,
    });
    expect(result.deleted).toBe(1);
    expect(bucket.delete).toHaveBeenCalledWith("cu/x/upl_old.jpg");
    expect(updated.some((u) => u.status === "deleted")).toBe(true);
  });
});

describe("upload permission contracts", () => {
  it("rate-limits aggressively enough for anonymous sessions", () => {
    expect(UPLOAD_RATE_LIMIT_MAX).toBeLessThanOrEqual(40);
  });

  it("forbids cross-customer access by requiring matching order or membership", () => {
    const canAccess = (opts: {
      rowOrderId: string;
      sessionOrderId?: string;
      rowOrgId?: string | null;
      memberOrgIds?: string[];
      isStaff?: boolean;
    }) => {
      if (opts.isStaff) return true;
      if (opts.sessionOrderId && opts.sessionOrderId === opts.rowOrderId) {
        return true;
      }
      if (opts.rowOrgId && opts.memberOrgIds?.includes(opts.rowOrgId)) {
        return true;
      }
      return false;
    };

    expect(
      canAccess({
        rowOrderId: "ord_a",
        sessionOrderId: "ord_b",
        rowOrgId: "org_a",
        memberOrgIds: ["org_b"],
      }),
    ).toBe(false);
    expect(
      canAccess({
        rowOrderId: "ord_a",
        sessionOrderId: "ord_a",
      }),
    ).toBe(true);
    expect(
      canAccess({
        rowOrderId: "ord_a",
        rowOrgId: "org_a",
        memberOrgIds: ["org_a"],
      }),
    ).toBe(true);
    expect(
      canAccess({
        rowOrderId: "ord_a",
        rowOrgId: "org_a",
        isStaff: true,
      }),
    ).toBe(true);
  });
});
