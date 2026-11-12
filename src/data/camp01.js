/** A fictional walkable camp, inspired by Exodus 35; not an archaeological map. */
export const CAMP = { minX: -42, maxX: 42, minZ: -32, maxZ: 32, spawn: [0, 26] };
export const CAMP_STATIONS = [
  { id: 'gold_family', name: 'משפחת תורמי הזהב', at: [-25, 17], kind: 'gift',
    materials: ['gold'], color: '#d3a84f', card: 'terumah', source: 'שמות ל״ה, כ״ב',
    text: 'הבאנו תכשיטי זהב מרצוננו למלאכת המשכן. קח את התרומה אל האומנים — כל אחד נותן ממה שיש לו.' },
  { id: 'silver_family', name: 'אוהל תרומת הכסף', at: [-27, 2], kind: 'gift',
    materials: ['silver'], color: '#aebfc9', source: 'שמות ל״ה, כ״ד',
    text: 'זו תרומת הכסף שלנו למלאכה. במשחק אוספים סוגי חומרים, לא את משקל הכסף ההיסטורי של המשכן.' },
  { id: 'bronze_family', name: 'אוהל תרומת הנחושת', at: [-23, -13], kind: 'gift',
    materials: ['bronze'], color: '#b8764c', source: 'שמות ל״ה, כ״ד',
    text: 'גם לנחושת יש תפקיד חשוב. אנחנו מביאים את תרומתנו, ואתה תעביר אותה לסדנת האומנים.' },
  { id: 'weavers', name: 'הנשים חכמות־הלב', at: [-7, -20], kind: 'weaving',
    materials: ['techelet', 'argaman', 'tolaat', 'shesh', 'goat'], color: '#9466ab', card: 'colors',
    source: 'שמות ל״ה, כ״ג–כ״ו',
    text: 'הבאנו מטווה: תכלת, ארגמן, תולעת שני, שש ועזים. הצטרף לאתגר אריגה מודרך שממחיש את סדר הצבעים — לא את כל תהליך הטוויה.' },
  { id: 'skins', name: 'תרומת כיסויי האוהל', at: [12, -19], kind: 'packing',
    materials: ['rams', 'tachash'], color: '#ae6255', source: 'שמות ל״ה, כ״ג',
    text: 'העורות כבר הובאו למחנה כתרומה. נעזור להכין את משלוח הכיסויים; אין כאן ציד או פגיעה בבעלי חיים.',
    items: [
      { name: 'עורות אילים מאדמים', options: ['ארגז כיסויי האוהל', 'כלי שמן למאור', 'תיבת אבני החושן'], answer: 0 },
      { name: 'עורות תחשים', options: ['כלי שמן למאור', 'ארגז כיסויי האוהל', 'תיבת אבני החושן'], answer: 1 },
    ] },
  { id: 'wood', name: 'מחסן עצי השיטים', at: [28, -12], kind: 'timber',
    materials: ['shittim'], color: '#b78b52', source: 'שמות ל״ה, כ״ד, ל״ג',
    text: 'התורמים הביאו עצי שיטים. נשא קורה אל הנגרייה והכן אותה בניסור סמלי. המסלול והניסור הם המחשה משחקית; אין בפסוק תיאור של כריתת יער ליד המחנה.' },
  { id: 'oil_spices', name: 'תרומת השמן והבשמים', at: [21, 18], kind: 'packing',
    materials: ['oil', 'spices'], color: '#799b69', source: 'שמות ל״ה, כ״ח',
    text: 'הנשיאים הביאו גם שמן ובשמים. נכין משלוחים נפרדים: אין זו הדמיה של מתכון שמן המשחה או הקטורת.',
    items: [
      { name: 'שמן למאור', options: ['תיבת האבנים', 'כלי השמן למאור', 'ארגז העורות'], answer: 1 },
      { name: 'בשמים', options: ['סל הבשמים', 'כלי השמן למאור', 'ארגז העורות'], answer: 0 },
    ] },
  { id: 'princes', name: 'אוהל הנשיאים', at: [32, 24], kind: 'gift',
    materials: ['shoham', 'miluim'], color: '#648da1', source: 'שמות ל״ה, כ״ז',
    text: 'הבאנו את אבני השוהם ואת אבני המילואים לאפוד ולחושן. לא כורים אותן בדרך: מקבלים אותן מתרומת הנשיאים.' },
];
export const CAMP_SPECIAL = [
  { id: 'moshe', name: 'משה — מגילת התבנית', at: [0, 22], kind: 'moshe', color: '#d8c58c',
    source: 'שמות כ״ה, ט׳ · ל״ה, ל׳–ל״ה',
    text: 'בצלאל, העם מביא את התרומה מרצונו. עבור בין האוהלים והאומנים, השלם את הכנת החומרים וחזור אל מרכז התרומות. נבנה לפי התבנית.' },
  { id: 'carpenter', name: 'נגריית האומנים', at: [27, 5], kind: 'carpenter', color: '#b78b52',
    source: 'שמות ל״ה, ל״ג', text: 'כאן מעבדים את העצים שהובאו. הבא קורה ממחסן השיטים, ואז נעזור להכין אותה.' },
  { id: 'warehouse', name: 'מרכז התרומות — לסדנת הבנייה', at: [0, 15], kind: 'warehouse', color: '#e6c46d',
    source: 'שמות ל״ו, ג׳–ז׳', text: 'כשהחומרים יהיו מוכנים, נקבל את מגילת התבנית ונצא להקמת המשכן.' },
  { id: 'elder', name: 'זקן המחנה — אתגר ידע', at: [-12, 26], kind: 'trivia', color: '#88a57c',
    source: 'שמות כ״ה · ל״ה', text: 'רוצה לבדוק מה למדת בדרך? זהו אתגר רשות, בלי קנס ובלי חסימה של המסע.' },
];
export const CAMP_TENTS = [
  ...CAMP_STATIONS.filter(s => s.kind !== 'timber').map(s => ({
    id: 'tent_' + s.id, x: s.at[0], z: s.at[1] - 4.5, w: 7, d: 5, h: 4, color: s.color,
  })),
  { id: 'store', x: 0, z: 8.5, w: 9, d: 6, h: 4.5, color: '#bda36a' },
  ...[[-36, -23], [31, -26], [-36, 10], [-6, 29], [36, 7], [4, -7], [-12, 8]].map(([x, z], i) =>
    ({ id: 'home_' + i, x, z, w: 6, d: 4.5, h: 3.5, color: i % 2 ? '#8c7560' : '#756652' })),
];
export const CAMP_OBSTACLES = [
  ...CAMP_TENTS.map(t => ({ ...t, height: t.h })),
  { id: 'woodpile', x: 28, z: -15, w: 6, d: 3, height: 1.2 },
  { id: 'workbench', x: 27, z: 2, w: 4, d: 2, height: 1.1 },
  { id: 'crate_a', x: -4, z: -5, w: 2.2, d: 2.2, height: 0.8 },
  { id: 'crate_b', x: 12, z: 3, w: 2.2, d: 2.2, height: 0.8 },
  { id: 'crate_c', x: -29, z: 26, w: 2.2, d: 2.2, height: 0.8 },
];
export const CAMP_SPARKS = [
  { id: 'craft_spark', x: -4, z: -5, y: 1.6 },
  { id: 'help_spark', x: 12, z: 3, y: 1.6 },
  { id: 'camp_spark', x: -29, z: 26, y: 1.6 },
];
export const ALL_CAMP_STATIONS = [...CAMP_STATIONS, ...CAMP_SPECIAL];
export const getCampStation = id => ALL_CAMP_STATIONS.find(s => s.id === id);
