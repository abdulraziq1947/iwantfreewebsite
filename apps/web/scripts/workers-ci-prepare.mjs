/**
 * Workers Builds preview path often skips the configured app build command
 * (empty/stale Preview `build_command` copy). It still runs dependency install,
 * then `npx wrangler preview`.
 *
 * `wrangler preview` sets useConfigRedirectIfAvailable, so when a prior/cached
 * Vite build left `.wrangler/deploy/config.json` → `build/server/wrangler.json`
 * without a `previews` block, preview fails with:
 *   "Your Wrangler configuration is missing a previews block"
 *
 * Even with a clean tree, source `wrangler.jsonc` can pass that check while the
 * Worker entry still needs the Vite build (`virtual:react-router/server-build`).
 *
 * This prepare hook runs during `pnpm install` on Workers CI preview branches
 * and ensures the generated deploy config exists with `previews: {}` before
 * Wrangler preview runs — which is why the post-build-only inject could not fix CI.
 */
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(scriptDir, "..");
const repoRoot = resolve(webRoot, "../..");
const generatedConfig = resolve(webRoot, "build/server/wrangler.json");
const webDeployConfig = resolve(webRoot, ".wrangler/deploy/config.json");

function isWorkersCi() {
  return process.env.WORKERS_CI === "1";
}

function isPreviewBranch() {
  const branch = process.env.WORKERS_CI_BRANCH;
  if (!branch) return true;
  return branch !== "main";
}

function readGeneratedPreviews() {
  if (!existsSync(generatedConfig)) return { exists: false, hasPreviews: false };
  try {
    const config = JSON.parse(readFileSync(generatedConfig, "utf8"));
    return { exists: true, hasPreviews: config.previews !== undefined, config };
  } catch {
    return { exists: true, hasPreviews: false, config: null };
  }
}

function injectPreviews(config) {
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
  if (!changed) return false;
  writeFileSync(generatedConfig, `${JSON.stringify(config)}\n`);
  console.log(
    "workers-ci-prepare: ensured previews (+ R2 when present) on build/server/wrangler.json",
  );
  return true;
}

function runWebBuild() {
  console.log(
    "workers-ci-prepare: Workers CI preview path — running apps/web build:production before wrangler preview",
  );
  const result = spawnSync(
    "pnpm",
    ["run", "build:production"],
    {
      cwd: webRoot,
      stdio: "inherit",
      env: {
        ...process.env,
        CLOUDFLARE_ENV: process.env.CLOUDFLARE_ENV || "production",
      },
    },
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

/**
 * When Workers Builds still uses repository root as cwd, wrangler never sees
 * apps/web/wrangler.jsonc. After the Vite build, point a root deploy redirect
 * at the generated config (which includes previews).
 */
function ensureRootRedirectShim() {
  if (!existsSync(generatedConfig)) return;

  const rootWrangler = resolve(repoRoot, "wrangler.jsonc");
  const rootDeployDir = resolve(repoRoot, ".wrangler/deploy");
  const rootDeployConfig = resolve(rootDeployDir, "config.json");

  if (!existsSync(rootWrangler)) {
    writeFileSync(
      rootWrangler,
      `${JSON.stringify(
        {
          $schema: "apps/web/node_modules/wrangler/config-schema.json",
          name: "iwantfreewebsite",
          compatibility_date: "2026-11-19",
          compatibility_flags: ["nodejs_compat"],
          main: "apps/web/workers/app.ts",
          previews: {},
        },
        null,
        2,
      )}\n`,
    );
    console.log(
      "workers-ci-prepare: wrote temporary root wrangler.jsonc for repo-root preview cwd",
    );
  }

  mkdirSync(rootDeployDir, { recursive: true });
  writeFileSync(
    rootDeployConfig,
    `${JSON.stringify({
      // Relative to `.wrangler/deploy/` (same convention as the Vite plugin).
      configPath: "../../apps/web/build/server/wrangler.json",
      auxiliaryWorkers: [],
    })}\n`,
  );
  console.log(
    "workers-ci-prepare: pointed root .wrangler/deploy/config.json at apps/web generated config",
  );
}

function removeStaleWebRedirectIfBroken() {
  if (!existsSync(webDeployConfig)) return;
  if (existsSync(generatedConfig)) return;
  rmSync(webDeployConfig, { force: true });
  console.log(
    "workers-ci-prepare: removed stale apps/web .wrangler/deploy/config.json (missing generated target)",
  );
}

if (!isWorkersCi()) {
  process.exit(0);
}

removeStaleWebRedirectIfBroken();

const generated = readGeneratedPreviews();

if (isPreviewBranch()) {
  if (!generated.exists) {
    runWebBuild();
  } else if (generated.config) {
    const injected = injectPreviews(generated.config);
    if (!injected && generated.hasPreviews) {
      console.log(
        "workers-ci-prepare: generated wrangler.json already has previews",
      );
    } else if (!injected && !generated.hasPreviews) {
      runWebBuild();
    }
  } else if (!generated.hasPreviews) {
    runWebBuild();
  }
} else if (generated.exists && generated.config) {
  injectPreviews(generated.config);
}

// If install/prepare ran from the monorepo root, also support preview cwd=/ 
if (resolve(process.cwd()) === repoRoot || existsSync(resolve(repoRoot, "pnpm-workspace.yaml"))) {
  const after = readGeneratedPreviews();
  if (after.exists && after.hasPreviews) {
    ensureRootRedirectShim();
  }
}
