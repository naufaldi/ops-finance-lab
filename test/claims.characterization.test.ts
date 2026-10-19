// Characterization test: mengunci perilaku fitur klaim SEBELUM refactor.
// Test ini harus tetap hijau tanpa diubah setelah code dipindah ke layer baru.
import { beforeEach, describe, expect, it } from "vitest";
import app from "../src/index";
import type { Env } from "../src/auth";
import { claimRow, createTestEnv, createToken } from "./helpers/env";

let env: Env;
beforeEach(() => { env = createTestEnv(); });

const api = (path: string, token: string, init: RequestInit = {}) =>
  app.request(path, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } }, env);

async function login(email: string): Promise<string> {
  const res = await app.request("/login", { method: "POST", body: new URLSearchParams({ email, password: "demo123" }) }, env);
  expect(res.status).toBe(302);
  return (res.headers.get("set-cookie") ?? "").split(";")[0];
}
const form = (path: string, cookie: string, data: Record<string, string>) =>
  app.request(path, { method: "POST", headers: { Cookie: cookie }, body: new URLSearchParams(data) }, env);

const valid = { category: "transport", amount: 120000, claim_date: "2026-10-20", merchant: "Taksi Biru", note: "Visit cabang" };

describe("API /api/claims", () => {
  it("sales hanya melihat klaim miliknya", async () => {
    const res = await api("/api/claims", await createToken(env, 2));
    const { claims } = await res.json() as { claims: { id: number }[] };
    expect(claims.map((c) => c.id).sort()).toEqual([1, 2]);
  });

  it("admin melihat semua klaim, bisa difilter status", async () => {
    const token = await createToken(env, 1);
    const all = await (await api("/api/claims", token)).json() as { claims: unknown[] };
    expect(all.claims).toHaveLength(3);
    const sub = await (await api("/api/claims?status=submitted", token)).json() as { claims: unknown[] };
    expect(sub.claims).toHaveLength(2);
  });

  it("membuat klaim valid: 201, status submitted, milik pemilik token", async () => {
    const res = await api("/api/claims", await createToken(env, 2), { method: "POST", body: JSON.stringify(valid), headers: { "Content-Type": "application/json" } });
    expect(res.status).toBe(201);
    const { claim } = await res.json() as { claim: { id: number; status: string } };
    expect(claim.status).toBe("submitted");
    expect((await claimRow(env, claim.id))?.user_id).toBe(2);
  });

  it("menolak nominal 0 dengan 400", async () => {
    const res = await api("/api/claims", await createToken(env, 2), { method: "POST", body: JSON.stringify({ ...valid, amount: 0 }), headers: { "Content-Type": "application/json" } });
    expect(res.status).toBe(400);
  });

  it("tanpa token: 401", async () => {
    expect((await app.request("/api/claims", {}, env)).status).toBe(401);
  });

  it("upload struk ke klaim milik orang lain: 404", async () => {
    const res = await api("/api/claims/3/receipt", await createToken(env, 2), { method: "PUT", body: new Uint8Array([1, 2, 3]), headers: { "Content-Type": "image/png" } });
    expect(res.status).toBe(404);
  });

  it("upload struk ke klaim sendiri: tersimpan", async () => {
    const res = await api("/api/claims/2/receipt", await createToken(env, 2), { method: "PUT", body: new Uint8Array([1, 2, 3]), headers: { "Content-Type": "image/png" } });
    expect(res.status).toBe(200);
    expect((await claimRow(env, 2))?.receipt_key).toMatch(/^receipts\/2-/);
  });
});

describe("Web App klaim", () => {
  it("sales mengajukan klaim lewat form, lalu klaim muncul di daftar", async () => {
    const cookie = await login("rina@ops.test");
    expect((await form("/claims/new", cookie, { ...valid, amount: "120000", merchant: "Grab Kemang" })).status).toBe(302);
    const html = await (await app.request("/", { headers: { Cookie: cookie } }, env)).text();
    expect(html).toContain("Grab Kemang");
    expect(html).not.toContain("Hotel Dago Indah"); // klaim Budi tidak terlihat
  });

  it("form dengan nominal 0 ditolak 400", async () => {
    const cookie = await login("rina@ops.test");
    expect((await form("/claims/new", cookie, { ...valid, amount: "0" })).status).toBe(400);
  });

  it("admin approve klaim submitted; klaim yang sudah approved tidak bisa ditolak", async () => {
    const cookie = await login("admin@ops.test");
    await form("/claims/2/status", cookie, { status: "approved" });
    expect((await claimRow(env, 2))?.status).toBe("approved");
    await form("/claims/2/status", cookie, { status: "rejected" });
    expect((await claimRow(env, 2))?.status).toBe("approved");
  });

  it("sales tidak bisa mengubah status: 403", async () => {
    const cookie = await login("rina@ops.test");
    expect((await form("/claims/2/status", cookie, { status: "approved" })).status).toBe(403);
    expect((await claimRow(env, 2))?.status).toBe("submitted");
  });

  it("admin edit dan hapus klaim", async () => {
    const cookie = await login("admin@ops.test");
    await form("/claims/3/edit", cookie, { ...valid, amount: "700000", merchant: "Hotel Dago" });
    expect((await claimRow(env, 3))?.amount).toBe(700000);
    await form("/claims/3/delete", cookie, {});
    expect(await claimRow(env, 3)).toBeNull();
  });

  it("foto struk: pemilik dan admin bisa melihat, sales lain 404", async () => {
    await api("/api/claims/2/receipt", await createToken(env, 2), { method: "PUT", body: new Uint8Array([1, 2, 3]), headers: { "Content-Type": "image/png" } });
    const admin = await app.request("/receipts/2", { headers: { Cookie: await login("admin@ops.test") } }, env);
    expect(admin.status).toBe(200);
    expect(admin.headers.get("content-type")).toBe("image/png");
    const rina = await app.request("/receipts/2", { headers: { Cookie: await login("rina@ops.test") } }, env);
    expect(rina.status).toBe(200);
    const budi = await app.request("/receipts/2", { headers: { Cookie: await login("budi@ops.test") } }, env);
    expect(budi.status).toBe(404);
  });
});
