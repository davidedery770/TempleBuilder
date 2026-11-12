import { circle, glow, hashNoise } from './art.js';
import { artTime } from './visualMotion.js';

export function drawCampBackdrop(ctx, W, H, camX, camY, time, assets) {
  const t = artTime(time);
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#b4bdc4'); sky.addColorStop(0.38, '#e5b883');
  sky.addColorStop(0.75, '#f6cd87'); sky.addColorStop(1, '#b58e59');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  if (assets.mountains) {
    const h = H * 0.8, w = h * 952 / 352;
    const offset = camX * 0.12;
    const first = Math.floor(offset / w) - 1;
    for (let i = first; i <= first + 3; i++) {
      const x = i * w - offset;
      ctx.save(); ctx.translate(x + (i % 2 ? w : 0), 0); ctx.scale(i % 2 ? -1 : 1, 1);
      ctx.drawImage(assets.mountains, 0, 0, w, h); ctx.restore();
    }
  }
  const sunX = W * 0.83 - camX * 0.025;
  glow(ctx, sunX, H * 0.19, 145, '#ffe9b0', 0.2);
  circle(ctx, sunX, H * 0.19, 20, 'rgba(255,235,176,0.75)');
  // Midground dunes merge the mountain crop into the playable, separate terrain.
  for (let layer = 0; layer < 2; layer++) {
    const base = H * (0.77 + layer * 0.09) - camY * 0.28;
    ctx.fillStyle = layer ? '#c39b62' : '#d9b47a';
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W + 20; x += 16) {
      const world = x + camX * (0.2 + layer * 0.12);
      ctx.lineTo(x, base - Math.sin(world * 0.006) * 17 - Math.sin(world * 0.014) * 7);
    }
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  }
  for (let i = -1; i < Math.ceil(W / 210) + 1; i++) {
    const x = i * 210 - (camX * 0.37 % 210) + 90;
    const base = H * 0.8 - camY * 0.3 + (i % 2) * 8;
    paintTent(ctx, x, base, 68, 34, i % 2 ? '#7d6267' : '#648093', t);
    if (i % 2 === 0) shrub(ctx, x + 68, base + 2, 0.8, t);
  }
  // The cloud stays in the distant layer; it is not a moving obstacle.
  const cx = 625 - camX * 0.12, base = H * 0.76 - camY * 0.25;
  if (cx > -60 && cx < W + 60) {
    const cloud = ctx.createLinearGradient(0, 15, 0, base);
    cloud.addColorStop(0, 'rgba(255,245,222,0.02)');
    cloud.addColorStop(0.6, 'rgba(255,245,222,0.21)');
    cloud.addColorStop(1, 'rgba(255,245,222,0.08)');
    ctx.fillStyle = cloud; ctx.beginPath(); ctx.moveTo(cx - 14, base);
    for (let y = base; y >= 15; y -= 14) {
      ctx.lineTo(cx - 15 + Math.sin(t * 0.45 + y * 0.025) * 9, y);
    }
    for (let y = 15; y <= base; y += 14) {
      ctx.lineTo(cx + 15 + Math.sin(t * 0.45 + y * 0.025) * 9, y);
    }
    ctx.closePath(); ctx.fill();
  }
}

/** Optional visual hook for stage 1 only. Return false for unchanged tile art. */
export function drawCampTile(ctx, ch, x, y, col, row, layer, map) {
  const n = hashNoise(col, row), t = map.artTime || 0;
  if (ch === 'd' && layer === 'back') return true; // No blocky background grid.
  if (ch === '#' || ch === 'R') {
    const top = !map.isSolid(col, row - 1);
    const fill = ctx.createLinearGradient(0, y, 0, y + 32);
    fill.addColorStop(0, ch === 'R' ? '#ae885b' : top ? '#dfbd83' : '#b98e57');
    fill.addColorStop(1, ch === 'R' ? '#876344' : '#aa7b49');
    ctx.fillStyle = fill; ctx.fillRect(x, y, 32, 32);
    if (top) {
      ctx.fillStyle = '#f5d49c'; ctx.fillRect(x, y, 32, 2);
      ctx.fillStyle = 'rgba(72,44,23,0.18)';
      ctx.beginPath(); ctx.moveTo(x, y + 3); ctx.lineTo(x + 32, y + 3);
      ctx.lineTo(x + 24, y + 8 + n * 3); ctx.lineTo(x + 8, y + 6); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(86,52,26,0.2)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y + 18 + n * 4);
    ctx.lineTo(x + 13, y + 16 + n * 4); ctx.lineTo(x + 32, y + 21 + n * 3); ctx.stroke();
    if (n > 0.5 || ch === 'R') {
      ctx.beginPath(); ctx.moveTo(x + 12 + n * 9, y + 3);
      ctx.lineTo(x + 15, y + 13); ctx.lineTo(x + 11, y + 20); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,229,177,0.27)';
    for (let i = 0; i < 3; i++) ctx.fillRect(x + hashNoise(col + i, row + 2) * 28, y + 9 + i * 6, 2, 1);
    return true;
  }
  if (ch === 't') {
    paintTent(ctx, x + 16, y + 32, 86, 56, n > 0.6 ? '#805e75' : '#376c87', t);
    return true;
  }
  if (ch === 'c') {
    ctx.save();
    ctx.strokeStyle = '#85633e'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + 2, y); ctx.lineTo(x + 2, y + 32);
    ctx.moveTo(x + 30, y); ctx.lineTo(x + 30, y + 32); ctx.stroke();
    const sway = Math.sin(t * 1.4 + col) * 2;
    ctx.fillStyle = n > 0.5 ? '#477f9a' : '#956078';
    ctx.beginPath(); ctx.moveTo(x + 3, y + 3); ctx.lineTo(x + 29, y + 3);
    ctx.lineTo(x + 28, y + 23 + sway); ctx.quadraticCurveTo(x + 16, y + 18 + sway, x + 4, y + 24); ctx.fill();
    ctx.strokeStyle = '#d5ad65'; ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(x + 7 + i * 8, y + 5); ctx.lineTo(x + 7 + i * 8, y + 19 + sway); ctx.stroke();
    }
    ctx.restore(); return true;
  }
  if (ch === 'p') {
    ctx.strokeStyle = '#82613c'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x + 11, y + 12); ctx.lineTo(x + 11, y + 32); ctx.stroke();
    ctx.strokeStyle = 'rgba(244,220,173,0.75)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + 11, y + 16); ctx.lineTo(x - 11, y - 8); ctx.stroke();
    return true;
  }
  if (ch === 'g') {
    shrub(ctx, x + 16, y + 32, 0.5 + n * 0.3, t);
    return true;
  }
  return false;
}

function paintTent(ctx, cx, base, w, h, accent, t) {
  ctx.save();
  ctx.fillStyle = 'rgba(78,52,28,0.15)';
  ctx.beginPath(); ctx.ellipse(cx + 4, base, w * 0.6, 5, 0, 0, Math.PI * 2); ctx.fill();
  const cloth = ctx.createLinearGradient(cx - w / 2, base - h, cx + w / 2, base);
  cloth.addColorStop(0, '#f4dfb4'); cloth.addColorStop(0.5, '#dbc092'); cloth.addColorStop(1, '#a98050');
  ctx.fillStyle = cloth;
  ctx.beginPath(); ctx.moveTo(cx - w / 2, base); ctx.lineTo(cx - w * 0.28, base - h * 0.82);
  ctx.lineTo(cx + w * 0.1, base - h); ctx.lineTo(cx + w / 2, base); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#f8e7c4'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx - w * 0.28, base - h * 0.82); ctx.lineTo(cx + w * 0.1, base - h); ctx.stroke();
  ctx.strokeStyle = 'rgba(121,85,45,0.32)';
  for (let i = 0; i < 4; i++) {
    const f = (i + 1) / 5;
    ctx.beginPath(); ctx.moveTo(cx - w * 0.28 + f * w * 0.38, base - h * (0.82 + f * 0.18));
    ctx.lineTo(cx - w / 2 + f * w, base); ctx.stroke();
  }
  ctx.fillStyle = '#4d4133';
  ctx.beginPath(); ctx.moveTo(cx + w * 0.12, base - h * 0.72);
  ctx.lineTo(cx + w * 0.31, base); ctx.lineTo(cx - w * 0.01, base); ctx.closePath(); ctx.fill();
  const sway = Math.sin(t * 1.2 + cx * 0.03) * 1.5;
  ctx.fillStyle = accent;
  ctx.beginPath(); ctx.moveTo(cx + w * 0.1, base - h * 0.76);
  ctx.lineTo(cx + w * 0.24, base - h * 0.37);
  ctx.lineTo(cx + w * 0.14 + sway, base); ctx.lineTo(cx + w * 0.04, base); ctx.fill();
  ctx.strokeStyle = '#9d794b'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx - w * 0.28, base - h * 0.82); ctx.lineTo(cx - w * 0.64, base);
  ctx.moveTo(cx + w * 0.1, base - h); ctx.lineTo(cx + w * 0.64, base); ctx.stroke();
  ctx.restore();
}

function shrub(ctx, x, base, scale, t) {
  ctx.save(); ctx.strokeStyle = '#777643'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 5; i++) {
    const dx = (i - 2) * 5 * scale, top = base - (12 + (i % 3) * 5) * scale;
    ctx.beginPath(); ctx.moveTo(x, base);
    ctx.quadraticCurveTo(x + dx * 0.6, top + 6, x + dx + Math.sin(t + i) * scale, top); ctx.stroke();
  }
  ctx.restore();
}
