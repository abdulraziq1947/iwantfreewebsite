import { Form, Link } from "react-router";
import { Badge, Panel } from "@iwfw/ui";
import {
  createDb,
  desc,
  eq,
  featureFlags,
  organisations,
  platformRoles,
  user,
  domainRegistrationTasks,
} from "@iwfw/db";
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
  const domainTasks = await db
    .select()
    .from(domainRegistrationTasks)
    .orderBy(desc(domainRegistrationTasks.createdAt))
    .limit(30);
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
    domainTasks: domainTasks.map((t) => ({
      id: t.id,
      domainName: t.domainName,
      domainMode: t.domainMode,
      status: t.status,
      organisationId: t.organisationId,
    })),
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  await requireStaffSession(request, context);
  const db = createDb(getEnv(context).DB);
  const form = await request.formData();
  const taskId = String(form.get("taskId") ?? "");
  const intent = String(form.get("intent") ?? "");
  if (!taskId) return { error: "Missing task." };

  const now = new Date();
  if (intent === "mark_registered") {
    await db
      .update(domainRegistrationTasks)
      .set({
        status: "registered",
        registeredAt: now,
        updatedAt: now,
      })
      .where(eq(domainRegistrationTasks.id, taskId));
    return { ok: true };
  }
  if (intent === "mark_connected") {
    await db
      .update(domainRegistrationTasks)
      .set({
        status: "connected",
        connectedAt: now,
        updatedAt: now,
      })
      .where(eq(domainRegistrationTasks.id, taskId));
    return { ok: true };
  }
  if (intent === "mark_in_progress") {
    await db
      .update(domainRegistrationTasks)
      .set({ status: "in_progress", updatedAt: now })
      .where(eq(domainRegistrationTasks.id, taskId));
    return { ok: true };
  }
  return { error: "Unknown action." };
}

export default function AdminHome({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin overview</h1>
        <p className="mt-2 text-white/70">
          Customers, domain registration tasks and feature flags. Domains are
          never purchased automatically.
        </p>
        <p className="mt-3">
          <Link to="/admin/media" className="iwfw-btn iwfw-btn--outline">
            Customer images
          </Link>
        </p>
      </div>

      {actionData && "error" in actionData && actionData.error && (
        <p className="text-red-300">{actionData.error}</p>
      )}

      <Panel className="bg-white text-[var(--iwfw-ink)]">
        <h2 className="font-semibold">Domain registration tasks</h2>
        <ul className="mt-3 space-y-3 text-sm">
          {loaderData.domainTasks.map((t) => (
            <li
              key={t.id}
              className="flex flex-col gap-2 border-b border-black/10 pb-3 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <strong>{t.domainName}</strong>{" "}
                <Badge>{t.status}</Badge>
                <div className="text-black/60">
                  {t.domainMode} · org {t.organisationId.slice(0, 12)}…
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Form method="post">
                  <input type="hidden" name="taskId" value={t.id} />
                  <button
                    name="intent"
                    value="mark_in_progress"
                    className="iwfw-btn iwfw-btn--outline"
                  >
                    In progress
                  </button>
                </Form>
                <Form method="post">
                  <input type="hidden" name="taskId" value={t.id} />
                  <button
                    name="intent"
                    value="mark_registered"
                    className="iwfw-btn iwfw-btn--outline"
                  >
                    Mark registered
                  </button>
                </Form>
                <Form method="post">
                  <input type="hidden" name="taskId" value={t.id} />
                  <button
                    name="intent"
                    value="mark_connected"
                    className="iwfw-btn iwfw-btn--green"
                  >
                    Mark connected
                  </button>
                </Form>
              </div>
            </li>
          ))}
          {loaderData.domainTasks.length === 0 && <li>No domain tasks yet</li>}
        </ul>
      </Panel>

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
              {s.name} · {s.email} · {s.role}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
