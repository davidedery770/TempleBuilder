/**
 * loop.js — לולאת משחק עם צעד פיזיקה בקצב קבוע.
 *
 * למה קצב קבוע: עם dt משתנה, פיזיקת פלטפורמר מתנהגת אחרת במסך
 * 60Hz לעומת 144Hz — גובה הקפיצה משתנה. צבירת זמן בצעדים של
 * 1/60 שנייה מבטיחה שהמשחק ירגיש זהה בכל מכשיר.
 */

const STEP = 1 / 60;
const MAX_STEPS = 5;   // תקרה למניעת "ספירלת מוות" אחרי עצירה ארוכה

export class Loop {
  /**
   * @param {(dt:number)=>void} update
   * @param {()=>void} render
   */
  constructor(update, render) {
    this.update = update;
    this.render = render;

    this.running = false;
    this._acc = 0;
    this._last = 0;
    this._raf = 0;

    this.fps = 60;
    this._fpsAcc = 0;
    this._fpsFrames = 0;

    this._tick = this._tick.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._last = performance.now();
    this._acc = 0;
    this._raf = requestAnimationFrame(this._tick);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this._raf);
  }

  _tick(now) {
    if (!this.running) return;
    this._raf = requestAnimationFrame(this._tick);

    let frame = (now - this._last) / 1000;
    this._last = now;

    // חסם עליון: אחרי החזרה מלשונית לא פעילה, frame יכול להיות עצום
    if (frame > 0.25) frame = 0.25;

    this._acc += frame;

    let steps = 0;
    while (this._acc >= STEP && steps < MAX_STEPS) {
      this.update(STEP);
      this._acc -= STEP;
      steps++;
    }
    // אם נשארנו מאחור, זורקים את העודף במקום לנסות להדביק
    if (steps === MAX_STEPS) this._acc = 0;

    this.render();

    // מדידת FPS
    this._fpsAcc += frame;
    this._fpsFrames++;
    if (this._fpsAcc >= 0.5) {
      this.fps = Math.round(this._fpsFrames / this._fpsAcc);
      this._fpsAcc = 0;
      this._fpsFrames = 0;
    }
  }
}
