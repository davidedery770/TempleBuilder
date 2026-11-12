import { ButtonSet } from '../core/ui.js';
import { text, circle } from '../core/art.js';
import { backdrop, panel, header, wrap } from './shared.js';

/**
 * Seven symbolic timing successes, NOT the biblical number of trumpet blasts.
 * A round gets gently harder; mistakes never remove successes or lives.
 */
export class ShofarTimingGame {
  constructor(game, params = {}) {
    this.game = game;
    this.title = params.title || 'קוֹל הַשּׁוֹפָר';
    this.rounds = params.rounds || 7;
    this.hits = Math.max(0, Math.min(this.rounds, params.progress?.hits || 0));
    this.misses = params.progress?.misses || 0;
    this.roundMisses = params.progress?.roundMisses || 0;
    this.assisted = !!params.progress?.assisted;
    this.phase = this.hits >= this.rounds ? 'done' : 'intro';
    this.clock = 0; this.cooldown = 0; this.t = 0;
    this.feedback = '';
    this.finished = false; this.result = null;
    this.buttons = new ButtonSet();
  }

  get cycle() { return this.assisted ? 3.2 : Math.max(2.1, 3.0 - this.hits * 0.12); }
  get windowSeconds() {
    const base = Math.max(0.65, 1.15 - this.hits * 0.08);
    return this.assisted ? 1.9 : Math.min(1.8, base + Math.floor(this.roundMisses / 3) * 0.25);
  }
  get cursor() {
    const phase = (this.clock % this.cycle) / this.cycle;
    return phase < 0.5 ? phase * 2 : 2 - phase * 2;
  }
  get windowWidth() { return Math.min(0.94, 2 * this.windowSeconds / this.cycle); }
  get inWindow() { return Math.abs(this.cursor - 0.5) <= this.windowWidth / 2; }
  get progress() {
    return { hits: this.hits, misses: this.misses, roundMisses: this.roundMisses, assisted: this.assisted };
  }
  _close(cancelled) {
    this.finished = true;
    this.result = {
      kind: 'shofarTiming', success: !cancelled && this.hits >= this.rounds,
      cancelled, perfect: this.misses === 0 && !this.assisted,
      progress: this.progress,
    };
  }
  strike(audio) {
    if (this.phase !== 'play' || this.cooldown > 0) return;
    if (this.inWindow) {
      this.hits++; this.roundMisses = 0; audio.shofar();
      this.feedback = 'בתזמון הנכון! ההצלחה נשמרת.';
      this.clock = 0;
      if (this.hits >= this.rounds) this.phase = 'done';
    } else {
      this.misses++; this.roundMisses++; audio.wrong();
      this.feedback = this.roundMisses % 3 === 0
        ? 'נרחיב מעט את האזור המואר. אפשר גם להפעיל סיוע.'
        : 'כמעט — תקעו כשהסמן בתוך האזור המואר. ההצלחות נשמרות.';
    }
    this.cooldown = 0.35;
  }
  update(dt, input, audio) {
    this.t += dt;
    if (this.t < 0.18) return;
    if (input.pressed('back')) { this._close(true); return; }
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.buttons.set([
      { id: 'strike', x: 340, y: 410, w: 280, h: 44,
        label: this.phase === 'intro' ? 'מתחילים' : this.phase === 'done' ? 'המשך' : 'תקיעה · X / רווח', size: 19 },
      { id: 'assist', x: 135, y: 470, w: 240, h: 32,
        label: this.assisted ? 'סיוע פועל — חלון רחב' : 'מצב סיוע · C', size: 14 },
      { id: 'back', x: 665, y: 470, w: 160, h: 32, label: 'חזרה · ESC', size: 14 },
    ]);
    const choice = this.buttons.update(input);
    if (choice === 'back') { this._close(true); return; }
    if (choice === 'assist' || input.pressed('build')) this.assisted = !this.assisted;
    if (this.phase === 'play') this.clock += dt;
    const activate = choice === 'strike' || input.pressed('shofar')
      || input.pressed('jump') || input.pressed('confirm');
    if (!activate) return;
    if (this.phase === 'intro') { this.phase = 'play'; this.clock = 0; return; }
    if (this.phase === 'done') { this._close(false); return; }
    this.strike(audio);
  }
  draw(ctx) {
    backdrop(ctx, 0.9); panel(ctx, 100, 24, 760, 492);
    header(ctx, this.title, 'אתגר תזמון בהשראת יריחו — בלי פגיעה ובלי איבוד חיים', 58);
    for (let i = 0; i < this.rounds; i++) {
      circle(ctx, 610 - i * 43, 141, 13, i < this.hits ? '#e9c66d' : '#4c504a');
      text(ctx, String(i + 1), 610 - i * 43, 141, { size: 12, color: '#171d20', outline: null });
    }
    if (this.phase === 'intro') {
      wrap(ctx, 'כשהסמן עובר באזור המואר תקעו בשופר. כל הצלחה מקרבת להשלמת האתגר; טעות משאירה את כל ההצלחות. C מרחיב את חלון הזמן.', 810, 215, 660, 30, { size: 20 });
    } else if (this.phase === 'done') {
      text(ctx, 'הַקּוֹל נִשְׁמַע — הָאֶתְגָּר הֻשְׁלַם!', 480, 232, { size: 27, color: '#ffe9a8' });
      text(ctx, 'העומר נאסף, והדרך ממשיכה.', 480, 279, { size: 19 });
    } else {
      const x = 180, y = 257, w = 600;
      ctx.fillStyle = '#263842'; ctx.fillRect(x, y, w, 40);
      const span = this.windowWidth;
      ctx.fillStyle = this.assisted ? '#659585' : '#a39043';
      ctx.fillRect(x + w * (0.5 - span / 2), y, w * span, 40);
      const cx = x + this.cursor * w;
      ctx.fillStyle = '#fff2be'; ctx.fillRect(cx - 3, y - 8, 6, 56);
      text(ctx, this.inWindow ? 'עכשיו!' : 'חכו לאזור המואר', 480, 223, {
        size: 23, color: this.inWindow ? '#b9edb3' : '#e8dcc0',
      });
      wrap(ctx, this.feedback, 810, 333, 660, 24, { size: 16, color: '#e7d49c' });
    }
    text(ctx, 'שבע הצלחות הן פישוט משחקי; סדר ההקפות המקראי מתואר ביהושע ו׳.', 480, 385, {
      size: 12, color: '#b9b495',
    });
    this.buttons.draw(ctx, this.t);
  }
}
