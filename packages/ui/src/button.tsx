import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--iwfw-accent)] text-white hover:bg-[var(--iwfw-accent-hover)]",
  secondary:
    "bg-[var(--iwfw-surface)] text-[var(--iwfw-ink)] border border-[var(--iwfw-border)] hover:bg-[var(--iwfw-paper)]",
  ghost: "bg-transparent text-[var(--iwfw-ink)] hover:bg-[var(--iwfw-paper)]",
  danger: "bg-[var(--iwfw-danger)] text-white hover:opacity-90",
};

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: Variant;
}) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-[var(--iwfw-radius)] px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
