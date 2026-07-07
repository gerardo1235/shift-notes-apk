'use strict';
/* ═══════════════════════════════════════════════════════════
   Shift Notes – App Logic  (premium dark build)
   ═══════════════════════════════════════════════════════════ */

const STORAGE_KEY  = 'shiftnotes_v2_entries';
const SHIFT_START  = 'shiftnotes_v2_start';

// ── State ─────────────────────────────────────────────────
let entries        = [];
let pendingAction  = null;   // { type: 'delete'|'clear', idx? }
let toastTimer     = null;
let shiftStartTime = null;

// ── DOM ───────────────────────────────────────────────────
const qs  = id => document.getElementById(id);
const timeInput    = qs('timeInput');
const rateInput    = qs('rateInput');
const eventInput   = qs('eventInput');
const addBtn       = qs('addBtn');
const nowBtn       = qs('nowBtn');
const logBody      = qs('logBody');
const tableWrap    = qs('tableWrap');
const emptyState   = qs('emptyState');
const currentRateEl= qs('currentRate');
const avgRateEl    = qs('avgRate');
const entryCountEl = qs('entryCount');
const exportBtn    = qs('exportBtn');
const clearBtn     = qs('clearBtn');
const shiftDateEl  = qs('shiftDate');
const offlinePill  = qs('offlinePill');
const shiftDuration= qs('shiftDuration');
const chartSection = qs('chartSection');
const rateCanvas   = qs('rateChart');
const chartRange   = qs('chartRange');
const logMeta      = qs('logMeta');
const modalBackdrop= qs('modalBackdrop');
const modalMsg     = qs('modalMsg');
const modalCancel  = qs('modalCancel');
const modalConfirm = qs('modalConfirm');
const toastEl      = qs('toast');
const topbarProg   = qs('topbarProgress');

// ── Init ──────────────────────────────────────────────────
function init() {
  loadState();
  stampDate();
  setNowTime();
  renderAll();
  bindEvents();
  updateOnlineStatus();
  startDurationTimer();
  registerSW();
}

// ── Service Worker ────────────────────────────────────────
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(r => console.log('[SW] registered', r.scope))
      .catch(e => console.warn('[SW] failed', e));
  }
}

// ── Persistence ───────────────────────────────────────────
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    entries = raw ? JSON.parse(raw) : [];
  } catch { entries = []; }

  const startRaw = localStorage.getItem(SHIFT_START);
  if (startRaw) {
    shiftStartTime = new Date(startRaw);
  } else if (entries.length > 0) {
    shiftStartTime = new Date();
    localStorage.setItem(SHIFT_START, shiftStartTime.toISOString());
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    if (!shiftStartTime && entries.length === 1) {
      shiftStartTime = new Date();
      localStorage.setItem(SHIFT_START, shiftStartTime.toISOString());
    }
  } catch { showToast('⚠ Storage full'); }
}

// ── Date / Time helpers ───────────────────────────────────
function stampDate() {
  shiftDateEl.textContent = new Date().toLocaleDateString('en-US', {
    weekday:'short', month:'short', day:'numeric'
  });
}

function setNowTime() {
  const d = new Date();
  timeInput.value = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function startDurationTimer() {
  updateDuration();
  setInterval(updateDuration, 60_000);
}

function updateDuration() {
  if (!shiftStartTime || entries.length === 0) {
    shiftDuration.textContent = '';
    return;
  }
  const ms  = Date.now() - shiftStartTime.getTime();
  const h   = Math.floor(ms / 3_600_000);
  const m   = Math.floor((ms % 3_600_000) / 60_000);
  shiftDuration.textContent = h > 0
    ? `${h}h ${m}m elapsed`
    : `${m}m elapsed`;
}

// ── Render ────────────────────────────────────────────────
function renderAll() {
  renderTable();
  renderBanner();
  renderChart();
  renderProgress();
}

// Render log table
function renderTable() {
  const has = entries.length > 0;
  emptyState.style.display = has ? 'none' : 'flex';
  tableWrap.classList.toggle('hidden', !has);
  if (!has) { logMeta.textContent = ''; return; }

  logMeta.textContent = `${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}`;

  logBody.innerHTML = '';
  entries.forEach((e, idx) => {
    const tr   = document.createElement('tr');
    const rate = parseFloat(e.rate);
    let rc = 'rate-none';
    if (!isNaN(rate)) {
      if      (rate >= 1000) rc = 'rate-high';
      else if (rate >= 700)  rc = 'rate-mid';
      else                   rc = 'rate-low';
    }
    const rateDisplay = isNaN(rate)
      ? '—'
      : rate.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 });

    tr.innerHTML = `
      <td class="col-time">${escHtml(e.time || '—')}</td>
      <td class="col-rate ${rc}">${rateDisplay}</td>
      <td class="col-event">${escHtml(e.event || '')}</td>
      <td>
        <button class="row-del" data-idx="${idx}" aria-label="Delete entry">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </td>`;
    logBody.appendChild(tr);
  });
}

// Render KPI banner
function renderBanner() {
  const rates = entries
    .map(e => parseFloat(e.rate))
    .filter(r => !isNaN(r));

  if (rates.length === 0) {
    currentRateEl.textContent = '—';
    avgRateEl.textContent     = '—';
  } else {
    const last = rates[rates.length - 1];
    const avg  = rates.reduce((a, b) => a + b, 0) / rates.length;
    currentRateEl.textContent = fmt(last);
    avgRateEl.textContent     = fmt(avg);

    // Colour current rate by threshold
    currentRateEl.style.color = last >= 1000
      ? 'var(--success)'
      : last >= 700
        ? 'var(--gold)'
        : 'var(--accent)';
  }
  entryCountEl.textContent = entries.length;
}

// Render canvas chart
function renderChart() {
  const pts = entries.filter(e => e.rate != null && e.rate !== '');
  if (pts.length < 2) { chartSection.style.display = 'none'; return; }
  chartSection.style.display = 'block';

  const labels = pts.map(e => e.time || '');
  const values = pts.map(e => parseFloat(e.rate));

  if (labels.length >= 2) {
    chartRange.textContent = `${labels[0]} – ${labels[labels.length - 1]}`;
  }

  drawChart(rateCanvas, labels, values);
}

// Render topbar progress fill
function renderProgress() {
  const target = 1200; // t/h design max
  const rates  = entries.map(e => parseFloat(e.rate)).filter(r => !isNaN(r));
  if (rates.length === 0) {
    topbarProg.classList.remove('has-entries');
    return;
  }
  const last  = rates[rates.length - 1];
  const fill  = Math.min(last / target, 1).toFixed(3);
  topbarProg.style.setProperty('--fill', fill);
  topbarProg.classList.add('has-entries');
}

// ── Canvas Chart ──────────────────────────────────────────
function drawChart(canvas, labels, data) {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const W   = canvas.parentElement.clientWidth || 340;
  const H   = Math.min(Math.round(W * 0.30), 140);
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';

  const ctx  = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const pad  = { top: 12, right: 12, bottom: 22, left: 48 };
  const w    = W - pad.left - pad.right;
  const h    = H - pad.top  - pad.bottom;
  const minV = Math.min(...data) * 0.92;
  const maxV = Math.max(...data) * 1.05;
  const toX  = i => pad.left + (i / (data.length - 1)) * w;
  const toY  = v => pad.top  + h - ((v - minV) / (maxV - minV)) * h;

  // Grid
  const gridColor = 'rgba(255,255,255,0.06)';
  ctx.strokeStyle = gridColor;
  ctx.lineWidth   = 1;
  [0, 0.25, 0.5, 0.75, 1].forEach(t => {
    const y = pad.top + t * h;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + w, y); ctx.stroke();
    const val = maxV - t * (maxV - minV);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = `${Math.round(9 * dpr) / dpr}px system-ui`;
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(val).toLocaleString(), pad.left - 6, y + 3.5);
  });

  // Fill gradient
  const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + h);
  grad.addColorStop(0,   'rgba(200,40,40,0.25)');
  grad.addColorStop(0.6, 'rgba(200,40,40,0.06)');
  grad.addColorStop(1,   'rgba(200,40,40,0.00)');

  ctx.beginPath();
  ctx.moveTo(toX(0), toY(data[0]));
  for (let i = 1; i < data.length; i++) ctx.lineTo(toX(i), toY(data[i]));
  ctx.lineTo(toX(data.length - 1), pad.top + h);
  ctx.lineTo(toX(0), pad.top + h);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.moveTo(toX(0), toY(data[0]));
  for (let i = 1; i < data.length; i++) ctx.lineTo(toX(i), toY(data[i]));
  ctx.strokeStyle = '#c82828';
  ctx.lineWidth   = 2;
  ctx.lineJoin    = 'round';
  ctx.lineCap     = 'round';
  ctx.stroke();

  // Dots + labels
  data.forEach((v, i) => {
    const x = toX(i), y = toY(v);
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle   = '#c82828';
    ctx.fill();
    ctx.strokeStyle = '#080808';
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    const showLabel = i === 0 || i === data.length - 1
      || data.length <= 7
      || i % Math.ceil(data.length / 5) === 0;

    if (showLabel && labels[i]) {
      ctx.fillStyle   = 'rgba(255,255,255,0.35)';
      ctx.font        = `${Math.round(8 * dpr) / dpr}px system-ui`;
      ctx.textAlign   = 'center';
      ctx.fillText(labels[i], x, H - pad.bottom + 14);
    }
  });
}

// ── Events ────────────────────────────────────────────────
function bindEvents() {
  addBtn.addEventListener('click', addEntry);
  nowBtn.addEventListener('click', setNowTime);
  eventInput.addEventListener('keydown', e => { if (e.key === 'Enter') addEntry(); });

  document.getElementById('quickTags').addEventListener('click', e => {
    const btn = e.target.closest('.qtag');
    if (!btn) return;
    const tag = btn.dataset.tag;
    eventInput.value = eventInput.value.trim()
      ? `${eventInput.value.trim()}; ${tag}`
      : tag;
    eventInput.focus();
  });

  logBody.addEventListener('click', e => {
    const btn = e.target.closest('.row-del');
    if (!btn) return;
    const idx = parseInt(btn.dataset.idx, 10);
    pendingAction = { type: 'delete', idx };
    openModal(`Delete the entry at ${entries[idx]?.time || '—'}?`);
  });

  exportBtn.addEventListener('click', exportCSV);

  clearBtn.addEventListener('click', () => {
    if (entries.length === 0) { showToast('Nothing to clear'); return; }
    pendingAction = { type: 'clear' };
    openModal(`Clear all ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} for this shift?`);
  });

  modalCancel.addEventListener('click',  closeModal);
  modalBackdrop.addEventListener('click', e => { if (e.target === modalBackdrop) closeModal(); });
  modalConfirm.addEventListener('click', confirmAction);

  window.addEventListener('online',  updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  window.addEventListener('resize',  debounce(renderChart, 200));
}

// ── Add entry ─────────────────────────────────────────────
function addEntry() {
  const time  = timeInput.value.trim();
  const rate  = rateInput.value.trim();
  const event = eventInput.value.trim();

  if (!time && !rate && !event) {
    showToast('Enter at least one value');
    timeInput.focus();
    return;
  }

  entries.push({ time, rate: rate || null, event, ts: Date.now() });
  entries.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  save();
  renderAll();

  rateInput.value  = '';
  eventInput.value = '';
  setNowTime();
  showToast('Entry logged ✓');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Confirm / clear ───────────────────────────────────────
function confirmAction() {
  closeModal();
  if (!pendingAction) return;

  if (pendingAction.type === 'clear') {
    entries = [];
    shiftStartTime = null;
    localStorage.removeItem(SHIFT_START);
    showToast('Shift cleared');
  } else if (pendingAction.type === 'delete') {
    entries.splice(pendingAction.idx, 1);
    showToast('Entry deleted');
  }

  pendingAction = null;
  save();
  renderAll();
  updateDuration();
}

// ── CSV Export ────────────────────────────────────────────
function exportCSV() {
  if (entries.length === 0) { showToast('No entries to export'); return; }
  const rows = [['Time', 'Rate', 'Event']];
  entries.forEach(e => rows.push([
    e.time  || '',
    e.rate  || '',
    `"${(e.event || '').replace(/"/g, '""')}"`
  ]));
  const csv  = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), {
    href: url,
    download: `shift_${datestamp()}.csv`
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('CSV exported ✓');
}

// ── Modal ─────────────────────────────────────────────────
function openModal(msg) {
  modalMsg.textContent = msg;
  modalBackdrop.classList.add('open');
  modalConfirm.focus();
}
function closeModal() {
  modalBackdrop.classList.remove('open');
  pendingAction = null;
}

// ── Toast ─────────────────────────────────────────────────
function showToast(msg) {
  clearTimeout(toastTimer);
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
}

// ── Online/offline ────────────────────────────────────────
function updateOnlineStatus() {
  offlinePill.classList.toggle('hidden', navigator.onLine);
}

// ── Utils ─────────────────────────────────────────────────
function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function pad2(n)   { return String(n).padStart(2, '0'); }
function fmt(n)    { return n.toLocaleString('en-US', { maximumFractionDigits: 1 }); }
function datestamp() {
  const d = new Date();
  return `${d.getFullYear()}${pad2(d.getMonth()+1)}${pad2(d.getDate())}_${pad2(d.getHours())}${pad2(d.getMinutes())}`;
}
function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

// ── Boot ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
