/**
 * weaving.js — "חכמת לב": אורגים יריעה בסדר הצבעים הנכון.
 *
 * הסדר בפסוקי התרומה: תכלת, ארגמן, תולעת שני, שש (שמות כ״ה, ד׳).
 *
 * סיבוב א׳ — מודרך: שמות הצבעים מוצגים והבא בתור מואר. לומדים.
 * סיבוב ב׳ — מהזיכרון: בלי שמות. אחרי שתי טעויות ברצף מופיע רמז.
 * יותר משלוש טעויות בסיבוב ב׳ — מציגים את הסדר ומציעים לנסות שוב.
 *
 * שליטה: עכבר, או 1–4 (לפי מיקום החוט משמאל לימין... כלומר מימין לשמאל, כמו בעברית).
 * ESC יוצא.
 */

import { getMaterial } from '../data/materials.js';
import { shuffle } from '../data/trivia.js';
import { ButtonSet } from '../core/ui.js';
import { text, roundRect, glow, circle } from '../core/art.js';
import { W, backdrop, panel, header, wrap } from './shared.js';

const SEQUENCE = ['techelet', 'argaman', 'tolaat', 'shesh'];

const COLORS = {
  techelet: { main: '#3a8ee0', dark: '#1d5fa6' },
  argaman:  { main: '#9a46c0', dark: '#62287f' },
  tolaat:   { main: '#d8403a', dark: '#8a1f1a' },
  shesh:    { main: '#f4ecda', dark: '#c4b898' },
};

const MAX_MISTAKES_ROUND2 = 3;
const BAND_H = 26;
const CLOTH = { x: 190, y: 112, w: 300 };   // בצד שמאל; ההוראות בצד ימין

const PX = 100, PY = 24, PW = 760, PH = 492;

export class WeavingGame {
  constructor(game, params = {}) {
    this.game = game;
    this.title = params.title || 'חַכְמַת לֵב';
    this.speaker = params.speaker || '';
    this.guided = !!params.guided;
    this.buttons = new ButtonSet();
    this.t = 0;
    this.finished = false;
    this.result = null;
    this.phase = 'play';          // play | between | failed | done
    this._restart();
  }

  _restart() {
    this.round = 1;
    this.step = 0;
    this.bands = [];              // { kind, t0 }
    this.mistakes = 0;            // בסיבוב הנוכחי
    this.totalMistakes = 0;       // בסיבוב ב׳ בלבד (קובע "מושלם")
    this.streak = 0;              // טעויות ברצף, בשביל הרמז
    this.shake = 0;
    this.phase = 'play';
    this._shuffleSpools();
  }

  _shuffleSpools() {
    this.order = shuffle(SEQUENCE);
  }

  get expected() { return SEQUENCE[this.step]; }

  _spoolRects() {
    const r = 36, gap = 40;
    const total = 4 * r * 2 + 3 * gap;
    const right = W / 2 + total / 2;
    // הראשון בימין
    return this.order.map((kind, i) => ({
      kind,
      cx: right - r - i * (r * 2 + gap),
      cy: 410,
      r,
    }));
  }

  _click(kind, audio) {
    if (kind === this.expected) {
      audio.pickup(2 + this.step);
      this.bands.push({ kind, t0: this.t });
      this.step++;
      this.streak = 0;

      if (this.step >= SEQUENCE.length) {
        if (this.round === 1) {
          this.phase = 'between';
          this._betweenT = 0;
        } else {
          this.phase = 'done';
          audio.levelComplete();
        }
      }
    } else {
      audio.wrong();
      this.shake = 0.35;
      this.streak++;
      this.mistakes++;
      if (this.round === 2) {
        this.totalMistakes++;
        if (!this.guided && this.totalMistakes > MAX_MISTAKES_ROUND2) this.phase = 'failed';
      }
    }
  }

  update(dt, input, audio) {
    this.t += dt;
    if (this.shake > 0) this.shake -= dt;
    if (this.t < 0.15) return;

    if (input.pressed('back')) {
      this.finished = true;
      this.result = { kind: 'weaving', success: false, cancelled: true, perfect: false };
      return;
    }

    if (this.phase === 'play') {
      let hit = null;
      for (const s of this._spoolRects()) {
        if (input.over(s.cx - s.r, s.cy - s.r, s.r * 2, s.r * 2)) hit = s;
      }
      if (hit) {
        input.cursor = 'pointer';
        if (input.clicked) this._click(hit.kind, audio);
      }
      // מקשים 1–4: לפי מיקום מימין לשמאל
      for (let n = 1; n <= 4; n++) {
        if (input.pressed('opt' + n)) this._click(this.order[n - 1], audio);
      }
    } else if (this.phase === 'between') {
      this._betweenT += dt;
      if (this._betweenT > 1.8 || input.pressed('confirm') || input.clicked) {
        this.round = 2;
        this.step = 0;
        this.bands.push({ kind: null, t0: this.t });    // קו מפריד בין שני הסיבובים
        this.mistakes = 0;
        this.streak = 0;
        this._shuffleSpools();
        this.phase = 'play';
      }
    } else if (this.phase === 'failed') {
      this.buttons.set([
        { id: 'retry', x: W / 2 - 238, y: 446, w: 230, h: 40, label: 'נַסֵּה שׁוּב', size: 17 },
        { id: 'quit', x: W / 2 + 8, y: 446, w: 230, h: 40, label: 'סִיּוּם', size: 17 },
      ]);
      const c = this.buttons.update(input);
      if (c === 'retry') { audio.menuPick(); this._restart(); }
      else if (c === 'quit') {
        this.finished = true;
        this.result = { kind: 'weaving', success: false, cancelled: false, perfect: false };
      }
    } else {
      this.buttons.set([{
        id: 'close', x: W / 2 - 120, y: 456, w: 240, h: 40, label: 'חֲזָרָה לַמִּשְׂחָק', size: 17,
      }]);
      const c = this.buttons.update(input);
      if (c === 'close' || input.pressed('confirm') || input.pressed('jump')) {
        audio.menuPick();
        this.finished = true;
        this.result = {
          kind: 'weaving', success: true, cancelled: false,
          perfect: this.totalMistakes === 0, mistakes: this.totalMistakes,
        };
      }
    }
  }

  draw(ctx) {
    backdrop(ctx);
    panel(ctx, PX, PY, PW, PH);
    header(ctx, this.title, this.speaker || 'אוֹרְגִים אֶת הַיְרִיעָה', 56);

    this._drawLoom(ctx);

    if (this.phase === 'done') { this._drawDone(ctx); return; }
    if (this.phase === 'failed') { this._drawFailed(ctx); return; }

    const right = PX + PW - 40;
    const names = SEQUENCE.map(k => getMaterial(k).name).join('  ←  ');

    if (this.round === 1) {
      text(ctx, 'סִבּוּב א׳ — לִלְמֹד אֶת הַסֵּדֶר', right, 112, {
        size: 16, color: '#c9a227', align: 'right', weight: '700',
      });
      wrap(ctx, 'לחצו על החוטים לפי סדר הצבעים: ' + names, right, 142, 250, 24,
        { size: 15, color: '#e8dcc0', weight: '500' });
    } else {
      text(ctx, this.guided ? 'סִבּוּב ב׳ — מַמְשִׁיכִים בְּיַחַד' : 'סִבּוּב ב׳ — מֵהַזִּכָּרוֹן', right, 112, {
        size: 16, color: '#c9a227', align: 'right', weight: '700',
      });
      wrap(ctx, this.guided ? 'החוט הבא מואר. ארגו שוב באותו סדר, בלי הגבלת טעויות.' : 'עכשיו בלי עזרה: ארגו שוב באותו סדר.', right, 142, 250, 24,
        { size: 15, color: '#e8dcc0', weight: '500' });
      text(ctx, this.guided ? 'אפשר לנסות ללא הגבלת טעויות' : `טָעֻיּוֹת: ${this.totalMistakes} מִתּוֹךְ ${MAX_MISTAKES_ROUND2}`,
        right, 200, { size: 14, color: this.totalMistakes ? '#e8a090' : 'rgba(240,226,192,0.55)', align: 'right' });
    }

    if (this.phase === 'between') {
      glow(ctx, W / 2, 300, 200, '#ffd964', 0.12);
      text(ctx, this.guided ? 'יָפֶה! מַמְשִׁיכִים בְּיַחַד…' : 'יָפֶה! עַכְשָׁו מֵהַזִּכָּרוֹן…', W / 2, 372, {
        size: 24, color: '#ffe9a8', weight: '700',
      });
      return;
    }

    this._drawSpools(ctx);
  }

  _drawLoom(ctx) {
    const cl = CLOTH;
    const rowsMax = SEQUENCE.length * 2 + 1;
    const clothH = rowsMax * BAND_H;

    // מסגרת הנול
    ctx.save();
    ctx.fillStyle = '#6b4a2a';
    ctx.fillRect(cl.x - 18, cl.y - 14, 18, clothH + 40);
    ctx.fillRect(cl.x + cl.w, cl.y - 14, 18, clothH + 40);
    ctx.fillStyle = '#8a6030';
    ctx.fillRect(cl.x - 18, cl.y - 14, cl.w + 36, 10);
    ctx.fillRect(cl.x - 18, cl.y + clothH + 16, cl.w + 36, 10);
    ctx.restore();

    // רקע הבד (שתי)
    ctx.save();
    ctx.fillStyle = 'rgba(240,226,192,0.07)';
    ctx.fillRect(cl.x, cl.y, cl.w, clothH);
    ctx.strokeStyle = 'rgba(240,226,192,0.10)';
    for (let x = cl.x + 6; x < cl.x + cl.w; x += 6) {
      ctx.beginPath(); ctx.moveTo(x, cl.y); ctx.lineTo(x, cl.y + clothH); ctx.stroke();
    }
    ctx.restore();

    // פסים ארוגים
    let row = 0;
    for (const b of this.bands) {
      const y = cl.y + row * BAND_H;
      if (b.kind) {
        const grow = Math.min(1, (this.t - b.t0) / 0.28);
        const c = COLORS[b.kind];
        // האריגה מתפשטת מהימין לשמאל
        const w = cl.w * grow;
        const g = ctx.createLinearGradient(0, y, 0, y + BAND_H);
        g.addColorStop(0, c.main);
        g.addColorStop(1, c.dark);
        ctx.fillStyle = g;
        ctx.fillRect(cl.x + cl.w - w, y + 1, w, BAND_H - 2);

        ctx.save();
        ctx.strokeStyle = 'rgba(0,0,0,0.18)';
        for (let x = cl.x + 5; x < cl.x + cl.w; x += 6) {
          ctx.beginPath(); ctx.moveTo(x, y + 1); ctx.lineTo(x, y + BAND_H - 1); ctx.stroke();
        }
        ctx.restore();
        row++;
      } else {
        row++;   // רווח בין הסיבובים
      }
    }
  }

  _drawSpools(ctx) {
    const hint = this.guided || this.streak >= 2;
    const showNames = this.round === 1 || this.guided;
    const shakeX = this.shake > 0 ? Math.sin(this.t * 80) * 5 * (this.shake / 0.35) : 0;

    for (const s of this._spoolRects()) {
      const c = COLORS[s.kind];
      const isNext = s.kind === this.expected;
      const lit = (this.round === 1 && isNext) || (hint && isNext);
      const cx = s.cx + shakeX;

      if (lit) glow(ctx, cx, s.cy, 80, '#ffe9a8', 0.4 + Math.sin(this.t * 6) * 0.15);

      // סליל: עיגול חוט עם טבעות
      circle(ctx, cx, s.cy, s.r, c.dark);
      circle(ctx, cx - 1, s.cy - 1, s.r - 4, c.main);
      ctx.save();
      ctx.strokeStyle = c.dark;
      ctx.lineWidth = 1.5;
      for (const a of [0.4, 1.4, 2.4]) {
        ctx.beginPath();
        ctx.ellipse(cx, s.cy, s.r - 5, s.r * 0.4, a, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      circle(ctx, cx - s.r * 0.35, s.cy - s.r * 0.35, s.r * 0.14, 'rgba(255,255,255,0.45)');

      if (lit) {
        ctx.save();
        ctx.strokeStyle = '#ffe9a8';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(cx, s.cy, s.r + 5, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }

      if (showNames) {
        text(ctx, getMaterial(s.kind).name, cx, s.cy + s.r + 20, {
          size: 14, color: '#f0e2c0', weight: '700',
        });
      }
    }

    // מספרי מקשים
    const rects = this._spoolRects();
    rects.forEach((s, i) => {
      text(ctx, String(i + 1), s.cx + shakeX, s.cy + s.r + (showNames ? 40 : 20), {
        size: 12, color: 'rgba(240,226,192,0.4)',
      });
    });

    text(ctx, 'לְחֲצוּ עַל הַחוּט הַנָּכוֹן — עכבר או מקשים 1–4', W / 2, 504, {
      size: 13, color: 'rgba(240,226,192,0.45)',
    });
  }

  _drawFailed(ctx) {
    text(ctx, 'כִּמְעַט! הַסֵּדֶר הוּא:', PX + PW - 40, 112, {
      size: 18, color: '#e8c88a', align: 'right', weight: '700',
    });

    SEQUENCE.forEach((k, i) => {
      const x = PX + PW - 90 - i * 84;          // הראשון בימין
      circle(ctx, x, 190, 24, COLORS[k].main);
      circle(ctx, x - 6, 183, 4, 'rgba(255,255,255,0.4)');
      text(ctx, getMaterial(k).name, x, 232, { size: 12, color: '#f0e2c0' });
      text(ctx, String(i + 1), x, 252, { size: 12, color: 'rgba(240,226,192,0.45)' });
    });
    this.buttons.draw(ctx, this.t);
  }

  _drawDone(ctx) {
    const right = PX + PW - 40;
    const perfect = this.totalMistakes === 0;

    text(ctx, perfect ? 'אֲרִיגָה מֻשְׁלֶמֶת!' : 'הַיְרִיעָה אֲרוּגָה!', right, 112, {
      size: 24, color: '#ffe9a8', align: 'right', weight: '700',
    });
    wrap(ctx,
      'ברשימת התרומה הסדר הוא: תכלת, ארגמן, תולעת שני ושש. ' +
      'בפסוק על יריעות המשכן הסדר שונה: "שש משזר ותכלת וארגמן ותולעת שני". ' +
      'היריעות נארגו "מעשה חושב", בדוגמה.',
      right, 156, 250, 24, { size: 14, color: '#e8dcc0', weight: '500' });
    text(ctx, 'שמות כ״ה, ד׳ · שמות כ״ו, א׳', right, 340, {
      size: 12, color: '#8a7446', align: 'right',
    });
    this.buttons.draw(ctx, this.t);
  }
}
