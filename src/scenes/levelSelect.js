/**
 * levelSelect.js — מסך בחירת השלבים.
 *
 * עברית נכתבת מימין לשמאל, ולכן ציר הזמן מתחיל בקצה הימני: שלב 1 מימין,
 * וככל שמתקדמים הרשימה גוללת שמאלה. 7 פרקים, כל פרק עם שני שלבים ואייקון
 * בוס ביניהם.
 *
 * שליטה: עכבר (ריחוף, לחיצה, גלגלת, חצים בצדדים) או מקלדת:
 *   ← שלב הבא (שמאלה, קדימה בזמן) · → שלב קודם · Enter כניסה · ESC חזרה
 */

import { CHAPTERS, LEVELS, getLevel, sceneForLevel } from '../data/levels.js';
import { text, roundRect, glow, circle } from '../core/art.js';
import { ButtonSet } from '../core/ui.js';
import { sceneryAssets, previewForLevel } from '../core/sceneryAssets.js';
import { drawParchment, drawSelectionBackdrop, drawSelectionButton } from '../core/selectionArt.js';

const CARD_W = 148;
const CARD_H = 104;
const CARD_GAP = 14;
const BOSS_W = 44;
const CHAPTER_GAP = 40;
const MARGIN = 48;      // השוליים מכילים את חצי הניווט, כך שכרטיסים לא נכנסים מתחתם
const ROW_Y = 130;

// לוח הפרטים
const BOX = { x: 60, y: 288, w: 840, h: 182 };

export class LevelSelectScene {
  constructor() {
    this.index = 0;          // אינדקס בתוך LEVELS
    this.t = 0;
    this.scrollX = 0;
    this.targetScroll = 0;
    this._layout = [];
    this._bosses = [];
    this._chapters = [];
    this._follow = true;     // האם הגלילה עוקבת אחרי הבחירה (לא כשהבחירה באה מריחוף)
    this.buttons = new ButtonSet();
    this.art = sceneryAssets();
  }

  enter(params = {}) {
    this.t = 0;

    // Old saves may have unlocked=14 although only early stages are playable.
    const save=this.game.save;
    const playable=LEVELS.filter(l=>l.ready&&save.isUnlocked(l.id));
    // A replayed, already-completed stage hands focus to the first unfinished one,
    // so revisiting an old stage never looks like lost progress.
    const remembered=playable.find(l=>l.id===save.data.currentLevel);
    const current=(remembered&&!save.hasRelic(remembered.relic.id)?remembered:null)
      ||playable.find(l=>!save.hasRelic(l.relic.id))||remembered||playable.at(-1)||LEVELS[0];
    this.index = params.focus != null
      ? LEVELS.findIndex(l => l.id === params.focus)
      : LEVELS.findIndex(l=>l.id===current.id);
    if (this.index < 0) this.index = 0;

    this._follow = true;
    this._buildLayout();
    this._snapScroll();
  }

  /**
   * מחשב לכל כרטיס מרחק p מהקצה הימני (שם מתחיל השלב הראשון).
   * הפריסה אינה משתנה, לכן עושים זאת פעם אחת בכניסה.
   */
  _buildLayout() {
    this._layout = [];
    this._bosses = [];
    this._chapters = [];

    let p = 0;
    for (const ch of CHAPTERS) {
      const start = p;

      ch.levels.forEach((levelId, i) => {
        this._layout.push({ levelId, p });
        p += CARD_W + CARD_GAP;

        // אייקון הבוס מופיע אחרי השלב השני של הפרק (משמאלו, בעברית)
        if (i === 1) {
          this._bosses.push({ chapter: ch, p: p - CARD_GAP + 4 });
          p += BOSS_W + CARD_GAP;
        }
      });

      this._chapters.push({ ch, p0: start, p1: p - CARD_GAP });
      p += CHAPTER_GAP;
    }

    this.contentW = p - CHAPTER_GAP;
  }

  /** קואורדינטת X של שמאל כרטיס שנמצא במרחק p מהקצה הימני (לפני גלילה) */
  _x(p, w) {
    return this.game.width - MARGIN - p - w;
  }

  _snapScroll() {
    this.targetScroll = this._desiredScroll();
    this.scrollX = this.targetScroll;
  }

  /** הגלילה שממרכזת את הכרטיס הנבחר. חיובית = התוכן זז ימינה (מגלה שלבים מאוחרים) */
  _desiredScroll() {
    if (!this._follow) return this.targetScroll;
    const entry = this._layout[this.index];
    if (!entry) return 0;
    return this._clampScroll(entry.p);
  }

  _clampScroll(s) {
    const max = Math.max(0, this.contentW + MARGIN * 2 - this.game.width);
    return Math.max(0, Math.min(s, max));
  }

  _go(delta) {
    const next = Math.max(0, Math.min(LEVELS.length - 1, this.index + delta));
    if (next === this.index) return false;
    this.index = next;
    this._follow = true;
    this.game.audio.menuMove();
    return true;
  }

  update(dt) {
    this.t += dt;
    const { input, audio } = this.game;
    const W = this.game.width;

    // גלילה רכה
    this.targetScroll = this._desiredScroll();
    this.scrollX += (this.targetScroll - this.scrollX) * Math.min(1, dt * 10);

    // כפתורים
    const sel = LEVELS[this.index];
    const unlocked = this.game.save.isUnlocked(sel.id);
    this.buttons.set([
      { id: 'back', x: W - MARGIN - 120, y: this.game.height - 52, w: 120, h: 34, label: 'חֲזָרָה', size: 16 },
      {
        id: 'enter', x: BOX.x + 24, y: BOX.y + BOX.h - 46, w: 190, h: 34,
        label: 'כְּנִיסָה לַשָּׁלָב', size: 16, disabled: !unlocked || !sel.ready,
      },
      { id: 'prev', x: W - 36, y: ROW_Y + 32, w: 28, h: 40, label: '►', size: 16 },
      { id: 'next', x: 8, y: ROW_Y + 32, w: 28, h: 40, label: '◄', size: 16 },
    ]);

    if (this.scenes.transitioning) return;

    const clicked = this.buttons.update(input);
    if (clicked === 'back') { audio.menuMove(); this.scenes.go('menu'); return; }
    if (clicked === 'enter') { this._select(); return; }
    if (clicked === 'prev') this._go(-1);
    if (clicked === 'next') this._go(+1);

    // עברית: חץ שמאלה מתקדם קדימה בציר הזמן
    if (input.pressed('left')) this._go(+1);
    if (input.pressed('right')) this._go(-1);

    // גלגלת: מטה = קדימה
    if (input.wheel > 0) this._go(+1);
    else if (input.wheel < 0) this._go(-1);

    // עכבר מעל כרטיסים
    for (let i = 0; i < this._layout.length; i++) {
      const r = this._cardRect(i);
      if (!input.over(r.x, r.y, r.w, r.h)) continue;

      input.cursor = 'pointer';
      if (input.pointerMoved && this.index !== i) {
        this.index = i;
        this._follow = false;     // לא מגלגלים מתחת לעכבר
      }
      if (input.clicked) {
        this.index = i;
        this._select();
        return;
      }
    }

    if (input.pressed('confirm') || input.pressed('jump')) this._select();

    if (input.pressed('back')) {
      audio.menuMove();
      this.scenes.go('menu');
    }
  }

  /** מלבן הכרטיס במסך (כולל גלילה) */
  _cardRect(i) {
    const e = this._layout[i];
    return {
      x: this._x(e.p, CARD_W) + this.scrollX,
      y: ROW_Y - (i === this.index ? 6 : 0),
      w: CARD_W,
      h: CARD_H + (i === this.index ? 6 : 0),
    };
  }

  _select() {
    const level = LEVELS[this.index];
    const save = this.game.save;
    const audio = this.game.audio;

    if (!save.isUnlocked(level.id) || !level.ready) {
      audio.denied();
      return;
    }

    audio.menuPick();
    this.scenes.go(sceneForLevel(level.id), { levelId: level.id });
  }

  draw(ctx) {
    const W = this.game.width;
    const H = this.game.height;
    const save = this.game.save;

    // --- רקע ---
    drawSelectionBackdrop(ctx, W, H);
    drawParchment(ctx, W / 2 - 177, 12, 354, 72);

    // --- כותרת ---
    text(ctx, 'בְּחִירַת שָׁלָב', W / 2, 40, {
      size: 28, color: '#483018', weight: '700', outline: null,
    });

    const sel = LEVELS[this.index];
    const chapter = CHAPTERS.find(c => c.id === sel.chapter);

    text(ctx, `פֶּרֶק ${chapter.roman} — ${chapter.name}`, W / 2, 70, {
      size: 15, color: '#6b4b26', outline: null,
    });

    // --- אזור הגלילה ---
    ctx.save();
    ctx.beginPath();
    ctx.rect(44, ROW_Y - 40, W - 88, CARD_H + 92);
    ctx.clip();
    ctx.translate(Math.round(this.scrollX), 0);
    for (const chapter of this._chapters) {
      const left = this._x(chapter.p1, 0), right = this._x(chapter.p0, 0);
      drawParchment(ctx, left - 8, ROW_Y - 33, right - left + 16, CARD_H + 70, chapter.ch.id === sel.chapter);
    }

    // קו הציר
    const lineY = ROW_Y + CARD_H / 2;
    ctx.strokeStyle = 'rgba(201,162,39,0.22)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this._x(-20, 0), lineY);
    ctx.lineTo(this._x(this.contentW + 20, 0), lineY);
    ctx.stroke();

    // כותרות הפרקים מעל הכרטיסים
    for (const c of this._chapters) {
      const cx = (this._x(c.p0, 0) + this._x(c.p1, 0)) / 2;
      const active = c.ch.id === sel.chapter;
      text(ctx, `פֶּרֶק ${c.ch.roman} — ${c.ch.name}`, cx, ROW_Y - 22, {
        size: 13, color: active ? '#43301d' : '#76552f',
        weight: active ? '700' : '600', outline: null,
      });
    }

    // אייקוני הבוסים
    for (const b of this._bosses) {
      this._drawBossIcon(ctx, this._x(b.p, BOSS_W), lineY, b.chapter, save);
    }

    // כרטיסי השלבים
    for (let i = 0; i < this._layout.length; i++) {
      const e = this._layout[i];
      this._drawCard(ctx, this._x(e.p, CARD_W), ROW_Y, getLevel(e.levelId), i === this.index, save);
    }

    ctx.restore();

    // --- דהיית קצוות, מרמזת שיש עוד ---
    this._edgeFade(ctx, W);

    // --- לוח פרטים על השלב הנבחר ---
    this._drawDetails(ctx, sel, save);

    this.buttons.items.forEach((button, i) => drawSelectionButton(ctx, button, i === this.buttons.focus || i === this.buttons.hover));

    text(ctx, 'עכבר, או ←→ לניווט · Enter לכניסה · ESC חזרה',
      W / 2, H - 20, { size: 12, color: '#fff4d7', outlineWidth: 2 });
  }

  _drawCard(ctx, x, y, level, selected, save) {
    const unlocked = save.isUnlocked(level.id);
    const ready = level.ready;
    const done = save.hasRelic(level.relic.id);
    const p = level.palette;

    ctx.save();

    if (selected) {
      // הרמה קלה כשנבחר
      ctx.translate(0, -6);
      glow(ctx, x + CARD_W / 2, y + CARD_H / 2, CARD_W, '#ffd964', 0.2);
    }

    // --- גוף הכרטיס: תצוגה מקדימה של הפלטה ---
    roundRect(ctx, x, y, CARD_W, CARD_H, 8);
    ctx.save();
    ctx.clip();

    if (unlocked) {
      const g = ctx.createLinearGradient(0, y, 0, y + CARD_H);
      g.addColorStop(0, p.skyTop);
      g.addColorStop(0.55, p.skyBot);
      g.addColorStop(0.56, p.mid);
      g.addColorStop(1, p.groundDark);
      ctx.fillStyle = g;
      ctx.fillRect(x, y, CARD_W, CARD_H);

      // גבעות קטנות — מראה שונה לכל פלטה
      ctx.fillStyle = p.near;
      ctx.beginPath();
      ctx.moveTo(x, y + CARD_H);
      for (let i = 0; i <= CARD_W; i += 8) {
        const hh = Math.sin((x + i) * 0.03) * 8 + Math.sin((x + i) * 0.07) * 4;
        ctx.lineTo(x + i, y + CARD_H * 0.62 - hh);
      }
      ctx.lineTo(x + CARD_W, y + CARD_H);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = '#1e1812';
      ctx.fillRect(x, y, CARD_W, CARD_H);
    }

    const preview = previewForLevel(level, this.art);
    if (preview) ctx.drawImage(preview, x, y, CARD_W, CARD_H);

    // Preview art never changes lock/readiness rules.
    if (!unlocked) {
      ctx.fillStyle = 'rgba(10,22,29,0.65)';
      ctx.fillRect(x, y, CARD_W, CARD_H);
    } else if (!ready) {
      ctx.fillStyle = 'rgba(10,8,6,0.55)';
      ctx.fillRect(x, y, CARD_W, CARD_H);
    }

    // כהות תחתונה לקריאות הטקסט
    const sh = ctx.createLinearGradient(0, y + CARD_H - 46, 0, y + CARD_H);
    sh.addColorStop(0, 'rgba(0,0,0,0)');
    sh.addColorStop(1, 'rgba(0,0,0,0.8)');
    ctx.fillStyle = sh;
    ctx.fillRect(x, y + CARD_H - 46, CARD_W, 46);

    ctx.restore();

    // --- מסגרת ---
    roundRect(ctx, x, y, CARD_W, CARD_H, 8);
    ctx.strokeStyle = selected ? '#fff1a2' : done ? '#bd8c35' : '#96703f';
    ctx.lineWidth = selected ? 2.5 : 1.5;
    ctx.stroke();

    // --- מספר השלב (בפינה הימנית: שם מתחיל הקורא העברי) ---
    const nx = x + CARD_W - 20;
    ctx.save();
    circle(ctx, nx, y + 19, 14, unlocked ? '#164b65' : '#263944');
    ctx.strokeStyle = selected ? '#ffd964' : 'rgba(201,162,39,0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(nx, y + 19, 14, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    text(ctx, String(level.id), nx, y + 19, {
      size: 15, color: unlocked ? '#ffe9a8' : '#d6cab1', weight: '700',
    });

    // --- שם השלב ---
    text(ctx, level.name, x + CARD_W - 10, y + CARD_H - 26, {
      size: 14,
      color: unlocked ? '#f0e2c0' : '#ddd6c7',
      align: 'right', weight: '600',
    });

    text(ctx, level.era, x + CARD_W - 10, y + CARD_H - 10, {
      size: 11,
      color: unlocked ? 'rgba(240,226,192,0.75)' : '#b8c4c5',
      align: 'right', weight: '500',
    });

    // --- חיוויים ---
    if (!ready) {
      // A stage still being built is "coming soon", not a lock the child failed to open.
      text(ctx, 'בְּקָרוֹב', x + CARD_W / 2, y + CARD_H / 2 - 8, {
        size: 17, color: '#ffe9a8', weight: '700',
      });
    } else if (!unlocked) {
      this._lock(ctx, x + CARD_W / 2, y + CARD_H / 2 - 8);
    } else if (done) {
      // כלי הקודש שנאסף (בפינה השמאלית, מול המספר)
      text(ctx, level.relic.icon, x + 22, y + 20, { size: 19, outline: null });
    }

    ctx.restore();
  }

  _drawBossIcon(ctx, x, cy, chapter, save) {
    // הבוס "נפתח" כששני השלבים של הפרק הושלמו
    const done = chapter.levels.every(id => {
      const l = getLevel(id);
      return save.hasRelic(l.relic.id);
    });

    const r = BOSS_W / 2;

    ctx.save();
    circle(ctx, x + r, cy, r, done ? '#175872' : '#263b48');
    ctx.strokeStyle = done ? '#e7bc5e' : '#b99454';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x + r, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    // סמל האתגר: כוכב שמאיר כשנפתח (אתגר ידע, לא חרבות)
    ctx.save();
    ctx.translate(x + r, cy);
    ctx.fillStyle = done ? '#ffd964' : 'rgba(201,162,39,0.4)';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const rad = i % 2 === 0 ? 11 : 5;
      ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * rad, Math.sin(a) * rad);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    text(ctx, 'אֶתְגָּר', x + r, cy + r + 13, {
      size: 10, color: '#6a4928', outline: null,
    });
  }

  _lock(ctx, cx, cy) {
    ctx.save();
    ctx.strokeStyle = 'rgba(201,162,39,0.5)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(cx, cy - 2, 7, Math.PI, 0);
    ctx.stroke();

    roundRect(ctx, cx - 10, cy - 2, 20, 15, 3);
    ctx.fillStyle = 'rgba(201,162,39,0.5)';
    ctx.fill();
    ctx.restore();
  }

  _edgeFade(ctx, W) {
    const top = ROW_Y - 40;
    const h = CARD_H + 92;

    const left = ctx.createLinearGradient(0, 0, 56, 0);
    left.addColorStop(0, 'rgba(176,189,158,0.95)');
    left.addColorStop(1, 'rgba(176,189,158,0)');
    ctx.fillStyle = left;
    ctx.fillRect(0, top, 56, h);

    const right = ctx.createLinearGradient(W - 56, 0, W, 0);
    right.addColorStop(0, 'rgba(176,189,158,0)');
    right.addColorStop(1, 'rgba(176,189,158,0.95)');
    ctx.fillStyle = right;
    ctx.fillRect(W - 56, top, 56, h);
  }

  _drawDetails(ctx, level, save) {
    const { x: boxX, y: boxY, w: boxW, h: boxH } = BOX;

    drawParchment(ctx, boxX, boxY, boxW, boxH, true);
    const preview = previewForLevel(level, this.art);
    if (preview) {
      ctx.save();
      roundRect(ctx, boxX + 24, boxY + 18, 250, 108, 7); ctx.clip();
      ctx.drawImage(preview, boxX + 24, boxY + 18, 250, 108);
      ctx.restore();
      ctx.strokeStyle = '#a17a42'; ctx.lineWidth = 2;
      roundRect(ctx, boxX + 24, boxY + 18, 250, 108, 7); ctx.stroke();
    }

    const right = boxX + boxW - 24;
    const unlocked = save.isUnlocked(level.id);

    // כותרת
    text(ctx, level.name, right, boxY + 28, {
      size: 22, color: '#432b17', align: 'right', weight: '700', outline: null,
    });

    // תיאור אווירה
    text(ctx, !level.ready ? `בְּקָרוֹב · ${level.subtitle}`
      : unlocked ? level.subtitle : 'שָׁלָב נָעוּל — סַיֵּם אֶת הַשָּׁלָב הַקּוֹדֵם',
      right, boxY + 56, {
        size: 14, color: '#705536', align: 'right', outline: null,
      });

    if (unlocked || !level.ready) {
      // שורות פרטים
      const rows = [
        ['דְּמוּת', level.npc],
        ['מְכָנִיקָה', level.mechanic],
        ['כְּלִי קֹדֶשׁ', `${level.relic.icon}  ${level.relic.name}`],
      ];

      rows.forEach(([label, value], i) => {
        const y = boxY + 90 + i * 25;
        text(ctx, label, right, y, {
          size: 12, color: '#805a2e', align: 'right', weight: '600', outline: null,
        });
        text(ctx, value, right - 86, y, {
          size: 14, color: '#3e3528', align: 'right', outline: null,
        });
      });

      // סטטוס בצד שמאל
      const leftX = boxX + 300;
      const best = save.bestScore(level.id);
      if (best > 0) {
        text(ctx, `שיא: ${best.toLocaleString('he-IL')}`, leftX, boxY + 157, {
          size: 13, color: '#775329', align: 'left', weight: '700', outline: null,
        });
      }

      if (save.hasRelic(level.relic.id)) {
        text(ctx, '✓ הוּשְׁלַם', leftX + 155, boxY + 157, {
          size: 13, color: '#3f6d43', align: 'left', weight: '600', outline: null,
        });
      } else if (!level.ready) {
        text(ctx, 'עֲדַיִן בְּפִתּוּחַ', leftX, boxY + 157, {
          size: 13, color: '#775c3e', align: 'left', outline: null,
        });
      }
    }

    // תג האתגר
    if (level.isBossLevel) {
      const tagW = 150, tagH = 24;
      const tx = boxX + boxW - tagW - 20;
      ctx.save();
      roundRect(ctx, tx, boxY - tagH / 2, tagW, tagH, 5);
      ctx.fillStyle = '#7a2f22';
      ctx.fill();
      ctx.strokeStyle = '#d64a3a';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      text(ctx, 'אֶתְגָּר בְּסוֹף הַפֶּרֶק', tx + tagW / 2, boxY, {
        size: 12, color: '#ffd9c0', weight: '600',
      });
    }
  }
}
