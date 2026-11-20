import { Link, Outlet } from "react-router";
import { getOptionalAuth } from "../lib/session.server";
import type { Route } from "./+types/public-layout";

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await getOptionalAuth(request, context);
  return {
    user: auth
      ? { name: auth.name, email: auth.email, isStaff: auth.staffRoles.length > 0 }
      : null,
  };
}

export default function PublicLayout({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;
  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--iwfw-border)]/70 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link to="/" className="font-[family-name:var(--iwfw-font-display)] text-xl font-bold text-[var(--iwfw-ink)]">
            iwantfreewebsite
          </Link>
          <nav className="flex items-center gap-4 text-sm font-semibold">
            <Link to="/pricing" className="text-[var(--iwfw-muted)] hover:text-[var(--iwfw-ink)]">
              Pricing
            </Link>
            {user ? (
              <>
                <Link to="/dashboard" className="text-[var(--iwfw-muted)] hover:text-[var(--iwfw-ink)]">
                  Dashboard
                </Link>
                {user.isStaff && (
                  <Link to="/admin" className="text-[var(--iwfw-muted)] hover:text-[var(--iwfw-ink)]">
                    Admin
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link to="/login" className="text-[var(--iwfw-muted)] hover:text-[var(--iwfw-ink)]">
                  Log in
                </Link>
                <Link
                  to="/signup"
                  className="rounded-[var(--iwfw-radius)] bg-[var(--iwfw-accent)] px-3 py-2 text-white hover:bg-[var(--iwfw-accent-hover)]"
                >
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
