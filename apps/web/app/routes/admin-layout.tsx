import { Link, Outlet } from "react-router";
import { requireStaffSession } from "../lib/session.server";
import type { Route } from "./+types/admin-layout";

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireStaffSession(request, context);
  return {
    user: { name: auth.name, email: auth.email },
    roles: auth.staffRoles,
  };
}

export default function AdminLayout({ loaderData }: Route.ComponentProps) {
  return (
    <div className="min-h-screen bg-[#0f1c17] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-white/60">Admin</p>
            <Link to="/admin" className="font-[family-name:var(--iwfw-font-display)] text-lg font-bold">
              Operations
            </Link>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">{loaderData.user.name}</p>
            <p className="text-white/60">{loaderData.roles.join(", ")}</p>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </div>
    </div>
  );
}
