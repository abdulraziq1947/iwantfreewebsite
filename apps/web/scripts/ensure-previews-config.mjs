/**
 * Vite/Cloudflare may emit build/server/wrangler.json without copying the
 * source `previews` block in older plugin/tooling combinations. `wrangler
 * preview` redirects to that file via `.wrangler/deploy/config.json` and
 * requires `previews` (empty object is valid).
 *
 * Also copies top-level R2 bindings into `previews` when missing so Workers
 * Builds preview deploys receive CUSTOMER_UPLOADS.
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
let changed = false;

if (config.previews === undefined) {
  config.previews = {};
  changed = true;
}

const topR2 = Array.isArray(config.r2_buckets) ? config.r2_buckets : [];
const previewR2 = Array.isArray(config.previews.r2_buckets)
  ? config.previews.r2_buckets
  : [];

if (topR2.length > 0 && previewR2.length === 0) {
  config.previews.r2_buckets = topR2.map((bucket) => ({
    binding: bucket.binding,
    bucket_name: bucket.bucket_name,
  }));
  changed = true;
}

if (changed) {
  writeFileSync(target, `${JSON.stringify(config)}\n`);
  console.log(
    "ensure-previews-config: ensured previews (+ R2 when present) on generated wrangler.json",
  );
} else {
  console.log("ensure-previews-config: previews block already present");
}
