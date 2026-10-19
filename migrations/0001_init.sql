-- Skema aplikasi klaim biaya Ops Sales (data dummy)
CREATE TABLE users (
  id            INTEGER PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'sales')),
  password_hash TEXT NOT NULL
);

CREATE TABLE sessions (
  id         TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL
);

CREATE TABLE api_tokens (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  name       TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  scopes     TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE claims (
  id          INTEGER PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  category    TEXT NOT NULL CHECK (category IN ('transport', 'hotel', 'makan_klien', 'lainnya')),
  amount      INTEGER NOT NULL CHECK (amount > 0),
  claim_date  TEXT NOT NULL,
  merchant    TEXT NOT NULL,
  note        TEXT NOT NULL DEFAULT '',
  receipt_key TEXT,
  status      TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'rejected')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
