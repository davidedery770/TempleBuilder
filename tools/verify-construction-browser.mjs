/**
 * Requires tools/serve.mjs on 8080 and an ISOLATED headless Edge test profile
 * with --remote-debugging-port=9223. Never target a personal browser profile.
 * node tools/verify-construction-browser.mjs
 */
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { BUILD_PARTS, canPlace, targetPoint } from '../src/data/level02.js';

const tabs = await (await fetch('http://127.0.0.1:9223/json/list')).json();
const tab = tabs.find(t => t.type === 'page' && t.url.startsWith('http://localhost:8080/'));
assert.ok(tab, 'Open the game in the isolated verification browser first');
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let seq = 0;
const pending = new Map(), errors = [];
ws.onmessage = event => {
  const message = JSON.parse(event.data);
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
  if (message.id) {
    const task = pending.get(message.id);
    if (task) {
      pending.delete(message.id);
      clearTimeout(task.timer);
      if (message.error) task.reject(new Error(JSON.stringify(message.error)));
      else task.resolve(message.result);
    }
  }
};
function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 10000);
    pending.set(id, { resolve, reject, timer });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function ready() {
  for (let i = 0; i < 60; i++) {
    if (await evaluate('!!window.__game && window.__game.scenes.currentName === "construction"')) return;
    await delay(100);
  }
  throw new Error('Workshop did not boot');
}
async function screenshot(name) {
  const image = await call('Page.captureScreenshot', { format: 'png' });
  await writeFile(new URL(`../tmp/${name}.png`, import.meta.url), Buffer.from(image.data, 'base64'));
}
async function mouse(type, x, y) {
  const box = await evaluate(`(() => { const r = window.__game.canvas.getBoundingClientRect(); return { x:r.left,y:r.top,w:r.width,h:r.height }; })()`);
  await call('Input.dispatchMouseEvent', {
    type, x: box.x + x * box.w / 960, y: box.y + y * box.h / 540,
    button: type === 'mouseMoved' ? 'none' : 'left',
    buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1,
  });
  await delay(65);
  await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
}
async function drag(part, wrong = false) {
  const row = await evaluate(`(() => {
    const s = window.__game.scenes.current;
    return s._row(s.options.findIndex(p => p.id === ${JSON.stringify(part.id)}));
  })()`);
  const point = wrong ? { x: 70, y: 180 } : targetPoint(part);
  await mouse('mousePressed', row.x + 35, row.y + 12);
  await mouse('mouseMoved', point.x, point.y);
  await mouse('mouseReleased', point.x, point.y);
}

try {
  await call('Runtime.enable');
  await call('Page.enable'); await call('Page.bringToFront');
  await call('Page.navigate', { url: 'http://localhost:8080/?start=play&level=2' });
  await delay(500);
  await ready();
  // This is a dedicated disposable test profile; do not change a user's real save.
  await evaluate('window.__game.save.reset(); window.__game.scenes.set("construction")');
  await screenshot('construction-start');
  await drag(BUILD_PARTS[0], true);
  assert.equal(await evaluate('window.__game.scenes.current.placed.size'), 0);
  await drag(BUILD_PARTS[0]);
  assert.equal(await evaluate('window.__game.scenes.current.placed.size'), 1);
  await call('Page.reload');
  await delay(500); await ready();
  assert.equal(await evaluate('window.__game.scenes.current.placed.has("bases")'), true);
  const placed = new Set(['bases']);
  while (placed.size < BUILD_PARTS.length) {
    const p = BUILD_PARTS.find(p => !placed.has(p.id) && canPlace(p, placed));
    assert.ok(p);
    await drag(p);
    placed.add(p.id);
    assert.equal(await evaluate('window.__game.scenes.current.placed.size'), placed.size, p.id);
    if (p.id === 'menorah') await screenshot('construction-vessels');
  }
  await screenshot('construction-complete');
  assert.equal(await evaluate('window.__game.save.hasRelic("adanim")'), true);
  assert.equal(await evaluate('window.__game.save.data.unlocked'), 3);
  await mouse('mousePressed', 710, 510);
  await mouse('mouseReleased', 710, 510);
  await delay(700);
  assert.equal(await evaluate('window.__game.scenes.currentName'), 'summary');
  await screenshot('construction-summary');
  assert.equal(errors.length, 0, JSON.stringify(errors));
  console.log('PASS Edge: wrong drop, 19 real drags, reload/resume, rewards, summary, no JavaScript exceptions.');
  console.log('Screenshots: tmp/construction-{start,vessels,complete,summary}.png');
} finally {
  ws.close();
}
