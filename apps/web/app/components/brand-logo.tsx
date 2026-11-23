type BrandLogoProps = {
  size?: number;
  className?: string;
  /** Show wordmark next to the mark */
  withWordmark?: boolean;
  /** Compact admin/customer shells */
  variant?: "default" | "admin" | "inverse";
};

/**
 * iwantfreewebsite.com brand mark — browser window with a soft green pulse.
 * Used in public nav, customer/admin shells, and favicon-adjacent assets.
 */
export function BrandLogo({
  size = 32,
  className = "",
  withWordmark = false,
  variant = "default",
}: BrandLogoProps) {
  const markClass =
    variant === "admin"
      ? "iwfw-brand__mark iwfw-brand__mark--admin"
      : variant === "inverse"
        ? "iwfw-brand__mark iwfw-brand__mark--inverse"
        : "iwfw-brand__mark";

  return (
    <span className={`iwfw-brand ${className}`.trim()}>
      <svg
        className={markClass}
        width={size}
        height={size}
        viewBox="0 0 40 40"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="iwfwLogoGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2f9e6a" />
            <stop offset="100%" stopColor="#1a6b45" />
          </linearGradient>
        </defs>
        <rect
          x="2"
          y="2"
          width="36"
          height="36"
          rx="10"
          fill="url(#iwfwLogoGlow)"
        />
        <rect x="9" y="11" width="22" height="15" rx="3" fill="#fff" />
        <circle cx="12.5" cy="14.5" r="1.1" fill="#2f9e6a" opacity="0.85" />
        <circle cx="16" cy="14.5" r="1.1" fill="#2f9e6a" opacity="0.55" />
        <circle cx="19.5" cy="14.5" r="1.1" fill="#2f9e6a" opacity="0.35" />
        <path
          d="M13 22.5h8.5M13 19h14"
          stroke="#1a6b45"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.55"
        />
        <path
          d="M27.2 18.2l3.2 5.2-2.9-.55-.95 2.45-1.95-5.85 2.6.25z"
          fill="#f0b429"
        />
        <path
          d="M14 33h12l-1.6-4H15.6L14 33z"
          fill="#fff"
          opacity="0.92"
        />
      </svg>
      {withWordmark ? (
        <span className="iwfw-brand__wordmark">
          iwantfreewebsite
          <span className="iwfw-brand__tld">.com</span>
        </span>
      ) : null}
    </span>
  );
}
