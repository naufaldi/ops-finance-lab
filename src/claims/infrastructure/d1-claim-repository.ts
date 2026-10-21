import type { ClaimFilter, ClaimRepository, ClaimSummary, ClaimWithSales } from "../application/ports";
import type { ClaimInput, ClaimStatus } from "../domain/claim";

// Filter dipasang dari potongan literal. Nilai dari luar hanya lewat bind. `p` adalah prefix alias tabel ("" atau "c.").
function filterOf(f: ClaimFilter, p: "" | "c."): { sql: string; params: unknown[] } {
  let sql = "";
  const params: unknown[] = [];
  if (f.ownerId !== undefined) { sql += " AND " + p + "user_id = ?"; params.push(f.ownerId); }
  if (f.status) { sql += " AND " + p + "status = ?"; params.push(f.status); }
  return { sql, params };
}

export function d1ClaimRepository(db: D1Database): ClaimRepository {
  return {
    async insert(ownerId: number, x: ClaimInput) {
      const row = await db.prepare(
        `INSERT INTO claims (user_id, category, amount, claim_date, merchant, note)
         VALUES (?, ?, ?, ?, ?, ?) RETURNING id, status`,
      ).bind(ownerId, x.category, x.amount, x.claim_date, x.merchant, x.note).first<{ id: number; status: ClaimStatus }>();
      if (!row) throw new Error("INSERT klaim tidak mengembalikan baris");
      return row;
    },

    async listSummaries(f) {
      const w = filterOf(f, "");
      let sql = `SELECT id, category, amount, claim_date, merchant, note, status,
               receipt_key IS NOT NULL AS has_receipt FROM claims WHERE 1 = 1`;
      sql += w.sql + " ORDER BY claim_date DESC LIMIT ?";
      const { results } = await db.prepare(sql).bind(...w.params, f.limit).all<ClaimSummary>();
      return results;
    },

    async listWithSales(f) {
      const w = filterOf(f, "c.");
      let sql = `SELECT c.*, u.name AS sales FROM claims c JOIN users u ON u.id = c.user_id WHERE 1 = 1`;
      sql += w.sql + " ORDER BY c.claim_date DESC, c.id DESC";
      const { results } = await db.prepare(sql).bind(...w.params).all<ClaimWithSales>();
      return results;
    },
  };
}
