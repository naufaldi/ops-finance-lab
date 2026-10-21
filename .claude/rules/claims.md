---
paths:
  - "src/claims/**"
---

# Arsitektur module claims

Dependency mengalir satu arah: `infrastructure` → `application` → `domain`.

- `domain/`: tipe dan aturan bisnis murni. Hanya boleh mengimpor sesama `domain/`.
- `application/`: use case. Boleh mengimpor `domain/` dan `ports.ts`. Akses data lewat port (`ClaimDeps`), bukan langsung.
- `infrastructure/`: implementasi port (D1, R2). Satu-satunya tempat yang boleh memakai D1 dan R2.
- `index.ts`: composition root. Menyambungkan infrastructure ke use case.
- Domain dan application tidak boleh mengimpor `hono`, `@cloudflare/*`, tipe D1, atau file di `infrastructure/`.
- Jika use case butuh kemampuan baru dari database atau storage, tambahkan method di `ports.ts`, lalu implementasikan di `infrastructure/`.
- Pemeriksaan: `npm run lint:arch` (jalan otomatis lewat hook setelah Edit atau Write).
