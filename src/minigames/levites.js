import { ButtonSet } from '../core/ui.js';
import { text, glow, circle, roundRect } from '../core/art.js';
import { backdrop, wrap } from './shared.js';

/**
 * "כְּאֶחָד... לְהַשְׁמִיעַ קוֹל אֶחָד" (דברי הימים ב׳ ה׳, י״ג): משחק קצב עם הלויים.
 * שלושה מסלולים — מצלתיים, נבל וחצוצרה. תווים יורדים אל קו הנגינה, ומנגנים כשהם
 * עליו (← ↓ → או 1 2 3, או נגיעה). כל שלוש פגיעות מוסיפות מילה לפסוק
 * "כי טוב כי לעולם חסדו". אין עונש: מי שלא הצליח מנגן שוב, עם סיוע אם רוצים.
 */
const LANES = [
  // The arrow matches where the lane sits on screen: cymbals on the right, trumpet on the left.
  { id: 'cymbals', label: 'מְצִלְתַּיִם', key: 'right', arrow: '→', opt: 'opt1', color: '#e3b23c', freq: 1320, type: 'triangle' },
  { id: 'harp', label: 'נֵבֶל', key: 'down', arrow: '↓', opt: 'opt2', color: '#8ac06a', freq: 523, type: 'sine' },
  { id: 'trumpet', label: 'חֲצוֹצְרָה', key: 'left', arrow: '←', opt: 'opt3', color: '#e07a4a', freq: 392, type: 'square' },
];
const WORDS = ['כִּי', 'טוֹב', 'כִּי', 'לְעוֹלָם', 'חַסְדּוֹ'];
const BEAT = 0.62;
// Lane per beat (null = rest): a short, friendly melody pattern.
const CHART = [0, 1, 2, null, 0, 0, 1, null, 2, 1, 0, null, 1, 2, 2, null, 0, 1, 2, 1].map((lane, i) => lane === null ? null : { t: 2 + i * BEAT, lane })
  .filter(Boolean);
const NEED = Math.ceil(CHART.length * 0.65);
const FALL = 1.6;           // שניות מהופעת התו ועד קו הנגינה
const LINE_Y = 410, TOP_Y = 150;
const laneX = i => 640 - i * 160;   // מימין לשמאל: מצלתיים מימין

export class LevitesGame {
  constructor(game, params = {}) {
    this.game = game;
    this.speaker = params.speaker || 'הַלְוִיִּם';
    this.assisted = !!params.progress?.assisted;
    this.best = params.progress?.best || 0;
    this.phase = 'intro';
    this.t = 0; this.clock = 0;
    this._reset();
    this.finished = false; this.result = null;
    this.buttons = new ButtonSet();
  }

  _reset() {
    this.notes = CHART.map(n => ({ ...n, hit: false, missed: false }));
    this.hits = 0; this.clock = 0; this.flash = [0, 0, 0]; this.feedback = '';
  }

  get window() { return this.assisted ? 0.28 : 0.18; }
  get speed() { return this.assisted ? 0.8 : 1; }
  get words() { return Math.min(WORDS.length, Math.floor(this.hits / 3)); }
  get progress() { return { assisted: this.assisted, best: Math.max(this.best, this.hits) }; }
  get narrationKey() { return this.phase; }
  get narrationText() { return this.phase === 'intro' ? INTRO : this.phase === 'won' ? WON : ''; }

  _close(cancelled) {
    this.finished = true;
    this.result = { kind: 'levites', success: !cancelled && this.phase === 'won', cancelled,
      perfect: this.hits === CHART.length && !this.assisted, progress: this.progress };
  }

  strike(lane, audio) {
    if (this.phase !== 'play') return;
    this.flash[lane] = 0.2;
    const note = this.notes.filter(n => n.lane === lane && !n.hit && !n.missed)
      .sort((a, b) => Math.abs(a.t - this.clock) - Math.abs(b.t - this.clock))[0];
    if (note && Math.abs(note.t - this.clock) <= this.window) {
      note.hit = true; this.hits++;
      const L = LANES[lane];
      audio.tone ? audio.tone({ freq: L.freq, freqEnd: L.freq * 1.01, dur: 0.18, type: L.type, gain: 0.12 }) : audio.correct?.();
    } else {
      audio.menuMove?.();
    }
  }

  update(dt, input, audio) {
    this.t += dt;
    this.flash = this.flash.map(f => Math.max(0, f - dt));
    if (this.t < 0.18) return;
    if (input.pressed('back')) { this._close(true); return; }
    const items = this.phase === 'play'
      ? LANES.map((L, i) => ({ id: String(i), x: laneX(i) - 70, y: LINE_Y - 30, w: 140, h: 90, label: '', size: 1 }))
      : [{ id: 'go', x: 340, y: 452, w: 280, h: 42, size: 18,
        label: this.phase === 'intro' ? 'מתחילים לנגן' : this.phase === 'won' ? 'המשך' : 'מנגנים שוב' },
      { id: 'assist', x: 135, y: 470, w: 180, h: 30, size: 13, label: this.assisted ? 'סיוע פועל' : 'מצב סיוע · C' }];
    this.buttons.set(items);
    const choice = this.buttons.update(input);
    if (choice === 'assist' || input.pressed('build')) this.assisted = !this.assisted;
    if (this.phase !== 'play') {
      if (choice === 'go' || input.pressed('confirm') || input.pressed('jump')) {
        if (this.phase === 'won') { this._close(false); return; }
        this._reset(); this.phase = 'play';
      }
      return;
    }
    this.clock += dt * this.speed;
    LANES.forEach((L, i) => { if (input.pressed(L.key) || input.pressed(L.opt) || choice === String(i)) this.strike(i, audio); });
    for (const n of this.notes) if (!n.hit && !n.missed && this.clock - n.t > this.window) n.missed = true;
    if (this.notes.every(n => n.hit || n.missed)) {
      this.best = Math.max(this.best, this.hits);
      if (this.hits >= NEED) { this.phase = 'won'; audio.levelComplete?.(); }
      else { this.phase = 'again'; this.feedback = `${this.hits} מתוך ${CHART.length}. צריך ${NEED} — אפשר לנסות שוב, גם עם סיוע.`; }
    }
  }

  draw(ctx) {
    backdrop(ctx, 0.45);
    const g = ctx.createLinearGradient(0, 0, 0, 540);
    g.addColorStop(0, 'rgba(255,248,226,0.96)'); g.addColorStop(1, 'rgba(232,244,252,0.96)');
    ctx.fillStyle = g; roundRect(ctx, 90, 20, 780, 500, 18); ctx.fill();
    text(ctx, 'קוֹל אֶחָד', 480, 52, { size: 30, color: '#6a4a1a', weight: '700', outline: null });
    text(ctx, 'הַלְוִיִּם מְנַגְּנִים בַּחֲנֻכַּת הַבַּיִת · דִּבְרֵי הַיָּמִים ב׳ ה׳', 480, 84, { size: 14, color: '#8a7350', outline: null });
    // הפסוק נבנה מילה אחרי מילה
    const shown = WORDS.slice(0, this.phase === 'won' ? WORDS.length : this.words).join(' ');
    text(ctx, shown || '· · ·', 480, 120, { size: 24, color: '#b0622a', weight: '700', outline: null });
    if (this.phase === 'intro' || this.phase === 'again') {
      wrap(ctx, this.phase === 'intro' ? INTRO : this.feedback, 790, 170, 620, 30, { size: 18, color: '#4a3a24', outline: null });
      this._lanes(ctx, false);
      return this.buttons.draw(ctx, this.t);
    }
    if (this.phase === 'won') {
      glow(ctx, 480, 280, 220, '#fff2b0', 0.5);
      wrap(ctx, WON, 790, 190, 620, 30, { size: 19, color: '#4a3a24', outline: null });
      for (let i = 0; i < 20; i++) circle(ctx, 200 + i * 30, 330 + Math.sin(this.t * 5 + i) * 10, 4, i % 2 ? '#ffd36a' : '#8fd0f0');
      return this.buttons.draw(ctx, this.t);
    }
    this._lanes(ctx, true);
    text(ctx, `${this.hits}/${CHART.length}`, 160, 150, { size: 18, color: '#6a4a1a', outline: null });
  }

  _lanes(ctx, live) {
    LANES.forEach((L, i) => {
      const x = laneX(i);
      ctx.fillStyle = 'rgba(200,170,110,0.15)'; ctx.fillRect(x - 40, TOP_Y, 80, LINE_Y - TOP_Y + 20);
      if (this.flash[i] > 0) glow(ctx, x, LINE_Y, 60, L.color, this.flash[i] * 3);
      ctx.strokeStyle = L.color; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, LINE_Y, 26, 0, Math.PI * 2); ctx.stroke();
      text(ctx, L.label, x, LINE_Y + 48, { size: 16, color: '#5a4426', weight: '700', outline: null });
      text(ctx, L.arrow, x, LINE_Y, { size: 18, color: L.color, outline: null });
      if (!live) return;
      for (const n of this.notes) {
        if (n.lane !== i || n.hit) continue;
        const k = 1 - (n.t - this.clock) / FALL;
        if (k < 0 || k > 1.15) continue;
        const y = TOP_Y + k * (LINE_Y - TOP_Y);
        circle(ctx, x, y, 18, n.missed ? 'rgba(160,140,120,0.4)' : L.color);
        circle(ctx, x - 5, y - 5, 5, 'rgba(255,255,255,0.7)');
      }
    });
  }
}

const INTRO = 'ביום חנוכת הבית ניגנו הלויים והחצוצרנים כאחד, בקול אחד: ״כי טוב כי לעולם חסדו״. כשהתו מגיע לעיגול — מנגנים: → מצלתיים, ↓ נבל, ← חצוצרה (או 1 2 3, או נגיעה).';
const WON = '״והבית מלא ענן, בית ה׳״ — הקול היה אחד, וכבוד ה׳ מילא את הבית. הכהנים לא יכלו לעמוד לשרת מפני הענן.';
