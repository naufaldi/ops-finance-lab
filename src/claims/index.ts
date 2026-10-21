// Composition root: satu-satunya tempat yang mengenal implementasi konkret.
import type { ClaimDeps } from "./application/ports";
import { d1ClaimRepository } from "./infrastructure/d1-claim-repository";

export { createClaim } from "./application/create-claim";
export { listClaimSummaries, listClaimsWithSales } from "./application/list-claims";

export const makeDeps = (env: { DB: D1Database }): ClaimDeps => ({ repo: d1ClaimRepository(env.DB) });
