import { useEffect, useRef } from "react";
import { Form, Link, NavLink, Outlet } from "react-router";
import { createDb } from "@iwfw/db";
import type { PlatformRole } from "@iwfw/config";
import { requireStaffSession } from "../lib/session.server";
import { getEnv } from "../lib/env.server";
import { ADMIN_NAV } from "../lib/admin-ops";
import { PLATFORM_ROLE_LABELS, TEAM_MANAGER_ROLES } from "../lib/admin-team";
import { BrandLogo } from "../components/brand-logo";
import { NotificationBell } from "../components/notification-bell";
import { countOpenStaffTickets } from "../lib/support.server";
import { getNotificationsFeed } from "../lib/notifications.server";
import type { Route } from "./+types/admin-layout";
import "../admin.css";

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await requireStaffSession(request, context);
  const db = createDb(getEnv(context).DB);
  const [openTickets, feed] = await Promise.all([
    countOpenStaffTickets(db),
    getNotificationsFeed(db, auth.userId, 12),
  ]);
  const canManageTeam = auth.staffRoles.some((role) => TEAM_MANAGER_ROLES.includes(role));
  return {
    user: { name: auth.name, email: auth.email },
    roles: auth.staffRoles,
    canManageTeam,
    openTickets,
    notifyUnread: feed.unread,
    notifications: feed.items,
  };
}

export function headers() {
  return {
    "X-Robots-Tag": "noindex, nofollow",
  };
}

const NAV_GROUPS: Array<{ label: string; paths: string[] }> = [
  { label: "Desk", paths: ["/admin", "/admin/notifications"] },
  {
    label: "Queues",
    paths: [
      "/admin/ops",
      "/admin/support",
      "/admin/orders",
      "/admin/domains",
      "/admin/transfers",
    ],
  },
  {
    label: "Accounts",
    paths: ["/admin/clients", "/admin/subscriptions", "/admin/media"],
  },
  { label: "Access", paths: ["/admin/team"] },
];

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "S"
  );
}

export default function AdminLayout({ loaderData }: Route.ComponentProps) {
  const findRef = useRef<HTMLInputElement>(null);
  const nav = ADMIN_NAV.filter(
    (item) => item.to !== "/admin/team" || loaderData.canManageTeam,
  );
  const listed = new Set(NAV_GROUPS.flatMap((g) => g.paths));
  const groups = NAV_GROUPS.map((g) => ({
    label: g.label,
    items: nav.filter((item) => g.paths.includes(item.to)),
  }));
  const unlisted = nav.filter((item) => !listed.has(item.to));
  if (unlisted.length > 0) groups.push({ label: "More", items: unlisted });

  const counts: Record<string, { value: number; label: string }> = {
    "/admin/support": { value: loaderData.openTickets, label: "open" },
    "/admin/notifications": { value: loaderData.notifyUnread, label: "unread" },
  };

  const roleLabel = loaderData.roles
    .map((role) => PLATFORM_ROLE_LABELS[role as PlatformRole] ?? role)
    .join(" · ");

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
      ) {
        return;
      }
      event.preventDefault();
      findRef.current?.focus();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="iwfw-admin">
      <a className="adm-skip" href="#admin-main">
        Skip to main content
      </a>

      <aside className="adm-rail">
        <div className="adm-rail__top">
          <Link to="/admin" className="adm-rail__brand" aria-label="Admin overview">
            <BrandLogo size={26} withWordmark variant="admin" />
          </Link>
          <p className="adm-rail__tag">Operations · staff only</p>
        </div>

        <nav className="adm-rail__nav" aria-label="Admin sections">
          {groups
            .filter((group) => group.items.length > 0)
            .map((group) => (
              <div className="adm-rail__group" key={group.label}>
                <p className="adm-rail__label" aria-hidden="true">
                  {group.label}
                </p>
                <ul>
                  {group.items.map((item) => {
                    const count = counts[item.to];
                    return (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          end={item.to === "/admin"}
                          className="adm-rail__link"
                        >
                          <span>{item.label}</span>
                          {count && count.value > 0 ? (
                            <span className="adm-rail__count">
                              {count.value}
                              <span className="adm-sr"> {count.label}</span>
                            </span>
                          ) : null}
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
        </nav>

        <div className="adm-rail__foot">
          <div className="adm-rail__user">
            <span className="adm-rail__avatar" aria-hidden="true">
              {initials(loaderData.user.name)}
            </span>
            <span className="adm-rail__who">
              <strong>{loaderData.user.name}</strong>
              <span>{roleLabel}</span>
            </span>
          </div>
          <div className="adm-rail__actions">
            <Link to="/dashboard" className="adm-rail__action">
              Customer view
            </Link>
            <Form method="post" action="/logout">
              <input type="hidden" name="redirectTo" value="/admin/login" />
              <button type="submit" className="adm-rail__action">
                Log out
              </button>
            </Form>
          </div>
        </div>
      </aside>

      <div className="adm-desk">
        <div className="adm-bar">
          <Form method="get" action="/admin/clients" role="search" className="adm-find">
            <label htmlFor="adm-find-q" className="adm-sr">
              Find a client
            </label>
            <svg
              className="adm-find__icon"
              viewBox="0 0 20 20"
              width="16"
              height="16"
              aria-hidden="true"
            >
              <circle
                cx="8.5"
                cy="8.5"
                r="5.75"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M13 13l4.25 4.25"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            <input
              ref={findRef}
              id="adm-find-q"
              className="adm-find__input"
              type="search"
              name="q"
              placeholder="Find a client — business, name or email"
              autoComplete="off"
            />
            <kbd className="adm-find__key" aria-hidden="true">
              /
            </kbd>
          </Form>
          <NotificationBell
            feedUrl="/admin/notifications/feed"
            actionUrl="/admin/notifications/feed"
            viewAllHref="/admin/notifications"
            initialUnread={loaderData.notifyUnread}
            initialItems={loaderData.notifications}
          />
        </div>

        <main id="admin-main" className="adm-main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
