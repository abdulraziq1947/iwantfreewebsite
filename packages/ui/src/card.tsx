import type { ReactNode } from "react";

/** Interactive/surface container — use sparingly per design rules. */
export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`iwfw-ui-panel ${className}`.trim()}>{children}</div>
  );
}
