import assert from 'node:assert/strict';
import { drawJourneyPanorama, journeyPoint, JOURNEY_STOPS } from '../src/core/journeyArt.js';
import { MenuScene } from '../src/scenes/menu.js';
import { ENTRY_ART_URL, ENTRY_BUTTONS, loadEntryArt, drawEntryBackdrop } from '../src/core/entryArt.js';
import { statSync } from 'node:fs';
import { niqqud } from '../src/core/niqqud.js';

let checks = 0;
const check = (name, fn) => { fn(); checks++; console.log('PASS ' + name); };
function context() {
  const texts = [], stack = [];
  const state = { globalAlpha: 1 };
  const target = {
    texts,
    save() { stack.push({ ...state }); },
    restore() { assert.ok(stack.length); Object.assign(state, stack.pop()); },
    fillText: value => texts.push(value),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
  };
  return new Proxy(target, {
    get: (o, k) => k in o ? o[k] : k in state ? state[k]
      : (...args) => args.forEach(a => { if (typeof a === 'number') assert.ok(Number.isFinite(a), String(k)); }),
    set: (o, k, value) => { state[k] = value; return true; },
  });
}
check('symbolic route is continuous, stays below the buttons and travels right-to-left', () => {
  assert.deepEqual(journeyPoint(0), { x: 902, y: 442 });
  assert.deepEqual(journeyPoint(1), { x: 164, y: 392 });
  for (let i = 0; i <= 600; i++) {
    const p = journeyPoint(i / 600);
    assert.ok(p.x >= 160 && p.x <= 903 && p.y > 390 && p.y < 490);
    if (i) assert.ok(Math.hypot(p.x - journeyPoint((i - 1) / 600).x,
      p.y - journeyPoint((i - 1) / 600).y) < 5);
  }
  assert.deepEqual(journeyPoint(-1), journeyPoint(0));
  assert.deepEqual(journeyPoint(2), journeyPoint(1));
  assert.ok(JOURNEY_STOPS.every((s, i) => !i || s.x < JOURNEY_STOPS[i - 1].x));
});
check('panorama draws every journey stop with finite coordinates at different sizes and animation times', () => {
  for (const [w, h] of [[960, 540], [1280, 720], [640, 360]]) {
    for (const t of [0, 8, 16, 24, 31.99, 32, 1000]) {
      const ctx = context(); drawJourneyPanorama(ctx, w, h, t);
      assert.equal(ctx.globalAlpha, 1, 'canvas state restored');
      for (const stop of JOURNEY_STOPS) assert.ok(ctx.texts.includes(niqqud(stop.label)));
    }
  }
});
check('illustrated art stays small and image failure has a working vector fallback', () => {
  assert.ok(statSync(new URL(ENTRY_ART_URL)).size < 500000);
  for (const art of [null, {}]) drawEntryBackdrop(context(), art, 960, 540, 0);
  globalThis.Image = class {};
  let loaded = false, failed = false;
  const image = loadEntryArt(() => { loaded = true; }, () => { failed = true; });
  assert.equal(image.src, ENTRY_ART_URL); image.onload(); assert.ok(loaded);
  image.onerror(); assert.ok(failed);
  delete globalThis.Image;
  for (let i = 0; i < ENTRY_BUTTONS.length; i++) {
    const a = ENTRY_BUTTONS[i];
    for (let j = i + 1; j < ENTRY_BUTTONS.length; j++) {
      const b = ENTRY_BUTTONS[j];
      assert.ok(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
    }
  }
});
check('new and returning players retain menu actions and readable journey labels', () => {
  for (const relicCount of [0, 3]) {
    const ctx = context(), went = [], saved = { unlocked: relicCount ? 4 : 1 };
    let keys = [];
    const scene = new MenuScene();
    scene.game = { width: 960, height: 540, save: { data: saved, relicCount },
      audio: new Proxy({}, { get: () => () => {} }),
      input: { pressed: key => keys.includes(key), over: () => false },
    };
    scene.scenes = { transitioning: false, go: (...args) => went.push(args) };
    scene.enter();
    const before = JSON.stringify(saved);
    assert.equal(scene.items.length, relicCount ? 4 : 3);
    for (let i = 0; i < 60; i++) scene.update(1 / 60);
    scene.draw(ctx);
    assert.equal(JSON.stringify(saved), before);
    assert.ok(ctx.texts.includes(niqqud('ירושלים והמקדש')));
    assert.ok(ctx.texts.includes(niqqud('המשכן במדבר')));
    assert.ok(!ctx.texts.includes('חכמת לב — אריגת היריעות'));
    keys = ['down']; scene.update(1 / 60); assert.equal(scene.index, 1);
    keys = ['confirm']; scene.update(1 / 60);
    assert.equal(went[0][0], 'levels');
  }
});
console.log(`\n${checks} menu journey checks passed.`);
