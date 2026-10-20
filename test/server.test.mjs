// Smoke test: menjalankan build/index.js melalui stdio dan memanggil Tool seperti Claude Code.
// Jalankan dengan: npm test (build dulu, lalu test). cash.db tidak diubah oleh test ini.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const root = fileURLToPath(new URL("..", import.meta.url));
const client = new Client({ name: "smoke-test", version: "0.1.0" });
const textOf = (r) => r.content.map((c) => c.text).join("");

before(async () => {
  await client.connect(new StdioClientTransport({
    command: process.execPath, args: ["build/index.js"], cwd: root, stderr: "ignore",
  }));
});
after(() => client.close());

test("tools/list berisi list_low_cash_atms dan get_device_status", async () => {
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), ["get_device_status", "list_low_cash_atms"]);
});

test("list_low_cash_atms JKT-SEL < 20% sama dengan slide 32", async () => {
  const r = await client.callTool({ name: "list_low_cash_atms", arguments: { region: "JKT-SEL", thresholdPct: 20 } });
  assert.deepEqual(JSON.parse(textOf(r)), [
    { atm_id: "ATM-JKT-001", lokasi: "Blok M Square", pct: 12 },
    { atm_id: "ATM-JKT-003", lokasi: "Stasiun Tebet", pct: 17 },
  ]);
});

test("get_device_status untuk ID yang tidak ada", async () => {
  const r = await client.callTool({ name: "get_device_status", arguments: { atmId: "ATM-XXX-999" } });
  assert.equal(JSON.parse(textOf(r)), "ATM tidak ditemukan");
});

test("get_device_status untuk ATM-JKT-003", async () => {
  const r = await client.callTool({ name: "get_device_status", arguments: { atmId: "ATM-JKT-003" } });
  assert.deepEqual(JSON.parse(textOf(r)), {
    atm_id: "ATM-JKT-003", region: "JKT-SEL", lokasi: "Stasiun Tebet", status: "online", sisa_kas: 136000000,
  });
});

test("koneksi readOnly menolak query tulis (slide 34, lapis 1)", () => {
  const db = new DatabaseSync(fileURLToPath(new URL("../cash.db", import.meta.url)), { readOnly: true });
  assert.throws(() => db.exec("DELETE FROM cash_txn"), /attempt to write a readonly database/);
  db.close();
});
