import type { InputHTMLAttributes } from "react";

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`iwfw-control${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}
