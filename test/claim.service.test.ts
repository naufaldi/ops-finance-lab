// Unit test service tanpa D1 dan R2: repository dan storage palsu di memori.
import { describe, expect, it } from "vitest";
import type { Claim } from "../src/claims/claim";
import { ClaimService } from "../src/claims/claim.service";
import type { ClaimRepository, ReceiptStore } from "../src/claims/ports";

function fakes(seed: Claim[] = []) {
  const rows = new Map(seed.map((c) => [c.id, { ...c }]));
  const files = new Map<string, ArrayBuffer>();
  const repo: ClaimRepository = {
    async list(f) { return [...rows.values()].filter((c) => f.userId === undefined || c.user_id === f.userId).map((c) => ({ ...c, sales: "x" })); },
    async findById(id) { return rows.get(id) ?? null; },
    async create(userId, x) { const id = rows.size + 1; rows.set(id, { ...x, id, user_id: userId, status: "submitted", receipt_key: null, created_at: "" }); return { id, status: "submitted" }; },
    async update(id, x) { Object.assign(rows.get(id)!, x); },
    async decide(id, status) { const c = rows.get(id); if (c?.status === "submitted") c.status = status; },
    async remove(id) { rows.delete(id); },
    async setReceiptKey(id, key) { rows.get(id)!.receipt_key = key; },
  };
  const store: ReceiptStore = {
    async put(key, body) { files.set(key, body); },
    async get(key) { return files.has(key) ? { body: files.get(key)!, contentType: "image/png" } : null; },
    async delete(key) { files.delete(key); },
  };
  return { rows, files, service: new ClaimService(repo, store) };
}

const claim = (over: Partial<Claim>): Claim => ({
  id: 1, user_id: 2, category: "transport", amount: 85000, claim_date: "2026-10-14", merchant: "Taksi Biru",
  note: "", status: "submitted", receipt_key: null, created_at: "", ...over,
});
const rina = { id: 2, role: "sales" as const };

describe("ClaimService", () => {
  it("create menolak input tidak valid dengan code 400", async () => {
    const r = await fakes().service.create(rina, { category: "transport", amount: 0 });
    expect(r).toMatchObject({ ok: false, code: 400 });
  });

  it("decide menolak status selain approved/rejected", async () => {
    const r = await fakes([claim({})]).service.decide(1, "paid");
    expect(r).toMatchObject({ ok: false, code: 400 });
  });

  it("attachReceipt: klaim approved tidak bisa diberi struk (409)", async () => {
    const r = await fakes([claim({ status: "approved" })]).service.attachReceipt(rina, 1, "image/png", new ArrayBuffer(3));
    expect(r).toMatchObject({ ok: false, code: 409 });
  });

  it("attachReceipt: tipe file selain PNG/JPEG ditolak (415)", async () => {
    const r = await fakes([claim({})]).service.attachReceipt(rina, 1, "application/pdf", new ArrayBuffer(3));
    expect(r).toMatchObject({ ok: false, code: 415 });
  });

  it("remove menghapus foto struk di storage", async () => {
    const f = fakes([claim({ receipt_key: "receipts/1-a.png" })]);
    f.files.set("receipts/1-a.png", new ArrayBuffer(1));
    await f.service.remove(1);
    expect(f.files.size).toBe(0);
    expect(f.rows.size).toBe(0);
  });
});
