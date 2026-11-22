/* =========================================================
   schedule.js — Modül A: Haftalık Program & Blok Takipçisi
   ========================================================= */

import { store } from "./store.js";
import { $, $$, esc, toast, openModal, confirmDialog, modalBody } from "./ui.js";

/** @type {import('./store.js').DayKey} */
let activeDay = "monday";

function subjectDatalistHTML() {
  const opts = store.state.settings.subjects
    .map((s) => `<option value="${esc(s)}"></option>`)
    .join("");
  return `<datalist id="subjectList">${opts}</datalist>`;
}

function renderDayTabs() {
  const wrap = $("#dayTabs");
  if (!wrap) return;
  wrap.innerHTML = store.DAYS.map((d) => {
    const st = store.dayStats(d.key);
    const active = d.key === activeDay;
    const count = st.total ? `<span class="day-tab__pct">${st.done}/${st.total}</span>` : "";
    return `<button class="day-tab ${active ? "is-active" : ""}" role="tab"
      aria-selected="${active}" data-day="${d.key}">
      ${esc(d.short)} ${count}
    </button>`;
  }).join("");

  $$(".day-tab", wrap).forEach((btn) => {
    btn.addEventListener("click", () => {
      activeDay = /** @type {any} */ (btn.dataset.day);
      render();
    });
  });
}

function renderBlocks() {
  const list = $("#blockList");
  const empty = $("#blockEmpty");
  if (!list) return;
  const blocks = store.state.schedule[activeDay] || [];

  if (blocks.length === 0) {
    list.innerHTML = "";
    if (empty) empty.hidden = false;
    return;
  }
  if (empty) empty.hidden = true;

  list.innerHTML = blocks.map((b, i) => `
    <article class="block ${b.done ? "is-done" : ""}" data-id="${b.id}">
      <div class="block__check">
        <input class="check" type="checkbox" ${b.done ? "checked" : ""}
          data-action="toggle" aria-label="Tamamlandı olarak işaretle" />
      </div>
      <div class="block__main">
        <div class="block__title-row">
          ${b.subject ? `<span class="block__subject">${esc(b.subject)}</span>` : ""}
          ${b.startTime && b.endTime ? `<span class="block__time">🕒 ${esc(b.startTime)}–${esc(b.endTime)}</span>` : ""}
          ${b.minutes ? `<span class="block__time">${b.minutes} dk</span>` : ""}
          ${b.questionTarget ? `<span class="block__q">🎯 ${b.questionTarget} soru</span>` : ""}
        </div>
        <div class="block__task">${esc(b.task) || "<em>(açıklama yok)</em>"}</div>
      </div>
      <div class="block__actions">
        <button class="icon-btn" data-action="up" title="Yukarı taşı" ${i === 0 ? "disabled" : ""}>↑</button>
        <button class="icon-btn" data-action="down" title="Aşağı taşı" ${i === blocks.length - 1 ? "disabled" : ""}>↓</button>
        <button class="icon-btn" data-action="edit" title="Düzenle">✎</button>
        <button class="icon-btn is-danger" data-action="del" title="Sil">🗑</button>
      </div>
    </article>
  `).join("");

  $$(".block", list).forEach((node) => {
    const id = node.dataset.id;
    node.querySelector('[data-action="toggle"]')?.addEventListener("change", () => store.toggleBlock(activeDay, id));
    node.querySelector('[data-action="up"]')?.addEventListener("click", () => store.moveBlock(activeDay, id, -1));
    node.querySelector('[data-action="down"]')?.addEventListener("click", () => store.moveBlock(activeDay, id, 1));
    node.querySelector('[data-action="edit"]')?.addEventListener("click", () => openBlockModal(id));
    node.querySelector('[data-action="del"]')?.addEventListener("click", () => deleteBlock(id));
  });
}

function renderSummary() {
  const ws = store.weekStats();
  const label = `${store.fmtTR(ws.weekStart)} – ${store.fmtTR(store.addDays(ws.weekStart, 6))}`;
  const wl = $("#weekLabel");
  if (wl) wl.textContent = label;

  const sum = $("#scheduleSummary");
  if (sum) {
    if (ws.totalBlocks === 0) {
      sum.textContent = "Plan boş. Blok ekleyerek haftanı oluştur.";
    } else {
      const qInfo = ws.plannedQuestions ? ` • 🎯 ${ws.completedQuestionTarget}/${ws.plannedQuestions} hedef soru` : "";
      sum.textContent = `Bu hafta ${ws.completedBlocks}/${ws.totalBlocks} blok tamamlandı • %${ws.pct} • ${ws.doneMinutes} dk${qInfo}`;
    }
  }
}

function render() {
  renderDayTabs();
  renderBlocks();
  renderSummary();
}

/* ------------------------- Modal: blok ekle/düzenle ------------------------- */

function openBlockModal(id) {
  const isEdit = Boolean(id);
  const block = isEdit
    ? (store.state.schedule[activeDay].find((b) => b.id === id))
    : null;

  const bodyHTML = `
    <div class="field">
      <label for="bSubject">Ders / Etiket</label>
      <input id="bSubject" list="subjectList" type="text" placeholder="örn. Matematik"
        value="${esc(block?.subject || "")}" autocomplete="off" />
      ${subjectDatalistHTML()}
      <small class="field-hint">Listede yoksa yaz; yeni ders olarak otomatik eklenir.</small>
    </div>
    <div class="field">
      <label for="bTask">Görev / Hedef Açıklaması</label>
      <input id="bTask" type="text" placeholder="örn. 25 soru çöz"
        value="${esc(block?.task || "")}" autocomplete="off" />
    </div>
    <div class="grid-2">
      <div class="field">
        <label for="bStart">Başlangıç Saati</label>
        <input id="bStart" type="time" value="${block?.startTime || ""}" />
      </div>
      <div class="field">
        <label for="bEnd">Bitiş Saati</label>
        <input id="bEnd" type="time" value="${block?.endTime || ""}" />
      </div>
    </div>
    <div class="grid-2">
      <div class="field">
        <label for="bMinutes">Tahmini Süre (dk)</label>
        <input id="bMinutes" type="number" min="0" max="600" inputmode="numeric"
          placeholder="örn. 40" value="${block?.minutes || ""}" />
      </div>
      <div class="field">
        <label for="bQuestionTarget">Hedef Soru Sayısı</label>
        <input id="bQuestionTarget" type="number" min="0" inputmode="numeric"
          placeholder="örn. 25" value="${block?.questionTarget || ""}" />
        <div class="quick-picks" id="bQQuick" role="group" aria-label="Hızlı soru seçimi">
          ${[10, 15, 20, 25, 30, 40].map((n) => `<button type="button" class="quick-chip" data-q="${n}">${n}</button>`).join("")}
        </div>
      </div>
    </div>
  `;

  openModal({
    title: isEdit ? "Bloğu Düzenle" : "Yeni Çalışma Bloğu",
    bodyHTML,
    confirmText: isEdit ? "Güncelle" : "Ekle",
    onConfirm() {
      const body = modalBody();
      const subject = /** @type {HTMLInputElement} */ (body.querySelector("#bSubject")).value.trim();
      const task = /** @type {HTMLInputElement} */ (body.querySelector("#bTask")).value.trim();
      const startTime = /** @type {HTMLInputElement} */ (body.querySelector("#bStart")).value;
      const endTime = /** @type {HTMLInputElement} */ (body.querySelector("#bEnd")).value;
      const minutes = Number(/** @type {HTMLInputElement} */ (body.querySelector("#bMinutes")).value) || 0;
      const questionTarget = Number(/** @type {HTMLInputElement} */ (body.querySelector("#bQuestionTarget")).value) || 0;
      if (!task) { toast("Görev açıklaması boş olamaz.", "error"); return false; }
      if (startTime && endTime && endTime <= startTime) {
        toast("Bitiş saati başlangıçtan sonra olmalı.", "error");
        return false;
      }
      if (subject) store.addSubject(subject);
      const payload = { subject, task, minutes, startTime, endTime, questionTarget };
      if (isEdit) store.updateBlock(activeDay, id, payload);
      else store.addBlock(activeDay, payload);
      toast(isEdit ? "Blok güncellendi." : "Blok eklendi.", "success");
      return true;
    }
  });

  // Hedef soru için hızlı seçim çipleri
  const input = /** @type {HTMLInputElement|null} */ ($("#bQuestionTarget"));
  const markActive = () => {
    if (!input) return;
    $$("#bQQuick .quick-chip").forEach((c) =>
      c.classList.toggle("is-active", Number(/** @type {HTMLElement} */ (c).dataset.q) === Number(input.value))
    );
  };
  $$("#bQQuick .quick-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      if (!input) return;
      input.value = /** @type {HTMLElement} */ (chip).dataset.q || "";
      markActive();
    });
  });
  input?.addEventListener("input", markActive);
  markActive();
}

async function deleteBlock(id) {
  const ok = await confirmDialog("Bloğu sil", "Bu çalışma bloğu silinsin mi?", true);
  if (ok) { store.removeBlock(activeDay, id); toast("Blok silindi."); }
}

/* ------------------------- Aksiyonlar ------------------------- */

function openCopyModal() {
  const others = store.DAYS.filter((d) => d.key !== activeDay);
  const bodyHTML = `
    <p class="view__sub">“<strong>${esc(store.DAYS.find((d) => d.key === activeDay)?.label || "")}</strong>”
    gününün bloklarını seçtiğin günlere kopyala (mevcut içeriğin değişir):</p>
    <div class="field">
      ${others.map((d) => `
        <label style="display:flex;align-items:center;gap:10px;min-height:38px;font-weight:600;color:var(--text)">
          <input type="checkbox" class="copy-day" value="${d.key}" style="width:20px;min-height:auto;height:20px" />
          ${esc(d.label)}
        </label>
      `).join("")}
    </div>
  `;
  openModal({
    title: "Günü Kopyala",
    bodyHTML,
    confirmText: "Kopyala",
    onConfirm() {
      const body = modalBody();
      const targets = Array.from(body.querySelectorAll(".copy-day:checked")).map(
        (c) => /** @type {HTMLInputElement} */ (c).value
      );
      if (targets.length === 0) { toast("En az bir gün seç.", "error"); return false; }
      store.copyDay(activeDay, /** @type {any} */ (targets));
      toast(`${targets.length} güne kopyalandı.`, "success");
      return true;
    }
  });
}

async function clearWeekAction() {
  const ok = await confirmDialog(
    "Haftayı Temizle",
    "Tüm günlerdeki bloklar kalıcı olarak silinecek. Emin misin?",
    true
  );
  if (ok) { store.clearWeek(); toast("Hafta temizlendi."); }
}

async function newWeekAction() {
  const ws = store.weekStats();
  const oldWeek = store.weekStart;
  const ok = await confirmDialog(
    "Yeni Haftaya Geç",
    `Bu hafta arşive kaydedilecek (${ws.completedBlocks}/${ws.totalBlocks} blok, ${ws.solvedQuestions} soru) ve tüm tikler sıfırlanacak. Program yapın korunur. Devam?`,
    false
  );
  if (!ok) return;
  store.startNewWeek();
  let msg = "Yeni haftaya geçildi.";
  if (store.state.settings.autoBackup !== false) {
    try {
      store.downloadJSON(`yks-yedek-${oldWeek}.json`);
      msg = "Yeni haftaya geçildi. Yedek indirildi.";
    } catch { /* yoksay */ }
  }
  toast(msg, "success");
}

/* ------------------------- Başlat ------------------------- */

export function initSchedule() {
  render();
  $("#btnAddBlock")?.addEventListener("click", () => openBlockModal());
  $("#btnCopyDay")?.addEventListener("click", openCopyModal);
  $("#btnClearWeek")?.addEventListener("click", clearWeekAction);
  $("#btnNewWeek")?.addEventListener("click", newWeekAction);
}

/** Uygulama yeniden render edildiğinde (başka modül değişince) çağrılır. */
export function refreshSchedule() { render(); }
