/**
 * player.js — בצלאל: פיזיקה, תנועה, תקיפה ובריאות.
 *
 * הערכים כאן כוילו לתחושת פלטפורמר "הדוק":
 *   - coyote time   — אפשר לקפוץ עוד רגע אחרי שעזבת את הקצה
 *   - jump buffer   — לחיצה רגע לפני הנחיתה עדיין נספרת
 *   - קפיצה משתנה  — שחרור מוקדם של המקש מקצר את הקפיצה
 * שלושת אלה יחד הם ההבדל בין שליטה נעימה לשליטה מתסכלת.
 */

import { TILE } from './tilemap.js';
import { drawPlayer } from '../core/art.js';

const GRAVITY        = 2000;   // פיקסלים לשנייה בריבוע
const MAX_FALL       = 900;
const RUN_ACCEL      = 2600;
const RUN_MAX        = 260;
const AIR_ACCEL      = 1600;
const GROUND_FRICTION= 2200;
const AIR_FRICTION   = 320;
const JUMP_VELOCITY  = -700;   // ≈116px ≈ 3.6 אריחים — מספיק לעמודים בגובה 3
const JUMP_CUT       = 0.42;   // מכפיל המהירות בשחרור מוקדם
const COYOTE_TIME    = 0.10;
const JUMP_BUFFER    = 0.12;
const ATTACK_TIME    = 0.26;
const ATTACK_COOLDOWN= 0.10;
const INVULN_TIME    = 1.2;
const KNOCKBACK_X    = 220;
const KNOCKBACK_Y    = -300;

/**
 * הגובה המקסימלי של קפיצה מלאה, בפיקסלים — מחושב בסימולציה עם אותו
 * סדר אינטגרציה של update(). משמש את tools/verify-level.mjs כדי לוודא
 * שאף מכשול בשלב לא גבוה יותר ממה שאפשר לקפוץ עליו.
 */
export const MAX_JUMP_PX = (() => {
  const dt = 1 / 60;
  let vy = JUMP_VELOCITY, y = 0, top = 0;
  for (let i = 0; i < 240; i++) {
    vy = Math.min(vy + GRAVITY * dt, MAX_FALL);
    y += vy * dt;
    top = Math.max(top, -y);
    if (vy > 0) break;
  }
  return top;
})();

export class Player {
  constructor(x, y) {
    // תיבת ההתנגשות — צרה יותר מהציור, כדי שהמעבר במעברים יהיה סלחני
    this.x = x;
    this.y = y;
    this.w = 22;
    this.h = 42;

    this.vx = 0;
    this.vy = 0;

    this.facing = 1;
    this.onGround = false;
    this.crouching = false;

    this.maxHealth = 5;
    this.health = 5;
    this.lives = 5;

    this.donations = 0;
    this.sparks = 0;

    this.alive = true;
    this.deathTimer = 0;

    this._coyote = 0;
    this._jumpBuffer = 0;
    this._attackTimer = 0;
    this._attackCooldown = 0;
    this._invuln = 0;
    this._animTime = 0;
    this._wasOnGround = false;

    /** נקודת ההחייאה — מתעדכנת במזבחות */
    this.spawnX = x;
    this.spawnY = y;
  }

  get centerX() { return this.x + this.w / 2; }
  get centerY() { return this.y + this.h / 2; }
  get invulnerable() { return this._invuln > 0; }
  get attacking() { return this._attackTimer > 0; }

  /** אזור אור המטה (היעלמות בלי מוות), או null אם המטה אינו מורם */
  get attackBox() {
    if (this._attackTimer <= 0) return null;
    const reach = 52;
    return {
      x: this.facing > 0 ? this.x + this.w - 4 : this.x - reach + 4,
      y: this.y + 6,
      w: reach,
      h: this.h - 14,
    };
  }

  /** מצב אנימציה — נגזר, לא נשמר */
  get state() {
    if (!this.alive) return 'dead';
    if (!this.onGround) return this.vy < 0 ? 'jump' : 'fall';
    if (this.crouching) return 'crouch';
    if (Math.abs(this.vx) > 12) return 'run';
    return 'idle';
  }

  /**
   * @param {number} dt    דלתא זמן בשניות
   * @param {Input} input
   * @param {TileMap} map
   * @param {Audio} audio
   */
  update(dt, input, map, audio) {
    this._animTime += dt;

    if (!this.alive) {
      // אנימציית מוות — נופל מהמסך
      this.deathTimer += dt;
      this.vy = Math.min(this.vy + GRAVITY * dt, MAX_FALL);
      this.y += this.vy * dt;
      return;
    }

    // ---- טיימרים ----
    if (this._invuln > 0) this._invuln -= dt;
    if (this._attackTimer > 0) this._attackTimer -= dt;
    if (this._attackCooldown > 0) this._attackCooldown -= dt;
    if (this._coyote > 0) this._coyote -= dt;
    if (this._jumpBuffer > 0) this._jumpBuffer -= dt;

    // ---- כפיפה ----
    // לא נותנים לכפוף באוויר: זה שובר את תחושת המשקל
    this.crouching = this.onGround && input.down('down');

    // ---- תנועה אופקית ----
    const dir = this.crouching ? 0 : input.axisX;
    const accel = this.onGround ? RUN_ACCEL : AIR_ACCEL;

    if (dir !== 0) {
      this.vx += dir * accel * dt;
      this.vx = Math.max(-RUN_MAX, Math.min(RUN_MAX, this.vx));
      this.facing = dir;
    } else {
      // חיכוך — עוצר בהדרגה ולא בבת אחת
      const friction = (this.onGround ? GROUND_FRICTION : AIR_FRICTION) * dt;
      if (Math.abs(this.vx) <= friction) this.vx = 0;
      else this.vx -= Math.sign(this.vx) * friction;
    }

    // ---- קפיצה ----
    if (input.pressed('jump') || input.pressed('up')) {
      this._jumpBuffer = JUMP_BUFFER;
    }

    const canJump = this.onGround || this._coyote > 0;
    if (this._jumpBuffer > 0 && canJump && !this.crouching) {
      this.vy = JUMP_VELOCITY;
      this.onGround = false;
      this._coyote = 0;
      this._jumpBuffer = 0;
      audio.jump();
    }

    // שחרור מוקדם — קיצור הקפיצה (לא בזינוק מענן קפיצי: הוא תמיד מלא)
    if (this.vy >= 0) this._springing = false;
    if (this.vy < 0 && !this._springing && !input.down('jump') && !input.down('up')) {
      this.vy *= Math.pow(JUMP_CUT, dt * 60);
    }

    // ---- תקיפה ----
    if (input.pressed('attack') && this._attackCooldown <= 0) {
      this._attackTimer = ATTACK_TIME;
      this._attackCooldown = ATTACK_TIME + ATTACK_COOLDOWN;
      audio.attack();
    }

    // ---- כבידה ----
    this.vy = Math.min(this.vy + GRAVITY * dt, MAX_FALL);

    // ---- במה נעה: נוסעים יחד איתה ----
    if (this.riding) {
      this._moveX(this.riding.dx, map);
      this.y += this.riding.dy;
    }

    // ---- תנועה והתנגשות — בשני צירים נפרדים ----
    this._wasOnGround = this.onGround;
    this._moveX(this.vx * dt, map);
    this._moveY(this.vy * dt, map);

    // צליל נחיתה
    if (this.onGround && !this._wasOnGround) audio.land();

    // חידוש זמן coyote בכל פריים שעומדים על קרקע
    if (this.onGround) this._coyote = COYOTE_TIME;

    // ---- יתדות ----
    if (map.rectHitsHazard(this.x, this.y, this.w, this.h)) {
      this.hurt(1, this.facing * -1, audio);
    }

    // ---- נפילה מהמפה ----
    if (this.y > map.pixelH + 200) {
      this.kill(audio);
    }
  }

  /** תנועה אופקית עם פתרון התנגשות */
  _moveX(dx, map) {
    if (dx === 0) return;
    this.x += dx;

    if (map.rectHitsSolid(this.x, this.y, this.w, this.h)) {
      // נסיגה לגבול האריח
      if (dx > 0) {
        this.x = Math.floor((this.x + this.w) / TILE) * TILE - this.w - 0.01;
      } else {
        this.x = Math.floor(this.x / TILE) * TILE + TILE + 0.01;
      }
      this.vx = 0;
    }

    // גבולות המפה
    if (this.x < 0) { this.x = 0; this.vx = 0; }
    const maxX = map.pixelW - this.w;
    if (this.x > maxX) { this.x = maxX; this.vx = 0; }
  }

  /** תנועה אנכית עם פתרון התנגשות, כולל פלטפורמות חד־כיווניות */
  _moveY(dy, map) {
    if (dy === 0) return;

    const prevBottom = this.y + this.h;
    this.y += dy;
    this.onGround = false;
    this.riding = null;

    // A cloud resting on the floor is crossed before the floor itself, so it wins.
    if (dy > 0 && this._landOnMover(prevBottom, map)) return;

    // התנגשות באריחים מוצקים
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

    // פלטפורמות חד־כיווניות: נוחתים רק אם ירדנו ורק אם היינו מעליהן
    if (dy > 0) {
      const c0 = Math.floor(this.x / TILE);
      const c1 = Math.floor((this.x + this.w - 1) / TILE);
      const rowBelow = Math.floor((this.y + this.h) / TILE);

      for (let c = c0; c <= c1; c++) {
        if (!map.isPlatform(c, rowBelow)) continue;

        const platTop = rowBelow * TILE;
        // רק אם הרגליים היו מעל ראש הפלטפורמה לפני התזוזה
        if (prevBottom <= platTop + 2 && this.y + this.h >= platTop) {
          this.y = platTop - this.h - 0.01;
          this.vy = 0;
          this.onGround = true;
          return;
        }
      }
    }
  }

  /** במות נעות ועננים קפיציים (map.movers): נוחתים רק מלמעלה, כמו על קרש. */
  _landOnMover(prevBottom, map) {
    for (const m of map.movers || []) {
      if (this.x + this.w <= m.x || this.x >= m.x + m.w) continue;
      if (prevBottom > m.y + 4 || this.y + this.h < m.y) continue;
      this.y = m.y - this.h - 0.01;
      if (m.bounce) {
        this.vy = m.bounce;
        this._springing = true;
        m.squash = 1;
        return true;
      }
      this.vy = 0;
      this.onGround = true;
      this.riding = m;
      return true;
    }
    return false;
  }

  /** נזק לשחקן. `fromDir` הוא כיוון ההדיפה. */
  hurt(amount, fromDir, audio) {
    if (this._invuln > 0 || !this.alive) return false;

    this.health -= amount;
    this._invuln = INVULN_TIME;

    this.vx = fromDir * KNOCKBACK_X;
    this.vy = KNOCKBACK_Y;
    this.onGround = false;

    if (this.health <= 0) {
      this.kill(audio);
    } else {
      audio.hurt();
    }
    return true;
  }

  kill(audio) {
    if (!this.alive) return;
    this.alive = false;
    this.deathTimer = 0;
    this.vy = -420;
    this.vx = 0;
    audio.death();
  }

  /** הדיפת קפיצה קלה אחרי שהרתענו אויב בנחיתה עליו */
  bounce() {
    this.vy = -430;
    this.onGround = false;
    this._coyote = 0;
  }

  heal(amount = 1) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  /** החייאה בנקודת השמירה */
  respawn() {
    this.x = this.spawnX;
    this.y = this.spawnY;
    this.vx = 0;
    this.vy = 0;
    this.alive = true;
    this.health = this.maxHealth;
    this._invuln = INVULN_TIME;
    this.deathTimer = 0;
    this.onGround = false;
  }

  setSpawn(x, y) {
    this.spawnX = x;
    this.spawnY = y;
  }
  getShadow(map) {
    if (!this.alive) return null;
    const feet = this.y + this.h;
    const surface = map.surfaceBelow(this.centerX, feet);
    if (surface === null) return null;
    const height = Math.max(0, surface - feet);
    const strength = Math.max(0.15, 1 - height / 260);
    return { x: this.centerX, y: surface - 1, rx: this.w * 0.48 * strength,
      ry: 3 * strength, alpha: 0.22 * strength };
  }

  drawShadow(ctx, map, camX, camY) {
    const shadow = this.getShadow(map);
    if (!shadow) return;
    ctx.save();
    ctx.globalAlpha *= shadow.alpha;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(shadow.x - camX, shadow.y - camY, shadow.rx, shadow.ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  draw(ctx, camX, camY) {
    // הבהוב בזמן חסינות
    if (this._invuln > 0 && Math.floor(this._invuln * 14) % 2 === 0) return;

    const px = Math.round(this.x - camX);
    const py = Math.round(this.y - camY);

    drawPlayer(ctx, px, py, this.w, this.h, {
      character: this.character,
      facing: this.facing,
      state: this.state,
      animTime: this._animTime,
      // מנורמל ל־0..1 כדי שה־art לא יצטרך להכיר את הקבוע
      attackTime: this._attackTimer > 0 ? this._attackTimer / ATTACK_TIME : 0,
    });
  }
}
