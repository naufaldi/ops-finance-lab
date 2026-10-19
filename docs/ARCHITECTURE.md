# ARCHITECTURE.md: ops-finance (kondisi saat ini)

Dibuat dari analisis codebase dengan Claude Code (subagent Explore), lalu dicek manual.
Commit acuan: branch `sesi3-start`.

## Container
| Container | File | Tugas |
|---|---|---|
| Web App (Hono JSX) | `src/web.tsx` | Login session cookie, daftar/ajukan/edit/approve klaim, token pribadi |
| API JSON | `src/api.ts` | `/api/claims` (list, create), `/api/claims/:id/receipt` (upload struk), wajib token |
| Auth | `src/auth.ts` | Session, token (hash SHA-256), scope |
| Database | D1 (SQLite), `migrations/` | users, sessions, api_tokens, claims |
| Storage | R2 `RECEIPTS` | Foto struk |
| MCP server | `mcp/server.ts` | Proses stdio di laptop sales, memanggil `/api/*` dengan token. Tidak membuka D1 langsung |

Entry point `src/index.tsx` memasang `/api` dan `/` pada satu Worker.

## Alur: mengajukan klaim
- Web App: `POST /claims/new` → `validateClaim` → `INSERT INTO claims` di handler → redirect.
- MCP: Tool `create_claim` → `POST /api/claims` → `validateClaim` → `INSERT INTO claims` di handler → 201.

## Temuan
1. SQL ada langsung di route handler: 13 `prepare()` di `web.tsx`, 4 di `api.ts`, 2 di `auth.ts`.
2. Logic klaim ditulis dua kali: INSERT klaim dan daftar klaim (filter role + status) ada di `web.tsx` dan `api.ts`.
3. Validasi input sudah di satu tempat (`src/validate.ts`). Ini yang sudah benar.
4. Aturan status (hanya `submitted` yang bisa di-approve/tolak) hanya ada di klausa SQL `WHERE` di `web.tsx`.
5. Test hanya untuk `validateClaim`. Belum ada test di level route.

## Dampak ke fitur plafon (docs/PRD.md)
Aturan plafon harus dicek di tiga tempat: `POST /claims/new`, `POST /claims/:id/edit` (web) dan `POST /api/claims` (API).
Jika salah satu terlewat, sales bisa melewati plafon lewat jalur itu.

## Koreksi manual
- Draft pertama menyebut MCP server membaca D1 langsung. Salah: `mcp/server.ts` hanya memanggil API dengan `fetch` dan token.
