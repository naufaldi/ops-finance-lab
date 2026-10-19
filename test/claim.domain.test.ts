// Aturan domain plafon tanpa D1. Test ini ditulis saat Lab 6 (debugging) untuk mengunci dua bug yang ditemukan.
import { describe, expect, it } from "vitest";
import { checkLimit, currentMonth } from "../src/claims/claim";

describe("checkLimit", () => {
  it("batas inklusif: nominal sama dengan sisa diterima, lebih 1 rupiah ditolak", () => {
    expect(checkLimit(1_500_000, 85_000, 1_415_000)).toEqual({ ok: true, remaining: 1_415_000 });
    expect(checkLimit(1_500_000, 85_000, 1_415_001)).toEqual({ ok: false, remaining: 1_415_000 });
  });
});

describe("currentMonth (WIB, UTC+7)", () => {
  it("1 Nov 06:30 WIB = 31 Okt 23:30 UTC sudah bulan November", () => {
    expect(currentMonth(new Date("2026-10-31T23:30:00Z"))).toBe("2026-11");
  });
  it("31 Okt 23:59 WIB masih Oktober", () => {
    expect(currentMonth(new Date("2026-10-31T16:59:00Z"))).toBe("2026-10");
  });
});
