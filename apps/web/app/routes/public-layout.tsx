import { Link, Outlet, useLocation } from "react-router";
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

function LogoMark() {
  return (
    <svg
      className="iwfw-logo-mark"
      width="28"
      height="28"
      viewBox="0 0 28 28"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="22" height="15" rx="2.5" fill="currentColor" />
      <rect x="6" y="8" width="16" height="9" rx="1" fill="#fff" />
      <path d="M10 24h8l-1.2-3H11.2L10 24z" fill="currentColor" />
      <path
        d="M17.2 11.2l2.3 3.6-2.1-.4-.7 1.8-1.4-4.2 1.9.2z"
        fill="var(--iwfw-accent)"
      />
    </svg>
  );
}

export default function PublicLayout({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;
  const { pathname } = useLocation();
  const isHome = pathname === "/";

  return (
    <div className={`iwfw-public${isHome ? " iwfw-public--home" : ""}`}>
      <header className="iwfw-topbar">
        <div className="iwfw-topbar__inner">
          <Link to="/" className="iwfw-topbar__brand" aria-label="iwantfreewebsite.com home">
            <LogoMark />
            <span>
              iwantfreewebsite
              <span className="iwfw-topbar__tld">.com</span>
            </span>
          </Link>

          <nav className="iwfw-topbar__nav" aria-label="Primary">
            <NavLinks isHome={isHome} />
          </nav>

          <div className="iwfw-topbar__actions">
            <a className="iwfw-topbar__phone" href="tel:08008527267">
              <PhoneIcon />
              <span>0800 852 7267</span>
            </a>
            {user ? (
              <Link to="/dashboard" className="iwfw-btn iwfw-btn--blue">
                Dashboard
              </Link>
            ) : (
              <Link to="/get-started" className="iwfw-btn iwfw-btn--blue">
                Get Started
              </Link>
            )}
            <details className="iwfw-topbar__menu">
              <summary aria-label="Open menu">
                <MenuIcon />
              </summary>
              <nav className="iwfw-topbar__drawer" aria-label="Mobile">
                <NavLinks isHome={isHome} />
                {user ? (
                  <Link to="/dashboard">Dashboard</Link>
                ) : (
                  <Link to="/get-started">Get Started</Link>
                )}
                <a href="tel:08008527267">Call 0800 852 7267</a>
                {!user && (
                  <Link to="/get-started/account?mode=login">Log in</Link>
                )}
              </nav>
            </details>
          </div>
        </div>
      </header>

      <Outlet />

      <footer className="iwfw-footer">
        <div className="iwfw-footer__inner">
          <div className="iwfw-footer__brand">
            <LogoMark />
            <div>
              <strong>iwantfreewebsite.com</strong>
              <p>
                Managed websites for local businesses · £39.99/month · Cancel
                anytime
              </p>
            </div>
          </div>
          <div className="iwfw-footer__links">
            <a href="tel:08008527267">0800 852 7267</a>
            <Link to="/pricing">Pricing</Link>
            <Link to="/get-started">Get Started</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
            {!user && (
              <Link to="/get-started/account?mode=login">Log in</Link>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

function NavLinks({ isHome }: { isHome: boolean }) {
  return (
    <>
      <Link to="/" className={isHome ? "is-active" : undefined}>
        Home
      </Link>
      <a href={isHome ? "#examples" : "/#examples"}>Our Work</a>
      <a href={isHome ? "#how-it-works" : "/#how-it-works"}>How It Works</a>
      <a href={isHome ? "#included" : "/#included"}>What&apos;s Included</a>
      <a href={isHome ? "#faqs" : "/#faqs"}>FAQs</a>
    </>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 7h16v2H4V7zm0 4h16v2H4v-2zm0 4h16v2H4v-2z"
      />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7.2 3.8c.4-.4 1-.5 1.5-.3l2.2 1c.5.2.8.7.8 1.2v2.1c0 .4-.2.8-.6 1-.8.5-1.2 1.4-1 2.3.5 2 2.1 3.6 4.1 4.1.9.2 1.8-.2 2.3-1 .2-.3.6-.5 1-.5h2.1c.5 0 1 .3 1.2.8l1 2.2c.2.5.1 1.1-.3 1.5-1.3 1.3-3.2 1.9-5.1 1.5C10.4 19.1 4.9 13.6 4.3 7.4c-.3-1.9.3-3.8 1.5-5.1z"
        fill="currentColor"
      />
    </svg>
  );
}
