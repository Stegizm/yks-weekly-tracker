/* =========================================================
   settings.js — Ayarlar: font, geri sayım, hafif mod,
   dersler, rütbeler ve veri aktarımı
   ========================================================= */

import { store } from "./store.js";
import { $, $$, esc, toast, confirmDialog } from "./ui.js";

const SYS_STACK = '"Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif';
const JAKARTA = '"Plus Jakarta Sans", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif';
const OUTFIT = '"Outfit", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif';
const MELON = '"Super Melon Hunter", "Plus Jakarta Sans", "Segoe UI", cursive';

/** body + heading font istifleri. */
export const FONTS = [
  { id: "playful", label: "Playful (Outfit + Jakarta)", body: JAKARTA, heading: OUTFIT },
  { id: "sistem", label: "Sistem", body: SYS_STACK, heading: SYS_STACK },
  { id: "sans", label: "Sade Sans", body: '-apple-system, "Helvetica Neue", Arial, sans-serif', heading: '-apple-system, "Helvetica Neue", Arial, sans-serif' },
  { id: "round", label: "Yuvarlak", body: '"Trebuchet MS", "Segoe UI", Verdana, sans-serif', heading: '"Trebuchet MS", "Segoe UI", Verdana, sans-serif' },
  { id: "serif", label: "Serif (okunaklı)", body: 'Georgia, "Times New Roman", "Noto Serif", serif', heading: 'Georgia, "Times New Roman", "Noto Serif", serif' },
  { id: "mono", label: "Monospace", body: 'ui-monospace, "Cascadia Code", Consolas, "Courier New", monospace', heading: 'ui-monospace, "Cascadia Code", Consolas, "Courier New", monospace' },
  { id: "melon", label: "Super Melon Hunter", body: MELON, heading: MELON }
];

export function applyFont(fontId) {
  const f = FONTS.find((x) => x.id === fontId) || FONTS[0];
  const root = document.documentElement.style;
  root.setProperty("--app-font", f.body);
  root.setProperty("--app-heading", f.heading);
}

/* ------------------------- Görünüm ------------------------- */

function renderFont() {
  const sel = /** @type {HTMLSelectElement|null} */ ($("#fontSelect"));
  if (!sel) return;
  const current = store.state.settings.font;
  sel.innerHTML = FONTS.map((f) => `<option value="${f.id}" ${f.id === current ? "selected" : ""}>${esc(f.label)}</option>`).join("");
}

/* ------------------------- Geri sayım ------------------------- */

function renderCountdownSettings() {
  const d = /** @type {HTMLInputElement|null} */ ($("#targetDate"));
  const l = /** @type {HTMLInputElement|null} */ ($("#countdownLabel"));
  if (d) d.value = store.state.settings.targetDate || "";
  if (l) l.value = store.state.settings.countdownLabel || "YKS";
}

/* ------------------------- Hafif mod ------------------------- */

function renderLightMode() {
  const t = /** @type {HTMLInputElement|null} */ ($("#lightModeToggle"));
  if (t) t.checked = Boolean(store.state.settings.lightMode);
}

function renderAutoBackup() {
  const t = /** @type {HTMLInputElement|null} */ ($("#autoBackupToggle"));
  if (t) t.checked = store.state.settings.autoBackup !== false;
}

/* ------------------------- Dersler ------------------------- */

function renderSubjects() {
  const wrap = $("#subjectManager");
  if (!wrap) return;
  const subs = store.state.settings.subjects;
  wrap.innerHTML = subs.map((s) => `
    <span class="subject-chip">
      ${esc(s)}
      <button class="subject-chip__x" type="button" data-subject="${esc(s)}" aria-label="${esc(s)} dersini kaldır">✕</button>
    </span>`).join("") || `<p class="view__sub">Henüz ders yok. Aşağıdan ekle.</p>`;

  $$(".subject-chip__x", wrap).forEach((btn) => {
    btn.addEventListener("click", () => {
      store.removeSubject(/** @type {HTMLElement} */ (btn).dataset.subject || "");
    });
  });

  const dl = $("#allSubjects");
  if (dl) dl.innerHTML = subs.map((s) => `<option value="${esc(s)}"></option>`).join("");
}

/* ------------------------- Rütbeler ------------------------- */

function renderRanks() {
  const wrap = $("#rankEditor");
  if (!wrap) return;
  const ranks = store.effectiveRanks();
  wrap.innerHTML = `
    <div class="rank-edit-row rank-edit-row--head">
      <span>Seviye</span><span>İkon</span><span>Rütbe Adı</span>
    </div>
    ${ranks.map((r) => `
      <div class="rank-edit-row" data-row>
        <input class="re-min" type="number" min="1" value="${r.min}" aria-label="Seviye" />
        <input class="re-icon" type="text" maxlength="4" value="${esc(r.icon)}" aria-label="İkon" />
        <input class="re-name" type="text" value="${esc(r.name)}" aria-label="Rütbe adı" />
      </div>`).join("")}`;
}

function saveRanks() {
  const rows = $$("#rankEditor .rank-edit-row[data-row]");
  const list = rows.map((row) => ({
    min: Number(/** @type {HTMLInputElement} */ (row.querySelector(".re-min")).value) || 1,
    icon: /** @type {HTMLInputElement} */ (row.querySelector(".re-icon")).value.trim() || "⭐",
    name: /** @type {HTMLInputElement} */ (row.querySelector(".re-name")).value.trim()
  }));
  if (list.some((r) => !r.name)) { toast("Rütbe adları boş olamaz.", "error"); return; }
  store.setCustomRanks(list);
  toast("Rütbeler güncellendi.", "success");
}

/* ------------------------- Başlat ------------------------- */

export function initSettings() {
  renderFont();
  renderCountdownSettings();
  renderLightMode();
  renderAutoBackup();
  renderSubjects();
  renderRanks();

  $("#fontSelect")?.addEventListener("change", (e) => {
    const v = /** @type {HTMLSelectElement} */ (e.target).value;
    store.setFont(v);
    applyFont(v);
    toast("Yazı tipi değiştirildi.", "success");
  });

  $("#btnSaveCountdown")?.addEventListener("click", () => {
    const date = /** @type {HTMLInputElement} */ ($("#targetDate")).value;
    const label = /** @type {HTMLInputElement} */ ($("#countdownLabel")).value;
    store.setTargetDate(date, label);
    toast(date ? "Geri sayım ayarlandı." : "Geri sayım kaldırıldı.", "success");
  });

  $("#lightModeToggle")?.addEventListener("change", (e) => {
    store.setLightMode(/** @type {HTMLInputElement} */ (e.target).checked);
    toast("Hafif mod " + (/** @type {HTMLInputElement} */ (e.target).checked ? "açık." : "kapalı."), "success");
  });

  $("#autoBackupToggle")?.addEventListener("change", (e) => {
    store.setAutoBackup(/** @type {HTMLInputElement} */ (e.target).checked);
    toast("Otomatik yedek " + (/** @type {HTMLInputElement} */ (e.target).checked ? "açık." : "kapalı."), "success");
  });

  /** @type {HTMLFormElement|null} */
  const addSubForm = /** @type {any} */ ($("#addSubjectForm"));
  addSubForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = /** @type {HTMLInputElement} */ ($("#newSubject"));
    const val = input.value.trim();
    if (!val) return;
    store.addSubject(val);
    input.value = "";
    toast("Ders eklendi.", "success");
  });

  $("#btnSaveRanks")?.addEventListener("click", saveRanks);
  $("#btnResetRanks")?.addEventListener("click", async () => {
    const ok = await confirmDialog("Rütbeleri sıfırla", "Rütbe adları varsayılana dönecek. Devam?", false);
    if (ok) { store.resetRanks(); toast("Rütbeler sıfırlandı."); }
  });
}

export function refreshSettings() {
  renderFont();
  renderCountdownSettings();
  renderLightMode();
  renderAutoBackup();
  renderSubjects();
  renderRanks();
}