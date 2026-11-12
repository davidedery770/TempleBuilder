import { text, roundRect } from '../core/art.js';
import { drawLearningIcon } from '../core/learningArt.js';
import { wrap } from './shared.js';
import { learningDifficulty, memoryConcepts } from '../data/learningJourney.js';
import { shuffleMatchingIds } from './matching.js';
import { BACK, NEXT, HELP, contains, learningButton, learningFrame, safeCount } from './learningShared.js';

export const MEMORY_CUES = [
  'מוצאים זוגות.',
  'מחברים כלי לתפקידו.',
  'מנסים שוב.',
  'רמז לזוג.',
  'כל הזוגות נמצאו!',
];

export class MemoryGame {
  constructor(game, params = {}) {
    this.game = game; this.levelId = params.levelId || 1; this.speaker = params.speaker;
    this.profile = learningDifficulty(this.levelId); this.pairs = memoryConcepts(this.levelId);
    this.title = 'זיכרון כלי המשכן';
    const cards = this.pairs.flatMap(p => [0, 1].map(side => ({
      id: `${p.id}:${side}`, pairId: p.id, icon: p.icon,
      label: this.profile.relations && side === 1 ? p.role : p.label,
      role: this.profile.relations && side === 1,
    })));
    const saved = params.progress || {};
    const order = saved.order;
    this.cards = Array.isArray(order) && order.length === cards.length
      && new Set(order).size === cards.length && order.every(id => cards.some(c => c.id === id))
      ? order.map(id => cards.find(c => c.id === id)) : shuffleMatchingIds(cards);
    this.matchedIds = [...new Set(Array.isArray(saved.matchedIds)
      ? saved.matchedIds.filter(id => this.pairs.some(p => p.id === id)) : [])];
    this.mistakes = safeCount(saved.mistakes); this.assisted = saved.assisted === true;
    this.open = []; this.awaiting = false; this.resolveIn = 0; this.hinting = false; this.focus = 0;
    this.finished = false; this.result = null; this.age = 0; this.serial = 0;
    this.say(MEMORY_CUES[this.complete ? 4 : this.profile.relations ? 1 : 0]);
  }
  get complete() { return this.matchedIds.length === this.pairs.length; }
  say(value, source = '') {
    this.narrationText = value; this.narrationKey = `memory:${++this.serial}`;
    this.feedback = value; this.source = source;
  }
  getVoiceLines() {
    return [...MEMORY_CUES, ...this.cards.map(c => c.label)];
  }
  getProgress() {
    return { version: 1, started: true, order: this.cards.map(c => c.id),
      matchedIds: [...this.matchedIds], mistakes: this.mistakes, assisted: this.assisted };
  }
  cardRect(index) {
    const rows = Math.ceil(this.cards.length / 4), h = Math.min(108, 306 / rows);
    return { x: 908 - (index % 4 + 1) * 166, y: 98 + Math.floor(index / 4) * h, w: 156, h: h - 8 };
  }
  visible(index) { return this.open.includes(index) || this.matchedIds.includes(this.cards[index].pairId); }
  reveal(index, audio) {
    const card = this.cards[index];
    if (!card || this.awaiting || this.complete || this.visible(index)) return;
    this.open.push(index); this.say(card.label); audio?.menuMove?.();
    if (this.open.length < 2) return;
    const a = this.cards[this.open[0]], b = this.cards[this.open[1]];
    if (a.pairId === b.pairId) {
      this.matchedIds.push(a.pairId); audio?.correct?.();
      const pair = this.pairs.find(p => p.id === a.pairId);
      this.open = [];
      this.say(this.complete ? MEMORY_CUES[4] : pair.label);
    } else {
      this.mistakes++; this.awaiting = true; this.resolveIn = 0.9;
      this.say(MEMORY_CUES[2]);
    }
  }
  advance() {
    if (this.complete) { this.finish(false); return; }
    this.open = []; this.awaiting = this.hinting = false; this.resolveIn = 0;
    this.say('');
  }
  help() {
    if (this.complete || this.awaiting) return;
    this.assisted = true;
    const i = this.open[0] ?? this.cards.findIndex(c => !this.matchedIds.includes(c.pairId));
    this.open = [i, this.cards.findIndex((c, j) => j !== i && c.pairId === this.cards[i].pairId)];
    this.awaiting = this.hinting = true; this.resolveIn = 1.5; this.say(MEMORY_CUES[3]);
  }
  finish(cancelled) {
    this.finished = true;
    this.result = { kind: 'memory', cancelled, success: !cancelled && this.complete,
      perfect: this.complete && !this.mistakes && !this.assisted,
      correct: this.matchedIds.length, total: this.pairs.length, progress: this.getProgress() };
  }
  update(dt, input, audio) {
    if (this.finished) return;
    const press = a => input.pressed(a), click = input.clicked && !input.pointerCancelled;
    if (press('back') || click && contains(BACK, input.pointer)) { this.finish(true); return; }
    this.age += Math.max(0, dt);
    if (this.age < 0.18) return;
    if (this.awaiting) {
      this.resolveIn -= Math.max(0, dt);
      if (this.resolveIn <= 0) this.advance();
      return;
    }
    if (press('build') || click && contains(HELP, input.pointer)) { this.help(); return; }
    if (this.complete) {
      if (press('confirm') || press('jump') || click && contains(NEXT, input.pointer)) this.advance();
      return;
    }
    if (press('left')) this.focus = (this.focus + 1) % this.cards.length;
    if (press('right')) this.focus = (this.focus + this.cards.length - 1) % this.cards.length;
    if (press('down')) this.focus = (this.focus + 4) % this.cards.length;
    if (press('up')) this.focus = (this.focus + this.cards.length - 4) % this.cards.length;
    if (press('confirm') || press('jump')) this.reveal(this.focus, audio);
    for (let i = 0; i < this.cards.length; i++) {
      if (!contains(this.cardRect(i), input.pointer)) continue;
      input.cursor = 'pointer';
      if (click) { this.focus = i; this.reveal(i, audio); }
    }
  }
  draw(ctx) {
    ctx.save(); learningFrame(ctx, this.title, `${this.pairs.length} זוגות · ${this.profile.relations ? 'כלי ותפקידו' : 'איורים ושמות'}`);
    text(ctx, 'הכלים שהכרנו', 130, 112, { size: 20, color: '#fff1c9' });
    this.pairs.forEach((p, i) => {
      if (!this.matchedIds.includes(p.id)) return;
      const x = 76 + (i % 2) * 107, y = 159 + Math.floor(i / 2) * 67;
      drawLearningIcon(ctx, p.icon, x, y, 38);
      text(ctx, p.label, x, y + 25, { size: 12, color: '#fff1c9' });
    });
    this.cards.forEach((c, i) => {
      const r = this.cardRect(i), visible = this.visible(i), matched = this.matchedIds.includes(c.pairId);
      ctx.fillStyle = visible ? matched ? '#e3f1d9' : '#fff8e7' : '#153d59';
      roundRect(ctx, r.x, r.y, r.w, r.h, 10); ctx.fill();
      ctx.lineWidth = this.focus === i ? 3 : 1.5;
      ctx.strokeStyle = this.focus === i ? '#87e7ff' : '#c8ac70'; ctx.stroke();
      if (!visible) text(ctx, '✦', r.x + r.w / 2, r.y + r.h / 2, { size: 28, color: '#e8c779' });
      else if (c.role) wrap(ctx, c.label, r.x + r.w - 9, r.y + 24, r.w - 18, 20, { size: 15, color: '#294451', outline: null });
      else {
        drawLearningIcon(ctx, c.icon, r.x + r.w / 2, r.y + r.h * 0.37, Math.min(48, r.h * 0.54));
        text(ctx, c.label, r.x + r.w / 2, r.y + r.h - 14, { size: 14, color: '#294451', outline: null });
      }
    });
    text(ctx, this.feedback, 580, 445, { size: 19, color: '#fff1c9' });
    if (this.complete) learningButton(ctx, NEXT, 'חוזרים למסע', true);
    else learningButton(ctx, HELP, this.mistakes >= 3 ? 'רוצים רמז? · C' : 'רמז · C');
    text(ctx, `${this.matchedIds.length}/${this.pairs.length}`, 130, 385, { size: 24, color: '#fff1c9' });
    ctx.restore();
  }
}
