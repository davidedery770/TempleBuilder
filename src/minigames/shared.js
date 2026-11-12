/**
 * shared.js — עזרים משותפים לכל מיני-המשחקים.
 *
 * ממשק כל מיני-משחק (נבנה ב-index.js):
 *   update(dt, input, audio)  — לוגיקה
 *   draw(ctx)                 — ציור מעל המשחק
 *   finished: boolean         — האם נסגר
 *   result: { success, perfect, cancelled, ... } — התוצאה, ברגע שנסגר
 */

import { text, roundRect, glow } from '../core/art.js';

export const W = 960;
export const H = 540;

/** רקע כהה שמעמעם את המשחק שמתחת */
export function backdrop(ctx, alpha = 0.82) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#356b82';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** לוח מרכזי עם מסגרת זהב */
export function panel(ctx, x, y, w, h) {
  ctx.save();
  roundRect(ctx, x, y, w, h, 14);
  ctx.fillStyle = 'rgba(38,76,95,0.97)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#e2c687';
  ctx.stroke();
  ctx.restore();
}

/** כותרת ומשנה, בראש הלוח */
export function header(ctx, title, subtitle, y = 58) {
  glow(ctx, W / 2, y, 220, '#ffd964', 0.12);
  text(ctx, title, W / 2, y, { size: 28, color: '#ffe9a8', weight: '700' });
  if (subtitle) {
    text(ctx, subtitle, W / 2, y + 30, { size: 15, color: '#c9a227' });
  }
}

/**
 * שבירת שורות לפי רוחב. מצייר ומחזיר את מספר השורות שצוירו.
 * הטקסט מיושר לימין (ברירת מחדל) כי זו עברית.
 */
export function wrap(ctx, str, x, y, maxW, lineH, opts = {}) {
  const size = opts.size || 16;
  const words = String(str).split(' ');
  let line = '';
  let cy = y;
  let lines = 0;

  const width = (s) => {
    ctx.save();
    ctx.font = `${opts.weight || '600'} ${size}px "Segoe UI", "Arial Hebrew", Arial, sans-serif`;
    const w = ctx.measureText(s).width;
    ctx.restore();
    return w;
  };

  const flush = () => {
    text(ctx, line, x, cy, { align: 'right', ...opts });
    lines++;
  };

  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (width(test) > maxW && line) {
      flush();
      line = word;
      cy += lineH;
    } else {
      line = test;
    }
  }
  if (line) flush();
  return lines;
}

/** סרגל התקדמות/זמן */
export function bar(ctx, x, y, w, h, frac, color = '#c9a227') {
  ctx.save();
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fill();
  if (frac > 0) {
    roundRect(ctx, x, y, Math.max(h, w * Math.min(1, frac)), h, h / 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
  ctx.restore();
}
