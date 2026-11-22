/* =========================================================
   store.js — localStorage veri katmanı (şema, işlemler, I/O)
   ========================================================= */

import { CURRICULUM_SEED } from "./curriculumData.js";

const STORAGE_KEY = "yks_tracker_v1";
const BACKUP_KEY = "yks_tracker_v1_backup";
const SCHEMA_VERSION = 2;
const SEED_VERSION = 2;

/** @typedef {'monday'|'tuesday'|'wednesday'|'thursday'|'friday'|'saturday'|'sunday'} DayKey */

export const DAYS = /** @type {{key: DayKey, label: string, short: string}[]} */ ([
  { key: "monday", label: "Pazartesi", short: "Pzt" },
  { key: "tuesday", label: "Salı", short: "Sal" },
  { key: "wednesday", label: "Çarşamba", short: "Çar" },
  { key: "thursday", label: "Perşembe", short: "Per" },
  { key: "friday", label: "Cuma", short: "Cum" },
  { key: "saturday", label: "Cumartesi", short: "Cmt" },
  { key: "sunday", label: "Pazar", short: "Paz" }
]);

export const DEFAULT_SUBJECTS = [
  "Matematik",
  "Fizik",
  "Kimya",
  "Biyoloji",
  "Paragraf/Edebiyat",
  "Tarih/Sosyal"
];

export const PRIORITIES = ["Yüksek", "Orta", "Düşük"];
export const STATUSES = ["Eksik", "Tekrar Edildi", "Tamamlandı"];

/** Müfredat konu durumları. */
export const CURRICULUM_STATUSES = ["Hiç Başlanmadı", "Çalışılıyor", "Tekrar Lazım", "Tamam"];

/** Müfredat sistemleri ve sınıf/seviye listeleri. */
export const CURRICULUM_SYSTEMS = {
  "eski": {
    label: "Eski Müfredat",
    grades: ["9. Sınıf", "10. Sınıf", "11. Sınıf", "12. Sınıf", "TYT", "AYT", "Üniversite 1", "Üniversite 2"]
  },
  "maarif": {
    label: "Maarif Müfredatı",
    grades: ["Maarif 1. Aşama", "Maarif 2. Aşama"]
  }
};

/** Tüm geçerli sınıf/seviye anahtarları. */
export const GRADES = [
  ...CURRICULUM_SYSTEMS.eski.grades,
  ...CURRICULUM_SYSTEMS.maarif.grades
];

/** Deneme türleri ve varsayılan ders satırları. */
export const EXAM_TYPES = {
  "TYT": ["Türkçe", "Sosyal Bilimler", "Temel Matematik", "Fen Bilimleri"],
  "AYT Sayısal": ["Matematik", "Fizik", "Kimya", "Biyoloji"],
  "AYT Eşit Ağırlık": ["Matematik", "Edebiyat", "Tarih-1", "Coğrafya-1"],
  "AYT Sözel": ["Edebiyat", "Tarih-1", "Coğrafya-1", "Tarih-2", "Coğrafya-2", "Felsefe", "Din"],
  "Özel": [""]
};

/** Rütbe tanımları (minimum seviye). */
export const RANKS = [
  { min: 1, name: "Acemi", icon: "🌱" },
  { min: 3, name: "Çırak", icon: "📘" },
  { min: 6, name: "Meraklı", icon: "✏️" },
  { min: 10, name: "Kararlı", icon: "🎯" },
  { min: 15, name: "Azimli", icon: "🔥" },
  { min: 21, name: "Usta", icon: "⚔️" },
  { min: 28, name: "Şampiyon", icon: "🏆" },
  { min: 36, name: "Efsane", icon: "👑" },
  { min: 45, name: "YKS Efsanesi", icon: "🐉" }
];

/* ------------------------- Yardımcılar ------------------------- */

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** ISO (YYYY-MM-DD) yerel tarih. */
export function toISO(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseISO(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso, days) {
  const dt = parseISO(iso);
  dt.setDate(dt.getDate() + days);
  return toISO(dt);
}

/** Verilen tarihin haftasının pazartesi günü (ISO). */
export function mondayOf(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return toISO(d);
}

function daysBetweenISO(a, b) {
  const MS = 86400000;
  return Math.round((parseISO(b) - parseISO(a)) / MS);
}

function fmtTR(iso) {
  if (!iso) return "";
  const d = parseISO(iso);
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtShort(iso) {
  const d = parseISO(iso);
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" });
}

/* ------------------------- Seviye / rütbe ------------------------- */

/** Level L'ye ulaşmak için gereken toplam XP. */
function xpForLevel(level) {
  let total = 0;
  for (let l = 1; l < level; l++) total += 100 + (l - 1) * 60;
  return total;
}

function effectiveRanks() {
  const custom = state.settings && state.settings.ranks;
  if (Array.isArray(custom) && custom.length >= 2) {
    return custom
      .map((r, i) => ({
        min: Math.max(1, Number(r.min) || i + 1),
        name: (r.name || `Seviye ${i + 1}`).trim(),
        icon: r.icon || "⭐"
      }))
      .sort((a, b) => a.min - b.min);
  }
  return RANKS;
}

function rankForLevel(level) {
  const ranks = effectiveRanks();
  let r = ranks[0];
  for (const rank of ranks) if (level >= rank.min) r = rank;
  return r;
}

/** @param {number} xp */
export function levelInfo(xp) {
  let l = 1;
  while (xpForLevel(l + 1) <= xp && l < 200) l++;
  const cur = xpForLevel(l);
  const next = xpForLevel(l + 1);
  const span = next - cur;
  return {
    level: l,
    xp,
    rank: rankForLevel(l),
    inLevel: xp - cur,
    need: span,
    pct: Math.round(((xp - cur) / span) * 100),
    nextLevelXp: next
  };
}

/* ------------------------- Varsayılan state ------------------------- */

function emptySchedule() {
  /** @type {Record<DayKey, any[]>} */
  const s = /** @type {any} */ ({});
  for (const d of DAYS) s[d.key] = [];
  return s;
}

function defaultState() {
  return {
    version: SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    weekStart: mondayOf(),
    schedule: emptySchedule(),
    questions: [],
    topics: [],
    noteCards: [],
    exams: [],
    curriculum: [],
    resources: [],
    reviews: [],
    rivals: [],
    settings: {
      subjects: [...DEFAULT_SUBJECTS],
      pomodoroPresets: [25, 30, 40],
      goal: { examType: "", targetNet: 0, targetRank: 0, label: "" },
      ranks: null,
      font: "playful",
      username: "",
      className: "11. Sınıf",
      targetDate: "",
      countdownLabel: "YKS",
      lightMode: false,
      autoBackup: true,
      resourceDailyGoal: 20,
      curriculumSystem: "eski"
    },
    seeded: { curriculum: false, curriculumVersion: 0 },
    history: [],
    activityDates: [],
    xp: 0,
    xpLog: [],
    daily: {},
    quests: { claimed: {} }
  };
}

const EMPTY_DAY = { blocksDone: 0, pomodoros: 0, topicsDone: 0, solved: 0, resource: 0, xp: 0, streakBonusGiven: false };

function dayRecord(dateISO) {
  if (!state.daily[dateISO]) state.daily[dateISO] = { ...EMPTY_DAY };
  return state.daily[dateISO];
}

/* ------------------------- Yükleme / kaydetme ------------------------- */

function normalize(raw) {
  const base = defaultState();
  if (!raw || typeof raw !== "object") return base;

  const s = { ...base, ...raw };
  s.settings = { ...base.settings, ...(raw.settings || {}) };
  if (!Array.isArray(s.settings.subjects) || s.settings.subjects.length === 0) {
    s.settings.subjects = [...DEFAULT_SUBJECTS];
  }
  if (!Array.isArray(s.settings.pomodoroPresets) || s.settings.pomodoroPresets.length === 0) {
    s.settings.pomodoroPresets = [25, 30, 40];
  }
  s.settings.goal = { examType: "", targetNet: 0, targetRank: 0, label: "", ...(raw.settings?.goal || {}) };
  s.settings.goal.targetNet = Math.max(0, Number(s.settings.goal.targetNet) || 0);
  s.settings.goal.targetRank = Math.max(0, Number(s.settings.goal.targetRank) || 0);
  s.settings.ranks = Array.isArray(raw.settings?.ranks) ? raw.settings.ranks : null;
  { const f = raw.settings?.font; s.settings.font = (!f || f === "system") ? "playful" : f; }
  s.settings.targetDate = raw.settings?.targetDate || "";
  s.settings.countdownLabel = raw.settings?.countdownLabel || "YKS";
  s.settings.lightMode = Boolean(raw.settings?.lightMode);
  s.settings.autoBackup = raw.settings?.autoBackup === undefined ? true : Boolean(raw.settings.autoBackup);
  s.settings.resourceDailyGoal = Math.max(0, Number(raw.settings?.resourceDailyGoal) || 0) || 20;
  s.settings.curriculumSystem = CURRICULUM_SYSTEMS[raw.settings?.curriculumSystem] ? raw.settings.curriculumSystem : "eski";
  s.settings.username = String(raw.settings?.username || "").trim();
  s.settings.className = GRADES.includes(raw.settings?.className) ? raw.settings.className : "11. Sınıf";
  s.schedule = { ...emptySchedule(), ...(raw.schedule || {}) };
  for (const d of DAYS) {
    if (!Array.isArray(s.schedule[d.key])) s.schedule[d.key] = [];
    s.schedule[d.key] = s.schedule[d.key].map((b) => ({
      id: b.id || uid(),
      subject: b.subject || "",
      task: b.task || "",
      minutes: Number(b.minutes) || 0,
      startTime: b.startTime || "",
      endTime: b.endTime || "",
      questionTarget: Math.max(0, Number(b.questionTarget) || 0),
      done: Boolean(b.done)
    }));
  }
  s.questions = Array.isArray(raw.questions) ? raw.questions.map(normalizeQuestion) : [];
  s.topics = Array.isArray(raw.topics) ? raw.topics : [];
  s.noteCards = Array.isArray(raw.noteCards) ? raw.noteCards : [];
  s.exams = Array.isArray(raw.exams) ? raw.exams.map(normalizeExam) : [];
  s.curriculum = Array.isArray(raw.curriculum)
    ? raw.curriculum.map((c) => ({
        id: c.id || uid(),
        grade: c.grade || "TYT",
        subject: (c.subject || "").trim(),
        topic: (c.topic || "").trim(),
        status: CURRICULUM_STATUSES.includes(c.status) ? c.status : "Hiç Başlanmadı",
        reviewDate: c.reviewDate || "",
        minutes: Math.max(0, Number(c.minutes) || 0)
      }))
    : [];
  s.resources = Array.isArray(raw.resources)
    ? raw.resources.map((r) => ({
        id: r.id || uid(),
        name: (r.name || "").trim(),
        subject: (r.subject || "").trim(),
        unit: r.unit === "Test" ? "Test" : "Sayfa",
        total: Math.max(0, Number(r.total) || 0),
        done: Math.max(0, Number(r.done) || 0)
      }))
    : [];
  s.reviews = Array.isArray(raw.reviews) ? raw.reviews : [];
  s.rivals = Array.isArray(raw.rivals)
    ? raw.rivals.map((r) => ({
        id: r.id || uid(),
        username: (r.username || "").trim(),
        className: GRADES.includes(r.className) ? r.className : "11. Sınıf",
        xp: Math.max(0, Number(r.xp) || 0)
      })).filter((r) => r.username)
    : [];
  s.seeded = { curriculum: false, ...(raw.seeded || {}) };
  s.history = Array.isArray(raw.history) ? raw.history : [];
  s.activityDates = Array.isArray(raw.activityDates) ? raw.activityDates : [];
  s.xp = Number(raw.xp) || 0;
  s.xpLog = Array.isArray(raw.xpLog) ? raw.xpLog.slice(0, 300) : [];
  s.daily = raw.daily && typeof raw.daily === "object" ? raw.daily : {};
  for (const k of Object.keys(s.daily)) {
    s.daily[k] = { ...EMPTY_DAY, ...s.daily[k] };
  }
  s.quests = raw.quests && typeof raw.quests === "object" ? raw.quests : { claimed: {} };
  if (!s.quests.claimed) s.quests.claimed = {};
  if (!s.weekStart) s.weekStart = mondayOf();
  s.version = SCHEMA_VERSION;
  return s;
}

function normalizeQuestion(q) {
  const solved = Math.max(0, Number(q.solved) || 0);
  let correct = Math.max(0, Number(q.correct) || 0);
  let wrong = Math.max(0, Number(q.wrong) || 0);
  if (correct + wrong > solved) wrong = Math.max(0, solved - correct);
  return {
    id: q.id || uid(),
    date: q.date || toISO(),
    subject: (q.subject || "").trim(),
    topic: (q.topic || "").trim(),
    solved, correct, wrong
  };
}

function normalizeExam(e) {
  const scores = Array.isArray(e.scores)
    ? e.scores.map((s) => ({
        subject: (s.subject || "").trim(),
        correct: Math.max(0, Number(s.correct) || 0),
        wrong: Math.max(0, Number(s.wrong) || 0),
        empty: Math.max(0, Number(s.empty) || 0)
      }))
    : [];
  const tags = Array.isArray(e.tags)
    ? e.tags.map((t) => ({
        subject: (t.subject || "").trim(),
        topic: (t.topic || "").trim(),
        wrong: Math.max(0, Number(t.wrong) || 0)
      })).filter((t) => t.topic || t.wrong)
    : [];
  return {
    id: e.id || uid(),
    date: e.date || toISO(),
    name: (e.name || "").trim(),
    type: e.type || "Özel",
    rank: Math.max(0, Number(e.rank) || 0),
    scores,
    tags,
    createdAt: e.createdAt || new Date().toISOString()
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return normalize(JSON.parse(raw));
  } catch (err) {
    console.warn("State okunamadı, yedek denenecek:", err);
    try {
      const bak = localStorage.getItem(BACKUP_KEY);
      if (bak) return normalize(JSON.parse(bak));
    } catch { /* yoksay */ }
    return defaultState();
  }
}

/** @type {ReturnType<typeof defaultState>} */
let state = loadState();
let lastSaved = "";

function persist() {
  try {
    const json = JSON.stringify(state);
    if (lastSaved) {
      try { localStorage.setItem(BACKUP_KEY, lastSaved); } catch { /* yoksay */ }
    }
    localStorage.setItem(STORAGE_KEY, json);
    lastSaved = json;
  } catch (err) {
    console.error("Kaydetme hatası:", err);
    throw new Error("Veriler kaydedilemedi (depolama dolu veya engelli olabilir).");
  }
}

/* ------------------------- Pub/Sub ------------------------- */

const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(detail) {
  for (const fn of listeners) {
    try { fn(detail); } catch (e) { console.error(e); }
  }
}

function commit(detail) {
  try {
    persist();
  } catch (err) {
    console.error(err);
  }
  emit(detail);
}

/* ------------------------- XP / aktivite ------------------------- */

function markActivity(dateISO = toISO()) {
  if (!state.activityDates.includes(dateISO)) {
    state.activityDates.push(dateISO);
    state.activityDates.sort();
  }
  // Seri bonusu: o günde biten ardışık seriye göre, günde bir kez
  const rec = dayRecord(dateISO);
  if (!rec.streakBonusGiven) {
    const streakDays = streakEndingAt(dateISO);
    if (streakDays >= 2) {
      const bonus = Math.min((streakDays - 1) * 10, 70);
      rec.streakBonusGiven = true;
      grantXPInternal(bonus, `Seri bonusu (${streakDays} gün)`, dateISO);
    }
  }
}

/** Belirtilen günde biten ardışık aktivite serisini döndürür. */
function streakEndingAt(dateISO) {
  const set = new Set(state.activityDates);
  if (!set.has(dateISO)) return 0;
  let count = 0, cursor = dateISO;
  while (set.has(cursor)) {
    count++;
    cursor = addDays(cursor, -1);
  }
  return count;
}

function incrementDaily(field, n = 1, dateISO = toISO()) {
  const rec = dayRecord(dateISO);
  rec[field] = (rec[field] || 0) + n;
}

/**
 * XP ekler. `commit` çağırmaz (çağıran taraf karar verir).
 * @returns {number} eklenen miktar
 */
function grantXPInternal(amount, reason, dateISO = toISO()) {
  const amt = Math.max(0, Math.round(amount));
  if (amt <= 0) return 0;
  state.xp += amt;
  state.xpLog.unshift({ id: uid(), date: dateISO, amount: amt, reason: reason || "xp" });
  if (state.xpLog.length > 300) state.xpLog.length = 300;
  dayRecord(dateISO).xp += amt;
  return amt;
}

/* ------------------------- Program (bloklar) ------------------------- */

function addBlock(day, data) {
  const list = state.schedule[day];
  const block = {
    id: uid(),
    subject: (data.subject || "").trim(),
    task: (data.task || "").trim(),
    minutes: Number(data.minutes) || 0,
    startTime: data.startTime || "",
    endTime: data.endTime || "",
    questionTarget: Math.max(0, Number(data.questionTarget) || 0),
    done: false
  };
  list.push(block);
  commit({ type: "schedule" });
  return block;
}

function updateBlock(day, id, patch) {
  const list = state.schedule[day];
  const i = list.findIndex((b) => b.id === id);
  if (i < 0) return;
  list[i] = { ...list[i], ...patch };
  if (typeof patch.minutes !== "undefined") list[i].minutes = Number(patch.minutes) || 0;
  commit({ type: "schedule" });
}

function removeBlock(day, id) {
  state.schedule[day] = state.schedule[day].filter((b) => b.id !== id);
  commit({ type: "schedule" });
}

function moveBlock(day, id, dir) {
  const list = state.schedule[day];
  const i = list.findIndex((b) => b.id === id);
  if (i < 0) return;
  const j = i + dir;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  commit({ type: "schedule" });
}

function toggleBlock(day, id) {
  const list = state.schedule[day];
  const b = list.find((x) => x.id === id);
  if (!b) return;
  b.done = !b.done;
  if (b.done) {
    markActivity();
    incrementDaily("blocksDone");
    // Hedef soru sayısı yüksek bloklar biraz daha fazla XP kazandırır (maks +20)
    const qBonus = Math.min(20, Math.round((b.questionTarget || 0) / 5));
    grantXPInternal(10 + qBonus, b.questionTarget ? `Blok tamamlandı (${b.questionTarget} hedef soru)` : "Blok tamamlandı");
  }
  commit({ type: "schedule" });
}

function clearWeek() {
  state.schedule = emptySchedule();
  commit({ type: "schedule" });
}

function copyDay(fromDay, targetDays) {
  const source = state.schedule[fromDay].map((b) => ({ ...b, id: uid(), done: false }));
  for (const d of targetDays) {
    state.schedule[d] = source.map((b) => ({ ...b, id: uid() }));
  }
  commit({ type: "schedule" });
}

function startNewWeek() {
  const stats = weekStats(state.weekStart);
  state.history.unshift({
    weekStart: state.weekStart,
    completedBlocks: stats.completedBlocks,
    totalBlocks: stats.totalBlocks,
    solvedQuestions: stats.solvedQuestions,
    xp: stats.weekXp,
    archivedAt: new Date().toISOString()
  });
  state.history = state.history.filter(
    (h, i) => state.history.findIndex((x) => x.weekStart === h.weekStart) === i
  );
  state.weekStart = addDays(state.weekStart, 7);
  for (const d of DAYS) state.schedule[d.key] = state.schedule[d.key].map((b) => ({ ...b, done: false }));
  commit({ type: "schedule" });
}

/* ------------------------- Geçmiş hafta arşivi ------------------------- */

function updateHistory(weekStart, patch) {
  const h = state.history.find((x) => x.weekStart === weekStart);
  if (!h) return;
  if (patch.weekStart) h.weekStart = patch.weekStart;
  if (typeof patch.completedBlocks !== "undefined") h.completedBlocks = Math.max(0, Number(patch.completedBlocks) || 0);
  if (typeof patch.totalBlocks !== "undefined") h.totalBlocks = Math.max(0, Number(patch.totalBlocks) || 0);
  if (typeof patch.solvedQuestions !== "undefined") h.solvedQuestions = Math.max(0, Number(patch.solvedQuestions) || 0);
  if (typeof patch.xp !== "undefined") h.xp = Math.max(0, Number(patch.xp) || 0);
  if (h.completedBlocks > h.totalBlocks) h.totalBlocks = h.completedBlocks;
  state.history.sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1));
  commit({ type: "history" });
}

function removeHistory(weekStart) {
  state.history = state.history.filter((x) => x.weekStart !== weekStart);
  commit({ type: "history" });
}

function clearHistory() {
  state.history = [];
  commit({ type: "history" });
}

/* ------------------------- Sorular ------------------------- */

function addQuestion(data) {
  const rec = normalizeQuestion({ ...data, date: data.date || toISO() });
  state.questions.unshift(rec);
  markActivity(rec.date);
  incrementDaily("solved", rec.solved, rec.date);
  grantXPInternal(Math.max(2, Math.round(rec.solved / 5)), "Soru çözümü", rec.date);
  commit({ type: "questions" });
  return rec;
}

function updateQuestion(id, patch) {
  const i = state.questions.findIndex((q) => q.id === id);
  if (i < 0) return;
  const old = state.questions[i];
  const merged = normalizeQuestion({ ...old, ...patch });
  state.questions[i] = merged;
  commit({ type: "questions" });
}

function removeQuestion(id) {
  state.questions = state.questions.filter((q) => q.id !== id);
  commit({ type: "questions" });
}

/* ------------------------- Eksik konular ------------------------- */

function addTopic(data) {
  const rec = {
    id: uid(),
    subject: (data.subject || "").trim(),
    title: (data.title || "").trim(),
    priority: PRIORITIES.includes(data.priority) ? data.priority : "Orta",
    status: STATUSES.includes(data.status) ? data.status : "Eksik",
    createdAt: new Date().toISOString()
  };
  state.topics.unshift(rec);
  commit({ type: "topics" });
  return rec;
}

function updateTopic(id, patch) {
  const t = state.topics.find((x) => x.id === id);
  if (!t) return;
  const wasDone = t.status === "Tamamlandı";
  Object.assign(t, patch);
  if (patch.status && patch.status !== "Eksik") markActivity();
  if (!wasDone && t.status === "Tamamlandı") {
    incrementDaily("topicsDone");
    grantXPInternal(15, "Konu tamamlandı");
  }
  commit({ type: "topics" });
}

function removeTopic(id) {
  state.topics = state.topics.filter((t) => t.id !== id);
  commit({ type: "topics" });
}

/* ------------------------- Not kartları ------------------------- */

function addNote(data) {
  const rec = {
    id: uid(),
    subject: (data.subject || "").trim(),
    title: (data.title || "").trim(),
    body: (data.body || "").trim(),
    createdAt: new Date().toISOString()
  };
  state.noteCards.unshift(rec);
  commit({ type: "notes" });
  return rec;
}

function updateNote(id, patch) {
  const n = state.noteCards.find((x) => x.id === id);
  if (!n) return;
  Object.assign(n, patch);
  commit({ type: "notes" });
}

function removeNote(id) {
  state.noteCards = state.noteCards.filter((n) => n.id !== id);
  commit({ type: "notes" });
}

/* ------------------------- Denemeler ------------------------- */

function addExam(data) {
  const rec = normalizeExam({ ...data, date: data.date || toISO() });
  state.exams.unshift(rec);
  markActivity(rec.date);
  grantXPInternal(50, "Deneme kaydı", rec.date);
  commit({ type: "exams" });
  return rec;
}

function updateExam(id, patch) {
  const i = state.exams.findIndex((e) => e.id === id);
  if (i < 0) return;
  state.exams[i] = normalizeExam({ ...state.exams[i], ...patch });
  commit({ type: "exams" });
}

function removeExam(id) {
  state.exams = state.exams.filter((e) => e.id !== id);
  commit({ type: "exams" });
}

/** @param {any} exam */
function examNet(exam) {
  const correct = exam.scores.reduce((a, s) => a + s.correct, 0);
  const wrong = exam.scores.reduce((a, s) => a + s.wrong, 0);
  const empty = exam.scores.reduce((a, s) => a + s.empty, 0);
  return {
    correct, wrong, empty,
    total: correct + wrong + empty,
    net: Math.round((correct - wrong / 4) * 100) / 100
  };
}

function examStats(filterType) {
  const list = state.exams
    .filter((e) => !filterType || e.type === filterType)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  const nets = list.map((e) => examNet(e).net);
  const last = list[list.length - 1];
  const best = list.reduce((m, e) => Math.max(m, examNet(e).net), 0);
  const avg = nets.length ? Math.round((nets.reduce((a, n) => a + n, 0) / nets.length) * 100) / 100 : 0;

  const ranks = list.filter((e) => Number(e.rank) > 0).map((e) => Number(e.rank));
  const lastRank = last && Number(last.rank) > 0 ? Number(last.rank) : (ranks.length ? ranks[ranks.length - 1] : 0);
  const bestRank = ranks.length ? Math.min(...ranks) : 0;
  const avgRank = ranks.length ? Math.round(ranks.reduce((a, r) => a + r, 0) / ranks.length) : 0;

  return {
    count: list.length,
    lastNet: last ? examNet(last).net : 0,
    bestNet: Math.round(best * 100) / 100,
    avgNet: avg,
    lastRank, bestRank, avgRank,
    series: list.map((e) => ({ date: e.date, label: fmtShort(e.date), value: examNet(e).net })),
    rankSeries: list.filter((e) => Number(e.rank) > 0).map((e) => ({ date: e.date, label: fmtShort(e.date), value: Number(e.rank) })),
    subjectTotals: examSubjectTotals(list),
    types: [...new Set(state.exams.map((e) => e.type))]
  };
}

function examSubjectTotals(list) {
  const map = {};
  for (const e of list) {
    for (const s of e.scores) {
      const key = s.subject || "Ders";
      if (!map[key]) map[key] = { subject: key, correct: 0, wrong: 0, empty: 0 };
      map[key].correct += s.correct;
      map[key].wrong += s.wrong;
      map[key].empty += s.empty;
    }
  }
  return Object.values(map).map((s) => {
    const total = s.correct + s.wrong;
    return { ...s, net: Math.round((s.correct - s.wrong / 4) * 100) / 100, rate: total ? Math.round((s.correct / total) * 100) : 0 };
  }).sort((a, b) => b.net - a.net);
}

/* ------------------------- Hedef ------------------------- */

function setGoal(patch) {
  const g = state.settings.goal;
  if (typeof patch.examType !== "undefined") g.examType = patch.examType;
  if (typeof patch.label !== "undefined") g.label = (patch.label || "").trim();
  if (typeof patch.targetNet !== "undefined") g.targetNet = Math.max(0, Number(patch.targetNet) || 0);
  if (typeof patch.targetRank !== "undefined") g.targetRank = Math.max(0, Number(patch.targetRank) || 0);
  commit({ type: "goal" });
}

function goalStatus() {
  const goal = { ...state.settings.goal };
  const stats = examStats(goal.examType || undefined);
  const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
  const netPct = goal.targetNet ? clamp((stats.lastNet / goal.targetNet) * 100) : 0;
  const rankPct = goal.targetRank && stats.lastRank ? clamp((goal.targetRank / stats.lastRank) * 100) : 0;
  return {
    goal,
    count: stats.count,
    lastNet: stats.lastNet,
    avgNet: stats.avgNet,
    lastRank: stats.lastRank,
    avgRank: stats.avgRank,
    netPct,
    rankPct,
    netGap: Math.round((goal.targetNet - stats.lastNet) * 100) / 100,
    rankGap: stats.lastRank && goal.targetRank ? stats.lastRank - goal.targetRank : 0,
    netReached: goal.targetNet > 0 && stats.lastNet >= goal.targetNet,
    rankReached: goal.targetRank > 0 && stats.lastRank > 0 && stats.lastRank <= goal.targetRank
  };
}

/* ------------------------- Görevler (quest) ------------------------- */

function grantQuest(key, reward, title) {
  if (state.quests.claimed[key]) return false;
  state.quests.claimed[key] = true;
  grantXPInternal(reward, `Görev: ${title}`);
  commit({ type: "quest" });
  return true;
}

function questContext() {
  const today = toISO();
  const week = state.weekStart;
  const todayRec = { ...EMPTY_DAY, ...(state.daily[today] || {}) };
  let weekBlocks = 0, weekSolved = 0, weekXp = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(week, i);
    const rec = state.daily[d];
    if (rec) { weekBlocks += rec.blocksDone || 0; weekSolved += rec.solved || 0; weekXp += rec.xp || 0; }
  }
  const weekExams = state.exams.filter((e) => e.date >= week && e.date <= addDays(week, 6)).length;
  return {
    today,
    weekStart: week,
    todayBlocks: todayRec.blocksDone,
    todaySolved: todayRec.solved,
    todayPomodoro: todayRec.pomodoros,
    todayTopics: todayRec.topicsDone,
    weekBlocks,
    weekSolved,
    weekExams,
    weekXp
  };
}

/* ------------------------- Müfredat (konu takip matrisi) ------------------------- */

function seedCurriculum(force = false) {
  const entries = [];
  for (const [grade, subjects] of Object.entries(CURRICULUM_SEED)) {
    for (const [subject, topics] of Object.entries(subjects)) {
      for (const topic of topics) {
        entries.push({ id: uid(), grade, subject, topic, status: "Hiç Başlanmadı", reviewDate: "", minutes: 0 });
      }
    }
  }
  if (force) {
    state.curriculum = entries;
  } else {
    const existing = new Set(state.curriculum.map((i) => `${i.grade}|${i.subject}|${i.topic}`));
    for (const e of entries) {
      if (!existing.has(`${e.grade}|${e.subject}|${e.topic}`)) state.curriculum.push(e);
    }
  }
  state.seeded = { ...state.seeded, curriculum: true, curriculumVersion: SEED_VERSION };
  commit({ type: "curriculum" });
}

function ensureCurriculum() {
  const v = state.seeded.curriculumVersion || (state.seeded.curriculum ? 1 : 0);
  if (v >= SEED_VERSION) return;
  seedCurriculum(false);
}

function addCurriculumTopic(data) {
  const rec = {
    id: uid(),
    grade: GRADES.includes(data.grade) ? data.grade : "TYT",
    subject: (data.subject || "").trim(),
    topic: (data.topic || "").trim(),
    status: CURRICULUM_STATUSES.includes(data.status) ? data.status : "Hiç Başlanmadı",
    reviewDate: data.reviewDate || "",
    minutes: Math.max(0, Number(data.minutes) || 0)
  };
  if (!rec.topic) return null;
  state.curriculum.push(rec);
  commit({ type: "curriculum" });
  return rec;
}

function updateCurriculumTopic(id, patch) {
  const t = state.curriculum.find((x) => x.id === id);
  if (!t) return;
  if (patch.status && CURRICULUM_STATUSES.includes(patch.status)) t.status = patch.status;
  if (typeof patch.topic === "string") t.topic = patch.topic.trim();
  if (typeof patch.subject === "string") t.subject = patch.subject.trim();
  if (patch.grade && GRADES.includes(patch.grade)) t.grade = patch.grade;
  if (typeof patch.reviewDate === "string") t.reviewDate = patch.reviewDate;
  if (typeof patch.minutes !== "undefined") t.minutes = Math.max(0, Number(patch.minutes) || 0);
  commit({ type: "curriculum" });
}

function removeCurriculumTopic(id) {
  state.curriculum = state.curriculum.filter((t) => t.id !== id);
  commit({ type: "curriculum" });
}

function curriculumGrades(system) {
  const sys = system || state.settings.curriculumSystem;
  return (CURRICULUM_SYSTEMS[sys] || CURRICULUM_SYSTEMS.eski).grades;
}

function setCurriculumSystem(system) {
  if (!CURRICULUM_SYSTEMS[system]) return;
  state.settings.curriculumSystem = system;
  commit({ type: "settings" });
}

function curriculumProgress(grade) {
  const allowedSet = new Set(grade ? [grade] : curriculumGrades());
  const items = state.curriculum.filter((i) => allowedSet.has(i.grade));
  const total = items.length;
  const done = items.filter((i) => i.status === "Tamam").length;
  const working = items.filter((i) => i.status === "Çalışılıyor").length;
  const review = items.filter((i) => i.status === "Tekrar Lazım").length;
  const notStarted = total - done - working - review;
  return { total, done, working, review, notStarted, pct: total ? Math.round((done / total) * 100) : 0 };
}

function curriculumBySubject(grade) {
  const allowedSet = new Set(grade ? [grade] : curriculumGrades());
  const map = {};
  for (const i of state.curriculum) {
    if (!allowedSet.has(i.grade)) continue;
    if (!map[i.subject]) map[i.subject] = { subject: i.subject, total: 0, done: 0 };
    map[i.subject].total++;
    if (i.status === "Tamam") map[i.subject].done++;
  }
  return Object.values(map)
    .map((s) => ({ ...s, pct: s.total ? Math.round((s.done / s.total) * 100) : 0 }))
    .sort((a, b) => a.subject.localeCompare(b.subject, "tr"));
}

/* ------------------------- Kaynak / Soru Bankası ------------------------- */

function addResource(data) {
  const rec = {
    id: uid(),
    name: (data.name || "").trim(),
    subject: (data.subject || "").trim(),
    unit: data.unit === "Test" ? "Test" : "Sayfa",
    total: Math.max(0, Number(data.total) || 0),
    done: Math.max(0, Number(data.done) || 0)
  };
  if (!rec.name) return null;
  if (rec.done > rec.total && rec.total > 0) rec.done = rec.total;
  state.resources.push(rec);
  markActivity();
  commit({ type: "resources" });
  return rec;
}

function updateResource(id, patch) {
  const r = state.resources.find((x) => x.id === id);
  if (!r) return;
  const oldDone = r.done;
  if (typeof patch.name === "string") r.name = patch.name.trim();
  if (typeof patch.subject === "string") r.subject = patch.subject.trim();
  if (patch.unit) r.unit = patch.unit === "Test" ? "Test" : "Sayfa";
  if (typeof patch.total !== "undefined") r.total = Math.max(0, Number(patch.total) || 0);
  if (typeof patch.done !== "undefined") r.done = Math.max(0, Number(patch.done) || 0);
  if (r.total > 0 && r.done > r.total) r.done = r.total;
  const delta = r.done - oldDone;
  if (delta > 0) {
    markActivity();
    incrementDaily("resource", delta);
    grantXPInternal(Math.max(1, Math.round(delta / 5)), "Kaynak ilerlemesi");
  }
  commit({ type: "resources" });
}

function removeResource(id) {
  state.resources = state.resources.filter((r) => r.id !== id);
  commit({ type: "resources" });
}

function resourceStats() {
  const total = state.resources.length;
  const target = state.resources.reduce((a, r) => a + r.total, 0);
  const done = state.resources.reduce((a, r) => a + r.done, 0);
  const finished = state.resources.filter((r) => r.total > 0 && r.done >= r.total).length;
  const goal = state.settings.resourceDailyGoal || 0;
  const todayDone = (state.daily[toISO()] || {}).resource || 0;
  return {
    total, target, done, finished,
    pct: target ? Math.round((done / target) * 100) : 0,
    goal,
    todayDone,
    goalMet: goal > 0 && todayDone >= goal,
    streak: resourceStreak()
  };
}

function resourceStreak() {
  const goal = state.settings.resourceDailyGoal || 0;
  if (!goal) return 0;
  let cursor = toISO();
  if (((state.daily[cursor] || {}).resource || 0) < goal) cursor = addDays(cursor, -1);
  let count = 0;
  while (((state.daily[cursor] || {}).resource || 0) >= goal) {
    count++;
    cursor = addDays(cursor, -1);
  }
  return count;
}

/** Denemelerde en çok yanlış yapılan konuların toplamı. */
function examWrongTopics(filterType) {
  const map = {};
  for (const e of state.exams) {
    if (filterType && e.type !== filterType) continue;
    for (const t of (e.tags || [])) {
      const key = `${t.subject}|${t.topic}`;
      if (!map[key]) map[key] = { subject: t.subject, topic: t.topic, wrong: 0 };
      map[key].wrong += t.wrong;
    }
  }
  return Object.values(map).sort((a, b) => b.wrong - a.wrong);
}

/* ------------------------- Haftalık değerlendirme ------------------------- */

function saveReview(weekStart, note) {
  const text = (note || "").trim();
  const existing = state.reviews.find((r) => r.weekStart === weekStart);
  if (!text) return false;
  if (existing) {
    existing.note = text;
    existing.updatedAt = new Date().toISOString();
  } else {
    state.reviews.unshift({ weekStart, note: text, updatedAt: new Date().toISOString() });
  }
  commit({ type: "reviews" });
  return true;
}

function removeReview(weekStart) {
  state.reviews = state.reviews.filter((r) => r.weekStart !== weekStart);
  commit({ type: "reviews" });
}

/* ------------------------- Profil & Sınıf Ligi ------------------------- */

function setProfile(data) {
  if (typeof data.username === "string") state.settings.username = data.username.trim();
  if (data.className && GRADES.includes(data.className)) state.settings.className = data.className;
  commit({ type: "profile" });
}

function addRival(data) {
  const name = (data.username || "").trim();
  if (!name) return null;
  const cls = data.className && GRADES.includes(data.className) ? data.className : (state.settings.className || "11. Sınıf");
  const xp = Math.max(0, Number(data.xp) || 0);
  const existing = state.rivals.find((r) => r.username.toLowerCase() === name.toLowerCase() && r.className === cls);
  if (existing) {
    existing.xp = xp;
    commit({ type: "rivals" });
    return existing;
  }
  const rec = { id: uid(), username: name, className: cls, xp };
  state.rivals.push(rec);
  commit({ type: "rivals" });
  return rec;
}

function removeRival(id) {
  state.rivals = state.rivals.filter((r) => r.id !== id);
  commit({ type: "rivals" });
}

function setRivalXp(id, xp) {
  const r = state.rivals.find((x) => x.id === id);
  if (!r) return;
  r.xp = Math.max(0, Number(xp) || 0);
  commit({ type: "rivals" });
}

/** Arkadaşın JSON yedeğinden rakip profili çıkarır. */
function importRivalFromData(obj) {
  if (!obj || typeof obj !== "object") return null;
  const username = String(obj.settings?.username || obj.username || "").trim();
  const className = GRADES.includes(obj.settings?.className) ? obj.settings.className : "11. Sınıf";
  const xp = Math.max(0, Number(obj.xp) || 0);
  return addRival({ username: username || "Bilinmeyen", className, xp });
}

/** Seçilen sınıftaki kullanıcı + rakipler, XP'ye göre sıralı. */
function leagueRows(className) {
  const cls = className || state.settings.className || "11. Sınıf";
  const rows = [{ id: "self", username: state.settings.username || "Sen", className: cls, xp: state.xp, isSelf: true }];
  for (const r of state.rivals) {
    if (r.className === cls) rows.push({ ...r, isSelf: false });
  }
  rows.sort((a, b) => (b.xp - a.xp) || a.username.localeCompare(b.username, "tr"));
  let rank = 1;
  rows.forEach((r, i) => {
    if (i > 0 && rows[i - 1].xp === r.xp) r.rank = rows[i - 1].rank;
    else r.rank = i + 1;
  });
  return rows;
}

/* ------------------------- Ayarlar ------------------------- */

function addSubject(name) {
  const n = (name || "").trim();
  if (!n) return false;
  if (!state.settings.subjects.includes(n)) {
    state.settings.subjects.push(n);
    commit({ type: "settings" });
  }
  return true;
}

function setPomodoroPresets(list) {
  state.settings.pomodoroPresets = list.filter((n) => n > 0);
  commit({ type: "settings" });
}

function removeSubject(name) {
  state.settings.subjects = state.settings.subjects.filter((s) => s !== name);
  commit({ type: "settings" });
}

function setFont(font) {
  state.settings.font = font || "playful";
  commit({ type: "settings" });
}

function setTargetDate(date, label) {
  state.settings.targetDate = date || "";
  if (typeof label === "string") state.settings.countdownLabel = label.trim() || "YKS";
  commit({ type: "settings" });
}

function setLightMode(on) {
  state.settings.lightMode = Boolean(on);
  commit({ type: "settings" });
}

function setAutoBackup(on) {
  state.settings.autoBackup = Boolean(on);
  commit({ type: "settings" });
}

function setResourceDailyGoal(n) {
  state.settings.resourceDailyGoal = Math.max(0, Number(n) || 0);
  commit({ type: "settings" });
}

function setCustomRanks(list) {
  if (!Array.isArray(list) || list.length < 2) return;
  state.settings.ranks = list
    .map((r, i) => ({
      min: Math.max(1, Number(r.min) || i + 1),
      name: (r.name || `Seviye ${i + 1}`).trim(),
      icon: (r.icon || "⭐").slice(0, 4)
    }))
    .sort((a, b) => a.min - b.min);
  commit({ type: "settings" });
}

function resetRanks() {
  state.settings.ranks = null;
  commit({ type: "settings" });
}

function countdown() {
  if (!state.settings.targetDate) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = parseISO(state.settings.targetDate);
  const days = Math.ceil((target - today) / 86400000);
  return {
    date: state.settings.targetDate,
    label: state.settings.countdownLabel,
    days,
    weeks: Math.floor(days / 7)
  };
}

/* ------------------------- İstatistikler ------------------------- */

function dayStats(day) {
  const list = state.schedule[day] || [];
  const total = list.length;
  const done = list.filter((b) => b.done).length;
  const minutes = list.filter((b) => b.done).reduce((a, b) => a + (Number(b.minutes) || 0), 0);
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0, minutes };
}

function weekStats(weekStart = state.weekStart) {
  let totalBlocks = 0, completedBlocks = 0, plannedMinutes = 0, doneMinutes = 0;
  let plannedQuestions = 0, completedQuestionTarget = 0;
  for (const d of DAYS) {
    const st = dayStats(d.key);
    totalBlocks += st.total;
    completedBlocks += st.done;
    const blocks = state.schedule[d.key] || [];
    plannedMinutes += blocks.reduce((a, b) => a + (Number(b.minutes) || 0), 0);
    plannedQuestions += blocks.reduce((a, b) => a + (b.questionTarget || 0), 0);
    completedQuestionTarget += blocks.filter((b) => b.done).reduce((a, b) => a + (b.questionTarget || 0), 0);
    doneMinutes += st.minutes;
  }
  const from = weekStart;
  const to = addDays(weekStart, 6);
  const weekQuestions = state.questions.filter((q) => q.date >= from && q.date <= to);
  const solvedQuestions = weekQuestions.reduce((a, q) => a + q.solved, 0);
  const correct = weekQuestions.reduce((a, q) => a + q.correct, 0);
  const wrong = weekQuestions.reduce((a, q) => a + q.wrong, 0);
  const net = correct - wrong / 4;
  const weekXp = [0, 1, 2, 3, 4, 5, 6].reduce((a, i) => a + ((state.daily[addDays(from, i)] || {}).xp || 0), 0);
  const weekExams = state.exams.filter((e) => e.date >= from && e.date <= to);
  return {
    weekStart,
    totalBlocks,
    completedBlocks,
    plannedMinutes,
    doneMinutes,
    pct: totalBlocks ? Math.round((completedBlocks / totalBlocks) * 100) : 0,
    solvedQuestions,
    correct,
    wrong,
    net: Math.round(net * 100) / 100,
    successRate: solvedQuestions ? Math.round((correct / solvedQuestions) * 100) : 0,
    plannedQuestions,
    completedQuestionTarget,
    weekXp,
    examCount: weekExams.length,
    examAvgNet: weekExams.length
      ? Math.round((weekExams.reduce((a, e) => a + examNet(e).net, 0) / weekExams.length) * 100) / 100
      : 0
  };
}

function totalSolved() {
  return state.questions.reduce((a, q) => a + q.solved, 0);
}

function questionStatsBySubject() {
  const map = {};
  for (const q of state.questions) {
    const key = q.subject || "Diğer";
    if (!map[key]) map[key] = { solved: 0, correct: 0, wrong: 0 };
    map[key].solved += q.solved;
    map[key].correct += q.correct;
    map[key].wrong += q.wrong;
  }
  return map;
}

function pendingTopics() {
  return state.topics.filter((t) => t.status !== "Tamamlandı").length;
}

function streak() {
  if (state.activityDates.length === 0) return 0;
  const set = new Set(state.activityDates);
  const today = toISO();
  const yesterday = addDays(today, -1);
  let cursor = set.has(today) ? today : set.has(yesterday) ? yesterday : null;
  if (!cursor) return 0;
  let count = 0;
  while (set.has(cursor)) {
    count++;
    cursor = addDays(cursor, -1);
  }
  return count;
}

/* ------------------------- Dışa / İçe aktarma ------------------------- */

function exportData() {
  return {
    ...state,
    _meta: {
      app: "YKS Haftalık Takip",
      exportedAt: new Date().toISOString(),
      schemaVersion: SCHEMA_VERSION
    }
  };
}

function downloadJSON(filename) {
  const data = JSON.stringify(exportData(), null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = filename || `yks-tracker-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importData(obj, mode = "replace") {
  if (!obj || typeof obj !== "object") throw new Error("Geçersiz JSON içeriği.");
  const incoming = normalize(obj);

  if (mode === "replace") {
    state = incoming;
  } else {
    for (const q of incoming.questions) state.questions.push({ ...q, id: uid() });
    for (const t of incoming.topics) state.topics.push({ ...t, id: uid() });
    for (const n of incoming.noteCards) state.noteCards.push({ ...n, id: uid() });
    for (const e of incoming.exams) state.exams.push({ ...e, id: uid() });
    for (const c of incoming.curriculum) {
      if (!state.curriculum.some((x) => x.grade === c.grade && x.subject === c.subject && x.topic === c.topic)) {
        state.curriculum.push({ ...c, id: uid() });
      }
    }
    for (const r of incoming.resources) state.resources.push({ ...r, id: uid() });
    for (const rv of incoming.reviews) {
      if (!state.reviews.some((x) => x.weekStart === rv.weekStart)) state.reviews.push(rv);
    }
    state.seeded = { ...state.seeded, curriculum: state.seeded.curriculum || incoming.seeded.curriculum };
    for (const h of incoming.history) {
      if (!state.history.some((x) => x.weekStart === h.weekStart)) state.history.push(h);
    }
    for (const a of incoming.activityDates) {
      if (!state.activityDates.includes(a)) state.activityDates.push(a);
    }
    for (const sub of incoming.settings.subjects) {
      if (!state.settings.subjects.includes(sub)) state.settings.subjects.push(sub);
    }
    state.xp = Math.max(state.xp, incoming.xp);
    for (const [k, v] of Object.entries(incoming.daily)) {
      if (!state.daily[k]) state.daily[k] = { ...EMPTY_DAY, ...v };
      else state.daily[k] = { ...state.daily[k], xp: Math.max(state.daily[k].xp || 0, v.xp || 0) };
    }
    Object.assign(state.quests.claimed, incoming.quests.claimed);
  }
  state.history.sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1));
  commit({ type: "import" });
}

/* ------------------------- Dışa verilen API ------------------------- */

export const store = {
  get state() { return state; },
  get weekStart() { return state.weekStart; },
  DAYS, PRIORITIES, STATUSES, DEFAULT_SUBJECTS, EXAM_TYPES, RANKS, CURRICULUM_STATUSES, CURRICULUM_SYSTEMS, GRADES,

  uid, toISO, parseISO, addDays, mondayOf, fmtTR, fmtShort, daysBetweenISO, levelInfo, effectiveRanks,

  subscribe,

  addBlock, updateBlock, removeBlock, moveBlock, toggleBlock,
  clearWeek, copyDay, startNewWeek, dayStats, weekStats,

  updateHistory, removeHistory, clearHistory,

  addQuestion, updateQuestion, removeQuestion, questionStatsBySubject, totalSolved,

  addTopic, updateTopic, removeTopic, pendingTopics,

  addNote, updateNote, removeNote,

  addExam, updateExam, removeExam, examNet, examStats, examSubjectTotals, examWrongTopics,
  setGoal, goalStatus,

  seedCurriculum, ensureCurriculum, addCurriculumTopic, updateCurriculumTopic,
  removeCurriculumTopic, curriculumProgress, curriculumBySubject, curriculumGrades, setCurriculumSystem,

  addResource, updateResource, removeResource, resourceStats,

  saveReview, removeReview,

  setProfile, addRival, removeRival, setRivalXp, importRivalFromData, leagueRows,

  questContext, grantQuest,

  addSubject, removeSubject, setPomodoroPresets,
  setFont, setTargetDate, setLightMode, setCustomRanks, resetRanks, countdown,
  setAutoBackup, setResourceDailyGoal,

  markActivity: () => { markActivity(); commit({ type: "activity" }); },
  recordPomodoro: () => {
    markActivity();
    incrementDaily("pomodoros");
    grantXPInternal(15, "Odak seansı");
    commit({ type: "pomodoro" });
  },
  streak,

  exportData, downloadJSON, importData,

  _reset() { state = defaultState(); commit({ type: "reset" }); }
};
