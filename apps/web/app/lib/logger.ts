type LogLevel = "debug" | "info" | "warn" | "error";

export function log(
  level: LogLevel,
  message: string,
  fields: Record<string, unknown> = {},
) {
  const entry = {
    level,
    message,
    ts: new Date().toISOString(),
    ...fields,
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
