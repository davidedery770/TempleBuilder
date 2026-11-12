/**
 * verify-temple.mjs — שלב 10 (חנוכת הבית) בלי דפדפן.
 *
 * כל חידת אור: במצב ההתחלה הקרן מחטיאה, ורק הכיוון הנכון של כל המראות מאיר את
 * המטרה ופותח את הדלת. בוט בפיזיקה אמיתית מסובב מראות, עובר את בור הטיט על
 * המכונות ומגיע לחצר; משחק הקצב נגמר בהצלחה רק עם מספיק פגיעות; והשער נפתח.
 */
import assert from 'node:assert/strict';
import { PlayScene, traceBeam } from '../src/scenes/play.js';
import { Camera } from '../src/core/camera.js';
import { SaveData } from '../src/core/storage.js';
import { TILE } from '../src/game/tilemap.js';
import { LevitesGame } from '../src/minigames/levites.js';
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
  s.enter({ levelId: 10 });
  return { s, went };
}
function frame(s, keys, pressed = []) {
  s._updateMovers(1 / 60);
  const control = input(keys); control.pressed = a => pressed.includes(a);
  s.player.update(1 / 60, control, s.map, audio);
  s._updatePickups(1 / 60, audio); s._updateNPCs(audio); s._updateCheckpoints(audio);
  s._updateSea(audio); s._updatePuzzles(control, audio);
  while (s.hud.dialogOpen) s.hud.advanceDialog();
}

/** The orientations that solve each puzzle (found by brute force, not hard-coded). */
function solutions(pz, map) {
  const n = pz.mirrors.length, found = [];
  for (let mask = 0; mask < 1 << n; mask++) {
    const trial = { ...pz, mirrors: pz.mirrors.map((m, i) => ({ ...m, o: mask >> i & 1 ? '\\' : '/' })) };
    if (traceBeam(trial, map).hit) found.push(trial.mirrors.map(m => m.o));
  }
  return found;
}

check('the House is ready, bright, a chapter challenge, with music, trivia and six cards', () => {
  const meta = getLevel(10);
  assert.ok(meta.ready && meta.isBossLevel);
  assert.ok(parseInt(meta.palette.skyTop.slice(1, 3), 16) > 0x50);
  assert.equal(themeForScene('play', 10), 'dedication');
  assert.ok(TRIVIA[10].length >= 6);
  assert.equal(CODEX.filter(c => c.level === 10).length, 6);
});

check('each light puzzle starts unsolved and has exactly one solution', () => {
  const { s } = scene();
  for (const pz of s.puzzles) {
    assert.equal(traceBeam(pz, s.map).hit, false, `${pz.id} must not start solved`);
    assert.equal(solutions(pz, s.map).length, 1, `${pz.id} has one solution`);
  }
});

check('a real-physics run rotates mirrors, opens all three doors, rides the carts and reaches the courtyard', () => {
  const { s } = scene();
  const p = s.player, map = s.map;
  let hold = 0;
  for (let f = 0; f < 30000 && p.x / TILE < 133; f++) {
    const col = Math.floor((p.x + p.w) / TILE), row = Math.floor((p.y + p.h - 2) / TILE);
    let keys = ['right'], pressed = [];
    // next unsolved puzzle: go to a wrong mirror and turn it
    const pz = s.puzzles.find(x => !x.solved && x.door.col > col - 2);
    const want = pz && solutions(pz, map)[0];
    const wrong = pz && pz.mirrors.find((m, i) => m.o !== want[i]);
    let target = null;
    if (wrong) target = wrong;
    if (target) {
      const dx = target.col * TILE + 16 - p.centerX, dy = target.row * TILE + 16 - p.centerY;
      if (Math.abs(dx) < 40 && Math.abs(dy) < 165 && p.onGround) { keys = []; if (f % 12 === 0) pressed.push('confirm'); }
      else keys = [dx > 0 ? 'right' : 'left'];
      if (target.row < row - 3 && p.onGround) {   // climb: head for a step above (toward the mirror), then jump onto it
        let best = null;
        const score = dc => Math.abs(dc) + (Math.sign(dc) && Math.sign(dc) !== Math.sign(dx) ? 10 : 0);
        for (let dc = -7; dc <= 7; dc++) for (let r = row - 3; r <= row - 1; r++)
          if (map.isPlatform(col + dc, r) && (best === null || score(dc) < score(best))) best = dc;
        if (best !== null) {
          keys = [best > 0 ? 'right' : best < 0 ? 'left' : dx > 0 ? 'right' : 'left'];
          if (Math.abs(best) <= 3 && hold <= 0) { hold = 24; pressed.push('jump'); }
        }
      }
    }
    let wall = false;
    for (let dc = 1; dc <= 2; dc++) for (let r = row - 3; r <= row; r++) if (map.isSolid(col + dc, r)) wall = true;
    const groundAhead = map.isSolid(col + 1, row + 1) || map.isPlatform(col + 1, row + 1);
    const overPit = (col + 1) * TILE >= s.def.sea.x0 && (col + 1) * TILE < s.def.sea.x1 && !groundAhead;
    const cartNear = s.movers.some(m => m.x <= p.x + p.w + 30 && m.x + m.w >= p.x + p.w + 6);
    if (!target && overPit && !p.riding && !cartNear) keys = [];
    if (p.riding) {
      const m = p.riding, atEnd = m.x >= m.x0 + m.path.dx - 8;
      const nextOk = s.movers.some(o => o !== m && o.x <= m.x + m.w + 4 && o.x >= m.x + m.w - 40) || map.isSolid(Math.floor((m.x + m.w) / TILE) + 1, row + 1);
      keys = atEnd && nextOk ? ['right'] : [];
    }
    if (keys.includes('right') && p.onGround && hold <= 0 && wall && !p.riding) { hold = 24; pressed.push('jump'); }
    if (hold-- > 0) keys.push('jump');
    frame(s, keys, pressed);
  }
  assert.ok(s.puzzles[0].solved && s.puzzles[1].solved, `solved ${s.puzzles.filter(x => x.solved).length}; mirrors ${s.puzzles.map(x => x.mirrors.map(m => m.o).join('')).join(' | ')}`);
  assert.ok(p.x / TILE >= 132, `crossed the clay pit to column ${(p.x / TILE).toFixed(1)} (splashes ${s.splashes})`);

  // Room 3, move by move with real physics: floor → step → each high ledge, and each mirror turns from where you stand.
  const jumpTo = (startCol, startRow, dir, landRow) => {
    p.x = startCol * TILE; p.y = startRow * TILE - p.h - 1; p.vx = p.vy = 0;
    frame(s, []);
    let airborne = false;
    for (let i = 0; i < 90; i++) {
      if (!p.onGround) airborne = true;
      if (airborne && p.onGround) break;   // landed: stop, like a child would
      frame(s, [dir, ...(i < 24 ? ['jump'] : [])], i === 0 ? ['jump'] : []);
    }
    return Math.abs(p.y + p.h - landRow * TILE) < 2;
  };
  assert.ok(jumpTo(141, 15, 'right', 12), 'floor → step');
  assert.ok(jumpTo(143, 12, 'left', 9), 'step → left high ledge');
  assert.ok(jumpTo(145, 12, 'right', 9), 'step → right high ledge');
  const pz3 = s.puzzles[2], want = solutions(pz3, map)[0];
  const turnFrom = (col, row, m) => {
    p.x = col * TILE; p.y = row * TILE - p.h - 1; p.vx = p.vy = 0; frame(s, []);
    for (let k = 0; k < 2 && m.o !== want[pz3.mirrors.indexOf(m)]; k++) frame(s, [], ['confirm']);
    return m.o === want[pz3.mirrors.indexOf(m)];
  };
  assert.ok(turnFrom(137, 15, pz3.mirrors[0]), 'low mirror turns from the floor');
  assert.ok(turnFrom(137.5, 9, pz3.mirrors[1]), 'left high mirror turns from its ledge');
  assert.ok(turnFrom(149.5, 9, pz3.mirrors[2]), 'right high mirror turns from its ledge');
  assert.ok(pz3.solved, 'the third door opened');

  p.x = 155 * TILE; p.y = 15 * TILE - p.h - 1; p.vx = p.vy = 0;
  for (let f = 0; f < 3000 && p.x / TILE < 200; f++) {
    const col = Math.floor((p.x + p.w) / TILE), row = Math.floor((p.y + p.h - 2) / TILE);
    let wall = false;
    for (let dc = 1; dc <= 2; dc++) for (let r = row - 3; r <= row; r++) if (map.isSolid(col + dc, r)) wall = true;
    const jump = wall && p.onGround && hold <= 0;
    if (jump) hold = 24;
    frame(s, ['right', ...(hold-- > 0 ? ['jump'] : [])], jump ? ['jump'] : []);
  }
  assert.ok(p.x / TILE >= 195, `reached the courtyard at column ${(p.x / TILE).toFixed(1)}`);
});

check('falling in the clay pit returns to the altar with a "plop"', () => {
  const { s } = scene();
  const p = s.player;
  p.setSpawn(110 * TILE, 15 * TILE - p.h - 4);
  p.x = 116 * TILE; p.y = 16 * TILE;
  frame(s, []);
  assert.equal(s.splashes, 1); assert.equal(p.x, p.spawnX);
});

check('the Levites play: too few notes means "again", enough notes fills the House with cloud', () => {
  const tryPlay = hitEvery => {
    const m = new LevitesGame({}, {});
    m.t = 1; m.update(0.1, input(['confirm']), audio);
    assert.equal(m.phase, 'play');
    let i = 0;
    while (m.phase === 'play' && i++ < 4000) {
      const due = m.notes.find(n => !n.hit && !n.missed && Math.abs(n.t - m.clock) < 0.03);
      const keys = due && (m.notes.indexOf(due) % hitEvery === 0) ? [['right', 'down', 'left'][due.lane]] : [];
      m.update(1 / 60, input(keys), audio);
    }
    return m;
  };
  const weak = tryPlay(3);
  assert.equal(weak.phase, 'again');
  const good = tryPlay(1);
  assert.equal(good.phase, 'won');
  good.update(0.1, input(['confirm']), audio);
  assert.ok(good.result.success);
  good.draw(ctx);

  const { s, went } = scene();
  const c = s.def.challenge, p = s.player;
  p.x = c.x; p.y = c.y + c.h - p.h;
  s._updateHarvestFeatures(input(['confirm']), audio);
  assert.ok(s.mini instanceof LevitesGame);
  s.mini.finished = true; s.mini.result = { success: true, perfect: false };
  s._finishMini(audio);
  assert.ok(s.relicTaken && s.cloudFill > 0);
  for (let i = 0; i < 200; i++) s._updatePuzzles(input(), audio);
  assert.equal(s.cloudFill, 1);
  s.draw(ctx);
  p.x = s.def.exit.x; p.y = s.def.exit.y + 40; s._checkExit(audio);
  assert.equal(went.at(-1).name, 'summary');
  assert.ok(s.game.save.hasRelic('cherubim'));
});

console.log(`\n${checks} Temple checks passed`);
