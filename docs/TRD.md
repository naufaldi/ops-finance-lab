# TRD: Plafon Klaim dan Struktur Modul Claims

Rujukan: docs/PRD.md (kebutuhan), docs/ARCHITECTURE.md (kondisi saat ini), docs/adr/0001-claims-feature-module.md (keputusan struktur).

## 1. Struktur target (Clean Architecture, modul per fitur)
```
src/
  claims/
    claim.ts                  domain: tipe, aturan murni (tanpa Hono, tanpa D1)
    ports.ts                  interface ClaimRepository, ReceiptStore
    claim.service.ts          use case: list, create, update, decide, remove, attachReceipt
    d1-claim.repository.ts    infra: semua SQL tabel claims
    r2-receipt-store.ts       infra: R2
    index.ts                  composition: claimService(env)
  api.ts, web.tsx             http: parse request, panggil service, bentuk response
```
Dependency rule: `http → claims/index.ts → service → domain`. Service dan domain tidak boleh import `hono`, `D1Database`, atau file `d1-*`/`r2-*`.
Dicek otomatis dengan `scripts/check-architecture.mjs` (`npm run lint:arch`), dipanggil hook PostToolUse.
Catatan: dependency-cruiser 18.5 belum mendukung TypeScript 7 yang dipakai repo ini (dicek 19 Okt 2026), jadi lab memakai script kecil.

## 2. Kontrak API (berubah di Part 2, saat fitur plafon dibuat)
`POST /api/claims`
| Kondisi | Status | Body |
|---|---|---|
| Valid, di bawah plafon | 201 | `{ claim: { id, status } }` |
| Input tidak valid | 400 | `{ error }` |
| Melewati plafon | 422 | `{ error, category, limit, used, remaining }` |

`GET /api/claims` tetap: `{ claims: [{ id, category, amount, claim_date, merchant, note, status, has_receipt }] }`, maksimal 50.

## 3. Schema (Part 2)
Migration `0003_claim_limits.sql`:
- Tabel `claim_limits (category TEXT PRIMARY KEY, monthly_limit INTEGER NOT NULL CHECK (monthly_limit > 0))`, seed 4 kategori dari PRD.
- Index `claims (user_id, category, claim_date)` untuk query total bulanan.

Query total (satu statement):
`SELECT COALESCE(SUM(amount), 0) FROM claims WHERE user_id = ? AND category = ? AND status != 'rejected' AND substr(claim_date, 1, 7) = ? AND id != ?`

## 4. Non-functional
- Uang: `INTEGER` rupiah. Tanpa float.
- Dua klaim bersamaan bisa sama-sama lolos cek (race). Diterima untuk versi lab; dicatat sebagai risiko.
  Opsi produksi: cek dan insert dalam satu statement (`INSERT ... SELECT ... WHERE total + ? <= limit`), atau batch D1.
- Perilaku lama dikunci characterization test sebelum refactor.

## 5. Rencana bertahap
1. Characterization test untuk alur klaim (web + API). Hijau di code lama.
2. Pindahkan SQL klaim dari `api.ts` ke `d1-claim.repository.ts` lewat service. Test hijau, commit.
3. Pindahkan SQL klaim dari `web.tsx`. Test hijau, commit.
4. Script cek arsitektur + hook PostToolUse + aturan di CLAUDE.md. Commit.
5. (Part 2) Fitur plafon di `claim.service.ts`, sekali untuk web dan API.

Di luar scope Part 1: SQL session dan token di `auth.ts` dan `web.tsx` tetap di tempatnya. Dipindah di langkah berikutnya.
