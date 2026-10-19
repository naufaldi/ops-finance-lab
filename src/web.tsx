import { Hono } from "hono";
import type { Child } from "hono/jsx";
import { deleteCookie, setCookie } from "hono/cookie";
import { hashPassword, randomToken, requireSession, sha256, type AppEnv } from "./auth";
import { claimService } from "./claims";
import { CATEGORIES } from "./claims/claim";

export const web = new Hono<AppEnv>();

const rupiah = (n: number) => "Rp" + n.toLocaleString("id-ID");
const LABEL: Record<string, string> = { transport: "Transport", hotel: "Hotel", makan_klien: "Makan klien", lainnya: "Lainnya" };

const CSS = `
*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,sans-serif;background:#F5F7FB;color:#1D3D70}
header{background:#1D3D70;color:#fff;padding:12px 28px;display:flex;justify-content:space-between;align-items:center}
header b{font-size:17px}header nav a{color:#fff;margin-left:18px;text-decoration:none;font-size:14px}
main{max-width:980px;margin:24px auto;padding:0 20px}h1{font-size:22px;margin:0 0 14px}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;font-size:14px}
th{background:#F06634;color:#fff;text-align:left;padding:9px 10px}td{padding:9px 10px;border-top:1px solid #E6EAF2}
.pill{border-radius:12px;padding:2px 9px;font-size:12px;font-weight:600}
.submitted{background:#FFF3D6;color:#8A5A00}.approved{background:#E6F4EA;color:#1E6B34}.rejected{background:#FDE7E3;color:#B3261E}
form.inline{display:inline}button,.btn{background:#1D3D70;color:#fff;border:0;border-radius:7px;padding:6px 11px;font-size:13px;cursor:pointer;text-decoration:none}
button.ok{background:#2E7D32}button.no{background:#B3261E}button.ghost{background:#8A94A3}
.card{background:#fff;border-radius:10px;padding:18px;max-width:520px}label{display:block;font-size:13px;margin:10px 0 4px}
input,select{width:100%;padding:8px;border:1px solid #CBD3E1;border-radius:7px;font-size:14px}
.err{background:#FDE7E3;color:#B3261E;padding:8px 10px;border-radius:7px;margin-bottom:10px}
.token{font-family:monospace;background:#FFF3D6;padding:10px;border-radius:7px;word-break:break-all}
.muted{color:#6B7A90;font-size:13px}.top{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
`;

function Page(props: { title: string; user?: { name: string; role: string }; children: Child }) {
  return (
    <html lang="id">
      <head><meta charset="utf-8" /><title>{props.title} · Ops Finance</title><style>{CSS}</style></head>
      <body>
        <header>
          <b>Ops Finance · Klaim Biaya Sales</b>
          {props.user && (
            <nav>
              <span>{props.user.name} ({props.user.role})</span>
              <a href="/">Klaim</a><a href="/claims/new">Ajukan klaim</a><a href="/tokens">Token untuk Claude</a><a href="/logout">Keluar</a>
            </nav>
          )}
        </header>
        <main>{props.children}</main>
      </body>
    </html>
  );
}

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
  const results = await claimService(c.env).list(user, c.req.query("status"));
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
  const r = await claimService(c.env).create(c.get("user"), f);
  if (!r.ok) return c.html(<Page title="Ajukan klaim" user={c.get("user")}><h1>Ajukan klaim</h1><ClaimForm action="/claims/new" v={f} error={r.error} button="Simpan" /></Page>, 400);
  return c.redirect("/");
});

// Edit, ubah status, dan hapus: khusus admin
const adminOnly = async (c: any, next: any) => (c.get("user").role === "admin" ? next() : c.text("Khusus admin", 403));
web.get("/claims/:id/edit", adminOnly, async (c) => {
  const r = await claimService(c.env).findById(Number(c.req.param("id")));
  if (!r) return c.notFound();
  return c.html(<Page title="Edit klaim" user={c.get("user")}><h1>Edit klaim #{r.id}</h1><ClaimForm action={`/claims/${r.id}/edit`} v={r} button="Simpan perubahan" /></Page>);
});
web.post("/claims/:id/edit", adminOnly, async (c) => {
  const id = Number(c.req.param("id"));
  const f = await c.req.parseBody() as Record<string, unknown>;
  const r = await claimService(c.env).update(id, f);
  if (!r.ok) return c.html(<Page title="Edit klaim" user={c.get("user")}><h1>Edit klaim #{id}</h1><ClaimForm action={`/claims/${id}/edit`} v={f} error={r.error} button="Simpan perubahan" /></Page>, 400);
  return c.redirect("/");
});
web.post("/claims/:id/status", adminOnly, async (c) => {
  const r = await claimService(c.env).decide(Number(c.req.param("id")), String((await c.req.parseBody()).status));
  if (!r.ok) return c.text(r.error, r.code);
  return c.redirect("/");
});
web.post("/claims/:id/delete", adminOnly, async (c) => {
  await claimService(c.env).remove(Number(c.req.param("id")));
  return c.redirect("/");
});

// Foto struk dari R2: pemilik klaim atau admin
web.get("/receipts/:id", async (c) => {
  const obj = await claimService(c.env).receiptFor(c.get("user"), Number(c.req.param("id")));
  if (!obj) return c.notFound();
  return new Response(obj.body, { headers: { "Content-Type": obj.contentType } });
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
