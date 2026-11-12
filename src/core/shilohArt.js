import { circle, glow, text, hashNoise } from './art.js';
import { drawLearningIcon } from './learningArt.js';
import { artTime } from './visualMotion.js';

export function drawShilohBackdrop(ctx,W,H,camX,camY,time,assets){
  const sky=ctx.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,'#a3cfe0');sky.addColorStop(0.6,'#f8e6b3');sky.addColorStop(1,'#a4b27b');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  if(assets.shiloh){
    const w=H*assets.shiloh.width/assets.shiloh.height,h=H;
    // Clamped, not wrapped: a modulo snapped the hills back to the start mid-level.
    const shift=Math.min(camX*0.035,Math.max(0,w-W));
    ctx.drawImage(assets.shiloh,-shift,-camY*0.05,w,h);
  }
  glow(ctx,W*0.78-camX*0.015,100,170,'#fff0b8',0.22);
  for(let layer=0;layer<2;layer++){
    const base=H*(0.8+layer*0.12)-camY*0.15;ctx.fillStyle=layer?'#8ba065':'#afbe88';
    ctx.beginPath();ctx.moveTo(0,H);
    for(let x=0;x<=W+20;x+=15)ctx.lineTo(x,base-Math.sin((x+camX*(0.12+layer*0.1))*0.006)*20);
    ctx.lineTo(W,H);ctx.closePath();ctx.fill();
  }
}
export function drawOliveTrees(ctx,trees,camX,camY,time,player=null,touch=false){
  const t=artTime(time);
  for(const tree of trees){
    const x=tree.x-camX+(tree.shake?Math.sin(time*38)*tree.shake*8:0),y=tree.y-camY;if(x< -180||x>1140)continue;
    ctx.strokeStyle='#88724c';ctx.lineWidth=18;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x-14,y-55,x+4,y-116);ctx.stroke();
    ctx.lineWidth=9;
    for(const d of [-1,1]){ctx.beginPath();ctx.moveTo(x,y-65);ctx.lineTo(x+d*40,y-119);ctx.stroke();}
    for(let i=0;i<11;i++){
      const a=i*2.4,r=18+(i%3)*17,xx=x+Math.cos(a)*r+Math.sin(t+i)*2,yy=y-130+Math.sin(a)*r*0.5;
      circle(ctx,xx,yy,31,i%3===0?'#b5c387':i%2?'#77945d':'#92a96c');
    }
    ctx.fillStyle='#d6ddaa';
    for(let i=0;i<16;i++){
      const xx=x+Math.sin(i*1.4)*68,yy=y-130+Math.cos(i*2.2)*30;
      ctx.beginPath();ctx.ellipse(xx,yy,7,2.5,i,0,Math.PI*2);ctx.fill();
    }
    if(!tree.harvested){
      for(let i=0;i<4;i++)drawLearningIcon(ctx,'olive',x-38+i*25,y-135+i%2*19,19);
      if(player&&Math.abs(player.centerX-tree.x)<145)text(ctx,touch?'אור — מסיק':'Z / Enter — מסיק',x,y-197,{size:18,color:'#fff1bf'});
    }else text(ctx,'✓',x+64,y-142,{size:22,color:'#fff2ba'});
  }
}
export function drawOrchardPress(ctx,c,camX,camY,done,time){
  const x=c.x-camX,y=c.y-camY;
  ctx.fillStyle='#b0a18a';ctx.fillRect(x-10,y+55,85,45);
  ctx.fillStyle='#dfcda6';ctx.fillRect(x-15,y+50,95,10);
  drawLearningIcon(ctx,done?'oil':'basket',x+32,y+25,55);
  text(ctx,done?'✓':'☝',x+32,y-19+Math.sin(artTime(time)*2)*3,{size:24,color:'#f8e5ab'});
}
export function drawShilohTile(ctx,ch,x,y,col,row,layer,map){
  if(ch!=='#')return false;
  const top=!map.isSolid(col,row-1),n=hashNoise(col,row);
  ctx.fillStyle=top?'#bdb28b':'#a89d7e';ctx.fillRect(x,y,32,32);
  ctx.strokeStyle='#887f65';ctx.lineWidth=1;ctx.strokeRect(x+(row%2)*2,y+2,29,25);
  ctx.fillStyle='#dcd1aa';ctx.fillRect(x+3,y+3,25,2);
  if(top){ctx.fillStyle='#91a365';ctx.fillRect(x,y,32,4);ctx.fillStyle='#bac88a';ctx.fillRect(x,y,32,1);}
  if(n>0.7){ctx.fillStyle='#c6bc98';ctx.fillRect(x+14,y+12,7,3);}return true;
}
