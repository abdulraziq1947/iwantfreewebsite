import { Badge, Panel } from "@iwfw/ui";
import { createDb, featureFlags, organisations, platformRoles, user } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import { requireStaffSession } from "../lib/session.server";
import type { Route } from "./+types/admin._index";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Admin — iwantfreewebsite" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  await requireStaffSession(request, context);
  const env = getEnv(context);
  const db = createDb(env.DB);

  const orgs = await db.select().from(organisations).limit(20);
  const flags = await db.select().from(featureFlags);
  const roleRows = await db.select().from(platformRoles);
  const users = await db.select().from(user);
  const staffList = roleRows.map((r) => {
    const u = users.find((x) => x.id === r.userId);
    return {
      userId: r.userId,
      role: r.role,
      email: u?.email ?? "unknown",
      name: u?.name ?? "unknown",
    };
  });

  return {
    orgs: orgs.map((o) => ({
      id: o.id,
      tradingName: o.tradingName,
      status: o.status,
    })),
    flags,
    staffList,
  };
}

export default function AdminHome({ loaderData }: Route.ComponentProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin overview</h1>
        <p className="mt-2 text-white/70">
          Phase 1 — customers, roles and feature flags. No paid integrations yet.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel className="bg-white text-[var(--iwfw-ink)]">
          <h2 className="font-semibold">Organisations</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {loaderData.orgs.map((o) => (
              <li key={o.id} className="flex justify-between gap-2">
                <span>{o.tradingName}</span>
                <Badge>{o.status}</Badge>
              </li>
            ))}
            {loaderData.orgs.length === 0 && <li>None yet</li>}
          </ul>
        </Panel>

        <Panel className="bg-white text-[var(--iwfw-ink)]">
          <h2 className="font-semibold">Feature flags</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {loaderData.flags.map((f) => (
              <li key={f.key} className="flex justify-between gap-2">
                <span>{f.key}</span>
                <Badge tone={f.enabled ? "danger" : "success"}>
                  {f.enabled ? "ON" : "OFF"}
                </Badge>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel className="bg-white text-[var(--iwfw-ink)]">
        <h2 className="font-semibold">Staff roles</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {loaderData.staffList.map((s) => (
            <li key={`${s.userId}-${s.role}`}>
              {s.name} ({s.email}) — <strong>{s.role}</strong>
            </li>
          ))}
          {loaderData.staffList.length === 0 && (
            <li>
              No staff yet. Set BOOTSTRAP_OWNER_EMAIL to your signup email for
              local/staging bootstrap.
            </li>
          )}
        </ul>
      </Panel>
    </div>
  );
}
