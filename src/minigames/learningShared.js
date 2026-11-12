import { text, roundRect } from '../core/art.js';
import { backdrop, header, wrap } from './shared.js';

export const BACK = { x: 20, y: 16, w: 110, h: 48 };
export const NEXT = { x: 360, y: 486, w: 240, h: 46 };
export const HELP = { x: 720, y: 486, w: 215, h: 46 };
export const contains = (r, p) => !!p && p.inside !== false
  && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

export function learningButton(ctx, r, label, focused = false) {
  ctx.fillStyle = focused ? '#e1f5ff' : '#fff4d8';
  roundRect(ctx, r.x, r.y, r.w, r.h, 10); ctx.fill();
  ctx.strokeStyle = focused ? '#42bdeb' : '#ba9756'; ctx.lineWidth = focused ? 3 : 1; ctx.stroke();
  text(ctx, label, r.x + r.w / 2, r.y + r.h / 2, { size: 18, color: '#244454', outline: null });
}
export function learningFrame(ctx, title, subtitle) {
  backdrop(ctx, 1); header(ctx, title, subtitle, 32);
  learningButton(ctx, BACK, 'חזרה');
}
export function learningFeedback(ctx, fact, source = '') {
  ctx.fillStyle = '#183e54'; roundRect(ctx, 20, 418, 915, 62, 10); ctx.fill();
  wrap(ctx, fact, 917, 437, 875, 19, { size: 16, color: '#fff2cd', outline: null });
  if (source) text(ctx, source, 917, 470, { size: 12, align: 'right', color: '#99dfff', outline: null });
}
export const safeCount = n => Number.isSafeInteger(n) && n >= 0 ? n : 0;
