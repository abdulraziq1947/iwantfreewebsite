import { createAuth, loadAuthContext } from "@iwfw/auth";
import { parseWorkerEnv } from "@iwfw/config";
import { createDb, customerUploads, eq } from "@iwfw/db";
import { log } from "./logger";
import { getOrCreateDraftOrder } from "./pending-order.server";
import {
  assertUploadRateLimit,
  cleanupAbandonedUploads,
  createOrRefreshUploadSession,
  deleteCustomerUpload,
  getCustomerUploadsBucket,
  listUploadsForOrganisation,
  listUploadsForOrder,
  publicUploadDto,
  resolveUploadAuth,
  storeCustomerUpload,
  uploadSessionCookieHeader,
  UPLOAD_SESSION_TTL_MS,
  isUploadCategory,
} from "./uploads.server";

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

async function tryStaffOrMemberAccess(
  env: Env,
  request: Request,
  uploadId: string,
): Promise<
  | { ok: true; mode: "staff" | "member"; organisationId: string | null }
  | { ok: false }
> {
  try {
    const config = parseWorkerEnv(env as unknown as Record<string, unknown>);
    const authApi = createAuth(env.DB, config);
    const session = await authApi.api.getSession({ headers: request.headers });
    if (!session?.user) return { ok: false };
    const auth = await loadAuthContext(env.DB, {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    });
    const db = createDb(env.DB);
    const row = await db
      .select()
      .from(customerUploads)
      .where(eq(customerUploads.id, uploadId))
      .get();
    if (!row || row.status !== "ready") return { ok: false };
    if (auth.staffRoles.length > 0) {
      return { ok: true, mode: "staff", organisationId: row.organisationId };
    }
    if (
      row.organisationId &&
      auth.memberships.some((m) => m.organisationId === row.organisationId)
    ) {
      return { ok: true, mode: "member", organisationId: row.organisationId };
    }
    return { ok: false };
  } catch {
    return { ok: false };
  }
}

/**
 * Worker-level upload API (binary-safe). Returns null if path is not an upload route.
 */
export async function handleUploadsApiRequest(
  request: Request,
  env: Env,
): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/uploads")) return null;

  const bucket = getCustomerUploadsBucket(env);
  const db = createDb(env.DB);

  // POST /api/uploads/session
  if (url.pathname === "/api/uploads/session" && request.method === "POST") {
    if (!bucket) {
      return json(
        {
          error:
            "File uploads are temporarily unavailable (storage binding missing).",
        },
        { status: 503 },
      );
    }
    const { order, setCookie } = await getOrCreateDraftOrder(db, request);
    const rate = await assertUploadRateLimit(db, `order:${order.id}`);
    if (!rate.ok) return json({ error: rate.error }, { status: rate.status });

    const session = await createOrRefreshUploadSession({
      db,
      pendingOrderId: order.id,
    });
    const headers = new Headers({ "Content-Type": "application/json" });
    if (setCookie) headers.append("Set-Cookie", setCookie);
    headers.append(
      "Set-Cookie",
      uploadSessionCookieHeader(
        session.rawToken,
        Math.floor(UPLOAD_SESSION_TTL_MS / 1000),
      ),
    );
    // Opportunistic cleanup (bounded)
    void cleanupAbandonedUploads({ db, bucket, limit: 10 }).catch(() => undefined);

    return new Response(
      JSON.stringify({
        ok: true,
        pendingOrderId: order.id,
        expiresAt: session.expiresAt.toISOString(),
        maxBytes: 10 * 1024 * 1024,
        maxFiles: 20,
      }),
      { status: 200, headers },
    );
  }

  // GET /api/uploads — list for current order session
  if (url.pathname === "/api/uploads" && request.method === "GET") {
    const auth = await resolveUploadAuth({ db, request });
    if (!auth.ok) return json({ error: auth.error }, { status: auth.status });
    const rows = await listUploadsForOrder(db, auth.pendingOrderId);
    return json({ uploads: rows.map(publicUploadDto) });
  }

  // POST /api/uploads — multipart upload (pre-account order session)
  if (url.pathname === "/api/uploads" && request.method === "POST") {
    if (!bucket) {
      return json(
        { error: "File uploads are temporarily unavailable." },
        { status: 503 },
      );
    }
    const auth = await resolveUploadAuth({ db, request });
    if (!auth.ok) return json({ error: auth.error }, { status: auth.status });
    const rate = await assertUploadRateLimit(db, `order:${auth.pendingOrderId}`);
    if (!rate.ok) return json({ error: rate.error }, { status: rate.status });

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return json({ error: "Expected multipart form upload." }, { status: 400 });
    }
    const form = await request.formData();
    const categoryRaw = String(form.get("category") ?? "other");
    if (!isUploadCategory(categoryRaw)) {
      return json({ error: "Invalid upload category." }, { status: 400 });
    }
    const file = form.get("file");
    if (!(file instanceof File)) {
      return json({ error: "Missing file." }, { status: 400 });
    }
    const bytes = await file.arrayBuffer();
    const stored = await storeCustomerUpload({
      db,
      bucket,
      pendingOrderId: auth.pendingOrderId,
      organisationId: auth.organisationId,
      category: categoryRaw,
      filename: file.name || "upload",
      bytes,
    });
    if (!stored.ok) {
      return json({ error: stored.error }, { status: stored.status });
    }
    return json({
      ok: true,
      upload: {
        ...stored.upload,
        contentUrl: `/api/uploads/${stored.upload.id}/content`,
      },
    });
  }

  // POST /api/uploads/organisation/:orgId — authenticated customer/staff upload
  const orgPostMatch = url.pathname.match(
    /^\/api\/uploads\/organisation\/([^/]+)$/,
  );
  if (orgPostMatch && request.method === "POST") {
    if (!bucket) {
      return json(
        { error: "File uploads are temporarily unavailable." },
        { status: 503 },
      );
    }
    const organisationId = orgPostMatch[1];
    try {
      const config = parseWorkerEnv(env as unknown as Record<string, unknown>);
      const authApi = createAuth(env.DB, config);
      const session = await authApi.api.getSession({ headers: request.headers });
      if (!session?.user) {
        return json({ error: "Unauthorized." }, { status: 401 });
      }
      const auth = await loadAuthContext(env.DB, {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
      });
      const isMember = auth.memberships.some(
        (m) => m.organisationId === organisationId,
      );
      if (!isMember && auth.staffRoles.length === 0) {
        return json({ error: "Forbidden." }, { status: 403 });
      }
      const rate = await assertUploadRateLimit(
        db,
        `org:${organisationId}:${session.user.id}`,
      );
      if (!rate.ok) return json({ error: rate.error }, { status: rate.status });

      const contentType = request.headers.get("content-type") || "";
      if (!contentType.includes("multipart/form-data")) {
        return json({ error: "Expected multipart form upload." }, { status: 400 });
      }
      const form = await request.formData();
      const categoryRaw = String(form.get("category") ?? "other");
      if (!isUploadCategory(categoryRaw)) {
        return json({ error: "Invalid upload category." }, { status: 400 });
      }
      const file = form.get("file");
      if (!(file instanceof File)) {
        return json({ error: "Missing file." }, { status: 400 });
      }
      const bytes = await file.arrayBuffer();
      const existing = await listUploadsForOrganisation(db, organisationId);
      if (existing.length >= 20) {
        return json(
          { error: "You can store up to 20 images for this business." },
          { status: 400 },
        );
      }
      const stored = await storeCustomerUpload({
        db,
        bucket,
        pendingOrderId: null,
        organisationId,
        category: categoryRaw,
        filename: file.name || "upload",
        bytes,
        skipOrderCount: true,
      });
      if (!stored.ok) {
        return json({ error: stored.error }, { status: stored.status });
      }
      return json({
        ok: true,
        upload: {
          ...stored.upload,
          contentUrl: `/api/uploads/${stored.upload.id}/content`,
        },
      });
    } catch (error) {
      log("error", "uploads_org_post_failed", {
        error: error instanceof Error ? error.message : "unknown",
      });
      return json({ error: "Unable to upload." }, { status: 500 });
    }
  }

  // GET /api/uploads/:id/content
  const contentMatch = url.pathname.match(
    /^\/api\/uploads\/([^/]+)\/content$/,
  );
  if (contentMatch && request.method === "GET") {
    if (!bucket) {
      return json({ error: "Storage unavailable." }, { status: 503 });
    }
    const uploadId = contentMatch[1];
    const row = await db
      .select()
      .from(customerUploads)
      .where(eq(customerUploads.id, uploadId))
      .get();
    if (!row || row.status !== "ready") {
      return json({ error: "Not found." }, { status: 404 });
    }

    let allowed = false;
    const sessionAuth = await resolveUploadAuth({ db, request });
    if (
      sessionAuth.ok &&
      row.pendingOrderId &&
      sessionAuth.pendingOrderId === row.pendingOrderId
    ) {
      allowed = true;
    }
    if (!allowed) {
      const member = await tryStaffOrMemberAccess(env, request, uploadId);
      if (member.ok) allowed = true;
    }
    if (!allowed) {
      return json({ error: "Forbidden." }, { status: 403 });
    }

    const object = await bucket.get(row.r2Key);
    if (!object) return json({ error: "Not found." }, { status: 404 });

    const headers = new Headers();
    headers.set("Content-Type", row.contentType);
    headers.set("Cache-Control", "private, max-age=300");
    headers.set(
      "Content-Disposition",
      `inline; filename="${row.originalFilename.replace(/"/g, "")}"`,
    );
    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(object.body, { status: 200, headers });
  }

  // DELETE /api/uploads/:id
  const deleteMatch = url.pathname.match(/^\/api\/uploads\/([^/]+)$/);
  if (deleteMatch && request.method === "DELETE") {
    if (!bucket) {
      return json({ error: "Storage unavailable." }, { status: 503 });
    }
    const uploadId = deleteMatch[1];
    const sessionAuth = await resolveUploadAuth({ db, request });
    if (sessionAuth.ok) {
      const result = await deleteCustomerUpload({
        db,
        bucket,
        uploadId,
        pendingOrderId: sessionAuth.pendingOrderId,
      });
      if (!result.ok) {
        return json({ error: result.error }, { status: result.status });
      }
      return json({ ok: true });
    }

    const member = await tryStaffOrMemberAccess(env, request, uploadId);
    if (!member.ok) {
      return json({ error: "Forbidden." }, { status: 403 });
    }
    const row = await db
      .select()
      .from(customerUploads)
      .where(eq(customerUploads.id, uploadId))
      .get();
    if (!row) return json({ error: "Not found." }, { status: 404 });
    if (member.mode === "member" && !row.organisationId) {
      return json({ error: "Forbidden." }, { status: 403 });
    }
    const result = await deleteCustomerUpload({
      db,
      bucket,
      uploadId,
      organisationId: row.organisationId || undefined,
    });
    if (!result.ok) {
      return json({ error: result.error }, { status: result.status });
    }
    return json({ ok: true });
  }

  // GET /api/uploads/organisation/:orgId — customer/staff list
  const orgMatch = url.pathname.match(/^\/api\/uploads\/organisation\/([^/]+)$/);
  if (orgMatch && request.method === "GET") {
    const organisationId = orgMatch[1];
    try {
      const config = parseWorkerEnv(env as unknown as Record<string, unknown>);
      const authApi = createAuth(env.DB, config);
      const session = await authApi.api.getSession({ headers: request.headers });
      if (!session?.user) return json({ error: "Unauthorized." }, { status: 401 });
      const auth = await loadAuthContext(env.DB, {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
      });
      const isMember = auth.memberships.some(
        (m) => m.organisationId === organisationId,
      );
      if (!isMember && auth.staffRoles.length === 0) {
        return json({ error: "Forbidden." }, { status: 403 });
      }
      const rows = await listUploadsForOrganisation(db, organisationId);
      return json({ uploads: rows.map(publicUploadDto) });
    } catch (error) {
      log("error", "uploads_org_list_failed", {
        error: error instanceof Error ? error.message : "unknown",
      });
      return json({ error: "Unable to list uploads." }, { status: 500 });
    }
  }

  return json({ error: "Not found." }, { status: 404 });
}

