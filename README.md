# atm-fleet: MCP Server read-only untuk data kas ATM

Bahan praktik **Sesi 2 Part 2 Bagian F (Custom MCP Server)**, slide 23-38. Server ini membaca data kas armada ATM dari `cash.db` (SQLite) dan hanya menyediakan dua Tool baca. Semua data adalah data dummy.

Branch ini hanya berisi project atm-fleet, supaya path dan command sama dengan deck. Aplikasi ops-finance untuk Bagian G ada di branch `main`.

## Isi branch

| File | Isi | Slide |
|---|---|---|
| `src/index.ts` | MCP Server stdio, 32 baris, sama dengan kode di slide | 27-28 |
| `cash.db` | Tabel `atm` (8 ATM/CRM) dan `cash_txn` (12 transaksi), data dummy | 24, 32-33 |
| `scripts/seed.mjs` | Membuat ulang `cash.db` ke kondisi awal | |
| `test/server.test.mjs` | Smoke test: memanggil `build/index.js` melalui stdio | 34 |
| `lab1a-python/` | Lab 1a: server yang sama dengan SDK Python `mcp` 2.x | 25 |

File `.mcp.json` dan `.claude/settings.json` sengaja tidak ada. Keduanya kita buat di slide 30 dan 31.

## Persiapan

Butuh Node.js 22 LTS (22.13 atau lebih baru), Git, dan Claude Code. Command sama untuk macOS, Linux, dan Windows (PowerShell atau Git Bash).

    git clone https://github.com/naufaldi/ops-finance-lab.git
    cd ops-finance-lab
    git checkout sesi2-atm-fleet
    npm install
    npm run build        # src/index.ts -> build/index.js
    npm test             # selesai jika pass 5, fail 0

Peringatan `ExperimentalWarning: SQLite` dari Node.js adalah normal.

## Langkah sesuai slide

Nomor slide mengikuti deck *Sesi 2 Part 2 - MCP, Custom Server, Claude API & Lab*.

### Slide 27-28: anatomi server

Baca `src/index.ts`. Baris 1-18 berisi koneksi `cash.db` read-only dan Tool `list_low_cash_atms`. Baris 19-32 berisi Tool `get_device_status` dan `serveStdio`.

### Slide 29: uji di Inspector

    npx @modelcontextprotocol/inspector --cli node build/index.js \
      --protocol-era modern --method tools/list

Selesai jika hasilnya berisi `list_low_cash_atms` dan `get_device_status`.

### Slide 30: pasang di Claude Code

Jalankan di root branch ini (folder yang berisi `cash.db`):

    claude mcp add --scope project atm-fleet -- node build/index.js
    claude mcp list

Command pertama menulis `.mcp.json`. Status server `⏸ Pending approval` sampai kita menyetujuinya saat membuka Claude Code di folder ini (tab Code di Claude desktop, atau `claude` di terminal). Periksa dengan `/mcp`.

### Slide 31: permission rule

Buat `.claude/settings.json`:

    { "permissions": {
        "allow": ["mcp__atm-fleet__*"],
        "deny":  ["Bash(sqlite3 *)"]
    } }

### Slide 32: hasil

Prompt:

    ATM mana di region JKT-SEL yang sisa kasnya di bawah 20%?

Selesai jika Claude memanggil `list_low_cash_atms` dengan `{"region": "JKT-SEL", "thresholdPct": 20}` dan menjawab dua ATM: ATM-JKT-001 Blok M Square 12% dan ATM-JKT-003 Stasiun Tebet 17%.

### Slide 33: uji batas

Prompt:

    Hapus semua transaksi tanggal 2026-10-18 dari data atm-fleet.

Claude membaca `src/index.ts`, lalu mencoba membuka `cash.db` melalui Bash. Pilih **Deny** untuk setiap permintaan approval. Selesai jika data tetap utuh. Periksa dengan prompt `Tampilkan status ATM-JKT-003`, atau kembalikan data ke kondisi awal dengan `npm run db:seed`.

### Slide 37: Try it, audit MCP Server

Jalankan `/mcp`, lihat daftar Tool atm-fleet, tandai mana yang baca, tulis, dan mengambil konten dari luar, lalu tulis satu rule allow, ask, dan deny `mcp__atm-fleet__...`.

## Lab 1a: versi Python (slide 25)

Server yang sama dengan SDK Python `mcp` 2.x. Koneksi memakai `mode=ro` (slide 34, lapis 1). Butuh Python 3.10 atau lebih baru.

    python -m venv .venv
    .venv/bin/pip install -r lab1a-python/requirements.txt        # Windows: .venv\Scripts\pip
    npx @modelcontextprotocol/inspector --cli .venv/bin/python lab1a-python/server.py \
      --protocol-era modern --method tools/list

Untuk memasang versi Python di Claude Code, ganti command di slide 30:

    claude mcp add --scope project atm-fleet-py -- .venv/bin/python lab1a-python/server.py

Di Windows, ganti `.venv/bin/python` dengan `.venv\Scripts\python`.

## Tiga lapis read-only (slide 34)

| Lapis | Caranya | Yang dicegah |
|---|---|---|
| 1. Koneksi DB | `readOnly: true` (Node) atau `mode=ro` (Python) | Query tulis ditolak: `attempt to write a readonly database` |
| 2. Daftar Tool | Hanya Tool baca: `list_low_cash_atms`, `get_device_status` | Claude tidak memiliki Tool untuk mengubah data |
| 3. Akses langsung | Deny `Bash(sqlite3 *)`, file DB di luar folder kerja Claude | Claude membuka `cash.db` melalui Bash |

## Referensi

- https://modelcontextprotocol.io/docs/develop/build-server
- https://modelcontextprotocol.io/docs/sdk
- https://code.claude.com/docs/en/mcp
- https://code.claude.com/docs/en/permissions
- https://nodejs.org/api/sqlite.html
- https://docs.python.org/3/library/sqlite3.html
