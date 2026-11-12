import { TILE } from '../game/tilemap.js';

/**
 * שלב 6 — אור המשכן בשילה. לילה.
 *
 * רק אור המטה ופנסים דולקים מאירים. כדי שמן מדליקים פנס, והאור שלו מגלה
 * קרשים נסתרים (מדרגות וגשרים). שלוש פעמים נשמע קול "שמואל!", ורצים אל עלי
 * — בהשראת שמואל א׳ ג׳. שער החצר נפתח למי שזוכר מה לימד עלי את שמואל לענות,
 * ובסוף מדליקים את שבעת נרות המנורה. אין תהומות: מי שנופל נוחת על קרקע נמוכה
 * ויש לו מדרגות חזרה.
 */
const COLS = 284, ROWS = 20;
const TERRAIN = [
  [0, 29, 15],
  [30, 78, 11],      // רמה גבוהה — מטפסים אליה במדרגות שהפנס הראשון מגלה
  [79, 90, 15],      // ערוץ: הגשר של הפנס השני חוצה אותו
  [91, 122, 11],
  [123, 150, 13],
  [151, 198, 9],     // רמה גבוהה — מטפסים במדרגות של הפנס השלישי
  [199, 210, 14],    // ערוץ: הגשר של הפנס הרביעי
  [211, 283, 9],
];
const surface = c => TERRAIN.find(([a, b]) => c >= a && c <= b)?.[2] ?? 15;
const pos = (c, h = 0) => ({ x: c * TILE, y: surface(c) * TILE - h });

/** פנסים: הקרשים ב־reveal מתגלים רק כשהפנס נדלק. */
const LAMPS = [
  { id: 'lamp1', col: 21, reveal: [{ col: 24, row: 13, w: 4 }] },
  { id: 'lamp2', col: 74, reveal: [{ col: 79, row: 11, w: 12 }] },
  { id: 'lamp3', col: 143, reveal: [{ col: 146, row: 11, w: 4 }, { col: 141, row: 9, w: 3 }] },
  { id: 'lamp4', col: 194, reveal: [{ col: 199, row: 9, w: 12 }] },
  { id: 'lamp5', col: 254, reveal: [] },
];
/** מדרגות קבועות שמוציאות מהערוצים — נפילה עולה רק זמן. */
const ESCAPE = [{ col: 79, row: 13, w: 2 }, { col: 199, row: 12, w: 2 }];
/** קיר החצר: נפתח בתשובה נכונה אצל עלי. */
const GATE = { col: 244, row: 4, w: 2, h: 5 };

export function buildLevel06() {
  const action = Array.from({ length: ROWS }, () => Array(COLS).fill('.'));
  const back = action.map(r => [...r]), front = action.map(r => [...r]);
  for (const [a, b, row] of TERRAIN) for (let c = a; c <= b; c++) {
    for (let y = row; y < ROWS; y++) action[y][c] = '#';
    if (c % 6 === 0) front[row - 1][c] = 'g';
  }
  for (const e of ESCAPE) for (let c = e.col; c < e.col + e.w; c++) action[e.row][c] = '=';
  for (let r = GATE.row; r < GATE.row + GATE.h; r++)
    for (let c = GATE.col; c < GATE.col + GATE.w; c++) action[r][c] = 'B';

  const human = (id, name, col, extra = {}) => ({
    id, name, ...pos(col, 56), w: 30, h: 56, robe: '#e2d8b9', sash: '#6b9bb0', ...extra,
  });
  const eli = (id, col, lines, extra = {}) =>
    human(id, 'עֵלִי הַכֹּהֵן', col, { role: 'priest', robe: '#efe6cf', sash: '#9d7a3d', lines, ...extra });
  const bat = (c, a, b, lift = 82) => ({
    type: 'bat', x: c * TILE, y: surface(c) * TILE - lift, patrolLeft: a * TILE, patrolRight: (b + 1) * TILE,
  });

  return {
    id: 6, cols: COLS, rows: ROWS,
    back: back.map(r => r.join('')), action: action.map(r => r.join('')), front: front.map(r => r.join('')),
    spawn: pos(2, 46), hideMaterials: true, night: true, maxSparks: 3,
    lamps: LAMPS.map(l => ({ ...l, ...pos(l.col), x: l.col * TILE + TILE / 2 })),
    gate: { ...GATE, x: GATE.col * TILE, y: GATE.row * TILE, w: GATE.w * TILE, h: GATE.h * TILE },
    calls: [
      { x: 93 * TILE, eli: 'eli_call1', seconds: 25 },
      { x: 153 * TILE, eli: 'eli_call2', seconds: 25 },
      { x: 213 * TILE, eli: 'eli_call3', seconds: 22 },
    ],
    npcs: [
      eli('eli_intro', 6, [
        'הערב יורד על שילה. במשכן דולק נר אלוקים, ועד הבוקר הוא לא יכבה.',
        'אספו כדי שמן והדליקו את הפנסים בדרך — האור שלהם יגלה לכם מדרגות וגשרים.',
      ], { cardId: 'eli_shiloh' }),
      human('samuel', 'שְׁמוּאֵל הַנַּעַר', 58, { beard: false, robe: '#87afc8', sash: '#345e83', lines: [
        'אני שמואל. אמי חנה הביאה אותי לשילה, ואני משרת את ה׳ עם עלי הכהן.',
        'אם תשמעו בלילה קול קורא — רוצו אל עלי! הוא מחכה בהמשך הדרך.',
      ] }),
      eli('eli_call1', 116, [
        'שמואל רץ אל עלי: ״הנני, כי קראת לי!״',
        'עלי ענה: ״לא קראתי, שוב שכב.״',
      ]),
      eli('eli_call2', 176, [
        'שוב קרא הקול, ושוב רץ שמואל אל עלי.',
        '״לא קראתי בני, שוב שכב.״ שמואל עוד לא הכיר את קול ה׳.',
      ]),
      eli('eli_call3', 232, [
        'בפעם השלישית הבין עלי: ה׳ קורא לנער!',
        'עלי לימד את שמואל לענות: ״דבר ה׳ כי שומע עבדך.״ להקשיב — כך מתקרבים.',
      ], { cardId: 'samuel_listening' }),
    ],
    stations: [
      human('shiloh_tools_memory', 'כלי המשכן', 128, {
        kind: 'memory', cardId: 'sanctuary_tools', params: { speaker: 'מדריך הסדנה' },
      }),
      human('shiloh_tools_maze', 'מבוך כלי המשכן', 186, {
        kind: 'planningMaze', cardId: 'sanctuary_tools', params: { speaker: 'מדריך הסדנה' },
      }),
      eli('court_gate', 239, null, {
        name: 'שַׁעַר הַחָצֵר', kind: 'trivia', required: true, opensGate: true, cardId: 'ner_elokim',
        params: { title: 'מָה זוֹכְרִים?', speaker: 'עֵלִי הַכֹּהֵן', count: 2 },
      }),
    ],
    checkpoints: [],
    enemies: [
      bat(99, 95, 108), bat(107, 101, 115, 100),
      bat(160, 155, 170), bat(176, 170, 186, 96), bat(188, 181, 192),
      bat(222, 216, 230), bat(228, 220, 236, 100),
    ],
    pickups: [
      ...[12, 60, 100, 134, 162, 222, 248].map(c => ({ type: 'oil', ...pos(c, 30) })),
      ...[40, 118, 182, 241].map(c => ({ type: 'health', ...pos(c, 26) })),
      { type: 'spark', x: 142 * TILE + 8, y: 7 * TILE },
      { type: 'spark', x: 85 * TILE + 8, y: 8 * TILE + 8 },
      { type: 'spark', x: 205 * TILE + 8, y: 6 * TILE + 8 },
    ],
    challenge: { id: 'menorah_lighting', kind: 'menorahLighting', ...pos(266, 100), w: 64, h: 100,
      params: { speaker: 'עֵלִי הַכֹּהֵן' } },
    exit: { ...pos(279, 96), w: 56, h: 96 },
  };
}
