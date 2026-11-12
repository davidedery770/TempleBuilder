/**
 * verify-lebanon.mjs — שלב 9 (ארזי הלבנון) בלי דפדפן.
 *
 * פיזיקה אמיתית: היער עביר; הים נחצה רק ברפסודות (מחכים לרפסודה וקופצים);
 * נפילה לים מחזירה לנקודת ההצלה; קירות האבן הסדוקה נשברים באור המטה בלבד;
 * בהר המוריה המטה רק "משתיק"; ואתגר הקיר פותח את השער.
 */
import assert from 'node:assert/strict';
import { PlayScene } from '../src/scenes/play.js';
import { Camera } from '../src/core/camera.js';
import { SaveData } from '../src/core/storage.js';
import { TILE } from '../src/game/tilemap.js';
import { StoneFitGame } from '../src/minigames/stoneFit.js';
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
  s.enter({ levelId: 9 });
  return { s, went };
}

function frame(s, keys, pressed = []) {
  s._updateMovers(1 / 60);
  const control = input(keys); control.pressed = a => pressed.includes(a);
  s.player.update(1 / 60, control, s.map, audio);
  s._updatePickups(1 / 60, audio); s._updateNPCs(audio); s._updateCheckpoints(audio); s._updateLebanon(audio); s._updateSea(audio);
  while (s.hud.dialogOpen) s.hud.advanceDialog();
}

/**
 * A careful player: jumps walls and edges, waits at the shore for a raft to come close,
 * rides it, jumps off toward the next island, and lights cracked stone with Z.
 */
function run(s, untilCol, frames = 20000) {
  const p = s.player, map = s.map;
  let hold = 0;
  for (let f = 0; f < frames && p.x / TILE < untilCol; f++) {
    const col = Math.floor((p.x + p.w) / TILE), row = Math.floor((p.y + p.h - 2) / TILE);
    let wall = false, crack = false;
    for (let dc = 1; dc <= 2; dc++) for (let r = row - 3; r <= row; r++) {
      if (map.isSolid(col + dc, r)) wall = true;
      if (dc === 1 && map.charAt('action', col + dc, r) === 'C' && r >= row - 1) crack = true;   // within staff reach
    }
    let step = false;
    for (let dc = 0; dc <= 1; dc++) for (let r = row - 2; r <= row - 1; r++) if (map.isPlatform(col + dc, r)) step = true;
    const groundAhead = map.isSolid(col + 1, row + 1) || map.isPlatform(col + 1, row + 1);
    const overSea = s.def.sea && (col + 1) * TILE >= s.def.sea.x0 && (col + 1) * TILE < s.def.sea.x1 && !groundAhead;
    const raftNear = s.movers.some(m => m.x <= p.x + p.w + 40 && m.x + m.w >= p.x + p.w + 10 && m.dx >= 0);
    let keys = ['right'], pressed = [];
    if (overSea && !p.riding && !raftNear && p.onGround) keys = [];        // wait on the shore/island
    let leap = false;
    if (p.riding) {
      // ride until the raft reaches the far end of its route, then run to its edge and leap
      const m = p.riding, atEnd = m.x >= m.x0 + m.path.dx - 10;
      keys = atEnd ? ['right'] : [];
      leap = atEnd && p.x + p.w > m.x + m.w - 12;
    }
    if (crack && p.onGround) { pressed.push('attack'); keys = []; }
    const edge = !groundAhead && !overSea && !p.riding;
    // boarding is a step down onto the raft, not a jump (a full jump overshoots it)
    const jumpNow = p.onGround && hold <= 0 && keys.length && (wall && !crack || step || edge || leap);
    if (jumpNow) { hold = 24; pressed.push('jump'); }
    if (hold-- > 0) keys.push('jump');
    frame(s, keys, pressed);
  }
  return p.x / TILE;
}

check('Lebanon is ready and bright, with music, six questions and four cards', () => {
  const meta = getLevel(9);
  assert.ok(meta.ready);
  assert.ok(parseInt(meta.palette.skyTop.slice(1, 3), 16) > 0x50);
  assert.equal(themeForScene('play', 9), 'lebanon');
  assert.ok(TRIVIA[9].length >= 6);
  assert.equal(CODEX.filter(c => c.level === 9).length, 4);
});

check('the forest is traversable and its tree-top beams are reachable', () => {
  const { s } = scene();
  assert.ok(run(s, 92, 6000) >= 90, 'reached the shore of Jaffa');
  assert.ok(s.cedarsFound >= 2, `collected ${s.cedarsFound} beams on the way`);
});

check('falling into the sea splashes back to the last altar', () => {
  const { s } = scene();
  const p = s.player;
  p.setSpawn(94 * TILE, 15 * TILE - p.h - 4);
  p.x = 105 * TILE; p.y = 16 * TILE;
  frame(s, []);
  assert.equal(s.splashes, 1);
  assert.equal(p.x, p.spawnX);
  assert.ok(p.alive);
});

check('rafts carry a careful player across the whole sea', () => {
  const { s } = scene();
  const p = s.player;
  p.x = 92 * TILE; p.y = 15 * TILE - p.h - 1; p.setSpawn(p.x, p.y);
  const reached = run(s, 168, 12000);
  assert.ok(reached >= 165, `reached column ${reached.toFixed(1)} (splashes: ${s.splashes})`);
});

check('cracked stone stops you until the staff light breaks it', () => {
  const { s } = scene();
  const p = s.player;
  p.x = 178 * TILE; p.y = 15 * TILE - p.h - 1;
  for (let i = 0; i < 120; i++) frame(s, ['right'], i % 30 === 0 ? ['jump'] : []);
  assert.ok(p.x < 182 * TILE, 'the five-tile cracked wall blocks walking and jumping');
  for (let i = 0; i < 40; i++) frame(s, ['right'], i % 10 === 0 ? ['attack'] : []);
  assert.ok(s.stonesBroken >= 2);
  for (let i = 0; i < 120; i++) frame(s, ['right']);
  assert.ok(p.x > 184 * TILE, 'walked through the broken stone');
  assert.ok(s.hewnFound >= 1, 'found the hewn stone behind it');
});

check('the quarry and Moriah run end-to-end; Z only shushes on the mountain; the wall opens the gate', () => {
  const { s, went } = scene();
  const p = s.player;
  p.x = 170 * TILE; p.y = 15 * TILE - p.h - 1;
  const reached = run(s, 272, 15000);
  assert.ok(reached >= 270, `reached column ${reached.toFixed(1)}`);
  const broken = s.stonesBroken;
  frame(s, [], ['attack']); for (let i = 0; i < 20; i++) frame(s, []);
  assert.equal(s.stonesBroken, broken, 'no breaking on Mount Moriah');
  assert.notEqual(s._shushAt, -9, 'got a friendly shush instead');
  const c = s.def.challenge;
  p.x = c.x; p.y = c.y + c.h - p.h;
  s._updateHarvestFeatures(input(['confirm']), audio);
  assert.ok(s.mini instanceof StoneFitGame);
  const m = s.mini; m.phase = 'play';
  m.pick('square', audio); assert.equal(m.slot, 0, 'a wrong stone is simply refused');
  for (const shape of ['long', 'corner', 'square', 'step']) m.pick(shape, audio);
  assert.equal(m.phase, 'done');
  m.t = 1; m.update(0.1, input(['confirm']), audio);
  s._finishMini(audio);
  assert.ok(s.relicTaken && s.challengeDone);
  s.draw(ctx);
  p.x = s.def.exit.x; p.y = s.def.exit.y + 40; s._checkExit(audio);
  assert.equal(went.at(-1).name, 'summary');
  assert.ok(went.at(-1).params.lebanon.hewn >= 4);
  assert.ok(s.game.save.hasRelic('cedars'));
});

check('crows fly and crabs walk, and both scatter in the light', () => {
  const { s } = scene();
  const crow = s.enemies.find(e => e.type === 'crow'), crab = s.enemies.find(e => e.type === 'crab');
  const y0 = crow.y;
  for (let i = 0; i < 90; i++) { crow.update(1 / 60, s.map, s.player); crab.update(1 / 60, s.map, s.player); }
  assert.ok(Math.abs(crow.y - y0) <= 24);
  assert.ok(crab.onGround);
  assert.ok(crow.disperse() && crab.disperse());
});

console.log(`\n${checks} Lebanon checks passed`);
