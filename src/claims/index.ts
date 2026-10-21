// Composition root: satu-satunya tempat yang mengenal implementasi konkret.
import type { ClaimDeps } from "./application/ports";
import { d1ClaimRepository } from "./infrastructure/d1-claim-repository";
import { r2ReceiptStore } from "./infrastructure/r2-receipt-store";

export { attachReceipt } from "./application/attach-receipt";
export { changeStatus } from "./application/change-status";
export { createClaim } from "./application/create-claim";
export { deleteClaim } from "./application/delete-claim";
export { getClaim } from "./application/get-claim";
export { getReceipt } from "./application/get-receipt";
export { listClaimSummaries, listClaimsWithSales } from "./application/list-claims";
export { updateClaim } from "./application/update-claim";

export const makeDeps = (env: { DB: D1Database; RECEIPTS: R2Bucket }): ClaimDeps => ({
  repo: d1ClaimRepository(env.DB),
  receipts: r2ReceiptStore(env.RECEIPTS),
  clock: { now: () => Date.now() },
});
