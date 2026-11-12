/**
 * main.js — נקודת הכניסה. מחבר את כל המערכות ומתחיל את הלולאה.
 */

import { Loop } from './core/loop.js';
import { Input } from './core/input.js';
import { Camera } from './core/camera.js';
import { SaveData } from './core/storage.js';
import { Audio } from './core/audio.js';
import { TouchPad } from './core/touchPad.js';
import { themeForScene } from './data/musicThemes.js';
import { narrationForGame } from './data/voiceText.js';

import { SceneManager } from './scenes/sceneManager.js';
import { MenuScene } from './scenes/menu.js';
import { LevelSelectScene } from './scenes/levelSelect.js';
import { PlayScene } from './scenes/play.js';
import { SummaryScene } from './scenes/summary.js';
import { MuseumScene } from './scenes/museum.js';
import { ConstructionScene } from './scenes/construction.js';
import { sceneForLevel } from './data/levels.js';
import { niqqud } from './core/niqqud.js';

/** רזולוציית העבודה הפנימית. ה־canvas נמתח לגודל החלון. */
const VIEW_W = 960;
const VIEW_H = 540;

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });

    // מידות העולם הלוגי — כל המשחק מתכנן מול 960×540.
    // הרזולוציה הפיזית של ה-canvas נקבעת ב-_resize לפי המסך, כך שהטקסט חד.
    this.width = VIEW_W;
    this.height = VIEW_H;
    this._k = 1;

    this.input = new Input();
    this.input.attachPointer(canvas, VIEW_W, VIEW_H);
    this.camera = new Camera(VIEW_W, VIEW_H);
    this.save = new SaveData();
    this.audio = new Audio();
    this.touch = new TouchPad(this.input, {
      onGesture: () => this.audio.unlock(),
      onLayout: () => this._resize(),
    });

    /**
     * קישורי דיבאג לבדיקות, למשל:  /?start=play&px=1500&mini=sorting&fill=9
     * בלי פרמטרים — null, והמשחק רגיל לגמרי.
     */
    const q = new URLSearchParams(window.location.search);
    this.debug = q.has('start') ? {
      start: q.get('start'),
      level: Number(q.get('level')) || 1,
      px: Number(q.get('px')) || 0,
      mini: q.get('mini') || '',
      fill: Number(q.get('fill')) || 0,
      unlock: Number(q.get('unlock')) || 0,
      focus: Number(q.get('focus')) || 0,
    } : null;
    if (this.debug && this.debug.unlock) this.save.data.unlocked = this.debug.unlock;

    this.scenes = new SceneManager(this);
    this.scenes.register('menu', new MenuScene());
    this.scenes.register('levels', new LevelSelectScene());
    this.scenes.register('play', new PlayScene());
    this.scenes.register('summary', new SummaryScene());
    this.scenes.register('museum', new MuseumScene());
    this.scenes.register('construction', new ConstructionScene());

    this.loop = new Loop(
      (dt) => this._update(dt),
      () => this._render(),
    );

    this.showFps = false;
    this._bindEvents();
    this._resize();
  }
  _syncVoiceButton() {
    const voice = this.audio.voice;
    const state = `${voice.enabled}:${voice.blocked}:${this.touch.enabled}`;
    if (state === this._voiceButtonState) return;
    this._voiceButtonState = state;
    this.voiceButton.textContent = niqqud(voice.blocked ? 'נגיעה להפעלת הקול'
      : this.touch.enabled ? voice.enabled ? 'דיבור פועל' : 'דיבור כבוי'
      : voice.enabled ? 'דיבוב פועל · V' : 'דיבוב כבוי · V');
    this.voiceButton.setAttribute('aria-pressed', String(voice.enabled));
    this.voiceButton.setAttribute('aria-label', voice.enabled ? 'השתקת דיבוב' : 'הפעלת דיבוב');
    this.voiceButton.title = voice.blocked ? 'לחצו כדי לאפשר השמעת דיבוב בדפדפן' : 'V — דיבוב בלבד; N — מוזיקה';
  }

  _bindEvents() {
    window.addEventListener('resize', () => this._resize());
    window.visualViewport?.addEventListener('resize', () => this._resize());
    window.addEventListener('orientationchange', () => {
      this.input._onBlur();
      this.touch.releaseAll();
      requestAnimationFrame(() => this._resize());
    });

    this.touch.attach(document.body, this.canvas);

    // דפדפנים (במיוחד נייד) חוסמים אודיו עד לאינטראקציה ראשונה
    const unlock = e => {
      if (e.target !== this.voiceButton) this.audio.unlock();
    };
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('pointerup', unlock);
    window.addEventListener('touchend', unlock, { passive: true });
    window.addEventListener('click', unlock);
    this.voiceButton = document.createElement('button');
    this.voiceButton.id = 'voice-toggle';
    this.voiceButton.type = 'button';
    this.voiceButton.dir = 'rtl';
    this.voiceButton.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:10;padding:5px 10px;border:1px solid #b99a55;border-radius:6px;background:#171b20;color:#f0e2c0;font:13px "Segoe UI",Arial;cursor:pointer';
    this.voiceButton.addEventListener('click', () => {
      if (!this.audio.voice.blocked) this.audio.voice.toggle();
      this.audio.unlock();
      this._syncVoiceButton();
    });
    this.voiceButton.addEventListener('keydown', e => {
      if (e.code === 'Space' || e.code === 'Enter') e.stopPropagation();
    });
    document.body.appendChild(this.voiceButton);
    this._syncVoiceButton();

    // מקש דיבאג להצגת FPS
    window.addEventListener('keydown', (e) => {
      if (e.code === 'F2') {
        this.showFps = !this.showFps;
        e.preventDefault();
      }
    });

    // עצירת הלולאה כשהלשונית מוסתרת — חוסך סוללה ומונע קפיצות
    document.addEventListener('visibilitychange', () => {
      this.audio.music.setHidden(document.hidden);
      this.audio.voice.setHidden(document.hidden);
      if (document.hidden) { this.input._onBlur(); this.touch.releaseAll(); this.loop.stop(); }
      else this.loop.start();
    });
  }

  /**
   * מגדיר את גודל ה-canvas במסך ואת הרזולוציה הפנימית שלו.
   *
   * הבעיה הקודמת: ציירנו ב-960×540 ומתחנו ב-CSS, והדפדפן הגדיל את הטקסט
   * כמו תמונה — מטושטש. עכשיו הבאפר בגודל המסך המלא (כולל devicePixelRatio),
   * והציור מתבצע דרך מטריקת הסקייל (_k), כך שהלוגיקה נשארת ב-960×540.
   */
  _resize() {
    const dpr = window.devicePixelRatio || 1;
    const stage = document.getElementById('stage');
    const area = stage.getBoundingClientRect();
    const logicalH = this.touch.enabled && this.scenes.currentName === 'menu' ? 390 : VIEW_H;
    const fit = Math.min(
      area.width / VIEW_W,
      area.height / logicalH,
    );

    const cssW = Math.max(1, Math.floor(VIEW_W * fit));
    const cssH = Math.max(1, Math.floor(logicalH * fit));
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;

    const bw = Math.round(cssW * dpr);
    const bh = Math.round(cssH * dpr);

    // שינוי width/height מנקה את ה-canvas — עושים זאת רק כשהגודל באמת השתנה
    if (this.canvas.width !== bw || this.canvas.height !== bh) {
      this.canvas.width = bw;
      this.canvas.height = bh;
    }
    this._k = bw / VIEW_W;
    this.touch?.layout();
  }

  /** בוחר מנגינה לפי המסך ומספר השלב, גם במעבר ישיר בין שני שלבי משחק. */
  onScene(name, params = {}) {
    this.audio.voice.clear();
    this.audio.music.play(themeForScene(name, params.levelId));
    this.audio.music.duck(false);
    this.touch.setScene(name);
    this._resize();
  }

  _update(dt) {
    this.input.beginFrame();
    if (this.input.pressed('music')) this.audio.music.toggle();
    if (this.input.pressed('voice')) this.audio.voice.toggle();
    this.scenes.update(dt);
    this.touch.update(this);
    this.audio.voice.set(narrationForGame(this));
    this._syncVoiceButton();
    // הסצנה קובעת 'pointer' מעל דברים שאפשר ללחוץ עליהם
    this.canvas.style.cursor = this.input.cursor;
  }

  _render() {
    const ctx = this.ctx;
    ctx.save();
    // מסקיילים את הציור הלוגי (960×540) לרזולוציית המסך האמיתית
    ctx.setTransform(this._k, 0, 0, this._k, 0, 0);
    ctx.imageSmoothingEnabled = true;

    this.scenes.draw(ctx);

    if (this.showFps) {
      ctx.save();
      ctx.font = '12px monospace';
      ctx.fillStyle = '#0f0';
      ctx.textAlign = 'left';
      ctx.direction = 'ltr';
      ctx.fillText(`${this.loop.fps} fps`, 8, this.height - 8);
      ctx.restore();
    }

    ctx.restore();
  }

  start() {
    const d = this.debug;
    if (d && d.start && d.start !== 'menu') {
      const start = d.start === 'play' ? sceneForLevel(d.level) : d.start;
      this.scenes.set(start, { levelId: d.level, focus: d.focus || undefined });
    } else {
      this.scenes.set('menu');
    }
    this.loop.start();
  }
}

/** נקראת מ־index.html */
export async function boot(canvas) {
  const game = new Game(canvas);
  game.start();

  // חשיפה לקונסול לצורכי פיתוח
  window.__game = game;

  return game;
}
