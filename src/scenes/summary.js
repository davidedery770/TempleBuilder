/**
 * summary.js — מסך סיום שלב.
 *
 * כאן, ורק כאן, הידע ההיסטורי מוצג. במהלך המשחק האיסוף לא עצר
 * כלום; עכשיו השחקן נח, ויכול לקרוא אם בא לו.
 */

import { getLevel } from '../data/levels.js';
import { getCard, CODEX_TYPES } from '../data/codex.js';
import { text, roundRect, glow, circle } from '../core/art.js';
import { ButtonSet } from '../core/ui.js';
import { MATERIALS } from '../data/materials.js';
import { drawLearningIcon } from '../core/learningArt.js';
import { drawParchment, drawSelectionBackdrop } from '../core/selectionArt.js';
/** Three generously spaced lines per page; keep every word of the original. */
export function summaryTextPages(ctx, body, width) {
  ctx.save();
  ctx.font = '500 16px "Segoe UI", "Arial Hebrew", Arial, sans-serif';
  const lines = [];
  let line = '';
  for (const word of body.split(/\s+/)) {
    const next = line ? line + ' ' + word : word;
    if (line && ctx.measureText(next).width > width) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  ctx.restore();
  const pages = [];
  for (let i = 0; i < lines.length; i += 3) pages.push(lines.slice(i, i + 3));
  return pages.length ? pages : [[]];
}

export class SummaryScene {
  constructor() {
    this.buttons = new ButtonSet();
  }
  _textPages(ctx) {
    const card = this.cards[this.cardIndex];
    if (!card) return [[]];
    const width = this.game.width - 144;
    if (this._pageCache?.id === card.id && this._pageCache.width === width) return this._pageCache.pages;
    if (!ctx) return [[]]; // Unit callers without a canvas can still navigate safely.
    const pages = summaryTextPages(ctx, card.body, width);
    this._pageCache = { id: card.id, width, pages };
    return pages;
  }

  enter(params) {
    this.levelId = params.levelId;
    this.meta = getLevel(this.levelId);
    this.score = params.score || 0;
    this.materials = params.materials || 0;
    this.stations = params.stations || 0;
    this.maxStations = params.maxStations || 0;
    this.construction = !!params.construction;
    this.camp = !!params.camp;
    this.harvest = params.harvest || null;
    this.orchard = params.orchard || null;
    this.night = params.night || null;
    this.stealth = params.stealth || null;
    this.givon = params.givon || null;
    this.lebanon = params.lebanon || null;
    this.temple = params.temple || null;
    this.materialCounts = params.materialCounts || null;
    this.stones = params.stones ?? null;
    this.showKnowledge = false;
    this.built = params.built || 0;
    this.maxBuilt = params.maxBuilt || 0;
    this.sparks = params.sparks || 0;
    this.maxSparks = params.maxSparks ?? 3;
    this.time = params.time || 0;

    this.cards = (params.cards || []).map(getCard).filter(Boolean);
    this.cardIndex = 0;
    this.cardPage = 0;
    this._pageCache = null;

    this.t = 0;
    // ספירת הניקוד עולה בהדרגה — תחושת תגמול
    this.shownScore = 0;
  }

  update(dt) {
    this.t += dt;

    // האצת מונה הניקוד
    if (this.shownScore < this.score) {
      this.shownScore = Math.min(
        this.score,
        this.shownScore + Math.max(40, this.score * dt * 0.9),
      );
    }

    if (this.scenes.transitioning) return;

    const { input, audio } = this.game;

    // דפדוף בכרטיסיות
    if (this.showKnowledge && this.cards.length > 1) {
      if (input.pressed('left')) {
        this.cardIndex = (this.cardIndex + 1) % this.cards.length;
        this.cardPage = 0;
        audio.menuMove();
      }
      if (input.pressed('right')) {
        this.cardIndex = (this.cardIndex - 1 + this.cards.length) % this.cards.length;
        this.cardPage = 0;
        audio.menuMove();
      }
    }

    const pages = this.showKnowledge ? this._textPages(this.game.ctx) : [[]];
    this.buttons.set([{
      id: 'continue', x: this.game.width / 2 - 120, y: this.game.height - 78, w: 240, h: 38,
      label: 'הַמְּשֵׁךְ', size: 18,
    }, ...(this.cards.length ? [{id:'knowledge',x:690,y:this.game.height-78,w:210,h:38,
      label:this.showKnowledge?'חזרה לאיסוף':'רוצים לדעת עוד?',size:17}]:[]), ...(pages.length > 1 ? [
      { id: 'textNext', x: 60, y: 422, w: 52, h: 26, label: 'הבא', size: 13, disabled: this.cardPage >= pages.length - 1 },
      { id: 'textPrev', x: 120, y: 422, w: 52, h: 26, label: 'קודם', size: 13, disabled: this.cardPage <= 0 },
    ] : [])]);
    const clicked = this.buttons.update(input);
    if(clicked==='knowledge'){this.showKnowledge=!this.showKnowledge;audio.menuMove();return;}
    if (input.pressed('down') || clicked === 'textNext') {
      this.cardPage = Math.min(pages.length - 1, this.cardPage + 1);
    }
    if (input.pressed('up') || clicked === 'textPrev') {
      this.cardPage = Math.max(0, this.cardPage - 1);
    }

    // עברית: החץ הימני = כרטיסיה קודמת (כמו בדפדוף בספר)
    if (input.pressed('confirm') || input.pressed('jump') || clicked === 'continue') {
      // לחיצה ראשונה משלימה את ספירת הניקוד, השנייה יוצאת
      if (this.shownScore < this.score) {
        this.shownScore = this.score;
        return;
      }
      audio.menuPick();
      this.scenes.go('levels', { focus: Math.min(14, this.levelId + 1) });
    }

    if (input.pressed('back')) {
      audio.menuMove();
      this.scenes.go('levels', { focus: Math.min(14, this.levelId + 1) });
    }
  }

  draw(ctx) {
    const W = this.game.width;
    const H = this.game.height;

    // --- רקע ---
    drawSelectionBackdrop(ctx,W,H);

    // קרני אור מהמרכז
    ctx.save();
    ctx.globalAlpha = 0.025;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + this.t * 0.1;
      ctx.save();
      ctx.translate(W / 2, 140);
      ctx.rotate(a);
      ctx.fillStyle = '#ffd964';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-24, -700);
      ctx.lineTo(24, -700);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    // --- כותרת ---
    glow(ctx, W / 2, 56, 260, '#ffd964', 0.2);
    text(ctx, 'הַשָּׁלָב הֻשְׁלַם', W / 2, 52, {
      size: 32, color: '#ffe9a8', weight: '700',
    });
    text(ctx, this.meta.name, W / 2, 84, {
      size: 17, color: '#e6edf4', outline: null,
    });

    // --- כלי הקודש שנאסף ---
    this._relicBadge(ctx, W / 2, 140);

    // --- סטטיסטיקות ---
    this._stats(ctx, W, 212);

    // --- כרטיסיית ידע ---
    if (this.showKnowledge && this.cards.length > 0) {
      this._card(ctx, W, 282);
    } else this._visualCollection(ctx,W,282);

    text(ctx, this.showKnowledge && this.cards.length > 1
      ? '←→ כרטיסיות · ↑↓ דפי טקסט · Enter להמשך'
      : this.showKnowledge && this._textPages(ctx).length > 1 ? '↑↓ דפי טקסט · Enter להמשך' : 'Enter להמשך',
      W / 2, H - 20, { size: 13, color: '#d1dce7', outline: null });
    this.buttons.draw(ctx, this.t);
  }

  _visualCollection(ctx,W,y) {
    drawParchment(ctx,50,y,W-100,172);
    if(this.materialCounts && Object.keys(this.materialCounts).length){
      MATERIALS.forEach((m,i)=>{
        const x=W-130-(i%5)*162,cy=y+29+Math.floor(i/5)*51;
        drawLearningIcon(ctx,m.id,x+37,cy,30);
        text(ctx,`× ${this.materialCounts[m.id]||0}`,x,cy,{size:20,color:'#4d3e2a',outline:null});
        text(ctx,m.short||m.name,x+15,cy+21,{size:11,color:'#675034',outline:null});
      });
      return;
    }
    const entries=this.temple?[['menorah',`${this.temple.puzzles}/3 חִידוֹת אוֹר`],['laver',`${this.temple.rimonim}/${this.temple.total} רִמּוֹנִים`]]
      :this.lebanon?[['boards',`${this.lebanon.cedars}/${this.lebanon.cedarTotal} אֲרָזִים`],['altar',`${this.lebanon.hewn}/${this.lebanon.hewnTotal} אֲבָנִים`]]
      :this.givon?[['menorah',`${this.givon.proverbs}/${this.givon.total} מְשָׁלִים`],['olive',`${this.givon.foxes}/5 שׁוּעָלִים`]]
      :this.stealth?[['table',this.stealth.delivered?'✓':'—']]
      :this.night?[['oil',`${this.night.lit}/${this.night.total}`],['menorah',this.night.challenge?'✓':'—']]
      :this.orchard?[['olive',`${this.orchard.count}/${this.orchard.required}`],['oil',this.orchard.challenge?'✓':'—']]
      :this.harvest?[['grain',`${this.harvest.count}/${this.harvest.required}`],['shofar',this.harvest.challenge?'✓':'—']]
      :this.stones!==null?[['stone',`${this.stones}/12`]]
      :this.construction?[['boards',`${this.built}/${this.maxBuilt}`]]:[];
    entries.forEach(([kind,value],i)=>{
      const x=W/2+(i-(entries.length-1)/2)*200;
      drawLearningIcon(ctx,kind,x,y+62,74);text(ctx,value,x,y+128,{size:27,color:'#4c3c27',outline:null});
    });
    if(!entries.length)text(ctx,'✓',W/2,y+86,{size:64,color:'#557b48',outline:null});
  }

  _relicBadge(ctx, cx, cy) {
    const pulse = 0.35 + Math.sin(this.t * 2.5) * 0.12;
    glow(ctx, cx, cy, 70, '#ffd964', pulse);

    ctx.save();
    circle(ctx, cx, cy, 34, 'rgba(201,162,39,0.18)');
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, 34, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    text(ctx, this.meta.relic.icon, cx, cy + 2, { size: 32, outline: null });
    text(ctx, this.meta.relic.name, cx, cy + 50, {
      size: 17, color: '#ffe9a8', weight: '700',
    });
  }

  _stats(ctx, W, y) {
    const cols = this.construction ? [
      { label: 'נִקּוּד', value: Math.floor(this.shownScore).toLocaleString('he-IL') },
      { label: 'קבוצות הורכבו', value: `${this.built}/${this.maxBuilt}` },
      { label: 'סוגי תרומה שלך', value: `${this.materials}/${MATERIALS.length}` },
      { label: 'זְמַן', value: this._formatTime(this.time) },
    ] : this.harvest ? [
      { label: 'נִקּוּד', value: Math.floor(this.shownScore).toLocaleString('he-IL') },
      { label: 'אגודות שעורים', value: `${this.harvest.count}/${this.harvest.required}` },
      { label: 'אתגר השופר', value: this.harvest.challenge ? '✓' : '—' },
      { label: 'נִיצוֹצוֹת', value: `${this.sparks}/${this.maxSparks}` },
      { label: 'זְמַן', value: this._formatTime(this.time) },
    ] : [
      { label: 'נִקּוּד',    value: Math.floor(this.shownScore).toLocaleString('he-IL') },
      this.temple ? { label: 'רִמּוֹנֵי זָהָב', value: `${this.temple.rimonim}/${this.temple.total}` }
        : this.lebanon ? { label: 'קוֹרוֹת אֶרֶז', value: `${this.lebanon.cedars}/${this.lebanon.cedarTotal}` }
        : this.givon ? { label: 'מְשָׁלִים', value: `${this.givon.proverbs}/${this.givon.total}` }
        : this.stealth ? { label: 'פְּעָמִים שֶׁנִּרְאֵיתֶם', value: String(this.stealth.caught) }
        : this.night ? { label: 'פָּנָסִים דּוֹלְקִים', value: `${this.night.lit}/${this.night.total}` }
        : { label: 'מַצְרָכִים',  value: `${this.materials}/${MATERIALS.length}` },
      { label: this.camp ? 'תרומות ומלאכות' : 'תַּחֲנוֹת יֶדַע', value: `${this.stations}/${this.maxStations}` },
      { label: 'נִיצוֹצוֹת',  value: `${this.sparks}/${this.maxSparks}` },
      { label: 'זְמַן',      value: this._formatTime(this.time) },
    ];

    const totalW = W - 200;
    const colW = totalW / cols.length;

    cols.forEach((c, i) => {
      // RTL: העמודה הראשונה מימין
      const cx = W - 100 - colW * i - colW / 2;

      text(ctx, c.label, cx, y, {
        size: 14, color: '#d1dce7', weight: '600', outline: null,
      });
      text(ctx, c.value, cx, y + 26, {
        size: 24, color: '#ffffff', weight: '700', outline: null,
      });
    });

    // שיא חדש
    const best = this.game.save.bestScore(this.levelId);
    if (this.score >= best && this.score > 0) {
      ctx.save();
      ctx.globalAlpha = 1;
      text(ctx, '★ שִׂיא חָדָשׁ', W / 2, y + 52, {
        size: 14, color: '#ffe29a', weight: '700', outline: null,
      });
      ctx.restore();
    }
  }

  _card(ctx, W, y) {
    const card = this.cards[this.cardIndex];
    if (!card) return;

    const boxX = 50;
    const boxW = W - 100;
    const boxH = 172;

    ctx.save();
    roundRect(ctx, boxX, y, boxW, boxH, 10);
    ctx.fillStyle = '#0c141e';
    ctx.fill();
    ctx.strokeStyle = '#8195a9';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    const type = CODEX_TYPES[card.type] || CODEX_TYPES.concept;
    const right = boxX + boxW - 22;

    // תג סוג הכרטיסייה
    const tagW = 74, tagH = 22;
    ctx.save();
    roundRect(ctx, right - tagW, y + 14, tagW, tagH, 4);
    ctx.fillStyle = type.color;
    ctx.globalAlpha = 0.85;
    ctx.fill();
    ctx.restore();
    text(ctx, type.label, right - tagW / 2, y + 25, {
      size: 12, color: '#15110c', weight: '700', outline: null,
    });

    // כותרת
    text(ctx, card.title, right - tagW - 14, y + 26, {
      size: 21, color: '#ffffff', align: 'right', weight: '700', outline: null,
    });

    text(ctx, card.subtitle, right, y + 50, {
      size: 15, color: '#c3d5e8', align: 'right', weight: '500', outline: null,
    });

    // גוף
    const pages = this._textPages(ctx);
    this.cardPage = Math.max(0, Math.min(this.cardPage, pages.length - 1));
    pages[this.cardPage].forEach((line, i) => text(ctx, line, right, y + 76 + i * 24, {
      size: 16, color: '#f5f7fb', align: 'right', weight: '500', outline: null,
    }));

    // מקור
    text(ctx, card.source, right, y + boxH - 19, {
      size: 12, color: '#bfd2e5', align: 'right', weight: '500', outline: null,
    });

    // חיווי דפדוף
    text(ctx, `כרטיס ${this.cardIndex + 1}/${this.cards.length}` +
      (pages.length > 1 ? ` · עמוד ${this.cardPage + 1}/${pages.length}` : ''),
      pages.length > 1 ? 184 : boxX + 12, y + boxH - 19,
      { size: 12, color: '#d1dce7', align: 'left', weight: '500', outline: null });
  }

  _wrap(ctx, str, x, y, maxW, lineH, opts) {
    const words = str.split(' ');
    let line = '';
    let cy = y;

    const fits = (s) => {
      ctx.save();
      ctx.font = `${opts.size}px "Segoe UI", "Arial Hebrew", Arial, sans-serif`;
      const w = ctx.measureText(s).width;
      ctx.restore();
      return w <= maxW;
    };

    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (!fits(test) && line) {
        text(ctx, line, x, cy, opts);
        line = word;
        cy += lineH;
      } else {
        line = test;
      }
    }
    if (line) text(ctx, line, x, cy, opts);
  }

  _formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }
}
