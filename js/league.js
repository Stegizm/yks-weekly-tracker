/* =========================================================
   league.js — Profil & Sınıf Ligi (XP sıralaması)
   Canlı mod: /api/league (Vercel) · Yoksa yerel lig.
   ========================================================= */

import { store } from "./store.js";
import { $, $$, esc, toast, fillSelect, confirmDialog } from "./ui.js";

const API = "/api/league";

let serverRows = null;       // canlı sıralama (varsa)
let serverState = "unknown"; // unknown | loading | live | offline | nokv

function ownClass() {
  return store.state.settings.className || "11. Sınıf";
}

function currentClass() {
  const f = /** @type {HTMLSelectElement|null} */ ($("#leagueClassFilter"));
  return (f && f.value) || ownClass();
}

async function apiGet(cls) {
  const res = await fetch(API + "?class=" + encodeURIComponent(cls), { headers: { Accept: "application/json" } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    const e = new Error(data.error || "HTTP " + res.status);
    e.status = res.status;
    throw e;
  }
  return data;
}

async function apiPost(payload) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    const e = new Error(data.error || "HTTP " + res.status);
    e.status = res.status;
    throw e;
  }
  return data;
}

/* ------------------------- Profil ------------------------- */

function renderProfile() {
  const u = /** @type {HTMLInputElement|null} */ ($("#leagueUsername"));
  if (u) u.value = store.state.settings.username || "";
  const c = /** @type {HTMLSelectElement|null} */ ($("#leagueClass"));
  if (c) fillSelect(c, store.GRADES, c.value ? { keepValue: true } : { selected: ownClass() });
}

/* ------------------------- Sıralama ------------------------- */

function renderStatus() {
  const el = $("#leagueStatus");
  if (!el) return;
  const map = {
    live: ["● Canlı", "pill--ok"],
    offline: ["● Yerel", "pill--low"],
    nokv: ["● Sunucu ayarsız", "pill--mid"],
    loading: ["● Bağlanıyor…", "pill--low"],
    unknown: ["● —", "pill--low"]
  };
  const [txt, cls] = map[serverState] || map.unknown;
  el.className = "pill " + cls;
  el.textContent = txt;
  el.title = serverState === "nokv"
    ? "Vercel'de KV/Upstash ortam değişkenleri tanımlı değil. Yerel lig kullanılıyor."
    : serverState === "offline"
      ? "Sunucuya ulaşılamadı. Yerel lig kullanılıyor."
      : "";
}

function serverToRows(cls) {
  const selfName = (store.state.settings.username || "").trim().toLowerCase();
  const sameClass = cls === ownClass();
  const rows = (serverRows || []).map((p, i) => ({
    id: "srv-" + i,
    username: p.name,
    className: cls,
    xp: Number(p.xp) || 0,
    isSelf: sameClass && selfName !== "" && String(p.name).trim().toLowerCase() === selfName,
    server: true,
    rank: i + 1
  }));
  // eşit XP'de aynı sıra
  rows.forEach((r, i) => { if (i > 0 && rows[i - 1].xp === r.xp) r.rank = rows[i - 1].rank; });
  return rows;
}

function renderLeaderboard() {
  const filter = /** @type {HTMLSelectElement|null} */ ($("#leagueClassFilter"));
  if (filter) {
    fillSelect(filter, store.GRADES, filter.value ? { keepValue: true } : { selected: ownClass() });
    if (!filter.value) filter.value = ownClass();
  }
  const cls = currentClass();
  const live = serverState === "live" && serverRows !== null;
  const rows = live ? serverToRows(cls) : store.leagueRows(cls);

  const list = $("#leagueList");
  const count = $("#leagueCount");
  if (count) count.textContent = String(rows.length);
  const empty = $("#leagueEmpty");
  if (!list) return;
  if (rows.length === 0) {
    list.innerHTML = "";
    if (empty) empty.hidden = false;
    return;
  }
  if (empty) empty.hidden = true;

  const medal = (n) => (n === 1 ? "🥇" : n === 2 ? "🥈" : n === 3 ? "🥉" : `#${n}`);
  list.innerHTML = rows.map((r) => `
    <div class="record league-row ${r.isSelf ? "league-row--self" : ""}" data-id="${esc(r.id)}">
      <div class="league-rank">${medal(r.rank)}</div>
      <div class="record__body">
        <div class="record__title">${esc(r.username)} ${r.isSelf ? '<span class="pill pill--subject">Sen</span>' : ""}</div>
        <div class="record__meta">
          <span>${esc(r.className)}</span>
          <span>XP: <strong>${r.xp.toLocaleString("tr-TR")}</strong></span>
        </div>
      </div>
      <div class="res-item__actions">
        ${live
          ? `<span class="pill pill--low">${r.server ? "canlı" : "yerel"}</span>`
          : r.isSelf
            ? `<span class="pill pill--low">Kendin</span>`
            : `<input class="res-done rival-xp" type="number" min="0" value="${r.xp}" aria-label="XP" />
               <button class="icon-btn is-danger" data-action="del" title="Sil">🗑</button>`}
      </div>
    </div>`).join("");

  if (live) return;

  $$(".league-row", list).forEach((node) => {
    const id = node.dataset.id;
    const xpInput = node.querySelector(".rival-xp");
    xpInput?.addEventListener("change", (e) => {
      store.setRivalXp(id, Number(/** @type {HTMLInputElement} */ (e.target).value) || 0);
      toast("Rakip XP güncellendi.", "success");
    });
    node.querySelector('[data-action="del"]')?.addEventListener("click", async () => {
      const ok = await confirmDialog("Rakibi sil", "Bu rakip ligden kaldırılsın mı?", true);
      if (ok) { store.removeRival(id); toast("Rakip silindi."); }
    });
  });
}

/* ------------------------- Canlı senkron ------------------------- */

async function refreshFromServer(push) {
  const cls = currentClass();
  const username = (store.state.settings.username || "").trim();
  serverState = "loading";
  renderStatus();
  try {
    if (push && username) {
      await apiPost({ username, className: ownClass(), xp: store.state.xp });
    }
    const data = await apiGet(cls);
    serverRows = Array.isArray(data.players) ? data.players : [];
    serverState = "live";
  } catch (e) {
    serverRows = null;
    serverState = (e && (e.status === 503 || e.message === "KV_NOT_CONFIGURED")) ? "nokv" : "offline";
  }
  renderLeaderboard();
  renderStatus();
}

/** Lig görünümüne girildiğinde çağrılır (mümkünse XP'yi sunucuya gönderir). */
export async function enterLeague() {
  if (store.state.settings.username) {
    await refreshFromServer(true);
  } else {
    await refreshFromServer(false);
  }
}

/* ------------------------- Formlar ------------------------- */

function renderRivalForm() {
  const sel = /** @type {HTMLSelectElement|null} */ ($("#rivalClass"));
  if (!sel) return;
  fillSelect(sel, store.GRADES, sel.value ? { keepValue: true } : { selected: ownClass() });
}

function render() {
  renderProfile();
  renderLeaderboard();
  renderRivalForm();
  renderStatus();
}

function handleProfileSave(e) {
  e.preventDefault();
  const username = /** @type {HTMLInputElement} */ ($("#leagueUsername")).value.trim();
  const className = /** @type {HTMLSelectElement} */ ($("#leagueClass")).value;
  store.setProfile({ username, className });
  toast(username ? "Profil kaydedildi." : "Kullanıcı adı boş; 'Sen' olarak görünürsün.", "success");
  if (username) refreshFromServer(true);
}

function handleRivalAdd(e) {
  e.preventDefault();
  const username = /** @type {HTMLInputElement} */ ($("#rivalName")).value.trim();
  const className = /** @type {HTMLSelectElement} */ ($("#rivalClass")).value;
  const xp = Number(/** @type {HTMLInputElement} */ ($("#rivalXp")).value) || 0;
  if (!username) { toast("Rakip adı gir.", "error"); return; }
  store.addRival({ username, className, xp });
  toast("Rakip eklendi (yerel).", "success");
  /** @type {HTMLFormElement} */ (e.target).reset();
}

function initImportRival() {
  const file = /** @type {HTMLInputElement|null} */ ($("#rivalImportFile"));
  $("#btnImportRival")?.addEventListener("click", () => file?.click());
  file?.addEventListener("change", async () => {
    const f = file.files?.[0];
    if (!f) return;
    try {
      const obj = JSON.parse(await f.text());
      const rec = store.importRivalFromData(obj);
      file.value = "";
      if (rec) toast(`Rakip eklendi: ${rec.username} (${rec.xp} XP)`, "success");
      else toast("Dosyada profil verisi bulunamadı.", "error");
    } catch {
      toast("Geçersiz JSON dosyası.", "error");
      file.value = "";
    }
  });
}

export function initLeague() {
  render();
  $("#leagueClassFilter")?.addEventListener("change", () => {
    renderLeaderboard();
    renderStatus();
    refreshFromServer(false);
  });
  $("#btnLeagueRefresh")?.addEventListener("click", () => {
    refreshFromServer(true).then(() => toast("Lig güncellendi.", "success"));
  });
  /** @type {HTMLFormElement|null} */
  const pf = /** @type {any} */ ($("#leagueProfileForm"));
  pf?.addEventListener("submit", handleProfileSave);
  /** @type {HTMLFormElement|null} */
  const rf = /** @type {any} */ ($("#rivalForm"));
  rf?.addEventListener("submit", handleRivalAdd);
  initImportRival();
}

export function refreshLeague() {
  render();
}