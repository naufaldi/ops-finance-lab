// Validasi input klaim. Dipakai oleh Web App dan API, jadi aturannya ada di satu tempat.
import { CATEGORIES, type Category, type ClaimInput } from "./claim";

export function validateClaim(body: Record<string, unknown>): { ok: true; value: ClaimInput } | { ok: false; error: string } {
  const amount = Number(body.amount);
  if (!Number.isInteger(amount) || amount <= 0) return { ok: false, error: "amount harus bilangan bulat > 0 (rupiah)" };
  if (amount > 50_000_000) return { ok: false, error: "amount di atas Rp50.000.000, ajukan lewat finance" };

  const category = String(body.category ?? "");
  if (!(CATEGORIES as readonly string[]).includes(category)) return { ok: false, error: `category harus salah satu: ${CATEGORIES.join(", ")}` };

  const claimDate = String(body.claim_date ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(claimDate) || Number.isNaN(Date.parse(claimDate))) return { ok: false, error: "claim_date harus format YYYY-MM-DD" };

  const merchant = String(body.merchant ?? "").trim();
  if (merchant.length < 2 || merchant.length > 100) return { ok: false, error: "merchant wajib diisi (2-100 karakter)" };

  const note = String(body.note ?? "").trim().slice(0, 300);
  return { ok: true, value: { category: category as Category, amount, claim_date: claimDate, merchant, note } };
}
