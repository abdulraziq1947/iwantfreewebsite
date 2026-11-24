"use client";

import { createElement, useEffect, useRef, type ReactNode } from "react";

/**
 * Soft scroll-in for marketing sections. Respects prefers-reduced-motion.
 *
 * Content is visible in the server HTML; only blocks still below the fold
 * after hydration are hidden (`is-pending`) and then revealed (`is-visible`),
 * so nothing stays invisible if JavaScript is slow or unavailable.
 */
export function Reveal({
  children,
  className = "",
  delayMs = 0,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  as?: "div" | "li";
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (node.getBoundingClientRect().top < window.innerHeight * 0.92) return;

    node.classList.add("is-pending");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          node.classList.add("is-visible");
          node.classList.remove("is-pending");
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return createElement(
    as,
    {
      ref,
      className: `iwfw-reveal ${className}`.trim(),
      style: delayMs ? { transitionDelay: `${delayMs}ms` } : undefined,
    },
    children,
  );
}
