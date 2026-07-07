/**
 * gen-icons.js  –  Shift Notes Premium (black/red)
 * Generates all PWA + Android launcher icons.
 * Run: node scripts/gen-icons.js
 */
'use strict';
const fs   = require('fs');
const path = require('path');

let createCanvas;
try { ({ createCanvas } = require('canvas')); } catch(_) { createCanvas = null; }

const PWA_SIZES      = [72, 96, 128, 144, 152, 192, 384, 512];
const ANDROID_DENSITIES = [
  { dir: 'mipmap-mdpi',    size: 48  },
  { dir: 'mipmap-hdpi',    size: 72  },
  { dir: 'mipmap-xhdpi',   size: 96  },
  { dir: 'mipmap-xxhdpi',  size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
];

/* ── Draw icon: black bg, red accent, gold chart line ─────── */
function drawIcon(canvas) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const r = w * 0.18;

  // Rounded rect bg
  ctx.beginPath();
  ctx.moveTo(r, 0); ctx.lineTo(w - r, 0);
  ctx.quadraticCurveTo(w, 0,   w,   r);
  ctx.lineTo(w, h - r);
  ctx.quadraticCurveTo(w,   h, w - r, h);
  ctx.lineTo(r, h);
  ctx.quadraticCurveTo(0,   h, 0, h - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0,   0, r,   0);
  ctx.closePath();

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#111111');
  bg.addColorStop(1, '#080808');
  ctx.fillStyle = bg;
  ctx.fill();

  // Subtle red glow at bottom
  const glow = ctx.createRadialGradient(w * 0.5, h * 0.95, 0, w * 0.5, h * 0.95, w * 0.6);
  glow.addColorStop(0,   'rgba(200,40,40,0.22)');
  glow.addColorStop(1,   'rgba(200,40,40,0)');
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.fillStyle = glow;
  ctx.fill();

  // Chart trend dots (gold)
  const pts = [
    [0.14, 0.65], [0.27, 0.55], [0.40, 0.70],
    [0.54, 0.42], [0.67, 0.36], [0.80, 0.46], [0.91, 0.28],
  ];

  // Line stroke
  ctx.beginPath();
  ctx.moveTo(pts[0][0] * w, pts[0][1] * h);
  pts.forEach(([x, y]) => ctx.lineTo(x * w, y * h));
  ctx.strokeStyle = '#c8943a';
  ctx.lineWidth   = w * 0.055;
  ctx.lineJoin    = 'round';
  ctx.lineCap     = 'round';
  ctx.stroke();

  // Dots
  pts.forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x * w, y * h, w * 0.034, 0, Math.PI * 2);
    ctx.fillStyle = '#f0f0f0';
    ctx.fill();
  });

  // Accent bar at top
  const barH = Math.max(4, w * 0.045);
  const barG = ctx.createLinearGradient(0, 0, w, 0);
  barG.addColorStop(0, '#c82828');
  barG.addColorStop(1, '#8b1a1a');
  ctx.fillStyle = barG;
  ctx.fillRect(0, 0, w, barH);

  // "SN" label
  ctx.fillStyle    = 'rgba(255,255,255,0.80)';
  ctx.font         = `bold ${Math.round(w * 0.16)}px Arial, sans-serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('SN', w / 2, h * 0.965);
}

/* ── Placeholder 1×1 transparent PNG ─────────────────────── */
function placeholder() {
  return Buffer.from(
    '89504e470d0a1a0a0000000d4948445200000001000000010806' +
    '000000 1f15c48900000009704859730000000000000000014f6ac' +
    '90000000a49444154789c6260000000020001e221bc33000000004' +
    '9454e44ae426082', 'hex'
  );
}

/* ── Write one icon file ───────────────────────────────────── */
function writeIcon(filePath, size) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (createCanvas) {
    const c = createCanvas(size, size);
    drawIcon(c);
    fs.writeFileSync(filePath, c.toBuffer('image/png'));
    console.log(`✓  ${size}×${size}  →  ${filePath}`);
  } else {
    fs.writeFileSync(filePath, placeholder());
    console.log(`⚠  placeholder  →  ${filePath}  (npm install canvas for real icons)`);
  }
}

/* ── PWA icons ────────────────────────────────────────────── */
const pwaDir = path.join(__dirname, '..', 'www', 'icons');
PWA_SIZES.forEach(s => writeIcon(path.join(pwaDir, `icon-${s}.png`), s));

/* ── Android launcher icons ───────────────────────────────── */
const resBase = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
ANDROID_DENSITIES.forEach(({ dir, size }) => {
  writeIcon(path.join(resBase, dir, 'ic_launcher.png'),       size);
  writeIcon(path.join(resBase, dir, 'ic_launcher_round.png'), size);
});

console.log('\n🎉  Icon generation complete!');
