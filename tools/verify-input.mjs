/**
 * verify-input.mjs — בדיקת עכבר ללא דפדפן.
 *
 * מדמה את ה-DOM בעזרת EventTarget, שולח אירועי pointer אמיתיים, ובודק:
 *   1. המרת קואורדינטות מסך ל-960×540
 *   2. מחזור החיים של click (חי פריים אחד בלבד)
 *   3. ButtonSet מחזיר את מזהה הכפתור הנכון
 *   4. תפריט ראשי: ריחוף בוחר, לחיצה מפעילה
 *   5. בחירת שלבים: ריחוף בוחר, לחיצה נכנסת לשלב; שלב לא מוכן — לא נכנסים
 *
 * הרצה:  node tools/verify-input.mjs
 */

// --- דימוי סביבת הדפדפן ---
globalThis.window = new EventTarget();
globalThis.localStorage = { getItem: () => null, setItem: () => {} };

const canvas = new EventTarget();
// קנבס שמוצג במסך ב-1920×1080 (פי 2 מהמידות הלוגיות), עם היסט
canvas.getBoundingClientRect = () => ({ left: 100, top: 50, width: 1920, height: 1080 });

const { Input } = await import('../src/core/input.js');
const { ButtonSet } = await import('../src/core/ui.js');
const { MenuScene } = await import('../src/scenes/menu.js');
const { LevelSelectScene } = await import('../src/scenes/levelSelect.js');
const { SaveData } = await import('../src/core/storage.js');

let failed = 0;
const check = (cond, msg) => {
  console.log(`  ${cond ? '✓' : '✗'} ${msg}`);
  if (!cond) failed++;
};

function fire(type, props = {}) {
  const e = new Event(type, { cancelable: true });
  Object.assign(e, props);
  canvas.dispatchEvent(e);
}

/** קואורדינטה לוגית → clientX/clientY על המסך המדומה */
const screenX = (lx) => 100 + lx * 2;
const screenY = (ly) => 50 + ly * 2;

const input = new Input();
input.attachPointer(canvas, 960, 540);

console.log('\n=== Input ===');

fire('pointermove', { clientX: screenX(480), clientY: screenY(270) });
input.beginFrame();
check(Math.abs(input.pointer.x - 480) < 0.01 && Math.abs(input.pointer.y - 270) < 0.01,
  `המרת קואורדינטות: (${input.pointer.x}, ${input.pointer.y}) צפוי (480, 270)`);
check(input.pointerMoved, 'pointerMoved נדלק אחרי תנועה');
check(input.over(400, 200, 160, 100), 'over() מזהה סמן בתוך מלבן');
check(!input.over(0, 0, 100, 100), 'over() מזהה סמן מחוץ למלבן');

input.beginFrame();
check(!input.pointerMoved, 'pointerMoved נכבה בפריים הבא (עכבר נייח לא דורס מקלדת)');

fire('pointerdown', { clientX: screenX(480), clientY: screenY(270), button: 0 });
input.beginFrame();
check(input.clicked, 'clicked נדלק בפריים הלחיצה');
input.beginFrame();
check(!input.clicked, 'clicked חי פריים אחד בלבד');

fire('pointerdown', { clientX: screenX(10), clientY: screenY(10), button: 2 });
input.beginFrame();
check(!input.clicked, 'לחצן ימני לא נחשב ללחיצה');

fire('pointerleave');
check(!input.pointer.inside, 'pointerleave מסמן שהסמן יצא');
fire('pointermove', { clientX: screenX(480), clientY: screenY(270) });

input.hold('jump');
input.beginFrame();
check(input.pressed('jump') && input.down('jump'), 'hold() מדליק pressed ו-down כמו מקלדת');
input.beginFrame();
check(!input.pressed('jump') && input.down('jump'), 'אחרי פריים: down נשאר, pressed כבה');
input.release('jump');
check(!input.down('jump'), 'release() משחרר את הפעולה');

console.log('\n=== ButtonSet ===');
{
  const bs = new ButtonSet();
  bs.set([
    { id: 'a', x: 100, y: 100, w: 100, h: 40, label: 'א' },
    { id: 'b', x: 300, y: 100, w: 100, h: 40, label: 'ב' },
  ]);

  fire('pointermove', { clientX: screenX(350), clientY: screenY(120) });
  fire('pointerdown', { clientX: screenX(350), clientY: screenY(120), button: 0 });
  input.beginFrame();
  check(bs.update(input) === 'b', 'לחיצה על כפתור ב׳ מחזירה "b"');
  check(input.cursor === 'pointer', 'הסמן הופך ל-pointer מעל כפתור');

  input.beginFrame();
  fire('pointermove', { clientX: screenX(600), clientY: screenY(400) });
  fire('pointerdown', { clientX: screenX(600), clientY: screenY(400), button: 0 });
  input.beginFrame();
  check(bs.update(input) === null, 'לחיצה מחוץ לכפתורים לא מחזירה כלום');

  bs.set([{ id: 'x', x: 560, y: 380, w: 100, h: 40, label: 'x', disabled: true }]);
  fire('pointerdown', { clientX: screenX(600), clientY: screenY(400), button: 0 });
  input.beginFrame();
  check(bs.update(input) === null, 'כפתור מושבת לא מגיב');
}

// --- סביבה מדומה לסצנות ---
const audioStub = new Proxy({}, { get: () => () => {} });
function makeScene(Scene) {
  const went = [];
  const game = {
    width: 960, height: 540, input,
    audio: audioStub,
    save: new SaveData(),
  };
  const scene = new Scene();
  scene.game = game;
  scene.scenes = { transitioning: false, go: (name, params) => went.push({ name, params }) };
  return { scene, went };
}

console.log('\n=== תפריט ראשי ===');
{
  const { scene, went } = makeScene(MenuScene);
  scene.enter();

  const menuButton = scene._itemRect(1);
  const menuX = menuButton.x + menuButton.w / 2, menuY = menuButton.y + menuButton.h / 2;
  fire('pointermove', { clientX: screenX(menuX), clientY: screenY(menuY) });
  input.beginFrame();
  scene.update(1 / 60);
  check(scene.index === 1, `ריחוף על הפריט השני בוחר אותו (index=${scene.index})`);
  check(input.cursor === 'pointer', 'הסמן הופך ל-pointer מעל פריט');

  fire('pointerdown', { clientX: screenX(menuX), clientY: screenY(menuY), button: 0 });
  input.beginFrame();
  scene.update(1 / 60);
  check(went.length === 1 && went[0].name === 'levels', `לחיצה על "בחירת שלב" עוברת למסך השלבים (${went[0] && went[0].name})`);
}

console.log('\n=== בחירת שלבים (עברית: שלב 1 מימין) ===');
{
  const { scene, went } = makeScene(LevelSelectScene);
  scene.enter({ focus: 1 });
  scene.scrollX = scene.targetScroll = 0;

  const r0 = scene._cardRect(0);
  const r1 = scene._cardRect(1);
  check(r0.x > r1.x, `שלב 1 (x=${r0.x.toFixed(0)}) מימין לשלב 2 (x=${r1.x.toFixed(0)})`);
  check(r0.x + r0.w <= 960, 'שלב 1 נכנס במלואו למסך');

  // ריחוף על שלב 2 ולא ללחוץ
  fire('pointermove', { clientX: screenX(r1.x + 40), clientY: screenY(r1.y + 40) });
  input.beginFrame();
  scene.update(1 / 60);
  check(scene.index === 1, `ריחוף על שלב 2 בוחר אותו (index=${scene.index})`);

  // שלב 2 מוכן אבל נעול בשמירה חדשה — לחיצה לא נכנסת.
  fire('pointerdown', { clientX: screenX(r1.x + 40), clientY: screenY(r1.y + 40), button: 0 });
  input.beginFrame();
  scene.update(1 / 60);
  check(went.length === 0, 'שלב 2 נעול בשמירה חדשה — לחיצה לא נכנסת');

  // לחיצה על שלב 1 נכנסת
  const r = scene._cardRect(0);
  fire('pointermove', { clientX: screenX(r.x + 40), clientY: screenY(r.y + 40) });
  fire('pointerdown', { clientX: screenX(r.x + 40), clientY: screenY(r.y + 40), button: 0 });
  input.beginFrame();
  scene.update(1 / 60);
  check(went.length === 1 && went[0].name === 'play' && went[0].params.levelId === 1,
    `לחיצה על שלב 1 נכנסת למשחק (${went[0] && went[0].name}, level ${went[0] && went[0].params.levelId})`);

  // גלגלת: מטה = קדימה בציר הזמן
  const w2 = makeScene(LevelSelectScene);
  w2.scene.enter({ focus: 1 });
  canvas.dispatchEvent(Object.assign(new Event('wheel', { cancelable: true }), { deltaY: 100 }));
  input.beginFrame();
  w2.scene.update(1 / 60);
  check(w2.scene.index === 1, `גלגלת מטה מעבירה לשלב הבא (index=${w2.scene.index})`);
}

console.log(failed === 0 ? '\n  העכבר עובד בכל המסכים שנבדקו.\n' : `\n  ${failed} כשלונות.\n`);
process.exit(failed === 0 ? 0 : 1);
