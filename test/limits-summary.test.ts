import { beforeEach, expect, it } from "vitest";
import app from "../src/index";
import type { Env } from "../src/auth";
import { createTestEnv, createToken } from "./helpers/env";

let env: Env;
beforeEach(() => { env = createTestEnv(); });

it("GET /api/limits/summary mengembalikan rekap", async () => {
  const res = await app.request("/api/limits/summary?month=2026-10", { headers: { Authorization: `Bearer ${await createToken(env, 1)}` } }, env);
  expect(res.status).toBe(200);
  const body = await res.json() as { rows: unknown[] };
  expect(body.rows.length).toBeGreaterThan(0);
});
