import { Form, Link, NavLink, Outlet, useLocation } from "react-router";
import { createDb } from "@iwfw/db";
import { requireStaffSession } from "../lib/session.server";
import { getEnv } from "../lib/env.server";
import { ADMIN_NAV } from "../lib/admin-ops";
import { BrandLogo } from "../components/brand-logo";
import {
  countOpenStaffTickets,
  countUnreadNotifications,
} from "../lib/support.server";
import type { Route } from "./+types/admin-layout";

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireStaffSession(request, context);
  const db = createDb(getEnv(context).DB);
  const [openTickets, notifyUnread] = await Promise.all([
    countOpenStaffTickets(db),
    countUnreadNotifications(db, auth.userId),
  ]);
  return {
    user: { name: auth.name, email: auth.email },
    roles: auth.staffRoles,
    openTickets,
    notifyUnread,
  };
}

export function headers() {
  return {
    "X-Robots-Tag": "noindex, nofollow",
  };
}

export default function AdminLayout({ loaderData }: Route.ComponentProps) {
  const { pathname } = useLocation();

  return (
    <div className="iwfw-admin">
      <header className="iwfw-admin__topbar">
        <div className="iwfw-admin__topbar-inner">
          <div>
            <p className="iwfw-admin__eyebrow">Operations · staff only</p>
            <Link to="/admin" className="iwfw-admin__brand" aria-label="Admin home">
              <BrandLogo size={28} withWordmark variant="admin" />
            </Link>
          </div>
          <div className="iwfw-admin__user">
            <div className="iwfw-admin__user-text">
              <p className="iwfw-admin__user-name">{loaderData.user.name}</p>
              <p className="iwfw-admin__user-meta">
                {loaderData.roles.join(" · ")}
              </p>
            </div>
            <Link to="/dashboard" className="iwfw-btn iwfw-btn--outline iwfw-admin__btn">
              Customer view
            </Link>
            <Form method="post" action="/logout">
              <button type="submit" className="iwfw-btn iwfw-btn--outline iwfw-admin__btn">
                Log out
              </button>
            </Form>
          </div>
        </div>
      </header>

      <div className="iwfw-admin__shell">
        <aside className="iwfw-admin__nav" aria-label="Admin">
          {ADMIN_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/admin"}
              className={({ isActive }) =>
                `iwfw-admin__nav-link${isActive ? " is-active" : ""}`
              }
            >
              {item.label}
              {item.to === "/admin/support" && loaderData.openTickets > 0 ? (
                <span className="iwfw-notify-badge">{loaderData.openTickets}</span>
              ) : null}
            </NavLink>
          ))}
        </aside>

        <div className="iwfw-admin__mobile-nav" aria-label="Admin sections">
          {ADMIN_NAV.map((item) => {
            const active =
              item.to === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`iwfw-admin__chip${active ? " is-active" : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <main className="iwfw-admin__main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
