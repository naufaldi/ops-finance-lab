# ops-finance

Aplikasi klaim biaya Ops Sales (data dummy, untuk lab).

## Stack
- Cloudflare Worker + Hono, D1 (SQLite), R2 untuk foto struk.
- Jalan lokal dengan `npm run dev`, tanpa akun Cloudflare.
- MCP server stdio di `mcp/server.ts`, memanggil `/api/*` dengan token.

## Aturan
- Aturan akses ada di API: sales hanya melihat dan membuat klaim miliknya.
- Approve dan tolak hanya lewat Web App oleh admin. Tidak ada Tool MCP approve.
- SQL selalu `prepare(...).bind(...)`, jangan menggabung string.
- Token disimpan sebagai hash SHA-256, tidak pernah plaintext.

## Arsitektur
- Module `src/claims` berlapis: `domain` ← `application` ← `infrastructure`. `index.ts` adalah composition root.
- `domain` dan `application` (use case) tidak boleh mengimpor `hono`, D1, atau file `infrastructure`. Akses data lewat port di `application/ports.ts`.
- Aturan lengkap di `.claude/rules/claims.md`. `npm run lint:arch` memeriksanya dan jalan otomatis lewat hook setelah Edit atau Write.

## Perintah
- `npm run db:migrate` lalu `npm run dev`
- `npm test` (Vitest) wajib hijau sebelum commit
- `npm run lint:arch` (batas import module claims)
