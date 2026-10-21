import type { Child } from "hono/jsx";

export const rupiah = (n: number) => "Rp" + n.toLocaleString("id-ID");

export const CSS = `
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

export function Page(props: { title: string; user?: { name: string; role: string }; children: Child }) {
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
