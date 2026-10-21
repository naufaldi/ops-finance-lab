import { describe, expect, it } from "vitest";
import { attachReceipt } from "../../src/claims/application/attach-receipt";
import { changeStatus } from "../../src/claims/application/change-status";
import { deleteClaim } from "../../src/claims/application/delete-claim";
import { getReceipt } from "../../src/claims/application/get-receipt";
import type { ClaimDeps, ReceiptInfo } from "../../src/claims/application/ports";
import { updateClaim } from "../../src/claims/application/update-claim";

// Fake di memori. `calls` mencatat urutan panggilan lintas repo dan store.
function fakes(info: ReceiptInfo | null = null) {
  const calls: string[] = [];
  const deps = {
    repo: {
      async update(id: number, input: unknown) { calls.push(`repo.update ${id} ${JSON.stringify(input)}`); },
      async setStatusIfSubmitted(id: number, status: string) { calls.push(`repo.setStatusIfSubmitted ${id} ${status}`); },
      async findReceiptInfo() { return info; },
      async setReceiptKey(id: number, key: string) { calls.push(`repo.setReceiptKey ${id} ${key}`); },
      async remove(id: number) { calls.push(`repo.remove ${id}`); },
    },
    receipts: {
      async put(key: string, _b: ArrayBuffer, type: string) { calls.push(`store.put ${key} ${type}`); },
      async get(key: string) { calls.push(`store.get ${key}`); return { body: new ReadableStream(), contentType: "image/png" }; },
      async delete(key: string) { calls.push(`store.delete ${key}`); },
    },
    clock: { now: () => 1700000000000 },
  } as unknown as ClaimDeps;
  return { deps, calls };
}

const body = { category: "transport", amount: 85000, claim_date: "2026-10-18", merchant: "Taksi Biru", note: "" };
const sales = { id: 2, role: "sales" } as const;
const admin = { id: 1, role: "admin" } as const;
const png = (n: number) => async () => new ArrayBuffer(n);

describe("updateClaim", () => {
  it("memvalidasi lalu memperbarui tanpa membaca klaim dulu", async () => {
    const { deps, calls } = fakes();
    expect(await updateClaim(deps, { id: 7, body })).toEqual({ ok: true });
    expect(calls).toEqual([`repo.update 7 ${JSON.stringify(body)}`]);
  });

  it("error validasi tidak menyentuh repository", async () => {
    const { deps, calls } = fakes();
    expect(await updateClaim(deps, { id: 7, body: { ...body, amount: 0 } })).toEqual({ ok: false, error: "amount harus bilangan bulat > 0 (rupiah)" });
    expect(calls).toEqual([]);
  });
});

describe("changeStatus", () => {
  it("menerima approved dan rejected", async () => {
    const { deps, calls } = fakes();
    await changeStatus(deps, { id: 3, status: "approved" });
    await changeStatus(deps, { id: 3, status: "rejected" });
    expect(calls).toEqual(["repo.setStatusIfSubmitted 3 approved", "repo.setStatusIfSubmitted 3 rejected"]);
  });

  it("menolak nilai lain tanpa menyentuh repository", async () => {
    const { deps, calls } = fakes();
    expect(await changeStatus(deps, { id: 3, status: "submitted" })).toEqual({ ok: false, error: "status tidak valid" });
    expect(calls).toEqual([]);
  });
});

describe("deleteClaim", () => {
  it("menghapus objek struk dulu, baru baris klaim", async () => {
    const { deps, calls } = fakes({ userId: 2, status: "submitted", receiptKey: "receipts/5-1.png" });
    await deleteClaim(deps, { id: 5 });
    expect(calls).toEqual(["store.delete receipts/5-1.png", "repo.remove 5"]);
  });

  it("tanpa struk, hanya baris yang dihapus", async () => {
    const { deps, calls } = fakes({ userId: 2, status: "submitted", receiptKey: null });
    await deleteClaim(deps, { id: 5 });
    expect(calls).toEqual(["repo.remove 5"]);
  });
});

describe("attachReceipt", () => {
  const info: ReceiptInfo = { userId: 2, status: "submitted", receiptKey: null };

  it("menyimpan dengan key dari Clock", async () => {
    const { deps, calls } = fakes(info);
    const r = await attachReceipt(deps, { viewer: sales, claimId: 7, contentType: "image/png", readBody: png(10) });
    expect(r).toEqual({ outcome: "ok", key: "receipts/7-1700000000000.png" });
    expect(calls).toEqual(["store.put receipts/7-1700000000000.png image/png", "repo.setReceiptKey 7 receipts/7-1700000000000.png"]);
  });

  it("JPEG memakai ekstensi jpg", async () => {
    const { deps } = fakes(info);
    const r = await attachReceipt(deps, { viewer: sales, claimId: 7, contentType: "image/jpeg", readBody: png(10) });
    expect(r).toEqual({ outcome: "ok", key: "receipts/7-1700000000000.jpg" });
  });

  it("bukan pemilik atau klaim tidak ada: not_found, admin pun tidak bisa", async () => {
    expect((await attachReceipt(fakes(info).deps, { viewer: admin, claimId: 7, contentType: "image/png", readBody: png(1) })).outcome).toBe("not_found");
    expect((await attachReceipt(fakes(null).deps, { viewer: sales, claimId: 7, contentType: "image/png", readBody: png(1) })).outcome).toBe("not_found");
  });

  it("bukan submitted: not_submitted", async () => {
    const { deps } = fakes({ ...info, status: "approved" });
    expect((await attachReceipt(deps, { viewer: sales, claimId: 7, contentType: "image/png", readBody: png(1) })).outcome).toBe("not_submitted");
  });

  it("tipe salah ditolak sebelum body dibaca", async () => {
    const { deps, calls } = fakes(info);
    let read = false;
    const r = await attachReceipt(deps, { viewer: sales, claimId: 7, contentType: "application/pdf", readBody: async () => { read = true; return new ArrayBuffer(1); } });
    expect(r.outcome).toBe("bad_type");
    expect(read).toBe(false);
    expect(calls).toEqual([]);
  });

  it("kosong atau lebih dari 5 MB: too_large, batas 5 MB masih lolos", async () => {
    const run = (n: number) => attachReceipt(fakes(info).deps, { viewer: sales, claimId: 7, contentType: "image/png", readBody: png(n) });
    expect((await run(0)).outcome).toBe("too_large");
    expect((await run(5 * 1024 * 1024 + 1)).outcome).toBe("too_large");
    expect((await run(5 * 1024 * 1024)).outcome).toBe("ok");
  });
});

describe("getReceipt", () => {
  const info: ReceiptInfo = { userId: 2, status: "submitted", receiptKey: "receipts/7-1.png" };

  it("pemilik dan admin boleh melihat", async () => {
    expect((await getReceipt(fakes(info).deps, { viewer: sales, claimId: 7 })).found).toBe(true);
    expect((await getReceipt(fakes(info).deps, { viewer: admin, claimId: 7 })).found).toBe(true);
  });

  it("sales lain, klaim tanpa struk, atau klaim tidak ada: tidak ditemukan", async () => {
    expect((await getReceipt(fakes(info).deps, { viewer: { id: 3, role: "sales" }, claimId: 7 })).found).toBe(false);
    expect((await getReceipt(fakes({ ...info, receiptKey: null }).deps, { viewer: sales, claimId: 7 })).found).toBe(false);
    expect((await getReceipt(fakes(null).deps, { viewer: sales, claimId: 7 })).found).toBe(false);
  });
});
