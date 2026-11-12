/**
 * input.js — קלט מקלדת, עכבר ומגע.
 *
 * מקלדת:
 *   down(action)    — האם המקש מוחזק כרגע (לתנועה רציפה)
 *   pressed(action) — האם המקש נלחץ בפריים הזה בלבד (לתפריטים, קפיצה)
 *
 * עכבר/מגע (בקואורדינטות הלוגיות של המשחק, 960×540):
 *   pointer.x / pointer.y / pointer.inside
 *   clicked        — האם נלחץ בפריים הזה
 *   pointerMoved   — האם הסמן זז בפריים הזה (כדי שעכבר נייח לא ידרוס מקלדת)
 *   wheel          — כיוון גלילה בפריים הזה (‎-1, 0, ‎+1)
 *   over(x,y,w,h)  — האם הסמן בתוך מלבן
 *   cursor         — הסצנה קובעת 'pointer' מעל דברים ללחיצה
 */

/** מיפוי קוד מקש פיזי → פעולה לוגית במשחק */
const BINDINGS = {
  ArrowLeft:  'left',
  ArrowRight: 'right',
  ArrowUp:    'up',
  ArrowDown:  'down',
  KeyA:       'left',
  KeyD:       'right',
  KeyW:       'up',
  KeyS:       'down',
  Space:      'jump',
  KeyZ:       'attack',
  KeyX:       'shofar',
  KeyC:       'build',
  Enter:      'confirm',
  Escape:     'back',
  KeyM:       'museum',
  KeyP:       'pause',
  KeyN:       'music',
  KeyV:       'voice',
  Digit1:     'opt1',
  Digit2:     'opt2',
  Digit3:     'opt3',
  Digit4:     'opt4',
  Numpad1:    'opt1',
  Numpad2:    'opt2',
  Numpad3:    'opt3',
  Numpad4:    'opt4',
};

/** מקשים שהדפדפן גולל איתם — נחסום כדי שהעמוד לא יקפוץ */
const SWALLOW = new Set([
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space',
]);

export class Input {
  constructor(target = window) {
    /** @type {Set<string>} פעולות המוחזקות כרגע */
    this.held = new Set();
    this._sources = new Map();
    this._pointerId = null;
    /** @type {Set<string>} פעולות שנלחצו בפריים הנוכחי */
    this.justPressed = new Set();
    /** @type {Set<string>} תור המתנה — נאסף בין פריימים */
    this._queue = new Set();

    // --- עכבר/מגע ---
    this.pointer = { x: -1, y: -1, inside: false, down: false };
    this.clicked = false;
    this.pointerMoved = false;
    this.wheel = 0;
    this.cursor = 'default';
    this._click = false;
    this._moved = false;
    this._wheel = 0;
    this.pointerReleased = false;
    this.pointerCancelled = false;
    this._released = false;
    this._cancelled = false;

    this._onDown = (e) => {
      const action = BINDINGS[e.code];
      if (!action) return;
      if (SWALLOW.has(e.code)) e.preventDefault();
      // repeat מופעל כשהמערכת מייצרת לחיצות חוזרות — לא נחשב "לחיצה חדשה"
      if (!e.repeat) this.hold(action, `key:${e.code}`);
    };

    this._onUp = (e) => {
      const action = BINDINGS[e.code];
      if (!action) return;
      this.release(action, `key:${e.code}`);
    };

    // איבוד פוקוס (alt-tab) — משחרר הכל, אחרת הדמות "נתקעת" בריצה
    this._onBlur = () => {
      this.held.clear();
      this._sources.clear();
      this._queue.clear();
      this._pointerId = null;
      this.pointer.down = false;
      this._cancelled = true;
      this._click = false;
    };

    target.addEventListener('keydown', this._onDown);
    target.addEventListener('keyup', this._onUp);
    window.addEventListener('blur', this._onBlur);
  }

  /**
   * מחבר עכבר/מגע ל-canvas ומתרגם לקואורדינטות הלוגיות.
   * @param {HTMLCanvasElement} canvas
   * @param {number} viewW רוחב לוגי
   * @param {number} viewH גובה לוגי
   */
  attachPointer(canvas, viewW, viewH) {
    const place = (e) => {
      const r = canvas.getBoundingClientRect();
      this.pointer.x = ((e.clientX - r.left) * viewW) / r.width;
      this.pointer.y = ((e.clientY - r.top) * viewH) / r.height;
      this.pointer.inside = this.pointer.x >= 0 && this.pointer.x < viewW
        && this.pointer.y >= 0 && this.pointer.y < viewH;
    };

    canvas.addEventListener('pointermove', (e) => {
      if (this._pointerId !== null && (e.pointerId ?? 0) !== this._pointerId) return;
      if (e.pointerType === 'touch' && this._pointerId === null) return;
      place(e);
      this._moved = true;
    });

    canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      if (this._pointerId !== null && this._pointerId !== (e.pointerId ?? 0)) return;
      this._pointerId = e.pointerId ?? 0;
      place(e);
      this.pointer.down = true;
      canvas.setPointerCapture?.(e.pointerId);
      this._click = true;
      this._moved = true;
    });

    window.addEventListener('pointerup', (e) => {
      if (!this.pointer.down || (e.pointerId ?? 0) !== this._pointerId) return;
      if (Number.isFinite(e.clientX) && Number.isFinite(e.clientY)) place(e);
      this.pointer.down = false;
      this._pointerId = null;
      this._released = true;
    });
    const cancel = e => {
      if ((e.pointerId ?? 0) !== this._pointerId) return;
      this.pointer.down = false;
      this._pointerId = null;
      this._cancelled = true;
      this._click = false;
    };
    canvas.addEventListener('pointercancel', cancel);
    canvas.addEventListener('lostpointercapture', cancel);
    if (canvas.style) canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerleave', e => {
      // Touch has no hover: browsers emit leave immediately after finger-up.
      // Keep the last measured position until the release is consumed by the game.
      if (e.pointerType !== 'touch') this.pointer.inside = false;
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this._wheel += Math.sign(e.deltaY);
    }, { passive: false });
  }

  /** האם הסמן בתוך מלבן (בקואורדינטות לוגיות) */
  over(x, y, w, h) {
    const p = this.pointer;
    return p.inside && p.x >= x && p.x < x + w && p.y >= y && p.y < y + h;
  }

  /** לחיצה וירטואלית (מסך מגע) או מקלדת — נחשבת גם מוחזקת וגם pressed בפריים */
  hold(action, source = 'virtual') {
    if (!action) return;
    if (!this._sources.has(action)) this._sources.set(action, new Set());
    this._sources.get(action).add(source);
    if (!this.held.has(action)) this._queue.add(action);
    this.held.add(action);
  }

  /** שחרור לחיצה וירטואלית או מקלדת */
  release(action, source = 'virtual', cancelled = false) {
    if (!action) return;
    const sources = this._sources.get(action);
    sources?.delete(source);
    if (!sources?.size) {
      this._sources.delete(action);
      this.held.delete(action);
      if (cancelled) this._queue.delete(action);
    }
  }

  /** האם הפעולה מוחזקת כרגע */
  down(action) {
    return this.held.has(action);
  }

  /** האם הפעולה נלחצה בפריים הנוכחי */
  pressed(action) {
    return this.justPressed.has(action);
  }

  /** ציר אופקי: ‎-1 שמאלה, ‎+1 ימינה, 0 ניטרלי */
  get axisX() {
    return (this.down('right') ? 1 : 0) - (this.down('left') ? 1 : 0);
  }

  /**
   * מועבר לתחילת כל פריים — מעביר את התורים למצב "פריים נוכחי".
   * חייב להיקרא לפני ה־update של הסצנה.
   */
  beginFrame() {
    this.justPressed = this._queue;
    this._queue = new Set();

    this.clicked = this._click;
    this._click = false;
    this.pointerReleased = this._released;
    this._released = false;
    this.pointerCancelled = this._cancelled;
    this._cancelled = false;
    this.pointerMoved = this._moved;
    this._moved = false;
    this.wheel = this._wheel;
    this._wheel = 0;

    this.cursor = 'default';
  }

  /** מנקה לחיצות ממתינות — שימושי במעבר בין סצנות */
  flush() {
    this.held.clear();
    this._sources.clear();
    this._pointerId = null;
    this.pointer.down = false;
    this._released = this._cancelled = false;
    this.pointerReleased = this.pointerCancelled = false;
    this._queue.clear();
    this.justPressed = new Set();
    this._click = false;
    this.clicked = false;
    this._wheel = 0;
    this.wheel = 0;
  }
}
