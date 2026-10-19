-- Data dummy. Password semua user: demo123 (hash SHA-256, hanya untuk lab)
INSERT INTO users (id, name, email, role, password_hash) VALUES
  (1, 'Dewi (Finance)', 'admin@ops.test', 'admin', '92a8a716d1f26705935c5538462973930cabad28b29cf6c1a7fd2023719ae866'),
  (2, 'Rina (Sales JKT)', 'rina@ops.test', 'sales', '92a8a716d1f26705935c5538462973930cabad28b29cf6c1a7fd2023719ae866'),
  (3, 'Budi (Sales BDG)', 'budi@ops.test', 'sales', '92a8a716d1f26705935c5538462973930cabad28b29cf6c1a7fd2023719ae866');

INSERT INTO claims (user_id, category, amount, claim_date, merchant, note, status) VALUES
  (2, 'transport', 85000, '2026-10-14', 'Taksi Biru', 'Kunjungan klien Bank A', 'approved'),
  (2, 'makan_klien', 420000, '2026-10-15', 'Resto Padang Sederhana', 'Makan siang dengan klien', 'submitted'),
  (3, 'hotel', 650000, '2026-10-16', 'Hotel Dago Indah', 'Demo mesin di Bandung', 'submitted');
