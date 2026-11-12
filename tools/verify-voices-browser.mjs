// Requires the disposable tmp/voice-browser-profile Edge session on port 9223.
import assert from 'node:assert/strict';
const tabs = await (await fetch('http://127.0.0.1:9223/json/list')).json();
const tab = tabs.find(t => t.type === 'page' && t.url.startsWith('http://localhost:8080/'));
assert.ok(tab, 'Open the isolated test browser first');
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let id = 0;
const pending = new Map(), errors = [], failedAudio = [];
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails);
  if (m.method === 'Network.responseReceived' && m.params.response.status >= 400
      && m.params.response.url.includes('/voices/')) failedAudio.push(m.params.response.url);
  if (m.id && pending.has(m.id)) {
    const p = pending.get(m.id); pending.delete(m.id); clearTimeout(p.timer);
    if (m.error) p.reject(new Error(JSON.stringify(m.error))); else p.resolve(m.result);
  }
};
function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const n = ++id;
    const timer = setTimeout(() => { pending.delete(n); reject(new Error(method + ' timed out')); }, 12000);
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
  for (let i = 0; i < 120; i++) {
    if (await evaluate(expression)) return;
    await wait(100);
  }
  throw new Error('Timed out: ' + expression);
}
async function key(code, key, duration = 65) {
  const native = code === 'Enter' ? { windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 } : {};
  await call('Input.dispatchKeyEvent', { type: 'keyDown', code, key, ...native });
  if (code === 'Enter') await call('Input.dispatchKeyEvent', { type: 'char', text: '\r', unmodifiedText: '\r', code, key, ...native });
  await wait(duration);
  await call('Input.dispatchKeyEvent', { type: 'keyUp', code, key, ...native });
  await wait(80);
  await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
}
async function ready(level) {
  await call('Page.navigate', { url: `http://localhost:8080/?start=play&level=${level}` });
  await wait(400);
  await until(`!!window.__game && ${level === 2
    ? '__game.scenes.currentName === "construction"' : `__game.scenes.current.meta?.id === ${level}`}`);
  await evaluate('localStorage.setItem("templebuilder.voice","1");__game.audio.voice.enabled=true');
}
const speaking = '__game.audio.voice.playing && __game.audio.voice.media?.currentTime > 0.15';
try {
  await call('Runtime.enable'); await call('Network.enable');
  await call('Page.enable'); await call('Page.bringToFront');
  await ready(1);
  assert.equal(await evaluate('__game.audio.voice.unlocked'), false, 'no autoplay before a gesture');
  await key('ArrowRight', 'ArrowRight', 400);
  await until(speaking);
  assert.equal(await evaluate('__game.scenes.current.hud.dialog.speaker'), 'מֹשֶׁה רַבֵּנוּ');
  assert.ok(await evaluate('__game.audio.voice.media.src.includes("/moshe-")'));
  assert.equal(await evaluate('__game.audio.music._speechActive'), true);
  await evaluate('window.previousVoice=__game.audio.voice.media;window.previousVoiceSource=__game.audio.voice.media.src;__game.scenes.current.hud._dialogChars=0');
  await key('Enter', 'Enter');
  assert.ok(await evaluate('__game.audio.voice.media===window.previousVoice'), 'first Enter only completes typing');
  await key('Enter', 'Enter');
  await until('__game.scenes.current.hud.dialog.page===1 && ' + speaking);
  assert.ok(await evaluate('window.previousVoice===__game.audio.voice.media && __game.audio.voice.media.src!==window.previousVoiceSource'));
  assert.equal(await evaluate('__game.scenes.current.hud.dialog.page'), 1);
  const musicEnabled = await evaluate('__game.audio.music.enabled');
  await key('KeyV', 'v');
  assert.ok(await evaluate('!__game.audio.voice.enabled && !__game.audio.voice.media'));
  assert.equal(await evaluate('__game.audio.music.enabled'), musicEnabled);
  await key('KeyV', 'v'); await until(speaking);
  await key('KeyN', 'n');
  assert.equal(await evaluate('__game.audio.music.enabled'), !musicEnabled);
  assert.ok(await evaluate('__game.audio.voice.playing'), 'music mute does not mute speech');
  await key('KeyN', 'n');
  // Test the visible button using actual pointer input, not DOM .click().
  const button = await evaluate('(() => {const r=document.getElementById("voice-toggle").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()');
  for (const type of ['mousePressed', 'mouseReleased']) await call('Input.dispatchMouseEvent', { type, ...button, button: 'left', clickCount: 1 });
  await until('!__game.audio.voice.enabled');
  assert.equal(await evaluate('__game.scenes.current.hud.dialog.page'), 1, 'mute button must not advance bubble');
  // Enter while toolbar-focused toggles speech but must not leak into game input.
  await key('Enter', 'Enter'); await until(speaking);
  assert.equal(await evaluate('__game.scenes.current.hud.dialog.page'), 1);
  await evaluate('document.activeElement.blur();window.previousVoice=__game.audio.voice.media;__game.audio.voice.setHidden(true)');
  assert.ok(await evaluate('window.previousVoice.paused && !__game.audio.music._speechActive'));
  await evaluate('__game.audio.voice.setHidden(false)'); await until(speaking);
  await evaluate('__game.scenes.go("levels")');
  await until('!__game.audio.voice.media');
  assert.ok(await evaluate('window.previousVoice.paused'));
  console.log('PASS Edge: real gesture, Moses MP3 decoding, typewriter/next-page cancellation, independent V/N, toolbar pointer/keyboard, hidden tab and exit.');

  for (const [level, profile] of [[3, 'yehoshua'], [4, 'elazar']]) {
    await ready(level); await key('ArrowRight', 'ArrowRight', 400); await until(speaking);
    assert.ok(await evaluate(`__game.audio.voice.media.src.includes("/${profile}-")`));
    console.log(`PASS Edge: stage ${level} opening dialogue uses ${profile} and is advancing.`);
  }
  await ready(2); await key('KeyZ', 'z'); await until(speaking);
  assert.ok(await evaluate('__game.audio.voice.media.src.includes("/workshop-")'));
  await evaluate('__game.scenes.current.showNotes=true');
  await until('__game.audio.voice.snapshot?.key==="notes:plan"');
  await until(speaking);
  await evaluate('__game.scenes.current.showNotes=false;__game.scenes.current.rebuildConfirm=true');
  await until('__game.audio.voice.snapshot?.key==="rebuild"'); await until(speaking);
  console.log('PASS Edge: workshop introduction, notes and rebuild confirmation replace previous speech.');

  await ready(1); await key('KeyZ', 'z');
  await evaluate(`(() => {
    const s=__game.scenes.current;s.npcs.forEach(n=>n.talked=true);
    s._openStation(s.stations.find(s=>s.kind==="weaving"),__game.audio);
  })()`);
  await until(speaking);
  assert.ok(await evaluate('__game.audio.voice.media.src.includes("/weaver-")'));
  await evaluate('__game.scenes.current.mini.round=2');
  await until('__game.audio.voice.snapshot.lines[0].text.startsWith("עכשיו בלי עזרה")');
  assert.ok(await evaluate('!__game.audio.voice.snapshot.lines[0].text.includes("תכלת")'));
  await key('Escape', 'Escape');
  await evaluate(`(() => {
    const s=__game.scenes.current;s._openStation(s.stations.find(s=>s.kind==="trivia"),__game.audio);
  })()`);
  await until(speaking);
  assert.ok(await evaluate('__game.audio.voice.media.src.includes("/elder-")'));
  const matching = await evaluate(`(() => {
    const m=__game.scenes.current.mini,v=__game.audio.voice;
    return JSON.stringify(v.snapshot.lines.map(l=>l.text))===JSON.stringify([m.q.q,...m.q.options]);
  })()`);
  assert.ok(matching);
  // Verify the queue advances in real media; shorten only the test clip's remaining time.
  await evaluate('window.previousVoice=__game.audio.voice.media;__game.audio.voice.media.currentTime=__game.audio.voice.media.duration-0.1');
  await until('__game.audio.voice.index===1 && __game.audio.voice.playing');
  assert.ok(await evaluate('window.previousVoice===__game.audio.voice.media && __game.audio.voice.index===1'));
  await key('Digit1', '1');
  await until('__game.scenes.current.mini.phase==="feedback" && __game.audio.voice.playing');
  console.log('PASS Edge: female weaver, no memory-round spoilers, elder quiz, real clip queue and answer feedback.');
  await key('Escape', 'Escape');
  await evaluate('__game.save.addCodex("gilgal");__game.scenes.set("museum");__game.scenes.current.index=0');
  await until(speaking);
  assert.ok(await evaluate('__game.audio.voice.media.src.includes("/narrator-")'));
  await evaluate('__game.scenes.current.index=1'); // Locked in this disposable save.
  await until('!__game.audio.voice.media');
  assert.equal(errors.length, 0, JSON.stringify(errors));
  assert.equal(failedAudio.length, 0, JSON.stringify(failedAudio));
  console.log('PASS Edge: museum narrates unlocked cards only; no JS exceptions or missing speech requests.');
} finally {
  ws.close();
}
