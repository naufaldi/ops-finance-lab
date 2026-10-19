// E2E plafon klaim: sales Rina mengajukan klaim lewat form Web App (docs/PRD.md AC1, AC2, AC6).
import { expect, test } from "@playwright/test";

const rupiah = (n: number) => "Rp" + n.toLocaleString("id-ID");

test("klaim melewati plafon ditolak, klaim sebesar sisa plafon diterima", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("rina@ops.test");
  await page.getByLabel("Password").fill("demo123");
  await page.getByRole("button", { name: "Masuk" }).click();

  // AC6: tabel sisa plafon bulan berjalan
  const heading = page.getByRole("heading", { name: /Sisa plafon \d{4}-\d{2}/ });
  await expect(heading).toBeVisible();
  const month = (await heading.textContent())!.replace("Sisa plafon ", "").trim();
  const row = page.getByRole("row", { name: /Transport/ }).first();
  const remaining = Number((await row.getByRole("cell").nth(3).textContent())!.replace(/\D/g, ""));
  expect(remaining).toBeGreaterThan(0);

  const submit = async (amount: number) => {
    await page.goto("/claims/new");
    await page.getByLabel("Kategori").selectOption("transport");
    await page.getByLabel("Nominal (rupiah)").fill(String(amount));
    await page.getByLabel("Tanggal").fill(`${month}-01`);
    await page.getByLabel("Merchant").fill("Taksi E2E");
    await page.getByRole("button", { name: "Simpan" }).click();
  };

  // AC1: sisa + 1 ditolak dengan pesan sisa plafon
  await submit(remaining + 1);
  await expect(page.locator(".err")).toContainText(`Sisa plafon ${rupiah(remaining)}`);

  // AC2: tepat sebesar sisa diterima, sisa jadi Rp0
  await submit(remaining);
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("row", { name: /Transport/ }).first().getByRole("cell").nth(3)).toHaveText("Rp0");
});
