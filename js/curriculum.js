/* =========================================================
   curriculum.js — Müfredat / Konu Takip Matrisi
   ========================================================= */

import { store } from "./store.js";
import { $, $$, esc, toast, fillSelect, confirmDialog, openModal, modalBody } from "./ui.js";

const STATUS_CLASS = {
  "Hiç Başlanmadı": "curr--none",
  "Çalışılıyor": "curr--working",
  "Tekrar Lazım": "curr--review",
  "Tamam": "curr--done"
};

function subjectsForGrade(grade) {
  const allowedSet = new Set(grade ? [grade] : store.curriculumGrades());
  const set = new Set();
  for (const i of store.state.curriculum) {
    if (allowedSet.has(i.grade)) set.add(i.subject);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "tr"));
}

function renderFilters() {
  const system = store.state.settings.curriculumSystem;
  const grades = store.curriculumGrades(system);
  const sysSel = /** @type {HTMLSelectElement|null} */ ($("#currSystemSelect"));
  if (sysSel) {
    sysSel.innerHTML = Object.entries(store.CURRICULUM_SYSTEMS)
      .map(([k, v]) => `<option value="${k}" ${k === system ? "selected" : ""}>${esc(v.label)}</option>`).join("");
  }
  const gradeFilter = /** @type {HTMLSelectElement|null} */ ($("#currGradeFilter"));
  if (gradeFilter) fillSelect(gradeFilter, grades, { empty: "Tüm seviyeler", keepValue: true });

  const grade = gradeFilter?.value || "";
  fillSelect(/** @type {HTMLSelectElement} */ ($("#currSubjectFilter")), subjectsForGrade(grade), { empty: "Tüm dersler", keepValue: true });
  fillSelect(/** @type {HTMLSelectElement} */ ($("#currStatusFilter")), store.CURRICULUM_STATUSES, { empty: "Tüm durumlar", keepValue: true });
  fillSelect(/** @type {HTMLSelectElement} */ ($("#currGrade")), grades, { keepValue: true });
  fillSelect(/** @type {HTMLSelectElement} */ ($("#currStatus")), store.CURRICULUM_STATUSES, { selected: "Hiç Başlanmadı" });
}

function renderOverview() {
  const wrap = $("#curriculumOverview");
  if (!wrap) return;
  const grade = /** @type {HTMLSelectElement} */ ($("#currGradeFilter"))?.value || "";
  const p = store.curriculumProgress(grade);
  const bySubject = store.curriculumBySubject(grade);

  wrap.innerHTML = `
    <div class="card curr-overview">
      <div class="curr-overview__top">
        <div>
          <div class="stat__label">${grade ? esc(grade) : "Tüm Müfredat"} İlerlemesi</div>
          <div class="curr-overview__pct">%${p.pct}</div>
        </div>
        <div class="curr-legend">
          <span class="curr--done">Tamam ${p.done}</span>
          <span class="curr--working">Çalışılıyor ${p.working}</span>
          <span class="curr--review">Tekrar ${p.review}</span>
          <span class="curr--none">Başlanmadı ${p.notStarted}</span>
        </div>
      </div>
      <div class="goal-bar"><span style="width:${p.pct}%"></span></div>
      <div class="curr-subjects">
        ${bySubject.map((s) => `
          <div class="curr-subj">
            <div class="curr-subj__top"><span>${esc(s.subject)}</span><span>${s.done}/${s.total} • %${s.pct}</span></div>
            <div class="subj-bar__track"><span style="width:${s.pct}%"></span></div>
          </div>`).join("")}
      </div>
    </div>`;
}

function filteredItems() {
  const grade = /** @type {HTMLSelectElement} */ ($("#currGradeFilter"))?.value || "";
  const subject = /** @type {HTMLSelectElement} */ ($("#currSubjectFilter"))?.value || "";
  const status = /** @type {HTMLSelectElement} */ ($("#currStatusFilter"))?.value || "";
  const allowedSet = new Set(store.curriculumGrades());
  return store.state.curriculum.filter((i) =>
    allowedSet.has(i.grade) &&
    (!grade || i.grade === grade) &&
    (!subject || i.subject === subject) &&
    (!status || i.status === status)
  );
}

function itemHTML(i) {
  return `
    <div class="record curr-item" data-id="${i.id}">
      <div class="record__body">
        <div class="record__title">${esc(i.topic)}</div>
        <div class="record__meta">
          <span class="pill pill--subject">${esc(i.subject)}</span>
          ${i.reviewDate ? `<span class="pill pill--mid">📅 ${esc(store.fmtTR(i.reviewDate))}</span>` : ""}
          ${i.minutes ? `<span class="pill pill--low">⏱ ${i.minutes} dk</span>` : ""}
        </div>
      </div>
      <div class="curr-item__actions">
        <button class="icon-btn" data-action="meta" title="Tekrar tarihi / süre">🗓</button>
        <select data-action="status" class="curr-status ${STATUS_CLASS[i.status] || ""}" aria-label="Durum">
          ${store.CURRICULUM_STATUSES.map((s) => `<option value="${s}" ${s === i.status ? "selected" : ""}>${s}</option>`).join("")}
        </select>
        <button class="icon-btn is-danger" data-action="del" title="Sil">🗑</button>
      </div>
    </div>`;
}

function renderList() {
  const list = $("#curriculumList");
  const empty = $("#curriculumEmpty");
  const count = $("#currCount");
  if (!list) return;
  const items = filteredItems();
  if (count) count.textContent = String(items.length);

  if (items.length === 0) {
    list.innerHTML = "";
    if (empty) empty.hidden = false;
    return;
  }
  if (empty) empty.hidden = true;

  // Sınıf/seviyeye göre grupla (karışıklığı önler)
  const groups = new Map();
  for (const i of items) {
    if (!groups.has(i.grade)) groups.set(i.grade, []);
    groups.get(i.grade).push(i);
  }
  const order = [...store.curriculumGrades(), ...groups.keys()];
  const orderedGrades = [...new Set(order)].filter((g) => groups.has(g));

  list.innerHTML = orderedGrades.map((grade) => {
    const arr = groups.get(grade);
    const done = arr.filter((x) => x.status === "Tamam").length;
    const pct = arr.length ? Math.round((done / arr.length) * 100) : 0;
    return `
      <section class="curr-group">
        <div class="curr-group__head">
          <span class="curr-group__name">${esc(grade)}</span>
          <span class="curr-group__meta">${done}/${arr.length} • %${pct}</span>
        </div>
        <div class="curr-group__list">${arr.map(itemHTML).join("")}</div>
      </section>`;
  }).join("");

  $$(".curr-item", list).forEach((node) => {
    const id = node.dataset.id;
    node.querySelector('[data-action="meta"]')?.addEventListener("click", () => openTopicMeta(id));
    node.querySelector('[data-action="status"]')?.addEventListener("change", (e) => {
      store.updateCurriculumTopic(id, { status: /** @type {HTMLSelectElement} */ (e.target).value });
    });
    node.querySelector('[data-action="del"]')?.addEventListener("click", async () => {
      const ok = await confirmDialog("Konuyu sil", "Bu konu matristen silinsin mi?", true);
      if (ok) { store.removeCurriculumTopic(id); toast("Konu silindi."); }
    });
  });
}

function openTopicMeta(id) {
  const t = store.state.curriculum.find((x) => x.id === id);
  if (!t) return;
  const bodyHTML = `
    <p class="view__sub">${esc(t.subject)} • ${esc(t.topic)}</p>
    <div class="grid-2">
      <div class="field">
        <label for="ctReview">Tekrar Tarihi</label>
        <input id="ctReview" type="date" value="${t.reviewDate || ""}" />
      </div>
      <div class="field">
        <label for="ctMinutes">Çalışma Süresi (dk)</label>
        <input id="ctMinutes" type="number" min="0" inputmode="numeric" value="${t.minutes || ""}" placeholder="örn. 45" />
      </div>
    </div>`;
  openModal({
    title: "Konu Detayı",
    bodyHTML,
    confirmText: "Kaydet",
    onConfirm() {
      const body = modalBody();
      store.updateCurriculumTopic(id, {
        reviewDate: /** @type {HTMLInputElement} */ (body.querySelector("#ctReview")).value,
        minutes: Number(/** @type {HTMLInputElement} */ (body.querySelector("#ctMinutes")).value) || 0
      });
      toast("Konu güncellendi.", "success");
      return true;
    }
  });
}

function render() {
  renderFilters();
  renderOverview();
  renderList();
}

function handleAdd(e) {
  e.preventDefault();
  const grade = /** @type {HTMLSelectElement} */ ($("#currGrade")).value;
  const subject = /** @type {HTMLInputElement} */ ($("#currSubject")).value.trim();
  const topic = /** @type {HTMLInputElement} */ ($("#currTopic")).value.trim();
  const status = /** @type {HTMLSelectElement} */ ($("#currStatus")).value;
  if (!subject || !topic) { toast("Ders ve konu yaz.", "error"); return; }
  store.addCurriculumTopic({ grade, subject, topic, status });
  store.addSubject(subject);
  toast("Konu eklendi.", "success");
  /** @type {HTMLFormElement} */ (e.target).reset();
  fillSelect(/** @type {HTMLSelectElement} */ ($("#currStatus")), store.CURRICULUM_STATUSES, { selected: "Hiç Başlanmadı" });
}

export function initCurriculum() {
  render();
  ["#currGradeFilter", "#currSubjectFilter", "#currStatusFilter"].forEach((sel) =>
    $(sel)?.addEventListener("change", () => {
      if (sel === "#currGradeFilter") {
        const s = /** @type {HTMLSelectElement} */ ($("#currSubjectFilter"));
        if (s) s.value = "";
      }
      render();
    })
  );

  $("#currSystemSelect")?.addEventListener("change", (e) => {
    store.setCurriculumSystem(/** @type {HTMLSelectElement} */ (e.target).value);
    const gf = /** @type {HTMLSelectElement} */ ($("#currGradeFilter"));
    const sf = /** @type {HTMLSelectElement} */ ($("#currSubjectFilter"));
    if (gf) gf.value = "";
    if (sf) sf.value = "";
    render();
  });

  // Ekleme formundaki seviye değişince liste de o seviyeye odaklanır
  $("#currGrade")?.addEventListener("change", (e) => {
    const v = /** @type {HTMLSelectElement} */ (e.target).value;
    const gf = /** @type {HTMLSelectElement} */ ($("#currGradeFilter"));
    const sf = /** @type {HTMLSelectElement} */ ($("#currSubjectFilter"));
    if (gf) gf.value = v;
    if (sf) sf.value = "";
    render();
  });

  /** @type {HTMLFormElement|null} */
  const form = /** @type {any} */ ($("#currAddForm"));
  form?.addEventListener("submit", handleAdd);

  $("#btnSeedCurriculum")?.addEventListener("click", async () => {
    const ok = await confirmDialog(
      "Konuları Yükle",
      "Hazır 11. Sınıf ve TYT konu listesi eklenecek. Mevcut konular korunur, aynı olanlar tekrar eklenmez. Devam?",
      false
    );
    if (!ok) return;
    const before = store.state.curriculum.length;
    store.seedCurriculum(false);
    // seed var olanı korur; yine de bilgi ver
    toast(`Konu listesi yüklendi (${store.state.curriculum.length - before} yeni).`, "success");
  });
}

export function refreshCurriculum() { render(); }