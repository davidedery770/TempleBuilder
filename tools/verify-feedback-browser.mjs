// Run ONLY against a disposable Edge profile with --mute-audio on port 9234.
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
    const n = ++id;
    const timer = setTimeout(() => { pending.delete(n); reject(new Error(method + ' timed out')); }, 10000);
    pending.set(n, { resolve, reject, timer }); ws.send(JSON.stringify({ id: n, method, params }));
  });
}
async function evaluate(expression) {
  const r = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
}
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function ready(query) {
  await call('Page.navigate', { url: 'http://localhost:8080/' + query });
  await wait(350);
  for (let i = 0; i < 100; i++) {
    if (await evaluate('!!window.__game')) {
      await evaluate('__game.loop.stop();__game.audio.voice.enabled=false;__game.audio.voice.clear();__game.audio.music.stop();__game._render()');
      await wait(550); // Wait for the loading overlay's CSS fade/removal, not game time.
      return;
    }
    await wait(100);
  }
  throw new Error('Game did not boot');
}
async function shot(name) {
  await evaluate('__game._render()');
  const r = await call('Page.captureScreenshot', { format: 'png' });
  await writeFile(new URL('../tmp/' + name + '.png', import.meta.url), Buffer.from(r.data, 'base64'));
}
async function key(code, key) {
  await call('Input.dispatchKeyEvent', { type: 'keyDown', code, key });
  await evaluate('__game._update(1/60)');
  await call('Input.dispatchKeyEvent', { type: 'keyUp', code, key });
  await evaluate('__game._update(1/60)');
}
try {
  await call('Runtime.enable'); await call('Page.enable'); await call('Page.bringToFront');
  await ready('?start=menu');
  // Fixture changes only this disposable browser's save, never personal data.
  await evaluate('__game.save.reset();__game.scenes.current.enter()');
  assert.equal(await evaluate('__game.scenes.current.items.length'), 3);
  await shot('journey-menu');
  await evaluate('__game.save.addRelic("tavnit");__game.save.unlockLevel(4);__game.scenes.current.enter()');
  assert.equal(await evaluate('__game.scenes.current.items.length'), 4);
  await shot('journey-menu-returning');
  console.log('PASS muted Edge: whole-game two-dimensional journey renders behind menu controls.');

  await ready('?start=play&level=1');
  await evaluate('__game.scenes.current.npcs.forEach(n=>n.talked=true)');
  const idle = await evaluate(`(() => {
    const g=__game,s=g.scenes.current,ys=[],states=new Set();
    for(let i=0;i<360;i++){g._update(1/60);if(i>30){ys.push(s.player.y);states.add(s.player.state);}}
    return {min:Math.min(...ys),max:Math.max(...ys),states:[...states]};
  })()`);
  assert.equal(idle.min, idle.max); assert.deepEqual(idle.states, ['idle']);
  await shot('dima-idle');
  const standing = await evaluate('__game.scenes.current.player.getShadow(__game.scenes.current.map)');
  await call('Input.dispatchKeyEvent', { type: 'keyDown', code: 'Space', key: ' ' });
  await evaluate('for(let i=0;i<8;i++)__game._update(1/60)');
  const jumping = await evaluate('__game.scenes.current.player.getShadow(__game.scenes.current.map)');
  assert.equal(jumping.y, standing.y); assert.ok(jumping.rx < standing.rx);
  await shot('dima-jump-shadow');
  await call('Input.dispatchKeyEvent', { type: 'keyUp', code: 'Space', key: ' ' });
  console.log('PASS muted Edge: idle remains stable and jumping shadow stays on the floor.');

  await evaluate(`(() => {
    const s=__game.scenes.current,p=s.player,e=s.enemies[0];
    p.x=100;p.y=480-p.h-0.01;p.vx=p.vy=0;p.onGround=true;p.facing=1;p.health=5;p._invuln=0;
    e.x=130;e.y=480-e.h-0.01;e.vx=e.vy=0;
    s.enemies=[e];__game.camera.snapTo(p.centerX,p.centerY);
  })()`);
  await key('KeyZ', 'z');
  assert.ok(await evaluate('__game.scenes.current.enemies[0].vanishing'));
  await shot('dima-enemy-fading');
  await evaluate('for(let i=0;i<60;i++)__game._update(1/60)');
  assert.ok(await evaluate('__game.scenes.current.enemies[0].gone'));
  await evaluate('__game.scenes.current.player.respawn();__game.scenes.current._calmEnemiesNear(130)');
  assert.ok(await evaluate('__game.scenes.current.enemies[0].gone'));
  await shot('dima-enemy-gone');
  console.log('PASS muted Edge: real Z starts a harmless fade; obstacle stays gone after respawn.');

  await evaluate(`(() => {
    const s=__game.scenes.current,p=s.player,st=s.stations[0];
    p.x=st.x;p.y=480-p.h-0.01;p.vx=p.vy=0;p.onGround=true;
    __game.camera.snapTo(p.centerX,p.centerY);
    for(let i=0;i<20;i++)__game._update(1/60);
  })()`);
  assert.equal(await evaluate('__game.scenes.current.mini?.constructor.name'), 'TriviaGame');
  // Let the mini-game's opening-key guard expire before testing real Escape.
  await evaluate('for(let i=0;i<12;i++)__game._update(1/60)');
  await shot('dima-auto-quiz');
  await key('Escape', 'Escape');
  await evaluate('for(let i=0;i<90;i++)__game._update(1/60)');
  assert.equal(await evaluate('__game.scenes.current.mini'), null);
  await key('Enter', 'Enter');
  assert.equal(await evaluate('__game.scenes.current.mini?.constructor.name'), 'TriviaGame');
  console.log('PASS muted Edge: automatic quiz, Escape without auto-reopen, explicit Enter retry.');

  await evaluate(`(() => {
    __game.scenes.set('summary',{levelId:1,score:13800,materials:15,stations:1,maxStations:4,
      sparks:2,maxSparks:3,time:462,cards:['moshe','terumah','materials15']});
    __game.scenes.current.shownScore=13800;__game._update(1/60);
  })()`);
  await shot('dima-summary');
  const layouts = await evaluate(`(async () => {
    const {CODEX}=await import('./src/data/codex.js');
    const {summaryTextPages}=await import('./src/scenes/summary.js');
    return CODEX.map(card=>({id:card.id,pages:summaryTextPages(__game.ctx,card.body,816)}));
  })()`);
  assert.ok(layouts.every(l => l.pages.every(p => p.length <= 3)));
  await evaluate(`(() => {
    const s=__game.scenes.current;
    s.cards[0]={...s.cards[0],body:Array(4).fill(s.cards[0].body).join(' ')};
    s._pageCache=null;__game._update(1/60);
  })()`);
  await key('ArrowDown', 'ArrowDown');
  assert.equal(await evaluate('__game.scenes.current.cardPage'), 1);
  await shot('dima-summary-long-page');
  await key('ArrowLeft', 'ArrowLeft');
  assert.equal(await evaluate('__game.scenes.current.cardIndex'), 1);
  assert.equal(await evaluate('__game.scenes.current.cardPage'), 0);
  assert.equal(errors.length, 0, JSON.stringify(errors));
  console.log('PASS muted Edge: readable summary, all text fits, long-content paging, no JavaScript exceptions.');
} finally {
  await evaluate('if(window.__game){__game.loop.stop();__game.audio.voice.clear();__game.audio.music.stop();__game.audio.ctx?.suspend()}').catch(() => {});
  ws.close();
}
