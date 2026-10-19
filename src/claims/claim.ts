// Domain klaim: tipe dan aturan murni. Tanpa Hono, tanpa D1, tanpa R2.
export { CATEGORIES, validateClaim, type Category, type ClaimInput } from "../validate";
import type { Category, ClaimInput } from "../validate";

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

// ---------- plafon (docs/PRD.md) ----------
export type LimitStatus = { category: Category; limit: number; used: number; remaining: number };

export const rupiah = (n: number) => "Rp" + n.toLocaleString("id-ID");

// Bulan klaim = YYYY-MM dari claim_date, bukan tanggal input.
export const monthOf = (claimDate: string) => claimDate.slice(0, 7);

// Bulan berjalan di WIB (UTC+7). Server Workers memakai UTC, jadi jam 00:00-06:59 WIB tanggal 1 masih bulan lalu di UTC.
export const currentMonth = (now: Date = new Date()) => new Date(now.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 7);

// Batas inklusif: klaim boleh jika used + amount <= limit.
export function checkLimit(limit: number, used: number, amount: number): { ok: boolean; remaining: number } {
  const remaining = Math.max(limit - used, 0);
  return { ok: amount <= remaining, remaining };
}
