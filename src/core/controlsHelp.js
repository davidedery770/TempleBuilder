import { text, drawPlayer, glow } from './art.js';
import { drawParchment } from './selectionArt.js';
import { drawLearningIcon } from './learningArt.js';
import { artTime } from './visualMotion.js';

export function controlCards(hasShofar = false) {
  return [
    { name:'תנועה',key:'← →',kind:'move' },{ name:'קפיצה',key:'רווח / ↑',kind:'jump' },
    { name:'היעלמות באור',key:'Z',kind:'attack' },{ name:'שיחה / בחירה',key:'Enter',kind:'confirm' },
    { name:'כפיפה',key:'↓',kind:'crouch' },
    ...(hasShofar?[{name:'פתיחת מעבר',key:'X',kind:'shofar'}]:[]),
  ];
}
export function drawControlsHelp(ctx, game, time, hasShofar) {
  const t=artTime(time);
  ctx.fillStyle='rgba(7,27,40,0.9)';ctx.fillRect(0,0,960,540);
  drawParchment(ctx,90,24,780,492,true);
  text(ctx,'איך משחקים?',480,57,{size:27,color:'#46311b',outline:null});
  controlCards(hasShofar).forEach((card,i)=>{
    const x=120+(i%2)*370,y=89+Math.floor(i/2)*120;
    drawParchment(ctx,x,y,350,108);
    if(card.kind==='shofar')drawLearningIcon(ctx,'shofar',x+58,y+48,54);
    else if(card.kind==='confirm'){
      text(ctx,'☝',x+58+Math.sin(t*2)*8,y+44,{size:38,color:'#174f69',outline:null});
    }else{
      const jump=card.kind==='jump'?Math.max(0,Math.sin(t*2.4))*23:0;
      drawPlayer(ctx,x+44,y+36-jump,22,42,{facing:card.kind==='move'&&Math.sin(t)<0?-1:1,
        state:card.kind==='move'?'run':card.kind==='crouch'?'crouch':jump?'jump':'idle',
        animTime:t,attackTime:card.kind==='attack'?(Math.sin(t*2)+1)/2:0});
      if(card.kind==='attack')glow(ctx,x+87,y+45,12,'#ffe28c',0.2);
    }
    text(ctx,card.name,x+325,y+34,{size:19,color:'#3d3427',align:'right',outline:null});
    text(ctx,game.touch?.enabled?card.kind==='move'?'כפתורי החצים':card.name:card.key,x+325,y+70,
      {size:15,color:'#236781',align:'right',outline:null});
  });
  text(ctx,'חזרה',480,483,{size:20,color:'#155874',outline:null});
}
