import type { ReactNode } from "react";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const tones = {
    neutral: "bg-[var(--iwfw-paper)] text-[var(--iwfw-muted)]",
    success: "bg-emerald-50 text-emerald-800",
    warning: "bg-amber-50 text-amber-900",
    danger: "bg-red-50 text-red-800",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
