type LogLevel = "debug" | "info" | "warn" | "error";

/** Redact credentials / secrets / activation tokens from log strings. */
export function redactSecrets(value: string): string {
  return value
    .replace(/\bsk_(?:test|live)_[A-Za-z0-9]+/g, "sk_[REDACTED]")
    .replace(/\bwhsec_[A-Za-z0-9]+/g, "whsec_[REDACTED]")
    .replace(/\brk_(?:test|live)_[A-Za-z0-9]+/g, "rk_[REDACTED]")
    .replace(/\bre_[A-Za-z0-9_]+/g, "re_[REDACTED]")
    .replace(
      /([?&]token=)[^&\s"']+/gi,
      "$1[REDACTED]",
    );
}

function sanitizeFields(
  fields: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(fields)) {
    const lower = key.toLowerCase();
    if (
      lower.includes("secret") ||
      lower.includes("password") ||
      lower.includes("authorization") ||
      lower.includes("api_key") ||
      lower.includes("apikey") ||
      lower === "stripe_secret_key" ||
      lower === "stripe_webhook_secret" ||
      lower === "resend_api_key" ||
      lower === "rawtoken" ||
      lower === "raw_token" ||
      lower === "activationtoken" ||
      lower === "activation_token" ||
      lower === "token"
    ) {
      out[key] = "[REDACTED]";
      continue;
    }
    if (typeof raw === "string") {
      out[key] = redactSecrets(raw);
    } else {
      out[key] = raw;
    }
  }
  return out;
}

export function log(
  level: LogLevel,
  message: string,
  fields: Record<string, unknown> = {},
) {
  const entry = {
    level,
    message: redactSecrets(message),
    ts: new Date().toISOString(),
    ...sanitizeFields(fields),
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
