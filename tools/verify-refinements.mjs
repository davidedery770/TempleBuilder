import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { niqqud, stripNiqqud } from '../src/core/niqqud.js';
import { NIQQUD_PHRASES } from '../src/data/niqqud.generated.js';
import { CHARACTERS } from '../src/data/characters.js';
import { CharacterGallery } from '../src/core/characterGallery.js';
import { drawPlayer } from '../src/core/art.js';
import { drawCharacterCostume, drawCharacterProp } from '../src/core/characterArt.js';
import { LevelSelectScene } from '../src/scenes/levelSelect.js';
import { SaveData } from '../src/core/storage.js';
import { LEVELS } from '../src/data/levels.js';
import { MuseumScene, museumPages } from '../src/scenes/museum.js';
import { CODEX } from '../src/data/codex.js';
globalThis.window=new EventTarget();
let raw=null;globalThis.localStorage={getItem:()=>raw,setItem:(_,value)=>{raw=value;}};
const audio=new Proxy({},{get:()=>()=>{}});
const input=(keys=[])=>({pressed:key=>keys.includes(key),over:()=>false,pointer:{},wheel:0,flush(){}});
function context(){
  const calls=[],state={globalAlpha:1},stack=[];
  return new Proxy({calls,save(){stack.push({...state});},restore(){Object.assign(state,stack.pop());},
    measureText:s=>({width:stripNiqqud(s).length*8}),
    createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},
    {get:(o,k)=>k in o?o[k]:k in state?state[k]:(...a)=>{a.forEach(n=>{if(typeof n==='number')assert.ok(Number.isFinite(n),String(k));});calls.push([k,...a]);},
      set:(o,k,v)=>{state[k]=v;calls.push(['style',k,v]);return true;}});
}
let checks=0;
const check=(name,fn)=>{raw=null;fn();checks++;console.log('PASS '+name);};
check('all catalog phrases preserve letters and punctuation and point every multi-letter Hebrew token',()=>{
  assert.ok(Object.keys(NIQQUD_PHRASES).length>1000);
  for(const [source,pointed] of Object.entries(NIQQUD_PHRASES)){
    assert.equal(stripNiqqud(pointed),stripNiqqud(source),source);
    for(const word of pointed.match(/[\u05d0-\u05ea][\u0591-\u05c7\u05d0-\u05ea]*/g)||[]){
      if(word.length>1)assert.match(word,/[\u0591-\u05c7]/,word);
    }
  }
  for(const text of ['הדמויות שלי','כרטיסייה נעולה','לוחצים על אור','עוד 12 אתגרים','שָׁלָב 5']){
    assert.equal(stripNiqqud(niqqud(text)),stripNiqqud(text));
    assert.ok(/[\u0591-\u05c7]/.test(niqqud(text)));
  }
  assert.equal(niqqud('12/15 · Enter'),'12/15 · Enter');
});
check('characters have role props, differing beards, distinct renderings and unchanged player geometry',()=>{
  const byId=id=>CHARACTERS.find(c=>c.id===id);
  assert.equal(byId('aharon').role,'highPriest');assert.equal(byId('moshe').prop,'tablets');assert.equal(byId('david').prop,'sword');
  assert.notEqual(byId('moshe').beard,byId('oholiav').beard);
  const hashes=new Set();
  for(const character of CHARACTERS){
    const ctx=context();drawPlayer(ctx,100,100,22,42,{character,state:'run',animTime:1,attackTime:0.5});
    hashes.add(createHash('sha256').update(JSON.stringify(ctx.calls)).digest('hex'));
  }
  assert.equal(hashes.size,16);
  const a=context(),b=context(),idle=context();
  drawCharacterProp(a,0,0,50,byId('david'),0.8);drawCharacterProp(b,0,0,50,byId('david'),0.2);drawCharacterProp(idle,0,0,50,byId('david'),0);
  assert.notDeepEqual(a.calls,b.calls);assert.ok(a.calls.some(c=>c[0]==='rotate'));assert.ok(!idle.calls.some(c=>c[0]==='rotate'));
  const costume=context();drawCharacterCostume(costume,20,10,50,36,70,byId('aharon'));
  assert.ok(costume.calls.filter(c=>c[0]==='fillRect').length>=15,'breastplate includes twelve separate stones');
});
check('gallery cards and keyboard progress run right to left on both pages',()=>{
  const gallery=new CharacterGallery({save:new SaveData()});
  for(let i=1;i<4;i++)assert.ok(gallery.rect(i).x<gallery.rect(i-1).x);
  gallery.update(0.1,input(['left']),audio);assert.equal(gallery.focus,1);
  gallery.update(0.1,input(['right']),audio);assert.equal(gallery.focus,0);
  gallery.update(0.1,input(['build']),audio);assert.equal(gallery.page,1);
  assert.equal(gallery.cards()[0].id,'hannah');gallery.draw(context());
});
check('normal level selection rejects stale future focus and remembers current playable stage at the right edge',()=>{
  const save=new SaveData(),s=new LevelSelectScene();
  s.game={width:960,height:540,save,audio,input:input()};s.scenes={transitioning:false,go(){}};
  save.data.unlocked=14;save.data.currentLevel=14;s.enter();
  assert.equal(LEVELS[s.index].id,1);assert.equal(s.scrollX,0);
  save.data.currentLevel=4;s.enter();assert.equal(LEVELS[s.index].id,4);
  const r=s._cardRect(s.index);assert.ok(r.x>=700&&r.x+r.w<=960);
  s.enter({focus:6});assert.equal(LEVELS[s.index].id,6,'explicit browsing can still inspect a locked card');
  save.data.unlocked=1;save.data.currentLevel=5;s.enter();assert.equal(LEVELS[s.index].id,1);
  raw=JSON.stringify({unlocked:4,relics:['omer']});assert.equal(new SaveData().data.unlocked,5);
});
check('museum is RTL, paginates every word without overflow, and does not reveal locked cards',()=>{
  const save=new SaveData();save.addCodex('materials15');
  const s=new MuseumScene();s.game={width:960,height:540,ctx:context(),save,input:input(),audio};s.scenes={transitioning:false,go(){}};
  s.enter();assert.equal(CODEX[s.index].id,'materials15');
  for(const card of CODEX){
    const pages=museumPages(s.game.ctx,card.body,560);
    assert.ok(pages.every(page=>page.length<=6));
    assert.equal(stripNiqqud(pages.flat().join(' ')),stripNiqqud(card.body.replace(/\s+/g,' ').trim()));
  }
  s.cards=null;s.update(0.1);s.draw(s.game.ctx);
  s.index=CODEX.findIndex(c=>c.id==='hannah');const locked=context();s.draw(locked);
  assert.ok(!locked.calls.some(c=>c[0]==='fillText'&&stripNiqqud(c[1]).includes(stripNiqqud(CODEX[s.index].body))));
});
assert.ok((await stat(new URL('../src/data/niqqud.generated.js',import.meta.url))).size<700000);
const runtime=await readFile(new URL('../src/core/niqqud.js',import.meta.url),'utf8');
assert.ok(!/fetch\(|https:/.test(runtime),'display niqqud stays fully local');
console.log(`\n${checks} character, RTL, museum and full-niqqud regression groups passed.`);
