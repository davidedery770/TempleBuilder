/**
 * Requires server on 8080 and an isolated Edge profile on debug port 9223.
 * Tests use only that disposable profile. Never attach a personal browser.
 */
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

const tabs = await (await fetch('http://127.0.0.1:9223/json/list')).json();
const tab = tabs.find(t => t.type === 'page' && t.url.startsWith('http://localhost:8080/'));
assert.ok(tab);
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let id = 0;
const pending = new Map(), errors = [];
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails);
  if (m.id && pending.has(m.id)) {
    const p = pending.get(m.id); pending.delete(m.id); clearTimeout(p.timer);
    if (m.error) p.reject(new Error(JSON.stringify(m.error))); else p.resolve(m.result);
  }
};
function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const n = ++id;
    const timer = setTimeout(() => { pending.delete(n); reject(new Error(method + ' timed out')); }, 10000);
    pending.set(n, { resolve, reject, timer });
    ws.send(JSON.stringify({ id: n, method, params }));
  });
}
async function evaluate(expression) {
  const r = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
}
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(expression) {
  for (let i = 0; i < 100; i++) {
    if (await evaluate(expression)) return;
    await wait(100);
  }
  throw new Error('Timed out waiting for: ' + expression);
}
async function key(code, key, hold = 65) {
  await call('Input.dispatchKeyEvent', { type: 'keyDown', code, key });
  await wait(hold);
  await call('Input.dispatchKeyEvent', { type: 'keyUp', code, key });
  await wait(60);
  await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
}
async function shot(name) {
  const r = await call('Page.captureScreenshot', { format: 'png' });
  await writeFile(new URL('../tmp/' + name + '.png', import.meta.url), Buffer.from(r.data, 'base64'));
}
async function ready(level) {
  await call('Page.navigate', { url: `http://localhost:8080/?start=play&level=${level}` });
  await wait(400);
  for (let i = 0; i < 50; i++) {
    if (await evaluate(level === 2
      ? '!!window.__game && window.__game.scenes.currentName === "construction"'
      : `!!window.__game && window.__game.scenes.current.meta?.id === ${level}`)) return;
    await wait(100);
  }
  throw new Error('Game did not boot');
}

try {
  await call('Runtime.enable');
  await call('Page.enable'); await call('Page.bringToFront');
  await evaluate('localStorage.setItem("templebuilder.music","1")');
  await ready(3);
  assert.ok(await evaluate('window.__game.scenes.current.enemies.every(e => e.type.endsWith("Fish"))'));
  assert.equal(await evaluate('new Set(window.__game.scenes.current.pickups.filter(p=>p.type==="stone").map(p=>p.tribe)).size'), 12);
  await shot('jordan-fish');
  // Fixture skips already-tested guide dialogue, then uses real movement keys.
  await evaluate('window.__game.scenes.current.npcs.forEach(n => n.talked = true)');
  const startX = await evaluate('window.__game.scenes.current.player.x');
  await key('ArrowRight', 'ArrowRight', 500);
  assert.ok(await evaluate('window.__game.scenes.current.player.x') > startX + 20);
  // Verify the natural stage-3 finish leads to ready stage 4.
  await evaluate(`(() => {
    const g=window.__game,s=g.scenes.current;
    for(const p of s.pickups.filter(p=>p.type==="stone")) { p.collected=true; s._collect(p,g.audio); }
    s.player.x=s.def.exit.x;s.player.y=s.def.exit.y;s._checkExit(g.audio);
  })()`);
  await until('window.__game.scenes.currentName === "summary"');
  assert.equal(await evaluate('window.__game.scenes.currentName'), 'summary');
  assert.equal(await evaluate('window.__game.save.data.unlocked'), 4);

  await ready(4);
  await evaluate('window.__game.scenes.current.npcs.forEach(n => n.talked = true)');
  await shot('gilgal-camp');
  // Place the test player at the first safe field; real X input bends it.
  await evaluate(`(() => {
    const g=window.__game,s=g.scenes.current,f=s.fields.items[0];
    s.hud._banner=null;s.player.x=f.x+35;s.player.y=f.y+f.h-s.player.h;
    s.player.vx=0;s.player.vy=0;g.camera.snapTo(s.player.centerX,s.player.centerY);
  })()`);
  await wait(200); await shot('gilgal-field-standing');
  await key('KeyX', 'x');
  assert.ok(await evaluate('window.__game.scenes.current.fields.items[0].bent') > 0);
  await shot('gilgal-field-bent');
  await evaluate(`(() => {
    const g=window.__game,s=g.scenes.current;
    s.player.x=s.def.exit.x;s.player.y=s.def.exit.y;s._checkExit(g.audio);
  })()`);
  assert.equal(await evaluate('window.__game.scenes.currentName'), 'play', 'missing grain blocks exit');
  await evaluate(`(() => {
    const g=window.__game,s=g.scenes.current;
    for(const p of s.pickups.filter(p=>p.type==="grain")) { p.collected=true;s._collect(p,g.audio); }
    s.player.x=s.def.challenge.x;s.player.y=s.def.challenge.y+s.def.challenge.h-s.player.h;
    g.camera.snapTo(s.player.centerX,s.player.centerY);
  })()`);
  await key('Enter', 'Enter');
  assert.equal(await evaluate('window.__game.scenes.current.mini?.constructor.name'), 'ShofarTimingGame');
  await shot('gilgal-rhythm-intro');
  await key('Enter', 'Enter');
  // Keep real game input/update, with a controlled initial phase to make this test deterministic.
  await evaluate('window.__game.scenes.current.mini.clock = window.__game.scenes.current.mini.cycle / 4 - 0.04');
  await key('KeyX', 'x');
  assert.equal(await evaluate('window.__game.scenes.current.mini.hits'), 1);
  await key('Escape', 'Escape');
  await key('Enter', 'Enter');
  assert.equal(await evaluate('window.__game.scenes.current.mini.hits'), 1);
  await wait(250);
  await key('Enter', 'Enter');
  await key('KeyC', 'c');
  assert.ok(await evaluate('window.__game.scenes.current.mini.assisted'));
  assert.equal(await evaluate('window.__game.scenes.current.mini.phase'), 'play');
  await shot('gilgal-rhythm-assist');
  for (let attempt = 0; attempt < 20 && await evaluate('window.__game.scenes.current.mini.hits') < 7; attempt++) {
    await wait(400);
    await evaluate('window.__game.scenes.current.mini.clock = window.__game.scenes.current.mini.cycle / 4 - 0.04');
    await key('KeyX', 'x');
  }
  assert.equal(await evaluate('window.__game.scenes.current.mini.hits'), 7);
  await key('Enter', 'Enter');
  assert.equal(await evaluate('window.__game.scenes.current.challengeDone'), true);
  await evaluate('window.__game.scenes.current.player.x = window.__game.scenes.current.def.exit.x');
  await until('window.__game.scenes.currentName === "summary"');
  assert.equal(await evaluate('window.__game.scenes.currentName'), 'summary');
  await shot('gilgal-summary');
  assert.ok(await evaluate('window.__game.save.hasRelic("omer")'));

  await ready(2);
  await key('KeyZ', 'z'); // Real user gesture unlocks both WebAudio and HTMLAudio.
  await wait(1800);
  const media = await evaluate(`(() => {
    const m=window.__game.audio.music;
    return {theme:m.theme,paused:m.media?.paused,volume:m.media?.volume,
      time:m.media?.currentTime,ready:m.media?.readyState,loop:m.media?.loop,bus:m.bus?.gain.value};
  })()`);
  assert.equal(media.theme, 'sanctuary'); assert.ok(media.loop);
  assert.equal(media.paused, false); assert.ok(media.time > 0 && media.ready >= 2);
  assert.ok(media.volume > 0 && media.volume <= 0.12);
  assert.ok(media.bus < 0.01, 'no overlapping procedural music');
  await key('KeyN', 'n');
  assert.equal(await evaluate('window.__game.audio.music.media.paused'), true);
  await key('KeyN', 'n');
  await evaluate('window.__game.audio.music.setHidden(true)');
  assert.equal(await evaluate('window.__game.audio.music.media.paused'), true);
  await evaluate('window.__game.audio.music.setHidden(false)');
  await key('Escape', 'Escape'); await wait(650);
  assert.equal(await evaluate('window.__game.audio.music.media.paused'), true);
  assert.equal(errors.length, 0, JSON.stringify(errors));
  console.log('PASS Edge: fish, tribal names, real movement, 3→4 progression, fields via X, harvest gate, rhythm/resume/assist, completion.');
  console.log('PASS Edge: MP3 decoded and advancing, quiet loop ≤12%, mute/visibility/exit, no procedural overlap.');
  console.log('PASS no JavaScript exceptions; screenshots saved under tmp/jordan-* and tmp/gilgal-*.');
} finally {
  ws.close();
}
