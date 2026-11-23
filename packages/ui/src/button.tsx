import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "iwfw-ui-btn iwfw-ui-btn--primary",
  secondary: "iwfw-ui-btn iwfw-ui-btn--secondary",
  ghost: "iwfw-ui-btn iwfw-ui-btn--ghost",
  danger: "iwfw-ui-btn iwfw-ui-btn--danger",
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
      className={`${variants[variant]} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
