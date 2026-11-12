/**
 * make-icon.mjs — מייצר assets/icon.ico: חזית בית המקדש.
 *
 * הרצה:  node tools/make-icon.mjs
 *
 * האייקון מצויר בקוד (אין תמונת מקור): שמיים, שני אגפי עמודים,
 * חזית עם ארבעה עמודים מסולסלים, גג משונן, דלת מקושתת ומדרגות.
 *
 * נוצר בכמה גדלים (16..256) ולא רק ב-256: כך הוא חד גם בשולחן
 * העבודה, ולא רק כשהוא גדול. ללא ספריות חיצוניות — פיקסלים ידניים
 * עם דגימת-על, PNG דרך zlib, ועטיפת ICO.
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DESIGN = 256;                 // מערכת הקואורדינטות של העיצוב
const SIZES = [256, 64, 48, 32, 16];

// ---------------------------------------------------------------------------
// כלי עזר
// ---------------------------------------------------------------------------

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => Math.max(0, Math.min(1, t));
const mix = (c1, c2, t) => c1.map((v, i) => Math.round(lerp(v, c2[i], clamp01(t))));

const rect = (x0, y0, x1, y1) => (x, y) => x >= x0 && x < x1 && y >= y0 && y < y1;
const disc = (cx, cy, r) => (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
const union = (...fns) => (x, y) => fns.some(f => f(x, y));

/** שכבות, מלמטה למעלה. כל שכבה מחזירה צבע או null. */
const LAYERS = [];
const add = (inside, color) =>
  LAYERS.push((x, y) => (inside(x, y) ? (typeof color === 'function' ? color(x, y) : color) : null));

// ---------------------------------------------------------------------------
// פלטת צבעים
// ---------------------------------------------------------------------------

const SKY_TOP   = [104, 164, 214];
const SKY_BOT   = [246, 226, 178];
const SAND_LT   = [240, 202, 128];
const SAND_MID  = [214, 166, 88];
const SAND_DK   = [170, 122, 58];
const SAND_SIDE = [188, 138, 70];
const GOLD      = [255, 216, 112];
const GOLD_DK   = [226, 172, 70];
const DOOR_DK   = [78, 44, 26];
const DOOR      = [128, 70, 42];
const STEP_1    = [232, 196, 136];
const STEP_2    = [214, 174, 112];
const STEP_3    = [190, 148, 88];
const RING      = [201, 162, 39];
const OUTLINE   = [58, 38, 12];

// ---------------------------------------------------------------------------
// העיצוב
// ---------------------------------------------------------------------------

// רקע: שמיים בהדרגה, ושני עננים
add(disc(128, 128, 122), (x, y) => mix(SKY_TOP, SKY_BOT, (y - 20) / 190));
add((x, y) => ((x - 56) / 24) ** 2 + ((y - 66) / 8) ** 2 <= 1, [255, 255, 255]);
add((x, y) => ((x - 204) / 20) ** 2 + ((y - 84) / 7) ** 2 <= 1, [255, 255, 255]);

/** עמוד מסולסל: פסים אלכסוניים בגוון בהיר וכהה */
const twist = (x, y, lt, dk) => ((y * 0.9 + x * 0.45) % 10 < 5 ? lt : dk);

// --- אגפי העמודים בצדדים ---
for (const side of [-1, 1]) {
  const m = (x) => (side < 0 ? x : DESIGN - x);          // שיקוף אופקי
  const x0 = Math.min(m(40), m(84)), x1 = Math.max(m(40), m(84));

  add(rect(x0, 124, x1, 196), SAND_SIDE);                  // קיר אחורי
  add(rect(Math.min(m(42), m(82)), 119, Math.max(m(42), m(82)), 127), GOLD_DK);   // קורה

  for (const cx of [50, 62, 74]) {
    const px = m(cx);
    add(rect(px - 3.5, 127, px + 3.5, 196),
        (x, y) => twist(x, y, [226, 178, 100], [176, 128, 64]));
    add(rect(px - 5, 127, px + 5, 131), GOLD_DK);          // כותרת
  }
}

// --- החזית המרכזית ---
add(rect(84, 84, 172, 196), (x, y) => mix(SAND_LT, SAND_MID, (y - 84) / 112));
add(rect(80, 62, 176, 84), SAND_MID);                      // קיר עליון

// כרכוב מעוטר: משבצות קטנות בזהב
add(rect(76, 50, 180, 62), (x, y) =>
  (Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0 ? GOLD : GOLD_DK);

// שיני הגג
add((x, y) => {
  if (y < 41 || y >= 50 || x < 80 || x >= 176) return false;
  const idx = Math.floor((x - 80) / 8);
  const cx = 80 + idx * 8 + 4;
  return Math.abs(x - cx) <= ((y - 41) / 9) * 4;
}, GOLD);

// --- הדלת המקושתת ---
add(union(rect(114, 126, 142, 196), disc(128, 126, 14)), GOLD);       // מסגרת
add(union(rect(118, 128, 138, 196), disc(128, 128, 10)), DOOR_DK);    // שקע
add(union(rect(121, 131, 135, 196), disc(128, 131, 7)), DOOR);        // הדלת
add(rect(127.2, 124, 128.8, 196), DOOR_DK);                           // קו מרכזי

// --- ארבעת העמודים הראשיים ---
for (const cx of [92, 106, 150, 164]) {
  add(rect(cx - 4.5, 92, cx + 4.5, 191),
      (x, y) => twist(x, y, [248, 214, 148], [204, 154, 80]));
  add(rect(cx - 6.5, 86, cx + 6.5, 92), GOLD);             // כותרת
  add(rect(cx - 6.5, 84, cx + 6.5, 86), GOLD_DK);
  add(rect(cx - 6.5, 191, cx + 6.5, 196), SAND_DK);        // בסיס
}

// --- מדרגות ---
add(rect(80, 196, 176, 203), STEP_1);
add(rect(74, 203, 182, 210), STEP_2);
add(rect(70, 210, 186, 217), STEP_3);

// --- מסגרת עגולה: טבעת זהב וקו חיצוני כהה שמבליט את האייקון על כל רקע ---
add((x, y) => { const d = Math.hypot(x - 128, y - 128); return d >= 111 && d < 118; }, RING);
add((x, y) => { const d = Math.hypot(x - 128, y - 128); return d >= 118 && d <= 122; }, OUTLINE);

// ---------------------------------------------------------------------------
// רינדור
// ---------------------------------------------------------------------------

function sample(x, y) {
  let c = null;
  for (const layer of LAYERS) {
    const v = layer(x, y);
    if (v) c = v;
  }
  return c;
}

function render(size) {
  const scale = size / DESIGN;
  const ss = size >= 128 ? 3 : 4;      // בגדלים קטנים צריך יותר דגימות להחלקה
  const rgba = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, hits = 0;

      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const dx = (x + (sx + 0.5) / ss) / scale;
          const dy = (y + (sy + 0.5) / ss) / scale;
          const c = sample(dx, dy);
          if (!c) continue;
          r += c[0]; g += c[1]; b += c[2]; hits++;
        }
      }

      if (hits > 0) {
        const i = (y * size + x) * 4;
        rgba[i]     = Math.round(r / hits);
        rgba[i + 1] = Math.round(g / hits);
        rgba[i + 2] = Math.round(b / hits);
        rgba[i + 3] = Math.round((hits / (ss * ss)) * 255);
      }
    }
  }
  return rgba;
}

// ---------------------------------------------------------------------------
// קידוד PNG ו-ICO
// ---------------------------------------------------------------------------

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(rgba, size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // עומק ביט
  ihdr[9] = 6;   // RGBA

  const stride = size * 4 + 1;           // כל שורה מתחילה בבית פילטר
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0;
    rgba.copy(raw, y * stride + 1, y * size * 4, (y + 1) * size * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const images = SIZES.map(size => ({ size, png: encodePng(render(size), size) }));

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);                // שמור
header.writeUInt16LE(1, 2);                // סוג: אייקון
header.writeUInt16LE(images.length, 4);    // כמות תמונות

let offset = header.length + 16 * images.length;
const entries = images.map(({ size, png }) => {
  const e = Buffer.alloc(16);
  e[0] = size >= 256 ? 0 : size;           // 256 מקודד כ-0
  e[1] = size >= 256 ? 0 : size;
  e.writeUInt16LE(1, 4);                   // planes
  e.writeUInt16LE(32, 6);                  // bits per pixel
  e.writeUInt32LE(png.length, 8);
  e.writeUInt32LE(offset, 12);
  offset += png.length;
  return e;
});

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'assets');
mkdirSync(outDir, { recursive: true });

writeFileSync(path.join(outDir, 'icon.ico'),
  Buffer.concat([header, ...entries, ...images.map(i => i.png)]));
writeFileSync(path.join(outDir, 'icon.png'), images[0].png);
writeFileSync(path.join(outDir, 'icon-32.png'), images.find(i => i.size === 32).png);

console.log(`נוצר assets/icon.ico עם ${images.length} גדלים: ` +
  images.map(i => `${i.size}px (${i.png.length}B)`).join(', '));
