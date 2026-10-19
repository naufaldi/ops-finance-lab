// Domain klaim: tipe dan aturan murni. Tanpa Hono, tanpa D1, tanpa R2.
export { CATEGORIES, validateClaim, type Category, type ClaimInput } from "../validate";
import type { ClaimInput } from "../validate";

export type ClaimStatus = "submitted" | "approved" | "rejected";
export type Decision = Exclude<ClaimStatus, "submitted">;
export type Viewer = { id: number; role: "admin" | "sales" };

export type Claim = ClaimInput & {
  id: number;
  user_id: number;
  status: ClaimStatus;
  receipt_key: string | null;
  created_at: string;
};
export type ClaimListItem = Claim & { sales: string };

export const isDecision = (s: string): s is Decision => s === "approved" || s === "rejected";

// Admin melihat semua klaim, sales hanya miliknya.
export const ownerFilter = (viewer: Viewer) => (viewer.role === "admin" ? undefined : viewer.id);

export const RECEIPT_TYPES = { "image/png": "png", "image/jpeg": "jpg" } as const;
export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
