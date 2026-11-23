import { Badge } from "@iwfw/ui";
import { createDb, customerUploads, desc, eq, organisations } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import { requireStaffSession } from "../lib/session.server";
import { categoryLabel, isUploadCategory } from "../lib/image-sniff";
import { formatAdminDate } from "../lib/admin-ops.server";
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
        ? (orgName.get(r.organisationId) ?? null)
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
    <div className="iwfw-admin-page">
      <header className="iwfw-admin-page__header">
        <div>
          <p className="iwfw-admin-page__eyebrow">Assets</p>
          <h1>Customer images</h1>
          <p>
            Private R2 assets for website builds. Open a file only when you need
            it for production work.
          </p>
        </div>
        <p className="iwfw-admin-page__count">
          {loaderData.uploads.length} shown
        </p>
      </header>

      <section className="iwfw-admin-panel">
        {loaderData.uploads.length === 0 ? (
          <p className="iwfw-admin-empty">No customer images yet.</p>
        ) : (
          <ul className="iwfw-admin-media">
            {loaderData.uploads.map((u) => (
              <li key={u.id} className="iwfw-admin-media__item">
                <img
                  src={u.contentUrl}
                  alt=""
                  className="iwfw-admin-media__thumb"
                  loading="lazy"
                />
                <div className="iwfw-admin-media__body">
                  <strong>{u.originalFilename}</strong>
                  <p>
                    {isUploadCategory(u.category)
                      ? categoryLabel(u.category)
                      : u.category}{" "}
                    · {formatBytes(u.byteSize)} ·{" "}
                    {u.tradingName ??
                      (u.pendingOrderId
                        ? `Order ${u.pendingOrderId.slice(0, 10)}…`
                        : "Unassigned")}{" "}
                    · {formatAdminDate(u.createdAt)}
                  </p>
                </div>
                <div className="iwfw-admin-media__meta">
                  <Badge>{u.contentType.replace("image/", "")}</Badge>
                  <a
                    href={u.contentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="iwfw-btn iwfw-btn--outline iwfw-admin__btn-sm"
                  >
                    Open
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
