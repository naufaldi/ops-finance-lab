import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { z } from "zod";

const BASE = process.env.OPS_FINANCE_URL ?? "http://127.0.0.1:8787";
const TOKEN = process.env.OPS_FINANCE_TOKEN ?? "";

async function call(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, ...(init.headers ?? {}) },
  });
  const body = await res.text();
  return { content: [{ type: "text" as const, text: `HTTP ${res.status} ${body}` }], isError: !res.ok };
}

function createServer() {
  const server = new McpServer({ name: "ops-finance", version: "0.1.0" });

  server.registerTool("list_my_claims", {
    description: "Daftar klaim biaya milik user pemilik token. Filter status opsional.",
    inputSchema: z.object({ status: z.enum(["submitted", "approved", "rejected"]).optional() }),
    annotations: { readOnlyHint: true },
  }, async ({ status }) => call(status ? `/claims?status=${status}` : "/claims"));

  server.registerTool("create_claim", {
    description: "Ajukan klaim baru atas nama pemilik token. Nominal dalam rupiah.",
    inputSchema: z.object({
      category: z.enum(["transport", "hotel", "makan_klien", "lainnya"]),
      amount: z.number().int().positive(),
      claim_date: z.string().describe("YYYY-MM-DD"),
      merchant: z.string(),
      note: z.string().optional(),
    }),
    _meta: { "anthropic/requiresUserInteraction": true },
  }, async (input) => call("/claims", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
  }));

  server.registerTool("upload_receipt", {
    description: "Unggah foto struk (PNG/JPEG) dari path file lokal ke klaim milik user.",
    inputSchema: z.object({ claim_id: z.number().int(), path: z.string() }),
    _meta: { "anthropic/requiresUserInteraction": true },
  }, async ({ claim_id, path }) => {
    const ext = extname(path).toLowerCase();
    const type = ext === ".png" ? "image/png" : [".jpg", ".jpeg"].includes(ext) ? "image/jpeg" : "";
    if (!type) return { content: [{ type: "text" as const, text: "File struk harus .png, .jpg, atau .jpeg" }], isError: true };
    const data = await readFile(path);
    return call(`/claims/${claim_id}/receipt`, { method: "PUT", headers: { "Content-Type": type }, body: data });
  });

  return server;
}

serveStdio(createServer);
console.error(`ops-finance MCP berjalan di stdio, API: ${BASE}`);
