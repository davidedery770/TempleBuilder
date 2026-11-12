/**
 * levels.js — מטא־דאטה של כל 14 השלבים ו־7 הפרקים.
 *
 * זהו המקור היחיד לאמת לגבי מבנה המשחק. מסך בחירת השלבים,
 * ה־HUD ומסך הסיכום כולם קוראים מכאן.
 *
 * `palette` הוא המקביל ל־MAIN.PAL של Captain Claw: סט צבעים סגור
 * שנותן לכל פרק זהות חזותית מובחנת.
 */

export const CHAPTERS = [
  { id: 1, roman: 'א',  name: 'אֵשׁ בַּמִּדְבָּר',        levels: [1, 2],   boss: 'שַׂר צְבָא עֲמָלֵק' },
  { id: 2, roman: 'ב',  name: 'מֵעֵבֶר לַיַּרְדֵּן',      levels: [3, 4],   boss: 'שׁוֹמֵר חוֹמַת יְרִיחוֹ' },
  { id: 3, roman: 'ג',  name: 'שִׁילֹה',                 levels: [5, 6],   boss: 'אֲלוּף פְּלִשְׁתִּים' },
  { id: 4, roman: 'ד',  name: 'דּוֹרוֹת שֶׁל נְדוּדִים',  levels: [7, 8],   boss: 'רֹאשׁ הַשּׁוֹדְדִים' },
  { id: 5, roman: 'ה',  name: 'הַבַּיִת הָרִאשׁוֹן',      levels: [9, 10],  boss: 'שַׂר צְבָא בָּבֶל' },
  { id: 6, roman: 'ו',  name: 'הַבַּיִת הַשֵּׁנִי',       levels: [11, 12], boss: 'הַגִּיס הָרוֹמִי' },
  { id: 7, roman: 'ז',  name: 'הַבַּיִת הַשְּׁלִישִׁי',   levels: [13, 14], boss: 'הַיֵּאוּשׁ' },
];

/**
 * כל שלב:
 *   id          מספר 1..14
 *   chapter     מזהה הפרק
 *   name        שם השלב
 *   era         התקופה ההיסטורית
 *   subtitle    משפט אווירה קצר
 *   relic       כלי הקודש הנאסף: { id, name, icon }
 *   npc         הדמות שנפגשת
 *   mechanic    המכניקה החדשה
 *   palette     צבעי הפרק
 *   isBossLevel האם בסוף השלב יש קרב בוס (כל שלב זוגי)
 *   ready       האם השלב מיושם בפועל
 */
export const LEVELS = [
  {
    id: 1, chapter: 1,
    name: 'מַחֲנֵה יִשְׂרָאֵל',
    era: 'מדבר סיני',
    subtitle: 'עמוד הענן מרחף מעל, והתרומה מתפזרת ברוח',
    relic: { id: 'tavnit', name: 'תַּבְנִית הַמִּשְׁכָּן', icon: '📜' },
    npc: 'מֹשֶׁה רַבֵּנוּ',
    mechanic: 'סופת חול ומיני־משחקי ידע',
    palette: {
      skyTop: '#4a86b8', skyBot: '#e8c88a',
      far: '#c9a06a', mid: '#b8874a', near: '#8a5f32',
      ground: '#c9a870', groundDark: '#8a6b3a',
      accent: '#2f6f9e', gold: '#ffd24a',
    },
    isBossLevel: false,
    ready: true,
  },
  {
    id: 2, chapter: 1,
    name: 'הֲקָמַת הַמִּשְׁכָּן',
    era: 'מדבר סיני',
    subtitle: 'מהתרומה אל המלאכה — מרכיבים את המשכן לפי הפסוקים',
    relic: { id: 'adanim', name: 'אַדְנֵי הַכֶּסֶף', icon: '🏛️' },
    npc: 'אַהֲרֹן הַכֹּהֵן',
    mechanic: 'הרכבה מונחית בתלת־ממד',
    palette: {
      skyTop: '#3f6f9a', skyBot: '#d9b878',
      far: '#b8945e', mid: '#a87b42', near: '#7a542a',
      ground: '#bb9b64', groundDark: '#7d6034',
      accent: '#7a3f8a', gold: '#ffd24a',
    },
    isBossLevel: false,
    ready: true,
  },
  {
    id: 3, chapter: 2,
    name: 'מַעֲבַר הַיַּרְדֵּן',
    era: 'כניסה לארץ',
    subtitle: 'קירות המים עומדים משני הצדדים',
    relic: { id: 'stones12', name: 'שְׁתֵּים־עֶשְׂרֵה אֲבָנִים', icon: '🪨' },
    npc: 'יְהוֹשֻׁעַ בִּן־נוּן',
    mechanic: 'טיימר מים',
    palette: {
      skyTop: '#2f5f8a', skyBot: '#8ab8c9',
      far: '#4a8299', mid: '#3a6b7d', near: '#2a4f5e',
      ground: '#6b7a6a', groundDark: '#3f4a3e',
      accent: '#3fb8d0', gold: '#ffd24a',
    },
    isBossLevel: false,
    ready: true,
  },
  {
    id: 4, chapter: 2,
    name: 'הַמַּחֲנֶה בַּגִּלְגָּל',
    era: 'כניסה לארץ',
    subtitle: 'הפסח הראשון בארץ, והמן פוסק',
    relic: { id: 'omer', name: 'עֹמֶר הַתְּנוּפָה', icon: '🌾' },
    npc: 'אֶלְעָזָר הַכֹּהֵן',
    mechanic: 'שדות דגן, איסוף ואתגר שופר',
    palette: {
      skyTop: '#5a9ac9', skyBot: '#e8d9a0',
      far: '#c9b86a', mid: '#a89a4a', near: '#7a6f32',
      ground: '#c9b060', groundDark: '#8a7838',
      accent: '#5a8a3a', gold: '#ffd24a',
    },
    isBossLevel: true,
    ready: true,
  },
  {
    id: 5, chapter: 3,
    name: 'כַּרְמֵי שִׁילֹה',
    era: 'משכן שילה',
    subtitle: 'מסיק הזיתים בגבעות אפרים',
    relic: { id: 'oil', name: 'שֶׁמֶן זַיִת זָךְ', icon: '🫒' },
    npc: 'חַנָּה',
    mechanic: 'מסיק זיתים, גינת מים ובית בד',
    palette: {
      skyTop: '#6a9ec9', skyBot: '#f0d8a0',
      far: '#8aa86a', mid: '#6a8a4a', near: '#4a6332',
      ground: '#9a9a6a', groundDark: '#5e5e3a',
      accent: '#c9a227', gold: '#ffd24a',
    },
    isBossLevel: false,
    ready: true,
  },
  {
    id: 6, chapter: 3,
    name: 'אוֹר הַמִּשְׁכָּן בְּשִׁילֹה',
    era: 'משכן שילה',
    subtitle: 'לילה בשילה — ונר אלוקים טרם יכבה',
    relic: { id: 'menorah', name: 'מְנוֹרַת הַזָּהָב', icon: '🕎' },
    npc: 'עֵלִי וּשְׁמוּאֵל',
    mechanic: 'פנסי שמן, גשרי אור והדלקת המנורה',
    palette: {
      skyTop: '#5f86c8', skyBot: '#f4cf9a',
      far: '#8c8fc2', mid: '#7d8bb0', near: '#6f8a6a',
      ground: '#c2ab84', groundDark: '#8e7756',
      accent: '#ffb84a', gold: '#ffd24a',
    },
    isBossLevel: true,
    ready: true,
  },
  {
    id: 7, chapter: 4,
    name: 'נֹב, עִיר הַכֹּהֲנִים',
    era: 'ימי שאול ודוד',
    subtitle: 'לחם לדוד הרעב — בלי שצופי שאול יראו',
    relic: { id: 'vestments', name: 'הָאֵפוֹד', icon: '👔' },
    npc: 'אֲחִימֶלֶךְ הַכֹּהֵן',
    mechanic: 'התגנבות, גגות ולחם הפנים',
    palette: {
      skyTop: '#7a3a4a', skyBot: '#e89a5a',
      far: '#9a6a5a', mid: '#7a4f42', near: '#4f332a',
      ground: '#8a6a52', groundDark: '#4f3e30',
      accent: '#d64a3a', gold: '#ffd24a',
    },
    isBossLevel: false,
    ready: true,
  },
  {
    id: 8, chapter: 4,
    name: 'הַבָּמָה בְּגִבְעוֹן',
    era: 'ימי שלמה',
    subtitle: 'חלום של עננים — ושלמה מבקש לב שומע',
    relic: { id: 'altar', name: 'מִזְבַּח הַנְּחֹשֶׁת', icon: '🔥' },
    npc: 'שְׁלֹמֹה הַמֶּלֶךְ',
    mechanic: 'עננים קפיציים, במות נעות ושועלים בכרם',
    palette: {
      skyTop: '#6fb8ec', skyBot: '#fbe9c2',
      far: '#9fc98a', mid: '#8fbf78', near: '#7fb56a',
      ground: '#d8c08e', groundDark: '#a88d5e',
      accent: '#e7b94a', gold: '#ffd24a',
    },
    isBossLevel: true,
    ready: true,
  },
  {
    id: 9, chapter: 5,
    name: 'אַרְזֵי הַלְּבָנוֹן',
    era: 'בית ראשון',
    subtitle: 'מיערות הלבנון, ברפסודות בים, אל הר המוריה',
    relic: { id: 'cedars', name: 'אַרְזֵי הַלְּבָנוֹן', icon: '🌲' },
    npc: 'חִירָם מֶלֶךְ צוֹר',
    mechanic: 'רפסודות בים, שבירת אבנים ובנייה בשקט',
    palette: {
      skyTop: '#5fb0ea', skyBot: '#f2f8fb',
      far: '#8fa9c4', mid: '#7fbf73', near: '#5fae55',
      ground: '#e8d3a6', groundDark: '#c4ab78',
      accent: '#8a5f3a', gold: '#ffd24a',
    },
    isBossLevel: false,
    ready: true,
  },
  {
    id: 10, chapter: 5,
    name: 'קֹדֶשׁ הַקֳּדָשִׁים',
    era: 'בית ראשון',
    subtitle: 'חנוכת הבית — והענן מלא את בית ה׳',
    relic: { id: 'cherubim', name: 'הַכְּרוּבִים', icon: '👑' },
    npc: 'שְׁלֹמֹה בִּתְפָאַרְתּוֹ',
    mechanic: 'חידות אור במראות נחושת ומשחק קצב עם הלויים',
    palette: {
      skyTop: '#62b4ee', skyBot: '#fbf1d9',
      far: '#a9c79a', mid: '#e9d6aa', near: '#d99a6a',
      ground: '#efe0bb', groundDark: '#cdb27a',
      accent: '#ffe9a8', gold: '#ffd24a',
    },
    isBossLevel: true,
    ready: true,
  },
  {
    id: 11, chapter: 6,
    name: 'נֵס פַּךְ הַשֶּׁמֶן',
    era: 'בית שני — חשמונאים',
    subtitle: 'המקדש מחולל, והצבע חוזר עם הטיהור',
    relic: { id: 'oilJar', name: 'פַּךְ הַשֶּׁמֶן הֶחָתוּם', icon: '🏺' },
    npc: 'יְהוּדָה הַמַּכַּבִּי',
    mechanic: 'טיהור ושינוי פלטה',
    palette: {
      skyTop: '#4a4a52', skyBot: '#8a8278',
      far: '#6a6258', mid: '#524c44', near: '#3a3630',
      ground: '#6a6052', groundDark: '#3e382e',
      accent: '#c9a227', gold: '#ffd24a',
    },
    isBossLevel: false,
    ready: false,
  },
  {
    id: 12, chapter: 6,
    name: 'תִּפְאֶרֶת הוֹרְדוֹס',
    era: 'בית שני — הורדוס',
    subtitle: 'מי שלא ראה בניין הורדוס, לא ראה בניין נאה',
    relic: { id: 'marble', name: 'אַבְנֵי הַשַּׁיִשׁ', icon: '🔷' },
    npc: 'הִלֵּל הַזָּקֵן',
    mechanic: 'שכנוע במקום לחימה',
    palette: {
      skyTop: '#6aa8d0', skyBot: '#e8f0f8',
      far: '#c9d8e8', mid: '#a8bcd0', near: '#7a8fa8',
      ground: '#d8dce4', groundDark: '#9aa4b0',
      accent: '#3f8fd0', gold: '#ffd24a',
    },
    isBossLevel: true,
    ready: false,
  },
  {
    id: 13, chapter: 7,
    name: 'נִיצוֹצוֹת',
    era: 'לעתיד לבוא',
    subtitle: 'מכל קצווי הארץ, עולים אל ההר',
    relic: { id: 'hoshen', name: 'אַבְנֵי הַחֹשֶׁן', icon: '✨' },
    npc: 'אֵלִיָּהוּ הַנָּבִיא',
    mechanic: 'פלאשבקים',
    palette: {
      skyTop: '#2a3a6a', skyBot: '#e8a86a',
      far: '#6a6a9a', mid: '#4a4a7a', near: '#2f2f52',
      ground: '#7a6a8a', groundDark: '#443a52',
      accent: '#ffd964', gold: '#ffd24a',
    },
    isBossLevel: false,
    ready: false,
  },
  {
    id: 14, chapter: 7,
    name: 'הַבַּיִת הַשָּׁלֵם',
    era: 'לעתיד לבוא',
    subtitle: 'נחל מים חיים יוצא מתחת למפתן',
    relic: { id: 'temple', name: 'הַבַּיִת עַצְמוֹ', icon: '🏛️' },
    npc: 'כָּל מִי שֶׁפָּגַשְׁתָּ',
    mechanic: 'הרכבה סופית',
    palette: {
      skyTop: '#9ac9e8', skyBot: '#fff0c9',
      far: '#e8d8a8', mid: '#d8c488', near: '#b8a468',
      ground: '#f0e4c0', groundDark: '#c9b88a',
      accent: '#ffd964', gold: '#ffd24a',
    },
    isBossLevel: true,
    ready: false,
  },
];

/** @returns {object|undefined} */
export function getLevel(id) {
  return LEVELS.find(l => l.id === id);
}

export function sceneForLevel(id) {
  return id === 2 ? 'construction' : 'play';
}

/** @returns {object|undefined} */
export function getChapter(id) {
  return CHAPTERS.find(c => c.id === id);
}

/** כל השלבים של פרק מסוים */
export function levelsOfChapter(chapterId) {
  return LEVELS.filter(l => l.chapter === chapterId);
}
