import { createDb, auditLogs } from "@iwfw/db";
import { newId } from "./ids";

type Db = ReturnType<typeof createDb>;

export type AuditWriteInput = {
  actorUserId?: string | null;
  organisationId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  diff?: Record<string, unknown> | null;
  ip?: string | null;
};

/** Persist a sensitive admin action. Never store secrets in diff. */
export async function writeAuditLog(db: Db, input: AuditWriteInput) {
  const diff = input.diff ? { ...input.diff } : null;
  if (diff && "password" in diff) {
    diff.password = "[redacted]";
  }
  await db.insert(auditLogs).values({
    id: newId("aud"),
    actorUserId: input.actorUserId ?? null,
    organisationId: input.organisationId ?? null,
    action: input.action,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    diffJson: diff ? JSON.stringify(diff) : null,
    ip: input.ip ?? null,
  });
}

export function clientIpFromRequest(request: Request): string | null {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    null
  );
}
