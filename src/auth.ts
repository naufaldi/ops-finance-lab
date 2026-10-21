import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";

export type Env = { DB: D1Database; RECEIPTS: R2Bucket };
export type User = { id: number; name: string; email: string; role: "admin" | "sales" };
export type AppEnv = { Bindings: Env; Variables: { user: User; scopes: string[] } };

export async function sha256(text: string): Promise<string> {
  const data = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(data)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Hash password versi lab. Untuk produksi pakai algoritma khusus password (bcrypt, scrypt, Argon2).
export const hashPassword = (password: string) => sha256(`ops-finance:${password}`);

export function randomToken(prefix: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return prefix + [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Web App: login lewat cookie session
export async function requireSession(c: Context<AppEnv>, next: Next) {
  const sid = getCookie(c, "sid");
  if (!sid) return c.redirect("/login");
  const user = await c.env.DB.prepare(
    `SELECT u.id, u.name, u.email, u.role FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.id = ? AND s.expires_at > datetime('now')`,
  ).bind(sid).first<User>();
  if (!user) return c.redirect("/login");
  c.set("user", user);
  await next();
}

// Edit, ubah status, dan hapus klaim: khusus admin
export const adminOnly = async (c: any, next: any) => (c.get("user").role === "admin" ? next() : c.text("Khusus admin", 403));

// API: token pribadi di header Authorization: Bearer <token>
export async function requireToken(c: Context<AppEnv>, next: Next) {
  const header = c.req.header("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return c.json({ error: "token wajib" }, 401);
  const row = await c.env.DB.prepare(
    `SELECT u.id, u.name, u.email, u.role, t.scopes FROM api_tokens t JOIN users u ON u.id = t.user_id
     WHERE t.token_hash = ? AND t.revoked = 0 AND t.expires_at > datetime('now')`,
  ).bind(await sha256(token)).first<User & { scopes: string }>();
  if (!row) return c.json({ error: "token tidak valid, kedaluwarsa, atau dicabut" }, 401);
  const { scopes, ...user } = row;
  c.set("user", user);
  c.set("scopes", scopes.split(" "));
  await next();
}

export function requireScope(scope: string) {
  return async (c: Context<AppEnv>, next: Next) => {
    if (!c.get("scopes").includes(scope)) return c.json({ error: `token tidak punya scope ${scope}` }, 403);
    await next();
  };
}
