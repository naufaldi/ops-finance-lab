// Use case klaim. Dipakai Web App dan API, jadi aturan bisnis klaim ditulis di sini sekali.
import { isDecision, MAX_RECEIPT_BYTES, ownerFilter, RECEIPT_TYPES, validateClaim, type Viewer } from "./claim";
import type { ClaimRepository, ReceiptStore } from "./ports";

export type Result<T> = { ok: true; value: T } | { ok: false; code: 400 | 404 | 409 | 413 | 415; error: string };
const fail = (code: 400 | 404 | 409 | 413 | 415, error: string) => ({ ok: false, code, error }) as const;

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
    return { ok: true, value: await this.claims.create(viewer.id, v.value) };
  }

  async update(id: number, body: Record<string, unknown>): Promise<Result<null>> {
    const v = validateClaim(body);
    if (!v.ok) return fail(400, v.error);
    await this.claims.update(id, v.value);
    return { ok: true, value: null };
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
