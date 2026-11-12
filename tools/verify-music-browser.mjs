/** Use only an isolated Edge test profile on port 9223, with the game on 8080. */
import assert from 'node:assert/strict';
const tabs = await (await fetch('http://127.0.0.1:9223/json/list')).json();
const tab = tabs.find(t => t.type === 'page' && t.url.startsWith('http://localhost:8080/'));
assert.ok(tab, 'Open the game in an isolated test profile');
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let id = 0;
const pending = new Map(), errors = [];
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails);
  if (!pending.has(m.id)) return;
  const p = pending.get(m.id); pending.delete(m.id); clearTimeout(p.timer);
  if (m.error) p.reject(new Error(JSON.stringify(m.error))); else p.resolve(m.result);
};
const call = (method, params = {}) => new Promise((resolve, reject) => {
  const n = ++id;
  const timer = setTimeout(() => { pending.delete(n); reject(new Error(method + ' timeout')); }, 15000);
  pending.set(n, { resolve, reject, timer });
  ws.send(JSON.stringify({ id: n, method, params }));
});
async function evaluate(expression) {
  const r = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
}
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function key(code, key) {
  await call('Input.dispatchKeyEvent', { type: 'keyDown', code, key });
  await wait(60);
  await call('Input.dispatchKeyEvent', { type: 'keyUp', code, key });
  await wait(80);
  await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
}
try {
  await call('Runtime.enable');
  await call('Page.enable'); await call('Page.bringToFront');
  await evaluate('localStorage.setItem("templebuilder.music","1")');
  await call('Page.navigate', { url: 'http://localhost:8080/?start=play&level=1' });
  await wait(400);
  for (let i = 0; i < 60; i++) {
    if (await evaluate('!!window.__game')) break;
    await wait(100);
  }
  await key('KeyZ', 'z');
  assert.equal(await evaluate('window.__game.scenes.currentName'), 'play');
  assert.equal(await evaluate('window.__game.scenes.current.def.id'), 1);
  assert.equal(await evaluate('window.__game.audio.music.theme'), 'desert');
  for (const [levelId, theme] of [[3, 'jordan'], [4, 'gilgal']]) {
    await evaluate(`window.__game.scenes.set("play", { levelId: ${levelId} })`);
    assert.equal(await evaluate('window.__game.audio.music.theme'), theme);
    await wait(350);
  }
  await key('KeyN', 'n');
  assert.equal(await evaluate('window.__game.audio.music.enabled'), false);
  await evaluate('window.__game.scenes.set("play", {levelId:3})');
  assert.equal(await evaluate('window.__game.audio.music.enabled'), false);
  await key('KeyN', 'n');
  assert.equal(await evaluate('window.__game.audio.music.enabled'), true);
  const renders = await evaluate(`(async () => {
    const { Audio: GameAudio } = await import('/src/core/audio.js');
    const { MUSIC_THEMES } = await import('/src/data/musicThemes.js');
    const results = [];
    for (const name of ['desert', 'jordan', 'gilgal']) {
      const sampleRate = 22050, seconds = 9;
      const ctx = new OfflineAudioContext(1, sampleRate * seconds, sampleRate);
      const a = new GameAudio();
      a.ctx = ctx; a.master = ctx.createGain(); a.master.gain.value = 0.35;
      a.master.connect(ctx.destination);
      a.music._ctxReady(); a.music.theme = name; a.music.bus.gain.value = 1;
      const stepSec = 60 / MUSIC_THEMES[name].bpm / 2;
      for (let step = 0; step * stepSec < seconds; step++) a.music._schedule(step, step * stepSec);
      const buffer = await ctx.startRendering();
      let peak = 0, energy = 0, finite = true;
      const data = buffer.getChannelData(0);
      for (const sample of data) {
        peak = Math.max(peak, Math.abs(sample)); energy += sample * sample;
        if (!Number.isFinite(sample)) finite = false;
      }
      results.push({ name, peak, rms: Math.sqrt(energy/data.length), finite });
    }
    return results;
  })()`);
  for (const r of renders) {
    assert.ok(r.finite && r.rms > 0.0001 && r.peak < 1, JSON.stringify(r));
    console.log(`PASS WebAudio render ${r.name}: RMS ${r.rms.toFixed(4)}, peak ${r.peak.toFixed(4)}, no clipping`);
  }
  await evaluate('window.__game.scenes.set("construction")');
  await wait(1600);
  assert.equal(await evaluate('window.__game.audio.music.theme'), 'sanctuary');
  assert.ok(await evaluate('!window.__game.audio.music.media.paused && window.__game.audio.music.media.volume <= 0.12'));
  await evaluate('window.__game.scenes.set("menu")');
  assert.equal(await evaluate('window.__game.audio.music.theme'), 'menu');
  assert.equal(await evaluate('window.__game.audio.music.media.paused'), true);
  assert.equal(errors.length, 0, JSON.stringify(errors));
  console.log('PASS live stage switching, mute preference, workshop MP3 preservation, menu return; no JavaScript exceptions.');
} finally { ws.close(); }
