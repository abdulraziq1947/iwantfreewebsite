import { Badge, Panel } from "@iwfw/ui";
import { createDb, eq, featureFlags, organisations, inArray } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import { requireAuth } from "../lib/session.server";
import type { Route } from "./+types/dashboard";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Dashboard — iwantfreewebsite" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireAuth(request, context);
  const env = getEnv(context);
  const db = createDb(env.DB);

  const orgIds = auth.memberships.map((m) => m.organisationId);
  const orgs =
    orgIds.length > 0
      ? await db
          .select()
          .from(organisations)
          .where(inArray(organisations.id, orgIds))
      : [];

  // Tenant isolation: only orgs from memberships (staff use admin area).
  const flag = await db
    .select()
    .from(featureFlags)
    .where(eq(featureFlags.key, "rank_tracking_checkout_enabled"))
    .get();

  return {
    orgs: orgs.map((o) => ({
      id: o.id,
      tradingName: o.tradingName,
      status: o.status,
    })),
    rankTrackingCheckoutEnabled: Boolean(flag?.enabled),
    isStaff: auth.staffRoles.length > 0,
  };
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Your dashboard</h1>
        <p className="mt-2 text-[var(--iwfw-muted)]">
          Phase 1 foundation — billing and onboarding arrive next.
        </p>
      </div>

      <Panel>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Organisations</h2>
          <Badge tone="neutral">{loaderData.orgs.length}</Badge>
        </div>
        <ul className="mt-4 space-y-3">
          {loaderData.orgs.map((org) => (
            <li
              key={org.id}
              className="flex items-center justify-between rounded-md border border-[var(--iwfw-border)] px-3 py-3"
            >
              <div>
                <p className="font-semibold">{org.tradingName}</p>
                <p className="text-xs text-[var(--iwfw-muted)]">{org.id}</p>
              </div>
              <Badge tone="warning">{org.status}</Badge>
            </li>
          ))}
          {loaderData.orgs.length === 0 && (
            <li className="text-sm text-[var(--iwfw-muted)]">
              No organisation membership yet.
            </li>
          )}
        </ul>
      </Panel>

      <Panel>
        <h2 className="text-lg font-semibold">Feature flags</h2>
        <p className="mt-2 text-sm text-[var(--iwfw-muted)]">
          Rank tracking checkout:{" "}
          <strong>
            {loaderData.rankTrackingCheckoutEnabled ? "enabled" : "disabled"}
          </strong>{" "}
          (must stay disabled until Phase 7).
        </p>
      </Panel>
    </div>
  );
}
