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
    <div
      className={`rounded-[var(--iwfw-radius)] border border-[var(--iwfw-border)] bg-[var(--iwfw-surface)] p-6 ${className}`}
    >
      {children}
    </div>
  );
}
