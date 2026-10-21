import type { ClaimDeps, ClaimSummary, ClaimWithSales, Viewer } from "./ports";

const API_LIMIT = 50;

// Sales hanya melihat klaim miliknya sendiri. Admin melihat semua.
const ownerOf = (viewer: Viewer) => (viewer.role === "admin" ? undefined : viewer.id);

export function listClaimSummaries({ repo }: Pick<ClaimDeps, "repo">, input: { viewer: Viewer; status?: string }): Promise<ClaimSummary[]> {
  return repo.listSummaries({ ownerId: ownerOf(input.viewer), status: input.status, limit: API_LIMIT });
}

export function listClaimsWithSales({ repo }: Pick<ClaimDeps, "repo">, input: { viewer: Viewer; status?: string }): Promise<ClaimWithSales[]> {
  return repo.listWithSales({ ownerId: ownerOf(input.viewer), status: input.status });
}
