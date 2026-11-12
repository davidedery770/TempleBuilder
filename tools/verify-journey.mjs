import assert from 'node:assert/strict';
import { buildLevel03 } from '../src/data/level03.js';
import { buildLevel04 } from '../src/data/level04.js';
import { buildLevel05 } from '../src/data/level05.js';
import { getLevel } from '../src/data/levels.js';
import { getCard } from '../src/data/codex.js';
import { TRIVIA } from '../src/data/trivia.js';
import { TileMap, TILE } from '../src/game/tilemap.js';
import { Enemy } from '../src/game/enemy.js';
import { Player, MAX_JUMP_PX } from '../src/game/player.js';
import { Camera } from '../src/core/camera.js';
import { SaveData } from '../src/core/storage.js';
import { PlayScene } from '../src/scenes/play.js';
import { FieldSystem } from '../src/game/fields.js';
import { ShofarTimingGame } from '../src/minigames/shofarTiming.js';
import { Music, WORKSHOP_VOLUME } from '../src/core/music.js';
import { readFile } from 'node:fs/promises';

globalThis.window = new EventTarget();
globalThis.localStorage = { getItem: () => null, setItem() {} };
let count = 0;
const check = (name, fn) => { fn(); count++; console.log('PASS ' + name); };
const audio = new Proxy({ music: { duck() {} } }, { get: (o, k) => o[k] || (() => {}) });
const input = keys => ({
  pressed: a => keys.includes(a), down: a => keys.includes(a),
  axisX: keys.includes('right') ? 1 : keys.includes('left') ? -1 : 0,
  over: () => false, clicked: false, pointerMoved: false, pointer: {}, flush() {},
});
const ctx = new Proxy({ globalAlpha: 1 }, {
  get: (o, k) => k in o ? o[k] : k === 'measureText' ? s => ({ width: s.length * 7 })
    : k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} })
    : (...args) => args.forEach(a => { if (typeof a === 'number') assert.ok(Number.isFinite(a), k); }),
});
function scene(id) {
  const s = new PlayScene();
  s.game = { width: 960, height: 540, camera: new Camera(960, 540), audio, save: new SaveData(), input: input([]) };
  const went = [];
  s.scenes = { go: (name, params) => went.push({ name, params }) };
  s.enter({ levelId: id });
  return { s, went };
}

check('Jordan uses distinct fish types, safe spawns, and real tribal metadata', () => {
  const { s } = scene(3);
  assert.ok(s.enemies.every(e => ['riverFish', 'silverFish'].includes(e.type)));
  assert.equal(new Set(s.enemies.map(e => e.type)).size, 2);
  for (const e of s.enemies) assert.ok(!s.map.rectHitsSolid(e.x, e.y, e.w, e.h));
  const stones = s.pickups.filter(p => p.type === 'stone');
  assert.equal(stones.length, 12);
  assert.equal(new Set(stones.map(p => p.tribe)).size, 12);
  assert.equal(new Set(stones.map(p => p.stoneIndex)).size, 12);
  s._collect(stones[0], audio);
  assert.equal(s.stones, 1);
  assert.ok(!s.particles.items.some(p => p.str === stones[0].tribe), 'collection stays visual, with no floating tribe name');
  s.draw(ctx);
});
check('fish hop, calm without death, and become dangerous again', () => {
  const d = buildLevel03(), map = new TileMap(d.back, d.action, d.front, getLevel(3).palette);
  const e = new Enemy('riverFish', 10 * TILE, 15 * TILE - 20);
  e.onGround = true; e._hopTimer = 0;
  e.update(1 / 60, map, null);
  assert.ok(e.vy < 0);
  assert.ok(e.repel(1)); assert.equal(e.dangerous, false);
  assert.ok(!('health' in e) && !('alive' in e));
  for (let i = 0; i < 210; i++) e.update(1 / 60, map, null);
  assert.equal(e.dangerous, true);
  e.draw(ctx, 0, 0);
});

function validateMap(id, definition) {
  const d = definition(), map = new TileMap(d.back, d.action, d.front, getLevel(id).palette);
  assert.equal(getLevel(id).ready, true);
  for (const layer of [d.back, d.action, d.front]) {
    assert.equal(layer.length, 20);
    assert.ok(layer.every(r => r.length === d.cols));
  }
  for(const {col,row} of d.orchard?.gateTiles||[])map.setChar('action',col,row,'.');
  assert.ok(!map.rectHitsSolid(d.spawn.x, d.spawn.y, 22, 42));
  for (const p of d.pickups) {
    const size = p.type === 'spark' ? 14 : p.type === 'stone' ? 22 : 20;
    assert.ok(!map.rectHitsSolid(p.x, p.y, size, size), `${id}: ${p.type} at ${p.x}`);
  }
  for (const n of [...d.npcs, ...d.stations, ...d.checkpoints]) {
    assert.ok(!map.rectHitsSolid(n.x, n.y, n.w, n.h), `${id}: ${n.id || 'checkpoint'} stuck`);
    if (n.cardId) assert.ok(getCard(n.cardId), n.cardId);
  }
  // Open the time-controlled gates for structural accessibility analysis.
  for (const g of d.waterGates || []) {
    for (let r = g.row0; r <= g.row1; r++) for (let c = g.col0; c <= g.col1; c++) map.setChar('action', c, r, '.');
  }
  const surfaces = [];
  for (let c = 0; c < map.cols; c++) for (let r = 0; r < map.rows; r++) {
    if ((map.isSolid(c, r) || map.isPlatform(c, r)) && !map.isSolid(c, r - 1)) surfaces.push({ c, r });
  }
  const key = p => `${p.c},${p.r}`;
  const start = surfaces.find(p => p.c === Math.floor(d.spawn.x / TILE) && p.r * TILE >= d.spawn.y);
  assert.ok(start);
  const reached = new Set([key(start)]), queue = [start];
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    for (const q of surfaces) {
      const dx = Math.abs(q.c - p.c);
      if (!dx || dx > 5 || (p.r - q.r) * TILE > MAX_JUMP_PX - 6 || reached.has(key(q))) continue;
      let blocked = false;
      for (let c = Math.min(p.c, q.c) + 1; c < Math.max(p.c, q.c); c++) {
        for (let r = 0; r < Math.min(p.r, q.r); r++) if (map.isSolid(c, r)) blocked = true;
      }
      if (!blocked) { reached.add(key(q)); queue.push(q); }
    }
  }
  for (const p of surfaces) assert.ok(reached.has(key(p)), `${id}: stranded surface ${key(p)}`);
  const near = p => surfaces.some(s => reached.has(key(s))
    && Math.abs((s.c + 0.5) * TILE - p.x) < TILE * 2
    && s.r * TILE >= p.y && s.r * TILE - p.y <= MAX_JUMP_PX + 42);
  for (const p of [...d.pickups, ...d.stations, d.exit, ...(d.challenge ? [d.challenge] : [])]) assert.ok(near(p), `${id}: unreachable objective ${p.id || p.type}`);
}
check('all Jordan platforms and objectives structurally reachable', () => validateMap(3, buildLevel03));
check('all Gilgal platforms and objectives structurally reachable', () => validateMap(4, buildLevel04));
check('all Shiloh platforms and objectives structurally reachable', () => validateMap(5, buildLevel05));
check('Gilgal main route can be traversed using real movement and full-height jumps', () => {
  const d = buildLevel04(), map = new TileMap(d.back, d.action, d.front, getLevel(4).palette);
  const p = new Player(d.spawn.x, d.spawn.y);
  for (let frame = 0; frame < 3000 && p.x < d.exit.x; frame++) {
    const ahead = p.x + p.w + 36;
    const jump = p.onGround && (map.rectHitsSolid(ahead, p.y, 8, p.h - 2)
      || !map.hasGroundBelow(ahead, p.y + p.h + 4));
    const controller = input(['right']);
    controller.down = action => action === 'jump' || action === 'right';
    controller.pressed = action => action === 'jump' && jump;
    p.update(1 / 60, controller, map, audio);
    assert.ok(p.alive, `route fell at x=${p.x}`);
  }
  assert.ok(p.x >= d.exit.x, `main route stuck at x=${p.x}`);
});

check('Gilgal has a new map, safe teaching field, enough sourced questions, and 12 bundles', () => {
  const d = buildLevel04();
  assert.notDeepEqual(d.action, buildLevel03().action);
  assert.equal(d.pickups.filter(p => p.type === 'grain').length, d.harvest.required);
  assert.ok(TRIVIA[4].length >= d.stations.reduce((n, s) => n + s.params.count, 0));
  assert.ok(TRIVIA[4].every(q => q.options.length === 4 && q.source));
  const f = d.fields[0];
  assert.ok(d.enemies.every(e => e.x > f.x + f.w));
  assert.ok(d.fields.every(f => f.duration > f.w / 180 + 1));
  assert.ok(d.checkpoints.length >= 3);
});
check('nearby fields bend, expire, and can be retriggered; distant ones stay unchanged', () => {
  const d = buildLevel04(), fs = new FieldSystem(d.fields);
  const p = new Player(d.fields[0].x, d.fields[0].y + 42);
  assert.ok(fs.covers(p));
  assert.equal(fs.bendNear(p).length, 1);
  assert.equal(fs.covers(p), false);
  assert.equal(fs.bendNear(p).length, 0, 'cooldown');
  fs.update(20);
  assert.equal(fs.covers(p), true);
  assert.equal(fs.bendNear(p).length, 1);
  assert.equal(fs.items.at(-1).bent, 0);
});
check('harvest and challenge are required; death/respawn keeps collected grain', () => {
  const { s, went } = scene(4);
  s.update(1 / 60);
  assert.equal(s.hasShofar, true);
  s.player.x = s.def.exit.x; s.player.y = s.def.exit.y;
  s._checkExit(audio); assert.equal(went.length, 0);
  for (const p of s.pickups.filter(p => p.type === 'grain')) s._collect(p, audio);
  assert.equal(s.grain, 12); assert.ok(s.relicTaken);
  s._checkExit(audio); assert.equal(went.length, 0);
  s.player.respawn(); assert.equal(s.grain, 12);
  s.draw(ctx);
  s.challengeDone = true;
  s.player.x = s.def.exit.x; s.player.y = s.def.exit.y;
  s.game.save.unlockLevel(4);
  s._checkExit(audio);
  assert.equal(went[0].name, 'summary');
  assert.ok(went[0].params.harvest.challenge);
  assert.equal(s.game.save.data.unlocked, 5, 'completing Gilgal unlocks the implemented Shiloh stage');
});
check('partial quiz can be retried, perfect score opens a once-only bonus', () => {
  const { s } = scene(4), st = s.stations[0];
  const finish = perfect => { s.mini = { result: { success: true, perfect } }; s.miniStation = st; s._finishMini(audio); };
  finish(false);
  assert.equal(st.done, false); assert.equal(s.stationsDone, 1);
  assert.equal(s.bonusRooms[0].open, false);
  const score = s.score;
  finish(false); assert.equal(s.score, score);
  finish(true); assert.ok(st.done); assert.ok(s.bonusRooms[0].open); assert.equal(s.stationsDone, 1);
  const b = s.bonusRooms[0];
  s.player.x = b.x; s.player.y = b.y;
  const lives = s.player.lives;
  s._updateHarvestFeatures(input([]), audio);
  assert.equal(s.player.lives, lives + 1);
  s._updateHarvestFeatures(input([]), audio);
  assert.equal(s.player.lives, lives + 1);
});
check('timing gets harder but never resets hits; three mistakes widen the window', () => {
  const g = new ShofarTimingGame({}, {});
  g.phase = 'play';
  const start = g.windowSeconds;
  g.clock = g.cycle / 4; g.strike(audio);
  assert.equal(g.hits, 1); assert.ok(g.windowSeconds < start);
  const normal = g.windowSeconds;
  for (let i = 0; i < 3; i++) { g.cooldown = 0; g.clock = 0; g.strike(audio); }
  assert.equal(g.hits, 1); assert.ok(g.windowSeconds > normal);
  g.draw(ctx);
  g.update(0.3, input(['build']), audio);
  assert.ok(g.assisted);
  g.update(0.3, input(['back']), audio);
  const resumed = new ShofarTimingGame({}, { progress: g.result.progress });
  assert.equal(resumed.hits, 1); assert.ok(resumed.assisted);
  resumed.phase = 'play';
  while (resumed.hits < resumed.rounds) {
    resumed.cooldown = 0; resumed.clock = resumed.cycle / 4; resumed.strike(audio);
  }
  resumed.update(0.3, input(['confirm']), audio);
  assert.ok(resumed.finished && resumed.result.success);
  assert.equal(resumed.result.perfect, false);
});
check('leaving and reopening end challenge preserves successful rounds', () => {
  const { s } = scene(4);
  s.relicTaken = true;
  s.player.x = s.def.challenge.x; s.player.y = s.def.challenge.y;
  s._updateHarvestFeatures(input(['confirm']), audio);
  assert.ok(s.mini instanceof ShofarTimingGame);
  s.mini.phase = 'play'; s.mini.clock = s.mini.cycle / 4; s.mini.strike(audio);
  s.mini.update(0.3, input(['back']), audio);
  s._finishMini(audio);
  s._updateHarvestFeatures(input(['confirm']), audio);
  assert.equal(s.mini.hits, 1);
});

// A fake HTMLAudioElement checks lifecycle deterministically without playing any sound.
const realAudio = globalThis.Audio;
globalThis.Audio = class {
  constructor(src) { this.src = src; this.paused = true; this.volume = 0; }
  play() { this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
};
const m = new Music({
  ctx: { currentTime: 0, createGain: () => ({ connect() {}, gain: { value: 1, setTargetAtTime(v) { this.value = v; } } }) },
  master: {}, tone() {}, noise() {},
});
try {
  check('workshop file loops quietly and mutes the procedural bus', () => {
    m.play('sanctuary'); assert.equal(m.media, null);
    m._ctxReady();
    assert.ok(m.media.loop && !m.media.paused);
    assert.equal(m.bus.gain.value, 0); assert.equal(m.timer, null);
    assert.ok(m.media.volume <= WORKSHOP_VOLUME);
    m._tick(); // No procedural scheduling for a file theme.
  });
  await new Promise(resolve => setTimeout(resolve, 1500));
  check('file fades in below 12%, honors mute and tab visibility, stops on scene exit', () => {
    assert.ok(m.media.volume > 0.10 && m.media.volume <= 0.12);
    m.toggle(); assert.ok(m.media.paused); assert.equal(m.media.volume, 0);
    m.toggle(); assert.ok(!m.media.paused);
    m.setHidden(true); assert.ok(m.media.paused);
    m.setHidden(false); assert.ok(!m.media.paused);
    m.play('desert'); assert.ok(m.media.paused); assert.ok(m.timer);
  });
} finally { m.stop(); globalThis.Audio = realAudio; }
assert.ok((await readFile(new URL('../assets/audio/The_Sanctuary_Rising.mp3', import.meta.url))).length > 0);
console.log('PASS workshop music asset is present.');
console.log(`\n${count} journey checks passed.`);
