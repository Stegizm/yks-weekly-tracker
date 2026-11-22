/* =========================================================
   quests.js — Görev (quest) motoru ve rütbe gösterimi
   ========================================================= */

import { store } from "./store.js";
import { esc } from "./ui.js";

/** Günlük görevler. progress(ctx) anlık ilerlemeyi döndürür. */
export const DAILY_QUESTS = [
  { id: "solve20", title: "Bugün 20 soru çöz", icon: "✏️", reward: 30, target: 20, lightTarget: 10, progress: (c) => c.todaySolved },
  { id: "blocks2", title: "2 çalışma bloğu tamamla", icon: "✅", reward: 25, target: 2, lightTarget: 1, progress: (c) => c.todayBlocks },
  { id: "focus1", title: "1 odak seansı bitir", icon: "⏱️", reward: 25, target: 1, lightTarget: 1, progress: (c) => c.todayPomodoro },
  { id: "topic1", title: "Bir eksik konuyu tamamla", icon: "📌", reward: 20, target: 1, lightTarget: 1, progress: (c) => c.todayTopics }
];

/** Haftalık görevler. */
export const WEEKLY_QUESTS = [
  { id: "solve200", title: "Bu hafta 200 soru çöz", icon: "🚀", reward: 120, target: 200, lightTarget: 100, progress: (c) => c.weekSolved },
  { id: "blocks10", title: "Bu hafta 10 blok tamamla", icon: "📚", reward: 100, target: 10, lightTarget: 5, progress: (c) => c.weekBlocks },
  { id: "exam1", title: "Bu hafta 1 deneme kaydet", icon: "📝", reward: 80, target: 1, lightTarget: 1, progress: (c) => c.weekExams }
];

/** Hafif mod açıkken görev hedefi düşer. */
function questTarget(q) {
  const light = store.state.settings.lightMode;
  const t = light && q.lightTarget ? q.lightTarget : q.target;
  return t;
}

let busy = false;

/**
 * Görevleri değerlendirir; yeni tamamlananları ödüllendirir.
 * @returns {string[]} ödül verilen görev başlıkları
 */
export function evaluateQuests() {
  if (busy) return [];
  busy = true;
  const ctx = store.questContext();
  const granted = [];
  try {
    for (const q of DAILY_QUESTS) {
      const key = `daily:${ctx.today}:${q.id}`;
      if (!store.state.quests.claimed[key] && q.progress(ctx) >= questTarget(q)) {
        if (store.grantQuest(key, q.reward, q.title)) granted.push(q.title);
      }
    }
    for (const q of WEEKLY_QUESTS) {
      const key = `weekly:${ctx.weekStart}:${q.id}`;
      if (!store.state.quests.claimed[key] && q.progress(ctx) >= questTarget(q)) {
        if (store.grantQuest(key, q.reward, q.title)) granted.push(q.title);
      }
    }
  } finally {
    busy = false;
  }
  return granted;
}

function questRow(q, ctx, period) {
  const target = questTarget(q);
  const progress = Math.min(q.progress(ctx), target);
  const pct = Math.round((progress / target) * 100);
  const key = period === "daily" ? `daily:${ctx.today}:${q.id}` : `weekly:${ctx.weekStart}:${q.id}`;
  const done = Boolean(store.state.quests.claimed[key]) || progress >= target;
  return `
    <div class="quest ${done ? "is-done" : ""}">
      <div class="quest__icon">${done ? "✔️" : q.icon}</div>
      <div class="quest__body">
        <div class="quest__title">${esc(q.title)}</div>
        <div class="quest__bar"><span style="width:${pct}%"></span></div>
        <div class="quest__meta">${progress}/${target} • +${q.reward} XP</div>
      </div>
    </div>`;
}

/** Özet ekranı için görev kartı HTML'i. */
export function questsHTML() {
  const ctx = store.questContext();
  const light = store.state.settings.lightMode;
  const note = light
    ? `<p class="insight insight--ok" style="margin:0 0 12px">🌙 Hafif mod açık: görev hedefleri düşürüldü. Yapabildiğin kadar yeter.</p>`
    : "";
  return `${note}
    <div class="quest-group">
      <h3 class="quest-group__title">Günlük Görevler <span class="quest-group__hint">her gün sıfırlanır</span></h3>
      <div class="quest-list">${DAILY_QUESTS.map((q) => questRow(q, ctx, "daily")).join("")}</div>
    </div>
    <div class="quest-group">
      <h3 class="quest-group__title">Haftalık Görevler <span class="quest-group__hint">her hafta sıfırlanır</span></h3>
      <div class="quest-list">${WEEKLY_QUESTS.map((q) => questRow(q, ctx, "weekly")).join("")}</div>
    </div>`;
}
