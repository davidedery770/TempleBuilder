/**
 * verify-nob.mjs — שלב 7 (נוב) בלי דפדפן.
 *
 * הרחוב עביר בפיזיקה אמיתית; צופה שרואה מחזיר לנקודת ההצלה בלי לאבד לב;
 * כפיפה בשיח מסתירה; לחם הפנים מסודר 6+6 עם לבונה; דוד מקבל לחם רק אחרי
 * הסדנה; אביתר מגלה את האפוד רק אחרי שדוד קיבל; והשער נפתח עם האפוד.
 */
import assert from 'node:assert/strict';
import { PlayScene } from '../src/scenes/play.js';
import { Camera } from '../src/core/camera.js';
import { SaveData } from '../src/core/storage.js';
import { TILE } from '../src/game/tilemap.js';
import { ShowbreadGame } from '../src/minigames/showbread.js';
import { TRIVIA } from '../src/data/trivia.js';
import { CODEX } from '../src/data/codex.js';
import { getLevel } from '../src/data/levels.js';
import { themeForScene, MUSIC_THEMES } from '../src/data/musicThemes.js';

let stored = null;
globalThis.localStorage = { getItem: () => stored, setItem: (_, v) => { stored = v; } };
globalThis.window = new EventTarget();
const audio = new Proxy({ music: { duck() {} } }, { get: (o, k) => o[k] || (() => {}) });
const input = (keys = []) => ({ pressed: a => keys.includes(a), down: a => keys.includes(a),
  axisX: keys.includes('right') ? 1 : 0, pointer: { inside: false }, clicked: false, over: () => false, flush() {} });
const ctx = new Proxy({ globalAlpha: 1 }, { get: (o, k) => k in o ? o[k] : k === 'measureText' ? s => ({ width: s.length * 7 })
  : ['createLinearGradient', 'createRadialGradient'].includes(k) ? () => ({ addColorStop() {} })
  : (...args) => args.forEach(a => { if (typeof a === 'number') assert.ok(Number.isFinite(a), String(k)); }) });
let checks = 0;
const check = (name, fn) => { stored = null; fn(); checks++; console.log('PASS ' + name); };

function scene() {
  const s = new PlayScene(), went = [];
  s.game = { width: 960, height: 540, camera: new Camera(960, 540), audio, save: new SaveData(), input: input() };
  s.scenes = { transitioning: false, go: (name, params) => went.push({ name, params }) };
  s.enter({ levelId: 7 });
  return { s, went };
}
const talkAll = s => { while (s.hud.dialogOpen) s.hud.advanceDialog(); };

check('Nob is ready, with its own music, trivia and four museum cards', () => {
  assert.ok(getLevel(7).ready);
  assert.equal(themeForScene('play', 7), 'nob'); assert.ok(MUSIC_THEMES.nob);
  assert.ok(TRIVIA[7].length >= 3);
  assert.equal(CODEX.filter(c => c.level === 7).length, 4);
});

check('the street and rooftops are traversable with real physics', () => {
  const { s } = scene();
  s.watchers.length = 0;   // physics only: no one is looking
  const p = s.player, map = s.map;
  let hold = 0;
  for (let f = 0; f < 6000 && p.x < s.def.exit.x; f++) {
    talkAll(s);
    const col = Math.floor((p.x + p.w) / TILE), row = Math.floor((p.y + p.h - 2) / TILE);
    let wall = false;
    for (let dc = 1; dc <= 2; dc++) for (let r = row - 3; r <= row; r++) if (map.isSolid(col + dc, r)) wall = true;
    const jump = p.onGround && hold <= 0 && wall;
    if (jump) hold = 24;
    const control = input(['right', ...(hold-- > 0 ? ['jump'] : [])]); control.pressed = a => a === 'jump' && jump;
    p.update(1 / 60, control, map, audio);
  }
  assert.ok(p.x >= s.def.exit.x, `stopped at column ${(p.x / TILE).toFixed(1)}`);
  for (const h of s.def.houses) assert.ok(map.isPlatform(h.col, h.roof), `roof ${h.col}`);
});

check('a watcher who sees you sends you back to the last altar without hurting you', () => {
  const { s } = scene();
  const w = s.watchers[1], p = s.player;
  w.facing = -1; w.x = 96 * TILE; w.pause = 0;
  p.setSpawn(52 * TILE, 13 * TILE - p.h - 4);
  p.x = w.x - 120; p.y = w.y + w.h - p.h;
  const hp = p.health, lives = p.lives;
  const look = frames => { for (let i = 0; i < frames; i++) s._updateStealth(audio, 1 / 60); };
  look(15);
  assert.equal(s.caught, 0, 'a quarter second in the beam is only suspicion');
  look(25);
  assert.equal(s.caught, 1);
  assert.equal(p.x, p.spawnX); assert.equal(p.health, hp); assert.equal(p.lives, lives);
  // right behind his back is safe
  s._grace = 0; w.suspicion = 0; p.x = w.x + w.w + 40; p.y = w.y + w.h - p.h;
  look(60);
  assert.equal(s.caught, 1);
  // from a rooftop he cannot see you
  p.x = w.x - 120; p.y = w.y + w.h - 96 - p.h;
  look(60);
  assert.equal(s.caught, 1);
});

check('crouching inside a bush hides you even in the beam', () => {
  const { s } = scene();
  const b = s.def.bushes[1], p = s.player, w = s.watchers[1];
  p.x = b.x + b.w / 2 - p.w / 2; p.y = b.y - p.h; p.crouching = true;
  w.facing = -1; w.x = p.x + 100; w.pause = 0;
  for (let i = 0; i < 60; i++) s._updateStealth(audio, 1 / 60);
  assert.ok(s.hiddenNow); assert.equal(s.caught, 0);
  p.crouching = false;
  for (let i = 0; i < 40; i++) s._updateStealth(audio, 1 / 60);
  assert.equal(s.caught, 1);
});

check('showbread: six per row, a seventh is refused, and frankincense on both rows finishes', () => {
  const m = new ShowbreadGame({}, {});
  m.phase = 'play';
  for (let i = 0; i < 6; i++) m.place('right', audio);
  m.place('right', audio);
  assert.equal(m.rows.right, 6); assert.equal(m.misses, 1);
  for (let i = 0; i < 6; i++) m.place('left', audio);
  assert.equal(m.stage, 'levonah');
  m.place('right', audio); m.place('right', audio); m.place('left', audio);
  assert.equal(m.phase, 'done'); assert.equal(m.misses, 2);
  m.t = 1; m.update(0.1, input(['confirm']), audio);
  assert.ok(m.result.success && !m.result.perfect);
  m.draw(ctx);
});

check('David waits for bread, Evyatar waits for David, and the ephod opens the gate', () => {
  const { s, went } = scene();
  const p = s.player, near = n => { p.x = n.x; p.y = n.y + n.h - p.h; s._updateNPCs(audio); talkAll(s); s._updateNPCs(audio); };
  const david = s.npcs.find(n => n.id === 'david'), evyatar = s.npcs.find(n => n.id === 'evyatar_end');
  const relic = s.pickups.find(x => x.type === 'relic');
  near(david); assert.equal(s.delivered, false); assert.equal(david.talked, false);
  near(evyatar); assert.ok(relic.dormant, 'no ephod before David has bread');
  const station = s.stations.find(x => x.id === 'showbread');
  s._openStation(station, audio);
  s.mini.finished = true; s.mini.result = { success: true, perfect: true };
  s._finishMini(audio);
  assert.ok(s.hasBread && station.done);
  p.x = 0; s._updateNPCs(audio);   // step away so David can be approached again
  near(david); assert.ok(s.delivered && !s.hasBread && david.talked);
  p.x = 0; s._updateNPCs(audio);
  near(evyatar); assert.equal(relic.dormant, false);
  p.x = relic.x; p.y = relic.y; s._updatePickups(1 / 60, audio);
  assert.ok(s.relicTaken);
  s.draw(ctx);
  p.x = s.def.exit.x; p.y = s.def.exit.y; s._checkExit(audio);
  assert.equal(went.at(-1).name, 'summary');
  assert.equal(went.at(-1).params.stealth.delivered, true);
  assert.ok(s.game.save.hasRelic('vestments'));
});

console.log(`\n${checks} Nob checks passed`);
