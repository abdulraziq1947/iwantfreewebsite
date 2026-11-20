import { Form, Link, NavLink, Outlet, useLocation } from "react-router";
import { requireAuth } from "../lib/session.server";
import { CUSTOMER_NAV } from "../lib/customer-dashboard";
import type { Route } from "./+types/customer-layout";

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireAuth(request, context);
  return {
    user: { name: auth.name, email: auth.email },
    isStaff: auth.staffRoles.length > 0,
    organisationIds: auth.memberships.map((m) => m.organisationId),
  };
}

export default function CustomerLayout({ loaderData }: Route.ComponentProps) {
  const { pathname } = useLocation();

  return (
    <div className="iwfw-dash">
      <header className="iwfw-dash__topbar">
        <div className="iwfw-dash__topbar-inner">
          <div className="iwfw-dash__brand">
            <Link to="/dashboard" className="iwfw-dash__logo">
              iwantfreewebsite
            </Link>
            <span className="iwfw-dash__eyebrow">Customer area</span>
          </div>

          <div className="iwfw-dash__user">
            <div className="iwfw-dash__user-text">
              <p className="iwfw-dash__user-name">{loaderData.user.name}</p>
              <p className="iwfw-dash__user-email">{loaderData.user.email}</p>
            </div>
            {loaderData.isStaff && (
              <Link to="/admin" className="iwfw-btn iwfw-btn--outline iwfw-dash__btn">
                Admin
              </Link>
            )}
            <Form method="post" action="/logout">
              <button type="submit" className="iwfw-btn iwfw-btn--outline iwfw-dash__btn">
                Log out
              </button>
            </Form>
          </div>
        </div>
      </header>

      <div className="iwfw-dash__shell">
        <aside className="iwfw-dash__nav" aria-label="Customer">
          {CUSTOMER_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={"end" in item ? item.end : false}
              className={({ isActive }) =>
                `iwfw-dash__nav-link${isActive ? " is-active" : ""}`
              }
            >
              {item.label}
            </NavLink>
          ))}
          <Form method="post" action="/logout" className="iwfw-dash__nav-logout">
            <button type="submit" className="iwfw-dash__nav-link iwfw-dash__nav-link--logout">
              Log out
            </button>
          </Form>
          <Link to="/" className="iwfw-dash__nav-link iwfw-dash__nav-link--muted">
            Marketing site
          </Link>
        </aside>

        <div className="iwfw-dash__mobile-nav" aria-label="Customer sections">
          {CUSTOMER_NAV.map((item) => {
            const active =
              item.to === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`iwfw-dash__chip${active ? " is-active" : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <main className="iwfw-dash__main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
