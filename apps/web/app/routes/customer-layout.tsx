import { Link, Outlet } from "react-router";
import { requireAuth } from "../lib/session.server";
import type { Route } from "./+types/customer-layout";

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireAuth(request, context);
  return {
    user: { name: auth.name, email: auth.email },
    organisationIds: auth.memberships.map((m) => m.organisationId),
  };
}

export default function CustomerLayout({ loaderData }: Route.ComponentProps) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--iwfw-border)] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--iwfw-muted)]">
              Customer
            </p>
            <Link to="/dashboard" className="font-[family-name:var(--iwfw-font-display)] text-lg font-bold">
              Dashboard
            </Link>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">{loaderData.user.name}</p>
            <p className="text-[var(--iwfw-muted)]">{loaderData.user.email}</p>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[200px_1fr]">
        <aside className="space-y-2 text-sm font-semibold">
          <Link className="block rounded-md px-3 py-2 hover:bg-white" to="/dashboard">
            Overview
          </Link>
          <Link className="block rounded-md px-3 py-2 text-[var(--iwfw-muted)] hover:bg-white" to="/">
            Marketing site
          </Link>
        </aside>
        <Outlet />
      </div>
    </div>
  );
}
