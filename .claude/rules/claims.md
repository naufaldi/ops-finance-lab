---
paths:
  - "src/claims/**/*.ts"
---

# Aturan modul claims

- `claim.ts` dan `claim.service.ts`: tanpa import `hono`, `D1Database`, `R2Bucket`, atau file `d1-*`/`r2-*`.
- Service mengembalikan `Result` (`ok` / `code` + `error`). Handler yang mengubahnya jadi HTTP response.
- Nominal selalu `number` bilangan bulat rupiah. Jangan pakai float atau string.
- Setiap aturan bisnis baru: tambah test di `test/claim.service.test.ts` dengan repository palsu.
