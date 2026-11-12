/**
 * lebanonArt.js — שלב 9: ארזי הלבנון.
 *
 * ארבעה אזורים בהירים: יער ארזים מושלג, ים יפו עם רפסודות, מחצבה לבנה ומוצפת
 * שמש, והר המוריה עם פיגומים. ארזים, רפסודות, אבנים סדוקות, קורות, אבני גזית,
 * עורבים, סרטנים, שחפים ודגים קופצים. המחשה, לא שחזור.
 */

import { circle, glow, text, hashNoise } from './art.js';
import { artTime } from './visualMotion.js';

/** גבולות האזורים, בעמודות */
export const ZONES = { forest: [0, 88], sea: [89, 170], quarry: [171, 250], moriah: [251, 299] };
const zoneOf = col => col <= ZONES.forest[1] ? 'forest' : col <= ZONES.sea[1] ? 'sea' : col <= ZONES.quarry[1] ? 'quarry' : 'moriah';

export function drawLebanonBackdrop(ctx, W, H, camX, camY, time) {
  const t = artTime(time);
  const mid = (camX + W / 2) / 32;
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#5fb0ea'); sky.addColorStop(0.65, '#bfe6fb'); sky.addColorStop(1, '#f2f8fb');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  glow(ctx, W * 0.82 - camX * 0.01, 80, 130, '#fff6cf', 0.55);
  circle(ctx, W * 0.82 - camX * 0.01, 80, 32, '#fff8de');
  // ענני נוצה
  for (let i = 0; i < 6; i++) {
    const x = ((i * 290 - camX * 0.04 + t * 5) % (W + 300) + W + 300) % (W + 300) - 150;
    for (let k = 0; k < 4; k++) circle(ctx, x + k * 30, 70 + (i % 3) * 30 - (k % 2) * 10, 22, 'rgba(255,255,255,0.9)');
  }
  // הרי הלבנון המושלגים — נראים בעיקר בתחילת השלב
  const snowAlpha = Math.max(0, Math.min(1, (110 - mid) / 30));
  if (snowAlpha > 0) {
    ctx.save(); ctx.globalAlpha = snowAlpha;
    for (let i = 0; i < 6; i++) {
      const x = i * 260 - camX * 0.08 - 100, base = H * 0.64 - camY * 0.08;
      ctx.fillStyle = '#8fa9c4';
      ctx.beginPath(); ctx.moveTo(x - 160, base); ctx.lineTo(x, base - 190 - (i % 2) * 40); ctx.lineTo(x + 160, base); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(x - 46, base - 135 - (i % 2) * 28); ctx.lineTo(x, base - 190 - (i % 2) * 40);
      ctx.lineTo(x + 46, base - 135 - (i % 2) * 28); ctx.lineTo(x + 20, base - 120 - (i % 2) * 28); ctx.lineTo(x, base - 132 - (i % 2) * 28); ctx.lineTo(x - 22, base - 118 - (i % 2) * 28); ctx.fill();
    }
    ctx.restore();
  }
  // ים יפו באופק, ספינות של חירם
  const seaAlpha = Math.max(0, Math.min(1, (mid - 75) / 20, (200 - mid) / 25));
  if (seaAlpha > 0) {
    ctx.save(); ctx.globalAlpha = seaAlpha;
    ctx.fillStyle = '#4fa6d6'; ctx.fillRect(0, H * 0.55 - camY * 0.05, W, H);
    for (let i = 0; i < 3; i++) {
      const sx = ((i * 420 - camX * 0.12 + t * 12) % (W + 300) + W + 300) % (W + 300) - 150, sy = H * 0.55 - camY * 0.05;
      ctx.fillStyle = '#8a5a34'; ctx.beginPath(); ctx.moveTo(sx - 30, sy - 4); ctx.lineTo(sx + 30, sy - 4); ctx.lineTo(sx + 22, sy + 6); ctx.lineTo(sx - 22, sy + 6); ctx.fill();
      ctx.fillStyle = '#f4ead2'; ctx.beginPath(); ctx.moveTo(sx, sy - 46); ctx.lineTo(sx + 24, sy - 8); ctx.lineTo(sx, sy - 8); ctx.fill();
      ctx.fillStyle = '#6a3a7a'; ctx.fillRect(sx - 1, sy - 48, 2, 44);
    }
    ctx.restore();
  }
  // גבעות ירוקות־חומות (ירושלים והמחצבה)
  const hillColor = mid < 170 ? '#7fbf73' : '#c8b48a';
  ctx.save();
  ctx.globalAlpha = 1 - seaAlpha;   // no green hill rising out of the open sea
  ctx.fillStyle = hillColor;
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W + 8; x += 8) {
    const wx = (x + camX * 0.25) * 0.005;
    ctx.lineTo(x, H * 0.74 - camY * 0.2 - Math.sin(wx) * 28 - Math.sin(wx * 2.4) * 10);
  }
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  ctx.restore();
  // שחפים
  for (let i = 0; i < 4; i++) {
    const x = ((i * 233 + t * 40) % (W + 100)) - 50, y = 120 + i * 22 + Math.sin(t * 2 + i) * 8;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.quadraticCurveTo(x - 4, y - 5 - Math.sin(t * 8 + i) * 2, x, y); ctx.quadraticCurveTo(x + 4, y - 5 - Math.sin(t * 8 + i) * 2, x + 8, y); ctx.stroke();
  }
}

/** ארז גדול: גזע אדמדם ושכבות ענפים אופקיות, עם שלג על הקצוות */
export function drawCedar(ctx, x, groundY, camX, camY, size = 1) {
  const sx = x - camX, gy = groundY - camY;
  if (sx < -200 || sx > 1160) return;
  ctx.fillStyle = '#8a5434'; ctx.fillRect(sx - 8 * size, gy - 150 * size, 16 * size, 150 * size);
  for (let k = 0; k < 5; k++) {
    const y = gy - 60 * size - k * 26 * size, half = (110 - k * 16) * size;
    ctx.fillStyle = k % 2 ? '#2f7a4c' : '#3a8f58';
    ctx.beginPath(); ctx.moveTo(sx - half, y); ctx.quadraticCurveTo(sx, y - 34 * size, sx + half, y); ctx.quadraticCurveTo(sx, y + 12 * size, sx - half, y); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.ellipse(sx - half * 0.55, y - 6 * size, half * 0.3, 4 * size, 0, 0, Math.PI * 2); ctx.fill();
  }
}

/** צייר אריחים לפי אזור: אדמה מושלגת, חול חוף, אבן גיר לבנה, אבן ירושלמית; 'C' אבן סדוקה. */
export function lebanonTilePainter(ctx, ch, x, y, col, row, layer, map) {
  if (ch !== '#' && ch !== 'C') return false;
  const n = hashNoise(col, row), top = !map.isSolid(col, row - 1);
  if (ch === 'C') {
    ctx.fillStyle = '#efe6d2'; ctx.fillRect(x, y, 32, 32);
    ctx.strokeStyle = '#a89a7a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + 6, y + 4); ctx.lineTo(x + 15, y + 15); ctx.lineTo(x + 10, y + 22); ctx.lineTo(x + 20, y + 29);
    ctx.moveTo(x + 15, y + 15); ctx.lineTo(x + 27, y + 11); ctx.stroke();
    ctx.strokeStyle = '#c9b88e'; ctx.lineWidth = 1; ctx.strokeRect(x + 1, y + 1, 30, 30);
    return true;
  }
  const z = zoneOf(col);
  if (z === 'forest') {
    ctx.fillStyle = n > 0.5 ? '#8a6a4a' : '#7d5f42'; ctx.fillRect(x, y, 32, 32);
    if (top) { ctx.fillStyle = '#5fae55'; ctx.fillRect(x, y, 32, 7); ctx.fillStyle = '#ffffff'; ctx.fillRect(x + n * 10, y, 14, 3); }
  } else if (z === 'sea') {
    ctx.fillStyle = n > 0.5 ? '#e9d4a2' : '#e2cb96'; ctx.fillRect(x, y, 32, 32);
    if (top) { ctx.fillStyle = '#f4e3b8'; ctx.fillRect(x, y, 32, 4); }
  } else if (z === 'quarry') {
    ctx.fillStyle = n > 0.5 ? '#f3ecdc' : '#ebe2cc'; ctx.fillRect(x, y, 32, 32);
    ctx.strokeStyle = '#d6c9a8'; ctx.lineWidth = 1; ctx.strokeRect(x + (row % 2) * 8, y + 1, 30, 30);
  } else {
    ctx.fillStyle = n > 0.5 ? '#e8d3a6' : '#dcc699'; ctx.fillRect(x, y, 32, 32);
    ctx.strokeStyle = '#c4ab78'; ctx.lineWidth = 1; ctx.strokeRect(x + (row % 2) * 16, y + 1, 30, 14); ctx.strokeRect(x, y + 16, 30, 14);
    if (top) { ctx.fillStyle = '#f4e6c4'; ctx.fillRect(x, y, 32, 3); }
  }
  return true;
}

/** הים: גלים בהירים מעל קו המים, ושקיפות כחולה מתחתיו. מצויר מעל הכול. */
export function drawSea(ctx, sea, W, H, camX, camY, time) {
  const t = artTime(time);
  const x0 = Math.max(0, sea.x0 - camX), x1 = Math.min(W, sea.x1 - camX);
  if (x1 <= x0) return;
  const y = sea.y - camY, clay = sea.style === 'clay';
  const g = ctx.createLinearGradient(0, y, 0, H);
  g.addColorStop(0, clay ? 'rgba(196,132,86,0.95)' : 'rgba(70,170,220,0.85)');
  g.addColorStop(1, clay ? 'rgba(150,92,56,1)' : 'rgba(30,110,170,0.95)');
  ctx.fillStyle = g; ctx.fillRect(x0, y, x1 - x0, H - y);
  if (clay) {   // bubbling clay, no fish
    for (let i = 0; i < 8; i++) {
      const bx = x0 + ((i * 97 + t * 20) % Math.max(1, x1 - x0)), by = y + 8 + (i % 3) * 10;
      circle(ctx, bx, by, 3 + Math.sin(t * 3 + i) * 1.5, 'rgba(230,180,130,0.8)');
    }
    return;
  }
  ctx.strokeStyle = '#e8f8ff'; ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = x0; x <= x1; x += 8) {
    const yy = y + Math.sin((x + camX) * 0.05 + t * 2.5) * 4;
    if (x === x0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
  }
  ctx.stroke();
  // דג קופץ מדי פעם
  for (let i = 0; i < 3; i++) {
    const phase = (t * 0.5 + i * 0.37) % 1;
    if (phase > 0.25) continue;
    const fx = sea.x0 + ((i * 977) % (sea.x1 - sea.x0)) - camX, k = phase / 0.25;
    if (fx < x0 || fx > x1) continue;
    const fy = y - Math.sin(k * Math.PI) * 60;
    ctx.save(); ctx.translate(fx + k * 50, fy); ctx.rotate(-0.8 + k * 1.6);
    ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.ellipse(0, 0, 10, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-16, -5); ctx.lineTo(-16, 5); ctx.fill();
    ctx.restore();
  }
}

/** רפסודה: קורות ארז קשורות */
export function drawRaft(ctx, m, camX, camY) {
  const x = m.x - camX, y = m.y - camY;
  for (let i = 0; i < Math.round(m.w / 16); i++) {
    ctx.fillStyle = i % 2 ? '#a0663c' : '#b47548';
    ctx.beginPath(); ctx.ellipse(x + 8 + i * 16, y + 7, 8, 8, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#c7a26a'; ctx.fillRect(x + 4, y + 2, m.w - 8, 3); ctx.fillRect(x + 4, y + 9, m.w - 8, 3);
}

export function drawCedarBeam(ctx, x, y, size, t) {
  const cx = x + size / 2, cy = y + size / 2 + Math.sin(t * 3) * 2;
  glow(ctx, cx, cy, size * 1.3, '#ffe0a0', 0.35);
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.25);
  ctx.fillStyle = '#a3633a'; ctx.fillRect(-14, -5, 28, 10);
  ctx.fillStyle = '#d99a63'; circle(ctx, 14, 0, 5, '#d99a63');
  ctx.strokeStyle = '#7a4524'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-12, -1); ctx.lineTo(10, -1); ctx.stroke();
  ctx.restore();
}

export function drawHewnStone(ctx, x, y, size, t) {
  const cx = x + size / 2, cy = y + size / 2 + Math.sin(t * 3) * 2;
  glow(ctx, cx, cy, size * 1.3, '#fff6d8', 0.4);
  ctx.fillStyle = '#f4ecd8'; ctx.fillRect(cx - 11, cy - 8, 22, 16);
  ctx.strokeStyle = '#b8a67e'; ctx.lineWidth = 1.5; ctx.strokeRect(cx - 11, cy - 8, 22, 16);
  ctx.strokeStyle = '#d8caa6'; ctx.beginPath(); ctx.moveTo(cx - 8, cy - 4); ctx.lineTo(cx + 8, cy - 4); ctx.stroke();
}

/** עורב: עף בגל, מצויר מעט שובב */
export function drawCrow(ctx, x, y, w, h, { facing = 1, animTime = 0 } = {}) {
  const cx = x + w / 2, cy = y + h / 2, flap = Math.sin(animTime * 14);
  ctx.save(); ctx.translate(cx, cy); ctx.scale(facing, 1);
  ctx.fillStyle = '#2b2b3a';
  ctx.beginPath(); ctx.moveTo(-4, -2); ctx.quadraticCurveTo(-12, -12 - flap * 8, -20, -4 - flap * 6); ctx.quadraticCurveTo(-10, 2, -4, 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, 0, 11, 7, 0, 0, Math.PI * 2); ctx.fill();
  circle(ctx, 9, -4, 6, '#2b2b3a');
  ctx.fillStyle = '#f2b23c'; ctx.beginPath(); ctx.moveTo(14, -4); ctx.lineTo(21, -2); ctx.lineTo(14, -1); ctx.fill();
  circle(ctx, 10, -6, 1.8, '#ffffff'); circle(ctx, 10.5, -6, 0.9, '#000000');
  ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-17, 4); ctx.lineTo(-10, 4); ctx.fill();
  ctx.restore();
}

/** סרטן חוף: הולך הצידה ומנופף בצבתות */
export function drawCrab(ctx, x, y, w, h, { facing = 1, animTime = 0 } = {}) {
  const cx = x + w / 2, by = y + h, wave = Math.sin(animTime * 8) * 3;
  ctx.save(); ctx.translate(cx, by);
  ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 2;
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.moveTo(s * 6, -6); ctx.lineTo(s * (12 + i * 2), -1 + Math.sin(animTime * 12 + i) * 1.5); ctx.stroke();
  }
  ctx.fillStyle = '#e8573f'; ctx.beginPath(); ctx.ellipse(0, -8, 12, 7, 0, 0, Math.PI * 2); ctx.fill();
  for (const s of [-1, 1]) { circle(ctx, s * 14, -15 - wave * (s > 0 ? 1 : -1), 4.5, '#e8573f'); }
  circle(ctx, -4, -15, 2.4, '#ffffff'); circle(ctx, 4, -15, 2.4, '#ffffff');
  circle(ctx, -4, -15, 1.1, '#000'); circle(ctx, 4, -15, 1.1, '#000');
  ctx.restore();
}

/** אתר הבנייה בהר המוריה — קיר עם מקומות פנויים, ושלט "שקט" */
export function drawStoneSite(ctx, c, camX, camY, done, time) {
  const t = artTime(time);
  const x = c.x - camX, y = c.y + c.h - camY;
  ctx.fillStyle = '#dcc699'; ctx.fillRect(x - 30, y - 96, 124, 96);
  ctx.strokeStyle = '#b89e6a'; ctx.lineWidth = 1;
  for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) {
    const empty = !done && (r + k) % 3 === 1 && r > 0;
    if (empty) { ctx.fillStyle = 'rgba(80,60,30,0.35)'; ctx.fillRect(x - 28 + k * 30 + (r % 2) * 10, y - 94 + r * 24, 28, 22); }
    else ctx.strokeRect(x - 28 + k * 30 + (r % 2) * 10, y - 94 + r * 24, 28, 22);
  }
  // פיגום
  ctx.strokeStyle = '#a67a4a'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x - 38, y); ctx.lineTo(x - 38, y - 110); ctx.moveTo(x + 102, y); ctx.lineTo(x + 102, y - 110);
  ctx.moveTo(x - 38, y - 60); ctx.lineTo(x + 102, y - 60); ctx.stroke();
  if (!done) text(ctx, '☝', x + 32, y - 124 + Math.sin(t * 2) * 3, { size: 24, color: '#6a5130' });
  else glow(ctx, x + 32, y - 50, 90, '#fff2b0', 0.4);
}

/** שלט "שקט!" באזור הבנייה */
export function drawQuietSign(ctx, x, groundY, camX, camY) {
  const sx = x - camX, gy = groundY - camY;
  if (sx < -60 || sx > 1020) return;
  ctx.fillStyle = '#8a6a44'; ctx.fillRect(sx - 2, gy - 50, 4, 50);
  ctx.fillStyle = '#fff7df'; ctx.fillRect(sx - 30, gy - 72, 60, 26);
  ctx.strokeStyle = '#b08a52'; ctx.lineWidth = 2; ctx.strokeRect(sx - 30, gy - 72, 60, 26);
  text(ctx, 'שֶׁקֶט 🤫', sx, gy - 59, { size: 13, color: '#6a4a2a', outline: null });
}
