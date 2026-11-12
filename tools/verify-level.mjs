/**
 * verify-level.mjs — בדיקת שפיות לנתוני השלב, ללא דפדפן.
 *
 * הרצה:  node tools/verify-level.mjs
 *
 * בודק שהמפה תקינה ושכל ישות נמצאת במקום הגיוני: פריטים לא
 * תקועים בתוך קיר, אויבים עומדים על קרקע, ושער היציאה נגיש.
 */

import { buildLevel01 } from '../src/data/level01.js';
import { buildLevel03 } from '../src/data/level03.js';
import { TileMap, TILE } from '../src/game/tilemap.js';
import { MAX_JUMP_PX } from '../src/game/player.js';
import { getLevel } from '../src/data/levels.js';
import { CODEX, getCard } from '../src/data/codex.js';
import { MATERIALS, MATERIAL_ORDER, MATERIAL_GROUPS } from '../src/data/materials.js';
import { TRIVIA } from '../src/data/trivia.js';
import { LEVELS, CHAPTERS } from '../src/data/levels.js';

let errors = 0;
let warnings = 0;

const fail = (msg) => { console.error(`  ✗ ${msg}`); errors++; };
const warn = (msg) => { console.warn(`  ! ${msg}`); warnings++; };
const ok   = (msg) => console.log(`  ✓ ${msg}`);

console.log('\n=== מבנה המשחק ===');

if (LEVELS.length === 14) ok('14 שלבים מוגדרים');
else fail(`צפויים 14 שלבים, נמצאו ${LEVELS.length}`);

if (CHAPTERS.length === 7) ok('7 פרקים מוגדרים');
else fail(`צפויים 7 פרקים, נמצאו ${CHAPTERS.length}`);

// שלב 2 הוא סדנת בנייה, לא שלב בוס; שאר האתגרים נשארו במבנה המקורי.
const bossMismatch = LEVELS.filter(l => l.isBossLevel !== (l.id % 2 === 0 && l.id !== 2));
if (bossMismatch.length === 0) ok('סדנת בנייה בשלב 2, ואתגרים בשאר השלבים הזוגיים');
else fail(`אי-התאמה בשלבי בוס: ${bossMismatch.map(l => l.id).join(', ')}`);

// מזהי כלי קודש ייחודיים
const relicIds = LEVELS.map(l => l.relic.id);
if (new Set(relicIds).size === relicIds.length) ok('מזהי כלי קודש ייחודיים');
else fail('יש מזהי כלי קודש כפולים');

// כל פרק מכיל בדיוק שני שלבים
const chapterSizes = CHAPTERS.every(c => c.levels.length === 2);
if (chapterSizes) ok('כל פרק מכיל שני שלבים');
else fail('יש פרק שאינו מכיל בדיוק שני שלבים');

console.log('\n=== כרטיסיות Codex ===');
const cardIds = CODEX.map(c => c.id);
if (new Set(cardIds).size === cardIds.length) ok(`${CODEX.length} כרטיסיות, מזהים ייחודיים`);
else fail('יש מזהי כרטיסיות כפולים');

console.log('\n=== שלב 1: מַחֲנֵה יִשְׂרָאֵל ===');

const meta = getLevel(1);
const def = buildLevel01();
const map = new TileMap(def.back, def.action, def.front, meta.palette);

console.log(`  מידות: ${map.cols}×${map.rows} אריחים (${map.pixelW}×${map.pixelH} פיקסלים)`);

// --- כל השורות באותו אורך ---
for (const [name, rows] of [['back', def.back], ['action', def.action], ['front', def.front]]) {
  const lens = new Set(rows.map(r => r.length));
  if (lens.size === 1) ok(`שכבת ${name}: כל השורות באורך ${[...lens][0]}`);
  else fail(`שכבת ${name}: אורכי שורות לא עקביים (${[...lens].join(', ')})`);
}

// --- אין אריחים לא מוכרים בשכבת הפעולה ---
const KNOWN_ACTION = new Set(['.', '#', 'R', 'B', 'W', 'H', '=', '^']);
const unknown = new Set();
for (const row of def.action) {
  for (const ch of row) if (!KNOWN_ACTION.has(ch)) unknown.add(ch);
}
if (unknown.size === 0) ok('אין אריחים לא מוכרים בשכבת הפעולה');
else fail(`אריחים לא מוכרים: ${[...unknown].join(' ')}`);

// --- נקודת הפתיחה פנויה ---
const sp = def.spawn;
if (!map.rectHitsSolid(sp.x, sp.y, 22, 42)) ok('נקודת הפתיחה פנויה');
else fail(`נקודת הפתיחה תקועה בקיר (${sp.x}, ${sp.y})`);

// --- פריטים ---
let stuck = 0;
let floating = 0;
for (const p of def.pickups) {
  const size = p.type === 'relic' ? 28 : p.type === 'spark' ? 14 : 20;
  if (map.rectHitsSolid(p.x, p.y, size, size)) {
    stuck++;
    if (stuck <= 5) {
      warn(`פריט ${p.type} תקוע באריח: עמודה ${Math.floor(p.x / TILE)}, שורה ${Math.floor(p.y / TILE)}`);
    }
  }
}
if (stuck === 0) ok(`${def.pickups.length} פריטים — אף אחד לא תקוע באריח`);
else warn(`${stuck} מתוך ${def.pickups.length} פריטים תקועים באריחים`);

const byType = {};
for (const p of def.pickups) byType[p.type] = (byType[p.type] || 0) + 1;
console.log(`  התפלגות: ${Object.entries(byType).map(([k, v]) => `${k}=${v}`).join(', ')}`);

if (byType.relic === 1) ok('כלי קודש אחד בדיוק');
else fail(`צפוי כלי קודש אחד, נמצאו ${byType.relic || 0}`);

if (byType.spark === def.maxSparks) ok(`${def.maxSparks} ניצוצות, תואם ל-maxSparks`);
else fail(`מספר הניצוצות (${byType.spark || 0}) לא תואם ל-maxSparks (${def.maxSparks})`);

// --- אויבים עומדים על קרקע ---
let airborne = 0;
for (const e of def.enemies) {
  const h = e.type === 'scorpion' ? 20 : 44;
  // בודקים שיש קרקע מתחת לרגליים
  if (!map.hasGroundBelow(e.x + 10, e.y + h + 6)) {
    airborne++;
    if (airborne <= 5) {
      warn(`אויב ${e.type} בעמודה ${Math.floor(e.x / TILE)} אינו מעל קרקע`);
    }
  }
}
if (airborne === 0) ok(`${def.enemies.length} אויבים — כולם על קרקע`);
else warn(`${airborne} מתוך ${def.enemies.length} אויבים לא מעל קרקע (ייפלו עד שינחתו)`);

// --- מזבחות ---
for (const [i, c] of def.checkpoints.entries()) {
  if (map.rectHitsSolid(c.x, c.y, c.w, c.h)) {
    fail(`מזבח ${i + 1} תקוע באריח`);
  }
}
if (def.checkpoints.length >= 2) ok(`${def.checkpoints.length} מזבחות־צ'קפוינט`);
else warn('פחות משני מזבחות — מרחק גדול מדי בין נקודות הצלה');

// --- שער היציאה ---
const ex = def.exit;
if (!map.rectHitsSolid(ex.x, ex.y + 10, ex.w, ex.h - 20)) ok('שער היציאה פנוי');
else fail('שער היציאה תקוע בקיר');

// --- בדיקת רציפות: אין תהום רחבה מדי לקפיצה ---
// טווח קפיצה מקסימלי בערך: 260 פיקסלים/שנייה × 0.62 שניות ≈ 160 פיקסלים = 5 אריחים
const MAX_JUMP_TILES = 5;
let gapStart = -1;
let worstGap = 0;

for (let c = 0; c <= map.cols; c++) {
  // האם יש משהו לעמוד עליו בעמודה הזו, בכל גובה
  let hasFooting = false;
  for (let r = 0; r < map.rows; r++) {
    if (map.isSolid(c, r) || map.isPlatform(c, r)) { hasFooting = true; break; }
  }

  if (!hasFooting && gapStart < 0) gapStart = c;
  else if (hasFooting && gapStart >= 0) {
    const width = c - gapStart;
    worstGap = Math.max(worstGap, width);
    if (width > MAX_JUMP_TILES) {
      fail(`תהום בלתי עבירה: ${width} אריחים, מעמודה ${gapStart}`);
    }
    gapStart = -1;
  }
}
if (worstGap <= MAX_JUMP_TILES) ok(`התהום הרחבה ביותר: ${worstGap} אריחים (מקסימום ${MAX_JUMP_TILES})`);

// --- נגישות: האם אפשר בכלל להגיע לכל מקום ---
// הבדיקה הקודמת (תהומות) לא בדקה גובה, ולכן לא תפסה עמודי סלע בגובה 4 אריחים.
// כאן מחשבים אילו משטחי העמידה קיימים, ומריצים BFS מנקודת הפתיחה.
console.log('\n=== נגישות ===');

const MAX_RISE_TILES = Math.floor((MAX_JUMP_PX - 6) / TILE);   // 6px מרווח בטיחות
const MAX_REACH_COLS = 5;
console.log(`  גובה קפיצה מקסימלי: ${MAX_JUMP_PX.toFixed(1)}px = ${(MAX_JUMP_PX / TILE).toFixed(2)} אריחים (עד ${MAX_RISE_TILES} אריחים בבטחה)`);

/** משטח עמידה: אריח מוצק/פלטפורמה שמעליו אוויר */
const surfaces = [];
for (let c = 0; c < map.cols; c++) {
  for (let r = 0; r < map.rows; r++) {
    if ((map.isSolid(c, r) || map.isPlatform(c, r)) && !map.isSolid(c, r - 1)) {
      surfaces.push({ c, r });
    }
  }
}
const byCol = new Map();
for (const s of surfaces) {
  if (!byCol.has(s.c)) byCol.set(s.c, []);
  byCol.get(s.c).push(s);
}

/** האם אפשר לעבור ממשטח s למשטח t (הליכה או קפיצה) */
function canMove(s, t) {
  const dc = Math.abs(t.c - s.c);
  if (dc === 0 || dc > MAX_REACH_COLS) return false;
  if (s.r - t.r > MAX_RISE_TILES) return false;        // גבוה מדי לעלייה

  // בקפיצה על פני מרחק — אסור שיהיה קיר באמצע שגבוה משני המשטחים
  if (dc > 1) {
    const level = Math.min(s.r, t.r);
    const lo = Math.min(s.c, t.c), hi = Math.max(s.c, t.c);
    for (let c = lo + 1; c < hi; c++) {
      for (let r = 0; r < level; r++) if (map.isSolid(c, r)) return false;
    }
  }
  return true;
}

// משטח ההתחלה: העומד הראשון מתחת לשחקן בעמודת הפתיחה
const spawnCol = Math.floor((def.spawn.x + 11) / TILE);
const startSurface = (byCol.get(spawnCol) || [])
  .filter(s => s.r * TILE >= def.spawn.y)
  .sort((a, b) => a.r - b.r)[0];

const reached = new Set();
const key = (s) => `${s.c},${s.r}`;

if (!startSurface) {
  fail('אין משטח עמידה מתחת לנקודת הפתיחה');
} else {
  const queue = [startSurface];
  reached.add(key(startSurface));

  while (queue.length) {
    const s = queue.shift();
    for (let dc = -MAX_REACH_COLS; dc <= MAX_REACH_COLS; dc++) {
      for (const t of byCol.get(s.c + dc) || []) {
        if (reached.has(key(t)) || !canMove(s, t)) continue;
        reached.add(key(t));
        queue.push(t);
      }
    }
  }

  /** האם יש משטח מושג סמוך מתחתי לפריט בקואורדינטות (x, y, רוחב) */
  const reachableNear = (x, y, w) => {
    const c0 = Math.floor(x / TILE) - 1;
    const c1 = Math.floor((x + w) / TILE) + 1;
    for (let c = c0; c <= c1; c++) {
      for (const s of byCol.get(c) || []) {
        const dy = s.r * TILE - y;
        if (reached.has(key(s)) && dy >= 0 && dy <= MAX_JUMP_PX + 40) return true;
      }
    }
    return false;
  };

  const relic = def.pickups.find(p => p.type === 'relic');
  if (relic && reachableNear(relic.x, relic.y, 28)) ok('כלי הקודש ניתן להגשה מנקודת הפתיחה');
  else fail('כלי הקודש לא ניתן להגשה — השלב לא ניתן לסיום');

  if (reachableNear(def.exit.x, def.exit.y + def.exit.h - 8, def.exit.w)) ok('שער היציאה ניתן להגשה מנקודת הפתיחה');
  else fail('שער היציאה לא ניתן להגשה');

  // תחנות הידע חייבות להיות נגישות ולא תקועות בקיר
  for (const s of def.stations || []) {
    if (reachableNear(s.x, s.y, s.w)) ok(`תחנת "${s.id}" (${s.kind}) ניתנת להגשה`);
    else fail(`תחנת "${s.id}" לא ניתנת להגשה`);
    if (map.rectHitsSolid(s.x, s.y, s.w, s.h)) fail(`תחנת "${s.id}" תקועה באריח`);
  }

  // האם השחקן יכול להגיע לכל משטח בשלב
  const stranded = surfaces.filter(s => !reached.has(key(s)));
  if (stranded.length === 0) {
    ok(`כל ${surfaces.length} משטחי העמידה ניתנים להגשה`);
  } else {
    // מקבצים משטחים צמודים לפי עמודה, כדי שהדיווח יהיה קצר ומועיל
    const cols = [...new Set(stranded.map(s => s.c))].sort((a, b) => a - b);
    const ranges = [];
    for (const c of cols) {
      const last = ranges[ranges.length - 1];
      if (last && c === last[1] + 1) last[1] = c; else ranges.push([c, c]);
    }
    fail(`${stranded.length} משטחי עמידה לא ניתנים להגשה. עמודות: ` +
         ranges.slice(0, 8).map(([a, b]) => (a === b ? `${a}` : `${a}-${b}`)).join(', '));
  }
}

// --- תוכן: מצרכים, טריוויה, כרטיסיות ---
console.log('\n=== תוכן ===');

if (MATERIALS.length === 15) ok('15 מצרכי המשכן מוגדרים');
else fail(`צפויים 15 מצרכים, נמצאו ${MATERIALS.length}`);

const badGroup = MATERIALS.filter(m => !MATERIAL_GROUPS[m.group]);
if (!badGroup.length) ok('לכל מצרך קבוצה תקינה');
else fail('מצרכים עם קבוצה לא מוכרת: ' + badGroup.map(m => m.id).join(', '));

const usedKinds = new Set(def.pickups.filter(p => p.type === 'donation').map(p => p.kind));
const missing = MATERIAL_ORDER.filter(k => !usedKinds.has(k));
if (!missing.length) ok('כל 15 המצרכים מופיעים בשלב 1 (אפשר להשלים את הרשימה)');
else fail('מצרכים שלא מופיעים בשלב 1: ' + missing.join(', '));

// טריוויה: מזהים ייחודיים, ארבע תשובות, אינדקס תשובה תקין
const allQ = Object.values(TRIVIA).flat();
const qIds = allQ.map(q => q.id);
if (new Set(qIds).size === qIds.length) ok(`${allQ.length} שאלות טריוויה, מזהים ייחודיים`);
else fail('יש מזהי שאלות כפולים');

const badQ = allQ.filter(q => q.options.length !== 4
  || !(q.answer >= 0 && q.answer < q.options.length)
  || new Set(q.options).size !== q.options.length
  || !q.explain || !q.source);
if (!badQ.length) ok('כל שאלה: 4 תשובות ייחודיות, תשובה נכונה תקינה, הסבר ומקור');
else fail('שאלות לא תקינות: ' + badQ.map(q => q.id).join(', '));

const triviaNeeded = (def.stations || []).filter(s => s.kind === 'trivia')
  .reduce((n, s) => n + (s.params.count || 3), 0);
const triviaHave = (TRIVIA[def.id] || []).length;
if (triviaHave >= triviaNeeded) ok(`סה"כ שאלות לשלב 1 (${triviaHave}) מספיק לתחנות (${triviaNeeded}), בלי חזרות`);
else warn(`התחנות מבקשות ${triviaNeeded} שאלות אבל יש רק ${triviaHave} — יהיו חזרות`);

// כלי הקודש בשלב זהה למה שמהוגד ב-levels.js, וכל כרטיס שמופנה קיים
const relicPick = def.pickups.find(p => p.type === 'relic');
if (relicPick && relicPick.relicId === meta.relic.id) ok(`כלי הקודש בשלב 1 (${relicPick.relicId}) תואם ל-levels.js`);
else fail(`כלי הקודש בשלב 1 (${relicPick && relicPick.relicId}) לא תואם ל-levels.js (${meta.relic.id})`);

const referenced = [
  ...def.pickups.filter(p => p.cardId).map(p => p.cardId),
  ...(def.stations || []).map(s => s.cardId),
  ...def.npcs.filter(n => n.cardId).map(n => n.cardId),
].filter(Boolean);
const noCard = referenced.filter(id => !getCard(id));
if (!noCard.length) ok(`${referenced.length} הפניות לכרטיסיות — כולן קיימות`);
else fail('פניה לכרטיסיה שלא קיימת: ' + noCard.join(', '));

// ---------------------------------------------------------------------------
console.log('\n=== שלב 3: מַעֲבַר הַיַּרְדֵּן ===');

const meta3 = getLevel(3);
const def3 = buildLevel03();
const map3 = new TileMap(def3.back, def3.action, def3.front, meta3.palette);

console.log(`  מידות: ${map3.cols}×${map3.rows} אריחים (${map3.pixelW}×${map3.pixelH} פיקסלים)`);

if (meta3.ready) ok('שלב 3 מסומן ready');
else fail('שלב 3 לא מסומן ready');

for (const [name, rows] of [['back', def3.back], ['action', def3.action], ['front', def3.front]]) {
  const lens = new Set(rows.map(r => r.length));
  if (lens.size === 1) ok(`שכבת ${name}: כל השורות באורך ${[...lens][0]}`);
  else fail(`שכבת ${name}: אורכי שורות לא עקביים`);
}

const unknown3 = new Set();
for (const row of def3.action) {
  for (const ch of row) if (!KNOWN_ACTION.has(ch)) unknown3.add(ch);
}
if (unknown3.size === 0) ok('אין אריחים לא מוכרים בשכבת הפעולה');
else fail(`אריחים לא מוכרים: ${[...unknown3].join(' ')}`);

if (!map3.rectHitsSolid(def3.spawn.x, def3.spawn.y, 22, 42)) ok('נקודת הפתיחה פנויה');
else fail('נקודת הפתיחה תקועה בקיר');

const stones = def3.pickups.filter(p => p.type === 'stone');
if (stones.length === 12) ok('12 אבני שבט');
else fail(`צפויות 12 אבנים, נמצאו ${stones.length}`);

let stuck3 = 0;
for (const p of def3.pickups) {
  const size = p.type === 'spark' ? 14 : p.type === 'stone' ? 22 : 20;
  if (map3.rectHitsSolid(p.x, p.y, size, size)) stuck3++;
}
if (stuck3 === 0) ok(`${def3.pickups.length} פריטים — אף אחד לא תקוע באריח`);
else warn(`${stuck3} פריטים תקועים באריחים`);

if (def3.waterTimer && def3.waterGates?.length >= 2) {
  ok(`טיימר מים + ${def3.waterGates.length} שערי שופר`);
} else {
  fail('חסרים waterTimer או waterGates');
}

const trivia3 = (TRIVIA[3] || []).length;
const need3 = (def3.stations || []).filter(s => s.kind === 'trivia')
  .reduce((n, s) => n + (s.params.count || 3), 0);
if (trivia3 >= need3) ok(`טריוויה לשלב 3: ${trivia3} שאלות (צריך ${need3})`);
else warn(`טריוויה חסרה: ${trivia3} < ${need3}`);

const ref3 = [
  ...(def3.stations || []).map(s => s.cardId),
  ...def3.npcs.filter(n => n.cardId).map(n => n.cardId),
].filter(Boolean);
const noCard3 = ref3.filter(id => !getCard(id));
if (!noCard3.length) ok(`${ref3.length} הפניות Codex — כולן קיימות`);
else fail('כרטיסיות חסרות: ' + noCard3.join(', '));

if (meta3.relic.id === 'stones12') ok('כלי הקודש: שתים־עשרה אבנים');
else fail('relic לא תואם');

// --- סיכום ---
console.log('\n=== סיכום ===');
console.log(`  שגיאות: ${errors}`);
console.log(`  אזהרות: ${warnings}`);

if (errors === 0) {
  console.log('\n  השלב תקין.\n');
  process.exit(0);
} else {
  console.log('\n  נמצאו שגיאות.\n');
  process.exit(1);
}
