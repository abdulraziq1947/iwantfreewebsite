import { parseWorkerEnv, type WorkerEnvConfig } from "@iwfw/config";
import type { RouterContextProvider } from "react-router";
import { cloudflareContext } from "./cloudflare-context";

export function getEnv(context: Readonly<RouterContextProvider>): Env {
  return context.get(cloudflareContext).env;
}

export function getConfig(
  context: Readonly<RouterContextProvider>,
): WorkerEnvConfig {
  return parseWorkerEnv(getEnv(context) as unknown as Record<string, unknown>);
}
