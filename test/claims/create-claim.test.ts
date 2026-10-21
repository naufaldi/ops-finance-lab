import { describe, expect, it } from "vitest";
import { createClaim } from "../../src/claims/application/create-claim";
import type { ClaimRepository } from "../../src/claims/application/ports";

const body = { category: "transport", amount: 85000, claim_date: "2026-10-18", merchant: "Taksi Biru", note: "" };

function fakeRepo() {
  const inserted: { ownerId: number; input: unknown }[] = [];
  const repo = {
    async insert(ownerId: number, input: unknown) { inserted.push({ ownerId, input }); return { id: 99, status: "submitted" }; },
  } as unknown as ClaimRepository;
  return { repo, inserted };
}

describe("createClaim", () => {
  it("menyimpan klaim valid atas nama viewer", async () => {
    const { repo, inserted } = fakeRepo();
    const r = await createClaim({ repo }, { viewer: { id: 2, role: "sales" }, body });
    expect(r).toEqual({ ok: true, claim: { id: 99, status: "submitted" } });
    expect(inserted).toEqual([{ ownerId: 2, input: body }]);
  });

  it("pemilik klaim selalu viewer, walau body mengirim user_id lain", async () => {
    const { repo, inserted } = fakeRepo();
    await createClaim({ repo }, { viewer: { id: 2, role: "sales" }, body: { ...body, user_id: 3 } });
    expect(inserted[0].ownerId).toBe(2);
  });

  it("mengembalikan error validasi dan tidak menyentuh repository", async () => {
    const { repo, inserted } = fakeRepo();
    const r = await createClaim({ repo }, { viewer: { id: 2, role: "sales" }, body: { ...body, amount: 0 } });
    expect(r).toEqual({ ok: false, error: "amount harus bilangan bulat > 0 (rupiah)" });
    expect(inserted).toEqual([]);
  });
});
