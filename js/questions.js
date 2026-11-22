/* =========================================================
   questions.js — Modül C: Soru Çözüm & Doğru/Yanlış Kaydı
   ========================================================= */

import { store } from "./store.js";
import { $, $$, esc, toast, fillSelect, confirmDialog, openModal, modalBody } from "./ui.js";

/* ------------------------- Filtreler ------------------------- */

function periodRange(period) {
  const ws = store.weekStart;
  if (period === "week") return [ws, store.addDays(ws, 6)];
  if (period === "lastweek") return [store.addDays(ws, -7), store.addDays(ws, -1)];
  if (period === "month") {
    const d = new Date();
    const first = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    return [first, store.toISO(d)];
  }
  return null;
}

function filteredQuestions() {
  const period = /** @type {HTMLSelectElement} */ ($("#qPeriod"))?.value || "week";
  const subject = /** @type {HTMLSelectElement} */ ($("#qFilterSubject"))?.value || "";
  const range = periodRange(period);
  return store.state.questions.filter((q) => {
    if (range && (q.date < range[0] || q.date > range[1])) return false;
    if (subject && q.subject !== subject) return false;
    return true;
  });
}

/* ------------------------- Render ------------------------- */

function renderSubjectSelect() {
  const sel = /** @type {HTMLSelectElement|null} */ ($("#qSubject"));
  if (sel) fillSelect(sel, store.state.settings.subjects, { keepValue: true });
  const fs = /** @type {HTMLSelectElement|null} */ ($("#qFilterSubject"));
  if (fs) fillSelect(fs, store.state.settings.subjects, { empty: "Tüm dersler", keepValue: true });
}

function renderStats() {
  const wrap = $("#subjectStats");
  if (!wrap) return;
  const list = filteredQuestions();

  const overall = list.reduce(
    (a, q) => { a.solved += q.solved; a.correct += q.correct; a.wrong += q.wrong; return a; },
    { solved: 0, correct: 0, wrong: 0 }
  );
  const net = overall.correct - overall.wrong / 4;

  const cards = [`
    <div class="stat stat--accent">
      <div class="stat__label">Seçili Dönem • Çözülen</div>
      <div class="stat__value">${overall.solved}</div>
      <div class="stat__hint">${overall.correct} doğru • ${overall.wrong} yanlış</div>
    </div>
    <div class="stat stat--green">
      <div class="stat__label">Net</div>
      <div class="stat__value">${Math.round(net * 100) / 100}</div>
      <div class="stat__hint">%${overall.solved ? Math.round((overall.correct / overall.solved) * 100) : 0} başarı</div>
    </div>`];
  wrap.innerHTML = cards.join("");
}

function renderList() {
  const list = $("#questionList");
  const empty = $("#questionEmpty");
  const count = $("#questionCount");
  if (!list) return;
  const qs = filteredQuestions();
  if (count) count.textContent = `${qs.length} / ${store.state.questions.length}`;

  if (qs.length === 0) {
    list.innerHTML = "";
    if (empty) empty.hidden = false;
    return;
  }
  if (empty) empty.hidden = true;

  list.innerHTML = qs.map((q) => {
    const net = q.correct - q.wrong / 4;
    const rate = q.solved ? Math.round((q.correct / q.solved) * 100) : 0;
    return `
      <div class="record" data-id="${q.id}">
        <div class="record__body">
          <div class="record__title">${esc(q.topic)}</div>
          <div class="record__meta">
            <span class="pill pill--subject">${esc(q.subject)}</span>
            <span>${esc(store.fmtTR(q.date))}</span>
            <span>Çözülen: <strong>${q.solved}</strong></span>
            <span class="pill pill--ok">D: ${q.correct}</span>
            <span class="pill pill--bad">Y: ${q.wrong}</span>
            <span>Net: <strong>${Math.round(net * 100) / 100}</strong> • %${rate}</span>
          </div>
        </div>
        <div class="record__actions">
          <button class="icon-btn" data-action="edit" title="Düzenle">✎</button>
          <button class="icon-btn is-danger" data-action="del" title="Sil">🗑</button>
        </div>
      </div>`;
  }).join("");

  $$(".record", list).forEach((node) => {
    node.querySelector('[data-action="edit"]')?.addEventListener("click", () => openQuestionModal(node.dataset.id));
    node.querySelector('[data-action="del"]')?.addEventListener("click", async () => {
      const ok = await confirmDialog("Kaydı sil", "Bu soru kaydı silinsin mi?", true);
      if (ok) { store.removeQuestion(node.dataset.id); toast("Kayıt silindi."); }
    });
  });
}

function renderSummary() {
  const el = $("#questionsSummary");
  if (!el) return;
  const total = store.totalSolved();
  el.textContent = total
    ? `Toplam ${total} soru çözüldü • ${store.state.questions.length} kayıt (düzenle/sil yapabilirsin)`
    : "Henüz kayıt yok. İlk soru çözümünü ekle.";
}

function render() {
  renderSubjectSelect();
  renderStats();
  renderList();
  renderSummary();
}

/* ------------------------- Ekleme / düzenleme ------------------------- */

function handleSubmit(e) {
  e.preventDefault();
  const subject = /** @type {HTMLSelectElement} */ ($("#qSubject")).value;
  const topic = /** @type {HTMLInputElement} */ ($("#qTopic")).value.trim();
  const solved = Number(/** @type {HTMLInputElement} */ ($("#qSolved")).value) || 0;
  const correct = Number(/** @type {HTMLInputElement} */ ($("#qCorrect")).value) || 0;
  const wrong = Number(/** @type {HTMLInputElement} */ ($("#qWrong")).value) || 0;

  if (!topic) { toast("Konu adı gir.", "error"); return; }
  if (solved <= 0) { toast("Çözülen soru sayısı 0'dan büyük olmalı.", "error"); return; }
  if (correct + wrong > solved) { toast("Doğru + yanlış, çözülen sayısını aşamaz.", "error"); return; }

  store.addQuestion({ subject, topic, solved, correct, wrong });
  toast(`Kayıt eklendi. +${Math.max(2, Math.round(solved / 5))} XP 🎉`, "success");
  /** @type {HTMLFormElement} */ (e.target).reset();
  renderSubjectSelect();
}

function openQuestionModal(id) {
  const q = store.state.questions.find((x) => x.id === id);
  if (!q) return;
  const opts = store.state.settings.subjects
    .map((s) => `<option value="${esc(s)}" ${s === q.subject ? "selected" : ""}>${esc(s)}</option>`)
    .join("");

  const bodyHTML = `
    <div class="form-grid">
      <div class="field">
        <label for="eqDate">Tarih</label>
        <input id="eqDate" type="date" value="${q.date}" />
      </div>
      <div class="field">
        <label for="eqSubject">Ders</label>
        <select id="eqSubject">${opts}</select>
      </div>
    </div>
    <div class="field">
      <label for="eqTopic">Konu</label>
      <input id="eqTopic" type="text" value="${esc(q.topic)}" />
    </div>
    <div class="form-grid">
      <div class="field field--sm"><label for="eqSolved">Çözülen</label><input id="eqSolved" type="number" min="0" value="${q.solved}" /></div>
      <div class="field field--sm"><label for="eqCorrect">Doğru</label><input id="eqCorrect" type="number" min="0" value="${q.correct}" /></div>
      <div class="field field--sm"><label for="eqWrong">Yanlış</label><input id="eqWrong" type="number" min="0" value="${q.wrong}" /></div>
    </div>
  `;

  openModal({
    title: "Soru Kaydını Düzenle",
    bodyHTML,
    confirmText: "Güncelle",
    onConfirm() {
      const body = modalBody();
      const date = /** @type {HTMLInputElement} */ (body.querySelector("#eqDate")).value || q.date;
      const subject = /** @type {HTMLSelectElement} */ (body.querySelector("#eqSubject")).value;
      const topic = /** @type {HTMLInputElement} */ (body.querySelector("#eqTopic")).value.trim();
      const solved = Number(/** @type {HTMLInputElement} */ (body.querySelector("#eqSolved")).value) || 0;
      const correct = Number(/** @type {HTMLInputElement} */ (body.querySelector("#eqCorrect")).value) || 0;
      const wrong = Number(/** @type {HTMLInputElement} */ (body.querySelector("#eqWrong")).value) || 0;
      if (!topic) { toast("Konu adı boş olamaz.", "error"); return false; }
      if (solved <= 0) { toast("Çözülen soru 0'dan büyük olmalı.", "error"); return false; }
      if (correct + wrong > solved) { toast("Doğru + yanlış > çözülen olamaz.", "error"); return false; }
      store.updateQuestion(id, { date, subject, topic, solved, correct, wrong });
      toast("Kayıt güncellendi.", "success");
      return true;
    }
  });
}

/* ------------------------- Başlat ------------------------- */

export function initQuestions() {
  render();
  /** @type {HTMLFormElement|null} */
  const form = /** @type {any} */ ($("#questionForm"));
  form?.addEventListener("submit", handleSubmit);
  ["#qPeriod", "#qFilterSubject"].forEach((sel) => $(sel)?.addEventListener("change", render));
}

export function refreshQuestions() { render(); }
