import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { DatabaseSync } from "node:sqlite";
import { z } from "zod";

const db = new DatabaseSync("cash.db", { readOnly: true });
const text = (data: unknown) =>
  ({ content: [{ type: "text" as const, text: JSON.stringify(data) }] });

function createServer() {
  const server = new McpServer({ name: "atm-fleet", version: "0.1.0" });

  server.registerTool("list_low_cash_atms", {
    description: "ATM dengan sisa kas di bawah ambang (persen) di satu region",
    inputSchema: z.object({ region: z.string(), thresholdPct: z.number().min(0).max(100) }),
  }, async ({ region, thresholdPct }) => text(db.prepare(
    `SELECT atm_id, lokasi, ROUND(sisa_kas * 100.0 / kapasitas) AS pct FROM atm
     WHERE region = ? AND sisa_kas * 100.0 / kapasitas < ? ORDER BY pct LIMIT 20`,
  ).all(region, thresholdPct)));

  server.registerTool("get_device_status", {
    description: "Status dan sisa kas satu ATM",
    inputSchema: z.object({ atmId: z.string() }),
  }, async ({ atmId }) => text(db.prepare(
    "SELECT atm_id, region, lokasi, status, sisa_kas FROM atm WHERE atm_id = ?",
  ).get(atmId) ?? "ATM tidak ditemukan"));

  return server;
}

serveStdio(createServer);
console.error("atm-fleet berjalan di stdio");
