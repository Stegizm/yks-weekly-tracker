/* =========================================================
   app.js — giriş noktası: navigasyon, I/O, PWA, modül bağlama
   ========================================================= */

import { store } from "./store.js";
import { $, $$, esc, toast, openModal, modalBody, initModal } from "./ui.js";
import { initSchedule, refreshSchedule } from "./schedule.js";
import { initPomodoro, refreshPomodoro } from "./pomodoro.js";
import { initQuestions, refreshQuestions } from "./questions.js";
import { initExams, refreshExams } from "./exams.js";
import { initNotes, refreshNotes } from "./notes.js";
import { initDashboard, refreshDashboard, renderRankChip } from "./dashboard.js";
import { initCurriculum, refreshCurriculum } from "./curriculum.js";
import { initResources, refreshResources } from "./resources.js";
import { initLeague, refreshLeague, enterLeague } from "./league.js";
import { initSettings, refreshSettings, applyFont } from "./settings.js";
import { evaluateQuests } from "./quests.js";

const PRIMARY = ["schedule", "pomodoro", "questions", "exams", "dashboard", "daha"];
const SECONDARY = ["konular", "kaynaklar", "notlar", "ayarlar", "lig"];
const VALID = [...PRIMARY, ...SECONDARY];

/* ------------------------- Sekme yönlendirme ------------------------- */

function switchView(name) {
  if (!VALID.includes(name)) name = "schedule";
  $$(".view").forEach((v) => v.classList.toggle("is-active", v.id === `view-${name}`));
  const tabName = SECONDARY.includes(name) ? "daha" : name;
  $$(".tab").forEach((t) => {
    const active = t.dataset.view === tabName;
    t.classList.toggle("is-active", active);
    if (active) t.setAttribute("aria-current", "page");
    else t.removeAttribute("aria-current");
  });
  window.scrollTo({ top: 0, behavior: "auto" });
  location.hash = name;
  if (name === "lig") { try { enterLeague(); } catch { /* yoksay */ } }
}

function initTabs() {
  $$(".tab").forEach((tab) => {
    tab.addEventListener("click", () => switchView(/** @type {any} */ (tab.dataset.view)));
  });
  $$("[data-goto]").forEach((btn) => {
    btn.addEventListener("click", () => switchView(/** @type {any} */ (btn).dataset.goto));
  });
  const initial = (location.hash || "").replace("#", "");
  switchView(initial);
}

/* ------------------------- Dışa / İçe aktarma ------------------------- */

function initIO() {
  $("#btnExport")?.addEventListener("click", () => {
    try {
      store.downloadJSON();
      toast("Veriler indirildi.", "success");
    } catch (e) {
      toast("Dışa aktarma başarısız.", "error");
    }
  });

  const file = /** @type {HTMLInputElement|null} */ ($("#importFile"));
  $("#btnImport")?.addEventListener("click", () => file?.click());

  file?.addEventListener("change", async () => {
    const f = file.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      const obj = JSON.parse(text);
      file.value = "";
      askImportMode(obj);
    } catch (e) {
      toast("Dosya okunamadı / geçersiz JSON.", "error");
      file.value = "";
    }
  });
}

function askImportMode(obj) {
  openModal({
    title: "İçe Aktarma Modu",
    bodyHTML: `
      <p class="view__sub">Bu dosya <strong>${escCount(obj)}</strong> içeriyor. Nasıl aktarılsın?</p>
      <div class="field">
        <label for="importMode">Mod</label>
        <select id="importMode">
          <option value="merge">Birleştir (mevcut verileri koru, yenileri ekle)</option>
          <option value="replace">Üzerine yaz (tüm mevcut veriler silinir)</option>
        </select>
      </div>`,
    confirmText: "Aktar",
    danger: true,
    onConfirm() {
      const body = modalBody();
      const mode = /** @type {HTMLSelectElement} */ (body.querySelector("#importMode")).value;
      try {
        store.importData(obj, /** @type {any} */ (mode));
        toast("Veriler içe aktarıldı.", "success");
        refreshAll();
        return true;
      } catch (e) {
        toast(e.message || "İçe aktarma başarısız.", "error");
        return false;
      }
    }
  });
}

function escCount(obj) {
  const q = Array.isArray(obj?.questions) ? obj.questions.length : 0;
  const t = Array.isArray(obj?.topics) ? obj.topics.length : 0;
  const e = Array.isArray(obj?.exams) ? obj.exams.length : 0;
  const c = Array.isArray(obj?.curriculum) ? obj.curriculum.length : 0;
  return `${q} soru, ${t} konu, ${e} deneme, ${c} müfredat kaydı`;
}

/* ------------------------- Geri sayım (topbar) ------------------------- */

function renderCountdown() {
  const chip = $("#countdownChip");
  if (!chip) return;
  const c = store.countdown();
  if (!c) { chip.hidden = true; return; }
  chip.hidden = false;
  const days = Math.max(0, c.days);
  chip.innerHTML = `<span class="chip__icon">⏳</span><span class="chip__count">${days} gün</span>`;
  chip.title = `${esc(c.label)} • ${store.fmtTR(c.date)} — ${c.weeks} hafta kaldı`;
}

/* ------------------------- PWA ------------------------- */

function initPWA() {
  if (!("serviceWorker" in navigator)) return;
  if (!/^https?:$/.test(location.protocol)) return;
  window.addEventListener("load", async () => {
    try {
      const hadController = !!navigator.serviceWorker.controller;
      const reg = await navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" });
      reg.update();
      let reloaded = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        // Güncelleme sonrası yeni kodun yüklenmesi için bir kez yenile
        if (hadController && !reloaded) { reloaded = true; location.reload(); }
      });
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) reg.update();
      });
    } catch (e) {
      console.warn("Service worker kaydedilemedi:", e);
    }
  });
}

/* ------------------------- Ortak yenileme ------------------------- */

function refreshAll() {
  refreshSchedule();
  refreshPomodoro();
  refreshQuestions();
  refreshExams();
  refreshNotes();
  refreshDashboard();
  refreshCurriculum();
  refreshResources();
  refreshLeague();
  refreshSettings();
  renderRankChip();
  renderCountdown();
}

function handleChange() {
  refreshAll();
  applyFont(store.state.settings.font);
  const granted = evaluateQuests();
  if (granted.length) {
    toast(`Görev tamamlandı! ${granted.join(", ")} 🎉`, "success");
  }
}

/* ------------------------- Başlat ------------------------- */

function boot() {
  initModal();

  store.ensureCurriculum();

  initSchedule();
  initPomodoro();
  initQuestions();
  initExams();
  initNotes();
  initDashboard();
  initCurriculum();
  initResources();
  initLeague();
  initSettings();

  applyFont(store.state.settings.font);
  renderRankChip();
  renderCountdown();

  initTabs();
  initIO();
  initPWA();

  store.subscribe(handleChange);

  const granted = evaluateQuests();
  if (granted.length) toast(`Görev tamamlandı! ${granted.join(", ")} 🎉`, "success");

  $("#rankChip")?.addEventListener("click", () => switchView("dashboard"));
  $("#countdownChip")?.addEventListener("click", () => switchView("ayarlar"));

  window.addEventListener("storage", (e) => {
    if (e.key === "yks_tracker_v1") {
      toast("Veriler başka bir sekmede güncellendi.", "info");
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}