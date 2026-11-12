import { circle, glow, text } from './art.js';

// A journey through places AND eras, deliberately not a geographic map.
export const JOURNEY_STOPS = [
  { id: 'desert', label: 'המשכן במדבר', x: 850, y: 476 },
  { id: 'jordan', label: 'הירדן', x: 718, y: 493 },
  { id: 'shiloh', label: 'שילה', x: 582, y: 493 },
  { id: 'wanderings', label: 'נוב וגבעון', x: 352, y: 493 },
  { id: 'jerusalem', label: 'ירושלים והמקדש', x: 150, y: 476 },
];
const ROUTE = [
  [902, 442, 865, 462, 819, 456, 780, 444],
  [780, 444, 738, 430, 708, 448, 660, 461],
  [660, 461, 610, 478, 570, 480, 520, 465],
  [520, 465, 463, 450, 442, 470, 390, 462],
  [390, 462, 330, 454, 312, 412, 262, 416],
  [262, 416, 220, 420, 207, 394, 164, 392],
];

export function journeyPoint(progress) {
  const p = Math.max(0, Math.min(1, progress)) * ROUTE.length;
  const index = Math.min(ROUTE.length - 1, Math.floor(p));
  const t = p - index, u = 1 - t;
  const [x0, y0, x1, y1, x2, y2, x3, y3] = ROUTE[index];
  return { x: u ** 3 * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t ** 3 * x3,
    y: u ** 3 * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t ** 3 * y3 };
}

export function drawJourneyPanorama(ctx, width, height, time) {
  ctx.save();
  ctx.scale(width / 960, height / 540);
  const sky = ctx.createLinearGradient(0, 0, 0, 540);
  sky.addColorStop(0, '#12253b');
  sky.addColorStop(0.45, '#39485d');
  sky.addColorStop(0.77, '#b79c83');
  sky.addColorStop(1, '#d9bf91');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, 960, 540);
  glow(ctx, 162, 276, 230, '#ffe2a1', 0.19);
  circle(ctx, 147, 238, 29, '#f0d4a0');

  // Far hills link the desert at the right to the Jerusalem hills at the left.
  const distant = ctx.createLinearGradient(0, 0, 960, 0);
  distant.addColorStop(0, '#697d80'); distant.addColorStop(0.5, '#738875'); distant.addColorStop(1, '#9c8873');
  landscape(ctx, distant, [[0, 350], [130, 279], [246, 328], [340, 311],
    [445, 357], [568, 330], [674, 369], [805, 305], [900, 323], [960, 290]], 540);
  const land = ctx.createLinearGradient(0, 0, 960, 0);
  land.addColorStop(0, '#697452'); land.addColorStop(0.45, '#738457');
  land.addColorStop(0.7, '#999362'); land.addColorStop(1, '#c09d68');
  landscape(ctx, land, [[0, 414], [102, 357], [228, 389], [328, 408],
    [443, 427], [556, 396], [673, 427], [790, 392], [888, 379], [960, 408]], 540);

  // Terraces, olive groves and desert dunes remain a continuous landscape.
  ctx.strokeStyle = 'rgba(224,220,169,0.25)'; ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath(); ctx.moveTo(25, 420 + i * 16);
    ctx.quadraticCurveTo(145, 384 + i * 20, 284, 437 + i * 12); ctx.stroke();
  }
  for (const [x, y, scale] of [[295, 415, 0.8], [318, 433, 0.65], [644, 430, 0.7], [681, 418, 0.55]]) {
    olive(ctx, x, y, scale);
  }
  ctx.fillStyle = '#ba9764';
  ctx.beginPath(); ctx.moveTo(753, 449); ctx.quadraticCurveTo(855, 383, 960, 426);
  ctx.lineTo(960, 540); ctx.lineTo(755, 540); ctx.fill();

  // The river winds down the landscape rather than becoming a UI panel.
  ctx.strokeStyle = '#486f82'; ctx.lineWidth = 17; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(729, 371); ctx.bezierCurveTo(686, 410, 766, 433, 704, 492); ctx.stroke();
  ctx.strokeStyle = '#9dc2c6'; ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const y = 395 + i * 23;
    ctx.beginPath(); ctx.moveTo(714, y); ctx.quadraticCurveTo(727, y + 4, 735, y + 1); ctx.stroke();
  }

  route(ctx);
  // Small stops of the wandering sanctuary, distinct from the main desert camp.
  sanctuary(ctx, 582, 440, 0.4);
  village(ctx, 364, 445, 0.5);
  desertCamp(ctx, time);
  jerusalem(ctx, time);

  const point = journeyPoint((time % 32) / 32);
  glow(ctx, point.x, point.y, 18, '#ffe7a0', 0.65);
  circle(ctx, point.x, point.y, 3, '#fff4c8');
  for (const stop of JOURNEY_STOPS) {
    text(ctx, stop.label, stop.x, stop.y, {
      size: stop.id === 'jerusalem' || stop.id === 'desert' ? 16 : 13,
      color: '#fff0cc', weight: '600', outline: '#26322e', outlineWidth: 3,
    });
  }

  // A quiet foreground anchors the map and leaves room for keyboard hints.
  const shade = ctx.createLinearGradient(0, 490, 0, 540);
  shade.addColorStop(0, 'rgba(12,22,29,0)');
  shade.addColorStop(1, 'rgba(12,22,29,0.95)');
  ctx.fillStyle = shade; ctx.fillRect(0, 490, 960, 50);
  ctx.restore();
}

function landscape(ctx, color, points, bottom) {
  ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(points[0][0], bottom); ctx.lineTo(...points[0]);
  for (let i = 1; i < points.length; i++) {
    const previous = points[i - 1], current = points[i];
    ctx.bezierCurveTo(previous[0] + 42, previous[1], current[0] - 42, current[1], ...current);
  }
  ctx.lineTo(960, bottom); ctx.closePath(); ctx.fill();
}
function route(ctx) {
  ctx.beginPath(); ctx.moveTo(ROUTE[0][0], ROUTE[0][1]);
  for (const [, , ...curve] of ROUTE) ctx.bezierCurveTo(...curve);
  ctx.strokeStyle = '#736749'; ctx.lineWidth = 19; ctx.stroke();
  ctx.strokeStyle = '#d9c18c'; ctx.lineWidth = 12; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,239,182,0.75)'; ctx.lineWidth = 1.4;
  ctx.setLineDash([2, 8]); ctx.stroke(); ctx.setLineDash([]);
}
function olive(ctx, x, y, scale) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  ctx.strokeStyle = '#554b35'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -22); ctx.lineTo(-9, -34); ctx.stroke();
  circle(ctx, -10, -32, 13, '#435e4c'); circle(ctx, 9, -35, 15, '#567258');
  circle(ctx, -1, -43, 12, '#6b8463'); ctx.restore();
}
function sanctuary(ctx, x, y, scale) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  ctx.fillStyle = '#dacba7'; ctx.fillRect(-64, -44, 128, 44);
  ctx.fillStyle = '#bb7152'; ctx.fillRect(-67, -52, 134, 10);
  ctx.fillStyle = '#e3bc65'; ctx.fillRect(28, -47, 4, 47); ctx.fillRect(48, -47, 4, 47);
  ctx.fillStyle = '#61485d'; ctx.fillRect(32, -42, 16, 42);
  ctx.fillStyle = '#b29467'; ctx.fillRect(-79, 2, 166, 6);
  ctx.restore();
}
function desertCamp(ctx, time) {
  ctx.save(); ctx.translate(849, 415);
  // Court curtains and gate frame the sanctuary; forms are illustrative.
  ctx.fillStyle = '#e8dcc0'; ctx.fillRect(-91, -38, 180, 7);
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = '#c5aa74'; ctx.fillRect(-91 + i * 20, -39, 3, 40);
    ctx.fillStyle = '#ece0bf'; ctx.fillRect(-87 + i * 20, -32, 15, 30);
  }
  sanctuary(ctx, 6, -8, 0.9);
  ctx.fillStyle = '#d9cba9'; ctx.fillRect(-92, 0, 182, 5);
  for (const [x, y] of [[-75, 20], [65, 25], [78, -74]]) {
    ctx.beginPath(); ctx.moveTo(x - 14, y); ctx.lineTo(x, y - 15); ctx.lineTo(x + 14, y); ctx.closePath();
    ctx.fillStyle = '#d6bd8b'; ctx.fill();
    ctx.fillStyle = '#7d684d'; ctx.fillRect(x - 2, y - 9, 4, 9);
  }
  // Gentle pillar belongs to the beginning of the journey, not the whole screen.
  const cloud = ctx.createLinearGradient(0, -145, 0, -55);
  cloud.addColorStop(0, 'rgba(246,235,206,0)'); cloud.addColorStop(1, 'rgba(246,235,206,0.32)');
  ctx.fillStyle = cloud;
  ctx.beginPath(); ctx.moveTo(-6, -62);
  ctx.bezierCurveTo(15 + Math.sin(time * 0.3) * 3, -94, -20, -106, -8, -148);
  ctx.lineTo(19, -148); ctx.bezierCurveTo(2, -111, 35, -100, 14, -62); ctx.fill();
  ctx.restore();
}
function village(ctx, x, y, scale) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  for (let i = 0; i < 4; i++) {
    const bx = i * 27 - 48, by = i % 2 ? -15 : -5;
    ctx.fillStyle = i % 2 ? '#b9b69a' : '#c9c2a4';
    ctx.fillRect(bx, by - 29, 24, 29);
    ctx.fillStyle = '#5a6453'; ctx.fillRect(bx + 9, by - 14, 7, 14);
  }
  ctx.restore();
}
function jerusalem(ctx, time) {
  ctx.save(); ctx.translate(150, 374);
  glow(ctx, 0, -55, 126, '#ffe4a5', 0.13 + Math.sin(time * 0.45) * 0.02);
  // City terraces, houses, and wall: no modern skyline or period conflation.
  ctx.fillStyle = '#a59d7d'; ctx.fillRect(-117, 1, 235, 21);
  for (const [x, y, w, h] of [[-111, -23, 31, 24], [-74, -17, 25, 18],
    [65, -21, 26, 22], [95, -33, 23, 34], [-99, -43, 23, 20], [74, -44, 21, 23]]) {
    ctx.fillStyle = '#c1b995'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#6a725f'; ctx.fillRect(x + 8, y + 9, 5, 8);
  }
  ctx.fillStyle = '#d3c5a1'; ctx.fillRect(-124, 18, 248, 17);
  for (let i = 0; i < 20; i++) ctx.fillRect(-124 + i * 13, 12, 8, 10);
  ctx.fillStyle = '#eee1bd';
  ctx.fillRect(-71, -8, 140, 8); ctx.fillRect(-62, -16, 122, 8);
  ctx.fillRect(-51, -24, 100, 8);
  // A schematic sanctuary and porch, not a claim of an exact reconstruction.
  ctx.fillStyle = '#d5c391'; ctx.fillRect(-43, -86, 86, 62);
  ctx.fillStyle = '#f3e5b7'; ctx.fillRect(-49, -97, 98, 13);
  ctx.fillStyle = '#bba169'; ctx.fillRect(-36, -84, 72, 8);
  ctx.fillStyle = '#f2dc9f'; ctx.fillRect(-25, -77, 50, 53);
  ctx.fillStyle = '#554f40'; ctx.fillRect(-12, -65, 24, 41);
  const door = ctx.createLinearGradient(0, -65, 0, -24);
  door.addColorStop(0, '#a88b49'); door.addColorStop(1, '#e6bd65');
  ctx.fillStyle = door; ctx.fillRect(-8, -63, 16, 39);
  ctx.fillStyle = '#d6ac57';
  for (const px of [-35, 31]) {
    ctx.fillRect(px, -66, 5, 42); ctx.fillRect(px - 3, -70, 11, 5);
    circle(ctx, px + 2.5, -74, 4, '#ead08a');
  }
  ctx.strokeStyle = 'rgba(112,96,61,0.32)'; ctx.lineWidth = 1;
  for (let y = -80; y < -25; y += 12) {
    ctx.beginPath(); ctx.moveTo(-42, y); ctx.lineTo(-26, y);
    ctx.moveTo(26, y); ctx.lineTo(42, y); ctx.stroke();
  }
  ctx.restore();
}
