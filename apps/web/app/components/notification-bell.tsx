import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Link, useFetcher, useRevalidator } from "react-router";

export type BellNotification = {
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string;
  readAt: string | null;
  createdAt: string | null;
};

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell({
  feedUrl,
  actionUrl,
  initialUnread = 0,
  initialItems = [],
  viewAllHref,
  pollMs = 20000,
}: {
  feedUrl: string;
  actionUrl: string;
  initialUnread?: number;
  initialItems?: BellNotification[];
  viewAllHref: string;
  pollMs?: number;
}) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState(initialItems);
  const rootRef = useRef<HTMLDivElement>(null);
  const fetcher = useFetcher();
  const revalidator = useRevalidator();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(feedUrl, {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        unread?: number;
        items?: BellNotification[];
      };
      if (typeof data.unread === "number") setUnread(data.unread);
      if (Array.isArray(data.items)) setItems(data.items);
    } catch {
      // Ignore transient poll errors.
    }
  }, [feedUrl]);

  useEffect(() => {
    setUnread(initialUnread);
    setItems(initialItems);
  }, [initialUnread, initialItems]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void refresh();
    }, pollMs);
    return () => window.clearInterval(id);
  }, [pollMs, refresh]);

  useEffect(() => {
    if (!open) return;
    void refresh();
  }, [open, refresh]);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data && typeof fetcher.data === "object") {
      void refresh();
      revalidator.revalidate();
    }
  }, [fetcher.state, fetcher.data, refresh, revalidator]);

  return (
    <div className="iwfw-bell" ref={rootRef}>
      <button
        type="button"
        className="iwfw-bell__button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="iwfw-bell__icon" aria-hidden>
          ●
        </span>
        <span className="iwfw-bell__label">Alerts</span>
        {unread > 0 ? (
          <span className="iwfw-notify-badge">{unread > 99 ? "99+" : unread}</span>
        ) : null}
      </button>

      {open ? (
        <div className="iwfw-bell__panel" id={panelId} role="dialog" aria-label="Notifications">
          <div className="iwfw-bell__panel-head">
            <strong>Live notifications</strong>
            {unread > 0 ? (
              <fetcher.Form method="post" action={actionUrl}>
                <input type="hidden" name="intent" value="mark_all_read" />
                <button type="submit" className="iwfw-bell__mark">
                  Mark all read
                </button>
              </fetcher.Form>
            ) : null}
          </div>

          {items.length === 0 ? (
            <p className="iwfw-bell__empty">No notifications yet.</p>
          ) : (
            <ul className="iwfw-bell__list">
              {items.map((n) => (
                <li key={n.id} className={n.readAt ? undefined : "is-unread"}>
                  <Link
                    to={n.href}
                    onClick={() => {
                      setOpen(false);
                      if (!n.readAt) {
                        const fd = new FormData();
                        fd.set("intent", "mark_one_read");
                        fd.set("id", n.id);
                        fetcher.submit(fd, { method: "post", action: actionUrl });
                      }
                    }}
                  >
                    <span className="iwfw-bell__item-title">{n.title}</span>
                    <span className="iwfw-bell__item-body">{n.body}</span>
                    <span className="iwfw-bell__item-meta">
                      {relativeTime(n.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="iwfw-bell__panel-foot">
            <Link to={viewAllHref} onClick={() => setOpen(false)}>
              View all
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
