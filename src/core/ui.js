/**
 * ui.js — כפתורים משותפים לכל המסכים.
 *
 * הלוגיקה (ריחוף/לחיצה) רצה ב-update() והציור ב-draw(), כי שני אלה רצים
 * בקצבים שונים (צעדי פיזיקה קבועים מול רינדור), ואירוע לחיצה חי רק פריים אחד.
 *
 * שימוש:
 *   buttons.set([{ id:'ok', x, y, w, h, label:'אישור', sub:'...' }]);   // כל פריים
 *   const clicked = buttons.update(input);                              // id או null
 *   buttons.draw(ctx, t);
 */

import { text, roundRect } from './art.js';

export class ButtonSet {
  constructor() {
    this.items = [];
    this.hover = -1;
    this.focus = 0;
  }

  /** מגדיר את הכפתורים הנוכחיים (קוראים לזה בכל update, זול) */
  set(items) {
    this.items = items;
    if (this.focus >= items.length) this.focus = 0;
  }

  /** @returns {string|null} מזהה הכפתור שנלחץ בפריים הזה */
  update(input) {
    this.hover = -1;
    for (let i = 0; i < this.items.length; i++) {
      const b = this.items[i];
      if (!b.disabled && input.over(b.x, b.y, b.w, b.h)) this.hover = i;
    }

    if (this.hover >= 0) {
      input.cursor = 'pointer';
      if (input.pointerMoved) this.focus = this.hover;
      if (input.clicked) return this.items[this.hover].id;
    }
    return null;
  }

  /** מזהה הכפתור הממוקד (למקלדת) */
  get focusedId() {
    return this.items[this.focus] ? this.items[this.focus].id : null;
  }

  moveFocus(delta) {
    if (!this.items.length) return;
    this.focus = (this.focus + delta + this.items.length) % this.items.length;
  }

  draw(ctx, t = 0) {
    this.items.forEach((b, i) => {
      const active = i === this.hover || (i === this.focus && !b.disabled);
      const base = b.color || '#c9a227';

      ctx.save();
      roundRect(ctx, b.x, b.y, b.w, b.h, 8);
      ctx.fillStyle = b.disabled ? 'rgba(20,16,10,0.6)'
                    : active ? 'rgba(60,46,18,0.96)' : 'rgba(30,23,12,0.92)';
      ctx.fill();
      ctx.lineWidth = active ? 2.5 : 1.5;
      ctx.strokeStyle = b.disabled ? 'rgba(120,100,60,0.3)' : (active ? '#ffe9a8' : base);
      ctx.stroke();
      ctx.restore();

      if (b.decorate) b.decorate(ctx, b, active, t);

      const cy = b.sub ? b.y + b.h * 0.38 : b.y + b.h / 2;
      text(ctx, b.label, b.x + b.w / 2, cy, {
        size: b.size || 18,
        color: b.disabled ? '#6a5a42' : (active ? '#fff6d8' : '#f0e2c0'),
        weight: active ? '700' : '600',
        outlineWidth: 3,
      });

      if (b.sub) {
        text(ctx, b.sub, b.x + b.w / 2, b.y + b.h * 0.72, {
          size: b.subSize || 12,
          color: 'rgba(240,226,192,0.6)',
          weight: '500',
          outlineWidth: 2,
        });
      }
    });
  }
}
