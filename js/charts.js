/* =========================================================
   charts.js — Bağımlılıksız SVG grafik yardımcıları
   ========================================================= */

let gradSeq = 0;
function nextId() { return `g${++gradSeq}`; }

function escAttr(v) {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

/**
 * Çizgi grafik.
 * @param {{label?:string, value:number}[]|number[]} input
 * @param {{height?:number, color?:string, fill?:boolean, ySuffix?:string}} [opts]
 */
export function lineChart(input, opts = {}) {
  const data = (Array.isArray(input) ? input : []).map((d) =>
    typeof d === "number" ? { label: "", value: d } : { label: d.label || "", value: Number(d.value) || 0 }
  );
  const W = 640;
  const H = opts.height || 200;
  const padL = 34, padR = 14, padT = 14, padB = 26;
  const color = opts.color || "#8B5CF6";

  if (data.length === 0) {
    return `<div class="chart-empty">Henüz grafik verisi yok.</div>`;
  }

  const values = data.map((d) => d.value);
  const max = Math.max(1, ...values);
  const min = 0;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const n = data.length;
  const stepX = n > 1 ? innerW / (n - 1) : 0;

  const x = (i) => padL + (n > 1 ? i * stepX : innerW / 2);
  const y = (v) => padT + innerH - ((v - min) / (max - min || 1)) * innerH;

  const pts = data.map((d, i) => [x(i), y(d.value)]);
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${pts[pts.length - 1][0].toFixed(1)},${(padT + innerH).toFixed(1)} L${pts[0][0].toFixed(1)},${(padT + innerH).toFixed(1)} Z`;

  const gid = nextId();
  const grid = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const gy = padT + innerH - t * innerH;
    const val = Math.round(min + t * (max - min));
    return `<line x1="${padL}" y1="${gy.toFixed(1)}" x2="${W - padR}" y2="${gy.toFixed(1)}" class="chart-grid"/>
      <text x="${padL - 6}" y="${(gy + 3).toFixed(1)}" class="chart-axis" text-anchor="end">${val}</text>`;
  }).join("");

  const labelEvery = Math.ceil(n / 6);
  const xlabels = data.map((d, i) =>
    (i % labelEvery === 0 || i === n - 1)
      ? `<text x="${x(i).toFixed(1)}" y="${H - 8}" class="chart-axis" text-anchor="middle">${escAttr(d.label)}</text>`
      : ""
  ).join("");

  const dots = pts.map((p) =>
    `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.2" fill="${color}"/>`
  ).join("");

  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img">
    <defs>
      <linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${color}" stop-opacity="0.32"/>
        <stop offset="1" stop-color="${color}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    ${grid}
    <path d="${areaPath}" fill="url(#${gid})"/>
    <path d="${linePath}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${dots}
    ${xlabels}
  </svg>`;
}

/**
 * Dikey çubuk grafik.
 * @param {{label:string, value:number, color?:string}[]} items
 */
export function barChart(items, opts = {}) {
  const data = Array.isArray(items) ? items : [];
  if (data.length === 0) return `<div class="chart-empty">Veri yok.</div>`;
  const W = 640;
  const H = opts.height || 200;
  const padL = 34, padR = 14, padT = 16, padB = 34;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const max = Math.max(1, ...data.map((d) => d.value));
  const slot = innerW / data.length;
  const bw = Math.min(46, slot * 0.6);

  const grid = [0, 0.5, 1].map((t) => {
    const gy = padT + innerH - t * innerH;
    return `<line x1="${padL}" y1="${gy.toFixed(1)}" x2="${W - padR}" y2="${gy.toFixed(1)}" class="chart-grid"/>
      <text x="${padL - 6}" y="${(gy + 3).toFixed(1)}" class="chart-axis" text-anchor="end">${Math.round(t * max)}</text>`;
  }).join("");

  const bars = data.map((d, i) => {
    const cx = padL + slot * i + slot / 2;
    const bh = (d.value / max) * innerH;
    const by = padT + innerH - bh;
    const color = d.color || "#34D399";
    const label = d.label.length > 9 ? d.label.slice(0, 8) + "…" : d.label;
    return `
      <rect x="${(cx - bw / 2).toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0, bh).toFixed(1)}" rx="6" fill="${color}" opacity="0.9"/>
      <text x="${cx.toFixed(1)}" y="${(by - 6).toFixed(1)}" class="chart-axis chart-axis--val" text-anchor="middle">${d.value}</text>
      <text x="${cx.toFixed(1)}" y="${H - 12}" class="chart-axis" text-anchor="middle">${escAttr(label)}</text>`;
  }).join("");

  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img">
    ${grid}${bars}
  </svg>`;
}

/**
 * Yığılmış (stacked) dikey çubuk grafik.
 * @param {{label:string, parts:{value:number, color:string}[]}[]} items
 */
export function stackedBarChart(items, opts = {}) {
  const data = Array.isArray(items) ? items : [];
  if (data.length === 0) return `<div class="chart-empty">Veri yok.</div>`;
  const W = 640;
  const H = opts.height || 210;
  const padL = 34, padR = 14, padT = 16, padB = 38;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const totals = data.map((d) => d.parts.reduce((a, p) => a + p.value, 0));
  const max = Math.max(1, ...totals);
  const slot = innerW / data.length;
  const bw = Math.min(52, slot * 0.62);

  const grid = [0, 0.5, 1].map((t) => {
    const gy = padT + innerH - t * innerH;
    return `<line x1="${padL}" y1="${gy.toFixed(1)}" x2="${W - padR}" y2="${gy.toFixed(1)}" class="chart-grid"/>
      <text x="${padL - 6}" y="${(gy + 3).toFixed(1)}" class="chart-axis" text-anchor="end">${Math.round(t * max)}</text>`;
  }).join("");

  const bars = data.map((d, i) => {
    const cx = padL + slot * i + slot / 2;
    let yCursor = padT + innerH;
    let rects = "";
    for (const p of d.parts) {
      if (p.value <= 0) continue;
      const h = (p.value / max) * innerH;
      yCursor -= h;
      rects += `<rect x="${(cx - bw / 2).toFixed(1)}" y="${yCursor.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" fill="${p.color}" opacity="0.92"/>`;
    }
    const label = d.label.length > 10 ? d.label.slice(0, 9) + "…" : d.label;
    return `${rects}
      <text x="${cx.toFixed(1)}" y="${(yCursor - 6).toFixed(1)}" class="chart-axis chart-axis--val" text-anchor="middle">${totals[i]}</text>
      <text x="${cx.toFixed(1)}" y="${H - 12}" class="chart-axis" text-anchor="middle">${escAttr(label)}</text>`;
  }).join("");

  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img">${grid}${bars}</svg>`;
}

/**
 * Yüzde halkası.
 * @param {number} pct 0-100
 */
export function donut(pct, opts = {}) {
  const size = opts.size || 132;
  const stroke = opts.stroke || 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, Number(pct) || 0));
  const dash = (p / 100) * c;
  const color = opts.color || "#8B5CF6";
  const gid = nextId();
  return `<svg class="donut" viewBox="0 0 ${size} ${size}" role="img" aria-label="%${p}">
    <defs>
      <linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${color}"/>
        <stop offset="1" stop-color="#F472B6"/>
      </linearGradient>
    </defs>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#F1F5F9" stroke-width="${stroke}"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="url(#${gid})" stroke-width="${stroke}"
      stroke-linecap="round" stroke-dasharray="${dash.toFixed(1)} ${(c - dash).toFixed(1)}"
      transform="rotate(-90 ${size / 2} ${size / 2})"/>
    <text x="${size / 2}" y="${size / 2 + 4}" text-anchor="middle" class="donut__label">${p}%</text>
  </svg>`;
}

/**
 * Aktivite ısı haritası (katkı grafiği).
 * @param {Record<string, {xp?:number}>} daily
 * @param {{weeks?:number}} [opts]
 */
export function heatmap(daily, opts = {}) {
  const weeks = opts.weeks || 16;
  const cell = 13, gap = 3;
  const today = new Date();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const dow = (today.getDay() + 6) % 7;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dow - (weeks - 1) * 7);

  const W = weeks * (cell + gap) + 24;
  const H = 7 * (cell + gap) + 14;

  const levels = ["#F1F5F9", "#DDD6FE", "#C4B5FD", "#A78BFA", "#8B5CF6"];
  function level(xp) {
    if (!xp) return 0;
    if (xp < 15) return 1;
    if (xp < 40) return 2;
    if (xp < 80) return 3;
    return 4;
  }

  let cells = "";
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const dt = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d);
      const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
      if (iso > todayISO) continue;
      const xp = (daily[iso] && daily[iso].xp) || 0;
      const l = level(xp);
      const cx = 20 + w * (cell + gap);
      const cy = 12 + d * (cell + gap);
      cells += `<rect x="${cx}" y="${cy}" width="${cell}" height="${cell}" rx="3" fill="${levels[l]}">
        <title>${iso}: ${xp} XP</title></rect>`;
    }
  }

  const dayLabels = ["Pzt", "", "Çar", "", "Cum", "", "Paz"].map((t, i) =>
    t ? `<text x="12" y="${12 + i * (cell + gap) + cell - 2}" class="chart-axis" text-anchor="end">${t}</text>` : ""
  ).join("");

  return `<div class="heatmap-wrap"><svg class="chart heatmap" viewBox="0 0 ${W} ${H}" role="img">${dayLabels}${cells}</svg>
    <div class="heatmap-legend"><span>Az</span>${levels.map((c) => `<i style="background:${c}"></i>`).join("")}<span>Çok</span></div></div>`;
}
