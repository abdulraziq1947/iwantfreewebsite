type LogLevel = "debug" | "info" | "warn" | "error";

/** Redact Stripe credentials / webhook secrets from log strings. */
export function redactSecrets(value: string): string {
  return value
    .replace(/\bsk_(?:test|live)_[A-Za-z0-9]+/g, "sk_[REDACTED]")
    .replace(/\bwhsec_[A-Za-z0-9]+/g, "whsec_[REDACTED]")
    .replace(/\brk_(?:test|live)_[A-Za-z0-9]+/g, "rk_[REDACTED]");
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
      lower === "stripe_secret_key" ||
      lower === "stripe_webhook_secret"
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
