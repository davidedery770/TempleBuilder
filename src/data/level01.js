/**
 * level01.js — שלב 1: "מַחֲנֵה יִשְׂרָאֵל"
 *
 * המפה נבנית בעזרת בנאי ולא כמחרוזות ארוכות ידניות. כך אפשר
 * לקרוא את מבנה השלב כרשימת פעולות ("קרקע מעמודה 28 עד 44 בגובה 15"),
 * וטעות אחת לא מזיזה את כל השלב.
 *
 * מערכת הצירים: עמודה 0 משמאל, שורה 0 למעלה. אריח = 32 פיקסלים.
 */

import { TILE } from '../game/tilemap.js';
import { MATERIAL_ORDER } from './materials.js';

const COLS = 200;   // 6400 פיקסלים — כ־3 דקות משחק
const ROWS = 20;    // 640 פיקסלים

/** ממיר עמודה/שורה לפיקסלים */
const px = (col) => col * TILE;
const py = (row) => row * TILE;

/**
 * בנאי רשת אריחים. כל השכבות מתחילות ריקות ונבנות בפעולות.
 */
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

  /** מלבן מלא */
  fillRect(col0, row0, col1, row1, ch) {
    for (let r = row0; r <= row1; r++) {
      for (let c = col0; c <= col1; c++) this.set(c, r, ch);
    }
  }

  /** קרקע: מ־topRow ועד תחתית המפה */
  ground(col0, col1, topRow, ch = '#') {
    this.fillRect(col0, topRow, col1, this.rows - 1, ch);
  }

  /** שורת אריחים אופקית */
  row(col0, col1, row, ch) {
    for (let c = col0; c <= col1; c++) this.set(c, row, ch);
  }

  toStrings() {
    return this.cells.map(r => r.join(''));
  }
}

/**
 * מפת הקרקע של השלב, כרשימת מקטעים.
 * כל מקטע: [עמודת התחלה, עמודת סיום, שורת פני הקרקע]
 * הרווחים בין מקטעים הם תהומות — נפילה בהן קטלנית.
 */
const TERRAIN = [
  [0,   24,  15],   // פתיחה: מישור רחב, מקום להתרגל לשליטה
  [28,  44,  15],   // אחרי התהום הראשונה
  [45,  52,  13],   // מדרגה עולה
  [53,  58,  15],   // ירידה חזרה
  [62,  78,  15],   // מקטע ארוך עם יתדות
  [79,  84,  12],   // גבעה
  [89,  104, 15],   // אזור המזבח השני
  [105, 118, 14],
  [122, 134, 16],   // שקע נמוך
  [135, 148, 13],   // עלייה אל אזור כלי הקודש
  [152, 170, 15],
  [171, 199, 15],   // המקטע האחרון אל השער
];

/** פלטפורמות קרשים מרחפות: [עמודה, שורה, אורך] */
const PLANKS = [
  [25,  13, 3],    // גישור על התהום הראשונה
  [59,  13, 3],
  [60,  10, 2],    // מסלול עליון חלופי — מוביל לניצוץ
  [85,  11, 4],
  [86,   8, 2],
  [119, 12, 3],
  [132, 14, 2],    // מדרגת ביניים מהשקע אל עמוד הסלע
  [135, 11, 2],    // מדרגת ביניים אל כלי הקודש (הקרקע שם בשורה 13, הפלטפורמה הבאה ב-9)
  [138,  9, 5],    // הפלטפורמה שנושאת את כלי הקודש
  [143,  6, 3],    // גישה לניצוץ שלישי
  [149, 12, 3],
  [163, 11, 4],
];

/** עמודי סלע: [עמודה, שורת ראש, גובה] */
const ROCKS = [
  [20, 13, 2],
  [41, 12, 3],
  [75, 13, 2],
  [100, 12, 3],
  [131, 13, 3],
  [158, 12, 3],
  [180, 13, 2],
];

/** שדות יתדות: [עמודת התחלה, עמודת סיום, שורה] */
const SPIKES = [
  [70,  72, 14],
  [112, 114, 13],
  [166, 167, 14],
];

/** בונה את שלוש השכבות */
function buildLayers() {
  const back = new Grid(COLS, ROWS);
  const action = new Grid(COLS, ROWS);
  const front = new Grid(COLS, ROWS);

  // --- שכבת הפעולה: קרקע ---
  for (const [c0, c1, top] of TERRAIN) {
    action.ground(c0, c1, top);
  }

  // --- עמודי סלע ---
  for (const [col, top, h] of ROCKS) {
    action.fillRect(col, top, col, top + h - 1, 'R');
  }

  // --- פלטפורמות קרשים ---
  for (const [col, row, len] of PLANKS) {
    action.row(col, col + len - 1, row, '=');
  }

  // --- יתדות ---
  for (const [c0, c1, row] of SPIKES) {
    action.row(c0, c1, row, '^');
  }

  // --- שכבת הרקע: דיונות רחוקות ---
  // פס דיונות גלי לאורך כל המפה, מעט מעל קו הקרקע
  for (let c = 0; c < COLS; c++) {
    const duneTop = 12 + Math.round(Math.sin(c * 0.08) * 1.6 + Math.sin(c * 0.21) * 0.9);
    back.fillRect(c, duneTop, c, ROWS - 1, 'd');
  }

  // --- אוהלי המחנה ברקע ---
  // מקובצים בתחילת השלב ובאזור המזבחות — שם "חי" המחנה
  const tentSpots = [
    2, 4, 7, 9, 12, 15, 18, 22,
    30, 33, 36, 39,
    92, 95, 98, 101,
    174, 177, 180, 183, 186,
  ];
  for (const c of tentSpots) {
    const top = groundTopAt(c);
    if (top == null) continue;
    back.set(c, top - 1, 't');
    front.set(c + 1, top - 1, 'p');   // יתד ליד האוהל
  }

  // --- יריעות תכלת וארגמן פרושות ---
  for (const c of [11, 12, 34, 35, 96, 97, 178, 179]) {
    const top = groundTopAt(c);
    if (top != null) back.set(c, top - 2, 'c');
  }

  // --- שכבת החזית: עשב מדבר על קווי קרקע ---
  for (let c = 0; c < COLS; c += 3) {
    const top = groundTopAt(c);
    if (top == null) continue;
    // לא מציירים עשב איפה שיש יתדות
    if (SPIKES.some(([a, b]) => c >= a && c <= b)) continue;
    if ((c * 7919) % 5 < 2) front.set(c, top - 1, 'g');
  }

  return {
    back: back.toStrings(),
    action: action.toStrings(),
    front: front.toStrings(),
  };
}

/** שורת פני הקרקע בעמודה נתונה, או null אם זו תהום */
function groundTopAt(col) {
  for (const [c0, c1, top] of TERRAIN) {
    if (col >= c0 && col <= c1) return top;
  }
  return null;
}

/** קואורדינטת Y לעמידה על הקרקע בעמודה נתונה */
function surfaceY(col, heightPx = 0) {
  const top = groundTopAt(col);
  if (top == null) return py(ROWS - 4);
  return py(top) - heightPx;
}

// ---------------------------------------------------------------------------
// ישויות
// ---------------------------------------------------------------------------

/** גובה תיבת ההתנגשות לכל סוג אויב — חייב להתאים ל-enemy.js */
const ENEMY_HEIGHT = { scorpion: 20, amalekite: 44 };

/** אויבים. patrol בעמודות, מומר לפיקסלים. */
const ENEMY_SPEC = [
  { type: 'scorpion',  col: 16,  patrol: [12, 23] },
  { type: 'scorpion',  col: 33,  patrol: [29, 43] },
  { type: 'amalekite', col: 40,  patrol: [30, 44] },
  { type: 'scorpion',  col: 49,  patrol: [45, 52] },
  { type: 'amalekite', col: 67,  patrol: [62, 69] },
  { type: 'scorpion',  col: 76,  patrol: [73, 78] },
  { type: 'amalekite', col: 82,  patrol: [79, 84] },
  { type: 'scorpion',  col: 93,  patrol: [89, 99] },
  { type: 'amalekite', col: 102, patrol: [95, 104] },
  { type: 'scorpion',  col: 110, patrol: [105, 111] },
  { type: 'amalekite', col: 116, patrol: [108, 118] },
  { type: 'scorpion',  col: 127, patrol: [122, 133] },
  { type: 'amalekite', col: 145, patrol: [136, 148] },
  { type: 'scorpion',  col: 156, patrol: [152, 162] },
  { type: 'amalekite', col: 168, patrol: [163, 170] },
  { type: 'amalekite', col: 176, patrol: [172, 182] },
  { type: 'scorpion',  col: 188, patrol: [184, 194] },
];

/**
 * תרומות. רוב הפריטים מסודרים בקשתות מעל תהומות ובשורות על הקרקע —
 * כך שהאיסוף מכוון את השחקן למסלול הנכון, בלי חצים ובלי הסברים.
 *
 * @param {string[]} action שכבת הפעולה — משמשת לדלג על תאים תפוסים
 */
function buildPickups(action) {
  const items = [];

  /** האם התא פנוי להנחת פריט */
  const free = (col, row) => {
    if (row < 0 || row >= action.length) return false;
    const ch = action[row][col];
    return ch === '.' || ch === undefined;
  };

  let seq = 0;
  const add = (type, col, row, opts = {}) => {
    // דילוג על עמודי סלע, קרשים ויתדות — פריט שם לא ניתן לאיסוף
    if (!free(col, row)) return;

    const o = { ...opts };
    // כל תרומה היא מצרך אחר לפי סדר הפסוקים (שמות כ״ה ג׳–ז׳). בדרך השלב
    // כל 15 המינים מופיעים כמה פעמים, והרשימה ב-HUD נמלאת בהדרגה.
    // (הפרמטר kind שמועבר ל-line/arc מתועד רק לקריאות — הוא נדרס כאן.)
    if (type === 'donation') o.kind = MATERIAL_ORDER[seq++ % MATERIAL_ORDER.length];

    items.push({ type, x: px(col) + 6, y: py(row) + 6, ...o });
  };

  /** שורה של תרומות על הקרקע */
  const line = (c0, c1, kind, step = 2) => {
    for (let c = c0; c <= c1; c += step) {
      const top = groundTopAt(c);
      if (top == null) continue;
      add('donation', c, top - 1, { kind });
    }
  };

  /** קשת תרומות מעל תהום — מסמנת את מסלול הקפיצה */
  const arc = (c0, c1, baseRow, height, kind) => {
    const n = c1 - c0;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const lift = Math.sin(t * Math.PI) * height;
      add('donation', c0 + i, Math.round(baseRow - lift), { kind });
    }
  };

  // --- מקטע פתיחה: נחושת, מלמד שיש מה לאסוף ---
  line(6, 22, 'bronze', 2);

  // --- התהום הראשונה: קשת זהב ---
  arc(24, 29, 13, 2.5, 'gold');

  // --- המישור השני ---
  line(30, 43, 'bronze', 2);
  add('health', 37, 14);

  // --- המדרגה: כסף כפרס על הטיפוס ---
  line(45, 52, 'silver', 2);
  add('donation', 47, 11, { kind: 'techelet' });

  // --- התהום השנייה, עם מסלול עליון ---
  arc(58, 63, 13, 2.5, 'gold');
  add('donation', 60, 9,  { kind: 'argaman' });
  add('donation', 61, 9,  { kind: 'argaman' });

  // --- מעל שדה היתדות: הפרס מעודד לקפוץ ולא לעקוף ---
  arc(69, 73, 12, 1.8, 'gold');

  // --- הגבעה ---
  line(79, 84, 'silver', 2);
  add('donation', 86, 7, { kind: 'tolaat' });
  add('donation', 87, 7, { kind: 'tolaat' });

  // --- אזור המזבח השני ---
  line(90, 103, 'bronze', 2);
  add('health', 97, 14);
  add('donation', 100, 10, { kind: 'techelet' });

  // --- המקטע הגבוה ---
  line(106, 117, 'silver', 3);
  arc(111, 115, 12, 1.5, 'gold');

  // --- השקע הנמוך ---
  arc(118, 123, 11, 2, 'gold');
  line(124, 133, 'bronze', 2);
  add('health', 128, 15);

  // --- העלייה אל כלי הקודש ---
  line(136, 147, 'silver', 2);
  add('donation', 139, 8, { kind: 'argaman' });
  add('donation', 141, 8, { kind: 'argaman' });

  // --- כלי הקודש: מגילת תבנית המשכן, על הפלטפורמה הגבוהה ---
  // מונח ישירות — לא עובר דרך add(), כי הוא חייב להופיע בכל מקרה
  items.push({
    type: 'relic', x: px(140) + 2, y: py(8) - 2,
    relicId: 'tavnit', cardId: 'tavnit',
  });

  // --- המקטע האחרון ---
  line(153, 169, 'bronze', 2);
  add('health', 160, 14);
  line(172, 196, 'gold', 3);

  // --- שלושת הניצוצות הסמויים ---
  // כל אחד דורש סטייה מהמסלול: גבוה, נמוך, ובקצה
  items.push({ type: 'spark', x: px(61) + 8,  y: py(9) - 30 });   // מסלול עליון
  items.push({ type: 'spark', x: px(144) + 8, y: py(5) - 24 });   // מעל הכל
  items.push({ type: 'spark', x: px(165) + 8, y: py(10) - 26 });  // מעבר ליתדות

  // Thin ordinary donations in world order, then reassign the complete cycle.
  // Assigning kinds before thinning could silently remove a biblical material.
  const donations = items.filter(p => p.type === 'donation').sort((a,b) => a.x - b.x);
  const keep = new Set();
  let last = -Infinity;
  for (const p of donations) {
    if (p.x - last < 128) continue;
    p.kind = MATERIAL_ORDER[keep.size % MATERIAL_ORDER.length];
    keep.add(p); last = p.x;
  }
  return items.filter(p => p.type !== 'donation' || keep.has(p));
}

// ---------------------------------------------------------------------------
// הגדרת השלב
// ---------------------------------------------------------------------------

export function buildLevel01() {
  const layers = buildLayers();

  return {
    id: 1,
    cols: COLS,
    rows: ROWS,
    ...layers,

    /** נקודת הפתיחה של השחקן */
    spawn: { x: px(2), y: surfaceY(2, 42) - 4 },

    /** דמויות שהשחקן פוגש */
    npcs: [
      {
        id: 'moshe',
        name: 'מֹשֶׁה רַבֵּנוּ',
        x: px(5),
        y: surfaceY(5, 56),
        w: 30, h: 56,
        robe: '#e8e2d0',
        sash: '#c9a227',
        cardId: 'moshe',
        lines: [
          'אוספים תרומות, ובונים את המשכן!',
          'אור המטה מפזר מכשולים. בתחנות בוחרים אם לשחק.',
        ],
      },
      {
        id: 'moshe_end',
        name: 'מֹשֶׁה רַבֵּנוּ',
        x: px(191),
        y: surfaceY(191, 56),
        w: 30, h: 56,
        robe: '#e8e2d0',
        sash: '#c9a227',
        lines: [
          'התרומות מוכנות. עכשיו בונים!',
        ],
      },
    ],

    /**
     * תחנות ידע: דמויות שמזמינות למיני-משחק קצר. השחקן נגש ולוחץ Enter (או לוחץ עליהן).
     *   kind   — סוג המיני-משחק (trivia | sorting | weaving)
     *   cardId — קלף Codex שנפתח כפרס בהצלחה
     * פרס אחר הצלחה: לב אחד (וחיים נוספים אם בלי טעויות).
     */
    stations: [
      {
        id: 'camp_memory', kind: 'memory', name: 'מדריך כלי המשכן',
        x: px(35), y: surfaceY(35, 56), w: 30, h: 56,
        robe: '#a5cbd4', sash: '#d1a85e', cardId: 'mishkan',
        params: { speaker: 'מדריך הסדנה' },
      },
      {
        id: 'elder1', kind: 'matching', name: 'זָקֵן מִיִּשְׂרָאֵל',
        x: px(55), y: surfaceY(55, 56), w: 30, h: 56,
        robe: '#d8cdb0', sash: '#7a5a2a', cardId: 'terumah',
        params: { title: 'מחברים ובונים', speaker: 'זָקֵן מִיִּשְׂרָאֵל' },
      },
      {
        id: 'weaver', kind: 'weaving', name: 'חָכְמַת לֵב',
        x: px(91), y: surfaceY(91, 56), w: 30, h: 56,
        robe: '#b0709a', sash: '#2f6f9e', beard: false, veil: true, cardId: 'colors',
        params: { title: 'חָכְמַת לֵב', speaker: 'וְכָל אִשָּׁה חֲכַמַת לֵב בְּיָדֶיהָ טָווּ' },
      },
      {
        id: 'prince', kind: 'sorting', name: 'נָשִׂיא',
        x: px(126), y: surfaceY(126, 56), w: 30, h: 56,
        robe: '#7a8ab0', sash: '#c9a227', cardId: 'materials15',
        params: { title: 'מִבְחַן תְּרוּמַת הַלֵּב', speaker: 'נָשִׂיא מִנְּשִׂיאֵי הָעֵדָה' },
      },
      {
        id: 'elder2', kind: 'trivia', name: 'זָקֵן מִיִּשְׂרָאֵל',
        x: px(147), y: surfaceY(147, 56), w: 30, h: 56,
        robe: '#cfc2a0', sash: '#5a7a4a', cardId: 'mishkan',
        params: { count: 1, title: 'שְׁאֵלַת יֶדַע', speaker: 'זָקֵן אֶחָד עוֹד בַּדֶּרֶךְ' },
      },
    ],

    /** מזבחות־צ'קפוינט */
    checkpoints: [
      { x: px(31),  y: surfaceY(31, 34),  w: 34, h: 34 },
      { x: px(94),  y: surfaceY(94, 34),  w: 34, h: 34 },
      { x: px(155), y: surfaceY(155, 34), w: 34, h: 34 },
    ],

    enemies: ENEMY_SPEC.map(e => ({
      type: e.type,
      x: px(e.col),
      // מונח בדיוק על פני הקרקע, כך שהוא לא נופל ברגע תחילת השלב
      y: surfaceY(e.col, ENEMY_HEIGHT[e.type] || 44),
      patrolLeft: px(e.patrol[0]),
      patrolRight: px(e.patrol[1] + 1),
    })),

    pickups: buildPickups(layers.action),

    /** שער היציאה */
    exit: { x: px(196), y: surfaceY(196, 96), w: 56, h: 96 },

    /**
     * סופת חול — המכניקה הייחודית של השלב.
     * כל `interval` שניות מגיע גל שנמשך `duration` ודוחף שמאלה.
     */
    sandstorm: {
      interval: 26,
      duration: 6,
      warning: 2.5,
      force: 240,      // פיקסלים לשנייה בריבוע — מורגש, אבל אפשר להתקדם נגדו
      hurtAfter: 2.4,  // שניות חשיפה עד איבוד לב; כפיפה או מזבח קרוב מגינים
    },

    maxSparks: 3,
  };
}
