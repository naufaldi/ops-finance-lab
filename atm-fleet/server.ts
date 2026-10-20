import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { z } from "zod";
const DB_PATH = process.env.ATM_FLEET_DB ?? fileURLToPath(new URL("./data/cash.db", import.meta.url));
const db = new DatabaseSync(DB_PATH, { readOnly: true });
const text = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });
function createServer() {
  const server = new McpServer({ name: "atm-fleet", version: "0.1.0" });
  server.registerTool("list_low_cash_atms", {
    description: "Daftar ATM/CRM dengan kas di bawah persentase tertentu dari kapasitas. Filter region opsional, misalnya JKT-SEL.",
    inputSchema: z.object({ thresholdPct: z.number().min(1).max(100), region: z.string().optional() }),
    annotations: { readOnlyHint: true },
  }, async ({ thresholdPct, region }) => text(db.prepare(
    `SELECT atm_id, region, location, status, cash_balance, cash_capacity, ROUND(100.0 * cash_balance / cash_capacity, 1) AS cash_pct
     FROM atm WHERE 100.0 * cash_balance / cash_capacity < ? AND (? IS NULL OR region = ?) ORDER BY cash_pct LIMIT 20`,
  ).all(thresholdPct, region ?? null, region ?? null)));
  server.registerTool("get_device_status", {
    description: "Status satu ATM/CRM: lokasi, status online, saldo kas, dan 5 transaksi terakhir.",
    inputSchema: z.object({ atmId: z.string() }),
    annotations: { readOnlyHint: true },
  }, async ({ atmId }) => {
    const atm = db.prepare("SELECT * FROM atm WHERE atm_id = ?").get(atmId);
    if (!atm) return { content: [{ type: "text" as const, text: "ATM tidak ditemukan" }], isError: true };
    const txns = db.prepare("SELECT txn_date, txn_type, amount FROM cash_txn WHERE atm_id = ? ORDER BY id DESC LIMIT 5").all(atmId);
    return text({ ...atm, last_txns: txns });
  });
  return server;
}
serveStdio(createServer);
console.error(`atm-fleet MCP berjalan di stdio, DB read-only: ${DB_PATH}`);
