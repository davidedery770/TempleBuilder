import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { entryMotionPoint, drawEntryMotion } from '../src/core/entryMotion.js';
import { drawCampBackdrop, drawCampTile } from '../src/core/campArt.js';
import { SCENERY_URLS } from '../src/core/sceneryAssets.js';
import { LevelSelectScene } from '../src/scenes/levelSelect.js';
import { PlayScene } from '../src/scenes/play.js';
import { Camera } from '../src/core/camera.js';
import { SaveData } from '../src/core/storage.js';
import { buildLevel01 } from '../src/data/level01.js';
import { buildLevel03 } from '../src/data/level03.js';
import { buildLevel04 } from '../src/data/level04.js';
import { LEVELS, CHAPTERS } from '../src/data/levels.js';

globalThis.localStorage = { getItem: () => null, setItem() {} };
globalThis.window = { matchMedia: () => ({ matches: false }) };
const audio = new Proxy({ music: { duck() {} } }, { get: (o, k) => o[k] || (() => {}) });
function context() {
  const calls = [], state = { globalAlpha: 1 }, stack = [];
  return new Proxy({
    calls, save() { stack.push({ ...state }); }, restore() { Object.assign(state, stack.pop()); },
    measureText: s => ({ width: String(s).length * 7 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
  }, {
    get: (o, k) => k in o ? o[k] : k in state ? state[k] : (...args) => {
      for (const a of args) if (typeof a === 'number') assert.ok(Number.isFinite(a), String(k));
      calls.push([k, ...args.filter(a => typeof a !== 'object')]);
    },
    set: (o, k, value) => { state[k] = value; return true; },
  });
}
let checks = 0;
const check = (name, fn) => { fn(); checks++; console.log('PASS ' + name); };
check('home light follows a continuous right-to-left path inside the actual illustration', () => {
  assert.deepEqual(entryMotionPoint(0), { x: 846, y: 277 });
  assert.deepEqual(entryMotionPoint(1), { x: 116, y: 222 });
  for (let i = 0; i < 400; i++) {
    const a = entryMotionPoint(i / 400), b = entryMotionPoint((i + 1) / 400);
    assert.ok(a.y > 200 && a.y < 300 && a.x >= 116 && a.x <= 846);
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 5);
  }
});
check('home effects move, restore canvas state, and draw nothing with reduced motion', () => {
  const a = context(), b = context(), quiet = context();
  drawEntryMotion(a, 960, 540, 0, false); drawEntryMotion(b, 960, 540, 6, false);
  assert.notDeepEqual(a.calls, b.calls);
  assert.equal(a.globalAlpha, 1);
  drawEntryMotion(quiet, 960, 540, 6, true); assert.equal(quiet.calls.length, 0);
});
check('scenery assets are local and lightweight', () => {
  let total = 0;
  for (const [key,url] of Object.entries(SCENERY_URLS)) {
    const bytes=statSync(new URL(url)).size;
    if(key==='shiloh')assert.ok(bytes<280000,'full stage-five background has its own bounded image budget');
    else total+=bytes;
  }
  assert.ok(total < 200000);
});
check('only stage 1 receives the new visual tile hook, with no mutation while drawing', () => {
  for (const id of [1, 3, 4]) {
    const s = new PlayScene();
    s.game = { width: 960, height: 540, camera: new Camera(960, 540), audio,
      save: new SaveData(), input: { pointer: {} }, debug: null };
    s.scenes = { go() {} }; s.enter({ levelId: id });
    assert.equal(!!s.map.tilePainter, id === 1);
    const before = JSON.stringify(s.def);
    s.draw(context());
    assert.equal(JSON.stringify(s.def), before);
    if (id === 1) {
      for (const ch of ['#', 'R', 't', 'c', 'p', 'g', 'd', '=', '^']) {
        drawCampTile(context(), ch, 100, 300, 3, 10, 'back', s.map);
      }
      drawCampBackdrop(context(), 960, 540, 0, 100, 3, { mountains: {} });
    }
  }
});
check('all 14 levels retain real numbers, seven chapters, lock gating and planned-only readiness', () => {
  assert.equal(CHAPTERS.length, 7);
  assert.deepEqual(LEVELS.map(l => l.id), Array.from({ length: 14 }, (_, i) => i + 1));
  const s = new LevelSelectScene(), went = [];
  const save = new SaveData();
  s.game = { width: 960, height: 540, save, audio,
    input: { pressed: () => false, over: () => false, wheel: 0 } };
  s.scenes = { transitioning: false, go: (...args) => went.push(args) };
  s.enter({ focus: 2 }); s._select(); assert.equal(went.length, 0);
  save.unlockLevel(4); s.enter({ focus: 2 }); s._select();
  assert.equal(went[0][0], 'construction');
  s.enter({ focus: 11 }); save.data.unlocked = 14;
  s._select(); assert.equal(went.length, 1, 'unimplemented level cannot launch even when unlocked');
  s.art = { camp: {}, river: {}, hills: {}, jerusalem: {} };
  s.update(1 / 60); s.draw(context());
});
if (process.argv[2]) check('baseline maps, physics, character art, saves, voice and original home image are byte-for-byte unchanged', () => {
  const baseline = JSON.parse(readFileSync(path.join(process.argv[2], 'invariants.json')));
  const root = new URL('../', import.meta.url);
  const hash = s => createHash('sha256').update(s).digest('hex');
  for (const [file, expected] of Object.entries(baseline.files)) assert.equal(hash(readFileSync(new URL(file, root))), expected, file);
  assert.deepEqual([buildLevel01, buildLevel03, buildLevel04].map(b => hash(JSON.stringify(b()))), baseline.levels);
  const play = readFileSync(new URL('src/scenes/play.js', root), 'utf8');
  const tiles = readFileSync(new URL('src/game/tilemap.js', root), 'utf8');
  assert.equal(hash(play.slice(play.indexOf('  update(dt)'), play.indexOf('  draw(ctx)'))), baseline.playLogic);
  assert.equal(hash(tiles.slice(0, tiles.indexOf('  drawLayer('))), baseline.tilePhysics);
});
console.log(`\n${checks} rich visual checks passed.`);
