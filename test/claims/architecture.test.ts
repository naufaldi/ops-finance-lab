/// <reference types="node" />
// Menjaga dependency rule src/claims (TRD bagian 2.1): arah import selalu ke dalam.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = fileURLToPath(new URL("../../src", import.meta.url));
const CLAIMS = path.join(SRC, "claims");

type Layer = "domain" | "application" | "infrastructure" | "interface";
const LAYERS: Layer[] = ["domain", "application", "infrastructure", "interface"];

type Import = { spec: string; typeOnly: boolean };

// Target import: "layer:<nama>", "claims:<file>" (index.ts), "src:<path>" (di luar modul), atau "pkg:<nama>".
function target(fromFile: string, spec: string): string {
  if (!spec.startsWith(".")) return `pkg:${spec}`;
  const rel = path.relative(CLAIMS, path.resolve(path.dirname(fromFile), spec));
  if (rel.startsWith("..")) return `src:${path.relative(SRC, path.resolve(path.dirname(fromFile), spec))}`;
  const first = rel.split(path.sep)[0];
  return (LAYERS as string[]).includes(first) ? `layer:${first}` : `claims:${first}`;
}

const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\s\/\/.*$/gm, "");

function importsOf(code: string): Import[] {
  const out: Import[] = [];
  for (const m of code.matchAll(/\b(import|export)(\s+type)?\b[^;'"]*?\bfrom\s*["']([^"']+)["']/g)) out.push({ spec: m[3], typeOnly: !!m[2] });
  for (const m of code.matchAll(/\bimport\s*["']([^"']+)["']/g)) out.push({ spec: m[1], typeOnly: false });
  for (const m of code.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g)) out.push({ spec: m[1], typeOnly: false });
  return out;
}

const hono = (t: string) => t === "pkg:hono" || t.startsWith("pkg:hono/");

const RULES: Record<Layer, { allow: (t: string, typeOnly: boolean) => boolean; forbidden: RegExp[] }> = {
  domain: {
    allow: (t) => t === "layer:domain",
    forbidden: [/\bD1Database\b/, /\bR2Bucket\b/, /\bDate\.now\b/, /\bfetch\s*\(/],
  },
  application: {
    allow: (t) => t === "layer:domain" || t === "layer:application",
    forbidden: [/\bD1Database\b/, /\bR2Bucket\b/],
  },
  infrastructure: {
    allow: (t, typeOnly) => t === "layer:domain" || t === "layer:infrastructure" || (t === "layer:application" && typeOnly),
    forbidden: [],
  },
  interface: {
    allow: (t) => ["layer:application", "layer:domain", "layer:interface", "src:auth"].includes(t) || hono(t) || t.startsWith("src:ui"),
    forbidden: [],
  },
};

export function violations(layer: Layer, file: string, source: string): string[] {
  const code = stripComments(source);
  const found: string[] = [];
  for (const imp of importsOf(code)) {
    const t = target(file, imp.spec);
    if (!RULES[layer].allow(t, imp.typeOnly)) found.push(`${layer} tidak boleh mengimpor "${imp.spec}" (${t}${imp.typeOnly ? ", type-only" : ""})`);
  }
  for (const re of RULES[layer].forbidden) if (re.test(code)) found.push(`${layer} memakai identifier terlarang ${re}`);
  return found;
}

function filesIn(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? filesIn(p) : /\.tsx?$/.test(e.name) ? [p] : [];
  });
}

describe("dependency rule src/claims", () => {
  for (const layer of LAYERS) {
    const dir = path.join(CLAIMS, layer);
    it(`layer ${layer} mematuhi aturan import`, () => {
      const files = existsSync(dir) ? filesIn(dir) : [];
      const all = files.flatMap((f) => violations(layer, f, readFileSync(f, "utf8")).map((v) => `${path.relative(SRC, f)}: ${v}`));
      expect(all).toEqual([]);
    });
  }

  it("mendeteksi pelanggaran (uji negatif pada kode contoh)", () => {
    const f = path.join(CLAIMS, "domain", "x.ts");
    expect(violations("domain", f, `import { Hono } from "hono";`)).toHaveLength(1);
    expect(violations("domain", f, `const t = Date.now();`)).toHaveLength(1);
    expect(violations("domain", f, `import "../application/ports";`)).toHaveLength(1);
    expect(violations("application", path.join(CLAIMS, "application", "x.ts"), `import { a } from "../../auth";`)).toHaveLength(1);
    expect(violations("application", path.join(CLAIMS, "application", "x.ts"), `let d: D1Database;`)).toHaveLength(1);
    expect(violations("infrastructure", path.join(CLAIMS, "infrastructure", "x.ts"), `import { a } from "../application/ports";`)).toHaveLength(1);
    expect(violations("infrastructure", path.join(CLAIMS, "infrastructure", "x.ts"), `import type { a } from "../application/ports";`)).toEqual([]);
    expect(violations("interface", path.join(CLAIMS, "interface", "x.ts"), `import { r } from "../infrastructure/r";`)).toHaveLength(1);
    expect(violations("interface", path.join(CLAIMS, "interface", "x.ts"), `import { Hono } from "hono";\nimport { Page } from "../../ui/page";`)).toEqual([]);
  });
});
