// Dedicated disposable Edge on 9234, forcibly muted by the launcher.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const tabs = await (await fetch('http://127.0.0.1:9234/json/list')).json();
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
    const n = ++id, timer = setTimeout(() => { pending.delete(n); reject(new Error(method + ' timed out')); }, 10000);
    pending.set(n, { resolve, reject, timer }); ws.send(JSON.stringify({ id: n, method, params }));
  });
}
async function evaluate(expression) {
  const r = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
}
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(expression) {
  for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await wait(100); }
  throw new Error('Timed out: ' + expression);
}
async function steps(n = 1) { await evaluate(`for(let i=0;i<${n};i++)__game._update(1/60)`); }
async function frame() { await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))'); }
async function shot(name) {
  await evaluate('__game._render()'); await frame();
  const r = await call('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
  await writeFile(new URL('../tmp/entry-' + name + '.jpg', import.meta.url), Buffer.from(r.data, 'base64'));
}
async function key(code, key) {
  await call('Input.dispatchKeyEvent', { type: 'keyDown', code, key }); await steps();
  await call('Input.dispatchKeyEvent', { type: 'keyUp', code, key }); await steps();
}
async function menu() {
  await evaluate('__game.scenes._pending=null;__game.scenes._fadeDir=0;__game.scenes._fade=0;__game.scenes.set("menu")');
  await steps(); await frame();
}
async function phone(width, height) {
  await call('Emulation.setDeviceMetricsOverride', { width, height, mobile: true, deviceScaleFactor: 2 });
  await call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await evaluate('__game.touch.enabled=true;__game.touch._sync()');
  await menu();
}
async function touchButton(index) {
  await frame();
  const p = await evaluate(`(() => {
    const r=document.querySelector('[data-menu-index="${index}"]').getBoundingClientRect();
    return {x:r.x+r.width/2,y:r.y+r.height/2};
  })()`);
  await call('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...p, id: 1 }] });
  await wait(60);
  await call('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await wait(120); await steps(40);
}
async function touchLayout() {
  const layout = await evaluate(`(() => {
    const c=__game.canvas.getBoundingClientRect();
    return [...document.querySelectorAll('#entry-menu-controls button')].map(el=>{
      const r=el.getBoundingClientRect();
      return {w:r.width,h:r.height,x:r.x,y:r.y,
        overlaps:r.x<c.right&&r.right>c.left&&r.y<c.bottom&&r.bottom>c.top};
    });
  })()`);
  for (const r of layout) assert.ok(r.w >= 90 && r.h >= 44 && !r.overlaps, JSON.stringify(r));
}
try {
  await call('Runtime.enable'); await call('Page.enable'); await call('Page.bringToFront');
  await call('Page.navigate', { url: 'http://localhost:8080/?start=menu' });
  await wait(400); await until('!!window.__game');
  await evaluate('__game.loop.stop();__game.save.reset();__game.scenes.current.enter()');
  await until('!!__game.scenes.current.art'); await wait(550);
  assert.equal(await evaluate('__game.scenes.current.art.naturalWidth'), 1600);
  await shot('desktop');
  const primary = await evaluate(`(() => {
    const r=__game.scenes.current._itemRect(0),c=__game.canvas.getBoundingClientRect();
    return {x:c.x+(r.x+r.w/2)*c.width/960,y:c.y+(r.y+r.h/2)*c.height/540};
  })()`);
  await call('Input.dispatchMouseEvent', { type: 'mousePressed', ...primary, button: 'left', clickCount: 1 });
  await call('Input.dispatchMouseEvent', { type: 'mouseReleased', ...primary, button: 'left', clickCount: 1 });
  await steps(40); assert.equal(await evaluate('__game.scenes.currentName'), 'levels');
  await menu(); await key('ArrowDown', 'ArrowDown'); await key('ArrowDown', 'ArrowDown'); await key('Enter', 'Enter');
  await steps(40); assert.equal(await evaluate('__game.scenes.currentName'), 'museum');
  await evaluate('__game.save.addRelic("tavnit");__game.save.unlockLevel(4)');
  await menu(); assert.equal(await evaluate('__game.scenes.current.items.length'), 4);
  await shot('desktop-returning');
  console.log('PASS illustrated desktop: real art loaded, start click, keyboard museum, returning-player menu.');

  await phone(390, 844); await touchLayout(); await shot('phone-portrait');
  await touchButton(0); assert.equal(await evaluate('__game.scenes.currentName'), 'levels');
  assert.ok(await evaluate('__game.scenes.scenes.get("menu").touchMenu.hidden'));
  assert.ok(await evaluate('!document.body.classList.contains("tb-entry-menu")'));
  const ratio = await evaluate('__game.canvas.height/__game.canvas.width');
  assert.ok(Math.abs(ratio - 540 / 960) < 0.005, 'ordinary scenes restore the full game canvas');
  await menu(); await touchButton(2); assert.equal(await evaluate('__game.scenes.currentName'), 'museum');
  console.log('PASS illustrated phone portrait: large native touch controls, working continue/museum, overlay removed on exit.');

  await phone(844, 390); await touchLayout(); await shot('phone-landscape');
  await touchButton(1); assert.equal(await evaluate('__game.scenes.currentName'), 'levels');
  await menu();
  const before = await evaluate('JSON.stringify(__game.save.data)');
  await steps(60); await evaluate('__game._render()');
  assert.equal(await evaluate('JSON.stringify(__game.save.data)'), before);
  assert.equal(errors.length, 0, JSON.stringify(errors));
  console.log('PASS illustrated phone landscape: readable artwork and touch buttons, level selection, no save mutation or JS exceptions.');
} finally {
  await evaluate('if(window.__game){__game.loop.stop();__game.audio.voice.clear();__game.audio.music.stop();__game.audio.ctx?.suspend()}').catch(() => {});
  ws.close();
}
