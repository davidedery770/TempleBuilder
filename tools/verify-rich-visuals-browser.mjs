// Disposable browser on 9234 with --mute-audio; never use a personal profile.
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
async function steps(n) { await evaluate(`for(let i=0;i<${n};i++)__game._update(1/60)`); }
async function frame() { await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))'); }
async function shot(name) {
  await evaluate('__game._render()'); await frame();
  const r = await call('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
  await writeFile(new URL('../tmp/rich-' + name + '.jpg', import.meta.url), Buffer.from(r.data, 'base64'));
}
async function scene(name, params = {}) {
  await evaluate(`__game.scenes._fadeDir=0;__game.scenes._fade=0;__game.scenes._pending=null;__game.scenes.set(${JSON.stringify(name)},${JSON.stringify(params)})`);
  await steps(1);
}
async function key(code, key, count = 1) {
  await call('Input.dispatchKeyEvent', { type: 'keyDown', code, key }); await steps(count);
  await call('Input.dispatchKeyEvent', { type: 'keyUp', code, key }); await steps(1);
}
async function touchCanvas(x, y) {
  const p = await evaluate(`(() => {const r=__game.canvas.getBoundingClientRect();return {x:r.x+${x}*r.width/960,y:r.y+${y}*r.height/540};})()`);
  await frame();
  await call('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...p, id: 1 }] }); await wait(50); await steps(1);
  await call('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await wait(50); await steps(40);
}
try {
  await call('Runtime.enable'); await call('Page.enable'); await call('Page.bringToFront');
  await call('Page.navigate', { url: 'http://localhost:8080/?start=menu' });
  await wait(400); await until('!!window.__game');
  await evaluate('__game.loop.stop();__game.audio.voice.enabled=false;__game.audio.voice.clear();__game.audio.music.stop();__game.save.reset();__game.scenes.current.enter()');
  await until('!!__game.scenes.current.art'); await wait(550);
  const difference = () => evaluate(`(() => {
    const g=__game,s=g.scenes.current;s.t=0;g._render();
    const a=g.ctx.getImageData(0,0,g.canvas.width,g.canvas.height).data;
    s.t=8;g._render();const b=g.ctx.getImageData(0,0,g.canvas.width,g.canvas.height).data;
    let changed=0;for(let i=0;i<a.length;i+=4)if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2])changed++;
    return changed;
  })()`);
  assert.ok(await difference() > 30, 'the actual home canvas must change between animation frames');
  await evaluate('__game.scenes.current.t=0'); await shot('home-frame-0');
  await evaluate('__game.scenes.current.t=8'); await shot('home-frame-8');
  await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  assert.equal(await difference(), 0, 'reduced-motion home must be static');
  await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  console.log('PASS rich home: real animation between frames; zero changes under reduced-motion preference.');

  await scene('levels', { focus: 1 }); await until('!!__game.scenes.current.art.camp');
  await shot('levels-new');
  await key('ArrowLeft', 'ArrowLeft'); assert.equal(await evaluate('__game.scenes.current.index'), 1);
  await key('Enter', 'Enter'); assert.equal(await evaluate('__game.scenes.currentName'), 'levels', 'locked stage 2 stays locked');
  await evaluate('__game.save.unlockLevel(4);__game.save.addRelic("tavnit");__game.save.recordScore(1,13800)');
  await scene('levels', { focus: 1 }); await shot('levels-completed');
  await scene('levels', { focus: 14 }); await shot('levels-future');
  await key('Enter', 'Enter'); assert.equal(await evaluate('__game.scenes.currentName'), 'levels');
  console.log('PASS parchment levels: real chapter/card data, completed state, locks and future stages remain intact.');

  await scene('play', { levelId: 1 }); await until('!!__game.scenes.current.scenery.mountains');
  await evaluate('__game.scenes.current.npcs.forEach(n=>n.talked=true)');
  await steps(30); await evaluate('__game.scenes.current.hud._banner=null');
  const initial = await evaluate('({x:__game.scenes.current.player.x,y:__game.scenes.current.player.y})');
  await shot('camp-start');
  await key('ArrowRight', 'ArrowRight', 25);
  assert.ok(await evaluate('__game.scenes.current.player.x') > initial.x + 40);
  await key('Space', ' ', 8);
  assert.ok(await evaluate('__game.scenes.current.player.y') < initial.y - 30);
  await shot('camp-jump');
  await evaluate(`(() => {
    const s=__game.scenes.current;s.player.x=1600;s.player.y=374;s.player.vx=s.player.vy=0;
    __game.camera.snapTo(s.player.centerX,s.player.centerY);
  })()`);
  await steps(20); await shot('camp-along-route');
  console.log('PASS camp: illustrated mountains and code-drawn camp render; real running and jumping stay functional.');

  await call('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, mobile: true, deviceScaleFactor: 2 });
  await call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await evaluate('__game.touch.enabled=true;__game.touch._sync()');
  await scene('levels', { focus: 2 }); await shot('levels-phone');
  const card = await evaluate('__game.scenes.current._cardRect(1)');
  await touchCanvas(card.x + card.w / 2, card.y + card.h / 2);
  assert.equal(await evaluate('__game.scenes.currentName'), 'construction');
  await scene('play', { levelId: 1 }); await shot('camp-phone');
  assert.ok(await evaluate('__game.touch.enabled && __game.scenes.current.map.tilePainter'));
  assert.equal(errors.length, 0, JSON.stringify(errors));
  console.log('PASS phone: parchment card enters workshop via touch; new camp art keeps mobile controls; no JS exceptions.');
} finally {
  await evaluate('if(window.__game){__game.loop.stop();__game.touch.releaseAll();__game.audio.voice.clear();__game.audio.music.stop();__game.audio.ctx?.suspend()}').catch(() => {});
  ws.close();
}
