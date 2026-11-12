/** Dedicated disposable Edge profile only: debug port 9223, game server 8080. */
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { CAMP_STATIONS, getCampStation } from '../src/data/camp01.js';
const tabs = await (await fetch('http://127.0.0.1:9223/json/list')).json();
const tab = tabs.find(t => t.type === 'page' && t.url.startsWith('http://localhost:8080/'));
assert.ok(tab);
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let seq = 0;
const pending = new Map(), errors = [];
let fallbackScript = null;
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails);
  const p = pending.get(m.id);
  if (p) { pending.delete(m.id); clearTimeout(p.timer); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); }
};
const call = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++seq, timer = setTimeout(() => { pending.delete(id); reject(new Error(method + ' timeout')); }, 20000);
  pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params }));
});
async function evaluate(expression) {
  const r = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
}
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(expression, budget = 200) {
  for (let i = 0; i < budget; i++) {
    if (await evaluate(expression)) return;
    await wait(100);
  }
  console.log(await evaluate('JSON.stringify({scene:window.__game.scenes.currentName,position:window.__game.scenes.current.world?.player,path:window.__game.scenes.current.world?.path,dialog:window.__game.scenes.current.dialog,mini:window.__game.scenes.current.mini?.phase})'));
  throw new Error('Timed out: ' + expression);
}
async function key(code, key, hold = 70) {
  await call('Input.dispatchKeyEvent', { type: 'keyDown', code, key }); await wait(hold);
  await call('Input.dispatchKeyEvent', { type: 'keyUp', code, key }); await wait(80);
  await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
}
async function click(x, y) {
  const r = await evaluate('window.__game.canvas.getBoundingClientRect().toJSON()');
  const point = { x: r.x + x * r.width / 960, y: r.y + y * r.height / 540, button: 'left', clickCount: 1 };
  await call('Input.dispatchMouseEvent', { type: 'mousePressed', buttons: 1, ...point }); await wait(100);
  await call('Input.dispatchMouseEvent', { type: 'mouseReleased', buttons: 0, ...point });
  await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
}
async function shot(name) {
  await wait(300);
  const r = await call('Page.captureScreenshot', { format: 'png' });
  await writeFile(new URL('../tmp/' + name + '.png', import.meta.url), Buffer.from(r.data, 'base64'));
}
async function visit(id, useMap = false) {
  const s = getCampStation(id);
  assert.equal(await evaluate('window.__game.scenes.current.world.nextObjective.id'), id);
  if (useMap) await click(750 + (s.at[0] + 42) / 84 * 192, 350 + (s.at[1] + 32) / 64 * 143);
  else await key('KeyC', 'c');
  await until(`window.__game.scenes.current.world.near(${JSON.stringify(s)})`);
  if (!await evaluate('!!window.__game.scenes.current.dialog')) await key('Enter', 'Enter');
  await until(`window.__game.scenes.current.dialog?.id === ${JSON.stringify(id)}`);
  await key('Enter', 'Enter');
}
async function solveMini() {
  await until('!!window.__game.scenes.current.mini');
  await wait(250);
  const name = await evaluate('window.__game.scenes.current.mini.constructor.name');
  if (name === 'WeavingGame') {
    for (let i = 0; i < 8; i++) {
      if (await evaluate('window.__game.scenes.current.mini.phase === "between"')) await key('Enter', 'Enter');
      const n = await evaluate('window.__game.scenes.current.mini.order.indexOf(window.__game.scenes.current.mini.expected)+1');
      await key('Digit' + n, String(n));
    }
  } else {
    const mode = await evaluate('window.__game.scenes.current.mini.kind');
    if (mode === 'saw') await key('KeyC', 'c');
    for (let i = 0; i < 20 && await evaluate('window.__game.scenes.current.mini.phase') !== 'done'; i++) {
      await until('window.__game.scenes.current.mini.cooldown <= 0');
      if (mode === 'saw') {
        // Control the initial animation phase, but perform every action with real input.
        await evaluate('window.__game.scenes.current.mini.clock = Math.PI/3.6 - 0.04');
        await key('Enter', 'Enter');
      } else {
        const n = await evaluate('window.__game.scenes.current.mini.items[window.__game.scenes.current.mini.step].answer + 1');
        await key('Digit' + n, String(n));
      }
    }
  }
  await until('window.__game.scenes.current.mini.phase === "done"');
  await shot(name === 'WeavingGame' ? 'camp-weaving' : 'camp-craft');
  await key('Enter', 'Enter'); await until('window.__game.scenes.current.mini === null');
}

try {
  await call('Runtime.enable'); await call('Page.enable'); await call('Page.bringToFront');
  await call('Page.navigate', { url: 'http://localhost:8080/?start=play&level=1' });
  await wait(400); await until('!!window.__game && window.__game.scenes.currentName === "camp"');
  await evaluate('window.__game.scenes.set("menu");window.__game.save.reset();window.__game.scenes.set("camp")');
  await until('!!window.__game.scenes.current.viewer && !window.__game.scenes.current.loading');
  await key('Enter', 'Enter'); await until('window.__game.scenes.current.dialog === null');
  assert.ok(await evaluate('window.__game.scenes.current.viewer.renderer.getContext() instanceof WebGL2RenderingContext'));
  await shot('camp-overview');
  const start = await evaluate('window.__game.scenes.current.world.player.x');
  await key('ArrowRight', 'ArrowRight', 350);
  assert.ok(await evaluate('window.__game.scenes.current.world.player.x') > start);
  await key('Space', ' ');
  assert.equal(await evaluate('window.__game.audio.music.theme'), 'desert');
  for (const s of CAMP_STATIONS) {
    await visit(s.id, s.id === 'silver_family');
    if (s.kind === 'weaving' || s.kind === 'packing') await solveMini();
    if (s.kind === 'timber') {
      assert.ok(await evaluate('window.__game.scenes.current.world.carrying'));
      await shot('camp-carrying');
      await call('Page.reload'); await wait(400);
      await until('!!window.__game?.scenes.current.world && !!window.__game.scenes.current.viewer');
      assert.ok(await evaluate('window.__game.scenes.current.world.carrying'));
      await visit('carpenter');
      await key('Escape', 'Escape');
      await until('window.__game.scenes.current.mini === null');
      assert.ok(await evaluate('window.__game.scenes.current.world.delivered'));
      await key('Enter', 'Enter');
      await until('window.__game.scenes.current.dialog?.id === "carpenter"');
      await key('Enter', 'Enter');
      await solveMini();
    }
    await until(`window.__game.scenes.current.world.done.has(${JSON.stringify(s.id)})`);
    console.log('PASS physical visit and reward: ' + s.id);
  }
  assert.equal(await evaluate('window.__game.scenes.current.world.materials.size'), 15);
  assert.equal(await evaluate('window.__game.save.data.totalDonations'), 15);
  await shot('camp-donations-ready');
  await evaluate('window.__campView = window.__game.scenes.current.viewer');
  await visit('warehouse');
  await until('window.__game.scenes.currentName === "summary"');
  assert.ok(await evaluate('window.__campView.disposed'));
  assert.ok(await evaluate('window.__game.save.hasRelic("tavnit")'));
  assert.equal(await evaluate('window.__game.save.data.unlocked'), 2);
  await shot('camp-summary');
  await evaluate('window.__game.scenes.set("construction")');
  assert.equal(await evaluate('window.__game.scenes.current.personal.size'), 15);
  fallbackScript = (await call('Page.addScriptToEvaluateOnNewDocument', { source: `const original=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(type,...args){return type.includes("webgl")?null:original.call(this,type,...args);};` })).identifier;
  await call('Page.navigate', { url: 'http://localhost:8080/?start=play&level=1' });
  await wait(400); await until('!!window.__game?.scenes.current.world && !window.__game.scenes.current.loading');
  assert.equal(await evaluate('window.__game.scenes.current.viewer'), null);
  assert.equal(await evaluate('window.__game.scenes.current.world.materials.size'), 15);
  await shot('camp-no-webgl');
  await call('Emulation.setDeviceMetricsOverride', { width: 1100, height: 760, deviceScaleFactor: 1, mobile: false });
  await key('Escape', 'Escape'); assert.ok(await evaluate('window.__game.scenes.current.paused'));
  await key('Escape', 'Escape'); assert.equal(await evaluate('window.__game.scenes.current.paused'), false);
  assert.equal(errors.length, 0, JSON.stringify(errors));
  console.log('PASS complete camp using real navigation/input; all 15 materials, crafts, carrying reload, stage 2 inventory, fallback and resize. No uncaught exceptions.');
} finally {
  if (fallbackScript) await call('Page.removeScriptToEvaluateOnNewDocument', { identifier: fallbackScript }).catch(() => {});
  ws.close();
}
