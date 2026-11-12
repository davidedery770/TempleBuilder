/**
 * Render one shareable PNG. Does not launch the game or touch its saved progress.
 * node tools/render-overview.mjs
 */
import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { LEVELS, CHAPTERS } from '../src/data/levels.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const WIDTH = 1800;
const stripNiqqud = s => s.replace(/[\u0591-\u05c7]/g, '');
const escape = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const developed = LEVELS.filter(l => l.ready).length;
const descriptions = [
  'אוספים תרומות ומגלים את תבנית המשכן',
  'מרכיבים את המשכן בגרירה, לפי הפסוקים',
  '12 אבנים, דגי נהר ומעברים בעזרת השופר',
  'שדות דגן, איסוף שעורים ואתגר תזמון',
  'מסיק שמן זית, טרסות וגתות',
  'המנורה מאירה את הדרך • ניהול אור וחושך',
  'התגנבות והצלת כלי קודש',
  'חידות חכמה ובמות נעות',
  'מסע ארזים, רפסודות ומחצבות',
  'הצבת כלים וחידות אור במקדש שלמה',
  'מחפשים את פך השמן ומשיבים צבע למקדש',
  'פאר המקדש ובחירה באהבת חינם',
  'אוספים ניצוצות וזיכרונות מכל המסע',
  'מרכיבים את הכלים • אור שמתגבר על הייאוש',
];
const chapterTitles = ['מדבר סיני', 'הכניסה לארץ', 'משכן שילה', 'נוב וגבעון', 'מקדש שלמה', 'בית המקדש השני', 'הבית השלישי — החזון'];
const chapterHints = ['האיסוף הופך לבנייה', 'מהנהר אל שדות הקציר', 'שמן, אור ותפילה', 'נדודים וחכמה', 'מחומרי הגלם אל בית הקבע', 'טיהור, חידוש ואחדות', 'המסע כולו מתחבר לבית'];
const img = async name => 'data:image/png;base64,' + (await readFile(path.join(root, 'tmp', name))).toString('base64');
const shots = await Promise.all([
  ['check_play.png', 'אוספים במחנה', 'שלב 1', 'platform'],
  ['construction-complete.png', 'בונים במבט־על', 'שלב 2', 'construction'],
  ['jordan-fish.png', 'חוצים את הירדן', 'שלב 3', 'platform'],
  ['gilgal-field-standing.png', 'מגלים דרך בשדות', 'שלב 4', 'platform'],
].map(async ([file, label, number, kind]) =>
  `<figure class="shot"><div class="shot-image ${kind}"><img src="${await img(file)}"></div><figcaption><span>${number}</span><strong>${label}</strong></figcaption></figure>`));

const icons = {
  move: '<path d="M5 38h12V28h12V18h14"/><circle cx="16" cy="10" r="4"/><path d="m14 16 9 3 7-5M21 19l-5 8m5-8 7 8 6-2"/>',
  collect: '<path d="M10 18h30l-4 24H14zM17 18l7-10h4l6 10"/><path d="M18 27h14m-12 7h10"/>',
  build: '<path d="M8 40V21h12V9h12v12h12v19M6 40h40M20 21h12M20 29h12m-6-8v19"/>',
  learn: '<path d="M25 12c-8-6-15-4-20-2v30c7-3 13-2 20 2 7-4 13-5 20-2V10c-5-2-12-4-20 2zm0 0v30M11 18l8 1m-8 7 8 1m12-8 8-1m-8 9 8-1"/>',
};
const icon = name => `<svg viewBox="0 0 50 50" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</svg>`;
const stage = id => {
  const l = LEVELS.find(l => l.id === id);
  return `<article class="stage ${l.ready ? 'ready' : 'planned'}">
    <div class="stage-number">${id}</div><div class="stage-copy"><h3>${escape(stripNiqqud(l.name))}</h3><p>${descriptions[id - 1]}</p></div>
    <span class="stage-status">${l.ready ? 'משחיק' : 'בתכנון'}</span>
  </article>`;
};
const rows = CHAPTERS.map((c, i) => `<div class="chapter ${i < 2 ? 'chapter-ready' : ''}">
  <div class="chapter-label"><span class="chapter-index">${c.roman}</span><div><h3>${chapterTitles[i]}</h3><p>${chapterHints[i]}</p></div></div>
  ${c.levels.map(stage).join('')}
</div>`).join('');

const temple = `<svg viewBox="0 0 480 295" aria-hidden="true">
<defs><linearGradient id="gold" x2="0" y2="1"><stop stop-color="#ffebb8"/><stop offset="1" stop-color="#a47b3d"/></linearGradient><radialGradient id="halo"><stop stop-color="#ddb36c" stop-opacity=".24"/><stop offset="1" stop-color="#ddb36c" stop-opacity="0"/></radialGradient></defs>
<ellipse cx="244" cy="126" rx="220" ry="146" fill="url(#halo)"/>
<g stroke="#dbb978" fill="none" opacity=".28"><path d="m244 50-94-35m94 35 105-35m-105 35 0-45m0 45-175 0m175 0 175 0"/></g>
<path d="M12 254c52-35 84-26 117-10s72-42 114-34 62 34 96 19 74 3 128 28v38H12z" fill="#20323b"/>
<path d="M58 277h365M75 263h331M92 248h298" stroke="#a7814e" stroke-width="6"/>
<path d="M116 246V78h254v168M106 78h274v18H106zM124 65h238" fill="#14242c" stroke="url(#gold)" stroke-width="4"/>
<path d="M162 243V124h27v119m107 0V124h27v119" fill="#bd985a" fill-opacity=".32" stroke="#cfac6e" stroke-width="3"/>
<path d="M213 246V132h62v114" fill="#e6bd70" fill-opacity=".25" stroke="#f0d69d" stroke-width="3"/>
<path d="M229 245V144h30v101" fill="#f2d697" fill-opacity=".35"/>
<path d="M139 115h207M134 236h217" stroke="#d1ad70" stroke-width="4"/>
<g stroke="#f1d290" fill="none" stroke-width="3"><path d="M243 53V27m-15 0q0 21 15 21t15-21m-24 0q0 12 9 12t9-12m-18 30h18"/><path d="M228 27v-6m8 6v-6m7 6v-6m8 6v-6m7 6v-6"/></g>
</svg>`;

const html = `<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><title>בונה המקדש — המשחק במבט אחד</title>
<style>
*{box-sizing:border-box}html,body{margin:0;width:${WIDTH}px;background:#0b141e;color:#eff0e5;font-family:"Segoe UI",Arial,sans-serif}
body{background:radial-gradient(ellipse at 15% 4%,#23323a 0,transparent 32%),linear-gradient(160deg,#10202b,#0a1420 55%,#15232b)}
.poster{padding:58px 74px 40px;position:relative;overflow:hidden}
.topline{display:flex;align-items:center;justify-content:space-between;color:#c2c9c9;font-size:24px;letter-spacing:.2px;margin-bottom:29px}
.brand{font-size:24px;color:#dbc191;display:flex;align-items:center;gap:12px}.brand-line{height:2px;width:40px;background:#c5a368}
.pill{background:#173a35;color:#aeebcf;border:1px solid #36735c;border-radius:28px;padding:8px 23px;font-size:22px}
header{position:relative;min-height:268px;padding-left:510px}
.eyebrow{color:#dfbc7a;font-size:26px;margin-bottom:6px;letter-spacing:1px}
h1{font-size:112px;line-height:1.1;margin:0;color:#f6dfab;font-weight:800;letter-spacing:-3px}
.tagline{font-size:37px;margin:14px 0 12px;font-weight:600;color:#f0ecdf;line-height:1.3}
.intro{font-size:25px;line-height:1.65;color:#b8c5ca;margin:0}
.temple{position:absolute;left:0;top:-22px;width:475px;height:290px}
.vision{margin:25px 0 30px;border:1px solid #6d5938;border-right:5px solid #dbb373;border-radius:14px;padding:21px 28px;display:flex;align-items:center;gap:28px;background:linear-gradient(90deg,#332b1d55,#b18c4030)}
.vision-label{font-size:22px;color:#e0bc7c;white-space:nowrap}.vision strong{font-size:30px;color:#fff0ca;font-weight:650}.vision small{font-size:22px;display:block;color:#c4c9bd;margin-top:5px}
.loop{display:grid;grid-template-columns:repeat(4,1fr);gap:22px;margin:0 0 36px}
.loop-item{display:flex;gap:18px;align-items:center;border-bottom:1px solid #44505b;padding:0 0 18px}.loop-item svg{width:48px;height:48px;color:#e0ba78;flex-shrink:0}
.loop-item b{display:block;font-size:26px;margin-bottom:3px}.loop-item span{font-size:20px;color:#aebfc3}
.section-title{display:flex;align-items:center;justify-content:space-between;margin:0 0 18px}.section-title h2{font-size:31px;margin:0;color:#e9e5d9}.section-title p{margin:0;color:#91a5ad;font-size:21px}
.shots{display:grid;grid-template-columns:repeat(4,1fr);gap:21px;margin-bottom:36px}
.shot{margin:0;overflow:hidden;background:#182a35;border:1px solid #38535e;border-radius:13px}
.shot-image{height:184px;position:relative;overflow:hidden;background:#243744}
.shot-image img{width:100%;height:100%;object-fit:cover}
.shot-image.platform img{object-position:50% 65%;transform:scale(1.19)}
.shot-image.construction img{width:160%;max-width:none;object-fit:fill;transform:translateX(0);position:absolute;left:-11%;top:0}
figcaption{padding:13px 16px 17px;display:flex;align-items:center;gap:12px}
figcaption span{font-size:19px;color:#9fddc5;white-space:nowrap}figcaption strong{font-size:24px;font-weight:650}
.roadmap-title{margin-top:6px;margin-bottom:20px}.legend{display:flex;gap:27px;font-size:21px;color:#c6d0cf}.legend span{display:flex;align-items:center;gap:9px}
.dot{width:11px;height:11px;border-radius:50%;display:inline-block}.green{background:#70d5b2}.gold{background:#d9b978}
.chapters{display:grid;gap:14px;position:relative}
.chapter{display:grid;grid-template-columns:270px 1fr 1fr;gap:19px;align-items:center;position:relative}
.chapter-label{display:flex;align-items:center;gap:15px;padding-right:0}
.chapter-index{display:flex;align-items:center;justify-content:center;flex-shrink:0;width:44px;height:44px;border-radius:50%;background:#302e26;border:1px solid #927a4b;color:#ebcf96;font-size:24px}
.chapter-ready .chapter-index{background:#183f36;border-color:#4b987b;color:#aae8cc}
.chapter-label h3{margin:0;font-size:25px;font-weight:650;color:#dfd9c5}.chapter-label p{margin:6px 0 0;font-size:18px;line-height:1.4;color:#90a6ac}
.stage{display:flex;align-items:center;position:relative;min-height:112px;padding:18px 20px;border-radius:13px;gap:17px}
.stage.ready{background:linear-gradient(110deg,#173d3655,#17352e);border:1px solid #3e826c}
.stage.planned{background:linear-gradient(110deg,#263342,#1b2935);border:1px solid #48515a}
.stage-number{width:43px;height:43px;border-radius:10px;border:1px solid #938064;color:#e4c992;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:24px;font-weight:700}
.ready .stage-number{background:#214f40;border-color:#4e9878;color:#afeaca}
.stage-copy{padding-left:63px}.stage h3{font-size:25px;margin:0 0 7px;font-weight:650;color:#f4ebd8;line-height:1.15}
.stage p{font-size:19px;color:#afbec2;margin:0;line-height:1.35}
.stage-status{position:absolute;left:16px;top:16px;border-radius:6px;border:1px solid #756449;color:#d7bc88;font-size:16px;padding:3px 9px;background:#272a26}
.ready .stage-status{color:#9fdfbd;border-color:#426e58;background:#183d2e}
.outcome{margin-top:28px;padding:27px 30px;background:radial-gradient(ellipse at 50% 70%,#5d4c2b88,transparent 75%),#172630;border-radius:16px;border:1px solid #8e744a;display:flex;align-items:center;justify-content:space-between;gap:25px}
.outcome b{font-size:29px;color:#f0d7a3}.outcome p{font-size:23px;color:#c3ccca;line-height:1.5;margin:8px 0 0}.outcome .end-symbol{font-size:49px;color:#e4c88c;letter-spacing:6px;padding:0 25px}
footer{display:flex;justify-content:space-between;margin-top:27px;padding-top:19px;border-top:1px solid #334653;color:#8da3ac;font-size:18px}
</style>
<main class="poster">
<div class="topline"><div class="brand"><span class="brand-line"></span>חזון המשחק ומפת הפיתוח</div><span class="pill">${developed} שלבים משחיקים מתוך ${LEVELS.length} מתוכננים</span></div>
<header><div class="eyebrow">הרפתקה • יצירה • ידע</div><h1>בונה המקדש</h1><p class="tagline">ממדבר סיני אל הבית השלם בירושלים</p><p class="intro">מסע דו־ממדי עם בצלאל, בהשראת Captain Claw.<br>רצים, קופצים, אוספים ובונים — ולומדים מתוך ההרפתקה.</p><div class="temple">${temple}</div></header>
<section class="vision"><div class="vision-label">המטרה</div><div><strong>להפוך את המסע אל המקדש להרפתקה שהשחקן בונה בעצמו.</strong><small>כל חומר שנאסף, כלי שמתגלה וחידה שנפתרת מחברים תחנה נוספת בסיפור.</small></div></section>
<div class="loop">
<div class="loop-item">${icon('move')}<div><b>מתקדמים</b><span>ריצה, קפיצה וגילוי מסלולים</span></div></div>
<div class="loop-item">${icon('collect')}<div><b>אוספים</b><span>חומרים, כלים וניצוצות</span></div></div>
<div class="loop-item">${icon('build')}<div><b>בונים ופותרים</b><span>הרכבה, שופר וחידות סביבה</span></div></div>
<div class="loop-item">${icon('learn')}<div><b>מגלים את הסיפור</b><span>דמויות, פסוקים ומוזיאון ידע</span></div></div>
</div>
<div class="section-title"><h2>כבר אפשר לשחק</h2><p>צילומי מסך מהגרסה הנוכחית</p></div>
<section class="shots">${shots.join('')}</section>
<div class="section-title roadmap-title"><h2>המסע המלא — 7 פרקים, 14 שלבים</h2><div class="legend"><span><i class="dot green"></i>פותח • גרסה משחיקה</span><span><i class="dot gold"></i>מתוכנן להמשך</span></div></div>
<section class="chapters">${rows}</section>
<section class="outcome"><div><b>לא רק להגיע אל הבית — להבין מה בונים בדרך.</b><p>משחק בעברית, ללא הריגת דמויות, עם קושי שעולה בהדרגה.<br>החזון: תנועה, בנייה וידע שמתחברים למסע אחד בעל משמעות.</p></div><div class="end-symbol">אור<br>ובית</div></section>
<footer><span>בונה המקדש • תמונת חזון ומצב פיתוח</span><span>שלבים 1–4 משחיקים; שלבים 5–14 בתכנון • אוקטובר 2026</span></footer>
</main></html>`;

await mkdir(path.join(root, 'tmp'), { recursive: true });
const htmlPath = path.join(root, 'tmp', 'TempleBuilder-Overview.html');
const pngPath = path.join(root, 'TempleBuilder-Overview.png');
await writeFile(htmlPath, html, 'utf8');

const profile = await mkdtemp(path.join(tmpdir(), 'templebuilder-poster-'));
const browser = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
  '--headless=new', '--disable-gpu', '--hide-scrollbars',
  '--remote-debugging-port=9224', '--no-first-run',
  `--user-data-dir=${profile}`, pathToFileURL(htmlPath).href,
], { stdio: 'ignore', windowsHide: true });
browser.on('error', error => { console.error(error); process.exitCode = 1; });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let ws;
try {
  let tabs;
  for (let i = 0; i < 100; i++) {
    try {
      tabs = await (await fetch('http://127.0.0.1:9224/json/list')).json();
      if (tabs.some(t => t.type === 'page')) break;
    } catch {}
    await delay(100);
  }
  const tab = tabs?.find(t => t.type === 'page' && t.url.startsWith('file:'));
  if (!tab) throw new Error('Poster browser did not start');
  ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let sequence = 0;
  const pending = new Map();
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (!m.id || !pending.has(m.id)) return;
    const task = pending.get(m.id); pending.delete(m.id); clearTimeout(task.timer);
    if (m.error) task.reject(new Error(JSON.stringify(m.error))); else task.resolve(m.result);
  };
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(method + ' timed out')); }, 15000);
    pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  await call('Page.enable');
  await call('Page.bringToFront');
  await call('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: 2300, deviceScaleFactor: 1, mobile: false });
  await evaluate('document.fonts.ready');
  await evaluate('Promise.all([...document.images].map(i=>i.decode()))');
  const height = await evaluate('Math.ceil(document.querySelector(".poster").getBoundingClientRect().height)');
  await call('Emulation.setDeviceMetricsOverride', { width: WIDTH, height, deviceScaleFactor: 1, mobile: false });
  await delay(300);
  await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  const issues = await evaluate(`(() => {
    const nodes=[...document.querySelectorAll('h1,h2,h3,.stage p,figcaption,.stage-copy,footer')];
    return nodes.filter(n=>n.scrollWidth>n.clientWidth+2).map(n=>n.textContent);
  })()`);
  if (issues.length) throw new Error('Text overflows: ' + issues.join('; '));
  const counts = await evaluate(`({
    total:document.querySelectorAll('.stage').length,
    ready:document.querySelectorAll('.stage.ready').length,
    screenshots:document.images.length
  })`);
  if (counts.total !== LEVELS.length || counts.ready !== developed || counts.screenshots !== 4) {
    throw new Error('Poster content does not match project metadata');
  }
  const result = await call('Page.captureScreenshot', {
    format: 'png', fromSurface: true,
  });
  const png = Buffer.from(result.data, 'base64');
  if (png.length < 100000) throw new Error('Poster capture appears empty; export aborted');
  await writeFile(pngPath, png);
  console.log(`Created: ${pngPath}\nSize: ${WIDTH} x ${height}\nStages: ${developed} playable, ${LEVELS.length - developed} planned\nNo horizontal text overflow.`);
  await call('Browser.close');
} finally {
  if (ws) ws.close();
  // This handle refers only to the isolated browser spawned by this script.
  if (browser.exitCode === null) browser.kill();
}
