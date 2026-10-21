import type { ClaimDeps } from "./ports";

// Objek struk dihapus dulu, baru barisnya. Tidak atomik (F-8), urutan ini dipertahankan.
export async function deleteClaim({ repo, receipts }: Pick<ClaimDeps, "repo" | "receipts">, input: { id: number }): Promise<void> {
  const info = await repo.findReceiptInfo(input.id);
  if (info?.receiptKey) await receipts.delete(info.receiptKey);
  await repo.remove(input.id);
}
