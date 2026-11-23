import type { ReactNode } from "react";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  return (
    <span className={`iwfw-ui-badge iwfw-ui-badge--${tone}`}>{children}</span>
  );
}
