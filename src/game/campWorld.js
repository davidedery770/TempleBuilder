import { CAMP, CAMP_STATIONS, ALL_CAMP_STATIONS, CAMP_OBSTACLES, CAMP_SPARKS } from '../data/camp01.js';
import { getMaterial } from '../data/materials.js';

const RADIUS = 0.45;
const key = (x, z) => `${x},${z}`;
export function campBlocked(x, z, y = 0, radius = RADIUS) {
  if (x < CAMP.minX + radius || x > CAMP.maxX - radius || z < CAMP.minZ + radius || z > CAMP.maxZ - radius) return true;
  return CAMP_OBSTACLES.some(o => y < o.height - 0.04
    && x > o.x - o.w / 2 - radius && x < o.x + o.w / 2 + radius
    && z > o.z - o.d / 2 - radius && z < o.z + o.d / 2 + radius);
}

/** A* routes avoid even the low, jumpable crates, so required stations never require jumping. */
export function findCampPath(start, goal) {
  const sx = Math.round(start.x), sz = Math.round(start.z);
  let gx = Math.round(goal.x), gz = Math.round(goal.z);
  if (campBlocked(gx, gz)) {
    let found = null;
    for (let radius = 1; radius <= 5 && !found; radius++) {
      for (let dx = -radius; dx <= radius && !found; dx++) for (let dz = -radius; dz <= radius; dz++) {
        if (!campBlocked(gx + dx, gz + dz)) { found = [gx + dx, gz + dz]; break; }
      }
    }
    if (!found) return [];
    [gx, gz] = found;
  }
  const first = key(sx, sz), target = key(gx, gz);
  const open = [{ x: sx, z: sz, cost: 0, f: Math.hypot(gx - sx, gz - sz) }];
  const costs = new Map([[first, 0]]), previous = new Map(), closed = new Set();
  while (open.length) {
    open.sort((a, b) => b.f - a.f);
    const p = open.pop(), pk = key(p.x, p.z);
    if (closed.has(pk)) continue;
    if (pk === target) {
      const path = [{ x: gx, z: gz }];
      let k = pk;
      while (previous.has(k)) {
        const q = previous.get(k); path.push({ x: q.x, z: q.z }); k = key(q.x, q.z);
      }
      return path.reverse();
    }
    closed.add(pk);
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      if (!dx && !dz) continue;
      const x = p.x + dx, z = p.z + dz, k = key(x, z);
      if (closed.has(k) || campBlocked(x, z)) continue;
      if (dx && dz && (campBlocked(p.x + dx, p.z) || campBlocked(p.x, p.z + dz))) continue;
      const cost = p.cost + Math.hypot(dx, dz);
      if (cost >= (costs.get(k) ?? Infinity)) continue;
      costs.set(k, cost); previous.set(k, p);
      open.push({ x, z, cost, f: cost + Math.hypot(gx - x, gz - z) });
    }
  }
  return [];
}

export class CampWorld {
  constructor(saved = {}) {
    this.done = new Set((saved.done || []).filter(id => CAMP_STATIONS.some(s => s.id === id)));
    this.materials = new Set(CAMP_STATIONS.filter(s => this.done.has(s.id)).flatMap(s => s.materials));
    this.sparks = new Set((saved.sparks || []).filter(id => CAMP_SPARKS.some(s => s.id === id)));
    const x = saved.position?.x, z = saved.position?.z;
    const valid = Number.isFinite(x) && Number.isFinite(z) && !campBlocked(x, z);
    this.player = { x: valid ? x : CAMP.spawn[0], z: valid ? z : CAMP.spawn[1], y: 0, vy: 0, facing: 0, walking: false };
    this.carrying = !this.done.has('wood') && !!saved.carrying;
    this.delivered = this.done.has('wood') || !!saved.delivered;
    if (this.delivered) this.carrying = false;
    this.quizDone = !!saved.quizDone;
    this.finished = !!saved.finished && this.materials.size === 15;
    this.elapsed = Number.isFinite(saved.elapsed) ? Math.max(0, saved.elapsed) : 0;
    this.path = [];
    this.light = 0;
  }
  get score() {
    return [...this.materials].reduce((n, id) => n + getMaterial(id).value, 0)
      + this.done.size * 150 + this.sparks.size * 250 + (this.quizDone ? 500 : 0);
  }
  get ready() { return this.materials.size === 15; }
  get nextObjective() {
    if (this.carrying || this.delivered && !this.done.has('wood')) return ALL_CAMP_STATIONS.find(s => s.id === 'carpenter');
    return CAMP_STATIONS.find(s => !this.done.has(s.id)) || ALL_CAMP_STATIONS.find(s => s.id === 'warehouse');
  }
  near(station) { return Math.hypot(this.player.x - station.at[0], this.player.z - station.at[1]) <= 2.7 && this.player.y < 1.5; }
  nearest() {
    return ALL_CAMP_STATIONS.filter(s => this.near(s))
      .sort((a, b) => Math.hypot(this.player.x - a.at[0], this.player.z - a.at[1])
        - Math.hypot(this.player.x - b.at[0], this.player.z - b.at[1]))[0] || null;
  }
  moveTo(x, z) { this.path = findCampPath(this.player, { x, z }); return this.path.length > 0; }
  award(id) {
    const station = CAMP_STATIONS.find(s => s.id === id);
    if (!station || this.done.has(id) || id === 'wood' && !this.delivered) return [];
    this.done.add(id);
    const received = station.materials.filter(m => !this.materials.has(m));
    received.forEach(m => this.materials.add(m));
    return received;
  }
  takeWood() {
    const station = CAMP_STATIONS.find(s => s.id === 'wood');
    if (!this.near(station) || this.done.has('wood') || this.carrying || this.delivered) return false;
    this.carrying = true; return true;
  }
  deliverWood() {
    const station = ALL_CAMP_STATIONS.find(s => s.id === 'carpenter');
    if (!this.carrying || !this.near(station)) return false;
    this.carrying = false; this.delivered = true; return true;
  }
  update(dt, input) {
    this.elapsed += dt; this.light = Math.max(0, this.light - dt);
    const p = this.player;
    let x = input.axisX || 0, y = (input.down('up') ? 1 : 0) - (input.down('down') ? 1 : 0);
    let dx = (x - y) / Math.SQRT2, dz = (-x - y) / Math.SQRT2;
    if (x || y) this.path = [];
    else if (this.path.length) {
      const q = this.path[0];
      dx = q.x - p.x; dz = q.z - p.z;
      if (Math.hypot(dx, dz) < 0.18) { this.path.shift(); dx = dz = 0; }
    }
    const length = Math.hypot(dx, dz), speed = this.carrying ? 4.6 : 6.8;
    p.walking = false;
    if (length > 0) {
      const step = Math.min(length, speed * dt);
      dx = dx / length * step; dz = dz / length * step;
      if (!campBlocked(p.x + dx, p.z, p.y)) { p.x += dx; p.walking = true; }
      if (!campBlocked(p.x, p.z + dz, p.y)) { p.z += dz; p.walking = true; }
      p.facing = Math.atan2(dx, dz);
    }
    let floor = 0;
    for (const o of CAMP_OBSTACLES) {
      if (Math.abs(p.x - o.x) < o.w / 2 + RADIUS * 0.5 && Math.abs(p.z - o.z) < o.d / 2 + RADIUS * 0.5
          && p.y >= o.height - 0.06) floor = Math.max(floor, o.height);
    }
    if (input.pressed('jump') && p.y <= floor + 0.06) p.vy = this.carrying ? 5.5 : 7.5;
    p.vy -= 18 * dt;
    p.y += p.vy * dt;
    if (p.y <= floor) { p.y = floor; p.vy = 0; }
    if (input.pressed('attack')) this.light = 0.5;
    const found = [];
    for (const s of CAMP_SPARKS) {
      if (!this.sparks.has(s.id) && Math.hypot(p.x - s.x, p.z - s.z) < 1 && p.y + 0.8 >= s.y) {
        this.sparks.add(s.id); found.push(s.id);
      }
    }
    return found;
  }
  snapshot() {
    return { done: [...this.done], sparks: [...this.sparks], carrying: this.carrying, delivered: this.delivered,
      quizDone: this.quizDone, finished: this.finished, elapsed: this.elapsed,
      position: { x: this.player.x, z: this.player.z } };
  }
}
