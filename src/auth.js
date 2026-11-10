// Optional accounts so players can sync stats across devices.
// Stats always live in the browser first; an account just keeps a copy in sync.
//
// Security notes
// - Passwords: PBKDF2-SHA256 with a per-user random salt. The free Workers plan caps CPU per
//   request, so iterations are modest; each user's count is stored and upgraded on login if raised.
// - Sessions: random 32-byte token in an HttpOnly, Secure, SameSite=Lax cookie. Only its SHA-256
//   hash is stored, so a database leak can't be used to log in.
// - Writes require a same-origin request with a JSON body (blocks cross-site form posts).
// - Repeated wrong passwords lock that account's sign-in for 15 minutes.

const ITERATIONS = 50000;
const SESSION_DAYS = 365;
const COOKIE = "bp_session";
const MAX_FAILS = 8;
const LOCK_MS = 15 * 60 * 1000;
const MAX_BODY = 64 * 1024;

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const randomHex = (n) => hex(crypto.getRandomValues(new Uint8Array(n)));
const sha256 = async (s) => hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));

async function hashPassword(password, saltHex, iterations) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const salt = new Uint8Array(saltHex.match(/../g).map((h) => parseInt(h, 16)));
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return hex(bits);
}
function sameString(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

let schemaReady = false;
async function ensureSchema(db) {
  if (schemaReady) return;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      pw_hash TEXT NOT NULL, pw_salt TEXT NOT NULL, iters INTEGER NOT NULL,
      fails INTEGER NOT NULL DEFAULT 0, locked_until INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL DEFAULT '{}', created INTEGER NOT NULL, updated INTEGER NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires INTEGER NOT NULL)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id)`),
  ]);
  schemaReady = true;
}

const json = (obj, status = 200, headers = {}) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...headers } });
const fail = (status, error) => json({ ok: false, error }, status);

function readCookie(request, name) {
  const m = (request.headers.get("cookie") || "").match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return m ? m[1] : null;
}
const sessionCookie = (token, maxAge) =>
  `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

async function newSession(db, userId) {
  const token = randomHex(32);
  await db.prepare("INSERT INTO sessions (token_hash, user_id, expires) VALUES (?, ?, ?)")
    .bind(await sha256(token), userId, Date.now() + SESSION_DAYS * 86400000).run();
  return sessionCookie(token, SESSION_DAYS * 86400);
}
async function currentUser(db, request) {
  const token = readCookie(request, COOKIE);
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  const row = await db.prepare(
    "SELECT u.id, u.email, u.data FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires > ?",
  ).bind(await sha256(token), Date.now()).first();
  return row || null;
}

// ---- stats merge -------------------------------------------------------------
// data = { devices: { id: {p,t,b,f} }, daily: { "YYYY-MM-DD": {score,hint,n} } }
// Each device reports only its own counters, so totals never double-count.
function cleanCounters(c) {
  const n = (v, max) => (Number.isFinite(v) && v >= 0 ? Math.min(Math.floor(v), max) : 0);
  return { p: n(c && c.p, 1e6), t: n(c && c.t, 4e8), b: n(c && c.b, 400), f: n(c && c.f, 1e6) };
}
function mergeData(stored, incoming) {
  const out = { devices: { ...(stored.devices || {}) }, daily: { ...(stored.daily || {}) } };
  if (incoming && typeof incoming === "object") {
    const id = String(incoming.device || "").slice(0, 16);
    if (/^[a-z0-9]{4,16}$/.test(id) && incoming.own) {
      const c = cleanCounters(incoming.own);
      if (!out.devices[id] || c.p >= out.devices[id].p) out.devices[id] = c;
    }
    const daily = incoming.daily || {};
    let count = 0;
    for (const k of Object.keys(daily)) {
      if (++count > 2000) break;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || out.daily[k]) continue;
      const d = daily[k] || {};
      const score = Number(d.score);
      if (!Number.isFinite(score) || score < 0 || score > 400) continue;
      out.daily[k] = { score: Math.floor(score), hint: !!d.hint, n: Math.max(0, Math.floor(Number(d.n) || 0)) };
    }
  }
  if (Object.keys(out.devices).length > 50) {
    // keep the 50 most-played devices
    out.devices = Object.fromEntries(Object.entries(out.devices).sort((a, b) => b[1].p - a[1].p).slice(0, 50));
  }
  return out;
}

async function readBody(request) {
  if (!(request.headers.get("content-type") || "").includes("application/json")) return null;
  const text = await request.text();
  if (text.length > MAX_BODY) return null;
  try { return JSON.parse(text); } catch { return null; }
}
const validEmail = (e) => typeof e === "string" && e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
const validPassword = (p) => typeof p === "string" && p.length >= 8 && p.length <= 200;

export async function handleApi(request, env, path) {
  const db = env.DB;
  if (!db) return fail(503, "Accounts aren't set up yet.");
  if (request.method !== "GET") {
    const origin = request.headers.get("origin");
    if (origin && new URL(origin).host !== new URL(request.url).host) return fail(403, "Bad origin.");
  }
  await ensureSchema(db);
  const now = Date.now();

  if (path === "/api/me" && request.method === "GET") {
    const user = await currentUser(db, request);
    if (!user) return json({ ok: true, user: null });
    return json({ ok: true, user: { email: user.email }, data: JSON.parse(user.data) });
  }

  if (path === "/api/signup" && request.method === "POST") {
    const body = await readBody(request);
    if (!body) return fail(400, "Something went wrong. Try again.");
    const email = String(body.email || "").trim().toLowerCase();
    if (!validEmail(email)) return fail(400, "Enter a valid email address.");
    if (!validPassword(body.password)) return fail(400, "Use a password with at least 8 characters.");
    const exists = await db.prepare("SELECT 1 FROM users WHERE email = ?").bind(email).first();
    if (exists) return fail(409, "There's already an account with that email. Try signing in.");
    const salt = randomHex(16);
    const hash = await hashPassword(body.password, salt, ITERATIONS);
    const id = randomHex(12);
    const data = mergeData({}, body.sync);
    await db.prepare("INSERT INTO users (id, email, pw_hash, pw_salt, iters, data, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(id, email, hash, salt, ITERATIONS, JSON.stringify(data), now, now).run();
    return json({ ok: true, user: { email }, data }, 200, { "set-cookie": await newSession(db, id) });
  }

  if (path === "/api/login" && request.method === "POST") {
    const body = await readBody(request);
    if (!body) return fail(400, "Something went wrong. Try again.");
    const email = String(body.email || "").trim().toLowerCase();
    const user = validEmail(email) ? await db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first() : null;
    if (!user) {
      // spend similar time so response speed doesn't reveal which emails have accounts
      await hashPassword(String(body.password || ""), "00".repeat(16), ITERATIONS);
      return fail(401, "That email and password don't match.");
    }
    if (user.locked_until > now) return fail(429, "Too many tries. Wait 15 minutes and try again.");
    const hash = await hashPassword(String(body.password || ""), user.pw_salt, user.iters);
    if (!sameString(hash, user.pw_hash)) {
      const fails = user.fails + 1;
      await db.prepare("UPDATE users SET fails = ?, locked_until = ? WHERE id = ?")
        .bind(fails >= MAX_FAILS ? 0 : fails, fails >= MAX_FAILS ? now + LOCK_MS : 0, user.id).run();
      return fail(401, "That email and password don't match.");
    }
    const data = mergeData(JSON.parse(user.data), body.sync);
    let upd = db.prepare("UPDATE users SET fails = 0, locked_until = 0, data = ?, updated = ? WHERE id = ?").bind(JSON.stringify(data), now, user.id);
    if (user.iters < ITERATIONS) {
      const salt = randomHex(16);
      upd = db.prepare("UPDATE users SET fails = 0, locked_until = 0, data = ?, updated = ?, pw_salt = ?, pw_hash = ?, iters = ? WHERE id = ?")
        .bind(JSON.stringify(data), now, salt, await hashPassword(body.password, salt, ITERATIONS), ITERATIONS, user.id);
    }
    await upd.run();
    await db.prepare("DELETE FROM sessions WHERE user_id = ? AND expires < ?").bind(user.id, now).run();
    return json({ ok: true, user: { email: user.email }, data }, 200, { "set-cookie": await newSession(db, user.id) });
  }

  if (path === "/api/sync" && request.method === "POST") {
    const user = await currentUser(db, request);
    if (!user) return fail(401, "Signed out.");
    const body = await readBody(request);
    if (!body) return fail(400, "Something went wrong.");
    const data = mergeData(JSON.parse(user.data), body.sync);
    await db.prepare("UPDATE users SET data = ?, updated = ? WHERE id = ?").bind(JSON.stringify(data), now, user.id).run();
    return json({ ok: true, data });
  }

  if (path === "/api/logout" && request.method === "POST") {
    const token = readCookie(request, COOKIE);
    if (token && /^[0-9a-f]{64}$/.test(token)) await db.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
    return json({ ok: true }, 200, { "set-cookie": sessionCookie("", 0) });
  }

  if (path === "/api/delete" && request.method === "POST") {
    const user = await currentUser(db, request);
    if (!user) return fail(401, "Signed out.");
    const body = await readBody(request);
    const full = await db.prepare("SELECT pw_hash, pw_salt, iters FROM users WHERE id = ?").bind(user.id).first();
    const hash = await hashPassword(String((body && body.password) || ""), full.pw_salt, full.iters);
    if (!sameString(hash, full.pw_hash)) return fail(401, "That password isn't right.");
    await db.batch([
      db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(user.id),
      db.prepare("DELETE FROM users WHERE id = ?").bind(user.id),
    ]);
    return json({ ok: true }, 200, { "set-cookie": sessionCookie("", 0) });
  }

  return fail(404, "Not found.");
}
