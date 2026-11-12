/**
 * verify-givon.mjs — שלב 8 (הבמה בגבעון) בלי דפדפן.
 *
 * פיזיקה אמיתית: קירות הענן בחלום נחצים רק בזינוק מענן קפיצי; במה נעה נושאת
 * את השחקן; "לב שומע" פותח את שער הענן; המעליות מעלות אל מזבח הנחושת;
 * שועלים נתפסים בנגיעה; והשער נפתח רק עם המזבח וכל חמשת השועלים.
 */
import assert from 'node:assert/strict';
import { PlayScene } from '../src/scenes/play.js';
import { Camera } from '../src/core/camera.js';
import { SaveData } from '../src/core/storage.js';
import { TILE } from '../src/game/tilemap.js';
import { DreamChoiceGame } from '../src/minigames/dreamChoice.js';
import { TRIVIA } from '../src/data/trivia.js';
import { CODEX } from '../src/data/codex.js';
import { getLevel } from '../src/data/levels.js';
import { themeForScene } from '../src/data/musicThemes.js';

let stored = null;
globalThis.localStorage = { getItem: () => stored, setItem: (_, v) => { stored = v; } };
globalThis.window = new EventTarget();
const audio = new Proxy({ music: { duck() {} } }, { get: (o, k) => o[k] || (() => {}) });
const input = (keys = []) => ({ pressed: a => keys.includes(a), down: a => keys.includes(a),
  axisX: keys.includes('right') ? 1 : keys.includes('left') ? -1 : 0,
  pointer: { inside: false }, clicked: false, over: () => false, flush() {} });
const ctx = new Proxy({ globalAlpha: 1 }, { get: (o, k) => k in o ? o[k] : k === 'measureText' ? s => ({ width: s.length * 7 })
  : ['createLinearGradient', 'createRadialGradient'].includes(k) ? () => ({ addColorStop() {} })
  : (...args) => args.forEach(a => { if (typeof a === 'number') assert.ok(Number.isFinite(a), String(k)); }) });
let checks = 0;
const check = (name, fn) => { stored = null; fn(); checks++; console.log('PASS ' + name); };

function scene() {
  const s = new PlayScene(), went = [];
  s.game = { width: 960, height: 540, camera: new Camera(960, 540), audio, save: new SaveData(), input: input() };
  s.scenes = { transitioning: false, go: (name, params) => went.push({ name, params }) };
  s.enter({ levelId: 8 });
  return { s, went };
}

/** One frame the way PlayScene.update orders it: movers, player, then the level's systems. */
function frame(s, keys, pressedJump) {
  s._updateMovers(1 / 60);
  const control = input(keys); control.pressed = a => a === 'jump' && pressedJump;
  s.player.update(1 / 60, control, s.map, audio);
  s._updatePickups(1 / 60, audio); s._updateNPCs(audio); s._updateGivon(audio, 1 / 60);
  while (s.hud.dialogOpen) s.hud.advanceDialog();
}

/** Runs right; jumps at walls, onto clouds/platforms just ahead, and waits on lifts. */
function run(s, untilCol, frames = 9000) {
  const p = s.player, map = s.map;
  let hold = 0;
  for (let f = 0; f < frames && p.x / TILE < untilCol; f++) {
    const col = Math.floor((p.x + p.w) / TILE), row = Math.floor((p.y + p.h - 2) / TILE);
    let wall = false;
    for (let dc = 1; dc <= 2; dc++) for (let r = row - 3; r <= row; r++) if (map.isSolid(col + dc, r)) wall = true;
    const moverAhead = s.movers.some(m => m.x > p.x - 8 && m.x < p.x + 3 * TILE && m.y >= p.y && m.y < p.y + p.h + 40);
    const lift = p.riding && p.riding.path?.dy;
    // on a lift: stay put until it is near the top, then hop off to the right
    const liftWait = lift && p.riding.y > p.riding.y0 + p.riding.path.dy + 10;
    const jump = !liftWait && p.onGround && hold <= 0 && (wall || moverAhead || (lift && !liftWait));
    if (jump) hold = 26;
    frame(s, liftWait ? [] : ['right', ...(hold-- > 0 ? ['jump'] : [])], jump);
  }
  return p.x / TILE;
}

check('Gibeon is ready, bright, with music, riddles and four museum cards', () => {
  const meta = getLevel(8);
  assert.ok(meta.ready && meta.isBossLevel);
  assert.ok(parseInt(meta.palette.skyTop.slice(1, 3), 16) > 0x50, 'a bright sky');
  assert.equal(themeForScene('play', 8), 'givon');
  assert.ok(TRIVIA[8].length >= 6);
  assert.equal(CODEX.filter(c => c.level === 8).length, 4);
});

check('a seven-tile cloud wall cannot be jumped, but a bouncy cloud clears it', () => {
  const { s } = scene();
  const p = s.player;
  p.x = 56 * TILE; p.y = 18 * TILE - p.h - 1;
  for (let i = 0; i < 120; i++) frame(s, ['right', 'jump'], i % 40 === 0);
  assert.ok(p.x < 58 * TILE, 'a normal jump stays in front of the wall');
  p.x = 53.5 * TILE; p.y = 18 * TILE - p.h - 30; p.vy = 0;
  for (let i = 0; i < 150; i++) frame(s, ['right'], false);
  assert.ok(p.x > 61 * TILE, `bounced over to column ${(p.x / TILE).toFixed(1)}`);
});

check('a moving golden platform carries the player between the high islands', () => {
  const { s } = scene();
  const p = s.player, m = s.movers.find(x => x.path?.dx);
  p.x = m.x + 20; p.y = m.y - p.h - 1;
  frame(s, [], false); frame(s, [], false);
  assert.equal(p.riding, m);
  const x0 = p.x;
  for (let i = 0; i < 150; i++) frame(s, [], false);
  assert.ok(p.x - x0 > 6 * TILE, 'rode at least six tiles');
  assert.equal(p.riding, m, 'still standing on it');
});

check('real-physics run through the dream reaches the voice, and only "a listening heart" opens the gate', () => {
  const { s } = scene();
  const reached = run(s, 120);
  assert.ok(reached >= 119, `reached column ${reached.toFixed(1)}`);
  assert.ok(s._dreamShown);
  assert.ok(run(s, 135, 900) < 126, 'the cloud gate blocks the way out of the dream');
  const voice = s.stations.find(x => x.id === 'dream_voice');
  s._openStation(voice, audio);
  const m = s.mini;
  assert.ok(m instanceof DreamChoiceGame);
  m.choose('wealth', audio); assert.equal(m.phase, 'ask');
  m.choose('wisdom', audio); assert.equal(m.phase, 'won');
  m.t = 1; m.update(0.1, input(['confirm']), audio);
  s._finishMini(audio);
  assert.ok(s.gateOpen);
  assert.ok(run(s, 140, 1500) >= 135, 'awake in Gibeon');
});

check('two lifts climb to the bronze altar; foxes are caught by touch; the gate needs the altar and all foxes', () => {
  const { s, went } = scene();
  const p = s.player;
  p.x = 135 * TILE; p.y = 15 * TILE - p.h - 1;
  const top = run(s, 205, 12000);
  assert.ok(top >= 200, `climbed to column ${top.toFixed(1)}`);
  assert.ok(p.y + p.h <= 7 * TILE + 2, 'standing on the hilltop');
  run(s, 212, 600);
  assert.ok(s.relicTaken, 'collected the bronze altar');
  run(s, 258, 3000);
  p.x = s.def.exit.x; p.y = s.def.exit.y + 40; s._checkExit(audio);
  assert.ok(!went.length, 'foxes still loose');
  for (const f of s.foxes) { p.x = f.x; p.y = f.y + f.h - p.h; s._updateGivon(audio, 1 / 60); }
  assert.equal(s.foxesCaught, 5);
  for (let i = 0; i < 120; i++) s._updateGivon(audio, 1 / 60);
  assert.ok(s.foxes.every(f => f.fade === 0), 'caught foxes run home');
  s.draw(ctx);
  p.x = s.def.exit.x; p.y = s.def.exit.y + 40; s._checkExit(audio);
  assert.equal(went.at(-1).name, 'summary');
  assert.equal(went.at(-1).params.givon.foxes, 5);
  assert.ok(s.game.save.hasRelic('altar'));
});

check('a fox runs from a nearby player and hops over when cornered', () => {
  const { s } = scene();
  const f = s.foxes[0], p = s.player;
  f.x = f.left + 80; p.x = f.x + 120; p.y = f.y + f.h - p.h;
  const x0 = f.x;
  for (let i = 0; i < 20; i++) s._updateGivon(audio, 1 / 60);
  assert.ok(f.x < x0, 'ran away from the player');
  for (let i = 0; i < 40; i++) s._updateGivon(audio, 1 / 60);   // reaches the fence
  p.x = f.x + f.w + 60;                                          // the player closes in
  let hopped = false;
  for (let i = 0; i < 60; i++) { s._updateGivon(audio, 1 / 60); if (!f.onGround) hopped = true; }
  assert.ok(hopped || f.caught, 'cornered fox hopped (or was caught)');
});

check('every proverb is reachable-looking (not inside a wall) and shows its verse', () => {
  const { s } = scene();
  const scrolls = s.pickups.filter(p => p.type === 'proverb');
  assert.equal(scrolls.length, 8);
  for (const sc of scrolls) assert.ok(!s.map.rectHitsSolid(sc.x, sc.y, sc.w, sc.h), sc.text);
  s._collect(scrolls[0], audio);
  assert.equal(s.proverbsFound, 1);
});

console.log(`\n${checks} Gibeon checks passed`);
