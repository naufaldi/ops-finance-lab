import type { Claim, ClaimInput, ClaimStatus } from "../domain/claim";

// Pemanggil saat ini. Cocok secara struktur dengan User di src/auth.ts.
export type Viewer = { id: number; role: "admin" | "sales" };

// Proyeksi untuk API: has_receipt bernilai 0 atau 1, bukan boolean.
export type ClaimSummary = Pick<Claim, "id" | "category" | "amount" | "claim_date" | "merchant" | "note" | "status"> & { has_receipt: number };
export type ClaimWithSales = Claim & { sales: string };

export type ClaimFilter = { ownerId?: number; status?: string };

export interface ClaimRepository {
  insert(ownerId: number, input: ClaimInput): Promise<{ id: number; status: ClaimStatus }>;
  listSummaries(f: ClaimFilter & { limit: number }): Promise<ClaimSummary[]>;
  listWithSales(f: ClaimFilter): Promise<ClaimWithSales[]>;
}

export type ClaimDeps = { repo: ClaimRepository };
