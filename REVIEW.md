# Aturan review ops-finance

Dipakai Claude saat review PR (`/code-review`, Code Review di GitHub). Singkat, hanya aturan yang paling penting.

## Important berarti
Bug yang membuat nominal klaim, plafon, atau hak akses salah, atau membuka data milik user lain. Perbaiki sebelum merge.

## Selalu cek
- Akses: endpoint `/api/*` yang menampilkan data lebih dari milik pemilik token wajib cek `role === "admin"`. Sales hanya melihat data sendiri.
- SQL: selalu `prepare(...).bind(...)`. Nilai dari request tidak pernah digabung ke string SQL.
- SQL hanya di `src/claims/d1-*.ts`. Handler `api.ts`/`web.tsx` memanggil `claimService(env)`.
- Uang: `INTEGER` rupiah di DB dan di JSON API. Format "Rp..." hanya di Web App.
- Plafon: klaim `rejected` tidak dihitung. Bulan dari `claim_date` (YYYY-MM), bulan berjalan dalam WIB.
- Query di dalam loop (N+1): sebut jumlah query per request.
- Route API baru punya test untuk kasus ditolak (401/403/422), bukan hanya status 200.
- Perubahan bentuk response API disebut di deskripsi PR (dipakai MCP ops-finance).

## Jangan laporkan
- Format dan gaya yang sudah dicek `tsc` dan `npm run lint:arch`.
- `package-lock.json`, file di `migrations/` yang sudah di-merge.

## Nit
Maksimal 5 Nit per review.
