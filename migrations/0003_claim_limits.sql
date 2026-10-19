-- Plafon klaim per kategori per sales per bulan (docs/PRD.md, docs/TRD.md bagian 3). Nominal INTEGER rupiah.
CREATE TABLE claim_limits (
  category      TEXT PRIMARY KEY CHECK (category IN ('transport', 'hotel', 'makan_klien', 'lainnya')),
  monthly_limit INTEGER NOT NULL CHECK (monthly_limit > 0)
);

INSERT INTO claim_limits (category, monthly_limit) VALUES
  ('transport', 1500000),
  ('makan_klien', 2000000),
  ('hotel', 3000000),
  ('lainnya', 500000);

-- Query total bulanan: WHERE user_id = ? AND category = ? AND substr(claim_date, 1, 7) = ?
CREATE INDEX idx_claims_user_category_date ON claims (user_id, category, claim_date);
