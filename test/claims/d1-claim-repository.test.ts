import { beforeEach, describe, expect, it } from "vitest";
import type { Env } from "../../src/auth";
import { d1ClaimRepository } from "../../src/claims/infrastructure/d1-claim-repository";
import { claimRow, createTestEnv } from "../helpers/env";

const input = { category: "hotel", amount: 700000, claim_date: "2026-11-02", merchant: "Hotel Melati", note: "" } as const;

let env: Env;
let repo: ReturnType<typeof d1ClaimRepository>;
beforeEach(() => { env = createTestEnv(); repo = d1ClaimRepository(env.DB); });

describe("insert", () => {
  it("menyimpan dengan status default submitted dan user_id sesuai argumen", async () => {
    const r = await repo.insert(3, input);
    expect(r.status).toBe("submitted");
    expect(await claimRow(env, r.id)).toMatchObject({ user_id: 3, ...input, status: "submitted", receipt_key: null });
  });
});

describe("listSummaries", () => {
  it("admin tanpa filter mendapat semua, urut claim_date menurun", async () => {
    const rows = await repo.listSummaries({ limit: 50 });
    expect(rows.map((r) => r.claim_date)).toEqual(["2026-10-16", "2026-10-15", "2026-10-14"]);
  });

  it("ownerId dan status memfilter", async () => {
    expect((await repo.listSummaries({ ownerId: 2, limit: 50 })).map((r) => r.id)).toEqual([2, 1]);
    expect((await repo.listSummaries({ ownerId: 2, status: "approved", limit: 50 })).map((r) => r.id)).toEqual([1]);
  });

  it("limit membatasi jumlah baris", async () => {
    expect(await repo.listSummaries({ limit: 2 })).toHaveLength(2);
  });

  it("has_receipt bernilai 0 atau 1, bukan boolean, dan tanpa receipt_key", async () => {
    await env.DB.prepare("UPDATE claims SET receipt_key = ? WHERE id = ?").bind("receipts/1-1.png", 1).run();
    const rows = await repo.listSummaries({ limit: 50 });
    expect(rows.find((r) => r.id === 1)?.has_receipt).toBe(1);
    expect(rows.find((r) => r.id === 2)?.has_receipt).toBe(0);
    expect(rows[0]).not.toHaveProperty("receipt_key");
  });

  it("nilai filter tidak pernah dibaca sebagai SQL", async () => {
    expect(await repo.listSummaries({ status: "x' OR '1'='1", limit: 50 })).toEqual([]);
  });
});

describe("listWithSales", () => {
  it("memuat nama sales, urut claim_date lalu id menurun", async () => {
    await repo.insert(2, { ...input, claim_date: "2026-10-16" });
    const rows = await repo.listWithSales({});
    expect(rows.map((r) => [r.id, r.sales])).toEqual([[4, "Rina (Sales JKT)"], [3, "Budi (Sales BDG)"], [2, "Rina (Sales JKT)"], [1, "Rina (Sales JKT)"]]);
    expect(rows[0]).toHaveProperty("receipt_key", null);
  });

  it("ownerId dan status memfilter", async () => {
    expect((await repo.listWithSales({ ownerId: 3 })).map((r) => r.id)).toEqual([3]);
    expect((await repo.listWithSales({ ownerId: 2, status: "submitted" })).map((r) => r.id)).toEqual([2]);
  });
});
