/**
 * sorting.js — "מבחן תרומת הלב": ממיינים מצרכי משכן לארבע קבוצות.
 *
 * על המסך מופיע מצרך אחד, והשחקן בוחר לאיזו קבוצה הוא שייך:
 * מתכות · בדים וחוטים · עורות · חומרים נוספים.
 * לכל מצרך יש כמה שניות. טעות או איחור לא מענישים — מוצגת הקבוצה
 * הנכונה והמקור בפסוק. בסוף מוצג סיכום של כל החמישה עשר.
 *
 * שליטה: עכבר, או 1–4, או ←→ ו-Enter. ESC יוצא.
 */

import { MATERIALS, MATERIAL_GROUPS } from '../data/materials.js';
import { shuffle } from '../data/trivia.js';
import { ButtonSet } from '../core/ui.js';
import { text, roundRect, glow, drawMaterial } from '../core/art.js';
import { W, backdrop, panel, header, bar } from './shared.js';

const GROUP_ORDER = ['metals', 'fabrics', 'skins', 'other'];
const ITEMS_PER_GAME = 8;
const PASS_SCORE = 6;
const TIME_PER_ITEM = 8;          // שניות
const FEEDBACK_TIME = 1.6;

const PX = 100, PY = 24, PW = 760, PH = 492;

/** בוחר 8 מצרכים: לפחות אחד מכל קבוצה, והשאר אקראי */
function pickItems() {
  const chosen = [];
  for (const g of GROUP_ORDER) {
    const pool = shuffle(MATERIALS.filter(m => m.group === g));
    chosen.push(pool[0]);
  }
  const rest = shuffle(MATERIALS.filter(m => !chosen.includes(m)));
  while (chosen.length < ITEMS_PER_GAME) chosen.push(rest.pop());
  return shuffle(chosen);
}

export class SortingGame {
  constructor(game, params = {}) {
    this.game = game;
    this.title = params.title || 'מִבְחַן תְּרוּמַת הַלֵּב';
    this.speaker = params.speaker || '';
    this.buttons = new ButtonSet();
    this.t = 0;
    this.finished = false;
    this.result = null;
    this._restart();
  }

  _restart() {
    this.items = pickItems();
    this.i = 0;
    this.correct = 0;
    this.phase = 'play';       // play | feedback | end
    this.timer = TIME_PER_ITEM;
    this.last = null;          // { ok, timedOut, chosen }
    this._fb = 0;
    this.buttons.focus = 0;
  }

  get item() { return this.items[this.i]; }

  _answer(groupId, audio) {
    const ok = groupId === this.item.group;
    if (ok) { this.correct++; audio.correct(); } else { audio.wrong(); }
    this.last = { ok, timedOut: groupId === null, chosen: groupId };
    this.phase = 'feedback';
    this._fb = FEEDBACK_TIME;
  }

  _next() {
    this.i++;
    if (this.i >= this.items.length) {
      this.phase = 'end';
    } else {
      this.phase = 'play';
      this.timer = TIME_PER_ITEM;
      this.last = null;
    }
  }

  update(dt, input, audio) {
    this.t += dt;
    if (this.t < 0.15) return;

    if (input.pressed('back')) {
      this.finished = true;
      this.result = { kind: 'sorting', success: false, cancelled: true, perfect: false };
      return;
    }

    if (this.phase === 'play') {
      this.timer -= dt;
      if (this.timer <= 0) { this._answer(null, audio); return; }

      this.buttons.set(this._groupButtons());
      const clicked = this.buttons.update(input);
      if (clicked) { this._answer(clicked, audio); return; }

      for (let n = 1; n <= 4; n++) {
        if (input.pressed('opt' + n)) { this._answer(GROUP_ORDER[n - 1], audio); return; }
      }
      // עברית: הכפתור הראשון בימין, לכן שמאלה = קדימה באינדקס
      if (input.pressed('left')) this.buttons.moveFocus(1);
      if (input.pressed('right')) this.buttons.moveFocus(-1);
      if (input.pressed('confirm') && this.buttons.focusedId) {
        this._answer(this.buttons.focusedId, audio);
      }
    } else if (this.phase === 'feedback') {
      this._fb -= dt;
      if (this._fb <= 0 || input.pressed('confirm') || input.pressed('jump') || input.clicked) {
        this._next();
      }
    } else {
      const pass = this.correct >= PASS_SCORE;
      const items = [{
        id: 'close', x: W / 2 + 8, y: 450, w: 230, h: 40,
        label: pass ? 'חֲזָרָה לַמִּשְׂחָק' : 'סִיּוּם', size: 17,
      }];
      if (!pass) {
        items.unshift({
          id: 'retry', x: W / 2 - 238, y: 450, w: 230, h: 40,
          label: 'נַסֵּה שׁוּב', size: 17,
        });
      } else {
        items[0].x = W / 2 - 115;
      }
      this.buttons.set(items);
      const clicked = this.buttons.update(input);
      if (clicked === 'retry') { audio.menuPick(); this._restart(); }
      else if (clicked === 'close' || input.pressed('confirm') || input.pressed('jump')) {
        audio.menuPick();
        this.finished = true;
        this.result = {
          kind: 'sorting', success: pass, cancelled: false,
          perfect: this.correct === this.items.length,
          correct: this.correct, total: this.items.length,
        };
      }
    }
  }

  /** ארבעה כפתורי קבוצות; הראשון בימין (עברית) */
  _groupButtons() {
    const bw = 172, gap = 14;
    const totalW = bw * 4 + gap * 3;
    const right = W / 2 + totalW / 2;
    return GROUP_ORDER.map((g, i) => ({
      id: g,
      x: right - bw - i * (bw + gap),
      y: 352, w: bw, h: 92,
      label: `${i + 1}.  ${MATERIAL_GROUPS[g].label}`,
      sub: MATERIAL_GROUPS[g].hint,
      size: 17, subSize: 12,
      color: MATERIAL_GROUPS[g].color,
    }));
  }

  draw(ctx) {
    backdrop(ctx);
    panel(ctx, PX, PY, PW, PH);
    header(ctx, this.title, this.speaker || 'לְאֵיזוֹ קְבוּצָה שַׁיָּךְ כָּל מַצְרָךְ?', 56);

    if (this.phase === 'end') { this._drawEnd(ctx); return; }

    const m = this.item;
    const right = PX + PW - 40;

    text(ctx, `מַצְרָךְ ${this.i + 1} מִתּוֹךְ ${this.items.length}`, right, 112, {
      size: 14, color: 'rgba(240,226,192,0.55)', align: 'right',
    });

    // --- הכרטיס המרכזי ---
    const cx = W / 2, cy = 218;
    glow(ctx, cx, cy, 130, MATERIAL_GROUPS[m.group].color, 0.10);
    ctx.save();
    roundRect(ctx, cx - 120, cy - 78, 240, 156, 14);
    ctx.fillStyle = 'rgba(40,30,16,0.95)';
    ctx.fill();
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    drawMaterial(ctx, m.id, cx, cy - 18, 76);
    text(ctx, m.name, cx, cy + 52, { size: 20, color: '#fff6d8', weight: '700' });

    // --- סרגל זמן ---
    if (this.phase === 'play') {
      const frac = this.timer / TIME_PER_ITEM;
      bar(ctx, cx - 160, 316, 320, 8, frac, frac < 0.3 ? '#d0704a' : '#c9a227');
    }

    this.buttons.set(this._groupButtons());
    if (this.phase === 'feedback') {
      // מסמנים את הקבוצה הנכונה, ואת הנבחרת אם שגויה
      this.buttons.items.forEach(b => {
        b.disabled = b.id !== m.group && b.id !== this.last.chosen;
        if (b.id === m.group) b.color = '#4caf6a';
        else if (b.id === this.last.chosen) b.color = '#d0504a';
      });
      const hov = this.buttons.hover;
      this.buttons.hover = -1;
      this.buttons.draw(ctx, this.t);
      this.buttons.hover = hov;

      const L = this.last;
      const label = MATERIAL_GROUPS[m.group].label;
      text(ctx, L.ok ? 'נָכוֹן!' : (L.timedOut ? 'הַזְּמַן אָזַל' : 'לֹא בְּדִיּוּק'),
        cx, 468, { size: 18, color: L.ok ? '#8ad08a' : '#e8a090', weight: '700' });
      if (!L.ok) text(ctx, `הַנָּכוֹן: ${label}`, cx, 494, { size: 15, color: '#e8dcc0' });
      text(ctx, m.source, PX + 40, 494, { size: 12, color: '#8a7446', align: 'left' });
    } else {
      this.buttons.draw(ctx, this.t);
      text(ctx, 'בְּחֲרוּ קְבוּצָה — עַכְבָּר אוֹ מַקָּשִׁים 1–4', cx, 474, {
        size: 13, color: 'rgba(240,226,192,0.45)',
      });
    }
  }

  _drawEnd(ctx) {
    const pass = this.correct >= PASS_SCORE;
    const n = this.items.length;

    text(ctx, pass ? 'כָּל הַכָּבוֹד!' : 'כִּמְעַט!', W / 2, 114, {
      size: 30, color: pass ? '#ffe9a8' : '#e8c88a', weight: '700',
    });
    text(ctx, `מִיַּנְתָּ נָכוֹן ${this.correct} מִתּוֹךְ ${n}` + (pass ? '' : `  (צריך ${PASS_SCORE})`),
      W / 2, 148, { size: 18, color: '#f0e2c0' });

    // סיכום: ארבע עמודות, כל המצרכים לפי קבוצה (עברית: הראשונה בימין)
    const colW = 168, gap = 10;
    const right = W / 2 + (colW * 4 + gap * 3) / 2;
    GROUP_ORDER.forEach((g, i) => {
      const x = right - colW - i * (colW + gap);
      const info = MATERIAL_GROUPS[g];

      ctx.save();
      roundRect(ctx, x, 178, colW, 254, 10);
      ctx.fillStyle = 'rgba(40,30,16,0.8)';
      ctx.fill();
      ctx.strokeStyle = info.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      text(ctx, info.label, x + colW / 2, 198, { size: 15, color: info.color, weight: '700' });

      MATERIALS.filter(m => m.group === g).forEach((m, k) => {
        const y = 228 + k * 34;
        drawMaterial(ctx, m.id, x + colW - 22, y, 22);
        text(ctx, m.short, x + colW - 40, y, {
          size: 13, color: '#e8dcc0', align: 'right', weight: '500', outlineWidth: 2,
        });
      });
    });

    this.buttons.draw(ctx, this.t);
  }
}
