import assert from 'node:assert/strict';
import { Input } from '../src/core/input.js';
import { TouchPad } from '../src/core/touchPad.js';
import { Voice } from '../src/core/voice.js';
import { Audio as GameAudio } from '../src/core/audio.js';
import { SILENT_WAV } from '../src/core/mediaPrep.js';

class Element extends EventTarget {
  constructor() {
    super(); this.children = []; this.style = {}; this.dataset = {}; this.attributes = {};
    this.hidden = false; this.captures = new Set();
    const classes = new Set();
    this.classList = { add: s => classes.add(s), remove: s => classes.delete(s),
      toggle: (s, on) => on ? classes.add(s) : classes.delete(s), contains: s => classes.has(s) };
  }
  get firstChild() { return this.children[0]; }
  append(...children) { this.children.push(...children); }
  appendChild(child) { this.append(child); }
  setAttribute(name, value) { this.attributes[name] = value; }
  querySelectorAll() {
    return this.children.flatMap(child => [...(child.dataset.action ? [child] : []), ...child.querySelectorAll()]);
  }
  setPointerCapture(id) { this.captures.add(id); }
  hasPointerCapture(id) { return this.captures.has(id); }
  releasePointerCapture(id) { this.captures.delete(id); }
  getBoundingClientRect() { return { left: 0, top: 0, width: 960, height: 540 }; }
}
globalThis.window = new EventTarget();
window.location = { search: '?pad=1' };
window.matchMedia = () => ({ matches: true, addEventListener() {} });
globalThis.document = new EventTarget();
document.body = new Element();
document.createElement = () => new Element();
document.hidden = false;
globalThis.localStorage = { getItem: () => null, setItem() {} };
function fire(target, type, values = {}) {
  const e = new Event(type, { cancelable: true });
  Object.assign(e, { pointerId: 1, pointerType: 'touch', button: 0 }, values);
  target.dispatchEvent(e);
}
let checks = 0;
const check = async (name, fn) => { await fn(); checks++; console.log('PASS ' + name); };
const input = new Input();
const pad = new TouchPad(input);
const game = { scenes: { currentName: 'play', current: { hasShofar: true, hud: { dialogOpen: false } } },
  audio: { music: { enabled: true } } };
pad.attach(document.body); pad.update(game);

await check('walk and jump hold together, independent fingers release separately, pad never clicks canvas', () => {
  fire(pad.btnRight, 'pointerdown', { pointerId: 10 });
  fire(pad.btnJump, 'pointerdown', { pointerId: 11 });
  input.beginFrame();
  assert.equal(input.axisX, 1); assert.ok(input.down('jump') && input.pressed('jump'));
  assert.equal(input.clicked, false);
  fire(pad.btnJump, 'pointerup', { pointerId: 11 });
  assert.equal(input.down('jump'), false); assert.equal(input.axisX, 1);
  fire(pad.btnRight, 'pointerdown', { pointerId: 12 });
  fire(pad.btnRight, 'pointerup', { pointerId: 10 });
  assert.equal(input.axisX, 1, 'second finger on same action remains held');
  fire(pad.btnRight, 'pointercancel', { pointerId: 12 });
  assert.equal(input.axisX, 0); assert.equal(pad._pointers.size, 0);
});
await check('keyboard aliases and touch do not release each other', () => {
  fire(window, 'keydown', { code: 'ArrowRight', repeat: false });
  fire(pad.btnRight, 'pointerdown', { pointerId: 20 });
  fire(pad.btnRight, 'pointerup', { pointerId: 20 });
  assert.equal(input.axisX, 1);
  fire(window, 'keyup', { code: 'ArrowRight' }); assert.equal(input.axisX, 0);
  fire(window, 'keydown', { code: 'KeyA', repeat: false });
  fire(window, 'keydown', { code: 'ArrowLeft', repeat: false });
  fire(window, 'keyup', { code: 'KeyA' }); assert.equal(input.axisX, -1);
  fire(window, 'keyup', { code: 'ArrowLeft' }); assert.equal(input.axisX, 0);
});
await check('cancel, lost capture, blur, hide and flush do not leave actions stuck', () => {
  for (const type of ['pointercancel', 'lostpointercapture']) {
    fire(pad.btnStaff, 'pointerdown', { pointerId: 30 });
    fire(pad.btnStaff, type, { pointerId: 30 });
    input.beginFrame(); assert.ok(!input.down('attack') && !input.pressed('attack'));
  }
  fire(pad.btnRight, 'pointerdown', { pointerId: 31 });
  window.dispatchEvent(new Event('blur')); assert.equal(input.axisX, 0);
  assert.equal(pad._pointers.size, 0);
  fire(pad.btnRight, 'pointerdown', { pointerId: 32 });
  document.hidden = true; document.dispatchEvent(new Event('visibilitychange')); document.hidden = false;
  assert.equal(input.axisX, 0);
  input.hold('jump'); input.flush(); assert.ok(!input.down('jump'));
});
await check('dialogues and quizzes hide movement; shofar challenge has a touch strike and back action', () => {
  fire(pad.btnRight, 'pointerdown', { pointerId: 40 });
  game.scenes.current.hud.dialogOpen = true; pad.update(game);
  assert.equal(input.axisX, 0); assert.ok(pad.leftCluster.hidden && !pad.btnTalk.hidden);
  game.scenes.current.hud.dialogOpen = false;
  game.scenes.current.mini = { constructor: { name: 'TriviaGame' } }; pad.update(game);
  assert.ok(pad.btnJump.hidden && pad.btnStaff.hidden && !pad.btnPause.hidden);
  fire(pad.btnPause, 'pointerdown', { pointerId: 41 }); input.beginFrame();
  assert.ok(input.pressed('back'));
  game.scenes.current.mini = { constructor: { name: 'ShofarTimingGame' } }; pad.update(game);
  assert.equal(pad.btnShofar.hidden, false);
  game.scenes.currentName = 'construction'; pad.update(game);
  assert.ok(pad.leftCluster.hidden && pad.rightCluster.hidden && !pad.btnPause.hidden);
  game.scenes.currentName = 'play'; game.scenes.current.mini = null; pad.update(game);
});
await check('canvas drag belongs to one pointer; another finger cannot move or release it', () => {
  const canvas = new Element(); input.attachPointer(canvas, 960, 540);
  fire(canvas, 'pointerdown', { pointerId: 51, clientX: 100, clientY: 100 });
  fire(canvas, 'pointerdown', { pointerId: 52, clientX: 500, clientY: 400 });
  fire(canvas, 'pointermove', { pointerId: 52, clientX: 600, clientY: 400 });
  assert.equal(input.pointer.x, 100);
  fire(window, 'pointerup', { pointerId: 52, clientX: 600, clientY: 400 });
  assert.equal(input.pointer.down, true);
  fire(window, 'pointerup', { pointerId: 51, clientX: 110, clientY: 100 });
  assert.equal(input.pointer.down, false); assert.equal(input._pointerId, null);
  fire(canvas, 'pointerleave', { pointerId: 51 });
  assert.equal(input.pointer.inside, true, 'touch leave after finger-up must not invalidate an in-canvas drop');
  input.beginFrame(); assert.ok(input.pointerReleased);
  fire(canvas, 'pointerdown', { pointerId: 53, clientX: 50, clientY: 50 });
  fire(canvas, 'pointercancel', { pointerId: 53 }); assert.equal(input._pointerId, null);
});

let gesture = false;
const players = [];
class PolicyMedia {
  constructor(src = '') { this.src = src; this.paused = true; this.authorized = false; this.currentTime = 0; players.push(this); }
  setAttribute() {}
  removeAttribute(name) { if (name === 'src') this.src = ''; }
  load() { this.currentTime = 0; }
  pause() { this.paused = true; }
  play() {
    if (gesture) this.authorized = true;
    if (!this.authorized) return Promise.reject(Object.assign(new Error(), { name: 'NotAllowedError' }));
    this.paused = false; this.onplaying?.(); return Promise.resolve();
  }
}
globalThis.Audio = PolicyMedia;
const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };
await check('per-element mobile policy: first touch primes the actual voice player; next clips need no new gesture', async () => {
  const voice = new Voice({ setSpeechActive() {} }, { a: 'a.mp3', b: 'b.mp3' });
  gesture = true; voice.unlock(); gesture = false; await flush();
  const player = voice._element;
  assert.equal(player.src, SILENT_WAV); assert.ok(player.authorized && player.paused);
  voice.set({ key: 'dialogue', lines: [{ id: 'a' }, { id: 'b' }] }); await flush();
  assert.ok(voice.playing); assert.equal(voice.media, player);
  voice.media.onended(); await flush();
  assert.ok(voice.playing && voice.media.src.endsWith('b.mp3'));
  assert.equal(voice.media, player);
  voice.clear(); voice.set({ key: 'next-scene', lines: [{ id: 'a' }] }); await flush();
  assert.equal(voice.media, player); assert.ok(voice.playing);
  voice.clear();
});
await check('one gesture unlocks both actual players and resumes interrupted AudioContext safely', async () => {
  let resumes = 0;
  window.AudioContext = class {
    constructor() { this.state = 'interrupted'; this.currentTime = 0; this.destination = {}; }
    createGain() { return { gain: { value: 0, setTargetAtTime() {} }, connect() {} }; }
    resume() { resumes++; this.state = 'running'; return Promise.resolve(); }
  };
  const audio = new GameAudio();
  gesture = true; audio.unlock(); gesture = false; await flush();
  assert.equal(resumes, 1);
  const workshop = audio.music.media;
  assert.ok(workshop.authorized && audio.voice._element.authorized);
  audio.music.play('sanctuary'); await flush();
  assert.equal(audio.music.media, workshop);
  assert.ok(!workshop.paused && workshop.src.endsWith('The_Sanctuary_Rising.mp3'));
  audio.music.stop(); audio.voice.clear();
});
console.log(`\n${checks} mobile checks passed without audio output.`);
