/* =========================================================
   resources.js — Soru Bankası / Kaynak Takibi
   ========================================================= */

import { store } from "./store.js";
import { $, $$, esc, toast, fillSelect, confirmDialog, openModal, modalBody } from "./ui.js";

function renderStats() {
  const wrap = $("#resourceStats");
  if (!wrap) return;
  const s = store.resourceStats();
  const todayPct = s.goal ? Math.min(100, Math.round((s.todayDone / s.goal) * 100)) : 0;
  wrap.innerHTML = `
    <div class="stat ${s.goalMet ? "stat--green" : "stat--amber"}">
      <div class="stat__label">Bugün</div>
      <div class="stat__value">${s.todayDone}${s.goal ? " / " + s.goal : ""}</div>
      <div class="stat__hint">${s.goal ? (s.goalMet ? "Hedef tamam ✅" : `Hedefe ${s.goal - s.todayDone} kaldı`) : "Günlük hedef belirle"} • 🔥 ${s.streak} gün</div>
      ${s.goal ? `<div class="stat__bar"><span style="width:${todayPct}%"></span></div>` : ""}
    </div>
    <div class="stat stat--accent">
      <div class="stat__label">Kaynak Sayısı</div>
      <div class="stat__value">${s.total}</div>
      <div class="stat__hint">${s.finished} tanesi bitirildi</div>
    </div>
    <div class="stat stat--green">
      <div class="stat__label">Genel İlerleme</div>
      <div class="stat__value">%${s.pct}</div>
      <div class="stat__hint">${s.done} / ${s.target} sayfa-test</div>
      <div class="stat__bar"><span style="width:${s.pct}%"></span></div>
    </div>`;
}

function renderForm() {
  fillSelect(/** @type {HTMLSelectElement} */ ($("#resSubject")), store.state.settings.subjects, { keepValue: true });
  fillSelect(/** @type {HTMLSelectElement} */ ($("#resUnit")), ["Sayfa", "Test"], { selected: "Sayfa" });
}

function renderList() {
  const list = $("#resourceList");
  const empty = $("#resourceEmpty");
  const count = $("#resCount");
  if (!list) return;
  const items = store.state.resources;
  if (count) count.textContent = String(items.length);

  if (items.length === 0) {
    list.innerHTML = "";
    if (empty) empty.hidden = false;
    return;
  }
  if (empty) empty.hidden = true;

  list.innerHTML = items.map((r) => {
    const pct = r.total ? Math.min(100, Math.round((r.done / r.total) * 100)) : 0;
    const finished = r.total > 0 && r.done >= r.total;
    return `
      <div class="record res-item ${finished ? "is-done" : ""}" data-id="${r.id}">
        <div class="record__body">
          <div class="record__title">${esc(r.name)} ${finished ? "✅" : ""}</div>
          <div class="record__meta">
            ${r.subject ? `<span class="pill pill--subject">${esc(r.subject)}</span>` : ""}
            <span class="pill pill--low">${esc(r.unit)}</span>
            <span>${r.done} / ${r.total || "?"} • %${pct}</span>
          </div>
          <div class="subj-bar__track res-bar"><span style="width:${pct}%"></span></div>
        </div>
        <div class="res-item__actions">
          <input class="res-done" type="number" min="0" value="${r.done}" aria-label="Tamamlanan" />
          <button class="icon-btn" data-action="edit" title="Düzenle">✎</button>
          <button class="icon-btn is-danger" data-action="del" title="Sil">🗑</button>
        </div>
      </div>`;
  }).join("");

  $$(".res-item", list).forEach((node) => {
    const id = node.dataset.id;
    node.querySelector(".res-done")?.addEventListener("change", (e) => {
      store.updateResource(id, { done: Number(/** @type {HTMLInputElement} */ (e.target).value) || 0 });
      toast("İlerleme güncellendi.", "success");
    });
    node.querySelector('[data-action="edit"]')?.addEventListener("click", () => openResourceModal(id));
    node.querySelector('[data-action="del"]')?.addEventListener("click", async () => {
      const ok = await confirmDialog("Kaynağı sil", "Bu kaynak silinsin mi?", true);
      if (ok) { store.removeResource(id); toast("Kaynak silindi."); }
    });
  });
}

function openResourceModal(id) {
  const r = store.state.resources.find((x) => x.id === id);
  if (!r) return;
  const opts = store.state.settings.subjects
    .map((s) => `<option value="${esc(s)}" ${s === r.subject ? "selected" : ""}>${esc(s)}</option>`)
    .join("");
  const bodyHTML = `
    <div class="field">
      <label for="erName">Kaynak Adı</label>
      <input id="erName" type="text" value="${esc(r.name)}" />
    </div>
    <div class="grid-2">
      <div class="field">
        <label for="erSubject">Ders</label>
        <select id="erSubject">${opts}</select>
      </div>
      <div class="field">
        <label for="erUnit">Birim</label>
        <select id="erUnit">
          <option value="Sayfa" ${r.unit === "Sayfa" ? "selected" : ""}>Sayfa</option>
          <option value="Test" ${r.unit === "Test" ? "selected" : ""}>Test</option>
        </select>
      </div>
    </div>
    <div class="grid-2">
      <div class="field"><label for="erTotal">Toplam</label><input id="erTotal" type="number" min="0" value="${r.total || ""}" /></div>
      <div class="field"><label for="erDone">Tamamlanan</label><input id="erDone" type="number" min="0" value="${r.done || 0}" /></div>
    </div>`;
  openModal({
    title: "Kaynağı Düzenle",
    bodyHTML,
    confirmText: "Güncelle",
    onConfirm() {
      const body = modalBody();
      const name = /** @type {HTMLInputElement} */ (body.querySelector("#erName")).value.trim();
      if (!name) { toast("Kaynak adı boş olamaz.", "error"); return false; }
      store.updateResource(id, {
        name,
        subject: /** @type {HTMLSelectElement} */ (body.querySelector("#erSubject")).value,
        unit: /** @type {HTMLSelectElement} */ (body.querySelector("#erUnit")).value,
        total: Number(/** @type {HTMLInputElement} */ (body.querySelector("#erTotal")).value) || 0,
        done: Number(/** @type {HTMLInputElement} */ (body.querySelector("#erDone")).value) || 0
      });
      toast("Kaynak güncellendi.", "success");
      return true;
    }
  });
}

function handleAdd(e) {
  e.preventDefault();
  const name = /** @type {HTMLInputElement} */ ($("#resName")).value.trim();
  const subject = /** @type {HTMLSelectElement} */ ($("#resSubject")).value;
  const unit = /** @type {HTMLSelectElement} */ ($("#resUnit")).value;
  const total = Number(/** @type {HTMLInputElement} */ ($("#resTotal")).value) || 0;
  if (!name) { toast("Kaynak adı gir.", "error"); return; }
  store.addResource({ name, subject, unit, total, done: 0 });
  toast("Kaynak eklendi.", "success");
  /** @type {HTMLFormElement} */ (e.target).reset();
  fillSelect(/** @type {HTMLSelectElement} */ ($("#resUnit")), ["Sayfa", "Test"], { selected: "Sayfa" });
}

function render() {
  renderStats();
  renderForm();
  renderList();
  const goalInput = /** @type {HTMLInputElement|null} */ ($("#resDailyGoalInput"));
  if (goalInput && document.activeElement !== goalInput) {
    goalInput.value = String(store.state.settings.resourceDailyGoal || 0);
  }
}

export function initResources() {
  render();
  /** @type {HTMLFormElement|null} */
  const form = /** @type {any} */ ($("#resourceForm"));
  form?.addEventListener("submit", handleAdd);
  $("#btnSaveResGoal")?.addEventListener("click", () => {
    const v = Number(/** @type {HTMLInputElement} */ ($("#resDailyGoalInput")).value) || 0;
    store.setResourceDailyGoal(v);
    toast(v ? `Günlük hedef: ${v}` : "Günlük hedef kaldırıldı.", "success");
  });
}

export function refreshResources() { render(); }