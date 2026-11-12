import { roundRect, circle } from './art.js';
import { drawEntryButton } from './entryArt.js';

export function drawParchment(ctx, x, y, w, h, selected = false) {
  ctx.save();
  roundRect(ctx, x, y, w, h, 9);
  const paper = ctx.createLinearGradient(0, y, 0, y + h);
  paper.addColorStop(0, '#f5ddb1'); paper.addColorStop(0.45, '#fff1cf'); paper.addColorStop(1, '#dfbd80');
  ctx.fillStyle = paper; ctx.fill();
  ctx.strokeStyle = selected ? '#f6c65d' : '#a77b42'; ctx.lineWidth = selected ? 2.5 : 1.5; ctx.stroke();
  roundRect(ctx, x + 5, y + 5, w - 10, h - 10, 6);
  ctx.strokeStyle = 'rgba(133,85,35,0.35)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = 'rgba(137,91,39,0.07)';
  for (let i = 0; i < 6; i++) {
    const yy = y + 12 + (h - 24) * i / 5;
    ctx.fillRect(x + 9, yy, w - 18, 1);
  }
  for (const xx of [x + 9, x + w - 9]) {
    circle(ctx, xx, y + 9, 2, '#bd934e'); circle(ctx, xx, y + h - 9, 2, '#bd934e');
  }
  ctx.restore();
}

export function drawSelectionBackdrop(ctx, W, H) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#568cad'); sky.addColorStop(0.45, '#c5d2cb'); sky.addColorStop(1, '#b9a56d');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  for (let layer = 0; layer < 3; layer++) {
    ctx.fillStyle = ['#879c99', '#7e9476', '#5f7654'][layer];
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W + 10; x += 14) {
      const y = H * (0.36 + layer * 0.19) - Math.sin(x * 0.01 + layer) * 30 - Math.sin(x * 0.024 + 1) * 14;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  }
  // Olive foliage frames the upper corners without sitting over card hit targets.
  for (const side of [0, 1]) {
    const x = side ? W : 0;
    ctx.strokeStyle = '#78603c'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(x, 65); ctx.lineTo(x + (side ? -90 : 90), 0); ctx.stroke();
    ctx.fillStyle = '#355d45';
    for (let i = 0; i < 12; i++) {
      ctx.beginPath(); ctx.ellipse(x + (side ? -1 : 1) * (i * 9), 62 - i * 5, 12, 5, side ? 0.5 : -0.5, 0, Math.PI * 2); ctx.fill();
    }
  }
}

export function drawSelectionButton(ctx, button, focused) {
  ctx.save();
  if (button.disabled) ctx.globalAlpha *= 0.45;
  drawEntryButton(ctx, button, button.label, focused && !button.disabled);
  ctx.restore();
}
