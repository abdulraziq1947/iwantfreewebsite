/**
 * Vite/Cloudflare may emit build/server/wrangler.json without copying the
 * source `previews` block in older plugin/tooling combinations. `wrangler
 * preview` redirects to that file via `.wrangler/deploy/config.json` and
 * requires `previews` (empty object is valid).
 *
 * This runs after `react-router build`. Preview CI that skips the app build
 * never reaches this script — see `workers-ci-prepare.mjs`.
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
