import { Hono } from "hono";
import { requireScope, requireToken, type AppEnv } from "./auth";
import { attachReceipt, createClaim, listClaimSummaries, makeDeps } from "./claims";

// API JSON untuk MCP dan client lain. Semua route wajib token pribadi.
export const api = new Hono<AppEnv>();
api.use("*", requireToken);

api.get("/me", (c) => c.json(c.get("user")));

// Sales hanya melihat klaim miliknya sendiri. Admin melihat semua.
api.get("/claims", requireScope("claims:read"), async (c) => {
  const claims = await listClaimSummaries(makeDeps(c.env), { viewer: c.get("user"), status: c.req.query("status") });
  return c.json({ claims });
});

api.post("/claims", requireScope("claims:write"), async (c) => {
  const body = await c.req.json<Record<string, unknown>>().catch(() => ({}));
  const r = await createClaim(makeDeps(c.env), { viewer: c.get("user"), body });
  if (!r.ok) return c.json({ error: r.error }, 400);
  return c.json({ claim: r.claim }, 201);
});

const RECEIPT_ERRORS = {
  not_found: [404, "klaim tidak ditemukan"],
  not_submitted: [409, "struk hanya bisa diunggah untuk klaim berstatus submitted"],
  bad_type: [415, "struk harus image/png atau image/jpeg"],
  too_large: [413, "ukuran struk 1 byte sampai 5 MB"],
} as const;

// Upload foto struk ke R2. Hanya pemilik klaim, hanya PNG/JPEG, maksimal 5 MB.
api.put("/claims/:id/receipt", requireScope("claims:write"), async (c) => {
  const id = Number(c.req.param("id"));
  const r = await attachReceipt(makeDeps(c.env), {
    viewer: c.get("user"), claimId: id, contentType: c.req.header("Content-Type") ?? "", readBody: () => c.req.arrayBuffer(),
  });
  if (r.outcome !== "ok") { const [status, error] = RECEIPT_ERRORS[r.outcome]; return c.json({ error }, status); }
  return c.json({ claim_id: id, receipt_key: r.key });
});
