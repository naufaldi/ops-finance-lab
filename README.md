# ops-finance (starter Lab Sesi 2, Bagian G)

Aplikasi klaim biaya tim Ops Sales. Data dummy.

## Yang sudah ada
- `package.json` (Hono, Wrangler, Vitest, MCP SDK, zod), `wrangler.jsonc` (D1 `DB`, R2 `RECEIPTS`)
- `migrations/0002_seed.sql`: 3 user dummy (password demo123) dan 3 klaim awal
- `receipts/`: 4 struk dummy, termasuk satu struk berisi perintah tersembunyi
- `.mcp.json`: konfigurasi MCP ops-finance, token diambil dari env `OPS_FINANCE_TOKEN`

## Yang kita buat bersama Claude Code
1. Rencana dengan Plan Mode
2. CLAUDE.md dan `.claude/settings.json`
3. `migrations/0001_init.sql` (cocok dengan kolom di seed), API, validasi, dan test
4. Web App admin dan sales
5. Token pribadi untuk Claude
6. `mcp/server.ts`: list_my_claims, create_claim, upload_receipt

## Perintah
    npm install
    npm run db:migrate   # setelah 0001_init.sql dibuat
    npm run dev          # http://127.0.0.1:8787
    npm test

## Branch
- `main`: starter untuk peserta
- `solution`: solusi lengkap untuk trainer dan untuk dicocokkan setelah lab
