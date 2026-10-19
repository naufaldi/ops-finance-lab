# PRD: Plafon Klaim per Kategori per Bulan

Status: draft untuk review · Pemilik: Finance Ops · Data dan angka: ilustrasi lab

## Masalah
Finance memeriksa secara manual apakah klaim sales melewati plafon bulanan per kategori.
Klaim masuk dari dua jalur: Web App dan Claude Code (MCP ops-finance). Klaim yang melewati plafon
baru ketahuan saat approval, lalu harus ditolak dan diajukan ulang.

## Pengguna
- Sales (Rina, Budi): mengajukan klaim lewat Web App atau Claude Code.
- Admin finance (Dewi): approve, tolak, edit klaim di Web App.

## Aturan plafon
| Kategori | Plafon per sales per bulan |
|---|---|
| transport | Rp1.500.000 |
| makan_klien | Rp2.000.000 |
| hotel | Rp3.000.000 |
| lainnya | Rp500.000 |

- Bulan dihitung dari `claim_date` (bulan kalender), bukan tanggal input.
- Yang dihitung: klaim berstatus `submitted` dan `approved`. Klaim `rejected` tidak dihitung.

## Acceptance criteria
1. Klaim baru yang membuat total kategori di bulan itu melewati plafon ditolak.
   Web App: HTTP 400 dengan pesan sisa plafon. API: HTTP 422 `{ error, category, limit, used, remaining }`.
2. Klaim tepat sama dengan sisa plafon diterima (batas inklusif).
3. Klaim `rejected` tidak mengurangi sisa plafon.
4. Aturan yang sama berlaku untuk Web App dan API/MCP, ditulis di satu tempat.
5. Admin mengedit klaim: plafon dicek ulang tanpa menghitung nilai lama klaim itu sendiri.
6. Halaman "Klaim saya" menampilkan sisa plafon bulan berjalan per kategori.
7. Semua perilaku lama tetap sama: characterization test di `test/claims.characterization.test.ts` tetap hijau.

## Non-goals
- Mengubah plafon lewat UI (plafon diubah lewat migration).
- Plafon berbeda per sales atau per region.
- Notifikasi email atau Slack.
- Klaim lintas bulan (satu klaim = satu `claim_date`).

## Constraint
- Nominal bilangan bulat rupiah (`INTEGER`), tanpa desimal.
- Tidak menyimpan data nasabah atau data kartu.
- Tetap jalan lokal dengan `wrangler dev` (D1 + R2 lokal).

## Pertanyaan terbuka
- Apakah admin boleh approve klaim yang melewati plafon dengan alasan khusus? (sementara: tidak)
