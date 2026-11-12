"""Build the Ballpark site into the GitHub repo.

Writes:
  public/index.html            the game (template + puzzle JSON)
  public/site.css              shared styles for the text pages
  public/<page>/index.html     how-to-play, about, privacy, contact
  public/robots.txt
  src/puzzles.json             daily puzzles for the archive worker
The Daily archive (/daily/...) and sitemap.xml are rendered by src/worker.js,
so a puzzle only appears there once its day is over everywhere.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REPO = ROOT.parent  # repo root; this file lives in tools/build/
SITE = "https://playballpark.xyz"
EMAIL = "ballpark.contact@proton.me"

template = (ROOT / "site" / "template.html").read_text()
data = json.loads((ROOT / "data" / "ballpark-puzzles.json").read_text())

pub = REPO / "public"
pub.mkdir(parents=True, exist_ok=True)

# Game page
(pub / "index.html").write_text(template.replace("/*PUZZLES*/null", json.dumps(data, ensure_ascii=False, separators=(",", ":"))))

# Shared CSS: the game's own stylesheet, so text pages match exactly
css = re.search(r"<style>(.*?)</style>", template, re.S).group(1)
css += """
.page-wrap { padding: 24px 0 64px; }
.page { margin: 0 auto; }
.top a.logo { text-decoration: none; }
.top .play { text-decoration: none; }
.archive { list-style: none; padding: 0; margin: 0; }
.archive li { display: flex; justify-content: space-between; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--line); }
.archive a { font-weight: 700; text-decoration: none; }
.answer { list-style: none; padding: 0; margin: 8px 0 16px; counter-reset: r; }
.answer li { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--line); }
.answer li span:first-child::before { counter-increment: r; content: counter(r) ". "; color: var(--muted); }
.answer li span:last-child { font-weight: 700; white-space: nowrap; }
.cta { display: inline-flex; margin-top: 8px; text-decoration: none; }
.page a.btn { color: var(--accent-ink); }
.page a.btn.outline { color: var(--accent); }
"""
(pub / "site.css").write_text(css)

LOGO = re.search(r'(<svg width="30".*?</svg>)', template, re.S).group(1)
FONTS = re.search(r'(<link rel="preconnect".*?rel="stylesheet">)', template, re.S).group(1)
ICON = re.search(r'(<link rel="icon"[^>]*>)', template).group(1)


def shell(title, desc, path, body):
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{SITE}{path}">
<meta property="og:site_name" content="Ballpark">
<meta property="og:type" content="website">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{SITE}{path}">
<meta property="og:image" content="{SITE}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Ballpark: rank 5 things by a hidden stat">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="{SITE}/og.png">
{ICON}
{FONTS}
<link rel="stylesheet" href="/site.css">
<script>try{{var t=JSON.parse(localStorage.getItem('ballpark-v1')||'{{}}').theme;if(t)document.documentElement.dataset.theme=t;}}catch(e){{}}</script>
</head>
<body>
<header class="top"><div class="wrap">
  <a class="logo" href="/" aria-label="Ballpark home">{LOGO}<span>Ballpark</span></a>
  <a class="btn play" href="/">Play</a>
</div></header>
<main class="page-wrap"><div class="wrap"><article class="card page">
{body}
</article></div></main>
<footer>
  <nav class="foot" aria-label="Site pages"><a href="/how-to-play/">How to play</a><a href="/daily/">Past Dailies</a><a href="/about/">About</a><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="/contact/">Contact</a></nav>
  <div>© 2026 Ballpark</div>
</footer>
</body>
</html>
"""


cats = ", ".join(c["name"] for c in data["categories"])
PAGES = {
    "how-to-play": ("How to play Ballpark", "How to play Batting Order, Ballpark's daily hidden-stat ranking game: modes, scoring and tips.", f"""
<h1>How to play</h1>
<p class="updated">Batting Order, the hidden-stat ranking game</p>
<p>You get five things: drinks, planets, board-game squares, animals, books and more. They're ranked by a stat you can't see. Drag them into order from <b>most</b> (top) to <b>least</b> (bottom), then hit <b>Lock it in</b>.</p>
<h2>Daily</h2>
<p>One puzzle a day, the same for everyone. Instead of the stat, you get a short clue like <i>“Sweet tooth.”</i> Work out what the clue points to, then rank. You get one shot, and a new Daily arrives at midnight in your time zone. Missed one? Every finished Daily is in the <a href="/daily/">archive</a> with its answer.</p>
<h2>Unlimited</h2>
<ul>
  <li><b>Easy:</b> you see the stat before you rank.</li>
  <li><b>Normal:</b> you get a clue. Stuck? Show a hint for 25 points and you'll see the unit it's measured in.</li>
</ul>
<p>Play <b>General</b> for a mix of everything, or stick to one category: {cats}.</p>
<h2>Scoring</h2>
<ul>
  <li>100 points if your #1 is right.</li>
  <li>75 points for each other item in exactly the right spot.</li>
  <li>25 points for each item that's just one spot off.</li>
  <li>400 is a perfect round.</li>
</ul>
<p>Your squares show how close each guess was: green is exact, yellow is one spot off, orange is two, red is three or more.</p>
<h2>Moving the cards</h2>
<p>Drag a card up or down. You can also tap one card and then another to swap them, or use the arrow keys on a keyboard.</p>
<h2>Tips</h2>
<ul>
  <li>Lock in your #1 first. It's worth the most, and it's usually the easiest to spot.</li>
  <li>Think about what the clue could mean before you rank. “Open wide” could be teeth, or mouths, or something else entirely.</li>
  <li>Watch the units. A 12 oz can and a 20 oz bottle aren't a fair fight.</li>
</ul>
<h2>Where the numbers come from</h2>
<p>Every stat is checked against a published source, like NASA, the U.S. Mint, governing-body rulebooks or official records, and the source is shown after each round. Numbers that can change over time, like championship counts or nutrition labels, show the date they were checked. Puzzles never put two numbers so close together that a small difference between sources could change the answer.</p>
<p><a class="btn cta" href="/">Play today's puzzle</a></p>"""),
    "about": ("About Ballpark", "Ballpark is a free site of quick guessing games about the world, starting with Batting Order, the daily hidden-stat ranking game.", f"""
<h1>About Ballpark</h1>
<p>Ballpark is a home for quick guessing games about the world. The first one is <b>Batting Order</b>: rank five things by a hidden stat and see how close you get.</p>
<p>Everyone has a gut sense for how things compare. Which costs more to make, a nickel or a dime? Which has more teeth, a dog or a person? Which Monopoly property is cheaper, Electric Company or Virginia Avenue? Ballpark puts that gut sense to the test, then shows you the real numbers and a fact worth knowing.</p>
<h2>How it works</h2>
<p>There's a new <b>Daily</b> puzzle every day, the same for everyone, plus <b>Unlimited</b> puzzles across categories like {cats}. Rounds take about a minute. Past Dailies, with their answers and sources, live in the <a href="/daily/">archive</a>.</p>
<h2>Accuracy</h2>
<p>Every puzzle is built from published data, and each answer names its source. If you think a number is wrong, please <a href="/contact/">tell us</a> which puzzle it was and we'll check it.</p>
<h2>What's next</h2>
<p>More puzzles and categories are on the way, plus a new game, <b>Find It</b>: spot the bunny, the sasquatch or whoever is hiding, as fast as you can.</p>
<p class="note">Ballpark is an independent project and isn't affiliated with any brand, team, game, book or film mentioned in its puzzles. Names are used only to state facts about them.</p>"""),
    "privacy": ("Privacy Policy · Ballpark", "How Ballpark handles your data, cookies and advertising.", f"""
<h1>Privacy Policy</h1>
<p class="updated">Last updated: November 11, 2026</p>
<p>Ballpark is built to collect as little as possible. This policy explains what happens when you play.</p>
<h2>What we store</h2>
<p>You can play without an account. Your scores, streak and settings are saved in your own browser on your own device (using your browser's local storage). Clearing your browser data deletes them.</p>
<h2>Optional accounts</h2>
<p>If you choose to create an account to sync your stats across devices, we store your email address, a securely scrambled (hashed) version of your password, and your game stats (scores, games played and which Dailies you finished). We never see or store your actual password. We use your email only to run your account and to answer messages you send us. We don't sell it or use it for marketing.</p>
<p>Signing in sets one cookie that keeps you signed in. It's only used for your account, not for ads or tracking.</p>
<p>You can delete your account at any time from the account menu (the person icon at the top of the game). That permanently deletes your email, password and synced stats from our servers. Stats saved in your browser stay until you clear them.</p>
<h2>How we protect it</h2>
<p>Account data is stored with our hosting provider, Cloudflare, and is only sent over encrypted (HTTPS) connections. Passwords are hashed with a unique salt, sign-in sessions use a secure cookie that page scripts can't read, and repeated failed sign-ins are slowed down and locked. To limit abuse, we briefly keep a scrambled (hashed) version of your network address when you sign up or sign in. It can't be turned back into your address and is cleared automatically. We never store payment information, because there's nothing to buy.</p>
<h2>How long we keep it</h2>
<p>We keep account data until you delete your account. Browser data stays on your device until you clear it.</p>
<h2>Site analytics</h2>
<p>We may use privacy-friendly analytics to count visits and see which pages are used. These numbers are totals and are not used to identify you.</p>
<h2>Advertising</h2>
<p>Ballpark may show ads from Google AdSense to help pay for the site. Third-party vendors, including Google, use cookies to serve ads based on your previous visits to this and other websites. Google's use of advertising cookies lets it and its partners serve ads based on your visits to this site and/or other sites on the internet.</p>
<p>You can opt out of personalized advertising in <a href="https://www.google.com/settings/ads" rel="noopener">Google Ads Settings</a>. Learn more about <a href="https://policies.google.com/technologies/ads" rel="noopener">how Google uses information from sites that use its services</a>.</p>
<h2>Children</h2>
<p>Ballpark is a general-audience site and is not directed at children under 13. Anyone can play without an account, but accounts are only for people 13 and older. We don't knowingly collect personal information from children under 13. If you believe a child under 13 has created an account, email us and we'll delete it.</p>
<h2>Changes</h2>
<p>If this policy changes, we'll update the date at the top of this page.</p>
<h2>Contact</h2>
<p>Questions about privacy? Email <a href="mailto:{EMAIL}">{EMAIL}</a>.</p>"""),
    "terms": ("Terms of Use · Ballpark", "The terms for using Ballpark, a free daily guessing game.", f"""
<h1>Terms of Use</h1>
<p class="updated">Last updated: November 11, 2026</p>
<p>These terms cover your use of Ballpark (playballpark.xyz). By using the site, you agree to them. If you don't agree, please don't use the site.</p>
<h2>The game</h2>
<p>Ballpark is a free game for entertainment. You can play without an account. We may add, change or remove puzzles, modes and features at any time.</p>
<h2>Accounts</h2>
<p>Accounts are optional and only for people 13 and older. Keep your password private, and you're responsible for activity on your account. You can delete your account at any time from the account menu. We may suspend or delete accounts that abuse the site, for example by attacking it, scraping it heavily or trying to access other people's accounts.</p>
<h2>Accuracy of the numbers</h2>
<p>We check every stat against a published source and show that source after each round. Even so, numbers can change over time, sources can disagree, and mistakes can happen. Ballpark is for fun and general interest only. It isn't professional, medical, nutritional, financial or legal advice, so please don't rely on it for decisions. If you spot an error, <a href="/contact/">tell us</a> and we'll fix it.</p>
<h2>Names and trademarks</h2>
<p>Puzzles mention real products, places, people, teams and works only to state facts about them. All trademarks belong to their owners. Ballpark isn't affiliated with, sponsored by or endorsed by any of them.</p>
<h2>Our content</h2>
<p>The Ballpark name, logo, site design, puzzles and written text are ours. Facts themselves belong to no one, so feel free to share your results and talk about the puzzles. Please don't copy the site or its puzzle collection wholesale.</p>
<h2>Acceptable use</h2>
<p>Don't try to break, overload or gain unauthorized access to the site, other people's accounts or our systems, and don't use the site for anything unlawful.</p>
<h2>Ads and other sites</h2>
<p>The site may show ads and link to other websites. We're not responsible for the content or practices of other sites.</p>
<h2>No warranty</h2>
<p>Ballpark is provided "as is" and "as available," without warranties of any kind. We don't promise the site will always be available, error-free or that saved stats will never be lost.</p>
<h2>Limitation of liability</h2>
<p>To the fullest extent the law allows, Ballpark and the people who run it aren't liable for any indirect, incidental or consequential damages, or any loss of data, arising from your use of the site. Our total liability for any claim related to the site is limited to $50.</p>
<h2>Changes</h2>
<p>We may update these terms. When we do, we'll change the date at the top. Continuing to use the site after a change means you accept the new terms.</p>
<h2>Contact</h2>
<p>Questions? Email <a href="mailto:{EMAIL}">{EMAIL}</a>.</p>"""),
    "contact": ("Contact · Ballpark", "Get in touch with Ballpark: report a fact, suggest a puzzle or say hi.", f"""
<h1>Contact</h1>
<p>Found a number that looks wrong, have an idea for a puzzle, or just want to say hi? We'd love to hear from you.</p>
<p>Email: <a href="mailto:{EMAIL}">{EMAIL}</a></p>
<h2>Reporting a fact</h2>
<p>Please include the puzzle (for example, <i>Daily #12</i> or its clue), which number you think is off, and a link to your source if you have one. We check every report.</p>
<h2>Suggesting a puzzle</h2>
<p>The best puzzles have a surprise in them: a ranking most people would get wrong, backed by a number anyone can look up. If you've got one, send it over.</p>"""),
}
for slug, (title, desc, body) in PAGES.items():
    d = pub / slug
    d.mkdir(exist_ok=True)
    (d / "index.html").write_text(shell(title, desc, f"/{slug}/", body))

(pub / "_headers").write_text("""/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
  Content-Security-Policy: frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self'
  Cross-Origin-Opener-Policy: same-origin-allow-popups
""")
(pub / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n")
old = pub / "sitemap.xml"
if old.exists():
    old.unlink()

# Archive data for the worker, plus the page shell pieces so it matches
(REPO / "src").mkdir(exist_ok=True)
(REPO / "src" / "puzzles.json").write_text(json.dumps({"daily": data["daily"]}, ensure_ascii=False))
head, foot = shell("{{TITLE}}", "{{DESC}}", "{{PATH}}", "{{BODY}}").split("{{BODY}}")
(REPO / "src" / "shell.json").write_text(json.dumps({"head": head, "foot": foot, "pages": list(PAGES)}, ensure_ascii=False))
print("built", len(list(pub.rglob("*"))), "files")
