/* =========================================================
   notes.js — Modül D: Eksik Konular & Not / Formül Defteri
   ========================================================= */

import { store } from "./store.js";
import { $, $$, esc, toast, fillSelect, confirmDialog, openModal, modalBody } from "./ui.js";

const priorityClass = { "Yüksek": "pill--high", "Orta": "pill--mid", "Düşük": "pill--low" };
const statusClass = {
  "Eksik": "pill--status-missing",
  "Tekrar Edildi": "pill--status-review",
  "Tamamlandı": "pill--status-done"
};

/* ------------------------- Eksik konular ------------------------- */

function renderTopicForms() {
  fillSelect(/** @type {HTMLSelectElement} */ ($("#tSubject")), store.state.settings.subjects, { keepValue: true });
  fillSelect(/** @type {HTMLSelectElement} */ ($("#tPriority")), store.PRIORITIES, { selected: "Orta" });
  fillSelect(/** @type {HTMLSelectElement} */ ($("#tStatus")), store.STATUSES, { selected: "Eksik" });

  fillSelect(/** @type {HTMLSelectElement} */ ($("#filterSubject")), store.state.settings.subjects, { empty: "Tüm dersler", keepValue: true });
  fillSelect(/** @type {HTMLSelectElement} */ ($("#filterStatus")), store.STATUSES, { empty: "Tüm durumlar", keepValue: true });
  fillSelect(/** @type {HTMLSelectElement} */ ($("#filterPriority")), store.PRIORITIES, { empty: "Tüm öncelikler", keepValue: true });
}

function filteredTopics() {
  const subject = /** @type {HTMLSelectElement} */ ($("#filterSubject"))?.value || "";
  const status = /** @type {HTMLSelectElement} */ ($("#filterStatus"))?.value || "";
  const priority = /** @type {HTMLSelectElement} */ ($("#filterPriority"))?.value || "";
  return store.state.topics.filter((t) =>
    (!subject || t.subject === subject) &&
    (!status || t.status === status) &&
    (!priority || t.priority === priority)
  );
}

function renderTopics() {
  const list = $("#topicList");
  const empty = $("#topicEmpty");
  const count = $("#topicCount");
  if (!list) return;

  const topics = filteredTopics();
  if (count) count.textContent = String(store.pendingTopics());

  if (topics.length === 0) {
    list.innerHTML = "";
    if (empty) empty.hidden = false;
    return;
  }
  if (empty) empty.hidden = true;

  list.innerHTML = topics.map((t) => `
    <div class="record" data-id="${t.id}">
      <div class="record__body">
        <div class="record__title">${esc(t.title)}</div>
        <div class="record__meta record__tags">
          <span class="pill pill--subject">${esc(t.subject)}</span>
          <span class="pill ${priorityClass[t.priority] || "pill--low"}">${esc(t.priority)}</span>
          <span class="pill ${statusClass[t.status] || ""}">${esc(t.status)}</span>
        </div>
      </div>
      <div class="record__actions" style="display:flex;gap:6px;align-items:center">
        <select data-action="status" style="min-height:38px;width:auto" aria-label="Durum">
          ${store.STATUSES.map((s) => `<option value="${s}" ${s === t.status ? "selected" : ""}>${s}</option>`).join("")}
        </select>
        <button class="icon-btn is-danger" data-action="del" title="Sil">🗑</button>
      </div>
    </div>
  `).join("");

  $$(".record", list).forEach((node) => {
    node.querySelector('[data-action="status"]')?.addEventListener("change", (e) => {
      store.updateTopic(node.dataset.id, { status: /** @type {HTMLSelectElement} */ (e.target).value });
      toast("Durum güncellendi.", "success");
    });
    node.querySelector('[data-action="del"]')?.addEventListener("click", async () => {
      const ok = await confirmDialog("Konuyu sil", "Bu eksik konu kaydı silinsin mi?", true);
      if (ok) { store.removeTopic(node.dataset.id); toast("Silindi."); }
    });
  });
}

/* ------------------------- Not kartları ------------------------- */

function renderNoteForm() {
  fillSelect(/** @type {HTMLSelectElement} */ ($("#nSubject")), store.state.settings.subjects, { keepValue: true });
}

function renderNotes() {
  const list = $("#noteList");
  const empty = $("#noteEmpty");
  const count = $("#noteCount");
  if (!list) return;
  const notes = store.state.noteCards;
  if (count) count.textContent = String(notes.length);

  if (notes.length === 0) {
    list.innerHTML = "";
    if (empty) empty.hidden = false;
    return;
  }
  if (empty) empty.hidden = true;

  list.innerHTML = notes.map((n) => `
    <article class="note-card" data-id="${n.id}">
      <div class="note-card__actions">
        <button class="icon-btn" data-action="edit" title="Düzenle">✎</button>
        <button class="icon-btn is-danger" data-action="del" title="Sil">🗑</button>
      </div>
      ${n.subject ? `<div class="note-card__subject">${esc(n.subject)}</div>` : ""}
      <div class="note-card__title">${esc(n.title)}</div>
      <div class="note-card__body">${esc(n.body)}</div>
    </article>
  `).join("");

  $$(".note-card", list).forEach((node) => {
    node.querySelector('[data-action="edit"]')?.addEventListener("click", () => openNoteModal(node.dataset.id));
    node.querySelector('[data-action="del"]')?.addEventListener("click", async () => {
      const ok = await confirmDialog("Kartı sil", "Bu not kartı silinsin mi?", true);
      if (ok) { store.removeNote(node.dataset.id); toast("Kart silindi."); }
    });
  });
}

function openNoteModal(id) {
  const n = store.state.noteCards.find((x) => x.id === id);
  if (!n) return;
  const opts = store.state.settings.subjects
    .map((s) => `<option value="${esc(s)}" ${s === n.subject ? "selected" : ""}>${esc(s)}</option>`)
    .join("");
  const bodyHTML = `
    <div class="field">
      <label for="enSubject">Ders</label>
      <select id="enSubject">${opts}</select>
    </div>
    <div class="field">
      <label for="enTitle">Başlık</label>
      <input id="enTitle" type="text" value="${esc(n.title)}" />
    </div>
    <div class="field">
      <label for="enBody">Not / Formül</label>
      <textarea id="enBody" rows="4">${esc(n.body)}</textarea>
    </div>
  `;
  openModal({
    title: "Not Kartını Düzenle",
    bodyHTML,
    confirmText: "Güncelle",
    onConfirm() {
      const body = modalBody();
      const subject = /** @type {HTMLSelectElement} */ (body.querySelector("#enSubject")).value;
      const title = /** @type {HTMLInputElement} */ (body.querySelector("#enTitle")).value.trim();
      const text = /** @type {HTMLTextAreaElement} */ (body.querySelector("#enBody")).value.trim();
      if (!title || !text) { toast("Başlık ve içerik boş olamaz.", "error"); return false; }
      store.updateNote(id, { subject, title, body: text });
      toast("Kart güncellendi.", "success");
      return true;
    }
  });
}

/* ------------------------- Kayıt işlemleri ------------------------- */

function handleTopicSubmit(e) {
  e.preventDefault();
  const subject = /** @type {HTMLSelectElement} */ ($("#tSubject")).value;
  const title = /** @type {HTMLInputElement} */ ($("#tTitle")).value.trim();
  const priority = /** @type {HTMLSelectElement} */ ($("#tPriority")).value;
  const status = /** @type {HTMLSelectElement} */ ($("#tStatus")).value;
  if (!title) { toast("Konu başlığı gir.", "error"); return; }
  store.addTopic({ subject, title, priority, status });
  toast("Eksik konu eklendi.", "success");
  /** @type {HTMLFormElement} */ (e.target).reset();
  fillSelect(/** @type {HTMLSelectElement} */ ($("#tPriority")), store.PRIORITIES, { selected: "Orta" });
  fillSelect(/** @type {HTMLSelectElement} */ ($("#tStatus")), store.STATUSES, { selected: "Eksik" });
}

function handleNoteSubmit(e) {
  e.preventDefault();
  const subject = /** @type {HTMLSelectElement} */ ($("#nSubject")).value;
  const title = /** @type {HTMLInputElement} */ ($("#nTitle")).value.trim();
  const body = /** @type {HTMLTextAreaElement} */ ($("#nBody")).value.trim();
  if (!title || !body) { toast("Başlık ve içerik zorunlu.", "error"); return; }
  store.addNote({ subject, title, body });
  toast("Not kartı eklendi.", "success");
  /** @type {HTMLFormElement} */ (e.target).reset();
}

function render() {
  renderTopicForms();
  renderTopics();
  renderNoteForm();
  renderNotes();
}

export function initNotes() {
  render();
  /** @type {HTMLFormElement|null} */
  const tf = /** @type {any} */ ($("#topicForm"));
  tf?.addEventListener("submit", handleTopicSubmit);
  /** @type {HTMLFormElement|null} */
  const nf = /** @type {any} */ ($("#noteForm"));
  nf?.addEventListener("submit", handleNoteSubmit);

  ["#filterSubject", "#filterStatus", "#filterPriority"].forEach((sel) =>
    $(sel)?.addEventListener("change", renderTopics)
  );
}

export function refreshNotes() { render(); }
