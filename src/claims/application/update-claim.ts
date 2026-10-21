import { validateClaim } from "../domain/validate-claim";
import type { ClaimDeps } from "./ports";

export type UpdateClaimResult = { ok: true } | { ok: false; error: string };

// Tanpa pre-read: id yang tidak ada tidak menghasilkan error, dan status klaim tidak dicek (F-3, F-4).
export async function updateClaim({ repo }: Pick<ClaimDeps, "repo">, input: { id: number; body: Record<string, unknown> }): Promise<UpdateClaimResult> {
  const v = validateClaim(input.body);
  if (!v.ok) return { ok: false, error: v.error };
  await repo.update(input.id, v.value);
  return { ok: true };
}
