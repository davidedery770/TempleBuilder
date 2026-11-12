import assert from 'node:assert/strict';
import { BUILD_PARTS, PLAN, targetPoint } from '../src/data/level02.js';
import { buildMishkanModel, MODEL_DIMENSIONS, planToWorld, worldToPlan } from '../src/data/mishkan3d.js';
import { ConstructionScene, VIEW_3D } from '../src/scenes/construction.js';
import { SaveData } from '../src/core/storage.js';
import * as THREE from '../src/vendor/three/three.module.min.js';
import { Construction3D } from '../src/core/construction3d.js';

globalThis.localStorage = { getItem: () => null, setItem() {} };
let count = 0;
const check = async (name, fn) => { await fn(); count++; console.log('PASS ' + name); };
const model = buildMishkanModel();
const role = (id, name) => model[id].filter(n => n.role === name);
await check('19 model groups match the construction data with finite positive geometry', () => {
  assert.deepEqual(Object.keys(model), BUILD_PARTS.map(p => p.id));
  for (const nodes of Object.values(model)) {
    assert.ok(nodes.length);
    for (const n of nodes) {
      assert.ok(n.position.every(Number.isFinite));
      if (n.size) assert.ok(n.size.every(x => Number.isFinite(x) && x > 0));
      if (n.points) assert.ok(n.points.flat().every(Number.isFinite));
    }
  }
});
await check('48 boards, 96+4 silver sockets, five bronze entrance sockets, seven lamps', () => {
  assert.equal(role('north', 'board').length, 20);
  assert.equal(role('south', 'board').length, 20);
  assert.equal(role('west', 'board').length, 8);
  assert.ok([...role('north', 'board'), ...role('south', 'board'), ...role('west', 'board')].every(n => n.size[1] === 10));
  assert.equal(role('bases', 'socket').length, 96);
  assert.ok(role('bases', 'socket').every(n => n.material === 'silver'));
  assert.equal(role('veil', 'socket').length, 4);
  assert.ok(role('veil', 'socket').every(n => n.material === 'silver'));
  assert.equal(role('entrance', 'socket').length, 5);
  assert.ok(role('entrance', 'socket').every(n => n.material === 'bronze'));
  assert.equal(role('menorah', 'lamp').length, 7);
  assert.equal(role('table', 'loaf').length, 12);
  assert.equal(role('court', 'court-pole').length + role('gate', 'court-pole').length, 60);
});
await check('vessel dimensions, north/south positions, and east court gate match the plan', () => {
  for (const id of ['ark', 'incense', 'altar']) {
    assert.deepEqual(role(id, 'vessel')[0].size, MODEL_DIMENSIONS[id]);
  }
  assert.deepEqual(MODEL_DIMENSIONS.table, [2, 1.5, 1]);
  assert.equal(role('gate', 'gate')[0].size[2], 20);
  assert.equal(role('gate', 'gate')[0].position[0], 50);
  assert.ok(role('table', 'tabletop')[0].position[2] < 0);
  assert.ok(role('menorah', 'foot')[0].position[2] > 0);
  assert.ok(role('laver', 'bowl')[0].position[0] < role('altar', 'vessel')[0].position[0]);
  assert.ok(role('laver', 'bowl')[0].position[0] > 0);
});
await check('3D coordinates round-trip to the original 2D snapping coordinates', () => {
  for (const p of BUILD_PARTS) {
    const world = planToWorld(...p.target);
    assert.deepEqual(worldToPlan(world.x, world.z), targetPoint(p));
  }
});
await check('actual perspective camera projects targets and raycasts them back to the plan', () => {
  const view = Object.create(Construction3D.prototype);
  view.width = VIEW_3D.w; view.height = VIEW_3D.h;
  view.camera = new THREE.PerspectiveCamera(36, view.width / view.height, 0.1, 500);
  view.target = new THREE.Vector3();
  view.raycaster = new THREE.Raycaster();
  view.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  view.focus('court');
  for (const p of BUILD_PARTS) {
    const screen = view.projectPart(p.id);
    const plan = view.pickPlan(screen.x, screen.y);
    assert.ok(plan, `${p.id} must be visible at court view`);
    const expected = targetPoint(p);
    assert.ok(Math.hypot(plan.x - expected.x, plan.y - expected.y) < 0.001);
  }
  view.focus('tent');
  view.orbit(100, -2000);
  assert.ok(view.elevation >= 0.25);
  for (let i = 0; i < 100; i++) view.zoom(-1);
  assert.equal(view.distance, 22);
  for (let i = 0; i < 100; i++) view.zoom(1);
  assert.equal(view.distance, 190);
});
const audio = new Proxy({}, { get: () => () => {} });
function setup() {
  const s = new ConstructionScene();
  s.game = { width: 960, height: 540, save: new SaveData(), audio };
  s.scenes = { transitioning: false, go() {} };
  s.enter();
  return s;
}
const makeInput = (x, y, clicked, down) => ({
  pointer: { x, y, down, inside: true }, clicked, wheel: 0,
  over: (a, b, w, h) => x >= a && x < a + w && y >= b && y < b + h,
  pressed: () => false,
});
await check('3D stays lazy, synchronizes existing progress, and camera drag does not place parts', async () => {
  const s = setup();
  assert.equal(s.viewer3d, null); assert.equal(s.viewMode, 'plan');
  let disposed = false, turns = 0;
  const view = { cutaway: true, dispose() { disposed = true; }, orbit() { turns++; }, zoom() {}, draw() {} };
  s._create3DView = async () => view;
  const p = targetPoint(BUILD_PARTS[0]);
  assert.ok(s.tryPlace(BUILD_PARTS[0], p.x, p.y));
  await s.show3D();
  assert.equal(s.viewMode, '3d'); assert.ok(s.placed.has('bases'));
  s._cameraInput(makeInput(200, 250, true, true));
  s._cameraInput(makeInput(270, 260, false, false));
  assert.ok(turns > 0); assert.equal(s.placed.size, 1); assert.equal(s.failedPlacements.size, 0);
  s.exit(); assert.ok(disposed);
});
await check('failed WebGL or module loading preserves plan mode and progress', async () => {
  const s = setup();
  const first = targetPoint(BUILD_PARTS[0]);
  assert.ok(s.tryPlace(BUILD_PARTS[0], first.x, first.y));
  s._create3DView = async () => { throw new Error('WebGL unavailable'); };
  await s.show3D();
  assert.equal(s.viewMode, 'plan'); assert.equal(s.viewer3d, null);
  assert.match(s.feedback, /אפשר להמשיך/);
  assert.ok(s.placed.has('bases'));
  const p = targetPoint(BUILD_PARTS[1]);
  assert.ok(s.tryPlace(BUILD_PARTS[1], p.x, p.y));
});
await check('a load completing after exit is disposed and never attached to a new scene', async () => {
  const s = setup();
  let resolve, disposed = false;
  s._create3DView = () => new Promise(done => { resolve = done; });
  const loading = s.show3D();
  s.exit(); s.enter();
  resolve({ dispose() { disposed = true; } });
  await loading;
  assert.ok(disposed); assert.equal(s.viewer3d, null); assert.equal(s.viewMode, 'plan');
});
await check('rebuild clears 3D assembly immediately while preserving the current view', async () => {
  const s = setup();
  const point = targetPoint(BUILD_PARTS[0]);
  s.tryPlace(BUILD_PARTS[0], point.x, point.y);
  let synced = null;
  const view = { animations: new Map([['bases', 1]]), sync(placed) { synced = [...placed]; }, dispose() {} };
  s._create3DView = async () => view;
  await s.show3D();
  s.restartConstruction();
  assert.equal(s.viewMode, '3d'); assert.equal(s.viewer3d, view);
  assert.deepEqual(synced, []); assert.equal(view.animations.size, 0);
  assert.equal(s.selected.id, 'bases'); assert.equal(s.complete, false);
  assert.deepEqual(s.game.save.data.construction, { placed: [], completed: false });
});
console.log(`\n${count} construction 3D checks passed.`);
