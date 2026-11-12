import { circle, drawMaterial } from './art.js';

const MATERIALS = new Set(['gold','silver','bronze','techelet','argaman','tolaat','shesh','goat','rams','tachash','shittim','spices']);
export function drawLearningIcon(ctx, kind, cx, cy, size = 64) {
  if (MATERIALS.has(kind)) { drawMaterial(ctx, kind, cx, cy, size); return; }
  ctx.save(); ctx.translate(cx, cy); ctx.scale(size / 100, size / 100);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 5;
  if (kind === 'menorah') {
    ctx.strokeStyle = '#b88728';
    ctx.beginPath(); ctx.moveTo(0, 38); ctx.lineTo(0, -35);
    for (let i = -3; i <= 3; i++) {
      const x = i * 12; ctx.moveTo(0, 20); ctx.quadraticCurveTo(x, 14, x, -31);
    }
    ctx.stroke(); ctx.fillStyle = '#c79835'; ctx.fillRect(-20, 37, 40, 6);
    for (let i = -3; i <= 3; i++) circle(ctx, i * 12, -39, 4, '#f6bc38');
  } else if (kind === 'boards') {
    for (let i = 0; i < 4; i++) {
      const x = -37 + i * 21; ctx.fillStyle = '#c09246'; ctx.fillRect(x, -40, 17, 78);
      ctx.fillStyle = '#f4d389'; ctx.fillRect(x + 2, -39, 3, 76);
      ctx.strokeStyle = '#8c6338'; ctx.lineWidth = 1; ctx.strokeRect(x, -40, 17, 78);
    }
  } else if (kind === 'oil') {
    ctx.fillStyle = '#bc8d30'; ctx.fillRect(-12, -44, 24, 7); ctx.fillRect(-7, -37, 14, 17);
    ctx.beginPath(); ctx.moveTo(-7,-24); ctx.bezierCurveTo(-35,-10,-38,36,-23,42);
    ctx.lineTo(23,42); ctx.bezierCurveTo(38,36,35,-10,7,-24); ctx.closePath();ctx.fill();
    ctx.fillStyle = '#f4d36b'; ctx.beginPath();ctx.ellipse(0,16,20,22,0,0,Math.PI*2);ctx.fill();
  } else if (kind === 'ark') {
    ctx.fillStyle = '#d7a846'; ctx.fillRect(-34,-21,68,48); ctx.fillStyle = '#f2cf76'; ctx.fillRect(-39,-27,78,8);
    ctx.strokeStyle = '#a77428'; ctx.beginPath();ctx.moveTo(-48,-10);ctx.lineTo(48,-10);ctx.moveTo(-48,14);ctx.lineTo(48,14);ctx.stroke();
  } else if (kind === 'table') {
    ctx.fillStyle='#c89b45';ctx.fillRect(-37,-15,74,13);
    for(const x of [-29,22])ctx.fillRect(x,-3,8,42);
    ctx.fillStyle='#e4ca92';for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(-22+i*22,-21,9,5,0,0,Math.PI*2);ctx.fill();}
  } else if (kind === 'veil') {
    ctx.fillStyle = '#8563aa'; ctx.fillRect(-34, -37, 68, 74);
    ctx.strokeStyle = '#d4b56b'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-42, -40); ctx.lineTo(42, -40); ctx.stroke();
    ctx.strokeStyle = '#b8a0cc'; ctx.lineWidth = 3;
    for (const x of [-21, 0, 21]) { ctx.beginPath(); ctx.moveTo(x, -34); ctx.lineTo(x, 35); ctx.stroke(); }
  } else if (kind === 'laver') {
    ctx.fillStyle='#b98250';ctx.fillRect(-5,5,10,34);ctx.fillRect(-23,35,46,7);
    ctx.beginPath();ctx.arc(0,-10,34,0,Math.PI);ctx.fill();
    ctx.fillStyle='#7bbdc4';ctx.beginPath();ctx.ellipse(0,-10,32,9,0,0,Math.PI*2);ctx.fill();
  } else if (kind === 'altar') {
    ctx.fillStyle = '#b77b4e';ctx.fillRect(-35,-22,70,62);
    ctx.fillStyle = '#d6a171';ctx.fillRect(-40,-27,80,10);
    for (const x of [-35,27]) ctx.fillRect(x,-40,8,18);
    ctx.fillStyle = '#655041';ctx.fillRect(-26,-17,52,10);
  } else if (kind === 'shofar') {
    ctx.strokeStyle = '#9d743e';ctx.lineWidth = 18;ctx.beginPath();ctx.moveTo(-37,-20);ctx.bezierCurveTo(-22,41,19,45,39,-22);ctx.stroke();
    ctx.strokeStyle = '#e2bf79';ctx.lineWidth = 7;ctx.beginPath();ctx.moveTo(-37,-20);ctx.bezierCurveTo(-22,41,19,45,39,-22);ctx.stroke();
  } else if (kind === 'olive') {
    ctx.fillStyle = '#728344';ctx.beginPath();ctx.ellipse(0,7,25,33,0.5,0,Math.PI*2);ctx.fill();
    ctx.fillStyle = '#a9ba68';ctx.beginPath();ctx.ellipse(-9,-4,7,14,0.5,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle = '#76613f';ctx.lineWidth = 3;ctx.beginPath();ctx.moveTo(8,-23);ctx.lineTo(17,-39);ctx.stroke();
  } else if (kind === 'basket') {
    ctx.strokeStyle = '#967044';ctx.lineWidth = 7;ctx.beginPath();ctx.arc(0,0,29,Math.PI,0);ctx.stroke();
    ctx.fillStyle = '#c79b5d';ctx.beginPath();ctx.moveTo(-39,-3);ctx.lineTo(39,-3);ctx.lineTo(29,38);ctx.lineTo(-29,38);ctx.closePath();ctx.fill();
    ctx.strokeStyle = '#8d673c';ctx.lineWidth = 2;
    for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(-35,6+i*9);ctx.lineTo(35,6+i*9);ctx.stroke();}
  } else if (kind === 'drop' || kind === 'water') {
    ctx.fillStyle = kind === 'water' ? '#4cacc6' : '#e7bb46';
    ctx.beginPath();ctx.moveTo(0,-43);ctx.bezierCurveTo(-13,-20,-36,5,-24,27);ctx.bezierCurveTo(-12,49,23,44,28,19);ctx.bezierCurveTo(32,4,10,-23,0,-43);ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';ctx.lineWidth = 4;ctx.beginPath();ctx.moveTo(-13,3);ctx.lineTo(-16,16);ctx.stroke();
  } else if (kind === 'grain') {
    ctx.strokeStyle = '#b9963e';ctx.lineWidth = 4;
    for(const x of [-16,0,16]){ctx.beginPath();ctx.moveTo(0,42);ctx.lineTo(x,-31);ctx.stroke();
      for(let i=0;i<4;i++){ctx.fillStyle='#dcbd65';ctx.beginPath();ctx.ellipse(x+(i%2?5:-5),-27+i*10,5,9,i%2?0.5:-0.5,0,Math.PI*2);ctx.fill();}}
  } else if (kind === 'stone') {
    ctx.fillStyle='#a5a58f';ctx.beginPath();ctx.moveTo(-36,28);ctx.lineTo(-28,-20);ctx.lineTo(4,-38);ctx.lineTo(37,-10);ctx.lineTo(31,35);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#d8d2b6';ctx.beginPath();ctx.moveTo(-24,-17);ctx.lineTo(4,-31);ctx.lineTo(29,-7);ctx.stroke();
  } else { circle(ctx,0,0,31,'#d2b477'); }
  ctx.restore();
}
