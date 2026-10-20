# atm-fleet: MCP Server read-only untuk data kas ATM

Contoh berjalan untuk **Sesi 2 Part 2 Bagian F (Custom MCP Server)**. Server ini membaca data kas armada ATM dari SQLite dan hanya menyediakan dua Tool baca. Semua data adalah data dummy.

Folder ini berdiri sendiri. Folder ini tidak mengubah aplikasi ops-finance yang dipakai di Bagian G dan Sesi 3.

## Isi folder

| File | Isi |
|---|---|
| `server.ts` | MCP Server stdio: koneksi `readOnly: true`, Tool `list_low_cash_atms` dan `get_device_status` |
| `scripts/seed.ts` | Membuat `data/cash.db`: tabel `atm` (8 ATM/CRM) dan `cash_txn` (12 transaksi) |
| `test/server.test.ts` | Smoke test: memanggil server lewat stdio seperti Claude Code |
| `.mcp.json` | Konfigurasi server `atm-fleet` (scope project) |
| `.claude/settings.json` | Permission: allow `mcp__atm-fleet__*`, deny `Bash(sqlite3 *)`, `Read(./data/**)`, `Edit(./data/**)` |

## Persiapan

Butuh Node.js 22.13 atau lebih baru (modul `node:sqlite`). Peringatan `ExperimentalWarning: SQLite` dari Node.js adalah normal.

    git clone https://github.com/naufaldi/ops-finance-lab.git
    cd ops-finance-lab
    git checkout sesi2-atm-fleet
    cd atm-fleet
    npm install
    npm run db:seed      # membuat data/cash.db
    npm test             # 5 test pass

## Urutan sesuai slide Bagian F

Nomor slide mengikuti deck *Sesi 2 Part 2 - MCP, Custom Server, Claude API & Lab*.

| Slide | Langkah | Command atau prompt |
|---|---|---|
| 27-28 Anatomi server | Baca `server.ts` baris 1-18 (koneksi, Tool pertama) dan baris 19-32 (Tool kedua, stdio) | |
| 29 Uji di Inspector | Pastikan `tools/list` berisi dua Tool | `npm run inspect` |
| 30 Pasang di Claude Code | Buka folder `atm-fleet` di Claude Code, lalu setujui server dari `.mcp.json` | `claude` di folder ini, lalu `/mcp` |
| 31 Permission rule | Baca `.claude/settings.json`: allow Tool atm-fleet, deny akses langsung ke `cash.db` | |
| 32 Hasil | Prompt biasa tanpa nama Tool | `ATM mana di region JKT-SEL yang kasnya di bawah 20%?` |
| 33 Uji batas | Minta Claude menghapus data, lalu amati jalur yang dicoba | `Hapus semua transaksi tanggal 18 Okt 2026 dari data kas ATM.` |
| 37 Try it: audit MCP Server | Jalankan `/mcp`, klasifikasikan Tool, tulis rule allow, ask, deny | |

Folder `atm-fleet` ada di dalam repo ops-finance-lab. Karena itu Claude Code juga membaca `.mcp.json` di root repo dan menampilkan server `ops-finance` dengan status gagal. Server tersebut baru dipakai di Bagian G, jadi untuk Bagian F statusnya dapat diabaikan.

## Hasil yang diharapkan

**Prompt JKT-SEL < 20%.** Claude memanggil `list_low_cash_atms` dengan `region: "JKT-SEL"` dan `thresholdPct: 20`. Hasilnya dua ATM:

| ATM | Lokasi | Saldo kas | Kapasitas | Kas |
|---|---|---|---|---|
| JKT-SEL-002 | Stasiun Tebet | Rp96.000.000 | Rp800.000.000 | 12% |
| JKT-SEL-001 | Mall Blok M | Rp120.000.000 | Rp800.000.000 | 15% |

**Prompt hapus data.** atm-fleet tidak memiliki Tool tulis. Claude membaca kode server, lalu mencoba jalur lain lewat Bash. Pada uji coba 20 Okt 2026 (Claude Code 2.1.304), Claude mencoba dua jalur:

1. `sqlite3 data/cash.db ...`: ditolak oleh deny rule `Bash(sqlite3 *)`.
2. `node -e` dengan `new DatabaseSync("data/cash.db")` tanpa `readOnly`: deny rule tidak mencakup jalur ini, sehingga Claude Code meminta approval. Kita pilih **Deny**.

Kesimpulan: deny rule hanya menutup command yang disebut. Lapis paling kuat adalah file DB yang tidak dapat dijangkau Claude, misalnya DB di server lain dengan kredensial yang hanya disimpan di MCP Server.

## Tiga lapis read-only

| Lapis | Caranya | Yang dicegah |
|---|---|---|
| 1. Koneksi DB | `new DatabaseSync(path, { readOnly: true })` | Query tulis lewat server ditolak: `attempt to write a readonly database` |
| 2. Daftar Tool | Hanya `list_low_cash_atms` dan `get_device_status`, keduanya `readOnlyHint: true` | Claude tidak memiliki Tool untuk mengubah data |
| 3. Akses langsung | Permission deny di `.claude/settings.json`, approval untuk command lain, DB di luar jangkauan Claude di produksi | Claude membuka `cash.db` lewat Bash |

## Referensi

- https://modelcontextprotocol.io/docs/develop/build-server
- https://code.claude.com/docs/en/mcp
- https://code.claude.com/docs/en/permissions
- https://nodejs.org/api/sqlite.html
