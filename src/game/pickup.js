/**
 * pickup.js — פריטי איסוף וחלקיקי האיסוף.
 *
 * עקרון מרכזי מה־GDD: איסוף אף פעם לא עוצר את המשחק.
 * המשוב הוא ויזואלי וקולי בלבד — ניצוץ, צליל, וטקסט מרחף.
 */

import {
  drawDonation, drawPomegranate, drawRelic, drawTribeStone, text, glow, circle,
} from '../core/art.js';
import { getMaterial } from '../data/materials.js';
import { drawGrain } from '../core/natureArt.js';
import { drawLearningIcon } from '../core/learningArt.js';
import { drawOilJug } from '../core/shilohNightArt.js';
import { drawProverbScroll } from '../core/givonArt.js';
import { drawCedarBeam, drawHewnStone } from '../core/lebanonArt.js';
import { drawGoldPomegranate } from '../core/templeArt.js';

/** המצרך של תרומה (ערך, שם וקבוצה מתוך data/materials.js) */
const materialOf = (kind) => getMaterial(kind) || getMaterial('gold');

export class Pickup {
  /**
   * @param {string} type  donation | health | relic | spark | stone
   * @param {number} x
   * @param {number} y
   * @param {object} opts  { kind, relicId, cardId, tribe, stoneIndex }
   */
  constructor(type, x, y, opts = {}) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.size = type === 'relic' ? 28 : type === 'spark' ? 14 : type === 'stone' ? 22 : 20;
    this.w = this.size;
    this.h = this.size;

    this.kind = opts.kind || 'gold';
    this.relicId = opts.relicId || null;
    this.cardId = opts.cardId || null;
    this.tribe = opts.tribe || '';
    this.stoneIndex = opts.stoneIndex ?? -1;
    this.treeId = opts.treeId || null;
    this.text = opts.text || '';       // מגילת משל: הפסוק שמוצג באיסוף
    this.source = opts.source || '';
    // A dormant pickup waits for something (an olive tree, a story beat) before it appears.
    this.dormant = !!this.treeId || !!opts.hidden;

    this.collected = false;
    this._t = Math.random() * 10;   // פאזה אקראית — לא כולם פועמים ביחד
  }

  get hitbox() {
    // תיבה מעט נדיבה — איסוף לא אמור להיות אתגר
    return { x: this.x - 4, y: this.y - 4, w: this.w + 8, h: this.h + 8 };
  }

  /** ערך הניקוד */
  get value() {
    if (this.type === 'donation') return materialOf(this.kind).value;
    if (this.type === 'relic') return 1000;
    if (this.type === 'spark') return 250;
    if (this.type === 'stone') return 200;
    if (this.type === 'grain') return 150;
    if (this.type === 'olive') return 150;
    if (this.type === 'oil') return 100;
    if (this.type === 'proverb') return 150;
    if (this.type === 'cedar' || this.type === 'hewn' || this.type === 'rimon') return 150;
    return 0;
  }

  /** התווית שמוצגת בטקסט המרחף */
  get label() {
    if (this.type === 'donation') return materialOf(this.kind).name;
    if (this.type === 'health') return 'רִמּוֹן';
    if (this.type === 'spark') return 'נִיצוֹץ';
    if (this.type === 'stone') return this.tribe || 'אֶבֶן';
    if (this.type === 'grain') return 'שְׂעוֹרִים';
    return '';
  }

  update(dt) {
    this._t += dt;
  }

  draw(ctx, camX, camY) {
    if (this.collected || this.dormant) return;

    const px = Math.round(this.x - camX);
    const py = Math.round(this.y - camY);

    switch (this.type) {
      case 'olive':
        drawLearningIcon(ctx,'olive',px+this.size/2,py+this.size/2+Math.sin(this._t*3)*2,25);
        break;
      case 'oil':
        drawOilJug(ctx, px, py, this.size, this._t);
        break;
      case 'proverb':
        drawProverbScroll(ctx, px, py, this.size, this._t);
        break;
      case 'cedar':
        drawCedarBeam(ctx, px, py, this.size, this._t);
        break;
      case 'hewn':
        drawHewnStone(ctx, px, py, this.size, this._t);
        break;
      case 'rimon':
        drawGoldPomegranate(ctx, px, py, this.size, this._t);
        break;
      case 'grain':
        drawGrain(ctx, px, py, this.size, this._t);
        break;
      case 'donation':
        drawDonation(ctx, px, py, this.size, this.kind, this._t);
        break;
      case 'health':
        drawPomegranate(ctx, px, py, this.size, this._t);
        break;
      case 'relic':
        drawRelic(ctx, px, py, this.size, this._t, this.relicId);
        break;
      case 'spark':
        this._drawSpark(ctx, px, py);
        break;
      case 'stone':
        drawTribeStone(ctx, px, py, this.size, this._t);
        break;
    }
  }

  _drawSpark(ctx, px, py) {
    const cx = px + this.size / 2;
    const cy = py + this.size / 2 + Math.sin(this._t * 3) * 3;
    const pulse = 0.5 + Math.sin(this._t * 5) * 0.3;

    glow(ctx, cx, cy, this.size * 2, '#fff3b0', pulse * 0.5);

    // כוכב בן ארבע קרניים
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this._t * 1.2);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    const R = this.size * 0.55, r = this.size * 0.16;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const rad = i % 2 === 0 ? R : r;
      const fn = i === 0 ? 'moveTo' : 'lineTo';
      ctx[fn](Math.cos(a) * rad, Math.sin(a) * rad);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// חלקיקים
// ---------------------------------------------------------------------------

/**
 * מערכת חלקיקים קלה: ניצוצות איסוף וטקסט מרחף.
 * מוגבלת במספר כדי שלא תשפיע על קצב הפריימים.
 */
export class Particles {
  constructor(max = 300) {
    this.items = [];
    this.max = max;
  }

  /** התפרצות ניצוצות */
  burst(x, y, color = '#ffd24a', count = 10, speed = 140) {
    for (let i = 0; i < count; i++) {
      if (this.items.length >= this.max) break;
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.35 + Math.random() * 0.65);
      this.items.push({
        kind: 'spark',
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 40,
        life: 0.5 + Math.random() * 0.4,
        maxLife: 0.9,
        size: 1.5 + Math.random() * 2.5,
        color,
      });
    }
  }

  /** ענן אבק — לנחיתות ולסופת חול */
  dust(x, y, dir = 0, count = 5) {
    for (let i = 0; i < count; i++) {
      if (this.items.length >= this.max) break;
      this.items.push({
        kind: 'dust',
        x: x + (Math.random() - 0.5) * 14,
        y,
        vx: (dir || (Math.random() - 0.5)) * 50 * Math.random(),
        vy: -20 - Math.random() * 40,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7,
        size: 3 + Math.random() * 4,
        color: '#d9c49a',
      });
    }
  }

  /** טקסט מרחף — "+100 זָהָב" */
  floatText(x, y, str, color = '#ffd24a') {
    if (this.items.length >= this.max) return;
    this.items.push({
      kind: 'text',
      x, y,
      vx: 0,
      vy: -42,
      life: 1.1,
      maxLife: 1.1,
      str,
      color,
    });
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i];
      p.life -= dt;
      if (p.life <= 0) { this.items.splice(i, 1); continue; }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.kind === 'spark') {
        p.vy += 380 * dt;       // כבידה על הניצוצות
        p.vx *= 0.96;
      } else if (p.kind === 'dust') {
        p.vy += 60 * dt;
        p.vx *= 0.94;
      } else if (p.kind === 'text') {
        p.vy *= 0.94;           // האטה — הטקסט "נעצר" באוויר
      }
    }
  }

  draw(ctx, camX, camY) {
    for (const p of this.items) {
      const a = Math.max(0, p.life / p.maxLife);
      const px = p.x - camX;
      const py = p.y - camY;

      ctx.save();
      ctx.globalAlpha = a;

      if (p.kind === 'text') {
        text(ctx, p.str, px, py, {
          size: 15, color: p.color, weight: '700', outlineWidth: 3,
        });
      } else if (p.kind === 'dust') {
        circle(ctx, px, py, p.size * a, p.color);
      } else {
        circle(ctx, px, py, p.size, p.color);
      }

      ctx.restore();
    }
  }

  clear() {
    this.items.length = 0;
  }
}
