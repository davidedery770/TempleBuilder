/**
 * verify-draw.mjs — בודק שפונקציות הציור של דמויות מציירות בתוך
 * תיבת ההתנגשות שלהן, ולא מחוצה לה (באג הזזה כפולה ב-Y).
 *
 * הרצה:  node tools/verify-draw.mjs
 */

import { drawPlayer, drawAmalekite, drawScorpion } from '../src/core/art.js';

/** קנבס מדומה שעוקב אחרי translate/scale ורושם את טווח ה-Y שצויר */
function makeCtx() {
  const stack = [];
  let tx = 0, ty = 0, sx = 1, sy = 1;
  const ys = [];

  const note = (y, h = 0) => {
    ys.push(ty + y * sy);
    if (h) ys.push(ty + (y + h) * sy);
  };

  const noop = () => {};
  const grad = { addColorStop: noop };

  return {
    ys,
    save: () => stack.push([tx, ty, sx, sy]),
    restore: () => { [tx, ty, sx, sy] = stack.pop(); },
    translate: (x, y) => { tx += x * sx; ty += y * sy; },
    scale: (x, y) => { sx *= x; sy *= y; },
    rotate: noop,
    beginPath: noop, closePath: noop, fill: noop, stroke: noop,
    clip: noop, fillText: noop, strokeText: noop,
    moveTo: (x, y) => note(y),
    lineTo: (x, y) => note(y),
    quadraticCurveTo: (a, b, x, y) => note(y),
    bezierCurveTo: (a, b, c, d, x, y) => note(y),
    arc: (x, y, r) => { note(y - r); note(y + r); },
    ellipse: (x, y, rx, ry) => { note(y - ry); note(y + ry); },
    fillRect: (x, y, w, h) => note(y, h),
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
    set fillStyle(v) {}, set strokeStyle(v) {}, set lineWidth(v) {},
    set lineCap(v) {}, set globalAlpha(v) {}, set font(v) {},
    set textAlign(v) {}, set textBaseline(v) {}, set direction(v) {},
    set lineJoin(v) {},
  };
}

let failed = 0;

function check(name, fn, boxY, boxH, extra = {}) {
  const ctx = makeCtx();
  fn(ctx);

  const min = Math.min(...ctx.ys);
  const max = Math.max(...ctx.ys);

  // סובלנות: המטה גבוה מהגוף בכוונה, והזוהר וגל האור חורגים מהתיבה.
  // הבדיקה נועדה לתפוס הזזה גסה (כמו הבאג הקודם, שהדמות צוירה ~450px מתחת למקומה),
  // ולא לשפט את האסתטיקה — לכן סובלנות של פי שני גובה התיבה.
  const slack = extra.lightEffect ? boxH * 2.5 : boxH * 2;
  const inside = min >= boxY - slack && max <= boxY + boxH + slack;

  const tag = inside ? '✓' : '✗';
  console.log(`  ${tag} ${name}: Y מצויר ${min.toFixed(0)}..${max.toFixed(0)}, תיבה ${boxY}..${boxY + boxH}`);
  if (!inside) failed++;
}

const Y = 450;   // גובה אופייני בעולם — הבאג היה בולט ככל ש-Y גדול

console.log('\n=== מיקום ציור דמויות ===');

check('בצלאל (idle)',
  (c) => drawPlayer(c, 300, Y, 22, 42, { facing: 1, state: 'idle', animTime: 0.3 }),
  Y, 42);

check('בצלאל (פונה שמאלה, רץ)',
  (c) => drawPlayer(c, 300, Y, 22, 42, { facing: -1, state: 'run', animTime: 0.3 }),
  Y, 42);

check('בצלאל (תוקף)',
  (c) => drawPlayer(c, 300, Y, 22, 42, { facing: 1, state: 'idle', animTime: 0.3, attackTime: 0.5 }),
  // The upgraded staff's intentional light halo extends above the character.
  Y, 42, { lightEffect: true });

check('סייר עמלק',
  (c) => drawAmalekite(c, 600, Y, 24, 44, { facing: 1, state: 'walk', animTime: 1 }),
  Y, 44);

check('עקרב',
  (c) => drawScorpion(c, 800, Y + 22, 26, 20, { facing: 1, animTime: 1 }),
  Y + 22, 20);

console.log(failed === 0 ? '\n  הכל מצויר במקום הנכון.\n' : `\n  ${failed} כשלונות.\n`);
process.exit(failed === 0 ? 0 : 1);
