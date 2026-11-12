import { ButtonSet } from '../core/ui.js';
import { text, circle, glow, roundRect } from '../core/art.js';
import { backdrop, wrap } from './shared.js';

/**
 * "שְׁאַל מָה אֶתֶּן לָךְ" — חלום שלמה בגבעון (מלכים א׳ ג׳, ה׳–י״ד).
 * בוחרים אחד מארבעה קלפים. כל בחירה מקבלת תשובה חמה; רק "לב שומע" — מה
 * שביקש שלמה באמת — משלים את החלום. אין טעות שמענישה.
 */
const CARDS = [
  { id: 'wisdom', label: 'לֵב שֹׁמֵעַ', sub: 'לְהָבִין בֵּין טוֹב לְרָע', icon: 'heart' },
  { id: 'wealth', label: 'עֹשֶׁר', sub: 'הַרְבֵּה זָהָב וְכֶסֶף', icon: 'coins' },
  { id: 'honor', label: 'כָּבוֹד', sub: 'שֶׁכֻּלָּם יַעַרְצוּ אוֹתִי', icon: 'crown' },
  { id: 'life', label: 'אֹרֶךְ יָמִים', sub: 'לִחְיוֹת שָׁנִים רַבּוֹת', icon: 'sun' },
];
const REPLIES = {
  wealth: 'בקשה מובנת! אבל שלמה לא ביקש עושר. הוא חשב על העם שהוא צריך להנהיג. נסו קלף אחר.',
  honor: 'שלמה לא ביקש כבוד לעצמו. הוא ביקש משהו שיעזור לו לשפוט בצדק. נסו שוב.',
  life: 'שלמה לא ביקש חיים ארוכים לעצמו. הבקשה שלו הייתה בשביל אחרים. נסו שוב.',
};
const WIN = 'שלמה ביקש ״לב שומע לשפוט את עמך, להבין בין טוב לרע״. ה׳ נתן לו חכמה — וגם עושר וכבוד שלא ביקש!';

export class DreamChoiceGame {
  constructor(game, params = {}) {
    this.game = game;
    this.speaker = params.speaker || 'קוֹל בַּחֲלוֹם';
    // Order shuffles per visit so the right card is not always in the same spot.
    this.cards = CARDS.map((c, i) => ({ ...c, k: (i * 7 + (params.seed ?? Math.floor(Math.random() * 4))) % 4 }))
      .sort((a, b) => a.k - b.k);
    this.tried = new Set();
    this.picked = null;
    this.phase = 'ask';
    this.focus = -1;   // nothing pre-selected: Enter alone must not "answer" for the child
    this.t = 0; this.flash = 0;
    this.finished = false; this.result = null;
    this.buttons = new ButtonSet();
  }

  get narrationKey() { return `${this.phase}:${this.picked || ''}`; }
  get narrationText() {
    if (this.phase === 'won') return WIN;
    return this.picked ? REPLIES[this.picked] : 'בלילה, בגבעון, נראה ה׳ אל שלמה בחלום ואמר: ״שאל מה אתן לך.״ מה הייתם מבקשים?';
  }

  _rect(i) { return { x: 700 - i * 170, y: 190, w: 150, h: 190 }; }

  choose(id, audio) {
    if (this.phase !== 'ask') return;
    this.picked = id;
    this.tried.add(id);
    if (id === 'wisdom') { this.phase = 'won'; this.flash = 1.2; audio.relic(); }
    else audio.wrong?.();
  }

  _close(cancelled) {
    this.finished = true;
    this.result = { kind: 'dreamChoice', success: !cancelled && this.phase === 'won', cancelled, perfect: this.tried.size === 1 };
  }

  update(dt, input, audio) {
    this.t += dt; this.flash = Math.max(0, this.flash - dt);
    if (this.t < 0.18) return;
    if (input.pressed('back')) { this._close(true); return; }
    const items = this.phase === 'won'
      ? [{ id: 'go', x: 360, y: 452, w: 240, h: 42, label: 'וַיִּקַץ שְׁלֹמֹה — מַמְשִׁיכִים', size: 17 }]
      : this.cards.map((c, i) => ({ id: c.id, ...this._rect(i), label: '', size: 1 }));
    this.buttons.set(items);
    const choice = this.buttons.update(input);
    if (this.phase === 'won') {
      if (choice === 'go' || input.pressed('confirm') || input.pressed('jump')) this._close(false);
      return;
    }
    if (input.pressed('left')) this.focus = Math.min(3, this.focus + 1);
    if (input.pressed('right')) this.focus = Math.max(0, this.focus < 0 ? 0 : this.focus - 1);
    for (let n = 1; n <= 4; n++) if (input.pressed('opt' + n)) { this.choose(this.cards[n - 1].id, audio); return; }
    if (choice) { this.choose(choice, audio); return; }
    if (this.focus >= 0 && (input.pressed('confirm') || input.pressed('jump'))) this.choose(this.cards[this.focus].id, audio);
  }

  draw(ctx) {
    backdrop(ctx, 0.55);
    const g = ctx.createLinearGradient(0, 0, 0, 540);
    g.addColorStop(0, 'rgba(255,214,240,0.92)'); g.addColorStop(1, 'rgba(255,240,200,0.92)');
    ctx.fillStyle = g; roundRect(ctx, 90, 20, 780, 500, 18); ctx.fill();
    text(ctx, 'שְׁאַל מָה אֶתֶּן לָךְ', 480, 62, { size: 32, color: '#7a3f6a', weight: '700', outline: null });
    text(ctx, 'חֲלוֹם שְׁלֹמֹה בְּגִבְעוֹן · מְלָכִים א׳ ג׳', 480, 96, { size: 14, color: '#a0708e', outline: null });
    if (this.phase === 'won') {
      glow(ctx, 480, 270, 200 + this.flash * 80, '#fff1a8', 0.6);
      this._icon(ctx, 'heart', 480, 230, 1.8);
      wrap(ctx, WIN, 790, 330, 620, 30, { size: 19, color: '#5a3a4a', outline: null });
      for (let i = 0; i < 24; i++) {
        const a = i / 24 * Math.PI * 2 + this.t, r = 150 + Math.sin(this.t * 3 + i) * 20;
        circle(ctx, 480 + Math.cos(a) * r, 240 + Math.sin(a) * r * 0.5, 3, i % 2 ? '#ffd36a' : '#ff9cc8');
      }
    } else {
      this.cards.forEach((c, i) => {
        const r = this._rect(i), tried = this.tried.has(c.id), focused = i === this.focus;
        const lift = focused ? -6 + Math.sin(this.t * 4) * 2 : 0;
        ctx.save(); ctx.globalAlpha = tried ? 0.45 : 1;
        ctx.fillStyle = focused ? '#fff8e0' : '#fffdf6'; roundRect(ctx, r.x, r.y + lift, r.w, r.h, 14); ctx.fill();
        ctx.strokeStyle = focused ? '#e2a43a' : '#e8c9da'; ctx.lineWidth = focused ? 4 : 2; ctx.stroke();
        this._icon(ctx, c.icon, r.x + r.w / 2, r.y + 70 + lift, 1);
        text(ctx, c.label, r.x + r.w / 2, r.y + 132 + lift, { size: 21, color: '#5a3a4a', weight: '700', outline: null });
        text(ctx, c.sub, r.x + r.w / 2, r.y + 160 + lift, { size: 12, color: '#8a6a7a', outline: null });
        text(ctx, String(i + 1), r.x + 16, r.y + 18 + lift, { size: 13, color: '#c0a0b0', outline: null });
        ctx.restore();
      });
      wrap(ctx, this.picked ? REPLIES[this.picked] : 'בלילה נראה ה׳ אל שלמה בחלום ואמר: ״שאל מה אתן לך.״ מה ביקש שלמה? בחרו קלף.',
        790, 420, 620, 26, { size: 17, color: '#5a3a4a', outline: null });
    }
    this.buttons.items.filter(b => b.id === 'go').forEach(() => this.buttons.draw(ctx, this.t));
  }

  _icon(ctx, kind, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (kind === 'heart') {
      ctx.fillStyle = '#ff6f9a';
      ctx.beginPath(); ctx.moveTo(0, 22);
      ctx.bezierCurveTo(-34, 0, -24, -28, 0, -12); ctx.bezierCurveTo(24, -28, 34, 0, 0, 22); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(2, -2, 8, -1.2, 1.6); ctx.stroke();   // אוזן קטנה: לב "שומע"
    } else if (kind === 'coins') {
      for (let i = 0; i < 4; i++) { circle(ctx, -12 + i * 8, 14 - i * 9, 14, '#e7b94a'); circle(ctx, -12 + i * 8, 14 - i * 9, 9, '#ffe08a'); }
    } else if (kind === 'crown') {
      ctx.fillStyle = '#e7b94a';
      ctx.beginPath(); ctx.moveTo(-26, 16); ctx.lineTo(-26, -10); ctx.lineTo(-13, 4); ctx.lineTo(0, -18);
      ctx.lineTo(13, 4); ctx.lineTo(26, -10); ctx.lineTo(26, 16); ctx.closePath(); ctx.fill();
      circle(ctx, 0, 6, 5, '#e05a7a');
    } else {
      circle(ctx, 0, 0, 16, '#ffc34a');
      ctx.strokeStyle = '#ffc34a'; ctx.lineWidth = 4;
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 22, Math.sin(a) * 22); ctx.lineTo(Math.cos(a) * 30, Math.sin(a) * 30); ctx.stroke(); }
    }
    ctx.restore();
  }
}
