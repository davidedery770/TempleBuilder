/**
 * museum.js — "מוזיאון המקדש": ארכיון כל כרטיסיות הידע.
 *
 * כרטיסיות שעדיין לא נפתחו מוצגות כצלליות — כך השחקן רואה
 * כמה עוד יש, בלי לחשוף את התוכן.
 */

import { CODEX, CODEX_TYPES } from '../data/codex.js';
import { text, roundRect, circle, glow } from '../core/art.js';
import { ButtonSet } from '../core/ui.js';
import { drawParchment, drawSelectionBackdrop, drawSelectionButton } from '../core/selectionArt.js';
import { drawLearningIcon } from '../core/learningArt.js';
import { niqqud } from '../core/niqqud.js';

const LIST_W = 268;
const ROW_H = 44;
const VISIBLE_ROWS = 9;

export function museumPages(ctx,body,width){
  ctx.save();ctx.font='500 17px "Segoe UI", Arial, sans-serif';
  const lines=[];let line='';
  for(const word of niqqud(body).split(/\s+/)){
    const next=line?line+' '+word:word;
    if(line&&ctx.measureText(next).width>width){lines.push(line);line=word;}else line=next;
  }
  if(line)lines.push(line);ctx.restore();
  const pages=[];for(let i=0;i<lines.length;i+=6)pages.push(lines.slice(i,i+6));return pages.length?pages:[[]];
}

export class MuseumScene {
  constructor() {
    this.buttons = new ButtonSet();
  }

  _pages(ctx){
    const card=CODEX[this.index];
    if(!ctx||!card||!this.game.save.hasCodex(card.id))return [[]];
    const width=this.game.width-LIST_W-130;
    if(this.pageCache?.id!==card.id||this.pageCache.width!==width)this.pageCache={id:card.id,width,pages:museumPages(ctx,card.body,width)};
    return this.pageCache.pages;
  }

  enter() {
    this.index = Math.max(0,CODEX.findIndex(card=>this.game.save.hasCodex(card.id)));
    this.scroll = 0;
    this.t = 0;
    this.page=0;
    this.pageCache=null;
  }

  update(dt) {
    this.t += dt;
    if (this.scenes.transitioning) return;

    const { input, audio } = this.game;
    const previous=this.index;

    if (input.pressed('down')) {
      this.index = Math.min(CODEX.length - 1, this.index + 1);
      audio.menuMove();
    }
    if (input.pressed('up')) {
      this.index = Math.max(0, this.index - 1);
      audio.menuMove();
    }

    // גלגלת: מטה = הבאה
    if (input.wheel > 0) this.index = Math.min(CODEX.length - 1, this.index + 1);
    if (input.wheel < 0) this.index = Math.max(0, this.index - 1);

    // עכבר: ריחוף בוחר שורה, לחיצה יוצאת מההדגשה בלבד (ההסבר מוצג מיד)
    const listX = this.game.width - LIST_W - 28;
    for (let i = 0; i < VISIBLE_ROWS; i++) {
      const idx = this.scroll + i;
      if (idx >= CODEX.length) break;
      if (input.over(listX, 92 + i * ROW_H, LIST_W, ROW_H - 5)) {
        input.cursor = 'pointer';
        if (input.pointerMoved || input.clicked) this.index = idx;
      }
    }

    // גלילה שמחזיקה את הבחירה בתוך החלון
    if (this.index < this.scroll) this.scroll = this.index;
    if (this.index >= this.scroll + VISIBLE_ROWS) {
      this.scroll = this.index - VISIBLE_ROWS + 1;
    }

    if(previous!==this.index){this.page=0;this.pageCache=null;}
    const pages=this._pages(this.game.ctx);
    this.buttons.set([{
      id: 'back', x: this.game.width - 28 - 130, y: this.game.height - 52, w: 130, h: 34,
      label: 'חֲזָרָה', size: 16,
    },
      {id:'listUp',x:listX,y:this.game.height-52,w:46,h:34,label:'↑',size:20,disabled:this.index===0},
      {id:'listDown',x:listX+54,y:this.game.height-52,w:46,h:34,label:'↓',size:20,disabled:this.index>=CODEX.length-1},
      ...(pages.length>1?[
        {id:'next',x:48,y:430,w:110,h:38,label:'הבא ←',size:18,disabled:this.page>=pages.length-1},
        {id:'prev',x:170,y:430,w:110,h:38,label:'→ הקודם',size:18,disabled:this.page===0},
      ]:[]),
    ]);
    const clicked = this.buttons.update(input);
    if(clicked==='next'||input.pressed('left'))this.page=Math.min(pages.length-1,this.page+1);
    if(clicked==='prev'||input.pressed('right'))this.page=Math.max(0,this.page-1);
    if(clicked==='listUp'||clicked==='listDown'){
      this.index=Math.max(0,Math.min(CODEX.length-1,this.index+(clicked==='listUp'?-1:1)));
      this.page=0;this.pageCache=null;
    }

    if (clicked === 'back' || input.pressed('back') || input.pressed('confirm')) {
      audio.menuMove();
      this.scenes.go('menu');
    }
  }

  draw(ctx) {
    const W = this.game.width;
    const H = this.game.height;
    const save = this.game.save;

    // --- רקע ---
    drawSelectionBackdrop(ctx,W,H);
    drawParchment(ctx,W/2-215,8,430,70,true);

    // --- כותרת ---
    text(ctx, 'מוּזֵיאוֹן הַמִּקְדָּשׁ', W / 2, 36, {
      size: 28, color: '#49321b', weight: '700',outline:null,
    });

    const found = CODEX.filter(c => save.hasCodex(c.id)).length;
    text(ctx, `${found} מִתּוֹךְ ${CODEX.length} כַּרְטִיסִיּוֹת`, W / 2, 62, {
      size: 14, color: '#6f5836',outline:null,
    });

    // --- רשימה (בצד ימין, RTL) ---
    const listX = W - LIST_W - 28;
    const listY = 92;

    for (let i = 0; i < VISIBLE_ROWS; i++) {
      const idx = this.scroll + i;
      if (idx >= CODEX.length) break;

      const card = CODEX[idx];
      const unlocked = save.hasCodex(card.id);
      const selected = idx === this.index;
      const y = listY + i * ROW_H;

      drawParchment(ctx,listX,y,LIST_W,ROW_H-5,selected);

      const type = CODEX_TYPES[card.type] || CODEX_TYPES.concept;
      circle(ctx, listX + LIST_W - 18, y + 19, 5,
        unlocked ? type.color : 'rgba(120,105,80,0.4)');

      text(ctx, unlocked ? card.title : 'כרטיסייה נעולה',
        listX + LIST_W - 34, y + 14, {
          size: 15, align: 'right',
          color: unlocked ? '#493520' : '#85765b',
          weight: selected ? '700' : '500',outline:null,
        });

      text(ctx, `שָׁלָב ${card.level}`, listX + LIST_W - 34, y + 31, {
        size: 11, align: 'right',
        color: unlocked ? '#6b684c' : '#8c826b',outline:null,
      });
    }

    // חיווי גלילה
    if (CODEX.length > VISIBLE_ROWS) {
      const trackH = VISIBLE_ROWS * ROW_H - 10;
      const thumbH = Math.max(24, trackH * VISIBLE_ROWS / CODEX.length);
      const thumbY = listY + (trackH - thumbH) * (this.scroll / (CODEX.length - VISIBLE_ROWS));

      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(listX - 10, listY, 4, trackH);
      ctx.fillStyle = 'rgba(201,162,39,0.5)';
      ctx.fillRect(listX - 10, thumbY, 4, thumbH);
    }

    // --- פאנל התוכן (בצד שמאל) ---
    this._detail(ctx, 28, 92, listX - 54, H - 150, save);

    this.buttons.items.forEach((button,i)=>drawSelectionButton(ctx,button,i===this.buttons.hover));

    text(ctx, 'עכבר או ↑↓ לניווט · ESC חזרה', W / 2, H - 20, {
      size: 13, color: '#fff4d2',
    });
  }

  _detail(ctx, x, y, w, h, save) {
    const card = CODEX[this.index];
    if (!card) return;

    drawParchment(ctx,x,y,w,h,true);

    const unlocked = save.hasCodex(card.id);

    if (!unlocked) {
      glow(ctx, x + w / 2, y + h / 2, 90, '#c9a227', 0.08);
      text(ctx, '🔒', x + w / 2, y + h / 2 - 24, { size: 34, outline: null });
      text(ctx, 'עֲדַיִן לֹא נִתְגַּלָּה', x + w / 2, y + h / 2 + 18, {
        size: 19, color: '#6c5b3d',outline:null,
      });
      text(ctx, `נִפְתָּח בְּשָׁלָב ${card.level}`, x + w / 2, y + h / 2 + 44, {
        size: 15, color: '#8a7755',outline:null,
      });
      return;
    }

    const type = CODEX_TYPES[card.type] || CODEX_TYPES.concept;
    const right = x + w - 24;

    // תג סוג
    const tagW = 74, tagH = 22;
    ctx.save();
    roundRect(ctx, right - tagW, y + 20, tagW, tagH, 4);
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = type.color;
    ctx.fill();
    ctx.restore();
    text(ctx, type.label, right - tagW / 2, y + 31, {
      size: 12, color: '#15110c', weight: '700', outline: null,
    });

    const icon=({olive_oil:'oil',shiloh:'olive',adanim:'silver',tavnit:'boards',colors:'techelet',
      ark_jordan:'ark',omer:'grain',twelve_stones:'stone',materials15:'gold',jericho_shofar:'shofar'})[card.id]||'ark';
    drawLearningIcon(ctx,icon,x+58,y+58,62);
    text(ctx, card.title, right, y + 64, {
      size: 24, color: '#44321d', align: 'right', weight: '700',outline:null,
    });

    text(ctx, card.subtitle, right, y + 92, {
      size: 16, color: '#73613f', align: 'right',outline:null,
    });

    // קו מפריד
    ctx.strokeStyle = 'rgba(201,162,39,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 24, y + 112);
    ctx.lineTo(right, y + 112);
    ctx.stroke();

    const pages=this._pages(ctx);
    this.page=Math.max(0,Math.min(this.page,pages.length-1));
    pages[this.page].forEach((line,i)=>text(ctx,line,right,y+138+i*27,{size:17,color:'#443c2c',align:'right',weight:'500',outline:null}));
    if(pages.length>1)text(ctx,`${this.page+1}/${pages.length}`,right,y+h-57,{size:15,color:'#6f5938',align:'right',outline:null});

    text(ctx, card.source, right, y + h - 24, {
      size: 12, color: '#8a7446', align: 'right',
    });
  }

  _wrap(ctx, str, x, y, maxW, lineH, opts) {
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
