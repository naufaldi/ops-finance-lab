// Golden file: bentuk lengkap response GET /api/claims untuk data seed. Dipakai MCP list_my_claims.
// Jika test ini gagal, perbaiki code. Update golden file (vitest -u) hanya jika perubahan response memang disengaja dan disebut di PR.
import { expect, it } from "vitest";
import app from "../src/index";
import { createTestEnv, createToken } from "./helpers/env";

it("GET /api/claims milik Rina sama dengan golden file", async () => {
  const env = createTestEnv();
  const auth = { Authorization: `Bearer ${await createToken(env, 2)}` };
  await app.request("/api/claims/2/receipt", { method: "PUT", headers: { ...auth, "Content-Type": "image/png" }, body: new Uint8Array([1]) }, env);
  const body = await (await app.request("/api/claims", { headers: auth }, env)).json();
  await expect(JSON.stringify(body, null, 2) + "\n").toMatchFileSnapshot("./__golden__/api-claims-rina.json");
});
