/**
 * templeArt.js — שלב 10: חנוכת הבית.
 *
 * ירושלים בבוקר, בית היציקה של חירם האומן (מראות נחושת וקרני שמש), חצר בית ה׳
 * עם יכין ובועז וים הנחושת על שנים־עשר בקר, קהל חוגג, והענן שממלא את הבית.
 * השחקן נשאר בחוץ — אין כניסה להיכל או לקודש הקודשים. המחשה, לא שחזור.
 */

import { circle, glow, text, hashNoise } from './art.js';
import { artTime } from './visualMotion.js';

export const T10 = { city: [0, 60], foundry: [61, 170], court: [171, 269] };
const zoneOf = c => c <= T10.city[1] ? 'city' : c <= T10.foundry[1] ? 'foundry' : 'court';

export function drawTempleBackdrop(ctx, W, H, camX, camY, time, cloud = 0) {
  const t = artTime(time);
  const mid = (camX + W / 2) / 32;
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#62b4ee'); sky.addColorStop(0.6, '#c6e8fb'); sky.addColorStop(1, '#fbf1d9');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  glow(ctx, W * 0.8 - camX * 0.01, 84, 140, '#fff4c8', 0.6);
  circle(ctx, W * 0.8 - camX * 0.01, 84, 34, '#fff8dc');
  for (let i = 0; i < 6; i++) {
    const x = ((i * 300 - camX * 0.05 + t * 5) % (W + 300) + W + 300) % (W + 300) - 150;
    for (let k = 0; k < 4; k++) circle(ctx, x + k * 30, 64 + (i % 3) * 28 - (k % 2) * 10, 22, 'rgba(255,255,255,0.92)');
  }
  // הרים סביב ירושלים
  ctx.fillStyle = '#a9c79a';
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W + 8; x += 8) { const wx = (x + camX * 0.1) * 0.004; ctx.lineTo(x, H * 0.62 - camY * 0.08 - Math.sin(wx) * 30 - Math.sin(wx * 2.2) * 12); }
  ctx.lineTo(W, H); ctx.fill();
  // בית ה׳ על ההר — מופיע ככל שמתקרבים לחצר; לבן־זהב ונוצץ
  // anchored so the House stands in the middle of the screen while you are in the courtyard
  const hx = 2720 - camX * 0.35, hy = H * 0.6 - camY * 0.2;
  if (hx > -300 && hx < W + 300) {
    ctx.fillStyle = '#f6efdc'; ctx.fillRect(hx - 150, hy - 150, 300, 150);
    ctx.fillStyle = '#efe2bf'; ctx.fillRect(hx - 70, hy - 230, 140, 80);
    ctx.fillStyle = '#e6c25a'; ctx.fillRect(hx - 150, hy - 156, 300, 8); ctx.fillRect(hx - 70, hy - 236, 140, 8);
    for (let i = 0; i < 5; i++) { ctx.fillStyle = '#d9c9a2'; ctx.fillRect(hx - 130 + i * 60, hy - 120, 16, 110); }
    ctx.fillStyle = '#e8c36a'; ctx.fillRect(hx - 22, hy - 110, 44, 110);
    glow(ctx, hx, hy - 120, 200, '#fff3c0', 0.25 + 0.05 * Math.sin(t * 2));
    if (cloud > 0) {
      // "והענן מלא את בית ה׳" — ענן לבן ורך שעוטף את הבית
      ctx.save(); ctx.globalAlpha = Math.min(1, cloud);
      for (let i = 0; i < 14; i++) circle(ctx, hx - 160 + (i % 7) * 54, hy - 200 + Math.floor(i / 7) * 90 + Math.sin(t + i) * 6, 60, '#ffffff');
      ctx.restore();
    }
  }
  // רחובות העיר — בתי אבן ירושלמית ברקע
  const cityAlpha = Math.max(0, Math.min(1, (90 - mid) / 25));
  if (cityAlpha > 0) {
    ctx.save(); ctx.globalAlpha = cityAlpha;
    for (let i = 0; i < 18; i++) {
      const x = i * 120 - camX * 0.3 + hashNoise(i, 1) * 40, h = 50 + hashNoise(i, 2) * 50, y = H * 0.7 - camY * 0.2;
      if (x < -80 || x > W + 80) continue;
      ctx.fillStyle = '#e9d6aa'; ctx.fillRect(x, y - h, 70, h + 200);
      ctx.fillStyle = '#c8a86e'; ctx.fillRect(x + 12, y - h + 14, 12, 14); ctx.fillRect(x + 44, y - h + 14, 12, 14);
    }
    ctx.restore();
  }
}

/** צייר אריחים לפי אזור: אבן ירושלמית, רצפת טרקוטה בבית היציקה, ודלתות נחושת ('B'). */
export function templeTilePainter(ctx, ch, x, y, col, row, layer, map) {
  if (ch !== '#' && ch !== 'B') return false;
  const n = hashNoise(col, row), top = !map.isSolid(col, row - 1);
  if (ch === 'B') {
    const g = ctx.createLinearGradient(x, 0, x + 32, 0);
    g.addColorStop(0, '#b86f34'); g.addColorStop(0.5, '#e9a65c'); g.addColorStop(1, '#b86f34');
    ctx.fillStyle = g; ctx.fillRect(x, y, 32, 32);
    ctx.fillStyle = '#7d4a22'; circle(ctx, x + 8, y + 8, 2.5, '#7d4a22'); circle(ctx, x + 24, y + 24, 2.5, '#7d4a22');
    ctx.strokeStyle = '#8a5428'; ctx.lineWidth = 1; ctx.strokeRect(x + 1, y + 1, 30, 30);
    return true;
  }
  const z = zoneOf(col);
  if (z === 'foundry') {
    ctx.fillStyle = n > 0.5 ? '#d99a6a' : '#cf8f60'; ctx.fillRect(x, y, 32, 32);
    ctx.strokeStyle = '#b97a4c'; ctx.lineWidth = 1; ctx.strokeRect(x + 1, y + 1, 30, 30);
    if (top) { ctx.fillStyle = '#ebb88a'; ctx.fillRect(x, y, 32, 4); }
  } else {
    ctx.fillStyle = n > 0.5 ? '#efe0bb' : '#e6d4a9'; ctx.fillRect(x, y, 32, 32);
    ctx.strokeStyle = '#cdb27a'; ctx.lineWidth = 1;
    ctx.strokeRect(x + (row % 2) * 16, y + 1, 30, 14); ctx.strokeRect(x, y + 16, 30, 14);
    if (top) { ctx.fillStyle = '#fbf2d8'; ctx.fillRect(x, y, 32, 3); }
  }
  return true;
}

/** מראת נחושת מלוטשת על מעמד; `m.o` הוא '/' או '\\' */
export function drawMirror(ctx, m, camX, camY, time, near) {
  const t = artTime(time);
  const x = m.col * 32 + 16 - camX, y = m.row * 32 + 16 - camY;
  ctx.fillStyle = '#8a5a30'; ctx.fillRect(x - 2, y + 6, 4, 26 - (m.row % 1));
  ctx.save(); ctx.translate(x, y); ctx.rotate(m.o === '/' ? -Math.PI / 4 : Math.PI / 4);
  const g = ctx.createLinearGradient(-16, 0, 16, 0);
  g.addColorStop(0, '#c4823e'); g.addColorStop(0.5, '#ffe1a0'); g.addColorStop(1, '#c4823e');
  ctx.fillStyle = g; ctx.fillRect(-17, -4, 34, 8);
  ctx.strokeStyle = '#7a4a22'; ctx.lineWidth = 1.5; ctx.strokeRect(-17, -4, 34, 8);
  ctx.restore();
  if (near) text(ctx, '⟳', x, y - 26 + Math.sin(t * 5) * 2, { size: 18, color: '#b0622a', outline: null });
}

/** קרן שמש זהובה לאורך המסלול שחושב (נקודות בעולם) */
export function drawBeam(ctx, points, camX, camY, time, lit) {
  if (points.length < 2) return;
  const t = artTime(time);
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(255,236,150,0.35)'; ctx.lineWidth = 14;
  ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x - camX, y - camY) : ctx.moveTo(x - camX, y - camY)); ctx.stroke();
  ctx.strokeStyle = lit ? '#fff6c2' : `rgba(255,240,170,${0.8 + 0.2 * Math.sin(t * 8)})`; ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();
}

/** חלון שממנו נכנסת קרן השמש, ומטרה — קערת נחושת שזוהרת כשהאור פוגע בה */
export function drawBeamSource(ctx, s, camX, camY) {
  const x = s.col * 32 - camX, y = s.row * 32 - camY;
  ctx.fillStyle = '#9fd4f2'; ctx.fillRect(x + 4, y + 4, 24, 24);
  ctx.strokeStyle = '#a06a38'; ctx.lineWidth = 3; ctx.strokeRect(x + 4, y + 4, 24, 24);
  glow(ctx, x + 16, y + 16, 26, '#fff4b8', 0.7);
}
export function drawBeamTarget(ctx, tg, camX, camY, time, lit) {
  const t = artTime(time);
  const x = tg.col * 32 + 16 - camX, y = tg.row * 32 + 16 - camY;
  if (lit) glow(ctx, x, y, 50, '#fff2a0', 0.7 + 0.2 * Math.sin(t * 6));
  ctx.fillStyle = '#c98a4a'; ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI); ctx.fill();
  ctx.fillStyle = lit ? '#fff1a8' : '#e9b06a'; ctx.beginPath(); ctx.ellipse(x, y, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8a5428'; ctx.fillRect(x - 2, y + 10, 4, 14);
  if (!lit) text(ctx, '☀', x, y - 22 + Math.sin(t * 3) * 2, { size: 14, color: '#d48a2a', outline: null });
}

/** מכונה — עגלת נחושת על אופנים, ועליה כיור (מלכים א׳ ז׳, כ״ז–ל״ח) */
export function drawCart(ctx, m, camX, camY, time) {
  const t = artTime(time);
  const x = m.x - camX, y = m.y - camY;
  ctx.fillStyle = '#c98a4a'; ctx.fillRect(x, y, m.w, 14);
  ctx.fillStyle = '#ffd99a'; ctx.fillRect(x + 4, y + 2, m.w - 8, 3);
  ctx.strokeStyle = '#8a5428'; ctx.lineWidth = 1; ctx.strokeRect(x, y, m.w, 14);
  for (const wx of [x + 14, x + m.w - 14]) {
    circle(ctx, wx, y + 20, 9, '#8a5428'); circle(ctx, wx, y + 20, 5, '#e9b06a');
    ctx.save(); ctx.translate(wx, y + 20); ctx.rotate(t * 4 * Math.sign(m.dx || 1));
    ctx.strokeStyle = '#6a3e1a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.moveTo(0, -8); ctx.lineTo(0, 8); ctx.stroke();
    ctx.restore();
  }
}

/** רימון זהב — כמו הרימונים שעל כותרות העמודים */
export function drawGoldPomegranate(ctx, x, y, size, t) {
  const cx = x + size / 2, cy = y + size / 2 + Math.sin(t * 3) * 2;
  glow(ctx, cx, cy, size * 1.3, '#ffe39a', 0.45);
  circle(ctx, cx, cy + 2, size * 0.42, '#e3b23c');
  circle(ctx, cx - 3, cy - 1, size * 0.14, '#fff0b0');
  ctx.fillStyle = '#c99a2a';
  ctx.beginPath(); ctx.moveTo(cx - 5, cy - size * 0.38); ctx.lineTo(cx - 3, cy - size * 0.58); ctx.lineTo(cx, cy - size * 0.42);
  ctx.lineTo(cx + 3, cy - size * 0.58); ctx.lineTo(cx + 5, cy - size * 0.38); ctx.fill();
}

/** יכין ובועז — עמודי הנחושת באולם, עם כותרות ורימונים */
export function drawPillars(ctx, x, groundY, camX, camY) {
  const sx = x - camX, gy = groundY - camY;
  if (sx < -200 || sx > 1160) return;
  for (const [dx, name] of [[0, 'יָכִין'], [150, 'בֹּעַז']]) {
    const px = sx + dx;
    const g = ctx.createLinearGradient(px - 14, 0, px + 14, 0);
    g.addColorStop(0, '#b06e34'); g.addColorStop(0.5, '#f0b46a'); g.addColorStop(1, '#b06e34');
    ctx.fillStyle = g; ctx.fillRect(px - 14, gy - 200, 28, 200);
    ctx.fillStyle = '#e6a95a'; ctx.beginPath(); ctx.ellipse(px, gy - 212, 26, 16, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 6; i++) circle(ctx, px - 20 + i * 8, gy - 198, 3.5, '#d64a3a');
    text(ctx, name, px, gy - 240, { size: 14, color: '#6a4a2a', outline: null });
  }
}

/** ים הנחושת על שנים־עשר בקר (מלכים א׳ ז׳, כ״ג–כ״ה) */
export function drawBronzeSea(ctx, x, groundY, camX, camY) {
  const sx = x - camX, gy = groundY - camY;
  if (sx < -160 || sx > 1120) return;
  for (let i = 0; i < 4; i++) {
    const ox = sx - 60 + i * 40;
    ctx.fillStyle = '#b8783e'; ctx.fillRect(ox - 10, gy - 30, 22, 18);
    ctx.fillRect(ox - 8, gy - 12, 4, 12); ctx.fillRect(ox + 6, gy - 12, 4, 12);
    circle(ctx, ox + 12, gy - 28, 7, '#b8783e');
  }
  ctx.fillStyle = '#d99a52';
  ctx.beginPath(); ctx.moveTo(sx - 90, gy - 70); ctx.lineTo(sx + 90, gy - 70); ctx.lineTo(sx + 70, gy - 30); ctx.lineTo(sx - 70, gy - 30); ctx.fill();
  ctx.fillStyle = '#8fd0f0'; ctx.beginPath(); ctx.ellipse(sx, gy - 70, 90, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#a8662e'; ctx.lineWidth = 2; ctx.stroke();
}

/** קהל חוגג בחצר — דמויות קטנות שקופצות בשמחה */
export function drawCrowd(ctx, x0, x1, groundY, camX, camY, time) {
  const t = artTime(time);
  for (let x = x0; x < x1; x += 22) {
    const sx = x - camX, gy = groundY - camY;
    if (sx < -20 || sx > 980) continue;
    const n = hashNoise(x, 3), hop = Math.max(0, Math.sin(t * 4 + n * 9)) * 4;
    const robe = ['#d9a8a0', '#a8c4d9', '#d9cfa0', '#b8d9a8', '#cdb0d9'][Math.floor(n * 5)];
    ctx.fillStyle = robe; ctx.fillRect(sx - 6, gy - 24 - hop, 12, 22);
    circle(ctx, sx, gy - 30 - hop, 6, '#e2b085');
    if (n > 0.5) { ctx.strokeStyle = robe; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx + 5, gy - 20 - hop); ctx.lineTo(sx + 10, gy - 34 - hop); ctx.stroke(); }
  }
}
