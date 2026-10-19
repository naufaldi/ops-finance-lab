import { Hono } from "hono";
import { requireScope, requireToken, type AppEnv } from "./auth";
import { validateClaim } from "./validate";

// API JSON untuk MCP dan client lain. Semua route wajib token pribadi.
export const api = new Hono<AppEnv>();
api.use("*", requireToken);

api.get("/me", (c) => c.json(c.get("user")));

// Sales hanya melihat klaim miliknya sendiri. Admin melihat semua.
api.get("/claims", requireScope("claims:read"), async (c) => {
  const user = c.get("user");
  const status = c.req.query("status");
  let sql = `SELECT id, category, amount, claim_date, merchant, note, status,
               receipt_key IS NOT NULL AS has_receipt FROM claims WHERE 1 = 1`;
  const params: unknown[] = [];
  if (user.role !== "admin") { sql += " AND user_id = ?"; params.push(user.id); }
  if (status) { sql += " AND status = ?"; params.push(status); }
  sql += " ORDER BY claim_date DESC LIMIT 50";
  const { results } = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json({ claims: results });
});

api.post("/claims", requireScope("claims:write"), async (c) => {
  const body = await c.req.json<Record<string, unknown>>().catch(() => ({}));
  const v = validateClaim(body);
  if (!v.ok) return c.json({ error: v.error }, 400);
  const { category, amount, claim_date, merchant, note } = v.value;
  const row = await c.env.DB.prepare(
    `INSERT INTO claims (user_id, category, amount, claim_date, merchant, note)
     VALUES (?, ?, ?, ?, ?, ?) RETURNING id, status`,
  ).bind(c.get("user").id, category, amount, claim_date, merchant, note).first();
  return c.json({ claim: row }, 201);
});

// Upload foto struk ke R2. Hanya pemilik klaim, hanya PNG/JPEG, maksimal 5 MB.
api.put("/claims/:id/receipt", requireScope("claims:write"), async (c) => {
  const id = Number(c.req.param("id"));
  const claim = await c.env.DB.prepare("SELECT id, user_id, status FROM claims WHERE id = ?").bind(id).first<{ user_id: number; status: string }>();
  if (!claim || claim.user_id !== c.get("user").id) return c.json({ error: "klaim tidak ditemukan" }, 404);
  if (claim.status !== "submitted") return c.json({ error: "struk hanya bisa diunggah untuk klaim berstatus submitted" }, 409);
  const type = c.req.header("Content-Type") ?? "";
  if (!["image/png", "image/jpeg"].includes(type)) return c.json({ error: "struk harus image/png atau image/jpeg" }, 415);
  const body = await c.req.arrayBuffer();
  if (body.byteLength === 0 || body.byteLength > 5 * 1024 * 1024) return c.json({ error: "ukuran struk 1 byte sampai 5 MB" }, 413);
  const key = `receipts/${id}-${Date.now()}.${type === "image/png" ? "png" : "jpg"}`;
  await c.env.RECEIPTS.put(key, body, { httpMetadata: { contentType: type } });
  await c.env.DB.prepare("UPDATE claims SET receipt_key = ? WHERE id = ?").bind(key, id).run();
  return c.json({ claim_id: id, receipt_key: key });
});
