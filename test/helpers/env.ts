/// <reference types="node" />
// Env palsu untuk test: D1 di atas node:sqlite (in-memory) dan R2 di atas Map.
// Skema dan seed diambil dari folder migrations, sama dengan yang dipakai wrangler.
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { sha256, type Env } from "../../src/auth";

export function createTestEnv(): Env {
  const db = new DatabaseSync(":memory:");
  for (const f of ["0001_init.sql", "0002_seed.sql"]) {
    db.exec(readFileSync(new URL(`../../migrations/${f}`, import.meta.url), "utf8"));
  }
  const DB = {
    prepare(sql: string) {
      const stmt = db.prepare(sql);
      let args: any[] = [];
      const s = {
        bind(...a: unknown[]) { args = a.map((v) => (typeof v === "boolean" ? Number(v) : v)); return s; },
        async all() { return { results: stmt.all(...args) }; },
        async first() { return stmt.get(...args) ?? null; },
        async run() { const r = stmt.run(...args); return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; },
      };
      return s;
    },
  } as unknown as D1Database;

  const files = new Map<string, { body: ArrayBuffer; contentType?: string }>();
  const RECEIPTS = {
    async put(key: string, body: ArrayBuffer, opts?: { httpMetadata?: { contentType?: string } }) { files.set(key, { body, contentType: opts?.httpMetadata?.contentType }); },
    async get(key: string) { const f = files.get(key); return f ? { body: f.body, httpMetadata: { contentType: f.contentType } } : null; },
    async delete(key: string) { files.delete(key); },
  } as unknown as R2Bucket;

  return { DB, RECEIPTS };
}

// Buat token pribadi langsung di DB, seperti tombol "Buat token" di Web App.
export async function createToken(env: Env, userId: number): Promise<string> {
  const token = `of_test_${userId}_${Math.random().toString(16).slice(2)}`;
  await env.DB.prepare(
    "INSERT INTO api_tokens (user_id, name, token_hash, scopes, expires_at) VALUES (?, 'test', ?, 'claims:read claims:write', datetime('now', '+1 day'))",
  ).bind(userId, await sha256(token)).run();
  return token;
}

export async function claimRow(env: Env, id: number) {
  return env.DB.prepare("SELECT * FROM claims WHERE id = ?").bind(id).first<Record<string, any>>();
}

// Buat session langsung di DB, seperti POST /login. Mengembalikan header Cookie untuk app.request.
export async function loginAs(env: Env, userId: number): Promise<string> {
  const sid = `s_test_${userId}_${Math.random().toString(16).slice(2)}`;
  await env.DB.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, datetime('now', '+1 day'))").bind(sid, userId).run();
  return `sid=${sid}`;
}
