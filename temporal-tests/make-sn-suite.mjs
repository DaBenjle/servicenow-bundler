import fs from "node:fs";
import { execSync } from "node:child_process";

const SRC = process.argv[2] || "my-temporal-tests.js";
const OUT = "sn-temporal-tests.js";
const RAW = ".sn-suite.raw.js";

// identical reserved-word pass to build.mjs — turns `.with` into ["with"], etc.
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
const patch = (s) =>
  RESERVED_WORDS.reduce(
    (acc, w) =>
      acc
        .replace(new RegExp(`\\.${w}\\b`, "g"), `["${w}"]`)
        .replace(new RegExp(`([,{]\\s*)${w}(\\s*:)`, "g"), `$1"${w}"$2`),
    s,
  );

// ES5 prelude: resolve bundle (SN global OR Node file) + tiny harness.
const prelude = `
var __NS = (typeof TemporalPackage !== 'undefined') ? TemporalPackage
  : (typeof require !== 'undefined'
      ? (0, eval)(require('fs').readFileSync(process.argv[2] || 'bundles/temporal.bundle.js', 'utf8') + '\\n;TemporalPackage')
      : null);
var Temporal = __NS.Temporal;
var __out = (typeof gs !== 'undefined' && gs.info) ? function (m) { gs.info('' + m); } : function (m) { console.log('' + m); };
var __p = 0, __f = 0, __msgs = [];
function assert(c, m) { if (!c) throw new Error(m || 'assert failed'); }
function assertEq(a, b, m) { if (String(a) !== String(b)) throw new Error((m ? m + ': ' : '') + 'got ' + a + ' expected ' + b); }
function test(name, fn) { try { fn(); __p++; } catch (e) { __f++; __msgs.push(name + ' -> ' + (e && e.message || e)); } }
`;
const tail = `
__out('Temporal SN suite: passed ' + __p + ' failed ' + __f);
for (var __i = 0; __i < __msgs.length; __i++) __out('  FAIL ' + __msgs[__i]);
if (typeof process !== 'undefined' && process.exit) process.exit(__f ? 1 : 0);
`;

fs.writeFileSync(
  RAW,
  prelude + "\n" + fs.readFileSync(SRC, "utf8") + "\n" + tail,
);
execSync(`npx babel ${RAW} -o ${OUT}`, { stdio: "inherit" }); // reuses your rhino-targeted babel config
fs.writeFileSync(OUT, patch(fs.readFileSync(OUT, "utf8")));
fs.rmSync(RAW);
console.log(`wrote ${OUT}`);
