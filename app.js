/**
 * Christmas Lottery Tool (front-end only).
 *
 * @fileoverview Parses a newline-separated list, optionally dedupes, draws winners without repeats,
 * and renders a fun Christmas animation (ticker + confetti) with history.
 */

/**
 * @typedef {Object} AppState
 * @property {string[]} candidates All parsed candidates (after normalization + optional dedupe).
 * @property {Set<string>} winnerSet Winners for exclusion.
 * @property {{name: string, time: string}[]} winnerHistory Ordered winners (for copy/history).
 * @property {string|null} lastDrawText Last drawn string for copy.
 */

/** @type {AppState} */
const state = {
  candidates: [],
  winnerSet: new Set(),
  winnerHistory: [],
  lastDrawText: null,
};

const el = {
  inputList: /** @type {HTMLTextAreaElement} */ (document.getElementById("inputList")),
  dedupe: /** @type {HTMLInputElement} */ (document.getElementById("dedupe")),
  ignoreWinners: /** @type {HTMLInputElement} */ (document.getElementById("ignoreWinners")),
  stripAt: /** @type {HTMLInputElement} */ (document.getElementById("stripAt")),
  drawCount: /** @type {HTMLInputElement} */ (document.getElementById("drawCount")),
  btnDrawOne: /** @type {HTMLButtonElement} */ (document.getElementById("btnDrawOne")),
  btnDrawN: /** @type {HTMLButtonElement} */ (document.getElementById("btnDrawN")),
  btnShuffle: /** @type {HTMLButtonElement} */ (document.getElementById("btnShuffle")),
  btnClearWinners: /** @type {HTMLButtonElement} */ (document.getElementById("btnClearWinners")),
  btnResetAll: /** @type {HTMLButtonElement} */ (document.getElementById("btnResetAll")),
  btnCopyLast: /** @type {HTMLButtonElement} */ (document.getElementById("btnCopyLast")),
  btnCopyAll: /** @type {HTMLButtonElement} */ (document.getElementById("btnCopyAll")),
  winnerName: /** @type {HTMLElement} */ (document.getElementById("winnerName")),
  winnerSub: /** @type {HTMLElement} */ (document.getElementById("winnerSub")),
  stageStatus: /** @type {HTMLElement} */ (document.getElementById("stageStatus")),
  ticker: /** @type {HTMLElement} */ (document.getElementById("ticker")),
  historyList: /** @type {HTMLOListElement} */ (document.getElementById("historyList")),
  historyCount: /** @type {HTMLElement} */ (document.getElementById("historyCount")),
  statCandidates: /** @type {HTMLElement} */ (document.getElementById("statCandidates")),
  statWinners: /** @type {HTMLElement} */ (document.getElementById("statWinners")),
  statRemaining: /** @type {HTMLElement} */ (document.getElementById("statRemaining")),
  snow: /** @type {HTMLCanvasElement} */ (document.getElementById("snow")),
};

/**
 * Returns a normalized handle.
 *
 * Rules:
 * - trims spaces
 * - collapses internal spaces (rare but safe)
 * - removes leading '@' then adds it back (optional)
 *
 * @param {string} raw Raw line input.
 * @param {boolean} autoAt Whether to ensure it starts with '@'.
 * @returns {string|null} Normalized handle or null if empty.
 */
function normalizeHandle(raw, autoAt) {
  const cleaned = raw.trim().replace(/\s+/g, " ");
  if (!cleaned) return null;
  const noAt = cleaned.startsWith("@") ? cleaned.slice(1) : cleaned;
  if (!noAt) return null;
  return autoAt ? `@${noAt}` : cleaned;
}

/**
 * Parses textarea content into a list of candidates.
 *
 * @param {string} text Input textarea value.
 * @param {Object} opts Options.
 * @param {boolean} opts.dedupe Whether to dedupe.
 * @param {boolean} opts.autoAt Whether to ensure '@' prefix.
 * @returns {string[]} Candidate list.
 */
function parseCandidates(text, opts) {
  const lines = text.split(/\r?\n/);
  const out = [];
  const seen = new Set();
  for (const line of lines) {
    const normalized = normalizeHandle(line, opts.autoAt);
    if (!normalized) continue;
    if (opts.dedupe) {
      const key = normalized.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
    }
    out.push(normalized);
  }
  return out;
}

/**
 * Picks K unique random items from an array.
 *
 * @param {string[]} arr Source array.
 * @param {number} k Number of items to pick.
 * @returns {string[]} Picks.
 */
function sampleUnique(arr, k) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, k);
}

/**
 * Formats current time for history.
 *
 * @returns {string} Local time string.
 */
function timeTag() {
  const d = new Date();
  return d.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/**
 * Updates state candidates and UI stats.
 */
function refreshCandidates() {
  state.candidates = parseCandidates(el.inputList.value, {
    dedupe: el.dedupe.checked,
    autoAt: el.stripAt.checked,
  });
  renderStats();
}

/**
 * Returns remaining pool to draw from based on ignore winners toggle.
 *
 * @returns {string[]} Pool.
 */
function getPool() {
  if (!el.ignoreWinners.checked) return state.candidates.slice();
  return state.candidates.filter((c) => !state.winnerSet.has(c.toLowerCase()));
}

/**
 * Renders top stats.
 */
function renderStats() {
  const remaining = getPool().length;
  el.statCandidates.textContent = String(state.candidates.length);
  el.statWinners.textContent = String(state.winnerHistory.length);
  el.statRemaining.textContent = String(remaining);

  const canDraw = remaining > 0 && state.candidates.length > 0;
  el.btnDrawOne.disabled = !canDraw;
  el.btnDrawN.disabled = !canDraw;
  el.btnShuffle.disabled = state.candidates.length <= 1;
  el.btnCopyLast.disabled = !state.lastDrawText;
  el.btnCopyAll.disabled = state.winnerHistory.length === 0;
}

/**
 * Renders history list.
 */
function renderHistory() {
  el.historyList.innerHTML = "";
  for (let i = 0; i < state.winnerHistory.length; i++) {
    const w = state.winnerHistory[i];
    const li = document.createElement("li");
    li.className = "history-item";
    li.textContent = w.name;
    const span = document.createElement("span");
    span.className = "time";
    span.textContent = w.time;
    li.appendChild(span);
    el.historyList.appendChild(li);
  }
  el.historyCount.textContent = String(state.winnerHistory.length);
  renderStats();
}

/**
 * Sets stage UI text.
 *
 * @param {Object} p Params.
 * @param {string} p.status Stage status.
 * @param {string} p.name Winner name text.
 * @param {string} p.sub Subtitle.
 */
function setStage({ status, name, sub }) {
  el.stageStatus.textContent = status;
  el.winnerName.textContent = name;
  el.winnerSub.textContent = sub;
}

/**
 * Runs a ticker animation for a given pool.
 *
 * @param {string[]} pool Pool of candidates.
 * @param {number} durationMs Duration.
 * @returns {Promise<void>} Resolves when done.
 */
async function runTicker(pool, durationMs) {
  const start = performance.now();
  el.ticker.textContent = "";
  const minInterval = 32;
  const maxInterval = 120;

  while (true) {
    const t = performance.now() - start;
    if (t >= durationMs) break;
    const eased = Math.min(1, t / durationMs);
    const interval = minInterval + (maxInterval - minInterval) * eased * eased;
    const pick = pool[Math.floor(Math.random() * pool.length)] ?? "🎁";
    el.ticker.textContent = `🎄 ${pick}  ✨  ${pool[Math.floor(Math.random() * pool.length)] ?? pick}  ❄️  ${
      pool[Math.floor(Math.random() * pool.length)] ?? pick
    }`;
    // eslint-disable-next-line no-await-in-loop
    await sleep(interval);
  }
}

/**
 * Sleeps for given milliseconds.
 *
 * @param {number} ms Milliseconds.
 * @returns {Promise<void>} Promise.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Draws winners and updates stage/history.
 *
 * @param {number} count How many to draw.
 */
async function draw(count) {
  refreshCandidates();
  const pool = getPool();
  if (pool.length === 0) {
    setStage({ status: "沒有可抽的人了（或名單是空的）", name: "🎁", sub: "請貼上名單或取消「排除已中獎」" });
    return;
  }

  const k = Math.max(1, Math.min(count, pool.length));
  const plural = k === 1 ? "1 位" : `${k} 位`;

  setStage({ status: `抽獎中…（${plural}）`, name: "⏳", sub: "聖誕魔法加速中…" });
  lockButtons(true);
  await runTicker(pool, 1200 + Math.min(1800, pool.length * 10));

  const winners = sampleUnique(pool, k);
  const drawnAt = timeTag();
  for (const w of winners) {
    state.winnerSet.add(w.toLowerCase());
    state.winnerHistory.push({ name: w, time: drawnAt });
  }

  const winnerText = winners.join("\n");
  state.lastDrawText = winnerText;

  if (k === 1) {
    setStage({ status: "🎉 抽出得獎者！", name: winners[0], sub: "恭喜！Merry Christmas 🎄" });
  } else {
    setStage({ status: "🎉 抽出多名得獎者！", name: `🎁 x${k}`, sub: winners.join("、") });
  }

  popConfetti();
  renderHistory();
  lockButtons(false);
}

/**
 * Locks/unlocks buttons during animation.
 *
 * @param {boolean} locked Whether locked.
 */
function lockButtons(locked) {
  el.btnDrawOne.disabled = locked;
  el.btnDrawN.disabled = locked;
  el.btnShuffle.disabled = locked;
  el.btnClearWinners.disabled = locked;
  el.btnResetAll.disabled = locked;
  el.btnCopyLast.disabled = locked || !state.lastDrawText;
  el.btnCopyAll.disabled = locked || state.winnerHistory.length === 0;
}

/**
 * Copies text to clipboard (with fallback).
 *
 * @param {string} text Text to copy.
 */
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast("已複製到剪貼簿");
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    toast("已複製到剪貼簿（fallback）");
  }
}

let toastTimer = /** @type {number | null} */ (null);

/**
 * Shows a small toast message.
 *
 * @param {string} msg Message.
 */
function toast(msg) {
  let t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    t.style.position = "fixed";
    t.style.left = "50%";
    t.style.bottom = "18px";
    t.style.transform = "translateX(-50%)";
    t.style.zIndex = "50";
    t.style.padding = "10px 12px";
    t.style.borderRadius = "14px";
    t.style.color = "rgba(255,255,255,.92)";
    t.style.background = "rgba(0,0,0,.55)";
    t.style.border = "1px solid rgba(255,255,255,.16)";
    t.style.backdropFilter = "blur(10px)";
    t.style.fontSize = "12px";
    t.style.boxShadow = "0 16px 40px rgba(0,0,0,.45)";
    t.style.maxWidth = "90vw";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = "1";
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    t.style.opacity = "0";
  }, 1500);
}

/**
 * Runs a shuffle animation without drawing winners.
 */
async function shuffleOnly() {
  refreshCandidates();
  const pool = state.candidates.slice();
  if (pool.length <= 1) return;
  setStage({ status: "洗牌中…", name: "🌀", sub: "重新洗一下手氣" });
  lockButtons(true);
  await runTicker(pool, 900);
  setStage({ status: "洗牌完成", name: "✅", sub: "可以開始抽囉！" });
  lockButtons(false);
  renderStats();
}

/**
 * Clears winners but keeps input list.
 */
function clearWinners() {
  state.winnerSet.clear();
  state.winnerHistory = [];
  state.lastDrawText = null;
  el.ticker.textContent = "";
  setStage({ status: "已清空中獎", name: "🎁", sub: "名單保留，重新抽吧！" });
  renderHistory();
}

/**
 * Resets everything.
 */
function resetAll() {
  state.winnerSet.clear();
  state.winnerHistory = [];
  state.lastDrawText = null;
  el.inputList.value = "";
  el.ticker.textContent = "";
  setStage({ status: "等待開始…", name: "🎁", sub: "貼上名單後開始抽獎" });
  refreshCandidates();
  renderHistory();
}

/**
 * Creates confetti particles (simple DOM-based).
 */
function popConfetti() {
  const colors = ["#ff2a4f", "#23d18b", "#ffd166", "#67d5ff", "#ffffff"];
  const count = 120;
  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const p = document.createElement("span");
    const size = 6 + Math.random() * 8;
    p.style.position = "fixed";
    p.style.left = `${Math.random() * 100}vw`;
    p.style.top = `-20px`;
    p.style.width = `${size}px`;
    p.style.height = `${size * (0.7 + Math.random() * 1.1)}px`;
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    p.style.opacity = "0.95";
    p.style.borderRadius = Math.random() < 0.35 ? "999px" : "2px";
    p.style.zIndex = "40";
    p.style.pointerEvents = "none";
    p.style.filter = "drop-shadow(0 8px 10px rgba(0,0,0,.35))";

    const rot = (Math.random() * 360) | 0;
    const drift = (Math.random() * 2 - 1) * 25;
    const dur = 900 + Math.random() * 900;
    p.animate(
      [
        { transform: `translate(0,0) rotate(${rot}deg)`, opacity: 0.95 },
        { transform: `translate(${drift}vw, 105vh) rotate(${rot + 540}deg)`, opacity: 0.0 },
      ],
      { duration: dur, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" }
    );

    frag.appendChild(p);
    window.setTimeout(() => p.remove(), dur + 50);
  }
  document.body.appendChild(frag);
}

// --- Snow (canvas) ---

/**
 * @typedef {Object} SnowFlake
 * @property {number} x
 * @property {number} y
 * @property {number} r
 * @property {number} vy
 * @property {number} vx
 * @property {number} alpha
 */

/** @type {SnowFlake[]} */
let flakes = [];

/**
 * Resizes snow canvas and regenerates flakes.
 */
function setupSnow() {
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  el.snow.width = Math.floor(window.innerWidth * dpr);
  el.snow.height = Math.floor(window.innerHeight * dpr);
  el.snow.style.width = `${window.innerWidth}px`;
  el.snow.style.height = `${window.innerHeight}px`;
  const count = Math.floor(Math.min(220, Math.max(90, window.innerWidth / 6)));
  flakes = [];
  for (let i = 0; i < count; i++) {
    flakes.push({
      x: Math.random() * el.snow.width,
      y: Math.random() * el.snow.height,
      r: (1.2 + Math.random() * 2.8) * dpr,
      vy: (0.6 + Math.random() * 1.8) * dpr,
      vx: (-0.35 + Math.random() * 0.7) * dpr,
      alpha: 0.35 + Math.random() * 0.55,
    });
  }
}

/**
 * Animates falling snow.
 */
function tickSnow() {
  const ctx = el.snow.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, el.snow.width, el.snow.height);
  ctx.fillStyle = "rgba(255,255,255,.9)";
  for (const f of flakes) {
    f.y += f.vy;
    f.x += f.vx + Math.sin(f.y * 0.003) * 0.18;
    if (f.y - f.r > el.snow.height) {
      f.y = -f.r;
      f.x = Math.random() * el.snow.width;
    }
    if (f.x < -10) f.x = el.snow.width + 10;
    if (f.x > el.snow.width + 10) f.x = -10;
    ctx.globalAlpha = f.alpha;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  requestAnimationFrame(tickSnow);
}

// --- Wire up events ---

function init() {
  setupSnow();
  requestAnimationFrame(tickSnow);

  refreshCandidates();
  renderHistory();
  renderStats();

  el.inputList.addEventListener("input", () => {
    refreshCandidates();
  });
  el.dedupe.addEventListener("change", refreshCandidates);
  el.stripAt.addEventListener("change", refreshCandidates);
  el.ignoreWinners.addEventListener("change", renderStats);

  el.btnDrawOne.addEventListener("click", () => draw(1));
  el.btnDrawN.addEventListener("click", () => {
    const n = Number(el.drawCount.value);
    const safeInt = Number.isFinite(n) ? Math.max(1, Math.floor(n)) : 1;
    draw(safeInt);
  });
  el.btnShuffle.addEventListener("click", shuffleOnly);
  el.btnClearWinners.addEventListener("click", clearWinners);
  el.btnResetAll.addEventListener("click", resetAll);
  el.btnCopyLast.addEventListener("click", () => {
    if (state.lastDrawText) copyText(state.lastDrawText);
  });
  el.btnCopyAll.addEventListener("click", () => {
    if (state.winnerHistory.length) copyText(state.winnerHistory.map((x) => x.name).join("\n"));
  });

  window.addEventListener("resize", () => {
    setupSnow();
  });
}

document.addEventListener("DOMContentLoaded", init);


