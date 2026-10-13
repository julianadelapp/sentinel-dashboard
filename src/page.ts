/** Single-file dashboard page. All dynamic content is inserted with textContent (no innerHTML). */
export const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sentinel</title>
<style>
  :root { --bg:#0f1115; --fg:#e6e8ee; --muted:#8b93a7; --card:#171a21; --line:#252a35; }
  @media (prefers-color-scheme: light) { :root { --bg:#f6f7f9; --fg:#14171f; --muted:#5b6478; --card:#fff; --line:#e1e4ea; } }
  body { margin:0; font:15px/1.5 system-ui,sans-serif; background:var(--bg); color:var(--fg); }
  main { max-width:880px; margin:0 auto; padding:16px; }
  h1 { font-size:20px; margin:8px 0 16px; }
  .alert { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:12px 14px; margin-bottom:10px; }
  .row { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
  .badge { font-size:12px; font-weight:600; padding:2px 8px; border-radius:999px; text-transform:uppercase; border:1px solid currentColor; }
  .critical { color:#e5484d; } .high { color:#f76b15; } .medium { color:#c99200; } .low { color:#2f81f7; } .info { color:var(--muted); }
  .muted { color:var(--muted); font-size:13px; }
  select { background:var(--card); color:var(--fg); border:1px solid var(--line); border-radius:6px; padding:4px 8px; }
</style>
</head>
<body>
<main>
  <h1>Sentinel alerts</h1>
  <div class="row" style="margin-bottom:12px">
    <label class="muted" for="min">Minimum severity</label>
    <select id="min"><option>info</option><option>low</option><option>medium</option><option>high</option><option>critical</option></select>
    <span class="muted" id="count"></span>
  </div>
  <div id="list"></div>
</main>
<script>
  const list = document.getElementById("list");
  const min = document.getElementById("min");
  const count = document.getElementById("count");
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  async function load() {
    try {
      const res = await fetch("/api/alerts?min=" + encodeURIComponent(min.value));
      const alerts = await res.json();
      list.replaceChildren(...alerts.map((a) => {
        const card = el("div", "alert");
        const head = el("div", "row");
        head.append(el("span", "badge " + a.severity, a.severity), el("strong", "", a.source + "/" + a.event_type), el("span", "muted", "score " + a.score));
        card.append(head, el("div", "", a.summary), el("div", "muted", new Date(a.received_at).toLocaleString() + " \\u00b7 " + a.engine));
        return card;
      }));
      count.textContent = alerts.length + " shown";
    } catch { count.textContent = "offline"; }
  }
  min.addEventListener("change", load);
  load(); setInterval(load, 5000);
</script>
</body>
</html>`;
