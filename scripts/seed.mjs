// Membuat ulang cash.db berisi data dummy armada ATM.
// Jalankan dari root project: npm run db:seed
import { DatabaseSync } from "node:sqlite";
import { rmSync } from "node:fs";

rmSync("cash.db", { force: true });
const db = new DatabaseSync("cash.db");

db.exec(`
CREATE TABLE atm (
  atm_id     TEXT PRIMARY KEY,
  region     TEXT NOT NULL,
  lokasi     TEXT NOT NULL,
  tipe       TEXT NOT NULL CHECK (tipe IN ('ATM', 'CRM')),
  status     TEXT NOT NULL CHECK (status IN ('online', 'offline', 'maintenance')),
  sisa_kas   INTEGER NOT NULL,
  kapasitas  INTEGER NOT NULL
);
CREATE TABLE cash_txn (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  atm_id  TEXT NOT NULL REFERENCES atm(atm_id),
  waktu   TEXT NOT NULL,
  jenis   TEXT NOT NULL CHECK (jenis IN ('tarik', 'setor', 'isi_ulang')),
  jumlah  INTEGER NOT NULL
);
`);

// Nominal dalam rupiah. Persentase kas = sisa_kas / kapasitas.
const atms = [
  ["ATM-JKT-001", "JKT-SEL", "Blok M Square",          "ATM", "online",       96_000_000, 800_000_000], // 12%
  ["ATM-JKT-002", "JKT-SEL", "Kantor Cabang Kemang",   "CRM", "online",      512_000_000, 800_000_000], // 64%
  ["ATM-JKT-003", "JKT-SEL", "Stasiun Tebet",          "ATM", "online",      136_000_000, 800_000_000], // 17%
  ["ATM-JKT-004", "JKT-SEL", "RS Fatmawati",           "ATM", "maintenance", 270_000_000, 600_000_000], // 45%
  ["ATM-JKT-101", "JKT-PST", "Stasiun Gambir",         "CRM", "online",      140_000_000, 1_000_000_000], // 14%
  ["ATM-JKT-102", "JKT-PST", "Thamrin City",           "ATM", "online",      608_000_000, 800_000_000], // 76%
  ["ATM-BKS-001", "BKS",     "Summarecon Bekasi",      "ATM", "offline",      30_000_000, 600_000_000], // 5%
  ["ATM-BKS-002", "BKS",     "Kantor Cabang Bekasi",   "CRM", "online",      400_000_000, 800_000_000], // 50%
];
const insAtm = db.prepare("INSERT INTO atm VALUES (?, ?, ?, ?, ?, ?, ?)");
for (const a of atms) insAtm.run(...a);

const txns = [
  ["ATM-JKT-001", "2026-10-17 06:30:00", "isi_ulang", 600_000_000],
  ["ATM-JKT-001", "2026-10-18 09:12:00", "tarik",     284_000_000],
  ["ATM-JKT-001", "2026-10-19 10:05:00", "tarik",     220_000_000],
  ["ATM-JKT-003", "2026-10-18 07:45:00", "tarik",     310_000_000],
  ["ATM-JKT-003", "2026-10-18 16:20:00", "setor",      46_000_000],
  ["ATM-JKT-003", "2026-10-19 08:10:00", "tarik",     150_000_000],
  ["ATM-JKT-002", "2026-10-18 12:00:00", "setor",      75_000_000],
  ["ATM-JKT-101", "2026-10-18 18:30:00", "tarik",     420_000_000],
  ["ATM-JKT-102", "2026-10-19 11:40:00", "tarik",      90_000_000],
  ["ATM-BKS-001", "2026-10-18 21:15:00", "tarik",     250_000_000],
  ["ATM-BKS-002", "2026-10-19 09:00:00", "setor",      60_000_000],
  ["ATM-JKT-004", "2026-10-17 14:25:00", "tarik",     110_000_000],
];
const insTxn = db.prepare("INSERT INTO cash_txn (atm_id, waktu, jenis, jumlah) VALUES (?, ?, ?, ?)");
for (const t of txns) insTxn.run(...t);

const n = db.prepare("SELECT COUNT(*) AS n FROM atm").get().n;
const m = db.prepare("SELECT COUNT(*) AS n FROM cash_txn").get().n;
db.close();
console.log(`cash.db dibuat: ${n} ATM, ${m} transaksi (data dummy)`);
