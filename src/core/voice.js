import { VOICE_FILES } from '../data/voiceManifest.js';
import { prepMedia, primeMedia } from './mediaPrep.js';

const PREF_KEY = 'templebuilder.voice';

export class Voice {
  constructor(music, files = VOICE_FILES) {
    this.music = music;
    this.files = files;
    try { this.enabled = localStorage.getItem(PREF_KEY) !== '0'; } catch { this.enabled = true; }
    this.hidden = false;
    this.unlocked = false;
    this.media = null;
    this.snapshot = null;
    this.index = 0;
    this.revision = 0;
    this.playing = false;
    this.blocked = false;
    this.lastError = null;
    this._starting = false;
    this._playAttempt = 0;
    this._element = null;
    this._clipToken = 0;
    this._primed = false;
    this._primePromise = null;
  }

  _active(on) {
    this.playing = on;
    this.music.setSpeechActive(on);
  }

  _release() {
    this._playAttempt++;
    this._clipToken++;
    if (this.media) {
      this.media.onended = this.media.onerror = this.media.onplaying = null;
      this.media.pause();
      this.media.removeAttribute('src');
      this.media.load();
      this.media = null;
    }
    this._starting = false;
    this._active(false);
  }

  clear() {
    this.revision++;
    this._release();
    this.snapshot = null;
    this.index = 0;
    this.blocked = false;
  }

  set(snapshot) {
    if ((snapshot?.key ?? null) === (this.snapshot?.key ?? null)) return;
    this.clear();
    this.snapshot = snapshot;
    this.lastError = null;
    this._next();
  }

  _next() {
    if (!this.enabled || this.hidden || !this.unlocked || !this.snapshot) return;
    while (this.index < this.snapshot.lines.length) {
      const line = this.snapshot.lines[this.index];
      const file = this.files[line.id];
      if (!file) { this.lastError = `Missing speech: ${line.id}`; this.index++; continue; }
      if (typeof globalThis.Audio !== 'function') return;
      const media = this.media = this._element ||= prepMedia(new globalThis.Audio());
      media.src = new URL('../../assets/audio/voices/' + file, import.meta.url).href;
      media.volume = 0.8;
      media.preload = 'auto';
      media.load();
      const clipToken = ++this._clipToken;
      const revision = this.revision;
      const current = () => revision === this.revision && this.media === media && clipToken === this._clipToken;
      media.onplaying = () => {
        if (!current()) return;
        if (this.hidden || !this.enabled) { media.pause(); return; }
        this.blocked = false;
        this._active(true);
      };
      const advance = () => {
        if (!current() || this.hidden) return;
        this._release();
        this.index++;
        this._next();
      };
      media.onended = advance;
      media.onerror = () => {
        if (!current()) return;
        this.lastError = `Unavailable speech: ${line.id}`;
        advance();
      };
      this._play(media, revision);
      return;
    }
    this._active(false);
  }

  _play(media, revision) {
    if (this._starting) return;
    this._starting = true;
    const attempt = ++this._playAttempt;
    const current = () => revision === this.revision && media === this.media && attempt === this._playAttempt;
    try {
      const promise = media.play();
      Promise.resolve(promise).then(() => {
        if (!current()) return;
        this._starting = false;
        if (this.hidden || !this.enabled) media.pause();
      }, error => {
        if (!current()) return;
        this._starting = false;
        this._active(false);
        if (this.hidden || !this.enabled) return;
        if (error?.name === 'NotAllowedError') {
          this.blocked = true; // Retry only after a fresh user gesture; no autoplay loop.
        } else {
          this.lastError = `Speech playback failed: ${error?.name || 'unknown'}`;
          media.onerror();
        }
      });
    } catch (error) {
      this._starting = false;
      this.lastError = `Speech playback failed: ${error?.name || 'unknown'}`;
      media.onerror();
    }
  }

  unlock() {
    this.unlocked = true;
    if (typeof globalThis.Audio === 'function' && !this._element) {
      this._element = prepMedia(new globalThis.Audio());
    }
    if (this._element && !this._primed && !this._primePromise && !this.media) {
      this._primePromise = primeMedia(this._element).then(ok => {
        this._primed = ok;
        this._primePromise = null;
      });
    }
    if (!this.enabled || this.hidden || this.playing || this._starting) return;
    if (this.media) this._play(this.media, this.revision);
    else this._next();
  }

  setHidden(hidden) {
    this.hidden = hidden;
    if (hidden) {
      this._playAttempt++;
      this._starting = false;
      this.media?.pause();
      this._active(false);
    } else if (this.enabled && this.unlocked) {
      if (this.media) this._play(this.media, this.revision);
      else this._next();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    try { localStorage.setItem(PREF_KEY, this.enabled ? '1' : '0'); } catch { /* optional preference */ }
    this.revision++;
    this._release();
    this.index = 0;
    this.blocked = false;
    if (this.enabled) this._next();
    return this.enabled;
  }
}
