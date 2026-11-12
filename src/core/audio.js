/**
 * audio.js — צלילים פרוצדורליים דרך WebAudio.
 *
 * אפקטי הפעולה מסונתזים בזמן אמת. המוזיקה תומכת גם בקובץ של סדנת המשכן.
 * זה מאפשר משחק עם פידבק
 * קולי מלא בלי נכסים, ואפשר להחליף בהמשך בדגימות אמיתיות.
 *
 * דפדפנים חוסמים אודיו עד לאינטראקציה ראשונה של המשתמש, לכן
 * ה־AudioContext נוצר בעצלתיים בקריאה הראשונה ל־unlock().
 */

import { Music } from './music.js';
import { Voice } from './voice.js';

export class Audio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this.volume = 0.35;
    /** מנגינת הרקע — תתחיל לנגן ברגע שהאודיו נפתח (דורש לחיצה ראשונה) */
    this.music = new Music(this);
    this.voice = new Voice(this.music);
  }

  /** יוצר את ההקשר. חייב להיקרא מתוך אירוע משתמש. */
  unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) { this.enabled = false; return; }

      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
      this.music._ctxReady();
    }
    if (this.ctx.state === 'suspended' || this.ctx.state === 'interrupted') {
      try { this.ctx.resume()?.catch?.(() => {}); } catch { /* retry next gesture */ }
    }
    this.music.unlock();
    this.voice.unlock();
  }

  /**
   * צליל בסיסי: אוסצילטור עם מעטפת דעיכה.
   * @param {object} o
   * @param {number} o.freq      תדר התחלה (הרץ)
   * @param {number} [o.freqEnd] תדר סיום — יוצר גליסנדו
   * @param {number} o.dur       משך בשניות
   * @param {string} [o.type]    sine | square | sawtooth | triangle
   * @param {number} [o.gain]    עוצמת שיא
   * @param {number} [o.delay]   השהיה לפני התחלה
   */
  tone({ freq, freqEnd, dur = 0.12, type = 'square', gain = 0.3, delay = 0, dest = null }) {
    if (!this.enabled || !this.ctx) return;

    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd != null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
    }

    // התקפה מהירה מאוד ואז דעיכה — אופייני לצליל רטרו
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(env);
    env.connect(dest || this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /** רעש לבן מסונן — לנחיתות, פגיעות וסופות חול */
  noise({ dur = 0.15, gain = 0.2, filter = 900, delay = 0, dest = null }) {
    if (!this.enabled || !this.ctx) return;

    const t0 = this.ctx.currentTime + delay;
    const frames = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) ch[i] = Math.random() * 2 - 1;

    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = filter;

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(gain, t0);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    src.connect(lp); lp.connect(env); env.connect(dest || this.master);
    src.start(t0);
  }

  // ---- אפקטים בשמות משחקיים ----

  jump()      { this.tone({ freq: 300, freqEnd: 620, dur: 0.12, type: 'square', gain: 0.18 }); }
  land()      { this.noise({ dur: 0.08, gain: 0.12, filter: 500 }); }
  /** המטה: צלצול רך, לא מכה */
  attack() {
    this.tone({ freq: 784, freqEnd: 988, dur: 0.22, type: 'sine', gain: 0.14 });
    this.tone({ freq: 1175, dur: 0.28, type: 'triangle', gain: 0.07, delay: 0.04 });
  }

  /** איסוף תרומה — הטון עולה עם הערך */
  pickup(value = 1) {
    const base = 520 + Math.min(value, 6) * 70;
    this.tone({ freq: base, dur: 0.07, type: 'triangle', gain: 0.2 });
    this.tone({ freq: base * 1.5, dur: 0.09, type: 'triangle', gain: 0.14, delay: 0.05 });
  }

  /** איסוף כלי קודש — ארפג'יו עולה, מסמן שזה משהו גדול */
  relic() {
    [523, 659, 784, 1047].forEach((f, i) => {
      this.tone({ freq: f, dur: 0.3, type: 'triangle', gain: 0.17, delay: i * 0.1 });
    });
  }

  health()    { this.tone({ freq: 660, freqEnd: 880, dur: 0.18, type: 'sine', gain: 0.2 }); }
  hurt()      { this.tone({ freq: 220, freqEnd: 70,  dur: 0.25, type: 'sawtooth', gain: 0.22 }); }

  death() {
    this.tone({ freq: 400, freqEnd: 50, dur: 0.8, type: 'sawtooth', gain: 0.25 });
    this.noise({ dur: 0.5, gain: 0.15, filter: 400 });
  }

  /** אויב שהורתע: נשיפה רכה ופעמון נמוך */
  enemyHit() {
    this.noise({ dur: 0.18, gain: 0.07, filter: 700 });
    this.tone({ freq: 392, freqEnd: 330, dur: 0.25, type: 'sine', gain: 0.1 });
  }

  /** תשובה נכונה במיני-משחק */
  correct() {
    this.tone({ freq: 659, dur: 0.12, type: 'triangle', gain: 0.18 });
    this.tone({ freq: 880, dur: 0.22, type: 'triangle', gain: 0.18, delay: 0.1 });
  }

  /** תשובה שגויה — עדין, בלי להעניש */
  wrong() {
    this.tone({ freq: 220, freqEnd: 180, dur: 0.28, type: 'sine', gain: 0.16 });
  }

  /** מזבח־צ'קפוינט נדלק */
  checkpoint() {
    [440, 554, 659].forEach((f, i) => {
      this.tone({ freq: f, dur: 0.4, type: 'sine', gain: 0.15, delay: i * 0.08 });
    });
  }

  /** תקיעת שופר */
  shofar() {
    this.tone({ freq: 196, dur: 0.9, type: 'sawtooth', gain: 0.22 });
    this.tone({ freq: 294, dur: 0.9, type: 'sawtooth', gain: 0.12, delay: 0.05 });
  }

  /** "בּוֹינְג" — זינוק מענן קפיצי */
  boing() { this.tone({ freq: 180, freqEnd: 720, dur: 0.22, type: 'sine', gain: 0.2 }); }
  /** "שְׁמוּ־אֵל" — שני צלילים רכים ויורדים, כמו קול קורא מרחוק */
  call() {
    this.tone({ freq: 523, dur: 0.32, type: 'sine', gain: 0.16 });
    this.tone({ freq: 392, dur: 0.5, type: 'sine', gain: 0.16, delay: 0.36 });
  }
  menuMove()  { this.tone({ freq: 440, dur: 0.05, type: 'square', gain: 0.1 }); }
  menuPick()  { this.tone({ freq: 660, freqEnd: 990, dur: 0.14, type: 'square', gain: 0.15 }); }
  denied()    { this.tone({ freq: 160, dur: 0.18, type: 'square', gain: 0.14 }); }

  /** סיום שלב — פנפרה */
  levelComplete() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => {
      this.tone({ freq: f, dur: 0.45, type: 'triangle', gain: 0.18, delay: i * 0.13 });
    });
  }
}
