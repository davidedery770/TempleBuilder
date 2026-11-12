/**
 * Gilgal: a new route from the memorial camp through harvest fields.
 * Game fiction inspired by Joshua 4–6; not a claim of an extra biblical building account.
 * The barley bundles represent a game objective, not the physical quantity of an omer.
 */
import { TILE } from '../game/tilemap.js';

const COLS = 174, ROWS = 20;
const TERRAIN = [
  [0, 27, 15], [28, 35, 14], [36, 52, 15],
  [56, 69, 15], [70, 79, 13], [80, 96, 15],
  [100, 111, 14], [112, 125, 16], [126, 139, 14], [140, 173, 15],
];
const PLATFORMS = [
  [30, 11, 3], [48, 12, 4], [53, 13, 3], [65, 12, 3],
  [76, 10, 3], [90, 12, 4], [97, 12, 3],
  [117, 13, 3], [123, 14, 3], [132, 11, 4], [148, 12, 4],
];
const FIELDS = [
  [15, 24],    // Safe practice patch: no enemy or pit.
  [38, 48],    // A single watchman, with open space before and after.
  [59, 68], [82, 94], [103, 110], [113, 123], [128, 138],
];
const GRAIN_COLS = [11, 22, 32, 43, 61, 73, 86, 104, 119, 132, 144, 151];
const surface = col => TERRAIN.find(([a, b]) => col >= a && col <= b)?.[2] ?? 15;
const pos = (col, height = 0) => ({ x: col * TILE, y: surface(col) * TILE - height });

export function buildLevel04() {
  const back = Array.from({ length: ROWS }, () => Array(COLS).fill('.'));
  const action = Array.from({ length: ROWS }, () => Array(COLS).fill('.'));
  const front = Array.from({ length: ROWS }, () => Array(COLS).fill('.'));
  for (const [a, b, r] of TERRAIN) {
    for (let c = a; c <= b; c++) {
      for (let y = r; y < ROWS; y++) action[y][c] = '#';
      if (c % 5 === 0) front[r - 1][c] = 'g';
    }
  }
  for (const [c, r, len] of PLATFORMS) {
    for (let i = 0; i < len; i++) action[r][c + i] = '=';
  }
  for (const c of [3, 6, 9, 25, 27, 143, 147, 154]) back[surface(c) - 1][c] = 't';
  const human = (id, name, col, extra = {}) => ({
    id, name, ...pos(col, 56), w: 30, h: 56,
    robe: '#ede5ca', sash: '#738e66', ...extra,
  });
  return {
    id: 4, cols: COLS, rows: ROWS,
    back: back.map(r => r.join('')), action: action.map(r => r.join('')),
    front: front.map(r => r.join('')),
    spawn: { ...pos(2, 46) },
    gilgal: true, hideMaterials: true, startShofar: true,
    harvest: { required: GRAIN_COLS.length },
    npcs: [
      human('elazar_intro', 'אֶלְעָזָר הַכֹּהֵן', 5, {
        role: 'priest', cardId: 'gilgal',
        lines: [
          'הגענו לגלגל. האבנים מן הירדן עומדות כאן לזיכרון; כאן חגגו ישראל את הפסח ואכלו מתבואת הארץ.',
          'במסע שלנו נאסוף 12 אגודות שעורים לקראת העומר. זהו אתגר משחקי — לא מספר האגודות הכתוב בתנ״ך.',
          'בשדה הראשון תרגלו X: קול השופר מכופף את הדגן לכמה שניות. אחר כך משלבים שופר וקפיצה. Z מרגיע את השומרים בלי לפגוע בהם.',
        ],
      }),
      human('elazar_end', 'אֶלְעָזָר הַכֹּהֵן', 155, {
        role: 'priest', cardId: 'omer',
        lines: [
          'העומר הוא ראשית הקציר. לפי מסורת חז״ל הוא בא מן השעורים; שדות החיטה שברקע אינם חומר העומר.',
          'מעבר לשדות מחכה אתגר תזמון בהשראת השופרות ביריחו. אין בו פגיעה באדם; טעות אינה מבטלת הצלחות קודמות.',
        ],
      }),
    ],
    stations: [
      human('elazar_quiz', 'אֶלְעָזָר — אֶתְגַּר הַיֶּדַע', 34, {
        role: 'priest', kind: 'trivia', cardId: 'gilgal_passover',
        bonusId: 'knowledge_cove', repeatUntilPerfect: true,
        params: { count: 3, title: 'מֵהַמִּדְבָּר אֶל הָאָרֶץ', speaker: 'אֶלְעָזָר הַכֹּהֵן' },
      }),
      human('harvest_elder', 'זְקַן הַקּוֹצְרִים', 108, {
        role: 'scribe', kind: 'trivia', cardId: 'manna_ceased',
        robe: '#b5b37e',
        params: { count: 2, title: 'רֵאשִׁית הַקָּצִיר', speaker: 'זְקַן הַקּוֹצְרִים' },
      }),
      human('gilgal_memory', 'מדריך כלי המשכן', 66, {
        kind: 'memory', cardId: 'mishkan', robe: '#a5cbd4',
        params: { speaker: 'מדריך הסדנה' },
      }),
      human('gilgal_maze', 'מדריך הקציר', 145, {
        kind: 'planningMaze', cardId: 'omer', robe: '#c0b789',
        params: { speaker: 'מדריך הסדנה' },
      }),
    ],
    checkpoints: [26, 80, 126, 156].map(c => ({ ...pos(c, 34), w: 34, h: 34 })),
    enemies: [
      [44, 39, 48], [63, 59, 68], [87, 82, 94], [106, 102, 110],
      [121, 114, 124], [134, 128, 138],
    ].map(([c, a, b]) => ({
      type: 'fieldGuard', ...pos(c, 44), patrolLeft: a * TILE, patrolRight: (b + 1) * TILE,
    })),
    pickups: [
      ...GRAIN_COLS.map(c => ({ type: 'grain', ...pos(c, 27), x: c * TILE + 6 })),
      ...[51, 94, 124, 152].map(c => ({ type: 'health', ...pos(c, 26) })),
      { type: 'spark', x: 31 * TILE + 8, y: 10 * TILE - 25 },
      { type: 'spark', x: 77 * TILE + 8, y: 9 * TILE - 25 },
      { type: 'spark', x: 134 * TILE + 8, y: 10 * TILE - 25 },
    ],
    fields: FIELDS.map(([a, b], i) => ({
      id: `field_${i + 1}`, x: a * TILE, y: surface(a) * TILE - 94,
      w: (b - a + 1) * TILE, h: 94, duration: Math.max(5.5, (b - a + 1) * TILE / 180 + 2),
    })),
    bonusRooms: [{
      id: 'knowledge_cove', ...pos(49, 82), w: 90, h: 60,
      reward: { lives: 1, score: 1000 },
    }],
    challenge: {
      id: 'jericho_rhythm', kind: 'shofarTiming',
      ...pos(164, 100), w: 54, h: 100,
      params: { title: 'קוֹל הַשּׁוֹפָר', rounds: 7 },
    },
    exit: { ...pos(170, 96), w: 56, h: 96 },
    maxSparks: 3,
  };
}
