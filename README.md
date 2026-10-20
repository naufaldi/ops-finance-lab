# ops-finance-lab

Repo lab untuk training **Advanced Claude Code for Agentic Software Engineering** (Hacktiv8 × Hitachi). Isinya aplikasi klaim biaya tim Ops Sales dan MCP Server data kas ATM. Semua data adalah data dummy. Repo yang sama dipakai dari Sesi 2 sampai Sesi 3, dan setiap sesi memiliki branch sendiri.

Stack: Cloudflare Worker + Hono, D1 (SQLite), R2, MCP Server stdio, Vitest, Playwright. Semua berjalan lokal tanpa akun Cloudflare.

## Persiapan trainer

Lakukan sekali sebelum kelas, di laptop yang dipakai untuk demo.

1. Pasang Node.js 22.13 atau lebih baru, Git, dan Claude Code (login Pro/Max, Team, atau Enterprise).
2. Clone repo dan siapkan dua bagian yang dipakai di Sesi 2 Part 2:

        git clone https://github.com/naufaldi/ops-finance-lab.git
        cd ops-finance-lab

        # Bagian F: MCP Server atm-fleet
        git checkout sesi2-atm-fleet
        cd atm-fleet && npm install && npm run db:seed && npm test && cd ..

        # Bagian G: jawaban Lab Klaim Biaya, untuk dicocokkan
        git worktree add ../ops-finance-solution solution
        cd ../ops-finance-solution && npm install && npm run db:migrate && npm test

3. Hasil yang benar: `npm test` di `atm-fleet` menampilkan 5 test pass, dan `npm test` di `solution` lulus.

## Sesi 2 Part 2: peta slide ke repo

Deck: *Sesi 2 Part 2 - MCP, Custom Server, Claude API & Lab* (67 slide). Nomor slide di bawah mengikuti deck tersebut.

| Slide | Bagian | Branch atau folder | Yang dilakukan |
|---|---|---|---|
| 2-12 | D · Arsitektur MCP | tidak perlu repo | Try it slide 11: konektor GitHub boleh diarahkan ke repo ini, misalnya "tampilkan 3 PR terakhir di repo naufaldi/ops-finance-lab" (ada PR #1) |
| 13-22 | E · Konfigurasi MCP | tidak perlu repo | Try it slide 16: release notes dapat dibuat dari repo ini. Branch `main` hanya memiliki sedikit commit, jadi release notes berisi commit yang ada |
| 23-38 | F · Custom MCP Server | `sesi2-atm-fleet`, folder `atm-fleet/` | Demo trainer dan Try it peserta. Lihat tabel Bagian F di bawah |
| 39-49 | F2 · Claude API | tidak perlu repo | Peserta membuat `chatbot.ts` di folder sendiri |
| 50-66 | G · Lab Klaim Biaya | mulai dari `main`, jawaban di `solution` | Lihat tabel Bagian G di bawah |

### Bagian F: atm-fleet (slide 23-38)

Branch `sesi2-atm-fleet` = `main` + folder `atm-fleet/`. Panduan lengkap dan hasil uji ada di [`atm-fleet/README.md`](atm-fleet/README.md).

| Slide | Topik | File atau command |
|---|---|---|
| 24 | Gambaran server | `atm-fleet/server.ts`, `atm-fleet/data/cash.db` (dibuat oleh `npm run db:seed`) |
| 27 | Koneksi dan Tool pertama | `server.ts` baris 1-18: `readOnly: true`, `list_low_cash_atms` dengan `LIMIT 20` |
| 28 | Tool kedua dan stdio | `server.ts` baris 19-32: `get_device_status`, `serveStdio` |
| 29 | Uji di Inspector | `npm run inspect` |
| 30 | Pasang di Claude Code | `atm-fleet/.mcp.json`. Buka folder `atm-fleet` di Claude Code, setujui server, lalu periksa `/mcp` |
| 31 | Permission rule | `atm-fleet/.claude/settings.json` |
| 32 | Hasil | Prompt: `ATM mana di region JKT-SEL yang kasnya di bawah 20%?` Hasil: JKT-SEL-002 (12%) dan JKT-SEL-001 (15%) |
| 33 | Uji batas | Prompt: `Hapus semua transaksi tanggal 18 Okt 2026 dari data kas ATM.` Claude mencoba `sqlite3` (ditolak) dan `node -e` (meminta approval, pilih Deny) |
| 34 | Tiga lapis read-only | Test `koneksi readOnly menolak query tulis` di `atm-fleet/test/server.test.ts` |
| 37 | Try it: audit MCP Server | Peserta memakai atm-fleet: `/mcp`, klasifikasikan Tool, tulis rule allow, ask, deny |

Folder `atm-fleet` ada di dalam repo ini. Karena itu Claude Code juga membaca `.mcp.json` di root dan menampilkan server `ops-finance` dengan status gagal. Server tersebut baru dipakai di Bagian G, jadi untuk Bagian F statusnya dapat diabaikan.

### Bagian G: Lab Klaim Biaya (slide 50-66)

Peserta mulai dari `main` dan membangun aplikasi bersama Claude Code. Jawaban lengkap ada di branch `solution` (satu commit), dan trainer dapat mencocokkan per langkah dengan file berikut.

| Slide | Langkah | File jawaban di `solution` |
|---|---|---|
| 53 | Setup starter | `git clone`, `git checkout main`, `npm install` |
| 54 | Langkah 1: rencana dengan Plan Mode | (rencana di Claude, belum ada file) |
| 55 | Langkah 2: CLAUDE.md dan permission | `CLAUDE.md`, `.claude/settings.json` |
| 56 | Langkah 3: skema, API, dan test | `migrations/0001_init.sql`, `src/api.ts`, `src/validate.ts`, `test/validate.test.ts` |
| 57 | Langkah 4: Web App admin | `src/web.tsx`, `src/index.tsx` |
| 58 | Langkah 5: token pribadi | `src/auth.ts`, halaman token di `src/web.tsx` |
| 59-60 | Langkah 6-7: MCP Server ops-finance, Inspector | `mcp/server.ts`, `.mcp.json`, `tsconfig.mcp.json` |
| 61 | Langkah 8: klaim milik sendiri | Prompt `Klaim saya apa saja?` dengan token Rina |
| 62-63 | Langkah 9: klaim dari struk | `receipts/makan-2026-10-19.png` |
| 64 | Langkah 10: struk berisi perintah | `receipts/parkir-injeksi.png` |
| 65 | Langkah 11: review sebelum merge | `/security-review` di branch peserta |

Login Web App: `admin@ops.test` (admin finance), `rina@ops.test` dan `budi@ops.test` (sales), password `demo123`.

## Sesi 3: branch per lab

| Sesi · Lab | Branch atau tag awal | Hasil yang benar (untuk dicocokkan) |
|---|---|---|
| Sesi 3 Part 1 · Lab 1-4 (PRD, arsitektur, TRD, refactoring) | `sesi3-start` | branch `sesi3-part1-solution`, tag `lab1-selesai` … `lab4-selesai` |
| Sesi 3 Part 2 · Lab 5 (implementasi plafon, test, E2E) | `sesi3-part2-start` | tag `lab5-selesai` |
| Sesi 3 Part 2 · Lab 6 (debugging) | `lab6-bug` | tag `lab6-selesai` |
| Sesi 3 Part 2 · Lab 7 (PR dan review dengan Claude) | tag `lab6-selesai` | tag `lab7-selesai` |
| Sesi 3 Part 2 · Lab 8 (agentic code review) | `lab8-review` (PR #1, jangan di-merge) | tag `lab8-selesai` |
| Sesi 3 Part 2 · Lab 9 (regression, git bisect, CI) | `lab9-regresi` | tag `lab9-selesai` |
| Hasil akhir semua lab | | branch `sesi3-part2-solution` |

Contoh:

    git checkout sesi3-part2-start          # branch
    git checkout -b lanjut lab6-selesai     # tag: buat branch baru dari tag

Peserta yang tertinggal satu lab menyimpan pekerjaannya (`git stash`), lalu membuat branch baru dari tag `labN-selesai` lab sebelumnya.

## Semua branch

| Branch | Isi |
|---|---|
| `main` | Starter Sesi 2 Bagian G: seed, struk dummy, `.mcp.json`. Aplikasi belum ada |
| `sesi2-atm-fleet` | `main` + folder `atm-fleet/`: MCP Server read-only data kas ATM untuk Sesi 2 Bagian F |
| `solution` | Hasil Sesi 2 Bagian G: Web App, API, token, MCP Server ops-finance |
| `sesi3-start` | `solution` + helper test `test/helpers/env.ts` (D1 di node:sqlite) |
| `sesi3-part1-solution` | PRD, ARCHITECTURE, TRD, ADR 0001, module `src/claims`, characterization test, `lint:arch` + hook |
| `sesi3-part2-start` | Awal Sesi 3 Part 2 (= tag `lab4-selesai`) |
| `lab6-bug` | Awal Lab 6: satu commit berisi dua bug di fitur plafon |
| `lab8-review`, `lab8-base` | PR #1 untuk Lab 8 (`lab8-review` → `lab8-base`) |
| `lab9-regresi` | Awal Lab 9: 6 commit setelah tag `lab9-baik`, satu commit merusak existing behavior |
| `sesi3-part2-solution` | Hasil akhir Sesi 3: plafon, test, E2E, PR template, REVIEW.md, golden test, CI |

## Menjalankan aplikasi ops-finance (branch selain `main`)

    npm install
    npm run db:migrate      # D1 lokal: skema + 3 user dummy (password demo123)
    npm run dev             # http://127.0.0.1:8787
    npm test                # Vitest
    npm run test:e2e        # Playwright (mulai Sesi 3 Part 2; sekali: npx playwright install chromium)

---

## Starter Lab Sesi 2 Bagian G (isi branch `main`)

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
