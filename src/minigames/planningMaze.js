import { text, roundRect, drawPlayer } from '../core/art.js';
import { drawLearningIcon } from '../core/learningArt.js';
import { mazeDefinition } from '../data/learningJourney.js';
import { wrap } from './shared.js';
import { BACK, NEXT, HELP, contains, learningButton, learningFrame, safeCount } from './learningShared.js';

const RESET = { x: 20, y: 486, w: 180, h: 46 };
const DIRECTIONS = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
const MOVE_DELAY = 0.15;
const PADS = {
  up: { x: 77, y: 210, w: 48, h: 48 },
  left: { x: 23, y: 264, w: 48, h: 48 },
  down: { x: 77, y: 264, w: 48, h: 48 },
  right: { x: 131, y: 264, w: 48, h: 48 },
};
const ARROWS = { left: '←', right: '→', up: '↑', down: '↓' };
export const MAZE_CUES = [
  'חצים לתנועה. אוספים לפי המספרים ומגיעים ליציאה.',
  'כאן יש קיר.',
  'נוגעים במשבצת ליד הדמות.',
  'קודם אוספים את כל הסמלים.',
  'הצעד הבא מסומן בתכלת.',
  'הגעתם!',
];
export const sameCell = (a, b) => a[0] === b[0] && a[1] === b[1];
export function walkable(def, cell) {
  return Array.isArray(cell) && cell.length === 2 && cell.every(Number.isInteger)
    && def.grid[cell[1]]?.[cell[0]] === '.';
}
export function routeTargets(def, route) {
  let n = 0;
  for (const cell of route) if (n < def.targets.length && sameCell(cell, def.targets[n].at)) n++;
  return n;
}
export function validRoute(def, route) {
  return Array.isArray(route) && route.length > 0 && route.length <= 512
    && walkable(def, route[0]) && sameCell(route[0], def.start) && route.every((cell, i) => walkable(def, cell)
      && (!i || Math.abs(cell[0] - route[i - 1][0]) + Math.abs(cell[1] - route[i - 1][1]) === 1));
}
// BFS for one segment. Used for incremental assistance and map solvability tests.
export function pathBetween(def, start, end) {
  if (!walkable(def, start) || !walkable(def, end)) return null;
  const queue = [[start]], seen = new Set([start.join(',')]);
  for (let i = 0; i < queue.length; i++) {
    const route = queue[i], tail = route.at(-1);
    if (sameCell(tail, end)) return route;
    for (const [dx, dy] of Object.values(DIRECTIONS)) {
      const next = [tail[0] + dx, tail[1] + dy], key = next.join(',');
      if (walkable(def, next) && !seen.has(key)) { seen.add(key); queue.push([...route, next]); }
    }
  }
  return null;
}
export function solveMaze(def) {
  const route = [[...def.start]];
  for (const end of [...def.targets.map(t => t.at), def.exit]) {
    const segment = pathBetween(def, route.at(-1), end);
    if (!segment) return null;
    route.push(...segment.slice(1));
  }
  return route;
}

export class PlanningMazeGame {
  constructor(game, params = {}) {
    this.game = game; this.levelId = params.levelId || 3; this.speaker = params.speaker;
    this.def = mazeDefinition(this.levelId); this.title = this.def.title;
    const saved = params.progress || {};
    const resumable = saved.version === 2 && walkable(this.def, saved.position)
      && Number.isInteger(saved.visited) && saved.visited >= 0 && saved.visited <= this.def.targets.length;
    // Old saves contain a proposed route, not a route the child actually walked.
    this.position = [...(resumable ? saved.position : this.def.start)];
    this.visited = resumable ? saved.visited : 0;
    this.steps = resumable ? safeCount(saved.steps) : 0;
    this.mistakes = safeCount(saved.mistakes); this.assisted = saved.assisted === true;
    this.complete = sameCell(this.position, this.def.exit) && this.visited === this.def.targets.length;
    this.from = [...this.position]; this.moveAge = MOVE_DELAY; this.cooldown = 0;
    this.hintCell = null; this.facing = 1; this.age = 0; this.serial = 0;
    this.finished = false; this.result = null; this.say(MAZE_CUES[this.complete ? 5 : 0]);
  }
  say(message, source = '') {
    this.feedback = this.narrationText = message; this.source = source;
    this.narrationKey = `maze:${++this.serial}`;
  }
  getVoiceLines() { return [...MAZE_CUES, ...this.def.targets.map(t => t.label)]; }
  getProgress() {
    return { version: 2, position: [...this.position], visited: this.visited,
      steps: this.steps, mistakes: this.mistakes, assisted: this.assisted };
  }
  get board() {
    const cell = Math.min(44, 306 / this.def.grid.length);
    const w = this.def.grid[0].length * cell;
    return { x: (960 - w) / 2, y: 100, cell, w, h: this.def.grid.length * cell };
  }
  cellCenter(cell) {
    const b = this.board; return { x: b.x + (cell[0] + 0.5) * b.cell, y: b.y + (cell[1] + 0.5) * b.cell };
  }
  move(dx, dy, audio) {
    if (this.complete) return;
    const cell = [this.position[0] + dx, this.position[1] + dy];
    if (!walkable(this.def, cell)) {
      if (this.feedback !== MAZE_CUES[1]) this.say(MAZE_CUES[1]);
      return;
    }
    this.from = [...this.position]; this.position = cell;
    this.moveAge = 0; this.steps++; this.hintCell = null;
    if (dx) this.facing = dx;
    const target = this.def.targets[this.visited];
    if (target && sameCell(cell, target.at)) {
      this.visited++; this.say(target.label); audio?.pickup?.(3);
    }
    if (sameCell(cell, this.def.exit)) {
      if (this.visited === this.def.targets.length) {
        this.complete = true; this.say(MAZE_CUES[5]); audio?.correct?.();
      } else this.say(MAZE_CUES[3]);
    }
  }
  reset() {
    this.complete = false; this.position = [...this.def.start]; this.from = [...this.position];
    this.visited = this.steps = this.cooldown = 0; this.moveAge = MOVE_DELAY;
    this.hintCell = null; this.say(MAZE_CUES[0]);
  }
  help() {
    if (this.complete) return;
    const target = this.def.targets[this.visited]?.at || this.def.exit;
    const segment = pathBetween(this.def, this.position, target);
    if (segment?.length > 1) {
      this.assisted = true; this.hintCell = [...segment[1]]; this.say(MAZE_CUES[4]);
    }
  }
  finish(cancelled) {
    this.finished = true;
    this.result = { kind: 'planningMaze', cancelled, success: !cancelled && this.complete,
      perfect: this.complete && !this.mistakes && !this.assisted, progress: this.getProgress() };
  }
  update(dt, input, audio) {
    if (this.finished) return;
    const press = a => input.pressed(a), click = input.clicked && !input.pointerCancelled, p = input.pointer;
    if (press('back') || click && contains(BACK, p)) { this.finish(true); return; }
    const elapsed = Math.max(0, Math.min(0.25, Number.isFinite(dt) ? dt : 0));
    this.age += elapsed; this.moveAge += elapsed;
    this.cooldown = Math.max(0, this.cooldown - elapsed);
    if (this.age < 0.18 || input.pointerCancelled) return;
    const confirm = press('confirm') || press('jump') || click && contains(NEXT, p);
    if (this.complete) { if (confirm) this.finish(false); return; }
    if (press('pause') || click && contains(RESET, p)) { this.reset(); return; }
    if (press('build') || click && contains(HELP, p)) { this.help(); return; }
    for (const [key, [dx, dy]] of Object.entries(DIRECTIONS)) {
      const pad = contains(PADS[key], p);
      if (press(key) || click && pad
          || this.cooldown === 0 && (input.down?.(key) || pad && p.down)) {
        this.cooldown = MOVE_DELAY; this.move(dx, dy, audio); return;
      }
    }
    const b = this.board;
    if (contains(b, p)) {
      input.cursor = 'pointer';
      if (click) {
        const dx = Math.floor((p.x - b.x) / b.cell) - this.position[0];
        const dy = Math.floor((p.y - b.y) / b.cell) - this.position[1];
        if (Math.abs(dx) + Math.abs(dy) === 1) this.move(dx, dy, audio);
        else this.say(MAZE_CUES[2]);
      }
    }
  }
  draw(ctx) {
    ctx.save(); learningFrame(ctx, this.title, 'חצים לתנועה · אוספים לפי המספרים ואז יוצאים');
    const b = this.board;
    for (let y = 0; y < this.def.grid.length; y++) for (let x = 0; x < this.def.grid[0].length; x++) {
      ctx.fillStyle = this.def.grid[y][x] === '#' ? '#173449' : '#f3e5bd';
      roundRect(ctx, b.x + x * b.cell + 1, b.y + y * b.cell + 1, b.cell - 2, b.cell - 2, 4); ctx.fill();
    }
    if (this.hintCell) {
      const p = this.cellCenter(this.hintCell);
      ctx.fillStyle = '#72d9ef'; ctx.fillRect(p.x - b.cell / 2 + 3, p.y - b.cell / 2 + 3, b.cell - 6, b.cell - 6);
    }
    this.def.targets.forEach((target, i) => {
      const p = this.cellCenter(target.at);
      if (i >= this.visited) {
        drawLearningIcon(ctx, target.icon, p.x, p.y, b.cell - 10);
        text(ctx, String(i + 1), p.x + b.cell * 0.3, p.y - b.cell * 0.3, { size: 12, color: '#173449', outline: '#fff' });
        if (i === this.visited) {
          ctx.strokeStyle = '#ce8e21'; ctx.lineWidth = 3;
          ctx.strokeRect(p.x - b.cell / 2 + 2, p.y - b.cell / 2 + 2, b.cell - 4, b.cell - 4);
        }
      } else text(ctx, '✓', p.x, p.y, { size: 19, color: '#378347', outline: null });
      const y = 145 + i * 67;
      drawLearningIcon(ctx, target.icon, 846, y, 35);
      wrap(ctx, target.label, 925, y + 27, 165, 20, { size: 15, color: '#fff2ce' });
      if (i < this.visited) text(ctx, '✓', 778, y, { size: 22, color: '#a0e1b1' });
    });
    const exit = this.cellCenter(this.def.exit);
    text(ctx, this.visited === this.def.targets.length ? 'יציאה' : '🔒', exit.x, exit.y,
      { size: 13, color: '#365b37', outline: '#fff' });
    const progress = Math.min(1, this.moveAge / 0.12);
    const visualCell = this.position.map((n, i) => this.from[i] + (n - this.from[i]) * progress);
    const pos = this.cellCenter(visualCell);
    drawPlayer(ctx, pos.x - 10, pos.y - 22, 20, 34,
      { state: progress < 1 ? 'run' : 'idle', animTime: this.age, facing: this.facing });
    text(ctx, this.feedback, 480, 444, { size: 19, color: '#fff1ce' });
    text(ctx, `${this.visited}/${this.def.targets.length}`, 99, 355, { size: 25, color: '#fff1ce' });
    if (this.complete) learningButton(ctx, NEXT, 'חוזרים למסע', true);
    else {
      for (const [key, r] of Object.entries(PADS)) learningButton(ctx, r, ARROWS[key]);
      learningButton(ctx, RESET, 'מחדש · P');
      learningButton(ctx, HELP, 'רמז · C');
    }
    ctx.restore();
  }
}
