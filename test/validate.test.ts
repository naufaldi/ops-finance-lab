import { describe, expect, it } from "vitest";
import { validateClaim } from "../src/validate";

const base = { category: "transport", amount: 85000, claim_date: "2026-10-18", merchant: "Taksi Biru", note: "" };

describe("validateClaim", () => {
  it("menerima klaim yang valid", () => {
    expect(validateClaim(base)).toEqual({ ok: true, value: base });
  });
  it("menolak nominal 0 atau negatif", () => {
    expect(validateClaim({ ...base, amount: 0 }).ok).toBe(false);
    expect(validateClaim({ ...base, amount: -5000 }).ok).toBe(false);
  });
  it("menolak nominal desimal", () => {
    expect(validateClaim({ ...base, amount: 85000.5 }).ok).toBe(false);
  });
  it("menolak kategori di luar daftar", () => {
    expect(validateClaim({ ...base, category: "hiburan" }).ok).toBe(false);
  });
  it("menolak tanggal yang bukan YYYY-MM-DD", () => {
    expect(validateClaim({ ...base, claim_date: "18/10/2026" }).ok).toBe(false);
  });
  it("menolak merchant kosong", () => {
    expect(validateClaim({ ...base, merchant: " " }).ok).toBe(false);
  });
});
