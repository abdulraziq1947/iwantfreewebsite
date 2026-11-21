import { Link, Outlet, useLocation } from "react-router";
import { GET_STARTED_STEPS, stepIndex } from "../lib/get-started";
import type { Route } from "./+types/get-started._layout";

export default function GetStartedLayout(_props: Route.ComponentProps) {
  const { pathname } = useLocation();
  const current = stepIndex(pathname);

  return (
    <div className="iwfw-start-shell">
      <div className="iwfw-start-shell__inner">
        <nav className="iwfw-start-progress" aria-label="Get started progress">
          <ol>
            {GET_STARTED_STEPS.map((step, index) => {
              const state =
                index < current ? "done" : index === current ? "current" : "";
              return (
                <li key={step.key} className={state || undefined}>
                  {index <= current ? (
                    <Link to={step.path}>
                      <em>{index + 1}</em>
                      <span>{step.label}</span>
                    </Link>
                  ) : (
                    <span>
                      <em>{index + 1}</em>
                      <span>{step.label}</span>
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
        <Outlet />
      </div>
    </div>
  );
}
