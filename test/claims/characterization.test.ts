// Characterization test (TRD langkah A0): mengunci behavior alur klaim apa adanya,
// termasuk bug yang sudah tercatat (F-3, F-4, F-8, F-9). Jangan diubah selama refactoring bagian A.
import { beforeEach, describe, expect, it, vi } from "vitest";
import app from "../../src/index";
import type { Env } from "../../src/auth";
import { claimRow, createTestEnv, createToken, loginAs } from "../helpers/env";

// Seed: 1 = Rina transport approved, 2 = Rina makan_klien submitted, 3 = Budi hotel submitted.
const ADMIN = 1, RINA = 2, BUDI = 3;
const valid = { category: "transport", amount: 85000, claim_date: "2026-12-05", merchant: "Taksi Biru", note: "uji" };
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

let env: Env;
beforeEach(() => { env = createTestEnv(); });

const apiReq = (path: string, token: string, init: RequestInit = {}) =>
  app.request(path, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers as object) } }, env);
const postJson = (token: string, body: unknown) =>
  apiReq("/api/claims", token, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const putReceipt = (token: string, id: number, body: BodyInit, type = "image/png") =>
  apiReq(`/api/claims/${id}/receipt`, token, { method: "PUT", headers: { "Content-Type": type }, body });
const web = async (userId: number, path: string, form?: Record<string, string>) => {
  const cookie = await loginAs(env, userId);
  return app.request(path, form
    ? { method: "POST", headers: { Cookie: cookie, "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(form).toString() }
    : { headers: { Cookie: cookie } }, env);
};
const count = async () => (await env.DB.prepare("SELECT COUNT(*) AS n FROM claims").first<{ n: number }>())!.n;
const lastClaim = async () => (await env.DB.prepare("SELECT * FROM claims ORDER BY id DESC LIMIT 1").first<Record<string, any>>())!;
const insertClaim = (userId: number, date: string, status = "submitted", merchant = "Merchant X") =>
  env.DB.prepare("INSERT INTO claims (user_id, category, amount, claim_date, merchant, status) VALUES (?, 'lainnya', 1000, ?, ?, ?)")
    .bind(userId, date, merchant, status).run();

describe("POST /api/claims", () => {
  it("201 dengan {claim:{id,status:'submitted'}} dan user_id dari token walau body mengirim lain", async () => {
    const token = await createToken(env, RINA);
    const res = await postJson(token, { ...valid, user_id: BUDI });
    expect(res.status).toBe(201);
    const { claim } = await res.json() as any;
    expect(claim).toEqual({ id: expect.any(Number), status: "submitted" });
    const row = await claimRow(env, claim.id);
    expect(row).toMatchObject({ user_id: RINA, category: "transport", amount: 85000, claim_date: "2026-12-05", merchant: "Taksi Biru", note: "uji" });
  });

  it.each([
    ["nominal 0", { amount: 0 }, "amount harus bilangan bulat > 0 (rupiah)"],
    ["kategori salah", { category: "hiburan" }, "category harus salah satu: transport, hotel, makan_klien, lainnya"],
    ["tanggal salah", { claim_date: "05/12/2026" }, "claim_date harus format YYYY-MM-DD"],
    ["di atas Rp50.000.000", { amount: 50_000_001 }, "amount di atas Rp50.000.000, ajukan lewat finance"],
  ])("400 {error} untuk %s dan tidak menyimpan baris", async (_n, patch, error) => {
    const before = await count();
    const res = await postJson(await createToken(env, RINA), { ...valid, ...patch });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error });
    expect(await count()).toBe(before);
  });

  it("401 tanpa token dan dengan token tidak dikenal", async () => {
    const none = await app.request("/api/claims", { method: "POST", body: "{}" }, env);
    expect(none.status).toBe(401);
    expect(await none.json()).toEqual({ error: "token wajib" });
    const bad = await postJson("of_salah", valid);
    expect(bad.status).toBe(401);
  });

  it("403 untuk token tanpa scope claims:write", async () => {
    const token = "of_readonly";
    const { sha256 } = await import("../../src/auth");
    await env.DB.prepare("INSERT INTO api_tokens (user_id, name, token_hash, scopes, expires_at) VALUES (?, 'ro', ?, 'claims:read', datetime('now', '+1 day'))")
      .bind(RINA, await sha256(token)).run();
    const res = await postJson(token, valid);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "token tidak punya scope claims:write" });
  });
});

describe("GET /api/claims", () => {
  it("sales hanya melihat miliknya, admin melihat semua", async () => {
    const rina = await (await apiReq("/api/claims", await createToken(env, RINA))).json() as any;
    expect(rina.claims.map((c: any) => c.id).sort()).toEqual([1, 2]);
    const admin = await (await apiReq("/api/claims", await createToken(env, ADMIN))).json() as any;
    expect(admin.claims.map((c: any) => c.id).sort()).toEqual([1, 2, 3]);
  });

  it("filter status", async () => {
    const res = await (await apiReq("/api/claims?status=approved", await createToken(env, ADMIN))).json() as any;
    expect(res.claims.map((c: any) => c.id)).toEqual([1]);
  });

  it("has_receipt bernilai 0 atau 1, bukan boolean; bentuk baris tetap", async () => {
    await env.DB.prepare("UPDATE claims SET receipt_key = 'receipts/2-1.png' WHERE id = 2").run();
    const { claims } = await (await apiReq("/api/claims", await createToken(env, RINA))).json() as any;
    expect(claims.find((c: any) => c.id === 1).has_receipt).toBe(0);
    expect(claims.find((c: any) => c.id === 2).has_receipt).toBe(1);
    expect(Object.keys(claims[0]).sort()).toEqual(["amount", "category", "claim_date", "has_receipt", "id", "merchant", "note", "status"]);
  });

  it("maksimal 50 baris, urut claim_date DESC", async () => {
    for (let i = 0; i < 55; i++) await insertClaim(RINA, `2027-01-${String((i % 28) + 1).padStart(2, "0")}`);
    const { claims } = await (await apiReq("/api/claims", await createToken(env, RINA))).json() as any;
    expect(claims).toHaveLength(50);
    const dates = claims.map((c: any) => c.claim_date);
    expect(dates).toEqual([...dates].sort().reverse());
  });
});

describe("PUT /api/claims/:id/receipt", () => {
  it("404 untuk klaim milik orang lain dan klaim yang tidak ada", async () => {
    const token = await createToken(env, RINA);
    expect((await putReceipt(token, 3, PNG)).status).toBe(404);
    const res = await putReceipt(token, 999, PNG);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "klaim tidak ditemukan" });
  });

  it("409 bila klaim bukan submitted", async () => {
    const res = await putReceipt(await createToken(env, RINA), 1, PNG);
    expect(res.status).toBe(409);
  });

  it("415 untuk tipe selain png/jpeg", async () => {
    const res = await putReceipt(await createToken(env, RINA), 2, PNG, "image/gif");
    expect(res.status).toBe(415);
  });

  it("413 untuk body kosong dan di atas 5 MB", async () => {
    const token = await createToken(env, RINA);
    expect((await putReceipt(token, 2, new Uint8Array(0))).status).toBe(413);
    expect((await putReceipt(token, 2, new Uint8Array(5 * 1024 * 1024 + 1))).status).toBe(413);
    expect((await claimRow(env, 2))!.receipt_key).toBeNull();
  });

  it("sukses: receipt_key tersimpan dan objek ada di R2 dengan content type", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1700000000000);
    const res = await putReceipt(await createToken(env, RINA), 2, PNG);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ claim_id: 2, receipt_key: "receipts/2-1700000000000.png" });
    expect((await claimRow(env, 2))!.receipt_key).toBe("receipts/2-1700000000000.png");
    const obj = await env.RECEIPTS.get("receipts/2-1700000000000.png") as any;
    expect(obj.httpMetadata.contentType).toBe("image/png");
    vi.restoreAllMocks();
  });

  it("F-9: upload ulang menyisakan objek lama di R2", async () => {
    const token = await createToken(env, RINA);
    const now = vi.spyOn(Date, "now");
    now.mockReturnValue(1000);
    await putReceipt(token, 2, PNG);
    now.mockReturnValue(2000);
    await putReceipt(token, 2, PNG, "image/jpeg");
    expect((await claimRow(env, 2))!.receipt_key).toBe("receipts/2-2000.jpg");
    expect(await env.RECEIPTS.get("receipts/2-1000.png")).not.toBeNull();
    vi.restoreAllMocks();
  });
});

describe("POST /claims/new", () => {
  const form = { category: "hotel", amount: "650000", claim_date: "2026-12-10", merchant: "Hotel Dago Indah", note: "demo" };

  it("redirect ke / dan menyimpan baris dengan user_id sesi", async () => {
    const res = await web(RINA, "/claims/new", form);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/");
    expect(await lastClaim()).toMatchObject({ user_id: RINA, category: "hotel", amount: 650000, status: "submitted", merchant: "Hotel Dago Indah" });
  });

  it("400 dengan form terisi ulang dan div.err, tanpa baris baru", async () => {
    const before = await count();
    const res = await web(RINA, "/claims/new", { ...form, amount: "0" });
    expect(res.status).toBe(400);
    const html = await res.text();
    expect(html).toContain('<div class="err">amount harus bilangan bulat &gt; 0 (rupiah)</div>');
    expect(html).toContain('value="Hotel Dago Indah"');
    expect(html).toContain('value="2026-12-10"');
    expect(await count()).toBe(before);
  });
});

describe("POST /claims/:id/edit", () => {
  const edit = { category: "lainnya", amount: "99000", claim_date: "2026-12-11", merchant: "Toko Baru", note: "revisi" };

  it("403 untuk sales dan baris tidak berubah", async () => {
    const res = await web(RINA, "/claims/2/edit", edit);
    expect(res.status).toBe(403);
    expect((await claimRow(env, 2))!.merchant).toBe("Resto Padang Sederhana");
  });

  it("F-4: admin bisa mengubah klaim submitted, approved, dan rejected; status tidak berubah", async () => {
    await env.DB.prepare("UPDATE claims SET status = 'rejected' WHERE id = 3").run();
    for (const [id, status] of [[2, "submitted"], [1, "approved"], [3, "rejected"]] as const) {
      const res = await web(ADMIN, `/claims/${id}/edit`, edit);
      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe("/");
      expect(await claimRow(env, id)).toMatchObject({ category: "lainnya", amount: 99000, merchant: "Toko Baru", note: "revisi", status });
    }
  });

  it("F-3: id tidak ada redirect ke / tanpa error dan tanpa baris baru", async () => {
    const before = await count();
    const res = await web(ADMIN, "/claims/999/edit", edit);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/");
    expect(await count()).toBe(before);
  });

  it("400 saat tidak valid: form terisi ulang, div.err, baris tidak berubah", async () => {
    const res = await web(ADMIN, "/claims/2/edit", { ...edit, merchant: "x" });
    expect(res.status).toBe(400);
    const html = await res.text();
    expect(html).toContain('<div class="err">merchant wajib diisi (2-100 karakter)</div>');
    expect(html).toContain('value="99000"');
    expect((await claimRow(env, 2))!.merchant).toBe("Resto Padang Sederhana");
  });
});

describe("POST /claims/:id/status", () => {
  it("submitted menjadi approved atau rejected", async () => {
    expect((await web(ADMIN, "/claims/2/status", { status: "approved" })).status).toBe(302);
    expect((await claimRow(env, 2))!.status).toBe("approved");
    await web(ADMIN, "/claims/3/status", { status: "rejected" });
    expect((await claimRow(env, 3))!.status).toBe("rejected");
  });

  it("klaim yang bukan submitted tidak berubah", async () => {
    const res = await web(ADMIN, "/claims/1/status", { status: "rejected" });
    expect(res.status).toBe(302);
    expect((await claimRow(env, 1))!.status).toBe("approved");
  });

  it("nilai status selain approved/rejected memberi 400", async () => {
    const res = await web(ADMIN, "/claims/2/status", { status: "submitted" });
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("status tidak valid");
    expect((await web(ADMIN, "/claims/2/status", { status: "apa" })).status).toBe(400);
    expect((await claimRow(env, 2))!.status).toBe("submitted");
  });

  it("403 untuk sales", async () => {
    expect((await web(RINA, "/claims/2/status", { status: "approved" })).status).toBe(403);
    expect((await claimRow(env, 2))!.status).toBe("submitted");
  });
});

describe("POST /claims/:id/delete", () => {
  it("menghapus baris dan objek R2", async () => {
    await env.RECEIPTS.put("receipts/2-1.png", new ArrayBuffer(4));
    await env.DB.prepare("UPDATE claims SET receipt_key = 'receipts/2-1.png' WHERE id = 2").run();
    const res = await web(ADMIN, "/claims/2/delete", {});
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/");
    expect(await claimRow(env, 2)).toBeNull();
    expect(await env.RECEIPTS.get("receipts/2-1.png")).toBeNull();
  });

  it("F-8: klaim approved juga bisa dihapus", async () => {
    await web(ADMIN, "/claims/1/delete", {});
    expect(await claimRow(env, 1)).toBeNull();
  });

  it("403 untuk sales dan baris tetap ada", async () => {
    expect((await web(RINA, "/claims/2/delete", {})).status).toBe(403);
    expect(await claimRow(env, 2)).not.toBeNull();
  });
});

describe("GET / (daftar klaim Web)", () => {
  it("sales hanya melihat miliknya", async () => {
    const html = await (await web(RINA, "/")).text();
    expect(html).toContain("Klaim saya");
    expect(html).toContain("Taksi Biru");
    expect(html).toContain("Resto Padang Sederhana");
    expect(html).not.toContain("Hotel Dago Indah");
    expect(html).toContain("2 klaim");
  });

  it("admin melihat semua, dengan kolom Sales dan Aksi", async () => {
    const html = await (await web(ADMIN, "/")).text();
    expect(html).toContain("Semua klaim");
    for (const m of ["Taksi Biru", "Resto Padang Sederhana", "Hotel Dago Indah"]) expect(html).toContain(m);
    expect(html).toContain("<th>Sales</th>");
    expect(html).toContain("3 klaim");
  });

  it("filter status, dan urutan claim_date DESC lalu id DESC", async () => {
    const html = await (await web(ADMIN, "/?status=approved")).text();
    expect(html).toContain("Taksi Biru");
    expect(html).not.toContain("Hotel Dago Indah");
    await insertClaim(RINA, "2026-10-15", "submitted", "Tie A");
    await insertClaim(RINA, "2026-10-15", "submitted", "Tie B");
    const all = await (await web(ADMIN, "/")).text();
    const pos = (s: string) => all.indexOf(s);
    expect(pos("Tie B")).toBeLessThan(pos("Tie A"));
    expect(pos("Tie A")).toBeLessThan(pos("Resto Padang Sederhana"));
    expect(pos("Resto Padang Sederhana")).toBeLessThan(pos("Taksi Biru"));
  });

  it("total tidak menghitung klaim rejected", async () => {
    await env.DB.prepare("UPDATE claims SET status = 'rejected' WHERE id = 2").run();
    const html = await (await web(RINA, "/")).text();
    expect(html).toContain("total (tanpa yang ditolak) Rp85.000");
  });

  it("redirect ke /login tanpa session", async () => {
    const res = await app.request("/", {}, env);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/login");
  });
});

describe("GET /receipts/:id", () => {
  beforeEach(async () => {
    await env.RECEIPTS.put("receipts/2-1.png", PNG.buffer as ArrayBuffer, { httpMetadata: { contentType: "image/png" } });
    await env.DB.prepare("UPDATE claims SET receipt_key = 'receipts/2-1.png' WHERE id = 2").run();
  });

  it("pemilik dan admin menerima gambar dengan content type", async () => {
    for (const uid of [RINA, ADMIN]) {
      const res = await web(uid, "/receipts/2");
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("image/png");
    }
  });

  it("struk milik orang lain 404", async () => {
    expect((await web(BUDI, "/receipts/2")).status).toBe(404);
  });

  it("404 bila klaim tanpa struk, tidak ada, atau objek R2 hilang", async () => {
    expect((await web(RINA, "/receipts/1")).status).toBe(404);
    expect((await web(ADMIN, "/receipts/999")).status).toBe(404);
    await env.RECEIPTS.delete("receipts/2-1.png");
    expect((await web(RINA, "/receipts/2")).status).toBe(404);
  });
});
