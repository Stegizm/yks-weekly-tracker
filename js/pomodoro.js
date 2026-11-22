/* =========================================================
   pomodoro.js — Modül B: Odak Zamanlayıcısı
   ========================================================= */

import { store } from "./store.js";
import { $, $$, esc, toast } from "./ui.js";

let totalSeconds = 25 * 60;
let remaining = totalSeconds;
let running = false;
let endAt = 0;
let tickId = 0;
let audioCtx = null;
let linkedKey = "";

function fmt(sec) {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function beep() {
  try {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtx = new Ctx();
    }
    const now = audioCtx.currentTime;
    [0, 0.28, 0.56].forEach((offset, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = i === 2 ? 880 : 660;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.25, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.22);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.24);
    });
  } catch (e) { /* ses desteklenmiyor */ }
}

function updateDisplay() {
  const time = $("#pomoTime");
  const bar = $("#pomoBar");
  if (time) {
    time.textContent = fmt(remaining);
    time.setAttribute("datetime", `PT${Math.round(remaining / 60)}M`);
  }
  if (bar) {
    const pct = totalSeconds ? ((totalSeconds - remaining) / totalSeconds) * 100 : 0;
    bar.style.width = `${Math.min(100, Math.max(0, pct))}%`;
  }
  const start = $("#pomoStart");
  const pause = $("#pomoPause");
  if (start) start.disabled = running;
  if (pause) pause.disabled = !running;
  document.title = running
    ? `${fmt(remaining)} • YKS Tracker`
    : "YKS Haftalık Takip";
}

function tick() {
  remaining = Math.max(0, (endAt - Date.now()) / 1000);
  updateDisplay();
  if (remaining <= 0) finish();
}

function start() {
  if (running) return;
  if (remaining <= 0) remaining = totalSeconds;
  running = true;
  endAt = Date.now() + remaining * 1000;
  clearInterval(tickId);
  tickId = window.setInterval(tick, 250);
  // ses iznini kullanıcı jestinde başlat
  try {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
  } catch { /* yoksay */ }
  updateDisplay();
}

function pause() {
  if (!running) return;
  running = false;
  remaining = Math.max(0, (endAt - Date.now()) / 1000);
  clearInterval(tickId);
  updateDisplay();
}

function reset() {
  running = false;
  clearInterval(tickId);
  remaining = totalSeconds;
  const pomo = $(".pomo");
  pomo?.classList.remove("is-finished");
  const note = $("#pomoDoneNote");
  if (note) note.hidden = true;
  updateDisplay();
}

function setMinutes(min) {
  const m = Math.max(1, Math.min(180, Number(min) || 25));
  totalSeconds = m * 60;
  remaining = totalSeconds;
  running = false;
  clearInterval(tickId);
  const pomo = $(".pomo");
  pomo?.classList.remove("is-finished");
  const note = $("#pomoDoneNote");
  if (note) note.hidden = true;
  updateDisplay();
  $$("#pomoPresets .btn").forEach((b) => {
    b.classList.toggle("is-active", Number(/** @type {HTMLElement} */ (b).dataset.min) === m);
  });
}

function finish() {
  running = false;
  clearInterval(tickId);
  remaining = 0;
  beep();
  $(".pomo")?.classList.add("is-finished");
  const note = $("#pomoDoneNote");
  note && (note.hidden = false);
  toast("Odak süresi doldu! +15 XP 🎉", "success");
  store.recordPomodoro();

  if (linkedKey) {
    const [day, id] = linkedKey.split(":");
    const block = (store.state.schedule[day] || []).find((b) => b.id === id);
    if (block && !block.done) store.toggleBlock(day, id);
  }
  updateDisplay();
}

function renderPresets() {
  const wrap = $("#pomoPresets");
  if (!wrap) return;
  const presets = store.state.settings.pomodoroPresets;
  wrap.innerHTML = presets
    .map((m) => `<button class="btn ${m * 60 === totalSeconds ? "is-active" : ""}" type="button" data-min="${m}">${m} dk</button>`)
    .join("");
  $$("#pomoPresets .btn").forEach((b) => {
    b.addEventListener("click", () => setMinutes(Number(/** @type {HTMLElement} */ (b).dataset.min)));
  });
}

function renderLinkSelect() {
  const sel = /** @type {HTMLSelectElement|null} */ ($("#pomoLink"));
  if (!sel) return;
  const opts = ['<option value="">— Bağlı değil —</option>'];
  for (const d of store.DAYS) {
    for (const b of store.state.schedule[d.key]) {
      const label = `${d.short} • ${b.subject ? b.subject + " — " : ""}${b.task || "blok"}`;
      opts.push(`<option value="${d.key}:${b.id}">${esc(label)}</option>`);
    }
  }
  sel.innerHTML = opts.join("");
  if (linkedKey) sel.value = linkedKey;
}

export function initPomodoro() {
  renderPresets();
  renderLinkSelect();
  setMinutes(store.state.settings.pomodoroPresets[0] || 25);

  $("#pomoStart")?.addEventListener("click", start);
  $("#pomoPause")?.addEventListener("click", pause);
  $("#pomoReset")?.addEventListener("click", reset);
  $("#pomoSetCustom")?.addEventListener("click", () => {
    const input = /** @type {HTMLInputElement} */ ($("#pomoCustom"));
    if (!input.value) { toast("Bir dakika değeri gir.", "error"); return; }
    setMinutes(input.value);
    toast(`Süre ${input.value} dk olarak ayarlandı.`, "success");
  });
  $("#pomoLink")?.addEventListener("change", (e) => {
    linkedKey = /** @type {HTMLSelectElement} */ (e.target).value;
  });

  updateDisplay();
}

export function refreshPomodoro() {
  renderLinkSelect();
}
