import { useMemo } from "react";
import { renderSVG } from "uqr";

/**
 * Renders a scannable QR code for a TOTP otpauth URI.
 * Generation is client-only — the URI is never posted elsewhere.
 */
export function TotpQrCode({
  totpURI,
  label = "Authenticator QR code",
}: {
  totpURI: string;
  label?: string;
}) {
  const svg = useMemo(
    () =>
      renderSVG(totpURI, {
        ecc: "M",
        border: 2,
        pixelSize: 4,
        whiteColor: "#ffffff",
        blackColor: "#0f172a",
      }),
    [totpURI],
  );

  return (
    <div
      className="iwfw-mfa-qr"
      role="img"
      aria-label={label}
      // SVG from uqr over our own totpURI — not user HTML.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
