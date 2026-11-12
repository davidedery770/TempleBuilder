import assert from 'node:assert/strict';
import { Player } from '../src/game/player.js';
import { Enemy, VANISH_TIME } from '../src/game/enemy.js';
import { TileMap } from '../src/game/tilemap.js';
import { PlayScene } from '../src/scenes/play.js';
import { SummaryScene, summaryTextPages } from '../src/scenes/summary.js';
import { Camera } from '../src/core/camera.js';
import { SaveData } from '../src/core/storage.js';
import { CODEX } from '../src/data/codex.js';
import { drawWorkshopVignette } from '../src/core/workshopArt.js';

globalThis.localStorage = { getItem: () => null, setItem() {} };
const audio = new Proxy({ music: { duck() {} } }, { get: (o, k) => o[k] || (() => {}) });
const input = (keys = []) => ({
  axisX: keys.includes('right') ? 1 : keys.includes('left') ? -1 : 0,
  pressed: key => keys.includes(key), down: key => keys.includes(key),
  over: () => false, clicked: false, pointer: {}, flush() {},
});
const ctx = new Proxy({ globalAlpha: 1 }, {
  get: (o, k) => k in o ? o[k] : k === 'measureText' ? s => ({ width: s.length * 8 })
    : k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} })
    : (...args) => args.forEach(a => { if (typeof a === 'number') assert.ok(Number.isFinite(a), String(k)); }),
});
function scene(level = 1) {
  const s = new PlayScene();
  s.game = { width: 960, height: 540, camera: new Camera(960, 540), audio,
    save: new SaveData(), input: input(), ctx };
  s.scenes = { transitioning: false, go() {} };
  s.enter({ levelId: level });
  return s;
}
let checks = 0;
function check(name, fn) { fn(); checks++; console.log('PASS ' + name); }

check('standing still stays grounded for 10 seconds in every platform stage', () => {
  for (const level of [1, 3, 4]) {
    const s = scene(level), p = s.player;
    for (let i = 0; i < 40; i++) p.update(1 / 60, input(), s.map, audio);
    const y = p.y;
    let landings = 0;
    const quiet = new Proxy({ land: () => landings++ }, { get: (o, k) => o[k] || (() => {}) });
    for (let i = 0; i < 600; i++) {
      p.update(1 / 60, input(), s.map, quiet);
      assert.equal(p.state, 'idle');
      assert.equal(p.y, y);
      assert.equal(p.vy, 0);
    }
    assert.equal(landings, 0, 'idle must not repeatedly play landing audio');
  }
});
check('fractional floor and wall contact use half-open bounds without a full pixel gap', () => {
  const map = new TileMap([], ['....', '..#.', '####'], [], {});
  assert.equal(map.rectHitsSolid(0, 22, 22, 42), false, 'exact bottom at 64 is touching, not overlapping');
  assert.equal(map.rectHitsSolid(0, 22.1, 22, 42), true, 'subpixel floor overlap detected');
  assert.equal(map.rectHitsSolid(42, 32, 22, 20), false, 'exact right edge at 64');
  assert.equal(map.rectHitsSolid(42.1, 32, 22, 20), true, 'subpixel wall overlap detected');
});
check('jumping shadow stays at ground, shrinks with height, and is absent above void or below a platform', () => {
  const rows = Array.from({ length: 20 }, (_, r) => r >= 15 ? '####....' : '........');
  const map = new TileMap([], rows, [], {});
  const p = new Player(32, 480 - 42 - 0.01);
  const standing = p.getShadow(map);
  p.y -= 100;
  const jumping = p.getShadow(map);
  assert.equal(jumping.y, standing.y);
  assert.ok(jumping.rx < standing.rx && jumping.alpha < standing.alpha);
  p.x = 160; assert.equal(p.getShadow(map), null);
  map.setChar('action', 5, 10, '=');
  p.y = 200; assert.equal(p.getShadow(map).y, 319);
  p.y = 330; assert.equal(p.getShadow(map), null, 'a platform above the feet cannot catch the shadow');
  p.drawShadow(ctx, map, 0, 0);
});
check('full jump takes off and lands stably; walking off a ledge still falls', () => {
  const s = scene(), p = s.player;
  for (let i = 0; i < 40; i++) p.update(1 / 60, input(), s.map, audio);
  const y = p.y;
  p.update(1 / 60, input(['jump']), s.map, audio);
  assert.ok(p.vy < 0 && !p.onGround);
  let top = p.y;
  const held = input(); held.down = key => key === 'jump';
  for (let i = 0; i < 80; i++) { p.update(1 / 60, held, s.map, audio); top = Math.min(top, p.y); }
  assert.ok(y - top > 100 && y - top < 125);
  assert.equal(p.y, y); assert.ok(p.onGround);
  p.x = 26 * 32; p.y = y; p.vy = 0;
  p.update(1 / 60, input(), s.map, audio);
  assert.equal(p.onGround, false); assert.ok(p.vy > 0);
});
check('all enemy types vanish harmlessly, never revive, and stop drawing', () => {
  for (const type of ['scorpion', 'amalekite', 'riverFish', 'silverFish', 'fieldGuard']) {
    const e = new Enemy(type, 0, 0);
    assert.ok(e.disperse()); assert.equal(e.dangerous, false);
    assert.equal(e.disperse(), false);
    const original = { x: e.x, y: e.y };
    for (let i = 0; i < 360; i++) e.update(1 / 60, null, null);
    assert.ok(e.gone && !e.dangerous);
    assert.deepEqual({ x: e.x, y: e.y }, original);
    assert.equal(e.repel(0), false);
    assert.ok(!('health' in e) && !('alive' in e));
    let drawn = false; e.draw({ save() { drawn = true; } }, 0, 0); assert.equal(drawn, false);
  }
});
check('staff contact disappears once, preserves player health, and stays gone across checkpoint respawn', () => {
  const s = scene(), p = s.player, e = new Enemy('amalekite', 120, 480 - 44 - 0.01);
  s.enemies = [e]; p.x = 100; p.y = 480 - p.h - 0.01;
  p.facing = 1; p._attackTimer = 0.2; p._invuln = 0;
  s._updateEnemies(1 / 60, audio);
  assert.ok(e.vanishing); assert.equal(p.health, 5);
  const particles = s.particles.items.length;
  s._updateEnemies(1 / 60, audio); assert.equal(s.particles.items.length, particles);
  p.x = 3000;
  for (let i = 0; i < 60; i++) s._updateEnemies(1 / 60, audio);
  assert.ok(e.gone, 'fade finishes even after moving out of range');
  p.respawn(); s._calmEnemiesNear(e.x); assert.ok(e.gone && !e.dangerous);
  assert.equal(scene().enemies[0].gone, false, 'starting a new run recreates obstacles');
});
check('temporary respawn protection remains temporary rather than removing untouched enemies', () => {
  const s = scene(), e = s.enemies[0];
  s._calmEnemiesNear(e.centerX);
  assert.ok(e.dazed && !e.gone && !e.vanishing);
  for (let i = 0; i < 220; i++) e.update(1 / 60, s.map, null);
  assert.ok(e.dangerous && !e.gone);
});
check('stations never interrupt play automatically and require an explicit invitation choice', () => {
  for (const level of [1, 3, 4, 5]) {
    const s = scene(level), st = s.stations[0], p = s.player;
    p.x = st.x; p.y = st.y; p.onGround = false;
    for (let i = 0; i < 30; i++) s._updateStations(input(), audio, 1 / 60);
    assert.equal(s.mini, null);
    p.onGround = true; s.hud.showDialog('משה', ['בדיקה']);
    for (let i = 0; i < 30; i++) s._updateStations(input(), audio, 1 / 60);
    assert.equal(s.mini, null);
    s.hud.dialog = null;
    for (let i = 0; i < 20; i++) s._updateStations(input(), audio, 1 / 60);
    assert.equal(s.mini,null,'proximity never starts a game');
    s._updateStations(input(['confirm']),audio);
    assert.ok(s.mini); assert.equal(s.miniStation.id, st.id);
  }
});
check('ESC never traps the player; retry is voluntary even after leaving and returning', () => {
  const s = scene(), st = s.stations[0], p = s.player;
  p.x = st.x; p.y = st.y; p.onGround = true;
  s._updateStations(input(['confirm']), audio, 0.3);
  s.mini.result = { cancelled: true }; s._finishMini(audio);
  for (let i = 0; i < 120; i++) s._updateStations(input(), audio, 1 / 60);
  assert.equal(s.mini, null);
  s._updateStations(input(['confirm']), audio);
  assert.ok(s.mini);
  s.mini.result = { cancelled: true }; s._finishMini(audio);
  p.x = st.x - 160; s._updateStations(input(), audio, 0.3);
  p.x = st.x; s._updateStations(input(), audio, 0.3);
  assert.equal(s.mini,null);
  s._updateStations(input(['confirm']),audio);
  assert.ok(s.mini);
});
check('summary pages preserve all content, stay three lines tall, and switch without leaving the summary', () => {
  for (const card of CODEX) {
    const pages = summaryTextPages(ctx, card.body, 816);
    assert.ok(pages.every(page => page.length <= 3));
    assert.equal(pages.flat().join(' '), card.body.trim().replace(/\s+/g, ' '));
  }
  const s = new SummaryScene();
  s.game = { width: 960, height: 540, ctx, input: input(), audio, save: new SaveData() };
  let exits = 0; s.scenes = { transitioning: false, go() { exits++; } };
  const long = [...CODEX].sort((a, b) => b.body.length - a.body.length)[0];
  s.enter({ levelId: long.level, cards: [long.id, 'moshe'] });
  assert.equal(s.showKnowledge,false);
  s.showKnowledge=true;
  // Current cards fit at the wider layout. Explicitly test future long content.
  s.cards[0] = { ...s.cards[0], body: [long.body, long.body, long.body].join(' ') };
  assert.ok(s._textPages(ctx).length > 1);
  s.game.input = input(['down']); s.update(1 / 60); assert.equal(s.cardPage, 1);
  s.game.input = input(['up']); s.update(1 / 60); assert.equal(s.cardPage, 0);
  s.game.input = input(['left']); s.update(1 / 60); assert.equal(s.cardIndex, 1); assert.equal(s.cardPage, 0);
  s.draw(ctx); assert.equal(exits, 0);
});
check('both 2D menu workshops draw with finite coordinates', () => {
  for (const weaving of [false, true]) drawWorkshopVignette(ctx, 30, 257, 248, 197, 1.25, weaving);
});
console.log(`\n${checks} Dima feedback checks passed; vanish fade ${VANISH_TIME}s.`);
