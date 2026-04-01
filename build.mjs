import * as esbuild from "esbuild";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(flag, required = false) {
  const i = args.indexOf(flag);
  const val = i !== -1 ? args[i + 1] : null;
  if (required && !val) {
    console.error(`Missing required argument: ${flag}`);
    process.exit(1);
  }
  return val;
}

const ENTRY = getArg("--entry", true); // e.g. node_modules/zod
const NAME = getArg("--name", true); // e.g. Zod
const OUT = getArg("--out", true); // e.g. zod.bundle.js
const POST_INIT = getArg("--postinit"); // e.g. "Zod.config({ jitless: true })"
const TEST = getArg("--test"); // e.g. "z.string().parse('hello')"
const TMP_DIR = "rhino-bundle-tmp";

// ── Reserved words ────────────────────────────────────────────────────────────
const RESERVED_WORDS = [
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "finally",
  "for",
  "function",
  "if",
  "implements",
  "import",
  "in",
  "instanceof",
  "interface",
  "let",
  "new",
  "package",
  "private",
  "protected",
  "public",
  "return",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  "yield",
];

// ── Step 1: Babel ─────────────────────────────────────────────────────────────
console.log(`[1/4] Transpiling ${ENTRY} with Babel...`);
execSync(`npx babel ${ENTRY} --out-dir ${TMP_DIR} --copy-files`, {
  stdio: "inherit",
});

// ── Step 2: esbuild ───────────────────────────────────────────────────────────
console.log(`[2/4] Bundling with esbuild...`);
const entryIndex = fs.existsSync(path.join(TMP_DIR, "index.js"))
  ? path.join(TMP_DIR, "index.js")
  : path.join(TMP_DIR, "index.mjs");

await esbuild.build({
  entryPoints: [entryIndex],
  bundle: true,
  format: "iife",
  globalName: NAME,
  target: "es5",
  minify: true,
  outfile: OUT,
  inject: ["./rhino-polyfills.js"],
  banner: { js: "var __customGlobal = {};" },
  define: { globalThis: "__customGlobal" },
});

// ── Step 3: Post-process reserved words ──────────────────────────────────────
console.log(`[3/4] Patching reserved word identifiers...`);
let bundle = fs.readFileSync(OUT, "utf-8");

RESERVED_WORDS.forEach((word) => {
  bundle = bundle.replace(new RegExp(`\\.${word}\\b`, "g"), `["${word}"]`);
  bundle = bundle.replace(
    new RegExp(`([,{]\\s*)${word}(\\s*:)`, "g"),
    `$1"${word}"$2`,
  );
});

if (POST_INIT) {
  bundle += `\n${POST_INIT};`;
}

fs.writeFileSync(OUT, bundle);

// ── Step 4: Test ──────────────────────────────────────────────────────────────
if (TEST) {
  console.log(`[4/4] Running test...`);
  const testScript = `
    const fs = require("fs");
    eval(fs.readFileSync(${JSON.stringify(OUT)}, "utf-8"));
    const ${NAME} = global.${NAME};
    ${TEST}
    console.log("Test passed!");
  `;
  try {
    execSync(`node -e ${JSON.stringify(testScript)}`, { stdio: "inherit" });
  } catch {
    console.error("Test failed!");
    process.exit(1);
  }
} else {
  console.log(`[4/4] No test specified, skipping.`);
}

// ── Cleanup ───────────────────────────────────────────────────────────────────
fs.rmSync(TMP_DIR, { recursive: true });
console.log(
  `\nDone! Output: ${OUT} (${(fs.statSync(OUT).size / 1024).toFixed(1)} KB)`,
);
