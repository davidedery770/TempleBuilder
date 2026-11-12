/**
 * enemy.js — אויבים. אי-אלימות: אף אחד לא נהרג.
 *
 * אור המטה מפזר את האויב באור: הוא נעלם ולא חוזר באותה ריצה.
 * אין גופה או מצב מוות. הרגעה זמנית נשמרת להגנה ליד נקודת החייאה.
 *
 * שני טיפוסים בשלב 1:
 *   scorpion  — סייר איטי, הולך הלוך ושוב ואינו מגיב לשחקן
 *   amalekite — מסייר עד שהוא מזהה את השחקן, ואז מסתער
 *
 * ה־AI נמנע מנפילה ממדפים בעזרת בדיקת קרקע לפני הצעד הבא.
 */

import { TILE } from './tilemap.js';
import { drawScorpion, drawAmalekite, glow } from '../core/art.js';
import { drawRiverFish, drawFieldGuard } from '../core/natureArt.js';
import { drawBat } from '../core/shilohNightArt.js';
import { drawCrow, drawCrab } from '../core/lebanonArt.js';

const GRAVITY  = 2000;
const MAX_FALL = 900;

/** כמה זמן אויב נשאר רגוע אחרי שהורתע (שניות) */
export const DAZE_TIME = 3.0;
export const VANISH_TIME = 0.55;

const TYPES = {
  riverFish: {
    w: 32, h: 20, speed: 46, damage: 1, aggressive: false,
    hop: 210, draw: drawRiverFish,
  },
  silverFish: {
    w: 38, h: 26, speed: 52, damage: 1, aggressive: false,
    hop: 260, draw: drawRiverFish,
  },
  fieldGuard: {
    w: 26, h: 44, speed: 48, damage: 1, aggressive: false, draw: drawFieldGuard,
  },
  // עטלף לילה: עף בגל, בלי כבידה; אור מבריח אותו.
  bat: {
    w: 28, h: 18, speed: 72, damage: 1, aggressive: false, fly: true, bob: 16, draw: drawBat,
  },
  // עורב שובב ביער הלבנון, וסרטן שהולך הצידה בחוף יפו
  crow: {
    w: 30, h: 18, speed: 80, damage: 1, aggressive: false, fly: true, bob: 20, draw: drawCrow,
  },
  crab: {
    w: 26, h: 18, speed: 38, damage: 1, aggressive: false, draw: drawCrab,
  },
  scorpion: {
    w: 26, h: 20,
    speed: 42,
    damage: 1,
    aggressive: false,
    draw: drawScorpion,
  },
  amalekite: {
    w: 24, h: 44,
    speed: 58,
    chargeSpeed: 155,
    damage: 1,
    aggressive: true,
    sightRange: 230,
    sightHeight: 70,
    draw: drawAmalekite,
  },
};

export class Enemy {
  /**
   * @param {string} type  מפתח מתוך TYPES
   * @param {number} x     פיקסלים
   * @param {number} y     פיקסלים (ראש התיבה)
   * @param {object} [opts] { patrolLeft, patrolRight } בפיקסלים
   */
  constructor(type, x, y, opts = {}) {
    const def = TYPES[type] || TYPES.scorpion;

    this.type = type;
    this.def = def;
    this.x = x;
    this.y = y;
    this.w = def.w;
    this.h = def.h;

    this.vx = 0;
    this.vy = 0;
    this.facing = opts.facing || -1;
    this.onGround = false;

    this.state = 'walk';        // walk | charge
    this._animTime = Math.random() * 10;   // פאזה אקראית כדי שלא יצעדו בסנכרון
    this._dazed = 0;
    this._vanish = 0;
    this.gone = false;
    this._pauseTimer = 0;
    this._hopTimer = 0.7 + Math.random() * 0.6;

    // גבולות סיור. אם לא סופקו — האויב פשוט מסתובב בקצוות
    this.patrolLeft  = opts.patrolLeft  != null ? opts.patrolLeft  : null;
    this.patrolRight = opts.patrolRight != null ? opts.patrolRight : null;
  }

  get centerX() { return this.x + this.w / 2; }
  get centerY() { return this.y + this.h / 2; }

  /** האם האויב רגוע כרגע (ולכן לא מסוכן) */
  get dazed() { return this._dazed > 0; }
  get vanishing() { return this._vanish > 0; }

  /** האם הוא פוגע בשחקן במגע */
  get dangerous() { return !this.gone && !this.vanishing && this._dazed <= 0; }

  update(dt, map, player) {
    if (this.gone) return;
    this._animTime += dt;
    if (this.vanishing) {
      this._vanish = Math.max(0, this._vanish - dt);
      if (this._vanish === 0) this.gone = true;
      return;
    }

    if (this.def.fly) { this._fly(dt, player); return; }

    if (this._dazed > 0) {
      this._dazed -= dt;
      // נרגע: עוצר בהדרגה
      this.vx *= Math.pow(0.02, dt);
      if (Math.abs(this.vx) < 4) this.vx = 0;
    } else if (this._pauseTimer > 0) {
      this._pauseTimer -= dt;
      this.vx = 0;
    } else {
      this._decide(player);
    }

    // Fish make small, predictable hops; they still obey terrain and calm states.
    if (this.def.hop && !this.dazed) {
      this._hopTimer -= dt;
      if (this.onGround && this._hopTimer <= 0) {
        this.vy = -this.def.hop;
        this._hopTimer = 1.3;
      }
    }

    // כבידה
    this.vy = Math.min(this.vy + GRAVITY * dt, MAX_FALL);

    this._moveX(this.vx * dt, map);
    this._moveY(this.vy * dt, map);

    // מניעת נפילה ממדף: בודקים אם יש קרקע מתחת לצעד הבא
    if (this.onGround && this.vx !== 0 && this._dazed <= 0) {
      const aheadX = this.facing > 0 ? this.x + this.w + 4 : this.x - 4;
      const belowY = this.y + this.h + 4;
      if (!map.hasGroundBelow(aheadX, belowY)) {
        this._turnAround();
      }
    }
  }

  /** תעופה: סיור אופקי בין הגבולות וגל אנכי סביב גובה ההתחלה. */
  _fly(dt, player) {
    this._baseY ??= this.y;
    if (this._dazed > 0) {
      this._dazed -= dt;
      this.vx *= Math.pow(0.02, dt);
    } else if (this._pauseTimer > 0) {
      this._pauseTimer -= dt;
      this.vx = 0;
    } else {
      this._decide(player);
    }
    this.x += this.vx * dt;
    this.y = this._baseY + Math.sin(this._animTime * 2.6) * this.def.bob;
  }

  _decide(player) {
    const def = this.def;

    if (def.aggressive && player && player.alive) {
      const dx = player.centerX - this.centerX;
      const dy = Math.abs(player.centerY - this.centerY);
      const inSight = Math.abs(dx) < def.sightRange && dy < def.sightHeight;

      if (inSight) {
        // מסתער לכיוון השחקן
        this.state = 'charge';
        this.facing = Math.sign(dx) || this.facing;
        this.vx = this.facing * def.chargeSpeed;
        return;
      }
    }

    this.state = 'walk';
    this.vx = this.facing * def.speed;

    // גבולות הסיור
    if (this.patrolLeft != null && this.x <= this.patrolLeft && this.facing < 0) {
      this._turnAround();
    }
    if (this.patrolRight != null && this.x + this.w >= this.patrolRight && this.facing > 0) {
      this._turnAround();
    }
  }

  _turnAround() {
    this.facing *= -1;
    this.vx = 0;
    this._pauseTimer = 0.25;   // עצירה קצרה — נראה חי יותר מסיבוב מיידי
  }

  _moveX(dx, map) {
    if (dx === 0) return;
    this.x += dx;

    if (map.rectHitsSolid(this.x, this.y, this.w, this.h)) {
      if (dx > 0) this.x = Math.floor((this.x + this.w) / TILE) * TILE - this.w - 0.01;
      else        this.x = Math.floor(this.x / TILE) * TILE + TILE + 0.01;
      if (this._dazed <= 0) this._turnAround();
      else this.vx = 0;
    }
  }

  _moveY(dy, map) {
    if (dy === 0) return;

    const prevBottom = this.y + this.h;
    this.y += dy;
    this.onGround = false;

    if (map.rectHitsSolid(this.x, this.y, this.w, this.h)) {
      if (dy > 0) {
        this.y = Math.floor((this.y + this.h) / TILE) * TILE - this.h - 0.01;
        this.onGround = true;
      } else {
        this.y = Math.floor(this.y / TILE) * TILE + TILE + 0.01;
      }
      this.vy = 0;
      return;
    }

    // פלטפורמות חד־כיווניות
    if (dy > 0) {
      const c0 = Math.floor(this.x / TILE);
      const c1 = Math.floor((this.x + this.w - 1) / TILE);
      const rowBelow = Math.floor((this.y + this.h) / TILE);
      for (let c = c0; c <= c1; c++) {
        if (!map.isPlatform(c, rowBelow)) continue;
        const platTop = rowBelow * TILE;
        if (prevBottom <= platTop + 2 && this.y + this.h >= platTop) {
          this.y = platTop - this.h - 0.01;
          this.vy = 0;
          this.onGround = true;
          return;
        }
      }
    }
  }

  /**
   * האור מרתיע את האויב: נדחף לאחור ונרגע. אין נזק ואין מוות.
   * @param {number} dir כיוון הדחיפה (‎-1 / ‎+1)
   * @returns {boolean} true אם זו הרתעה חדשה (לא כבר רגוע)
   */
  repel(dir) {
    if (this.gone || this.vanishing || this._dazed > 0) return false;

    this._dazed = DAZE_TIME;
    this.state = 'walk';
    this.vx = dir * 150;
    this.vy = -140;
    this.onGround = false;
    return true;
  }

  /** Disappear in light, permanently for this scene instance. No death state. */
  disperse() {
    if (this.gone || this.vanishing) return false;
    this._vanish = VANISH_TIME;
    this._dazed = DAZE_TIME;
    this.state = 'walk';
    this.vx = this.vy = 0;
    return true;
  }

  /** תיבת המגע שלו */
  get hitbox() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  draw(ctx, camX, camY) {
    if (this.gone) return;
    const px = Math.round(this.x - camX);
    const py = Math.round(this.y - camY);

    ctx.save();
    if (this.vanishing) {
      ctx.globalAlpha *= this._vanish / VANISH_TIME;
    } else if (this._dazed > 0) {
      // נרגע: מעומעם קלות, ועם כוכבים רכים מסתובבים מעל הראש
      const fade = Math.min(1, this._dazed / 0.5);   // חוזר לשקיפות מלאה בסוף
      ctx.globalAlpha = 1 - 0.35 * fade;
    }

    this.def.draw(ctx, px, py, this.w, this.h, {
      facing: this.facing,
      state: this.state,
      animTime: this._animTime,
      hurt: 0,
    });
    ctx.restore();

    if (this.vanishing) {
      ctx.save();
      ctx.globalAlpha *= this._vanish / VANISH_TIME;
      this._drawCalm(ctx, px + this.w / 2, py + this.h * 0.3);
      ctx.restore();
    } else if (this._dazed > 0) this._drawCalm(ctx, px + this.w / 2, py - 8);
  }

  /** שלושה ניצוצות אור מסתובבים מעל אויב רגוע */
  _drawCalm(ctx, cx, cy) {
    const t = this._animTime * 3;
    glow(ctx, cx, cy, 16, '#fff3b0', 0.3);
    ctx.save();
    ctx.fillStyle = '#fff3b0';
    for (let i = 0; i < 3; i++) {
      const a = t + (i / 3) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * 9, cy + Math.sin(a) * 3, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

/** בדיקת חפיפה בין שני מלבנים */
export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x
      && a.y < b.y + b.h && a.y + a.h > b.y;
}
