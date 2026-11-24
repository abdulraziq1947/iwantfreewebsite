import { useEffect, useRef } from "react";
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
import "../dashboard.css";

export const links: Route.LinksFunction = () => [
  {
    rel: "preload",
    href: "/fonts/archivo-semiexpanded-800-latin.woff2",
    as: "font",
    type: "font/woff2",
    crossOrigin: "anonymous",
  },
];

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

type NavItem = (typeof CUSTOMER_NAV)[number];

const ACCOUNT_PATHS = new Set<string>([
  "/dashboard/billing",
  "/dashboard/support",
  "/dashboard/notifications",
  "/dashboard/account",
]);

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Your website",
    items: CUSTOMER_NAV.filter((item) => !ACCOUNT_PATHS.has(item.to)),
  },
  {
    label: "Account",
    items: CUSTOMER_NAV.filter((item) => ACCOUNT_PATHS.has(item.to)),
  },
];

function isActivePath(item: NavItem, pathname: string): boolean {
  if ("end" in item && item.end) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

function DashNav({
  navTo,
  supportUnread,
  notifyUnread,
}: {
  navTo: (to: string) => string;
  supportUnread: number;
  notifyUnread: number;
}) {
  return (
    <>
      {NAV_GROUPS.map((group) => (
        <div className="dash-nav__group" key={group.label}>
          <p className="dash-nav__label">{group.label}</p>
          <ul>
            {group.items.map((item) => {
              const count =
                item.to === "/dashboard/support"
                  ? supportUnread
                  : item.to === "/dashboard/notifications"
                    ? notifyUnread
                    : 0;
              return (
                <li key={item.to}>
                  <NavLink
                    to={navTo(item.to)}
                    end={"end" in item ? item.end : false}
                    className={({ isActive }) =>
                      `dash-nav__link${isActive ? " is-active" : ""}`
                    }
                  >
                    <span>{item.label}</span>
                    {count > 0 ? (
                      <span className="dash-nav__count">
                        {count}
                        <span className="dash-sr"> unread</span>
                      </span>
                    ) : null}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </>
  );
}

export default function CustomerLayout({ loaderData }: Route.ComponentProps) {
  const { pathname } = useLocation();
  const activeOrg = loaderData.activeOrganisationId;
  const navTo = (to: string) => withActiveOrg(to, activeOrg);
  const menuRef = useRef<HTMLDetailsElement>(null);
  const current = CUSTOMER_NAV.find((item) => isActivePath(item, pathname));
  const navCounts = {
    supportUnread: loaderData.supportUnread,
    notifyUnread: loaderData.notifyUnread,
  };

  useEffect(() => {
    if (menuRef.current) menuRef.current.open = false;
  }, [pathname]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const menu = menuRef.current;
      if (event.key !== "Escape" || !menu?.open) return;
      menu.open = false;
      menu.querySelector("summary")?.focus();
    }
    function onPointer(event: MouseEvent) {
      const menu = menuRef.current;
      if (menu?.open && !menu.contains(event.target as Node)) {
        menu.open = false;
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, []);

  return (
    <div className="dash">
      <a className="dash-skip" href="#dash-main">
        Skip to content
      </a>

      <aside className="dash-side">
        <Link
          to={navTo("/dashboard")}
          className="dash-side__logo"
          aria-label="iwantfreewebsite.com dashboard home"
        >
          <BrandLogo size={30} withWordmark />
        </Link>
        <nav className="dash-nav" aria-label="Dashboard">
          <DashNav navTo={navTo} {...navCounts} />
        </nav>
        <div className="dash-side__foot">
          <p className="dash-side__name">{loaderData.user.name}</p>
          <p className="dash-side__email">{loaderData.user.email}</p>
          <div className="dash-side__actions">
            {loaderData.isStaff ? (
              <Link to="/admin" className="dash-btn dash-btn--ghost dash-btn--sm">
                Admin
              </Link>
            ) : null}
            <Form method="post" action="/logout">
              <button type="submit" className="dash-btn dash-btn--ghost dash-btn--sm">
                Log out
              </button>
            </Form>
          </div>
        </div>
      </aside>

      <div className="dash-frame">
        <header className="dash-top">
          <Link
            to={navTo("/dashboard")}
            className="dash-top__logo"
            aria-label="iwantfreewebsite.com dashboard home"
          >
            <BrandLogo size={28} withWordmark />
          </Link>
          <p className="dash-top__where">
            <span>Your account</span>
            {current ? <strong>{current.label}</strong> : null}
          </p>
          <div className="dash-top__tools">
            <NotificationBell
              feedUrl="/dashboard/notifications/feed"
              actionUrl="/dashboard/notifications/feed"
              viewAllHref="/dashboard/notifications"
              initialUnread={loaderData.notifyUnread}
              initialItems={loaderData.notifications}
            />
            <details className="dash-menu" ref={menuRef}>
              <summary className="dash-menu__toggle">
                <span className="dash-menu__bars" aria-hidden="true" />
                <span>Menu</span>
              </summary>
              <div className="dash-menu__sheet">
                <nav className="dash-nav dash-nav--sheet" aria-label="Dashboard">
                  <DashNav navTo={navTo} {...navCounts} />
                </nav>
                <div className="dash-menu__foot">
                  <div>
                    <p className="dash-side__name">{loaderData.user.name}</p>
                    <p className="dash-side__email">{loaderData.user.email}</p>
                  </div>
                  <div className="dash-side__actions">
                    {loaderData.isStaff ? (
                      <Link
                        to="/admin"
                        className="dash-btn dash-btn--ghost dash-btn--sm"
                      >
                        Admin
                      </Link>
                    ) : null}
                    <Form method="post" action="/logout">
                      <button
                        type="submit"
                        className="dash-btn dash-btn--ghost dash-btn--sm"
                      >
                        Log out
                      </button>
                    </Form>
                  </div>
                </div>
              </div>
            </details>
          </div>
        </header>

        <main id="dash-main" className="dash-main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
