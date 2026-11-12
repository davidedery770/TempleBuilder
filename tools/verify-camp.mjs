import assert from 'node:assert/strict';
import { CAMP, CAMP_STATIONS, CAMP_SPECIAL, CAMP_OBSTACLES, ALL_CAMP_STATIONS, getCampStation } from '../src/data/camp01.js';
import { MATERIALS } from '../src/data/materials.js';
import { CampWorld, campBlocked, findCampPath } from '../src/game/campWorld.js';
import { CampScene } from '../src/scenes/camp.js';
import { SaveData } from '../src/core/storage.js';
import { CraftGame } from '../src/minigames/craft.js';
import { WeavingGame } from '../src/minigames/weaving.js';
import { ConstructionScene } from '../src/scenes/construction.js';
import { sceneForLevel } from '../src/data/levels.js';
import { themeForScene } from '../src/data/musicThemes.js';

let raw = null, count = 0;
globalThis.localStorage = { getItem: () => raw, setItem: (_, v) => { raw = v; } };
const check = async (name, fn) => { await fn(); count++; console.log('PASS ' + name); };
const audio = new Proxy({ music: { duck() {} } }, { get: (o, k) => o[k] || (() => {}) });
const input = (keys = []) => ({
  pressed: k => keys.includes(k), down: k => keys.includes(k),
  axisX: keys.includes('right') ? 1 : keys.includes('left') ? -1 : 0,
  over: () => false, pointer: { x: -1, y: -1 }, clicked: false, flush() {},
});
function setup(save = new SaveData()) {
  const s = new CampScene(), went = [];
  s.game = { width: 960, height: 540, save, audio, input: input([]), debug: { map: true } };
  s.scenes = { transitioning: false, go: (name, params) => went.push({ name, params }) };
  s.enter(); s.dialog = null;
  return { s, went };
}
await check('all 15 material types have exactly one source-backed donation destination', () => {
  assert.equal(CAMP_STATIONS.length, 8);
  const ids = CAMP_STATIONS.flatMap(s => s.materials);
  assert.equal(new Set(ids).size, 15); assert.equal(ids.length, 15);
  assert.deepEqual([...ids].sort(), MATERIALS.map(m => m.id).sort());
  assert.ok(CAMP_STATIONS.every(s => s.source.startsWith('שמות ל״ה') && s.text));
  assert.ok(CAMP_STATIONS.find(s => s.id === 'wood').text.includes('המחשה'));
  assert.equal(sceneForLevel(1), 'play'); // Experimental camp is deliberately not the default.
  assert.equal(themeForScene('camp'), 'desert');
});
await check('all stations are reachable without jumping; A* avoids every obstacle', () => {
  for (const s of ALL_CAMP_STATIONS) {
    const route = findCampPath({ x: CAMP.spawn[0], z: CAMP.spawn[1] }, { x: s.at[0], z: s.at[1] + 1 });
    assert.ok(route.length, s.id);
    assert.ok(route.every(p => !campBlocked(p.x, p.z)), s.id);
  }
  for (const o of CAMP_OBSTACLES) assert.ok(campBlocked(o.x, o.z), o.id);
});
await check('actual movement follows routes and carrying reduces walking speed', () => {
  for (const station of ALL_CAMP_STATIONS) {
    const w = new CampWorld();
    w.moveTo(station.at[0], station.at[1] + 1);
    for (let i = 0; i < 2400 && !w.near(station); i++) w.update(1 / 60, input());
    assert.ok(w.near(station), `${station.id} stuck at ${w.player.x},${w.player.z}`);
  }
  const a = new CampWorld(), b = new CampWorld(); b.carrying = true;
  for (let i = 0; i < 30; i++) { a.update(1 / 60, input(['right'])); b.update(1 / 60, input(['right'])); }
  assert.ok(a.player.x > b.player.x);
  a.update(1 / 60, input(['jump'])); assert.ok(a.player.y > 0);
});
await check('collisions, map boundaries, and invalid saved positions remain safe', () => {
  const w = new CampWorld({ position: { x: 0, z: 8.5 } });
  assert.deepEqual([w.player.x, w.player.z], CAMP.spawn);
  for (let i = 0; i < 900; i++) w.update(1 / 60, input(['right']));
  assert.ok(w.player.x <= CAMP.maxX && w.player.z >= CAMP.minZ);
  assert.ok(!campBlocked(w.player.x, w.player.z, w.player.y));
});
await check('a beam must be physically picked up and delivered before the timber reward', () => {
  const w = new CampWorld();
  assert.equal(w.takeWood(), false); assert.deepEqual(w.award('wood'), []);
  const wood = getCampStation('wood'); [w.player.x, w.player.z] = wood.at;
  assert.ok(w.takeWood()); assert.equal(w.takeWood(), false);
  assert.equal(w.deliverWood(), false);
  const restored = new CampWorld(w.snapshot()); assert.ok(restored.carrying);
  [restored.player.x, restored.player.z] = getCampStation('carpenter').at;
  assert.ok(restored.deliverWood()); assert.ok(restored.delivered); assert.equal(restored.carrying, false);
  assert.deepEqual(restored.award('wood'), ['shittim']); assert.deepEqual(restored.award('wood'), []);
});
await check('guided weaving and craft errors never make completion impossible', () => {
  const weave = new WeavingGame({}, { guided: true });
  weave.round = 2;
  const wrong = weave.order.find(k => k !== weave.expected);
  for (let i = 0; i < 8; i++) weave._click(wrong, audio);
  assert.equal(weave.phase, 'play');
  for (let i = 0; i < 4; i++) weave._click(weave.expected, audio);
  assert.equal(weave.phase, 'done');
  const craft = new CraftGame({}, { mode: 'saw' });
  for (let i = 0; i < 3; i++) { craft.cooldown = 0; craft.clock = 0; craft.attempt(0, audio); }
  assert.ok(craft.window > 0.5); assert.equal(craft.step, 0);
  for (let i = 0; i < 3; i++) { craft.cooldown = 0; craft.clock = Math.PI / 3.6; craft.attempt(0, audio); }
  assert.equal(craft.phase, 'done'); craft._finish(); assert.ok(craft.result.success);
  const packing = new CraftGame({}, { items: getCampStation('skins').items });
  packing.attempt(2, audio); assert.equal(packing.step, 0);
  for (const item of packing.items) { packing.cooldown = 0; packing.attempt(item.answer, audio); }
  assert.equal(packing.phase, 'done');
});
const { s, went } = setup();
await check('all camp activities award inventory once and persist across reload', () => {
  s._award('gold_family');
  const amount = s.game.save.data.totalDonations;
  s._award('gold_family'); assert.equal(s.game.save.data.totalDonations, amount);
  const reloaded = setup(new SaveData()).s;
  assert.ok(reloaded.world.done.has('gold_family'));
  assert.ok(reloaded.world.materials.has('gold'));
  for (const station of CAMP_STATIONS.filter(s => s.id !== 'wood')) s._award(station.id);
  [s.world.player.x, s.world.player.z] = getCampStation('wood').at; s.world.takeWood();
  [s.world.player.x, s.world.player.z] = getCampStation('carpenter').at; s.world.deliverWood();
  s._save(); s.mini = { result: { success: false, cancelled: true } }; s.miniStation = 'wood'; s._finishMini();
  assert.ok(s.world.delivered && !s.world.done.has('wood'));
  s._award('wood'); assert.equal(s.world.materials.size, 15);
  assert.equal(s.game.save.data.materials.length, 15); assert.equal(s.game.save.data.totalDonations, 15);
});
await check('finishing requires 15 types, gives the scroll, and opens construction with those materials', () => {
  const blank = new SaveData(); blank.data.camp = {};
  const empty = setup(blank); empty.s._finish(); assert.equal(empty.went.length, 0);
  s._finish(); assert.equal(went[0].name, 'summary'); assert.ok(went[0].params.camp);
  assert.equal(s.game.save.data.unlocked, 2); assert.ok(s.game.save.hasRelic('tavnit'));
  const construction = new ConstructionScene(); construction.game = { save: s.game.save };
  construction.enter(); assert.equal(construction.personal.size, 15);
});
await check('camp saves do not reset existing construction, relics, or later unlocked stages', () => {
  const save = new SaveData(); save.data.unlocked = 4;
  save.data.construction = { placed: ['bases'], completed: false };
  save.data.relics.push('adanim'); save.save();
  const old = setup(new SaveData()).s; old._save();
  assert.equal(old.game.save.data.unlocked, 4);
  assert.deepEqual(old.game.save.data.construction.placed, ['bases']);
  assert.ok(old.game.save.hasRelic('adanim'));
});
await check('the fallback draws the same camp and preserves click coordinates', () => {
  const ctx = new Proxy({ globalAlpha: 1 }, {
    get: (o, k) => k in o ? o[k] : k === 'measureText' ? str => ({ width: str.length * 7 })
      : k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} })
      : (...args) => args.forEach(a => { if (typeof a === 'number') assert.ok(Number.isFinite(a), k); }),
  });
  const camp = setup().s; camp.update(1 / 60); camp.draw(ctx);
  for (const station of ALL_CAMP_STATIONS) {
    const p = camp.map.project(station.at[0], 0, station.at[1]);
    const q = camp.map.pickWorld(p.x, p.y);
    assert.ok(Math.hypot(q.x - station.at[0], q.z - station.at[1]) < 0.001);
  }
});
console.log(`\n${count} living camp checks passed.`);
