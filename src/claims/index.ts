// Composition root modul claims: satu-satunya tempat yang merangkai service dengan D1 dan R2.
import type { Env } from "../auth";
import { ClaimService } from "./claim.service";
import { D1ClaimRepository } from "./d1-claim.repository";
import { R2ReceiptStore } from "./r2-receipt-store";

export const claimService = (env: Env) => new ClaimService(new D1ClaimRepository(env.DB), new R2ReceiptStore(env.RECEIPTS));
export type { ClaimService } from "./claim.service";
