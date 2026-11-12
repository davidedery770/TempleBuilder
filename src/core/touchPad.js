/**
 * touchPad.js — כפתורי מגע לשליטה בנייד.
 *
 * מוצג במסכי משחק (ריצה/קפיצה) במכשירים עם מגע.
 * הכפתורים מחזיקים פעולות כמו מקלדת: ימין/שמאל, קפיצה, מטה (Z), שופר (X).
 */

import { niqqud } from './niqqud.js';
const PLAY_SCENES = new Set(['play']);

function wantsPad() {
  if (typeof window === 'undefined') return false;
  try {
    const q = new URLSearchParams(window.location.search);
    if (q.get('pad') === '1') return true;
    if (q.get('pad') === '0') return false;
  } catch { /* ignore */ }
  const coarse = window.matchMedia?.('(pointer: coarse)')?.matches;
  const noHover = window.matchMedia?.('(hover: none)')?.matches;
  return !!(coarse || (noHover && (navigator.maxTouchPoints || 0) > 0));
}

function btn(title, hint, action, extraClass = '') {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = `tb-btn ${extraClass}`.trim();
  el.dataset.action = action;
  el.setAttribute('aria-label', hint ? `${title} — ${hint}` : title);
  const main = document.createElement('span');
  main.textContent = niqqud(title);
  el.appendChild(main);
  if (hint) {
    const sub = document.createElement('small');
    sub.textContent = niqqud(hint);
    el.appendChild(sub);
  }
  return el;
}

export class TouchPad {
  /**
   * @param {import('./input.js').Input} input
   * @param {{ onGesture?: () => void }} [opts]
   */
  constructor(input, opts = {}) {
    this.input = input;
    this.onGesture = opts.onGesture || (() => {});
    this.enabled = wantsPad();
    this.scene = '';
    this.mode = '';
    this._pointers = new Map();
    this.onLayout = opts.onLayout || (() => {});
    this.root = document.createElement('div');
    this.root.id = 'touch-pad';
    this.root.dir = 'ltr';
    this.root.setAttribute('aria-hidden', 'true');

    this.leftCluster = document.createElement('div');
    this.leftCluster.className = 'tb-cluster tb-left';
    this.rightCluster = document.createElement('div');
    this.rightCluster.className = 'tb-cluster tb-right';
    this.topCluster = document.createElement('div');
    this.topCluster.className = 'tb-cluster tb-top';

    this.btnLeft = btn('◀', 'אחורה', 'left', 'tb-move');
    this.btnRight = btn('▶', 'קדימה', 'right', 'tb-move');
    this.btnDown = btn('▼', 'כפיפה', 'down', 'tb-small');
    this.btnJump = btn('↑', 'קפיצה', 'jump', 'tb-jump');
    this.btnStaff = btn('מטה', 'במקום Z', 'attack', 'tb-action');
    this.btnShofar = btn('שופר', 'במקום X', 'shofar', 'tb-action');
    this.btnTalk = btn('שיחה', 'אישור', 'confirm', 'tb-small');
    this.btnPause = btn('חזרה', '', 'back', 'tb-icon');
    this.btnMusic = btn('מוזיקה', '', 'music', 'tb-icon');
    this.hint = document.createElement('p');
    this.hint.className = 'tb-touch-hint';
    this.hint.textContent = 'מומלץ לשחק לרוחב';
    this.hint.dir = 'rtl';

    this.leftCluster.append(this.btnLeft, this.btnRight, this.btnDown);
    this.rightCluster.append(this.btnShofar, this.btnStaff, this.btnJump, this.btnTalk);
    this.topCluster.append(this.btnPause, this.btnMusic);
    this.root.append(this.topCluster, this.leftCluster, this.rightCluster, this.hint);

    this.canvas = null;
    this._bindAll();
    this._sync();
    window.addEventListener('blur', () => this.releaseAll());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.releaseAll();
    });

    window.matchMedia?.('(pointer: coarse)')?.addEventListener?.('change', () => {
      this.enabled = wantsPad();
      this._sync();
      this.onLayout();
    });
  }

  attach(parent = document.body, canvas = null) {
    this.canvas = canvas;
    parent.appendChild(this.root);
    this.layout();
  }

  /** Translucent world controls overlay the canvas; modal screens use their own buttons. */
  layout() {
    if (!this.canvas) return;
    const r = this.canvas.getBoundingClientRect();
    this.root.style.inset = 'auto';
    this.root.style.left = `${r.left}px`;
    this.root.style.top = `${r.top}px`;
    this.root.style.width = `${r.width}px`;
    this.root.style.height = `${r.height}px`;
  }

  setScene(name) {
    this.releaseAll();
    this.scene = name || '';
    this._sync();
  }

  get visible() {
    return this.enabled;
  }

  _sync() {
    const on = this.visible;
    this.root.classList.toggle('visible', on);
    this.root.setAttribute('aria-hidden', on ? 'false' : 'true');
    document.body.classList.toggle('tb-touch', this.enabled);
    if (!on) this.releaseAll();
  }

  update(game) {
    const s = game.scenes.current;
    const play = PLAY_SCENES.has(game.scenes.currentName);
    const mode = !play ? 'other' : s?.paused ? 'pause'
      : s?.mini ? s.mini.constructor.name === 'ShofarTimingGame' ? 'timing' : 'quiz'
      : s?.hud?.dialogOpen ? 'dialog' : 'world';
    const key = `${mode}:${!!s?.hasShofar}:${game.scenes.currentName}`;
    if (key !== this._modeKey) {
      this.releaseAll();
      this._modeKey = key;
      this.mode = mode;
      const world = mode === 'world';
      this.leftCluster.hidden = !world;
      this.btnJump.hidden = !world;
      this.btnStaff.hidden = !world;
      this.btnShofar.hidden = !(world && s?.hasShofar || mode === 'timing');
      this.btnTalk.hidden = ['other','pause','quiz'].includes(mode);
      this.rightCluster.hidden = ['other','pause','quiz'].includes(mode);
      this.btnPause.hidden = game.scenes.currentName === 'menu' || mode === 'dialog';
      this.btnTalk.firstChild.textContent = niqqud(world ? 'שיחה' : 'המשך');
      this.btnPause.firstChild.textContent = niqqud(world ? 'השהיה' : 'חזרה');
      this.btnShofar.firstChild.textContent = niqqud(mode === 'timing' ? 'תקיעה' : 'שופר');
    }
    const musicLabel = niqqud(game.audio.music.enabled ? 'מוזיקה פועלת' : 'מוזיקה כבויה');
    if (this.btnMusic.firstChild.textContent !== musicLabel) this.btnMusic.firstChild.textContent = musicLabel;
    this.btnMusic.setAttribute('aria-pressed', String(game.audio.music.enabled));
  }

  releaseAll() {
    for (const [id, { el, action }] of this._pointers) {
      this.input.release(action, `pad:${id}`, true);
      el.classList.remove('held');
      try { if (el.hasPointerCapture?.(id)) el.releasePointerCapture(id); } catch { /* cancelled */ }
    }
    this._pointers.clear();
  }

  _bindAll() {
    for (const el of this.root.querySelectorAll('[data-action]')) {
      this._bind(el, el.dataset.action);
    }
  }

  _bind(el, action) {
    const down = (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (!this.enabled || el.hidden || this._pointers.has(e.pointerId)) return;
      e.preventDefault();
      e.stopPropagation();
      el.setPointerCapture?.(e.pointerId);
      el.classList.add('held');
      this._pointers.set(e.pointerId, { el, action });
      this.input.hold(action, `pad:${e.pointerId}`);
      this.onGesture();
    };
    const up = e => {
      const held = this._pointers.get(e.pointerId);
      if (!held) return;
      this._pointers.delete(e.pointerId);
      this.input.release(held.action, `pad:${e.pointerId}`, e.type !== 'pointerup');
      if (e.type === 'pointerup') this.onGesture();
      if (![...this._pointers.values()].some(p => p.el === el)) el.classList.remove('held');
      e.preventDefault();
      e.stopPropagation();
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
    el.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }
}
