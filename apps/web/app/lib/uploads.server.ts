import { generateRandomString } from "@iwfw/auth";
import {
  and,
  createDb,
  customerUploads,
  eq,
  isNull,
  lt,
  pendingOrders,
  uploadRateLimits,
  uploadSessions,
} from "@iwfw/db";
import { newId } from "./ids";
import {
  extensionForContentType,
  isUploadCategory,
  MAX_UPLOAD_BYTES,
  MAX_UPLOADS_PER_ORDER,
  sniffImageContentType,
  type UploadCategory,
} from "./image-sniff";
import { log } from "./logger";
import {
  getPendingOrderByResumeToken,
  ORDER_TTL_MS,
  readResumeToken,
} from "./pending-order.server";

type Db = ReturnType<typeof createDb>;

export const UPLOAD_SESSION_COOKIE = "iwfw_upload_sess";
export const UPLOAD_SESSION_TTL_MS = 1000 * 60 * 60 * 2;
export const UPLOAD_RATE_LIMIT_WINDOW_MS = 1000 * 60 * 15;
export const UPLOAD_RATE_LIMIT_MAX = 40;
/** Abandoned unpaid uploads older than this are eligible for cleanup. */
export const ABANDONED_UPLOAD_RETENTION_MS = ORDER_TTL_MS;

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function uploadSessionCookieHeader(
  rawToken: string,
  maxAgeSec: number,
): string {
  return `${UPLOAD_SESSION_COOKIE}=${encodeURIComponent(rawToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}`;
}

export function readUploadSessionToken(request: Request): string | null {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(
    new RegExp(`(?:^|;\\s*)${UPLOAD_SESSION_COOKIE}=([^;]+)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

export function getCustomerUploadsBucket(
  env: Env,
): R2Bucket | null {
  const bucket = (env as Env & { CUSTOMER_UPLOADS?: R2Bucket }).CUSTOMER_UPLOADS;
  return bucket ?? null;
}

export async function assertUploadRateLimit(
  db: Db,
  key: string,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const now = Date.now();
  const row = await db
    .select()
    .from(uploadRateLimits)
    .where(eq(uploadRateLimits.id, key))
    .get();

  if (!row || now - row.windowStartedAt.getTime() > UPLOAD_RATE_LIMIT_WINDOW_MS) {
    if (row) {
      await db.delete(uploadRateLimits).where(eq(uploadRateLimits.id, key));
    }
    try {
      await db.insert(uploadRateLimits).values({
        id: key,
        windowStartedAt: new Date(now),
        requestCount: 1,
      });
    } catch {
      await db
        .update(uploadRateLimits)
        .set({ windowStartedAt: new Date(now), requestCount: 1 })
        .where(eq(uploadRateLimits.id, key));
    }
    return { ok: true };
  }

  if (row.requestCount >= UPLOAD_RATE_LIMIT_MAX) {
    return {
      ok: false,
      error: "Too many upload requests. Please wait a few minutes.",
      status: 429,
    };
  }

  await db
    .update(uploadRateLimits)
    .set({ requestCount: row.requestCount + 1 })
    .where(eq(uploadRateLimits.id, key));
  return { ok: true };
}

export async function createOrRefreshUploadSession(options: {
  db: Db;
  pendingOrderId: string;
}): Promise<{ rawToken: string; expiresAt: Date }> {
  const rawToken = generateRandomString(48);
  const tokenHash = await sha256Hex(rawToken);
  const expiresAt = new Date(Date.now() + UPLOAD_SESSION_TTL_MS);
  await options.db.insert(uploadSessions).values({
    id: newId("uplss"),
    pendingOrderId: options.pendingOrderId,
    tokenHash,
    expiresAt,
  });
  return { rawToken, expiresAt };
}

export async function resolveUploadAuth(options: {
  db: Db;
  request: Request;
}): Promise<
  | {
      ok: true;
      pendingOrderId: string;
      organisationId: string | null;
      via: "upload_session";
    }
  | { ok: false; error: string; status: number }
> {
  const resume = readResumeToken(options.request);
  if (!resume) {
    return {
      ok: false,
      error: "Missing order session. Continue from Get Started first.",
      status: 401,
    };
  }
  const order = await getPendingOrderByResumeToken(options.db, resume);
  if (
    !order ||
    order.status === "expired" ||
    order.status === "abandoned" ||
    (order.expiresAt && order.expiresAt.getTime() < Date.now())
  ) {
    return { ok: false, error: "Order session expired.", status: 401 };
  }

  const sessionToken = readUploadSessionToken(options.request);
  if (!sessionToken) {
    return {
      ok: false,
      error: "Missing upload session. Refresh and try again.",
      status: 401,
    };
  }
  const tokenHash = await sha256Hex(sessionToken);
  const session = await options.db
    .select()
    .from(uploadSessions)
    .where(eq(uploadSessions.tokenHash, tokenHash))
    .get();
  if (!session || session.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "Upload session expired.", status: 401 };
  }
  if (session.pendingOrderId !== order.id) {
    return { ok: false, error: "Upload session mismatch.", status: 403 };
  }

  await options.db
    .update(uploadSessions)
    .set({ lastUsedAt: new Date() })
    .where(eq(uploadSessions.id, session.id));

  return {
    ok: true,
    pendingOrderId: order.id,
    organisationId: order.organisationId,
    via: "upload_session",
  };
}

export async function listUploadsForOrder(db: Db, pendingOrderId: string) {
  return db
    .select()
    .from(customerUploads)
    .where(
      and(
        eq(customerUploads.pendingOrderId, pendingOrderId),
        eq(customerUploads.status, "ready"),
      ),
    )
    .all();
}

export async function listUploadsForOrganisation(db: Db, organisationId: string) {
  return db
    .select()
    .from(customerUploads)
    .where(
      and(
        eq(customerUploads.organisationId, organisationId),
        eq(customerUploads.status, "ready"),
      ),
    )
    .all();
}

export async function storeCustomerUpload(options: {
  db: Db;
  bucket: R2Bucket;
  pendingOrderId?: string | null;
  organisationId?: string | null;
  category: UploadCategory;
  filename: string;
  bytes: ArrayBuffer;
  /** When true, skip pending-order file-count (caller already enforced org limit). */
  skipOrderCount?: boolean;
}): Promise<
  | {
      ok: true;
      upload: {
        id: string;
        category: UploadCategory;
        originalFilename: string;
        contentType: string;
        byteSize: number;
        createdAt: string;
      };
    }
  | { ok: false; error: string; status: number }
> {
  if (options.bytes.byteLength === 0) {
    return { ok: false, error: "Empty file.", status: 400 };
  }
  if (options.bytes.byteLength > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: "Each image must be 10 MB or smaller.",
      status: 413,
    };
  }

  const contentType = sniffImageContentType(options.bytes);
  if (!contentType) {
    return {
      ok: false,
      error: "Only JPG, PNG, or WebP images are allowed.",
      status: 415,
    };
  }

  if (!options.skipOrderCount && options.pendingOrderId) {
    const existing = await listUploadsForOrder(
      options.db,
      options.pendingOrderId,
    );
    if (existing.length >= MAX_UPLOADS_PER_ORDER) {
      return {
        ok: false,
        error: `You can upload up to ${MAX_UPLOADS_PER_ORDER} images per order.`,
        status: 400,
      };
    }
  }

  const id = newId("upl");
  const ext = extensionForContentType(contentType);
  const entropy = generateRandomString(32);
  // Unpredictable key — never expose bucket listing or guessable paths.
  const r2Key = `cu/${entropy}/${id}.${ext}`;
  const safeName = options.filename.replace(/[^\w.\-() ]+/g, "_").slice(0, 180);

  await options.bucket.put(r2Key, options.bytes, {
    httpMetadata: {
      contentType,
      contentDisposition: `inline; filename="${safeName}"`,
      cacheControl: "private, max-age=3600",
    },
    customMetadata: {
      uploadId: id,
      pendingOrderId: options.pendingOrderId || "",
      organisationId: options.organisationId || "",
      category: options.category,
    },
  });

  const now = new Date();
  await options.db.insert(customerUploads).values({
    id,
    pendingOrderId: options.pendingOrderId || null,
    organisationId: options.organisationId || null,
    category: options.category,
    originalFilename: safeName || `upload.${ext}`,
    contentType,
    byteSize: options.bytes.byteLength,
    r2Key,
    status: "ready",
    createdAt: now,
  });

  log("info", "customer_upload_stored", {
    uploadId: id,
    pendingOrderId: options.pendingOrderId || null,
    organisationId: options.organisationId || null,
    category: options.category,
    byteSize: options.bytes.byteLength,
    contentType,
  });

  return {
    ok: true,
    upload: {
      id,
      category: options.category,
      originalFilename: safeName || `upload.${ext}`,
      contentType,
      byteSize: options.bytes.byteLength,
      createdAt: now.toISOString(),
    },
  };
}

export async function deleteCustomerUpload(options: {
  db: Db;
  bucket: R2Bucket;
  uploadId: string;
  pendingOrderId?: string;
  organisationId?: string;
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const row = await options.db
    .select()
    .from(customerUploads)
    .where(eq(customerUploads.id, options.uploadId))
    .get();
  if (!row || row.status !== "ready") {
    return { ok: false, error: "Upload not found.", status: 404 };
  }
  if (
    options.pendingOrderId &&
    row.pendingOrderId !== options.pendingOrderId
  ) {
    return { ok: false, error: "Forbidden.", status: 403 };
  }
  if (
    options.organisationId &&
    row.organisationId !== options.organisationId
  ) {
    return { ok: false, error: "Forbidden.", status: 403 };
  }

  try {
    await options.bucket.delete(row.r2Key);
  } catch (error) {
    log("warn", "customer_upload_r2_delete_failed", {
      uploadId: row.id,
      error: error instanceof Error ? error.message : "unknown",
    });
  }

  await options.db
    .update(customerUploads)
    .set({ status: "deleted", deletedAt: new Date() })
    .where(eq(customerUploads.id, row.id));

  return { ok: true };
}

export async function associateUploadsWithOrganisation(options: {
  db: Db;
  pendingOrderId: string;
  organisationId: string;
}) {
  await options.db
    .update(customerUploads)
    .set({ organisationId: options.organisationId })
    .where(
      and(
        eq(customerUploads.pendingOrderId, options.pendingOrderId),
        eq(customerUploads.status, "ready"),
        isNull(customerUploads.organisationId),
      ),
    );
}

export async function cleanupAbandonedUploads(options: {
  db: Db;
  bucket: R2Bucket;
  nowMs?: number;
  limit?: number;
}): Promise<{ deleted: number }> {
  const cutoff = new Date(
    (options.nowMs ?? Date.now()) - ABANDONED_UPLOAD_RETENTION_MS,
  );
  const candidates = await options.db
    .select()
    .from(customerUploads)
    .where(
      and(
        eq(customerUploads.status, "ready"),
        isNull(customerUploads.organisationId),
        lt(customerUploads.createdAt, cutoff),
      ),
    )
    .all();

  let deleted = 0;
  const limit = options.limit ?? 100;
  for (const row of candidates.slice(0, limit)) {
    // Keep uploads tied to still-open unpaid orders within TTL.
    if (row.pendingOrderId) {
      const order = await options.db
        .select()
        .from(pendingOrders)
        .where(eq(pendingOrders.id, row.pendingOrderId))
        .get();
      if (
        order &&
        order.status !== "expired" &&
        order.status !== "abandoned" &&
        order.status !== "failed" &&
        order.expiresAt.getTime() > Date.now() &&
        order.status !== "paid"
      ) {
        continue;
      }
      if (order?.status === "paid" && order.organisationId) {
        // Should have been associated; skip hard delete.
        continue;
      }
    }

    try {
      await options.bucket.delete(row.r2Key);
    } catch {
      // continue marking deleted
    }
    await options.db
      .update(customerUploads)
      .set({ status: "deleted", deletedAt: new Date() })
      .where(eq(customerUploads.id, row.id));
    deleted += 1;
  }
  if (deleted > 0) {
    log("info", "abandoned_uploads_cleaned", { deleted });
  }
  return { deleted };
}

export function publicUploadDto(row: {
  id: string;
  category: string;
  originalFilename: string;
  contentType: string;
  byteSize: number;
  createdAt: Date;
}) {
  return {
    id: row.id,
    category: row.category,
    originalFilename: row.originalFilename,
    contentType: row.contentType,
    byteSize: row.byteSize,
    createdAt: row.createdAt.toISOString(),
    contentUrl: `/api/uploads/${row.id}/content`,
  };
}

export { isUploadCategory };
export type { UploadCategory };
