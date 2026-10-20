// Membuat data/cash.db berisi data dummy armada ATM.
// Jalankan ulang kapan saja: file lama dihapus dan dibuat ulang.
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, rmSync } from "node:fs";

const DB_PATH = new URL("../data/cash.db", import.meta.url).pathname;
mkdirSync(new URL("../data/", import.meta.url).pathname, { recursive: true });
rmSync(DB_PATH, { force: true });

const db = new DatabaseSync(DB_PATH);
db.exec(`
CREATE TABLE atm (
  atm_id        TEXT PRIMARY KEY,
  region        TEXT NOT NULL,
  location      TEXT NOT NULL,
  machine_type  TEXT NOT NULL CHECK (machine_type IN ('ATM', 'CRM')),
  status        TEXT NOT NULL CHECK (status IN ('online', 'offline', 'maintenance')),
  cash_capacity INTEGER NOT NULL,
  cash_balance  INTEGER NOT NULL,
  last_seen     TEXT NOT NULL
);
CREATE TABLE cash_txn (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  atm_id    TEXT NOT NULL REFERENCES atm(atm_id),
  txn_date  TEXT NOT NULL,
  txn_type  TEXT NOT NULL CHECK (txn_type IN ('tarik', 'setor', 'isi_ulang')),
  amount    INTEGER NOT NULL
);
`);

// Kapasitas dan saldo dalam rupiah. Persentase kas = cash_balance / cash_capacity.
const atms: [string, string, string, string, string, number, number, string][] = [
  ["JKT-SEL-001", "JKT-SEL", "Mall Blok M",            "ATM", "online",      800_000_000, 120_000_000, "2026-10-19T08:55:00+07:00"],
  ["JKT-SEL-002", "JKT-SEL", "Stasiun Tebet",          "CRM", "online",      800_000_000,  96_000_000, "2026-10-19T08:57:00+07:00"],
  ["JKT-SEL-003", "JKT-SEL", "Kantor Cabang Kemang",   "ATM", "online",      800_000_000, 520_000_000, "2026-10-19T08:50:00+07:00"],
  ["JKT-SEL-004", "JKT-SEL", "RS Fatmawati",           "ATM", "maintenance", 600_000_000, 300_000_000, "2026-10-18T16:10:00+07:00"],
  ["JKT-PST-001", "JKT-PST", "Stasiun Gambir",         "CRM", "online",    1_000_000_000, 140_000_000, "2026-10-19T08:58:00+07:00"],
  ["JKT-PST-002", "JKT-PST", "Thamrin City",           "ATM", "online",      800_000_000, 610_000_000, "2026-10-19T08:52:00+07:00"],
  ["BKS-001",     "BKS",     "Summarecon Bekasi",      "ATM", "offline",     600_000_000,  30_000_000, "2026-10-18T22:40:00+07:00"],
  ["BKS-002",     "BKS",     "Kantor Cabang Bekasi",   "CRM", "online",      800_000_000, 400_000_000, "2026-10-19T08:54:00+07:00"],
];
const insAtm = db.prepare("INSERT INTO atm VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
for (const a of atms) insAtm.run(...a);

const txns: [string, string, string, number][] = [
  ["JKT-SEL-001", "2026-10-17", "isi_ulang", 600_000_000],
  ["JKT-SEL-001", "2026-10-18", "tarik",     280_000_000],
  ["JKT-SEL-001", "2026-10-19", "tarik",     200_000_000],
  ["JKT-SEL-002", "2026-10-18", "tarik",     310_000_000],
  ["JKT-SEL-002", "2026-10-18", "setor",      46_000_000],
  ["JKT-SEL-002", "2026-10-19", "tarik",     140_000_000],
  ["JKT-SEL-003", "2026-10-18", "tarik",     180_000_000],
  ["JKT-PST-001", "2026-10-18", "tarik",     420_000_000],
  ["JKT-PST-001", "2026-10-18", "setor",      60_000_000],
  ["JKT-PST-002", "2026-10-19", "tarik",      90_000_000],
  ["BKS-001",     "2026-10-18", "tarik",     250_000_000],
  ["BKS-002",     "2026-10-18", "setor",      75_000_000],
];
const insTxn = db.prepare("INSERT INTO cash_txn (atm_id, txn_date, txn_type, amount) VALUES (?, ?, ?, ?)");
for (const t of txns) insTxn.run(...t);

const n = db.prepare("SELECT COUNT(*) AS n FROM atm").get() as { n: number };
const m = db.prepare("SELECT COUNT(*) AS n FROM cash_txn").get() as { n: number };
console.log(`cash.db dibuat: ${n.n} ATM, ${m.n} transaksi (data dummy) -> ${DB_PATH}`);
db.close();
