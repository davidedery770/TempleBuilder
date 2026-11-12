import { text } from '../core/art.js';
import { HEART_CHOICES } from '../data/learningJourney.js';
import { wrap } from './shared.js';
import { BACK, NEXT, contains, learningButton, learningFrame } from './learningShared.js';

export const HEART_INTRO = 'חנה דיברה על לבה, ושפתיה נעו וקולה לא נשמע. אפשר לעצור לרגע של הודיה, בקשה או כמיהה לקרבה לה׳. אין כאן תשובה נכונה או ניקוד.';
export class HeartGame {
  constructor(game, params = {}) {
    this.game = game; this.speaker = params.speaker || 'חנה'; this.focus = 0;
    this.age = 0; this.serial = 0; this.finished = false; this.result = null;
    this.narrationText = HEART_INTRO; this.narrationKey = 'heart:intro';
  }
  getVoiceLines() { return [HEART_INTRO, ...HEART_CHOICES.flatMap(c => [c.label, c.text])]; }
  choiceRect(i) { return { x: 680 - i * 275, y: 255, w: 250, h: 70 }; }
  choose(i) {
    this.focus = i; this.narrationText = HEART_CHOICES[i].text;
    this.narrationKey = `heart:${++this.serial}`;
  }
  finish(cancelled) {
    this.finished = true;
    // Reflection is not a scored challenge or a condition for a reward.
    this.result = { kind: 'heart', success: !cancelled, cancelled, unscored: true };
  }
  update(dt, input) {
    if (this.finished) return;
    const click = input.clicked && !input.pointerCancelled;
    if (input.pressed('back') || click && contains(BACK, input.pointer)) { this.finish(true); return; }
    this.age += dt; if (this.age < 0.18) return;
    if (input.pressed('right')) this.choose((this.focus + 2) % 3);
    if (input.pressed('left')) this.choose((this.focus + 1) % 3);
    if (input.pressed('confirm')) this.choose(this.focus);
    if (input.pressed('jump') || click && contains(NEXT, input.pointer)) { this.finish(false); return; }
    HEART_CHOICES.forEach((_, i) => {
      if (click && contains(this.choiceRect(i), input.pointer)) this.choose(i);
    });
  }
  draw(ctx) {
    ctx.save(); learningFrame(ctx, 'תפילת הלב', 'רגע עם חנה בשילה · שמואל א׳ א׳, י״ג');
    wrap(ctx, HEART_INTRO, 890, 130, 820, 32, { size: 23, color: '#fff0cf' });
    HEART_CHOICES.forEach((c, i) => learningButton(ctx, this.choiceRect(i), c.label, this.focus === i));
    wrap(ctx, this.narrationText, 890, 362, 820, 27, { size: 21, color: '#b6eaff' });
    learningButton(ctx, NEXT, 'חוזרים למסע · רווח', true);
    text(ctx, 'אפשר גם לדלג. המחשבות נשארות שלכם — לא מקלידים ולא שומרים דבר.', 480, 466, { size: 16, color: '#fff1cf' });
    ctx.restore();
  }
}
