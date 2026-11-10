// Renders the Daily archive and sitemap. Everything else is a static file in public/.
// A Daily only shows up here once its day is over in every time zone
// (UTC-12 midnight), so the archive never spoils a puzzle someone can still play.
import puzzles from "./puzzles.json";
import shell from "./shell.json";

const SITE = "https://playballpark.xyz";
const LAUNCH_UTC = Date.UTC(2026, 10, 9); // Daily #1 = Nov 9, 2026
const DAY = 86400000;

function latestFinished(now) {
  // Puzzle n's day starts at LAUNCH + (n-1) days; it's over everywhere 36h later.
  return Math.floor((now - LAUNCH_UTC - 36 * 3600000) / DAY) + 1;
}
function puzzleFor(n) {
  return puzzles.daily[(n - 1) % puzzles.daily.length];
}
function dateFor(n) {
  return new Date(LAUNCH_UTC + (n - 1) * DAY).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
  });
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function page(title, desc, path, body, status = 200) {
  const html = shell.head
    .replace("{{TITLE}}", esc(title))
    .replace("{{DESC}}", esc(desc))
    .replace("{{PATH}}", path) + body + shell.foot;
  return new Response(html, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=600" },
  });
}

function archive(now) {
  const last = latestFinished(now);
  let items = "";
  for (let n = last; n >= 1; n--) {
    const p = puzzleFor(n);
    items += `<li><a href="/daily/${n}/">Daily #${n}: “${esc(p.clue)}”</a><span class="note">${dateFor(n)}</span></li>`;
  }
  const body = `
<h1>Past Dailies</h1>
<p class="updated">Every finished Daily, with its answer</p>
<p>Each Daily is five things ranked by a hidden stat, with only a clue to go on. Here's every one that's finished so far, with the real numbers and where they come from. Today's puzzle shows up here once the day is over everywhere.</p>
${last >= 1 ? `<ul class="archive">${items}</ul>` : `<p>The first Daily is still in play. Check back tomorrow, or <a href="/">play it now</a>.</p>`}
<p><a class="btn cta" href="/">Play today's puzzle</a></p>`;
  return page("Past Dailies · Ballpark", "Every past Ballpark Daily puzzle with its answer, the real numbers and their sources.", "/daily/", body);
}

function daily(n, now) {
  const last = latestFinished(now);
  if (n > last) {
    return page("Not out yet · Ballpark", "This Daily hasn't finished yet.", `/daily/${n}/`,
      `<h1>Daily #${n} isn't finished yet</h1><p>Answers appear here once the day is over everywhere, so nobody gets spoiled.</p><p><a class="btn cta" href="/">Play today's puzzle</a></p>`, 404);
  }
  const p = puzzleFor(n);
  const rows = p.answer.map((a) => `<li><span>${esc(a.name)}</span><span>${esc(a.display)}</span></li>`).join("");
  const prev = n > 1 ? `<a href="/daily/${n - 1}/">← Daily #${n - 1}</a>` : "";
  const next = n < last ? `<a href="/daily/${n + 1}/">Daily #${n + 1} →</a>` : "";
  const most = p.order === "asc" ? "earliest" : "most";
  const body = `
<h1>Daily #${n}: “${esc(p.clue)}”</h1>
<p class="updated">${dateFor(n)}</p>
<p>The clue was <b>“${esc(p.clue)}”</b>. Players ranked these five from ${most} to least without seeing the stat:</p>
<p>${p.answer.map((a) => esc(a.name)).slice().sort().join(", ")}.</p>
<h2>The answer: ${esc(p.stat)}</h2>
<ol class="answer">${rows}</ol>
<h2>Did you know?</h2>
<p>${esc(p.fact)}</p>
<h2>Source</h2>
<p>${esc(p.source)}</p>
<p style="display:flex;justify-content:space-between;gap:12px">${prev}<span></span>${next}</p>
<p style="display:flex;align-items:center;gap:16px;flex-wrap:wrap"><a class="btn cta" href="/">Play today&#39;s puzzle</a><a href="/daily/">All past Dailies</a></p>`;
  const desc = `Ballpark Daily #${n} (“${p.clue}”): ${p.stat}. See the full ranking, the real numbers and the source.`;
  return page(`Daily #${n}: “${p.clue}” · Ballpark`, desc, `/daily/${n}/`, body);
}

function sitemap(now) {
  const urls = ["/", ...shell.pages.map((s) => `/${s}/`), "/daily/"];
  for (let n = latestFinished(now); n >= 1; n--) urls.push(`/daily/${n}/`);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${SITE}${u}</loc></url>`).join("\n")}\n</urlset>\n`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const now = Date.now();
    let path = url.pathname;
    if (url.hostname.startsWith("www.")) {
      url.hostname = url.hostname.slice(4);
      return Response.redirect(url.toString(), 301);
    }
    if (path === "/sitemap.xml") return sitemap(now);
    if (path === "/daily") return Response.redirect(`${url.origin}/daily/`, 301);
    if (path === "/daily/") return archive(now);
    const m = path.match(/^\/daily\/(\d+)\/?$/);
    if (m) {
      if (!path.endsWith("/")) return Response.redirect(`${url.origin}${path}/`, 301);
      return daily(parseInt(m[1], 10), now);
    }
    return page("Page not found · Ballpark", "This page doesn't exist.", path,
      `<h1>Page not found</h1><p>That page doesn't exist, but today's puzzle does.</p><p><a class="btn cta" href="/">Play today's puzzle</a></p>`, 404);
  },
};
