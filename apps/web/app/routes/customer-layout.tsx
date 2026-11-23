import { Form, Link, NavLink, Outlet, useLocation } from "react-router";
import { createDb } from "@iwfw/db";
import { requireAuth } from "../lib/session.server";
import { getEnv } from "../lib/env.server";
import { CUSTOMER_NAV } from "../lib/customer-dashboard";
import { BrandLogo } from "../components/brand-logo";
import { NotificationBell } from "../components/notification-bell";
import { countCustomerUnreadTickets } from "../lib/support.server";
import { getNotificationsFeed } from "../lib/notifications.server";
import {
  pickActiveOrganisationId,
  readActiveOrganisationPreference,
  withActiveOrg,
} from "../lib/active-org";
import type { Route } from "./+types/customer-layout";

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireAuth(request, context);
  const db = createDb(getEnv(context).DB);
  const organisationIds = auth.memberships.map((m) => m.organisationId);
  const activeOrganisationId = pickActiveOrganisationId(
    organisationIds,
    readActiveOrganisationPreference(request),
  );
  const [ticketUnread, feed] = await Promise.all([
    countCustomerUnreadTickets(db, organisationIds),
    getNotificationsFeed(db, auth.userId, 12),
  ]);
  return {
    user: { name: auth.name, email: auth.email },
    isStaff: auth.staffRoles.length > 0,
    organisationIds,
    activeOrganisationId,
    supportUnread: ticketUnread,
    notifyUnread: feed.unread,
    notifications: feed.items,
  };
}

export default function CustomerLayout({ loaderData }: Route.ComponentProps) {
  const { pathname } = useLocation();
  const activeOrg = loaderData.activeOrganisationId;
  const navTo = (to: string) => withActiveOrg(to, activeOrg);

  return (
    <div className="iwfw-dash">
      <header className="iwfw-dash__topbar">
        <div className="iwfw-dash__topbar-inner">
          <div className="iwfw-dash__brand">
            <Link
              to={navTo("/dashboard")}
              className="iwfw-dash__logo"
              aria-label="Dashboard home"
            >
              <BrandLogo size={28} withWordmark />
            </Link>
            <span className="iwfw-dash__eyebrow">Your account</span>
          </div>

          <div className="iwfw-dash__user">
            <NotificationBell
              feedUrl="/dashboard/notifications/feed"
              actionUrl="/dashboard/notifications/feed"
              viewAllHref="/dashboard/notifications"
              initialUnread={loaderData.notifyUnread}
              initialItems={loaderData.notifications}
            />
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
              to={navTo(item.to)}
              end={"end" in item ? item.end : false}
              className={({ isActive }) =>
                `iwfw-dash__nav-link${isActive ? " is-active" : ""}`
              }
            >
              {item.label}
              {item.to === "/dashboard/support" &&
              loaderData.supportUnread > 0 ? (
                <span className="iwfw-notify-badge">
                  {loaderData.supportUnread}
                </span>
              ) : null}
              {item.to === "/dashboard/notifications" &&
              loaderData.notifyUnread > 0 ? (
                <span className="iwfw-notify-badge">
                  {loaderData.notifyUnread}
                </span>
              ) : null}
            </NavLink>
          ))}
          <Form method="post" action="/logout" className="iwfw-dash__nav-logout">
            <button type="submit" className="iwfw-dash__nav-link iwfw-dash__nav-link--logout">
              Log out
            </button>
          </Form>
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
                to={navTo(item.to)}
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
