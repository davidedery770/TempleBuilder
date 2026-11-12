import assert from 'node:assert/strict';
import { Music } from '../src/core/music.js';
import { MUSIC_THEMES, themeForScene } from '../src/data/musicThemes.js';
import { SceneManager } from '../src/scenes/sceneManager.js';

globalThis.localStorage = { getItem: () => null, setItem() {} };
let checks = 0;
const check = (name, fn) => { fn(); checks++; console.log('PASS ' + name); };
function rig() {
  const calls = [], buses = [];
  const audio = {
    ctx: { currentTime: 0, createGain() {
      const node = {
        gain: { value: 0, setTargetAtTime(v) { this.value = v; } },
        connect() {}, disconnect() { this.disconnected = true; },
      };
      buses.push(node); return node;
    } },
    master: {},
    tone: o => calls.push({ kind: 'tone', ...o }),
    noise: o => calls.push({ kind: 'noise', ...o }),
  };
  const music = new Music(audio);
  music._ctxReady();
  return { music, audio, calls, buses };
}
const themes = ['desert', 'jordan', 'gilgal'];
check('all playable stages select their own soundtrack; menus and workshop stay intact', () => {
  assert.deepEqual([1, 2, 3, 4].map(id => themeForScene('play', id)), ['desert', 'sanctuary', 'jordan', 'gilgal']);
  assert.equal(themeForScene('construction'), 'sanctuary');
  for (const scene of ['menu', 'levels', 'museum', 'summary']) assert.equal(themeForScene(scene, 4), 'menu');
  assert.equal(themeForScene('play', 99), 'desert');
});
check('scene manager passes the chosen stage before enter, including direct play→play transitions', () => {
  const selected = [];
  const game = {
    input: { flush() {} },
    onScene: (name, params) => selected.push(themeForScene(name, params.levelId)),
  };
  const manager = new SceneManager(game);
  manager.register('play', { enter() {} });
  for (const id of [1, 3, 4]) manager.set('play', { levelId: id });
  assert.deepEqual(selected, themes);
});
check('compositions have real different note sequences, scales, tempo, and instrumentation', () => {
  const signatures = new Set();
  for (const name of themes) {
    const cfg = MUSIC_THEMES[name];
    assert.ok(cfg.bpm >= 60 && cfg.bpm <= 100);
    assert.ok(cfg.form.every(p => p.length === 32 && p[0] !== null));
    assert.ok(cfg.form.flat().every(n => n === null || Number.isInteger(n)));
    assert.ok(cfg.lead <= 0.08 && cfg.bassGain <= 0.05);
    signatures.add(JSON.stringify(cfg.form));
  }
  assert.equal(signatures.size, 3);
  assert.equal(MUSIC_THEMES.jordan.voice, 'sine');
  assert.equal(MUSIC_THEMES.jordan.drums, null);
  assert.ok(MUSIC_THEMES.gilgal.bpm > MUSIC_THEMES.desert.bpm);
  assert.notDeepEqual(MUSIC_THEMES.gilgal.scale, MUSIC_THEMES.desert.scale);
});
check('full loops schedule valid quiet audio and repeat exactly at the loop boundary', () => {
  const signatures = [];
  for (const name of themes) {
    const r = rig();
    try {
      r.music.play(name);
      r.calls.length = 0;
      const length = MUSIC_THEMES[name].form.length * 32;
      for (let step = 0; step < length; step++) r.music._schedule(step, 0);
      assert.ok(r.calls.length > 50);
      for (const c of r.calls) {
        assert.ok(c.gain > 0 && c.gain <= 0.1);
        assert.ok(c.dur > 0 && Number.isFinite(c.dur));
        assert.ok(c.dest === r.music.bus);
        if (c.kind === 'tone') assert.ok(c.freq > 30 && c.freq < 3000);
      }
      signatures.push(JSON.stringify(r.calls.map(c => [c.kind, c.freq, c.dur, c.type])));
      r.calls.length = 0; r.music._schedule(0, 0);
      const beginning = r.calls.map(({ dest, ...c }) => c);
      r.calls.length = 0; r.music._schedule(length, 0);
      assert.deepEqual(r.calls.map(({ dest, ...c }) => c), beginning);
    } finally { r.music.stop(); }
  }
  assert.equal(new Set(signatures).size, 3);
});
const r = rig();
try {
  check('new stages retire the old music bus; repeating a theme does not restart it', () => {
    r.music.play('desert');
    const old = r.music.bus, timer = r.music.timer;
    r.music.play('desert');
    assert.equal(r.music.bus, old); assert.equal(r.music.timer, timer);
    r.music.play('jordan');
    assert.notEqual(r.music.bus, old);
    assert.equal(old.gain.value, 0);
    const river = r.music.bus;
    r.music.play('gilgal');
    assert.equal(river.gain.value, 0);
  });
  check('every procedural theme respects mute, ducking, hidden tabs, and stop', () => {
    for (const name of themes) {
      r.music.play(name);
      r.music.duck(true); assert.equal(r.music.bus.gain.value, 0.3);
      r.music.duck(false); assert.equal(r.music.bus.gain.value, 1);
      r.music.toggle(); assert.equal(r.music.bus.gain.value, 0);
      const before = r.calls.length;
      r.audio.ctx.currentTime += 1; r.music._tick();
      assert.equal(r.calls.length, before);
      r.music.toggle(); assert.equal(r.music.bus.gain.value, 1);
      r.music.setHidden(true);
      const hiddenCalls = r.calls.length;
      r.audio.ctx.currentTime += 1; r.music._tick();
      assert.equal(r.calls.length, hiddenCalls);
      r.music.setHidden(false); assert.equal(r.music.bus.gain.value, 1);
    }
    r.music.stop();
    assert.equal(r.music.timer, null); assert.equal(r.music.bus.gain.value, 0);
    const stoppedBus = r.music.bus;
    r.music.play('desert');
    assert.notEqual(r.music.bus, stoppedBus);
    assert.equal(stoppedBus.gain.value, 0);
  });
} finally { r.music.stop(); }
check('latest stage selection wins when waiting for the first user interaction', () => {
  const waiting = new Music({ ctx: null });
  waiting.play('desert'); waiting.play('jordan'); waiting.play('gilgal');
  assert.equal(waiting.pending, 'gilgal');
  assert.equal(waiting.timer, null);
});
console.log(`\n${checks} stage music checks passed.`);
