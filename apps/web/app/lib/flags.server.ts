import { createDb, eq, featureFlags } from "@iwfw/db";
import type { FeatureFlagKey } from "@iwfw/config";

export async function isFeatureEnabled(
  d1: D1Database,
  key: FeatureFlagKey,
): Promise<boolean> {
  const db = createDb(d1);
  const row = await db
    .select()
    .from(featureFlags)
    .where(eq(featureFlags.key, key))
    .get();
  return Boolean(row?.enabled);
}
