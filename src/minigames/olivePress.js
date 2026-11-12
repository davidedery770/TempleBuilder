import { text, roundRect, circle } from '../core/art.js';
import { backdrop, panel, header, bar } from './shared.js';
import { drawLearningIcon } from '../core/learningArt.js';

const COPY={title:'בית הבד',crush:'כותשים בעדינות',filter:'מסננים לכד',tap:'לחצו בירוק',again:'ננסה שוב',wider:'עכשיו קל יותר',good:'יופי!',ready:'השמן בכד!',press:'לחיצה',help:'עזרה',back:'חזרה',next:'המשך'};
export const PRESS_CUES=Object.freeze(Object.values(COPY));
const GOAL=5,finite=(n,f=0)=>Number.isFinite(Number(n))?Number(n):f,count=n=>Math.max(0,Math.floor(finite(n)));
const BACK={x:24,y:24,w:108,h:54},ACTION={x:286,y:430,w:388,h:82},HELP={x:728,y:440,w:170,h:65};
export function evaluatePress(phase,misses=0,assisted=false){
  const normalized=((finite(phase)%1)+1)%1,halfWidth=count(misses)>=3?0.27:0.18;
  return {hit:!!assisted||Math.abs(normalized-0.5)<=halfWidth,halfWidth,phase:normalized};
}
const pressed=(input,...a)=>a.some(k=>input.pressed?.(k));
const hit=(input,r)=>input.pointer?.inside&&input.pointer.x>=r.x&&input.pointer.x<=r.x+r.w&&input.pointer.y>=r.y&&input.pointer.y<=r.y+r.h;
function button(ctx,r,label,color='#547b40'){ctx.fillStyle=color;roundRect(ctx,r.x,r.y,r.w,r.h,20);ctx.fill();text(ctx,label,r.x+r.w/2,r.y+r.h/2,{size:30,color:'#fff',outline:null});}
export class OlivePressGame {
  constructor(game,params={}){
    this.game=game;this.speaker=params.speaker||'מדריך הסדנה';const s=params.progress||{};
    this.progress={successes:Math.min(GOAL,count(s.successes)),misses:count(s.misses),assists:count(s.assists),phase:evaluatePress(s.phase??0.1).phase};
    this.finished=false;this.result=null;this.elapsed=0;this.feedback=0;this.stroke=0;this.cooldown=0;
    this.say(this.progress.successes>=GOAL?'ready':this.progress.successes>=3?'filter':'crush');
  }
  say(key){this.narrationKey=`olivePress.${key}`;this.narrationText=COPY[key];}
  finish(cancelled){this.finished=true;const success=!cancelled&&this.progress.successes>=GOAL;this.result={kind:'olivePress',success,cancelled,perfect:success&&this.progress.misses===0&&this.progress.assists===0,progress:{...this.progress}};}
  attempt(assisted,audio){
    if(this.progress.successes>=GOAL||this.cooldown>0)return;
    const r=evaluatePress(this.progress.phase,this.progress.misses,assisted);this.cooldown=0.22;this.feedback=0.65;this.stroke=0.32;this.lastHit=r.hit;
    if(r.hit){this.progress.successes++;if(assisted)this.progress.assists++;this.say(this.progress.successes>=GOAL?'ready':this.progress.successes===3?'filter':'good');audio?.correct?.();}
    else{this.progress.misses++;this.say(this.progress.misses===3?'wider':'again');}
  }
  update(dt,input,audio){
    if(this.finished)return;const step=Math.max(0,Math.min(finite(dt),0.1));this.elapsed+=step;
    this.feedback=Math.max(0,this.feedback-step);this.stroke=Math.max(0,this.stroke-step);this.cooldown=Math.max(0,this.cooldown-step);
    const clicked=input.clicked&&!input.pointerCancelled;
    if(pressed(input,'back')||clicked&&hit(input,BACK)){this.finish(true);return;}
    if(this.elapsed<0.15)return;
    if(this.progress.successes>=GOAL){if(pressed(input,'confirm','jump','attack')||clicked&&hit(input,ACTION))this.finish(false);return;}
    this.progress.phase=(this.progress.phase+step/2.4)%1;if(input.pointerCancelled)return;
    const assisted=pressed(input,'build')||clicked&&hit(input,HELP);
    if(assisted||pressed(input,'confirm','jump','attack')||clicked&&hit(input,ACTION))this.attempt(assisted,audio);
  }
  draw(ctx){
    ctx.save();backdrop(ctx,1);const n=this.progress.successes,done=n>=GOAL;
    header(ctx,COPY.title,done?COPY.ready:n>=3?COPY.filter:COPY.crush,50);panel(ctx,160,126,640,216);
    drawLearningIcon(ctx,'basket',220,247,91);
    for(let i=0;i<3;i++)drawLearningIcon(ctx,'olive',198+i*22,218-i%2*13,30);
    ctx.fillStyle='#857b70';roundRect(ctx,303,235,164,72,28);ctx.fill();ctx.fillStyle='#b4a493';ctx.beginPath();ctx.ellipse(385,237,82,23,0,0,Math.PI*2);ctx.fill();
    for(let i=0;i<4;i++)drawLearningIcon(ctx,'olive',344+i*26,237,27);
    const dip=Math.sin(this.stroke/0.32*Math.PI)*24;ctx.save();ctx.translate(385,195+dip);ctx.rotate(-0.23);ctx.fillStyle='#d2b88b';roundRect(ctx,-13,-59,26,94,13);ctx.fill();ctx.restore();
    drawLearningIcon(ctx,'basket',568,187,88);ctx.strokeStyle='#e9dcaf';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(525,207);ctx.lineTo(568,229);ctx.lineTo(611,207);ctx.stroke();
    ctx.fillStyle='#bd8753';roundRect(ctx,527,259,86,61,18);ctx.fill();ctx.strokeStyle='#bd8753';ctx.lineWidth=9;ctx.beginPath();ctx.arc(617,283,18,-Math.PI/2,Math.PI/2);ctx.stroke();
    const fill=Math.max(0,(n-3)/2);ctx.fillStyle='#f4c947';if(fill>0){roundRect(ctx,536,310-42*fill,68,42*fill,9);ctx.fill();}
    if(n>=3)drawLearningIcon(ctx,'drop',568,227+this.elapsed*38%28,23);
    drawLearningIcon(ctx,'oil',707,248,83);for(let i=0;i<GOAL;i++)circle(ctx,392+i*44,325,10,i<n?'#f2c74d':'#d0c6aa');bar(ctx,240,351,480,10,n/GOAL,'#e2b84d');
    if(!done){
      const {halfWidth}=evaluatePress(this.progress.phase,this.progress.misses);
      ctx.fillStyle='#dfc494';roundRect(ctx,240,379,480,28,12);ctx.fill();ctx.fillStyle='#69bb68';roundRect(ctx,240+(0.5-halfWidth)*480,379,halfWidth*960,28,10);ctx.fill();
      const x=240+this.progress.phase*480;circle(ctx,x,393,15,'#fff');circle(ctx,x,393,7,'#415268');
      text(ctx,this.feedback>0?this.narrationText:COPY.tap,480,112,{size:25,color:'#edf7e6'});button(ctx,HELP,COPY.help,'#88703f');
    }
    button(ctx,ACTION,done?COPY.next:COPY.press);button(ctx,BACK,COPY.back,'#596c78');ctx.restore();
  }
}
