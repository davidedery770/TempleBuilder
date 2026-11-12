import { text, roundRect } from '../core/art.js';
import { drawLearningIcon } from '../core/learningArt.js';
import { backdrop, panel, header } from './shared.js';

export const MATCHING_CUES = Object.freeze(['נחבר מילה לתמונה.','עכשיו בחרו תמונה.','נכון!','ננסה תמונה אחרת.','כל הכבוד! הכול מחובר.','המשחק נעצר.','מחברים ובונים','מילה ← תמונה','חזרה','ממשיכים']);
const DEFAULT_PAIRS = [
  {id:'gold',label:'זהב',icon:'menorah'}, {id:'bronze',label:'נחושת',icon:'altar'}, {id:'shittim',label:'עצי שיטים',icon:'boards'},
];
const ICONS = new Set(['menorah','altar','boards','oil','shofar','ark','stone','grain','water','olive','basket','drop','gold','silver','bronze']);
const COLORS = ['#ca8b27','#318a91','#8a63ad','#4d8d4c'];
const NEXT={x:360,y:465,w:240,h:60}, BACK={x:20,y:16,w:110,h:52};
export function validateMatchingPairs(pairs) {
  return Array.isArray(pairs) && pairs.length>=3 && pairs.length<=4
    && pairs.every(p=>p && typeof p.id==='string' && p.id.trim() && typeof p.label==='string'
      && p.label.trim() && Array.from(p.label).length<=16 && ICONS.has(p.icon))
    && ['id','label','icon'].every(key=>new Set(pairs.map(p=>p[key].trim())).size===pairs.length);
}
export function normalizeMatchingPairs(pairs) {
  return (validateMatchingPairs(pairs)?pairs:DEFAULT_PAIRS).map(({id,label,icon})=>({id,label:label.trim(),icon}));
}
export function canMatchPair(pairs,termId,objectId,matchedIds=[]) {
  return termId===objectId && !matchedIds.includes(termId) && pairs.some(p=>p.id===termId);
}
export function restoreMatchingProgress(pairs,progress={}) {
  const ids=pairs.map(p=>p.id), saved=progress&&typeof progress==='object'?progress:{};
  return {
    matchedIds:Array.isArray(saved.matchedIds)?[...new Set(saved.matchedIds.filter(id=>ids.includes(id)))]:[],
    mistakes:Number.isSafeInteger(saved.mistakes)&&saved.mistakes>=0?saved.mistakes:0,
    rightOrder:Array.isArray(saved.rightOrder)&&saved.rightOrder.length===ids.length
      && new Set(saved.rightOrder).size===ids.length&&saved.rightOrder.every(id=>ids.includes(id))?[...saved.rightOrder]:null,
  };
}
export function shuffleMatchingIds(ids,random=Math.random) {
  const result=[...ids];
  for(let i=result.length-1;i>0;i--){const n=Number(random()),j=Math.min(i,Math.max(0,Math.floor((Number.isFinite(n)?n:0)*(i+1))));[result[i],result[j]]=[result[j],result[i]];}
  return result;
}
const contains=(r,p)=>p&&p.inside!==false&&p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h;
export class MatchingGame {
  constructor(game,params={}) {
    this.game=game;this.pairs=normalizeMatchingPairs(params.pairs);this.title=params.title||'מחברים ובונים';this.speaker=params.speaker;
    const saved=restoreMatchingProgress(this.pairs,params.progress);
    this.matchedIds=saved.matchedIds;this.mistakes=saved.mistakes;
    this.rightOrder=saved.rightOrder||shuffleMatchingIds(this.pairs.map(p=>p.id));
    this.finished=false;this.result=null;this.age=0;this.selectedId=null;this.drag=null;this.pointer=null;this.wasDown=false;
    this.focusSide='left';this.focusRow=0;this.cueSerial=0;this.voiceSerial=0;this.cue(this.complete?4:0);
  }
  get complete(){return this.matchedIds.length===this.pairs.length;}
  getVoiceLines(){return [...new Set([...MATCHING_CUES,this.title,...this.pairs.map(p=>p.label)])];}
  cue(i){this.narrationText=MATCHING_CUES[i];this.narrationKey=`matching:${i}:${++this.cueSerial}`;}
  getProgress(){return {version:1,matchedIds:[...this.matchedIds],mistakes:this.mistakes,rightOrder:[...this.rightOrder]};}
  card(side,row){return {x:side==='left'?100:610,y:132+row*(this.pairs.length===4?76:96),w:250,h:this.pairs.length===4?66:80};}
  idAt(side,row){return side==='left'?this.pairs[row].id:this.rightOrder[row];}
  hit(side,p){return this.pairs.findIndex((_,i)=>contains(this.card(side,i),p));}
  select(id){
    if(this.matchedIds.includes(id))return;
    this.selectedId=id;this.voiceLabel=this.pairs.find(p=>p.id===id).label;this.voiceLabelKey=`matching:label:${id}:${++this.voiceSerial}`;this.cue(1);
  }
  attempt(id,audio){
    if(!this.selectedId)return;
    if(canMatchPair(this.pairs,this.selectedId,id,this.matchedIds)){this.matchedIds.push(this.selectedId);audio?.correct?.();this.cue(this.complete?4:2);}
    else {this.mistakes++;this.cue(3);}
    this.selectedId=this.drag=this.voiceLabel=this.voiceLabelKey=null;this.focusSide='left';
  }
  finish(cancelled){
    this.finished=true;if(cancelled)this.cue(5);
    this.result={kind:'matching',success:!cancelled&&this.complete,cancelled,perfect:this.complete&&this.mistakes===0,
      correct:this.matchedIds.length,total:this.pairs.length,progress:this.getProgress()};
  }
  update(dt,input,audio){
    if(this.finished)return;
    const pressed=a=>Boolean(input.pressed(a)),p=input.pointer;
    if(pressed('back')||input.clicked&&contains(BACK,p)){this.finish(true);return;}
    this.age+=Math.max(0,Number.isFinite(dt)?dt:0);this.pointer=p?{...p}:null;const down=!!p?.down;
    if(this.age<0.15){this.wasDown=down;return;}
    if(input.pointerCancelled){this.drag=this.selectedId=null;this.wasDown=down;return;}
    const click=!!input.clicked||down&&!this.wasDown,release=!!input.pointerReleased||!down&&this.wasDown;this.wasDown=down;
    if(this.complete){if(pressed('confirm')||pressed('jump')||click&&contains(NEXT,p))this.finish(false);return;}
    if(pressed('up'))this.focusRow=(this.focusRow+this.pairs.length-1)%this.pairs.length;
    if(pressed('down'))this.focusRow=(this.focusRow+1)%this.pairs.length;
    if(pressed('left'))this.focusSide='left';if(pressed('right'))this.focusSide='right';
    if(pressed('confirm')||pressed('jump')){
      const id=this.idAt(this.focusSide,this.focusRow);
      if(this.focusSide==='left'){this.select(id);this.focusSide='right';}else this.attempt(id,audio);
    }
    if(click){
      const l=this.hit('left',p),r=this.hit('right',p);
      if(l>=0&&!this.matchedIds.includes(this.idAt('left',l))){
        this.focusRow=l;this.focusSide='left';this.select(this.idAt('left',l));this.drag={x:p.x,y:p.y,moved:false};
      }else if(r>=0){this.focusRow=r;this.focusSide='right';this.attempt(this.idAt('right',r),audio);}
    }
    if(this.drag&&p){
      if(Math.hypot(p.x-this.drag.x,p.y-this.drag.y)>10)this.drag.moved=true;
      if(release){const r=this.hit('right',p);if(r>=0)this.attempt(this.idAt('right',r),audio);else if(this.drag.moved)this.selectedId=null;this.drag=null;}
    }
  }
  wire(ctx,a,b,color,dashed=false){
    ctx.save();ctx.strokeStyle=color;ctx.lineWidth=6;ctx.lineCap='round';ctx.setLineDash(dashed?[10,9]:[]);
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.bezierCurveTo(a.x+95,a.y,b.x-95,b.y,b.x,b.y);ctx.stroke();ctx.restore();
  }
  draw(ctx){
    ctx.save();backdrop(ctx,1);header(ctx,this.title,'מילה ← תמונה',32);panel(ctx,66,112,828,340);
    this.pairs.forEach((pair,row)=>{
      if(!this.matchedIds.includes(pair.id))return;
      const l=this.card('left',row),r=this.card('right',this.rightOrder.indexOf(pair.id));
      this.wire(ctx,{x:l.x+l.w,y:l.y+l.h/2},{x:r.x,y:r.y+r.h/2},COLORS[row]);
    });
    if(this.selectedId){
      const row=this.pairs.findIndex(p=>p.id===this.selectedId),c=this.card('left',row);
      const end=this.drag?.moved&&this.pointer?.inside!==false&&this.pointer
        ?{x:Math.max(350,Math.min(610,this.pointer.x)),y:Math.max(125,Math.min(435,this.pointer.y))}:{x:475,y:c.y+c.h/2};
      this.wire(ctx,{x:c.x+c.w,y:c.y+c.h/2},end,COLORS[row],true);
    }
    for(const side of ['left','right'])for(let row=0;row<this.pairs.length;row++){
      const id=this.idAt(side,row),index=this.pairs.findIndex(p=>p.id===id),pair=this.pairs[index],c=this.card(side,row);
      const locked=this.matchedIds.includes(id),focused=!this.complete&&this.focusSide===side&&this.focusRow===row,selected=side==='left'&&this.selectedId===id;
      ctx.fillStyle=locked?'#e1f1de':selected?'#fff0bf':'#fffaf0';roundRect(ctx,c.x,c.y,c.w,c.h,15);ctx.fill();
      ctx.lineWidth=focused||selected?4:2;ctx.strokeStyle=locked?COLORS[index]:focused||selected?'#a36d19':'#bca98b';ctx.stroke();
      if(side==='left')text(ctx,pair.label,c.x+c.w/2,c.y+c.h/2,{size:Array.from(pair.label).length>10?23:29,color:'#49341e',outline:null});
      else drawLearningIcon(ctx,pair.icon,c.x+c.w/2,c.y+c.h/2,c.h-14);
      if(locked)text(ctx,'✓',c.x+22,c.y+c.h/2,{size:25,color:'#367a39',outline:null});
    }
    ctx.fillStyle='#fff6df';roundRect(ctx,BACK.x,BACK.y,BACK.w,BACK.h,12);ctx.fill();
    text(ctx,'חזרה',75,44,{size:22,color:'#49341e',outline:null});
    if(this.complete){
      ctx.fillStyle='#497c3c';roundRect(ctx,NEXT.x,NEXT.y,NEXT.w,NEXT.h,15);ctx.fill();
      text(ctx,'ממשיכים',480,497,{size:28,color:'#fff',outline:null});text(ctx,MATCHING_CUES[4],480,93,{size:23,color:'#426b31',outline:null});
    }else text(ctx,this.narrationText,480,503,{size:25,color:'#fff0c8',outline:null});
    ctx.restore();
  }
}
