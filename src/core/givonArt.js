/**
 * givonArt.js — שלב 8: הבמה בגבעון.
 *
 * בוקר בהיר בגבעון, עולם חלום זהוב של שלמה, עננים קפיציים, במות זהב נעות,
 * מגילות משלים, שועלים קטנים בכרם, ומזבח הנחושת הגדול שעשנו עולה ישר.
 * הכול בהיר ושמח בכוונה. המחשה, לא שחזור.
 */

import { circle, glow, text, hashNoise } from './art.js';
import { artTime } from './visualMotion.js';

export function drawGivonMorning(ctx, W, H, camX, camY, time) {
  const t = artTime(time);
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#6fb8ec'); sky.addColorStop(0.6, '#bfe3f6'); sky.addColorStop(1, '#fbe9c2');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  const sx = W * 0.8 - camX * 0.015;
  glow(ctx, sx, 90, 150, '#fff3c4', 0.6);
  circle(ctx, sx, 90, 36, '#fff6d6');
  puffyClouds(ctx, W, camX, t, 0.05, 60, 'rgba(255,255,255,0.9)');
  hill(ctx, W, H, camX, camY, 0.12, H * 0.6, '#9fc98a', 50);
  // גבעון: גבעה רחבה, אוהל מועד ומזבח שעשנו עולה ישר למעלה (דברי הימים ב׳ א׳)
  const gx = 4600 - camX * 0.16;
  if (gx > -300 && gx < W + 300) {
    const gy = H * 0.52 - camY * 0.1;
    ctx.fillStyle = '#86b874';
    ctx.beginPath(); ctx.ellipse(gx, gy + 40, 260, 70, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#e9dcc0'; ctx.fillRect(gx - 70, gy - 10, 90, 34);
    ctx.fillStyle = '#7a4f8f'; ctx.fillRect(gx - 70, gy - 22, 90, 14);
    ctx.fillStyle = '#b07a46'; ctx.fillRect(gx + 50, gy + 2, 34, 22);
    for (let i = 0; i < 6; i++) {
      const y = gy - 6 - i * 26 - (t * 18 % 26);
      ctx.fillStyle = `rgba(255,255,255,${0.55 - i * 0.08})`;
      circle(ctx, gx + 67 + Math.sin(i + t) * 2, y, 10 + i * 2, ctx.fillStyle);
    }
  }
  hill(ctx, W, H, camX, camY, 0.3, H * 0.72, '#7fb56a', 30);
}

export function drawDreamSky(ctx, W, H, camX, camY, time, alpha = 1) {
  if (alpha <= 0.01) return;
  const t = artTime(time);
  ctx.save();
  ctx.globalAlpha = alpha;
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#ffd8f0'); sky.addColorStop(0.5, '#ffe9b0'); sky.addColorStop(1, '#fff6dc');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  // כוכבי חלום מסתובבים
  for (let i = 0; i < 40; i++) {
    const x = ((hashNoise(i, 1) * 2000 - camX * 0.06) % W + W) % W;
    const y = 30 + hashNoise(i, 4) * H * 0.6 + Math.sin(t + i) * 6;
    const s = 3 + hashNoise(i, 6) * 4;
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.6 + i);
    ctx.fillStyle = i % 3 ? '#ffffff' : '#ffd36a';
    ctx.beginPath();
    for (let k = 0; k < 8; k++) { const r = k % 2 ? s * 0.35 : s; ctx.lineTo(Math.cos(k * Math.PI / 4) * r, Math.sin(k * Math.PI / 4) * r); }
    ctx.fill(); ctx.restore();
  }
  puffyClouds(ctx, W, camX, t, 0.1, 120, 'rgba(255,255,255,0.75)');
  puffyClouds(ctx, W, camX + 900, t, 0.25, 300, 'rgba(255,244,250,0.7)');
  text(ctx, 'חֲלוֹם', W / 2, 40, { size: 16, color: '#c48ab0', outline: null });
  ctx.restore();
}

function puffyClouds(ctx, W, camX, t, factor, y0, color) {
  for (let i = 0; i < 7; i++) {
    const span = W + 400;
    const x = ((i * 310 - camX * factor + t * 6) % span + span) % span - 200;
    const y = y0 + (i % 3) * 34;
    for (let k = 0; k < 4; k++) circle(ctx, x + k * 34, y - (k % 2) * 12, 26 + (k % 2) * 8, color);
  }
}

function hill(ctx, W, H, camX, camY, factor, baseY, color, amp) {
  const off = camX * factor;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W + 8; x += 8) {
    const wx = (x + off) * 0.004;
    ctx.lineTo(x, baseY - camY * factor - Math.sin(wx) * amp - Math.sin(wx * 2.1 + 1) * amp * 0.35);
  }
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
}

/** אריח ענן לרצפת החלום — רך ובהיר */
export function drawCloudTile(ctx, x, y, top, n) {
  ctx.fillStyle = '#fffaf2'; ctx.fillRect(x, y, 32, 32);
  ctx.fillStyle = '#f3e6f2'; ctx.fillRect(x, y + 24, 32, 8);
  if (top) {
    circle(ctx, x + 8, y + 4, 10, '#ffffff');
    circle(ctx, x + 22 + n * 4, y + 2, 12, '#ffffff');
  }
}

/** במה נעה: זהב לבמה, ענן מתכווץ לענן קפיצי */
export function drawMover(ctx, m, camX, camY, time) {
  const x = m.x - camX, y = m.y - camY;
  if (m.bounce) {
    const sq = (m.squash || 0);
    // Pink, outlined and gently pulsing, so a bouncy cloud never blends into the white floor.
    const pulse = 1 + Math.sin(artTime(time) * 4 + m.x) * 0.04;
    ctx.save(); ctx.translate(x + m.w / 2, y + 8); ctx.scale((1 + sq * 0.15) * pulse, (1 - sq * 0.35) * pulse);
    for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.arc(k * m.w / 6, -(k % 2 ? 2 : 6), 17, 0, Math.PI * 2); ctx.fillStyle = '#e266a8'; ctx.fill(); }
    for (let k = -2; k <= 2; k++) circle(ctx, k * m.w / 6, -(k % 2 ? 2 : 6), 15, '#ff9ccf');
    for (let k = -1; k <= 1; k++) circle(ctx, k * m.w / 6, -8, 6, '#ffd6ec');
    ctx.restore();
    text(ctx, '⇡', x + m.w / 2, y - 26 + Math.sin(artTime(time) * 5) * 3, { size: 20, color: '#d4499a', outline: null });
    return;
  }
  ctx.fillStyle = '#e7b94a'; ctx.fillRect(x, y, m.w, 12);
  ctx.fillStyle = '#fff1b0'; ctx.fillRect(x + 3, y + 2, m.w - 6, 3);
  ctx.fillStyle = '#b8862d'; ctx.fillRect(x, y + 12, m.w, 4);
  glow(ctx, x + m.w / 2, y + 6, m.w * 0.6, '#ffe69a', 0.25);
}

/** מגילת משל קטנה */
export function drawProverbScroll(ctx, x, y, size, t) {
  const cx = x + size / 2, cy = y + size / 2 + Math.sin(t * 3) * 3;
  glow(ctx, cx, cy, size * 1.4, '#ffe39a', 0.45);
  ctx.fillStyle = '#f6e7c3'; ctx.fillRect(cx - 9, cy - 7, 18, 14);
  ctx.fillStyle = '#b8873c'; ctx.fillRect(cx - 11, cy - 9, 4, 18); ctx.fillRect(cx + 7, cy - 9, 4, 18);
  ctx.fillStyle = '#9a7a52'; for (let i = 0; i < 3; i++) ctx.fillRect(cx - 5, cy - 3 + i * 3, 10, 1);
}

/** שועל קטן וחמוד; `caught` — יושב ומחייך לפני שהוא רץ הביתה */
export function drawFox(ctx, f, camX, camY, time) {
  const t = artTime(time);
  const x = f.x - camX, y = f.y - camY, dir = f.facing || 1;
  ctx.save();
  ctx.translate(x + f.w / 2, y + f.h);
  ctx.scale(dir, 1);
  ctx.globalAlpha = f.fade ?? 1;
  const run = f.caught ? 0 : Math.sin(t * 18) * 3;
  ctx.fillStyle = '#e07a2e';
  ctx.beginPath(); ctx.ellipse(0, -10, 14, 8, 0, 0, Math.PI * 2); ctx.fill();          // גוף
  ctx.beginPath(); ctx.ellipse(-16, -12 + run * 0.3, 10, 5, -0.4, 0, Math.PI * 2); ctx.fill(); // זנב
  ctx.fillStyle = '#fff4e4'; ctx.beginPath(); ctx.ellipse(-23, -15 + run * 0.3, 4, 3, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e07a2e'; circle(ctx, 13, -17, 7, '#e07a2e');                         // ראש
  ctx.beginPath(); ctx.moveTo(9, -22); ctx.lineTo(11, -30); ctx.lineTo(14, -22); ctx.fill();
  ctx.beginPath(); ctx.moveTo(14, -22); ctx.lineTo(17, -29); ctx.lineTo(18, -21); ctx.fill();
  circle(ctx, 20, -16, 2, '#3a2a20'); circle(ctx, 14, -18, 1.4, '#2a1a12');
  ctx.fillStyle = '#7a3f1a';
  for (const lx of [-8, 6]) ctx.fillRect(lx + run * (lx > 0 ? 1 : -1), -4, 3, 4);
  ctx.restore();
  if (f.caught && (f.fade ?? 1) > 0.5) text(ctx, '♥', x + f.w / 2, y - 18, { size: 16, color: '#ff8aa8', outline: null });
}

/** גפנים על מוטות — רקע לכרם */
export function drawVines(ctx, x0, x1, groundY, camX, camY) {
  for (let x = x0; x < x1; x += 96) {
    const sx = x - camX, gy = groundY - camY;
    if (sx < -60 || sx > 1020) continue;
    ctx.fillStyle = '#8a6a44'; ctx.fillRect(sx, gy - 70, 5, 70);
    for (let k = 0; k < 6; k++) circle(ctx, sx + 2 + Math.sin(k) * 18, gy - 64 + k * 6, 13, k % 2 ? '#6fae4f' : '#88c262');
    circle(ctx, sx + 12, gy - 40, 6, '#8a4fa0'); circle(ctx, sx - 8, gy - 34, 6, '#8a4fa0');
  }
}

/** מזבח הנחושת הגדול בגבעון — מקושט, בהיר, עם עשן לבן שעולה ישר */
export function drawBronzeAltar(ctx, x, groundY, camX, camY, time) {
  const t = artTime(time);
  const sx = x - camX, gy = groundY - camY;
  if (sx < -150 || sx > 1100) return;
  ctx.fillStyle = '#c98a4a'; ctx.fillRect(sx - 60, gy - 90, 120, 90);
  ctx.fillStyle = '#e8b06a'; ctx.fillRect(sx - 60, gy - 90, 120, 10);
  ctx.fillStyle = '#a86c34'; ctx.fillRect(sx - 60, gy - 45, 120, 6);
  for (const cx of [-60, 54]) ctx.fillRect(sx + cx, gy - 100, 6, 12);
  glow(ctx, sx, gy - 98, 60, '#ffb35a', 0.5);
  for (let i = 0; i < 8; i++) {
    const y = gy - 104 - i * 30 - (t * 22 % 30);
    circle(ctx, sx + Math.sin(i * 0.6 + t) * 3, y, 12 + i * 2.5, `rgba(255,255,255,${0.6 - i * 0.06})`);
  }
}
