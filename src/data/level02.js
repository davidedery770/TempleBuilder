/**
 * מבט־על לימודי: צפון למעלה, מזרח מימין. קואורדינטות באמות בחצר 100×50.
 * מיקום האוהל המדויק וחלוקת 30×10 הם המחשה על פי התיאור המקובל.
 * סמלי הכלים מוגדלים לקריאות; אין כאן קביעה של מרחקיהם המדויקים.
 */
export const PLAN = { x: 40, y: 157, scale: 5.6, w: 100, h: 50 };
export const TENT = { x: 20, y: 20, w: 30, h: 10 };
export const BUILD_PHASES = [
  'יסודות המשכן', 'קרשים ובריחים', 'יריעות וכיסויים',
  'הארון והפרוכת', 'כלי הקודש', 'פתח האוהל והחצר',
];
const part = (id, phase, name, shape, target, materials, source, quote, hint) =>
  ({ id, phase, name, shape, target, materials, source, quote, hint });

export const BUILD_PARTS = [
  part('bases', 0, '96 אדני כסף לקרשים', 'bases', [35, 25], ['silver'],
    'שמות כ״ו, י״ט–כ״ה', 'שני אדנים תחת הקרש האחד',
    'הניחו את היסודות בשטח האוהל: שני אדנים לכל אחד מ־48 הקרשים.'),
  part('south', 1, '20 קרשי הדרום', 'wallS', [35, 30], ['shittim', 'gold'],
    'שמות כ״ו, ט״ו–י״ט, כ״ט', 'עשרים קרש לפאת נגבה תימנה',
    'דרום הוא למטה. הקרשים מעצי שיטים מצופים זהב; גובה קרש 10 אמות.'),
  part('north', 1, '20 קרשי הצפון', 'wallN', [35, 20], ['shittim', 'gold'],
    'שמות כ״ו, כ׳–כ״א, כ״ט', 'ולצלע המשכן השנית לפאת צפון עשרים קרש',
    'צפון הוא למעלה. רוחב כל קרש אמה וחצי; יחד 30 אמה לאורך הצלע.'),
  part('west', 1, '6 קרשים ושני קרשי פינות', 'wallW', [20, 25], ['shittim', 'gold'],
    'שמות כ״ו, כ״ב–כ״ה', 'ושני קרשים תעשה למקצעת המשכן',
    'מערב משמאל: שישה קרשים ועוד שני קרשי פינות. חיבור הפינות סכמטי.'),
  part('bars', 1, 'בריחי עצי שיטים', 'bars', [35, 25], ['shittim', 'gold'],
    'שמות כ״ו, כ״ו–כ״ט', 'והבריח התיכן בתוך הקרשים מברח מן הקצה אל הקצה',
    'חמישה בריחים לכל צלע. תחילה הניחו את כל שלוש קבוצות הקרשים.'),
  part('linen', 2, '10 יריעות המשכן', 'linen', [35, 25], ['shesh', 'techelet', 'argaman', 'tolaat', 'gold'],
    'שמות כ״ו, א׳–ו׳', 'ואת המשכן תעשה עשר יריעת',
    'יריעות שש וצבעים, כל אחת 28×4 אמות; מחוברות בקרסי זהב. הגג שקוף כאן.'),
  part('goat', 2, '11 יריעות עזים', 'goat', [35, 25], ['goat', 'bronze'],
    'שמות כ״ו, ז׳–י״ג', 'עשתי עשרה יריעת תעשה אתם',
    'מעל יריעות המשכן: יריעות עזים, כל אחת 30×4 אמות, עם קרסי נחושת.'),
  part('rams', 2, 'מכסה עורות אילים', 'rams', [35, 25], ['rams'],
    'שמות כ״ו, י״ד', 'ועשית מכסה לאהל ערת אילם מאדמים',
    'מעל יריעות העזים מניחים את מכסה עורות האילים המאדמים.'),
  part('tachash', 2, 'מכסה עורות תחשים', 'tachash', [35, 25], ['tachash'],
    'שמות כ״ו, י״ד', 'ומכסה ערת תחשים מלמעלה',
    'המכסה העליון. הצבע סמלי בלבד: זיהוי התחש ומראהו אינם ודאיים.'),
  part('ark', 3, 'ארון העדות', 'ark', [25, 25], ['shittim', 'gold'],
    'שמות מ׳, כ׳–כ״א', 'ויבא את הארן אל המשכן',
    'הארון בחלק המערבי, בקודש הקודשים, מבית לפרוכת.'),
  part('veil', 3, 'פרוכת וארבעת עמודיה', 'veil', [30, 25], ['shittim', 'gold', 'silver', 'shesh', 'techelet', 'argaman', 'tolaat'],
    'שמות כ״ו, ל״א–ל״ג · מ׳, כ״א', 'והבדילה הפרכת לכם בין הקדש ובין קדש הקדשים',
    'אחרי הכנסת הארון: 4 עמודים ו־4 אדני כסף. יחד עם 96 האדנים: 100.'),
  part('table', 4, 'שולחן לחם הפנים', 'table', [39, 22], ['shittim', 'gold'],
    'שמות מ׳, כ״ב–כ״ג', 'על ירך המשכן צפנה מחוץ לפרכת',
    'השולחן בצד הצפוני של הקודש, מחוץ לפרוכת — בחלק העליון של האוהל.'),
  part('menorah', 4, 'מנורת הזהב', 'menorah', [39, 28], ['gold', 'oil'],
    'שמות מ׳, כ״ד–כ״ה', 'נכח השלחן על ירך המשכן נגבה',
    'המנורה בדרום, מול השולחן. בחרו את החלק התחתון של הקודש.'),
  part('incense', 4, 'מזבח הזהב לקטורת', 'incense', [33, 25], ['shittim', 'gold', 'spices'],
    'שמות מ׳, כ״ו–כ״ז', 'וישם את מזבח הזהב באהל מועד לפני הפרכת',
    'בתוך הקודש, ממזרח לפרוכת. לא מזבח הנחושת שבחצר.'),
  part('entrance', 5, 'מסך פתח האוהל', 'entrance', [50, 25], ['shittim', 'gold', 'bronze', 'shesh', 'techelet', 'argaman', 'tolaat'],
    'שמות כ״ו, ל״ו–ל״ז · מ׳, כ״ח', 'ויצקת להם חמשה אדני נחשת',
    'בפתח המזרחי של האוהל: חמישה עמודים וחמישה אדני נחושת, לא כסף.'),
  part('altar', 5, 'מזבח העולה', 'altar', [69, 25], ['shittim', 'bronze'],
    'שמות כ״ז, א׳–ב׳ · מ׳, כ״ט', 'חמש אמות ארך וחמש אמות רחב',
    'מזבח הנחושת בחצר לפני פתח האוהל: 5×5 אמות, וגובהו 3 אמות.'),
  part('laver', 5, 'כיור הנחושת וכנו', 'laver', [58, 27], ['bronze'],
    'שמות מ׳, ל׳ · ל״ח, ח׳', 'בין אהל מועד ובין המזבח',
    'הכיור בין האוהל למזבח. ההסטה הצדה היא המחשה; הפסוק אינו נותן מרחק.'),
  part('court', 5, 'קלעי החצר', 'court', [50, 0], ['shesh', 'bronze', 'silver'],
    'שמות כ״ז, ט׳–י״ט · מ׳, ל״ג', 'ארך החצר מאה באמה ורחב חמשים בחמשים',
    'הקלעים מקיפים חצר של 100×50 אמות בגובה 5 אמות. גררו לקו החיצוני העליון.'),
  part('gate', 5, 'מסך שער החצר', 'gate', [100, 25], ['shesh', 'techelet', 'argaman', 'tolaat', 'bronze', 'silver'],
    'שמות כ״ז, י״ג–ט״ז · מ׳, ל״ג', 'ולשער החצר מסך עשרים אמה',
    'השער במזרח — בקצה הימני של החצר. רוחב המסך 20 אמה.'),
];

export function availableParts(placed) {
  const remaining = BUILD_PARTS.filter(p => !placed.has(p.id));
  if (!remaining.length) return [];
  return remaining.filter(p => p.phase === remaining[0].phase);
}

export function canPlace(part, placed) {
  if (!availableParts(placed).some(p => p.id === part.id)) return false;
  const needs = {
    bars: ['south', 'north', 'west'], goat: ['linen'], rams: ['goat'],
    tachash: ['rams'], veil: ['ark'], laver: ['altar'], gate: ['court'],
  };
  return (needs[part.id] || []).every(id => placed.has(id));
}

export function targetPoint(part) {
  return { x: PLAN.x + part.target[0] * PLAN.scale, y: PLAN.y + part.target[1] * PLAN.scale };
}

/** Whole walls/roof footprints accept drops; vessels use smaller, distinct snap zones. */
export function acceptsDrop(part, x, y, slack = 0) {
  // `slack` (screen pixels) forgives a fingertip that hides the target on touch screens.
  const u = (x - PLAN.x) / PLAN.scale, v = (y - PLAN.y) / PLAN.scale;
  const near = (a, b) => Math.abs(a - b) <= 2 + slack / PLAN.scale;
  if (['bases', 'bars', 'linen', 'goat', 'rams', 'tachash'].includes(part.id)) {
    return u >= 20 && u <= 50 && v >= 20 && v <= 30;
  }
  if (part.id === 'north' || part.id === 'south') {
    return u >= 20 && u <= 50 && near(v, part.target[1]);
  }
  if (['west', 'veil', 'entrance'].includes(part.id)) {
    return near(u, part.target[0]) && v >= 20 && v <= 30;
  }
  if (part.id === 'gate') return near(u, 100) && v >= 15 && v <= 35;
  if (part.id === 'court') {
    return (u >= 0 && u <= 100 && (near(v, 0) || near(v, 50)))
      || (v >= 0 && v <= 50 && near(u, 0))
      || ((v >= 0 && v <= 15 || v >= 35 && v <= 50) && near(u, 100));
  }
  const target = targetPoint(part);
  const d = Math.hypot(x - target.x, y - target.y);
  if (d > 14 + slack) return false;
  // A wider zone never lets a vessel land on a neighbour's spot (table and menorah stand 34px apart).
  return !BUILD_PARTS.some(other => other !== part && VESSEL_SPOT(other)
    && Math.hypot(x - targetPoint(other).x, y - targetPoint(other).y) < d);
}
const VESSEL_SPOT = p => !['bases', 'bars', 'linen', 'goat', 'rams', 'tachash', 'north', 'south',
  'west', 'veil', 'entrance', 'gate', 'court'].includes(p.id);
