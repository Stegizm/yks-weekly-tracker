/* =========================================================
   /api/league.js — Canlı sınıf ligi (Vercel Serverless)
   Sıfır bağımlılık; Upstash Redis REST veya Vercel KV.
   ENV: KV_REST_API_URL / KV_REST_API_TOKEN
        (veya UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN)
   ========================================================= */

const CLASSES = new Set([
  "9. Sınıf", "10. Sınıf", "11. Sınıf", "12. Sınıf",
  "TYT", "AYT", "Üniversite 1", "Üniversite 2",
  "Maarif 1. Aşama", "Maarif 2. Aşama"
]);

const KEY_PREFIX = "yks:league:";
const MAX_XP = 1000000000;

function kvConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
  return { url, token };
}

async function redis(command) {
  const { url, token } = kvConfig();
  if (!url || !token) {
    const err = new Error("KV_NOT_CONFIGURED");
    err.code = "KV_NOT_CONFIGURED";
    throw err;
  }
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(command)
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error("KV_HTTP_" + res.status + (body ? ": " + body.slice(0, 160) : ""));
  }
  const json = await res.json();
  if (json && json.error) throw new Error("KV_ERROR: " + json.error);
  return json ? json.result : null;
}

function cleanName(raw) {
  const name = String(raw == null ? "" : raw)
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24);
  return name;
}

function cleanXp(raw) {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, MAX_XP);
}

function classKey(className) {
  return KEY_PREFIX + className;
}

async function topPlayers(className) {
  const key = classKey(className);
  const [flat, count] = await Promise.all([
    redis(["ZREVRANGE", key, "0", "99", "WITHSCORES"]),
    redis(["ZCARD", key])
  ]);
  const arr = Array.isArray(flat) ? flat : [];
  const players = [];
  for (let i = 0; i + 1 < arr.length; i += 2) {
    players.push({ name: arr[i], xp: Number(arr[i + 1]) || 0 });
  }
  return { players, count: Number(count) || players.length };
}

function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.end(JSON.stringify(obj));
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const className = String(req.query.class || req.query.className || "").trim();
      if (!CLASSES.has(className)) return send(res, 400, { ok: false, error: "INVALID_CLASS" });
      const data = await topPlayers(className);
      return send(res, 200, { ok: true, className, ...data });
    }

    if (req.method === "POST") {
      let body = req.body;
      if (typeof body === "string") {
        try { body = JSON.parse(body); } catch { body = null; }
      }
      if (!body || typeof body !== "object") return send(res, 400, { ok: false, error: "INVALID_BODY" });

      const name = cleanName(body.username);
      const className = String(body.className || "").trim();
      const xp = cleanXp(body.xp);

      if (name.length < 2) return send(res, 400, { ok: false, error: "INVALID_USERNAME" });
      if (!CLASSES.has(className)) return send(res, 400, { ok: false, error: "INVALID_CLASS" });

      const key = classKey(className);
      // Sadece XP artır (düşürmeye izin verme)
      const current = await redis(["ZSCORE", key, name]);
      if (current === null || xp > (Number(current) || 0)) {
        await redis(["ZADD", key, String(xp), name]);
      }
      const data = await topPlayers(className);
      return send(res, 200, { ok: true, className, synced: true, ...data });
    }

    res.setHeader("Allow", "GET, POST");
    return send(res, 405, { ok: false, error: "METHOD_NOT_ALLOWED" });
  } catch (err) {
    const code = err && err.code === "KV_NOT_CONFIGURED" ? "KV_NOT_CONFIGURED" : "SERVER_ERROR";
    const status = code === "KV_NOT_CONFIGURED" ? 503 : 500;
    return send(res, status, { ok: false, error: code, detail: String(err && err.message || err).slice(0, 200) });
  }
};