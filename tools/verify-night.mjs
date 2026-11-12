/**
 * verify-night.mjs — שלב 6 (לילה בשילה) בלי דפדפן.
 *
 * פיזיקה אמיתית: הולכים ימינה וקופצים מול קיר או קצה. בודקים שבלי פנסים
 * הדרך חסומה, שכל פנס מגלה בדיוק את הקרשים שלו, שהקולות מובילים אל עלי,
 * ששער החצר נפתח בתשובה נכונה, ושהמנורה סוגרת את השלב ופותחת רק עד שלב 6.
 */
import assert from 'node:assert/strict';
import { PlayScene } from '../src/scenes/play.js';
import { Camera } from '../src/core/camera.js';
import { SaveData } from '../src/core/storage.js';
import { TILE } from '../src/game/tilemap.js';
import { MenorahLightingGame } from '../src/minigames/menorahLighting.js';
import { TriviaGame } from '../src/minigames/trivia.js';
import { TRIVIA } from '../src/data/trivia.js';
import { CODEX } from '../src/data/codex.js';
import { getLevel } from '../src/data/levels.js';

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
  s.enter({ levelId: 6 });
  return { s, went };
}

/** Runs right with real physics, jumping at walls and edges; returns the furthest column reached. */
function run(s, untilCol, frames = 6000) {
  const p = s.player, map = s.map;
  let hold = 0;
  for (let f = 0; f < frames && p.x / TILE < untilCol; f++) {
    if (s.hud.dialogOpen) s.hud.advanceDialog();
    const col = Math.floor((p.x + p.w) / TILE), row = Math.floor((p.y + p.h - 2) / TILE);
    let wall = false;
    for (let dc = 1; dc <= 2; dc++) for (let r = row - 3; r <= row; r++) if (map.isSolid(col + dc, r)) wall = true;
    const edge = !map.isSolid(col + 1, row + 1) && !map.isPlatform(col + 1, row + 1);
    let step = false;   // a revealed plank just above and ahead is a step to climb
    for (let dc = 0; dc <= 1; dc++) for (let r = row - 2; r <= row - 1; r++) if (map.isPlatform(col + dc, r)) step = true;
    const jump = p.onGround && hold <= 0 && (wall || edge || step);
    if (jump) hold = 24;
    const keys = ['right', ...(hold-- > 0 ? ['jump'] : [])];
    const control = input(keys); control.pressed = a => a === 'jump' && jump;
    p.update(1 / 60, control, map, audio);
    s._updatePickups(1 / 60, audio); s._updateNPCs(audio); s._updateNight(audio, 1 / 60);
  }
  return p.x / TILE;
}

check('night stage is playable, a chapter challenge, with real trivia and museum cards', () => {
  const meta = getLevel(6);
  assert.ok(meta.ready && meta.isBossLevel);
  assert.ok(TRIVIA[6].length >= 4);
  for (const q of TRIVIA[6]) assert.ok(q.options[q.answer] && q.source, q.id);
  for (const id of ['ner_elokim', 'eli_shiloh', 'samuel_listening']) assert.ok(CODEX.some(c => c.id === id && c.level === 6), id);
});

check('hidden planks start as air, and nothing is buried inside rock', () => {
  const { s } = scene();
  for (const l of s.lamps) for (const r of l.reveal) for (let c = r.col; c < r.col + r.w; c++)
    assert.equal(s.map.charAt('action', c, r.row), '.', `${l.id} ${c},${r.row}`);
  for (const p of s.def.pickups) assert.ok(!s.map.rectHitsSolid(p.x, p.y, 20, 20), `${p.type} at ${p.x / TILE}`);
  for (const l of s.lamps) assert.ok(!s.map.isSolid(Math.floor(l.x / TILE), Math.floor(l.y / TILE) - 1), l.id);
});

check('without light the first plateau is out of reach', () => {
  const { s } = scene();
  s.pickups.forEach(p => { if (p.type === 'oil') p.collected = true; });
  assert.ok(run(s, 40, 1500) < 30, 'a four-tile wall needs the revealed steps');
  assert.equal(s.lamps[0].lit, false);
});

check('oil, lamps, three calls and Eli carry a real-physics run to the courtyard gate', () => {
  const { s } = scene();
  const reached = run(s, 243);
  assert.ok(reached >= 240, `reached column ${reached.toFixed(1)}`);
  assert.equal(s.lamps.slice(0, 4).filter(l => l.lit).length, 4);
  assert.deepEqual(s.calls.map(c => c.heard), [true, true, true]);
  assert.ok(['eli_call1', 'eli_call2', 'eli_call3'].every(id => s.npcs.find(n => n.id === id).talked));
  assert.equal(s.callRun, null, 'reaching Eli ends the race');
  assert.ok(run(s, 250, 600) < 244, 'the courtyard wall blocks until the question is answered');
});

check('right answers open the gate; the menorah finishes the stage and opens nothing past it', () => {
  const { s, went } = scene();
  run(s, 243);
  const gate = s.stations.find(x => x.id === 'court_gate');
  s._openStation(gate, audio);
  assert.ok(s.mini instanceof TriviaGame);
  s.mini.finished = true; s.mini.result = { success: true, perfect: true };
  s._finishMini(audio);
  assert.ok(s.gateOpen && gate.done);
  assert.ok(run(s, 266) >= 262, 'courtyard reachable after the gate opens');
  const c = s.def.challenge;
  s.player.x = c.x; s.player.y = c.y + c.h - s.player.h;
  s._updateHarvestFeatures(input(['confirm']), audio);
  assert.ok(s.mini instanceof MenorahLightingGame);
  s.mini.lit = 7; s.mini.phase = 'done'; s.mini._close(false);
  s._finishMini(audio);
  assert.ok(s.relicTaken && s.challengeDone);
  s.draw(ctx);
  s.player.x = s.def.exit.x; s.player.y = s.def.exit.y; s._checkExit(audio);
  assert.equal(went.at(-1).name, 'summary');
  assert.equal(went.at(-1).params.night.total, 5);
  assert.ok(s.game.save.hasRelic('menorah'));
  assert.equal(s.game.save.data.unlocked, 7, 'the menorah opens Nob');
});

check('menorah lighting: a miss never puts out a lamp, and seven pours finish', () => {
  const m = new MenorahLightingGame({}, {});
  m.t = 1; m.update(0.1, input(['confirm']), audio);
  assert.equal(m.phase, 'play');
  m.clock = 0.5; m.pour(audio);
  if (!m.onTarget) assert.equal(m.lit, 0);
  for (let i = 0; i < 7; i++) {
    m.cooldown = 0;
    for (let k = 0; k < 600 && !m.onTarget; k++) m.clock += 1 / 120;
    m.pour(audio);
  }
  assert.equal(m.lit, 7); assert.equal(m.phase, 'done');
  m.update(0.1, input(['confirm']), audio);
  assert.ok(m.result.success);
  m.draw(ctx);
});

check('bats fly without gravity and scatter in a lit lamp', () => {
  const { s } = scene();
  const bat = s.enemies[0], y0 = bat.y;
  for (let i = 0; i < 120; i++) bat.update(1 / 60, s.map, s.player);
  assert.ok(Math.abs(bat.y - y0) <= 20, 'stays near its flight line');
  const lamp = s.lamps[2];
  bat.x = lamp.x; bat._baseY = lamp.y - 60;
  s.oil = 1; s._lightLamp(lamp, audio); s._updateNight(audio, 1 / 60);
  assert.ok(bat.vanishing || bat.gone);
});

console.log(`\n${checks} night-stage checks passed`);
