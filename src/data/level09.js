import { TILE } from '../game/tilemap.js';

/**
 * שלב 9 — ארזי הלבנון. בהיר מההתחלה עד הסוף.
 *
 * א. יער ארזים מושלג: חירם מלך צור שולח ארזים לשלמה (מלכים א׳ ה׳, כ״ב–כ״ד).
 *    אוספים קורות ארז על הקרקע ובצמרות; עורבים שובבים מתפזרים באור.
 * ב. ים יפו: קופצים בין רפסודות נעות ואיים (דברי הימים ב׳ ב׳, ט״ו). נפילה למים —
 *    "פלוץ!", לב אחד, וחוזרים לנקודת ההצלה.
 * ג. המחצבה: אבנים סדוקות (C) נשברות באור המטה (Z) ופותחות דרך ואבני גזית.
 * ד. הר המוריה: אזור שקט ("לא נשמע בבית בהבנתו", מלכים א׳ ו׳, ז׳). אתגר: מכניסים
 *    לקיר את האבנים שהוכנו מראש, כל אחת למקומה.
 */
const COLS = 300, ROWS = 20;
const TERRAIN = [
  [0, 20, 14], [21, 40, 12], [41, 60, 10], [61, 75, 12], [76, 88, 14],   // יער הלבנון
  [89, 98, 15],                                                         // חוף יפו
  [116, 120, 14], [140, 144, 14], [160, 164, 14],                       // איים
  [165, 190, 15], [191, 210, 13], [211, 230, 11], [231, 250, 13],       // המחצבה
  [251, 299, 12],                                                       // הר המוריה
];
const SEA = { from: 99, to: 164, floor: 19 };
const surface = c => TERRAIN.find(([a, b]) => c >= a && c <= b)?.[2] ?? SEA.floor;
const pos = (c, h = 0) => ({ x: c * TILE, y: surface(c) * TILE - h });

/** קירות של אבן סדוקה: שוברים את השורות התחתונות כדי לעבור */
const CRACKED_WALLS = [[182, 10, 14], [200, 8, 12], [222, 6, 10], [240, 8, 12]];
/** תיבות אבן סדוקה ובתוכן אבן גזית */
const STONE_BOXES = [[195, 11], [234, 11]];
/** ענפי ארז — קרשים בצמרות */
const BRANCHES = [[25, 10, 3], [29, 7, 4], [48, 8, 3], [52, 6, 3]];

export function buildLevel09() {
  const action = Array.from({ length: ROWS }, () => Array(COLS).fill('.'));
  const back = action.map(r => [...r]), front = action.map(r => [...r]);
  for (const [a, b, row] of TERRAIN) for (let c = a; c <= b; c++) {
    for (let y = row; y < ROWS; y++) action[y][c] = '#';
    if (c % 6 === 0 && c < 89) front[row - 1][c] = 'g';
  }
  for (let c = SEA.from; c <= SEA.to; c++) if (action[SEA.floor][c] === '.') action[SEA.floor][c] = '#';
  for (const [c, r0, r1] of CRACKED_WALLS) for (let x = c; x < c + 2; x++) for (let y = r0; y <= r1; y++) action[y][x] = 'C';
  for (const [cx, cy] of STONE_BOXES) for (let x = cx - 1; x <= cx + 1; x++) for (let y = cy - 1; y <= cy + 1; y++) action[y][x] = x === cx && y === cy ? '.' : 'C';
  for (const [c, r, w] of BRANCHES) for (let x = c; x < c + w; x++) action[r][x] = '=';

  const human = (id, name, col, extra = {}) => ({
    id, name, ...pos(col, 56), w: 30, h: 56, robe: '#e8dcc0', sash: '#7a5a3a', ...extra,
  });
  const raft = (col, dxTiles, period, phase = 0) =>
    ({ x: col * TILE, y: 16 * TILE - 14, w: 3 * TILE, h: 14, raft: true, path: { dx: dxTiles * TILE, dy: 0 }, period, phase });

  return {
    id: 9, cols: COLS, rows: ROWS,
    back: back.map(r => r.join('')), action: action.map(r => r.join('')), front: front.map(r => r.join('')),
    spawn: pos(2, 46), hideMaterials: true, lebanon: true, challengeFree: true, maxSparks: 3,
    sea: { x0: SEA.from * TILE, x1: (SEA.to + 1) * TILE, y: 16 * TILE + 6 },
    quiet: { x0: 258 * TILE, x1: COLS * TILE },
    cedars: [[10, 1.1], [33, 1.3], [50, 1.2], [68, 1], [83, 1.15]].map(([c, s]) => ({ x: c * TILE, y: surface(c) * TILE, s })),
    signs: [262, 288].map(c => ({ x: c * TILE, y: surface(c) * TILE })),
    movers: [raft(99, 12, 7), raft(121, 14, 8, 0.3), raft(145, 11, 7, 0.6)],
    npcs: [
      human('hiram', 'חִירָם מֶלֶךְ צוֹר', 5, { role: 'royal', robe: '#82509a', sash: '#c7a447', cardId: 'hiram', lines: [
        'שלום! אני חירם, מלך צור. הייתי ידידו של דוד המלך.',
        'שלמה ביקש ארזים מן הלבנון לבית ה׳. אספו קורות ארז, ונשלח אותן ברפסודות בים!',
      ] }),
      human('givlim', 'חוֹטֵב הָעֵצִים', 56, { beardColor: '#6a4a2a', lines: [
        'עשרת אלפים איש עולים ללבנון בכל חודש: חודש כאן, ושני חודשים בבית.',
        'הגבלים ובוני חירם מכינים את העצים והאבנים לבית. היזהרו מהעורבים — אור המטה מבריח אותם.',
      ] }),
      human('quarry', 'חוֹצֵב הָאֲבָנִים', 176, { beardColor: '#8a7a5a', cardId: 'quiet_building', lines: [
        'כאן, במחצבה, חוצבים אבנים גדולות ויקרות ומכינים כל אחת למקומה.',
        'אבן סדוקה נשברת באור המטה (Z). כאן מותר להרעיש — אבל לא בבית עצמו!',
      ] }),
      human('shlomo9', 'שְׁלֹמֹה הַמֶּלֶךְ', 256, { role: 'royal', beard: false, robe: '#e9cd87', sash: '#8e527e', cardId: 'moriah', lines: [
        'ברוכים הבאים להר המוריה! כאן נבנה בית ה׳.',
        'שימו לב: כאן שקט. לא פטיש ולא גרזן — כל אבן הגיעה מוכנה למקומה. עזרו לי להשלים את הקיר.',
      ] }),
    ],
    stations: [
      human('cedar_trivia', 'שְׁאֵלוֹת הַיַּעַר', 64, { kind: 'trivia', cardId: 'cedars',
        params: { count: 3, title: 'מִן הַלְּבָנוֹן אֶל יְרוּשָׁלַיִם', speaker: 'חוֹטֵב הָעֵצִים' } }),
    ],
    checkpoints: [18, 48, 78, 94, 118, 142, 162, 175, 205, 226, 258].map(c => ({ ...pos(c, 34), w: 34, h: 34 })),
    enemies: [
      ...[[16, 12, 24], [44, 40, 56], [66, 62, 74]].map(([c, a, b]) => ({
        type: 'crow', x: c * TILE, y: surface(c) * TILE - 92, patrolLeft: a * TILE, patrolRight: (b + 1) * TILE,
      })),
      ...[[93, 90, 97], [118, 116, 120], [162, 160, 164]].map(([c, a, b]) => ({
        type: 'crab', ...pos(c, 18), patrolLeft: a * TILE, patrolRight: (b + 1) * TILE,
      })),
    ],
    pickups: [
      ...[[8, 30], [31, 7 * TILE], [53, 6 * TILE], [70, 30], [118, 30], [142, 30], [162, 30]].map(([c, v]) =>
        ({ type: 'cedar', x: c * TILE + 6, y: v > 100 ? v - 30 : surface(c) * TILE - v })),
      ...[[185, 15], [203, 13], [225, 11], [243, 13]].map(([c, r]) => ({ type: 'hewn', x: c * TILE + 6, y: r * TILE - 28 })),
      ...STONE_BOXES.map(([cx, cy]) => ({ type: 'hewn', x: cx * TILE + 6, y: cy * TILE + 4 })),
      ...[26, 60, 96, 143, 188, 228, 262].map(c => ({ type: 'health', ...pos(c, 26) })),
      { type: 'spark', x: 30 * TILE + 8, y: 4 * TILE },
      { type: 'spark', x: 130 * TILE + 8, y: 13 * TILE },
      { type: 'spark', x: 213 * TILE + 8, y: 8 * TILE },
    ],
    challenge: { id: 'stone_fit', kind: 'stoneFit', ...pos(276, 100), w: 64, h: 100, params: { speaker: 'שְׁלֹמֹה' } },
    exit: { ...pos(294, 96), w: 56, h: 96 },
  };
}
