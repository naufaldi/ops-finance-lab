import type { ClaimDeps, Viewer } from "./ports";

export type GetReceiptResult = { found: false } | { found: true; body: ReadableStream; contentType?: string };

// Pemilik klaim atau admin.
export async function getReceipt({ repo, receipts }: Pick<ClaimDeps, "repo" | "receipts">, input: { viewer: Viewer; claimId: number }): Promise<GetReceiptResult> {
  const info = await repo.findReceiptInfo(input.claimId);
  if (!info?.receiptKey || (input.viewer.role !== "admin" && info.userId !== input.viewer.id)) return { found: false };
  const obj = await receipts.get(info.receiptKey);
  return obj ? { found: true, ...obj } : { found: false };
}
