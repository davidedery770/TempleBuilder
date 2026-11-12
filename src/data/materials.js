/**
 * materials.js — מצרכי המשכן, לפי רשימת התרומה: שמות כ״ה, ג׳–ז׳.
 *
 * "וְזֹאת הַתְּרוּמָה אֲשֶׁר תִּקְחוּ מֵאִתָּם: זָהָב וָכֶסֶף וּנְחֹשֶׁת.
 *  וּתְכֵלֶת וְאַרְגָּמָן וְתוֹלַעַת שָׁנִי וְשֵׁשׁ וְעִזִּים.
 *  וְעֹרֹת אֵילִם מְאָדָּמִים וְעֹרֹת תְּחָשִׁים וַעֲצֵי שִׁטִּים.
 *  שֶׁמֶן לַמָּאֹר בְּשָׂמִים לְשֶׁמֶן הַמִּשְׁחָה וְלִקְטֹרֶת הַסַּמִּים.
 *  אַבְנֵי שֹׁהַם וְאַבְנֵי מִלֻּאִים לָאֵפֹד וְלַחֹשֶׁן."
 *
 * הסדר במערך הוא סדר הפסוקים. מנייה אחרת אפשרית (יש מונים אחרת),
 * וכאן נספרו חמישה עשר מינים.
 *
 * הקבוצות (group) משמשות את מיני־המשחק "מבחן תרומת הלב".
 */

export const MATERIAL_GROUPS = {
  metals:  { label: 'מַתָּכוֹת',          hint: 'זָהָב · כֶּסֶף · נְחֹשֶׁת',             color: '#e8c050' },
  fabrics: { label: 'בַּדִּים וְחוּטִים',  hint: 'חוּטֵי צֶבַע, שֵׁשׁ וְעִזִּים',           color: '#a77ad8' },
  skins:   { label: 'עוֹרוֹת',           hint: 'אֵילִים מְאָדָּמִים · תְּחָשִׁים',        color: '#d0704a' },
  other:   { label: 'חוֹמָרִים נוֹסָפִים', hint: 'עֵץ · שֶׁמֶן · בְּשָׂמִים · אֲבָנִים',    color: '#6fb06f' },
};

export const MATERIALS = [
  { id: 'gold',     name: 'זָהָב',                   short: 'זהב',            group: 'metals',  source: 'שמות כ״ה, ג׳', value: 100 },
  { id: 'silver',   name: 'כֶּסֶף',                  short: 'כסף',            group: 'metals',  source: 'שמות כ״ה, ג׳', value: 100 },
  { id: 'bronze',   name: 'נְחֹשֶׁת',                 short: 'נחושת',          group: 'metals',  source: 'שמות כ״ה, ג׳', value: 100 },
  { id: 'techelet', name: 'תְּכֵלֶת',                 short: 'תכלת',           group: 'fabrics', source: 'שמות כ״ה, ד׳', value: 150 },
  { id: 'argaman',  name: 'אַרְגָּמָן',                short: 'ארגמן',          group: 'fabrics', source: 'שמות כ״ה, ד׳', value: 150 },
  { id: 'tolaat',   name: 'תּוֹלַעַת שָׁנִי',           short: 'תולעת שני',      group: 'fabrics', source: 'שמות כ״ה, ד׳', value: 150 },
  { id: 'shesh',    name: 'שֵׁשׁ',                   short: 'שש (פשתן)',      group: 'fabrics', source: 'שמות כ״ה, ד׳', value: 150 },
  { id: 'goat',     name: 'עִזִּים',                 short: 'עזים (צמר עזים)', group: 'fabrics', source: 'שמות כ״ה, ד׳', value: 150 },
  { id: 'rams',     name: 'עֹרֹת אֵילִם מְאָדָּמִים',  short: 'עורות אילים מאדמים', group: 'skins', source: 'שמות כ״ה, ה׳', value: 120 },
  { id: 'tachash',  name: 'עֹרֹת תְּחָשִׁים',          short: 'עורות תחשים',    group: 'skins',   source: 'שמות כ״ה, ה׳', value: 120 },
  { id: 'shittim',  name: 'עֲצֵי שִׁטִּים',            short: 'עצי שיטים',      group: 'other',   source: 'שמות כ״ה, ה׳', value: 80 },
  { id: 'oil',      name: 'שֶׁמֶן לַמָּאוֹר',          short: 'שמן למאור',      group: 'other',   source: 'שמות כ״ה, ו׳', value: 80 },
  { id: 'spices',   name: 'בְּשָׂמִים',               short: 'בשמים',          group: 'other',   source: 'שמות כ״ה, ו׳', value: 80 },
  { id: 'shoham',   name: 'אַבְנֵי שֹׁהַם',            short: 'אבני שוהם',      group: 'other',   source: 'שמות כ״ה, ז׳', value: 80 },
  { id: 'miluim',   name: 'אַבְנֵי מִלֻּאִים',         short: 'אבני מילואים',   group: 'other',   source: 'שמות כ״ה, ז׳', value: 80 },
];

/** מזהי המצרכים בסדר הפסוקים */
export const MATERIAL_ORDER = MATERIALS.map(m => m.id);

const BY_ID = new Map(MATERIALS.map(m => [m.id, m]));

/** @returns {object|undefined} */
export function getMaterial(id) {
  return BY_ID.get(id);
}
