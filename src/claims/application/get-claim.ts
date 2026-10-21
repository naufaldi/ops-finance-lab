import type { Claim } from "../domain/claim";
import type { ClaimDeps } from "./ports";

export function getClaim({ repo }: Pick<ClaimDeps, "repo">, input: { id: number }): Promise<Claim | null> {
  return repo.findById(input.id);
}
