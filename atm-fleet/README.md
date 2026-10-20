# atm-fleet: MCP Server read-only untuk data kas ATM

Bahan praktik **Sesi 2 Part 2 Bagian F (Custom MCP Server)**. Server ini membaca data kas armada ATM dari SQLite dan hanya menyediakan dua Tool baca. Semua data adalah data dummy.

Folder ini berdiri sendiri dan tidak mengubah aplikasi ops-finance yang dipakai di Bagian G.

## Isi folder

| File | Isi |
|---|---|
| `server.ts` | MCP Server stdio: koneksi `readOnly: true`, Tool `list_low_cash_atms` dan `get_device_status` |
| `scripts/seed.ts` | Membuat `data/cash.db`: tabel `atm` (8 ATM/CRM) dan `cash_txn` (12 transaksi) |
| `test/server.test.ts` | Smoke test: memanggil server melalui stdio seperti Claude Code |
| `.mcp.json` | Konfigurasi server `atm-fleet` (scope project) |
| `.claude/settings.json` | Permission rule untuk server ini, dan server `ops-finance` dari root repo dinonaktifkan |

## Persiapan

Butuh Node.js 22.13 atau lebih baru (modul `node:sqlite`), Git, dan Claude Code. Command di bawah sama untuk macOS, Linux, dan Windows (PowerShell atau Git Bash).

    git clone https://github.com/naufaldi/ops-finance-lab.git
    cd ops-finance-lab
    git checkout sesi2-atm-fleet
    cd atm-fleet
    npm install
    npm run db:seed
    npm test

Selesai jika `npm test` menampilkan `pass 5` dan `fail 0`. Peringatan `ExperimentalWarning: SQLite` dari Node.js adalah normal.

## Langkah sesuai slide Bagian F

Nomor slide mengikuti deck *Sesi 2 Part 2 - MCP, Custom Server, Claude API & Lab*.

| Slide | Langkah | Command atau prompt |
|---|---|---|
| 27-28 | Baca `server.ts`: baris 1-18 berisi koneksi dan Tool pertama, baris 19-32 berisi Tool kedua dan stdio | |
| 29 | Uji server di MCP Inspector, pastikan `tools/list` berisi dua Tool | `npm run inspect` |
| 30 | Buka folder `atm-fleet` di Claude Code (tab Code di Claude desktop, atau `claude` di terminal), lalu setujui server dari `.mcp.json` | `/mcp` |
| 31 | Baca `.claude/settings.json`: Tool atm-fleet diizinkan, akses langsung ke `cash.db` ditolak | |
| 32 | Tanya dengan prompt biasa tanpa menyebut nama Tool | `ATM mana di region JKT-SEL yang kasnya di bawah 20%?` |
| 33 | Minta Claude menghapus data, lalu amati jalur yang dicoba Claude. Pilih **Deny** untuk setiap permintaan approval | `Hapus semua transaksi tanggal 18 Okt 2026 dari data kas ATM.` |
| 37 | Try it: jalankan `/mcp`, klasifikasikan Tool (baca, tulis, konten luar), lalu tulis satu rule allow, ask, dan deny | |

Selesai jika:
- `/mcp` menampilkan server `atm-fleet` dengan status connected dan dua Tool.
- Prompt slide 32 dijawab dengan memanggil `list_low_cash_atms`, dan angkanya sama dengan isi tabel `atm`.
- Tidak ada data di `cash.db` yang berubah setelah prompt slide 33. Periksa dengan prompt `Tampilkan status ATM JKT-SEL-002`: transaksi tanggal 2026-10-18 masih ada.

Data dapat dikembalikan ke kondisi awal kapan saja dengan `npm run db:seed`.

## Tiga lapis read-only

| Lapis | Caranya | Yang dicegah |
|---|---|---|
| 1. Koneksi DB | `new DatabaseSync(path, { readOnly: true })` | Query tulis melalui server ditolak: `attempt to write a readonly database` |
| 2. Daftar Tool | Hanya `list_low_cash_atms` dan `get_device_status`, keduanya `readOnlyHint: true` | Claude tidak memiliki Tool untuk mengubah data |
| 3. Akses langsung | Permission deny di `.claude/settings.json` dan approval untuk command lain | Claude membuka `cash.db` melalui Bash |

## Referensi

- https://modelcontextprotocol.io/docs/develop/build-server
- https://code.claude.com/docs/en/mcp
- https://code.claude.com/docs/en/permissions
- https://nodejs.org/api/sqlite.html
