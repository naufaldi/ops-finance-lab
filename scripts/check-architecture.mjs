// Cek dependency rule modul claims (lihat docs/TRD.md bagian 1). Jalankan: npm run lint:arch
// Exit 1 jika ada import yang melanggar, supaya bisa dipakai di hook Claude Code dan CI.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, normalize } from "node:path";

const RULES = [
  { name: "domain-murni", from: /^src\/(claims\/claim\.ts|validate\.ts)$/, forbid: /^(hono|src\/claims\/(d1-|r2-|claim\.service|index)|src\/(auth|api|web))/ },
  { name: "service-tanpa-infra", from: /^src\/claims\/claim\.service\.ts$/, forbid: /^(hono|src\/claims\/(d1-|r2-|index)|src\/(auth|api|web))/ },
  { name: "http-lewat-composition", from: /^src\/(web\.tsx|api\.ts)$/, forbid: /^src\/claims\/(d1-|r2-)/ },
];

const files = (dir) => readdirSync(dir, { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? files(join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [join(dir, e.name)] : []));

// "./claims" -> "src/claims", "hono/cookie" -> "hono/cookie"
const resolve = (file, spec) => (spec.startsWith(".") ? normalize(join(dirname(file), spec)).replaceAll("\\", "/") : spec);

let errors = 0;
for (const file of files("src").map((f) => f.replaceAll("\\", "/"))) {
  const imports = [...readFileSync(file, "utf8").matchAll(/(?:import|export)[^"']*from\s+["']([^"']+)["']/g)].map((m) => m[1]);
  for (const rule of RULES.filter((r) => r.from.test(file))) {
    for (const spec of imports) {
      if (rule.forbid.test(resolve(file, spec))) {
        console.error(`✗ ${rule.name}: ${file} tidak boleh import "${spec}"`);
        errors++;
      }
    }
  }
}
if (errors) { console.error(`${errors} pelanggaran. Lihat docs/TRD.md bagian 1.`); process.exit(1); }
console.log("✓ dependency rule claims: tidak ada pelanggaran");
