# PRD: Plafon klaim per kategori per bulan

Status: draft, jawaban interview dari Finance sudah masuk. Data dummy, untuk lab.

## Latar belakang

Saat ini `validateClaim` (`src/validate.ts`) hanya membatasi nominal per klaim (> 0 dan ≤ Rp50.000.000). Belum ada batas total per kategori. Finance meminta plafon bulanan per sales per kategori supaya pengeluaran yang wajar tidak perlu dicek satu per satu.

## Aturan bisnis (keputusan Finance)

| Kategori | Plafon per sales per bulan |
|---|---|
| `transport` | Rp1.500.000 |
| `makan_klien` | Rp2.000.000 |
| `hotel` | Rp3.000.000 |
| `lainnya` | Rp500.000 |

1. **Bulan** dihitung dari `claim_date` (`YYYY-MM`), bukan dari `created_at`. Tidak ada konversi zona waktu, string tanggal dipakai apa adanya.
2. **Status yang dihitung**: `submitted` dan `approved`. `rejected` tidak dihitung.
3. **Batas**: klaim yang membuat total tepat sama dengan plafon diterima. Ditolak hanya jika total **melebihi** plafon.
4. **Pemakaian** = jumlah `amount` klaim milik sales yang sama, kategori yang sama, bulan `claim_date` yang sama, dengan status yang dihitung.
5. **Edit oleh admin**: plafon dicek ulang, dan nilai lama klaim yang sedang diedit **tidak dihitung** (klaim itu dikeluarkan dari pemakaian). Pengecekan memakai pemilik klaim (`claims.user_id`), bukan admin yang mengedit. Berlaku di Web App dan di API/MCP.
6. **Mengubah plafon** hanya lewat migration, bukan UI dan bukan API.

## Goals

- Klaim baru dan hasil edit yang membuat pemakaian melebihi plafon ditolak dengan pesan yang jelas.
- Aturan ada di satu tempat (lapisan API/validasi), dipakai oleh Web App dan API/MCP, sesuai pola `validateClaim`.

## Non-goals

- Tidak ada UI atau endpoint untuk mengubah plafon.
- Tidak ada plafon berbeda per sales, per jabatan, atau per tahun. Satu angka per kategori untuk semua sales.
- Tidak ada approval pengecualian atau override plafon oleh admin.
- Tidak mengubah klaim yang sudah ada. Data lama yang sudah melewati plafon tidak diubah dan tidak membuat migration gagal.
- Tidak ada Tool MCP approve atau edit baru. Aturan di CLAUDE.md tetap: approve dan tolak hanya lewat Web App oleh admin.
- Tidak ada notifikasi (email atau chat) saat mendekati plafon.
- Tidak mengubah batas Rp50.000.000 per klaim yang sudah ada.

## Constraint

- SQL selalu `prepare(...).bind(...)`, tanpa menggabung string (CLAUDE.md).
- Nominal rupiah bilangan bulat (`INTEGER`), tanpa desimal.
- Plafon disimpan di tabel D1 (mis. `category_limits`), diisi dan diubah lewat file di `migrations/` (`0003_category_limits.sql`), dijalankan dengan `npm run db:migrate`.
- Pengecekan dan penyimpanan harus atomik. Worker tidak punya transaksi multi-statement yang aman untuk pola cek-lalu-tulis, jadi `INSERT` dan `UPDATE` memakai satu statement bersyarat (`INSERT ... SELECT ... WHERE pemakaian + amount <= plafon`) supaya dua request bersamaan tidak sama-sama lolos.
- Aturan akses tidak berubah: sales hanya membuat klaim miliknya, edit hanya admin.
- `npm test` (Vitest) harus hijau sebelum commit.
- Tidak ada perubahan skema tabel `claims`.

## Acceptance criteria

Semua contoh memakai sales Rina, bulan Oktober 2026 (`2026-10`), kecuali disebut lain. Setiap butir bisa dicek pass/fail, idealnya sebagai test Vitest.

### Dasar

- [ ] **AC-1** Setelah `npm run db:migrate`, tabel plafon berisi tepat 4 baris: transport 1500000, makan_klien 2000000, hotel 3000000, lainnya 500000.
- [ ] **AC-2** Sales tanpa klaim `transport` di 2026-10 mengajukan klaim transport Rp1.500.000 lewat `POST /api/claims`: HTTP 201.
- [ ] **AC-3** Sales mengajukan transport Rp1.500.001 (bulan kosong): ditolak, tidak ada baris baru di `claims`.

### Batas dan akumulasi

- [ ] **AC-4** Sudah ada transport Rp1.000.000 (`submitted`). Klaim baru Rp500.000: diterima (total = plafon).
- [ ] **AC-5** Sudah ada transport Rp1.000.000. Klaim baru Rp500.001: ditolak.
- [ ] **AC-6** Sudah ada transport Rp1.500.000 (`approved`). Klaim baru Rp1: ditolak.
- [ ] **AC-7** Sudah ada transport Rp1.500.000 berstatus `rejected`. Klaim baru Rp1.500.000: diterima.
- [ ] **AC-8** Ada `rejected` Rp1.000.000 dan `submitted` Rp500.000. Klaim baru Rp1.000.000: diterima.

### Pemisahan per kategori, bulan, dan sales

- [ ] **AC-9** Transport sudah penuh (Rp1.500.000). Klaim `hotel` Rp3.000.000 di bulan yang sama: diterima.
- [ ] **AC-10** Transport 2026-10 sudah penuh. Klaim transport dengan `claim_date` 2026-11-01: diterima.
- [ ] **AC-11** `claim_date` 2026-10-31 dan 2026-11-01 dihitung di bulan berbeda. `created_at` tidak berpengaruh: klaim dibuat 2026-11-02 dengan `claim_date` 2026-10-15 dihitung di Oktober.
- [ ] **AC-12** Transport Rina sudah penuh. Budi mengajukan transport Rp1.500.000 di bulan yang sama: diterima.
- [ ] **AC-13** Klaim `lainnya` Rp500.001: ditolak. Klaim `lainnya` Rp500.000: diterima.

### Edit oleh admin

- [ ] **AC-14** Klaim transport Rina Rp1.000.000 (satu-satunya di bulan itu). Admin mengubah nominal menjadi Rp1.500.000: diterima (nilai lama tidak dihitung dua kali).
- [ ] **AC-15** Klaim yang sama, admin mengubah menjadi Rp1.500.001: ditolak, `amount` di database tetap Rp1.000.000.
- [ ] **AC-16** Rina punya transport A Rp1.000.000 dan B Rp400.000. Admin mengubah B menjadi Rp500.000: diterima. Mengubah B menjadi Rp500.001: ditolak.
- [ ] **AC-17** Admin mengubah kategori klaim dari `lainnya` ke `transport`: pemakaian dicek di kategori **tujuan** untuk sales dan bulan yang sama.
- [ ] **AC-18** Admin mengubah `claim_date` klaim ke bulan lain: dicek terhadap pemakaian bulan **tujuan**.
- [ ] **AC-19** Admin mengedit klaim milik Rina: yang dicek adalah pemakaian Rina, bukan pemakaian akun admin.
- [ ] **AC-20** Edit klaim `rejected` yang tetap `rejected`: tidak dicek plafon, karena klaim itu tidak dihitung.
- [ ] **AC-21** Edit yang tidak mengubah nominal, kategori, atau bulan (mis. hanya `note`) pada klaim yang bulannya sudah di atas plafon karena data lama: diterima. Klaim lama tidak terkunci.
- [ ] **AC-22** Aturan yang sama berlaku untuk Web App (`POST /claims/:id/edit`) dan API/MCP. API saat ini belum punya endpoint edit. Endpoint apa pun yang kelak mengubah `amount`, `category`, atau `claim_date` wajib memakai fungsi pengecekan yang sama (satu fungsi, bukan dua salinan).

### Pesan dan respons

- [ ] **AC-23** Penolakan di API: HTTP 422 dengan JSON `{ error, category, limit, used, remaining }`, semua angka rupiah bulat. Contoh: `used` 1000000, `limit` 1500000, `remaining` 500000.
- [ ] **AC-24** Penolakan di Web App: form tetap terbuka dengan isian sebelumnya dan pesan error di `div.err` yang menyebut kategori, bulan, plafon, dan sisa.
- [ ] **AC-25** Tool MCP `create_claim` menampilkan pesan penolakan ke Claude apa adanya (`isError: true`).

### Keamanan dan data

- [ ] **AC-26** Pesan error hanya memuat pemakaian milik pemilik klaim, tidak pernah data sales lain.
- [ ] **AC-27** Dua `POST /api/claims` bersamaan untuk transport Rp1.000.000 pada sales dengan sisa Rp1.500.000: tepat satu diterima, satu ditolak.
- [ ] **AC-28** Kode baru tidak menggabung string ke SQL: semua query memakai `prepare(...).bind(...)`.
- [ ] **AC-29** Tidak ada Tool MCP baru untuk approve atau edit, dan tidak ada route yang mengubah plafon.
- [ ] **AC-30** `npm test` hijau, termasuk test baru untuk AC-3 sampai AC-22 dan AC-27.

## Asumsi yang perlu dikonfirmasi ke Finance

Interview tidak menjawab tiga hal ini. Draft memakai default di kolom kanan.

| Pertanyaan | Default di PRD |
|---|---|
| Approve klaim `submitted`: dicek ulang? | Tidak. `submitted` sudah dihitung, jadi total tidak berubah. |
| Admin menghapus klaim: sisa plafon? | Klaim terhapus tidak dihitung, sisa plafon bertambah kembali. |
| Status `rejected` kembali ke `submitted` atau `approved` (belum ada alurnya hari ini)? | Dicek plafon, karena klaim mulai dihitung lagi. |

## Di luar dokumen ini

Rencana implementasi (query pemakaian, nama fungsi, struktur test) dibuat terpisah setelah PRD ini disetujui.
