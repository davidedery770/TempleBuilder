import { text, roundRect } from './art.js';
import { drawLearningIcon } from './learningArt.js';

export function drawLearningCourt(ctx, w, h, camX, camY, exhibits) {
  ctx.save();
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#182e50'); sky.addColorStop(1, '#b69e80');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
  // An open-air learning colonnade; no playable interior or holy-of-holies room.
  const offset = (camX * 0.3) % 175;
  for (let x = -175 - offset; x < w + 175; x += 175) {
    ctx.fillStyle = '#807866'; ctx.fillRect(x, 190, 20, 300); ctx.fillRect(x + 150, 190, 20, 300);
    ctx.strokeStyle = '#94866c'; ctx.lineWidth = 12;
    ctx.beginPath(); ctx.arc(x + 85, 195, 75, Math.PI, 0); ctx.stroke();
  }
  for (const e of exhibits) {
    const x = e.x - camX, y = e.y - camY - 130;
    if (x < -250 || x > w + 250) continue;
    ctx.fillStyle = '#ede1bd'; roundRect(ctx, x - 110, y - 48, 220, 121, 12); ctx.fill();
    ctx.strokeStyle = '#d4b868'; ctx.lineWidth = 3; ctx.stroke();
    drawLearningIcon(ctx, e.icon, x, y, 65);
    text(ctx, e.label, x, y + 52, { size: 12, color: '#36515a', outline: null });
  }
  text(ctx, 'חצר לימוד מאוירת · לא שחזור של המשכן', w / 2, 111, { size: 14, color: '#f3dfb7' });
  ctx.restore();
}
