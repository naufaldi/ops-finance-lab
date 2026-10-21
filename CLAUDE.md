# ops-finance

Aplikasi klaim biaya Ops Sales (data dummy, untuk lab).

## Stack
- Cloudflare Worker + Hono, D1 (SQLite), R2 untuk foto struk.
- Jalan lokal dengan `npm run dev`, tanpa akun Cloudflare.
- MCP server stdio di `mcp/server.ts`, memanggil `/api/*` dengan token.

## Dokumen
- Kebutuhan: @docs/PRD.md · Kondisi code: docs/ARCHITECTURE.md · Desain: docs/TRD.md
- Baca docs/adr/ sebelum mengusulkan struktur baru. Jika menyimpang, tulis ADR baru.

## Arsitektur (modul claims)
- Alur: `web.tsx`/`api.ts` → `claimService(env)` dari `src/claims/index.ts` → `claim.service.ts` → `claim.ts`.
- SQL tabel claims hanya di `src/claims/d1-claim.repository.ts`. R2 hanya di `src/claims/r2-receipt-store.ts`.
- Aturan bisnis klaim (validasi, status, plafon) di `claim.service.ts`, bukan di handler.
- `npm run lint:arch` wajib lulus. Hook PostToolUse menjalankannya setiap Claude mengedit file.

## Aturan
- Aturan akses ada di API: sales hanya melihat dan membuat klaim miliknya.
- Approve dan tolak hanya lewat Web App oleh admin. Tidak ada Tool MCP approve.
- SQL selalu `prepare(...).bind(...)`, jangan menggabung string.
- Token disimpan sebagai hash SHA-256, tidak pernah plaintext.

## Perintah
- `npm run db:migrate` lalu `npm run dev`
- `npm test` (Vitest) wajib hijau sebelum commit
- `npm run lint:arch` cek batas import modul claims

## Commit dan PR
- Pesan commit: Conventional Commits, `<type>(<scope>): <deskripsi>`, judul maksimal 50 karakter, body menjelaskan kenapa.
- Satu commit satu perubahan logis. Refactor dan fitur di commit terpisah.
- PR memakai `.github/pull_request_template.md`. Semua bagian diisi; bagian "Kenapa" diambil dari PRD atau issue, jangan dikarang.
- Sebelum minta review manusia: review PR di sesi baru dengan kriteria KISS, DRY, mudah dibaca, logic sederhana, satu fungsi satu tugas.
- Sertakan output `npm test` di bagian "Cara test". Jangan menulis "test lulus" tanpa output.
- Jangan push langsung ke `main`.

## Review
- `/code-review` lokal membaca file ini, bukan REVIEW.md. Aturan review lengkap untuk Code Review di GitHub ada di REVIEW.md.
- Endpoint yang menampilkan data lebih dari milik pemilik token wajib cek `role === "admin"`.
- Uang `INTEGER` rupiah di DB dan JSON API; format "Rp..." hanya di Web App.
- Klaim `rejected` tidak dihitung ke plafon. Query di dalam loop (N+1) dilaporkan.

## Test dan regresi
- `test/__golden__/` adalah golden file. Jangan jalankan `vitest -u` tanpa izin. Jika golden test gagal, perbaiki code dulu.
- Bug yang diperbaiki selalu dapat test yang gagal sebelum fix (lihat `test/claim.domain.test.ts`).
- CI (`.github/workflows/test.yml`) wajib hijau sebelum merge: unit, lint:arch, tsc, dan E2E.
