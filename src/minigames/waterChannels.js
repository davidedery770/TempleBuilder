import { text, roundRect, circle } from '../core/art.js';
import { backdrop, panel, header, bar } from './shared.js';
import { drawLearningIcon } from '../core/learningArt.js';

const COPY={title:'מים לגינת המחנה',intro:'סובבו את התעלות',help:'נגיעה או גרירה לסיבוב',hint:'עזרה',flowing:'המים זורמים!',next:'המשך',back:'חזרה',source:'מים',garden:'גינה',rotate:'סיבוב',hintGiven:'התעלה במקום'};
export const WATER_CUES=Object.freeze(Object.values(COPY));
const START=[0,0,1,1],SOLUTION=[2,1,0,3],DX=[0,1,0,-1],DY=[-1,0,1,0];
const finite=n=>Number.isFinite(Number(n))?Number(n):0;
const mod4=n=>((Math.trunc(finite(n))%4)+4)%4,count=n=>Math.max(0,Math.floor(finite(n)));
const TILE=116,STEP=132,GX=348,GY=146;
const BACK={x:24,y:24,w:108,h:54},HELP={x:688,y:442,w:166,h:66},ACTION={x:354,y:442,w:252,h:66};
export function getWaterFlow(rotations=START){
  const turns=Array.from({length:4},(_,i)=>mod4(rotations?.[i])),path=[],seen=new Set();
  let index=0,entry=3;
  while(!seen.has(index)){
    seen.add(index);const ports=[turns[index],(turns[index]+1)%4];
    if(!ports.includes(entry))return {connected:false,path};
    const exit=ports[0]===entry?ports[1]:ports[0];path.push({index,entry,exit});
    if(index===1&&exit===1)return {connected:true,path};
    const x=index%2+DX[exit],y=Math.floor(index/2)+DY[exit];if(x<0||x>1||y<0||y>1)break;
    index=y*2+x;entry=(exit+2)%4;
  }
  return {connected:false,path};
}
const hit=(input,r)=>input.pointer?.inside&&input.pointer.x>=r.x&&input.pointer.x<=r.x+r.w&&input.pointer.y>=r.y&&input.pointer.y<=r.y+r.h;
const pressed=(input,...a)=>a.some(k=>input.pressed?.(k));
const tileBox=i=>({x:GX+i%2*STEP,y:GY+Math.floor(i/2)*STEP,w:TILE,h:TILE});
const portPoint=(r,p)=>[r.x+TILE/2+DX[p]*TILE/2,r.y+TILE/2+DY[p]*TILE/2];
function button(ctx,r,label,color='#23686d'){
  ctx.fillStyle=color;roundRect(ctx,r.x,r.y,r.w,r.h,18);ctx.fill();text(ctx,label,r.x+r.w/2,r.y+r.h/2,{size:27,color:'#fff',outline:null});
}
function channel(ctx,r,a,b,color,width){
  ctx.beginPath();ctx.moveTo(...portPoint(r,a));ctx.lineTo(r.x+TILE/2,r.y+TILE/2);ctx.lineTo(...portPoint(r,b));
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();
}
export class WaterChannelsGame {
  constructor(game,params={}){
    this.game=game;this.speaker=params.speaker||'מדריך הסדנה';const s=params.progress||{};
    this.progress={rotations:Array.from({length:4},(_,i)=>mod4(s.rotations?.[i]??START[i])),moves:count(s.moves),hints:count(s.hints)};
    this.finished=false;this.result=null;this.elapsed=0;this.focus=0;this.drag=null;this.wasDown=false;
    this.solved=getWaterFlow(this.progress.rotations).connected;this.say(this.solved?'flowing':'intro');
  }
  say(key){this.narrationKey=`waterChannels.${key}`;this.narrationText=COPY[key];}
  finish(cancelled){this.finished=true;const success=!cancelled&&this.solved;this.result={kind:'waterChannels',success,cancelled,perfect:success&&this.progress.hints===0,progress:{...this.progress,rotations:[...this.progress.rotations]}};}
  rotate(i,d,audio){this.focus=i;this.progress.rotations[i]=mod4(this.progress.rotations[i]+d);this.progress.moves++;this.solved=getWaterFlow(this.progress.rotations).connected;this.say(this.solved?'flowing':'rotate');if(this.solved)audio?.correct?.();}
  update(dt,input,audio){
    if(this.finished)return;this.elapsed+=Math.max(0,Math.min(finite(dt),0.1));const clicked=input.clicked&&!input.pointerCancelled;
    if(pressed(input,'back')||clicked&&hit(input,BACK)){this.finish(true);return;}
    const down=!!input.pointer?.down;
    if(this.elapsed<0.15){this.wasDown=down;this.drag=null;return;}
    if(this.solved){if(pressed(input,'confirm','jump')||clicked&&hit(input,ACTION))this.finish(false);return;}
    if(pressed(input,'build')||clicked&&hit(input,HELP)){
      const i=this.progress.rotations.findIndex((r,i)=>r!==SOLUTION[i]);
      if(i>=0){this.progress.hints++;this.progress.rotations[i]=SOLUTION[i];this.focus=i;this.solved=getWaterFlow(this.progress.rotations).connected;this.say(this.solved?'flowing':'hintGiven');if(this.solved)audio?.correct?.();}
      this.drag=null;this.wasDown=down;return;
    }
    if(pressed(input,'left','right'))this.focus^=1;if(pressed(input,'up','down'))this.focus^=2;
    for(let i=0;i<4;i++)if(pressed(input,`opt${i+1}`)){this.rotate(i,1,audio);this.wasDown=down;return;}
    if(pressed(input,'confirm','jump')||clicked&&hit(input,ACTION)){this.rotate(this.focus,1,audio);this.drag=null;this.wasDown=down;return;}
    if(input.pointerCancelled)this.drag=null;
    else{
      if(down&&!this.wasDown){const i=[0,1,2,3].find(i=>hit(input,tileBox(i)));if(i!==undefined){this.focus=i;this.drag={index:i,x:input.pointer.x};}}
      if(this.drag&&(input.pointerReleased||!down&&this.wasDown)){if(input.pointer?.inside)this.rotate(this.drag.index,input.pointer.x-this.drag.x< -24?-1:1,audio);this.drag=null;}
      else if(clicked&&!down&&!this.wasDown){const i=[0,1,2,3].find(i=>hit(input,tileBox(i)));if(i!==undefined)this.rotate(i,1,audio);}
    }
    this.wasDown=down;
  }
  draw(ctx){
    ctx.save();backdrop(ctx,1);header(ctx,COPY.title,this.solved?COPY.flowing:COPY.intro,50);panel(ctx,170,125,620,294);
    const flow=getWaterFlow(this.progress.rotations);
    ctx.strokeStyle='#67d8e8';ctx.lineWidth=18;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(260,204);ctx.lineTo(GX,204);ctx.stroke();
    drawLearningIcon(ctx,'water',236,202,72);text(ctx,COPY.source,236,274,{size:25,color:'#fff2cf'});
    for(let i=0;i<4;i++){const r=tileBox(i),turn=this.progress.rotations[i];ctx.fillStyle=!this.solved&&i===this.focus?'#f8d789':'#e7c79e';roundRect(ctx,r.x,r.y,TILE,TILE,17);ctx.fill();channel(ctx,r,turn,(turn+1)%4,'#78624a',31);channel(ctx,r,turn,(turn+1)%4,'#c3b18c',21);}
    ctx.setLineDash([13,11]);ctx.lineDashOffset=-this.elapsed*48;
    flow.path.forEach((s,i)=>{
      channel(ctx,tileBox(s.index),s.entry,s.exit,'#52d8ef',17);const next=flow.path[i+1];
      if(next){ctx.beginPath();ctx.moveTo(...portPoint(tileBox(s.index),s.exit));ctx.lineTo(...portPoint(tileBox(next.index),next.entry));ctx.stroke();}
    });
    if(this.solved){ctx.beginPath();ctx.moveTo(GX+STEP+TILE,204);ctx.lineTo(710,204);ctx.stroke();}
    ctx.setLineDash([]);
    for(let i=0;i<3;i++){const x=696+i*21,y=230+i%2*18;ctx.strokeStyle=this.solved?'#31864b':'#738966';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x,y+23);ctx.lineTo(x,y-7);ctx.stroke();circle(ctx,x-8,y,9,this.solved?'#62bb63':'#a5b58a');circle(ctx,x+8,y-9,9,this.solved?'#62bb63':'#a5b58a');}
    text(ctx,COPY.garden,718,303,{size:25,color:'#fff2cf'});bar(ctx,348,402,248,8,flow.path.length/4,'#45b9d0');
    button(ctx,BACK,COPY.back,'#596c78');button(ctx,ACTION,this.solved?COPY.next:COPY.rotate);
    if(!this.solved){button(ctx,HELP,COPY.hint,'#88703f');text(ctx,COPY.help,480,109,{size:23,color:'#e6f3f5'});}ctx.restore();
  }
}
