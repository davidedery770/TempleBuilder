/**
 * art.js — כל הציור במשחק.
 *
 * עקרון: הלוגיקה לעולם אינה מציירת בעצמה. כל ישות קוראת לפונקציה כאן.
 * כשיהיו ספרייטים אמיתיים, מחליפים את גוף הפונקציה בלבד —
 * החתימה נשארת, ושום קובץ אחר לא משתנה.
 */

import { drawMaterial } from './materialArt.js';
import { drawCharacterCostume, drawCharacterHeadwear, drawCharacterProp } from './characterArt.js';
import { niqqud } from './niqqud.js';

// ---------------------------------------------------------------------------
// עזרי ציור כלליים
// ---------------------------------------------------------------------------

/** מלבן עם פינות מעוגלות */
export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** טקסט עברי ממורכז עם קו מתאר — קריא על כל רקע */
export function text(ctx, str, x, y, {
  size = 16,
  color = '#f0e2c0',
  align = 'center',
  baseline = 'middle',
  weight = '600',
  outline = 'rgba(0,0,0,0.75)',
  outlineWidth = 3,
  font = '"Segoe UI", "Arial Hebrew", Arial, sans-serif',
} = {}) {
  str=niqqud(str);
  ctx.save();
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.direction = 'rtl';
  if (outline && outlineWidth > 0) {
    ctx.lineWidth = outlineWidth;
    ctx.strokeStyle = outline;
    ctx.lineJoin = 'round';
    ctx.strokeText(str, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.restore();
}

/** מדידת רוחב טקסט בלי לצייר */
export function measure(ctx, str, size = 16, weight = '600') {
  ctx.save();
  ctx.font = `${weight} ${size}px "Segoe UI", "Arial Hebrew", Arial, sans-serif`;
  const w = ctx.measureText(str).width;
  ctx.restore();
  return w;
}

/** גרדיאנט אנכי — קיצור נפוץ */
export function vGrad(ctx, y0, y1, stops) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [pos, col] of stops) g.addColorStop(pos, col);
  return g;
}

/** עיגול מלא */
export function circle(ctx, x, y, r, color) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

/** זוהר רדיאלי רך — להילות, ניצוצות ואור נרות */
export function glow(ctx, x, y, r, color, alpha = 0.5) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'transparent');
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

/**
 * רעש דטרמיניסטי לפי קואורדינטה — מחזיר 0..1.
 */
export function hashNoise(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

// ---------------------------------------------------------------------------
// השחקן — בצלאל (עיצוב משודרג)
// ---------------------------------------------------------------------------

/**
 * מצייר את בצלאל עם דגש על צבעי תכלת-מלכותיים, פרופורציות משופרות ואנימציה זורמת.
 */
export function drawPlayer(ctx, x, y, w, h, s) {
  const { facing = 1, state = 'idle', animTime = 0, attackTime = 0 } = s;
  const character = s.character || {};

  ctx.save();
  const BODY_SCALE = 1.18;
  ctx.translate(x + w / 2, y + h);
  ctx.scale(BODY_SCALE, BODY_SCALE);
  ctx.translate(-(x + w / 2), -(y + h));
  
  ctx.translate(x + w / 2, 0);
  ctx.scale(facing, 1);
  ctx.translate(-w / 2, 0);

  const cx = w / 2;

  // --- תנודות אנימציה משופרות ---
  let bob = 0;         
  let legSwing = 0;    
  let armSwing = 0;    

  if (state === 'run') {
    bob = Math.sin(animTime * 14) * 1.8;
    legSwing = Math.sin(animTime * 14) * 6;
    armSwing = -Math.sin(animTime * 14) * 5;
  } else if (state === 'idle') {
    bob = Math.sin(animTime * 3) * 1.0;
    armSwing = Math.sin(animTime * 3) * 1.2;
  } else if (state === 'jump') {
    legSwing = 3.5;
    armSwing = -6;
  } else if (state === 'fall') {
    legSwing = -2.5;
    armSwing = 6;
  }

  const crouch = state === 'crouch';
  const bodyTop = y + (crouch ? h * 0.32 : h * 0.22) + bob;
  const bodyBot = y + h * 0.70;
  const headR = w * 0.30;
  const headY = bodyTop - headR * 0.75;


  const ink = 'rgba(46,30,18,0.6)';

  // --- רגליים עם סנדלים ---
  ctx.lineCap = 'round';
  const legY = crouch ? y + h * 0.80 : y + h;
  for (const [dx, swing] of [[-2, legSwing], [2, -legSwing]]) {
    ctx.strokeStyle = ink; ctx.lineWidth = Math.max(3.5, w * 0.15) + 1.4;
    ctx.beginPath(); ctx.moveTo(cx + dx, bodyBot); ctx.lineTo(cx + dx + swing, legY - 2); ctx.stroke();
    ctx.strokeStyle = '#c99468'; ctx.lineWidth = Math.max(3.5, w * 0.15);
    ctx.beginPath(); ctx.moveTo(cx + dx, bodyBot); ctx.lineTo(cx + dx + swing, legY - 2); ctx.stroke();
    ctx.fillStyle = '#6e4a2c';
    ctx.beginPath(); ctx.ellipse(cx + dx + swing + 1.5, legY - 1, w * 0.16, 1.8, 0, 0, Math.PI * 2); ctx.fill();
  }

  // --- גלימה: מתרחבת מטה, שוליים מעוגלים, מתאר וקפלים ---
  const robeBot = bodyBot + h * 0.04;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.27, bodyTop);
  ctx.lineTo(cx + w * 0.27, bodyTop);
  ctx.quadraticCurveTo(cx + w * 0.33, (bodyTop + robeBot) / 2, cx + w * 0.38, robeBot);
  ctx.quadraticCurveTo(cx, robeBot + h * 0.035, cx - w * 0.38, robeBot);
  ctx.quadraticCurveTo(cx - w * 0.33, (bodyTop + robeBot) / 2, cx - w * 0.27, bodyTop);
  ctx.closePath();
  const base = character.robe || '#f2e5c8';
  const robe = ctx.createLinearGradient(cx - w * 0.38, 0, cx + w * 0.38, 0);
  robe.addColorStop(0, shade(base, -0.2)); robe.addColorStop(0.5, base); robe.addColorStop(1, shade(base, -0.1));
  ctx.fillStyle = robe;
  ctx.fill();
  ctx.strokeStyle = ink; ctx.lineWidth = 1.1; ctx.stroke();
  ctx.strokeStyle = shade(base, -0.24); ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(cx - w * 0.06, bodyTop + h * 0.2); ctx.quadraticCurveTo(cx - w * 0.1, robeBot - h * 0.1, cx - w * 0.16, robeBot - 1); ctx.stroke();

  // --- אבנט תכלת עמוק (סימן ההיכר של בצלאל) ---
  ctx.fillStyle = character.sash || '#1d5a8a';
  ctx.fillRect(cx - w * 0.30, bodyTop + (bodyBot - bodyTop) * 0.50, w * 0.62, Math.max(2.5, h * 0.055));
  drawCharacterCostume(ctx,cx,bodyTop,bodyBot,w,h,character);

  // --- זרוע אחורית ---
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(2.8, w * 0.12) + 1.4;
  ctx.beginPath(); ctx.moveTo(cx - w * 0.14, bodyTop + h * 0.08); ctx.lineTo(cx - w * 0.23 - armSwing, bodyTop + h * 0.30); ctx.stroke();
  ctx.strokeStyle = shade(base, -0.22);
  ctx.lineWidth = Math.max(2.8, w * 0.12);
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.14, bodyTop + h * 0.08);
  ctx.lineTo(cx - w * 0.23 - armSwing, bodyTop + h * 0.30);
  ctx.stroke();

  // --- ראש ---
  ctx.beginPath(); ctx.arc(cx, headY, headR, 0, Math.PI * 2);
  ctx.fillStyle = '#e2b085'; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 1.1; ctx.stroke();

  // כפייה מעוצבת וזורמת יותר על הכתפיים
  ctx.beginPath();
  ctx.moveTo(cx - headR * 1.15, headY + headR * 0.15);
  ctx.quadraticCurveTo(cx - headR * 1.3, headY - headR * 1.35, cx + headR * 0.1, headY - headR * 1.3);
  ctx.quadraticCurveTo(cx + headR * 1.25, headY - headR * 1.05, cx + headR * 0.98, headY - headR * 0.2);
  ctx.lineTo(cx + headR * 0.55, headY - headR * 0.4);     
  ctx.lineTo(cx - headR * 0.35, headY - headR * 0.4);
  ctx.lineTo(cx - headR * 0.92, headY + headR * 1.1);     
  ctx.closePath();
  ctx.fillStyle = character.headColor || (character.veil ? character.robe : '#f5efe1');
  ctx.fill();
  ctx.strokeStyle = ink; ctx.lineWidth = 1; ctx.stroke();

  // פסי תכלת כפולים ומכובדים סביב כיסוי הראש
  ctx.strokeStyle = character.sash || '#1d5a8a';
  ctx.lineWidth = Math.max(1.6, headR * 0.18);
  ctx.beginPath();
  ctx.moveTo(cx - headR * 1.02, headY - headR * 0.35);
  ctx.quadraticCurveTo(cx, headY - headR * 0.78, cx + headR * 0.97, headY - headR * 0.35);
  ctx.stroke();

  // --- פנים מובחנות וברורות ---
  drawCharacterHeadwear(ctx,cx,headY,headR,character);
  const ex1 = cx + headR * 0.10;
  const ex2 = cx + headR * 0.62;
  const ey = headY + headR * 0.04;
  // מצמוץ קצר כל כמה שניות — הדמות נראית חיה גם כשעומדים
  const blinking = (animTime % 3.7) < 0.12;
  for (const ex of [ex1, ex2]) {
    if (blinking) {
      ctx.strokeStyle = '#2a1c12'; ctx.lineWidth = Math.max(1, headR * 0.12);
      ctx.beginPath(); ctx.moveTo(ex - headR * 0.18, ey); ctx.lineTo(ex + headR * 0.18, ey); ctx.stroke();
      continue;
    }
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(ex, ey, headR * 0.20, headR * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
    circle(ctx, ex + headR * 0.06, ey + headR * 0.02, headR * 0.12, '#2a1c12');
    circle(ctx, ex + headR * 0.1, ey - headR * 0.05, headR * 0.045, '#ffffff');
  }
  ctx.globalAlpha = 0.35;
  circle(ctx, cx + headR * 0.72, ey + headR * 0.45, headR * 0.17, '#ff8a8a');
  ctx.globalAlpha = 1;

  // גבות מביעות ריכוז
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#3a2415';
  ctx.lineWidth = Math.max(1.2, headR * 0.14);
  ctx.beginPath();
  ctx.moveTo(ex1 - headR * 0.18, ey - headR * 0.32);
  ctx.lineTo(ex1 + headR * 0.18, ey - headR * 0.38);
  ctx.moveTo(ex2 - headR * 0.16, ey - headR * 0.38);
  ctx.lineTo(ex2 + headR * 0.20, ey - headR * 0.32);
  ctx.stroke();

  // אף עדין
  ctx.strokeStyle = '#a67548';
  ctx.lineWidth = Math.max(1, headR * 0.11);
  ctx.beginPath();
  ctx.moveTo(cx + headR * 0.90, ey + headR * 0.08);
  ctx.lineTo(cx + headR * 1.04, ey + headR * 0.42);
  ctx.lineTo(cx + headR * 0.84, ey + headR * 0.46);
  ctx.stroke();

  // חיוך עדין של חוכמת מלאכה
  ctx.strokeStyle = '#7a3a22';
  ctx.lineWidth = Math.max(1, headR * 0.11);
  ctx.beginPath();
  ctx.arc(cx + headR * 0.52, ey + headR * 0.42, headR * 0.30, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  // אוזן
  circle(ctx, cx - headR * 0.82, ey + headR * 0.22, headR * 0.17, '#c99468');

  // --- זרוע קדמית + מטה אמן ---
  if (character.beard) {
    ctx.fillStyle=character.beard;ctx.beginPath();ctx.moveTo(cx-headR*0.65,headY+headR*0.5);
    ctx.quadraticCurveTo(cx,headY+headR*(character.longBeard?3.2:2),cx+headR*0.85,headY+headR*0.5);ctx.fill();
  }
  const active = attackTime > 0;
  const lift = active ? Math.sin((1 - attackTime) * Math.PI) : 0;   

  const shoulderX = cx + w * 0.16;
  const shoulderY = bodyTop + h * 0.08;
  const handX = shoulderX + w * 0.12 + lift * 8 + armSwing * 0.3;
  const handY = shoulderY + h * 0.20 - lift * 6;

  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(2.8, w * 0.13) + 1.4;
  ctx.beginPath(); ctx.moveTo(shoulderX, shoulderY); ctx.lineTo(handX, handY); ctx.stroke();
  ctx.strokeStyle = shade(base, -0.05);
  ctx.lineWidth = Math.max(2.8, w * 0.13);
  ctx.beginPath();
  ctx.moveTo(shoulderX, shoulderY);
  ctx.lineTo(handX, handY);
  ctx.stroke();
  circle(ctx, handX, handY, Math.max(1.6, w * 0.08), '#e2b085');

  const tilt = active ? lift * 0.55 : (state === 'run' ? Math.sin(animTime * 14) * 0.06 : 0);
  if(character.prop&&character.prop!=='staff'){
    drawCharacterProp(ctx,handX,handY,h,character,attackTime);
    if(lift>0.02)glow(ctx,handX+12,handY-8,18+lift*28,'#fff0a0',lift*0.65);
  }else drawStaff(ctx, handX, handY, tilt, h, lift, animTime);

  ctx.restore();
}

/**
 * מטה האמן המשודרג: עץ מהודר עם שיבוצי אבן נוצצים, ובראשו מנורת אור חכמה פועמת.
 */
function drawStaff(ctx, x, y, tilt, h, power, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);

  const top = -h * 0.80;
  const bot = h * 0.26;

  // המוט המעוצב
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#5c3a1a';
  ctx.lineWidth = 3.2;
  ctx.beginPath(); ctx.moveTo(0, bot); ctx.lineTo(0, top); ctx.stroke();
  ctx.strokeStyle = '#d4aa60';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-0.8, bot); ctx.lineTo(-0.8, top); ctx.stroke();

  // שיבוצי אבן יקרות לאורך המוט (אבני חושן זעירות)
  const stones = ['#2980b9', '#c0392b', '#27ae60'];
  for (let i = 0; i < 3; i++) {
    circle(ctx, 0, top + h * 0.2 + i * h * 0.14, 2.2, stones[i]);
  }

  // זוהר סביב הראש
  glow(ctx, 0, top - 4, 14 + power * 30, '#ffe57f', 0.35 + power * 0.55);

  // ראש המטה
  ctx.strokeStyle = '#f1c40f';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-6, top - 4);
  ctx.quadraticCurveTo(-6, top + 2, 0, top + 2);
  ctx.quadraticCurveTo(6, top + 2, 6, top - 4);
  ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, top + 2); ctx.lineTo(0, top - 6); ctx.stroke();

  const flick = 0.82 + Math.sin(t * 10) * 0.18;
  ctx.fillStyle = '#ffca28';
  for (const dx of [-5.5, -2.8, 0, 2.8, 5.5]) {
    ctx.beginPath();
    ctx.ellipse(dx, top - 8, 1.3, 2.5 * flick, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // גל אור מתרחב בזמן הפעלה
  if (power > 0.02) {
    ctx.globalAlpha = power * 0.65;
    ctx.strokeStyle = '#fffde7';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, top - 4, 12 + power * 38, -1.1, 1.1);
    ctx.stroke();
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// יתר הפונקציות נשמרות באופן תואם ומלא (עקרב, עמלק, פריטי איסוף ועוד)
// ---------------------------------------------------------------------------

/** עקרב מדבר */
export function drawScorpion(ctx, x, y, w, h, { facing = 1, animTime = 0, hurt = 0 }) {
  ctx.save();
  ctx.translate(x + w / 2, y + h);
  ctx.scale(facing, 1);
  if (hurt > 0) ctx.globalAlpha = 0.5 + Math.sin(hurt * 40) * 0.5;

  const legPhase = Math.sin(animTime * 12);
  ctx.strokeStyle = '#4a2f1a';
  ctx.lineWidth = 1.6;
  for (let i = -2; i <= 2; i++) {
    if (i === 0) continue;
    const lx = i * w * 0.14;
    const sway = legPhase * (i % 2 === 0 ? 2 : -2);
    ctx.beginPath(); ctx.moveTo(lx, -h * 0.35); ctx.lineTo(lx + sway, 0); ctx.stroke();
  }

  ctx.beginPath();
  ctx.ellipse(0, -h * 0.45, w * 0.34, h * 0.26, 0, 0, Math.PI * 2);
  const body = ctx.createLinearGradient(0, -h * 0.7, 0, -h * 0.2);
  body.addColorStop(0, '#9c5a22'); body.addColorStop(1, '#5e3312');
  ctx.fillStyle = body; ctx.fill();

  ctx.strokeStyle = '#8a4c1c'; ctx.lineWidth = Math.max(2.5, h * 0.12); ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-w * 0.28, -h * 0.5);
  ctx.quadraticCurveTo(-w * 0.62, -h * 0.95, -w * 0.34, -h * 1.05);
  ctx.stroke();
  circle(ctx, -w * 0.32, -h * 1.08, Math.max(1.8, h * 0.09), '#3c2010');

  ctx.strokeStyle = '#8a4c1c'; ctx.lineWidth = 2.2;
  const pinch = Math.abs(legPhase) * 0.3;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(w * 0.28, -h * 0.5);
    ctx.lineTo(w * 0.52, -h * (0.55 + side * pinch * 0.2));
    ctx.stroke();
  }
  circle(ctx, w * 0.14, -h * 0.56, 1.4, '#ffd24a');
  ctx.restore();
}

/** סייר עמלק */
export function drawAmalekite(ctx, x, y, w, h, { facing = 1, state = 'walk', animTime = 0, hurt = 0 }) {
  ctx.save();
  ctx.translate(x + w / 2, 0);
  ctx.scale(facing, 1);
  ctx.translate(-w / 2, 0);

  if (hurt > 0) ctx.globalAlpha = 0.5 + Math.sin(hurt * 40) * 0.5;

  const cx = w / 2;
  const charging = state === 'charge';
  const speed = charging ? 20 : 9;
  const swing = Math.sin(animTime * speed);

  const bodyTop = y + h * 0.26;
  const bodyBot = y + h * 0.68;
  const headR = w * 0.19;

  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.beginPath(); ctx.ellipse(cx, y + h - 1, w * 0.34, 3, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#000'; ctx.fill();
  ctx.restore();

  ctx.strokeStyle = '#5c4126'; ctx.lineWidth = Math.max(3, w * 0.13); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx - 2, bodyBot); ctx.lineTo(cx - 2 + swing * 5, y + h - 1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 2, bodyBot); ctx.lineTo(cx + 2 - swing * 5, y + h - 1); ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - w * 0.27, bodyTop); ctx.lineTo(cx + w * 0.27, bodyTop);
  ctx.lineTo(cx + w * 0.30, bodyBot); ctx.lineTo(cx - w * 0.30, bodyBot);
  ctx.closePath();
  const armor = ctx.createLinearGradient(0, bodyTop, 0, bodyBot);
  armor.addColorStop(0, charging ? '#8e3a2a' : '#6b4330');
  armor.addColorStop(1, '#3d2518');
  ctx.fillStyle = armor; ctx.fill();

  circle(ctx, cx, bodyTop - headR * 0.6, headR, '#b5825a');
  ctx.beginPath();
  ctx.arc(cx, bodyTop - headR * 0.6, headR * 1.08, Math.PI, Math.PI * 2);
  ctx.fillStyle = '#7a2f22'; ctx.fill();
  circle(ctx, cx + headR * 0.36, bodyTop - headR * 0.55, Math.max(1, headR * 0.16), charging ? '#ff5a3c' : '#2a1c12');

  const armAngle = charging ? -0.5 + swing * 0.35 : 0.5 + swing * 0.3;
  const sx = cx + w * 0.2, sy = bodyTop + h * 0.08;
  const hx = sx + Math.cos(armAngle) * h * 0.22;
  const hy = sy + Math.sin(armAngle) * h * 0.22;

  ctx.strokeStyle = '#a8784f'; ctx.lineWidth = Math.max(2.5, w * 0.11);
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(hx, hy); ctx.stroke();

  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(armAngle - 0.3);
  ctx.strokeStyle = '#c9ccd4'; ctx.lineWidth = 2.8;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(h * 0.18, -h * 0.06, h * 0.30, -h * 0.20); ctx.stroke();
  ctx.restore();

  ctx.restore();
}

/** פריטי איסוף, תרומות וכלים */
const GLOW_BY_KIND = {
  gold: '#fff3b0', silver: '#ffffff', bronze: '#f0c08a',
  techelet: '#a8d8ff', argaman: '#e0a8ff', tolaat: '#ffa8a0',
  shesh: '#ffffff', goat: '#d8c8b8', rams: '#ffb0a0',
  tachash: '#a8f0f0', shittim: '#f0d0a0', oil: '#f0e4a0',
  spices: '#ffd0a0', shoham: '#b0ffe0', miluim: '#ffb0c0',
};

export function drawDonation(ctx, x, y, size, kind, t) {
  const bob = Math.sin(t * 2.6) * 2.5;
  const cx = x + size / 2, cy = y + size / 2 + bob;
  glow(ctx, cx, cy, size * 1.2, GLOW_BY_KIND[kind] || '#fff3b0', 0.26);
  drawMaterial(ctx, kind, cx, cy, size * 1.15);

  const tw = Math.sin(t * 3 + x * 0.05);
  if (tw > 0.6) {
    ctx.save();
    ctx.globalAlpha = (tw - 0.6) * 2.5;
    circle(ctx, cx + size * 0.3, cy - size * 0.3, Math.max(1, size * 0.07), '#ffffff');
    ctx.restore();
  }
}

export function drawPomegranate(ctx, x, y, size, t) {
  const bob = Math.sin(t * 2.2) * 2;
  const cx = x + size / 2, cy = y + size / 2 + bob, r = size * 0.4;
  glow(ctx, cx, cy, size, '#ff6b6b', 0.18);
  circle(ctx, cx, cy, r, '#c0392b');
  ctx.save();
  ctx.globalAlpha = 0.35;
  circle(ctx, cx - r * 0.3, cy - r * 0.3, r * 0.35, '#ff8a7a');
  ctx.restore();
  ctx.strokeStyle = '#7d4a1c'; ctx.lineWidth = 1.6;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.9); ctx.lineTo(cx + i * r * 0.35, cy - r * 1.4); ctx.stroke();
  }
}

export function drawRelic(ctx, x, y, size, t, relicId = '') {
  const bob = Math.sin(t * 1.8) * 3;
  const cx = x + size / 2, cy = y + size / 2 + bob;
  const pulse = 0.4 + Math.sin(t * 3) * 0.2;
  glow(ctx, cx, cy, size * 1.7, '#ffd964', pulse);

  for (let i = 0; i < 6; i++) {
    const a = t * 1.4 + (i / 6) * Math.PI * 2;
    circle(ctx, cx + Math.cos(a) * size * 0.85, cy + Math.sin(a) * size * 0.42, 1.8, '#fff3b0');
  }

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.sin(t * 1.2) * 0.08);
  if (relicId === 'tavnit') drawScroll(ctx, size * 1.15);
  else if (relicId === 'stones12') drawStonePile(ctx, size * 1.1);
  else drawStar(ctx, size);
  ctx.restore();
}

function drawStonePile(ctx, s) {
  const stones = [
    [-s * 0.22, s * 0.12, s * 0.2, s * 0.14],
    [s * 0.1,   s * 0.14, s * 0.18, s * 0.12],
    [-s * 0.02, -s * 0.02, s * 0.2, s * 0.14],
    [-s * 0.28, -s * 0.08, s * 0.14, s * 0.1],
    [s * 0.18,  -s * 0.06, s * 0.14, s * 0.1],
  ];
  for (const [x, y, w, h] of stones) {
    ctx.fillStyle = '#8a9a8a';
    ctx.beginPath(); ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath(); ctx.ellipse(x - w * 0.25, y - h * 0.3, w * 0.35, h * 0.3, 0, 0, Math.PI * 2); ctx.fill();
  }
}

export function drawTribeStone(ctx, x, y, size, t) {
  const bob = Math.sin(t * 2.4) * 2.2;
  const cx = x + size / 2, cy = y + size / 2 + bob;
  const rx = size * 0.42, ry = size * 0.34;
  glow(ctx, cx, cy, size * 1.15, '#a8e8ff', 0.22);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.sin(t * 1.1) * 0.06);

  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath(); ctx.ellipse(1, ry * 0.85, rx * 0.9, ry * 0.35, 0, 0, Math.PI * 2); ctx.fill();

  const g = ctx.createLinearGradient(-rx, -ry, rx, ry);
  g.addColorStop(0, '#c8d4c8'); g.addColorStop(0.45, '#8a9a8a'); g.addColorStop(1, '#5a6a5a');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.beginPath(); ctx.ellipse(-rx * 0.3, -ry * 0.35, rx * 0.35, ry * 0.28, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawScroll(ctx, s) {
  const w = s * 0.62, h = s * 0.78;
  ctx.fillStyle = '#f3e4b8'; ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = '#b89858'; ctx.lineWidth = 1; ctx.strokeRect(-w / 2, -h / 2, w, h);

  ctx.strokeStyle = '#8a6a38'; ctx.lineWidth = 1.2;
  for (let i = 0; i < 4; i++) {
    const ly = -h * 0.28 + i * h * 0.19;
    ctx.beginPath(); ctx.moveTo(-w * 0.34, ly); ctx.lineTo(w * (i % 2 ? 0.18 : 0.34), ly); ctx.stroke();
  }

  for (const ry of [-h / 2, h / 2]) {
    ctx.fillStyle = '#7a5428'; ctx.fillRect(-w * 0.66, ry - 3, w * 1.32, 6);
    circle(ctx, -w * 0.66, ry, 4, '#e8b84a');
    circle(ctx, w * 0.66, ry, 4, '#e8b84a');
  }
}

function drawStar(ctx, s) {
  ctx.beginPath();
  const R = s * 0.55, r = s * 0.24;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
    const rad = i % 2 === 0 ? R : r;
    ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * rad, Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffd24a'; ctx.fill();
  ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 1.2; ctx.stroke();
}

export function drawAltar(ctx, x, y, w, h, lit, t) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, lit ? '#9a8156' : '#6e6355');
  g.addColorStop(1, lit ? '#5f4e30' : '#443d33');
  ctx.fillStyle = g; ctx.fillRect(x, y + h * 0.3, w, h * 0.7);

  ctx.fillStyle = lit ? '#8a7446' : '#5a5046';
  ctx.fillRect(x - 2, y + h * 0.18, 6, h * 0.2);
  ctx.fillRect(x + w - 4, y + h * 0.18, 6, h * 0.2);

  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
  for (let i = 1; i < 3; i++) {
    const ly = y + h * 0.3 + (h * 0.7) * (i / 3);
    ctx.beginPath(); ctx.moveTo(x, ly); ctx.lineTo(x + w, ly); ctx.stroke();
  }

  if (lit) {
    const fh = h * (0.5 + Math.sin(t * 7) * 0.1);
    const fx = x + w / 2, fy = y + h * 0.3;
    glow(ctx, fx, fy - fh * 0.4, fh * 1.6, '#ff9a3c', 0.42);

    ctx.beginPath();
    ctx.moveTo(fx - w * 0.22, fy);
    ctx.quadraticCurveTo(fx - w * 0.1, fy - fh * 0.6, fx, fy - fh);
    ctx.quadraticCurveTo(fx + w * 0.1, fy - fh * 0.6, fx + w * 0.22, fy);
    ctx.closePath();
    const flame = ctx.createLinearGradient(0, fy, 0, fy - fh);
    flame.addColorStop(0, '#ff5722'); flame.addColorStop(0.5, '#ffa726'); flame.addColorStop(1, '#fff176');
    ctx.fillStyle = flame; ctx.fill();
  }
}

export function drawExitGate(ctx, x, y, w, h, t) {
  ctx.fillStyle = '#8a6a3a'; ctx.fillRect(x, y, 8, h); ctx.fillRect(x + w - 8, y, 8, h);
  ctx.fillStyle = '#c0c8d4'; ctx.fillRect(x - 2, y + h - 7, 12, 7); ctx.fillRect(x + w - 10, y + h - 7, 12, 7);
  ctx.fillStyle = '#9a7a44'; ctx.fillRect(x - 3, y, w + 6, 7);

  ctx.save();
  ctx.globalAlpha = 0.55;
  const steps = 10;
  ctx.beginPath(); ctx.moveTo(x + 8, y + 7);
  for (let i = 0; i <= steps; i++) {
    const px = x + 8 + ((w - 16) * i) / steps;
    const py = y + 7 + Math.sin(t * 2 + i * 0.6) * 4;
    ctx.lineTo(px, py);
  }
  ctx.lineTo(x + w - 8, y + h); ctx.lineTo(x + 8, y + h); ctx.closePath();
  const curtain = ctx.createLinearGradient(0, y, 0, y + h);
  curtain.addColorStop(0, '#2f6f9e'); curtain.addColorStop(0.5, '#7a3f8a'); curtain.addColorStop(1, '#8a2f2f');
  ctx.fillStyle = curtain; ctx.fill();
  ctx.restore();

  glow(ctx, x + w / 2, y + h / 2, w * 0.9, '#ffd964', 0.18 + Math.sin(t * 3) * 0.08);
}

/**
 * דמות במשחק (משה, עלי, חנה, שלמה, צופים…): פנים ידידותיות שממצמצות, ידיים,
 * סנדלים, גלימה עם קפלים ומתאר כהה שבולט על כל רקע, ולבוש לפי תפקיד.
 * הגודל (w×h) לא משתנה — השלבים לא זזים. התלבושות סמליות, לא דמות היסטורית.
 *   facing — לאן הדמות מביטה (‎-1/1), כדי שתסתכל אל השחקן
 *   wave   — 0..1, נפנוף שלום כשהשחקן מתקרב
 */
export function drawNPC(ctx, x, y, w, h, {
  robe = '#e8e2d0', sash = '#c9a227', t = 0, glowColor = '#ffe9a8',
  beard = true, veil = false, role = '', facing = 1, wave = 0, beardColor = null,
}) {
  const cx = x + w / 2, breath = Math.sin(t * 1.6) * 0.8;
  const priest = role === 'priest' || role === 'highPriest';
  const royal = role === 'royal' || role === 'warriorKing';
  const watch = role === 'watchman';
  const ink = 'rgba(46,30,18,0.6)', lw = Math.max(0.6, h / 50);
  glow(ctx, cx, y + h * 0.45, w * 1.4, glowColor, 0.14 + Math.sin(t * 2) * 0.04);

  const robeTop = y + h * 0.37 + breath, hem = y + h * 0.93;
  const headR = w * 0.27, headY = robeTop - headR * 0.82;
  const fx = facing * headR * 0.16;                      // the face turns slightly toward the player
  const robeColor = priest ? '#fbf6e8' : robe;

  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // צל ורגליים
  ctx.fillStyle = 'rgba(0,0,0,0.14)';
  ctx.beginPath(); ctx.ellipse(cx, y + h, w * 0.42, h * 0.035, 0, 0, Math.PI * 2); ctx.fill();
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#7a5434';
    ctx.beginPath(); ctx.ellipse(cx + s * w * 0.15 + facing * 2, y + h - h * 0.025, w * 0.13, h * 0.03, 0, 0, Math.PI * 2); ctx.fill();
  }
  // גלימת מלך מאחור
  if (royal) {
    ctx.fillStyle = role === 'warriorKing' ? '#8a3138' : '#6d4483';
    ctx.beginPath(); ctx.moveTo(cx - w * 0.28, robeTop + 2); ctx.lineTo(cx + w * 0.28, robeTop + 2);
    ctx.lineTo(cx + w * 0.5, hem + 1); ctx.lineTo(cx - w * 0.5, hem + 1); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = lw; ctx.stroke();
  }
  // הזרוע האחורית (מאחורי הגוף)
  const shoulderY = robeTop + h * 0.07;
  limb(ctx, cx - facing * w * 0.2, shoulderY, cx - facing * w * 0.3, shoulderY + h * 0.22 + Math.sin(t * 1.6) * 1.2, shade(robeColor, -0.18), w, ink, lw);

  // הגלימה: מתרחבת מטה, שוליים מעוגלים, מתאר
  const mid = (robeTop + hem) / 2;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.24, robeTop); ctx.lineTo(cx + w * 0.24, robeTop);
  ctx.quadraticCurveTo(cx + w * 0.34, mid, cx + w * 0.42, hem);
  ctx.quadraticCurveTo(cx, hem + h * 0.035, cx - w * 0.42, hem);
  ctx.quadraticCurveTo(cx - w * 0.34, mid, cx - w * 0.24, robeTop);
  ctx.closePath();
  const g = ctx.createLinearGradient(cx - w * 0.4, 0, cx + w * 0.4, 0);
  g.addColorStop(0, shade(robeColor, -0.2)); g.addColorStop(0.45, robeColor); g.addColorStop(1, shade(robeColor, -0.12));
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = ink; ctx.lineWidth = lw; ctx.stroke();
  // קפלים ופס שוליים
  ctx.strokeStyle = shade(robeColor, -0.22); ctx.lineWidth = lw * 0.8;
  for (const k of [-0.13, 0.13]) {
    ctx.beginPath(); ctx.moveTo(cx + w * k * 0.7, robeTop + h * 0.2); ctx.quadraticCurveTo(cx + w * k * 1.2, mid + h * 0.1, cx + w * k * 1.6, hem - 1); ctx.stroke();
  }
  ctx.strokeStyle = sash; ctx.lineWidth = Math.max(1, h * 0.03);
  ctx.beginPath(); ctx.moveTo(cx - w * 0.4, hem - h * 0.025); ctx.quadraticCurveTo(cx, hem + h * 0.01, cx + w * 0.4, hem - h * 0.025); ctx.stroke();

  // לבוש לפי תפקיד: אפוד וחושן לכהן גדול, שריון קשקשים לצופה
  if (role === 'highPriest') {
    ctx.fillStyle = '#4a7fb0'; ctx.fillRect(cx - w * 0.27, robeTop + h * 0.04, w * 0.54, h * 0.4);
    ctx.fillStyle = '#d6ae45'; ctx.fillRect(cx - w * 0.2, robeTop + h * 0.07, w * 0.4, h * 0.17);
    const gems = ['#d3473c', '#64b779', '#64a9de', '#dca741'];
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
      ctx.fillStyle = gems[(r * 3 + c) % 4]; ctx.fillRect(cx - w * 0.15 + c * w * 0.11, robeTop + h * 0.09 + r * h * 0.065, w * 0.08, h * 0.05);
    }
  } else if (watch) {
    ctx.fillStyle = '#b08850'; ctx.fillRect(cx - w * 0.22, robeTop + h * 0.03, w * 0.44, h * 0.22);
    ctx.strokeStyle = '#7d5f35'; ctx.lineWidth = lw * 0.7;
    for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(cx - w * 0.2, robeTop + h * 0.03 + i * h * 0.055); ctx.lineTo(cx + w * 0.2, robeTop + h * 0.03 + i * h * 0.055); ctx.stroke(); }
  }
  // אבנט
  ctx.fillStyle = sash;
  ctx.fillRect(cx - w * 0.27, robeTop + (hem - robeTop) * 0.36, w * 0.54, Math.max(2, h * 0.05));
  ctx.fillRect(cx + facing * w * 0.12, robeTop + (hem - robeTop) * 0.36, w * 0.07, h * 0.14);

  // צוואר וראש
  ctx.fillStyle = '#c8956a'; ctx.fillRect(cx - headR * 0.35, headY + headR * 0.6, headR * 0.7, headR * 0.6);
  ctx.beginPath(); ctx.arc(cx, headY, headR, 0, Math.PI * 2);
  ctx.fillStyle = '#e2b085'; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = lw; ctx.stroke();

  // זקן (לפני כיסוי הראש, כדי שהברדס ייפול עליו)
  if (beard) {
    ctx.fillStyle = beardColor || '#ece6d8';
    ctx.beginPath();
    ctx.moveTo(cx - headR * 0.88 + fx, headY + headR * 0.15);
    ctx.quadraticCurveTo(cx + fx, headY + headR * 2.2, cx + headR * 0.88 + fx, headY + headR * 0.15);
    ctx.quadraticCurveTo(cx + fx, headY + headR * 0.75, cx - headR * 0.88 + fx, headY + headR * 0.15);
    ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.7; ctx.stroke();
  }

  // כיסוי ראש לפי תפקיד
  if (priest) {
    ctx.fillStyle = '#fffaf0';
    ctx.beginPath(); ctx.ellipse(cx, headY - headR * 0.62, headR * 1.08, headR * 0.62, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.8; ctx.stroke();
    ctx.strokeStyle = '#d9d0bc'; ctx.lineWidth = lw * 0.7;
    for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.moveTo(cx - headR, headY - headR * (0.45 + i * 0.3)); ctx.quadraticCurveTo(cx, headY - headR * (0.25 + i * 0.3), cx + headR, headY - headR * (0.5 + i * 0.3)); ctx.stroke(); }
    if (role === 'highPriest') { ctx.fillStyle = '#e0b84a'; ctx.fillRect(cx - headR * 0.7, headY - headR * 0.55, headR * 1.4, headR * 0.26); }
  } else if (royal) {
    ctx.fillStyle = '#5a3a26';
    ctx.beginPath(); ctx.arc(cx, headY - headR * 0.15, headR * 1.02, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
    ctx.fillStyle = '#e6b83e';
    ctx.beginPath(); ctx.moveTo(cx - headR * 0.95, headY - headR * 0.55); ctx.lineTo(cx - headR, headY - headR * 1.45);
    ctx.lineTo(cx - headR * 0.45, headY - headR * 1.05); ctx.lineTo(cx, headY - headR * 1.6); ctx.lineTo(cx + headR * 0.45, headY - headR * 1.05);
    ctx.lineTo(cx + headR, headY - headR * 1.45); ctx.lineTo(cx + headR * 0.95, headY - headR * 0.55); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#9c7520'; ctx.lineWidth = lw * 0.8; ctx.stroke();
    circle(ctx, cx, headY - headR * 0.85, headR * 0.17, '#d04a5a');
  } else if (watch) {
    ctx.fillStyle = '#b8894a';
    ctx.beginPath(); ctx.arc(cx, headY - headR * 0.1, headR * 1.08, Math.PI, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = lw; ctx.stroke();
    ctx.fillStyle = '#8a3b2e'; ctx.fillRect(cx - headR * 0.15, headY - headR * 1.55, headR * 0.3, headR * 0.5);
    ctx.fillStyle = '#9a7038'; ctx.fillRect(cx - headR * 1.12, headY - headR * 0.18, headR * 2.24, headR * 0.22);
  } else {
    // ברדס (לזקנים ולרוב הדמויות) או צעיף (לנשים): נופל על הכתפיים משני הצדדים
    ctx.fillStyle = veil ? shade(robe, 0.25) : shade(robe, -0.1);
    ctx.beginPath();
    ctx.moveTo(cx - headR * 1.12, headY + headR * 1.25);
    ctx.quadraticCurveTo(cx - headR * 1.35, headY - headR * 1.25, cx, headY - headR * 1.3);
    ctx.quadraticCurveTo(cx + headR * 1.35, headY - headR * 1.25, cx + headR * 1.12, headY + headR * 1.25);
    ctx.lineTo(cx + headR * 0.82, headY + headR * 0.2);
    ctx.quadraticCurveTo(cx, headY - headR * 0.95, cx - headR * 0.82, headY + headR * 0.2);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = lw; ctx.stroke();
    if (!beard && !veil) {   // young: a little hair under the hood
      ctx.fillStyle = '#5a3a26';
      ctx.beginPath(); ctx.arc(cx, headY - headR * 0.35, headR * 0.72, Math.PI * 1.1, Math.PI * 1.9); ctx.fill();
    }
  }

  // פנים: עיניים שממצמצות, גבות, אף קטן, חיוך ולחיים ורודות
  const eyeY = headY - headR * 0.02, gap = headR * 0.38;
  const blink = ((t * 0.9 + x * 0.013) % 4) < 0.13;
  for (const s of [-1, 1]) {
    const ex = cx + fx + s * gap;
    if (blink) {
      ctx.strokeStyle = '#3a2618'; ctx.lineWidth = lw * 0.9;
      ctx.beginPath(); ctx.moveTo(ex - headR * 0.16, eyeY); ctx.lineTo(ex + headR * 0.16, eyeY); ctx.stroke();
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(ex, eyeY, headR * 0.19, headR * 0.24, 0, 0, Math.PI * 2); ctx.fill();
      circle(ctx, ex + facing * headR * 0.06, eyeY + headR * 0.03, headR * 0.12, '#2c1d12');
      circle(ctx, ex + facing * headR * 0.09, eyeY - headR * 0.04, headR * 0.04, '#ffffff');
    }
    ctx.strokeStyle = beard ? '#d8d0c0' : '#4a3020'; ctx.lineWidth = lw * 0.9;
    ctx.beginPath(); ctx.moveTo(ex - headR * 0.17, eyeY - headR * 0.36); ctx.lineTo(ex + headR * 0.17, eyeY - headR * 0.4); ctx.stroke();
  }
  ctx.globalAlpha = 0.35;
  circle(ctx, cx + fx - gap * 1.25, eyeY + headR * 0.38, headR * 0.17, '#ff8a8a');
  circle(ctx, cx + fx + gap * 1.25, eyeY + headR * 0.38, headR * 0.17, '#ff8a8a');
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#b5774c'; ctx.lineWidth = lw * 0.8;
  ctx.beginPath(); ctx.moveTo(cx + fx + facing * headR * 0.05, eyeY + headR * 0.12); ctx.lineTo(cx + fx + facing * headR * 0.16, eyeY + headR * 0.36); ctx.stroke();
  if (!beard) {
    ctx.strokeStyle = '#8a3b26'; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.arc(cx + fx, eyeY + headR * 0.42, headR * 0.26, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  } else {
    ctx.strokeStyle = '#8a5a3a'; ctx.lineWidth = lw * 0.8;
    ctx.beginPath(); ctx.arc(cx + fx, eyeY + headR * 0.45, headR * 0.2, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
  }

  // הזרוע הקדמית: מנופפת לשלום כשהשחקן קרוב
  const sx = cx + facing * w * 0.2;
  const raise = Math.max(0, Math.min(1, wave));
  const swing = Math.sin(t * 9) * 0.35 * raise;
  const handX = sx + facing * w * (0.12 + 0.12 * raise) + Math.sin(swing) * w * 0.15;
  const handY = shoulderY + h * (0.22 - 0.42 * raise) + Math.sin(t * 1.6 + 1) * 1.2 * (1 - raise);
  limb(ctx, sx, shoulderY, handX, handY, shade(robeColor, -0.06), w, ink, lw);
  ctx.restore();
}

/** שרוול עם יד בקצה */
function limb(ctx, x0, y0, x1, y1, sleeve, w, ink, lw) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = ink; ctx.lineWidth = Math.max(3, w * 0.17) + lw * 1.4;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.strokeStyle = sleeve; ctx.lineWidth = Math.max(3, w * 0.17);
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  circle(ctx, x1, y1, Math.max(1.6, w * 0.075), '#e2b085');
}

export function shade(hex, amt) {
  const h = hex.replace('#', '');
  const num = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  let r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
  if (amt >= 0) {
    r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt;
  } else {
    r *= (1 + amt); g *= (1 + amt); b *= (1 + amt);
  }
  const to = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

export { drawMaterial };