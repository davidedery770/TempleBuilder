// Dedicated disposable browser on 9234, always launched with --mute-audio.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const tabs = await (await fetch('http://127.0.0.1:9234/json/list')).json();
const tab = tabs.find(t => t.type === 'page' && t.url.startsWith('http://localhost:8080/'));
assert.ok(tab);
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let id = 0;
const pending = new Map(), errors = [], badMedia = [];
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails);
  if (m.method === 'Network.responseReceived' && m.params.response.status >= 400
      && m.params.response.url.includes('/audio/')) badMedia.push(m.params.response.url);
  if (m.id && pending.has(m.id)) {
    const p = pending.get(m.id); pending.delete(m.id); clearTimeout(p.timer);
    if (m.error) p.reject(new Error(JSON.stringify(m.error))); else p.resolve(m.result);
  }
};
function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const n = ++id, timer = setTimeout(() => { pending.delete(n); reject(new Error(method + ' timed out')); }, 12000);
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
async function size(width, height) {
  await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2,
    mobile: true, screenWidth: width, screenHeight: height });
  await call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
}
let initialized = false;
async function ready(level = 1) {
  await touch('touchCancel', []).catch(() => {});
  if (!initialized) {
    await call('Page.navigate', { url: `http://localhost:8080/?start=play&level=${level}` });
    await wait(350); await until('!!window.__game');
    initialized = true;
  } else {
    await evaluate(`__game.scenes.set(${JSON.stringify(level === 2 ? 'construction' : 'play')},{levelId:${level}})`);
  }
  await call('Page.bringToFront');
  await evaluate('__game.loop.stop();__game.audio.voice.enabled=true;__game.audio.music.enabled=true');
  await steps(1); await wait(550);
}
async function steps(n) { await evaluate(`for(let i=0;i<${n};i++)__game._update(1/60)`); }
async function center(selector) {
  return evaluate(`(() => {
    const el=document.querySelector(${JSON.stringify(selector)}),r=el.getBoundingClientRect();
    if(!r.width||!r.height)throw Error('Invisible touch control: '+${JSON.stringify(selector)});
    return {x:r.x+r.width/2,y:r.y+r.height/2};
  })()`);
}
const touch = async (type, points) => {
  await call('Input.dispatchTouchEvent', { type, touchPoints: points.map(p => ({ radiusX: 4, radiusY: 4, ...p })) });
  await wait(50);
};
async function tap(selector) {
  const p = await center(selector);
  await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
  await touch('touchStart', [{ ...p, id: 1 }]); await touch('touchEnd', []); await steps(2);
}
async function canvasPoint(x, y) {
  return evaluate(`(() => {const r=__game.canvas.getBoundingClientRect();return {x:r.x+${x}*r.width/960,y:r.y+${y}*r.height/540};})()`);
}
async function tapCanvas(x, y) {
  const p = await canvasPoint(x, y);
  await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
  await touch('touchStart', [{ ...p, id: 1 }]); await steps(1);
  await touch('touchEnd', []); await steps(2);
}
async function shot(name) {
  await evaluate('__game._render()');
  const r = await call('Page.captureScreenshot', { format: 'png' });
  await writeFile(new URL('../tmp/mobile-' + name + '.png', import.meta.url), Buffer.from(r.data, 'base64'));
}
async function checkLayout() {
  const layout = await evaluate(`(() => {
    const c=__game.canvas.getBoundingClientRect();
    return [...document.querySelectorAll('#touch-pad button,#voice-toggle')].map(el=>{
      const r=el.getBoundingClientRect();return {action:el.dataset.action||'voice',x:r.x,y:r.y,w:r.width,h:r.height,
        overlaps:r.width>0&&r.height>0&&r.x<c.right&&r.right>c.left&&r.y<c.bottom&&r.bottom>c.top};
    }).filter(r=>r.w>0&&r.h>0);
  })()`);
  for (const r of layout) {
    assert.ok(r.w >= 44 && r.h >= 44, JSON.stringify(r));
    if(['left','right','jump','attack'].includes(r.action))assert.ok(r.overlaps,'world controls should overlay the maximized canvas: '+JSON.stringify(r));
    assert.ok(r.x >= 0 && r.y >= 0);
  }
}
const speaking = '__game.audio.voice.playing && __game.audio.voice.media?.currentTime>0.12';
try {
  await call('Runtime.enable'); await call('Network.enable'); await call('Page.enable');
  await call('Page.bringToFront'); await size(390, 844); await ready();
  assert.ok(await evaluate('__game.touch.enabled'));
  await evaluate('__game.scenes.current.npcs.forEach(n=>n.talked=true)');
  await steps(30); await checkLayout(); await shot('portrait');
  const x = await evaluate('__game.scenes.current.player.x');
  const right = await center('[data-action="right"]'), jump = await center('[data-action="jump"]');
  await touch('touchStart', [{ ...right, id: 10 }]); await steps(8);
  await touch('touchStart', [{ ...right, id: 10 }, { ...jump, id: 11 }]); await steps(6);
  assert.ok(await evaluate(`__game.input.down('right')&&__game.input.down('jump')&&__game.scenes.current.player.vy<0`));
  assert.ok(await evaluate('__game.scenes.current.player.x') > x + 15);
  await touch('touchEnd', [{ ...jump, id: 11 }]); await steps(1);
  assert.ok(await evaluate(`__game.input.down('right')&&!__game.input.down('jump')`));
  await touch('touchCancel', []); await steps(1);
  assert.equal(await evaluate('__game.input.axisX'), 0);
  await until('__game.audio.voice._primed && __game.audio.music._primed');
  console.log('PASS phone portrait: overlay controls, real two-finger walking+jumping, partial release and cancellation.');

  await size(844, 390); await evaluate('__game._resize()'); await steps(1); await checkLayout();
  await shot('landscape');
  await tap('[data-action="back"]');
  assert.ok(await evaluate('__game.scenes.current.paused && __game.touch.leftCluster.hidden'));
  await tap('[data-action="back"]'); assert.equal(await evaluate('__game.scenes.current.paused'), false);
  await evaluate(`(() => {
    const s=__game.scenes.current,p=s.player,e=s.enemies[0];
    p.x=100;p.y=480-p.h-0.01;p.vx=p.vy=0;p.onGround=true;p.facing=1;p._invuln=5;
    e.x=135;e.y=480-e.h-0.01;s.enemies=[e];
  })()`);
  await tap('[data-action="attack"]'); assert.ok(await evaluate('__game.scenes.current.enemies[0].vanishing'));
  await steps(40); assert.ok(await evaluate('__game.scenes.current.enemies[0].gone'));
  console.log('PASS phone landscape: safe layout, touch pause/resume and staff light instead of Z.');

  await ready(4);
  await evaluate(`(() => {
    const s=__game.scenes.current,p=s.player,f=s.fields.items[0];s.npcs.forEach(n=>n.talked=true);
    p.x=f.x+20;p.y=f.y+f.h-p.h-0.01;p.onGround=true;__game._update(1/60);
  })()`);
  await tap('[data-action="shofar"]');
  assert.ok(await evaluate('__game.scenes.current.fields.items[0].bent>0'), JSON.stringify(await evaluate(`({
    level:__game.scenes.current.meta.id,mode:__game.touch.mode,hasShofar:__game.scenes.current.hasShofar,
    held:[...__game.input.held],queue:[...__game.input._queue],pressed:[...__game.input.justPressed],
    dialog:__game.scenes.current.hud.dialogOpen,paused:__game.scenes.current.paused,
    pos:[__game.scenes.current.player.x,__game.scenes.current.player.y],cooldown:__game.scenes.current.fields.cooldown,
    viewport:[innerWidth,innerHeight,visualViewport.scale]
  })`)));
  console.log('PASS phone: touch shofar instead of X bends the nearby field.');

  await ready(1);
  await evaluate(`(() => {
    const s=__game.scenes.current,n=s.npcs[0];s.npcs.forEach(n=>n.talked=true);s.hud.showDialog(n.name,n.lines);__game._update(1/60);
  })()`);
  assert.ok(await evaluate('__game.touch.leftCluster.hidden'));
  await tap('[data-action="confirm"]'); await until(speaking);
  await evaluate('window.mobileVoiceElement=__game.audio.voice.media;__game.scenes.current.hud._dialogChars=10000');
  await tap('[data-action="confirm"]'); await until(speaking);
  assert.equal(await evaluate('__game.scenes.current.hud.dialog.page'), 1);
  assert.ok(await evaluate('__game.audio.voice.media===window.mobileVoiceElement'));
  const enabled = await evaluate('__game.audio.music.enabled');
  await tap('#voice-toggle'); assert.equal(await evaluate('__game.audio.voice.enabled'), false);
  assert.equal(await evaluate('__game.audio.music.enabled'), enabled);
  await tap('#voice-toggle'); await until(speaking);
  await tap('[data-action="music"]');
  assert.equal(await evaluate('__game.audio.music.enabled'), !enabled);
  assert.ok(await evaluate('__game.audio.voice.playing'));
  console.log('PASS phone: real MP3 playback, next dialogue on the same player, independent touch speech/music mute.');

  await evaluate(`(() => {
    const s=__game.scenes.current;s.hud.dialog=null;s._openStation({...s.stations[0],kind:'trivia',params:{count:2}},__game.audio);
    for(let i=0;i<15;i++)__game._update(1/60);
  })()`);
  await until(speaking);
  await evaluate('__game.audio.voice.media.currentTime=__game.audio.voice.media.duration-0.08');
  await until('__game.audio.voice.index===1&&__game.audio.voice.playing');
  await tapCanvas(480, 225);
  assert.equal(await evaluate('__game.scenes.current.mini.phase'), 'feedback');
  await tap('[data-action="back"]'); assert.equal(await evaluate('__game.scenes.current.mini'), null);
  console.log('PASS phone: automatic audio queue, canvas answer selection and touch exit from quiz.');

  await evaluate('__game.save.saveConstruction([],false)');
  await ready(2);
  await until('!!__game.scenes.current.viewer3d && !__game.scenes.current.loading3d');
  assert.equal(await evaluate('__game.scenes.current.placed.size'), 0);
  await tapCanvas(790, 138); await until(speaking);
  const music = await evaluate('__game.audio.music.media');
  assert.ok(music !== undefined);
  await until('__game.audio.music.media && !__game.audio.music.media.paused && __game.audio.music.media.currentTime>0.1');
  const end=await evaluate('(()=>{const p=__game.scenes.current.viewer3d.projectPart("bases");return{x:p.x+25,y:p.y+142}})()');
  const start = await canvasPoint(790, 138), target = await canvasPoint(end.x,end.y);
  const dragState = () => evaluate(`({
    drag:__game.scenes.current.drag?.part.id,moved:__game.scenes.current.drag?.moved,
    pointer:{...__game.input.pointer},owner:__game.input._pointerId,
    feedback:__game.scenes.current.feedback,placed:[...__game.scenes.current.placed]
  })`);
  const trace = [];
  await touch('touchStart', [{ ...start, id: 60 }]); await steps(1);
  trace.push(await dragState());
  await touch('touchMove', [{ ...target, id: 60 }]); await steps(1);
  trace.push(await dragState());
  await touch('touchEnd', []); await steps(2);
  trace.push(await dragState());
  assert.ok(await evaluate('__game.scenes.current.placed.has("bases")'), JSON.stringify(trace));
  await shot('construction');
  assert.equal(errors.length, 0, JSON.stringify(errors)); assert.equal(badMedia.length, 0, JSON.stringify(badMedia));
  console.log('PASS phone: workshop MP3 advances and real touch drag builds the bases; no JS errors or missing audio.');
} finally {
  await evaluate('if(window.__game){__game.loop.stop();__game.touch.releaseAll();__game.audio.voice.clear();__game.audio.music.stop();__game.audio.ctx?.suspend()}').catch(() => {});
  ws.close();
}
