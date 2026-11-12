import { BUILD_PARTS, PLAN } from './level02.js';

/** One model unit represents one amah; X east, Z south, Y up. */
export function planToWorld(u, v) { return { x: u - 50, z: v - 25 }; }
export function worldToPlan(x, z) {
  return { x: PLAN.x + (x + 50) * PLAN.scale, y: PLAN.y + (z + 25) * PLAN.scale };
}

export const MODEL_DIMENSIONS = {
  court: [100, 5, 50], tent: [30, 10, 10],
  ark: [2.5, 1.5, 1.5], table: [2, 1.5, 1],
  incense: [1, 2, 1], altar: [5, 3, 5],
};
export const MODEL_NOTES = [
  'חצר 100×50; גובה קרשים 10 אמות. יחידת המודל היא אמה, לא מטר.',
  'מיקום האוהל ופינות הקרשים סכמטיים; 30×10 הוא התיאור המקובל.',
  'מידות הארון והשולחן: שמות כ״ה; מזבח הקטורת: ל׳; מזבח העולה: כ״ז.',
  'צורת המנורה, הכרובים, הכיור, הקפלים והעיטורים הם המחשה, לא שחזור ודאי.',
  'הכיסויים מוצגים כשכבות סכמטיות; צבע התחשים אינו זיהוי של בעל החיים.',
];

/** Pure geometry descriptors: testable without a DOM or WebGL context. */
export function buildMishkanModel() {
  const parts = Object.fromEntries(BUILD_PARTS.map(p => [p.id, []]));
  const box = (id, x, y, z, w, h, d, material, role = '') =>
    parts[id].push({ kind: 'box', position: [x, y, z], size: [w, h, d], material, role });
  const cylinder = (id, x, y, z, top, bottom, height, material, role = '') =>
    parts[id].push({ kind: 'cylinder', position: [x, y, z], size: [top, bottom, height], material, role });
  const tube = (id, points, radius, material) =>
    parts[id].push({ kind: 'tube', points, radius, material, position: [0, 0, 0] });
  const basePair = (x, z, alongX = true) => {
    for (const sign of [-1, 1]) box('bases', x + (alongX ? sign * 0.32 : 0), 0.22,
      z + (alongX ? 0 : sign * 0.23), 0.55, 0.44, 0.85, 'silver', 'socket');
  };
  for (let i = 0; i < 20; i++) {
    const x = -29.25 + i * 1.5;
    for (const [id, z] of [['north', -5], ['south', 5]]) {
      box(id, x, 5.44, z, 1.46, 10, 0.45, 'gold', 'board');
      basePair(x, z);
    }
  }
  // Six full-width boards plus two visible corner portions. Corner joinery is schematic.
  for (let i = 0; i < 8; i++) {
    const z = i === 0 ? -4.75 : i === 7 ? 4.75 : -3.75 + (i - 1) * 1.5;
    const width = i === 0 || i === 7 ? 0.5 : 1.5;
    box('west', -30, 5.44, z, 0.45, 10, width - 0.03, 'gold', 'board');
    basePair(-30, z, false);
  }
  for (const y of [2, 4, 5.5, 7, 9]) {
    for (const z of [-5.3, 5.3]) box('bars', -15, y, z, 30, 0.16, 0.16, 'darkGold', 'bar');
    box('bars', -30.3, y, 0, 0.16, 0.16, 10, 'darkGold', 'bar');
  }
  for (const [i, id] of ['linen', 'goat', 'rams', 'tachash'].entries()) {
    const pad = i * 0.35;
    box(id, -15, 10.65 + i * 0.18, 0, 30.7 + 2 * pad, 0.14, 10.7 + 2 * pad, id, 'roof');
    // Side drapes are an illustrative cross-section, not a full fabric cutting pattern.
    for (const z of [-5.4 - pad, 5.4 + pad]) {
      box(id, -15, 8.9, z, 30.7 + 2 * pad, 3.3, 0.08, id, 'drape');
    }
  }
  const poles = (id, x, n, socketMaterial) => {
    for (let i = 0; i < n; i++) {
      const z = -4.6 + i * 9.2 / (n - 1);
      box(id, x, 0.23, z, 0.75, 0.46, 0.75, socketMaterial, 'socket');
      cylinder(id, x, 5.25, z, 0.15, 0.19, 10, 'gold', 'pole');
      cylinder(id, x, 10.35, z, 0.24, 0.24, 0.12, 'darkGold');
    }
    box(id, x, 5.4, 0, 0.07, 9.9, 9.8, 'curtain', 'curtain');
  };
  poles('veil', -20, 4, 'silver');
  poles('entrance', 0, 5, 'bronze');

  const vessel = (id, dims, material) => {
    const [u, v] = BUILD_PARTS.find(p => p.id === id).target;
    const { x, z } = planToWorld(u, v);
    const [w, h, d] = dims;
    box(id, x, h / 2, z, w, h, d, material, 'vessel');
    box(id, x, h + 0.05, z, w + 0.08, 0.1, d + 0.08, 'darkGold', 'rim');
    return { x, z, w, h, d };
  };
  const ark = vessel('ark', MODEL_DIMENSIONS.ark, 'gold');
  for (const dz of [-0.9, 0.9]) box('ark', ark.x, 0.9, ark.z + dz, 4.1, 0.12, 0.12, 'darkGold', 'carrying-pole');
  for (const sign of [-1, 1]) {
    cylinder('ark', ark.x + sign * 0.85, 1.85, ark.z, 0.13, 0.2, 0.6, 'gold');
    tube('ark', [[ark.x + sign, 2.05, ark.z], [ark.x + sign * 0.55, 2.6, ark.z],
      [ark.x, 2.25, ark.z]], 0.1, 'gold');
  }
  const table = vessel('table', MODEL_DIMENSIONS.table, 'gold');
  // Expose the four legs instead of representing a solid block.
  parts.table = parts.table.filter(n => n.role !== 'vessel');
  box('table', table.x, 1.4, table.z, 2, 0.2, 1, 'gold', 'tabletop');
  for (const dx of [-0.85, 0.85]) for (const dz of [-0.35, 0.35]) {
    box('table', table.x + dx, 0.7, table.z + dz, 0.14, 1.4, 0.14, 'gold', 'leg');
  }
  for (const dx of [-0.5, 0.5]) for (let j = 0; j < 6; j++) {
    box('table', table.x + dx, 1.66 + j * 0.1, table.z, 0.55, 0.09, 0.55, 'bread', 'loaf');
  }
  const incense = vessel('incense', MODEL_DIMENSIONS.incense, 'gold');
  const altar = vessel('altar', MODEL_DIMENSIONS.altar, 'bronze');
  for (const [id, p, mat] of [['incense', incense, 'gold'], ['altar', altar, 'bronze']]) {
    for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
      box(id, p.x + dx * (p.w / 2 - 0.12), p.h + 0.24,
        p.z + dz * (p.d / 2 - 0.12), 0.22, 0.48, 0.22, mat, 'horn');
    }
  }
  box('altar', altar.x, 3.08, altar.z, 4.2, 0.08, 4.2, 'coal', 'hearth');
  for (let i = 0; i < 6; i++) {
    box('altar', altar.x, 1.2, altar.z - 2.52 + i, 4.9, 0.06, 0.05, 'darkGold', 'grate');
  }

  const menorah = planToWorld(39, 28);
  cylinder('menorah', menorah.x, 0.12, menorah.z, 0.48, 0.65, 0.24, 'gold', 'foot');
  cylinder('menorah', menorah.x, 1.65, menorah.z, 0.09, 0.12, 3.0, 'gold', 'stem');
  for (const sign of [-1, 1]) for (let i = 1; i <= 3; i++) {
    const xx = menorah.x + sign * i * 0.48;
    tube('menorah', [[menorah.x, 0.65 + i * 0.4, menorah.z], [xx, 1.7, menorah.z],
      [xx, 3.15, menorah.z]], 0.075, 'gold');
  }
  for (let i = -3; i <= 3; i++) {
    const x = menorah.x + i * 0.48;
    cylinder('menorah', x, 3.2, menorah.z, 0.15, 0.1, 0.18, 'gold', 'lamp');
    parts.menorah.push({ kind: 'sphere', position: [x, 3.45, menorah.z],
      size: [0.09, 0.2, 0.09], material: 'flame', role: 'flame' });
  }
  const laver = planToWorld(58, 27);
  cylinder('laver', laver.x, 0.15, laver.z, 0.8, 1.1, 0.3, 'bronze', 'foot');
  cylinder('laver', laver.x, 0.8, laver.z, 0.28, 0.36, 1.25, 'bronze', 'stem');
  cylinder('laver', laver.x, 1.6, laver.z, 1.15, 0.45, 0.8, 'bronze', 'bowl');
  cylinder('laver', laver.x, 2.03, laver.z, 1.05, 1.05, 0.04, 'water', 'water');
  const courtPole = (id, x, z) => {
    box(id, x, 0.15, z, 0.6, 0.3, 0.6, 'bronze', 'socket');
    cylinder(id, x, 2.65, z, 0.13, 0.18, 5, 'wood', 'court-pole');
    cylinder(id, x, 5.2, z, 0.23, 0.23, 0.16, 'silver', 'cap');
  };
  box('court', 0, 2.65, -25, 100, 5, 0.1, 'linenPlain', 'fence');
  box('court', 0, 2.65, 25, 100, 5, 0.1, 'linenPlain', 'fence');
  box('court', -50, 2.65, 0, 0.1, 5, 50, 'linenPlain', 'fence');
  for (const z of [-17.5, 17.5]) box('court', 50, 2.65, z, 0.1, 5, 15, 'linenPlain', 'fence');
  for (let i = 0; i < 20; i++) {
    courtPole('court', -47.5 + i * 5, -25); courtPole('court', -47.5 + i * 5, 25);
  }
  for (let i = 0; i < 10; i++) courtPole('court', -50, -22.5 + i * 5);
  for (const sign of [-1, 1]) for (let i = 0; i < 3; i++) courtPole('court', 50, sign * (12.5 + i * 5));
  for (let i = 0; i < 4; i++) courtPole('gate', 50, -9 + i * 6);
  box('gate', 50, 2.65, 0, 0.1, 5, 20, 'curtain', 'gate');
  return parts;
}
