# ADR 0001: Klaim sebagai feature module dengan layer Clean Architecture

- Status: Diusulkan
- Tanggal: 2026-10-21
- Terkait: [TRD](../TRD.md), [PRD plafon](../PRD.md), [ARCHITECTURE](../ARCHITECTURE.md)

## Konteks

Seluruh logika klaim hari ini ada di dua handler yang berdiri sendiri: `src/api.ts` (51 baris) dan `src/web.tsx` (249 baris, juga memuat login, token, CSS, dan view). Keduanya menulis ulang pola yang sama: validasi, aturan akses, lalu SQL (`src/api.ts:25-35`, `src/web.tsx:148-156`). `validateClaim` sudah menjadi satu-satunya titik berbagi dan murni (`src/validate.ts`).

Plafon klaim (PRD) menambah aturan yang membutuhkan akses DB, harus atomik dengan penulisan (satu statement bersyarat), harus berlaku di tiga jalur tulis (buat Web, buat API, edit Web), dan nanti di endpoint edit API yang belum ada (AC-22: "satu fungsi, bukan dua salinan"). `validateClaim` tidak bisa menampung ini tanpa kehilangan sifat murninya (ARCHITECTURE F-1, F-2).

Ukuran sekarang kecil (573 baris), jadi struktur harus sebanding. Kita tidak mau seremoni lebih besar dari masalahnya.

## Keputusan

1. Logika klaim dikumpulkan dalam satu feature module `src/claims`, dibagi empat layer: `domain`, `application`, `infrastructure`, `interface`. `index.ts` modul adalah composition root.
2. Dependency rule: arah impor hanya ke dalam. `domain` tidak mengimpor apa pun; `application` hanya `domain`; `infrastructure` mengimplementasikan port milik `application`; `interface` tidak mengimpor `infrastructure` (menerima dependency dari `index.ts`). Tabel lengkap di TRD bagian 2.1.
3. Aturan ditegakkan oleh test (`test/claims/architecture.test.ts`), bukan hanya konvensi.
4. Use case berupa fungsi dan port berupa tipe interface. Tanpa class, DI container, atau mapper antar layer.
5. Semua SQL klaim berada di `infrastructure/d1-claim-repository.ts`. Pernyataan bersyarat plafon nanti tinggal di sana.
6. Pekerjaan dipisah dua: refactoring tanpa perubahan behavior lebih dulu (dikunci characterization test), plafon sesudahnya.
7. Auth, login, dan token tidak ikut pindah. Modul hanya mengambil `adminOnly` dan UI bersama yang diekstrak ke `src/auth.ts` dan `src/ui/`.

## Alternatif yang ditolak

### 1. Tetap datar, tambah `src/limits.ts`

Saran awal di ARCHITECTURE bagian 4: fungsi `async` yang menerima `DB`, dipanggil dari `web.tsx` dan `api.ts`.

Ditolak karena: pengecekan plafon harus dipanggil benar di tiga tempat, ditambah endpoint edit API kelak, dan tidak ada yang menjaga agar tempat keempat tidak lupa. Orkestrasi klaim tetap tersalin di dua handler. `web.tsx` terus membesar. Biaya kecil sekarang, tetapi masalah duplikasi yang menjadi alasan PRD (AC-22) tidak terselesaikan, hanya digeser.

### 2. Layer global di seluruh aplikasi (`src/domain`, `src/application`, `src/infrastructure`, `src/interface`)

Ditolak karena: hanya klaim yang punya aturan bisnis nyata. Auth, sesi, dan token adalah mekanisme, bukan domain; memaksanya masuk empat folder menambah file tanpa memisahkan apa pun. Satu perubahan klaim akan tersebar di empat folder yang juga berisi hal lain. Feature module menjaga perubahan klaim di satu direktori.

### 3. Hexagonal penuh: entity class, mapper di tiap batas, DI container

Ditolak karena: tidak sebanding dengan 573 baris dan satu bounded area. Class dan mapper menambah kode untuk menerjemahkan objek yang bentuknya sama di kedua sisi. Container DI tidak perlu di Worker yang merakit dependency per request dari `env`.

### 4. Use case langsung memakai `D1Database`, tanpa port

Lebih sedikit file dan indirection. Tidak diambil karena SQL akan tertinggal di `application`, sehingga batas "aturan tidak tahu D1" tidak ada dan dependency rule tidak bisa diuji.

Catatan jujur: argumen "port memudahkan test" lemah di repo ini, karena fake D1 berbasis `node:sqlite` sudah ada (`test/helpers/env.ts`) dan cukup baik. Alasan sebenarnya adalah lokasi: SQL, termasuk statement atomik plafon, terkumpul di satu file, dan use case bisa diuji tanpa HTTP maupun SQL. Kalau alasan itu ternyata tidak terasa setelah bagian A, ini alternatif yang bisa dipertimbangkan kembali (lihat Evaluasi ulang).

### 5. Menjadikan `validateClaim` async dan menerima `DB`

Ditolak karena: mencampur validasi input murni dengan IO, dan tetap cek-lalu-tulis, sehingga tidak atomik. PRD mensyaratkan satu statement bersyarat, dan itu hanya cocok di lapisan yang memegang penulisan.

### 6. Penegakan plafon di database (trigger atau CHECK lintas baris)

Ditolak karena: aturan bisnis bersembunyi di migration, pesan penolakan tidak bisa membawa `used` dan `remaining` (AC-23), dan perilakunya sulit diuji di fake D1. Statement bersyarat di repository memberi atomisitas yang sama tanpa itu.

### 7. Refactoring dan plafon dalam satu rangkaian perubahan

Ditolak karena: kalau test merah, kita tidak tahu apakah penyebabnya pemindahan atau aturan baru. Dengan dipisah, characterization test dari awal bagian A membuktikan pemindahan tidak mengubah behavior, dan perubahan test di bagian B hanya berisi perubahan yang disengaja.

## Konsekuensi

Positif:

- Aturan klaim (akses, validasi, plafon) ditulis sekali dan dipakai Web, API, dan endpoint edit di masa depan.
- SQL klaim di satu file, jadi pelanggaran aturan `prepare(...).bind(...)` mudah dicari dan diuji.
- `web.tsx` dan `api.ts` menyusut menjadi pemasang route.
- Dependency rule bisa dicek otomatis.

Negatif:

- Sekitar 15 file untuk logika yang sekarang berada di dua file. Setiap perubahan kecil harus melewati beberapa file.
- Dua method list terpisah dipertahankan sementara karena proyeksi dan urutannya berbeda; ini sisa duplikasi yang disengaja.
- Perubahan di `interface` untuk Web dan API tetap dua tempat. Yang dipusatkan adalah aturan, bukan pemetaan HTTP.
- `mcp/server.ts` masih menduplikasi enum kategori lewat zod. Di luar modul, tidak ditangani di ADR ini.
- Behavior bermasalah yang sudah tercatat (F-3, F-4, F-8, F-9) sengaja dibawa apa adanya ke struktur baru, jadi struktur rapi tidak berarti perilaku sudah benar.

## Evaluasi ulang

Tinjau keputusan ini bila:

- Selesai bagian A, dan terasa bahwa port serta layer menambah biaya tanpa manfaat nyata (alternatif 4 dipertimbangkan kembali).
- Ada fitur kedua dengan aturan bisnis (mis. token atau laporan) yang membutuhkan pola serupa. Saat itu dipertimbangkan membuat modul sejajar, bukan memperlebar `claims`.
- `architecture.test.ts` sering dilewati dengan pengecualian.
