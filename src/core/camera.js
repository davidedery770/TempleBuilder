/**
 * camera.js — מצלמה דו־ממדית עם מעקב רך, גבולות עולם ורעידה.
 */

export class Camera {
  constructor(viewW, viewH) {
    this.x = 0;
    this.y = 0;
    this.w = viewW;
    this.h = viewH;

    /** גבולות העולם בפיקסלים */
    this.bounds = { x: 0, y: 0, w: viewW, h: viewH };

    /** מהירות התכנסות המעקב (0..1 לכל פריים) */
    this.lerp = 0.12;

    /** היסט קבוע — מרים את המצלמה כך שהשחקן יושב מעט מתחת למרכז */
    this.offsetY = -40;

    this._shake = 0;
    this._shakeX = 0;
    this._shakeY = 0;
  }

  setBounds(x, y, w, h) {
    this.bounds = { x, y, w, h };
  }

  /** מיקום מיידי ללא החלקה — לשימוש ב־spawn וב־respawn */
  snapTo(targetX, targetY) {
    this.x = targetX - this.w / 2;
    this.y = targetY - this.h / 2 + this.offsetY;
    this._clamp();
  }

  /** מעקב רך אחרי נקודה */
  follow(targetX, targetY) {
    const goalX = targetX - this.w / 2;
    const goalY = targetY - this.h / 2 + this.offsetY;
    this.x += (goalX - this.x) * this.lerp;
    this.y += (goalY - this.y) * this.lerp;
    this._clamp();
  }

  /** מפעיל רעידה. `power` בפיקסלים. */
  shake(power = 6) {
    this._shake = Math.max(this._shake, power);
  }

  update() {
    if (this._shake > 0.1) {
      this._shakeX = (Math.random() * 2 - 1) * this._shake;
      this._shakeY = (Math.random() * 2 - 1) * this._shake;
      this._shake *= 0.86;
    } else {
      this._shake = 0;
      this._shakeX = 0;
      this._shakeY = 0;
    }
  }

  /** היסט סופי לרינדור, כולל רעידה ועיגול לפיקסל שלם */
  get renderX() { return Math.round(this.x + this._shakeX); }
  get renderY() { return Math.round(this.y + this._shakeY); }

  /** האם מלבן בעולם נמצא בתוך תחום הצפייה (עם שוליים) */
  isVisible(x, y, w, h, margin = 64) {
    return x + w > this.x - margin
        && x < this.x + this.w + margin
        && y + h > this.y - margin
        && y < this.y + this.h + margin;
  }

  _clamp() {
    const b = this.bounds;
    // אם העולם צר מהמסך — ממרכזים אותו במקום להצמיד
    if (b.w <= this.w) this.x = b.x + (b.w - this.w) / 2;
    else this.x = Math.max(b.x, Math.min(this.x, b.x + b.w - this.w));

    if (b.h <= this.h) this.y = b.y + (b.h - this.h) / 2;
    else this.y = Math.max(b.y, Math.min(this.y, b.y + b.h - this.h));
  }
}
