/**
 * sceneManager.js — מעבר בין מסכי המשחק עם דהייה.
 *
 * הסצנה היא אובייקט עם הממשק:
 *   enter(params)  — נקרא בכניסה
 *   exit()         — נקרא ביציאה (אופציונלי)
 *   update(dt)     — לוגיקה
 *   draw(ctx)      — ציור
 */

const FADE_TIME = 0.28;

export class SceneManager {
  constructor(game) {
    this.game = game;
    this.scenes = new Map();
    this.current = null;
    this.currentName = null;

    this._pending = null;    // { name, params }
    this._fade = 0;          // 0 = שקוף לגמרי, 1 = שחור מלא
    this._fadeDir = 0;       // 1 = מחשיך, -1 = מבהיר
  }

  register(name, scene) {
    scene.game = this.game;
    scene.scenes = this;
    this.scenes.set(name, scene);
  }

  /** מעבר מיידי ללא דהייה — לשימוש באתחול בלבד */
  set(name, params = {}) {
    const scene = this.scenes.get(name);
    if (!scene) throw new Error(`סצנה לא קיימת: ${name}`);

    if (this.current && this.current.exit) this.current.exit();
    this.current = scene;
    this.currentName = name;
    if (this.game.onScene) this.game.onScene(name, params);
    if (scene.enter) scene.enter(params);
    this.game.input.flush();
  }

  /** מעבר עם דהייה לשחור ובחזרה */
  go(name, params = {}) {
    if (this._pending) return;   // כבר באמצע מעבר
    this._pending = { name, params };
    this._fadeDir = 1;
  }

  get transitioning() {
    return this._pending !== null || this._fadeDir !== 0;
  }

  update(dt) {
    // --- ניהול הדהייה ---
    if (this._fadeDir !== 0) {
      this._fade += this._fadeDir * (dt / FADE_TIME);

      if (this._fadeDir > 0 && this._fade >= 1) {
        this._fade = 1;
        // החלפת הסצנה ברגע השיא השחור
        const p = this._pending;
        this._pending = null;
        if (p) this.set(p.name, p.params);
        this._fadeDir = -1;
      } else if (this._fadeDir < 0 && this._fade <= 0) {
        this._fade = 0;
        this._fadeDir = 0;
      }
    }

    // הסצנה ממשיכה לרוץ גם במהלך הדהייה — נראה חלק יותר
    if (this.current && this.current.update) this.current.update(dt);
  }

  draw(ctx) {
    if (this.current && this.current.draw) this.current.draw(ctx);

    if (this._fade > 0) {
      ctx.save();
      ctx.globalAlpha = this._fade;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, this.game.width, this.game.height);
      ctx.restore();
    }
  }
}
