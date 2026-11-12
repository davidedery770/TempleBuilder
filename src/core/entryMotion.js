import { circle, glow } from './art.js';
import { reducedMotion } from './visualMotion.js';

// Coordinates follow the gold path in entry-journey.webp, not the vector fallback.
const PATH = [
  [846, 277, 777, 282, 713, 246, 638, 270],
  [638, 270, 582, 294, 521, 294, 462, 274],
  [462, 274, 405, 259, 348, 268, 286, 261],
  [286, 261, 222, 269, 170, 221, 116, 222],
];
export function entryMotionPoint(progress) {
  const p = Math.max(0, Math.min(1, progress)) * PATH.length;
  const index = Math.min(PATH.length - 1, Math.floor(p));
  const t = p - index, u = 1 - t;
  const [x0, y0, x1, y1, x2, y2, x3, y3] = PATH[index];
  return { x: u ** 3 * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t ** 3 * x3,
    y: u ** 3 * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t ** 3 * y3 };
}

export function drawEntryMotion(ctx, width, height, time, quiet = reducedMotion()) {
  if (quiet) return;
  ctx.save();
  ctx.scale(width / 960, height / 540);
  ctx.beginPath(); ctx.rect(0, 132, 960, 258); ctx.clip();
  const progress = (time % 38) / 38;
  for (let i = 5; i >= 0; i--) {
    const p = entryMotionPoint(Math.max(0, progress - i * 0.003));
    circle(ctx, p.x, p.y, i ? 1.5 : 3, i ? `rgba(255,235,158,${0.35 - i * 0.045})` : '#fff5d4');
  }
  const p = entryMotionPoint(progress);
  glow(ctx, p.x, p.y, 13, '#ffe9a0', 0.5);
  // Restrained glints in the lower river, clear of the baked location labels.
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const y = 346 + i * 4.5;
    const x = 624 - (y - 340) * 1.1 + Math.sin(i * 1.8) * 3;
    const light = (Math.sin(time * 1.6 + i * 1.7) + 1) * 0.12;
    ctx.strokeStyle = `rgba(239,250,247,${light})`;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 4 + light * 17, y); ctx.stroke();
  }
  // Small silhouettes in the sky, never over the title or controls.
  ctx.strokeStyle = 'rgba(65,76,83,0.55)'; ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const x = 240 + ((time * 4 + i * 83) % 400);
    const y = 152 + i * 6 + Math.sin(time * 0.7 + i) * 2;
    const wing = 1.5 + Math.sin(time * 3.4 + i) * 1.4;
    ctx.beginPath(); ctx.moveTo(x - 4, y - wing); ctx.quadraticCurveTo(x - 1, y - 1, x, y + 1);
    ctx.quadraticCurveTo(x + 1, y - 1, x + 4, y - wing); ctx.stroke();
  }
  ctx.restore();
}
