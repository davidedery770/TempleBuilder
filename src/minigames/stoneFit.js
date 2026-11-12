import { ButtonSet } from '../core/ui.js';
import { text, glow, circle, roundRect } from '../core/art.js';
import { backdrop, wrap } from './shared.js';

/**
 * "אבן שלמה מסע נבנה" (מלכים א׳ ו׳, ז׳): כל אבן הוכנה מראש במחצבה למקום אחד.
 * בכל פעם מסומן מקום פנוי בקיר; בוחרים את האבן שמתאימה לו בדיוק, והיא נכנסת —
 * בלי קול. אבן שלא מתאימה פשוט חוזרת, בלי עונש.
 */
const SHAPES = {
  square: [[0, 0], [1, 0], [0, 1], [1, 1]],
  long: [[0, 0], [1, 0], [2, 0]],
  corner: [[0, 0], [0, 1], [1, 1]],
  step: [[0, 0], [1, 0], [1, 1], [2, 1]],
};
const ORDER = ['long', 'corner', 'square', 'step'];
const CELL = 26;

export class StoneFitGame {
  constructor(game, params = {}) {
    this.game = game;
    this.speaker = params.speaker || 'שְׁלֹמֹה';
    this.slot = Math.max(0, Math.min(ORDER.length, params.progress?.placed || 0));
    this.misses = params.progress?.misses || 0;
    // The tray order never matches the slot order, so each choice needs a real look.
    this.tray = ['step', 'square', 'long', 'corner'];
    this.focus = -1;
    this.phase = this.slot >= ORDER.length ? 'done' : 'intro';
    this.feedback = ''; this.t = 0; this.pop = 0;
    this.finished = false; this.result = null;
    this.buttons = new ButtonSet();
  }

  get progress() { return { placed: this.slot, misses: this.misses }; }
  get narrationKey() { return this.phase; }
  get narrationText() { return this.phase === 'intro' ? INTRO : this.phase === 'done' ? DONE : ''; }

  _close(cancelled) {
    this.finished = true;
    this.result = { kind: 'stoneFit', success: !cancelled && this.phase === 'done', cancelled, perfect: this.misses === 0, progress: this.progress };
  }

  _trayRect(i) { return { x: 640 - i * 150, y: 330, w: 130, h: 110 }; }

  pick(shape, audio) {
    if (this.phase !== 'play') return;
    if (shape === ORDER[this.slot]) {
      this.slot++; this.pop = 0.6;
      this.feedback = 'מתאימה בדיוק — ונכנסה בלי שום קול.';
      audio.correct();
      if (this.slot >= ORDER.length) { this.phase = 'done'; audio.relic(); }
    } else {
      this.misses++;
      this.feedback = 'האבן הזאת הוכנה למקום אחר. נסו אבן אחרת.';
      audio.wrong();
    }
  }

  update(dt, input, audio) {
    this.t += dt; this.pop = Math.max(0, this.pop - dt);
    if (this.t < 0.18) return;
    if (input.pressed('back')) { this._close(true); return; }
    const items = this.phase === 'play'
      ? this.tray.map((s, i) => ({ id: s, ...this._trayRect(i), label: '', size: 1 })).filter(b => ORDER.indexOf(b.id) >= this.slot)
      : [{ id: 'go', x: 360, y: 452, w: 240, h: 42, label: this.phase === 'intro' ? 'מתחילים' : 'המשך', size: 18 }];
    this.buttons.set(items);
    const choice = this.buttons.update(input);
    if (this.phase !== 'play') {
      if (choice === 'go' || input.pressed('confirm') || input.pressed('jump')) {
        if (this.phase === 'intro') this.phase = 'play'; else this._close(false);
      }
      return;
    }
    const left = this.tray.filter(s => ORDER.indexOf(s) >= this.slot);
    if (input.pressed('left')) this.focus = Math.min(left.length - 1, this.focus + 1);
    if (input.pressed('right')) this.focus = Math.max(0, this.focus < 0 ? 0 : this.focus - 1);
    for (let n = 1; n <= left.length; n++) if (input.pressed('opt' + n)) { this.pick(left[n - 1], audio); return; }
    if (choice) { this.pick(choice, audio); return; }
    if (this.focus >= 0 && (input.pressed('confirm') || input.pressed('jump'))) this.pick(left[Math.min(this.focus, left.length - 1)], audio);
  }

  draw(ctx) {
    backdrop(ctx, 0.5);
    const g = ctx.createLinearGradient(0, 0, 0, 540);
    g.addColorStop(0, 'rgba(222,240,252,0.95)'); g.addColorStop(1, 'rgba(248,238,214,0.95)');
    ctx.fillStyle = g; roundRect(ctx, 90, 20, 780, 500, 18); ctx.fill();
    text(ctx, 'אֶבֶן שְׁלֵמָה מַסָּע', 480, 56, { size: 30, color: '#5a4426', weight: '700', outline: null });
    text(ctx, 'כָּל אֶבֶן הוּכְנָה בַּמַּחְצָבָה לְמָקוֹם אֶחָד · מְלָכִים א׳ ו׳, ז׳', 480, 88, { size: 14, color: '#8a7350', outline: null });
    if (this.phase === 'intro') {
      wrap(ctx, INTRO, 790, 150, 620, 30, { size: 19, color: '#4a3a24', outline: null });
      return this._buttons(ctx);
    }
    // הקיר: ארבעה מקומות, המקום הנוכחי מהבהב
    ctx.fillStyle = '#e2cfa4'; ctx.fillRect(170, 120, 620, 170);
    ctx.save();
    ctx.beginPath(); ctx.rect(170, 120, 620, 170); ctx.clip();   // brick lines stay inside the wall
    ctx.strokeStyle = '#c4ab78'; ctx.lineWidth = 1;
    for (let r = 0; r < 7; r++) for (let k = -1; k < 12; k++) ctx.strokeRect(170 + k * 56 + (r % 2) * 28, 120 + r * 28, 56, 28);
    ctx.restore();
    ORDER.forEach((shape, i) => {
      const ox = 690 - i * 150, oy = 165;
      const filled = i < this.slot, current = i === this.slot && this.phase === 'play';
      if (current) glow(ctx, ox + 30, oy + 26, 70, '#fff2a8', 0.45 + 0.2 * Math.sin(this.t * 5));
      this._shape(ctx, shape, ox, oy, filled ? 'stone' : current ? 'hole-now' : 'hole', filled && i === this.slot - 1 ? this.pop : 0);
    });
    if (this.phase === 'done') {
      text(ctx, 'הַקִּיר שָׁלֵם — וְלֹא נִשְׁמַע שׁוּם קוֹל!', 480, 330, { size: 26, color: '#4a6a3a', weight: '700', outline: null });
      wrap(ctx, DONE, 790, 372, 620, 26, { size: 17, color: '#4a3a24', outline: null });
      for (let i = 0; i < 16; i++) circle(ctx, 200 + i * 38, 300 + Math.sin(this.t * 4 + i) * 6, 3, i % 2 ? '#ffd36a' : '#ffffff');
      return this._buttons(ctx);
    }
    text(ctx, 'אֵיזוֹ אֶבֶן מַתְאִימָה לַמָּקוֹם הַמְּסֻמָּן?', 480, 310, { size: 18, color: '#5a4426', outline: null });
    const left = this.tray.filter(s => ORDER.indexOf(s) >= this.slot);
    left.forEach((shape, i) => {
      const r = this._trayRect(i), f = i === this.focus;
      ctx.fillStyle = f ? '#fff6dc' : '#fffdf6'; roundRect(ctx, r.x, r.y, r.w, r.h, 12); ctx.fill();
      ctx.strokeStyle = f ? '#e2a43a' : '#d8c8a8'; ctx.lineWidth = f ? 3 : 1.5; ctx.stroke();
      this._shape(ctx, shape, r.x + 30, r.y + 26, 'stone', 0);
      text(ctx, String(i + 1), r.x + 14, r.y + 14, { size: 12, color: '#b8a07a', outline: null });
    });
    if (this.feedback) text(ctx, this.feedback, 480, 470, { size: 16, color: '#7a5a2a', outline: null });
  }

  _buttons(ctx) { this.buttons.draw(ctx, this.t); }

  _shape(ctx, shape, ox, oy, mode, pop) {
    const s = 1 + pop * 0.15;
    for (const [cx, cy] of SHAPES[shape]) {
      const x = ox + cx * CELL * s, y = oy + cy * CELL * s, w = CELL * s - 2;
      if (mode === 'stone') {
        ctx.fillStyle = '#f4ecd8'; ctx.fillRect(x, y, w, w);
        ctx.strokeStyle = '#a8946a'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, w);
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(x + 3, y + 3, w - 6, 3);
      } else {
        ctx.fillStyle = mode === 'hole-now' ? 'rgba(90,64,30,0.55)' : 'rgba(90,64,30,0.3)';
        ctx.fillRect(x, y, w, w);
        ctx.setLineDash([4, 3]); ctx.strokeStyle = mode === 'hole-now' ? '#fff2a8' : '#b89e6a'; ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, w); ctx.setLineDash([]);
      }
    }
  }
}

const INTRO = 'בבית המקדש לא נשמעו פטיש וגרזן: את האבנים חצבו והכינו מראש במחצבה, וכל אבן הגיעה מוכנה למקומה. בחרו לכל מקום מסומן בקיר את האבן שמתאימה לו בדיוק.';
const DONE = '״והבית בהבנתו אבן שלמה מסע נבנה, ומקבות והגרזן כל כלי ברזל לא נשמע בבית בהבנתו.״';
