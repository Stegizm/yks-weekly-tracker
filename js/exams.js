/* =========================================================
   exams.js — Deneme Sonuç Takibi (TYT / AYT)
   ========================================================= */

import { store } from "./store.js";
import { $, $$, esc, toast, openModal, confirmDialog, modalBody, fillSelect } from "./ui.js";
import { lineChart, barChart } from "./charts.js";

/* ------------------------- Satır yardımcıları ------------------------- */

function defaultScores(type) {
  const subjects = store.EXAM_TYPES[type] || [""];
  return subjects.map((s) => ({ subject: s, correct: 0, wrong: 0, empty: 0 }));
}

function rowHTML(s) {
  return `
    <div class="exam-row" data-row>
      <input class="ex-subject" type="text" value="${esc(s.subject)}" placeholder="Ders" autocomplete="off" />
      <input class="ex-correct" type="number" min="0" inputmode="numeric" value="${s.correct || ""}" placeholder="D" />
      <input class="ex-wrong" type="number" min="0" inputmode="numeric" value="${s.wrong || ""}" placeholder="Y" />
      <input class="ex-empty" type="number" min="0" inputmode="numeric" value="${s.empty || ""}" placeholder="B" />
      <span class="ex-net">0</span>
      <button type="button" class="icon-btn is-danger" data-del-row title="Satırı sil">✕</button>
    </div>`;
}

function renderRows(container, scores) {
  container.innerHTML = scores.map(rowHTML).join("");
  recomputeNets(container);
}

function recomputeNets(container) {
  $$(".exam-row", container).forEach((row) => {
    const c = Number(/** @type {HTMLInputElement} */ (row.querySelector(".ex-correct")).value) || 0;
    const w = Number(/** @type {HTMLInputElement} */ (row.querySelector(".ex-wrong")).value) || 0;
    const net = Math.round((c - w / 4) * 100) / 100;
    const el = row.querySelector(".ex-net");
    if (el) el.textContent = String(net);
  });
}

function readRows(container) {
  const out = [];
  $$(".exam-row", container).forEach((row) => {
    const subject = /** @type {HTMLInputElement} */ (row.querySelector(".ex-subject")).value.trim();
    const correct = Number(/** @type {HTMLInputElement} */ (row.querySelector(".ex-correct")).value) || 0;
    const wrong = Number(/** @type {HTMLInputElement} */ (row.querySelector(".ex-wrong")).value) || 0;
    const empty = Number(/** @type {HTMLInputElement} */ (row.querySelector(".ex-empty")).value) || 0;
    if (!subject && !correct && !wrong && !empty) return;
    out.push({ subject: subject || "Ders", correct, wrong, empty });
  });
  return out;
}

/* ------------------------- Yanlış konu etiketleri ------------------------- */

function tagRowHTML(t) {
  return `
    <div class="exam-tag-row" data-tag-row>
      <input class="tag-subject" type="text" value="${esc(t.subject)}" placeholder="Ders" autocomplete="off" />
      <input class="tag-topic" type="text" value="${esc(t.topic)}" placeholder="Konu (örn. Türev)" autocomplete="off" />
      <input class="tag-wrong" type="number" min="0" inputmode="numeric" value="${t.wrong || ""}" placeholder="Y" />
      <button type="button" class="icon-btn is-danger" data-del-tag title="Satırı sil">✕</button>
    </div>`;
}

function renderTagRows(container, tags) {
  container.innerHTML = (tags && tags.length ? tags : []).map(tagRowHTML).join("");
}

function readTagRows(container) {
  const out = [];
  $$(".exam-tag-row", container).forEach((row) => {
    const subject = /** @type {HTMLInputElement} */ (row.querySelector(".tag-subject")).value.trim();
    const topic = /** @type {HTMLInputElement} */ (row.querySelector(".tag-topic")).value.trim();
    const wrong = Number(/** @type {HTMLInputElement} */ (row.querySelector(".tag-wrong")).value) || 0;
    if (!topic && !wrong) return;
    out.push({ subject: subject || "Ders", topic: topic || "(konu)", wrong });
  });
  return out;
}

/* ------------------------- Filtre ------------------------- */

function currentType() {
  return /** @type {HTMLSelectElement} */ ($("#examTypeFilter"))?.value || "";
}

function renderTypeFilter() {
  const sel = /** @type {HTMLSelectElement|null} */ ($("#examTypeFilter"));
  if (!sel) return;
  const types = [...new Set(store.state.exams.map((e) => e.type))];
  fillSelect(sel, types, { empty: "Tüm denemeler", keepValue: true });
}

/* ------------------------- Özet kartları / liste ------------------------- */

function renderSummary() {
  const wrap = $("#examStats");
  if (!wrap) return;
  const s = store.examStats(currentType());
  const rankCard = s.lastRank
    ? `<div class="stat stat--amber"><div class="stat__label">Son Sıralama</div><div class="stat__value">${s.lastRank.toLocaleString("tr-TR")}</div><div class="stat__hint">En iyi: ${s.bestRank.toLocaleString("tr-TR")} • Ort: ${s.avgRank.toLocaleString("tr-TR")}</div></div>`
    : "";
  wrap.innerHTML = `
    <div class="stat stat--accent">
      <div class="stat__label">Kayıt</div>
      <div class="stat__value">${store.state.exams.length}</div>
      <div class="stat__hint">${currentType() ? esc(currentType()) + " • " : ""}${s.count} deneme ortalaması</div>
    </div>
    <div class="stat stat--green">
      <div class="stat__label">Son Net</div>
      <div class="stat__value">${s.lastNet}</div>
      <div class="stat__hint">Ortalama: ${s.avgNet}</div>
    </div>
    <div class="stat stat--amber">
      <div class="stat__label">En Yüksek Net</div>
      <div class="stat__value">${s.bestNet}</div>
      <div class="stat__hint">Rekorun 🏅</div>
    </div>
    ${rankCard}`;
}

function renderTrend() {
  const netWrap = $("#examTrend");
  const rankWrap = $("#examRankTrend");
  const s = store.examStats(currentType());

  if (netWrap) {
    netWrap.innerHTML = s.series.length
      ? lineChart(s.series, { color: "#34D399", height: 220 })
      : `<div class="chart-empty">Henüz deneme kaydı yok. İlk denemeni ekle.</div>`;
  }
  if (rankWrap) {
    rankWrap.innerHTML = s.rankSeries.length >= 2
      ? lineChart(s.rankSeries, { color: "#FBBF24", height: 220 })
      : `<div class="chart-empty">Sıralama trendi için en az 2 denemeye sıralama gir.</div>`;
  }
}

function renderSubjectChart() {
  const wrap = $("#examSubjectChart");
  if (!wrap) return;
  const s = store.examStats(currentType());
  if (s.subjectTotals.length === 0) {
    wrap.innerHTML = `<div class="chart-empty">Ders netleri için deneme gir.</div>`;
    return;
  }
  wrap.innerHTML = barChart(
    s.subjectTotals.map((r) => ({
      label: r.subject,
      value: Math.max(0, r.net),
      color: r.net < 0 ? "#EF4444" : "#8B5CF6"
    })),
    { height: 210 }
  );
}

function renderList() {
  const list = $("#examList");
  const empty = $("#examEmpty");
  const count = $("#examCount");
  if (!list) return;
  const exams = [...store.state.exams]
    .filter((e) => !currentType() || e.type === currentType())
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  if (count) count.textContent = String(exams.length);

  if (exams.length === 0) {
    list.innerHTML = "";
    if (empty) empty.hidden = false;
    return;
  }
  if (empty) empty.hidden = true;

  list.innerHTML = exams.map((e) => {
    const st = store.examNet(e);
    const chips = e.scores.map((sc) => {
      const net = Math.round((sc.correct - sc.wrong / 4) * 100) / 100;
      return `<span class="exam-chip"><strong>${esc(sc.subject)}</strong> ${sc.correct}D ${sc.wrong}Y → ${net}</span>`;
    }).join("");
    const tags = (e.tags || []).map((t) =>
      `<span class="exam-chip exam-chip--warn">⚠ ${esc(t.topic)} <small>${esc(t.subject)}</small> · ${t.wrong}Y</span>`).join("");
    return `
      <div class="record exam-card" data-id="${e.id}">
        <div class="record__body">
          <div class="record__title">
            ${esc(e.name || e.type)}
            <span class="pill pill--subject">${esc(e.type)}</span>
            ${e.rank ? `<span class="pill pill--low">Sıra: ${e.rank.toLocaleString("tr-TR")}</span>` : ""}
          </div>
          <div class="record__meta">
            <span>${esc(store.fmtTR(e.date))}</span>
            <span>Net: <strong>${st.net}</strong></span>
            <span class="pill pill--ok">D: ${st.correct}</span>
            <span class="pill pill--bad">Y: ${st.wrong}</span>
            <span class="pill pill--low">B: ${st.empty}</span>
          </div>
          <div class="exam-chips">${chips}</div>
          ${tags ? `<div class="exam-chips exam-chips--tags">${tags}</div>` : ""}
        </div>
        <div class="record__actions">
          <button class="icon-btn" data-action="edit" title="Düzenle">✎</button>
          <button class="icon-btn is-danger" data-action="del" title="Sil">🗑</button>
        </div>
      </div>`;
  }).join("");

  $$(".exam-card", list).forEach((node) => {
    node.querySelector('[data-action="edit"]')?.addEventListener("click", () => openExamModal(node.dataset.id));
    node.querySelector('[data-action="del"]')?.addEventListener("click", async () => {
      const ok = await confirmDialog("Denemeyi sil", "Bu deneme kaydı silinsin mi?", true);
      if (ok) { store.removeExam(node.dataset.id); toast("Deneme silindi."); }
    });
  });
}

function renderWrongTopics() {
  const wrap = $("#examWrongTopics");
  if (!wrap) return;
  const tops = store.examWrongTopics(currentType()).slice(0, 10);
  if (tops.length === 0) {
    wrap.innerHTML = `<div class="chart-empty">Denemelerde “yanlış yapılan konu” etiketlersen burada en çok zorlandığın konular listelenir.</div>`;
    return;
  }
  const max = Math.max(1, ...tops.map((t) => t.wrong));
  wrap.innerHTML = tops.map((t) => `
    <div class="subj-bar">
      <div class="subj-bar__top"><span>${esc(t.topic)} <small>(${esc(t.subject)})</small></span><span>${t.wrong} yanlış</span></div>
      <div class="subj-bar__track"><span style="width:${Math.round((t.wrong / max) * 100)}%; background:linear-gradient(90deg,#EF4444,#FBBF24)"></span></div>
    </div>`).join("");
}

function render() {
  renderTypeFilter();
  renderSummary();
  renderTrend();
  renderSubjectChart();
  renderWrongTopics();
  renderList();
}

/* ------------------------- Deneme ekle/düzenle modalı ------------------------- */

function openExamModal(id) {
  const isEdit = Boolean(id);
  const exam = isEdit ? store.state.exams.find((e) => e.id === id) : null;
  const type = exam?.type || "TYT";
  const scores = exam?.scores?.length ? exam.scores : defaultScores(type);

  const typeOptions = Object.keys(store.EXAM_TYPES)
    .map((t) => `<option value="${esc(t)}" ${t === type ? "selected" : ""}>${esc(t)}</option>`)
    .join("");

  const bodyHTML = `
    <div class="grid-2">
      <div class="field">
        <label for="exDate">Tarih</label>
        <input id="exDate" type="date" value="${exam?.date || store.toISO()}" />
      </div>
      <div class="field">
        <label for="exType">Deneme Türü</label>
        <select id="exType">${typeOptions}</select>
      </div>
    </div>
    <div class="grid-2">
      <div class="field">
        <label for="exName">Deneme Adı / Yayın</label>
        <input id="exName" type="text" value="${esc(exam?.name || "")}" placeholder="örn. 3D TYT-4" autocomplete="off" />
      </div>
      <div class="field">
        <label for="exRank">Sıralama (opsiyonel)</label>
        <input id="exRank" type="number" min="0" value="${exam?.rank || ""}" placeholder="örn. 12500" />
      </div>
    </div>
    <div class="field">
      <label>Ders Sonuçları (Doğru / Yanlış / Boş)</label>
      <div class="exam-table">
        <div class="exam-row exam-row--head">
          <span>Ders</span><span>D</span><span>Y</span><span>B</span><span>Net</span><span></span>
        </div>
        <div id="examRows"></div>
      </div>
      <button type="button" class="btn btn--sm" id="exAddRow">＋ Ders ekle</button>
    </div>
    <div class="field">
      <label>Yanlış Yapılan Konular (opsiyonel)</label>
      <div class="exam-table exam-tags" id="exTagRows"></div>
      <button type="button" class="btn btn--sm" id="exAddTag">＋ Konu ekle</button>
    </div>
  `;

  openModal({
    title: isEdit ? "Denemeyi Düzenle" : "Yeni Deneme Kaydı",
    bodyHTML,
    confirmText: isEdit ? "Güncelle" : "Kaydet",
    onConfirm() {
      const body = modalBody();
      const date = /** @type {HTMLInputElement} */ (body.querySelector("#exDate")).value || store.toISO();
      const name = /** @type {HTMLInputElement} */ (body.querySelector("#exName")).value.trim();
      const rank = Number(/** @type {HTMLInputElement} */ (body.querySelector("#exRank")).value) || 0;
      const t = /** @type {HTMLSelectElement} */ (body.querySelector("#exType")).value;
      const rows = readRows(/** @type {HTMLElement} */ (body.querySelector("#examRows")));
      const tags = readTagRows(/** @type {HTMLElement} */ (body.querySelector("#exTagRows")));
      if (rows.length === 0) { toast("En az bir ders sonucu gir.", "error"); return false; }
      if (isEdit) store.updateExam(id, { date, name, type: t, rank, scores: rows, tags });
      else store.addExam({ date, name, type: t, rank, scores: rows, tags });
      toast(isEdit ? "Deneme güncellendi." : "Deneme kaydedildi. +50 XP 🎉", "success");
      return true;
    }
  });

  const rowsWrap = /** @type {HTMLElement|null} */ ($("#examRows"));
  if (rowsWrap) renderRows(rowsWrap, scores);
  const tagsWrap = /** @type {HTMLElement|null} */ ($("#exTagRows"));
  if (tagsWrap) renderTagRows(tagsWrap, exam?.tags || []);
}

/* ------------------------- Modal içi etkileşim (delegasyon) ------------------------- */

function bindModalEvents() {
  document.addEventListener("input", (e) => {
    const t = /** @type {HTMLElement} */ (e.target);
    if (t.classList.contains("ex-correct") || t.classList.contains("ex-wrong")) {
      const table = t.closest("#examRows");
      if (table) recomputeNets(table);
    }
  });

  document.addEventListener("click", (e) => {
    const t = /** @type {HTMLElement} */ (e.target);
    if (t.closest("[data-del-row]")) {
      const row = t.closest(".exam-row");
      const table = row?.parentElement;
      row?.remove();
      if (table) recomputeNets(table);
      return;
    }
    if (t.closest("[data-del-tag]")) {
      t.closest(".exam-tag-row")?.remove();
      return;
    }
    if (t.id === "exAddRow") {
      const table = /** @type {HTMLElement|null} */ ($("#examRows"));
      if (!table) return;
      table.insertAdjacentHTML("beforeend", rowHTML({ subject: "", correct: 0, wrong: 0, empty: 0 }));
      recomputeNets(table);
      return;
    }
    if (t.id === "exAddTag") {
      const tags = /** @type {HTMLElement|null} */ ($("#exTagRows"));
      if (tags) tags.insertAdjacentHTML("beforeend", tagRowHTML({ subject: "", topic: "", wrong: 0 }));
    }
  });

  document.addEventListener("change", (e) => {
    const t = /** @type {HTMLElement} */ (e.target);
    if (t.id === "exType") {
      const table = /** @type {HTMLElement|null} */ ($("#examRows"));
      if (table) renderRows(table, defaultScores(/** @type {HTMLSelectElement} */ (t).value));
    }
  });
}

/* ------------------------- Başlat ------------------------- */

export function initExams() {
  render();
  bindModalEvents();
  $("#btnAddExam")?.addEventListener("click", () => openExamModal());
  $("#examTypeFilter")?.addEventListener("change", render);
}

export function refreshExams() { render(); }
