/**
 * music.js — מוזיקה פרוצדורלית וקטע רקע שקט לסדנת המשכן.
 *
 * לכל שלב משחיק נושא משלו: מדבר מזרחי, נהר מינורי זורם וקציר מז'ורי.
 * התווים והתזמור נמצאים ב-data/musicThemes.js; שלב 2 משתמש בקובץ שסופק.
 *
 * ערכות נושא:
 *   menu   — איטי, בלי תופים (תפריט, בחירת שלבים, מוזיאון)
 *   desert / jordan / gilgal — לחנים ותזמורים נפרדים לשלבים 1, 3, 4
 *
 * שליטה: play(name) · stop() · toggle() · duck(true/false) — מחליש בזמן מיני-משחק.
 * ההעדפה (מוזיקה פועלת/כבויה) נשמרת ב-localStorage.
 */

import { MUSIC_THEMES as THEMES } from '../data/musicThemes.js';
import { prepMedia, primeMedia } from './mediaPrep.js';

const PREF_KEY = 'templebuilder.music';
export const WORKSHOP_TRACK = new URL('../../assets/audio/The_Sanctuary_Rising.mp3', import.meta.url).href;
export const WORKSHOP_VOLUME = 0.12;


/** תדר של דרגה בסולם. דרגות מעל 6 עולות אוקטבה, ושליליות יורדות. */
function freq(degree, base, scale) {
  const octave = Math.floor(degree / scale.length);
  const idx = ((degree % scale.length) + scale.length) % scale.length;
  return base * Math.pow(2, (scale[idx] + 12 * octave) / 12);
}

function readPref() {
  try { return localStorage.getItem(PREF_KEY) !== '0'; } catch { return true; }
}

export class Music {
  /** @param {import('./audio.js').Audio} audio */
  constructor(audio) {
    this.audio = audio;
    this.bus = null;
    this.enabled = readPref();
    this.theme = null;
    this.pending = null;           // נושא שביקשו לפני שהאודיו נפתח (דורש לחיצה ראשונה)
    this.timer = null;
    this.step = 0;
    this.next = 0;
    this._ducked = false;
    this._speechActive = false;
    this.hidden = false;
    this.media = null;
    this._fadeTimer = null;
    this._needsFreshBus = false;
    this._primed = false;
    this._primePromise = null;
    this.blocked = false;
  }

  /** נקרא מ-Audio.unlock() ברגע שיש AudioContext */
  _ctxReady() {
    const ctx = this.audio.ctx;
    this.bus = ctx.createGain();
    this.bus.gain.value = 0;
    this.bus.connect(this.audio.master);
    if (this.pending) this.play(this.pending);
  }

  get _stepSec() {
    const cfg = THEMES[this.theme] || THEMES.menu;
    return 60 / cfg.bpm / 2;       // שמינית
  }

  /** Prime the SAME element used later for workshop music, not a throwaway. */
  unlock() {
    if (typeof globalThis.Audio !== 'function') return;
    if (!this.media) {
      this.media = prepMedia(new globalThis.Audio());
      this.media.loop = true;
      this.media.volume = 0;
    }
    if (this.theme === 'sanctuary') {
      this._syncMedia(); // Retry a previously blocked track directly in the gesture.
    } else if (!this._primed && !this._primePromise) {
      this._primePromise = primeMedia(this.media).then(ok => {
        this._primed = ok;
        this._primePromise = null;
      });
    }
  }

  play(name) {
    if (name !== 'sanctuary' && !THEMES[name]) name = 'menu';
    this.pending = name;
    const ctx = this.audio.ctx;
    if (!ctx || !this.bus) return;                  // ימתין ל-unlock
    if (this._needsFreshBus || this.theme && name !== this.theme) {
      // Old drones may sustain for several seconds: never revive them on a new stage.
      const previous = this.bus;
      previous.gain.setTargetAtTime(0, ctx.currentTime, 0.04);
      this.bus = ctx.createGain();
      this.bus.gain.value = 0;
      this.bus.connect(this.audio.master);
      setTimeout(() => previous.disconnect?.(), 400);
      this._needsFreshBus = false;
    }
    if (name === 'sanctuary') {
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
      this.theme = name;
      if (!this.media && typeof globalThis.Audio === 'function') {
        this.media = prepMedia(new globalThis.Audio(WORKSHOP_TRACK));
        this.media.loop = true;
        this.media.preload = 'metadata';
        this.media.volume = 0;
      }
      if (this.media && this.media.src !== WORKSHOP_TRACK) {
        this.media.src = WORKSHOP_TRACK;
        this.media.load();
      }
      this._apply();
      return;
    }
    this._pauseMedia();
    if (name === this.theme && this.timer) return;  // כבר מנגן

    this.theme = name;
    this.step = 0;
    this.next = ctx.currentTime + 0.2;
    if (!this.timer) this.timer = setInterval(() => this._tick(), 120);
    this._apply();
  }
  /** Independent from scene ducking, so a scene update cannot unduck speech. */
  setSpeechActive(on) {
    if (this._speechActive === on) return;
    this._speechActive = on;
    this._apply();
  }

  setHidden(hidden) {
    this.hidden = hidden;
    this._apply();
  }

  _pauseMedia() {
    if (this._fadeTimer) clearInterval(this._fadeTimer);
    this._fadeTimer = null;
    if (this.media) {
      this.media.pause();
      this.media.volume = 0;
    }
  }

  _syncMedia() {
    if (!this.media) return;
    const playing = this.theme === 'sanctuary' && this.enabled && !this.hidden;
    if (!playing) { this._pauseMedia(); return; }
    const target = WORKSHOP_VOLUME * (this._ducked || this._speechActive ? 0.3 : 1);
    if (this.media.paused) {
      // May be rejected by autoplay rules or an unavailable file; never interrupt the game.
      const promise = this.media.play();
      if (promise?.then) promise.then(() => { this.blocked = false; },
        error => { this.blocked = error?.name === 'NotAllowedError'; });
    }
    if (this._fadeTimer) clearInterval(this._fadeTimer);
    this._fadeTimer = setInterval(() => {
      const delta = target - this.media.volume;
      if (Math.abs(delta) < 0.002) {
        this.media.volume = target;
        clearInterval(this._fadeTimer); this._fadeTimer = null;
      } else {
        this.media.volume = Math.max(0, Math.min(WORKSHOP_VOLUME, this.media.volume + delta * 0.15));
      }
    }, 50);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.theme = null;
    this.pending = null;
    this._needsFreshBus = true;
    this._pauseMedia();
    this._apply();
  }

  /** מדליק/מכבה. @returns המצב החדש */
  toggle() {
    this.enabled = !this.enabled;
    try { localStorage.setItem(PREF_KEY, this.enabled ? '1' : '0'); } catch { /* ignore */ }
    this._apply();
    return this.enabled;
  }

  /** מחליש (למיני-משחק/השהיה) */
  duck(on) {
    if (this._ducked === on) return;
    this._ducked = on;
    this._apply();
  }

  _apply() {
    const ctx = this.audio.ctx;
    if (!ctx || !this.bus) return;
    const target = !this.enabled || this.hidden || !this.theme || this.theme === 'sanctuary'
      ? 0 : (this._ducked || this._speechActive ? 0.3 : 1);
    this.bus.gain.setTargetAtTime(target, ctx.currentTime, 0.25);
    this._syncMedia();
  }

  _tick() {
    const ctx = this.audio.ctx;
    if (!ctx || !THEMES[this.theme]) return;

    // אחרי שהדפדפן האט את הטיימר (לשונית ברקע) — מתחילים מחדש מ"עכשיו"
    if (this.next < ctx.currentTime - 0.5) this.next = ctx.currentTime + 0.05;

    // כבוי: ממשיכים לקדם את הזמן בלי לנגן, כדי לחזור בקצב כשמדליקים
    const silent = !this.enabled || this.hidden;

    while (this.next < ctx.currentTime + 0.5) {
      if (!silent) this._schedule(this.step, this.next - ctx.currentTime);
      this.step++;
      this.next += this._stepSec;
    }
  }

  /** מתזמן את כל מה שקורה בצעד אחד. delay = בעוד כמה שניות. */
  _schedule(step, delay) {
    const cfg = THEMES[this.theme];
    if (!cfg) return;
    const a = this.audio;
    const bus = this.bus;
    const sec = this._stepSec;
    const phraseSize = cfg.form[0].length;
    const phrase = cfg.form[Math.floor(step / phraseSize) % cfg.form.length];
    const pos = step % phraseSize;

    // --- לחן: צליל חליל רך + הדהוד באוקטבה ---
    const deg = phrase[pos];
    if (deg !== null) {
      let len = 1;
      while (pos + len < phraseSize && phrase[pos + len] === null) len++;
      const dur = len * sec * cfg.noteLength;
      const f = freq(deg, cfg.tonic * 2, cfg.scale);
      a.tone({ freq: f, dur, type: cfg.voice, gain: cfg.lead, delay, dest: bus });
      a.tone({ freq: f * 2, dur: dur * 0.7, type: 'sine', gain: cfg.echo, delay, dest: bus });
    }

    // --- בס עדין בכל פעימה ---
    if (step % 4 === 0) {
      const d = cfg.bass[(step / 4) % cfg.bass.length];
      a.tone({ freq: freq(d, cfg.tonic * 0.5, cfg.scale), dur: sec * 3.4, type: 'triangle', gain: cfg.bassGain, delay, dest: bus });
    }

    // --- צליל רקע ארוך (רה וקוינטה) כל שתי תיבות ---
    if (step % 16 === 0) {
      a.tone({ freq: cfg.tonic, dur: sec * 15, type: 'sine', gain: cfg.drone, delay, dest: bus });
      a.tone({ freq: cfg.tonic * 1.5, dur: sec * 15, type: 'sine', gain: cfg.drone * 0.6, delay, dest: bus });
    }

    if (cfg.arpeggio && step % 2 === 0) {
      const degree = cfg.arpeggio[(step / 2) % cfg.arpeggio.length];
      a.tone({ freq: freq(degree, cfg.tonic, cfg.scale), dur: sec * 1.6,
        type: 'sine', gain: cfg.arpeggioGain, delay, dest: bus });
    }

    // --- תוף יד: דום ותק ---
    if (cfg.drums) {
      const s = step % 8;
      if (cfg.drums.beats.includes(s)) {
        a.tone({ freq: 135, freqEnd: 55, dur: 0.22, type: 'sine', gain: cfg.drums.gain, delay, dest: bus });
      } else if (cfg.drums.taps.includes(s)) {
        a.noise({ dur: 0.06, gain: cfg.drums.gain * 0.3, filter: cfg.drums.filter, delay, dest: bus });
      }
    }
  }
}
