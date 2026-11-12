import { drawJourneyPanorama } from './journeyArt.js';
import { circle, roundRect, text } from './art.js';
import { drawEntryMotion } from './entryMotion.js';
import { artTime } from './visualMotion.js';

export const ENTRY_ART_URL = new URL('../../assets/images/entry-journey.webp', import.meta.url).href;
export const ENTRY_BUTTONS = [
  { x: 330, y: 403, w: 300, h: 64 },
  { x: 492, y: 478, w: 210, h: 38 },
  { x: 258, y: 478, w: 210, h: 38 },
  { x: 14, y: 420, w: 156, h: 30 },
];

export function loadEntryArt(onLoad, onError) {
  if (typeof globalThis.Image !== 'function') return null;
  const image = new globalThis.Image();
  image.decoding = 'async';
  image.onload = () => onLoad(image);
  image.onerror = () => onError?.();
  image.src = ENTRY_ART_URL;
  return image;
}

export function drawEntryBackdrop(ctx, image, width, height, time) {
  if (image) {
    ctx.drawImage(image, 0, 0, width, height * 390 / 540);
    drawEntryMotion(ctx, width, height, time);
  }
  else {
    drawJourneyPanorama(ctx, width, height, artTime(time));
    ctx.save();
    roundRect(ctx, width * 0.3, height * 0.055, width * 0.4, height * 0.16, 12);
    ctx.fillStyle = '#ead09e'; ctx.fill(); ctx.restore();
  }
  const footer = ctx.createLinearGradient(0, height * 360 / 540, 0, height);
  footer.addColorStop(0, 'rgba(12,37,51,0)');
  footer.addColorStop(0.28, '#123b50');
  footer.addColorStop(1, '#071b29');
  ctx.fillStyle = footer; ctx.fillRect(0, height * 360 / 540, width, height * 180 / 540);
}

export function drawEntryButton(ctx, rect, label, selected, primary = false) {
  const { x, y, w, h } = rect;
  ctx.save();
  roundRect(ctx, x, y, w, h, primary ? 18 : 9);
  const color = ctx.createLinearGradient(0, y, 0, y + h);
  color.addColorStop(0, selected ? '#116685' : '#123e55');
  color.addColorStop(1, selected ? '#073c58' : '#0a293d');
  ctx.fillStyle = color; ctx.fill();
  ctx.strokeStyle = selected ? '#ffe2a1' : '#bd9553'; ctx.lineWidth = selected ? 3 : 1.5; ctx.stroke();
  let center = x + w / 2;
  if (primary) {
    const cx = x + w - 34, cy = y + h / 2;
    circle(ctx, cx, cy, 20, '#e8b95e');
    text(ctx, '‹', cx, cy - 1, { size: 34, color: '#3d2c14', outline: null });
    center -= 16;
  }
  text(ctx, label, center, y + h / 2, {
    size: primary ? 25 : h < 35 ? 13 : 17, color: '#fff2cc',
    weight: '700', outline: '#062335', outlineWidth: 1.5,
  });
  ctx.restore();
}
