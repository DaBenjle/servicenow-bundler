import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const TEST262_DIR = "/home/ben/Projects/zod-bundler/temporal-tests/test262";
const INJECTED =
  "/home/ben/Projects/zod-bundler/temporal-tests/temporal.injected.js";
const RUNS = {
  upstream:
    "/home/ben/Projects/zod-bundler/node_modules/temporal-polyfill/global.min.js",
  bundle: INJECTED,
};

// ─────────────── CHILD MODE: `node run-test262.mjs --run <label> [globs…]` ───────────────
const runIdx = process.argv.indexOf("--run");
if (runIdx !== -1) {
  const label = process.argv[runIdx + 1];
  const globs = process.argv.slice(runIdx + 2);
  const { default: runTest262 } =
    await import("@js-temporal/temporal-test262-runner");
  try {
    runTest262({
      test262Dir: TEST262_DIR,
      polyfillCodeFile: RUNS[label],
      testGlobs: globs.length ? globs : [], // undefined = all (empty array = none)
      expectedFailureFiles: [],
    });
  } catch (e) {
    console.error("runner threw:", (e && e.stack) || e);
  }
  process.exit(0); // we diff on captured text, not the exit code
}

// ─────────────── PARENT MODE ───────────────
const epilogue = `
;Object.defineProperty(globalThis,'Temporal',{value:TemporalPackage.Temporal,configurable:true,writable:true});
globalThis.Intl=globalThis.Intl||{};
globalThis.Intl.DateTimeFormat=TemporalPackage.Intl.DateTimeFormat;   // carries the original statics
var __tti = TemporalPackage.toTemporalInstant;
Object.defineProperty(__tti, 'name', { value: 'toTemporalInstant', configurable: true });
Object.defineProperty(Date.prototype, 'toTemporalInstant',
  { value: __tti, writable: true, configurable: true });
`;
fs.writeFileSync(
  INJECTED,
  fs.readFileSync(
    "/home/ben/Projects/zod-bundler/bundles/temporal.bundle.js",
    "utf8",
  ) + epilogue,
);

const GLOBS = process.argv.slice(2);
const ANSI = /\x1b\[[0-9;]*m/g;

function run(label) {
  if (!fs.existsSync(RUNS[label]))
    throw new Error(`polyfillCodeFile not found: ${RUNS[label]}`);
  console.error(`▶ ${label}: ${RUNS[label]}`);
  const res = spawnSync(
    process.execPath,
    [__filename, "--run", label, ...GLOBS],
    {
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024, // logs are big; don't truncate
      env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
    },
  );
  const text = (res.stdout || "") + (res.stderr || "");
  fs.writeFileSync(`temporal-tests/${label}.log`, text);
  if (res.status !== 0) console.error(`  (child exited ${res.status})`);

  const fails = new Set();
  for (const raw of text.split("\n")) {
    const line = raw.replace(ANSI, "");
    const m = line.match(/^FAIL:\s+(\S+\.js)/);
    if (m) fails.add(m[1]);
  }
  console.error(
    `  ${fails.size} failing (full log: temporal-tests/${label}.log)`,
  );
  return fails;
}

const upstream = run("upstream");
const bundle = run("bundle");

// ─────────────── diff ───────────────
const sortedDiff = (a, b) => [...a].filter((p) => !b.has(p)).sort();
const regressions = sortedDiff(bundle, upstream); // bundle fails, upstream passes  ← your work
const upstreamOnly = sortedDiff(upstream, bundle); // upstream fails, bundle passes  ← noise/version

fs.writeFileSync(
  "temporal-tests/fails.upstream.txt",
  [...upstream].sort().join("\n") + "\n",
);
fs.writeFileSync(
  "temporal-tests/fails.bundle.txt",
  [...bundle].sort().join("\n") + "\n",
);
fs.writeFileSync(
  "temporal-tests/regressions.txt",
  regressions.join("\n") + "\n",
);
fs.writeFileSync(
  "temporal-tests/upstream-only.txt",
  upstreamOnly.join("\n") + "\n",
);

const leaf = (p) => p.slice(p.lastIndexOf("/") + 1);
const buckets = {};
for (const p of regressions) buckets[leaf(p)] = (buckets[leaf(p)] || 0) + 1;
const ranked = Object.entries(buckets).sort((a, b) => b[1] - a[1]);

console.error(`\n──────── diff (bundle vs upstream, same Node/ICU) ────────`);
console.error(`raw fails:  upstream ${upstream.size}   bundle ${bundle.size}`);
console.error(
  `regressions (bundle-only): ${regressions.length}  → temporal-tests/regressions.txt`,
);
console.error(
  `upstream-only (noise):     ${upstreamOnly.length}  → temporal-tests/upstream-only.txt`,
);
if (ranked.length) {
  console.error(`\ntop regression buckets:`);
  for (const [name, count] of ranked.slice(0, 15)) {
    console.error(`  ${String(count).padStart(4)}  ${name}`);
  }
}
const accepted = fs.existsSync("temporal-tests/es5-accepted-failures.txt")
  ? new Set(
      fs
        .readFileSync("temporal-tests/es5-accepted-failures.txt", "utf8")
        .split("\n")
        .filter(Boolean),
    )
  : new Set();
const newRegressions = regressions.filter((p) => !accepted.has(p));

console.error(
  `new regressions (excluding accepted ES5 artifacts): ${newRegressions.length}`,
);
process.exit(newRegressions.length ? 1 : 0);
