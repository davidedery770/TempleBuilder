import { text, circle, glow } from './art.js';
import { PLAN, TENT, BUILD_PARTS, targetPoint } from '../data/level02.js';

export const PART_COLORS = {
  bases: '#d3e0ed', wallS: '#e9bd59', wallN: '#e9bd59', wallW: '#e9bd59',
  bars: '#b68839', linen: '#8a60ae', goat: '#a69b81', rams: '#ae5046',
  tachash: '#7e9e9b', veil: '#8855ac', entrance: '#4968b6', court: '#f1e7ce',
  gate: '#8866af', ark: '#ffda72', table: '#eac16b', menorah: '#ffe293',
  incense: '#d5ac55', altar: '#bb774e', laver: '#74bac6',
};

function line(ctx, x, y, xx, yy, color, width = 3) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(xx, yy); ctx.stroke();
}

export function drawBuildPart(ctx, part, t = 0) {
  const { x, y } = targetPoint(part);
  const s = PLAN.scale, tx = PLAN.x + TENT.x * s, ty = PLAN.y + TENT.y * s;
  const tw = TENT.w * s, th = TENT.h * s;
  const color = PART_COLORS[part.shape] || '#e9bd59';
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  switch (part.shape) {
    case 'bases':
      // 20 pairs along each long wall, 8 pairs at the west (corners schematic).
      for (let i = 0; i < 20; i++) {
        for (const yy of [ty - 8, ty + th + 4]) {
          ctx.fillRect(tx + i * tw / 20, yy, 3, 4);
          ctx.fillRect(tx + i * tw / 20 + 4, yy, 3, 4);
        }
      }
      for (let i = 0; i < 8; i++) {
        ctx.fillRect(tx - 9, ty + i * th / 8, 3, 3);
        ctx.fillRect(tx - 5, ty + i * th / 8, 3, 3);
      }
      break;
    case 'wallN': case 'wallS':
      for (let i = 0; i < 20; i++) {
        ctx.fillRect(tx + i * tw / 20, y - 3, tw / 20 - 1, 6);
      }
      break;
    case 'wallW':
      for (let i = 0; i < 8; i++) ctx.fillRect(x - 3, ty + i * th / 8, 6, th / 8 - 1);
      break;
    case 'bars':
      line(ctx, tx, ty + 3, tx + tw, ty + 3, color, 2);
      line(ctx, tx, ty + th - 3, tx + tw, ty + th - 3, color, 2);
      line(ctx, tx + 3, ty, tx + 3, ty + th, color, 2);
      break;
    case 'linen': case 'goat': case 'rams': case 'tachash': {
      const layer = ['linen', 'goat', 'rams', 'tachash'].indexOf(part.shape);
      const pad = 3 + layer * 4;
      const opacity = ctx.globalAlpha;
      ctx.globalAlpha = opacity * 0.15;
      ctx.fillRect(tx - pad, ty - pad, tw + 2 * pad, th + 2 * pad);
      ctx.globalAlpha = opacity * 0.85;
      ctx.setLineDash([4 + layer, 3]);
      ctx.strokeRect(tx - pad, ty - pad, tw + 2 * pad, th + 2 * pad);
      break;
    }
    case 'veil': case 'entrance': {
      line(ctx, x, ty, x, ty + th, color, 5);
      const n = part.shape === 'veil' ? 4 : 5;
      for (let i = 0; i < n; i++) {
        circle(ctx, x, ty + i * th / (n - 1), 3,
          part.shape === 'veil' ? '#d3e0ed' : '#bc8156');
      }
      break;
    }
    case 'court': {
      const right = PLAN.x + 100 * s, bottom = PLAN.y + 50 * s;
      line(ctx, PLAN.x, PLAN.y, right, PLAN.y, color, 5);
      line(ctx, PLAN.x, bottom, right, bottom, color, 5);
      line(ctx, PLAN.x, PLAN.y, PLAN.x, bottom, color, 5);
      line(ctx, right, PLAN.y, right, PLAN.y + 15 * s, color, 5);
      line(ctx, right, PLAN.y + 35 * s, right, bottom, color, 5);
      for (let i = 0; i <= 20; i++) {
        circle(ctx, PLAN.x + i * 5 * s, PLAN.y, 2, '#ba8056');
        circle(ctx, PLAN.x + i * 5 * s, bottom, 2, '#ba8056');
      }
      break;
    }
    case 'gate':
      line(ctx, x, y - 10 * s, x, y + 10 * s, color, 7);
      for (let i = 0; i < 4; i++) circle(ctx, x, y - 10 * s + i * 20 * s / 3, 3, '#bc8156');
      break;
    case 'menorah':
      line(ctx, x, y + 7, x, y - 9, color, 2);
      for (let i = -3; i <= 3; i++) {
        const xx = x + i * 3;
        line(ctx, x, y + 4, xx, y - 5, color, 1.5);
        line(ctx, xx, y - 5, xx, y - 9, color, 1.5);
        circle(ctx, xx, y - 11, 1.7, '#fff4b8');
      }
      glow(ctx, x, y - 7, 22, '#ffd964', 0.2 + Math.sin(t * 2) * 0.04);
      break;
    case 'laver':
      circle(ctx, x, y, 9, '#b67d50');
      circle(ctx, x, y, 6, '#85d2df');
      break;
    default: {
      const size = part.shape === 'altar' ? 5 * s : part.shape === 'incense' ? 10 : 16;
      ctx.shadowColor = '#000'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 3;
      ctx.fillRect(x - size / 2, y - size / 2, size, size);
      ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      ctx.strokeStyle = '#fff1b4'; ctx.lineWidth = 1;
      ctx.strokeRect(x - size / 2 + 2, y - size / 2 + 2, size - 4, size - 4);
      if (part.shape === 'ark') {
        line(ctx, x - 13, y - 5, x + 13, y - 5, color, 2);
        line(ctx, x - 13, y + 5, x + 13, y + 5, color, 2);
      }
      if (part.shape === 'table') {
        for (let i = 0; i < 6; i++) {
          circle(ctx, x - 4 + (i % 2) * 8, y - 5 + Math.floor(i / 2) * 5, 1.7, '#fff1c7');
        }
      }
      break;
    }
  }
  ctx.restore();
}

export function drawConstructionPlan(ctx, placed, selected, hint, t) {
  const { x, y, scale: s } = PLAN, w = 100 * s, h = 50 * s;
  ctx.save();
  ctx.fillStyle = '#d6bc85'; ctx.fillRect(x - 15, y - 15, w + 30, h + 30);
  ctx.fillStyle = '#253e4b'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(173,218,223,0.13)'; ctx.lineWidth = 1;
  for (let i = 0; i <= 100; i += 5) {
    ctx.beginPath(); ctx.moveTo(x + i * s, y); ctx.lineTo(x + i * s, y + h); ctx.stroke();
  }
  for (let i = 0; i <= 50; i += 5) {
    ctx.beginPath(); ctx.moveTo(x, y + i * s); ctx.lineTo(x + w, y + i * s); ctx.stroke();
  }
  ctx.setLineDash([5, 5]); ctx.strokeStyle = '#8dafa8';
  ctx.strokeRect(x, y, w, h);
  ctx.strokeRect(x + TENT.x * s, y + TENT.y * s, TENT.w * s, TENT.h * s);
  ctx.setLineDash([]);
  text(ctx, 'צפון', x + w / 2, y - 27, { size: 13, color: '#e8dbc0' });
  text(ctx, 'דרום', x + w / 2, y + h + 27, { size: 13, color: '#e8dbc0' });
  text(ctx, 'מערב', x + 24, y + h / 2, { size: 11, color: '#b2c5bd' });
  text(ctx, 'מזרח', x + w - 24, y + h / 2, { size: 11, color: '#b2c5bd' });
  text(ctx, '100 אמה', x + w - 55, y - 6, { size: 10, color: '#b2c5bd' });
  text(ctx, '50 אמה', x + 38, y + 14, { size: 10, color: '#b2c5bd' });
  // Roof layers first: all other components remain readable in the cutaway.
  const roofs = ['linen', 'goat', 'rams', 'tachash'];
  for (const p of BUILD_PARTS.filter(p => roofs.includes(p.id))) {
    if (placed.has(p.id)) drawBuildPart(ctx, p, t);
  }
  for (const p of BUILD_PARTS.filter(p => !roofs.includes(p.id))) {
    if (placed.has(p.id)) drawBuildPart(ctx, p, t);
  }
  if (selected && hint) {
    const p = targetPoint(selected);
    ctx.save();
    ctx.globalAlpha = 0.4;
    drawBuildPart(ctx, selected, t);
    ctx.restore();
    // A pale dashed footprint makes the altar's exact drop location readable.
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.fillStyle = 'rgba(72,201,255,0.32)';
    ctx.strokeStyle = '#83e4ff';
    ctx.lineWidth = 3;
    const size = selected.shape === 'altar' ? 5 * s : 24;
    ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
    ctx.strokeRect(p.x - size / 2, p.y - size / 2, size, size);
    ctx.restore();
    circle(ctx, p.x, p.y, 17, 'rgba(72,201,255,0.35)');
    ctx.strokeStyle = '#83e4ff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(p.x, p.y, 12, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}
