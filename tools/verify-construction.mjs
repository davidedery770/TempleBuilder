import assert from 'node:assert/strict';
import { BUILD_PARTS, PLAN, canPlace, targetPoint, acceptsDrop } from '../src/data/level02.js';
import { getMaterial } from '../src/data/materials.js';
import { SaveData } from '../src/core/storage.js';
import { Input } from '../src/core/input.js';
import { ConstructionScene } from '../src/scenes/construction.js';
import { LevelSelectScene } from '../src/scenes/levelSelect.js';
import { PlayScene } from '../src/scenes/play.js';
import { SummaryScene } from '../src/scenes/summary.js';
import { drawConstructionPlan } from '../src/core/constructionArt.js';

globalThis.window = new EventTarget();
let raw = null;
globalThis.localStorage = { getItem: () => raw, setItem: (_, value) => { raw = value; } };
const audio = new Proxy({ music: { duck() {} } }, { get: (obj, key) => obj[key] || (() => {}) });
let checks = 0;
function check(label, fn) { fn(); checks++; console.log('PASS ' + label); }
const part = id => BUILD_PARTS.find(p => p.id === id);

function setup(save = new SaveData()) {
  const canvas = new EventTarget();
  canvas.style = {};
  canvas.getBoundingClientRect = () => ({ left: 100, top: 50, width: 1920, height: 1080 });
  const input = new Input();
  input.attachPointer(canvas, 960, 540);
  const game = { width: 960, height: 540, input, audio, save };
  const went = [];
  const scene = new ConstructionScene();
  scene.game = game;
  scene.scenes = { transitioning: false, go: (name, params) => went.push({ name, params }) };
  scene.enter();
  const event = (type, x, y, target = canvas) => {
    const e = new Event(type, { cancelable: true });
    Object.assign(e, { clientX: 100 + x * 2, clientY: 50 + y * 2, button: 0 });
    target.dispatchEvent(e);
  };
  const tick = () => { input.beginFrame(); scene.update(1 / 60); };
  const key = action => { input._queue.add(action); tick(); };
  const drop = (id, point = targetPoint(part(id))) => {
    const i = scene.options.findIndex(p => p.id === id);
    assert.ok(i >= 0, `${id} must be available`);
    const r = scene._row(i);
    event('pointerdown', r.x + 30, r.y + 12); tick();
    event('pointermove', point.x, point.y); tick();
    event('pointerup', point.x, point.y, window); tick();
  };
  return { scene, game, input, event, tick, key, drop, went, canvas };
}

check('19 sourced groups, six phases, valid materials and targets', () => {
  assert.equal(BUILD_PARTS.length, 19);
  assert.equal(new Set(BUILD_PARTS.map(p => p.id)).size, 19);
  assert.equal(new Set(BUILD_PARTS.map(p => p.phase)).size, 6);
  for (const p of BUILD_PARTS) {
    assert.match(p.source, /שמות/);
    assert.ok(p.quote && p.hint);
    assert.ok(p.materials.every(id => getMaterial(id)));
    assert.ok(p.target[0] >= 0 && p.target[0] <= 100 && p.target[1] >= 0 && p.target[1] <= 50);
  }
  assert.equal(PLAN.w / PLAN.h, 2);
  assert.equal(part('south').target[1] > part('north').target[1], true);
  assert.ok(part('table').target[1] < part('menorah').target[1]);
  assert.ok(part('ark').target[0] < part('veil').target[0]);
  assert.ok(part('laver').target[0] > part('entrance').target[0]);
  assert.ok(part('laver').target[0] < part('altar').target[0]);
  assert.equal(part('gate').target[0], 100);
  assert.ok(part('entrance').materials.includes('bronze'));
  assert.ok(acceptsDrop(part('north'), PLAN.x + 22 * PLAN.scale, PLAN.y + 20 * PLAN.scale));
  assert.ok(!acceptsDrop(part('north'), PLAN.x + 22 * PLAN.scale, PLAN.y + 30 * PLAN.scale));
});

check('legacy save defaults; unique personal material types survive reload', () => {
  raw = JSON.stringify({ unlocked: 3, relics: ['tavnit'], codex: [], scores: {}, totalDonations: 9 });
  const save = new SaveData();
  assert.deepEqual(save.data.materials, []);
  save.addMaterials(['gold', 'silver', 'gold']);
  assert.deepEqual(new SaveData().data.materials, ['gold', 'silver']);
});
raw = null;
const s = setup();
check('future groups and wrong positions cannot be placed', () => {
  assert.equal(s.scene.tryPlace(part('menorah'), 0, 0), false);
  s.drop('bases', { x: 70, y: 180 });
  assert.equal(s.scene.placed.size, 0);
});
check('actual scaled pointer drag places and saves foundations', () => {
  s.drop('bases');
  assert.ok(s.scene.placed.has('bases'));
  assert.deepEqual(new SaveData().data.construction.placed, ['bases']);
});
check('dependency feedback and pointer release lifecycle', () => {
  assert.equal(canPlace(part('bars'), s.scene.placed), false);
  s.drop('bars');
  assert.equal(s.scene.placed.size, 1);
  assert.equal(s.input.pointerReleased, true);
  s.tick();
  assert.equal(s.input.pointerReleased, false);
});
check('pointercancel and focus loss cancel without placing', () => {
  const r = s.scene._row(0);
  s.event('pointerdown', r.x + 20, r.y + 12); s.tick();
  s.canvas.dispatchEvent(new Event('pointercancel')); s.tick();
  assert.equal(s.scene.drag, null);
  s.event('pointerdown', r.x + 20, r.y + 12); s.tick();
  window.dispatchEvent(new Event('blur')); s.tick();
  assert.equal(s.scene.drag, null);
  assert.equal(s.scene.placed.size, 1);
});
check('escape cancels a drag; outside-canvas release is not a placement', () => {
  const r = s.scene._row(0);
  s.event('pointerdown', r.x + 20, r.y + 12); s.tick();
  s.key('back');
  assert.equal(s.scene.drag, null);
  assert.equal(s.went.length, 0);
  s.drop('south', { x: -100, y: 290 });
  assert.equal(s.scene.placed.size, 1);
});
check('resume partial construction; unknown and out-of-order IDs ignored', () => {
  const resumed = setup(new SaveData());
  assert.deepEqual([...resumed.scene.placed], ['bases']);
  const save = new SaveData();
  save.data.construction = { placed: ['garbage', 'menorah', 'bases'] };
  assert.deepEqual([...setup(save).scene.placed], ['bases']);
});
check('keyboard spatial placement and click-to-place work', () => {
  s.key('confirm');
  assert.ok(s.scene.keyboardPoint);
  s.key('left');
  assert.ok(s.scene.keyboardPoint.x < PLAN.x + 50 * PLAN.scale);
  s.key('pause');
  assert.equal(s.scene.keyboardPoint, null);
  const r = s.scene._row(0);
  s.event('pointerdown', r.x + 20, r.y + 12); s.tick();
  s.event('pointerup', r.x + 20, r.y + 12, window); s.tick();
  const p = targetPoint(part('south'));
  s.event('pointerdown', p.x, p.y); s.tick();
  s.event('pointerup', p.x, p.y, window); s.tick();
  assert.ok(s.scene.placed.has('south'));
});

// Canvas mock rejects non-finite coordinates, records the complete render path.
const ctx = new Proxy({ globalAlpha: 1 }, {
  get: (obj, key) => {
    if (key in obj) return obj[key];
    if (key === 'measureText') return str => ({ width: str.length * 7 });
    if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => ({ addColorStop() {} });
    return (...args) => { for (const a of args) if (typeof a === 'number') assert.ok(Number.isFinite(a)); };
  },
});
check('every build phase renders; opposing sides reject swapped vessels', () => {
  while (!s.scene.complete) {
    s.scene.draw(ctx);
    const p = s.scene.options.find(p => canPlace(p, s.scene.placed));
    assert.ok(p, 'at least one legal move in each phase');
    if (p.id === 'table') {
      const wrong = targetPoint(part('menorah'));
      assert.equal(s.scene.tryPlace(p, wrong.x, wrong.y), false);
    }
    s.drop(p.id);
  }
  s.scene.draw(ctx);
  s.scene.showNotes = true; s.scene.draw(ctx); s.scene.showNotes = false;
});
check('completion is persisted, unlocks Jordan, and awards are idempotent', () => {
  const save = new SaveData();
  assert.equal(save.data.construction.completed, true);
  assert.ok(save.hasRelic('adanim'));
  assert.equal(save.data.unlocked, 3);
  assert.equal(save.bestScore(2), 3800);
  const replay = setup(save);
  assert.ok(replay.scene.complete);
  assert.equal(save.data.relics.filter(id => id === 'adanim').length, 1);
  replay.key('confirm');
  assert.equal(replay.went[0].name, 'summary');
  assert.equal(replay.went[0].params.built, 19);
  const summary = new SummaryScene();
  summary.game = replay.game; summary.scenes = replay.scene.scenes;
  summary.enter(replay.went[0].params); summary.update(1 / 60); summary.draw(ctx);
  assert.ok(summary.construction);
});
check('level selection routes stage 2 to the workshop', () => {
  const scene = new LevelSelectScene();
  scene.game = s.game; scene.scenes = s.scene.scenes;
  scene.enter({ focus: 2 }); scene._select();
  assert.equal(s.went.at(-1).name, 'construction');
});
check('stage 1 completion unlocks stage 2, not stage 3', () => {
  raw = null;
  const save = new SaveData();
  const scene = new PlayScene();
  scene.game = { save };
  scene.meta = { id: 1, relic: { id: 'tavnit' } };
  scene.score = 0; scene.materialsFound = new Set(['gold']);
  scene.cardsFound = new Set(); scene.sparks = 0; scene.stationsDone = 0;
  scene.def = { maxSparks: 3 }; scene.stations = []; scene.t = 1;
  scene.scenes = { go() {} };
  scene._completeLevel();
  assert.equal(save.data.unlocked, 2);
});
check('altar hint appears on the third wrong drop and survives reselecting', () => {
  const save = new SaveData();
  save.data.construction = { placed: BUILD_PARTS.slice(0, 15).map(p => p.id) };
  const a = setup(save);
  assert.equal(a.scene.selected.id, 'altar');
  const wrong = { x: 70, y: 180 };
  a.drop('altar', wrong);
  assert.equal(a.scene.locationHintVisible, false);
  a.drop('altar', wrong);
  assert.equal(a.scene.locationHintVisible, false);
  a.drop('altar', wrong);
  assert.equal(a.scene.locationHintVisible, true);
  assert.equal(a.scene.placed.has('altar'), false);
  assert.match(a.scene.feedback, /סימון חיוור/);
  a.scene._pick(part('court'));
  assert.equal(a.scene.locationHintVisible, false);
  a.scene._pick(part('altar'));
  assert.equal(a.scene.locationHintVisible, true);
  a.scene.draw(ctx);
  // A blocked dependency is not a wrong location guess and reveals no target.
  a.scene._pick(part('laver'));
  a.drop('laver', wrong); a.drop('laver', wrong); a.drop('laver', wrong);
  assert.equal(a.scene.failedPlacements.has('laver'), false);
  assert.equal(a.scene.locationHintVisible, false);
  a.scene._pick(part('altar'));
  a.drop('altar');
  assert.equal(a.scene.failedPlacements.has('altar'), false);
  assert.equal(a.scene.locationHintVisible, false);
  assert.ok(a.scene.placed.has('altar'));
  a.key('build');
  assert.equal(a.scene.locationHintVisible, true, 'manual hint remains available immediately');
});
check('visible altar hint draws a footprint at the correct location only', () => {
  const rectangles = [];
  const recorder = new Proxy(ctx, {
    get: (obj, key) => key === 'strokeRect' ? (...args) => rectangles.push(args) : obj[key],
  });
  const p = part('altar'), target = targetPoint(p), size = 5 * PLAN.scale;
  const footprint = [target.x - size / 2, target.y - size / 2, size, size];
  drawConstructionPlan(recorder, new Set(), p, false, 0);
  assert.ok(!rectangles.some(r => r.every((n, i) => n === footprint[i])));
  rectangles.length = 0;
  drawConstructionPlan(recorder, new Set(), p, true, 0);
  assert.ok(rectangles.some(r => r.every((n, i) => n === footprint[i])));
});
check('rebuild requires confirmation and preserves all earned progress', () => {
  const save = new SaveData();
  save.data.construction = { placed: BUILD_PARTS.map(p => p.id), completed: true };
  save.data.materials = ['gold', 'silver']; save.data.unlocked = 4;
  save.data.scores[2] = 5000;
  const a = setup(save);
  const before = structuredClone(save.data);
  const clickRebuild = () => {
    a.event('pointerdown', 325, 510); a.tick();
    a.event('pointerup', 325, 510, window); a.tick();
  };
  clickRebuild();
  assert.ok(a.scene.rebuildConfirm);
  a.scene.draw(ctx);
  a.key('confirm'); // Default focus is cancellation, not destructive confirmation.
  assert.equal(a.scene.rebuildConfirm, false); assert.equal(a.scene.placed.size, 19);
  assert.deepEqual(save.data, before);
  clickRebuild(); a.key('back');
  assert.equal(a.scene.placed.size, 19);
  clickRebuild(); a.key('right'); a.key('confirm');
  assert.equal(a.scene.placed.size, 0); assert.equal(a.scene.complete, false);
  assert.equal(a.scene.selected.id, 'bases'); assert.equal(a.scene.elapsed, 0);
  assert.equal(a.scene.failedPlacements.size, 0);
  assert.deepEqual(save.data.construction, { placed: [], completed: false });
  const { construction: ignoredBefore, ...earnedBefore } = before;
  const { construction: ignoredAfter, ...earnedAfter } = save.data;
  assert.deepEqual(earnedAfter, earnedBefore);
  const resumed = setup(new SaveData());
  assert.equal(resumed.scene.placed.size, 0);
  assert.deepEqual([...resumed.scene.personal], ['gold', 'silver']);
  while (!resumed.scene.complete) {
    const p = resumed.scene.options.find(p => canPlace(p, resumed.scene.placed));
    const target = targetPoint(p);
    assert.ok(resumed.scene.tryPlace(p, target.x, target.y));
  }
  assert.equal(resumed.game.save.data.relics.filter(id => id === 'adanim').length, 1);
  assert.equal(resumed.game.save.bestScore(2), 5000);
  assert.equal(resumed.game.save.data.unlocked, 4);
});
console.log(`\n${checks} construction checks passed.`);
