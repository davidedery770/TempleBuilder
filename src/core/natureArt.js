import { circle, drawNPC, text } from './art.js';

/** Stylized river fish; never reused for Bezalel or the biblical guides. */
export function drawRiverFish(ctx, x, y, w, h, { facing = 1, animTime = 0, state = 'walk' }) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(facing, 1);
  const flick = Math.sin(animTime * 12) * h * 0.12;
  const large = h > 22;
  const color = large ? '#67afc2' : '#d6ab63';
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-w * 0.22, 0);
  ctx.lineTo(-w * 0.49, -h * 0.4 + flick);
  ctx.lineTo(-w * 0.49, h * 0.4 + flick);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.34, h * 0.37, 0, 0, Math.PI * 2);
  const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, large ? '#c3edf0' : '#ffe4a7');
  g.addColorStop(1, color);
  ctx.fillStyle = g; ctx.fill();
  ctx.fillStyle = large ? '#347b99' : '#b67b48';
  ctx.beginPath(); ctx.moveTo(-w * 0.12, -h * 0.3);
  ctx.lineTo(w * 0.02, -h * 0.5); ctx.lineTo(w * 0.17, -h * 0.3); ctx.fill();
  ctx.strokeStyle = 'rgba(30,80,100,0.5)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(w * 0.12, 0, h * 0.22, -1.1, 1.1); ctx.stroke();
  circle(ctx, w * 0.22, -h * 0.12, 2.5, '#fff5d9');
  circle(ctx, w * 0.24, -h * 0.12, 1.3, '#213d48');
  if (state === 'charge') {
    circle(ctx, -w * 0.65, -2, 2, 'rgba(190,240,255,0.6)');
  }
  ctx.restore();
}

export function drawBonusRoom(ctx, bonus, camX, camY, t) {
  const x = bonus.x - camX, y = bonus.y - camY;
  ctx.save();
  ctx.globalAlpha = bonus.taken ? 0.35 : 1;
  ctx.fillStyle = '#4d553d'; ctx.fillRect(x, y, bonus.w, bonus.h);
  ctx.fillStyle = '#9f8543'; ctx.fillRect(x + 18, y + 25, 48, 30);
  ctx.strokeStyle = '#e2c977'; ctx.lineWidth = 2; ctx.strokeRect(x + 18, y + 25, 48, 30);
  text(ctx, bonus.taken ? '✓' : bonus.open ? '★' : '🔒', x + 42, y + 40, { size: 20 });
  text(ctx, bonus.open ? 'בונוס ידע' : '3 תשובות נכונות פותחות', x + bonus.w / 2, y - 14, { size: 11 });
  ctx.restore();
}

export function drawShofarChallenge(ctx, challenge, camX, camY, done, t) {
  const x = challenge.x - camX, y = challenge.y - camY;
  ctx.save();
  ctx.fillStyle = done ? '#8da278' : '#a99b79';
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(x + i * 13, y + (done ? 55 + i * 4 : 18 - (i % 2) * 14), 12, done ? 28 : 82);
  }
  text(ctx, done ? '✓' : '📯', x + challenge.w / 2, y + 36, { size: 26 });
  text(ctx, done ? 'האתגר הושלם' : 'אתגר שופר · Enter', x + challenge.w / 2, y - 21, { size: 13, color: '#ffe9a8' });
  ctx.restore();
}

/** A field watchman with a round shield, not a recycled armed desert soldier. */
export function drawFieldGuard(ctx, x, y, w, h, { facing = 1, animTime = 0 }) {
  drawNPC(ctx, x, y, w, h, {
    robe: '#668557', sash: '#c49a54', t: animTime, beard: false,
    role: 'watchman',
  });
  circle(ctx, x + w / 2 + facing * 8, y + h * 0.62, 9, '#927449');
  circle(ctx, x + w / 2 + facing * 8, y + h * 0.62, 3, '#dfc07a');
}

export function drawGilgalBackdrop(ctx, W, H, camX, t) {
  ctx.save();
  for (let i = 0; i < 10; i++) {
    const x = ((i * 340 - camX * 0.38) % (W + 500) + W + 500) % (W + 500) - 180;
    const base = H * 0.81, top = base - 100 - (i % 3) * 12;
    ctx.strokeStyle = '#6b6540'; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(x, base); ctx.quadraticCurveTo(x + 8, top + 55, x, top); ctx.stroke();
    ctx.strokeStyle = '#50794b'; ctx.lineWidth = 5;
    for (let n = -3; n <= 3; n++) {
      ctx.beginPath(); ctx.moveTo(x, top);
      ctx.quadraticCurveTo(x + n * 16, top - 27, x + n * 24, top + 16 + Math.abs(n) * 4);
      ctx.stroke();
    }
  }
  // The twelve stones remain background scenery, not a second construction puzzle.
  const monumentX = 350 - camX * 0.45;
  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI * 2 / 12;
    const x = monumentX + Math.cos(angle) * 70;
    const y = H * 0.77 + Math.sin(angle) * 14;
    ctx.fillStyle = i % 2 ? '#a89e7d' : '#d0c6a3';
    ctx.fillRect(x, y - 19, 12, 20);
  }
  text(ctx, 'אבני הזיכרון', monumentX, H * 0.77 - 38, { size: 12, color: '#e8d8a3' });
  ctx.restore();
}

export function drawWheatField(ctx, field, camX, camY, t) {
  const bent = field.bent > 0;
  ctx.save();
  ctx.globalAlpha = bent ? 0.38 : 0.84;
  const x0 = Math.max(field.x, camX - 20);
  const x1 = Math.min(field.x + field.w, camX + 980);
  for (let wx = Math.ceil(x0 / 11) * 11; wx <= x1; wx += 11) {
    const seed = Math.sin(wx * 1.73) * 0.5 + 0.5;
    const height = bent ? 14 + seed * 8 : 65 + seed * 26;
    const x = wx - camX, y = field.y + field.h - camY;
    const sway = bent ? 26 : Math.sin(t * 2.2 + wx * 0.06) * 5;
    ctx.strokeStyle = seed > 0.4 ? '#d8bb69' : '#a99040'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + sway * 0.35, y - height * 0.6, x + sway, y - height);
    ctx.stroke();
    ctx.fillStyle = '#e7ce85';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.ellipse(x + sway + (i % 2 ? 3 : -3), y - height + i * 4, 2, 4, i % 2 ? 0.5 : -0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function drawGrain(ctx, x, y, size, t) {
  ctx.save();
  ctx.translate(x + size / 2, y + size / 2 + Math.sin(t * 3) * 2);
  ctx.strokeStyle = '#e2c66d'; ctx.lineWidth = 2;
  for (const dx of [-5, 0, 5]) {
    ctx.beginPath(); ctx.moveTo(0, 9); ctx.lineTo(dx, -7); ctx.stroke();
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = '#ffe49b';
      ctx.beginPath(); ctx.ellipse(dx + (i % 2 ? 2 : -2), -7 + i * 4, 2, 3, 0.35, 0, Math.PI * 2); ctx.fill();
      // Long awns distinguish the barley collectible from wheat scenery.
      ctx.beginPath(); ctx.moveTo(dx, -7 + i * 4); ctx.lineTo(dx + 5, -15 + i * 4); ctx.stroke();
    }
  }
  ctx.restore();
}
