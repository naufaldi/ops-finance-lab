import type { ClaimDeps, Viewer } from "./ports";

const MAX_BYTES = 5 * 1024 * 1024;
const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg" };

export type AttachReceiptResult =
  | { outcome: "ok"; key: string }
  | { outcome: "not_found" | "not_submitted" | "bad_type" | "too_large" };

// Hanya pemilik, hanya klaim submitted, hanya PNG atau JPEG, 1 byte sampai 5 MB.
// Body dibaca paling akhir lewat readBody, sesuai urutan pemeriksaan semula.
// UPDATE receipt_key tanpa AND user_id dan AND status, objek lama tidak dihapus (F-9).
export async function attachReceipt(
  { repo, receipts, clock }: ClaimDeps,
  input: { viewer: Viewer; claimId: number; contentType: string; readBody: () => Promise<ArrayBuffer> },
): Promise<AttachReceiptResult> {
  const info = await repo.findReceiptInfo(input.claimId);
  if (!info || info.userId !== input.viewer.id) return { outcome: "not_found" };
  if (info.status !== "submitted") return { outcome: "not_submitted" };
  if (!Object.hasOwn(EXT, input.contentType)) return { outcome: "bad_type" };
  const body = await input.readBody();
  if (body.byteLength === 0 || body.byteLength > MAX_BYTES) return { outcome: "too_large" };
  const key = `receipts/${input.claimId}-${clock.now()}.${EXT[input.contentType]}`;
  await receipts.put(key, body, input.contentType);
  await repo.setReceiptKey(input.claimId, key);
  return { outcome: "ok", key };
}
