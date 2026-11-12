import { ButtonSet } from '../core/ui.js';
import { text, circle, glow } from '../core/art.js';
import { backdrop, panel, header, wrap } from './shared.js';

const CUPS = 7, GAP = 74, CX = 480, CUP_Y = 268;
const cupX = i => CX + (3 - i) * GAP;   // i=0 is the rightmost cup: Hebrew reading order.

/**
 * הדלקת שבעת נרות המנורה: כד השמן נע מעל הנרות, ומוזגים כשהוא מעל הנר המואר.
 * תזמון בלבד; טעות לא מכבה נר שכבר דולק ולא מורידה חיים.
 * המחשה משחקית — במשכן הכהנים הם שהדליקו את הנרות.
 */
export class MenorahLightingGame {
  constructor(game, params = {}) {
    this.game = game;
    this.speaker = params.speaker || 'עֵלִי הַכֹּהֵן';
    this.lit = Math.max(0, Math.min(CUPS, params.progress?.lit || 0));
    this.misses = params.progress?.misses || 0;
    this.roundMisses = 0;
    this.assisted = !!params.progress?.assisted;
    this.phase = this.lit >= CUPS ? 'done' : 'intro';
    this.clock = 0; this.cooldown = 0; this.t = 0; this.splash = 0;
    this.feedback = '';
    this.finished = false; this.result = null;
    this.buttons = new ButtonSet();
  }

  get cycle() { return this.assisted ? 4.2 : Math.max(2.4, 3.4 - this.lit * 0.13); }
  /** מרחק בפיקסלים מהנר שבו המזיגה עוד נחשבת */
  get window() { return this.assisted ? 34 : Math.min(34, Math.max(15, 26 - this.lit * 1.5) + Math.floor(this.roundMisses / 3) * 7); }
  get jugX() {
    const span = 3 * GAP + 50, phase = (this.clock % this.cycle) / this.cycle;
    const k = phase < 0.5 ? phase * 2 : 2 - phase * 2;
    return CX + span - k * span * 2;
  }
  get onTarget() { return Math.abs(this.jugX - cupX(this.lit)) <= this.window; }
  get progress() { return { lit: this.lit, misses: this.misses, assisted: this.assisted }; }
  get narrationKey() { return `${this.phase}:${this.lit}`; }
  get narrationText() {
    return this.phase === 'intro' ? INTRO : this.phase === 'done' ? DONE : '';
  }

  _close(cancelled) {
    this.finished = true;
    this.result = {
      kind: 'menorahLighting', success: !cancelled && this.lit >= CUPS, cancelled,
      perfect: this.misses === 0 && !this.assisted, progress: this.progress,
    };
  }

  pour(audio) {
    if (this.phase !== 'play' || this.cooldown > 0) return;
    if (this.onTarget) {
      this.lit++; this.roundMisses = 0; this.splash = 0.5;
      audio.correct();
      this.feedback = this.lit >= CUPS ? '' : `נֵר ${this.lit} דּוֹלֵק! עוֹד ${CUPS - this.lit}.`;
      if (this.lit >= CUPS) { this.phase = 'done'; audio.relic(); }
    } else {
      this.misses++; this.roundMisses++; audio.wrong();
      this.feedback = this.roundMisses % 3 === 0
        ? 'הכד יאט מעט. אפשר גם להפעיל סיוע.'
        : 'כמעט — מוזגים כשהכד מעל הנר המסומן. הנרות שדולקים נשארים דולקים.';
    }
    this.cooldown = 0.3;
  }

  update(dt, input, audio) {
    this.t += dt;
    this.splash = Math.max(0, this.splash - dt);
    if (this.t < 0.18) return;
    if (input.pressed('back')) { this._close(true); return; }
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.buttons.set([
      { id: 'pour', x: 340, y: 410, w: 280, h: 44,
        label: this.phase === 'intro' ? 'מתחילים' : this.phase === 'done' ? 'המשך' : 'מוזגים · רווח / Enter', size: 19 },
      { id: 'assist', x: 135, y: 470, w: 240, h: 32,
        label: this.assisted ? 'סיוע פועל — כד איטי' : 'מצב סיוע · C', size: 14 },
      { id: 'back', x: 665, y: 470, w: 160, h: 32, label: 'חזרה · ESC', size: 14 },
    ]);
    const choice = this.buttons.update(input);
    if (choice === 'back') { this._close(true); return; }
    if (choice === 'assist' || input.pressed('build')) this.assisted = !this.assisted;
    if (this.phase === 'play') this.clock += dt * (this.roundMisses >= 3 ? 0.8 : 1);
    const activate = choice === 'pour' || input.pressed('jump') || input.pressed('confirm')
      || input.pressed('attack') || input.pressed('shofar');
    if (!activate) return;
    if (this.phase === 'intro') { this.phase = 'play'; this.clock = 0; return; }
    if (this.phase === 'done') { this._close(false); return; }
    this.pour(audio);
  }

  draw(ctx) {
    backdrop(ctx, 0.9); panel(ctx, 100, 24, 760, 492);
    header(ctx, 'הַדְלָקַת הַמְּנוֹרָה', 'שִׁבְעָה נֵרוֹת · שֶׁמֶן זַיִת זָךְ', 58);
    this._menorah(ctx);
    if (this.phase === 'intro') {
      wrap(ctx, INTRO, 810, 128, 660, 26, { size: 17 });
    } else if (this.phase === 'done') {
      text(ctx, 'נֵר אֱלֹקִים דּוֹלֵק!', 480, 132, { size: 27, color: '#ffe9a8' });
    } else {
      this._jug(ctx);
      text(ctx, this.onTarget ? 'עכשיו!' : 'חכו שהכד יהיה מעל הנר המסומן', 480, 122, {
        size: 20, color: this.onTarget ? '#b9edb3' : '#e8dcc0',
      });
    }
    if (this.feedback && this.phase === 'play') wrap(ctx, this.feedback, 810, 372, 660, 22, { size: 15, color: '#e7d49c' });
    text(ctx, 'המחשה משחקית: בעבודת המשכן הכהנים הדליקו את נרות המנורה.', 480, 395, { size: 12, color: '#b9b495' });
    this.buttons.draw(ctx, this.t);
  }

  _menorah(ctx) {
    ctx.save();
    ctx.strokeStyle = '#c99a38'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(CX, CUP_Y + 6); ctx.lineTo(CX, CUP_Y + 92);
    for (let k = 1; k <= 3; k++) {
      for (const s of [-1, 1]) {
        ctx.moveTo(CX, CUP_Y + 30 + k * 8);
        ctx.quadraticCurveTo(CX + s * k * GAP, CUP_Y + 30 + k * 8, CX + s * k * GAP, CUP_Y + 6);
      }
    }
    ctx.stroke();
    ctx.fillStyle = '#b8892f'; ctx.fillRect(CX - 44, CUP_Y + 90, 88, 10);
    ctx.restore();
    for (let i = 0; i < CUPS; i++) {
      const x = cupX(i), lit = i < this.lit, target = i === this.lit && this.phase === 'play';
      if (target) glow(ctx, x, CUP_Y, 34, '#9fe3ff', 0.35 + 0.2 * Math.sin(this.t * 6));
      ctx.fillStyle = '#e1b54d';
      ctx.beginPath(); ctx.ellipse(x, CUP_Y, 13, 6, 0, 0, Math.PI); ctx.fill();
      ctx.fillRect(x - 13, CUP_Y - 3, 26, 4);
      if (lit) {
        const f = Math.sin(this.t * 10 + i) * 2;
        glow(ctx, x, CUP_Y - 18, 30, '#ffc35a', 0.6);
        ctx.fillStyle = '#ffd96a';
        ctx.beginPath(); ctx.moveTo(x - 6, CUP_Y - 3); ctx.quadraticCurveTo(x + f, CUP_Y - 34, x + 6, CUP_Y - 3); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fff6d2';
        ctx.beginPath(); ctx.moveTo(x - 3, CUP_Y - 3); ctx.quadraticCurveTo(x + f / 2, CUP_Y - 20, x + 3, CUP_Y - 3); ctx.closePath(); ctx.fill();
      }
      text(ctx, String(i + 1), x, CUP_Y + 22, { size: 12, color: '#d8c79a', outline: null });
    }
  }

  _jug(ctx) {
    const x = this.jugX, y = 178;
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.35);
    ctx.fillStyle = '#b07a3a';
    ctx.beginPath(); ctx.ellipse(0, 0, 18, 15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(-7, -22, 14, 10); ctx.fillRect(10, -8, 16, 5);
    ctx.restore();
    if (this.splash > 0) for (let k = 0; k < 4; k++) circle(ctx, x + 18, y + 14 + k * 18 * (1 - this.splash), 3, '#f4d36b');
  }
}

const INTRO = 'כד השמן נע מעל קני המנורה. כשהוא מעל הנר המסומן — מוזגים, והנר נדלק. מדליקים את שבעת הנרות מימין לשמאל. טעות לא מכבה נר; C מאט את הכד.';
const DONE = 'שבעת הנרות דולקים. בשילה, ״נר אלוקים טרם יכבה״ — הנר דלק עד הבוקר.';
