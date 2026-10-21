import type { Claim, ClaimInput, ClaimStatus } from "../domain/claim";

// Pemanggil saat ini. Cocok secara struktur dengan User di src/auth.ts.
export type Viewer = { id: number; role: "admin" | "sales" };

// Proyeksi untuk API: has_receipt bernilai 0 atau 1, bukan boolean.
export type ClaimSummary = Pick<Claim, "id" | "category" | "amount" | "claim_date" | "merchant" | "note" | "status"> & { has_receipt: number };
export type ClaimWithSales = Claim & { sales: string };

export type ClaimFilter = { ownerId?: number; status?: string };

// Dasar keputusan akses struk: pemilik, status, dan key objek di R2.
export type ReceiptInfo = { userId: number; status: ClaimStatus; receiptKey: string | null };

export interface ClaimRepository {
  insert(ownerId: number, input: ClaimInput): Promise<{ id: number; status: ClaimStatus }>;
  listSummaries(f: ClaimFilter & { limit: number }): Promise<ClaimSummary[]>;
  listWithSales(f: ClaimFilter): Promise<ClaimWithSales[]>;
  findById(id: number): Promise<Claim | null>;
  update(id: number, input: ClaimInput): Promise<void>;
  setStatusIfSubmitted(id: number, status: "approved" | "rejected"): Promise<void>;
  findReceiptInfo(id: number): Promise<ReceiptInfo | null>;
  setReceiptKey(id: number, key: string): Promise<void>;
  remove(id: number): Promise<void>;
}

export interface ReceiptStore {
  put(key: string, body: ArrayBuffer, contentType: string): Promise<void>;
  get(key: string): Promise<{ body: ReadableStream; contentType?: string } | null>;
  delete(key: string): Promise<void>;
}

// Untuk key struk, supaya waktu bisa dikunci di test.
export interface Clock { now(): number }

export type ClaimDeps = { repo: ClaimRepository; receipts: ReceiptStore; clock: Clock };
