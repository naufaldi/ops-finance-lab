# ops-finance-lab

Aplikasi klaim biaya tim Ops Sales (data dummy) untuk lab training **Advanced Claude Code for Agentic Software Engineering** (Hacktiv8 × Hitachi). Satu repo dipakai dari Sesi 2 sampai Sesi 3, setiap sesi punya branch sendiri.

Stack: Cloudflare Worker + Hono, D1 (SQLite), R2, MCP server stdio, Vitest, Playwright. Jalan lokal tanpa akun Cloudflare.

## Mulai dari branch mana?

| Sesi · Lab | Checkout dulu | Hasil yang benar (untuk dicocokkan) |
|---|---|---|
| Sesi 2 Part 2 · Lab Klaim Biaya (Bagian G) | `main` (branch ini) | branch `solution` |
| Sesi 3 Part 1 · Lab 1-4 (PRD, arsitektur, TRD, refactor) | `sesi3-start` | branch `sesi3-part1-solution`, tag `lab1-selesai` … `lab4-selesai` |
| Sesi 3 Part 2 · Lab 5 (implementasi plafon + test + E2E) | `sesi3-part2-start` | tag `lab5-selesai` |
| Sesi 3 Part 2 · Lab 6 (debugging) | `lab6-bug` | tag `lab6-selesai` |
| Sesi 3 Part 2 · Lab 7 (PR dan review dengan Claude) | tag `lab6-selesai` | tag `lab7-selesai` |
| Sesi 3 Part 2 · Lab 8 (agentic code review) | `lab8-review` (PR #1, jangan di-merge) | tag `lab8-selesai` |
| Sesi 3 Part 2 · Lab 9 (regression, git bisect, CI) | `lab9-regresi` | tag `lab9-selesai` |
| Hasil akhir semua lab | | branch `sesi3-part2-solution` |

Contoh:

    git clone https://github.com/naufaldi/ops-finance-lab.git
    cd ops-finance-lab
    git checkout sesi3-part2-start          # branch
    git checkout -b lanjut lab6-selesai     # tag: buat branch baru dari tag

Tertinggal satu lab? Simpan pekerjaan (`git stash`), lalu buat branch baru dari tag `labN-selesai` lab sebelumnya.

### Semua branch

| Branch | Isi |
|---|---|
| `main` | Starter Sesi 2: seed, struk dummy, `.mcp.json`. App belum ada |
| `solution` | Hasil Sesi 2: Web App, API, token, MCP server |
| `sesi3-start` | `solution` + helper test `test/helpers/env.ts` (D1 di node:sqlite) |
| `sesi3-part1-solution` | PRD, ARCHITECTURE, TRD, ADR 0001, modul `src/claims`, characterization test, `lint:arch` + hook |
| `sesi3-part2-start` | Awal Sesi 3 Part 2 (= tag `lab4-selesai`) |
| `lab6-bug` | Awal Lab 6: satu commit berisi dua bug di fitur plafon |
| `lab8-review`, `lab8-base` | PR #1 untuk Lab 8 (`lab8-review` → `lab8-base`) |
| `lab9-regresi` | Awal Lab 9: 6 commit setelah tag `lab9-baik`, satu merusak perilaku lama |
| `sesi3-part2-solution` | Hasil akhir Sesi 3: plafon, test, E2E, PR template, REVIEW.md, golden test, CI |

## Menjalankan app (branch selain `main`)

    npm install
    npm run db:migrate      # D1 lokal: skema + 3 user dummy (password demo123)
    npm run dev             # http://127.0.0.1:8787
    npm test                # Vitest
    npm run test:e2e        # Playwright (mulai Sesi 3 Part 2; sekali: npx playwright install chromium)

Login Web App: `admin@ops.test` (admin finance), `rina@ops.test` dan `budi@ops.test` (sales).

---

## Starter Lab Sesi 2, Bagian G (isi branch `main`)

### Yang sudah ada
- `package.json` (Hono, Wrangler, Vitest, MCP SDK, zod), `wrangler.jsonc` (D1 `DB`, R2 `RECEIPTS`)
- `migrations/0002_seed.sql`: 3 user dummy (password demo123) dan 3 klaim awal
- `receipts/`: 4 struk dummy, termasuk satu struk berisi perintah tersembunyi
- `.mcp.json`: konfigurasi MCP ops-finance, token diambil dari env `OPS_FINANCE_TOKEN`

### Yang kita buat bersama Claude Code
1. Rencana dengan Plan Mode
2. CLAUDE.md dan `.claude/settings.json`
3. `migrations/0001_init.sql` (cocok dengan kolom di seed), API, validasi, dan test
4. Web App admin dan sales
5. Token pribadi untuk Claude
6. `mcp/server.ts`: list_my_claims, create_claim, upload_receipt

### Perintah di branch `main`
    npm install
    npm run db:migrate   # setelah 0001_init.sql dibuat
    npm run dev          # http://127.0.0.1:8787
    npm test
