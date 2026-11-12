import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildLevel01 } from '../src/data/level01.js';
import { buildLevel05 } from '../src/data/level05.js';
import { MATERIALS } from '../src/data/materials.js';
import { PlayScene } from '../src/scenes/play.js';
import { Camera } from '../src/core/camera.js';
import { SaveData } from '../src/core/storage.js';
import { CHARACTERS, characterStatus, selectedCharacter } from '../src/data/characters.js';
import { MatchingGame, validateMatchingPairs, restoreMatchingProgress } from '../src/minigames/matching.js';
import { WaterChannelsGame, getWaterFlow } from '../src/minigames/waterChannels.js';
import { OlivePressGame, evaluatePress } from '../src/minigames/olivePress.js';
import { narrationForGame, profileForSpeaker } from '../src/data/voiceText.js';
import { controlCards } from '../src/core/controlsHelp.js';
import { CharacterGallery } from '../src/core/characterGallery.js';
import { drawLearningIcon } from '../src/core/learningArt.js';
import { VOICE_FILES } from '../src/data/voiceManifest.js';

let stored=null;
globalThis.localStorage={getItem:()=>stored,setItem:(_,v)=>{stored=v;}};
globalThis.window=new EventTarget();
const audio=new Proxy({music:{duck(){}}},{get:(o,k)=>o[k]||(()=>{})});
const input=(keys=[],p={})=>({pressed:a=>keys.includes(a),down:a=>keys.includes(a),axisX:keys.includes('right')?1:0,
  pointer:{inside:false,...p},clicked:false,over:()=>false,flush(){}});
const step=(m,keys=[],dt=0.1)=>m.update(dt,input(keys),audio);
const ctx=new Proxy({globalAlpha:1},{get:(o,k)=>k in o?o[k]:k==='measureText'?s=>({width:s.length*7})
  :['createLinearGradient','createRadialGradient'].includes(k)?()=>({addColorStop(){}})
  :(...args)=>args.forEach(a=>{if(typeof a==='number')assert.ok(Number.isFinite(a),String(k));})});
let checks=0;
const check=(name,fn)=>{stored=null;fn();checks++;console.log('PASS '+name);};
function scene(level=1){
  const s=new PlayScene(),went=[];
  s.game={width:960,height:540,camera:new Camera(960,540),audio,save:new SaveData(),input:input()};
  s.scenes={transitioning:false,go:(name,params)=>went.push({name,params})};s.enter({levelId:level});return {s,went};
}
check('donations are at least 128 pixels apart and retain all fifteen kinds',()=>{
  const p=buildLevel01().pickups.filter(p=>p.type==='donation').sort((a,b)=>a.x-b.x);
  for(let i=1;i<p.length;i++)assert.ok(p[i].x-p[i-1].x>=128);
  assert.equal(new Set(p.map(p=>p.kind)).size,MATERIALS.length);
  const {s}=scene();const donation=s.pickups.find(p=>p.type==='donation');
  s._collect(donation,audio);assert.equal(s.materialCounts[donation.kind],1);
  assert.equal(s.game.save.data.materialCounts[donation.kind],1);
  assert.ok(!s.particles.items.some(p=>p.kind==='text'));
});
check('old saves never invent quantities, achievements, or unlocked characters',()=>{
  stored=JSON.stringify({unlocked:5,materials:['gold'],scores:{1:99999}});
  const save=new SaveData();assert.deepEqual(save.data.materialCounts,{});assert.deepEqual(save.data.achievements,{});
  assert.equal(selectedCharacter(save).id,'bezalel');
  assert.equal(characterStatus(CHARACTERS[1],save).unlocked,false);
});
check('a distinct achievement unlocks the first character and cannot be farmed',()=>{
  const save=new SaveData();assert.equal(save.awardChallenge('level:1:elder1',false),true);
  assert.equal(characterStatus(CHARACTERS[1],save).unlocked,true);
  assert.equal(save.awardChallenge('level:1:elder1',true),false);
  assert.equal(Object.keys(save.data.achievements).length,1);
  for(let i=0;i<30;i++)save.awardChallenge(`challenge:${i}`,true);
  assert.equal(characterStatus(CHARACTERS.find(c=>c.id==='david'),save).unlocked,false);
  assert.equal(CHARACTERS.length,16);
  assert.equal(new Set(CHARACTERS.map(c=>c.id)).size,16);
});
check('pause help and character switching preserve the exact current world',()=>{
  const {s}=scene(),player=s.player,enemies=s.enemies,pickups=s.pickups;
  s.paused=true;s.pausePanel='controls';const x=player.x;
  for(let i=0;i<120;i++)s.update(1/60);
  assert.equal(player.x,x);assert.equal(s.activePlayTime,0);
  assert.equal(controlCards(false).length,5);assert.equal(controlCards(true).length,6);
  s.game.save.awardChallenge('level:1:elder1');
  s.pausePanel='characters';s.gallery=new CharacterGallery(s.game);
  s.gallery.focus=1;s.game.input=input(['confirm']);s.update(1/60);
  assert.equal(s.game.save.data.character,'oholiav');
  s.game.input=input(['back']);s.update(1/60);
  assert.equal(s.pausePanel,null);assert.equal(s.paused,true);
  assert.equal(s.player,player);assert.equal(s.enemies,enemies);assert.equal(s.pickups,pickups);
  assert.equal(player.character.id,'oholiav');assert.equal(player.w,22);assert.equal(player.h,42);
  s.draw(ctx);
});
check('successful station rewards remain unique across replay and cooldown counts only active play',()=>{
  const {s}=scene(),st=s.stations[0];
  const finish=()=>{s.mini={result:{success:true,perfect:true}};s.miniStation=st;s._finishMini(audio);};
  finish();const score=s.score,lives=s.player.lives;finish();assert.equal(s.score,score);assert.equal(s.player.lives,lives);
  const {s:replay}=scene(),startingLives=replay.player.lives;replay.game.save=s.game.save;replay.mini={result:{success:true,perfect:true}};replay.miniStation=replay.stations[0];replay._finishMini(audio);
  assert.equal(replay.score,0);assert.equal(replay.player.lives,startingLives);
  const second=s.stations[1];s.player.x=second.x;s.player.y=second.y;
  s._updateStations(input(['confirm']),audio);assert.equal(s.mini,null);
  s.paused=true;for(let i=0;i<30;i++)s.update(1);assert.equal(s.activePlayTime,0);
  s.paused=false;s.activePlayTime=25;s._updateStations(input(['confirm']),audio);assert.ok(s.mini);
});
check('matching supports keyboard, wrong-answer retry, drag, cancellation and resume',()=>{
  const g=new MatchingGame({});step(g);step(g);
  assert.equal(validateMatchingPairs(g.pairs),true);
  assert.equal(validateMatchingPairs([...g.pairs,g.pairs[0]]),false);
  g.select(g.pairs[0].id);g.attempt(g.pairs[1].id,audio);assert.equal(g.matchedIds.length,0);
  const c=g.card('left',0),r=g.card('right',g.rightOrder.indexOf(g.pairs[0].id));
  const a=input([],{x:c.x+100,y:c.y+30,inside:true,down:true});a.clicked=true;g.update(0.1,a,audio);
  const b=input([],{x:r.x+100,y:r.y+30,inside:true,down:false});b.pointerReleased=true;g.update(0.1,b,audio);
  assert.equal(g.matchedIds.length,1);step(g,['back']);assert.ok(g.result.cancelled&&!g.result.success);
  const resumed=new MatchingGame({},{progress:g.result.progress});step(resumed);step(resumed);
  for(let row=1;row<resumed.pairs.length;row++){
    resumed.focusSide='left';resumed.focusRow=row;step(resumed,['confirm']);
    resumed.focusRow=resumed.rightOrder.indexOf(resumed.pairs[row].id);step(resumed,['confirm']);
  }
  assert.ok(resumed.complete&&!resumed.finished);step(resumed,['confirm']);assert.ok(resumed.result.success&&!resumed.result.perfect);
  assert.deepEqual(restoreMatchingProgress(resumed.pairs,{matchedIds:['unknown','gold','gold']}).matchedIds,['gold']);
  resumed.draw(ctx);
});
check('all 256 water states are safe, exactly one connects, and assistance solves each',()=>{
  let solutions=0;
  for(let n=0;n<256;n++){
    const rotations=[n&3,n>>2&3,n>>4&3,n>>6&3];
    if(getWaterFlow(rotations).connected)solutions++;
    const g=new WaterChannelsGame({},{progress:{rotations}});step(g);step(g);
    for(let i=0;i<4&&!g.solved;i++)step(g,['build']);
    assert.ok(g.solved);assert.equal(g.finished,false);step(g,['back']);assert.equal(g.result.success,false);
    const resumed=new WaterChannelsGame({},{progress:g.result.progress});step(resumed);step(resumed);step(resumed,['confirm']);assert.ok(resumed.result.success);
  }
  assert.equal(solutions,1);
  new WaterChannelsGame({},{progress:{rotations:[NaN,-9,Infinity,'oops']}}).draw(ctx);
});
check('press mistakes retain successes, widen timing, allow help and resume',()=>{
  const g=new OlivePressGame({});step(g);step(g);g.progress.phase=0.5;g.attempt(false,audio);assert.equal(g.progress.successes,1);
  for(let i=0;i<3;i++){g.cooldown=0;g.progress.phase=0;g.attempt(false,audio);}
  assert.equal(g.progress.successes,1);assert.equal(evaluatePress(0,3).halfWidth,0.27);
  step(g,['back']);const resumed=new OlivePressGame({},{progress:g.result.progress});step(resumed);step(resumed);
  for(let i=0;i<4;i++){resumed.cooldown=0;resumed.attempt(true,audio);}
  assert.equal(resumed.finished,false);step(resumed,['confirm']);assert.ok(resumed.result.success&&!resumed.result.perfect);
  resumed.draw(ctx);
});
check('Shiloh main route traverses real physics and every olive survives respawn until collected',()=>{
  const {s,went}=scene(5),p=s.player,map=s.map;
  assert.equal(s.def.orchard.trees.length,3);assert.equal(s.pickups.filter(p=>p.type==='olive').length,12);
  for(let frame=0;frame<3000&&p.x<s.def.exit.x;frame++){
    const ahead=p.x+p.w+32,jump=p.onGround&&map.rectHitsSolid(ahead,p.y,8,p.h-2);
    const control=input(['right']);control.down=a=>['right','jump'].includes(a);control.pressed=a=>a==='jump'&&jump;
    p.update(1/60,control,map,audio);s._updatePickups(1/60,audio);assert.ok(p.alive);
  }
  assert.ok(p.x<s.def.exit.x,'unresolved irrigation gate blocks walking straight through');
  assert.equal(s.olives,0,'walking underneath unharvested trees cannot collect their olives');
  s._waterOrchard(audio);
  for(let frame=0;frame<3000&&p.x<s.def.exit.x;frame++){
    const ahead=p.x+p.w+32,jump=p.onGround&&map.rectHitsSolid(ahead,p.y,8,p.h-2);
    const control=input(['right']);control.down=a=>['right','jump'].includes(a);control.pressed=a=>a==='jump'&&jump;
    p.update(1/60,control,map,audio);assert.ok(p.alive);
  }
  assert.ok(p.x>=s.def.exit.x,'the complete route remains traversable after solving the water puzzle');
  assert.ok(s.map.pixelW>=11000);assert.equal(s.enemies.length,4);
  for(const tree of s.orchardTrees){
    p.x=tree.x;p.y=tree.y-p.h;s._updateOrchard(input(['confirm']),audio);
    assert.ok(tree.harvested);
    assert.equal(s.pickups.filter(olive=>olive.treeId===tree.id&&!olive.dormant).length,4);
  }
  const remaining=s.pickups.filter(p=>p.type==='olive'&&!p.collected);p.respawn();assert.equal(s.pickups.filter(p=>p.type==='olive'&&!p.collected).length,remaining.length);
  for(const olive of remaining){p.x=olive.x;p.y=olive.y+olive.h-p.h-1;s._updatePickups(1/60,audio);}
  assert.equal(s.olives,12);p.x=s.def.challenge.x;p.y=s.def.challenge.y;s._updateHarvestFeatures(input(['confirm']),audio);
  assert.ok(s.mini instanceof OlivePressGame);s.mini.progress.successes=5;s.mini.finish(false);s._finishMini(audio);
  assert.ok(s.challengeDone&&s.relicTaken);s.draw(ctx);
  p.x=s.def.exit.x;p.y=s.def.exit.y;s._checkExit(audio);assert.equal(went[0].name,'summary');
  assert.equal(went[0].params.orchard.count,12);assert.ok(s.game.save.hasRelic('oil'));
  assert.equal(s.game.save.data.unlocked,6,'Shiloh orchards open the night stage, and nothing beyond it');
});
check('every new prompt uses mapped local speech and Hannah is not confused with camp',()=>{
  assert.equal(profileForSpeaker('חַנָּה'),'hannah');assert.equal(profileForSpeaker('סופר המחנה'),'scribe');
  for(const Mini of [MatchingGame,WaterChannelsGame,OlivePressGame]){
    const mini=new Mini({}),game={scenes:{currentName:'play',current:{mini}}};
    for(const line of narrationForGame(game).lines)assert.ok(VOICE_FILES[line.id],line.text);
  }
});
check('learning icons and character gallery draw using finite coordinates',()=>{
  for(const kind of ['menorah','altar','boards','oil','shofar','ark','stone','grain','water','olive','basket','drop','gold','silver','bronze','table','laver'])drawLearningIcon(ctx,kind,300,250,70);
  const {s}=scene();const gallery=new CharacterGallery(s.game);gallery.update(0.1,input(),audio);gallery.draw(ctx);gallery.page=1;gallery.draw(ctx);
});
const html=await readFile(new URL('../pronunciation.html',import.meta.url),'utf8');
assert.ok(!/autoplay/.test(html));
console.log(`\n${checks} child-edition regression groups passed, including all 256 water configurations.`);
