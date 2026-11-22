/* =========================================================
   ui.js — ortak DOM yardımcıları, toast ve modal
   ========================================================= */

/** @param {string} sel @param {ParentNode} [root] */
export const $ = (sel, root = document) => /** @type {HTMLElement} */ (root.querySelector(sel));
/** @param {string} sel @param {ParentNode} [root] */
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** HTML kaçış (XSS önleme). */
export function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ------------------------- Toast ------------------------- */

let toastTimer = 0;

/**
 * @param {string} message
 * @param {'info'|'success'|'error'} [type]
 */
export function toast(message, type = "info") {
  const el = $("#toast");
  if (!el) return;
  el.textContent = message;
  el.className = "toast" + (type === "error" ? " is-error" : type === "success" ? " is-success" : "");
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { el.hidden = true; }, 2600);
}

/* ------------------------- Modal ------------------------- */

let modalResolve = null;
let modalOnConfirm = null;

/**
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} opts.bodyHTML
 * @param {string} [opts.confirmText]
 * @param {string} [opts.cancelText]
 * @param {boolean} [opts.danger]
 * @param {boolean} [opts.hideCancel]
 * @param {() => boolean} [opts.onConfirm] false dönerse modal açık kalır
 * @returns {Promise<boolean>}
 */
export function openModal(opts) {
  const modal = $("#modal");
  const title = $("#modalTitle");
  const body = $("#modalBody");
  const foot = $("#modalFoot");
  if (!modal || !title || !body || !foot) return Promise.resolve(false);

  title.textContent = opts.title || "";
  body.innerHTML = opts.bodyHTML || "";
  modalOnConfirm = opts.onConfirm || null;

  foot.innerHTML = "";
  if (!opts.hideCancel) {
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "btn";
    cancel.textContent = opts.cancelText || "Vazgeç";
    cancel.addEventListener("click", () => closeModal(false));
    foot.appendChild(cancel);
  }

  const confirm = document.createElement("button");
  confirm.type = "button";
  confirm.className = "btn " + (opts.danger ? "btn--danger" : "btn--primary");
  confirm.textContent = opts.confirmText || "Onayla";
  confirm.addEventListener("click", () => {
    if (modalOnConfirm && modalOnConfirm() === false) return;
    closeModal(true, true);
  });

  foot.appendChild(confirm);
  modal.hidden = false;

  const firstInput = /** @type {HTMLElement|null} */ (body.querySelector("input, select, textarea"));
  if (firstInput) setTimeout(() => firstInput.focus(), 40);

  return new Promise((resolve) => { modalResolve = resolve; });
}

/** Modal içeriğini (form alanları) okumak için. */
export function modalBody() { return $("#modalBody"); }

export function closeModal(result = false, fromConfirm = false) {
  const modal = $("#modal");
  if (modal) modal.hidden = true;
  if (modalResolve) {
    modalResolve(fromConfirm ? true : result);
    modalResolve = null;
  }
}

export function initModal() {
  const modal = $("#modal");
  if (!modal) return;
  modal.addEventListener("click", (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    if (target.dataset.close === "true") closeModal(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) closeModal(false);
  });
}

/**
 * Basit onay penceresi.
 * @param {string} title @param {string} message @param {boolean} [danger]
 */
export function confirmDialog(title, message, danger = false) {
  return openModal({
    title,
    bodyHTML: `<p>${esc(message)}</p>`,
    confirmText: "Evet",
    cancelText: "Vazgeç",
    danger
  });
}

/* ------------------------- Select doldurma ------------------------- */

/**
 * @param {HTMLSelectElement} select
 * @param {string[]} options
 * @param {{empty?: string, selected?: string, keepValue?: boolean}} [opts]
 */
export function fillSelect(select, options, opts = {}) {
  const current = opts.keepValue ? select.value : opts.selected ?? select.value;
  select.innerHTML = "";
  if (typeof opts.empty === "string") {
    const o = document.createElement("option");
    o.value = "";
    o.textContent = opts.empty;
    select.appendChild(o);
  }
  for (const opt of options) {
    const o = document.createElement("option");
    o.value = opt;
    o.textContent = opt;
    select.appendChild(o);
  }
  if (current && options.includes(current)) select.value = current;
}

/** Basit debounce. */
export function debounce(fn, ms = 200) {
  let t = 0;
  return (...args) => {
    clearTimeout(t);
    t = window.setTimeout(() => fn(...args), ms);
  };
}
