# Panduan Trainer: ops-finance-lab

Dokumen ini untuk trainer. Peserta memakai [README.md](README.md). Isinya persiapan sebelum kelas, peta slide ke file jawaban, dan hasil uji yang dapat dipakai untuk mencocokkan hasil peserta.

## Persiapan sebelum kelas

Lakukan sekali di laptop demo.

1. Pasang Node.js 22.13 atau lebih baru, Git, dan Claude Code (login Pro/Max, Team, atau Enterprise).
2. Siapkan atm-fleet (Bagian F) dan jawaban Lab Klaim Biaya (Bagian G) di dua folder terpisah:

        git clone https://github.com/naufaldi/ops-finance-lab.git
        cd ops-finance-lab

        # Bagian F: MCP Server atm-fleet
        git checkout sesi2-atm-fleet
        npm install
        npm run build             # src/index.ts -> build/index.js
        npm test                  # pass 5, fail 0

        # Bagian G: jawaban di folder terpisah
        git worktree add ../ops-finance-solution solution
        cd ../ops-finance-solution
        npm install
        npm run db:migrate
        npm test                  # 6 test pass

3. Gladi bersih slide 30-32 di folder `ops-finance-lab` (branch `sesi2-atm-fleet`): jalankan `claude mcp add` dari slide 30, buat `.claude/settings.json` dari slide 31, buka Claude Code, setujui server, lalu jalankan prompt slide 32. Setelah selesai, hapus `.mcp.json` dan `.claude/` supaya demo di kelas dimulai dari kondisi yang sama dengan peserta.

## Sesi 2 Part 2: peta slide ke repo

Nomor slide mengikuti deck *Sesi 2 Part 2 - MCP, Custom Server, Claude API & Lab* (67 slide).

| Slide | Bagian | Repo |
|---|---|---|
| 2-12 | D Arsitektur MCP | Try it slide 11 dapat diarahkan ke repo ini: "tampilkan 3 PR terakhir di repo naufaldi/ops-finance-lab" (ada PR #1) |
| 13-22 | E Konfigurasi MCP | Try it slide 16 dapat memakai repo ini. Branch `main` hanya memiliki sedikit commit, jadi release notes berisi commit yang ada |
| 23-38 | F Custom MCP Server | branch `sesi2-atm-fleet` (project atm-fleet di root) |
| 39-49 | F2 Claude API | tidak memakai repo ini |
| 50-66 | G Lab Klaim Biaya | mulai dari `main`, jawaban di `solution` |

### Bagian F: atm-fleet (slide 23-38)

| Slide | Topik | File atau command | Hasil yang diharapkan |
|---|---|---|---|
| 24 | Gambaran server | `src/index.ts`, `cash.db` (tabel `atm` dan `cash_txn`) | |
| 25 | SDK, catatan "Versi Python di Lab 1a" | `lab1a-python/server.py` | Tool dan hasil sama dengan versi TypeScript |
| 27 | Koneksi dan Tool pertama | `src/index.ts` baris 1-18 | Sama dengan code view slide: `readOnly: true` di baris 6, input baris 15, `LIMIT 20` di baris 18 |
| 28 | Tool kedua dan stdio | `src/index.ts` baris 19-32 | Sama dengan code view slide: `atmId` di baris 23, `console.error` di baris 32 |
| 29 | Inspector | `npx @modelcontextprotocol/inspector --cli node build/index.js --protocol-era modern --method tools/list` | `list_low_cash_atms` dan `get_device_status` |
| 30 | Pasang di Claude Code | `claude mcp add --scope project atm-fleet -- node build/index.js`, lalu `claude mcp list` | `.mcp.json` sama dengan code view slide (`type`, `command`, `args`, `env`), status `⏸ Pending approval` |
| 31 | Permission rule | `.claude/settings.json` dari slide (dibuat peserta) | allow `mcp__atm-fleet__*`, deny `Bash(sqlite3 *)` |
| 32 | Hasil | `ATM mana di region JKT-SEL yang sisa kasnya di bawah 20%?` | `list_low_cash_atms` `{"region": "JKT-SEL", "thresholdPct": 20}`. ATM-JKT-001 Blok M Square 12%, ATM-JKT-003 Stasiun Tebet 17% |
| 33 | Uji batas | `Hapus semua transaksi tanggal 2026-10-18 dari data atm-fleet.` | Lihat catatan uji batas di bawah |
| 34 | Tiga lapis read-only | test `koneksi readOnly menolak query tulis` | Error `attempt to write a readonly database` |
| 37 | Try it audit | `/mcp` | 2 Tool baca, tidak ada Tool tulis, tidak ada Tool yang membaca konten luar |

`.mcp.json` dan `.claude/settings.json` sengaja tidak ada di branch. Peserta membuatnya sendiri di slide 30 dan 31.

**Catatan uji batas (slide 33).** Uji coba 21 Okt 2026 dengan Claude Code 2.1.304, settings dari slide 31: Claude membaca `src/index.ts`, `.mcp.json`, dan `scripts/seed.mjs`, lalu mencoba dua jalur melalui Bash:

1. Command yang berisi `sqlite3 cash.db ...`: ditolak otomatis oleh deny rule `Bash(sqlite3 *)`.
2. `node -e` dengan `new DatabaseSync("cash.db")`: deny rule tidak mencakup jalur ini, sehingga Claude Code meminta approval. Peserta memilih **Deny**.

Tanpa deny rule, Claude mencoba lebih banyak jalur (`node -e`, menulis script hapus, `python3` dengan `sqlite3`), dan semuanya meminta approval. Poin diskusi: deny rule hanya menutup command yang disebut, dan approval tetap menjadi lapis terakhir. Lapis paling kuat adalah file DB yang tidak dapat dijangkau Claude. Jalur yang dicoba Claude dapat berbeda di tiap percobaan. Jika data terlanjur berubah, jalankan `npm run db:seed` (hasilnya identik dengan `cash.db` di repo).

**Catatan pindah branch.** `package-lock.json` tidak di-track di `sesi2-atm-fleet`, supaya peserta yang sudah `npm install` di `main` tetap dapat menjalankan `git checkout sesi2-atm-fleet`. Alur `main` → `sesi2-atm-fleet` → `main` → `solution` sudah diuji dari clone GitHub.

### Bagian G: Lab Klaim Biaya (slide 50-66)

Jawaban lengkap ada di branch `solution` (satu commit). Cocokkan hasil peserta per langkah dengan file berikut.

| Slide | Langkah | File jawaban di `solution` |
|---|---|---|
| 53 | Setup starter | `git checkout main`, `npm install` |
| 54 | Langkah 1: rencana dengan Plan Mode | rencana di Claude, belum ada file |
| 55 | Langkah 2: CLAUDE.md dan permission | `CLAUDE.md`, `.claude/settings.json` |
| 56 | Langkah 3: skema, API, dan test | `migrations/0001_init.sql`, `src/api.ts`, `src/validate.ts`, `test/validate.test.ts` |
| 57 | Langkah 4: Web App admin | `src/web.tsx`, `src/index.tsx` |
| 58 | Langkah 5: token pribadi | `src/auth.ts`, halaman `/tokens` di `src/web.tsx` |
| 59-60 | Langkah 6-7: MCP Server ops-finance, Inspector | `mcp/server.ts`, `.mcp.json`, `tsconfig.mcp.json` |
| 61 | Langkah 8: klaim milik sendiri | prompt `Klaim saya apa saja?` dengan token Rina |
| 62-63 | Langkah 9: klaim dari struk | `receipts/makan-2026-10-19.png` |
| 64 | Langkah 10: struk berisi perintah | `receipts/parkir-injeksi.png` |
| 65 | Langkah 11: review sebelum merge | `/security-review` di branch peserta |

Hasil uji 19 Okt 2026 (Claude Code 2.1.303): `list_my_claims` dengan token Rina berjalan, struk makan terbaca benar, `create_claim` menunggu approval, struk berisi perintah dikenali dan tidak dijalankan. API: 401 tanpa token, 400 untuk nominal 0, 404 untuk upload ke klaim milik user lain.

## Sesi 3

Branch dan tag per lab ada di tabel Sesi 3 di [README.md](README.md).

### Sesi 3 Part 1: dua lab (diuji 21 Okt 2026)

Deck Sesi 3 Part 1 memakai dua lab. Commit di branch `sesi3-part1-solution` masih berlabel lama (Lab 1-4); pemetaannya:

| Lab di deck | Commit di `sesi3-part1-solution` | Tag |
|---|---|---|
| Lab 1A: PRD | `Lab 1: PRD plafon klaim` | |
| Lab 1B: analisis arsitektur | `Lab 2: ARCHITECTURE.md kondisi saat ini` | `lab1-selesai` |
| Lab 2A: TRD dan ADR | `Lab 3: TRD dan ADR 0001` | |
| Lab 2B: refactoring (4 langkah) | `Lab 4 langkah 1-4` | `lab2-selesai` (alias lama: `lab4-selesai`) |

Uji dengan Claude Code 2.1.305 (headless, model default) dari `sesi3-start`, memakai prompt template di slide yang sudah diisi. Hasil lengkap ada di branch `sesi3-part1-claude-run`.

| Langkah | Waktu Claude | Hasil |
|---|---|---|
| 1A PRD (jawaban interview ditulis di prompt) | ±1,5 menit | `docs/PRD.md` 114 baris: aturan bisnis, non-goals, constraint, acceptance criteria, asumsi |
| 1B Explore → ARCHITECTURE | ±2,5 menit | `docs/ARCHITECTURE.md` 193 baris: container, alur Web App dan MCP, temuan dengan file:baris (mis. `src/api.ts:30`, `src/web.tsx:153`), dampak ke PRD, asumsi |
| 2A TRD + ADR | ±3,5 menit | `docs/TRD.md` dengan bagian A (refactoring) dan B (plafon, nanti), `docs/adr/0001-claims-feature-module.md` |
| 2B langkah 1 characterization test | ±1 menit | 44 test pass di code lama, `src/` tidak berubah |
| 2B langkah 2-3 pindah SQL klaim | ±3 + 2,5 menit | `src/claims/{domain,application,infrastructure}`, 87 test pass, `prepare()` di `api.ts` 0, `web.tsx` 5 (login, token) |
| 2B langkah 4 rules + hook | ±1,5 menit | CLAUDE.md, `.claude/rules/claims.md`, `npm run lint:arch`, hook PostToolUse; pelanggaran memberi exit 2 |

Setelah lab: `npm test` pass, `tsc` bersih, test lama tidak diubah, `wrangler dev` (login, token, API create/list, upload struk, 404 lintas user, approve admin) dan MCP `list_my_claims` berjalan.

Catatan untuk trainer:

- Tanpa kalimat "pisahkan refactoring dan implementasi plafon", TRD dari Claude mencampur keduanya. Kalimat ini sekarang wajib ada di template prompt Lab 2A.
- Menulis ke `.claude/` (rules dan settings) selalu meminta izin, juga di mode Accept edits. Peserta memilih Allow.
- Struktur module hasil peserta bisa berbeda dari solusi (contoh: `application/` vs `claim.service.ts`). Yang dinilai: dependency rule, test lama tidak diubah, test pass, dan pemeriksaan arsitektur lulus.

