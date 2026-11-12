import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

// This runner connects only to a disposable browser launched with --mute-audio.
const tabs=await(await fetch('http://127.0.0.1:9234/json/list')).json();
const tab=tabs.find(t=>t.type==='page'&&t.url.startsWith('http://localhost:8080/'));assert.ok(tab);
const ws=new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
let id=0;
const pending=new Map(),errors=[],badFiles=[];
ws.onmessage=e=>{
  const m=JSON.parse(e.data);
  if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);
  if(m.method==='Network.responseReceived'&&m.params.response.status>=400&&m.params.response.url.includes('localhost:8080'))badFiles.push(m.params.response.url);
  if(pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}
};
function call(method,params={}){
  return new Promise((resolve,reject)=>{
    const n=++id,timer=setTimeout(()=>{pending.delete(n);reject(Error(method+' timed out'));},15000);
    pending.set(n,{resolve,reject,timer});ws.send(JSON.stringify({id:n,method,params}));
  });
}
async function evaluate(expression){
  const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;
}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(expression){
  for(let i=0;i<120;i++){if(await evaluate(expression))return;await wait(100);}throw Error('Timed out: '+expression);
}
const steps=async(n=1)=>evaluate(`for(let i=0;i<${n};i++)__game._update(1/60);__game._render()`);
async function scene(name,level=1){
  await evaluate(`__game.scenes.set(${JSON.stringify(name)},{levelId:${level}});__game.loop.stop()`);
  await steps();await wait(100);
}
async function point(x,y){
  return evaluate(`(()=>{const r=__game.canvas.getBoundingClientRect();return{x:r.x+${x}*r.width/960,y:r.y+${y}*r.height/540}})()`);
}
async function mouse(type,x,y){
  const p=await point(x,y);
  await call('Input.dispatchMouseEvent',{type,...p,button:type==='mouseMoved'?'none':'left',clickCount:type==='mouseMoved'?0:1});
  await wait(25);await steps();
}
async function tap(x,y){await mouse('mousePressed',x,y);await mouse('mouseReleased',x,y);}
async function key(code,keyValue){
  await call('Input.dispatchKeyEvent',{type:'keyDown',code,key:keyValue});await steps();
  await call('Input.dispatchKeyEvent',{type:'keyUp',code,key:keyValue});await steps();
}
async function shot(name){
  await steps();const r=await call('Page.captureScreenshot',{format:'png'});
  await writeFile(new URL('../tmp/child-'+name+'.png',import.meta.url),Buffer.from(r.data,'base64'));
}
async function dragPart(){
  const details=await evaluate(`(()=>{const s=__game.scenes.current,p=s.options[0],r=s._row(0),t=s.viewer3d.projectPart(p.id);
    return{id:p.id,start:{x:r.x+r.w/2,y:r.y+r.h/2},end:{x:25+t.x,y:142+t.y}}})()`);
  await mouse('mousePressed',details.start.x,details.start.y);
  await mouse('mouseMoved',details.end.x,details.end.y);
  assert.equal(await evaluate('__game.scenes.current.viewer3d.dragPreview?.part.id'),details.id);
  await mouse('mouseReleased',details.end.x,details.end.y);
  assert.ok(await evaluate(`__game.scenes.current.placed.has(${JSON.stringify(details.id)})`),details.id);
  return details.id;
}
async function touch(type,points){
  await call('Input.dispatchTouchEvent',{type,touchPoints:points.map(p=>({radiusX:4,radiusY:4,...p}))});await wait(50);
}
async function center(selector){
  return evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
}
try{
  await call('Runtime.enable');await call('Network.enable');await call('Page.enable');
  await until('!!window.__game');
  await evaluate('__game.loop.stop();__game.audio.voice.enabled=false;__game.audio.music.enabled=false;__game.save.reset()');
  await scene('construction',2);await until('!__game.scenes.current.loading3d');
  assert.equal(await evaluate('__game.scenes.current.viewMode'),'3d');
  await shot('construction-start');
  const start=await evaluate(`(()=>{const s=__game.scenes.current,r=s._row(0);return{x:r.x+r.w/2,y:r.y+r.h/2}})()`);
  const wrong=await evaluate(`(()=>{const t=__game.scenes.current.viewer3d.projectPart('altar');return{x:25+t.x,y:142+t.y}})()`);
  await mouse('mousePressed',start.x,start.y);await mouse('mouseMoved',wrong.x,wrong.y);
  assert.ok(await evaluate('__game.scenes.current.viewer3d.ghost.position.length()>1'));
  await shot('construction-drag');
  const target=await evaluate(`(()=>{const t=__game.scenes.current.viewer3d.projectPart('bases');return{x:25+t.x,y:142+t.y}})()`);
  await mouse('mouseMoved',target.x,target.y);await mouse('mouseReleased',target.x,target.y);
  assert.ok(await evaluate('__game.scenes.current.placed.has("bases")'));
  assert.equal(await dragPart(),'south');await steps(40);
  assert.ok(await evaluate('__game.scenes.current.viewer3d.groups.get("south").children.every(m=>m.visible)'));
  await shot('construction-south');
  await key('Enter','Enter');assert.ok(await evaluate('__game.scenes.current.keyboardPoint && __game.scenes.current.viewMode==="3d"'));
  await key('KeyP','p');
  for(let i=0;i<17;i++)await dragPart();
  assert.ok(await evaluate('__game.scenes.current.complete'));await shot('construction-complete');
  await evaluate('__game.scenes.current.viewer3d.failed=true');await steps();
  assert.equal(await evaluate('__game.scenes.current.viewMode'),'plan');
  assert.equal(await evaluate('__game.scenes.current.placed.size'),19);
  console.log('PASS real WebGL: automatic 3D, moving preview, south wall visible, nineteen real mouse drags, keyboard, safe fallback.');
  await evaluate('__game.save.data.unlocked=14;__game.save.data.currentLevel=14');
  await scene('levels');
  assert.equal(await evaluate('__game.scenes.current.index'),0);
  await evaluate('__game.save.data.currentLevel=4');
  await scene('levels');
  assert.equal(await evaluate('__game.scenes.current.index'),3);
  assert.ok(await evaluate('__game.scenes.current._cardRect(3).x>700'));await shot('levels-rtl');
  await evaluate('__game.save.data.unlocked=5');

  await scene('play',5);
  await evaluate(`(()=>{const s=__game.scenes.current,t=s.orchardTrees[0];s.npcs.forEach(n=>n.talked=true);
    s.player.x=t.x-140;s.player.y=t.y-s.player.h;s.game.camera.snapTo(t.x,t.y-100)})()`);
  await shot('shiloh');
  await key('KeyZ','z');
  assert.ok(await evaluate('__game.scenes.current.orchardTrees[0].harvested'));
  assert.equal(await evaluate('__game.scenes.current.pickups.filter(p=>p.type==="olive"&&!p.dormant).length'),4);
  await shot('shiloh-harvest');
  await evaluate(`(()=>{const s=__game.scenes.current;s.player.x=s.stations[0].x;s.player.y=s.stations[0].y;s.game.camera.snapTo(s.player.centerX,s.player.centerY)})()`);
  await key('Enter','Enter');await steps(15);
  assert.equal(await evaluate('__game.scenes.current.mini.constructor.name'),'WaterChannelsGame');
  await tap(406,204);assert.equal(await evaluate('__game.scenes.current.mini.progress.moves'),1);
  await key('Escape','Escape');await key('Enter','Enter');await steps(15);
  assert.equal(await evaluate('__game.scenes.current.mini.progress.moves'),1);
  for(let i=0;i<4;i++)await tap(760,475);
  assert.ok(await evaluate('__game.scenes.current.mini.solved'));await shot('water');
  await tap(480,475);assert.equal(await evaluate('__game.scenes.current.mini'),null);
  await evaluate('window.childPlayer=__game.scenes.current.player;__game.scenes.current._openStation(__game.scenes.current.stations[1],__game.audio)');
  await steps(15);await shot('matching');
  for(let i=0;i<3;i++){
    const cards=await evaluate(`(()=>{const m=__game.scenes.current.mini,l=m.card('left',${i}),r=m.card('right',m.rightOrder.indexOf(m.pairs[${i}].id));return{l:{x:l.x+120,y:l.y+35},r:{x:r.x+120,y:r.y+35}}})()`);
    await mouse('mousePressed',cards.l.x,cards.l.y);await mouse('mouseMoved',cards.r.x,cards.r.y);await mouse('mouseReleased',cards.r.x,cards.r.y);
  }
  assert.equal(await evaluate('__game.scenes.current.mini.matchedIds.length'),3);
  await tap(480,495);assert.ok(await evaluate('__game.scenes.current.player===window.childPlayer'));
  await key('Escape','Escape');await tap(480,289);
  assert.equal(await evaluate('__game.scenes.current.pausePanel'),'controls');await shot('controls');
  await key('Escape','Escape');assert.ok(await evaluate('__game.scenes.current.paused'));
  await tap(480,349);assert.equal(await evaluate('__game.scenes.current.pausePanel'),'characters');
  assert.ok(await evaluate('__game.scenes.current.gallery.rect(0).x>__game.scenes.current.gallery.rect(1).x'));
  const characterCard=await evaluate('(()=>{const r=__game.scenes.current.gallery.rect(1);return{x:r.x+r.w/2,y:r.y+50}})()');
  await tap(characterCard.x,characterCard.y);await shot('characters');
  assert.equal(await evaluate('__game.save.data.character'),'oholiav');
  await key('KeyC','c');assert.equal(await evaluate('__game.scenes.current.gallery.page'),1);await shot('characters-later');
  await key('Escape','Escape');
  assert.ok(await evaluate('__game.scenes.current.paused&&__game.scenes.current.player===window.childPlayer'));
  await key('Escape','Escape');
  await evaluate(`(()=>{const s=__game.scenes.current;for(const p of s.pickups.filter(p=>p.type==='olive'&&!p.collected)){p.collected=true;p.dormant=false;s._collect(p,__game.audio)}
    s.player.x=s.def.challenge.x;s.player.y=s.def.challenge.y;s.game.camera.snapTo(s.player.centerX,s.player.centerY)})()`);
  await key('Enter','Enter');await steps(15);assert.equal(await evaluate('__game.scenes.current.mini.constructor.name'),'OlivePressGame');
  for(let i=0;i<5;i++){await steps(20);await tap(810,475);}
  assert.equal(await evaluate('__game.scenes.current.mini.progress.successes'),5);await shot('press');await tap(480,470);
  await evaluate(`(()=>{const s=__game.scenes.current;s.player.x=s.def.exit.x;s.player.y=s.def.exit.y;s._checkExit(__game.audio)})()`);
  await steps(60);assert.equal(await evaluate('__game.scenes.currentName'),'summary');
  assert.equal(await evaluate('__game.scenes.current.showKnowledge'),false);await shot('summary');
  console.log('PASS new gameplay: real water taps/resume, three wire drags, help/gallery preserve world, five assisted presses, visual summary.');
  await evaluate('__game.save.addCodex("materials15")');
  await scene('museum');await shot('museum');
  const pages=await evaluate(`(async()=>{const {CODEX}=await import('./src/data/codex.js');const s=__game.scenes.current,c=CODEX.find(c=>c.id==='materials15');
    s.index=CODEX.indexOf(c);s.pageCache=null;window.originalMuseumBody=c.body;c.body=[c.body,c.body,c.body].join(' ');return s._pages(__game.ctx).length})()`);
  assert.ok(pages>1);await steps();await key('ArrowLeft','ArrowLeft');
  assert.equal(await evaluate('__game.scenes.current.page'),1);await shot('museum-page');
  await evaluate(`(async()=>{const {CODEX}=await import('./src/data/codex.js');CODEX.find(c=>c.id==='materials15').body=window.originalMuseumBody})()`);
  const roleSheet=await evaluate(`(async()=>{
    const {drawPlayer,text}=await import('./src/core/art.js'),{CHARACTERS}=await import('./src/data/characters.js');
    const c=document.createElement('canvas');c.width=1100;c.height=380;const ctx=c.getContext('2d');ctx.fillStyle='#f6e8c3';ctx.fillRect(0,0,c.width,c.height);
    ['david','aharon','moshe','oholiav'].forEach((id,i)=>{const ch=CHARACTERS.find(c=>c.id===id),x=80+i*270;
      drawPlayer(ctx,x,90,66,148,{character:ch,state:'idle',animTime:1,attackTime:id==='david'?0.55:0});
      text(ctx,ch.name,x+45,310,{size:24,color:'#43311d',outline:null});});
    return c.toDataURL('image/png').split(',')[1];})()`);
  await writeFile(new URL('../tmp/child-role-detail.png',import.meta.url),Buffer.from(roleSheet,'base64'));
  assert.ok(await evaluate(`(()=>{const buttons=[...document.querySelectorAll('#touch-pad button')];return buttons.filter(e=>/[א-ת]/.test(e.textContent)).every(e=>/[\\u0591-\\u05c7]/.test(e.textContent))})()`));
  console.log('PASS refinements: current stage at the right edge, RTL gallery, active tree harvest, role-specific art and sword, parchment museum pagination, niqqud controls.');

  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
  await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  await evaluate('__game.touch.enabled=true;__game.touch._sync();__game._resize()');
  await scene('play',1);await evaluate('__game.scenes.current.npcs.forEach(n=>n.talked=true)');await steps(30);
  async function layout(width,height){
    const r=await evaluate(`(()=>{const c=__game.canvas.getBoundingClientRect();return{w:c.width,h:c.height,buttons:[...document.querySelectorAll('#touch-pad button')].map(e=>{const r=e.getBoundingClientRect();return{action:e.dataset.action,w:r.width,h:r.height,over:r.x<c.right&&r.right>c.left&&r.y<c.bottom&&r.bottom>c.top}}).filter(r=>r.w&&r.h)}})()`);
    assert.ok(r.w>=Math.min(width,height*960/540)-2,JSON.stringify(r));
    for(const b of r.buttons)assert.ok(b.w>=44&&b.h>=44,JSON.stringify(b));
    assert.ok(r.buttons.filter(b=>['right','jump'].includes(b.action)).every(b=>b.over));
  }
  await layout(390,844);await shot('mobile-portrait');
  const right=await center('[data-action="right"]'),jump=await center('[data-action="jump"]');
  await touch('touchStart',[{...right,id:10}]);await steps(8);
  await touch('touchStart',[{...right,id:10},{...jump,id:11}]);await steps(6);
  assert.ok(await evaluate('__game.input.down("right")&&__game.input.down("jump")&&__game.scenes.current.player.vy<0'));
  await touch('touchEnd',[{...jump,id:11}]);await steps();assert.ok(await evaluate('__game.input.down("right")&&!__game.input.down("jump")'));
  await touch('touchCancel',[]);await steps();assert.equal(await evaluate('__game.input.axisX'),0);
  await call('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:2,mobile:true});
  await evaluate('__game._resize()');await steps();await layout(844,390);await shot('mobile-landscape');
  await scene('construction',2);await until('!__game.scenes.current.loading3d');
  await evaluate('__game.scenes.current.restartConstruction()');await steps();
  const from=await point(790,153),toLocal=await evaluate(`(()=>{const p=__game.scenes.current.viewer3d.projectPart('bases');return{x:25+p.x,y:142+p.y}})()`),to=await point(toLocal.x,toLocal.y);
  await touch('touchStart',[{...from,id:40}]);await steps();
  await touch('touchMove',[{...to,id:40}]);await steps();
  await touch('touchEnd',[]);await steps(2);
  assert.ok(await evaluate('__game.scenes.current.placed.has("bases")'));await shot('mobile-construction');
  console.log('PASS mobile: maximum aspect-ratio canvas, translucent overlay targets, two independent fingers and real touch 3D drag.');
  await call('Page.navigate',{url:'http://localhost:8080/pronunciation.html'});await wait(300);
  await until('document.querySelectorAll("#clips article").length>0');
  assert.equal(await evaluate('document.querySelectorAll("audio").length'),0);
  assert.equal(errors.length,0,JSON.stringify(errors));assert.equal(badFiles.length,0,JSON.stringify(badFiles));
  console.log('PASS pronunciation page: local catalog loaded, no autoplay, no JS errors or missing assets.');
}finally{
  await evaluate('if(window.__game){__game.loop.stop();__game.audio.voice.clear();__game.audio.music.stop();__game.audio.ctx?.suspend()}').catch(()=>{});
  ws.close();
}
