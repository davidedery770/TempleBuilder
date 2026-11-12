import { BUILD_PARTS, BUILD_PHASES, PLAN, availableParts, canPlace, targetPoint, acceptsDrop } from '../data/level02.js';
import { codexOfLevel } from '../data/codex.js';
import { text, roundRect, circle, glow } from '../core/art.js';
import { drawConstructionPlan, drawBuildPart } from '../core/constructionArt.js';
import { ButtonSet } from '../core/ui.js';
import { constructionNotes } from '../data/voiceText.js';
import { drawLearningIcon } from '../core/learningArt.js';
import { drawParchment, drawSelectionBackdrop } from '../core/selectionArt.js';
import { artTime } from '../core/visualMotion.js';
const AUTO_HINT_ATTEMPTS = 3;
export const VIEW_3D = { x: 25, y: 142, w: 590, h: 310 };

/** סדנת בנייה: גרירה, לחיצה־ואז־לחיצה, או חצים ו־Enter. */
export class ConstructionScene {
  constructor() {
    this.buttons = new ButtonSet();
    this.rebuildButtons = new ButtonSet();
  }

  enter() {
    this.game.save.rememberLevel?.(2);
    this.active = true;
    this.viewToken = (this.viewToken || 0) + 1;
    this.viewMode = '3d';
    this.viewer3d = null;
    this.loading3d = false;
    this.orbitDrag = null;
    this.rebuildConfirm = false;
    const saved = this.game.save.data.construction;
    this.placed = new Set();
    // Restore only a legal prefix; ignore stale/unknown IDs from old definitions.
    for (const id of saved?.placed || []) {
      const p = BUILD_PARTS.find(p => p.id === id);
      if (p && canPlace(p, this.placed)) this.placed.add(id);
    }
    this.personal = new Set(this.game.save.data.materials || []);
    this.selected = availableParts(this.placed)[0] || null;
    this.drag = null;
    this.hint = false;
    this.failedPlacements = new Map();
    this.showNotes = false;
    this.t = 0;
    this.elapsed = 0;
    this.feedback = 'גוררים מהמגש אל הדגם';
    this.feedbackTime = 8;
    this._voiceEvent = { key: 'intro', texts: [this.feedback, this.selected?.name] };
    this.successFlash = 0;
    this.keyboardPoint = null;
    this.complete = this.placed.size === BUILD_PARTS.length;
    this.tutorialDone = this.placed.size > 0;
    this.revealInteriorAt = null;
    if (this.complete) this._award();
    if(typeof document==='undefined')this._fail3D();
    else void this.show3D();
  }

  get options() { return availableParts(this.placed); }
  exit() {
    this.active = false;
    this.viewToken++;
    this.viewer3d?.dispose();
    this.viewer3d = null;
    this.orbitDrag = this.drag = null;
  }

  async _create3DView() {
    const { Construction3D } = await import('../core/construction3d.js');
    return new Construction3D({ pixelRatio: this.game._k || 1 });
  }

  async show3D() {
    if (this.loading3d || !this.active) return;
    if (this.viewer3d) { this.viewMode = '3d'; return; }
    this.loading3d = true;
    const token = this.viewToken;
    try {
      const view = await this._create3DView();
      if (!this.active || token !== this.viewToken) { view.dispose(); return; }
      this.viewer3d = view;
      this.viewMode = '3d';
      this._say('גוררים מהמגש אל הדגם');
    } catch {
      if (this.active && token === this.viewToken) this._fail3D();
    } finally {
      if (token === this.viewToken) this.loading3d = false;
    }
  }

  _fail3D() {
    this.viewer3d?.dispose();
    this.viewer3d = null;
    this.viewMode = 'plan';
    this.orbitDrag = null;
    this._say('התלת־ממד אינו זמין במכשיר כרגע. אפשר להמשיך לבנות כרגיל במבט־על.');
  }

  _cameraInput(input) {
    const over = input.over(VIEW_3D.x, VIEW_3D.y, VIEW_3D.w, VIEW_3D.h);
    const view = this.viewer3d;
    if (!view) return;
    if (over && input.wheel && !this.drag) view.zoom(input.wheel);
    if (!this.drag && !this.keyboardPoint) {
      if (input.pressed('left')) view.orbit(-12, 0);
      if (input.pressed('right')) view.orbit(12, 0);
    }
    if (over && input.clicked && !this.drag) this.orbitDrag = { x: input.pointer.x, y: input.pointer.y };
    if (this.orbitDrag) {
      if (input.pointerCancelled) { this.orbitDrag = null; return; }
      const p = input.pointer;
      view.orbit(p.x - this.orbitDrag.x, p.y - this.orbitDrag.y);
      this.orbitDrag = p.down ? { x: p.x, y: p.y } : null;
      input.cursor = 'grabbing';
    } else if (over) input.cursor = this.drag ? 'grabbing' : 'grab';
  }
  get locationHintVisible() {
    return !this.complete && !!this.selected && canPlace(this.selected, this.placed);
  }
  _row(i) { return { x: 650, y: 125 + i * 62, w: 280, h: 56 }; }
  _say(message) {
    this.feedback = message; this.feedbackTime = 7;
    this._voiceEvent = { key: `message:${message}`, texts: [message] };
  }

  _pick(p) {
    this.selected = p;
    this.hint = false;
    this.keyboardPoint = null;
    this._voiceEvent = { key: `part:${p.id}`, texts: [p.name] };
    this.game.audio.menuMove();
  }

  tryPlace(p, x, y) {
    if (!p || this.complete || this.placed.has(p.id)) return false;
    if (!canPlace(p, this.placed)) {
      this._say(p.hint);
      this.game.audio.denied();
      return false;
    }
    if (!acceptsDrop(p, x, y, this.game.touch?.enabled ? 16 : 6)) {
      const attempts = (this.failedPlacements.get(p.id) || 0) + 1;
      this.failedPlacements.set(p.id, attempts);
      this._say(attempts >= AUTO_HINT_ATTEMPTS
        ? 'גוררים אל סימון התכלת. ' + p.hint
        : 'עוד לא במיקום המתאים. ' + p.hint);
      this.game.audio.denied();
      return false;
    }
    this.placed.add(p.id);
    this.tutorialDone = true;
    if(!BUILD_PARTS.some(other=>other.phase===p.phase&&!this.placed.has(other.id))) {
      this.game.save.awardChallenge(`construction:phase:${p.phase}`,true);
    }
    if(this.viewer3d) {
      this.viewer3d.cutaway = p.phase >= 3 && !['south','north','west','linen','goat','rams','tachash'].includes(p.id);
      if(p.id==='bases')this.viewer3d.focus('tent');
      if(p.id==='tachash')this.revealInteriorAt=this.t+1.8;
      if(p.id==='incense')this.viewer3d.focus('court');
    }
    this.failedPlacements.delete(p.id);
    this.game.save.saveConstruction(this.placed);
    this.game.audio.pickup(6);
    this.successFlash = 0.6;
    this._say('נוסף למשכן: ' + p.name);
    this.selected = this.options[0] || null;
    this.hint = false;
    this.keyboardPoint = null;
    if (this.placed.size === BUILD_PARTS.length) {
      this.complete = true;
      this._say('וַיְכַל מֹשֶׁה אֶת הַמְּלָאכָה — המשכן הושלם!');
      this._award();
      this.game.audio.levelComplete();
    }
    return true;
  }

  _award() {
    const save = this.game.save;
    save.saveConstruction(this.placed, true);
    save.addRelic('adanim');
    save.recordScore(2, BUILD_PARTS.length * 200);
    for (const c of codexOfLevel(2)) save.addCodex(c.id);
    save.unlockLevel(3);
  }

  _finish() {
    this.scenes.go('summary', {
      levelId: 2, score: BUILD_PARTS.length * 200, construction: true,
      built: this.placed.size, maxBuilt: BUILD_PARTS.length,
      materials: this.personal.size, cards: codexOfLevel(2).map(c => c.id), time: this.elapsed,
    });
  }

  restartConstruction() {
    this.placed = new Set();
    this.selected = availableParts(this.placed)[0];
    this.complete = false;
    this.rebuildConfirm = this.showNotes = this.hint = false;
    this.drag = this.orbitDrag = this.keyboardPoint = null;
    this.failedPlacements.clear();
    this.elapsed = 0; this.successFlash = 0;
    this.t=0;this.tutorialDone=false;this.revealInteriorAt=null;
    if(this.viewer3d)this.viewer3d.cutaway=false;
    this.game.save.saveConstruction([], false);
    this.viewer3d?.animations?.clear();
    if (this.viewer3d && !this.viewer3d.failed) this.viewer3d.sync?.(this.placed, this.selected, this.locationHintVisible, this.t);
    this.game.input?.flush();
    this._say('מתחילים להקים מחדש — מהאדנים. החומרים וכל ההישגים שלך נשמרו.');
    this.game.audio.menuPick();
  }

  _updateRebuild(input) {
    this.rebuildButtons.set([
      { id: 'cancel', x: 250, y: 321, w: 220, h: 42, label: 'לא, להשאיר את הבנייה', size: 16 },
      { id: 'confirm', x: 490, y: 321, w: 220, h: 42, label: 'כן, הקמה מחדש', size: 18 },
    ]);
    if (input.pressed('left') || input.pressed('right') || input.pressed('up') || input.pressed('down')) {
      this.rebuildButtons.moveFocus(1);
    }
    let action = this.rebuildButtons.update(input);
    if (input.pressed('back')) action = 'cancel';
    else if (!action && input.pressed('confirm')) action = this.rebuildButtons.focusedId;
    if (action === 'confirm') this.restartConstruction();
    else if (action === 'cancel') { this.rebuildConfirm = false; this.game.audio.menuMove(); }
  }

  update(dt) {
    this.t += dt;
    if(this.revealInteriorAt!==null&&this.t>=this.revealInteriorAt){
      this.revealInteriorAt=null;
      if(this.viewer3d){this.viewer3d.cutaway=true;this.viewer3d.focus('tent');}
    }
    this.feedbackTime = Math.max(0, this.feedbackTime - dt);
    this.successFlash = Math.max(0, this.successFlash - dt);
    if (this.scenes.transitioning) return;
    const { input } = this.game;
    if (this.rebuildConfirm) { this._updateRebuild(input); return; }
    if (!this.complete) this.elapsed += dt;
    this.buttons.set([
      { id: 'back', x: 817, y: 494, w: 113, h: 32, label: 'שמירה ויציאה', size: 13 },
      { id: 'hint', x: 650, y: 494, w: 150, h: 32, label: this.complete ? 'סיכום והמשך' : 'הצגת רמז · C', size: 14 },
      { id: 'notes', x: 40, y: 494, w: 178, h: 32, label: 'על השרטוט והמקורות', size: 13 },
      { id: 'rebuild', x: 235, y: 494, w: 180, h: 32, label: 'הקמה מחדש', size: 15, disabled: this.placed.size === 0 },
      ...(this.viewMode==='plan'?[{ id: 'view', x: 40, y: 112, w: 145, h: 26,
        label: this.loading3d ? 'טוען תלת־ממד…' : 'ניסיון תלת־ממד',
        size: 13, disabled: this.loading3d }]:[]),
      ...(this.viewMode === '3d' ? [
        { id: 'rotateL', x: 25, y: 457, w: 34, h: 25, label: '↶', size: 18 },
        { id: 'rotateR', x: 64, y: 457, w: 34, h: 25, label: '↷', size: 18 },
        { id: 'zoomIn', x: 103, y: 457, w: 34, h: 25, label: '+', size: 18 },
        { id: 'zoomOut', x: 142, y: 457, w: 34, h: 25, label: '−', size: 18 },
        { id: 'focusTent', x: 181, y: 457, w: 100, h: 25, label: 'מיקוד באוהל', size: 12 },
        { id: 'focusCourt', x: 286, y: 457, w: 82, h: 25, label: 'כל החצר', size: 12 },
        { id: 'cutaway', x: 373, y: 457, w: 116, h: 25,
          label: this.viewer3d?.cutaway ? 'סגירת הכיסויים' : 'חתך לצפייה בפנים', size: 12 },
      ] : []),
    ]);
    const action = this.buttons.update(input);
    if (input.pressed('back')) {
      if (this.showNotes) { this.showNotes = false; return; }
      if (this.orbitDrag) { this.orbitDrag = null; return; }
      if (this.drag) { this.drag = null; this._say('הגרירה בוטלה; החלק נשאר במגש.'); return; }
      this.scenes.go('levels', { focus: 2 }); return;
    }
    if (action === 'back') { this.drag = null; this.scenes.go('levels', { focus: 2 }); return; }
    if (action === 'notes') { this.showNotes = !this.showNotes; this.drag = null; return; }
    if (this.showNotes) {
      if (input.pressed('confirm') || input.clicked) this.showNotes = false;
      return;
    }
    if (action === 'rebuild') {
      this.rebuildConfirm = true;
      this.rebuildButtons.focus = 0;
      this.drag = this.orbitDrag = this.keyboardPoint = null;
      return;
    }
    if (action === 'view') {
      this.drag = this.orbitDrag = this.keyboardPoint = null;
      void this.show3D();
      return;
    }
    const view = this.viewer3d;
    if (this.viewMode === '3d' && view) {
      if (view.failed) { this._fail3D(); return; }
      if (action === 'rotateL') { view.orbit(-25, 0); return; }
      if (action === 'rotateR') { view.orbit(25, 0); return; }
      if (action === 'zoomIn') { view.zoom(-1); return; }
      if (action === 'zoomOut') { view.zoom(1); return; }
      if (action === 'focusTent') { view.focus('tent'); return; }
      if (action === 'focusCourt') { view.focus('court'); return; }
      if (action === 'cutaway') { view.cutaway = !view.cutaway; return; }
      this._cameraInput(input);
    }
    if (action === 'hint' || input.pressed('build')) {
      if (this.complete) this._finish();
      else { this.hint = !this.hint; if (this.selected) this._say(this.selected.hint); }
      return;
    }
    if (this.complete) {
      if (input.pressed('confirm')) this._finish();
      return;
    }
    const options = this.options;
    const index = Math.max(0, options.indexOf(this.selected));
    if (!this.keyboardPoint) {
      if (input.pressed('down')) this._pick(options[(index + 1) % options.length]);
      if (input.pressed('up')) this._pick(options[(index - 1 + options.length) % options.length]);
    }
    if (input.pressed('confirm')) {
      if (this.keyboardPoint) {
        const point=this.viewMode==='3d'?this.viewer3d?.pickPlan(this.keyboardPoint.x-VIEW_3D.x,this.keyboardPoint.y-VIEW_3D.y):this.keyboardPoint;
        if(point)this.tryPlace(this.selected,point.x,point.y);
      } else {
        // Keyboard placement remains a spatial puzzle, not automatic completion.
        this.keyboardPoint = this.viewMode==='3d'?{x:VIEW_3D.x+VIEW_3D.w/2,y:VIEW_3D.y+VIEW_3D.h/2}
          :{ x: PLAN.x + 50 * PLAN.scale, y: PLAN.y + 25 * PLAN.scale };
        this._say('חצים מזיזים את סמן ההנחה; Enter מניח. P חוזר לבחירת חלק.');
      }
    }
    if (input.pressed('pause')) this.keyboardPoint = null;
    if (this.keyboardPoint) {
      const p = this.keyboardPoint, step = this.viewMode==='3d'?8:PLAN.scale;
      if (input.pressed('left')) p.x -= step;
      if (input.pressed('right')) p.x += step;
      if (input.pressed('up')) p.y -= step;
      if (input.pressed('down')) p.y += step;
      const bounds=this.viewMode==='3d'?VIEW_3D:{x:PLAN.x,y:PLAN.y,w:100*PLAN.scale,h:50*PLAN.scale};
      p.x = Math.max(bounds.x, Math.min(bounds.x+bounds.w, p.x));
      p.y = Math.max(bounds.y, Math.min(bounds.y+bounds.h, p.y));
    }
    for (let i = 0; i < options.length; i++) {
      const r = this._row(i);
      if (!input.over(r.x, r.y, r.w, r.h)) continue;
      input.cursor = 'grab';
      if (input.clicked) {
        this._pick(options[i]);
        this.drag = { part: options[i], x: input.pointer.x, y: input.pointer.y, moved: false };
        return;
      }
    }
    if (this.drag) {
      const p = input.pointer;
      if (Math.hypot(p.x - this.drag.x, p.y - this.drag.y) > 4) this.drag.moved = true;
      input.cursor = 'grabbing';
      if (input.pointerCancelled) { this.drag = null; return; }
      if (input.pointerReleased || !p.down) {
        const drag = this.drag;
        this.drag = null;
        if (drag.moved && p.inside) {
          if (this.viewMode === '3d') {
            const point = this.viewer3d?.pickPlan(p.x - VIEW_3D.x, p.y - VIEW_3D.y);
            if (point) this.tryPlace(drag.part, point.x, point.y);
            else this._say('הניחו את החלק על משטח החצר, או חזרו למבט־על לעזרה.');
          } else this.tryPlace(drag.part, p.x, p.y);
        }
      }
    } else if (this.viewMode === 'plan' && input.clicked && !action && input.over(25, 142, 590, 310)) {
      this.tryPlace(this.selected, input.pointer.x, input.pointer.y);
    }
    if (this.viewMode === 'plan' && this.selected && input.over(25, 142, 590, 310)) input.cursor = 'crosshair';
  }

  draw(ctx) {
    drawSelectionBackdrop(ctx,960,540);
    glow(ctx, 330, 250, 420, '#31535b', 0.22);
    text(ctx, 'הֲקָמַת הַמִּשְׁכָּן', 480, 32, { size: 28, color: '#ffe2a4' });
    text(ctx, 'גוררים חלק — ובונים!', 480, 64, { size: 20, color: '#fff1cf' });
    const phase = this.selected?.phase ?? BUILD_PHASES.length - 1;
    for (let i = 0; i < BUILD_PHASES.length; i++) {
      const x = 914 - i * 152;
      circle(ctx, x, 96, 10, i <= phase ? '#d5b665' : '#394851');
      text(ctx, String(i + 1), x, 96, { size: 11, color: '#151d23', outline: null });
      text(ctx, BUILD_PHASES[i], x - 16, 96, { size: 11, align: 'right', color: i === phase ? '#ffe2a4' : '#a5b2ac' });
    }
    if (this.viewMode === '3d' && this.viewer3d) {
      try {
        const cursor=this.keyboardPoint||(this.drag?this.game.input.pointer:null);
        const point=cursor?this.viewer3d.pickPlan(cursor.x-VIEW_3D.x,cursor.y-VIEW_3D.y):null;
        this.viewer3d.setDrag?.(this.drag?.part||this.keyboardPoint&&this.selected,point);
        this.viewer3d.draw(ctx, VIEW_3D, this.placed, this.selected, this.locationHintVisible, this.t, this.game._k || 1);
      } catch { this._fail3D(); }
    }
    if(this.loading3d)text(ctx,'טוען דגם…',320,280,{size:26,color:'#fff0c9'});
    if (this.viewMode === 'plan') drawConstructionPlan(ctx, this.placed, this.selected, this.locationHintVisible, this.t);
    if (this.locationHintVisible) text(ctx, 'גוררים אל סימון התכלת', 320, 154, { size: 17, color: '#a5edff' });
    text(ctx, `הורכבו ${this.placed.size} מתוך ${BUILD_PARTS.length} קבוצות`, 598, 125, { size: 13, align: 'right', color: '#e8dbc0' });
    if (this.viewMode === 'plan') text(ctx, 'המחשה סכמטית · גג שקוף · סמלי כלים מוגדלים', 320, 480, { size: 11, color: '#9daea9' });
    this._drawTray(ctx);
    if(!this.tutorialDone&&!this.drag&&this.selected&&this.viewer3d&&this.t<16){
      const target=this.viewer3d.projectPart(this.selected.id),r=this._row(Math.max(0,this.options.indexOf(this.selected)));
      if(target){
        const phase=Math.min(1,artTime(this.t)%4/2.6),ease=phase*phase*(3-2*phase);
        const x=r.x+r.w/2+(VIEW_3D.x+target.x-r.x-r.w/2)*ease,y=r.y+r.h/2+(VIEW_3D.y+target.y-r.y-r.h/2)*ease;
        ctx.save();ctx.globalAlpha=0.8;text(ctx,'☝',x,y,{size:35,color:'#fff1b3'});ctx.restore();
      }
    }
    if (this.feedbackTime > 0) {
      this._wrap(ctx, this.feedback, 580, 393, 520, 16, '#ffe0a0', 12);
    }
    const marker = this.keyboardPoint || (this.drag ? this.game.input.pointer : null);
    if (marker) {
      if (this.drag && this.viewMode === 'plan') {
        const target = targetPoint(this.drag.part);
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.translate(marker.x - target.x, marker.y - target.y);
        drawBuildPart(ctx, this.drag.part, this.t);
        ctx.restore();
      }
      circle(ctx, marker.x, marker.y, 10, 'rgba(255,224,139,0.5)');
      text(ctx, '+', marker.x, marker.y, { size: 20, color: '#fff3c0' });
      if (this.drag) text(ctx, this.drag.part.name, marker.x, marker.y - 23, { size: 12 });
    }
    this.buttons.draw(ctx, this.t);
    if (this.successFlash) {
      ctx.save(); ctx.globalAlpha = this.successFlash * 0.12;
      ctx.fillStyle = '#ffe4a0'; ctx.fillRect(25, 142, 590, 310); ctx.restore();
    }
    if (this.showNotes) this._drawNotes(ctx);
    if (this.rebuildConfirm) this._drawRebuild(ctx);
  }

  _drawTray(ctx) {
    const options = this.options;
    if (this.complete) {
      text(ctx, 'הַמְּלָאכָה הֻשְׁלְמָה', 790, 180, { size: 24, color: '#ffe2a4' });
      this._wrap(ctx, 'המשכן וכליו במקומם. מעבר הירדן נפתח! אפשר להתבונן במבנה ואז להמשיך לסיכום.', 925, 227, 270, 24);
      text(ctx, 'שמות מ׳, ל״ג–ל״ד', 790, 330, { size: 14, color: '#bcb291' });
      return;
    }
    const counts={bases:96,south:20,north:20,west:'6 + 2',bars:15,linen:10,goat:11,veil:4,entrance:5};
    const names={bases:'אדני כסף',south:'קרשי הדרום',north:'קרשי הצפון',west:'קרשי מערב',bars:'בריחים',
      linen:'יריעות המשכן',goat:'יריעות עזים',rams:'עורות אילים',tachash:'עורות תחשים',veil:'עמודי הפרוכת',entrance:'עמודי הפתח'};
    const icons={bases:'silver',south:'boards',north:'boards',west:'boards',bars:'boards',linen:'shesh',goat:'goat',
      rams:'rams',tachash:'tachash',ark:'ark',veil:'argaman',table:'table',menorah:'menorah',incense:'altar',
      entrance:'argaman',altar:'altar',laver:'laver',court:'shesh',gate:'techelet'};
    options.forEach((p, i) => {
      const r = this._row(i), selected = this.selected?.id === p.id;
      drawParchment(ctx,r.x,r.y,r.w,r.h,selected);
      drawLearningIcon(ctx,icons[p.id],r.x+r.w-32,r.y+r.h/2,39);
      text(ctx,`\u2066× ${counts[p.id]||1}\u2069`,r.x+38,r.y+r.h/2,{size:20,color:'#4a3c28',outline:null});
      text(ctx,names[p.id]||p.name,r.x+r.w-63,r.y+r.h/2,{size:14,align:'right',color:'#4a3c28',outline:null});
    });
    const p = this.selected;
    if (!p) return;
    text(ctx,p.source,927,450,{size:12,align:'right',color:'#fff1ce'});
    text(ctx,'הכמויות הן קבוצות בנייה, לא מלאי האיסוף',790,478,{size:12,color:'#fff0cf'});
  }

  _wrap(ctx, str, x, y, width, lineH, color = '#e5dfcb', size = 14) {
    ctx.save(); ctx.font = `${size}px "Segoe UI", Arial, sans-serif`;
    let line = '';
    for (const word of str.split(' ')) {
      const next = line ? line + ' ' + word : word;
      if (ctx.measureText(next).width > width && line) {
        text(ctx, line, x, y, { size, color, align: 'right' });
        y += lineH; line = word;
      } else line = next;
    }
    if (line) text(ctx, line, x, y, { size, color, align: 'right' });
    ctx.restore();
  }

  _drawRebuild(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.84)'; ctx.fillRect(0, 0, 960, 540);
    roundRect(ctx, 160, 150, 640, 245, 12);
    ctx.fillStyle = '#24323a'; ctx.fill();
    text(ctx, 'להקים את המשכן מחדש?', 480, 186, { size: 26, color: '#ffe2a4' });
    this._wrap(ctx, 'ההרכבה הנוכחית תתחיל שוב מהאדנים. החומרים, כרטיסיות הידע, ניקוד השיא וכל השלבים שכבר נפתחו יישמרו.',
      766, 233, 572, 25, '#e5dfcb', 17);
    this.rebuildButtons.draw(ctx, this.t);
    text(ctx, '←→ לבחירה · Enter לאישור · ESC לביטול', 480, 377, { size: 12, color: '#b9c8c4' });
  }

  _drawNotes(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.84)'; ctx.fillRect(0, 0, 960, 540);
    roundRect(ctx, 110, 92, 740, 358, 12);
    ctx.fillStyle = '#24323a'; ctx.fill();
    text(ctx, 'מה מפורש בפסוקים — ומה המחשה?', 480, 125, { size: 24, color: '#ffe2a4' });
    const lines = [...(this.selected?[`${this.selected.name} · ${this.selected.source}`,`״${this.selected.quote}״`]:[]),
      ...constructionNotes(this.viewMode)];
    lines.forEach((line, i) => text(ctx, line, 820, 160 + i * 25, { size: 13, align: 'right' }));
    text(ctx, 'Enter / ESC / לחיצה לסגירה', 480, 420, { size: 13, color: '#b9c8c4' });
  }
}
