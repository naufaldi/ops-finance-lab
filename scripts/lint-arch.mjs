// Memeriksa batas arsitektur module claims: domain dan application tidak boleh bergantung pada infra.
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const claims = join(root, "src/claims");
const guarded = ["domain", "application"];

const forbiddenPackage = /^(hono|@cloudflare\/)/;
const forbiddenPath = /(^|\/)infrastructure(\/|$)|(^|\/)d1-[^/]*$/;
const forbiddenGlobal = /\bD1(Database|PreparedStatement|Result|ExecResult)\b/;

function* files(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* files(p);
    else if (/\.tsx?$/.test(e.name)) yield p;
  }
}

const specifier = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)["']([^"']+)["']/g;
const violations = [];

for (const layer of guarded) {
  for (const file of files(join(claims, layer))) {
    const src = readFileSync(file, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
      .replace(/(^|[^:])\/\/.*$/gm, "$1");
    const rel = relative(root, file);
    const lineOf = (i) => src.slice(0, i).split("\n").length;

    for (const m of src.matchAll(specifier)) {
      const spec = m[1];
      let reason = null;
      if (forbiddenPackage.test(spec)) reason = `mengimpor "${spec}"`;
      else if (forbiddenPath.test(spec)) reason = `mengimpor file infra "${spec}"`;
      else if (spec.startsWith(".")) {
        const target = relative(claims, resolve(file, "..", spec));
        if (target.startsWith("..")) reason = `mengimpor di luar module claims "${spec}"`;
      }
      if (reason) violations.push(`${rel}:${lineOf(m.index)} (${layer}) ${reason}`);
    }
    const g = forbiddenGlobal.exec(src);
    if (g) violations.push(`${rel}:${lineOf(g.index)} (${layer}) memakai tipe D1 "${g[0]}"`);
  }
}

if (violations.length) {
  console.error("lint:arch gagal. domain dan application tidak boleh bergantung pada hono, D1, atau infra:");
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}
console.log("lint:arch ok");
