/**
 * materialArt.js — אייקונים של 15 מצרכי המשכן.
 *
 * כל אייקון מצויר בתיבה של 20×20 סביב הראשית (‎-10..10) ומוקטן/מוגדל
 * לפי הגודל המבוקש. אותה פונקציה משמשת פריט איסוף בעולם ותא ב-HUD.
 *
 * עצמאי בכוונה (לא מייבא את art.js), כדי שאפשר יהיה להחליף אותו בתמונות
 * אמיתיות בלי לגעת בשאר.
 */

function circ(ctx, x, y, r, color) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function poly(ctx, pts, fill, stroke, lw = 1) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

function vGrad(ctx, y0, y1, c0, c1) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, c0);
  g.addColorStop(1, c1);
  return g;
}

// ---- מתכות: מטיל בעל שלוש פאות ----
function ingot(ctx, light, mid, dark) {
  poly(ctx, [[-5, -7], [5, -7], [7, -3], [-7, -3]], light, dark);          // פאה עליונה
  poly(ctx, [[-7, -3], [7, -3], [9, 6], [-9, 6]], vGrad(ctx, -3, 6, mid, dark), dark);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';                              // ברק
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-5, -1); ctx.lineTo(1, -1); ctx.stroke();
}

// ---- חוטי צבע: כדור צמר ----
function skein(ctx, light, dark) {
  circ(ctx, 0, 0, 8, dark);
  circ(ctx, -1, -1, 7, light);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.1;
  for (const a of [0.5, 1.5, 2.5]) {
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 3.2, a, 0, Math.PI * 2);
    ctx.stroke();
  }
  circ(ctx, -3, -3, 1.6, 'rgba(255,255,255,0.5)');
}

// ---- שש: בד פשתן מקופל ----
function linen(ctx) {
  poly(ctx, [[-8, -6], [8, -6], [8, 6], [-8, 6]], vGrad(ctx, -6, 6, '#fbf6ea', '#d8ccb0'), '#a89c80');
  ctx.strokeStyle = '#b8ac90';
  ctx.lineWidth = 1;
  for (const y of [-2, 2]) {
    ctx.beginPath(); ctx.moveTo(-8, y); ctx.lineTo(8, y); ctx.stroke();
  }
  ctx.strokeStyle = '#e8dfc8';                                             // פרנזים
  for (let x = -7; x <= 7; x += 3.5) {
    ctx.beginPath(); ctx.moveTo(x, 6); ctx.lineTo(x, 9); ctx.stroke();
  }
}

// ---- עזים: ציצת צמר כהה ----
function wool(ctx) {
  const blobs = [[-4, 2, 5], [3, 3, 5.2], [0, -2, 5.6], [-5, -3, 3.6], [5, -2, 3.6]];
  for (const [x, y, r] of blobs) circ(ctx, x, y, r, '#3a2c26');
  for (const [x, y, r] of blobs) circ(ctx, x - 1, y - 1, r * 0.55, '#6a5448');
}

// ---- עורות: עור מתוח עם תפרים ----
function hide(ctx, light, dark) {
  ctx.beginPath();
  ctx.moveTo(-8, -6);
  ctx.quadraticCurveTo(-4, -8, 0, -6);
  ctx.quadraticCurveTo(4, -8, 8, -6);
  ctx.quadraticCurveTo(10, 0, 8, 6);
  ctx.quadraticCurveTo(4, 8, 0, 6);
  ctx.quadraticCurveTo(-4, 8, -8, 6);
  ctx.quadraticCurveTo(-10, 0, -8, -6);
  ctx.fillStyle = vGrad(ctx, -8, 8, light, dark);
  ctx.fill();
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.setLineDash([2, 2]);
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.stroke();
  ctx.setLineDash([]);
}

// ---- עצי שיטים: שני קרשים ----
function planks(ctx) {
  for (const [y, rot] of [[-3.5, -0.08], [3.5, 0.07]]) {
    ctx.save();
    ctx.translate(0, y);
    ctx.rotate(rot);
    ctx.fillStyle = vGrad(ctx, -3, 3, '#c8935a', '#8a5a2a');
    ctx.fillRect(-9, -3, 18, 6);
    ctx.strokeStyle = 'rgba(70,40,15,0.6)';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(-9, -3, 18, 6);
    ctx.beginPath(); ctx.moveTo(-6, -1); ctx.lineTo(4, -1); ctx.moveTo(-3, 1.2); ctx.lineTo(7, 1.2); ctx.stroke();
    ctx.restore();
  }
}

// ---- שמן: כד ----
function jug(ctx) {
  ctx.fillStyle = vGrad(ctx, -4, 9, '#d8c060', '#7a6420');
  ctx.beginPath(); ctx.ellipse(0, 2.5, 6, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(-2.2, -8, 4.4, 5);
  ctx.fillStyle = '#8a7424';
  ctx.fillRect(-3.4, -9, 6.8, 2);
  ctx.strokeStyle = '#7a6420';
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(-6, 0, 3, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
  ctx.beginPath(); ctx.arc(6, 0, 3, Math.PI * 1.5, Math.PI * 2.5); ctx.stroke();
  circ(ctx, -2.5, 0, 1.8, 'rgba(255,255,255,0.45)');
}

// ---- בשמים: קערה עם ערמות ----
function bowl(ctx) {
  for (const [x, w, h, c] of [[-4, 4, 5, '#e08a2a'], [0, 4.4, 6.5, '#c0382e'], [4, 3.8, 4.6, '#e8c040']]) {
    ctx.beginPath();
    ctx.moveTo(x - w, 1); ctx.quadraticCurveTo(x, 1 - h * 1.6, x + w, 1);
    ctx.closePath();
    ctx.fillStyle = c;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(-9, 1);
  ctx.lineTo(9, 1);
  ctx.quadraticCurveTo(8, 9, 0, 9);
  ctx.quadraticCurveTo(-8, 9, -9, 1);
  ctx.fillStyle = vGrad(ctx, 1, 9, '#b8824a', '#6a4220');
  ctx.fill();
  ctx.strokeStyle = '#5a3818';
  ctx.lineWidth = 1;
  ctx.stroke();
}

// ---- אבנים: אבן חן מסותתת ----
function gem(ctx, light, dark) {
  const pts = [[-6, -2], [-3, -7], [3, -7], [6, -2], [0, 8]];
  poly(ctx, pts, vGrad(ctx, -7, 8, light, dark), dark, 1.1);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-6, -2); ctx.lineTo(6, -2);
  ctx.moveTo(-3, -7); ctx.lineTo(-1.5, -2); ctx.lineTo(0, 8);
  ctx.moveTo(3, -7); ctx.lineTo(1.5, -2); ctx.lineTo(0, 8);
  ctx.stroke();
  poly(ctx, [[-3, -7], [3, -7], [1.5, -2], [-1.5, -2]], 'rgba(255,255,255,0.28)');
}

/**
 * מצייר אייקון של מצרך.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} kind    מזהה מתוך MATERIALS
 * @param {number} cx      מרכז X
 * @param {number} cy      מרכז Y
 * @param {number} size    גודל בפיקסלים (קוטר משוער)
 */
export function drawMaterial(ctx, kind, cx, cy, size) {
  ctx.save();
  ctx.translate(cx, cy);
  const k = size / 20;
  ctx.scale(k, k);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  switch (kind) {
    case 'gold':     ingot(ctx, '#fff0a0', '#e8b030', '#9a6a0c'); break;
    case 'silver':   ingot(ctx, '#ffffff', '#c4ccd8', '#7a8698'); break;
    case 'bronze':   ingot(ctx, '#f0b070', '#c0703a', '#7a4018'); break;
    case 'techelet': skein(ctx, '#58a8f0', '#1d5fa6'); break;
    case 'argaman':  skein(ctx, '#b865d8', '#6a2a8a'); break;
    case 'tolaat':   skein(ctx, '#ee6252', '#9a1f1a'); break;
    case 'shesh':    linen(ctx); break;
    case 'goat':     wool(ctx); break;
    case 'rams':     hide(ctx, '#d8584a', '#7a2418'); break;
    case 'tachash':  hide(ctx, '#62c0c8', '#2a6a78'); break;
    case 'shittim':  planks(ctx); break;
    case 'oil':      jug(ctx); break;
    case 'spices':   bowl(ctx); break;
    case 'shoham':   gem(ctx, '#78dcc0', '#2a8a70'); break;
    case 'miluim':   gem(ctx, '#ff7888', '#a81c3a'); break;
    default:         gem(ctx, '#ffe27a', '#b8860b');
  }

  ctx.restore();
}
