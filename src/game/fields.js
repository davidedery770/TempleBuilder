/** Visibility obstacles only: bending a field never changes collision geometry. */
export class FieldSystem {
  constructor(defs = []) {
    this.items = defs.map(f => ({ ...f, bent: 0, taught: false }));
    this.cooldown = 0;
  }

  update(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    for (const f of this.items) f.bent = Math.max(0, f.bent - dt);
  }

  bendNear(player) {
    if (this.cooldown > 0) return [];
    const touched = this.items.filter(f =>
      player.centerX >= f.x - 140 && player.centerX <= f.x + f.w + 140
      && player.centerY >= f.y - 60 && player.centerY <= f.y + f.h + 60);
    if (touched.length) this.cooldown = 0.8;
    for (const f of touched) f.bent = f.duration;
    return touched;
  }

  covers(player) {
    return this.items.some(f => f.bent <= 0 && player.x + player.w > f.x
      && player.x < f.x + f.w && player.y + player.h > f.y && player.y < f.y + f.h);
  }
}
