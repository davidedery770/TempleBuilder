import { ButtonSet } from '../core/ui.js';
import { text, glow, circle } from '../core/art.js';
import { backdrop, panel, header, wrap } from './shared.js';
import { drawLoaf } from '../core/nobArt.js';

const ROWS = [{ id: 'right', label: 'מַעֲרָכָה רִאשׁוֹנָה', x: 610 }, { id: 'left', label: 'מַעֲרָכָה שְׁנִיָּה', x: 350 }];
const PER_ROW = 6;

/**
 * מסדרים את לחם הפנים: שתים־עשרה חלות בשתי מערכות, שש בכל מערכה,
 * ולבונה על כל מערכה (ויקרא כ״ד, ה׳–ז׳). טעות מסבירה ולא מורידה חיים.
 */
export class ShowbreadGame {
  constructor(game, params = {}) {
    this.game = game;
    this.speaker = params.speaker || 'אֲחִימֶלֶךְ הַכֹּהֵן';
    this.rows = { right: 0, left: 0 };
    this.levonah = { right: false, left: false };
    this.focus = 'right';
    this.misses = 0;
    this.phase = 'intro';
    this.feedback = '';
    this.t = 0;
    this.finished = false; this.result = null;
    this.buttons = new ButtonSet();
  }

  get placed() { return this.rows.right + this.rows.left; }
  get stage() { return this.placed < PER_ROW * 2 ? 'loaves' : 'levonah'; }
  get narrationKey() { return this.phase; }
  get narrationText() { return this.phase === 'intro' ? INTRO : this.phase === 'done' ? DONE : ''; }

  _close(cancelled) {
    this.finished = true;
    this.result = { kind: 'showbread', success: !cancelled && this.phase === 'done', cancelled, perfect: this.misses === 0 };
  }

  place(row, audio) {
    if (this.phase !== 'play') return;
    if (this.stage === 'loaves') {
      if (this.rows[row] >= PER_ROW) {
        this.misses++; audio.wrong();
        this.feedback = 'במערכה הזאת כבר שש חלות. בכל מערכה שש — שימו בשנייה.';
        return;
      }
      this.rows[row]++; audio.pickup(3);
      this.feedback = this.stage === 'levonah' ? 'שתים־עשרה חלות! עכשיו לבונה על כל מערכה.' : '';
    } else {
      if (this.levonah[row]) {
        this.misses++; audio.wrong();
        this.feedback = 'כאן כבר יש לבונה. גם המערכה השנייה צריכה.';
        return;
      }
      this.levonah[row] = true; audio.correct();
      if (this.levonah.right && this.levonah.left) { this.phase = 'done'; audio.relic(); this.feedback = ''; }
    }
  }

  update(dt, input, audio) {
    this.t += dt;
    if (this.t < 0.18) return;
    if (input.pressed('back')) { this._close(true); return; }
    const buttons = [
      { id: 'go', x: 340, y: 432, w: 280, h: 42, size: 18,
        label: this.phase === 'intro' ? 'מתחילים' : this.phase === 'done' ? 'המשך' : this.stage === 'loaves' ? 'מניחים חלה · Enter' : 'מניחים לבונה · Enter' },
      { id: 'back', x: 690, y: 480, w: 150, h: 30, label: 'חזרה · ESC', size: 13 },
    ];
    if (this.phase === 'play') for (const r of ROWS) buttons.push({ id: r.id, x: r.x - 110, y: 352, w: 220, h: 34, label: r.label, size: 15 });
    this.buttons.set(buttons);
    const choice = this.buttons.update(input);
    if (choice === 'back') { this._close(true); return; }
    if (this.phase === 'intro' && (choice === 'go' || input.pressed('confirm') || input.pressed('jump'))) { this.phase = 'play'; return; }
    if (this.phase === 'done' && (choice === 'go' || input.pressed('confirm') || input.pressed('jump'))) { this._close(false); return; }
    if (this.phase !== 'play') return;
    if (input.pressed('right')) { this.focus = 'right'; audio.menuMove(); }
    if (input.pressed('left')) { this.focus = 'left'; audio.menuMove(); }
    if (choice === 'right' || choice === 'left') { this.focus = choice; this.place(choice, audio); return; }
    if (choice === 'go' || input.pressed('confirm') || input.pressed('jump')) this.place(this.focus, audio);
  }

  draw(ctx) {
    backdrop(ctx, 0.9); panel(ctx, 100, 24, 760, 492);
    header(ctx, 'לֶחֶם הַפָּנִים', 'שְׁתֵּים־עֶשְׂרֵה חַלּוֹת · שְׁתֵּי מַעֲרָכוֹת · לְבוֹנָה', 58);
    if (this.phase === 'intro') {
      wrap(ctx, INTRO, 810, 140, 660, 28, { size: 18 });
    } else {
      // השולחן
      ctx.fillStyle = '#c89b45'; ctx.fillRect(220, 300, 520, 16);
      ctx.fillRect(240, 316, 12, 40); ctx.fillRect(708, 316, 12, 40);
      for (const r of ROWS) {
        const focused = r.id === this.focus && this.phase === 'play';
        if (focused) glow(ctx, r.x, 230, 120, '#ffe9a8', 0.18);
        for (let i = 0; i < PER_ROW; i++) {
          const y = 286 - i * 17;
          if (i < this.rows[r.id]) drawLoaf(ctx, r.x, y, 1.6);
          else { ctx.strokeStyle = 'rgba(255,233,168,0.25)'; ctx.setLineDash([4, 4]); ctx.strokeRect(r.x - 26, y - 8, 52, 15); ctx.setLineDash([]); }
        }
        if (this.levonah[r.id]) { circle(ctx, r.x + 50, 276, 13, '#c9b48a'); circle(ctx, r.x + 50, 270, 8, '#f4ecd8'); }
        text(ctx, `${this.rows[r.id]}/6`, r.x, 176, { size: 18, color: '#ffe9a8' });
      }
      const left = PER_ROW * 2 - this.placed;
      text(ctx, this.phase === 'done' ? 'הַלֶּחֶם מְסֻדָּר!' : this.stage === 'loaves' ? `נותרו בסל: ${left}` : 'שימו לבונה על כל מערכה',
        480, 128, { size: 21, color: this.phase === 'done' ? '#b9edb3' : '#e8dcc0' });
      if (this.feedback) wrap(ctx, this.feedback, 810, 400, 660, 22, { size: 15, color: '#e7d49c' });
    }
    text(ctx, 'ויקרא כ״ד, ה׳–ז׳ · ←→ בוחרים מערכה', 480, 498, { size: 12, color: '#b9b495' });
    this.buttons.draw(ctx, this.t);
  }
}

const INTRO = 'אחימלך הכהן מראה איך מסדרים את לחם הפנים על השולחן: שתים־עשרה חלות בשתי מערכות, שש בכל מערכה, ולבונה על כל מערכה. בכל שבת מחליפים את הלחם בלחם חם.';
const DONE = 'הלחם מסודר. את הלחם שהוסר מהשולחן נתן אחימלך לדוד הרעב.';
