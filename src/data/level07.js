import { TILE } from '../game/tilemap.js';

/**
 * שלב 7 — נוב, עיר הכהנים. שקיעה.
 *
 * בהשראת שמואל א׳ כ״א: דוד בורח מפני שאול ומגיע רעב לנוב. אחימלך הכהן
 * נותן לו את לחם הפנים שהוסר מהשולחן. השחקן מסדר את הלחם החם, ומביא את
 * הלחם אל דוד במערה בלי שצופי שאול יראו אותו. מי שנראה חוזר לנקודת ההצלה —
 * בלי לאבד חיים. אפשר להתכופף בתוך שיח או לעבור על הגגות.
 * בסוף אביתר בורח אל דוד עם האפוד. המשחק אינו מציג את מה שקרה לכהני נוב.
 */
const COLS = 240, ROWS = 20;
const TERRAIN = [
  [0, 44, 15],
  [45, 74, 13],      // רחבת המשכן בנוב
  [75, 104, 13],
  [105, 138, 14],
  [139, 176, 12],
  [177, 210, 14],
  [211, 239, 13],    // הגבעות ומערת המסתור
];
const surface = c => TERRAIN.find(([a, b]) => c >= a && c <= b)?.[2] ?? 15;
const pos = (c, h = 0) => ({ x: c * TILE, y: surface(c) * TILE - h });

/** בתים: הגג הוא קרש שאפשר לעמוד עליו, שלוש שורות מעל הרחוב. */
const HOUSES = [
  [28, 6],
  [77, 6], [87, 6], [97, 6],
  [107, 6], [117, 6], [127, 6],
  [143, 6], [153, 6], [163, 6],
  [181, 6], [191, 6], [201, 5],
].map(([col, w]) => ({ col, w, ground: surface(col), roof: surface(col) - 3 }));

/** צופים: מסיירים בין a ל־b; פנים קדימה = 1. */
// הצופה הראשון הוא שיעור: גג אחד, שני שיחים, ומסלול קצר.
const WATCHERS = [[30, 24, 38], [92, 80, 102], [122, 108, 136], [158, 144, 174], [196, 182, 208]];
const BUSHES = [[20, 3], [35, 3], [84, 3], [95, 3], [114, 3], [125, 3], [150, 3], [161, 3], [188, 3], [199, 3]];

export function buildLevel07() {
  const action = Array.from({ length: ROWS }, () => Array(COLS).fill('.'));
  const back = action.map(r => [...r]), front = action.map(r => [...r]);
  for (const [a, b, row] of TERRAIN) for (let c = a; c <= b; c++) {
    for (let y = row; y < ROWS; y++) action[y][c] = '#';
    if (c % 5 === 0) front[row - 1][c] = 'g';
  }
  for (const h of HOUSES) for (let c = h.col; c < h.col + h.w; c++) action[h.roof][c] = '=';

  const human = (id, name, col, extra = {}) => ({
    id, name, ...pos(col, 56), w: 30, h: 56, robe: '#e6dcc4', sash: '#ae7953', ...extra,
  });

  return {
    id: 7, cols: COLS, rows: ROWS,
    back: back.map(r => r.join('')), action: action.map(r => r.join('')), front: front.map(r => r.join('')),
    spawn: pos(2, 46), hideMaterials: true, stealth: true, maxSparks: 3,
    houses: HOUSES,
    bushes: BUSHES.map(([col, w]) => ({ x: col * TILE, w: w * TILE, y: surface(col) * TILE })),
    watchers: WATCHERS.map(([col, a, b], i) => ({
      id: `watcher${i + 1}`, ...pos(col, 56), w: 30, h: 56, left: a * TILE, right: (b + 1) * TILE,
      facing: i % 2 ? -1 : 1, speed: 46, range: 170, spread: 28,
    })),
    cave: pos(222),
    npcs: [
      human('evyatar_intro', 'אֶבְיָתָר', 6, { role: 'priest', beard: false, lines: [
        'שלום! אני אביתר, בנו של אחימלך הכהן. כאן נוב, עיר הכהנים.',
        'צופים של שאול מסתובבים בעיר עם פנסים. אם יראו אתכם — תחזרו למזבח האחרון.',
        'אפשר להתכופף בתוך שיח, לעבור מאחורי הצופה, או לקפוץ על הגגות.',
      ] }),
      human('ahimelech', 'אֲחִימֶלֶךְ הַכֹּהֵן', 61, { role: 'priest', robe: '#efe6cf', sash: '#ae7953', cardId: 'ahimelech', lines: [
        'דוד בורח מפני שאול, והוא רעב. אין כאן לחם רגיל — יש רק לחם קודש.',
        'היום מסירים את לחם הפנים מהשולחן ושמים במקומו לחם חם. עזרו לי לסדר את הלחם החם,',
        'ואת הלחם שהוסר תביאו אל דוד. הוא מסתתר במערה בקצה העיר.',
      ] }),
      // `needs` — הדמות מחכה למשהו; עד אז היא אומרת את waitLines. `then` — מה קורה כשמגיע.
      human('david', 'דָּוִד', 224, { robe: '#a34738', sash: '#caa04b', needs: 'bread', then: 'deliver', cardId: 'nob',
        waitLines: ['אני דוד. אני בורח, ואין לי מה לאכול…', 'אחימלך הכהן בעיר. אולי יש לו לחם?'],
        lines: [
          'לחם! תודה רבה. אחימלך עשה עמי חסד גדול.',
          'הוא נתן לי גם את חרב גלית, שהייתה עטופה בשמלה מאחורי האפוד.',
        ] }),
      human('evyatar_end', 'אֶבְיָתָר', 231, { role: 'priest', beard: false, cardId: 'evyatar',
        needs: 'delivered', then: 'revealRelic',
        waitLines: ['קודם הביאו לחם לדוד — הוא רעב, והוא מסתתר במערה.'],
        lines: [
          'שאול כעס מאוד על כהני נוב. אני נמלט אל דוד, ואקח איתי את האפוד.',
          'אמשיך לשרת ככהן לצד דוד. קחו את האפוד ונצא יחד מהעיר.',
        ] }),
    ],
    stations: [
      human('showbread', 'שֻׁלְחַן לֶחֶם הַפָּנִים', 66, {
        kind: 'showbread', required: true, givesBread: true, cardId: 'lechem_hapanim',
        role: 'priest', robe: '#efe6cf', params: { speaker: 'אֲחִימֶלֶךְ הַכֹּהֵן' },
      }),
      human('nob_trivia', 'שְׁאֵלוֹת שֶׁל אֶבְיָתָר', 215, {
        kind: 'trivia', cardId: 'nob', role: 'priest', beard: false, params: { title: 'מָה לָמַדְנוּ בְּנוֹב?', count: 3 },
      }),
    ],
    checkpoints: [50, 106, 141, 179, 212].map(c => ({ ...pos(c, 34), w: 34, h: 34 })),
    enemies: [],
    pickups: [
      ...[38, 99, 131, 169, 205].map(c => ({ type: 'health', ...pos(c, 26) })),
      { type: 'spark', x: 89 * TILE + 8, y: (surface(89) - 5) * TILE },
      { type: 'spark', x: 119 * TILE + 8, y: (surface(119) - 5) * TILE },
      { type: 'spark', x: 165 * TILE + 8, y: (surface(165) - 5) * TILE },
      { type: 'relic', ...pos(233, 44), relicId: 'vestments', cardId: 'evyatar', hidden: true },
    ],
    exit: { ...pos(236, 96), w: 56, h: 96 },
  };
}
