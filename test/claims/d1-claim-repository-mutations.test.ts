import { beforeEach, describe, expect, it } from "vitest";
import type { Env } from "../../src/auth";
import { d1ClaimRepository } from "../../src/claims/infrastructure/d1-claim-repository";
import { claimRow, createTestEnv } from "../helpers/env";

let env: Env;
let repo: ReturnType<typeof d1ClaimRepository>;
beforeEach(() => { env = createTestEnv(); repo = d1ClaimRepository(env.DB); });

// Seed: klaim 1 (Rina, approved), 2 (Rina, submitted), 3 (Budi).
describe("findById", () => {
  it("mengembalikan satu baris utuh, atau null", async () => {
    expect(await repo.findById(2)).toMatchObject({ id: 2, user_id: 2, status: "submitted" });
    expect(await repo.findById(999)).toBeNull();
  });
});

describe("update", () => {
  it("mengubah lima field dan tidak menyentuh status, pemilik, atau klaim lain", async () => {
    const before = await claimRow(env, 2);
    const other = await claimRow(env, 3);
    await repo.update(2, { category: "hotel", amount: 1, claim_date: "2026-11-01", merchant: "M", note: "n" });
    expect(await claimRow(env, 2)).toEqual({ ...before, category: "hotel", amount: 1, claim_date: "2026-11-01", merchant: "M", note: "n" });
    expect(await claimRow(env, 3)).toEqual(other);
  });

  it("id yang tidak ada tidak melempar error", async () => {
    await expect(repo.update(999, { category: "hotel", amount: 1, claim_date: "2026-11-01", merchant: "M", note: "" })).resolves.toBeUndefined();
  });
});

describe("setStatusIfSubmitted", () => {
  it("mengubah klaim submitted", async () => {
    await repo.setStatusIfSubmitted(2, "rejected");
    expect((await claimRow(env, 2))?.status).toBe("rejected");
  });

  it("tidak mengubah klaim yang sudah diputuskan", async () => {
    await repo.setStatusIfSubmitted(1, "rejected");
    expect((await claimRow(env, 1))?.status).toBe("approved");
  });
});

describe("struk", () => {
  it("findReceiptInfo memetakan kolom, atau null", async () => {
    expect(await repo.findReceiptInfo(2)).toEqual({ userId: 2, status: "submitted", receiptKey: null });
    expect(await repo.findReceiptInfo(999)).toBeNull();
  });

  it("setReceiptKey menyimpan key", async () => {
    await repo.setReceiptKey(2, "receipts/2-1.png");
    expect((await repo.findReceiptInfo(2))?.receiptKey).toBe("receipts/2-1.png");
  });
});

describe("remove", () => {
  it("menghapus baris", async () => {
    await repo.remove(2);
    expect(await claimRow(env, 2)).toBeNull();
    expect(await claimRow(env, 1)).not.toBeNull();
  });
});
