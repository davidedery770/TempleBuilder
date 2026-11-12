// Activities are symbolic learning boards, never architectural reconstructions.
export const LEARNING_CONCEPTS = [
  { id: 'menorah', label: 'מנורה', icon: 'menorah', role: 'שבעה נרות למאור',
    fact: 'למנורה שבעה נרות. להדלקתם מביאים שמן זית זך.', source: 'שמות כ״ה, ל״ז · כ״ז, כ׳' },
  { id: 'ark', label: 'ארון הברית', icon: 'ark', role: 'בו מונחים לוחות הברית',
    fact: 'בארון מונחים לוחות הברית. הארון אינו כלי לאחסון תרומות.', source: 'שמות כ״ה, ט״ז · דברים י׳, ה׳' },
  { id: 'table', label: 'שולחן', icon: 'table', role: 'עליו לחם הפנים',
    fact: 'על השולחן מניחים את לחם הפנים לפני ה׳ תמיד.', source: 'שמות כ״ה, ל׳' },
  { id: 'laver', label: 'כיור', icon: 'laver', role: 'רחיצת ידי ורגלי הכהנים',
    fact: 'הכהנים רוחצים בכיור את ידיהם ורגליהם לפני העבודה.', source: 'שמות ל׳, י״ח–כ״א' },
  { id: 'oil', label: 'שמן זית זך', icon: 'oil', role: 'להדלקת נרות המנורה',
    fact: 'שמן זית זך כתית מיועד למאור. אור המנורה מזכיר את עבודת המשכן.', source: 'שמות כ״ז, כ׳' },
  { id: 'boards', label: 'קרשי המשכן', icon: 'boards', role: 'קירות מעצי שיטים',
    fact: 'קרשי המשכן עשויים עצי שיטים ומצופים זהב.', source: 'שמות כ״ו, ט״ו וכ״ט' },
  { id: 'altar', label: 'מזבח העולה', icon: 'altar', role: 'מזבח הנחושת שבחצר',
    fact: 'מזבח העולה מצופה נחושת וניצב בחצר, מחוץ לאוהל.', source: 'שמות כ״ז, א׳–ח׳ · מ׳, כ״ט' },
  { id: 'veil', label: 'פרוכת', icon: 'veil', role: 'מבדילה בין הקודש לקודש הקודשים',
    fact: 'הפרוכת מבדילה בין הקודש לקודש הקודשים. לא כל אדם נכנס לכל מקום.', source: 'שמות כ״ו, ל״ג' },
];

export const LEARNING_DIFFICULTY = Object.freeze({
  1: { pairs: 4, relations: false, maze: 0 },
  3: { pairs: 5, relations: false, maze: 1 },
  4: { pairs: 6, relations: true, maze: 2 },
  5: { pairs: 8, relations: true, maze: 3 },
  6: { pairs: 8, relations: true, maze: 4 },
});
export function learningDifficulty(levelId) {
  return LEARNING_DIFFICULTY[levelId] || LEARNING_DIFFICULTY[1];
}
export function memoryConcepts(levelId) {
  return LEARNING_CONCEPTS.slice(0, learningDifficulty(levelId).pairs);
}

// All targets must be visited in the displayed order; the exit alone is not enough.
const BOARDS = {
  1: ['#########', '#.......#', '#.###.#.#', '#...#...#', '###.#.#.#', '#.......#', '#########'],
  2: ['###########', '#...#.....#', '#.#.#.###.#', '#.#...#...#', '#.###.#.#.#', '#.......#.#', '###########'],
  3: ['###########', '#...#.....#', '#.#.#.###.#', '#.#...#...#', '#.#####.#.#', '#.......#.#', '###########'],
  4: ['###########', '#...#.....#', '#.#.#.###.#', '#.#...#...#', '#.###.#.###', '#.....#...#', '#####.###.#', '#.........#', '###########'],
};
export function mazeDefinition(levelId = 3) {
  const rank = learningDifficulty(levelId).maze || 1;
  const source = 'לוח סמלי לתכנון — לא מפת המשכן';
  const common = { rank, grid: [...BOARDS[rank]], start: [1, 1], source };
  if (rank === 1) return { ...common, exit: [7, 5], title: 'דרך הזיכרון',
    targets: [{ at: [3, 3], icon: 'stone', label: 'אבני זיכרון',
      fact: 'האבנים מן הירדן מזכירות את המעבר לדורות הבאים.', source: 'יהושע ד׳, ו׳–ז׳' }] };
  if (rank === 2) return { ...common, exit: [9, 5], title: 'מראשית הקציר',
    targets: [
      { at: [3, 1], icon: 'grain', label: 'שעורים',
        fact: 'העומר בא מן השעורים. מביאים מראשית הקציר אל הכהן.', source: 'ויקרא כ״ג, י׳ · משנה מנחות י׳, ד׳' },
      { at: [7, 3], icon: 'basket', label: 'מביאים אל הכהן',
        fact: 'נתינה מראשית הקציר מבטאת הודיה לה׳. הלוח אינו שחזור של עבודת העומר.', source: 'ויקרא כ״ג, י׳–י״א' },
    ] };
  if (rank === 3) return { ...common, exit: [9, 5], title: 'מהזית אל המנורה',
    targets: [
      { at: [3, 1], icon: 'olive', label: 'זיתים',
        fact: 'מוסקים את הזיתים כדי להכין מהם שמן.', source: 'משנה מנחות ח׳, ג׳–ד׳' },
      { at: [5, 3], icon: 'oil', label: 'שמן זית זך',
        fact: 'כותשים ומסננים. למנורה מביאים שמן זית זך כתית.', source: 'שמות כ״ז, כ׳ · משנה מנחות ח׳, ד׳' },
      { at: [7, 1], icon: 'menorah', label: 'מנורה',
        fact: 'השמן מיועד להדלקת נרות המנורה בידי הכהנים.', source: 'שמות כ״ז, כ׳–כ״א' },
    ] };
  return { ...common, exit: [9, 7], title: 'מכירים את כלי המשכן',
    targets: [
      { at: [3, 1], icon: 'laver', label: 'כיור',
        fact: 'בכיור הכהנים רוחצים ידיים ורגליים לפני העבודה.', source: 'שמות ל׳, י״ט–כ׳' },
      { at: [5, 3], icon: 'table', label: 'שולחן',
        fact: 'השולחן ניצב בצפון, ועליו לחם הפנים.', source: 'שמות כ״ה, ל׳ · מ׳, כ״ב–כ״ג' },
      { at: [9, 1], icon: 'menorah', label: 'מנורה',
        fact: 'המנורה ניצבת בדרום, מול השולחן. כאן מבקרים באיורים, לא עובדים בקודש.', source: 'שמות מ׳, כ״ד–כ״ה' },
      { at: [7, 5], icon: 'veil', label: 'פרוכת',
        fact: 'הפרוכת מבדילה בין הקודש לקודש הקודשים; בלוח אין מעבר לתוכו.', source: 'שמות כ״ו, ל״ג' },
    ] };
}

export const HEART_CHOICES = [
  { label: 'הודיה', text: 'אפשר לעצור לרגע ולחשוב על דבר שרוצים להודות עליו לה׳.' },
  { label: 'בקשה', text: 'אפשר לפנות לה׳ במילים שלנו ולבקש עזרה, גם בשקט.' },
  { label: 'כמיהה', text: '״נכספה וגם כלתה נפשי לחצרות ה׳״ — געגוע לקרבה לה׳ ולביתו. תהילים פ״ד, ג׳.' },
];
