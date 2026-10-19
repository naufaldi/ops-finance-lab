// Port: kontrak yang dibutuhkan service. Implementasinya ada di layer infra (d1-*, r2-*).
import type { Claim, ClaimInput, ClaimListItem, ClaimStatus, Decision } from "./claim";

export interface ClaimRepository {
  list(filter: { userId?: number; status?: string; limit?: number }): Promise<ClaimListItem[]>;
  findById(id: number): Promise<Claim | null>;
  create(userId: number, input: ClaimInput): Promise<{ id: number; status: ClaimStatus }>;
  update(id: number, input: ClaimInput): Promise<void>;
  decide(id: number, status: Decision): Promise<void>; // hanya mengubah klaim berstatus submitted
  remove(id: number): Promise<void>;
  setReceiptKey(id: number, key: string): Promise<void>;
}

export interface ReceiptStore {
  put(key: string, body: ArrayBuffer, contentType: string): Promise<void>;
  get(key: string): Promise<{ body: ReadableStream | ArrayBuffer; contentType: string } | null>;
  delete(key: string): Promise<void>;
}
