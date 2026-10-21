import { Hono } from "hono";
import { requireScope, requireToken, type AppEnv } from "./auth";
import { claimService } from "./claims";
import { currentMonth, rupiah } from "./claims/claim";

// API JSON untuk MCP dan client lain. Semua route wajib token pribadi.
// Handler hanya membaca request, memanggil service, dan membentuk response.
export const api = new Hono<AppEnv>();
api.use("*", requireToken);

api.get("/me", (c) => c.json(c.get("user")));

// Sales hanya melihat klaim miliknya sendiri. Admin melihat semua.
api.get("/claims", requireScope("claims:read"), async (c) => {
  const rows = await claimService(c.env).list(c.get("user"), c.req.query("status"), 50);
  const claims = rows.map((r) => ({
    id: r.id, category: r.category, amount: r.amount, claim_date: r.claim_date, merchant: r.merchant,
    note: r.note, status: r.status, has_receipt: r.receipt_key !== null ? 1 : 0,
  }));
  return c.json({ claims });
});

api.post("/claims", requireScope("claims:write"), async (c) => {
  const body = await c.req.json<Record<string, unknown>>().catch(() => ({}));
  const r = await claimService(c.env).create(c.get("user"), body);
  if (!r.ok) return c.json({ error: r.error, ...r.limit }, r.code);
  return c.json({ claim: r.value }, 201);
});

// Upload foto struk ke R2. Aturannya ada di ClaimService.attachReceipt.
api.put("/claims/:id/receipt", requireScope("claims:write"), async (c) => {
  const r = await claimService(c.env).attachReceipt(
    c.get("user"), Number(c.req.param("id")), c.req.header("Content-Type") ?? "", await c.req.arrayBuffer(),
  );
  if (!r.ok) return c.json({ error: r.error }, r.code);
  return c.json(r.value);
});

// Rekap sisa plafon semua sales untuk admin finance. Bulan default: bulan berjalan.
api.get("/limits/summary", requireScope("claims:read"), async (c) => {
  const month = c.req.query("month") ?? currentMonth();
  const { results: users } = await c.env.DB.prepare("SELECT id, name FROM users WHERE role = 'sales'").all<{ id: number; name: string }>();
  const { results: limits } = await c.env.DB.prepare("SELECT category, monthly_limit FROM claim_limits").all<{ category: string; monthly_limit: number }>();
  const rows = [];
  for (const u of users) {
    for (const l of limits) {
      const r = await c.env.DB.prepare(
        `SELECT SUM(amount) AS used FROM claims WHERE user_id = ${u.id} AND category = '${l.category}' AND claim_date LIKE '${month}%'`,
      ).first<{ used: number | null }>();
      const used = r?.used ?? 0;
      rows.push({ sales: u.name, category: l.category, limit: rupiah(l.monthly_limit), used: rupiah(used), remaining: rupiah(l.monthly_limit - used) });
    }
  }
  return c.json({ month, rows });
});

