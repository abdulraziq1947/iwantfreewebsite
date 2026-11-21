/**
 * Cloudflare Vite builds emit build/server/wrangler.json without a `previews`
 * block. Workers Builds then runs `npx wrangler preview`, which redirects to
 * that generated file via .wrangler/deploy/config.json and fails unless
 * `previews` is present (empty object is valid).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = resolve(root, "build/server/wrangler.json");

if (!existsSync(target)) {
  console.error(`ensure-previews-config: missing ${target}`);
  process.exit(1);
}

const config = JSON.parse(readFileSync(target, "utf8"));
if (config.previews === undefined) {
  config.previews = {};
  writeFileSync(target, `${JSON.stringify(config)}\n`);
  console.log("ensure-previews-config: added empty previews block to generated wrangler.json");
} else {
  console.log("ensure-previews-config: previews block already present");
}
