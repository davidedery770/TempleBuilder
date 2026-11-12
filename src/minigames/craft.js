import { ButtonSet } from '../core/ui.js';
import { text } from '../core/art.js';
import { backdrop, panel, header, wrap } from './shared.js';

/** Symbolic preparation tasks, not instructions for manufacturing ritual materials. */
export class CraftGame {
  constructor(game, params = {}) {
    this.game = game; this.kind = params.mode || 'packing';
    this.title = params.title || 'מְלֶאכֶת הַמַּחֲנֶה';
    this.source = params.source || 'שמות ל״ה'; this.items = params.items || [];
    this.step = 0; this.mistakes = 0; this.assisted = false;
    this.t = 0; this.clock = 0; this.cooldown = 0; this.phase = 'play'; this.feedback = '';
    this.finished = false; this.result = null; this.buttons = new ButtonSet();
  }
  get cursor() { return (Math.sin(this.clock * 1.8 - Math.PI / 2) + 1) / 2; }
  get window() { return this.assisted || this.mistakes >= 3 ? 0.9 : 0.5; }
  get total() { return this.kind === 'saw' ? 3 : this.items.length; }
  _finish(cancelled = false) {
    this.finished = true;
    this.result = { kind: 'craft', success: !cancelled && this.phase === 'done',
      cancelled, perfect: this.mistakes === 0 && !this.assisted };
  }
  attempt(choice, audio) {
    if (this.phase !== 'play' || this.cooldown > 0) return;
    const ok = this.kind === 'saw'
      ? Math.abs(this.cursor - 0.5) <= this.window / 2 : choice === this.items[this.step].answer;
    if (ok) {
      this.step++; audio.correct(); this.feedback = 'יפה! עוד חלק מהמשלוח מוכן.';
      if (this.step >= this.total) this.phase = 'done';
    } else {
      this.mistakes++; audio.wrong();
      this.feedback = this.kind === 'saw' ? 'נסו כשהסמן באזור המואר. אין איבוד התקדמות.'
        : 'המשלוח המתאים מסומן כעת — אפשר לנסות שוב.';
    }
    this.cooldown = 0.25;
  }
  update(dt, input, audio) {
    this.t += dt; this.clock += dt; this.cooldown = Math.max(0, this.cooldown - dt);
    if (input.pressed('back')) { this._finish(true); return; }
    if (this.t < 0.18) return;
    if (input.pressed('build')) this.assisted = !this.assisted;
    this.buttons.set([
      { id: 'assist', x: 130, y: 466, w: 190, h: 34, label: 'סיוע · C', size: 15 },
      { id: 'back', x: 660, y: 466, w: 170, h: 34, label: 'חזרה · ESC', size: 15 },
      ...(this.phase === 'done' ? [{ id: 'done', x: 350, y: 405, w: 260, h: 44, label: 'המשלוח מוכן', size: 19 }]
        : this.kind === 'saw' ? [{ id: 'saw', x: 350, y: 405, w: 260, h: 44, label: 'ניסור · רווח / Enter', size: 17 }]
        : this.items[this.step].options.map((label, i) => ({
          id: 'pick' + i, x: 180, y: 240 + i * 55, w: 600, h: 43, label: `${i + 1}. ${label}`, size: 19,
          color: (this.assisted || this.mistakes > 0) && i === this.items[this.step].answer ? '#82c59f' : '#c9a227',
        }))),
    ]);
    const action = this.buttons.update(input);
    if (action === 'assist') { this.assisted = !this.assisted; return; }
    if (action === 'back') { this._finish(true); return; }
    if (this.phase === 'done') {
      if (action === 'done' || input.pressed('confirm') || input.pressed('jump')) this._finish();
    } else if (this.kind === 'saw') {
      if (action === 'saw' || input.pressed('confirm') || input.pressed('jump')) this.attempt(0, audio);
    } else {
      for (let i = 0; i < 3; i++) if (action === 'pick' + i || input.pressed('opt' + (i + 1))) {
        this.attempt(i, audio); break;
      }
    }
  }
  draw(ctx) {
    backdrop(ctx); panel(ctx, 100, 24, 760, 492);
    header(ctx, this.title, 'עוזרים לאומנים — המחשה משחקית בלי קנס על טעות', 58);
    text(ctx, `${this.step} מתוך ${this.total} הושלמו`, 480, 120, { size: 17, color: '#d8c68a' });
    if (this.phase === 'done') {
      text(ctx, 'תּוֹדָה עַל הָעֶזְרָה!', 480, 230, { size: 32, color: '#ffe2a0' });
      wrap(ctx, 'הכנת המשלוח הסתיימה. נקבל את התרומה ונחזיר אותה למרכז המחנה.', 800, 290, 640, 27, { size: 20 });
    } else if (this.kind === 'saw') {
      text(ctx, 'הקורה כבר הובאה מהמחסן — כעת מכינים אותה', 480, 168, { size: 20 });
      ctx.fillStyle = '#75512e'; ctx.fillRect(180, 215, 600, 54);
      ctx.fillStyle = '#a2b184'; ctx.fillRect(180 + 600 * (0.5 - this.window / 2), 218, 600 * this.window, 48);
      ctx.fillStyle = '#fff0bd'; ctx.fillRect(180 + this.cursor * 600 - 3, 207, 6, 70);
      text(ctx, 'לחצו כשהסמן באזור המואר. C מרחיב את הסיוע.', 480, 310, { size: 18 });
    } else text(ctx, 'לאיזה משלוח שייך: ' + this.items[this.step].name + '?', 480, 185, { size: 23, color: '#ffe2a0' });
    text(ctx, this.feedback, 480, 382, { size: 15, color: '#c7dfbf' });
    text(ctx, this.source, 480, 489, { size: 11, color: '#b5a574' });
    this.buttons.draw(ctx, this.t);
  }
}
