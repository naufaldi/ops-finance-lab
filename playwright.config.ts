// E2E Web App lewat browser sungguhan. Jalankan: npm run test:e2e
// Server: D1 lokal dibuat ulang dari migrations setiap run, supaya data awal selalu sama.
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "*.e2e.ts",
  use: { baseURL: "http://127.0.0.1:8787", trace: "retain-on-failure" },
  webServer: {
    command: "rm -rf .wrangler/state && npm run db:migrate && npm run dev -- --port 8787",
    url: "http://127.0.0.1:8787/login",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
