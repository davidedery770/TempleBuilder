/**
 * shilohNightArt.js — שלב 6: לילה בשילה.
 *
 * השמיים, משכן שילה הרחוק (בית אבנים ויריעות מעליו), הפנסים, העטלפים
 * ושכבת החושך שהאור "חותך" בה חורים. משכן שילה ברקע הוא המחשה, לא שחזור.
 */

import { circle, glow, text, hashNoise } from './art.js';
import { drawLearningIcon } from './learningArt.js';
import { artTime } from './visualMotion.js';

export const LAMP_RADIUS = 250;

export function drawShilohNight(ctx, W, H, camX, camY, time) {
  const t = artTime(time);
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  // A bright early evening, not deep night: the game stays light and friendly.
  sky.addColorStop(0, '#5f86c8'); sky.addColorStop(0.55, '#a9a6d8'); sky.addColorStop(1, '#f4cf9a');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

  // כוכבים קבועים בעולם, עם נצנוץ עדין
  for (let i = 0; i < 90; i++) {
    const x = ((hashNoise(i, 3) * 2400 - camX * 0.02) % W + W) % W;
    const y = hashNoise(i, 7) * H * 0.55;
    const tw = 0.45 + 0.4 * Math.sin(t * (1 + hashNoise(i, 9) * 2) + i);
    if (i % 3) continue;   // only a few first stars in the evening sky
    circle(ctx, x, y * 0.6, hashNoise(i, 11) > 0.85 ? 1.6 : 1.1, `rgba(255,252,235,${tw})`);
  }
  // סהר
  const mx = W * 0.18 - camX * 0.01;
  glow(ctx, mx, 82, 90, '#fff8dc', 0.3);
  circle(ctx, mx, 82, 24, '#fffbe8');
  circle(ctx, mx + 10, 76, 22, '#7a92cf');

  hills(ctx, W, H, camX, camY, 0.08, H * 0.62, '#8c8fc2', 46);
  // משכן שילה הרחוק: קירות אבן, יריעות מעל, ואור הנר שעדיין דולק בפנים
  const sx = 3600 - camX * 0.1;
  if (sx > -260 && sx < W + 260) {
    const by = H * 0.6 - camY * 0.05;
    glow(ctx, sx, by - 40, 170, '#ffc56b', 0.16 + 0.04 * Math.sin(t * 2));
    ctx.fillStyle = '#b9a58a'; ctx.fillRect(sx - 120, by - 60, 240, 60);
    ctx.fillStyle = '#cdbb9e';
    for (let i = 0; i < 8; i++) ctx.fillRect(sx - 116 + i * 30, by - 56 + (i % 2) * 14, 26, 10);
    ctx.fillStyle = '#8e6aa0';
    ctx.beginPath(); ctx.moveTo(sx - 130, by - 58); ctx.quadraticCurveTo(sx, by - 118, sx + 130, by - 58); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffcf7a'; ctx.globalAlpha = 0.75 + 0.2 * Math.sin(t * 3);
    ctx.fillRect(sx - 8, by - 34, 16, 22); ctx.globalAlpha = 1;
  }
  hills(ctx, W, H, camX, camY, 0.22, H * 0.72, '#6f8a6a', 34);
  // עצי זית כצלליות
  for (let i = 0; i < 12; i++) {
    const wx = i * 420 + 160;
    const x = ((wx - camX * 0.35) % (12 * 420) + 12 * 420) % (12 * 420) - 200;
    if (x < -120 || x > W + 120) continue;
    const y = H * 0.74 - camY * 0.2;
    ctx.fillStyle = '#6b5a44'; ctx.fillRect(x - 4, y - 40, 8, 42);
    for (let k = 0; k < 5; k++) circle(ctx, x - 26 + k * 13, y - 52 - (k % 2) * 12, 20, k % 2 ? '#5f7a52' : '#6f8c5e');
  }
}

function hills(ctx, W, H, camX, camY, factor, baseY, color, amp) {
  const off = camX * factor;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W + 8; x += 8) {
    const wx = (x + off) * 0.004;
    ctx.lineTo(x, baseY - camY * factor - Math.sin(wx) * amp - Math.sin(wx * 2.3 + 1) * amp * 0.4);
  }
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
}

/** פנס אבן עם קערת שמן. `l.y` הוא בסיס הפנס על הקרקע. */
export function drawOilLamp(ctx, l, camX, camY, time) {
  const t = artTime(time);
  const x = l.x - camX, y = l.y - camY;
  ctx.fillStyle = '#6d6252'; ctx.fillRect(x - 6, y - 50, 12, 50);
  ctx.fillStyle = '#857a66'; ctx.fillRect(x - 12, y - 4, 24, 4);
  ctx.fillStyle = '#9b7a3c';
  ctx.beginPath(); ctx.ellipse(x, y - 52, 15, 6, 0, 0, Math.PI); ctx.fill();
  ctx.fillRect(x - 15, y - 56, 30, 4);
  if (l.lit) {
    const f = Math.sin(t * 9 + l.x) * 2;
    glow(ctx, x, y - 66, 46, '#ffc35a', 0.55);
    ctx.fillStyle = '#ffdb7a';
    ctx.beginPath(); ctx.moveTo(x - 6, y - 58); ctx.quadraticCurveTo(x + f, y - 86, x + 6, y - 58); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff6d0';
    ctx.beginPath(); ctx.moveTo(x - 3, y - 58); ctx.quadraticCurveTo(x + f * 0.5, y - 74, x + 3, y - 58); ctx.closePath(); ctx.fill();
  } else {
    // פנס כבוי נוצץ קלות, כדי שיהיה ברור שאפשר להדליק
    glow(ctx, x, y - 56, 22, '#ffe2a0', 0.18 + 0.12 * Math.sin(t * 3 + l.x));
  }
}

/** קווי מתאר של קרשים שהאור עוד לא גילה — רואים אותם רק כשמתקרבים עם המטה. */
export function drawGhostPlanks(ctx, reveal, camX, camY, alpha) {
  if (alpha <= 0.02) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#ffe2a0'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
  for (const r of reveal) ctx.strokeRect(r.col * 32 - camX + 1, r.row * 32 - camY + 1, r.w * 32 - 2, 10);
  ctx.restore();
}

/** עטלף: גוף כהה, כנפיים שמנפנפות ועיניים קטנות. */
export function drawBat(ctx, x, y, w, h, { facing = 1, animTime = 0 } = {}) {
  const cx = x + w / 2, cy = y + h / 2, flap = Math.sin(animTime * 16);
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(facing, 1);
  ctx.fillStyle = '#2c2238';
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(0, -2);
    ctx.quadraticCurveTo(s * 10, -10 - flap * 8, s * 18, -4 - flap * 6);
    ctx.quadraticCurveTo(s * 13, 2, s * 8, 0);
    ctx.quadraticCurveTo(s * 5, 4, 0, 4); ctx.closePath(); ctx.fill();
  }
  ctx.beginPath(); ctx.ellipse(0, 0, 6, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-4, -5); ctx.lineTo(-3, -10); ctx.lineTo(-1, -6); ctx.moveTo(4, -5); ctx.lineTo(3, -10); ctx.lineTo(1, -6); ctx.fill();
  circle(ctx, -2.2, -1, 1.3, '#ffd85a'); circle(ctx, 2.2, -1, 1.3, '#ffd85a');
  ctx.restore();
}

/** כד שמן קטן וזוהר */
export function drawOilJug(ctx, x, y, size, t) {
  const cx = x + size / 2, cy = y + size / 2 + Math.sin(t * 3) * 2;
  glow(ctx, cx, cy, size * 1.6, '#ffd27a', 0.35);
  drawLearningIcon(ctx, 'oil', cx, cy, size * 1.4);
}

/** מעמד המנורה בחצר — מקום אתגר הסיום */
export function drawMenorahStand(ctx, c, camX, camY, done, time) {
  const t = artTime(time);
  const x = c.x + c.w / 2 - camX, y = c.y + c.h - camY;
  ctx.fillStyle = '#5c5245'; ctx.fillRect(x - 40, y - 10, 80, 10);
  glow(ctx, x, y - 60, done ? 120 : 60, '#ffd27a', done ? 0.45 : 0.18);
  drawLearningIcon(ctx, 'menorah', x, y - 52, 92);
  if (done) {
    for (let i = -3; i <= 3; i++) glow(ctx, x + i * 11, y - 92, 12, '#fff0b0', 0.8);
  } else {
    text(ctx, '☝', x, y - 128 + Math.sin(t * 2) * 3, { size: 24, color: '#f8e5ab' });
  }
}

let fog = null;
/**
 * חושך הלילה: שכבה כהה אחת, שכל מקור אור "מוחק" ממנה עיגול רך.
 * `lights` בקואורדינטות מסך: { x, y, r, a?, warm? }.
 */
export function drawDarkness(ctx, W, H, lights, strength = 0.18) {
  if (typeof OffscreenCanvas === 'undefined' && typeof document === 'undefined') return;
  if (!fog) {
    fog = typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(W, H) : Object.assign(document.createElement('canvas'), { width: W, height: H });
  }
  const f = fog.getContext('2d');
  f.globalCompositeOperation = 'source-over';
  f.clearRect(0, 0, W, H);
  f.fillStyle = `rgba(40,46,96,${strength})`;
  f.fillRect(0, 0, W, H);
  f.globalCompositeOperation = 'destination-out';
  for (const l of lights) {
    if (l.x < -l.r || l.x > W + l.r || l.y < -l.r || l.y > H + l.r) continue;
    const a = l.a ?? 1;
    const g = f.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
    g.addColorStop(0, `rgba(0,0,0,${a})`);
    g.addColorStop(0.55, `rgba(0,0,0,${a * 0.8})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    f.fillStyle = g;
    f.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
  }
  f.globalCompositeOperation = 'source-over';
  ctx.drawImage(fog, 0, 0, W, H);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const l of lights) if (l.warm) glow(ctx, l.x, l.y, l.r * 0.55, '#ff9f3a', 0.09 * l.warm);
  ctx.restore();
}

/** הנחיית הריצה אל עלי: כותרת, שעון קצר וחץ אל קצה המסך כשעלי מחוץ לתמונה. */
export function drawCallGuide(ctx, W, H, run, targetX, time) {
  const t = artTime(time);
  const left = Math.max(0, Math.ceil(run.timer));
  text(ctx, left > 0 ? `רוּצוּ אֶל עֵלִי · ${left}` : 'עֵלִי מְחַכֶּה בְּהֶמְשֵׁךְ הַדֶּרֶךְ', W / 2, 92, {
    size: 20, color: '#ffe9a8', weight: '700',
  });
  if (left > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(W / 2 - 90, 106, 180, 6);
    ctx.fillStyle = '#ffd27a'; ctx.fillRect(W / 2 - 90, 106, 180 * Math.min(1, run.timer / run.total), 6);
  }
  if (targetX > W - 20) text(ctx, '►', W - 24 - Math.sin(t * 6) * 4, H / 2, { size: 30, color: '#ffe9a8' });
  else if (targetX < 20) text(ctx, '◄', 24 + Math.sin(t * 6) * 4, H / 2, { size: 30, color: '#ffe9a8' });
}
