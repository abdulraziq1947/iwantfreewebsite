import { Form, Link, NavLink, Outlet, useLocation } from "react-router";
import { requireStaffSession } from "../lib/session.server";
import { ADMIN_NAV } from "../lib/admin-ops";
import type { Route } from "./+types/admin-layout";

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireStaffSession(request, context);
  return {
    user: { name: auth.name, email: auth.email },
    roles: auth.staffRoles,
  };
}

export default function AdminLayout({ loaderData }: Route.ComponentProps) {
  const { pathname } = useLocation();

  return (
    <div className="iwfw-admin">
      <header className="iwfw-admin__topbar">
        <div className="iwfw-admin__topbar-inner">
          <div>
            <p className="iwfw-admin__eyebrow">Operations</p>
            <Link to="/admin" className="iwfw-admin__brand">
              iwantfreewebsite admin
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
