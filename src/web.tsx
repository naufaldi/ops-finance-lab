import { Hono } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { adminOnly, hashPassword, randomToken, requireSession, sha256, type AppEnv } from "./auth";
import { CATEGORIES } from "./claims/domain/claim";
import { validateClaim } from "./claims/domain/validate-claim";
import { createClaim, listClaimsWithSales, makeDeps } from "./claims";
import { Page, rupiah } from "./ui/page";

export const web = new Hono<AppEnv>();

const LABEL: Record<string, string> = { transport: "Transport", hotel: "Hotel", makan_klien: "Makan klien", lainnya: "Lainnya" };

// ---------- login ----------
web.get("/login", (c) => c.html(
  <Page title="Login">
    <div class="card">
      <h1>Login</h1>
      {c.req.query("e") && <div class="err">Email atau password salah.</div>}
      <form method="post" action="/login">
        <label>Email</label><input name="email" value="admin@ops.test" />
        <label>Password</label><input name="password" type="password" />
        <p><button>Masuk</button></p>
      </form>
      <p class="muted">Akun dummy: admin@ops.test, rina@ops.test, budi@ops.test. Password: demo123.</p>
    </div>
  </Page>,
));

web.post("/login", async (c) => {
  const f = await c.req.parseBody();
  const user = await c.env.DB.prepare("SELECT id FROM users WHERE email = ? AND password_hash = ?")
    .bind(String(f.email ?? ""), await hashPassword(String(f.password ?? ""))).first<{ id: number }>();
  if (!user) return c.redirect("/login?e=1");
  const sid = randomToken("s_");
  await c.env.DB.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, datetime('now', '+8 hours'))").bind(sid, user.id).run();
  setCookie(c, "sid", sid, { httpOnly: true, sameSite: "Lax", path: "/" });
  return c.redirect("/");
});

web.get("/logout", async (c) => { deleteCookie(c, "sid"); return c.redirect("/login"); });

// ---------- halaman yang wajib login ----------
web.use("/", requireSession);
web.use("/claims/*", requireSession);
web.use("/tokens", requireSession);
web.use("/tokens/*", requireSession);
web.use("/receipts/*", requireSession);

// Daftar klaim: admin melihat semua, sales hanya miliknya
web.get("/", async (c) => {
  const user = c.get("user");
  const results = await listClaimsWithSales(makeDeps(c.env), { viewer: user, status: c.req.query("status") });
  const total = results.reduce((s, r) => s + (r.status !== "rejected" ? r.amount : 0), 0);
  return c.html(
    <Page title="Klaim" user={user}>
      <div class="top">
        <h1>{user.role === "admin" ? "Semua klaim" : "Klaim saya"}</h1>
        <span class="muted">Filter: <a href="/">semua</a> · <a href="/?status=submitted">submitted</a> · <a href="/?status=approved">approved</a> · <a href="/?status=rejected">rejected</a></span>
      </div>
      <table>
        <tr><th>#</th><th>Tanggal</th>{user.role === "admin" && <th>Sales</th>}<th>Kategori</th><th>Merchant</th><th>Nominal</th><th>Struk</th><th>Status</th>{user.role === "admin" && <th>Aksi</th>}</tr>
        {results.map((r) => (
          <tr>
            <td>{r.id}</td><td>{r.claim_date}</td>{user.role === "admin" && <td>{r.sales}</td>}
            <td>{LABEL[r.category]}</td><td>{r.merchant}</td><td>{rupiah(r.amount)}</td>
            <td>{r.receipt_key ? <a href={`/receipts/${r.id}`} target="_blank">lihat</a> : <span class="muted">belum</span>}</td>
            <td><span class={`pill ${r.status}`}>{r.status}</span></td>
            {user.role === "admin" && (
              <td>
                {r.status === "submitted" && <>
                  <form class="inline" method="post" action={`/claims/${r.id}/status`}><input type="hidden" name="status" value="approved" /><button class="ok">Approve</button></form>{" "}
                  <form class="inline" method="post" action={`/claims/${r.id}/status`}><input type="hidden" name="status" value="rejected" /><button class="no">Tolak</button></form>{" "}
                </>}
                <a class="btn" href={`/claims/${r.id}/edit`}>Edit</a>{" "}
                <form class="inline" method="post" action={`/claims/${r.id}/delete`}><button class="ghost">Hapus</button></form>
              </td>
            )}
          </tr>
        ))}
      </table>
      <p class="muted">{results.length} klaim · total (tanpa yang ditolak) {rupiah(total)}</p>
    </Page>,
  );
});

function ClaimForm(props: { action: string; v?: Record<string, any>; error?: string; button: string }) {
  const v = props.v ?? {};
  return (
    <div class="card">
      {props.error && <div class="err">{props.error}</div>}
      <form method="post" action={props.action}>
        <label>Kategori</label>
        <select name="category">{CATEGORIES.map((k) => <option value={k} selected={v.category === k}>{LABEL[k]}</option>)}</select>
        <label>Nominal (rupiah)</label><input name="amount" value={v.amount ?? ""} />
        <label>Tanggal</label><input name="claim_date" type="date" value={v.claim_date ?? ""} />
        <label>Merchant</label><input name="merchant" value={v.merchant ?? ""} />
        <label>Catatan</label><input name="note" value={v.note ?? ""} />
        <p><button>{props.button}</button></p>
      </form>
    </div>
  );
}

web.get("/claims/new", (c) => c.html(<Page title="Ajukan klaim" user={c.get("user")}><h1>Ajukan klaim</h1><ClaimForm action="/claims/new" button="Simpan" /></Page>));
web.post("/claims/new", async (c) => {
  const f = await c.req.parseBody() as Record<string, unknown>;
  const r = await createClaim(makeDeps(c.env), { viewer: c.get("user"), body: f });
  if (!r.ok) return c.html(<Page title="Ajukan klaim" user={c.get("user")}><h1>Ajukan klaim</h1><ClaimForm action="/claims/new" v={f} error={r.error} button="Simpan" /></Page>, 400);
  return c.redirect("/");
});

// Edit, ubah status, dan hapus: khusus admin
web.get("/claims/:id/edit", adminOnly, async (c) => {
  const r = await c.env.DB.prepare("SELECT * FROM claims WHERE id = ?").bind(Number(c.req.param("id"))).first();
  if (!r) return c.notFound();
  return c.html(<Page title="Edit klaim" user={c.get("user")}><h1>Edit klaim #{r.id}</h1><ClaimForm action={`/claims/${r.id}/edit`} v={r} button="Simpan perubahan" /></Page>);
});
web.post("/claims/:id/edit", adminOnly, async (c) => {
  const id = Number(c.req.param("id"));
  const f = await c.req.parseBody() as Record<string, unknown>;
  const v = validateClaim(f);
  if (!v.ok) return c.html(<Page title="Edit klaim" user={c.get("user")}><h1>Edit klaim #{id}</h1><ClaimForm action={`/claims/${id}/edit`} v={f} error={v.error} button="Simpan perubahan" /></Page>, 400);
  const x = v.value;
  await c.env.DB.prepare("UPDATE claims SET category = ?, amount = ?, claim_date = ?, merchant = ?, note = ? WHERE id = ?")
    .bind(x.category, x.amount, x.claim_date, x.merchant, x.note, id).run();
  return c.redirect("/");
});
web.post("/claims/:id/status", adminOnly, async (c) => {
  const status = String((await c.req.parseBody()).status);
  if (!["approved", "rejected"].includes(status)) return c.text("status tidak valid", 400);
  await c.env.DB.prepare("UPDATE claims SET status = ? WHERE id = ? AND status = 'submitted'").bind(status, Number(c.req.param("id"))).run();
  return c.redirect("/");
});
web.post("/claims/:id/delete", adminOnly, async (c) => {
  const id = Number(c.req.param("id"));
  const r = await c.env.DB.prepare("SELECT receipt_key FROM claims WHERE id = ?").bind(id).first<{ receipt_key: string | null }>();
  if (r?.receipt_key) await c.env.RECEIPTS.delete(r.receipt_key);
  await c.env.DB.prepare("DELETE FROM claims WHERE id = ?").bind(id).run();
  return c.redirect("/");
});

// Foto struk dari R2: pemilik klaim atau admin
web.get("/receipts/:id", async (c) => {
  const user = c.get("user");
  const r = await c.env.DB.prepare("SELECT user_id, receipt_key FROM claims WHERE id = ?").bind(Number(c.req.param("id"))).first<{ user_id: number; receipt_key: string | null }>();
  if (!r?.receipt_key || (user.role !== "admin" && r.user_id !== user.id)) return c.notFound();
  const obj = await c.env.RECEIPTS.get(r.receipt_key);
  if (!obj) return c.notFound();
  return new Response(obj.body, { headers: { "Content-Type": obj.httpMetadata?.contentType ?? "application/octet-stream" } });
});

// ---------- token pribadi untuk Claude (MCP) ----------
web.get("/tokens", async (c) => {
  const user = c.get("user");
  const { results } = await c.env.DB.prepare(
    `SELECT t.id, t.name, t.scopes, t.expires_at, t.revoked, u.name AS owner FROM api_tokens t JOIN users u ON u.id = t.user_id
     WHERE ? = 'admin' OR t.user_id = ? ORDER BY t.id DESC`,
  ).bind(user.role, user.id).all<Record<string, any>>();
  return c.html(
    <Page title="Token" user={user}>
      <h1>Token untuk Claude</h1>
      <p class="muted">Token dipakai MCP ops-finance untuk memanggil API atas nama kita. Scope: claims:read claims:write. Berlaku 30 hari.</p>
      <form method="post" action="/tokens"><input name="name" value="Claude Code di laptop" style="max-width:320px" /> <button>Buat token</button></form>
      <br />
      <table>
        <tr><th>#</th><th>Nama</th>{user.role === "admin" && <th>Pemilik</th>}<th>Scope</th><th>Berlaku sampai</th><th>Status</th><th></th></tr>
        {results.map((t) => (
          <tr>
            <td>{t.id}</td><td>{t.name}</td>{user.role === "admin" && <td>{t.owner}</td>}<td>{t.scopes}</td><td>{t.expires_at}</td>
            <td>{t.revoked ? <span class="pill rejected">dicabut</span> : <span class="pill approved">aktif</span>}</td>
            <td>{!t.revoked && <form class="inline" method="post" action={`/tokens/${t.id}/revoke`}><button class="no">Cabut</button></form>}</td>
          </tr>
        ))}
      </table>
    </Page>,
  );
});

web.post("/tokens", async (c) => {
  const user = c.get("user");
  const name = String((await c.req.parseBody()).name ?? "token").slice(0, 60);
  const token = randomToken("of_");
  await c.env.DB.prepare(
    "INSERT INTO api_tokens (user_id, name, token_hash, scopes, expires_at) VALUES (?, ?, ?, 'claims:read claims:write', datetime('now', '+30 days'))",
  ).bind(user.id, name, await sha256(token)).run();
  return c.html(
    <Page title="Token baru" user={user}>
      <h1>Token baru</h1>
      <p>Salin sekarang. Token ini hanya tampil sekali.</p>
      <div class="token">{token}</div>
      <p class="muted">Simpan di env laptop: export OPS_FINANCE_TOKEN="{token.slice(0, 7)}…"</p>
      <a class="btn" href="/tokens">Kembali</a>
    </Page>,
  );
});

web.post("/tokens/:id/revoke", async (c) => {
  const user = c.get("user");
  await c.env.DB.prepare("UPDATE api_tokens SET revoked = 1 WHERE id = ? AND (? = 'admin' OR user_id = ?)")
    .bind(Number(c.req.param("id")), user.role, user.id).run();
  return c.redirect("/tokens");
});
