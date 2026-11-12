/** Requires an isolated WebGL-enabled Edge profile on debug port 9223. */
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { BUILD_PARTS } from '../src/data/level02.js';
const tabs = await (await fetch('http://127.0.0.1:9223/json/list')).json();
const tab = tabs.find(t => t.type === 'page' && t.url.startsWith('http://localhost:8080/'));
assert.ok(tab);
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let seq = 0;
const pending = new Map(), errors = [];
ws.onmessage = event => {
  const m = JSON.parse(event.data);
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails);
  const p = pending.get(m.id);
  if (p) {
    pending.delete(m.id); clearTimeout(p.timer);
    if (m.error) p.reject(new Error(JSON.stringify(m.error))); else p.resolve(m.result);
  }
};
const call = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++seq;
  const timer = setTimeout(() => { pending.delete(id); reject(new Error(method + ' timeout')); }, 20000);
  pending.set(id, { resolve, reject, timer });
  ws.send(JSON.stringify({ id, method, params }));
});
async function evaluate(expression) {
  const r = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
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
async function mouse(type, x, y) {
  const r = await evaluate('window.__game.canvas.getBoundingClientRect().toJSON()');
  await call('Input.dispatchMouseEvent', {
    type, x: r.left + x * r.width / 960, y: r.top + y * r.height / 540,
    button: type === 'mouseMoved' ? 'none' : 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1,
  });
  await wait(90);
  await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
}
async function click(x, y) { await mouse('mousePressed', x, y); await mouse('mouseReleased', x, y); }
async function shot(name) {
  await wait(500);
  const r = await call('Page.captureScreenshot', { format: 'png' });
  await writeFile(new URL('../tmp/' + name + '.png', import.meta.url), Buffer.from(r.data, 'base64'));
}
try {
  await call('Runtime.enable');
  await call('Page.enable'); await call('Page.bringToFront');
  await call('Page.navigate', { url: 'http://localhost:8080/?start=play&level=2' });
  await wait(400); await until('!!window.__game');
  // Save resets are confined to this dedicated disposable browser profile.
  await evaluate('window.__game.save.reset();window.__game.scenes.set("construction")');
  assert.equal(await evaluate('performance.getEntriesByType("resource").filter(e=>e.name.includes("/vendor/three/")).length'), 0);
  await click(110, 125);
  await until('window.__game.scenes.current.viewMode === "3d"');
  await wait(800);
  assert.ok(await evaluate('window.__game.scenes.current.viewer3d.renderer.getContext() instanceof WebGL2RenderingContext'));
  assert.ok(await evaluate('window.__game.scenes.current.viewer3d.renderer.info.render.triangles') > 0);
  await shot('construction3d-start');
  const azimuth = await evaluate('window.__game.scenes.current.viewer3d.azimuth');
  await mouse('mousePressed', 250, 260); await mouse('mouseMoved', 340, 290); await mouse('mouseReleased', 340, 290);
  assert.notEqual(await evaluate('window.__game.scenes.current.viewer3d.azimuth'), azimuth);
  assert.equal(await evaluate('window.__game.scenes.current.failedPlacements.size'), 0);
  assert.equal(await evaluate('window.__game.scenes.current.placed.size'), 0);
  const distance = await evaluate('window.__game.scenes.current.viewer3d.distance');
  await click(120, 470);
  assert.ok(await evaluate('window.__game.scenes.current.viewer3d.distance') < distance);
  await click(320, 470); // Restore the full-court camera before building.
  await evaluate(`(() => {
    const s=window.__game.scenes.current;
    for(let i=0;i<3;i++)s.tryPlace(s.selected,40,157);
  })()`);
  await until('window.__game.scenes.current.viewer3d.ghostId === "bases"');

  for (const part of BUILD_PARTS) {
    const data = await evaluate(`(() => {
      const s=window.__game.scenes.current,id=${JSON.stringify(part.id)};
      return {row:s._row(s.options.findIndex(p=>p.id===id)), target:s.viewer3d.projectPart(id)};
    })()`);
    assert.ok(data.row && data.target);
    await mouse('mousePressed', data.row.x + 30, data.row.y + 12);
    await until(`window.__game.scenes.current.drag?.part.id === ${JSON.stringify(part.id)}`);
    await mouse('mouseMoved', 25 + data.target.x, 142 + data.target.y);
    await mouse('mouseReleased', 25 + data.target.x, 142 + data.target.y);
    await until('window.__game.scenes.current.drag === null');
    const placed = await evaluate(`window.__game.scenes.current.placed.has(${JSON.stringify(part.id)})`);
    if (!placed) console.log(await evaluate(`JSON.stringify({
      feedback:window.__game.scenes.current.feedback,
      drag:window.__game.scenes.current.drag?.part.id,
      mode:window.__game.scenes.current.viewMode,
      point:window.__game.input.pointer,
      failures:[...window.__game.scenes.current.failedPlacements]
    })`));
    assert.ok(placed, part.id);
    if (part.id === 'north') await shot('construction3d-boards');
    if (part.id === 'menorah') {
      await click(230, 470);
      await shot('construction3d-vessels');
      await click(320, 470);
    }
  }
  await wait(800);
  assert.equal(await evaluate('window.__game.scenes.current.complete'), true);
  assert.equal(await evaluate('[...window.__game.scenes.current.viewer3d.groups.values()].filter(g=>g.visible).length'), 19);
  await shot('construction3d-court');
  await click(430, 470); // Exterior.
  assert.equal(await evaluate('window.__game.scenes.current.viewer3d.cutaway'), false);
  await shot('construction3d-exterior');
  await click(430, 470); await click(230, 470);
  await shot('construction3d-interior');
  await click(110, 125);
  await until('window.__game.scenes.current.viewMode === "plan"');
  assert.equal(await evaluate('window.__game.scenes.current.viewMode'), 'plan');
  assert.equal(await evaluate('window.__game.scenes.current.placed.size'), 19);
  await click(110, 125);
  await until('window.__game.scenes.current.viewMode === "3d"');
  await call('Emulation.setDeviceMetricsOverride', { width: 1100, height: 760, deviceScaleFactor: 1, mobile: false });
  await wait(500);
  assert.equal(await evaluate('window.__game.scenes.current.viewMode'), '3d');
  await evaluate('window.__retiredView=window.__game.scenes.current.viewer3d;window.__game.scenes.set("levels",{focus:2})');
  assert.equal(await evaluate('window.__retiredView.disposed'), true);
  await evaluate('window.__game.scenes.set("construction")');
  assert.equal(await evaluate('window.__game.scenes.current.complete'), true);
  await click(110, 125); await until('window.__game.scenes.current.viewMode === "3d"');
  assert.equal(await evaluate('window.__game.scenes.current.placed.size'), 19);
  await shot('construction3d-restored');
  await evaluate('window.__game.scenes.current.viewer3d.canvas.dispatchEvent(new Event("webglcontextlost",{cancelable:true}))');
  await until('window.__game.scenes.current.viewMode === "plan"');
  assert.equal(await evaluate('window.__game.scenes.current.placed.size'), 19);
  await evaluate(`window.__game.scenes.set("levels");
    window.__originalContext=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(type,...args){
      if(type==="webgl2"||type==="webgl"||type==="experimental-webgl")return null;
      return window.__originalContext.call(this,type,...args);
    };
    window.__game.scenes.set("construction");`);
  await click(110, 125); await until('!window.__game.scenes.current.loading3d');
  assert.equal(await evaluate('window.__game.scenes.current.viewMode'), 'plan');
  assert.equal(await evaluate('window.__game.scenes.current.placed.size'), 19);
  assert.ok(await evaluate('window.__game.scenes.current.feedback.includes("אפשר להמשיך")'));
  await evaluate('HTMLCanvasElement.prototype.getContext=window.__originalContext');
  await shot('construction3d-fallback');
  const earned = await evaluate('JSON.stringify((({construction,...rest})=>rest)(window.__game.save.data))');
  await click(325, 510);
  await until('window.__game.scenes.current.rebuildConfirm');
  await shot('construction-rebuild-confirm');
  await click(350, 342);
  await until('!window.__game.scenes.current.rebuildConfirm');
  assert.equal(await evaluate('window.__game.scenes.current.placed.size'), 19);
  await click(110, 125);
  await until('window.__game.scenes.current.viewMode === "3d"');
  await click(325, 510);
  await until('window.__game.scenes.current.rebuildConfirm');
  await click(600, 342);
  await until('window.__game.scenes.current.placed.size === 0');
  assert.equal(await evaluate('window.__game.scenes.current.viewMode'), '3d');
  assert.equal(await evaluate('[...window.__game.scenes.current.viewer3d.groups.values()].filter(g=>g.visible).length'), 0);
  assert.equal(await evaluate('JSON.stringify((({construction,...rest})=>rest)(window.__game.save.data))'), earned);
  assert.equal(await evaluate('window.__game.save.data.construction.completed'), false);
  await shot('construction3d-rebuild');
  const base = await evaluate('window.__game.scenes.current.viewer3d.projectPart("bases")');
  await mouse('mousePressed', 680, 137);
  await until('window.__game.scenes.current.drag?.part.id === "bases"');
  await mouse('mouseMoved', 25 + base.x, 142 + base.y);
  await mouse('mouseReleased', 25 + base.x, 142 + base.y);
  await until('window.__game.scenes.current.placed.has("bases")');
  await call('Page.reload'); await wait(500);
  await until('!!window.__game && window.__game.scenes.current.placed?.has("bases")');
  assert.equal(await evaluate('window.__game.scenes.current.placed.size'), 1);
  assert.equal(await evaluate('JSON.stringify((({construction,...rest})=>rest)(window.__game.save.data))'), earned);
  assert.equal(errors.length, 0, JSON.stringify(errors));
  console.log('PASS Edge WebGL2: lazy local loading, real 3D triangles, orbit/zoom, 19 pointer drops, exterior/cutaway, resize, persistence, disposal, no-WebGL fallback.');
  console.log('Screenshots: tmp/construction3d-*.png. No uncaught JavaScript exceptions.');
  console.log('PASS rebuild cancellation/confirmation, empty 3D model, preserved achievements, and partial rebuild after reload.');
} finally { ws.close(); }
