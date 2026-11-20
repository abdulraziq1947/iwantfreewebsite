import type { InputHTMLAttributes } from "react";

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-[var(--iwfw-radius)] border border-[var(--iwfw-border)] bg-[var(--iwfw-surface)] px-3 py-2 text-[var(--iwfw-ink)] outline-none focus:border-[var(--iwfw-accent)] ${className}`}
      {...props}
    />
  );
}
