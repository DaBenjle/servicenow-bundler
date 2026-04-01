# servicenow-bundler

Bundles modern npm packages into ServiceNow-compatible Script Includes. Handles Rhino engine quirks (ES3 reserved words, missing globals, sealed `globalThis`) automatically.

## Usage

```bash
node build.mjs --entry <source> --name <global> --out <file> [--postinit <code>] [--test <code>]
```

| Flag | Required | Description |
|------|----------|-------------|
| `--entry` | ✓ | Path to the package source (e.g. `node_modules/zod`) |
| `--name` | ✓ | Global variable name in the bundle (e.g. `Zod`) |
| `--out` | ✓ | Output file path (e.g. `zod.bundle.js`) |
| `--postinit` | | JS to append after the bundle (e.g. package config calls) |
| `--test` | | JS snippet to smoke-test the bundle in Node after building |

## Example: Bundling Zod

```bash
node build.mjs \
  --entry node_modules/zod \
  --name Zod \
  --out zod.bundle.js \
  --postinit "Zod.config({ jitless: true })" \
  --test "if (Zod.string().parse('hello') !== 'hello') throw new Error('fail')"
```

## ServiceNow Usage

1. Copy the contents of the output file into a Script Include body.
2. Set the Script Include name to match the `--name` flag (e.g. `Zod`).
3. Reference it from other scripts:

```javascript
var z = Zod;

// Strange syntax because someObj.boolean is reserved in ES3 (not a problem in ES12)
// Likely not a consideration for most packages
z["boolean"]()
z["enum"](["a", "b", "c"])
z["default"]("fallback")
z["object"]({ name: z.string() })
z.number()["int"]()
z.string()["pipe"](z.number())
```

## How It Works

1. **Babel** transpiles the package source to Rhino-compatible JS using `@babel/preset-env` targeting Rhino 1.7.14, with loose mode transforms for spread and for-of.
2. **esbuild** bundles everything into an IIFE, replacing `globalThis` with a plain local object to avoid Rhino's sealed global issue.
3. **`rhino-polyfills.js`** is injected inside the IIFE, providing `Object.fromEntries`, `Object.values`, `Object.entries`, and `URL` — APIs that are missing or broken in Rhino. (Not extensive)
4. **Reserved word patching** rewrites any `.catch`, `.default`, `.return` etc. property accesses to bracket notation so Rhino's ES3-era parser doesn't choke.

## Adding Polyfills

If you bundle a different package and hit a missing API error, add a polyfill to `rhino-polyfills.js`. Keep them simple — avoid anything that depends on `Symbol` or iterators since Rhino's support for these is incomplete.
