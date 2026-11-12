/**
 * hud.js — ממשק המשתמש בתוך המשחק.
 *
 * מצויר בקואורדינטות מסך (לא עולם), מעל כל השכבות.
 *
 * פריסה (עברית — RTL):
 *   למעלה בימין  — רשימת 15 מצרכי המשכן (שמות כ״ה, ג׳–ז׳). מצרך שנאסף נדלק.
 *   למעלה בשמאל  — לבבות וחיים
 *   למטה          — כלי קודש, ניצוצות ורמז מקשים
 * כולל גם את "תיבת הדיאלוג" של דמויות ה־NPC ואת באנר ההודעות.
 */

import { text, roundRect, circle, glow, drawMaterial } from '../core/art.js';
import { MATERIALS, getMaterial } from '../data/materials.js';

const COLS = 8;
const CELL = 28;
const PAD = 8;
const TITLE_H = 20;

export class HUD {
  constructor(viewW, viewH) {
    this.w = viewW;
    this.h = viewH;

    /** הודעת באנר זמנית (למשל "כלי קודש נאסף") */
    this._banner = null;
    this._bannerTime = 0;

    /** דיאלוג פעיל של NPC */
    this.dialog = null;
    this._dialogChars = 0;

    /** הבהוב של מצרך שנאסף כרגע: { [kind]: שניות שנותרו } */
    this._pulse = {};
  }

  /** מציג באנר במרכז המסך למשך `dur` שניות */
  showBanner(title, subtitle = '', dur = 2.6) {
    this._banner = { title, subtitle };
    this._bannerTime = dur;
    this._bannerMax = dur;
  }

  /** מדליק הבהוב על תא מצרך ברשימה */
  pulseMaterial(kind) {
    this._pulse[kind] = 0.9;
  }

  /**
   * פותח תיבת דיאלוג. נסגרת בלחיצת confirm.
   * @param {string} speaker שם הדובר
   * @param {string[]} lines שורות הטקסט
   */
  showDialog(speaker, lines) {
    this.dialog = { speaker, lines, page: 0 };
    this._dialogChars = 0;
  }

  get dialogOpen() {
    return this.dialog !== null;
  }

  /** מקדם את הדיאלוג. @returns true אם נסגר */
  advanceDialog() {
    if (!this.dialog) return false;

    const full = this.dialog.lines[this.dialog.page] || '';
    // לחיצה ראשונה — משלימה את אנימציית ההקלדה
    if (this._dialogChars < full.length) {
      this._dialogChars = full.length;
      return false;
    }

    this.dialog.page++;
    this._dialogChars = 0;

    if (this.dialog.page >= this.dialog.lines.length) {
      this.dialog = null;
      return true;
    }
    return false;
  }

  update(dt) {
    if (this._bannerTime > 0) {
      this._bannerTime -= dt;
      if (this._bannerTime <= 0) this._banner = null;
    }

    if (this.dialog) {
      const full = this.dialog.lines[this.dialog.page] || '';
      // ~45 תווים בשנייה
      this._dialogChars = Math.min(full.length, this._dialogChars + dt * 45);
    }

    for (const k of Object.keys(this._pulse)) {
      this._pulse[k] -= dt;
      if (this._pulse[k] <= 0) delete this._pulse[k];
    }
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} st מצב: { health, maxHealth, lives, materials:Set, relics,
   *                           sparks, maxSparks, levelName, pointer }
   */
  draw(ctx, st) {
    this._drawTopBar(ctx, st);
    if (st.water) this._drawWaterGauge(ctx, st);
    else if (!st.hideMaterials) this._drawMaterials(ctx, st);
    if (st.stones != null) this._drawStones(ctx, st);
    if (st.harvest) this._drawHarvest(ctx, st.harvest);
    this._drawBottomBar(ctx, st);
    if (this._banner) this._drawBanner(ctx);
    if (this.dialog) this._drawDialog(ctx);
  }

  /** מד מים עולה — כשהוא מלא, המים חוזרים */
  _drawWaterGauge(ctx, st) {
    const w = st.water;
    const panelW = 200;
    const panelH = 52;
    const panelX = this.w - 12 - panelW;
    const panelY = 8;
    const ratio = Math.max(0, Math.min(1, w.fill));

    ctx.save();
    roundRect(ctx, panelX, panelY, panelW, panelH, 8);
    ctx.fillStyle = 'rgba(8,18,28,0.72)';
    ctx.fill();
    ctx.strokeStyle = ratio > 0.75 ? 'rgba(255,120,80,0.7)' : 'rgba(63,184,208,0.55)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();

    text(ctx, 'שִׁיבַת הַמַּיִם', panelX + panelW - 10, panelY + 14, {
      size: 12, color: '#a8d8e8', align: 'right', weight: '700', outlineWidth: 2,
    });

    const barX = panelX + 12;
    const barY = panelY + 26;
    const barW = panelW - 24;
    const barH = 14;

    ctx.save();
    roundRect(ctx, barX, barY, barW, barH, 4);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fill();

    if (ratio > 0) {
      roundRect(ctx, barX, barY, Math.max(4, barW * ratio), barH, 4);
      const g = ctx.createLinearGradient(barX, 0, barX + barW, 0);
      g.addColorStop(0, '#2a8ab0');
      g.addColorStop(0.6, '#3fb8d0');
      g.addColorStop(1, ratio > 0.8 ? '#ff8a5a' : '#7ad8f0');
      ctx.fillStyle = g;
      ctx.fill();
    }
    ctx.restore();

    const sec = Math.max(0, Math.ceil(w.remaining));
    text(ctx, `${sec} שְׁנִיּוֹת`, panelX + panelW / 2, barY + barH / 2, {
      size: 11, color: '#ffffff', weight: '700', outlineWidth: 2,
    });
  }

  /** מונה 12 האבנים */
  _drawStones(ctx, st) {
    const y = st.water ? 68 : 8;
    const label = `אֲבָנִים  ${st.stones}/${st.maxStones ?? 12}`;
    const panelX = this.w - 12 - 160;
    ctx.save();
    roundRect(ctx, panelX, y, 160, 28, 6);
    ctx.fillStyle = 'rgba(12,9,6,0.62)';
    ctx.fill();
    ctx.strokeStyle = st.stones >= (st.maxStones ?? 12)
      ? 'rgba(255,217,100,0.7)' : 'rgba(168,200,180,0.45)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    text(ctx, label, panelX + 148, y + 14, {
      size: 13, color: st.stones >= (st.maxStones ?? 12) ? '#ffe9a8' : '#d0e0d0',
      align: 'right', weight: '700', outlineWidth: 2,
    });
  }

  _drawHarvest(ctx, harvest) {
    const x = this.w - 248;
    ctx.save();
    roundRect(ctx, x, 8, 236, 66, 8);
    ctx.fillStyle = 'rgba(23,30,15,0.85)'; ctx.fill();
    ctx.strokeStyle = '#bda65d'; ctx.lineWidth = 1.3; ctx.stroke();
    text(ctx, `שעורים: ${harvest.count} מתוך ${harvest.required} אגודות`, x + 222, 29, {
      size: 14, align: 'right', color: '#ffe2a0',
    });
    text(ctx, harvest.challenge ? '✓ אתגר השופר הושלם' : 'X שופר חושף את השדה', x + 222, 54, {
      size: 12, align: 'right', color: '#d4dfaf',
    });
    ctx.restore();
  }

  _drawTopBar(ctx, st) {
    const pad = 16;

    // רקע מדורג — מבטיח קריאות מעל כל נוף
    const g = ctx.createLinearGradient(0, 0, 0, 104);
    g.addColorStop(0, 'rgba(10,8,6,0.72)');
    g.addColorStop(1, 'rgba(10,8,6,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.w, 104);

    // --- לבבות (שמאל) ---
    const heartR = 9;
    for (let i = 0; i < st.maxHealth; i++) {
      const hx = pad + heartR + i * (heartR * 2 + 7);
      const hy = pad + heartR;
      this._drawHeart(ctx, hx, hy, heartR, i < st.health);
    }

    // --- חיים ---
    text(ctx, `חַיִּים: ${st.lives}`, pad, pad + 38, {
      size: 14, color: '#f0d9a0', align: 'left',
    });

    // --- שם השלב (מרכז) ---
    if (st.levelName) {
      text(ctx, st.levelName, this.w / 2, pad + 12, {
        size: 15, color: 'rgba(240,226,192,0.65)', weight: '500',
      });
    }
  }

  /**
   * רשימת מצרכי המשכן (15 תאים, 2 שורות). התא הראשון בימין — סדר הפסוקים.
   * ריחוף בעכבר מציג את שם המצרך ואת מקורו.
   */
  _drawMaterials(ctx, st) {
    const rows = Math.ceil(MATERIALS.length / COLS);
    const panelW = COLS * CELL + PAD * 2;
    const panelH = TITLE_H + rows * CELL + PAD;
    const panelX = this.w - 12 - panelW;
    const panelY = 8;

    ctx.save();
    roundRect(ctx, panelX, panelY, panelW, panelH, 8);
    ctx.fillStyle = 'rgba(12,9,6,0.62)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(201,162,39,0.4)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    const found = st.materials ? st.materials.size : 0;
    text(ctx, `מַצְרָכִים לַמִּשְׁכָּן  ${found}/${MATERIALS.length}`,
      panelX + panelW - PAD, panelY + 11, {
        size: 12, color: found === MATERIALS.length ? '#ffe9a8' : '#d9c49a',
        align: 'right', weight: '700', outlineWidth: 2,
      });

    let hovered = null;
    const ptr = st.pointer;

    MATERIALS.forEach((m, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const cx = panelX + panelW - PAD - col * CELL - CELL / 2;   // RTL: תא 0 בימין
      const cy = panelY + TITLE_H + row * CELL + CELL / 2;

      const has = st.materials && st.materials.has(m.id);
      const pulse = this._pulse[m.id] || 0;

      if (ptr && ptr.inside
          && ptr.x >= cx - CELL / 2 && ptr.x < cx + CELL / 2
          && ptr.y >= cy - CELL / 2 && ptr.y < cy + CELL / 2) {
        hovered = { m, has };
      }

      ctx.save();
      circle(ctx, cx, cy, CELL / 2 - 2, has ? 'rgba(201,162,39,0.20)' : 'rgba(255,255,255,0.05)');

      if (pulse > 0) glow(ctx, cx, cy, CELL, '#ffe9a8', Math.min(0.7, pulse));

      ctx.globalAlpha = has ? 1 : 0.26;
      drawMaterial(ctx, m.id, cx, cy, has ? 20 + pulse * 6 : 18);
      ctx.restore();

      if (has && st.materialCounts) {
        text(ctx,String(st.materialCounts[m.id]||0),cx+9,cy+9,{size:10,color:'#fff',outlineWidth:2});
      } else if (has) {
        // סימן ✓ קטן
        circle(ctx, cx + 8, cy + 8, 4, '#4caf6a');
        ctx.save();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(cx + 6, cy + 8); ctx.lineTo(cx + 7.5, cy + 9.6); ctx.lineTo(cx + 10, cy + 6.4);
        ctx.stroke();
        ctx.restore();
      }
    });

    if (hovered) {
      const label = `${hovered.m.name}  ·  ${hovered.m.source}`;
      const tipY = panelY + panelH + 6;
      ctx.save();
      ctx.font = '600 13px "Segoe UI", "Arial Hebrew", Arial, sans-serif';
      const tw = ctx.measureText(label).width + 28;
      ctx.restore();

      ctx.save();
      roundRect(ctx, panelX + panelW - tw, tipY, tw, 26, 6);
      ctx.fillStyle = 'rgba(12,9,6,0.9)';
      ctx.fill();
      ctx.strokeStyle = '#c9a227';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      text(ctx, label, panelX + panelW - 14, tipY + 13, {
        size: 13, color: hovered.has ? '#ffe9a8' : '#a89878', align: 'right', outline: null,
      });
    }
  }

  _drawHeart(ctx, cx, cy, r, filled) {
    ctx.save();
    ctx.translate(cx, cy);

    ctx.beginPath();
    ctx.moveTo(0, r * 0.75);
    ctx.bezierCurveTo(-r * 1.3, -r * 0.25, -r * 0.55, -r * 1.25, 0, -r * 0.4);
    ctx.bezierCurveTo(r * 0.55, -r * 1.25, r * 1.3, -r * 0.25, 0, r * 0.75);
    ctx.closePath();

    if (filled) {
      const g = ctx.createLinearGradient(0, -r, 0, r);
      g.addColorStop(0, '#ff6b5a');
      g.addColorStop(1, '#b8302a');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(200,160,140,0.45)';
    }
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  _drawBottomBar(ctx, st) {
    const pad = 16;
    const y = this.h - pad - 10;

    const g = ctx.createLinearGradient(0, this.h - 56, 0, this.h);
    g.addColorStop(0, 'rgba(10,8,6,0)');
    g.addColorStop(1, 'rgba(10,8,6,0.66)');
    ctx.fillStyle = g;
    ctx.fillRect(0, this.h - 56, this.w, 56);

    // כלי קודש (ימין)
    text(ctx, `כְּלֵי קֹדֶשׁ  ${st.relics}/14`, this.w - pad, y, {
      size: 14, color: '#d9c49a', align: 'right',
    });

    // ניצוצות (שמאל)
    text(ctx, `✨ ${st.sparks}/${st.maxSparks}`, pad, y, {
      size: 14, color: '#d9c49a', align: 'left',
    });

    // תזכורת מקשים (מרכז) — בנייד הכפתורים על המסך מחליפים את Z/X
    const hints = st.touch
      ? (st.hasShofar
        ? 'מטה · שופר · קפיצה · שיחה — כפתורים למטה'
        : 'מטה · קפיצה · שיחה — כפתורים למטה')
      : (st.hasShofar
        ? 'Z מטה · X שופר · רווח קפיצה · Enter שיחה · ESC תפריט'
        : 'Z אור · רווח קפיצה · Enter שיחה · ESC עזרה ודמויות');
    text(ctx, hints, this.w / 2, y, {
      size: 12, color: 'rgba(200,180,140,0.45)', weight: '500', outlineWidth: 2,
    });
  }

  _drawBanner(ctx) {
    const t = this._bannerTime;
    const max = this._bannerMax;
    // דהייה פנימה ב־0.3 שניות הראשונות, החוצה ב־0.5 האחרונות
    const fadeIn = Math.min(1, (max - t) / 0.3);
    const fadeOut = Math.min(1, t / 0.5);
    const a = Math.min(fadeIn, fadeOut);

    const cy = this.h * 0.3;
    ctx.save();
    ctx.globalAlpha = a;

    glow(ctx, this.w / 2, cy, 280, '#ffd964', 0.2);

    text(ctx, this._banner.title, this.w / 2, cy, {
      size: 30, color: '#ffe9a8', weight: '700', outlineWidth: 5,
    });

    if (this._banner.subtitle) {
      text(ctx, this._banner.subtitle, this.w / 2, cy + 32, {
        size: 16, color: '#d9c49a', outlineWidth: 4,
      });
    }

    ctx.restore();
  }

  _drawDialog(ctx) {
    const d = this.dialog;
    const boxH = 118;
    const boxY = this.h - boxH - 26;
    const boxX = 48;
    const boxW = this.w - 96;

    // מסגרת
    ctx.save();
    roundRect(ctx, boxX, boxY, boxW, boxH, 10);
    ctx.fillStyle = 'rgba(18,14,10,0.93)';
    ctx.fill();
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // תג שם הדובר
    const tagW = 190, tagH = 28;
    const tagX = boxX + boxW - tagW - 18;
    ctx.save();
    roundRect(ctx, tagX, boxY - tagH / 2, tagW, tagH, 6);
    ctx.fillStyle = '#c9a227';
    ctx.fill();
    ctx.restore();

    text(ctx, d.speaker, tagX + tagW / 2, boxY, {
      size: 15, color: '#1a1208', weight: '700', outline: null,
    });

    // גוף הטקסט עם אנימציית הקלדה
    const full = d.lines[d.page] || '';
    const shown = full.slice(0, Math.floor(this._dialogChars));

    this._wrapText(ctx, shown, boxX + boxW - 24, boxY + 42, boxW - 48, 25, {
      size: 17, color: '#f0e2c0', align: 'right',
    });

    // חיווי "המשך" — מהבהב רק כשהשורה הושלמה
    if (this._dialogChars >= full.length) {
      const blink = 0.5 + Math.sin(Date.now() / 200) * 0.5;
      ctx.save();
      ctx.globalAlpha = blink;
      text(ctx, '▼ Enter / לחיצה', boxX + 24, boxY + boxH - 18, {
        size: 13, color: '#c9a227', align: 'left',
      });
      ctx.restore();
    }
  }

  /** שבירת שורות לפי רוחב מקסימלי */
  _wrapText(ctx, str, x, y, maxW, lineH, opts) {
    const words = str.split(' ');
    let line = '';
    let cy = y;

    const width = (s) => {
      ctx.save();
      ctx.font = `${opts.size}px "Segoe UI", "Arial Hebrew", Arial, sans-serif`;
      const w = ctx.measureText(s).width;
      ctx.restore();
      return w;
    };

    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (width(test) > maxW && line) {
        text(ctx, line, x, cy, opts);
        line = word;
        cy += lineH;
      } else {
        line = test;
      }
    }
    if (line) text(ctx, line, x, cy, opts);
  }
}

// getMaterial נשמר כייצוא נוח לבדיקות
export { getMaterial };
