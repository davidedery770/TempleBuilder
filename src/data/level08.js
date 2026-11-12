import { TILE } from '../game/tilemap.js';

/**
 * שלב 8 — הבמה בגבעון. בהיר ושמח.
 *
 * א. בוקר בגבעון: שלמה הצעיר עלה להעלות אלף עולות על מזבח הנחושת (מלכים א׳ ג׳, ד׳).
 * ב. החלום: עולם עננים זהוב — עננים קפיציים, במות זהב נעות ומגילות משלים.
 *    בסוף: "שאל מה אתן לך" — בוחרים מה ביקש שלמה, וקיר הענן נפתח.
 * ג. "ויקץ שלמה": עולים בבמות נעות אל מזבח הנחושת, חידות שלמה פותחות תיבות אוצר.
 * ד. אתגר הפרק: "אחזו לנו שועלים קטנים" (שיר השירים ב׳, ט״ו) — תופסים חמישה
 *    שועלים בכרם בנגיעה עדינה, והם רצים הביתה.
 * הקול בחלום אינו מצויר כדמות — רק כאור.
 */
const COLS = 300, ROWS = 20;
export const DREAM = { from: 39, to: 128 };
const TERRAIN = [
  [0, 38, 15],
  [39, 128, 18],     // רצפת העננים של החלום
  [129, 150, 15],
  [151, 174, 11],    // טרסה — עולים אליה בבמה נעה
  [175, 232, 7],     // ראש הגבעה: מזבח הנחושת
  [233, 240, 9], [241, 248, 11], [249, 256, 13],
  [257, 299, 15],    // הכרם
];
const surface = c => TERRAIN.find(([a, b]) => c >= a && c <= b)?.[2] ?? 15;
const pos = (c, h = 0) => ({ x: c * TILE, y: surface(c) * TILE - h });

/** קירות ענן בחלום: חוצים אותם בזינוק מענן קפיצי */
const CLOUD_WALLS = [[58, 60, 11], [84, 86, 11], [108, 110, 11]];
/** איי ענן גבוהים, עם מגילות וניצוצות */
const ISLANDS = [[66, 72, 10], [92, 98, 10]];
/** שער הענן בסוף החלום — נפתח כשבוחרים "לב שומע" */
const GATE = { col: 126, row: 11, w: 2, h: 7 };

const mover = (col, row, wTiles, extra = {}) => ({ x: col * TILE, y: row * TILE - 4, w: wTiles * TILE, h: 12, ...extra });

export function buildLevel08() {
  const action = Array.from({ length: ROWS }, () => Array(COLS).fill('.'));
  const back = action.map(r => [...r]), front = action.map(r => [...r]);
  for (const [a, b, row] of TERRAIN) for (let c = a; c <= b; c++) {
    for (let y = row; y < ROWS; y++) action[y][c] = '#';
    if (c % 5 === 0 && (c < DREAM.from || c > DREAM.to)) front[row - 1][c] = 'g';
  }
  for (const [a, b, top] of CLOUD_WALLS) for (let c = a; c <= b; c++) for (let y = top; y < 18; y++) action[y][c] = '#';
  for (const [a, b, row] of ISLANDS) for (let c = a; c <= b; c++) for (let y = row; y < row + 2; y++) action[y][c] = '#';
  for (let r = GATE.row; r < GATE.row + GATE.h; r++) for (let c = GATE.col; c < GATE.col + GATE.w; c++) action[r][c] = '#';

  const human = (id, name, col, extra = {}) => ({
    id, name, ...pos(col, 56), w: 30, h: 56, robe: '#e9cd87', sash: '#8e527e', ...extra,
  });
  const shlomo = (id, col, lines, extra = {}) =>
    human(id, 'שְׁלֹמֹה', col, { role: 'royal', beard: false, lines, ...extra });

  return {
    id: 8, cols: COLS, rows: ROWS,
    back: back.map(r => r.join('')), action: action.map(r => r.join('')), front: front.map(r => r.join('')),
    spawn: pos(2, 46), hideMaterials: true, givon: true, maxSparks: 3,
    dream: { x0: DREAM.from * TILE, x1: (DREAM.to + 1) * TILE },
    gate: { ...GATE, x: GATE.col * TILE, y: GATE.row * TILE, w: GATE.w * TILE, h: GATE.h * TILE },
    movers: [
      // עננים קפיציים על רצפת החלום — קופצים עליהם ו"בּוֹינג!"
      mover(53, 18, 3, { bounce: -1050 }),
      mover(62, 18, 3, { bounce: -1050 }),
      mover(79, 18, 3, { bounce: -1050 }),
      mover(102, 18, 3, { bounce: -1050 }),
      // במת זהב שנעה בין שני איי הענן
      mover(73, 10, 3, { path: { dx: 16 * TILE, dy: 0 }, period: 6 }),
      // במות נעות שמעלות אל ראש הגבעה
      // flush against the terrace: ride up and step straight off at the top
      mover(148, 15, 3, { path: { dx: 0, dy: -4 * TILE }, period: 5 }),
      mover(172, 11, 3, { path: { dx: 0, dy: -4 * TILE }, period: 5, phase: 0.5 }),
    ],
    foxes: [262, 270, 278, 286, 292].map((c, i) => ({
      id: `fox${i + 1}`, x: c * TILE, y: surface(c) * TILE - 22, w: 30, h: 22,
      left: 258 * TILE, right: 298 * TILE,
    })),
    proverbs: [
      { col: 18, h: 70, text: 'יִרְאַת ה׳ רֵאשִׁית דָּעַת', source: 'משלי א׳, ז׳' },
      { col: 68, row: 8, text: 'שְׁמַע בְּנִי מוּסַר אָבִיךָ, וְאַל תִּטֹּשׁ תּוֹרַת אִמֶּךָ', source: 'משלי א׳, ח׳' },
      { col: 81, row: 7, text: 'דְּרָכֶיהָ דַרְכֵי נֹעַם, וְכָל נְתִיבוֹתֶיהָ שָׁלוֹם', source: 'משלי ג׳, י״ז' },
      { col: 95, row: 8, text: 'לֵךְ אֶל נְמָלָה עָצֵל, רְאֵה דְרָכֶיהָ וַחֲכָם', source: 'משלי ו׳, ו׳' },
      { col: 114, h: 60, text: 'בְּטַח אֶל ה׳ בְּכָל לִבֶּךָ', source: 'משלי ג׳, ה׳' },
      { col: 140, h: 70, text: 'מַעֲנֶה רַּךְ יָשִׁיב חֵמָה', source: 'משלי ט״ו, א׳' },
      { col: 165, h: 70, text: 'חֲנֹךְ לַנַּעַר עַל פִּי דַרְכּוֹ', source: 'משלי כ״ב, ו׳' },
      { col: 196, h: 70, text: 'יְהַלֶּלְךָ זָר וְלֹא פִיךָ', source: 'משלי כ״ז, ב׳' },
    ].map(p => ({ type: 'proverb', x: p.col * TILE + 6, y: p.row != null ? p.row * TILE : surface(p.col) * TILE - p.h, text: p.text, source: p.source })),
    npcs: [
      shlomo('shlomo_intro', 6, [
        'אני שלמה, בנו של דוד המלך. עליתי לגבעון, לבמה הגדולה.',
        'כאן עומד מזבח הנחושת שעשה בצלאל, ועליו העליתי אלף עולות.',
        'ובלילה נראה אליי ה׳ בחלום… בואו לראות! קפצו על העננים.',
      ], { cardId: 'givon' }),
      shlomo('shlomo_morning', 133, [
        '״וַיִּקַץ שְׁלֹמֹה וְהִנֵּה חֲלוֹם״. ה׳ נתן לי לב חכם ונבון.',
        'עלו על הבמות הנעות אל ראש הגבעה, אל מזבח הנחושת. בדרך — החידות שלי!',
      ], { cardId: 'shlomo_dream' }),
      shlomo('shlomo_vineyard', 236, [
        '״אֶחֱזוּ לָנוּ שׁוּעָלִים, שׁוּעָלִים קְטַנִּים, מְחַבְּלִים כְּרָמִים״.',
        'חמישה שועלים קטנים מתרוצצים בכרם. תפסו אותם בנגיעה עדינה — והם ירוצו הביתה.',
      ], { cardId: 'little_foxes' }),
    ],
    stations: [
      { id: 'dream_voice', name: 'קוֹל בַּחֲלוֹם', ...pos(121, 70), w: 40, h: 60, orb: true,
        kind: 'dreamChoice', required: true, opensGate: true, cardId: 'shlomo_dream', params: {} },
      shlomo('riddles1', 160, null, { name: 'חִידוֹת שְׁלֹמֹה', kind: 'trivia', cardId: 'mishlei',
        bonusId: 'treasure1', repeatUntilPerfect: true,
        params: { count: 3, title: 'חִידוֹת שְׁלֹמֹה', speaker: 'שְׁלֹמֹה' } }),
      shlomo('riddles2', 188, null, { name: 'עוֹד חִידוֹת', kind: 'trivia',
        bonusId: 'treasure2', repeatUntilPerfect: true,
        params: { count: 3, title: 'מִי אֲנִי?', speaker: 'שְׁלֹמֹה' } }),
    ],
    bonusRooms: [
      { id: 'treasure1', ...pos(166, 60), w: 90, h: 60, reward: { lives: 1, score: 1000 } },
      { id: 'treasure2', ...pos(215, 60), w: 90, h: 60, reward: { lives: 1, score: 1000 } },
    ],
    altarAt: 205,
    vineyard: { x0: 257 * TILE, x1: 300 * TILE, y: 15 * TILE },
    checkpoints: [30, 45, 100, 135, 158, 180, 260].map(c => ({ ...pos(c, 34), w: 34, h: 34 })),
    enemies: [],
    pickups: [
      ...[50, 132, 178, 264].map(c => ({ type: 'health', ...pos(c, 26) })),
      { type: 'spark', x: 85 * TILE + 8, y: 8 * TILE },
      { type: 'spark', x: 97 * TILE + 8, y: 7 * TILE },
      { type: 'spark', x: 222 * TILE + 8, y: 4 * TILE },
      { type: 'relic', ...pos(210, 44), relicId: 'altar', cardId: 'givon' },
    ],
    exit: { ...pos(295, 96), w: 56, h: 96 },
  };
}
