import { Link } from "react-router";
import { createDb, customerUploads, desc, eq, organisations } from "@iwfw/db";
import { getEnv } from "../lib/env.server";
import { requireStaffSession } from "../lib/session.server";
import { categoryLabel, isUploadCategory } from "../lib/image-sniff";
import { formatAdminDate } from "../lib/admin-ops";
import { AdminCount, AdminPageHeader, AdminStatus } from "../components/admin-ui";
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
      tradingName: r.organisationId ? (orgName.get(r.organisationId) ?? null) : null,
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
    <div className="adm-page">
      <AdminPageHeader
        kicker="Assets"
        title="Customer images"
        lead="Private R2 assets for website builds. Open a file only when you need it for production work."
        aside={<AdminCount value={loaderData.uploads.length} label="shown" />}
      />

      <section className="adm-sheet" aria-label="Customer images">
        {loaderData.uploads.length === 0 ? (
          <p className="adm-empty">No customer images yet.</p>
        ) : (
          <ul className="adm-media">
            {loaderData.uploads.map((u) => (
              <li key={u.id} className="adm-media__item">
                <img
                  src={u.contentUrl}
                  alt=""
                  className="adm-media__thumb"
                  loading="lazy"
                />
                <div className="adm-media__body">
                  <strong>{u.originalFilename}</strong>
                  <p className="adm-media__website">
                    Website:{" "}
                    {u.organisationId && u.tradingName ? (
                      <Link to={`/admin/clients/${u.organisationId}?tab=images`}>
                        {u.tradingName}
                      </Link>
                    ) : u.pendingOrderId ? (
                      <>Order {u.pendingOrderId.slice(0, 10)}…</>
                    ) : (
                      "Unassigned"
                    )}
                  </p>
                  <p>
                    {isUploadCategory(u.category)
                      ? categoryLabel(u.category)
                      : u.category}{" "}
                    · {formatBytes(u.byteSize)} · {formatAdminDate(u.createdAt)}
                  </p>
                </div>
                <div className="adm-media__meta">
                  <AdminStatus tone="neutral">
                    {u.contentType.replace("image/", "")}
                  </AdminStatus>
                  <a
                    href={u.contentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="adm-btn adm-btn--sm"
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
