// Smoke test: menjalankan server.ts lewat stdio dan memanggil Tool seperti Claude Code.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const root = new URL("..", import.meta.url).pathname;
const client = new Client({ name: "smoke-test", version: "0.1.0" });

const textOf = (r: any) => r.content.map((c: any) => c.text).join("");

before(async () => {
  execFileSync("npx", ["tsx", "scripts/seed.ts"], { cwd: root, stdio: "ignore" });
  await client.connect(new StdioClientTransport({ command: "npx", args: ["tsx", "server.ts"], cwd: root, stderr: "ignore" }));
});
after(() => client.close());

test("tools/list berisi tepat dua Tool baca", async () => {
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), ["get_device_status", "list_low_cash_atms"]);
  for (const t of tools) assert.equal(t.annotations?.readOnlyHint, true);
});

test("list_low_cash_atms JKT-SEL < 20% mengembalikan dua ATM", async () => {
  const r = await client.callTool({ name: "list_low_cash_atms", arguments: { thresholdPct: 20, region: "JKT-SEL" } });
  const rows = JSON.parse(textOf(r));
  assert.deepEqual(rows.map((x: any) => x.atm_id), ["JKT-SEL-002", "JKT-SEL-001"]);
  assert.deepEqual(rows.map((x: any) => x.cash_pct), [12, 15]);
});

test("get_device_status untuk ID yang tidak ada", async () => {
  const r: any = await client.callTool({ name: "get_device_status", arguments: { atmId: "XXX-999" } });
  assert.equal(r.isError, true);
  assert.equal(textOf(r), "ATM tidak ditemukan");
});

test("get_device_status menampilkan transaksi terakhir", async () => {
  const r = await client.callTool({ name: "get_device_status", arguments: { atmId: "JKT-SEL-002" } });
  const atm = JSON.parse(textOf(r));
  assert.equal(atm.location, "Stasiun Tebet");
  assert.equal(atm.last_txns.length, 3);
});

test("koneksi readOnly menolak query tulis", () => {
  const db = new DatabaseSync(new URL("../data/cash.db", import.meta.url).pathname, { readOnly: true });
  assert.throws(() => db.exec("DELETE FROM cash_txn"), /attempt to write a readonly database/);
  db.close();
});
