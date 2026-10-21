# 0001. Modul fitur claims dengan service dan repository

Status: accepted · Tanggal: 2026-10-19

## Context
SQL klaim ada di `web.tsx` dan `api.ts`. Fitur plafon (docs/PRD.md) harus berlaku di Web App dan API.
Dengan struktur sekarang, aturan bisnis baru harus ditulis di beberapa handler.

## Decision
Buat modul `src/claims/` dengan layer domain, service, port, dan infra (D1, R2).
Handler di `web.tsx` dan `api.ts` hanya memanggil `claimService(env)`.

## Consequences
- Aturan bisnis klaim ditulis sekali di `claim.service.ts`.
- Service bisa di-test dengan repository in-memory.
- Lebih banyak file. Batas import dijaga `npm run lint:arch`.

## Alternatives considered
- Fungsi helper bersama tanpa layer: lebih cepat, tapi SQL dan aturan bisnis tetap bercampur. Ditolak.
- DI container (tsyringe/inversify): terlalu berat untuk satu Worker kecil. Ditolak.
