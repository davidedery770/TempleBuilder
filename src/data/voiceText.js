import { MATERIAL_GROUPS } from './materials.js';
import { CODEX } from './codex.js';
import { MODEL_NOTES } from './mishkan3d.js';

// Two Hebrew base voices, with restrained character-specific direction.
export const VOICE_PROFILES = {
  moshe: { voice: 'he-IL-AvriNeural', rate: '-8%', pitch: '-12Hz', label: 'משה — עמוק ומתון' },
  yehoshua: { voice: 'he-IL-AvriNeural', rate: '+7%', pitch: '+5Hz', label: 'יהושע — נמרץ ובהיר' },
  elazar: { voice: 'he-IL-AvriNeural', rate: '-2%', pitch: '-5Hz', label: 'אלעזר — רגוע וחם' },
  elder: { voice: 'he-IL-AvriNeural', rate: '-12%', pitch: '-18Hz', label: 'זקני העם — איטי ונמוך' },
  scribe: { voice: 'he-IL-AvriNeural', rate: '+3%', pitch: '+12Hz', label: 'הסופר — קל ובהיר' },
  prince: { voice: 'he-IL-AvriNeural', rate: '+1%', pitch: '-9Hz', label: 'נשיא ולוי — יציב וחגיגי' },
  weaver: { voice: 'he-IL-HilaNeural', rate: '-4%', pitch: '+3Hz', label: 'חכמת לב — קול נשי חם' },
  narrator: { voice: 'he-IL-HilaNeural', rate: '+0%', pitch: '-3Hz', label: 'קריינית המוזיאון' },
  workshop: { voice: 'he-IL-AvriNeural', rate: '+0%', pitch: '+0Hz', label: 'מדריך הסדנה' },
  hannah: { voice:'he-IL-HilaNeural',rate:'-6%',pitch:'-3Hz',label:'חנה — קול שקט וחם' },
};

export function profileForSpeaker(speaker = '') {
  const name = speaker.normalize('NFD').replace(/[\u0591-\u05c7]/g, '');
  if (name.includes('משה')) return 'moshe';
  if (name.includes('יהושע')) return 'yehoshua';
  if (name.includes('אלעזר')) return 'elazar';
  if (/(^|\s)חנה($|\s)/.test(name)) return 'hannah';
  if (name.includes('מדריך הסדנה')) return 'workshop';
  if (/אשה|חכמת|אורג/.test(name)) return 'weaver';
  if (/סופר/.test(name)) return 'scribe';
  if (/נשיא|לוי/.test(name)) return 'prince';
  return 'elder';
}

export function voiceId(profile, text) {
  // Stable filename-safe ID; catalog preparation checks for hash collisions.
  let hash = 2166136261;
  for (const ch of text.normalize('NFC')) {
    hash ^= ch.codePointAt(0);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return `${profile}-${hash.toString(16).padStart(8, '0')}`;
}

export const WEAVING_TEXT = {
  first: 'לחצו על החוטים לפי סדר הצבעים: תכלת, ארגמן, תולעת שני, שש.',
  memory: 'עכשיו בלי עזרה: ארגו שוב באותו סדר.',
  guided: 'החוט הבא מואר. ארגו שוב באותו סדר, בלי הגבלת טעויות.',
  between: 'יָפֶה! עַכְשָׁו מֵהַזִּכָּרוֹן…',
  betweenGuided: 'יָפֶה! מַמְשִׁיכִים בְּיַחַד…',
  failed: 'כִּמְעַט! הַסֵּדֶר הוּא: תכלת, ארגמן, תולעת שני, שש.',
  done: 'ברשימת התרומה הסדר הוא: תכלת, ארגמן, תולעת שני ושש. בפסוק על יריעות המשכן הסדר שונה: "שש משזר ותכלת וארגמן ותולעת שני". היריעות נארגו "מעשה חושב", בדוגמה.',
};

export const SHOFAR_TEXT = {
  intro: 'כשהסמן עובר באזור המואר תקעו בשופר. כל הצלחה מקרבת להשלמת האתגר; טעות משאירה את כל ההצלחות. C מרחיב את חלון הזמן.',
  done: 'הַקּוֹל נִשְׁמַע — הָאֶתְגָּר הֻשְׁלַם! העומר נאסף, והדרך ממשיכה.',
  success: 'בתזמון הנכון! ההצלחה נשמרת.',
  widen: 'נרחיב מעט את האזור המואר. אפשר גם להפעיל סיוע.',
  retry: 'כמעט — תקעו כשהסמן בתוך האזור המואר. ההצלחות נשמרות.',
};

export const PLAN_NOTES = [
  '48 קרשים; 96 אדני כסף לקרשים ועוד 4 לפרוכת. חמשת אדני הפתח מנחושת.',
  'חצר: 100×50 אמה; שער במזרח: 20 אמה. שולחן בצפון, מנורה בדרום.',
  '30×10 אמה וחלוקת החלל: התיאור המקובל. מיקום האוהל בחצר סכמטי.',
  'הכלים מוגדלים והגג שקוף לצורך לימוד. צבע התחשים אינו זיהוי של בעל החיים.',
  'הגרירה מקבצת חלקים ומפשטת את סדר ההקמה; אין זו הדמיית כל העבודות.',
  'החומרים מייצגים סוגי תרומה, לא כמויות. אבני האפוד והחושן אינן חלק מהמבנה.',
  'מקורות: שמות כ״ו–כ״ז, ל״ח, מ׳. בבחירת חלק מוצג מראה המקום שלו.',
];
export function constructionNotes(viewMode) {
  return viewMode === '3d' ? [
    ...MODEL_NOTES,
    'חתך מסתיר כיסויים וקיר דרומי כדי להציג את הכלים; זו אינה הסרה מהבנייה.',
    'המקורות וההתקדמות זהים לשרטוט. בונים את אותם חלקים בשני המצבים.',
  ] : PLAN_NOTES;
}
export const REBUILD_TEXT = 'להקים את המשכן מחדש? ההרכבה הנוכחית תתחיל שוב מהאדנים. החומרים, כרטיסיות הידע, ניקוד השיא וכל השלבים שכבר נפתחו יישמרו.';
export const QUIZ_END = ['כָּל הַכָּבוֹד!', 'כְּדַאי לָנוּ לִלְמֹד עוֹד', 'מושלם! מגיע לך פרס.', 'עברת! מגיע לך פרס.', 'אפשר לנסות שוב אצל אותה דמות — השאלות יתחלפו.'];
export const SORT_END = ['כָּל הַכָּבוֹד!', 'כִּמְעַט!'];

const snapshot = (key, profile, texts) => ({
  key, lines: texts.filter(Boolean).map(text => ({ id: voiceId(profile, text), text, profile })),
});
export function cardTexts(card) {
  return [card.title, card.subtitle, card.body];
}

/** Only reads state. Never advances a page, modifies gameplay, or reveals hidden answers. */
export function narrationForGame(game) {
  const manager = game.scenes, s = manager.current;
  if (!s || manager.transitioning || s.paused) return null;
  if (manager.currentName === 'play') {
    const m = s.mini;
    if (m && !m.finished) {
      const type = m.constructor.name;
      const profile = type === 'WeavingGame' ? 'weaver' : type === 'ShofarTimingGame'
        ? 'yehoshua' : profileForSpeaker(m.speaker);
      const key = `mini:${type}:${m.phase}:${m.i ?? ''}:${m.round ?? ''}`;
      if(m.narrationText){
        return snapshot(`mini:${type}:${m.narrationKey}:${m.voiceLabelKey||''}`,profile,[m.voiceLabel,m.narrationText]);
      }
      if (type === 'TriviaGame') {
        if (m.phase === 'ask') return snapshot(`${key}:${m.q.id}`, profile, [m.q.q, ...m.q.options]);
        if (m.phase === 'feedback') return snapshot(`${key}:${m.q.id}`, profile, [
          m.picked === m.q.answer ? 'נָכוֹן!' : 'כִּמְעַט — הַתְּשׁוּבָה הַנְּכוֹנָה מְסֻמֶּנֶת',
          m.q.options[m.q.answer], m.q.explain,
        ]);
        return snapshot(key, profile, [
          QUIZ_END[m.correct >= Math.ceil(m.questions.length / 2) ? 0 : 1],
          m.correct >= Math.ceil(m.questions.length / 2) ? QUIZ_END[m.correct === m.questions.length ? 2 : 3] : QUIZ_END[4],
        ]);
      }
      if (type === 'SortingGame') {
        if (m.phase === 'play') return snapshot(`${key}:${m.item.id}`, profile, [m.item.name]);
        if (m.phase === 'feedback') return snapshot(`${key}:${m.item.id}`, profile, [
          m.last.ok ? 'נָכוֹן!' : m.last.timedOut ? 'הַזְּמַן אָזַל' : 'לֹא בְּדִיּוּק',
          !m.last.ok ? MATERIAL_GROUPS[m.item.group].label : '',
        ]);
        return snapshot(key, profile, [SORT_END[m.correct >= 6 ? 0 : 1]]);
      }
      if (type === 'WeavingGame') {
        const text = m.phase === 'done' ? WEAVING_TEXT.done : m.phase === 'failed' ? WEAVING_TEXT.failed
          : m.phase === 'between' ? WEAVING_TEXT[m.guided ? 'betweenGuided' : 'between']
          : m.round === 1 ? WEAVING_TEXT.first : WEAVING_TEXT[m.guided ? 'guided' : 'memory'];
        // No color cues in the memory round: preserve the original challenge.
        return snapshot(key, profile, [text]);
      }
      if (type === 'ShofarTimingGame') {
        return snapshot(`${key}:${m.feedback}`, profile,
          [m.phase === 'intro' ? SHOFAR_TEXT.intro : m.phase === 'done' ? SHOFAR_TEXT.done : m.feedback]);
      }
      return null;
    }
    if (s.hud?.dialog) {
      const d = s.hud.dialog;
      return snapshot(`dialog:${d.speaker}:${d.page}:${d.lines[d.page]}`, profileForSpeaker(d.speaker), [d.lines[d.page]]);
    }
  }
  if (manager.currentName === 'construction') {
    if (s.rebuildConfirm) return snapshot('rebuild', 'workshop', [REBUILD_TEXT]);
    if (s.showNotes) return snapshot(`notes:${s.viewMode}`, 'workshop', constructionNotes(s.viewMode));
    if (s._voiceEvent) return snapshot(`workshop:${s._voiceEvent.key}`, 'workshop', s._voiceEvent.texts);
  }
  if (manager.currentName === 'museum') {
    const card = CODEX[s.index];
    if (card && game.save.hasCodex(card.id)) return snapshot(`museum:${card.id}`, 'narrator', cardTexts(card));
  }
  if (manager.currentName === 'summary') {
    const card = s.showKnowledge ? s.cards[s.cardIndex] : null;
    return snapshot(`summary:${card?.id || s.levelId}`, 'narrator', [
      'הַשָּׁלָב הֻשְׁלַם', ...(card ? cardTexts(card) : []),
    ]);
  }
  return null;
}
