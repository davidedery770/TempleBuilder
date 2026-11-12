import assert from 'node:assert/strict';
import { MemoryGame } from '../src/minigames/memory.js';
import { PlanningMazeGame, solveMaze, pathBetween, walkable, sameCell } from '../src/minigames/planningMaze.js';
import { LEARNING_DIFFICULTY } from '../src/data/learningJourney.js';
import { PlayScene } from '../src/scenes/play.js';
import { Camera } from '../src/core/camera.js';
import { SaveData } from '../src/core/storage.js';

let raw = null;
globalThis.window = new EventTarget();
globalThis.localStorage = { getItem: () => raw, setItem: (_, value) => { raw = value; } };
const audio = new Proxy({ music: { duck() {} } }, { get: (o, k) => o[k] || (() => {}) });
const input = (keys = [], pointer = {}, held = []) => ({
  pressed: k => keys.includes(k), down: k => held.includes(k),
  pointer: { inside: false, down: false, ...pointer }, clicked: false, over: () => false, flush() {},
});
const tick = (m, keys = [], dt = 0.2) => m.update(dt, input(keys), audio);
const click = (m, r, cancelled = false) => {
  const i = input([], { x: r.x + r.w / 2, y: r.y + r.h / 2, inside: true });
  i.clicked = true; i.pointerCancelled = cancelled; m.update(0.2, i, audio);
};
const ctx = new Proxy({ globalAlpha: 1 }, {
  get: (o, k) => k in o ? o[k] : k === 'measureText' ? s => ({ width: s.length * 7 })
    : ['createLinearGradient', 'createRadialGradient'].includes(k) ? () => ({ addColorStop() {} })
    : (...args) => args.forEach(n => { if (typeof n === 'number') assert.ok(Number.isFinite(n), String(k)); }),
});
let checks = 0;
const check = (name, test) => { raw = null; test(); checks++; console.log('PASS ' + name); };
const pairIndexes = (m, pairId) => m.cards.flatMap((c, i) => c.pairId === pairId ? [i] : []);
function scene(levelId) {
  const s = new PlayScene();
  s.game = { width: 960, height: 540, camera: new Camera(960, 540), save: new SaveData(), audio, input: input() };
  s.scenes = { transitioning: false, go() {} }; s.enter({ levelId }); return s;
}
function walk(m, route) {
  assert.ok(sameCell(m.position, route[0]));
  for (const next of route.slice(1)) {
    const dx = next[0] - m.position[0], dy = next[1] - m.position[1];
    const key = dx === -1 ? 'left' : dx === 1 ? 'right' : dy === -1 ? 'up' : 'down';
    tick(m, [key]);
    assert.deepEqual(m.position, next, 'each arrow immediately moves the player to the adjacent cell');
    assert.equal(m.awaiting, undefined, 'no modal explanation blocks the next arrow');
  }
}
check('all memory ranks start closed and retain progressive pair counts', () => {
  for (const levelId of [1, 3, 4, 5, 6]) {
    const m = new MemoryGame({}, { levelId });
    assert.equal(m.cards.length, LEARNING_DIFFICULTY[levelId].pairs * 2);
    assert.ok(m.cards.every((_, i) => !m.visible(i)));
    tick(m, ['confirm']); assert.equal(m.open.length, 1, 'no introduction/preview to dismiss');
    m.draw(ctx);
  }
});
check('matching a pair never needs continue and leaves learning labels on the cards', () => {
  const m = new MemoryGame({}, { levelId: 5 });
  const first = pairIndexes(m, m.pairs[0].id);
  m.reveal(first[0], audio); m.reveal(first[1], audio);
  assert.equal(m.awaiting, false); assert.ok(first.every(i => m.visible(i)));
  assert.equal(m.feedback, m.pairs[0].label); assert.notEqual(m.feedback, m.pairs[0].fact);
  const next = pairIndexes(m, m.pairs[1].id)[0];
  m.reveal(next, audio); assert.deepEqual(m.open, [next]);
  assert.ok(m.cards.some(c => c.role && c.label === m.pairs[0].role));
});
check('wrong pairs close automatically, cannot reveal a third card, and preserve matched pairs', () => {
  const m = new MemoryGame({});
  const [a, b] = pairIndexes(m, m.pairs[0].id);
  m.reveal(a, audio); m.reveal(b, audio);
  const c = pairIndexes(m, m.pairs[1].id)[0], d = pairIndexes(m, m.pairs[2].id)[0];
  m.reveal(c, audio); m.reveal(d, audio);
  m.reveal(pairIndexes(m, m.pairs[3].id)[0], audio);
  assert.equal(m.open.length, 2); assert.equal(m.mistakes, 1);
  tick(m, [], 0.4); assert.ok(m.visible(c));
  tick(m, [], 0.6); assert.equal(m.awaiting, false);
  assert.ok(!m.visible(c) && !m.visible(d) && m.visible(a) && m.visible(b));
});
check('memory hints expire automatically without giving a free matching reward', () => {
  const m = new MemoryGame({});
  tick(m, ['build']); assert.ok(m.assisted && m.awaiting);
  assert.equal(m.matchedIds.length, 0);
  tick(m, [], 1.6); assert.equal(m.awaiting, false); assert.equal(m.open.length, 0);
  m.draw(ctx);
});
check('memory mouse/touch cards and keyboard support play, cancellation and resume', () => {
  const m = new MemoryGame({}, { levelId: 4 }); tick(m);
  click(m, m.cardRect(0), true); assert.equal(m.open.length, 0);
  const [a, b] = pairIndexes(m, m.pairs[0].id);
  click(m, m.cardRect(a)); click(m, m.cardRect(b)); tick(m, ['back']);
  assert.ok(m.result.cancelled && !m.result.success);
  const restored = new MemoryGame({}, { levelId: 4, progress: m.result.progress });
  assert.deepEqual(restored.cards.map(c => c.id), m.cards.map(c => c.id));
  assert.deepEqual(restored.matchedIds, m.matchedIds);
  for (const pair of restored.pairs.slice(1)) {
    for (const i of pairIndexes(restored, pair.id)) { restored.focus = i; tick(restored, ['confirm']); }
  }
  assert.ok(restored.complete && !restored.finished);
  tick(restored, ['confirm']); assert.ok(restored.result.success && restored.result.perfect);
});
check('corrupt memory progress cannot create invalid cards or duplicate matches', () => {
  const m = new MemoryGame({}, { progress: { order: [null], matchedIds: ['menorah', 'menorah', 'missing'], mistakes: NaN } });
  assert.equal(new Set(m.cards.map(c => c.id)).size, m.cards.length);
  assert.deepEqual(m.matchedIds, ['menorah']); assert.equal(m.mistakes, 0); m.draw(ctx);
});
check('all maze ranks are solvable by walking, with no run or continue action', () => {
  for (const levelId of [3, 4, 5, 6]) {
    const m = new PlanningMazeGame({}, { levelId }); tick(m);
    const route = solveMaze(m.def); assert.ok(route?.length > 1);
    walk(m, route); assert.ok(m.complete); assert.equal(m.visited, m.def.targets.length);
    m.draw(ctx); tick(m, ['confirm']); assert.ok(m.result.success && m.result.perfect);
  }
});
check('walls block movement; holding an arrow walks repeatedly; releasing stops', () => {
  const m = new PlanningMazeGame({}, { levelId: 6 }); tick(m);
  tick(m, ['up']); assert.deepEqual(m.position, [1, 1]);
  m.update(0.01, input(['right'], {}, ['right']), audio);
  assert.deepEqual(m.position, [2, 1]);
  for (let i = 0; i < 20; i++) m.update(0.05, input([], {}, ['right']), audio);
  assert.deepEqual(m.position, [3, 1]); assert.equal(m.visited, 1);
  const pos = [...m.position];
  for (let i = 0; i < 10; i++) tick(m);
  assert.deepEqual(m.position, pos);
});
check('exit alone cannot complete a maze before its learning pickups', () => {
  const m = new PlanningMazeGame({}, { levelId: 6 }); tick(m);
  walk(m, pathBetween(m.def, m.position, m.def.exit));
  assert.ok(m.visited < m.def.targets.length); assert.equal(m.complete, false);
  assert.match(m.feedback, /סמלים/);
});
check('a hint highlights a valid next step but never moves or finishes the player', () => {
  const m = new PlanningMazeGame({}, { levelId: 6 }); tick(m);
  const before = [...m.position]; tick(m, ['build']);
  assert.deepEqual(m.position, before); assert.ok(walkable(m.def, m.hintCell));
  assert.equal(Math.abs(m.hintCell[0] - before[0]) + Math.abs(m.hintCell[1] - before[1]), 1);
  assert.equal(m.visited, 0); assert.ok(m.assisted); m.draw(ctx);
});
check('maze mouse/touch direction pad, adjacent clicks and cancellation work', () => {
  const m = new PlanningMazeGame({}, { levelId: 6 }); tick(m);
  click(m, { x: 131, y: 264, w: 48, h: 48 }); assert.deepEqual(m.position, [2, 1]);
  const point = m.cellCenter([3, 1]);
  click(m, { x: point.x - 1, y: point.y - 1, w: 2, h: 2 }, true);
  assert.deepEqual(m.position, [2, 1]);
  click(m, { x: point.x - 1, y: point.y - 1, w: 2, h: 2 });
  assert.deepEqual(m.position, [3, 1]); assert.equal(m.visited, 1);
  tick(m, ['pause']); assert.deepEqual(m.position, m.def.start); assert.equal(m.visited, 0);
});
check('direct maze progress resumes exactly, legacy unwalked routes never grant success', () => {
  const m = new PlanningMazeGame({}, { levelId: 6 }); tick(m);
  tick(m, ['right']); tick(m, ['right']); tick(m, ['build']); tick(m, ['back']);
  const resumed = new PlanningMazeGame({}, { levelId: 6, progress: m.result.progress });
  assert.deepEqual(resumed.position, m.position); assert.equal(resumed.visited, 1);
  assert.ok(resumed.assisted); assert.equal(resumed.steps, 2);
  const legacy = new PlanningMazeGame({}, { levelId: 6, progress: { version: 1, route: solveMaze(m.def) } });
  assert.deepEqual(legacy.position, legacy.def.start); assert.equal(legacy.visited, 0); assert.equal(legacy.complete, false);
  for (const position of [null, [NaN, 1], [-1, 1], [0, 0]]) {
    const g = new PlanningMazeGame({}, { progress: { version: 2, position, visited: Infinity } });
    assert.deepEqual(g.position, g.def.start); g.draw(ctx);
  }
});
check('station ESC preserves the world and partial game, and returning uses that state', () => {
  for (const kind of ['memory', 'planningMaze']) {
    const s = scene(6), station = s.stations.find(st => st.kind === kind), player = s.player;
    s._openStation(station, audio); tick(s.mini);
    if (kind === 'memory') for (const i of pairIndexes(s.mini, s.mini.pairs[0].id)) s.mini.reveal(i, audio);
    else { tick(s.mini, ['right']); tick(s.mini, ['right']); }
    tick(s.mini, ['back']); s._finishMini(audio);
    assert.equal(s.mini, null); assert.equal(s.player, player); assert.equal(s.score, 0);
    s._openStation(station, audio);
    if (kind === 'memory') assert.equal(s.mini.matchedIds.length, 1);
    else { assert.deepEqual(s.mini.position, [3, 1]); assert.equal(s.mini.visited, 1); }
  }
});
console.log(`\n${checks} learning-flow regression groups passed.`);
