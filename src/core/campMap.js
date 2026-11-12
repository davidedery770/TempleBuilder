import { CAMP, CAMP_TENTS, CAMP_OBSTACLES, ALL_CAMP_STATIONS, CAMP_SPARKS } from '../data/camp01.js';
import { circle, drawNPC, drawPlayer } from './art.js';

/** Same camp and controls without WebGL; screen directions match the 3D camera. */
export class CampMap {
  project(x, y, z) { return { x: 480 + (x - z) * 5.5, y: 285 + (x + z) * 2.75 - y * 13 }; }
  pickWorld(x, y) {
    const a = (x - 480) / 5.5, b = (y - 285) / 2.75;
    const p = { x: (a + b) / 2, z: (b - a) / 2 };
    return p.x >= CAMP.minX && p.x <= CAMP.maxX && p.z >= CAMP.minZ && p.z <= CAMP.maxZ ? p : null;
  }
  draw(ctx, world, t) {
    ctx.fillStyle = '#344b56'; ctx.fillRect(0, 0, 960, 540);
    const corners = [[-42, -32], [42, -32], [42, 32], [-42, 32]];
    ctx.fillStyle = '#c9aa72'; ctx.beginPath();
    corners.forEach(([x, z], i) => {
      const p = this.project(x, 0, z);
      if (!i) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }); ctx.closePath(); ctx.fill();
    const objects = [
      ...CAMP_TENTS.map(tent => ({ type: 'tent', depth: tent.x + tent.z, data: tent })),
      ...CAMP_OBSTACLES.filter(o => !CAMP_TENTS.some(t => t.id === o.id))
        .map(o => ({ type: 'crate', depth: o.x + o.z, data: o })),
      ...ALL_CAMP_STATIONS.map(s => ({ type: 'npc', depth: s.at[0] + s.at[1], data: s })),
      { type: 'player', depth: world.player.x + world.player.z, data: world.player },
    ].sort((a, b) => a.depth - b.depth);
    for (const object of objects) {
      const d = object.data;
      if (object.type === 'tent') {
        const a = this.project(d.x - d.w / 2, 0, d.z + d.d / 2);
        const b = this.project(d.x + d.w / 2, 0, d.z + d.d / 2);
        const top = this.project(d.x, d.h, d.z);
        const back = this.project(d.x, d.h, d.z - d.d / 2);
        ctx.fillStyle = d.color; ctx.beginPath();
        ctx.moveTo(a.x, a.y); ctx.lineTo(top.x, top.y); ctx.lineTo(back.x, back.y);
        ctx.lineTo(b.x, b.y); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#6d583a'; ctx.lineWidth = 1.5; ctx.stroke();
      } else if (object.type === 'crate') {
        const p = this.project(d.x, d.height, d.z);
        ctx.fillStyle = '#967044'; ctx.fillRect(p.x - d.w * 2, p.y, d.w * 4, d.height * 13);
      } else if (object.type === 'npc') {
        const p = this.project(...[d.at[0], 0, d.at[1]]);
        drawNPC(ctx, p.x - 8, p.y - 30, 16, 30, { robe: d.color, sash: '#c6ab67', t, beard: d.id !== 'weavers' });
      } else {
        const p = this.project(d.x, d.y, d.z);
        drawPlayer(ctx, p.x - 8, p.y - 30, 16, 30, { facing: Math.sin(d.facing) >= 0 ? 1 : -1,
          state: d.walking ? 'run' : 'idle', animTime: t, attackTime: world.light });
        if (world.carrying) {
          ctx.fillStyle = '#997044'; ctx.fillRect(p.x - 15, p.y - 20, 30, 5);
        }
      }
    }
    for (const s of CAMP_SPARKS) {
      if (world.sparks.has(s.id)) continue;
      const p = this.project(s.x, s.y, s.z);
      circle(ctx, p.x, p.y, 3 + Math.sin(t * 3), '#fff0a4');
    }
  }
  dispose() {}
}
