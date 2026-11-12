/**
 * nobArt.js — שלב 7: נוב, עיר הכהנים, בשקיעה.
 *
 * בתי אבן שגגותיהם הם משטחי קפיצה, שיחים להסתתרות, צופי שאול עם פנס
 * ואלומת ראייה, לחם הפנים ומערת המסתור של דוד. המחשה, לא שחזור.
 */

import { circle, glow, text, hashNoise, drawNPC } from './art.js';
import { artTime } from './visualMotion.js';

export function drawNobBackdrop(ctx, W, H, camX, camY, time) {
  const t = artTime(time);
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#4b2a4a'); sky.addColorStop(0.45, '#c2584a'); sky.addColorStop(0.75, '#f0a25a'); sky.addColorStop(1, '#f7c98a');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  const sx = W * 0.72 - camX * 0.02;
  glow(ctx, sx, H * 0.56, 190, '#ffd08a', 0.35);
  circle(ctx, sx, H * 0.56, 46, '#ffd99a');
  for (let i = 0; i < 4; i++) {
    const y = 70 + i * 34, x = ((i * 380 - camX * (0.04 + i * 0.01)) % (W + 300) + W + 300) % (W + 300) - 150;
    ctx.fillStyle = 'rgba(255,214,170,0.22)';
    ctx.beginPath(); ctx.ellipse(x, y, 120, 12, 0, 0, Math.PI * 2); ctx.fill();
  }
  ridge(ctx, W, H, camX, camY, 0.1, H * 0.6, '#8a4f4e', 40);
  // העיר על הצלע — בתים קטנים ברקע
  for (let i = 0; i < 26; i++) {
    const wx = i * 150 + hashNoise(i, 2) * 60;
    const x = wx - camX * 0.22;
    if (x < -60 || x > W + 60) continue;
    const h = 26 + hashNoise(i, 5) * 22, y = H * 0.66 - camY * 0.15 - hashNoise(i, 8) * 30;
    // The walls run down to the bottom; the nearer ridge covers them, so houses sit on the slope.
    ctx.fillStyle = '#7a4a44'; ctx.fillRect(x, y - h, 44, H - y + h);
    ctx.fillStyle = '#ffcf86'; ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 2 + i);
    ctx.fillRect(x + 16, y - h + 9, 8, 8); ctx.globalAlpha = 1;
  }
  ridge(ctx, W, H, camX, camY, 0.3, H * 0.74, '#5e3638', 26);
}

function ridge(ctx, W, H, camX, camY, factor, baseY, color, amp) {
  const off = camX * factor;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W + 8; x += 8) {
    const wx = (x + off) * 0.005;
    ctx.lineTo(x, baseY - camY * factor - Math.sin(wx) * amp - Math.sin(wx * 2.7 + 2) * amp * 0.35);
  }
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
}

/** בית אבן מתחת לגג־פלטפורמה: הגג בשורה `roof`, הקרקע ב־`ground`. */
export function drawNobHouse(ctx, h, camX, camY) {
  const x = h.col * 32 - camX, y = h.roof * 32 - camY, w = h.w * 32, hh = (h.ground - h.roof) * 32;
  if (x > 1000 || x + w < -40) return;
  ctx.fillStyle = '#b08a68'; ctx.fillRect(x, y, w, hh);
  ctx.strokeStyle = '#8e6c50'; ctx.lineWidth = 1;
  for (let r = 0; r < hh / 16; r++) for (let c = 0; c < w / 28; c++) ctx.strokeRect(x + c * 28 + (r % 2) * 14, y + r * 16, 28, 16);
  ctx.fillStyle = '#5a3a2a'; ctx.fillRect(x + w / 2 - 12, y + hh - 40, 24, 40);
  ctx.fillStyle = '#ffcf86'; ctx.fillRect(x + 12, y + 20, 14, 12);
  if (w > 120) ctx.fillRect(x + w - 26, y + 20, 14, 12);
  ctx.fillStyle = '#8a6a4c'; ctx.fillRect(x - 4, y - 4, w + 8, 8);
}

/** שיח להסתתרות; מצויר מעל השחקן, כך שמי שמתכופף בתוכו כמעט נעלם. */
export function drawBush(ctx, b, camX, camY, time) {
  const t = artTime(time);
  const x = b.x - camX, y = b.y - camY;
  for (let i = 0; i < 5; i++) {
    const cx = x + 10 + i * (b.w - 20) / 4, sway = Math.sin(t * 1.5 + i) * 1.5;
    circle(ctx, cx + sway, y - 22 - (i % 2) * 8, 20, i % 2 ? '#4f6b3a' : '#5d7b44');
  }
  ctx.fillStyle = '#4a6436'; ctx.fillRect(x + 4, y - 22, b.w - 8, 22);
}

/** צופה של שאול: דמות עם פנס, ואלומת ראייה כתומה לפניו. */
export function drawWatcher(ctx, w, camX, camY, time, alert) {
  const x = w.x - camX, y = w.y - camY;
  const eyeX = x + w.w / 2, eyeY = y + 12, dir = w.facing;
  ctx.save();
  const g = ctx.createLinearGradient(eyeX, eyeY, eyeX + dir * w.range, eyeY);
  g.addColorStop(0, alert ? 'rgba(255,80,50,0.6)' : 'rgba(255,236,150,0.55)');
  g.addColorStop(1, 'rgba(255,236,150,0.08)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(eyeX, eyeY);
  ctx.lineTo(eyeX + dir * w.range, eyeY - w.spread);
  ctx.lineTo(eyeX + dir * w.range, eyeY + w.spread + 30);
  ctx.closePath(); ctx.fill();
  // A dashed edge shows children exactly where the watcher can see.
  ctx.strokeStyle = alert ? 'rgba(255,90,60,0.8)' : 'rgba(255,240,170,0.7)';
  ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
  ctx.restore();
  drawNPC(ctx, x, y, w.w, w.h, { robe: '#8a4b3e', sash: '#d9b25a', t: time, role: 'watchman', facing: dir, beard: true, beardColor: '#4a3020' });
  glow(ctx, eyeX + dir * 14, y + 24, 16, '#ffcf6a', 0.6);
  circle(ctx, eyeX + dir * 14, y + 24, 4, '#ffe39a');
  if (w.suspicion > 0.05) {
    // "!" grows and reddens while he is noticing someone in his beam
    const k = Math.min(1, w.suspicion / 0.5);
    text(ctx, '!', eyeX, y - 16, { size: 16 + k * 14, color: k > 0.6 ? '#ff7a5a' : '#ffe08a', weight: '700' });
  } else if (w.turning) text(ctx, '?', eyeX, y - 14 + Math.sin(artTime(time) * 6) * 2, { size: 18, color: '#ffe9a8' });
}

/** מערת המסתור של דוד */
export function drawCave(ctx, c, camX, camY) {
  const x = c.x - camX, y = c.y - camY;
  ctx.fillStyle = '#6b4a3c';
  ctx.beginPath(); ctx.moveTo(x - 70, y); ctx.quadraticCurveTo(x, y - 170, x + 90, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#1e1414';
  ctx.beginPath(); ctx.moveTo(x - 28, y); ctx.quadraticCurveTo(x + 8, y - 96, x + 46, y); ctx.closePath(); ctx.fill();
}

/** ככר לחם קטן (לחם הפנים), לסמל ב־HUD ובמיני־משחק */
export function drawLoaf(ctx, cx, cy, s = 1, color = '#e2b46a') {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(0, 0, 16, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#b07f3e'; ctx.lineWidth = 1.5;
  for (const dx of [-7, 0, 7]) { ctx.beginPath(); ctx.moveTo(dx - 3, -6); ctx.lineTo(dx + 3, 4); ctx.stroke(); }
  ctx.restore();
}
