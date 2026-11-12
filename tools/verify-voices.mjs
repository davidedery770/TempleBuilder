import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Voice } from '../src/core/voice.js';
import { Music } from '../src/core/music.js';
import { VOICE_FILES } from '../src/data/voiceManifest.js';
import { VOICE_PROFILES, narrationForGame, profileForSpeaker } from '../src/data/voiceText.js';
import { buildLevel01 } from '../src/data/level01.js';
import { buildLevel03 } from '../src/data/level03.js';
import { buildLevel04 } from '../src/data/level04.js';
import { buildLevel05 } from '../src/data/level05.js';
import { BUILD_PARTS, targetPoint } from '../src/data/level02.js';
import { CODEX } from '../src/data/codex.js';
import { TRIVIA } from '../src/data/trivia.js';
import { createMiniGame } from '../src/minigames/index.js';
import { ConstructionScene } from '../src/scenes/construction.js';
import { SaveData } from '../src/core/storage.js';

const store = new Map();
globalThis.localStorage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
let checks = 0, snapshots = 0;
const check = async (name, fn) => { await fn(); checks++; console.log('PASS ' + name); };
const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('assets/audio/voices/manifest.json', root)));
const receipts = JSON.parse(await readFile(new URL('assets/audio/voices/generation.json', root)));
const known = new Map(manifest.lines.map(line => [line.id, line]));
const game = { scenes: { currentName: 'play', current: {}, transitioning: false }, save: new SaveData() };
function covered() {
  const snapshot = narrationForGame(game);
  assert.ok(snapshot);
  assert.ok(snapshot.lines.length);
  for (const line of snapshot.lines) {
    assert.ok(VOICE_FILES[line.id], `Unmapped speech: ${line.profile}: ${line.text}`);
    assert.equal(known.get(line.id)?.text, line.text);
  }
  snapshots++;
  return snapshot;
}
await check('every manifest clip has a matching, verified nonempty local file and receipt', async () => {
  assert.equal(Object.keys(VOICE_FILES).length, manifest.lines.length);
  assert.ok(manifest.lines.length > 400);
  for (const line of manifest.lines) {
    const url = new URL('assets/audio/voices/' + line.file, root);
    assert.ok((await stat(url)).size > 500);
    assert.equal(receipts[line.id]?.signature, line.signature, line.id);
    assert.ok(receipts[line.id]?.duration > 0.1);
    assert.equal(createHash('sha256').update(await readFile(url)).digest('hex'), receipts[line.id].sha256);
  }
});
await check('all dialogue pages and randomized trivia choices in stages 1, 3, 4 are covered', () => {
  for (const builder of [buildLevel01, buildLevel03, buildLevel04, buildLevel05]) {
    const level = builder();
    for (const npc of level.npcs) {
      for (let page = 0; page < npc.lines.length; page++) {
        game.scenes.current = { hud: { dialog: { speaker: npc.name, lines: npc.lines, page } } };
        assert.equal(covered().lines[0].profile, profileForSpeaker(npc.name));
      }
    }
    for (const station of level.stations) {
      const mini = createMiniGame(station.kind, { ...station.params, levelId: level.id }, game);
      game.scenes.current = { mini };
      if (station.kind === 'trivia') {
        for (const q of TRIVIA[level.id]) {
          // Deliberately reverse choices: speech must match the displayed, shuffled order.
          mini.questions = [{ ...q, options: [...q.options].reverse(), answer: q.options.length - 1 - q.answer }];
          mini.i = 0; mini.phase = 'ask';
          assert.deepEqual(covered().lines.map(line => line.text), [q.q, ...mini.q.options]);
          mini.phase = 'feedback';
          for (const picked of [mini.q.answer, (mini.q.answer + 1) % 4]) { mini.picked = picked; covered(); }
        }
        mini.phase = 'end';
        for (const n of [0, 1, 2, 3]) { mini.correct = n; covered(); }
      }
      if (station.kind === 'sorting') {
        for (let i = 0; i < mini.items.length; i++) {
          mini.i = i; mini.phase = 'play'; covered();
          for (const last of [{ ok: true }, { ok: false }, { ok: false, timedOut: true }]) {
            mini.last = last; mini.phase = 'feedback'; covered();
          }
        }
        mini.phase = 'end';
        for (const n of [0, 8]) { mini.correct = n; covered(); }
      }
      if (station.kind === 'weaving') {
        for (const phase of ['play', 'between', 'failed', 'done']) {
          mini.phase = phase; covered();
        }
        mini.phase = 'play'; mini.round = 2;
        assert.ok(!/תכלת/.test(covered().lines[0].text), 'memory challenge must not reveal the order');
        mini.guided = true; covered();
        mini.phase = 'between'; covered();
      }
    }
  }
});
await check('shofar instructions and feedback, museum locks, and summary cards are covered', () => {
  const mini = createMiniGame('shofarTiming', {}, game);
  game.scenes.current = { mini };
  covered(); mini.phase = 'play';
  for (const feedback of ['בתזמון הנכון! ההצלחה נשמרת.', 'נרחיב מעט את האזור המואר. אפשר גם להפעיל סיוע.',
    'כמעט — תקעו כשהסמן בתוך האזור המואר. ההצלחות נשמרות.']) {
    mini.feedback = feedback; covered();
  }
  mini.phase = 'done'; covered();
  for (let index = 0; index < CODEX.length; index++) {
    game.scenes.currentName = 'museum'; game.scenes.current = { index };
    assert.equal(narrationForGame(game), null, 'locked content cannot be spoken');
    game.save.addCodex(CODEX[index].id); covered();
    game.scenes.currentName = 'summary';
    game.scenes.current = { cards: [CODEX[index]], cardIndex: 0 }; covered();
  }
});
await check('workshop messages, selection, hints, three failed drops, rebuild, and both notes panels are covered', () => {
  const s = new ConstructionScene();
  s.game = { save: new SaveData(), audio: new Proxy({}, { get: () => () => {} }), input: { flush() {} } };
  s.enter(); game.scenes.current = s; game.scenes.currentName = 'construction'; covered();
  for (const p of BUILD_PARTS) {
    s._pick(p); covered();
    s._say(p.hint); covered();
    for (let i = 0; i < 3; i++) { s.tryPlace(p, -100, -100); covered(); }
    const target = targetPoint(p);
    assert.ok(s.tryPlace(p, target.x, target.y), p.id); covered();
  }
  s.rebuildConfirm = true; covered(); s.rebuildConfirm = false;
  s.showNotes = true;
  for (const view of ['plan', '3d']) { s.viewMode = view; covered(); }
  s.restartConstruction(); covered();
});
await check('casting stays consistent across scenes and uses distinct male/female direction', () => {
  assert.equal(profileForSpeaker('מֹשֶׁה רַבֵּנוּ'), 'moshe');
  assert.equal(profileForSpeaker('יְהוֹשֻׁעַ בִּן־נוּן'), 'yehoshua');
  assert.equal(profileForSpeaker('אֶלְעָזָר הַכֹּהֵן'), 'elazar');
  assert.equal(profileForSpeaker('וְכָל אִשָּׁה חֲכַמַת לֵב בְּיָדֶיהָ טָווּ'), 'weaver');
  assert.equal(VOICE_PROFILES.weaver.voice, 'he-IL-HilaNeural');
  assert.notEqual(VOICE_PROFILES.moshe.pitch, VOICE_PROFILES.yehoshua.pitch);
});

const created = [];
class Media {
  constructor(src) { this.src = src; this.paused = true; this.currentTime = 0; this.pauses = 0; created.push(this); }
  play() {
    this.paused = false;
    if (this.reject) return Promise.reject(Object.assign(new Error(), { name: this.reject }));
    this.onplaying?.();
    return this.promise || Promise.resolve();
  }
  pause() { this.paused = true; this.pauses++; }
  load() { this.currentTime = 0; }
  removeAttribute(name) { if (name === 'src') this.src = ''; }
}
globalThis.Audio = Media;
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
const speech = key => ({ key, lines: [{ id: 'a' }, { id: 'b' }] });
const rig = () => {
  store.clear();
  const music = { active: false, setSpeechActive(on) { this.active = on; } };
  return { voice: new Voice(music, { a: 'a.mp3', b: 'b.mp3' }), music };
};
await check('single stream, first gesture, page cancellation, old events, queue order, and no repeated playback', async () => {
  const { voice, music } = rig();
  voice.set(speech('first')); assert.equal(voice.media, null);
  voice.unlock(); await flush();
  const first = voice.media, staleEnd = first.onended;
  assert.ok(voice.playing && music.active);
  voice.set(speech('first')); assert.equal(voice.media, first);
  const pauses = first.pauses;
  voice.set(speech('second')); await flush();
  assert.equal(voice.media, first, 'same mobile-authorized media element is reused');
  assert.ok(first.pauses > pauses, 'previous clip is paused before replacing its source');
  const second = voice.media; staleEnd(); assert.equal(voice.media, second);
  const secondEnd = second.onended;
  secondEnd(); await flush();
  assert.ok(voice.media.src.endsWith('b.mp3'));
  secondEnd(); assert.equal(voice.index, 1, 'stale end event cannot skip another clip on the same element');
  voice.media.onended(); await flush();
  assert.equal(voice.media, null); assert.equal(music.active, false);
  voice.set(speech('second')); assert.equal(voice.media, null);
});
await check('mute persists separately; hidden tabs pause/resume; scene exit releases audio and ducking', async () => {
  const { voice, music } = rig();
  voice.unlock(); voice.set(speech('mute')); await flush();
  const old = voice.media;
  voice.toggle(); assert.ok(old.paused && !music.active);
  assert.equal(store.get('templebuilder.voice'), '0');
  voice.toggle(); await flush(); assert.ok(voice.playing);
  const current = voice.media; current.currentTime = 2;
  voice.setHidden(true); assert.ok(current.paused && !music.active);
  voice.setHidden(false); await flush(); assert.equal(current.currentTime, 2); assert.ok(voice.playing);
  voice.clear(); assert.equal(voice.media, null); assert.equal(music.active, false);
  voice.set(speech('new')); await flush(); assert.ok(voice.playing);
});
await check('autoplay denial waits for gesture, missing files skip safely, and stale promises cannot revive speech', async () => {
  const { voice, music } = rig();
  voice.unlock();
  const original = Media.prototype.play;
  Media.prototype.play = function () { return Promise.reject(Object.assign(new Error(), { name: 'NotAllowedError' })); };
  voice.set(speech('blocked')); await flush();
  assert.ok(voice.blocked && !music.active);
  const count = created.length; voice.set(speech('blocked')); assert.equal(created.length, count);
  Media.prototype.play = original; voice.unlock(); await flush(); assert.ok(voice.playing);
  voice.media.onerror(); await flush(); assert.ok(voice.media.src.endsWith('b.mp3'));
  let rejectOld;
  Media.prototype.play = function () { return new Promise((resolve, reject) => { rejectOld = reject; }); };
  voice.set(speech('pending'));
  Media.prototype.play = original; voice.set(speech('replacement')); await flush();
  const replacement = voice.media;
  rejectOld(Object.assign(new Error(), { name: 'NotAllowedError' })); await flush();
  assert.equal(voice.media, replacement); assert.ok(!voice.blocked && voice.playing);
  voice.set({ key: 'missing', lines: [{ id: 'nope' }, { id: 'a' }] }); await flush();
  assert.ok(voice.media.src.endsWith('a.mp3')); voice.clear();
});
await check('hiding during a pending play promise cannot skip a line or stop the resumed voice', async () => {
  const { voice } = rig();
  voice.unlock();
  let rejectPending;
  const original = Media.prototype.play;
  Media.prototype.play = function () { return new Promise((resolve, reject) => { rejectPending = reject; }); };
  voice.set(speech('hidden-race'));
  const media = voice.media;
  voice.setHidden(true);
  Media.prototype.play = original;
  voice.setHidden(false); await flush();
  rejectPending(Object.assign(new Error(), { name: 'AbortError' })); await flush();
  assert.equal(voice.media, media); assert.equal(voice.index, 0); assert.ok(voice.playing);
  voice.clear();
});
await check('speech ducking cannot be undone by scene duck updates and does not change music mute', () => {
  const music = new Music({ ctx: null });
  music.setSpeechActive(true); music.duck(false);
  assert.ok(music._speechActive && !music._ducked && music.enabled);
  music.duck(true); music.setSpeechActive(false); assert.ok(music._ducked);
  music.toggle(); assert.equal(music.enabled, false); assert.equal(store.get('templebuilder.music'), '0');
});
console.log(`\n${checks} voice checks passed; ${snapshots} content snapshots, ${manifest.lines.length} verified local MP3s.`);
