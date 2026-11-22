/* =========================================================
   dashboard.js — Modül E: Rütbe, Görevler, Grafikler, Arşiv
   ========================================================= */

import { store } from "./store.js";
import { $, $$, esc, toast, confirmDialog, openModal, modalBody } from "./ui.js";
import { lineChart, donut, heatmap, stackedBarChart } from "./charts.js";
import { questsHTML } from "./quests.js";

/* ------------------------- Hedef ------------------------- */

function renderGoal() {
  const wrap = $("#goalCard");
  if (!wrap) return;
  const g = store.goalStatus();
  const goal = g.goal;
  const hasGoal = goal.targetNet > 0 || goal.targetRank > 0;
  const typeLabel = goal.examType || "Tüm denemeler";

  const netBlock = goal.targetNet > 0 ? `
    <div class="goal-row">
      <div class="goal-row__top">
        <span>Net Hedefi <strong>${g.lastNet}</strong> / ${goal.targetNet}</span>
        <span class="${g.netReached ? "goal-ok" : "goal-gap"}">${g.netReached ? "Hedefe ulaşıldı 🎯" : `${Math.abs(g.netGap)} net kaldı`}</span>
      </div>
      <div class="goal-bar"><span style="width:${g.netPct}%"></span></div>
    </div>` : "";

  const rankBlock = goal.targetRank > 0 ? `
    <div class="goal-row">
      <div class="goal-row__top">
        <span>Sıralama Hedefi <strong>${g.lastRank ? g.lastRank.toLocaleString("tr-TR") : "—"}</strong> / ${goal.targetRank.toLocaleString("tr-TR")}</span>
        <span class="${g.rankReached ? "goal-ok" : "goal-gap"}">${g.rankReached ? "Hedefe ulaşıldı 🏅" : (g.lastRank ? `${g.rankGap.toLocaleString("tr-TR")} sıra kaldı` : "Denemeye sıralama gir")}</span>
      </div>
      <div class="goal-bar goal-bar--rank"><span style="width:${g.rankPct}%"></span></div>
    </div>` : "";

  wrap.innerHTML = `
    <div class="goal">
      <div class="goal__head">
        <div>
          <h2>Hedefim</h2>
          <p class="goal__sub">${esc(typeLabel)}${goal.label ? " • " + esc(goal.label) : ""}</p>
        </div>
        <button class="btn btn--sm" id="btnEditGoal" type="button">Hedefi Düzenle</button>
      </div>
      ${hasGoal
        ? `${netBlock}${rankBlock}
           <p class="goal__hint">Ortalama net: <strong>${g.avgNet}</strong>${g.avgRank ? ` • Ort. sıra: <strong>${g.avgRank.toLocaleString("tr-TR")}</strong>` : ""} • ${g.count} deneme</p>`
        : `<p class="goal__empty">Henüz hedef belirlemedin. Net/sıralama hedefi koyup gelişimini takip et.</p>`}
    </div>`;

  $("#btnEditGoal")?.addEventListener("click", openGoalModal);
}

function openGoalModal() {
  const g = store.state.settings.goal;
  const typeOptions = [`<option value="">Tüm denemeler</option>`]
    .concat(Object.keys(store.EXAM_TYPES).map((t) =>
      `<option value="${esc(t)}" ${g.examType === t ? "selected" : ""}>${esc(t)}</option>`))
    .join("");

  openModal({
    title: "Hedef Belirle",
    bodyHTML: `
      <div class="field">
        <label for="gLabel">Hedef Bölüm / Üniversite (opsiyonel)</label>
        <input id="gLabel" type="text" value="${esc(g.label || "")}" placeholder="örn. Bilgisayar Mühendisliği" />
      </div>
      <div class="field">
        <label for="gType">Deneme Türü</label>
        <select id="gType">${typeOptions}</select>
      </div>
      <div class="grid-2">
        <div class="field">
          <label for="gNet">Hedef Net</label>
          <input id="gNet" type="number" min="0" step="0.25" value="${g.targetNet || ""}" placeholder="örn. 90" />
        </div>
        <div class="field">
          <label for="gRank">Hedef Sıralama</label>
          <input id="gRank" type="number" min="0" value="${g.targetRank || ""}" placeholder="örn. 5000" />
        </div>
      </div>`,
    confirmText: "Kaydet",
    onConfirm() {
      const body = modalBody();
      store.setGoal({
        label: /** @type {HTMLInputElement} */ (body.querySelector("#gLabel")).value,
        examType: /** @type {HTMLSelectElement} */ (body.querySelector("#gType")).value,
        targetNet: Number(/** @type {HTMLInputElement} */ (body.querySelector("#gNet")).value) || 0,
        targetRank: Number(/** @type {HTMLInputElement} */ (body.querySelector("#gRank")).value) || 0
      });
      toast("Hedef kaydedildi.", "success");
      return true;
    }
  });
}

/* ------------------------- Ders Doğru/Yanlış Analizi ------------------------- */

function renderSubjectAnalysis() {
  const wrap = $("#subjectAnalysis");
  if (!wrap) return;
  const by = store.questionStatsBySubject();
  const rows = Object.entries(by)
    .map(([subject, v]) => ({
      subject,
      correct: v.correct,
      wrong: v.wrong,
      solved: v.solved,
      rate: v.solved ? Math.round((v.correct / v.solved) * 100) : 0
    }))
    .filter((r) => r.correct + r.wrong > 0)
    .sort((a, b) => a.rate - b.rate);

  if (rows.length === 0) {
    wrap.innerHTML = `<div class="chart-empty">Doğru/yanlış analizi için soru kaydı gir.</div>`;
    return;
  }

  const chart = stackedBarChart(
    rows.map((r) => ({
      label: r.subject,
      parts: [
        { value: r.correct, color: "#34D399" },
        { value: r.wrong, color: "#EF4444" }
      ]
    })),
    { height: 210 }
  );

  const weak = rows.filter((r) => r.solved >= 10 && r.rate < 65);
  const insight = weak.length
    ? `<p class="insight insight--warn">⚡ Öncelik ver: ${weak.map((r) => `${esc(r.subject)} (%${r.rate})`).join(", ")}</p>`
    : `<p class="insight insight--ok">✅ Genel başarın iyi görünüyor. Böyle devam!</p>`;

  const legend = `<div class="legend"><span><i style="background:#34D399"></i>Doğru</span><span><i style="background:#EF4444"></i>Yanlış</span></div>`;

  wrap.innerHTML = `${legend}${chart}${insight}
    <div class="rate-list">${rows.map((r) => `
      <div class="rate-row">
        <span class="rate-row__name">${esc(r.subject)}</span>
        <span class="rate-row__bar"><i style="width:${r.rate}%; background:${r.rate < 65 ? "#EF4444" : r.rate < 80 ? "#FBBF24" : "#34D399"}"></i></span>
        <span class="rate-row__val">%${r.rate}</span>
      </div>`).join("")}</div>`;
}

/* ------------------------- Hafif mod ------------------------- */

function renderLightBanner() {
  const wrap = $("#lightBanner");
  if (!wrap) return;
  if (!store.state.settings.lightMode) { wrap.innerHTML = ""; return; }
  const ctx = store.questContext();
  const blockDone = ctx.todayBlocks >= 1;
  const qDone = ctx.todaySolved >= 10;
  wrap.innerHTML = `
    <div class="light-banner">
      <div class="light-banner__top">
        <div>
          <strong>🌙 Hafif Mod açık</strong>
          <p>Bugün tek bir mini blok ve 10 soru yeterli. Kendini yorma; devam etmek de başarıdır.</p>
        </div>
        <button id="btnLightOff" class="btn btn--ghost btn--sm" type="button">Kapat</button>
      </div>
      <div class="light-mini">
        <span class="${blockDone ? "is-ok" : ""}">${blockDone ? "✅" : "⬜"} 1 mini blok</span>
        <span class="${qDone ? "is-ok" : ""}">${qDone ? "✅" : "⬜"} 10 soru (${ctx.todaySolved}/10)</span>
      </div>
    </div>`;
  $("#btnLightOff")?.addEventListener("click", () => store.setLightMode(false));
}

/* ------------------------- Haftalık değerlendirme ------------------------- */

function renderReviews() {
  const label = $("#reviewWeekLabel");
  const note = /** @type {HTMLTextAreaElement|null} */ ($("#reviewNote"));
  const hist = $("#reviewHistory");
  const ws = store.weekStart;
  if (label) label.textContent = `${store.fmtTR(ws)} – ${store.fmtTR(store.addDays(ws, 6))} haftası`;

  const existing = store.state.reviews.find((r) => r.weekStart === ws);
  if (note && document.activeElement !== note) note.value = existing ? existing.note : "";

  if (!hist) return;
  const others = store.state.reviews
    .filter((r) => r.weekStart !== ws)
    .sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1));

  hist.innerHTML = others.length
    ? others.map((r) => `
      <div class="review-item" data-week="${r.weekStart}">
        <div class="review-item__head">
          <span>${store.fmtTR(r.weekStart)} – ${store.fmtTR(store.addDays(r.weekStart, 6))}</span>
          <button class="icon-btn is-danger" data-action="del" title="Sil">🗑</button>
        </div>
        <p>${esc(r.note)}</p>
      </div>`).join("")
    : `<p class="view__sub">Geçmiş hafta notu yok.</p>`;

  $$(".review-item [data-action='del']", hist).forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = btn.closest(".review-item");
      const week = /** @type {HTMLElement} */ (item).dataset.week;
      (async () => {
        const ok = await confirmDialog("Notu sil", "Bu haftalık değerlendirme notu silinsin mi?", true);
        if (ok) { store.removeReview(week); toast("Not silindi."); }
      })();
    });
  });
}

/* ------------------------- Rütbe ------------------------- */

function renderRank() {
  const wrap = $("#dashRank");
  if (!wrap) return;
  const info = store.levelInfo(store.state.xp);
  const streak = store.streak();
  wrap.innerHTML = `
    <div class="rank">
      <div class="rank__icon">${info.rank.icon}</div>
      <div class="rank__main">
        <div class="rank__top">
          <span class="rank__name">${esc(info.rank.name)}</span>
          <span class="rank__level">Seviye ${info.level}</span>
        </div>
        <div class="rank__bar"><span style="width:${info.pct}%"></span></div>
        <div class="rank__meta">
          <span>${info.inLevel} / ${info.need} XP</span>
          <span>Toplam ${store.state.xp} XP</span>
          <span>🔥 ${streak} gün seri</span>
        </div>
      </div>
    </div>`;
}

/* ------------------------- Özet kartları ------------------------- */

function renderCards() {
  const wrap = $("#dashCards");
  if (!wrap) return;
  const ws = store.weekStats();
  const pending = store.pendingTopics();
  const totalSolved = store.totalSolved();

  wrap.innerHTML = `
    <div class="stat stat--accent">
      <div class="stat__label">Bu Hafta Blok Oranı</div>
      <div class="stat__value">%${ws.pct}</div>
      <div class="stat__hint">${ws.completedBlocks}/${ws.totalBlocks} blok • ${ws.doneMinutes}/${ws.plannedMinutes} dk${ws.plannedQuestions ? ` • 🎯 ${ws.completedQuestionTarget}/${ws.plannedQuestions} hedef soru` : ""}</div>
      <div class="stat__bar"><span style="width:${ws.pct}%"></span></div>
    </div>
    <div class="stat stat--green">
      <div class="stat__label">Bu Hafta Çözülen Soru</div>
      <div class="stat__value">${ws.solvedQuestions}</div>
      <div class="stat__hint">Net ${ws.net} • %${ws.successRate} başarı • Toplam ${totalSolved}</div>
    </div>
    <div class="stat stat--amber">
      <div class="stat__label">Bu Hafta Deneme</div>
      <div class="stat__value">${ws.examCount}</div>
      <div class="stat__hint">Ort. net ${ws.examAvgNet}</div>
    </div>
    <div class="stat ${pending > 0 ? "stat--red" : "stat--green"}">
      <div class="stat__label">Bekleyen Eksik Konu</div>
      <div class="stat__value">${pending}</div>
      <div class="stat__hint">Toplam ${store.state.topics.length} konu kaydı</div>
    </div>`;
}

/* ------------------------- Grafikler ------------------------- */

function weeklyTrendSeries() {
  const hist = [...store.state.history].sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1));
  const items = hist.map((h) => ({ label: store.fmtShort(h.weekStart), value: h.solvedQuestions || 0 }));
  const cur = store.weekStats();
  items.push({ label: store.fmtShort(cur.weekStart), value: cur.solvedQuestions });
  return items.slice(-10);
}

function renderCharts() {
  const trend = $("#dashTrend");
  if (trend) {
    const series = weeklyTrendSeries();
    trend.innerHTML = series.length
      ? lineChart(series, { color: "#8B5CF6", height: 200 })
      : `<div class="chart-empty">Yeterli veri yok. Soru çözdükçe burada haftalık trend oluşur.</div>`;
  }

  const donutEl = $("#dashDonut");
  if (donutEl) {
    const ws = store.weekStats();
    donutEl.innerHTML = `<div class="donut-wrap">${donut(ws.pct, { size: 132, stroke: 13 })}<p class="donut-caption">Haftalık blok tamamlama</p></div>`;
  }

  const subj = $("#dashSubjects");
  if (subj) {
    const by = store.questionStatsBySubject();
    const rows = Object.entries(by)
      .map(([k, v]) => ({ subject: k, solved: v.solved, rate: v.solved ? Math.round((v.correct / v.solved) * 100) : 0 }))
      .sort((a, b) => b.solved - a.solved);
    const max = Math.max(1, ...rows.map((r) => r.solved));
    subj.innerHTML = rows.length
      ? rows.map((r) => `
        <div class="subj-bar">
          <div class="subj-bar__top"><span>${esc(r.subject)}</span><span>${r.solved} soru • %${r.rate}</span></div>
          <div class="subj-bar__track"><span style="width:${Math.round((r.solved / max) * 100)}%"></span></div>
        </div>`).join("")
      : `<div class="chart-empty">Ders dağılımı için henüz kayıt yok.</div>`;
  }

  const heat = $("#dashHeatmap");
  if (heat) heat.innerHTML = heatmap(store.state.daily, { weeks: 16 });
}

/* ------------------------- Görevler & XP akışı ------------------------- */

function renderQuests() {
  const el = $("#quests");
  if (el) el.innerHTML = questsHTML();
}

function renderXpFeed() {
  const el = $("#xpFeed");
  if (!el) return;
  const log = store.state.xpLog.slice(0, 8);
  el.innerHTML = log.length
    ? log.map((l) => `
      <div class="xp-item">
        <span class="xp-item__amt">+${l.amount} XP</span>
        <span class="xp-item__reason">${esc(l.reason)}</span>
        <span class="xp-item__date">${esc(store.fmtShort(l.date))}</span>
      </div>`).join("")
    : `<div class="chart-empty">Henüz XP kazanmadın. Çalışmaya başla! 🌱</div>`;
}

/* ------------------------- Geçmiş ------------------------- */

function renderHistory() {
  const list = $("#historyList");
  const empty = $("#historyEmpty");
  if (!list) return;
  const history = store.state.history;

  if (history.length === 0) {
    list.innerHTML = "";
    if (empty) empty.hidden = false;
    return;
  }
  if (empty) empty.hidden = true;

  list.innerHTML = history.map((h) => {
    const range = `${store.fmtTR(h.weekStart)} – ${store.fmtTR(store.addDays(h.weekStart, 6))}`;
    const pct = h.totalBlocks ? Math.round((h.completedBlocks / h.totalBlocks) * 100) : 0;
    return `
      <div class="record" data-week="${h.weekStart}">
        <div class="record__body">
          <div class="record__title">${range}</div>
          <div class="record__meta">
            <span>Blok: <strong>${h.completedBlocks}/${h.totalBlocks}</strong> (%${pct})</span>
            <span>Çözülen soru: <strong>${h.solvedQuestions}</strong></span>
            ${h.xp ? `<span>XP: <strong>${h.xp}</strong></span>` : ""}
          </div>
        </div>
        <div class="record__actions">
          <button class="icon-btn" data-action="edit" title="Düzenle">✎</button>
          <button class="icon-btn is-danger" data-action="del" title="Sil">🗑</button>
        </div>
      </div>`;
  }).join("");

  $$(".record", list).forEach((node) => {
    const week = node.dataset.week;
    node.querySelector('[data-action="edit"]')?.addEventListener("click", () => openHistoryModal(week));
    node.querySelector('[data-action="del"]')?.addEventListener("click", async () => {
      const ok = await confirmDialog("Hafta arşivini sil", "Bu arşivlenmiş hafta kaydı silinsin mi?", true);
      if (ok) { store.removeHistory(week); toast("Arşiv kaydı silindi."); }
    });
  });
}

function openHistoryModal(weekStart) {
  const h = store.state.history.find((x) => x.weekStart === weekStart);
  if (!h) return;
  const bodyHTML = `
    <p class="view__sub">${esc(store.fmtTR(weekStart))} haftasının arşiv verilerini düzenle.</p>
    <div class="field">
      <label for="hStart">Hafta Başlangıcı</label>
      <input id="hStart" type="date" value="${h.weekStart}" />
    </div>
    <div class="grid-2">
      <div class="field"><label for="hDone">Tamamlanan Blok</label><input id="hDone" type="number" min="0" value="${h.completedBlocks}" /></div>
      <div class="field"><label for="hTotal">Toplam Blok</label><input id="hTotal" type="number" min="0" value="${h.totalBlocks}" /></div>
    </div>
    <div class="grid-2">
      <div class="field"><label for="hSolved">Çözülen Soru</label><input id="hSolved" type="number" min="0" value="${h.solvedQuestions}" /></div>
      <div class="field"><label for="hXp">XP</label><input id="hXp" type="number" min="0" value="${h.xp || 0}" /></div>
    </div>`;
  openModal({
    title: "Hafta Arşivini Düzenle",
    bodyHTML,
    confirmText: "Güncelle",
    onConfirm() {
      const body = modalBody();
      const newStart = /** @type {HTMLInputElement} */ (body.querySelector("#hStart")).value || weekStart;
      if (newStart !== weekStart && store.state.history.some((x) => x.weekStart === newStart)) {
        toast("Bu başlangıç tarihine sahip bir arşiv zaten var.", "error");
        return false;
      }
      store.updateHistory(weekStart, {
        weekStart: newStart,
        completedBlocks: Number(/** @type {HTMLInputElement} */ (body.querySelector("#hDone")).value),
        totalBlocks: Number(/** @type {HTMLInputElement} */ (body.querySelector("#hTotal")).value),
        solvedQuestions: Number(/** @type {HTMLInputElement} */ (body.querySelector("#hSolved")).value),
        xp: Number(/** @type {HTMLInputElement} */ (body.querySelector("#hXp")).value)
      });
      toast("Arşiv güncellendi.", "success");
      return true;
    }
  });
}

function renderWeekLabel() {
  const el = $("#dashWeek");
  if (!el) return;
  const ws = store.weekStats();
  el.textContent = `Aktif hafta: ${store.fmtTR(ws.weekStart)} – ${store.fmtTR(store.addDays(ws.weekStart, 6))}`;
}

function exportHistoryCSV() {
  const history = store.state.history;
  if (history.length === 0) { toast("Arşivlenmiş hafta yok.", "error"); return; }
  const rows = [["Hafta Başlangıcı", "Hafta Bitişi", "Tamamlanan Blok", "Toplam Blok", "Oran %", "Çözülen Soru", "XP"]];
  for (const h of history) {
    const pct = h.totalBlocks ? Math.round((h.completedBlocks / h.totalBlocks) * 100) : 0;
    rows.push([h.weekStart, store.addDays(h.weekStart, 6), h.completedBlocks, h.totalBlocks, pct, h.solvedQuestions, h.xp || 0]);
  }
  const csv = rows.map((r) => r.join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `yks-haftalik-arsiv-${store.toISO()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast("CSV indirildi.", "success");
}

function render() {
  renderRank();
  renderWeekLabel();
  renderGoal();
  renderLightBanner();
  renderCards();
  renderCharts();
  renderSubjectAnalysis();
  renderQuests();
  renderXpFeed();
  renderReviews();
  renderHistory();
}

export function initDashboard() {
  render();
  $("#btnExportHistory")?.addEventListener("click", exportHistoryCSV);
  $("#btnSaveReview")?.addEventListener("click", () => {
    const note = /** @type {HTMLTextAreaElement} */ ($("#reviewNote")).value;
    if (!note.trim()) { toast("Not boş. Birkaç cümle yaz.", "error"); return; }
    store.saveReview(store.weekStart, note);
    toast("Haftalık değerlendirme kaydedildi.", "success");
  });
  $("#btnClearHistory")?.addEventListener("click", async () => {
    if (store.state.history.length === 0) { toast("Arşiv zaten boş.", "info"); return; }
    const ok = await confirmDialog(
      "Arşivi Temizle",
      `Tüm geçmiş hafta kayıtları (${store.state.history.length} hafta) silinecek. Emin misin?`,
      true
    );
    if (ok) { store.clearHistory(); toast("Arşiv temizlendi."); }
  });
}

export function refreshDashboard() { render(); }

/** Üst bardaki kompakt rütbe göstergesi. */
export function renderRankChip() {
  const chip = $("#rankChip");
  if (!chip) return;
  const info = store.levelInfo(store.state.xp);
  chip.innerHTML = `
    <span class="chip__icon">${info.rank.icon}</span>
    <span class="chip__text">
      <span class="chip__name">${esc(info.rank.name)} • Sv.${info.level}</span>
      <span class="chip__bar"><i style="width:${info.pct}%"></i></span>
    </span>
    <span class="chip__xp">${store.state.xp} XP</span>`;
}
