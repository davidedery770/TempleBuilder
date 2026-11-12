import { TILE } from '../game/tilemap.js';

/**
 * שלב 10 — חנוכת הבית (קודש הקודשים). בהיר ושמח.
 *
 * א. בוקר בירושלים: חירם האומן, "מלא חכמה ותבונה לעשות כל מלאכה בנחושת"
 *    (מלכים א׳ ז׳, י״ג–י״ד). אוספים רימוני זהב כמו אלה שעל כותרות העמודים.
 * ב. בית היציקה: שלוש חידות אור — מסובבים מראות נחושת (Enter / Z) כדי לכוון
 *    קרן שמש אל קערת המטרה, ודלת הנחושת נפתחת. בין החדרים: בור טיט שעוברים
 *    בו על "מכונות" — עגלות נחושת על אופנים (ז׳, כ״ז–ל״ז).
 * ג. חצר בית ה׳: יכין ובועז, ים הנחושת וקהל חוגג. אתגר הפרק: "קול אחד" עם
 *    הלויים (דברי הימים ב׳ ה׳, י״ג), ואז הענן ממלא את הבית.
 * השחקן נשאר בחצר. אין כניסה להיכל או לקודש הקודשים.
 */
const COLS = 270, ROWS = 20;
const TERRAIN = [
  [0, 25, 14], [26, 45, 13], [46, 60, 14],          // העיר
  [61, 111, 15],                                    // בית היציקה: חדרים 1–2
  [129, 170, 15],                                   // בית היציקה: חדר 3
  [171, 269, 13],                                   // חצר בית ה׳
];
const PIT = { from: 112, to: 128, floor: 19 };
const surface = c => TERRAIN.find(([a, b]) => c >= a && c <= b)?.[2] ?? PIT.floor;
const pos = (c, h = 0) => ({ x: c * TILE, y: surface(c) * TILE - h });

/**
 * חידות האור. כל מראה מתחילה במצב הלא נכון; `o` מתחלף בין '/' ל־'\\'.
 *   '/'  : ימינה→למעלה, למעלה→ימינה, שמאלה→למטה, למטה→שמאלה
 *   '\\' : ימינה→למטה, למטה→ימינה, שמאלה→למעלה, למעלה→שמאלה
 */
const PUZZLES = [
  { id: 'p1', source: { col: 63, row: 10, dir: 'right' },
    mirrors: [{ col: 72, row: 10, o: '/' }],
    target: { col: 72, row: 13 }, door: { col: 80, row: 9, w: 2, h: 6 } },
  // light falls from a skylight; the two mirrors stand apart on one row so each can be turned on its own
  { id: 'p2', source: { col: 85, row: 5, dir: 'down' },
    mirrors: [{ col: 85, row: 12, o: '/' }, { col: 97, row: 12, o: '\\' }],
    target: { col: 97, row: 8 }, door: { col: 106, row: 9, w: 2, h: 6 } },
  { id: 'p3', source: { col: 131, row: 12, dir: 'right' },
    mirrors: [{ col: 138, row: 12, o: '\\' }, { col: 138, row: 7, o: '\\' }, { col: 150, row: 7, o: '/' }],
    target: { col: 150, row: 13 }, door: { col: 160, row: 9, w: 2, h: 6 } },
];
/** במות להגיע למראות הגבוהות בחדר 3, וגזוזטראות בעיר */
const LEDGES = [[142, 12, 5], [136, 9, 5], [148, 9, 5], [14, 11, 3], [34, 10, 3], [37, 7, 3]];

export function buildLevel10() {
  const action = Array.from({ length: ROWS }, () => Array(COLS).fill('.'));
  const back = action.map(r => [...r]), front = action.map(r => [...r]);
  for (const [a, b, row] of TERRAIN) for (let c = a; c <= b; c++) {
    for (let y = row; y < ROWS; y++) action[y][c] = '#';
    if (c % 7 === 0 && (c < 61 || c > 170)) front[row - 1][c] = 'g';
  }
  for (let c = PIT.from; c <= PIT.to; c++) action[PIT.floor][c] = '#';
  for (const p of PUZZLES) for (let r = p.door.row; r < p.door.row + p.door.h; r++)
    for (let c = p.door.col; c < p.door.col + p.door.w; c++) action[r][c] = 'B';
  for (const [c, r, w] of LEDGES) for (let x = c; x < c + w; x++) action[r][x] = '=';

  const human = (id, name, col, extra = {}) => ({
    id, name, ...pos(col, 56), w: 30, h: 56, robe: '#e8dcc0', sash: '#a0622e', ...extra,
  });
  const cart = (col, dxTiles, period, phase = 0) =>
    ({ x: col * TILE, y: 15 * TILE - 2, w: 3 * TILE, h: 14, cart: true, path: { dx: dxTiles * TILE, dy: 0 }, period, phase });

  return {
    id: 10, cols: COLS, rows: ROWS,
    back: back.map(r => r.join('')), action: action.map(r => r.join('')), front: front.map(r => r.join('')),
    spawn: pos(2, 46), hideMaterials: true, temple: true, challengeFree: true, maxSparks: 3,
    puzzles: PUZZLES,
    sea: { x0: PIT.from * TILE, x1: (PIT.to + 1) * TILE, y: 16 * TILE + 6, style: 'clay' },
    movers: [cart(112, 6, 5), cart(120, 6, 5, 0.5)],
    decor: { pillars: 203 * TILE, bronzeSea: 186 * TILE, crowd: [176 * TILE, 262 * TILE], ground: 13 * TILE },
    npcs: [
      human('hiram_craftsman', 'חִירָם הָאֻמָּן', 6, { beardColor: '#6a4a2a', cardId: 'hiram_craftsman', lines: [
        'שלום! אני חירם, אומן נחושת מצור. שלמה הזמין אותי לעשות את כלי הנחושת לבית ה׳.',
        'בבית היציקה שלי מראות נחושת מלוטשות. סובבו אותן (Enter או Z) וכוונו את קרן השמש אל הקערה!',
      ] }),
      human('foundry_helper', 'עוֹזֵר בְּבֵית הַיְּצִיקָה', 109, { beard: false, lines: [
        'בבור הזה יוצקים נחושת בטיט. עלו על המכונות — עגלות הנחושת על האופנים — והן יעבירו אתכם.',
      ] }),
      human('shlomo10', 'שְׁלֹמֹה הַמֶּלֶךְ', 226, { role: 'royal', beard: false, robe: '#e9cd87', sash: '#8e527e',
        cardId: 'shlomo_prayer', lines: [
          'היום חונכים את בית ה׳! ביקשתי בתפילה: גם נכרי שיבוא מארץ רחוקה ויתפלל כאן — שה׳ ישמע.',
          'עכשיו הלויים מנגנים. בואו להצטרף אליהם בקול אחד!',
        ] }),
      human('yirmiyahu', 'יִרְמְיָהוּ הַנָּבִיא', 256, { robe: '#cbbf9e', sash: '#7a6a4a', cardId: 'first_temple', lines: [
        'אני ירמיהו, נביא מדור מאוחר הרבה יותר — הגעתי לרגע מהמסע שלנו בזמן.',
        'הבית הזה יעמוד מאות שנים. בימיי הוא ייחרב, והעם יגלה לבבל.',
        'אבל אני מבטיח בשם ה׳: ״וְשָׁבוּ בָנִים לִגְבוּלָם״. יש תקווה — ובשלבים הבאים נראה איך חזרו!',
      ] }),
    ],
    stations: [
      human('temple_trivia', 'שְׁאֵלוֹת הַחֲנֻכָּה', 196, { kind: 'trivia', cardId: 'yachin_boaz',
        params: { count: 3, title: 'חֲנֻכַּת הַבַּיִת', speaker: 'חִירָם הָאֻמָּן' } }),
    ],
    checkpoints: [20, 52, 64, 86, 110, 131, 174, 218].map(c => ({ ...pos(c, 34), w: 34, h: 34 })),
    enemies: [],
    pickups: [
      ...[[12, 50], [15, 11 * TILE], [38, 7 * TILE], [50, 50], [70, 50], [95, 50], [124, 13 * TILE], [145, 12 * TILE],
        [154, 50], [180, 50], [210, 50], [245, 50]].map(([c, v]) =>
        ({ type: 'rimon', x: c * TILE + 6, y: v > 100 ? v - 34 : surface(c) * TILE - v })),
      ...[30, 77, 135, 190, 240].map(c => ({ type: 'health', ...pos(c, 26) })),
      { type: 'spark', x: 38 * TILE + 8, y: 4 * TILE },
      { type: 'spark', x: 152 * TILE + 8, y: 6 * TILE },
      { type: 'spark', x: 116 * TILE + 8, y: 12 * TILE },
    ],
    challenge: { id: 'levites', kind: 'levites', ...pos(236, 100), w: 64, h: 100, params: { speaker: 'הַלְוִיִּם' } },
    exit: { ...pos(263, 96), w: 56, h: 96 },
  };
}
