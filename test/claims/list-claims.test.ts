import { describe, expect, it } from "vitest";
import { listClaimSummaries, listClaimsWithSales } from "../../src/claims/application/list-claims";
import type { ClaimRepository } from "../../src/claims/application/ports";

function fakeRepo() {
  const calls: { method: string; filter: unknown }[] = [];
  const repo = {
    async listSummaries(filter: unknown) { calls.push({ method: "listSummaries", filter }); return []; },
    async listWithSales(filter: unknown) { calls.push({ method: "listWithSales", filter }); return []; },
  } as unknown as ClaimRepository;
  return { repo, calls };
}

const sales = { id: 2, role: "sales" } as const;
const admin = { id: 1, role: "admin" } as const;

describe("listClaimSummaries (API)", () => {
  it("sales selalu dibatasi ke ownerId miliknya, dengan limit 50", async () => {
    const { repo, calls } = fakeRepo();
    await listClaimSummaries({ repo }, { viewer: sales });
    expect(calls).toEqual([{ method: "listSummaries", filter: { ownerId: 2, status: undefined, limit: 50 } }]);
  });

  it("sales tidak bisa lolos dari batas pemilik lewat filter status", async () => {
    const { repo, calls } = fakeRepo();
    await listClaimSummaries({ repo }, { viewer: sales, status: "approved" });
    expect((calls[0].filter as any).ownerId).toBe(2);
    expect((calls[0].filter as any).status).toBe("approved");
  });

  it("admin tidak dibatasi pemilik", async () => {
    const { repo, calls } = fakeRepo();
    await listClaimSummaries({ repo }, { viewer: admin, status: "submitted" });
    expect(calls[0].filter).toEqual({ ownerId: undefined, status: "submitted", limit: 50 });
  });
});

describe("listClaimsWithSales (Web)", () => {
  it("sales dibatasi ke miliknya, tanpa limit", async () => {
    const { repo, calls } = fakeRepo();
    await listClaimsWithSales({ repo }, { viewer: sales });
    expect(calls).toEqual([{ method: "listWithSales", filter: { ownerId: 2, status: undefined } }]);
  });

  it("admin melihat semua", async () => {
    const { repo, calls } = fakeRepo();
    await listClaimsWithSales({ repo }, { viewer: admin });
    expect((calls[0].filter as any).ownerId).toBeUndefined();
  });
});
