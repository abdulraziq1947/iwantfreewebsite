import { Link } from "react-router";
import { Badge, Panel } from "@iwfw/ui";
import { createDb, customerUploads, desc, eq, organisations } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import { requireStaffSession } from "../lib/session.server";
import { categoryLabel, isUploadCategory } from "../lib/image-sniff";
import type { Route } from "./+types/admin.media";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Customer images — Admin" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  await requireStaffSession(request, context);
  const db = createDb(getEnv(context).DB);
  const rows = await db
    .select()
    .from(customerUploads)
    .where(eq(customerUploads.status, "ready"))
    .orderBy(desc(customerUploads.createdAt))
    .limit(100);

  const orgs = await db.select().from(organisations).limit(200);
  const orgName = new Map(orgs.map((o) => [o.id, o.tradingName]));

  return {
    uploads: rows.map((r) => ({
      id: r.id,
      category: r.category,
      originalFilename: r.originalFilename,
      contentType: r.contentType,
      byteSize: r.byteSize,
      organisationId: r.organisationId,
      pendingOrderId: r.pendingOrderId,
      tradingName: r.organisationId
        ? orgName.get(r.organisationId) ?? null
        : null,
      createdAt: r.createdAt.toISOString(),
      contentUrl: `/api/uploads/${r.id}/content`,
    })),
  };
}

function formatBytes(n: number) {
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminMediaPage({ loaderData }: Route.ComponentProps) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-white/60">
          <Link to="/admin" className="underline">
            ← Admin overview
          </Link>
        </p>
        <h1 className="mt-2 text-3xl font-bold">Customer images</h1>
        <p className="mt-2 text-white/70">
          Private R2 assets for website builds. Open a file only when you need
          it for production work.
        </p>
      </div>

      <Panel className="bg-white text-[var(--iwfw-ink)]">
        <h2 className="font-semibold">Recent uploads</h2>
        <ul className="mt-3 space-y-3 text-sm">
          {loaderData.uploads.map((u) => (
            <li
              key={u.id}
              className="flex flex-col gap-2 border-b border-black/10 pb-3 md:flex-row md:items-center md:justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={u.contentUrl}
                  alt=""
                  className="h-14 w-14 rounded object-cover bg-black/5"
                  loading="lazy"
                />
                <div className="min-w-0">
                  <strong className="block truncate">{u.originalFilename}</strong>
                  <div className="text-black/60">
                    {isUploadCategory(u.category)
                      ? categoryLabel(u.category)
                      : u.category}{" "}
                    · {formatBytes(u.byteSize)} ·{" "}
                    {u.tradingName ??
                      (u.pendingOrderId
                        ? `Order ${u.pendingOrderId.slice(0, 10)}…`
                        : "Unassigned")}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{u.contentType.replace("image/", "")}</Badge>
                <a
                  href={u.contentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="iwfw-btn iwfw-btn--outline"
                >
                  Open
                </a>
              </div>
            </li>
          ))}
          {loaderData.uploads.length === 0 && (
            <li>No customer images yet.</li>
          )}
        </ul>
      </Panel>
    </div>
  );
}
