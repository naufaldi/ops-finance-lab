// Use case klaim. Dipakai Web App dan API, jadi aturan bisnis klaim ditulis di sini sekali.
import {
  CATEGORIES, checkLimit, isDecision, MAX_RECEIPT_BYTES, monthOf, ownerFilter, RECEIPT_TYPES, rupiah, validateClaim,
  type ClaimInput, type LimitStatus, type Viewer,
} from "./claim";
import type { ClaimRepository, ReceiptStore } from "./ports";

type FailCode = 400 | 404 | 409 | 413 | 415 | 422;
export type Result<T> = { ok: true; value: T } | { ok: false; code: FailCode; error: string; limit?: LimitStatus };
const fail = (code: FailCode, error: string) => ({ ok: false, code, error }) as const;

export class ClaimService {
  constructor(private readonly claims: ClaimRepository, private readonly receipts: ReceiptStore) {}

  list(viewer: Viewer, status?: string, limit?: number) {
    return this.claims.list({ userId: ownerFilter(viewer), status: status || undefined, limit });
  }

  findById(id: number) {
    return this.claims.findById(id);
  }

  async create(viewer: Viewer, body: Record<string, unknown>): Promise<Result<{ id: number; status: string }>> {
    const v = validateClaim(body);
    if (!v.ok) return fail(400, v.error);
    const over = await this.overLimit(viewer.id, v.value);
    if (over) return over;
    return { ok: true, value: await this.claims.create(viewer.id, v.value) };
  }

  // Edit oleh admin: plafon dicek ulang untuk pemilik klaim, tanpa menghitung nilai lama klaim ini.
  async update(id: number, body: Record<string, unknown>): Promise<Result<null>> {
    const v = validateClaim(body);
    if (!v.ok) return fail(400, v.error);
    const claim = await this.claims.findById(id);
    if (!claim) return fail(404, "klaim tidak ditemukan");
    const over = await this.overLimit(claim.user_id, v.value, id);
    if (over) return over;
    await this.claims.update(id, v.value);
    return { ok: true, value: null };
  }

  // Aturan plafon ditulis sekali di sini, dipakai create (Web App + API/MCP) dan update.
  private async overLimit(userId: number, x: ClaimInput, excludeId?: number) {
    const limit = (await this.claims.limits())[x.category];
    if (limit === undefined) return null;
    const month = monthOf(x.claim_date);
    const used = await this.claims.monthlyTotal({ userId, category: x.category, month, excludeId });
    const check = checkLimit(limit, used, x.amount);
    if (check.ok) return null;
    return {
      ok: false, code: 422,
      error: `Melewati plafon ${x.category} bulan ${month}. Sisa plafon ${rupiah(check.remaining)}.`,
      limit: { category: x.category, limit, used, remaining: check.remaining },
    } as const;
  }

  // Sisa plafon per kategori untuk satu sales di satu bulan (halaman "Klaim saya").
  async limitStatus(viewer: Viewer, month: string): Promise<LimitStatus[]> {
    const [limits, used] = await Promise.all([this.claims.limits(), this.claims.monthlyTotals(viewer.id, month)]);
    return CATEGORIES.filter((k) => limits[k] !== undefined).map((k) => {
      const u = used[k] ?? 0;
      return { category: k, limit: limits[k], used: u, remaining: Math.max(limits[k] - u, 0) };
    });
  }

  async decide(id: number, status: string): Promise<Result<null>> {
    if (!isDecision(status)) return fail(400, "status tidak valid");
    await this.claims.decide(id, status);
    return { ok: true, value: null };
  }

  async remove(id: number): Promise<void> {
    const claim = await this.claims.findById(id);
    if (claim?.receipt_key) await this.receipts.delete(claim.receipt_key);
    await this.claims.remove(id);
  }

  // Upload struk: hanya pemilik klaim, hanya klaim submitted, PNG/JPEG, 1 byte sampai 5 MB.
  async attachReceipt(viewer: Viewer, id: number, contentType: string, body: ArrayBuffer): Promise<Result<{ claim_id: number; receipt_key: string }>> {
    const claim = await this.claims.findById(id);
    if (!claim || claim.user_id !== viewer.id) return fail(404, "klaim tidak ditemukan");
    if (claim.status !== "submitted") return fail(409, "struk hanya bisa diunggah untuk klaim berstatus submitted");
    const ext = RECEIPT_TYPES[contentType as keyof typeof RECEIPT_TYPES];
    if (!ext) return fail(415, "struk harus image/png atau image/jpeg");
    if (body.byteLength === 0 || body.byteLength > MAX_RECEIPT_BYTES) return fail(413, "ukuran struk 1 byte sampai 5 MB");
    const key = `receipts/${id}-${Date.now()}.${ext}`;
    await this.receipts.put(key, body, contentType);
    await this.claims.setReceiptKey(id, key);
    return { ok: true, value: { claim_id: id, receipt_key: key } };
  }

  // Foto struk: pemilik klaim atau admin.
  async receiptFor(viewer: Viewer, id: number) {
    const claim = await this.claims.findById(id);
    if (!claim?.receipt_key || (viewer.role !== "admin" && claim.user_id !== viewer.id)) return null;
    return this.receipts.get(claim.receipt_key);
  }
}
