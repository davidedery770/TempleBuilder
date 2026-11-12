import { CampWorld } from '../game/campWorld.js';
import { CAMP, CAMP_STATIONS, CAMP_TENTS, ALL_CAMP_STATIONS, getCampStation } from '../data/camp01.js';
import { getMaterial } from '../data/materials.js';
import { codexOfLevel } from '../data/codex.js';
import { getLevel } from '../data/levels.js';
import { CampMap } from '../core/campMap.js';
import { ButtonSet } from '../core/ui.js';
import { HUD } from '../game/hud.js';
import { createMiniGame } from '../minigames/index.js';
import { text, roundRect, circle, drawMaterial } from '../core/art.js';
import { backdrop, panel, header, wrap } from '../minigames/shared.js';

const MINI_MAP = { x: 750, y: 350, w: 192, h: 143 };
export class CampScene {
  constructor() { this.buttons = new ButtonSet(); this.modalButtons = new ButtonSet(); }
  enter() {
    this.active = true; this.token = (this.token || 0) + 1;
    this.meta = getLevel(1);
    this.world = new CampWorld(this.game.save.data.camp || {});
    this.map = new CampMap(); this.viewer = null; this.mapMode = !!this.game.debug?.map;
    this.loading = false; this.t = 0; this.saveTimer = 0;
    this.paused = false; this.leaving = false; this.mini = null; this.miniStation = null;
    this.pending = null; this.near = null; this.toastTime = 0; this.usedQuestions = new Set();
    this.hud = new HUD(960, 540);
    this.dialog = this.world.done.size ? null : {
      intro: true, name: 'מַחֲנֵה יִשְׂרָאֵל — מֵהָעָם אֶל הַמְּלָאכָה',
      text: 'עברו בין אוהלי התורמים והאומנים. קבלו תרומות, עזרו באריגה ובהכנת משלוחים, והובילו קורה לנגרייה. חצים או WASD לתנועה, רווח לקפיצה, Enter לשיחה. אפשר גם ללחוץ על הקרקע או על תושב כדי להגיע אליו.',
      source: 'מבוסס על שמות ל״ה–ל״ו. מפת המחנה והמשימות הן המחשה משחקית.',
    };
    if (!this.mapMode) void this._load3D();
  }
  get view() { return this.mapMode || !this.viewer ? this.map : this.viewer; }
  async _createView() {
    const { Camp3D } = await import('../core/camp3d.js');
    return new Camp3D({ pixelRatio: this.game._k || 1 });
  }
  async _load3D() {
    if (typeof document === 'undefined') return;
    this.loading = true;
    const token = this.token;
    try {
      const view = await this._createView();
      if (!this.active || this.token !== token) { view.dispose(); return; }
      this.viewer = view;
    } catch {
      if (this.active && this.token === token) {
        this.mapMode = true;
        this._say('תלת־ממד אינו זמין כרגע — המחנה ואותן משימות זמינים במבט־על.');
      }
    } finally { if (this.token === token) this.loading = false; }
  }
  exit() {
    this._save(); this.active = false; this.token++;
    this.viewer?.dispose(); this.viewer = null;
  }
  _save() { this.game.save.saveCamp(this.world.snapshot()); this.saveTimer = 0; }
  _say(message) { this.toast = message; this.toastTime = 6; }
  goTo(station, interact = false) {
    if (!station) return;
    if (this.world.moveTo(station.at[0], station.at[1] + 1)) this.pending = interact ? station.id : null;
    else this._say('הדרך חסומה מנקודה זו. אפשר לזוז מעט ולבחור שוב את היעד.');
  }
  _open(station) {
    this.world.path = []; this.pending = null;
    if (this.world.done.has(station.id)) { this._say('התרומה הזאת כבר התקבלה. נמשיך לתחנה הבאה.'); return; }
    this.dialog = { ...station };
    if (station.kind === 'warehouse' && !this.world.ready) {
      this.dialog.text = `נאספו ${this.world.materials.size} מתוך 15 סוגי התרומה. היעד הבא: ${this.world.nextObjective.name}. לחצו C בדרך לקבלת מסלול.`;
    }
    this.game.audio.menuPick();
  }
  _award(id) {
    const received = this.world.award(id);
    if (!received.length) return;
    const save = this.game.save, station = getCampStation(id);
    // Persist the quest and inventory in one write, so reload cannot duplicate the award.
    save.data.materials = [...new Set([...(save.data.materials || []), ...received])];
    save.data.totalDonations += received.length;
    if (station.card && !save.data.codex.includes(station.card)) save.data.codex.push(station.card);
    if (this.world.ready && !save.data.codex.includes('materials15')) save.data.codex.push('materials15');
    this._save();
    received.forEach(id => this.hud.pulseMaterial(id));
    this._say('התקבלה תרומה: ' + received.map(id => getMaterial(id).short).join(' · '));
    this.game.audio.relic();
  }
  _acceptDialog() {
    const d = this.dialog; this.dialog = null;
    if (!d || d.intro) return;
    if (d.kind === 'gift') this._award(d.id);
    else if (d.kind === 'timber') {
      if (this.world.takeWood()) { this._save(); this._say('הקורה בידיך. ההליכה איטית יותר; היעד הבא הוא הנגרייה.'); }
      else this._say('הקורה כבר בדרך לנגרייה או נמסרה לאומנים.');
    } else if (d.kind === 'carpenter') {
      if (this.world.carrying) { this.world.deliverWood(); this._save(); }
      if (this.world.delivered && !this.world.done.has('wood')) {
        this.mini = createMiniGame('craft', { mode: 'saw', title: 'הֲכָנַת קוֹרַת הַשִּׁטִּים', source: d.source }, this.game);
        this.miniStation = 'wood';
      } else this._say('קודם מקבלים קורה במחסן עצי השיטים. C יסמן את היעד הבא.');
    } else if (d.kind === 'weaving') {
      this.mini = createMiniGame('weaving', { guided: true, speaker: 'עוזרים לנשים חכמות־הלב', title: 'מַטְוֶה וַאֲרִיגָה' }, this.game);
      this.miniStation = d.id;
    } else if (d.kind === 'packing') {
      this.mini = createMiniGame('craft', { mode: 'packing', title: d.name, items: d.items, source: d.source }, this.game);
      this.miniStation = d.id;
    } else if (d.kind === 'trivia') {
      this.mini = createMiniGame('trivia', { levelId: 1, count: 3, used: this.usedQuestions, speaker: 'זקן המחנה — אתגר רשות' }, this.game);
      this.miniStation = 'elder';
    } else if (d.kind === 'moshe') this.game.save.addCodex('moshe');
    else if (d.kind === 'warehouse' && this.world.ready) this._finish();
  }
  _finishMini() {
    const r = this.mini.result || {}, id = this.miniStation;
    this.mini = null; this.miniStation = null; this.game.input.flush();
    if (!r.success) { this._say('אפשר לחזור בכל רגע. שום תרומה שכבר התקבלה לא אבדה.'); return; }
    if (id === 'elder') {
      if (!this.world.quizDone) {
        this.world.quizDone = true; this.game.save.addCodex('terumah'); this._save();
      }
      this._say('כל הכבוד! הידע והעזרה מצטרפים למסע.');
    } else this._award(id);
  }
  _finish() {
    if (this.leaving || !this.world.ready) return;
    this.leaving = true; this.world.finished = true; this._save();
    const save = this.game.save;
    save.addRelic('tavnit'); save.recordScore(1, this.world.score + 1000); save.unlockLevel(2);
    for (const card of codexOfLevel(1)) save.addCodex(card.id);
    this.game.audio.levelComplete();
    this.scenes.go('summary', { levelId: 1, camp: true, score: this.world.score + 1000,
      materials: this.world.materials.size, stations: this.world.done.size, maxStations: CAMP_STATIONS.length,
      sparks: this.world.sparks.size, maxSparks: 3, cards: codexOfLevel(1).map(c => c.id), time: this.world.elapsed });
  }
  update(dt) {
    this.t += dt; this.toastTime = Math.max(0, this.toastTime - dt);
    const { input, audio } = this.game;
    this.hud.update(dt); audio.music.duck(!!this.dialog || !!this.mini || this.paused);
    if (this.scenes.transitioning || this.leaving) return;
    if (this.mini) {
      this.mini.update(dt, input, audio);
      if (this.mini.finished) this._finishMini();
      return;
    }
    if (this.dialog) {
      this.modalButtons.set([{ id: 'accept', x: 330, y: 411, w: 300, h: 44,
        label: this.dialog.intro ? 'יוצאים למחנה' : this.dialog.kind === 'gift' ? 'לקבל את התרומה' : 'נמשיך', size: 19 },
      { id: 'cancel', x: 660, y: 470, w: 160, h: 30, label: 'חזרה · ESC', size: 14 }]);
      const action = this.modalButtons.update(input);
      if (input.pressed('back') || action === 'cancel') this.dialog = null;
      else if (input.pressed('confirm') || action === 'accept') this._acceptDialog();
      return;
    }
    if (input.pressed('back') || input.pressed('pause')) this.paused = !this.paused;
    this.buttons.set(this.paused ? [
      { id: 'resume', x: 340, y: 260, w: 280, h: 42, label: 'המשך למחנה', size: 19 },
      { id: 'exit', x: 340, y: 318, w: 280, h: 42, label: 'שמירה ויציאה', size: 18 },
    ] : [
      { id: 'menu', x: 18, y: 16, w: 98, h: 32, label: 'תפריט', size: 15 },
      { id: 'view', x: 126, y: 16, w: 112, h: 32, label: this.mapMode ? 'תלת־ממד' : 'מבט־על', size: 14 },
      { id: 'goal', x: 18, y: 58, w: 220, h: 31, label: 'אל היעד הבא · C', size: 15 },
    ]);
    const action = this.buttons.update(input);
    if (action === 'exit') { this._save(); this.scenes.go('levels', { focus: 1 }); return; }
    if (action === 'resume') this.paused = false;
    if (action === 'menu') this.paused = true;
    if (this.paused) return;
    if (action === 'view') {
      this.mapMode = !this.mapMode;
      if (!this.mapMode && !this.viewer && !this.loading) void this._load3D();
      return;
    }
    if (input.pressed('build') || action === 'goal') this.goTo(this.world.nextObjective);
    const manual = input.axisX || input.down('up') || input.down('down');
    if (manual) this.pending = null;
    const found = this.world.update(dt, input);
    if (found.length) { audio.pickup(6); this._say('ניצוץ של חכמת לב נמצא!'); this._save(); }
    this.near = this.world.nearest();
    if (this.pending && this.world.near(getCampStation(this.pending))) this._open(getCampStation(this.pending));
    else if (input.pressed('confirm') && this.near) this._open(this.near);
    if (this.dialog) return;
    if (input.clicked && !action) this._click(input.pointer.x, input.pointer.y);
    this.saveTimer += dt;
    if (this.saveTimer >= 3) this._save();
  }
  _click(x, y) {
    if (x < 275 && y < 270 || y > 500 || y < 95) return;
    if (x >= MINI_MAP.x && x <= MINI_MAP.x + MINI_MAP.w && y >= MINI_MAP.y && y <= MINI_MAP.y + MINI_MAP.h) {
      const wx = CAMP.minX + (x - MINI_MAP.x) / MINI_MAP.w * (CAMP.maxX - CAMP.minX);
      const wz = CAMP.minZ + (y - MINI_MAP.y) / MINI_MAP.h * (CAMP.maxZ - CAMP.minZ);
      const station = ALL_CAMP_STATIONS.find(s => Math.hypot(s.at[0] - wx, s.at[1] - wz) < 4);
      if (station) this.goTo(station, true); else { this.world.moveTo(wx, wz); this.pending = null; }
      return;
    }
    let clicked = null;
    for (const s of ALL_CAMP_STATIONS) {
      const p = this.view.project(s.at[0], 1.5, s.at[1]);
      if (p && Math.hypot(x - p.x, y - p.y) < 25) clicked = s;
    }
    if (clicked) { if (this.world.near(clicked)) this._open(clicked); else this.goTo(clicked, true); }
    else {
      const p = this.view.pickWorld(x, y);
      if (p) { this.world.moveTo(p.x, p.z); this.pending = null; }
    }
  }
  draw(ctx) {
    try { this.view.draw(ctx, this.world, this.t, this.game._k || 1); }
    catch {
      this.viewer?.dispose(); this.viewer = null; this.mapMode = true;
      this._say('התלת־ממד נעצר; ממשיכים באותו מחנה במבט־על.'); this.map.draw(ctx, this.world, this.t);
    }
    this._hud(ctx);
    if (this.paused) { backdrop(ctx); panel(ctx, 290, 160, 380, 250); header(ctx, 'הַשְׁהָיָה', 'ההתקדמות נשמרת', 205); }
    this.buttons.draw(ctx, this.t);
    if (this.dialog) {
      backdrop(ctx); panel(ctx, 100, 24, 760, 492);
      header(ctx, this.dialog.name, this.dialog.intro ? 'מכל איש אשר ידבנו לבו' : 'פוגשים את האנשים שמאחורי החומרים', 62);
      wrap(ctx, this.dialog.text, 815, 164, 670, 32, { size: 21, color: '#f1e5c9' });
      wrap(ctx, this.dialog.source, 815, 366, 670, 22, { size: 13, color: '#b5bfad' });
      this.modalButtons.draw(ctx, this.t);
    }
    if (this.mini) this.mini.draw(ctx);
  }
  _hud(ctx) {
    const goal = this.world.nextObjective;
    for (const s of ALL_CAMP_STATIONS) {
      const p = this.view.project(s.at[0], 2.8, s.at[1]);
      if (!p || p.y < 112 || p.y > 438 || p.x < 20 || p.x > 940 || p.x < 285 && p.y < 275
          || p.x > 735 && p.y > 330) continue;
      text(ctx, (this.world.done.has(s.id) ? '✓ ' : '') + s.name, p.x, p.y - 5,
        { size: goal.id === s.id ? 13 : 11, color: goal.id === s.id ? '#ffe19b' : '#e0e2d2' });
    }
    ctx.fillStyle = 'rgba(13,24,31,0.85)'; ctx.fillRect(0, 0, 960, 100);
    text(ctx, 'מַחֲנֵה יִשְׂרָאֵל', 480, 28, { size: 23, color: '#ffe2a4' });
    text(ctx, `${this.world.done.size} מתוך ${CAMP_STATIONS.length} תחנות תרומה ומלאכה`, 480, 60, { size: 14 });
    this.hud._drawMaterials(ctx, { materials: this.world.materials, pointer: this.game.input.pointer });
    panel(ctx, 18, 106, 248, 154);
    text(ctx, this.world.carrying ? 'נושאים קורה לנגרייה' : 'היעד הבא', 250, 126, { size: 15, align: 'right', color: '#e7c77c' });
    wrap(ctx, goal.name, 250, 153, 216, 23, { size: 18 });
    text(ctx, 'C או הכפתור יובילו אותך בדרך פנויה', 250, 205, { size: 11, align: 'right', color: '#bdd0bf' });
    (goal.materials || ['shittim']).forEach((id, i) => drawMaterial(ctx, id, 242 - i * 28, 238, 20));
    this._minimap(ctx);
    if (this.toastTime > 0) {
      wrap(ctx, this.toast, 718, 435, 435, 19, { size: 14, color: '#ffe6a4' });
    } else if (this.near) text(ctx, `Enter — ${this.near.name}`, 480, 468, { size: 16, color: '#ffe6a4' });
    text(ctx, this.loading ? 'טוען מחנה תלת־ממדי…' : this.view === this.map ? 'אותו מחנה · מבט־על' : 'מחנה תלת־ממדי · מצלמה אלכסונית',
      20, 480, { size: 11, align: 'left', color: '#b4d0c7' });
    ctx.fillStyle = 'rgba(13,24,31,0.92)'; ctx.fillRect(0, 500, 960, 40);
    text(ctx, 'חצים / WASD תנועה · רווח קפיצה · Enter שיחה · C יעד · N מוזיקה · ESC תפריט', 480, 520, { size: 12 });
    text(ctx, `✦ ${this.world.sparks.size} מתוך 3`, 25, 284, { size: 13, align: 'left', color: '#f3d58e' });
  }
  _minimap(ctx) {
    const r = MINI_MAP;
    ctx.fillStyle = 'rgba(24,33,32,0.9)'; ctx.fillRect(r.x - 5, r.y - 25, r.w + 10, r.h + 30);
    text(ctx, 'מפת המחנה · לחצו על יעד', r.x + r.w / 2, r.y - 12, { size: 11, color: '#ddc795' });
    const p = (x, z) => ({ x: r.x + (x - CAMP.minX) / 84 * r.w, y: r.y + (z - CAMP.minZ) / 64 * r.h });
    for (const t of CAMP_TENTS) {
      const q = p(t.x - t.w / 2, t.z - t.d / 2);
      ctx.fillStyle = '#726b52'; ctx.fillRect(q.x, q.y, t.w / 84 * r.w, t.d / 64 * r.h);
    }
    for (const s of ALL_CAMP_STATIONS) {
      const q = p(...s.at);
      circle(ctx, q.x, q.y, s.id === this.world.nextObjective.id ? 4.5 : 3,
        this.world.done.has(s.id) ? '#7cce9c' : s.id === this.world.nextObjective.id ? '#ffe0a0' : '#c5b38b');
    }
    const q = p(this.world.player.x, this.world.player.z);
    circle(ctx, q.x, q.y, 4, '#71ccf0');
  }
}
