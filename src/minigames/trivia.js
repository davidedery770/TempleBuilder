/**
 * trivia.js — שאלות ידע קצרות עם ארבע תשובות.
 *
 * אחרי כל תשובה (נכונה או לא) מוצג הסבר ומקור: כאן הלימוד.
 * אין עונש על טעות — השחקן פשוט רואה את התשובה הנכונה.
 *
 * שליטה: עכבר, או 1–4, או ↑↓ ו-Enter. ESC יוצא.
 */

import { pickQuestions } from '../data/trivia.js';
import { ButtonSet } from '../core/ui.js';
import { text } from '../core/art.js';
import { W, backdrop, panel, header, wrap } from './shared.js';

const PX = 100, PY = 24, PW = 760, PH = 492;

export class TriviaGame {
  /**
   * @param {object} game
   * @param {object} params { levelId, count, title, speaker, used:Set }
   */
  constructor(game, params = {}) {
    this.game = game;
    this.title = params.title || 'שְׁאֵלַת יֶדַע';
    this.speaker = params.speaker || '';

    const used = params.used || new Set();
    this.questions = pickQuestions(params.levelId, params.count || 3, used);
    this.questions.forEach(q => used.add(q.id));

    this.i = 0;
    this.correct = 0;
    this.phase = 'ask';        // ask | feedback | end
    this.picked = -1;
    this.t = 0;
    this.buttons = new ButtonSet();

    this.finished = false;
    this.result = null;

    if (!this.questions.length) this._finish(false, true);
  }

  get q() { return this.questions[this.i]; }

  _finish(success, cancelled = false) {
    this.finished = true;
    this.result = {
      kind: 'trivia',
      success,
      cancelled,
      perfect: success && this.correct === this.questions.length,
      correct: this.correct,
      total: this.questions.length,
    };
  }

  _pick(idx, audio) {
    this.picked = idx;
    const ok = idx === this.q.answer;
    if (ok) { this.correct++; audio.correct(); } else { audio.wrong(); }
    this.phase = 'feedback';
    this.buttons.focus = 0;
  }

  update(dt, input, audio) {
    this.t += dt;
    if (this.t < 0.15) return;                     // התעלמות מהלחיצה שפתחה את המשחק

    if (input.pressed('back')) { this._finish(false, true); return; }

    if (this.phase === 'ask') {
      this._layoutOptions();
      const clicked = this.buttons.update(input);
      if (clicked !== null) { this._pick(Number(clicked), audio); return; }

      for (let n = 1; n <= 4; n++) {
        if (input.pressed('opt' + n) && n - 1 < this.q.options.length) {
          this._pick(n - 1, audio);
          return;
        }
      }
      if (input.pressed('down')) this.buttons.moveFocus(1);
      if (input.pressed('up')) this.buttons.moveFocus(-1);
      if (input.pressed('confirm') && this.buttons.focusedId !== null) {
        this._pick(Number(this.buttons.focusedId), audio);
      }
    } else if (this.phase === 'feedback') {
      const last = this.i === this.questions.length - 1;
      this.buttons.set([{
        id: 'next', x: W / 2 - 120, y: 472, w: 240, h: 36,
        label: last ? 'סִיּוּם' : 'הַשְּׁאֵלָה הַבָּאָה', size: 17,
      }]);
      const clicked = this.buttons.update(input);
      if (clicked === 'next' || input.pressed('confirm') || input.pressed('jump')) {
        audio.menuPick();
        if (last) {
          this.phase = 'end';
        } else {
          this.i++;
          this.phase = 'ask';
          this.picked = -1;
          this.buttons.focus = 0;
        }
      }
    } else {
      const pass = this.correct >= Math.ceil(this.questions.length / 2);
      this.buttons.set([{
        id: 'close', x: W / 2 - 130, y: 440, w: 260, h: 44,
        label: 'חֲזָרָה לַמִּשְׂחָק', size: 18,
      }]);
      const clicked = this.buttons.update(input);
      if (clicked === 'close' || input.pressed('confirm') || input.pressed('jump')) {
        audio.menuPick();
        this._finish(pass);
      }
    }
  }

  _layoutOptions() {
    this.buttons.set(this.q.options.map((label, i) => ({
      id: String(i), x: PX + 40, y: 206 + i * 50, w: PW - 80, h: 42,
      label: `${i + 1}.  ${label}`, size: 18,
    })));
  }

  draw(ctx) {
    backdrop(ctx);
    panel(ctx, PX, PY, PW, PH);
    header(ctx, this.title, this.speaker, 56);

    if (this.phase === 'end') { this._drawEnd(ctx); return; }

    const q = this.q;
    const right = PX + PW - 40;

    text(ctx, `שְׁאֵלָה ${this.i + 1} מִתּוֹךְ ${this.questions.length}`, right, 112, {
      size: 14, color: 'rgba(240,226,192,0.55)', align: 'right',
    });

    wrap(ctx, q.q, right, 150, PW - 80, 32, { size: 24, color: '#fff6d8', weight: '700' });

    if (this.phase === 'ask') {
      this.buttons.draw(ctx, this.t);
      return;
    }

    // --- משוב: מסמנים נכון/לא נכון על הכפתורים ---
    this._layoutOptions();
    this.buttons.items.forEach((b, i) => {
      b.disabled = true;
      if (i === q.answer) { b.color = '#4caf6a'; b.label = '✓  ' + q.options[i]; b.disabled = false; }
      else if (i === this.picked) { b.color = '#d0504a'; b.label = '✗  ' + q.options[i]; }
    });
    const savedHover = this.buttons.hover;
    this.buttons.hover = -1;
    this.buttons.draw(ctx, this.t);
    this.buttons.hover = savedHover;

    const ok = this.picked === q.answer;
    text(ctx, ok ? 'נָכוֹן!' : 'כִּמְעַט — הַתְּשׁוּבָה הַנְּכוֹנָה מְסֻמֶּנֶת', right, 414, {
      size: 17, color: ok ? '#8ad08a' : '#e8a090', align: 'right', weight: '700',
    });
    wrap(ctx, q.explain, right, 440, PW - 80, 22, { size: 15, color: '#e8dcc0', weight: '500' });
    text(ctx, q.source, PX + 40, 458, { size: 12, color: '#8a7446', align: 'left' });

    // הכפתור "הבא" נקבע ב-update; כאן רק מציירים
    this.buttons.set([{
      id: 'next', x: W / 2 - 120, y: 472, w: 240, h: 36,
      label: this.i === this.questions.length - 1 ? 'סִיּוּם' : 'הַשְּׁאֵלָה הַבָּאָה', size: 17,
    }]);
    this.buttons.draw(ctx, this.t);
  }

  _drawEnd(ctx) {
    const n = this.questions.length;
    const pass = this.correct >= Math.ceil(n / 2);

    text(ctx, pass ? 'כָּל הַכָּבוֹד!' : 'כְּדַאי לָנוּ לִלְמֹד עוֹד', W / 2, 200, {
      size: 34, color: pass ? '#ffe9a8' : '#e8c88a', weight: '700',
    });
    text(ctx, `עָנִיתָ נָכוֹן עַל ${this.correct} מִתּוֹךְ ${n}`, W / 2, 256, {
      size: 20, color: '#f0e2c0',
    });
    text(ctx, pass
      ? (this.correct === n ? 'מושלם! מגיע לך פרס.' : 'עברת! מגיע לך פרס.')
      : 'אפשר לנסות שוב אצל אותה דמות — השאלות יתחלפו.',
      W / 2, 296, { size: 16, color: '#c9a227' });

    this.buttons.draw(ctx, this.t);
  }
}
