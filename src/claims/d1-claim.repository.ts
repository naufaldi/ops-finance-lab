// Infra: semua SQL tabel claims ada di file ini. Selalu prepare(...).bind(...).
import type { Claim, ClaimInput, ClaimListItem, ClaimStatus, Decision } from "./claim";
import type { ClaimRepository } from "./ports";

export class D1ClaimRepository implements ClaimRepository {
  constructor(private readonly db: D1Database) {}

  async list(filter: { userId?: number; status?: string; limit?: number }): Promise<ClaimListItem[]> {
    let sql = "SELECT c.*, u.name AS sales FROM claims c JOIN users u ON u.id = c.user_id WHERE 1 = 1";
    const params: unknown[] = [];
    if (filter.userId !== undefined) { sql += " AND c.user_id = ?"; params.push(filter.userId); }
    if (filter.status) { sql += " AND c.status = ?"; params.push(filter.status); }
    sql += " ORDER BY c.claim_date DESC, c.id DESC";
    if (filter.limit) { sql += " LIMIT ?"; params.push(filter.limit); }
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
}
