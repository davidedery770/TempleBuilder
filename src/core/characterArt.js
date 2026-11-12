// Symbolic role costumes, not a claim to know the historical likeness of a person.
const ellipse=(ctx,x,y,rx,ry,color)=>{ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();};
export function drawCharacterCostume(ctx,cx,top,bottom,w,h,c){
  const role=c.role;
  if(['royal','warriorKing','mantle','prophet'].includes(role)){
    ctx.fillStyle=role==='warriorKing'?'#722e35':role==='royal'?'#634068':role==='mantle'?'#806043':'#cbbf9e';
    ctx.beginPath();ctx.moveTo(cx-w*0.24,top);ctx.lineTo(cx-w*0.55,bottom+h*0.15);
    ctx.lineTo(cx-w*0.2,bottom+h*0.15);ctx.lineTo(cx+w*0.22,top);ctx.closePath();ctx.fill();
  }
  if(role==='woman'||role==='youngProphet'){
    ctx.fillStyle=c.robe;ctx.beginPath();ctx.moveTo(cx-w*0.26,top);
    ctx.lineTo(cx+w*0.26,top);ctx.lineTo(cx+w*0.47,bottom+h*0.13);ctx.lineTo(cx-w*0.47,bottom+h*0.13);ctx.closePath();ctx.fill();
    ctx.strokeStyle=c.sash;ctx.lineWidth=w*0.08;ctx.beginPath();ctx.moveTo(cx-w*0.23,top);ctx.lineTo(cx+w*0.26,bottom);ctx.stroke();
  }
  if(role==='artisan'){
    ctx.fillStyle='#93633e';ctx.fillRect(cx-w*0.25,top+h*0.1,w*0.5,h*0.31);
    ctx.fillStyle='#d8b16c';ctx.fillRect(cx-w*0.18,top+h*0.28,w*0.16,h*0.08);
  }
  if(role==='weaver'){
    for(let i=0;i<4;i++){ctx.fillStyle=['#3f88ab','#9e5b9d','#bd5862','#f1e4bc'][i];ctx.fillRect(cx-w*0.25+i*w*0.13,top+h*0.08,w*0.08,h*0.26);}
  }
  if(role==='highPriest'){
    ctx.fillStyle='#487caa';ctx.fillRect(cx-w*0.31,top,w*0.62,bottom-top);
    ctx.fillStyle='#d0aa42';ctx.fillRect(cx-w*0.28,top+h*0.05,w*0.56,h*0.3);
    const gems=['#d3473c','#64b779','#64a9de','#a75b9c','#dca741','#e5e1c7','#717ca9','#e18452','#438b73','#ddc9a6','#9d7589','#99c6cf'];
    for(let r=0;r<4;r++)for(let col=0;col<3;col++){
      ctx.fillStyle=gems[r*3+col];ctx.fillRect(cx-w*0.22+col*w*0.155,top+h*0.075+r*h*0.058,w*0.12,h*0.047);
    }
    ctx.fillStyle=c.sash;ctx.fillRect(cx-w*0.31,bottom-h*0.035,w*0.62,h*0.06);
    for(let i=0;i<5;i++)ellipse(ctx,cx-w*0.26+i*w*0.13,bottom+h*0.035,w*0.035,h*0.025,i%2?'#ae5570':'#e6bc4e');
  }
  if(role==='priest'){ctx.fillStyle='#fff9e8';ctx.fillRect(cx-w*0.27,top,w*0.54,bottom-top);}
  if(role==='guard'||role==='warriorKing'){
    ctx.fillStyle=role==='guard'?'#8c7450':'#a7acac';ctx.fillRect(cx-w*0.27,top+h*0.04,w*0.54,h*0.25);
    ctx.strokeStyle=role==='guard'?'#d2b37a':'#d9d9ca';ctx.lineWidth=0.7;
    for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(cx-w*0.25,top+h*(0.07+i*0.055));ctx.lineTo(cx+w*0.25,top+h*(0.07+i*0.055));ctx.stroke();}
  }
}
export function drawCharacterHeadwear(ctx,cx,y,r,c){
  const hat=c.headwear;
  if(hat==='turban'){
    ellipse(ctx,cx,y-r*0.65,r*1.25,r*0.68,'#fff9e8');
    ctx.strokeStyle='#bdb7a4';ctx.lineWidth=r*0.1;
    for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(cx-r,y-r*(0.4+i*0.25));ctx.quadraticCurveTo(cx,y-r*(0.2+i*0.25),cx+r,y-r*(0.45+i*0.25));ctx.stroke();}
    if(c.role==='highPriest'){ctx.fillStyle='#d5ae43';ctx.fillRect(cx-r,y-r*0.46,r*2,r*0.27);}
  }else if(hat?.startsWith('crown')){
    ctx.fillStyle='#dcaf3f';const top=y-r*(hat==='crownTall'?1.8:1.45);
    ctx.beginPath();ctx.moveTo(cx-r*1.15,y-r*0.4);ctx.lineTo(cx-r*1.2,top);
    ctx.lineTo(cx-r*0.5,top+r*0.4);ctx.lineTo(cx,top-r*0.2);ctx.lineTo(cx+r*0.5,top+r*0.4);
    ctx.lineTo(cx+r*1.2,top);ctx.lineTo(cx+r*1.15,y-r*0.4);ctx.closePath();ctx.fill();
    ellipse(ctx,cx,y-r*0.76,r*0.19,r*0.19,c.id==='david'?'#b94542':'#4596bc');
  }else if(hat==='band'){
    ctx.fillStyle=c.sash;ctx.fillRect(cx-r*1.12,y-r*0.8,r*2.25,r*0.42);
    ctx.fillStyle=c.sash;ctx.fillRect(cx-r*1.3,y-r*0.4,r*0.35,r*1.5);
  }else if(hat==='scholar'){
    ellipse(ctx,cx,y-r*0.8,r*1.2,r*0.52,'#d9d5c2');
    ctx.fillStyle='#66889a';ctx.fillRect(cx-r*1.1,y-r*0.7,r*2.2,r*0.22);
  }
}
export function drawCharacterProp(ctx,x,y,h,c,attackTime=0){
  const prop=c.prop;
  // Books, scrolls and tablets were as tall as the character; they now fit in a hand.
  const big=['torah','plan','scroll','priestScroll','tablets'].includes(prop);
  ctx.save();ctx.translate(x,y);const s=h/50*(big?0.68:1);ctx.scale(s,s);ctx.lineCap='round';ctx.lineJoin='round';
  if(prop==='tablets'){
    for(const dx of [-7,5]){
      ctx.fillStyle='#b8b4a3';ctx.beginPath();ctx.moveTo(dx-5,12);ctx.lineTo(dx-5,-9);ctx.arc(dx,-9,5,Math.PI,0);ctx.lineTo(dx+5,12);ctx.closePath();ctx.fill();
      ctx.strokeStyle='#6e736b';ctx.lineWidth=0.8;
      for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(dx-2.7,-5+i*3.7);ctx.lineTo(dx+2.7,-5+i*3.7);ctx.stroke();}
    }
  }else if(prop==='hammer'){
    ctx.strokeStyle='#705037';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(1,14);ctx.lineTo(1,-13);ctx.stroke();
    ctx.fillStyle='#8b9697';ctx.fillRect(-6,-16,15,7);ctx.fillStyle='#d4d7ca';ctx.fillRect(-5,-16,13,2);
  }else if(prop==='spool'){
    ctx.fillStyle='#a17c43';ctx.fillRect(-7,-10,17,3);ctx.fillRect(-7,8,17,3);
    ctx.fillStyle='#407eac';ctx.fillRect(-4,-8,11,16);ctx.strokeStyle='#92c2d4';ctx.lineWidth=1;
    for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(-4,-6+i*3);ctx.lineTo(7,-4+i*3);ctx.stroke();}
  }else if(prop==='sword'){
    // The existing action disperses obstacles in light; the sword is visual.
    ctx.strokeStyle='#5a4437';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-1,1);ctx.lineTo(-10,24);ctx.stroke();
    if(attackTime>0){
      const progress=1-Math.max(0,Math.min(1,attackTime)),ease=progress*progress*(3-2*progress);
      const angle=-0.3+2.15*ease;
      ctx.strokeStyle='rgba(255,235,167,0.75)';ctx.lineWidth=2.2;
      ctx.beginPath();ctx.arc(0,0,31,angle-Math.PI/2-0.55,angle-Math.PI/2);ctx.stroke();
      ctx.save();ctx.rotate(angle);
      ctx.fillStyle='#d7e5e7';ctx.beginPath();ctx.moveTo(-2,-5);ctx.lineTo(-2.5,-27);ctx.lineTo(0,-34);ctx.lineTo(2.5,-27);ctx.lineTo(2,-5);ctx.closePath();ctx.fill();
      ctx.strokeStyle='#f7fcf5';ctx.lineWidth=0.8;ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(0,-32);ctx.stroke();
      ctx.strokeStyle='#d3a746';ctx.lineWidth=2.3;ctx.beginPath();ctx.moveTo(-7,-4);ctx.lineTo(7,-4);ctx.moveTo(0,-3);ctx.lineTo(0,5);ctx.stroke();
      ellipse(ctx,0,6,2,2,'#d3a746');ctx.restore();
    }else{
      ctx.strokeStyle='#d3a746';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-5,-2);ctx.lineTo(5,2);ctx.moveTo(0,0);ctx.lineTo(4,-9);ctx.stroke();
      ellipse(ctx,4,-10,2,2,'#d3a746');
    }
  }else if(prop==='shield'){
    ctx.fillStyle='#846744';ctx.beginPath();ctx.moveTo(-10,-11);ctx.lineTo(10,-11);ctx.lineTo(9,9);ctx.lineTo(0,18);ctx.lineTo(-9,9);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#d7b56b';ctx.lineWidth=2;ctx.stroke();ctx.beginPath();ctx.moveTo(0,-7);ctx.lineTo(0,10);ctx.moveTo(-6,-1);ctx.lineTo(6,-1);ctx.stroke();
  }else if(prop==='censer'){
    ctx.strokeStyle='#c89e3f';ctx.lineWidth=1;
    for(const dx of [-6,6]){ctx.beginPath();ctx.moveTo(0,-9);ctx.lineTo(dx,8);ctx.stroke();}
    ellipse(ctx,0,9,9,4,'#cba746');ctx.strokeStyle='#c8bca5';ctx.beginPath();ctx.moveTo(0,4);ctx.quadraticCurveTo(-5,-3,2,-7);ctx.stroke();
  }else if(prop==='bread'){
    ctx.fillStyle='#c49c57';ctx.fillRect(-11,8,25,3);for(let i=0;i<3;i++)ellipse(ctx,-7+i*8,4,5,5,'#e2bc79');
  }else if(prop==='cedar'){
    ctx.strokeStyle='#805332';ctx.lineWidth=5;
    for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(-6+i*5,-12);ctx.lineTo(-3+i*5,15);ctx.stroke();}
    ctx.strokeStyle='#d4b16c';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-7,2);ctx.lineTo(12,2);ctx.stroke();
  }else if(prop==='banner'){
    ctx.strokeStyle='#805d38';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,16);ctx.lineTo(0,-27);ctx.stroke();
    ctx.fillStyle='#3d8896';ctx.beginPath();ctx.moveTo(1,-27);ctx.lineTo(19,-24);ctx.lineTo(11,-18);ctx.lineTo(1,-20);ctx.closePath();ctx.fill();
  }else if(prop==='prayer'){
    ellipse(ctx,-2,-2,3.5,7,'#d9a979');ellipse(ctx,3,-3,3.5,7,'#d9a979');
  }else if(prop==='lamp'){
    ctx.fillStyle='#c89f44';ctx.fillRect(-8,5,18,4);ctx.fillRect(-2,-9,5,15);ellipse(ctx,0,-11,3,6,'#f8cc62');
  }else{
    const torah=prop==='torah';ctx.fillStyle=torah?'#ece0bf':'#e9cf94';ctx.fillRect(-9,-12,21,25);
    ctx.fillStyle=torah?'#5c83a0':'#987449';
    if(torah){ctx.fillRect(-11,-16,4,33);ctx.fillRect(10,-16,4,33);ctx.fillRect(-7,-2,17,4);}
    else{ctx.lineWidth=1;ctx.strokeStyle='#927850';for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(-5,-7+i*5);ctx.lineTo(8,-7+i*5);ctx.stroke();}}
  }
  ctx.restore();
}
