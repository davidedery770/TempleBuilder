/**
 * verify-gameplay.mjs — בדיקת לוגיקת משחק ללא דפדפן.
 *
 *   1. אי-אלימות: אויב מורתע ולא נהרג, נרגע 3 שניות, וחוזר להיות מסוכן
 *   2. המטה מקרין אור רק כשלוחצים Z
 *   3. טריוויה / מיון / אריגה: מסלול הצלחה מושלם, וכישלון
 *
 * הרצה:  node tools/verify-gameplay.mjs
 */

globalThis.window = new EventTarget();
globalThis.localStorage = { getItem: () => null, setItem: () => {} };

const { Enemy, DAZE_TIME } = await import('../src/game/enemy.js');
const { Player } = await import('../src/game/player.js');
const { TriviaGame } = await import('../src/minigames/trivia.js');
const { SortingGame } = await import('../src/minigames/sorting.js');
const { WeavingGame } = await import('../src/minigames/weaving.js');

let failed = 0;
const check = (cond, msg) => {
  console.log(`  ${cond ? '✓' : '✗'} ${msg}`);
  if (!cond) failed++;
};

/** קלט מדומה: מקשים שנלחצו בפריים הזה בלבד */
function makeInput(pressed = [], held = []) {
  const p = new Set(pressed);
  const h = new Set(held);
  return {
    pressed: (a) => p.has(a),
    down: (a) => h.has(a) || p.has(a),
    axisX: 0,
    over: () => false,
    clicked: false,
    pointerMoved: false,
    pointer: { x: -1, y: -1, inside: false },
    cursor: 'default',
    wheel: 0,
  };
}

const audio = new Proxy({}, { get: () => () => {} });

/** צעד עדכון אחד לכל מיני-משחק עם מקשים נתונים */
const step = (mini, keys = [], dt = 0.1) => mini.update(dt, makeInput(keys), audio);

// ---------------------------------------------------------------------------
console.log('\n=== אי-אלימות: אויבים ===');

const flatMap = {
  rectHitsSolid: () => false,
  isPlatform: () => false,
  hasGroundBelow: () => true,
};
const near = { alive: true, centerX: 100, centerY: 22 };

{
  const e = new Enemy('amalekite', 0, 0, {});
  check(e.dangerous, 'אויב רגיל מסוכן במגע');
  check(!('health' in e) && !('alive' in e), 'לאויב אין בריאות ואין מצב "חי/מת" — אי אפשר להרוג אותו');

  const first = e.repel(1);
  check(first === true, 'repel() מחזיר true בהרתעה ראשונה');
  check(!e.dangerous && e.dazed, 'אחרי הרתעה האויב רגוע ואינו מסוכן');
  check(e.repel(1) === false, 'הרתעה חוזרת בזמן שהוא רגוע לא נספרת');

  let t = 0;
  while (t < DAZE_TIME - 0.3) { e.update(1 / 60, flatMap, near); t += 1 / 60; }
  check(!e.dangerous, `עדיין רגוע אחרי ${t.toFixed(1)} שניות`);

  while (t < DAZE_TIME + 0.3) { e.update(1 / 60, flatMap, near); t += 1 / 60; }
  check(e.dangerous, `חזר להיות מסוכן אחרי ${t.toFixed(1)} שניות (הרגיעה: ${DAZE_TIME}s)`);

  const sc = new Enemy('scorpion', 0, 0, {});
  sc.repel(-1);
  check(sc.dazed && !sc.dangerous, 'גם העקרב מורתע ונרגע');
}

// ---------------------------------------------------------------------------
console.log('\n=== המטה ===');
{
  const stubMap = {
    rectHitsSolid: () => false, rectHitsHazard: () => false, isPlatform: () => false,
    pixelW: 99999, pixelH: 99999,
  };
  const pl = new Player(100, 100);
  check(pl.attackBox === null, 'בלי לחיצה אין אזור אור');

  pl.update(1 / 60, makeInput(['attack']), stubMap, audio);
  const box = pl.attackBox;
  check(box !== null && box.w >= 48, `לחיצה על Z מקרינה אור (טווח ${box && box.w}px)`);

  for (let i = 0; i < 40; i++) pl.update(1 / 60, makeInput([]), stubMap, audio);
  check(pl.attackBox === null, 'האור נכבה אחרי חצי שנייה');
}

// ---------------------------------------------------------------------------
console.log('\n=== מיני-משחק: טריוויה ===');
{
  const used = new Set();
  const g = new TriviaGame({}, { levelId: 1, count: 3, used });
  check(g.questions.length === 3 && used.size === 3, '3 שאלות נבחרו ונרשמו כ"נשאלו"');

  step(g); step(g);                               // עובר את חלון ההתעלמות הראשוני
  for (let i = 0; i < 3; i++) {
    step(g, ['opt' + (g.q.answer + 1)]);          // תשובה נכונה
    step(g, ['confirm']);                         // הבא
  }
  check(g.phase === 'end', 'אחרי 3 תשובות מגיעים למסך הסיכום');
  step(g, ['confirm']);
  check(g.finished && g.result.success && g.result.perfect, 'תשובות נכונות: הצלחה ומושלם');

  const g2 = new TriviaGame({}, { levelId: 1, count: 3, used: new Set() });
  step(g2); step(g2);
  for (let i = 0; i < 3; i++) {
    step(g2, ['opt' + (((g2.q.answer + 1) % 4) + 1)]);   // תשובה שגויה
    step(g2, ['confirm']);
  }
  step(g2, ['confirm']);
  check(g2.finished && !g2.result.success && !g2.result.cancelled, 'תשובות שגויות: כישלון (לא ביטול)');

  const g3 = new TriviaGame({}, { levelId: 1, count: 3, used: new Set() });
  step(g3); step(g3);
  step(g3, ['back']);
  check(g3.finished && g3.result.cancelled, 'ESC מבטל בלי עונש');

  // שאלה שנשאלה לא חוזרת בתחנה השנייה
  const used2 = new Set();
  const a = new TriviaGame({}, { levelId: 1, count: 3, used: used2 });
  const b = new TriviaGame({}, { levelId: 1, count: 2, used: used2 });
  const ids = [...a.questions, ...b.questions].map(q => q.id);
  check(new Set(ids).size === ids.length, 'שתי תחנות טריוויה: אותה שאלה לא חוזרת');
}

// ---------------------------------------------------------------------------
console.log('\n=== מיני-משחק: מבחן תרומת הלב (מיון) ===');
{
  const ORDER = ['metals', 'fabrics', 'skins', 'other'];
  const g = new SortingGame({}, {});
  check(g.items.length === 8, '8 מצרכים במשחק');
  check(ORDER.every(grp => g.items.some(m => m.group === grp)), 'לפחות מצרך אחד מכל קבוצה');

  step(g); step(g);
  for (let i = 0; i < 8; i++) {
    step(g, ['opt' + (ORDER.indexOf(g.item.group) + 1)]);   // הקבוצה הנכונה
    step(g, ['confirm']);                                   // מדלג על המשוב
  }
  check(g.phase === 'end' && g.correct === 8, `8 מתוך 8 נכון (${g.correct})`);
  step(g, ['confirm']);
  check(g.finished && g.result.success && g.result.perfect, 'מיון מושלם: הצלחה ומושלם');

  // כישלון: כולם שגויים
  const bad = new SortingGame({}, {});
  step(bad); step(bad);
  for (let i = 0; i < 8; i++) {
    step(bad, ['opt' + (((ORDER.indexOf(bad.item.group) + 1) % 4) + 1)]);
    step(bad, ['confirm']);
  }
  check(bad.phase === 'end' && bad.correct === 0, 'כל התשובות שגויות: 0 נכון');
  step(bad, ['confirm']);
  check(bad.finished && !bad.result.success && !bad.result.cancelled, 'מיון כושל: כישלון');

  // איחור: הזמן אוזל
  const slow = new SortingGame({}, {});
  step(slow); step(slow);
  step(slow, [], 9);
  check(slow.phase === 'feedback' && slow.last && slow.last.timedOut, 'איחור (8 שניות) נספר כשגוי, בלי קריסה');
}

// ---------------------------------------------------------------------------
console.log('\n=== מיני-משחק: חכמת לב (אריגה) ===');
{
  const SEQ = ['techelet', 'argaman', 'tolaat', 'shesh'];

  /** לוחץ על הסליל הנכון הבא (לפי מיקומו הנוכחי) */
  const clickExpected = (g) => step(g, ['opt' + (g.order.indexOf(g.expected) + 1)]);
  /** לוחץ על סליל שגוי */
  const clickWrong = (g) => {
    const idx = g.order.findIndex(k => k !== g.expected);
    step(g, ['opt' + (idx + 1)]);
  };

  const g = new WeavingGame({}, {});
  step(g); step(g);
  check(g.round === 1, 'מתחילים בסיבוב א׳ (מודרך)');

  for (let i = 0; i < 4; i++) clickExpected(g);
  check(g.phase === 'between', 'סיבוב א׳ הושלם');
  step(g, ['confirm']);
  check(g.round === 2 && g.phase === 'play', 'עוברים לסיבוב ב׳ (מהזיכרון)');

  for (let i = 0; i < 4; i++) clickExpected(g);
  check(g.phase === 'done', 'סיבוב ב׳ הושלם — היריעה ארוגה');
  step(g, ['confirm']);
  check(g.finished && g.result.success && g.result.perfect, 'בלי טעויות: הצלחה ומושלם');
  check(g.bands.filter(b => b.kind).map(b => b.kind).join() === [...SEQ, ...SEQ].join(),
    'היריעה ארוגה בסדר: תכלת, ארגמן, תולעת שני, שש (פעמיים)');

  // טעויות בסיבוב א׳ לא נספרות נגד ה"מושלם"; טעויות בסיבוב ב׳ כן
  const g2 = new WeavingGame({}, {});
  step(g2); step(g2);
  clickWrong(g2); clickWrong(g2);
  for (let i = 0; i < 4; i++) clickExpected(g2);
  step(g2, ['confirm']);
  for (let i = 0; i < 4; i++) clickExpected(g2);
  step(g2, ['confirm']);
  check(g2.result.success && g2.result.perfect, 'טעויות בסיבוב הלימוד לא פוגעות בציון');

  const g3 = new WeavingGame({}, {});
  step(g3); step(g3);
  for (let i = 0; i < 4; i++) clickExpected(g3);
  step(g3, ['confirm']);
  clickWrong(g3);
  clickExpected(g3); clickExpected(g3); clickExpected(g3); clickExpected(g3);
  step(g3, ['confirm']);
  check(g3.result.success && !g3.result.perfect, 'טעות בסיבוב ב׳: הצלחה, אבל לא מושלם');

  const g4 = new WeavingGame({}, {});
  step(g4); step(g4);
  for (let i = 0; i < 4; i++) clickExpected(g4);
  step(g4, ['confirm']);
  for (let i = 0; i < 4; i++) clickWrong(g4);
  check(g4.phase === 'failed', 'יותר מ-3 טעויות בסיבוב ב׳: מסך כישלון עם הסדר הנכון');

  const g5 = new WeavingGame({}, {});
  step(g5); step(g5);
  clickWrong(g5); clickWrong(g5);
  check(g5.streak >= 2, 'שתי טעויות ברצף מדליקות רמז');
}

// ---------------------------------------------------------------------------
console.log('\n=== קפיצה על אויב = הרתעה (כמו המטה) ===');
{
  const { PlayScene, isStomp } = await import('../src/scenes/play.js');
  const { Camera } = await import('../src/core/camera.js');
  const { SaveData } = await import('../src/core/storage.js');

  const game = {
    width: 960, height: 540, camera: new Camera(960, 540),
    input: makeInput(), audio, save: new SaveData(), debug: null,
  };
  const scene = new PlayScene();
  scene.game = game;
  scene.scenes = { transitioning: false, go: () => {} };
  scene.enter({ levelId: 1 });

  const reset = (kind, playerY, vy) => {
    const e = new Enemy(kind, 500, 300, {});
    scene.enemies = [e];
    const p = scene.player;
    p.x = 500; p.y = playerY; p.vx = 0; p.vy = vy;
    p.health = 5; p._invuln = 0; p.alive = true;
    return { e, p };
  };

  // נוחת מלמעלה על עקרב: הרתעה, בלי פגיעה, והדפיקה
  let { e, p } = reset('scorpion', 300 - scene.player.h + 6, 200);
  scene._updateEnemies(1 / 60, audio);
  check(e.dazed, 'נוחתים על עקרב מלמעלה: הוא מורתע ונרגע');
  check(p.health === 5, 'אין פגיעה בשחקן');
  check(p.vy < -300, `השחקן מקבל הדיפה חוזרת למעלה (vy=${p.vy})`);

  // אותו דבר על העמלקי (האויב האנושי)
  ({ e, p } = reset('amalekite', 300 - scene.player.h + 8, 250));
  scene._updateEnemies(1 / 60, audio);
  check(e.dazed && p.health === 5, 'קפיצה על העמלקי מרתיעה אותו גם כן');

  // נגיעה מהצד עדיין פוגעת
  ({ e, p } = reset('scorpion', 300 - 10, 0));
  scene._updateEnemies(1 / 60, audio);
  check(!e.dazed && p.health === 4, 'נגיעה מהצד עדיין פוגעת (לב אחד)');

  // עלייה דרך האויב (לא נופלים) לא נחשבת קפיצה עליו
  ({ e, p } = reset('scorpion', 300 - scene.player.h + 6, -300));
  scene._updateEnemies(1 / 60, audio);
  check(!e.dazed && p.health === 4, 'עלייה במקום נפילה לא נחשבת קפיצה על האויב');

  // אויב רגוע אינו פוגע בכלל
  ({ e, p } = reset('scorpion', 300 - 10, 0));
  e.repel(1);
  scene._updateEnemies(1 / 60, audio);
  check(p.health === 5, 'אויב רגוע שנגעת בו לא פוגע');

  check(isStomp({ vy: 100, y: 0, h: 42 }, { y: 40, h: 20 }), 'isStomp: נופל עם רגליים בחלק העליון — כן');
  check(!isStomp({ vy: 100, y: 0, h: 42 }, { y: 10, h: 20 }), 'isStomp: רגליים מעמיקות באויב — לא');
}

// ---------------------------------------------------------------------------
console.log('\n=== מוזיקת רקע ===');
{
  const { Music } = await import('../src/core/music.js');

  const calls = [];
  const gainNode = () => ({
    gain: { value: 1, setTargetAtTime(v) { this.value = v; } },
    connect() {},
  });
  const fakeAudio = {
    ctx: { currentTime: 0, createGain: gainNode },
    master: {},
    tone: (o) => calls.push({ kind: 'tone', ...o }),
    noise: (o) => calls.push({ kind: 'noise', ...o }),
  };

  const m = new Music(fakeAudio);
  m.play('desert');
  check(m.pending === 'desert' && !m.timer, 'בקשה לנגן לפני שהאודיו נפתח ממתינה (דרוש לחיצה ראשונה)');

  m._ctxReady();
  check(!!m.timer && m.theme === 'desert', 'אחרי פתיחת האודיו המוזיקה מתחילה לנגן');

  m._tick();
  const tones = calls.filter(c => c.kind === 'tone');
  check(tones.length > 0 && tones.every(c => c.dest === m.bus), 'כל הצלילים נשלחים לערוץ המוזיקה (לא מערבבים עם האפקטים)');
  check(tones.some(c => Math.abs(c.freq - 440) < 1), 'הלחן הראשון: לא (440Hz) בסולם המזרחי');
  check(tones.some(c => c.freqEnd === 55), 'תוף היד ("דום") מתחיל את הקצב בנושא המדבר');

  m.play('menu');
  const menuStart = calls.length;
  fakeAudio.ctx.currentTime = 1;
  m._tick();
  check(!calls.slice(menuStart).some(c => c.freqEnd === 55), 'נושא התפריט: בלי תופים');

  m.duck(true);
  check(m.bus.gain.value === 0.3, 'החלשה בזמן מיני-משחק: עוצמה 0.3');
  m.duck(false);
  check(m.bus.gain.value === 1, 'חזרה לעוצמה מלאה');

  check(m.toggle() === false && m.bus.gain.value === 0, 'מקש N מכבה את המוזיקה');
  const before = calls.length;
  fakeAudio.ctx.currentTime = 3;
  m._tick();
  check(calls.length === before, 'כשהמוזיקה כבויה לא מתוזמנים צלילים (אין עומס מיותר)');
  check(m.toggle() === true && m.bus.gain.value === 1, 'הדלקה מחדש מחזירה את הצליל');
  m.stop();
}

console.log(failed === 0 ? '\n  הלוגיקה תקינה.\n' : `\n  ${failed} כשלונות.\n`);
process.exit(failed === 0 ? 0 : 1);
