import { circle, roundRect } from './art.js';

/** Decorative 2D craftsmanship, not an archaeological reconstruction. */
export function drawWorkshopVignette(ctx, x, y, w, h, t, weaving = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(w / 240, h / 190);
  roundRect(ctx, 0, 0, 240, 190, 14);
  ctx.fillStyle = 'rgba(20,23,32,0.78)'; ctx.fill();
  ctx.strokeStyle = '#a58d66'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = '#7b6550'; ctx.fillRect(15, 171, 210, 3);
  if (weaving) {
    // Loom: a woven curtain grows subtly while the craftswoman passes a shuttle.
    ctx.fillStyle = '#a87542';
    ctx.fillRect(30, 31, 7, 139); ctx.fillRect(138, 31, 7, 139);
    ctx.fillRect(24, 28, 127, 8); ctx.fillRect(24, 153, 127, 7);
    ctx.strokeStyle = '#d9cfb1'; ctx.lineWidth = 1;
    for (let i = 0; i < 14; i++) {
      ctx.beginPath(); ctx.moveTo(40 + i * 7, 37); ctx.lineTo(40 + i * 7, 153); ctx.stroke();
    }
    const colors = ['#4d94c1', '#905e9f', '#bd6060', '#e5d8bd'];
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = colors[i % 4];
      ctx.fillRect(39, 78 + i * 6, 98, 5);
    }
    worker(ctx, 179, 170, -1, t, '#b8a0bd', true);
    ctx.fillStyle = '#e8c27d';
    ctx.fillRect(104 + Math.sin(t * 1.5) * 18, 77, 20, 4);
    for (let i = 0; i < 4; i++) circle(ctx, 46 + i * 22, 164, 6, colors[i]);
  } else {
    // Golden boards and silver bases, with an artisan fitting a crossbar.
    for (let i = 0; i < 7; i++) {
      const bx = 79 + i * 16;
      ctx.fillStyle = i % 2 ? '#d1ad58' : '#be9749';
      ctx.fillRect(bx, 42, 14, 122);
      ctx.fillStyle = '#ede0a4'; ctx.fillRect(bx + 2, 44, 2, 116);
      ctx.fillStyle = '#b9c4ce'; ctx.fillRect(bx - 1, 164, 7, 8); ctx.fillRect(bx + 8, 164, 7, 8);
    }
    ctx.fillStyle = '#8a6336'; ctx.fillRect(77, 79, 115, 5); ctx.fillRect(77, 122, 115, 5);
    worker(ctx, 53, 170, 1, t, '#c5d5d4');
    ctx.fillStyle = '#ddb96a'; ctx.fillRect(62, 95 + Math.sin(t * 1.5) * 2, 84, 5);
    ctx.fillStyle = '#927044'; ctx.fillRect(22, 163, 28, 7); ctx.fillRect(18, 156, 28, 6);
  }
  ctx.restore();
}

function worker(ctx, x, feet, facing, t, robe, veil = false) {
  ctx.save();
  ctx.translate(x, feet); ctx.scale(facing, 1);
  ctx.strokeStyle = '#795d48'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-5, -22); ctx.lineTo(-7, -2); ctx.moveTo(5, -22); ctx.lineTo(8, -2); ctx.stroke();
  ctx.fillStyle = robe;
  ctx.beginPath(); ctx.moveTo(-10, -69); ctx.lineTo(10, -69);
  ctx.lineTo(14, -24); ctx.lineTo(-14, -24); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#486f87'; ctx.fillRect(-11, -47, 22, 4);
  circle(ctx, 0, -82, 11, '#d6af89');
  ctx.fillStyle = '#eee4cf';
  ctx.beginPath(); ctx.arc(0, -85, 12, Math.PI, 2 * Math.PI); ctx.fill();
  if (veil) ctx.fillRect(-12, -85, 5, 32);
  circle(ctx, 5, -82, 1.4, '#30291f');
  ctx.strokeStyle = '#e2bea0'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(8, -63); ctx.lineTo(24, -66 + Math.sin(t * 1.5) * 3);
  ctx.moveTo(-6, -62); ctx.lineTo(15, -56); ctx.stroke();
  ctx.restore();
}
