# ops-finance

Aplikasi klaim biaya Ops Sales untuk lab Sesi 2 dan Sesi 3. Data dummy.

## Branch
- `main`: starter Lab Sesi 2 (Bagian G)
- `solution`: hasil akhir Lab Sesi 2
- `sesi3-start`: titik awal Lab Sesi 3 Part 1 (= `solution` + helper test `test/helpers/env.ts`)
- `sesi3-part1-solution`: hasil Lab Sesi 3 Part 1 (PRD, ARCHITECTURE, TRD, ADR, refactor claims ke layer)
- `sesi3-part2-start`: titik awal Lab Sesi 3 Part 2 (= tag lab4-selesai)
- `sesi3-part2-solution`: hasil Lab Sesi 3 Part 2 (plafon, test, E2E, debugging, PR, review, regresi)
Diuji 19 Okt 2026: Node 22.22, wrangler 4.151, hono 4.13, @modelcontextprotocol/server 2.3.1, Claude Code 2.1.303.

## Jalankan
    npm install
    npm run db:migrate      # D1 lokal: skema + 3 user dummy (password demo123)
    npm run dev             # http://127.0.0.1:8787
    npm test                # Vitest

Login Web App: admin@ops.test (admin), rina@ops.test dan budi@ops.test (sales).

## Sambungkan Claude Code (sisi sales)
1. Login sebagai sales, buka "Token untuk Claude", buat token.
2. `export OPS_FINANCE_TOKEN="of_..."`
3. `.mcp.json` sudah tersedia (atau pakai `claude mcp add --scope project ops-finance -- npx tsx mcp/server.ts`).
4. Permission ada di `.claude/settings.json`.
5. Buka Claude Code di folder ini, setujui server ops-finance, lalu tanya "Klaim saya apa saja?".

## Struktur
- `src/index.tsx`, `src/web.tsx`: Web App (Hono JSX) untuk admin dan sales
- `src/api.ts`: API JSON dengan token pribadi (`/api/claims`, `/api/claims/:id/receipt`)
- `src/auth.ts`: session cookie, token (hash SHA-256), scope
- `src/validate.ts` + `test/validate.test.ts`: validasi klaim
- `mcp/server.ts`: MCP ops-finance (list_my_claims, create_claim, upload_receipt)
- `receipts/`: 4 struk dummy, termasuk `parkir-injeksi.png` untuk uji Prompt Injection

## Batasan versi lab
- Hash password SHA-256 dan token disalin manual ke env hanya untuk lab. Produksi: bcrypt/Argon2 dan OAuth.
- Form Web App belum memakai token CSRF.
- Deploy ke Cloudflare (`npm run deploy`) butuh akun, D1 dan R2 remote, dan `database_id` asli di wrangler.jsonc.
