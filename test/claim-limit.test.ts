// Test fitur plafon, ditulis dari acceptance criteria di docs/PRD.md SEBELUM fitur dibuat.
// Angka dari PRD: transport Rp1.500.000 per sales per bulan. Seed: Rina sudah punya transport Rp85.000 (Oktober, approved).
import { beforeEach, describe, expect, it } from "vitest";
import app from "../src/index";
import type { Env } from "../src/auth";
import { claimRow, createTestEnv, createToken } from "./helpers/env";

let env: Env;
beforeEach(() => { env = createTestEnv(); });

const postClaim = async (userId: number, body: Record<string, unknown>) =>
  app.request("/api/claims", {
    method: "POST",
    headers: { Authorization: `Bearer ${await createToken(env, userId)}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }, env);

async function login(email: string): Promise<string> {
  const res = await app.request("/login", { method: "POST", body: new URLSearchParams({ email, password: "demo123" }) }, env);
  return (res.headers.get("set-cookie") ?? "").split(";")[0];
}
const form = (path: string, cookie: string, data: Record<string, string>) =>
  app.request(path, { method: "POST", headers: { Cookie: cookie }, body: new URLSearchParams(data) }, env);

const transport = (amount: number, claim_date = "2026-10-20") =>
  ({ category: "transport", amount, claim_date, merchant: "Taksi Biru", note: "Visit cabang" });

describe("Plafon klaim (docs/PRD.md)", () => {
  it("AC1 API: klaim yang melewati plafon ditolak 422 dengan detail sisa plafon", async () => {
    const res = await postClaim(2, transport(1_415_001));
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ category: "transport", limit: 1_500_000, used: 85_000, remaining: 1_415_000 });
  });

  it("AC1 Web App: form yang melewati plafon ditolak 400 dengan pesan sisa plafon", async () => {
    const res = await form("/claims/new", await login("rina@ops.test"), { ...transport(1_415_001), amount: "1415001" });
    expect(res.status).toBe(400);
    expect(await res.text()).toContain("Rp1.415.000");
  });

  it("AC2: klaim tepat sama dengan sisa plafon diterima (batas inklusif)", async () => {
    expect((await postClaim(2, transport(1_415_000))).status).toBe(201);
    expect((await postClaim(2, transport(1))).status).toBe(422);
  });

  it("AC3: klaim rejected tidak mengurangi sisa plafon", async () => {
    await env.DB.prepare("UPDATE claims SET status = 'rejected' WHERE id = 1").bind().run();
    expect((await postClaim(2, transport(1_500_000))).status).toBe(201);
  });

  it("bulan dihitung dari claim_date: klaim bulan lain tidak dihitung", async () => {
    expect((await postClaim(2, transport(1_500_000, "2026-11-01"))).status).toBe(201);
  });

  it("plafon dihitung per sales: klaim Rina tidak mengurangi plafon Budi", async () => {
    expect((await postClaim(3, transport(1_500_000))).status).toBe(201);
  });

  it("AC5: admin edit klaim, nilai lama klaim itu tidak ikut dihitung", async () => {
    const cookie = await login("admin@ops.test");
    // Klaim #1 (Rp85.000) diedit jadi Rp1.500.000: total bulan itu = 1.500.000, masih boleh.
    expect((await form("/claims/1/edit", cookie, { ...transport(1_500_000, "2026-10-14"), amount: "1500000" })).status).toBe(302);
    expect((await claimRow(env, 1))?.amount).toBe(1_500_000);
    // Klaim baru Rp1 setelah itu melewati plafon.
    expect((await postClaim(2, transport(1))).status).toBe(422);
  });

  it("AC6: halaman Klaim saya menampilkan sisa plafon bulan berjalan per kategori", async () => {
    const html = await (await app.request("/?month=2026-10", { headers: { Cookie: await login("rina@ops.test") } }, env)).text();
    expect(html).toContain("Sisa plafon 2026-10");
    expect(html).toContain("Rp1.415.000"); // transport: 1.500.000 - 85.000
    expect(html).toContain("Rp1.580.000"); // makan_klien: 2.000.000 - 420.000
  });
});
