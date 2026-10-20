"""atm-fleet versi Python (Lab 1a). Sama dengan src/index.ts, memakai SDK Python mcp 2.x.

Jalankan dari root project supaya cash.db ditemukan:
    python lab1a-python/server.py
"""
import json
import logging
import sqlite3

from mcp.server.mcpserver import MCPServer

logging.basicConfig(level=logging.INFO)  # log ke stderr, stdout dipakai JSON-RPC

db = sqlite3.connect("file:cash.db?mode=ro", uri=True, check_same_thread=False)
db.row_factory = sqlite3.Row
mcp = MCPServer("atm-fleet")


@mcp.tool(description="ATM dengan sisa kas di bawah ambang (persen) di satu region")
def list_low_cash_atms(region: str, thresholdPct: float) -> str:
    rows = db.execute(
        """SELECT atm_id, lokasi, ROUND(sisa_kas * 100.0 / kapasitas) AS pct FROM atm
           WHERE region = ? AND sisa_kas * 100.0 / kapasitas < ? ORDER BY pct LIMIT 20""",
        (region, max(0.0, min(100.0, thresholdPct))),
    ).fetchall()
    return json.dumps([dict(r) for r in rows])


@mcp.tool(description="Status dan sisa kas satu ATM")
def get_device_status(atmId: str) -> str:
    row = db.execute(
        "SELECT atm_id, region, lokasi, status, sisa_kas FROM atm WHERE atm_id = ?", (atmId,)
    ).fetchone()
    return json.dumps(dict(row) if row else "ATM tidak ditemukan")


if __name__ == "__main__":
    logging.info("atm-fleet (Python) berjalan di stdio")
    mcp.run()
