/**
 * tilemap.js — מפת אריחים בשלוש שכבות, בדיוק כמו המבנה של Captain Claw:
 *
 *   BACK   — רקע דקורטיבי, מאחורי כל הישויות
 *   ACTION — שכבת ההתנגשות: רק היא עוצרת את השחקן
 *   FRONT  — חזית שמציירים מעל הישויות, יוצרת עומק
 *
 * המפה מיוצגת כמערך של מחרוזות, תו אחד לכל אריח. זה מאפשר
 * לערוך שלב בעורך טקסט רגיל ולראות את הצורה בעיניים.
 */

import { hashNoise, shade } from '../core/art.js';

export const TILE = 32;
// Physics uses fractional pixels: a 1px inset caused idle/fall flicker.
const EDGE_EPSILON = 0.001;

/**
 * סוגי אריחים בשכבת ACTION.
 *   solid    — חוסם מכל הכיוונים
 *   platform — חוסם רק מלמעלה (אפשר לקפוץ דרכו מלמטה)
 *   hazard   — פוגע בשחקן
 */
export const TILE_DEFS = {
  '.': { solid: false, kind: 'empty' },
  '#': { solid: true,  kind: 'sand'   },  // קרקע חול דחוס
  'R': { solid: true,  kind: 'rock'   },  // סלע מדבר
  'B': { solid: true,  kind: 'brick'  },  // לבנת אבן
  'W': { solid: true,  kind: 'wood'   },  // קרש שיטים
  'H': { solid: true,  kind: 'water'  },  // קיר מים (נפרץ בשופר)
  '=': { solid: false, kind: 'plank', platform: true },  // קרש דק — מעבר מלמטה
  '^': { solid: false, kind: 'spike',  hazard: true  },  // יתדות
  'C': { solid: true,  kind: 'crack'  },  // אבן סדוקה — נשברת באור המטה (שלב 9)
};

export class TileMap {
  /**
   * @param {string[]} back   שכבת רקע
   * @param {string[]} action שכבת התנגשות
   * @param {string[]} front  שכבת חזית
   * @param {object} palette  פלטת הצבעים של השלב
   */
  constructor(back, action, front, palette) {
    this.back = back || [];
    this.action = action || [];
    this.front = front || [];
    this.palette = palette;

    this.rows = this.action.length;
    this.cols = this.action.reduce((m, r) => Math.max(m, r.length), 0);

    this.pixelW = this.cols * TILE;
    this.pixelH = this.rows * TILE;
  }

  /** התו בשכבה נתונה, או '.' מחוץ לתחום */
  charAt(layer, col, row) {
    const rows = this[layer];
    if (row < 0 || row >= rows.length) return '.';
    const line = rows[row];
    if (col < 0 || col >= line.length) return '.';
    return line[col] || '.';
  }

  /** משנה תו בשכבה (למשל פתיחת קיר מים) */
  setChar(layer, col, row, ch) {
    const rows = this[layer];
    if (row < 0 || row >= rows.length) return;
    const line = rows[row];
    if (col < 0 || col >= line.length) return;
    rows[row] = line.substring(0, col) + ch + line.substring(col + 1);
  }

  /** הגדרת האריח בשכבת ACTION */
  defAt(col, row) {
    return TILE_DEFS[this.charAt('action', col, row)] || TILE_DEFS['.'];
  }

  isSolid(col, row) {
    return this.defAt(col, row).solid === true;
  }

  isPlatform(col, row) {
    return this.defAt(col, row).platform === true;
  }

  isHazard(col, row) {
    return this.defAt(col, row).hazard === true;
  }

  /**
   * האם מלבן בקואורדינטות עולם חופף לאריח מוצק כלשהו.
   */
  rectHitsSolid(x, y, w, h) {
    const c0 = Math.floor(x / TILE);
    const c1 = Math.floor((x + w - EDGE_EPSILON) / TILE);
    const r0 = Math.floor(y / TILE);
    const r1 = Math.floor((y + h - EDGE_EPSILON) / TILE);

    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (this.isSolid(c, r)) return true;
      }
    }
    return false;
  }

  /** האם המלבן נוגע באריח מסוכן */
  rectHitsHazard(x, y, w, h) {
    const c0 = Math.floor(x / TILE);
    const c1 = Math.floor((x + w - 1) / TILE);
    const r0 = Math.floor(y / TILE);
    const r1 = Math.floor((y + h - 1) / TILE);

    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (this.isHazard(c, r)) return true;
      }
    }
    return false;
  }

  /**
   * האם יש קרקע מתחת לנקודה — משמש את ה־AI של האויבים
   * כדי שלא ייפלו מקצה מדף.
   */
  hasGroundBelow(x, y) {
    const c = Math.floor(x / TILE);
    const r = Math.floor(y / TILE);
    return this.isSolid(c, r) || this.isPlatform(c, r);
  }

  /** First supporting surface below a point; null over a deep gap. */
  surfaceBelow(x, fromY, maxDistance = 256) {
    const col = Math.floor(x / TILE);
    if (col < 0 || col >= this.cols) return null;
    const first = Math.max(0, Math.floor((fromY - EDGE_EPSILON) / TILE));
    for (let row = first; row < this.rows; row++) {
      const top = row * TILE;
      if (top - fromY > maxDistance) break;
      if (top < fromY - 1) continue;
      if (this.isSolid(col, row) || this.isPlatform(col, row)) return top;
    }
    return null;
  }

  // -------------------------------------------------------------------------
  // רינדור
  // -------------------------------------------------------------------------

  /** מצייר שכבה. `camX/camY` — היסט המצלמה. */
  drawLayer(ctx, layer, camX, camY, viewW, viewH) {
    const rows = this[layer];
    if (!rows.length) return;

    // מציירים רק את האריחים שנראים — הבדל קריטי בביצועים במפה ארוכה
    const c0 = Math.max(0, Math.floor(camX / TILE));
    const c1 = Math.min(this.cols - 1, Math.floor((camX + viewW) / TILE));
    const r0 = Math.max(0, Math.floor(camY / TILE));
    const r1 = Math.min(rows.length - 1, Math.floor((camY + viewH) / TILE));

    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const ch = this.charAt(layer, c, r);
        if (ch === '.' || ch === ' ') continue;
        this._drawTile(ctx, ch, c * TILE - camX, r * TILE - camY, c, r, layer);
      }
    }
  }

  _drawTile(ctx, ch, px, py, col, row, layer) {
    if (this.tilePainter?.(ctx, ch, px, py, col, row, layer, this)) return;
    const p = this.palette;
    const n = hashNoise(col, row);

    switch (ch) {
      case '#': this._sandTile(ctx, px, py, col, row, n, p); break;
      case 'R': this._rockTile(ctx, px, py, n, p); break;
      case 'B': this._brickTile(ctx, px, py, col, row, n); break;
      case 'W': this._woodTile(ctx, px, py, n); break;
      case 'H': this._waterWallTile(ctx, px, py, col, row, n, p); break;
      case '=': this._plankTile(ctx, px, py); break;
      case '^': this._spikeTile(ctx, px, py); break;

      // --- אריחי רקע ---
      case 'd': this._duneTile(ctx, px, py, n, p); break;       // דיונה רחוקה
      case 't': this._tentTile(ctx, px, py, n, p); break;       // אוהל במחנה
      case 'c': this._clothTile(ctx, px, py, n, p); break;      // יריעה

      // --- אריחי חזית ---
      case 'g': this._grassTile(ctx, px, py, n, p); break;      // עשב מדבר
      case 'p': this._postTile(ctx, px, py, p); break;          // יתד אוהל

      default:
        // אריח לא מוכר — מציירים ריבוע מגנטה כדי שיזוהה מיד
        if (layer === 'action') {
          ctx.fillStyle = '#ff00ff';
          ctx.fillRect(px, py, TILE, TILE);
        }
    }
  }

  // ---- אריחי שכבת ACTION ----

  _sandTile(ctx, px, py, col, row, n, p) {
    const topExposed = !this.isSolid(col, row - 1);

    const g = ctx.createLinearGradient(0, py, 0, py + TILE);
    g.addColorStop(0, shade(p.ground, 0.06 + n * 0.08));
    g.addColorStop(1, p.groundDark);
    ctx.fillStyle = g;
    ctx.fillRect(px, py, TILE, TILE);

    if (topExposed) {
      // שפה בהירה — קו החול העליון שתפוס באור
      ctx.fillStyle = shade(p.ground, 0.3);
      ctx.fillRect(px, py, TILE, 4);
      ctx.fillStyle = shade(p.ground, 0.45);
      ctx.fillRect(px, py, TILE, 1.5);

      // גרגרים בודדים
      for (let i = 0; i < 3; i++) {
        const gn = hashNoise(col * 7 + i, row * 13);
        ctx.fillStyle = `rgba(255,240,200,${0.1 + gn * 0.12})`;
        ctx.fillRect(px + gn * (TILE - 3), py + 5 + gn * 6, 2, 1.5);
      }
    }

    // שכבות משקע
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fillRect(px, py + TILE * 0.55 + n * 4, TILE, 2);
  }

  _rockTile(ctx, px, py, n, p) {
    ctx.fillStyle = shade(p.near, 0.05 + n * 0.1);
    ctx.fillRect(px, py, TILE, TILE);

    // פאות משובצות — נותן תחושת סלע חצוב
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + TILE, py);
    ctx.lineTo(px + TILE * 0.6, py + TILE * 0.45);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.moveTo(px + TILE, py + TILE);
    ctx.lineTo(px, py + TILE);
    ctx.lineTo(px + TILE * 0.35, py + TILE * 0.6);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
  }

  _brickTile(ctx, px, py, col, row, n) {
    ctx.fillStyle = shade('#a08a62', n * 0.12 - 0.04);
    ctx.fillRect(px, py, TILE, TILE);

    // שתי שורות לבנים, עם היסט לסירוגין
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    const half = TILE / 2;
    ctx.beginPath();
    ctx.moveTo(px, py + half); ctx.lineTo(px + TILE, py + half);
    ctx.stroke();

    const offset = row % 2 === 0 ? 0 : half;
    ctx.beginPath();
    ctx.moveTo(px + offset, py); ctx.lineTo(px + offset, py + half);
    ctx.moveTo(px + half - offset + (offset ? 0 : half), py + half);
    ctx.lineTo(px + half - offset + (offset ? 0 : half), py + TILE);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.09)';
    ctx.fillRect(px, py, TILE, 1.5);
  }

  _woodTile(ctx, px, py, n) {
    const g = ctx.createLinearGradient(px, 0, px + TILE, 0);
    g.addColorStop(0, '#7a5a32');
    g.addColorStop(0.5, shade('#9a7442', n * 0.12));
    g.addColorStop(1, '#6a4c28');
    ctx.fillStyle = g;
    ctx.fillRect(px, py, TILE, TILE);

    // סיבי עץ אנכיים — קרשי המשכן עומדים
    ctx.strokeStyle = 'rgba(0,0,0,0.16)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const gx = px + (TILE * i) / 4;
      ctx.beginPath();
      ctx.moveTo(gx, py);
      ctx.lineTo(gx + Math.sin(n * 6 + i) * 1.5, py + TILE);
      ctx.stroke();
    }

    // ציפוי זהב דק בקצה — קרשי המשכן היו מצופים זהב
    ctx.fillStyle = 'rgba(255,210,74,0.22)';
    ctx.fillRect(px, py, TILE, 2);
  }

  /** קיר מים עומד — כחול שקוף עם בועות */
  _waterWallTile(ctx, px, py, col, row, n, p) {
    const accent = p.accent || '#3fb8d0';
    ctx.save();
    ctx.globalAlpha = 0.55;
    const g = ctx.createLinearGradient(px, py, px + TILE, py);
    g.addColorStop(0, shade(accent, -0.25));
    g.addColorStop(0.5, shade(accent, 0.15));
    g.addColorStop(1, shade(accent, -0.2));
    ctx.fillStyle = g;
    ctx.fillRect(px, py, TILE, TILE);

    // גלים אנכיים
    ctx.strokeStyle = 'rgba(200,240,255,0.35)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) {
      const gx = px + 6 + i * 9 + n * 3;
      ctx.beginPath();
      ctx.moveTo(gx, py);
      ctx.quadraticCurveTo(gx + 3, py + TILE * 0.5, gx - 2, py + TILE);
      ctx.stroke();
    }

    // בועה
    if (n > 0.55) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.arc(px + 8 + n * 14, py + 6 + n * 18, 1.6 + n, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _plankTile(ctx, px, py) {
    const g = ctx.createLinearGradient(0, py, 0, py + 10);
    g.addColorStop(0, '#a8834a');
    g.addColorStop(1, '#6a4c28');
    ctx.fillStyle = g;
    ctx.fillRect(px, py, TILE, 9);

    ctx.fillStyle = 'rgba(255,220,150,0.3)';
    ctx.fillRect(px, py, TILE, 1.5);

    // חיבורי מתכת בקצוות
    ctx.fillStyle = '#8a8a92';
    ctx.fillRect(px + 2, py + 2, 3, 5);
    ctx.fillRect(px + TILE - 5, py + 2, 3, 5);
  }

  _spikeTile(ctx, px, py) {
    ctx.fillStyle = '#5a4a3a';
    ctx.fillRect(px, py + TILE - 5, TILE, 5);

    const n = 4;
    for (let i = 0; i < n; i++) {
      const sx = px + (TILE / n) * i;
      ctx.beginPath();
      ctx.moveTo(sx, py + TILE - 4);
      ctx.lineTo(sx + TILE / n / 2, py + TILE * 0.3);
      ctx.lineTo(sx + TILE / n, py + TILE - 4);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, py + TILE * 0.3, 0, py + TILE);
      g.addColorStop(0, '#e8e4dc');
      g.addColorStop(1, '#7a7268');
      ctx.fillStyle = g;
      ctx.fill();
    }
  }

  // ---- אריחי שכבת BACK ----

  _duneTile(ctx, px, py, n, p) {
    ctx.fillStyle = shade(p.mid, n * 0.1 - 0.02);
    ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = `rgba(255,235,190,${0.05 + n * 0.06})`;
    ctx.fillRect(px, py, TILE, 3);
  }

  _tentTile(ctx, px, py, n, p) {
    // אוהל שחור של עור עיזים — צורת משולש
    ctx.beginPath();
    ctx.moveTo(px + TILE / 2, py + 2);
    ctx.lineTo(px + TILE, py + TILE);
    ctx.lineTo(px, py + TILE);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, py, 0, py + TILE);
    g.addColorStop(0, shade('#4a3a2e', n * 0.18));
    g.addColorStop(1, '#2e2419');
    ctx.fillStyle = g;
    ctx.fill();

    // פתח האוהל
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.moveTo(px + TILE / 2, py + TILE * 0.45);
    ctx.lineTo(px + TILE * 0.66, py + TILE);
    ctx.lineTo(px + TILE * 0.34, py + TILE);
    ctx.closePath();
    ctx.fill();

    // חבל מתוח
    ctx.strokeStyle = 'rgba(200,180,140,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + TILE / 2, py + 3);
    ctx.lineTo(px + TILE - 1, py + TILE - 1);
    ctx.stroke();
  }

  _clothTile(ctx, px, py, n, p) {
    // יריעת תכלת/ארגמן פרושה ברקע
    const colors = ['#2f6f9e', '#7a3f8a', '#8a2f2f'];
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = colors[Math.floor(n * colors.length) % colors.length];
    ctx.fillRect(px, py, TILE, TILE);
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#fff';
    ctx.fillRect(px, py + (n * TILE) % TILE, TILE, 2);
    ctx.restore();
  }

  // ---- אריחי שכבת FRONT ----

  _grassTile(ctx, px, py, n, p) {
    ctx.strokeStyle = 'rgba(120,110,70,0.55)';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 5; i++) {
      const gn = hashNoise(px + i * 3, py);
      const gx = px + gn * TILE;
      const gh = 7 + gn * 9;
      ctx.beginPath();
      ctx.moveTo(gx, py + TILE);
      ctx.quadraticCurveTo(gx + 2, py + TILE - gh * 0.6, gx + (gn > 0.5 ? 4 : -4), py + TILE - gh);
      ctx.stroke();
    }
  }

  _postTile(ctx, px, py, p) {
    // יתד אוהל — עמוד עם קשר חבל
    ctx.fillStyle = '#6a5438';
    ctx.fillRect(px + TILE / 2 - 2, py, 4, TILE);
    ctx.fillStyle = '#8a7048';
    ctx.fillRect(px + TILE / 2 - 2, py, 1.5, TILE);
    ctx.strokeStyle = 'rgba(190,170,130,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + TILE / 2, py + 6);
    ctx.lineTo(px + TILE, py + TILE);
    ctx.stroke();
  }
}
