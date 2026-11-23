/** Tables the running Worker expects after migrations through 0012. */
export const REQUIRED_D1_TABLES = [
  "organisations",
  "memberships",
  "subscriptions",
  "pending_orders",
  "domain_registration_tasks",
  "organisation_mailboxes",
  "ops_tasks",
  "support_tickets",
  "notifications",
  "audit_logs",
  "d1_migrations",
] as const;

export type SchemaHealthResult = {
  ok: boolean;
  missingTables: string[];
  migrationCount: number | null;
};

/**
 * Fail closed when core tables are missing — catches deploy-before-migrate.
 */
export async function checkD1SchemaHealth(
  db: D1Database,
): Promise<SchemaHealthResult> {
  const missingTables: string[] = [];
  for (const name of REQUIRED_D1_TABLES) {
    try {
      const row = await db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
        )
        .bind(name)
        .first<{ name: string }>();
      if (!row?.name) missingTables.push(name);
    } catch {
      missingTables.push(name);
    }
  }

  let migrationCount: number | null = null;
  try {
    const row = await db
      .prepare("SELECT COUNT(*) AS n FROM d1_migrations")
      .first<{ n: number }>();
    migrationCount = row?.n ?? 0;
  } catch {
    migrationCount = null;
  }

  return {
    ok: missingTables.length === 0,
    missingTables,
    migrationCount,
  };
}
