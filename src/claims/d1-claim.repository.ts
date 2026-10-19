// Infra: semua SQL tabel claims ada di file ini. Selalu prepare(...).bind(...).
import type { Claim, ClaimInput, ClaimListItem, ClaimStatus, Decision } from "./claim";
import type { ClaimRepository } from "./ports";

export class D1ClaimRepository implements ClaimRepository {
  constructor(private readonly db: D1Database) {}

  async list(filter: { userId?: number; status?: string; limit?: number }): Promise<ClaimListItem[]> {
    let sql = `SELECT c.id, c.user_id, c.category, c.amount, c.claim_date, c.merchant, c.note, c.receipt_key, c.status, c.created_at,
      u.name AS sales FROM claims c JOIN users u ON u.id = c.user_id WHERE 1 = 1`;
    const params: unknown[] = [];
    if (filter.userId !== undefined) { sql += " AND c.user_id = ?"; params.push(filter.userId); }
    if (filter.status) { sql += " AND c.status = ?"; params.push(filter.status); }
    sql += " ORDER BY c.claim_date DESC, c.id DESC";
    if (filter.limit) { sql += " LIMIT ?"; params.push(filter.limit); }
    // Kolom eksplisit harus lengkap sesuai tipe ClaimListItem. Dikunci test/claims-api.golden.test.ts.
    const { results } = await this.db.prepare(sql).bind(...params).all<ClaimListItem>();
    return results;
  }

  findById(id: number) {
    return this.db.prepare("SELECT * FROM claims WHERE id = ?").bind(id).first<Claim>();
  }

  async create(userId: number, x: ClaimInput) {
    const row = await this.db.prepare(
      `INSERT INTO claims (user_id, category, amount, claim_date, merchant, note)
       VALUES (?, ?, ?, ?, ?, ?) RETURNING id, status`,
    ).bind(userId, x.category, x.amount, x.claim_date, x.merchant, x.note).first<{ id: number; status: ClaimStatus }>();
    return row!;
  }

  async update(id: number, x: ClaimInput) {
    await this.db.prepare("UPDATE claims SET category = ?, amount = ?, claim_date = ?, merchant = ?, note = ? WHERE id = ?")
      .bind(x.category, x.amount, x.claim_date, x.merchant, x.note, id).run();
  }

  async decide(id: number, status: Decision) {
    await this.db.prepare("UPDATE claims SET status = ? WHERE id = ? AND status = 'submitted'").bind(status, id).run();
  }

  async remove(id: number) {
    await this.db.prepare("DELETE FROM claims WHERE id = ?").bind(id).run();
  }

  async setReceiptKey(id: number, key: string) {
    await this.db.prepare("UPDATE claims SET receipt_key = ? WHERE id = ?").bind(key, id).run();
  }

  async monthlyTotal(q: { userId: number; category: string; month: string; excludeId?: number }) {
    const row = await this.db.prepare(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM claims
       WHERE user_id = ? AND category = ? AND status != 'rejected' AND substr(claim_date, 1, 7) = ? AND id != ?`,
    ).bind(q.userId, q.category, q.month, q.excludeId ?? 0).first<{ total: number }>();
    return row?.total ?? 0;
  }

  async monthlyTotals(userId: number, month: string) {
    const { results } = await this.db.prepare(
      `SELECT category, SUM(amount) AS total FROM claims
       WHERE user_id = ? AND status != 'rejected' AND substr(claim_date, 1, 7) = ? GROUP BY category`,
    ).bind(userId, month).all<{ category: string; total: number }>();
    return Object.fromEntries(results.map((r) => [r.category, r.total]));
  }

  async limits() {
    const { results } = await this.db.prepare("SELECT category, monthly_limit FROM claim_limits").bind().all<{ category: string; monthly_limit: number }>();
    return Object.fromEntries(results.map((r) => [r.category, r.monthly_limit]));
  }
}
