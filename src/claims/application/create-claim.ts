import type { Claim } from "../domain/claim";
import { validateClaim } from "../domain/validate-claim";
import type { ClaimDeps, Viewer } from "./ports";

export type CreateClaimResult = { ok: true; claim: Pick<Claim, "id" | "status"> } | { ok: false; error: string };

// Pemilik klaim selalu pemanggil, apa pun isi body.
export async function createClaim({ repo }: Pick<ClaimDeps, "repo">, input: { viewer: Viewer; body: Record<string, unknown> }): Promise<CreateClaimResult> {
  const v = validateClaim(input.body);
  if (!v.ok) return { ok: false, error: v.error };
  return { ok: true, claim: await repo.insert(input.viewer.id, v.value) };
}
