# ops-finance-lab

Repo lab untuk training **Advanced Claude Code for Agentic Software Engineering** (Hacktiv8 × Hitachi). Isinya aplikasi klaim biaya tim Ops Sales dan MCP Server data kas ATM. Semua data adalah data dummy. Repo yang sama dipakai dari Sesi 2 sampai Sesi 3, dan setiap sesi memiliki branch sendiri.

Stack: Cloudflare Worker + Hono, D1 (SQLite), R2, MCP Server stdio, Vitest, Playwright. Semua berjalan lokal tanpa akun Cloudflare.

Trainer: panduan persiapan, peta slide ke file jawaban, dan hasil uji ada di [TRAINER.md](TRAINER.md).

## Persiapan

1. Pasang Node.js 22.13 atau lebih baru, Git, dan Claude Code (Claude desktop tab Code atau CLI).
2. Clone repo:

        git clone https://github.com/naufaldi/ops-finance-lab.git
        cd ops-finance-lab

Command di README ini sama untuk macOS, Linux, dan Windows (PowerShell atau Git Bash).

## Sesi 2 Part 2: MCP, Custom Server, Claude API & Lab

Nomor slide mengikuti deck *Sesi 2 Part 2 - MCP, Custom Server, Claude API & Lab*.

| Slide | Bagian | Branch dan folder | Yang dikerjakan |
|---|---|---|---|
| 2-22 | D Arsitektur MCP, E Konfigurasi MCP | tidak perlu repo ini | Try it memakai konektor GitHub dan Google Drive di akun masing-masing |
| 23-38 | F Custom MCP Server | branch `sesi2-atm-fleet` | Menjalankan MCP Server atm-fleet, memasangnya di Claude Code, dan menguji batas read-only |
| 39-49 | F2 Claude API | tidak perlu repo ini | Membuat `chatbot.ts` di folder sendiri |
| 50-66 | G Lab Klaim Biaya | branch `main` | Membangun aplikasi ops-finance bersama Claude Code, langkah 1-11 |

### Bagian F: atm-fleet (slide 23-38)

Branch `sesi2-atm-fleet` hanya berisi project atm-fleet. Path dan command sama dengan slide: `src/index.ts`, `build/index.js`, dan `cash.db` di root.

    git checkout sesi2-atm-fleet
    npm install
    npm run build          # src/index.ts -> build/index.js
    npm test               # selesai jika pass 5, fail 0

Lalu ikuti slide 29-33 dari root branch ini. Langkah per slide, kriteria selesai, dan Lab 1a (versi Python) ada di [README branch sesi2-atm-fleet](https://github.com/naufaldi/ops-finance-lab/blob/sesi2-atm-fleet/README.md).

Kembali ke Bagian G dengan `git checkout main`. Folder `build/` dan file `package-lock.json` dari atm-fleet akan muncul di `git status` sebagai file yang tidak di-track. Keduanya dapat diabaikan.

### Bagian G: Lab Klaim Biaya (slide 50-66)

    git checkout main
    npm install

Branch `main` berisi starter: konfigurasi, data seed, struk dummy, dan `.mcp.json`. Aplikasinya kita bangun bersama Claude Code mengikuti langkah di slide.

| Slide | Langkah |
|---|---|
| 54 | Langkah 1: rencana dengan Plan Mode |
| 55 | Langkah 2: CLAUDE.md dan permission |
| 56 | Langkah 3: skema, API, dan test |
| 57 | Langkah 4: Web App untuk admin |
| 58 | Langkah 5: token pribadi untuk Claude |
| 59 | Langkah 6: MCP Server ops-finance |
| 60 | Langkah 7: uji di Inspector lalu pasang |
| 61 | Langkah 8: tanya klaim milik sendiri |
| 62-63 | Langkah 9: ajukan klaim dari struk |
| 64 | Langkah 10: struk berisi perintah |
| 65 | Langkah 11: review sebelum merge |

Login Web App: `admin@ops.test` (admin finance), `rina@ops.test` dan `budi@ops.test` (sales), password `demo123`.

Peserta yang tertinggal dapat mencocokkan hasilnya dengan branch `solution`, atau melanjutkan dari branch tersebut. Opsi `-u` ikut menyimpan file baru, termasuk `package-lock.json` dari `npm install`:

    git stash -u
    git checkout -b lanjut-bagian-g solution
    npm install

## Sesi 3: branch per lab

| Sesi · Lab | Branch atau tag awal | Hasil yang benar (untuk dicocokkan) |
|---|---|---|
| Sesi 3 Part 1 · Lab 1 (PRD dan analisis arsitektur) | `sesi3-start` | tag `lab1-selesai` (`docs/PRD.md`, `docs/ARCHITECTURE.md`) |
| Sesi 3 Part 1 · Lab 2 (TRD, ADR, refactoring module claims) | tag `lab1-selesai` | tag `lab2-selesai` = branch `sesi3-part1-solution` |
| Sesi 3 Part 1 · contoh hasil Claude Code asli untuk Lab 1-2 | `sesi3-start` | branch `sesi3-part1-claude-run` (diuji 21 Okt 2026) |
| Sesi 3 Part 2 · Lab 5 langkah 1-3 (implementasi plafon, test, E2E) | `sesi3-part2-start` | branch `lab5-bug` (commit sebelum commit bug) |
| Sesi 3 Part 2 · Lab 5 langkah 4 (debugging) | `lab5-bug` | tag `lab5-selesai` |
| Sesi 3 Part 2 · Lab 6 langkah 1 (PR dengan Claude) | tag `lab5-selesai` | branch `lab6-review-base` |
| Sesi 3 Part 2 · Lab 6 langkah 2 (review PR #2) | `lab6-review` (PR #2, jangan di-merge) | tag `lab6-baik` (aturan review) |
| Sesi 3 Part 2 · Lab 6 langkah 3-5 (regression, git bisect, CI) | `lab6-regresi` | tag `lab6-selesai` |
| Hasil akhir Sesi 3 | | branch `sesi3-part2-solution` |

Contoh:

    git checkout sesi3-part2-start          # branch
    git checkout -b lanjut lab5-selesai     # tag: buat branch baru dari tag

Peserta yang tertinggal menyimpan pekerjaannya (`git stash -u`), lalu membuat branch baru dari branch atau tag awal langkah berikutnya.

## Semua branch

| Branch | Isi |
|---|---|
| `main` | Starter Sesi 2 Bagian G: seed, struk dummy, `.mcp.json`. Aplikasi belum ada |
| `sesi2-atm-fleet` | Project atm-fleet untuk Sesi 2 Bagian F: MCP Server read-only data kas ATM, `cash.db`, Lab 1a Python |
| `solution` | Hasil Sesi 2 Bagian G: Web App, API, token, MCP Server ops-finance |
| `sesi3-start` | `solution` + helper test `test/helpers/env.ts` (D1 di node:sqlite) |
| `sesi3-part1-solution` | PRD, ARCHITECTURE, TRD, ADR 0001, module `src/claims`, characterization test, `lint:arch` + hook |
| `sesi3-part1-claude-run` | Hasil Lab 1-2 yang dikerjakan Claude Code 2.1.305 dari prompt template di slide (bukan jawaban resmi; struktur module berbeda dari solusi, test tetap pass) |
| `sesi3-part2-start` | Awal Lab 5 (= tag `lab2-selesai` + `.claude/launch.json`; tag lama `lab4-selesai` menunjuk commit yang sama) |
| `lab5-bug` | Awal Lab 5 langkah 4: satu commit berisi dua bug di fitur plafon |
| `lab6-review`, `lab6-review-base` | PR #2 untuk Lab 6 langkah 2 (`lab6-review` → `lab6-review-base`) |
| `lab6-regresi` | Awal Lab 6 langkah 3: 6 commit setelah tag `lab6-baik`, satu commit merusak existing behavior |
| `sesi3-part2-solution` | Hasil akhir Sesi 3 (= tag `lab6-selesai`): plafon, test, E2E, PR template, REVIEW.md, golden test, CI |

## Menjalankan aplikasi ops-finance (branch selain `main` dan `sesi2-atm-fleet`)

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
