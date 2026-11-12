/**
 * level03.js — שלב 3: "מַעֲבַר הַיַּרְדֵּן"
 *
 * קרקעית הירדן היבשה. קירות מים עומדים משני הצדדים.
 * בצלאל אוסף 12 אבנים (אחת לכל שבט) לפני שהמים חוזרים.
 * מכניקה: טיימר מים + תקיעת שופר שפורצת קיר מים זמנית.
 */

import { TILE } from '../game/tilemap.js';

const COLS = 180;
const ROWS = 20;

const px = (col) => col * TILE;
const py = (row) => row * TILE;

/** שמות שבטי ישראל — סדר המחנה (במדבר ב׳), בקירוב */
export const TRIBES = [
  'יְהוּדָה', 'יִשָּׂשכָר', 'זְבוּלֻן', 'רְאוּבֵן',
  'שִׁמְעוֹן', 'גָּד', 'אֶפְרַיִם', 'מְנַשֶּׁה',
  'בִּנְיָמִין', 'דָּן', 'אָשֵׁר', 'נַפְתָּלִי',
];

class Grid {
  constructor(cols, rows, fill = '.') {
    this.cols = cols;
    this.rows = rows;
    this.cells = Array.from({ length: rows }, () => new Array(cols).fill(fill));
  }

  set(col, row, ch) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return;
    this.cells[row][col] = ch;
  }

  fillRect(col0, row0, col1, row1, ch) {
    for (let r = row0; r <= row1; r++) {
      for (let c = col0; c <= col1; c++) this.set(c, r, ch);
    }
  }

  ground(col0, col1, topRow, ch = '#') {
    this.fillRect(col0, topRow, col1, this.rows - 1, ch);
  }

  row(col0, col1, row, ch) {
    for (let c = col0; c <= col1; c++) this.set(c, row, ch);
  }

  toStrings() {
    return this.cells.map(r => r.join(''));
  }
}

/**
 * מפת הקרקע — מעבר הירדן מצד לצד.
 * רווחים בין מקטעים = תהומות (מים עמוקים שחזרו).
 */
const TERRAIN = [
  [0,   18,  15],   // גדת המזרח — מחנה ישראל
  [22,  38,  15],   // ירידה לקרקעית
  [39,  48,  13],   // מדף סלע
  [49,  62,  15],   // קרקעית רחבה
  [66,  80,  15],
  [81,  90,  12],   // עלייה
  [91,  104, 15],
  [108, 122, 14],
  [123, 136, 16],   // שקע עמוק
  [137, 152, 13],   // עלייה לגדה המערבית
  [153, 179, 15],   // גדת כנען + שער
];

const PLANKS = [
  [19,  13, 3],     // גישור ראשון
  [63,  13, 3],
  [70,  10, 4],     // מסלול עליון — מאחורי קיר מים
  [105, 12, 3],
  [120, 12, 3],
  [134, 14, 2],
  [138, 10, 3],     // גישה לחדר
  [143,  7, 4],     // פלטפורמת האבן הנדירה
];

const ROCKS = [
  [14, 13, 2],
  [35, 12, 3],
  [56, 13, 2],
  [76, 12, 3],
  [98, 12, 3],
  [118, 11, 3],
  [148, 11, 2],
  [168, 13, 2],
];

/** יתדות — שרטוני קרקעית חדים */
const SPIKES = [
  [58,  59, 14],
  [114, 116, 13],
  [160, 161, 14],
];

/**
 * קירות מים שחוסמים מעבר — נפרצים בשופר ל־3 שניות.
 * [id, col0, row0, col1, row1]
 */
const WATER_GATES = [
  ['gate_high',    68, 10, 69, 14],   // וילון לפני המסלול העליון
  ['gate_mid',     99, 11, 100, 14],  // מעבר צר בקרקעית
  ['gate_chamber', 141, 8, 141, 12],  // וילון לפני חדר האבן
];

function groundTopAt(col) {
  for (const [c0, c1, top] of TERRAIN) {
    if (col >= c0 && col <= c1) return top;
  }
  return null;
}

function surfaceY(col, heightPx = 0) {
  const top = groundTopAt(col);
  if (top == null) return py(ROWS - 4);
  return py(top) - heightPx;
}

function buildLayers() {
  const back = new Grid(COLS, ROWS);
  const action = new Grid(COLS, ROWS);
  const front = new Grid(COLS, ROWS);

  for (const [c0, c1, top] of TERRAIN) {
    action.ground(c0, c1, top);
  }

  for (const [col, top, h] of ROCKS) {
    action.fillRect(col, top, col, top + h - 1, 'R');
  }

  for (const [col, row, len] of PLANKS) {
    action.row(col, col + len - 1, row, '=');
  }

  for (const [c0, c1, row] of SPIKES) {
    action.row(c0, c1, row, '^');
  }

  // קירות מים סגורים — אריח H (מוצק, מצויר כמים)
  for (const [, c0, r0, c1, r1] of WATER_GATES) {
    action.fillRect(c0, r0, c1, r1, 'H');
  }

  // רקע: שכבת משקע נהר + קניון
  for (let c = 0; c < COLS; c++) {
    const canyon = 11 + Math.round(Math.sin(c * 0.07) * 1.4 + Math.sin(c * 0.19) * 0.7);
    back.fillRect(c, canyon, c, ROWS - 1, 'd');
  }

  // קני סוף לאורך הגדות
  const reedSpots = [
    3, 6, 9, 12, 16,
    24, 28, 32, 37,
    50, 54, 60,
    70, 74, 78,
    93, 97, 103,
    110, 115, 121,
    155, 159, 165, 172, 176,
  ];
  for (const c of reedSpots) {
    const top = groundTopAt(c);
    if (top == null) continue;
    front.set(c, top - 1, 'g');
    if ((c * 3) % 4 === 0) front.set(c, top - 2, 'g');
  }

  // אבני זיכרון ברקע ליד הסוף
  for (const c of [8, 10, 156, 158, 170]) {
    const top = groundTopAt(c);
    if (top != null) back.set(c, top - 1, 'R');
  }

  return {
    back: back.toStrings(),
    action: action.toStrings(),
    front: front.toStrings(),
  };
}

const ENEMY_HEIGHT = { riverFish: 20, silverFish: 26 };

const ENEMY_SPEC = [
  { type: 'riverFish',  col: 12,  patrol: [8, 17] },
  { type: 'riverFish',  col: 28,  patrol: [23, 34] },
  { type: 'silverFish', col: 37,  patrol: [36, 38] },
  { type: 'riverFish',  col: 45,  patrol: [40, 48] },
  { type: 'silverFish', col: 54,  patrol: [50, 55] },
  { type: 'riverFish',  col: 72,  patrol: [70, 75] },
  { type: 'silverFish', col: 86,  patrol: [82, 90] },
  { type: 'riverFish',  col: 96,  patrol: [92, 97] },
  { type: 'silverFish', col: 112, patrol: [109, 113] },
  { type: 'riverFish',  col: 128, patrol: [124, 133] },
  { type: 'silverFish', col: 146, patrol: [142, 147] },
  { type: 'riverFish',  col: 162, patrol: [154, 167] },
  { type: 'silverFish', col: 174, patrol: [170, 178] },
];

/**
 * מיקומי 12 האבנים: [col, row] או col בלבד (על הקרקע).
 * חלקם מאחורי קירות מים / במסלולים עליונים — עידוד לשופר ולחקירה.
 */
const STONE_SPOTS = [
  [7],            // יהודה — ליד יהושע
  [26],           // יששכר
  [42, 12],       // זבולון — על המדף
  [52],           // ראובן
  [72, 9],        // שמעון — מסלול עליון (שופר)
  [74],           // גד
  [88, 11],       // אפרים — על הגבעה
  [102],          // מנשה — אחרי gate_mid
  [121],          // בנימין
  [130, 15],      // דן — בשקע
  [145, 6],       // אשר — בחדר (שופר)
  [166],          // נפתלי — ליד היציאה
];

function buildPickups(action) {
  const items = [];

  const free = (col, row) => {
    if (row < 0 || row >= action.length) return false;
    const ch = action[row][col];
    return ch === '.' || ch === undefined;
  };

  const add = (type, col, row, opts = {}) => {
    if (!free(col, row) && type !== 'stone') return;
    // אבנים יכולות לשבת גם מעל קרשים (שורה מעל '=')
    if (type === 'stone') {
      const ch = action[row]?.[col];
      if (ch && ch !== '.' && ch !== '=' && ch !== 'H') return;
    }
    items.push({ type, x: px(col) + 6, y: py(row) + 4, ...opts });
  };

  STONE_SPOTS.forEach((spot, i) => {
    const col = spot[0];
    const row = spot[1] != null ? spot[1] : (groundTopAt(col) ?? 14) - 1;
    add('stone', col, row, { tribe: TRIBES[i], stoneIndex: i });
  });

  // רימונים לריפוי לאורך הדרך
  for (const [col, row] of [[33, 14], [78, 14], [125, 15], [157, 14]]) {
    add('health', col, row);
  }

  // ניצוצות סמויים
  items.push({ type: 'spark', x: px(72) + 8,  y: py(9) - 28 });
  items.push({ type: 'spark', x: px(145) + 8, y: py(6) - 26 });
  items.push({ type: 'spark', x: px(120) + 8, y: py(11) - 24 });

  return items;
}

export function buildLevel03() {
  const layers = buildLayers();

  return {
    id: 3,
    cols: COLS,
    rows: ROWS,
    ...layers,

    spawn: { x: px(3), y: surfaceY(3, 42) - 4 },

    npcs: [
      {
        id: 'yehoshua',
        role: 'leader', beard: false,
        name: 'יְהוֹשֻׁעַ בִּן־נוּן',
        x: px(6),
        y: surfaceY(6, 56),
        w: 30, h: 56,
        robe: '#c8d4e0',
        sash: '#3fb8d0',
        cardId: 'yehoshua',
        grantShofar: true,
        lines: [
          'בְּצַלְאֵל — הָאֲרוֹן עוֹמֵד בַּתּוֹךְ הַיַּרְדֵּן, וְהַמַּיִם נִצָּבִים כְּמוֹ חוֹמָה.',
          'קַח שְׁתֵּים־עֶשְׂרֵה אֲבָנִים מִן הַיַּבָּשָׁה — אַחַת לְכָל שֵׁבֶט — לִפְנֵי שֶׁיָּשׁוּבוּ הַמַּיִם.',
          'הִנֵּה הַשּׁוֹפָר. תְּקַע בּוֹ (X) לְיַד קִיר מַיִם — וְיִפָּתַח מַעֲבָר לְשָׁלוֹשׁ שְׁנִיּוֹת.',
        ],
      },
      {
        id: 'yehoshua_end',
        role: 'leader', beard: false,
        name: 'יְהוֹשֻׁעַ בִּן־נוּן',
        x: px(172),
        y: surfaceY(172, 56),
        w: 30, h: 56,
        robe: '#c8d4e0',
        sash: '#3fb8d0',
        lines: [
          'הָאֲבָנִים הָאֵלֶּה יִהְיוּ לְזִכָּרוֹן לִבְנֵי יִשְׂרָאֵל עַד עוֹלָם.',
          'עַתָּה עִבְרוּ — הָאָרֶץ לְפָנֵיכֶם.',
        ],
      },
    ],

    stations: [
      {
        id: 'jordan_memory', kind: 'memory', name: 'מדריך כלי המשכן',
        x: px(29), y: surfaceY(29, 56), w: 30, h: 56,
        robe: '#a5cbd4', sash: '#d1a85e', cardId: 'ark_jordan',
        params: { speaker: 'מדריך הסדנה' },
      },
      {
        id: 'jordan_maze', kind: 'planningMaze', name: 'שומר הזיכרון',
        x: px(110), y: surfaceY(110, 56), w: 30, h: 56,
        robe: '#9eb8c9', sash: '#d1a85e', cardId: 'twelve_stones',
        params: { speaker: 'מדריך הסדנה' },
      },
      {
        id: 'elder_jordan', kind: 'trivia', name: 'זָקֵן מִיִּשְׂרָאֵל',
        x: px(40), y: surfaceY(40, 56), w: 30, h: 56,
        robe: '#b8c8b0', sash: '#3a6b7d', cardId: 'jordan',
        params: { count: 2, title: 'שְׁאֵלַת יֶדַע', speaker: 'זָקֵן עַל שְׂפַת הַיַּרְדֵּן' },
      },
      {
        id: 'scribe', kind: 'trivia', name: 'סוֹפֵר',
        role: 'scribe', beard: false,
        x: px(85), y: surfaceY(85, 56), w: 30, h: 56,
        robe: '#d0c8a8', sash: '#c9a227', cardId: 'twelve_stones',
        params: { count: 2, title: 'שְׁאֵלַת יֶדַע', speaker: 'סוֹפֵר הַמַּחֲנֶה' },
      },
      {
        id: 'levite', kind: 'sorting', name: 'לֵוִי',
        role: 'priest',
        x: px(150), y: surfaceY(150, 56), w: 30, h: 56,
        robe: '#a0b0c8', sash: '#ffe9a8', cardId: 'ark_jordan',
        params: { title: 'מִבְחַן תְּרוּמַת הַלֵּב', speaker: 'לֵוִי נוֹשֵׂא אָרוֹן' },
      },
    ],

    checkpoints: [
      { x: px(25),  y: surfaceY(25, 34),  w: 34, h: 34 },
      { x: px(92),  y: surfaceY(92, 34),  w: 34, h: 34 },
      { x: px(154), y: surfaceY(154, 34), w: 34, h: 34 },
    ],

    enemies: ENEMY_SPEC.map(e => ({
      type: e.type,
      x: px(e.col),
      y: surfaceY(e.col, ENEMY_HEIGHT[e.type] || 44),
      patrolLeft: px(e.patrol[0]),
      patrolRight: px(e.patrol[1] + 1),
    })),

    pickups: buildPickups(layers.action),

    exit: { x: px(176), y: surfaceY(176, 96), w: 56, h: 96 },

    /**
     * טיימר מים — המכניקה הייחודית של השלב.
     * המד עולה עם הזמן. כל אבן מוסיפה bonusSec שניות.
     * כשהמד מתמלא — המים חוזרים.
     */
    waterTimer: {
      startSec: 70,
      bonusSec: 15,
      maxStones: 12,
      warnAt: 20,       // באנר אזהרה כשנותרו פחות מזה
    },

    /** קירות מים לפריצה בשופר */
    waterGates: WATER_GATES.map(([id, c0, r0, c1, r1]) => ({
      id,
      col0: c0, row0: r0, col1: c1, row1: r1,
      x: px(c0),
      y: py(r0),
      w: px(c1 - c0 + 1),
      h: py(r1 - r0 + 1),
      openDur: 3,
    })),

    /** קירות מים אטמוספריים משני צידי המסך (רק ציור) */
    waterWalls: true,

    /** בלי רשימת 15 המצרכים — כאן האבנים הן העיקר */
    hideMaterials: true,

    maxSparks: 3,
  };
}
