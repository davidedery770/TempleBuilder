/**
 * play.js — סצנת המשחק.
 *
 * סדר הרינדור משחזר את מבנה Captain Claw:
 *   1. שמיים + פרלקסה רחוקה
 *   2. שכבת BACK
 *   3. ישויות (פריטים, אויבים, דמויות, שחקן)
 *   4. שכבת ACTION
 *   5. שכבת FRONT  ← מצוירת מעל השחקן, יוצרת עומק
 *   6. אפקטי אווירה (סופת חול)
 *   7. HUD
 *   8. מיני-משחק (אם פעיל) — מעל הכל
 *
 * אי-אלימות: אף אחד לא נהרג. המטה מקרין אור מרתיע, והאויב נרגע זמנית.
 * תחנות ידע: דמויות שמזמינות למיני-משחק קצר (טריוויה, מיון, אריגה).
 */

import { TileMap } from '../game/tilemap.js';
import { Player } from '../game/player.js';
import { Enemy, rectsOverlap } from '../game/enemy.js';
import { Pickup, Particles } from '../game/pickup.js';
import { HUD } from '../game/hud.js';
import { getLevel } from '../data/levels.js';
import { codexOfLevel } from '../data/codex.js';
import { buildLevel01 } from '../data/level01.js';
import { buildLevel03 } from '../data/level03.js';
import { buildLevel04 } from '../data/level04.js';
import { buildLevel05 } from '../data/level05.js';
import { buildLevel06 } from '../data/level06.js';
import { buildLevel07 } from '../data/level07.js';
import { buildLevel08, DREAM } from '../data/level08.js';
import { buildLevel09 } from '../data/level09.js';
import { buildLevel10 } from '../data/level10.js';
import {
  drawTempleBackdrop, templeTilePainter, drawMirror, drawBeam, drawBeamSource, drawBeamTarget, drawCart,
  drawGoldPomegranate, drawPillars, drawBronzeSea, drawCrowd,
} from '../core/templeArt.js';
import {
  drawLebanonBackdrop, drawCedar, lebanonTilePainter, drawSea, drawRaft, drawCedarBeam, drawHewnStone, drawStoneSite, drawQuietSign,
} from '../core/lebanonArt.js';
import {
  drawGivonMorning, drawDreamSky, drawCloudTile, drawMover, drawProverbScroll, drawFox, drawVines, drawBronzeAltar,
} from '../core/givonArt.js';
import { drawNobBackdrop, drawNobHouse, drawBush, drawWatcher, drawCave, drawLoaf } from '../core/nobArt.js';
import {
  drawShilohNight, drawOilLamp, drawGhostPlanks, drawDarkness, drawCallGuide, drawMenorahStand, LAMP_RADIUS,
} from '../core/shilohNightArt.js';
import { FieldSystem } from '../game/fields.js';
import { drawGilgalBackdrop, drawWheatField, drawBonusRoom, drawShofarChallenge } from '../core/natureArt.js';
import { MATERIALS, MATERIAL_GROUPS, getMaterial } from '../data/materials.js';
import { createMiniGame } from '../minigames/index.js';
import { ButtonSet } from '../core/ui.js';
import { drawAltar, drawExitGate, drawNPC, text, glow, circle, hashNoise } from '../core/art.js';
import { LEVELS } from '../data/levels.js';
import { drawCampBackdrop, drawCampTile } from '../core/campArt.js';
import { sceneryAssets } from '../core/sceneryAssets.js';
import { artTime } from '../core/visualMotion.js';
import { drawControlsHelp } from '../core/controlsHelp.js';
import { drawParchment, drawSelectionButton } from '../core/selectionArt.js';
import { CharacterGallery } from '../core/characterGallery.js';
import { selectedCharacter } from '../data/characters.js';
import { drawShilohBackdrop, drawShilohTile, drawOliveTrees, drawOrchardPress } from '../core/shilohArt.js';
import { drawLearningIcon } from '../core/learningArt.js';

/** מפעלים לבניית שלבים — שלב חדש נרשם כאן */
const LEVEL_BUILDERS = {
  1: buildLevel01,
  3: buildLevel03,
  4: buildLevel04,
  5: buildLevel05,
  6: buildLevel06,
  7: buildLevel07,
  8: buildLevel08,
  9: buildLevel09,
  10: buildLevel10,
};

/**
 * האם השחקן נוחת על האויב מלמעלה: נופל, וכפות רגליו בחלק העליון של האויב.
 * (נגיעה מהצד, או בעלייה, עדיין פוגעת.)
 */
export function isStomp(player, enemy) {
  return player.vy > 60 && player.y + player.h <= enemy.y + enemy.h * 0.5 + 6;
}

const BEAM_TURN = {
  '/': { right: 'up', up: 'right', left: 'down', down: 'left' },
  '\\': { right: 'down', down: 'right', left: 'up', up: 'left' },
};
const BEAM_STEP = { right: [1, 0], left: [-1, 0], up: [0, -1], down: [0, 1] };

/**
 * מסלול קרן השמש בחידת אור: מתקדמת תא אחרי תא, מתחזרת במראות, ונעצרת באריח
 * מוצק, בקצה המפה או במטרה. מחזירה נקודות (מרכזי תאים) ואם המטרה הוארה.
 */
export function traceBeam(pz, map) {
  let { col, row, dir } = pz.source;
  const points = [[col * 32 + 16, row * 32 + 16]];
  for (let steps = 0; steps < 200; steps++) {
    const [dc, dr] = BEAM_STEP[dir];
    col += dc; row += dr;
    const center = [col * 32 + 16, row * 32 + 16];
    if (col < 0 || row < 0 || col >= map.cols || row >= map.rows || map.isSolid(col, row)) {
      points.push([center[0] - dc * 16, center[1] - dr * 16]);
      return { points, hit: false };
    }
    if (col === pz.target.col && row === pz.target.row) { points.push(center); return { points, hit: true }; }
    const m = pz.mirrors.find(x => x.col === col && x.row === row);
    if (m) { points.push(center); dir = BEAM_TURN[m.o][dir]; }
  }
  return { points, hit: false };
}

/** כמה שניות בתוך אלומת הצופה עד שהוא "רואה" (שלב 7) */
export const SUSPICION_TIME = 0.5;

/** אייקון קטן מעל תחנת ידע, לפי סוג המיני-משחק */
const STATION_ICON = { trivia: '❓', weaving: '🧵', sorting: '🧺', matching: '↔', waterChannels:'💧', olivePress:'🫒',
  memory: '▦', planningMaze: '↱', heart: '♡', showbread: '🍞', dreamChoice: '✨', stoneFit: '🧱', levites: '🎵' };

export class PlayScene {
  constructor() {
    this.ready = false;
    this.pauseButtons = new ButtonSet();
  }

  enter(params) {
    const levelId = params.levelId || 1;
    const builder = LEVEL_BUILDERS[levelId];
    if (!builder) throw new Error(`אין בנאי לשלב ${levelId}`);

    this.meta = getLevel(levelId);
    this.game.save.rememberLevel?.(levelId);
    this.def = builder();

    this.map = new TileMap(
      this.def.back, this.def.action, this.def.front, this.meta.palette,
    );
    this.scenery = sceneryAssets();
    if (levelId === 1) this.map.tilePainter = drawCampTile;
    if (levelId === 5) this.map.tilePainter = drawShilohTile;
    if (levelId === 9) this.map.tilePainter = lebanonTilePainter;
    if (levelId === 10) this.map.tilePainter = templeTilePainter;
    if (levelId === 8) {
      // Dream floor and walls are soft clouds; the rest of Gibeon keeps the regular ground.
      this.map.tilePainter = (ctx, ch, x, y, col, row, layer, map) => {
        if (ch !== '#' || col < DREAM.from || col > DREAM.to) return false;
        drawCloudTile(ctx, x, y, !map.isSolid(col, row - 1), hashNoise(col, row));
        return true;
      };
    }

    this.player = new Player(this.def.spawn.x, this.def.spawn.y);
    this.player.character = selectedCharacter(this.game.save);
    this.particles = new Particles();
    this.hud = new HUD(this.game.width, this.game.height);

    this.enemies = this.def.enemies.map(e =>
      new Enemy(e.type, e.x, e.y, {
        patrolLeft: e.patrolLeft,
        patrolRight: e.patrolRight,
      }));

    this.pickups = [...this.def.pickups, ...(this.def.proverbs || [])].map(p =>
      new Pickup(p.type, p.x, p.y, {
        text: p.text, source: p.source,
        kind: p.kind, relicId: p.relicId, cardId: p.cardId,
        tribe: p.tribe, stoneIndex: p.stoneIndex, treeId:p.treeId, hidden: p.hidden,
      }));

    this.checkpoints = this.def.checkpoints.map(c => ({ ...c, lit: false }));
    this.npcs = this.def.npcs.map(n => ({ ...n, talked: false }));
    this.stations = (this.def.stations || []).map(s => ({ ...s, done: false }));
    this.fields = new FieldSystem(this.def.fields);
    this.grain = 0;
    this.olives = 0;
    this.orchardTrees = (this.def.orchard?.trees || []).map(tree=>({...tree,harvested:false,shake:0}));
    this.orchardWatered = false;
    this.challengeDone = false;
    this.challengeProgress = null;
    this.bonusRooms = (this.def.bonusRooms || []).map(b => ({ ...b, open: false, taken: false }));
    // --- לילה בשילה (שלב 6): שמן, פנסים, קולות קוראים ושער החצר ---
    this.oil = 0;
    this.lamps = (this.def.lamps || []).map(l => ({ ...l, lit: false, warned: false }));
    this.calls = (this.def.calls || []).map(c => ({ ...c, heard: false }));
    this.callRun = null;
    this.gateOpen = false;
    this._oilTaught = false;
    // --- נוב (שלב 7): צופים, שיחים, לחם הפנים ---
    this.watchers = (this.def.watchers || []).map(w => ({ ...w, pause: 0, turning: false }));
    this.hasBread = false;
    this.delivered = false;
    this.caught = 0;
    this.hiddenNow = false;
    this._grace = 0;
    // --- גבעון (שלב 8): במות נעות, עננים קפיציים, משלים ושועלים ---
    this.movers = (this.def.movers || []).map(m => ({ ...m, x0: m.x, y0: m.y, dx: 0, dy: 0, squash: 0 }));
    this.map.movers = this.movers;
    this.moverClock = 0;
    this.foxes = (this.def.foxes || []).map(f => ({ ...f, y0: f.y, vy: 0, facing: -1, caught: false, fade: 1, t: 0, onGround: true }));
    this.foxesCaught = 0;
    this.proverbsFound = 0;
    this._dreamShown = false;
    // --- הלבנון (שלב 9): קורות ארז, אבני גזית, ים ואזור שקט ---
    this.cedarsFound = 0;
    this.hewnFound = 0;
    this.splashes = 0;
    this.stonesBroken = 0;
    this._shushAt = -9;
    // --- חנוכת הבית (שלב 10): חידות אור, רימוני זהב והענן ---
    this.puzzles = (this.def.puzzles || []).map(pz => ({
      ...pz, mirrors: pz.mirrors.map(m => ({ ...m })), solved: false, lit: false, points: [],
    }));
    this.nearMirror = null;
    this.rimonim = 0;
    this.cloudFill = 0;

    this.game.camera.setBounds(0, 0, this.map.pixelW, this.map.pixelH);
    this.game.camera.snapTo(this.player.centerX, this.player.centerY);

    // --- מצב ריצה ---
    this.t = 0;
    this.score = 0;
    this.relicTaken = false;
    this.sparks = 0;
    this.paused = false;
    this.pausePanel = null;
    this.gallery = null;
    this.activePlayTime = 0;
    this.nextStationAt = 0;
    this.characterNotice = 0;
    this.finished = false;
    this.cardsFound = new Set();
    this._respawnDelay = 0;
    this._warnedExit = false;

    /** המצרכים שנאספו בריצה הזו (מזהי MATERIALS) */
    this.materialsFound = new Set();
    this.materialCounts = {};
    this._allMaterialsAwarded = false;

    /** מיני-משחק פעיל, אם יש */
    this.mini = null;
    this.miniStation = null;
    this.stationsDone = 0;
    this.nearStation = null;
    /** שאלות טריוויה שכבר נשאלו, כדי שלא יחזרו */
    this.triviaUsed = new Set();

    // --- סופת חול ---
    const ss = this.def.sandstorm;
    this.storm = ss ? {
      ...ss,
      timer: ss.interval * 0.6,   // הסערה הראשונה לא מיד בהתחלה
      active: false,
      strength: 0,
      particles: this._makeStormParticles(90),
    } : null;

    // --- טיימר מים (שלב 3) ---
    this.stones = 0;
    this.hasShofar = !!this.def.startShofar;
    this._waterWarned = false;
    this._floodHurt = 0;
    const wt = this.def.waterTimer;
    this.water = wt ? {
      remaining: wt.startSec,
      capacity: wt.startSec,
      bonusSec: wt.bonusSec,
      maxStones: wt.maxStones,
      warnAt: wt.warnAt ?? 20,
      flooding: false,
      floodLevel: 0,
    } : null;

    this.waterGates = (this.def.waterGates || []).map(g => ({
      ...g, open: false, timer: 0,
    }));

    // A replay starts fresh counters, so say clearly that the stage itself stays completed.
    const replay = this.game.save.hasRelic(this.meta.relic.id);
    const best = this.game.save.bestScore(levelId);
    this.hud.showBanner(this.meta.name,
      replay ? `✓ הַשָּׁלָב כְּבָר הֻשְׁלַם${best ? ` · שִׂיא: ${best.toLocaleString('he-IL')}` : ''} — מְשַׂחֲקִים שׁוּב` : this.meta.subtitle,
      3.2);
    this.ready = true;

    this._applyDebug();
  }

  exit() {
    this.ready = false;
  }

  /**
   * קישורי דיבאג (לבדיקה בלבד): ?start=play&px=1500&mini=sorting&fill=9
   *   px   — מקפיץ את השחקן לעמודה/מיקום X בפיקסלים
   *   mini — פותח מיני-משחק מיד
   *   fill — ממלא את N המצרכים הראשונים ברשימה
   */
  _applyDebug() {
    const dbg = this.game.debug;
    if (!dbg) return;

    if (dbg.px) {
      this.player.x = dbg.px;
      this.player.y = 40;
      this.game.camera.snapTo(this.player.centerX, 300);
    }
    if (dbg.fill) {
      MATERIALS.slice(0, dbg.fill).forEach(m => this.materialsFound.add(m.id));
    }
    if (dbg.mini) {
      this.mini = createMiniGame(dbg.mini, {
        levelId: this.meta.id, count: 3, used: this.triviaUsed,
      }, this.game);
      this.miniStation = { id: 'debug', done: false };
    }
  }

  _makeStormParticles(n) {
    const arr = [];
    for (let i = 0; i < n; i++) {
      arr.push({
        x: Math.random() * this.game.width,
        y: Math.random() * this.game.height,
        sp: 200 + Math.random() * 420,
        r: 0.8 + Math.random() * 2.4,
        a: 0.12 + Math.random() * 0.35,
      });
    }
    return arr;
  }

  // -------------------------------------------------------------------------
  // עדכון
  // -------------------------------------------------------------------------

  update(dt) {
    if (!this.ready) return;
    this.t += dt;

    const { input, audio, camera } = this.game;

    this.hud.update(dt);

    // המוזיקה מתחלשת בזמן מיני-משחק והשהייה, כדי שלא תפריע לקריאה
    audio.music.duck(!!this.mini || this.paused);

    // --- מיני-משחק פעיל: הכל קופא חוץ ממנו ---
    if (this.mini) {
      this.mini.update(dt, input, audio);
      if (this.mini.finished) this._finishMini(audio);
      camera.update();
      return;
    }

    // --- דיאלוג פתוח: הכל קופא ---
    if (this.hud.dialogOpen) {
      if (input.pressed('confirm') || input.pressed('jump')
          || input.pressed('attack') || input.clicked) {
        this.hud.advanceDialog();
      }
      camera.update();
      return;
    }

    // --- השהיה ---
    if (this.paused && this.pausePanel) {
      this._updatePause(input, audio, dt);
      return;
    }
    if (input.pressed('back') || input.pressed('pause')) {
      this.paused = !this.paused;
      audio.menuMove();
    }
    if (this.paused) {
      this._updatePause(input, audio, dt);
      return;
    }
    this.activePlayTime += dt;
    this.characterNotice = Math.max(0, this.characterNotice - dt);

    // --- מוות והחייאה ---
    if (!this.player.alive) {
      this.player.update(dt, input, this.map, audio);
      this._respawnDelay += dt;

      if (this._respawnDelay > 1.4) {
        this._respawnDelay = 0;
        this.player.lives--;

        if (this.player.lives < 0) {
          this.scenes.go('levels', { focus: this.meta.id });
          return;
        }

        this.player.respawn();
        camera.snapTo(this.player.centerX, this.player.centerY);
        this._calmEnemiesNear(this.player.centerX);
      }
      camera.update();
      return;
    }

    // --- סופת חול ---
    this._updateStorm(dt);

    // --- טיימר מים + שופר ---
    this._updateWater(dt, audio);
    this.fields.update(dt);
    this._updateShofar(input, audio);
    this._updateWaterGates(dt);

    // --- במות נעות זזות לפני השחקן, כדי שיוכל לנסוע איתן ---
    this._updateMovers(dt);

    // --- שחקן ---
    this.player.update(dt, input, this.map, audio);
    for (const m of this.movers) if (m.squash === 1) { m.squash = 0.999; audio.boing?.(); }

    // דחיפת הרוח: כפיפה או מחסה ליד מזבח מגינים; מי שנשאר חשוף מאבד לב.
    if (this.storm && this.storm.active) {
      const sheltered = this.player.crouching || this.checkpoints.some(c =>
        Math.abs(this.player.centerX - (c.x + c.w / 2)) < 70);
      this.player.vx -= this.storm.force * this.storm.strength * dt * (sheltered ? 0.15 : 1);
      this.storm.exposure = sheltered ? 0 : (this.storm.exposure || 0) + dt * this.storm.strength;
      if (this.storm.exposure > (this.storm.hurtAfter ?? 2.4)) {
        this.storm.exposure = 0;
        if (this.player.hurt(1, -1, audio)) this.particles.dust(this.player.centerX, this.player.centerY, -1, 6);
      }
    }

    // אבק בריצה
    if (this.player.onGround && Math.abs(this.player.vx) > 150
        && Math.random() < dt * 14) {
      this.particles.dust(
        this.player.centerX, this.player.y + this.player.h,
        -Math.sign(this.player.vx), 1,
      );
    }

    this._updateEnemies(dt, audio);
    this._updatePickups(dt, audio);
    this._updateCheckpoints(audio);
    this._updateNPCs(audio);
    this._updateOrchard(input,audio,dt);
    this._updateNight(audio, dt);
    this._updateStealth(audio, dt);
    this._updateGivon(audio, dt);
    this._updateLebanon(audio);
    this._updateSea(audio);
    this._updatePuzzles(input, audio);
    this._updateStations(input, audio, dt);
    this._updateHarvestFeatures(input, audio);
    this._checkExit(audio);

    this.particles.update(dt);

    camera.follow(this.player.centerX, this.player.centerY);
    camera.update();
  }

  _updatePause(input, audio, dt = 0) {
    const W = this.game.width, H = this.game.height;
    if (this.pausePanel === 'controls') {
      if (input.pressed('back') || input.pressed('confirm') || input.clicked && input.over(350,458,260,50)) {
        this.pausePanel = null; this.game.input.flush(); audio.menuMove();
      }
      return;
    }
    if (this.pausePanel === 'characters') {
      this.gallery.update(dt,input,audio);
      if (this.gallery.closed) {
        this.pausePanel=null;this.gallery=null;
        this.player.character=selectedCharacter(this.game.save);
        this.game.input.flush();
      }
      return;
    }
    this.pauseButtons.set([
      { id: 'resume', x: W / 2 - 160, y: H / 2 - 65, w: 320, h: 48, label: 'ממשיכים', size: 22 },
      { id: 'help', x: W / 2 - 160, y: H / 2 - 5, w: 320, h: 48, label: 'איך משחקים?', size: 22 },
      { id: 'characters', x: W / 2 - 160, y: H / 2 + 55, w: 320, h: 48, label: 'הדמויות שלי', size: 22 },
      { id: 'exit', x: W / 2 - 160, y: H / 2 + 115, w: 320, h: 48, label: 'בחירת שלב', size: 20 },
    ]);

    if (input.pressed('down')) this.pauseButtons.moveFocus(1);
    if (input.pressed('up')) this.pauseButtons.moveFocus(-1);

    let choice = this.pauseButtons.update(input);
    if (!choice && input.pressed('confirm')) choice = this.pauseButtons.focusedId;

    if (choice === 'resume') {
      this.paused = false;
      audio.menuMove();
    } else if (choice === 'help') {
      this.pausePanel='controls';audio.menuMove();
    } else if (choice === 'characters') {
      this.pausePanel='characters';this.gallery=new CharacterGallery(this.game);audio.menuMove();
    } else if (choice === 'exit') {
      audio.menuPick();
      this.scenes.go('levels', { focus: this.meta.id });
    }
  }

  _updateStorm(dt) {
    const s = this.storm;
    if (!s) return;

    s.timer -= dt;

    if (!s.active && s.timer <= 0) {
      s.active = true;
      s.timer = s.duration;
      this.hud.showBanner('סוּפַת חוֹל!', this.game.touch?.enabled
        ? 'הִתְכּוֹפְפוּ (מַטָּה) אוֹ עִמְדוּ לְיַד מִזְבֵּחַ' : '↓ הִתְכּוֹפְפוּ אוֹ עִמְדוּ לְיַד מִזְבֵּחַ', 2.4);
    } else if (s.active && s.timer <= 0) {
      s.active = false;
      s.timer = s.interval;
    }

    // עוצמה עולה ויורדת בהדרגה — לא מתג בינארי
    const target = s.active ? 1 : 0;
    s.strength += (target - s.strength) * Math.min(1, dt * 1.6);

    if (s.strength > 0.05) {
      const W = this.game.width;
      for (const p of s.particles) {
        p.x -= p.sp * s.strength * dt;
        p.y += Math.sin(this.t * 3 + p.y * 0.05) * 18 * dt;
        if (p.x < -6) {
          p.x = W + Math.random() * 60;
          p.y = Math.random() * this.game.height;
        }
      }
    }
  }

  _updateEnemies(dt, audio) {
    const player = this.player;
    const light = player.attackBox;     // אזור האור של המטה

    for (const e of this.enemies) {
      // עדכון רק לאויבים קרובים — חוסך עבודה במפה ארוכה
      if (e.gone) continue;
      const near = Math.abs(e.centerX - player.centerX) < this.game.width;
      if (near || e.vanishing) e.update(dt, this.map, player);
      if (e.gone || e.vanishing) continue;

      // אור המטה מפזר באור, גם אם האויב כבר רגוע ליד נקודת החייאה.
      if (light && rectsOverlap(light, e.hitbox)) {
        if (e.disperse()) {
          this.particles.burst(e.centerX, e.centerY, '#fff3b0', 10, 110);
          audio.enemyHit();
        }
        continue;
      }

      // רק אויב לא-רגוע פוגע במגע
      if (e.dangerous && rectsOverlap(player, e.hitbox)) {
        // קפיצה מלמעלה מפזרת באור כמו המטה, עם הדיפה קלה לשחקן.
        if (isStomp(player, e)) {
          if (e.disperse()) {
            this.particles.burst(e.centerX, e.y, '#fff3b0', 12, 120);
            audio.enemyHit();
          }
          player.bounce();
          continue;
        }

        const dir = Math.sign(player.centerX - e.centerX) || 1;
        if (player.hurt(e.def.damage, dir, audio)) {
          this.game.camera.shake(7);
          this.particles.burst(player.centerX, player.centerY, '#ff6b5a', 10);
        }
      }
    }
  }

  /** אחרי החייאה: אויבים סמוכים נרגעים, כדי שלא תיתקע בלולאה */
  _calmEnemiesNear(x) {
    for (const e of this.enemies) {
      if (Math.abs(e.centerX - x) < 360) e.repel(0);
    }
  }

  _updatePickups(dt, audio) {
    const player = this.player;

    for (const p of this.pickups) {
      if (p.collected || p.dormant) continue;

      // אנימציה רק למה שקרוב
      if (Math.abs(p.x - player.centerX) < this.game.width) p.update(dt);

      if (!rectsOverlap(player, p.hitbox)) continue;

      p.collected = true;
      this._collect(p, audio);
    }
  }

  _collect(p, audio) {
    const cx = p.x + p.size / 2;
    const cy = p.y + p.size / 2;

    switch (p.type) {
      case 'olive': {
        this.olives++;
        this.score += p.value;
        this.particles.burst(cx,cy,'#bad779',10,120);
        audio.pickup(4);
        if(this.olives===this.def.orchard.required)this.hud.showBanner('הסל מלא!', 'ממשיכים לבית הבד',2.4);
        break;
      }
      case 'grain': {
        this.grain++;
        this.score += p.value;
        this.particles.burst(cx, cy, '#ffe49b', 12, 130);
        audio.pickup(4);
        if (this.grain >= this.def.harvest.required && !this.relicTaken) {
          this.relicTaken = true;
          this._unlockCard('omer');
          this.hud.showBanner('רֵאשִׁית הַקָּצִיר נֶאֶסְפָה', 'המשיכו אל אתגר השופר ליד השער', 3);
          audio.relic();
        }
        break;
      }
      case 'donation': {
        const m = getMaterial(p.kind);
        const isNew = !this.materialsFound.has(p.kind);
        this.score += p.value;
        this.materialsFound.add(p.kind);
        this.materialCounts[p.kind] = (this.materialCounts[p.kind] || 0) + 1;
        this.game.save.addMaterials([p.kind]);
        this.game.save.addMaterialCount(p.kind);
        this.hud.pulseMaterial(p.kind);

        const color = MATERIAL_GROUPS[m.group].color;
        this.particles.burst(cx, cy, color, isNew ? 14 : 6, isNew ? 150 : 110);
        audio.pickup(isNew ? 6 : 2);

        this._checkAllMaterials(audio);
        break;
      }

      case 'oil': {
        this.oil++;
        this.score += p.value;
        this.particles.burst(cx, cy, '#ffd27a', 14, 140);
        this.particles.floatText(cx, cy - 8, '+ שֶׁמֶן', '#ffd27a');
        audio.pickup(4);
        if (!this._oilTaught) {
          this._oilTaught = true;
          this.hud.showBanner('כַּד שֶׁמֶן זַיִת', 'מִתְקָרְבִים לְפָנָס כָּבוּי — וְהוּא נִדְלָק', 2.4);
        }
        break;
      }

      case 'proverb': {
        // מגילת משל: הפסוק מוצג בגדול לרגע — קצר מספיק כדי לא לעצור את המשחק
        this.proverbsFound++;
        this.score += p.value;
        this.particles.burst(cx, cy, '#ffe39a', 16, 150);
        this.hud.showBanner(p.text, `${p.source} · מָשָׁל ${this.proverbsFound}/${this.def.proverbs.length}`, 2.8);
        audio.pickup(5);
        break;
      }

      case 'rimon': {
        this.rimonim++;
        const total = this.pickups.filter(x => x.type === 'rimon').length;
        this.score += p.value;
        this.particles.burst(cx, cy, '#ffd36a', 14, 150);
        this.particles.floatText(cx, cy - 8, `${this.rimonim}/${total}`, '#ffe39a');
        if (this.rimonim === 1) this.hud.showBanner('רִמּוֹן זָהָב!', 'כְּמוֹ הָרִמּוֹנִים שֶׁעַל כּוֹתְרוֹת יָכִין וּבֹעַז', 2);
        audio.pickup(5);
        break;
      }

      case 'cedar':
      case 'hewn': {
        const cedar = p.type === 'cedar';
        if (cedar) this.cedarsFound++; else this.hewnFound++;
        const n = cedar ? this.cedarsFound : this.hewnFound;
        const total = this.pickups.filter(x => x.type === p.type).length;
        this.score += p.value;
        this.particles.burst(cx, cy, cedar ? '#d99a63' : '#f4ecd8', 14, 150);
        this.particles.floatText(cx, cy - 8, `${n}/${total}`, cedar ? '#ffd29a' : '#ffffff');
        if (n === 1) this.hud.showBanner(cedar ? 'קוֹרַת אֶרֶז!' : 'אֶבֶן גָּזִית!',
          cedar ? 'חִירָם שׁוֹלֵחַ אֲרָזִים לְבֵית ה׳' : 'אֶבֶן שֶׁהוּכְנָה מֵרֹאשׁ לִמְקוֹמָהּ', 2);
        audio.pickup(5);
        break;
      }

      case 'health': {
        this.player.heal(1);
        this.particles.burst(cx, cy, '#ff8a7a', 10, 120);
        this.particles.floatText(cx, cy - 8, '+❤', '#ff8a7a');
        audio.health();
        break;
      }

      case 'spark': {
        this.sparks++;
        this.score += p.value;
        this.particles.burst(cx, cy, '#ffffff', 18, 170);
        audio.pickup(5);
        this.game.camera.shake(2);
        break;
      }

      case 'relic': {
        this.relicTaken = true;
        this.score += p.value;
        this.particles.burst(cx, cy, '#ffd964', 30, 220);
        audio.relic();
        this.game.camera.shake(6);

        this.hud.showBanner(
          this.meta.relic.name,
          'כְּלִי קֹדֶשׁ נֶאֱסַף — הַשַּׁעַר נִפְתָּח',
          3.0,
        );

        if (p.cardId) this._unlockCard(p.cardId);
        break;
      }

      case 'stone': {
        this.stones++;
        this.score += p.value;
        this.particles.burst(cx, cy, '#a8e8ff', 16, 160);
        audio.pickup(5);

        // כל אבן מאריכה את הזמן לפני שיבת המים
        if (this.water) {
          this.water.remaining += this.water.bonusSec;
          this.water.capacity += this.water.bonusSec;
          this.particles.floatText(cx, cy - 28, `+${this.water.bonusSec} שׁ׳`, '#7ad8f0');
        }

        const max = this.water?.maxStones ?? 12;
        if (this.stones >= max && !this.relicTaken) {
          this.relicTaken = true;
          audio.relic();
          this.game.camera.shake(6);
          this.hud.showBanner(
            this.meta.relic.name,
            'כָּל הַשְּׁבָטִים — הַשַּׁעַר נִפְתָּח',
            3.2,
          );
          this._unlockCard('twelve_stones');
        }
        break;
      }
    }
  }

  /** כשכל 15 המצרכים נאספו — חגיגה, לב, וכרטיס */
  _checkAllMaterials(audio) {
    if (this._allMaterialsAwarded || this.materialsFound.size < MATERIALS.length) return;
    this._allMaterialsAwarded = true;

    this.score += 1500;
    this.player.heal(this.player.maxHealth);
    this._unlockCard('materials15');
    this.hud.showBanner('כָּל חֲמִשָּׁה עָשָׂר הַמִּינִים נֶאֶסְפוּ!', 'הַתְּרוּמָה שְׁלֵמָה לַמִּשְׁכָּן', 3.4);
    this.particles.burst(this.player.centerX, this.player.centerY, '#ffe9a8', 36, 240);
    audio.levelComplete();
  }

  _unlockCard(cardId) {
    if (this.cardsFound.has(cardId)) return;
    this.cardsFound.add(cardId);
    this.game.save.addCodex(cardId);
  }

  _updateCheckpoints(audio) {
    for (const c of this.checkpoints) {
      if (c.lit) continue;
      if (!rectsOverlap(this.player, c)) continue;

      c.lit = true;
      // נקודת ההחייאה מעט מעל המזבח, כדי שלא ניוולד בתוכו
      this.player.setSpawn(c.x + c.w / 2 - this.player.w / 2, c.y - this.player.h - 4);
      this.player.heal(1);

      this.particles.burst(c.x + c.w / 2, c.y, '#ffb84a', 20, 150);
      this.hud.showBanner('מִזְבֵּחַ נִדְלַק', 'נְקֻדַּת הַהַצָּלָה נִשְׁמְרָה', 1.8);
      audio.checkpoint();
    }
  }

  _updateNPCs(audio) {
    for (const n of this.npcs) {
      if (n.talked) continue;

      const near = Math.abs(this.player.centerX - (n.x + n.w / 2)) < 60
                && Math.abs(this.player.centerY - (n.y + n.h / 2)) < 80;
      if (!near) { n.waited = false; continue; }

      // דמות שמחכה למשהו (לחם לדוד): עד שזה מגיע — משפט המתנה, פעם אחת בכל התקרבות
      if (n.needs && !(n.needs === 'bread' ? this.hasBread : this.delivered)) {
        if (!n.waited) { n.waited = true; this.hud.showDialog(n.name, n.waitLines); audio.menuPick(); }
        continue;
      }
      if (n.then === 'deliver') {
        this.delivered = true; this.hasBread = false;
        this.score += 800;
        this.particles.burst(n.x + n.w / 2, n.y, '#ffd99a', 26, 180);
        this._afterDialog = { title: 'הַלֶּחֶם הִגִּיעַ אֶל דָּוִד', sub: 'חֶסֶד — עֲזַרְתֶּם לְמִי שֶׁרָעֵב' };
      } else if (n.then === 'revealRelic') {
        for (const p of this.pickups) if (p.type === 'relic') p.dormant = false;
      }

      n.talked = true;
      this.hud.showDialog(n.name, n.lines);
      if (n.cardId) this._unlockCard(n.cardId);
      if (n.grantShofar && !this.hasShofar) {
        this.hasShofar = true;
        // הבאנר יופיע אחרי הדיאלוג — נשמור לסימון קצר
        this._shofarJustGranted = true;
      }
      audio.menuPick();
    }

    if (this._afterDialog && !this.hud.dialogOpen) {
      this.hud.showBanner(this._afterDialog.title, this._afterDialog.sub, 2.8);
      audio.relic();
      this._afterDialog = null;
    }

    // אחרי סגירת דיאלוג — באנר על השופר
    if (this._shofarJustGranted && !this.hud.dialogOpen) {
      this._shofarJustGranted = false;
      this.hud.showBanner('הַשּׁוֹפָר בְּיָדְךָ', 'X לְיַד קִיר מַיִם — מַעֲבָר לְ־3 שְׁנִיּוֹת', 3.0);
      audio.shofar();
    }
  }

  // -------------------------------------------------------------------------
  // טיימר מים + שופר (שלב 3)
  // -------------------------------------------------------------------------

  _updateWater(dt, audio) {
    const w = this.water;
    if (!w || this.finished) return;

    if (!w.flooding) {
      w.remaining -= dt;

      if (!this._waterWarned && w.remaining <= w.warnAt) {
        this._waterWarned = true;
        this.hud.showBanner('הַמַּיִם קְרֵבִים', 'מַהֵר — אֱסֹף אֲבָנִים לְהַאֲרִיךְ אֶת הַזְּמַן', 2.6);
        audio.denied();
      }

      if (w.remaining <= 0) {
        w.remaining = 0;
        w.flooding = true;
        this.hud.showBanner('הַמַּיִם שָׁבוּ', 'רוּץ אֶל הַשַּׁעַר!', 2.8);
        audio.shofar();
        this.game.camera.shake(10);
      }
    } else {
      // מפלס השיטפון עולה בהדרגה
      w.floodLevel = Math.min(1, w.floodLevel + dt * 0.12);
      this._floodHurt += dt;
      if (this._floodHurt >= 1.1) {
        this._floodHurt = 0;
        if (this.player.hurt(1, -this.player.facing, audio)) {
          this.game.camera.shake(6);
          this.particles.burst(this.player.centerX, this.player.centerY, '#5ab8d0', 12);
        }
      }
    }
  }

  _updateShofar(input, audio) {
    if (!this.hasShofar) return;
    if (!input.pressed('shofar')) return;
    if (this.fields.items.length) {
      if (this.fields.cooldown > 0) return;
      const cleared = this.fields.bendNear(this.player);
      audio.shofar();
      this.hud.showBanner(cleared.length ? 'הַשָּׂדֶה נִפְתָּח לָעַיִן' : 'התקרבו לשדה כדי לכופף אותו',
        cleared.length ? 'עברו בזמן שהשיבולים כפופות — אפשר לתקוע שוב' : '', 1.8);
      return;
    }

    // מחפשים קיר מים סגור בטווח
    const px = this.player.centerX;
    const py = this.player.centerY;
    let nearest = null;
    let best = 140;

    for (const g of this.waterGates) {
      if (g.open) continue;
      const gx = g.x + g.w / 2;
      const gy = g.y + g.h / 2;
      const d = Math.hypot(px - gx, py - gy);
      if (d < best) { best = d; nearest = g; }
    }

    audio.shofar();
    this.game.camera.shake(4);

    if (!nearest) {
      this.hud.showBanner('אֵין קִיר מַיִם קָרוֹב', 'הִתְקָרֵב לְוִילוֹן הַמַּיִם וְתִקַּע שׁוּב', 1.8);
      return;
    }

    this._openWaterGate(nearest);
    this.particles.burst(nearest.x + nearest.w / 2, nearest.y + nearest.h / 2, '#a8e8ff', 28, 200);
    this.hud.showBanner('תְּקִיעָה!', 'הַמַּעֲבָר פָּתוּחַ לְשָׁלוֹשׁ שְׁנִיּוֹת', 1.8);
  }

  _openWaterGate(g) {
    g.open = true;
    g.timer = g.openDur;
    for (let r = g.row0; r <= g.row1; r++) {
      for (let c = g.col0; c <= g.col1; c++) {
        this.map.setChar('action', c, r, '.');
      }
    }
  }

  _closeWaterGate(g) {
    g.open = false;
    g.timer = 0;
    for (let r = g.row0; r <= g.row1; r++) {
      for (let c = g.col0; c <= g.col1; c++) {
        this.map.setChar('action', c, r, 'H');
      }
    }
    // אם השחקן נתקע בתוך הקיר — דוחפים החוצה
    if (rectsOverlap(this.player, g)) {
      this.player.x = g.x - this.player.w - 4;
      this.player.vx = -120;
    }
  }

  _updateWaterGates(dt) {
    for (const g of this.waterGates) {
      if (!g.open) continue;
      g.timer -= dt;
      if (g.timer <= 0) this._closeWaterGate(g);
    }
  }

  // -------------------------------------------------------------------------
  // תחנות ידע ומיני-משחקים
  // -------------------------------------------------------------------------

  _updateOrchard(input,audio,dt=0) {
    for(const tree of this.orchardTrees){
      tree.shake=Math.max(0,tree.shake-dt);
      if(tree.harvested)continue;
      const near=Math.abs(this.player.centerX-tree.x)<145&&Math.abs(this.player.y+this.player.h-tree.y)<185;
      const clicked=input.clicked&&input.over(tree.x-100-this.game.camera.renderX,tree.y-180-this.game.camera.renderY,200,180);
      if(!near||!(input.pressed('attack')||input.pressed('confirm')||clicked))continue;
      tree.harvested=true;tree.shake=0.8;
      for(const pickup of this.pickups)if(pickup.treeId===tree.id)pickup.dormant=false;
      this.particles.burst(tree.x,tree.y-120,'#c4d78a',24,150);
      this.hud.showBanner('הזיתים מוכנים לאיסוף!','מטפסים אל הענפים',2);
      audio.pickup(3);
      break;
    }
  }

  _updateNight(audio, dt) {
    if (!this.def.night) return;
    const p = this.player;
    for (const l of this.lamps) {
      if (l.lit || Math.abs(p.centerX - l.x) > 56 || Math.abs(p.y + p.h - l.y) > 90) continue;
      if (this.oil > 0) { this._lightLamp(l, audio); continue; }
      if (!l.warned) {
        l.warned = true;
        this.hud.showBanner('הַפָּנָס רֵיק', 'אִסְפוּ כַּד שֶׁמֶן וְחִזְרוּ לְהַדְלִיק', 2.2);
        audio.denied();
      }
    }
    // עטלפים בורחים מאור הפנסים
    for (const e of this.enemies) {
      if (e.gone || e.vanishing) continue;
      if (this.lamps.some(l => l.lit && Math.hypot(e.centerX - l.x, e.centerY - (l.y - 60)) < LAMP_RADIUS * 0.7)) e.disperse();
    }
    // "שמואל! שמואל!" — שלוש פעמים, ובכל פעם רצים אל עלי
    for (const c of this.calls) {
      if (c.heard || p.centerX < c.x) continue;
      c.heard = true;
      this.callRun = { target: this.npcs.find(n => n.id === c.eli), timer: c.seconds, total: c.seconds };
      this.hud.showBanner('שְׁמוּאֵל! שְׁמוּאֵל!', 'קוֹל קוֹרֵא בַּלַּיְלָה — רוּצוּ אֶל עֵלִי הַכֹּהֵן!', 2.6);
      audio.call?.();
    }
    const run = this.callRun;
    if (run) {
      run.timer -= dt;
      if (!run.target || run.target.talked) {
        if (run.target && run.timer > 0) {
          this.score += 300;
          this.particles.floatText(p.centerX, p.y - 12, 'מָהִיר כְּמוֹ שְׁמוּאֵל! +300', '#ffe9a8');
          audio.pickup(5);
        }
        this.callRun = null;
      }
    }
  }

  /**
   * צופי שאול: מסיירים, נעצרים ומסתובבים. מי שבתוך אלומת הראייה ולא מתכופף
   * בשיח — חוזר לנקודת ההצלה, בלי לאבד לב או חיים. אפשר לעבור מאחוריהם.
   */
  _updateStealth(audio, dt) {
    if (!this.watchers.length) return;
    const p = this.player;
    this._grace = Math.max(0, this._grace - dt);
    this.hiddenNow = p.crouching && (this.def.bushes || []).some(b => p.centerX > b.x && p.centerX < b.x + b.w);
    for (const w of this.watchers) {
      w.alert = Math.max(0, (w.alert || 0) - dt);
      if (w.pause > 0) {
        w.pause -= dt;
        if (w.pause <= 0) { w.facing *= -1; w.turning = false; }
      } else {
        w.x += w.facing * w.speed * dt;
        // "?" above the head for 1.6s before turning: time enough to reach a bush.
        if (w.facing > 0 ? w.x + w.w >= w.right : w.x <= w.left) { w.pause = 1.6; w.turning = true; }
      }
      const eyeX = w.x + w.w / 2, eyeY = w.y + 12, dx = (p.centerX - eyeX) * w.facing, k = dx / w.range;
      const inBeam = this._grace <= 0 && !this.hiddenNow && p.alive && dx > 4 && dx < w.range
        && p.centerY > eyeY - w.spread * k - 26 && p.centerY < eyeY + (w.spread + 30) * k + 34;
      // Suspicion fills for about half a second ("!" grows), so a child can still duck or step back.
      w.suspicion = inBeam ? (w.suspicion || 0) + dt : Math.max(0, (w.suspicion || 0) - dt * 0.7);
      if (w.suspicion >= SUSPICION_TIME) {
        w.suspicion = 0;
        this._seen(w, audio);
        break;
      }
    }
  }

  _seen(w, audio) {
    const p = this.player;
    this.caught++;
    this._grace = 1.6;
    w.alert = 1;
    p.x = p.spawnX; p.y = p.spawnY; p.vx = p.vy = 0;
    this.game.camera.snapTo(p.centerX, p.centerY);
    this.hud.showBanner('צוֹפֶה רָאָה אֶתְכֶם!', 'חוֹזְרִים לַמִּזְבֵּחַ — הִתְכּוֹפְפוּ בַּשִּׂיחַ אוֹ עִבְרוּ מֵאֲחוֹרָיו', 2.4);
    audio.denied();
  }

  _lightLamp(l, audio) {
    l.lit = true;
    this.oil--;
    for (const r of l.reveal || []) for (let c = r.col; c < r.col + r.w; c++) this.map.setChar('action', c, r.row, '=');
    // פנס דולק הוא גם נקודת הצלה
    this.player.setSpawn(l.x - this.player.w / 2, l.y - this.player.h - 4);
    this.player.heal(1);
    this.particles.burst(l.x, l.y - 64, '#ffd27a', 26, 170);
    const lit = this.lamps.filter(x => x.lit).length;
    this.hud.showBanner('הַפָּנָס דּוֹלֵק!', l.reveal?.length
      ? 'הָאוֹר מְגַלֶּה דֶּרֶךְ חֲדָשָׁה' : `נְקֻדַּת הַצָּלָה · ${lit}/${this.lamps.length}`, 2.2);
    audio.checkpoint();
  }

  _updateMovers(dt) {
    if (!this.movers.length) return;
    this.moverClock += dt;
    for (const m of this.movers) {
      m.squash = Math.max(0, m.squash - dt * 4);
      if (!m.path) { m.dx = m.dy = 0; continue; }
      const k = (1 - Math.cos(2 * Math.PI * (this.moverClock / m.period + (m.phase || 0)))) / 2;
      const nx = m.x0 + m.path.dx * k, ny = m.y0 + m.path.dy * k;
      m.dx = nx - m.x; m.dy = ny - m.y;
      m.x = nx; m.y = ny;
    }
  }

  /**
   * גבעון: באנר כניסה לחלום, ושועלים קטנים בכרם. שועל בורח כשמתקרבים,
   * ולפעמים קופץ מעל השחקן; נגיעה (או אור המטה) תופסת אותו, והוא רץ הביתה.
   */
  _updateGivon(audio, dt) {
    if (!this.def.givon) return;
    const p = this.player;
    if (!this._dreamShown && p.x > this.def.dream.x0) {
      this._dreamShown = true;
      this.hud.showBanner('שְׁלֹמֹה נִרְדַּם… וְחוֹלֵם!', 'קִפְצוּ עַל הָעֲנָנִים הַקְּפִיצִיִּים', 2.8);
    }
    const light = p.attackBox;
    for (const f of this.foxes) {
      f.t += dt;
      if (f.caught) { f.fade = Math.max(0, f.fade - dt * 0.7); f.x += f.facing * 140 * dt; continue; }
      const dx = p.centerX - (f.x + f.w / 2), dist = Math.abs(dx);
      const near = dist < 230 && Math.abs(p.centerY - (f.y + f.h / 2)) < 140;
      if (near) f.facing = dx > 0 ? -1 : 1;
      else if (Math.sin(f.t * 0.8 + f.x * 0.01) > 0.97) f.facing *= -1;
      f.x += f.facing * (near ? 170 : 45) * dt;
      const cornered = f.x <= f.left || f.x + f.w >= f.right;
      if (f.x < f.left) { f.x = f.left; f.facing = 1; }
      if (f.x + f.w > f.right) { f.x = f.right - f.w; f.facing = -1; }
      // a cornered (or very close) fox hops right over the player — a playful dodge
      if (f.onGround && (cornered && dist < 160 || dist < 50 && Math.sin(f.t * 5) > 0.6)) { f.vy = -640; f.onGround = false; }
      f.vy += 2000 * dt; f.y += f.vy * dt;
      if (f.y >= f.y0) { f.y = f.y0; f.vy = 0; f.onGround = true; }
      const box = { x: f.x, y: f.y, w: f.w, h: f.h };
      if (rectsOverlap(p, box) || (light && rectsOverlap(light, box))) this._catchFox(f, audio);
    }
  }

  /**
   * הלבנון: אור המטה שובר אבן סדוקה; נפילה לים מחזירה לנקודת ההצלה עם "פלוץ";
   * ובהר המוריה — לחיצה על Z מקבלת "ששש…" חביב במקום רעש.
   */
  _updateLebanon(audio) {
    if (!this.def.lebanon) return;
    const p = this.player, light = p.attackBox;
    if (light) {
      const quiet = this.def.quiet && p.centerX > this.def.quiet.x0;
      if (quiet) {
        if (this.t - this._shushAt > 2.5) {
          this._shushAt = this.t;
          this.hud.showBanner('שששש… 🤫', 'בַּבַּיִת לֹא נִשְׁמָע קוֹל — הָאֲבָנִים כְּבָר מוּכָנוֹת', 2);
        }
      } else {
        const c0 = Math.floor(light.x / 32), c1 = Math.floor((light.x + light.w) / 32);
        const r0 = Math.floor(light.y / 32), r1 = Math.floor((light.y + light.h) / 32);
        for (let c = c0; c <= c1; c++) for (let r = r0; r <= r1; r++) {
          if (this.map.charAt('action', c, r) !== 'C') continue;
          this.map.setChar('action', c, r, '.');
          this.stonesBroken++;
          this.particles.burst(c * 32 + 16, r * 32 + 16, '#f1e7cf', 14, 160);
          this.particles.dust(c * 32 + 16, r * 32 + 28, 0, 4);
          this.game.camera.shake(3);
          audio.enemyHit();
          if (this.stonesBroken === 1) this.hud.showBanner('קְרַאק!', 'הָאֶבֶן הַסְּדוּקָה נִשְׁבְּרָה — הַדֶּרֶךְ נִפְתַּחַת', 1.8);
        }
      }
    }
  }

  /** ים (שלב 9) או בור טיט (שלב 10): נפילה פנימה — "פלוץ", לב אחד, וחזרה לנקודת ההצלה. */
  _updateSea(audio) {
    const sea = this.def.sea, p = this.player;
    if (!sea || !p.alive || p.y + p.h <= sea.y + 10 || p.centerX < sea.x0 || p.centerX > sea.x1) return;
    const clay = sea.style === 'clay';
    this.splashes++;
    this.particles.burst(p.centerX, sea.y, clay ? '#c98a5a' : '#bfe9ff', 26, 220);
    p.hurt(1, 0, audio);
    if (p.alive) {   // even while briefly invulnerable, never leave a child on the bottom
      p.x = p.spawnX; p.y = p.spawnY; p.vx = p.vy = 0;
      this.game.camera.snapTo(p.centerX, p.centerY);
      this.hud.showBanner(clay ? 'פְּלוּף! בּוֹץ 🟤' : 'פְּלוּץ! 💦',
        clay ? 'עוֹלִים עַל הַמְּכוֹנוֹת כְּשֶׁהֵן קְרוֹבוֹת' : 'קוֹפְצִים עַל הָרַפְסוֹדוֹת כְּשֶׁהֵן קְרוֹבוֹת', 2);
    }
  }

  /**
   * חידות האור: מסובבים מראת נחושת קרובה (Enter / Z), והקרן מחושבת מחדש בכל פריים.
   * כשהקרן פוגעת בקערת המטרה — דלת הנחושת של החדר נפתחת.
   */
  _updatePuzzles(input, audio) {
    if (!this.puzzles.length) return;
    const p = this.player;
    const press = input.pressed('confirm') || input.pressed('attack');
    this.nearMirror = null;
    for (const pz of this.puzzles) for (const m of pz.mirrors) {
      const dx = Math.abs(p.centerX - (m.col * 32 + 16)), dy = Math.abs(p.centerY - (m.row * 32 + 16));
      // generous reach (a mirror up to five tiles above can be turned from the ground); the closest one wins
      const d = Math.hypot(dx, dy);
      if (dx < 60 && dy < 170 && (!this.nearMirror || d < this.nearMirror.d)) this.nearMirror = { m, d };
    }
    if (press && this.nearMirror && !this.nearStation) {
      const m = this.nearMirror.m;
      m.o = m.o === '/' ? '\\' : '/';
      audio.menuMove();
      this.particles.burst(m.col * 32 + 16, m.row * 32 + 16, '#ffe1a0', 8, 90);
    }
    for (const pz of this.puzzles) {
      const { points, hit } = traceBeam(pz, this.map);
      pz.points = points; pz.lit = hit;
      if (hit && !pz.solved) {
        pz.solved = true;
        for (let r = pz.door.row; r < pz.door.row + pz.door.h; r++)
          for (let c = pz.door.col; c < pz.door.col + pz.door.w; c++) this.map.setChar('action', c, r, '.');
        this.score += 500;
        const n = this.puzzles.filter(x => x.solved).length;
        this.particles.burst(pz.door.col * 32 + 32, pz.door.row * 32 + 96, '#fff2a0', 30, 200);
        this.hud.showBanner('הָאוֹר פָּגַע בַּקְּעָרָה!', `דֶּלֶת הַנְּחֹשֶׁת נִפְתְּחָה · ${n}/${this.puzzles.length}`, 2.4);
        audio.relic();
      }
    }
    if (this.cloudFill > 0 && this.cloudFill < 1) this.cloudFill = Math.min(1, this.cloudFill + 1 / 180);
  }

  _catchFox(f, audio) {
    f.caught = true;
    f.facing = f.x + f.w / 2 < (f.left + f.right) / 2 ? -1 : 1;   // runs home to the nearer edge
    this.foxesCaught++;
    this.score += 300;
    this.particles.burst(f.x + f.w / 2, f.y, '#ffb36a', 18, 160);
    const all = this.foxesCaught >= this.foxes.length;
    this.hud.showBanner(all ? 'כָּל הַשּׁוּעָלִים בַּבַּיִת!' : 'תְּפַסְתֶּם שׁוּעָל!',
      all ? 'הַכֶּרֶם שָׁמוּר — הַדֶּרֶךְ פְּתוּחָה' : `${this.foxesCaught}/${this.foxes.length} · הוּא רָץ הַבַּיְתָה`, 2.2);
    if (all) audio.levelComplete(); else audio.pickup(6);
  }

  _openGate(audio) {
    if (this.gateOpen || !this.def.gate) return;
    this.gateOpen = true;
    const g = this.def.gate;
    for (let r = g.row; r < g.row + (g.h / 32); r++)
      for (let c = g.col; c < g.col + (g.w / 32); c++) this.map.setChar('action', c, r, '.');
    this.particles.burst(g.x + g.w / 2, g.y + g.h / 2, '#ffe9a8', 30, 200);
    if (this.def.givon) this.hud.showBanner('וַיִּקַץ שְׁלֹמֹה — וְהִנֵּה חֲלוֹם!', 'ה׳ נָתַן לוֹ לֵב חָכָם וְנָבוֹן', 3);
    else this.hud.showBanner('שַׁעַר הֶחָצֵר נִפְתַּח!', 'הַמְּנוֹרָה מְחַכָּה בַּחָצֵר', 2.8);
    audio.relic();
  }

  _waterOrchard(audio) {
    if(this.orchardWatered)return;
    this.orchardWatered=true;
    for(const {col,row} of this.def.orchard.gateTiles||[])this.map.setChar('action',col,row,'.');
    this.hud.showBanner('הגינה הושקתה — המעבר פתוח!','ממשיכים לחורשה הבאה',2.8);
    audio.checkpoint();
  }

  _updateHarvestFeatures(input, audio) {
    for (const f of this.fields.items) {
      if (!f.taught && this.player.centerX >= f.x - 135 && this.player.centerX < f.x + f.w) {
        f.taught = true;
        this.hud.showBanner('שִׁבּוֹלִים גְּבוֹהוֹת', 'X מכופף את השדה · Z מרגיע שומרים · רווח לקפיצה', 3);
      }
    }
    for (const b of this.bonusRooms) {
      if (!b.open || b.taken || !rectsOverlap(this.player, b)) continue;
      b.taken = true;
      if(this.game.save.awardChallenge(`bonus:${this.meta.id}:${b.id}`,true)){
        this.player.lives += b.reward.lives;
        this.score += b.reward.score;
      }
      this.particles.burst(b.x + b.w / 2, b.y, '#ffe49b', 25, 170);
      this.hud.showBanner('פִּנַּת הַיֶּדַע נִפְתְּחָה', 'חיים נוספים ובונוס נקודות!', 2.5);
      audio.relic();
    }
    const c = this.def.challenge;
    if (!c || this.challengeDone || this.mini) return;
    const near = Math.abs(this.player.centerX - (c.x + c.w / 2)) < 100
      && Math.abs(this.player.centerY - (c.y + c.h / 2)) < 110;
    if (!near) return;
    const cam = this.game.camera;
    const hovered = input.over(c.x - cam.renderX - 12, c.y - cam.renderY - 20, c.w + 24, c.h + 20);
    if (hovered) input.cursor = 'pointer';
    if (!(input.pressed('confirm') || hovered && input.clicked)) return;
    if(this.def.orchard?.requiresWater&&!this.orchardWatered){
      this.hud.showBanner('קודם פותחים את מעבר הגינה','חוזרים אל שומר הגינה',2);
      return;
    }
    if (!this.def.night && !this.def.challengeFree && (this.def.orchard ? this.olives < this.def.orchard.required : !this.relicTaken)) {
      if(this.def.orchard){this.hud.showBanner('עוד זיתים לסל',`${this.olives}/${this.def.orchard.required}`,2);return;}
      this.hud.showBanner('קודם משלימים את הקציר', `נאספו ${this.grain} מתוך ${this.def.harvest.required} אגודות`, 2);
      return;
    }
    this.mini = createMiniGame(c.kind, { ...c.params, progress: this.challengeProgress }, this.game);
    this.miniStation = { ...c, challenge: true };
    audio.menuPick();
  }

  _updateStations(input, audio, dt = 1 / 60) {
    const p = this.player;
    const cam = this.game.camera;
    if (this.mini || this.hud.dialogOpen || !p.alive || this.finished) return;

    this.nearStation = null;
    for (const s of this.stations) {
      const dx = Math.abs(p.centerX - (s.x + s.w / 2));
      const dy = Math.abs(p.centerY - (s.y + s.h / 2));
      const near = dx < 70 && dy < 90;
      if (near) this.nearStation = s;
    }

    // לחיצה על התחנה עצמה (בקואורדינטות מסך)
    let clicked = null;
    for (const s of this.stations) {
      const sx = s.x - cam.renderX;
      const sy = s.y - cam.renderY;
      if (input.over(sx - 6, sy - 22, s.w + 12, s.h + 22)) {
        if (s === this.nearStation && !s.done) input.cursor = 'pointer';
        if (input.clicked) clicked = s;
      }
    }

    const s = this.nearStation;
    if (s && !s.done && (this.activePlayTime >= this.nextStationAt || s.required || s.id==='garden'&&this.def.orchard?.requiresWater)
        && (input.pressed('confirm') || clicked === s)) {
      this._openStation(s, audio);
    }
  }

  _openStation(s, audio) {
    s.autoVisited = true;
    s.autoDwell = 0;
    this.mini = createMiniGame(s.kind, {
      ...s.params,
      levelId: this.meta.id,
      used: this.triviaUsed,
      progress: s.progress,
    }, this.game);
    this.miniStation = s;
    audio.menuPick();
  }

  _finishMini(audio) {
    const r = this.mini.result || {};
    const s = this.miniStation;
    if (r.unscored) {
      if (s && !r.cancelled && !s.done) { s.done = true; this.stationsDone++; }
      this.mini = this.miniStation = null;
      this.game.input.flush();
      return;
    }
    if(r.success&&this.def.orchard&&s?.id==='garden')this._waterOrchard(audio);
    if(r.success&&s?.opensGate)this._openGate(audio);
    if(r.success&&s?.givesBread&&!this.delivered){
      this.hasBread=true;
      this.hud.showBanner('קִבַּלְתֶּם אֶת הַלֶּחֶם','הָבִיאוּ אוֹתוֹ אֶל דָּוִד בַּמְּעָרָה — בְּלִי שֶׁהַצּוֹפִים יִרְאוּ',3);
    }
    const achievementKey=s?`level:${this.meta.id}:${s.id}`:null;
    const oldAchievement=this.game.save.data.achievements?.[achievementKey];
    const firstReward=!!r.success&&!oldAchievement?.success;
    const newPerfect=!!r.success&&!!r.perfect&&!oldAchievement?.perfect;
    if (s && r.progress) s.progress = r.progress;
    this.nextStationAt = this.activePlayTime + (r.cancelled ? 0 : 25);
    if (r.success && s) {
      const first = this.game.save.awardChallenge(`level:${this.meta.id}:${s.id}`, r.perfect);
      if (first && Object.values(this.game.save.data.achievements).filter(a=>a?.success).length===1) this.characterNotice=12;
    }
    this.mini = null;
    this.miniStation = null;
    this.game.input.flush();
    if (s?.challenge) {
      this.challengeProgress = r.progress || this.challengeProgress;
      if (r.success) {
        this.challengeDone = true;
        if(firstReward)this.score += r.perfect ? 1200 : 700;
        else if(newPerfect)this.score += 500;
        if(this.def.orchard||this.def.night||this.def.challengeFree)this.relicTaken=true;
        this._unlockCard(this.def.orchard?'olive_oil':this.def.night?'ner_elokim':this.def.lebanon?'quiet_building'
          :this.def.temple?'dedication':'jericho_shofar');
        if(this.def.temple)this.cloudFill=0.01;   // the cloud starts to fill the House
        this.hud.showBanner(this.def.orchard?'השמן מוכן!':this.def.night?'נֵר אֱלֹקִים דּוֹלֵק!'
          :this.def.lebanon?'הַקִּיר שָׁלֵם — בְּלִי קוֹל!':this.def.temple?'וְהֶעָנָן מָלֵא אֶת בֵּית ה׳'
          :'קוֹל הַשּׁוֹפָר — הוּשְׁלַם!', 'הדרך אל השער פתוחה', 3);
        audio.levelComplete();
      } else {
        this.hud.showBanner('ההצלחות נשמרו', 'Enter ליד האתגר כדי להמשיך מאותו סיבוב', 2.4);
      }
      return;
    }

    if (r.cancelled) return;

    if (r.success) {
      s.done = !s.repeatUntilPerfect || r.perfect;
      if (!s.rewarded) {
        s.rewarded = true;
        this.stationsDone++;
        if(firstReward){this.player.heal(1);this.score += r.perfect ? 800 : 400;}
      }
      if (r.perfect && !s.perfectAwarded) {
        s.perfectAwarded = true;
        if(newPerfect)this.player.lives++;
        const bonus = this.bonusRooms.find(b => b.id === s.bonusId);
        if (bonus) bonus.open = true;
      }
      if (s.cardId) this._unlockCard(s.cardId);
      if (s.opensGate || s.givesBread) return;   // their own banners already celebrate

      this.particles.burst(s.x + s.w / 2, s.y, '#ffd964', 28, 200);
      audio.relic();
      this.hud.showBanner(
        'כל הכבוד!',
        s.bonusId && r.perfect ? 'נפתחה פינת בונוס בהמשך השדה'
          : !s.done ? 'אפשר לנסות שוב כדי לפתוח את הבונוס — אין חובה'
          : s.cardId ? 'נִפְתַּח כֶּרֶט חָדָשׁ בְּמוּזֵיאוֹן הַמִּקְדָּשׁ' : '',
        3.2,
      );
    } else {
      this.hud.showBanner('אֶפְשָׁר לְנַסּוֹת שׁוּב', 'דַּבְּרוּ עִם הַדְּמוּת פַּעַם נוֹסֶפֶת', 2.4);
    }
  }

  // -------------------------------------------------------------------------
  // יציאה מהשלב
  // -------------------------------------------------------------------------

  _checkExit(audio) {
    if (this.finished) return;

    const ex = this.def.exit;
    if (!rectsOverlap(this.player, ex)) return;

    // השער נפתח רק אחרי שנאסף כלי הקודש (בשלב 3 — כל 12 האבנים)
    if (!this.relicTaken) {
      if (!this._warnedExit) {
        this._warnedExit = true;
        const msg = this.def.orchard ? this.olives<this.def.orchard.required?'אוספים זיתים לסל':'מכינים שמן בבית הבד'
          : this.def.harvest
          ? `אספו את כל אגודות השעורים: ${this.grain} מתוך ${this.def.harvest.required}`
          : this.water
          ? `אֱסֹף אֶת כָּל ${this.water.maxStones} הָאֲבָנִים (${this.stones}/${this.water.maxStones})`
          : this.def.night ? 'מַדְלִיקִים אֶת הַמְּנוֹרָה בֶּחָצֵר'
          : this.def.stealth ? (this.delivered ? 'אֶבְיָתָר מְחַכֶּה עִם הָאֵפוֹד' : 'מְבִיאִים לֶחֶם אֶל דָּוִד בַּמְּעָרָה')
          : this.def.givon ? 'מִזְבַּח הַנְּחֹשֶׁת מְחַכֶּה בְּרֹאשׁ הַגִּבְעָה'
          : this.def.lebanon ? 'מַשְׁלִימִים אֶת הַקִּיר אֵצֶל שְׁלֹמֹה'
          : this.def.temple ? 'מְנַגְּנִים עִם הַלְוִיִּם בְּקוֹל אֶחָד'
          : 'עָלֶיךָ לִמְצֹא אֶת כְּלִי הַקֹּדֶשׁ';
        this.hud.showBanner('הַשַּׁעַר נָעוּל', msg, 2.4);
        audio.denied();
      }
      return;
    }

    if (this.foxes.length && this.foxesCaught < this.foxes.length) {
      if (!this._warnedFoxes) {
        this._warnedFoxes = true;
        this.hud.showBanner('נוֹתְרוּ שׁוּעָלִים בַּכֶּרֶם', `${this.foxesCaught}/${this.foxes.length} · תִּפְסוּ אֶת כֻּלָּם`, 2);
      }
      return;
    }
    this._warnedFoxes = false;

    if (this.def.challenge && !this.challengeDone) {
      this.hud.showBanner(this.def.night ? 'נוֹתְרָה הַמְּנוֹרָה' : 'נותר אתגר השופר', 'חזרו מעט שמאלה אל הסימון ולחצו Enter', 1.8);
      return;
    }
    this.finished = true;
    audio.levelComplete();
    this._completeLevel();
  }

  _completeLevel() {
    const save = this.game.save;
    const meta = this.meta;

    save.addRelic(meta.relic.id);
    save.recordScore(meta.id, this.score);
    save.addDonations(this.materialsFound.size);
    // דילוג על שלבים שעדיין לא מיושמים — כדי שאפשר יהיה להמשיך הלאה
    let next = meta.id + 1;
    while (next <= 14) {
      const L = LEVELS.find(l => l.id === next);
      if (L?.ready) break;
      next++;
    }
    if (next <= 14) save.unlockLevel(next);

    // כל כרטיסיות השלב נפתחות בסיום — גם אם לא נאספו תוך כדי
    for (const card of codexOfLevel(meta.id)) {
      this._unlockCard(card.id);
    }

    this.scenes.go('summary', {
      levelId: meta.id,
      score: this.score,
      materials: this.materialsFound.size,
      materialCounts: { ...this.materialCounts },
      stones: this.water ? this.stones : null,
      harvest: this.def.harvest ? { count: this.grain, required: this.def.harvest.required, challenge: this.challengeDone } : null,
      orchard: this.def.orchard ? {count:this.olives,required:this.def.orchard.required,challenge:this.challengeDone} : null,
      night: this.def.night ? { lit: this.lamps.filter(l => l.lit).length, total: this.lamps.length, challenge: this.challengeDone } : null,
      stealth: this.def.stealth ? { caught: this.caught, delivered: this.delivered } : null,
      givon: this.def.givon ? { proverbs: this.proverbsFound, total: this.def.proverbs.length, foxes: this.foxesCaught } : null,
      temple: this.def.temple ? {
        rimonim: this.rimonim, total: this.pickups.filter(p => p.type === 'rimon').length,
        puzzles: this.puzzles.filter(p => p.solved).length,
      } : null,
      lebanon: this.def.lebanon ? {
        cedars: this.cedarsFound, cedarTotal: this.pickups.filter(p => p.type === 'cedar').length,
        hewn: this.hewnFound, hewnTotal: this.pickups.filter(p => p.type === 'hewn').length,
      } : null,
      sparks: this.sparks,
      maxSparks: this.def.maxSparks,
      stations: this.stationsDone,
      maxStations: this.stations.length,
      cards: [...this.cardsFound],
      time: this.t,
    });
  }

  // -------------------------------------------------------------------------
  // רינדור
  // -------------------------------------------------------------------------

  draw(ctx) {
    if (!this.ready) return;

    const W = this.game.width;
    const H = this.game.height;
    const cam = this.game.camera;
    const camX = cam.renderX;
    const camY = cam.renderY;
    const p = this.meta.palette;

    if (this.def.night) {
      drawShilohNight(ctx, W, H, camX, camY, this.t);
    } else if (this.def.stealth) {
      drawNobBackdrop(ctx, W, H, camX, camY, this.t);
    } else if (this.def.lebanon) {
      drawLebanonBackdrop(ctx, W, H, camX, camY, this.t);
    } else if (this.def.temple) {
      drawTempleBackdrop(ctx, W, H, camX, camY, this.t, this.cloudFill);
    } else if (this.def.givon) {
      // The dream sky fades in over three tiles at each edge of the dream section.
      drawGivonMorning(ctx, W, H, camX, camY, this.t);
      const mid = camX + W / 2, d = this.def.dream, edge = 96 * 3;
      const dreamness = Math.max(0, Math.min(1, (mid - d.x0) / edge, (d.x1 - mid) / edge));
      drawDreamSky(ctx, W, H, camX, camY, this.t, dreamness);
    } else if (this.meta.id === 1) {
      this.map.artTime = artTime(this.t);
      drawCampBackdrop(ctx, W, H, camX, camY, this.t, this.scenery);
    } else if (this.meta.id === 5) {
      this.map.artTime=artTime(this.t);
      drawShilohBackdrop(ctx,W,H,camX,camY,this.t,this.scenery);
    } else {
      // Stages 3–4 keep their original sky, palette and parallax.
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, p.skyTop);
      sky.addColorStop(1, p.skyBot);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);
      this._parallax(ctx, W, H, camX, 0.15, H * 0.56, p.far, 1.0);
      this._parallax(ctx, W, H, camX, 0.32, H * 0.66, p.mid, 1.7);
      this._parallax(ctx, W, H, camX, 0.52, H * 0.76, p.near, 2.6);
    }

    // 3. עמוד הענן — רק בשלבי מדבר; בירדן — קירות מים אטמוספריים
    if (this.def.gilgal) drawGilgalBackdrop(ctx, W, H, camX, this.t);
    else if (this.def.waterWalls) this._drawWaterWalls(ctx, W, H, camX, camY);
    else if (!this.def.night && !this.def.stealth && !this.def.givon && !this.def.lebanon && !this.def.temple
      && this.meta.id !== 1 && this.meta.id !== 5) this._cloudPillar(ctx, W, H, camX);
    const decor = this.def.decor;
    if (decor) {
      drawCrowd(ctx, decor.crowd[0], decor.crowd[1], decor.ground, camX, camY, this.t);
      drawBronzeSea(ctx, decor.bronzeSea, decor.ground, camX, camY);
      drawPillars(ctx, decor.pillars, decor.ground, camX, camY);
    }
    for (const c of this.def.cedars || []) drawCedar(ctx, c.x, c.y, camX, camY, c.s);

    // 4. שכבת רקע
    this.map.drawLayer(ctx, 'back', camX, camY, W, H);
    for (const h of this.def.houses || []) drawNobHouse(ctx, h, camX, camY);
    if (this.def.cave) drawCave(ctx, this.def.cave, camX, camY);
    if (this.def.vineyard) drawVines(ctx, this.def.vineyard.x0 + 48, this.def.vineyard.x1, this.def.vineyard.y, camX, camY);
    if (this.def.altarAt) drawBronzeAltar(ctx, this.def.altarAt * 32, 7 * 32, camX, camY, this.t);
    for (const m of this.movers) {
      if (!cam.isVisible(m.x - 20, m.y - 30, m.w + 40, 60)) continue;
      if (m.raft) drawRaft(ctx, m, camX, camY);
      else if (m.cart) drawCart(ctx, m, camX, camY, this.t);
      else drawMover(ctx, m, camX, camY, this.t);
    }
    for (const s of this.def.signs || []) drawQuietSign(ctx, s.x, s.y, camX, camY);
    for (const l of this.lamps) if (cam.isVisible(l.x - 30, l.y - 100, 60, 100)) drawOilLamp(ctx, l, camX, camY, this.t);
    if(this.def.orchard)drawOliveTrees(ctx,this.orchardTrees,camX,camY,this.t,this.player,this.game.touch?.enabled);

    // 5. דמויות (משה) ותחנות ידע
    // Characters look at the player, and wave hello when he comes near before they have spoken.
    const look = o => Math.sign(this.player.centerX - (o.x + o.w / 2)) || 1;
    const waveAt = o => Math.max(0, 1 - Math.abs(this.player.centerX - (o.x + o.w / 2)) / 220);
    for (const n of this.npcs) {
      if (!cam.isVisible(n.x, n.y, n.w, n.h)) continue;
      drawNPC(ctx, n.x - camX, n.y - camY, n.w, n.h, {
        robe: n.robe, sash: n.sash, t: this.t, role: n.role,
        beard: n.beard !== false, veil: !!n.veil, beardColor: n.beardColor,
        facing: look(n), wave: n.talked ? 0 : waveAt(n),
      });
      if (!n.talked) this._interactHint(ctx, n.x + n.w / 2 - camX, n.y - camY - 14, '!');
    }

    for (const s of this.stations) {
      if (!cam.isVisible(s.x, s.y, s.w, s.h)) continue;
      if (s.orb) {
        // A voice in a dream is shown as light only — never as a figure.
        const ox = s.x + s.w / 2 - camX, oy = s.y + s.h / 2 - camY + Math.sin(this.t * 2) * 4;
        glow(ctx, ox, oy, 90, '#fff2b0', 0.6);
        glow(ctx, ox, oy, 40, '#ffffff', 0.85);
        for (let i = 0; i < 6; i++) {
          const a = this.t * 0.8 + i * Math.PI / 3;
          circle(ctx, ox + Math.cos(a) * 34, oy + Math.sin(a) * 16, 3, '#ffe08a');
        }
        this._stationMarker(ctx, s, camX, camY);
        continue;
      }
      drawNPC(ctx, s.x - camX, s.y - camY, s.w, s.h, {
        robe: s.robe, sash: s.sash, t: this.t, role: s.role,
        beard: s.beard !== false, veil: !!s.veil, beardColor: s.beardColor,
        facing: look(s), wave: s.done ? 0 : waveAt(s) * 0.6,
      });
      this._stationMarker(ctx, s, camX, camY);
    }

    // 6. מזבחות
    for (const c of this.checkpoints) {
      if (!cam.isVisible(c.x, c.y, c.w, c.h)) continue;
      drawAltar(ctx, c.x - camX, c.y - camY, c.w, c.h, c.lit, this.t);
    }

    // 7. שער היציאה
    for (const b of this.bonusRooms) {
      if (cam.isVisible(b.x, b.y, b.w, b.h)) drawBonusRoom(ctx, b, camX, camY, this.t);
    }
    if (this.def.challenge) {
      if(this.def.orchard)drawOrchardPress(ctx,this.def.challenge,camX,camY,this.challengeDone,this.t);
      else if(this.def.night)drawMenorahStand(ctx,this.def.challenge,camX,camY,this.challengeDone,this.t);
      else if(this.def.lebanon)drawStoneSite(ctx,this.def.challenge,camX,camY,this.challengeDone,this.t);
      else if(this.def.temple)this._drawLevitesStage(ctx,this.def.challenge,camX,camY);
      else drawShofarChallenge(ctx, this.def.challenge, camX, camY, this.challengeDone, this.t);
    }
    const ex = this.def.exit;
    if (cam.isVisible(ex.x, ex.y, ex.w, ex.h)) {
      drawExitGate(ctx, ex.x - camX, ex.y - camY, ex.w, ex.h, this.t);
      if (!this.relicTaken) {
        text(ctx, '🔒', ex.x + ex.w / 2 - camX, ex.y + ex.h / 2 - camY,
          { size: 22, outline: null });
      }
    }

    // 8. פריטים
    for (const pk of this.pickups) {
      if (pk.collected) continue;
      if (!cam.isVisible(pk.x, pk.y, pk.w, pk.h)) continue;
      pk.draw(ctx, camX, camY);
    }


    // 9. אויבים
    for (const e of this.enemies) {
      if (!cam.isVisible(e.x, e.y, e.w, e.h)) continue;
      e.draw(ctx, camX, camY);
    }
    for (const w of this.watchers) {
      if (cam.isVisible(w.x - w.range, w.y, w.w + w.range * 2, w.h)) drawWatcher(ctx, w, camX, camY, this.t, w.alert > 0);
    }
    for (const f of this.foxes) if (f.fade > 0 && cam.isVisible(f.x, f.y - 20, f.w, f.h + 20)) drawFox(ctx, f, camX, camY, this.t);

    // 10. שחקן
    this.player.draw(ctx, camX, camY);

    // 11. חלקיקים
    this.particles.draw(ctx, camX, camY);

    // 12. שכבת הפעולה (הקרקע עצמה)
    this.map.drawLayer(ctx, 'action', camX, camY, W, H);
    // Project onto the finished terrain surface, never into the body's transform.
    this.player.drawShadow(ctx, this.map, camX, camY);

    // 13. שכבת החזית — מעל הכל, יוצרת עומק
    this.map.drawLayer(ctx, 'front', camX, camY, W, H);
    for (const b of this.def.bushes || []) if (cam.isVisible(b.x, b.y - 50, b.w, 50)) drawBush(ctx, b, camX, camY, this.t);
    for (const f of this.fields.items) {
      if (cam.isVisible(f.x, f.y, f.w, f.h)) drawWheatField(ctx, f, camX, camY, this.t);
    }
    if (this.fields.covers(this.player)) {
      // A translucent overlay keeps Bezalel identifiable without revealing hidden guards.
      ctx.save(); ctx.globalAlpha = 0.6;
      this.player.draw(ctx, camX, camY);
      ctx.restore();
    }

    if (this.def.sea) drawSea(ctx, this.def.sea, W, H, camX, camY, this.t);
    for (const pz of this.puzzles) {
      drawBeamSource(ctx, pz.source, camX, camY);
      drawBeam(ctx, pz.points, camX, camY, this.t, pz.lit);
      drawBeamTarget(ctx, pz.target, camX, camY, this.t, pz.lit);
      for (const m of pz.mirrors) drawMirror(ctx, m, camX, camY, this.t, this.nearMirror?.m === m);
    }

    // 14. סופת חול / שיטפון
    if (this.storm && this.storm.strength > 0.03) this._drawStorm(ctx, W, H);
    if (this.water?.flooding) this._drawFlood(ctx, W, H);

    // רמז מעל קירות מים סגורים
    this._drawWaterGateHints(ctx, camX, camY);
    if (this.def.night) this._drawNight(ctx, W, H, camX, camY);

    // 15. HUD
    this.hud.draw(ctx, {
      health: this.player.health,
      maxHealth: this.player.maxHealth,
      lives: Math.max(0, this.player.lives),
      materials: this.materialsFound,
      materialCounts: this.materialCounts,
      hideMaterials: !!this.def.hideMaterials,
      relics: this.game.save.relicCount + (this.relicTaken ? 1 : 0),
      sparks: this.sparks,
      maxSparks: this.def.maxSparks,
      levelName: this.meta.name,
      pointer: this.game.input.pointer,
      water: this.water ? {
        fill: 1 - (this.water.remaining / Math.max(1, this.water.capacity)),
        remaining: this.water.remaining,
      } : null,
      stones: this.water ? this.stones : null,
      maxStones: this.water?.maxStones ?? 12,
      hasShofar: this.hasShofar,
      touch: this.game.touch?.visible,
      harvest: this.def.harvest ? { count: this.grain, required: this.def.harvest.required, challenge: this.challengeDone } : null,
    });

    // 16. שכבות־על
    if(this.def.orchard){
      drawParchment(ctx,W-220,8,205,65);
      drawLearningIcon(ctx,'olive',W-187,39,40);
      text(ctx,`${this.olives}/${this.def.orchard.required}`,W-103,36,{size:25,color:'#3e492b',outline:null});
      text(ctx,this.challengeDone?'✓':'→ 🏺',W-42,39,{size:22,color:'#57794c',outline:null});
      drawLearningIcon(ctx,'water',W-243,39,32);
      text(ctx,this.orchardWatered?'✓':'?',W-243,64,{size:16,color:'#fff0c0'});
    }
    if (this.def.temple) {
      drawParchment(ctx, W - 250, 8, 235, 65);
      drawGoldPomegranate(ctx, W - 238, 26, 26, 0);
      text(ctx, `${this.rimonim}/${this.pickups.filter(p => p.type === 'rimon').length}`, W - 182, 38, { size: 20, color: '#3e492b', outline: null });
      text(ctx, '☀', W - 112, 38, { size: 22, color: '#d48a2a', outline: null });
      text(ctx, `${this.puzzles.filter(p => p.solved).length}/${this.puzzles.length}`, W - 62, 38, { size: 20, color: '#3e492b', outline: null });
    }
    if (this.def.lebanon) {
      drawParchment(ctx, W - 250, 8, 235, 65);
      drawCedarBeam(ctx, W - 240, 26, 26, 0);
      text(ctx, `${this.cedarsFound}/${this.pickups.filter(p => p.type === 'cedar').length}`, W - 180, 38, { size: 20, color: '#3e492b', outline: null });
      drawHewnStone(ctx, W - 124, 26, 26, 0);
      text(ctx, `${this.hewnFound}/${this.pickups.filter(p => p.type === 'hewn').length}`, W - 58, 38, { size: 20, color: '#3e492b', outline: null });
    }
    if (this.def.givon) {
      drawParchment(ctx, W - 250, 8, 235, 65);
      drawProverbScroll(ctx, W - 236, 26, 26, 0);
      text(ctx, `${this.proverbsFound}/${this.def.proverbs.length}`, W - 182, 38, { size: 20, color: '#3e492b', outline: null });
      drawFox(ctx, { x: W - 118, y: 30, w: 30, h: 22, facing: 1, caught: false, fade: 1 }, 0, 0, 0);
      text(ctx, `${this.foxesCaught}/${this.foxes.length}`, W - 52, 38, { size: 20, color: '#3e492b', outline: null });
    }
    if (this.def.stealth) {
      drawParchment(ctx, W - 220, 8, 205, 65);
      drawLoaf(ctx, W - 180, 40, 1.3, this.hasBread || this.delivered ? '#e2b46a' : 'rgba(120,100,70,0.35)');
      text(ctx, this.delivered ? '✓ לְדָוִד' : this.hasBread ? 'אֶל דָּוִד' : 'לֶחֶם', W - 112, 38, { size: 18, color: '#3e492b', outline: null });
      if (this.hiddenNow) text(ctx, 'מֻסְתָּרִים 🌿', W / 2, 94, { size: 20, color: '#c8f0b0' });
    }
    if (!this.player.alive) this._deathOverlay(ctx, W, H);
    if (this.characterNotice && !this.paused) {
      text(ctx,'דמות נפתחה! ⏸ ← הדמויות שלי',W/2,94+Math.sin(artTime(this.t)*3)*4,{size:20,color:'#fff1b3'});
    }
    if (this.paused) this._pauseOverlay(ctx, W, H);

    // 17. מיני-משחק — מעל הכל
    if (this.mini) this.mini.draw(ctx);
  }

  /** חושך הלילה, קרשים שהאור עוד לא גילה, הנחיית הריצה ומונה השמן והפנסים. */
  _drawNight(ctx, W, H, camX, camY) {
    const p = this.player;
    // קרשים נסתרים נראים במעומעם רק כשהמטה קרוב אליהם — רמז, לא דרך
    for (const l of this.lamps) {
      if (l.lit || !l.reveal.length) continue;
      const d = Math.min(...l.reveal.map(r => Math.abs(p.centerX - (r.col + r.w / 2) * 32)));
      drawGhostPlanks(ctx, l.reveal, camX, camY, Math.max(0, 0.5 - d / 400));
    }
    const lights = [{ x: p.centerX - camX, y: p.centerY - camY - 10, r: p.attacking ? 230 : 175 }];
    const add = (x, y, r, extra = {}) => lights.push({ x: x - camX, y: y - camY, r, ...extra });
    for (const l of this.lamps) add(l.x, l.y - 60, l.lit ? LAMP_RADIUS : 46, l.lit ? { warm: 1 } : { a: 0.6 });
    for (const pk of this.pickups) if (!pk.collected && !pk.dormant) add(pk.x + pk.size / 2, pk.y + pk.size / 2, pk.type === 'oil' ? 60 : 40, { a: 0.8 });
    for (const n of [...this.npcs, ...this.stations]) add(n.x + n.w / 2, n.y + n.h / 2 - 10, 95, { a: 0.85 });
    if (this.def.challenge) add(this.def.challenge.x + 32, this.def.challenge.y + 40, this.challengeDone ? 300 : 130, { warm: this.challengeDone ? 1 : 0 });
    add(this.def.exit.x + this.def.exit.w / 2, this.def.exit.y + 48, this.relicTaken ? 160 : 70);
    // עטלפים צריכים להיראות בזמן, כדי שאפשר יהיה להתכופף או להאיר עליהם
    for (const e of this.enemies) if (!e.gone) add(e.centerX, e.centerY, 60, { a: 0.8 });
    drawDarkness(ctx, W, H, lights);

    const run = this.callRun;
    if (run?.target && !this.mini) drawCallGuide(ctx, W, H, run, run.target.x - camX, this.t);

    drawParchment(ctx, W - 220, 8, 205, 65);
    drawLearningIcon(ctx, 'oil', W - 190, 40, 38);
    text(ctx, `×${this.oil}`, W - 150, 38, { size: 22, color: '#3e492b', outline: null });
    drawLearningIcon(ctx, 'menorah', W - 92, 40, 34);
    text(ctx, `${this.lamps.filter(l => l.lit).length}/${this.lamps.length}`, W - 48, 38, { size: 20, color: '#3e492b', outline: null });
  }

  /** במת הלויים בחצר: שלושה לויים עם כלי נגינה, וסימן להצטרף */
  _drawLevitesStage(ctx, c, camX, camY) {
    const x = c.x - camX, y = c.y + c.h - camY;
    ctx.fillStyle = '#e8d6a6'; ctx.fillRect(x - 40, y - 12, 150, 12);
    ['#f2ead6', '#e6eef6', '#f2ead6'].forEach((robe, i) => {
      drawNPC(ctx, x - 30 + i * 46, y - 68, 30, 56, { robe, sash: '#5a7fb0', t: this.t + i, beard: i !== 1, wave: this.challengeDone ? 1 : 0.4 });
    });
    if (!this.challengeDone) text(ctx, '🎵 ☝', x + 35, y - 92 + Math.sin(this.t * 2) * 3, { size: 20, color: '#6a4a1a' });
  }

  /** סימון מעל תחנת ידע: אייקון, ואם קרובים — הנחיה ללחוץ */
  _stationMarker(ctx, s, camX, camY) {
    const x = s.x + s.w / 2 - camX;
    const y = s.y - camY - 16;

    if (s.done) {
      text(ctx, '✓', x, y, { size: 20, color: '#8ad08a', weight: '700' });
      return;
    }

    const bob = Math.sin(this.t * 3) * 3;
    glow(ctx, x, y + bob, 20, '#ffd964', 0.35);
    text(ctx, STATION_ICON[s.kind] || '?', x, y + bob, { size: 20, outline: null });

    if (s === this.nearStation) {
      const cooling = this.activePlayTime < this.nextStationAt && !(s.id==='garden'&&this.def.orchard?.requiresWater);
      text(ctx, cooling ? 'ממשיכים לטייל…' : this.game.touch?.enabled ? 'נגיעה / שיחה' : 'Enter — נשחק?', x, y - 22, {
        size: 13, color: '#ffe9a8', weight: '700',
      });
    }
  }

  /** רכס הרים עם גלילת פרלקסה */
  _parallax(ctx, W, H, camX, factor, baseY, color, freq) {
    const off = camX * factor;
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(0, baseY);
    for (let x = 0; x <= W; x += 8) {
      const wx = (x + off) * 0.004 * freq;
      const h = Math.sin(wx) * 38
              + Math.sin(wx * 2.7 + 1.3) * 18
              + Math.sin(wx * 6.1) * 7;
      ctx.lineTo(x, baseY - h);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  /** עמוד הענן ברקע הרחוק */
  _cloudPillar(ctx, W, H, camX) {
    // מיקום קבוע בעולם, אבל כמעט לא זז — נראה רחוק מאוד
    const worldX = 3200;
    const sx = worldX - camX * 0.08;
    if (sx < -220 || sx > W + 220) return;

    ctx.save();
    ctx.globalAlpha = 0.34;
    const g = ctx.createLinearGradient(0, 0, 0, H * 0.72);
    g.addColorStop(0, 'rgba(255,255,255,0.06)');
    g.addColorStop(0.5, 'rgba(255,240,210,0.42)');
    g.addColorStop(1, 'rgba(240,210,160,0.5)');
    ctx.fillStyle = g;

    const topY = -40;
    const botY = H * 0.72;
    ctx.beginPath();
    for (let y = topY; y <= botY; y += 14) {
      const k = (y - topY) / (botY - topY);
      const w = 22 + k * 30;
      ctx.lineTo(sx - w + Math.sin(this.t * 0.7 + k * 4) * 14, y);
    }
    for (let y = botY; y >= topY; y -= 14) {
      const k = (y - topY) / (botY - topY);
      const w = 22 + k * 30;
      ctx.lineTo(sx + w + Math.sin(this.t * 0.7 + k * 4) * 14, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /** קירות מים עומדים משני צידי הערוץ — אטמוספירה בלבד */
  _drawWaterWalls(ctx, W, H, camX, camY) {
    const t = this.t;
    const drawWall = (screenX, side) => {
      ctx.save();
      const g = ctx.createLinearGradient(screenX, 0, screenX + side * 90, 0);
      g.addColorStop(0, 'rgba(40,120,160,0.55)');
      g.addColorStop(0.5, 'rgba(80,180,210,0.28)');
      g.addColorStop(1, 'rgba(80,180,210,0)');
      ctx.fillStyle = g;
      ctx.fillRect(side > 0 ? screenX : screenX - 90, 0, 90, H);

      // גלים + דגים "קפואים"
      ctx.globalAlpha = 0.45;
      for (let i = 0; i < 8; i++) {
        const y = ((i * 67 + t * 18 * side) % (H + 40)) - 20;
        const x = screenX + side * (18 + (i % 3) * 14);
        ctx.strokeStyle = 'rgba(200,240,255,0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + side * 10, y + 16, x, y + 32);
        ctx.stroke();

        if (i % 3 === 0) {
          ctx.fillStyle = 'rgba(180,220,200,0.35)';
          ctx.beginPath();
          ctx.ellipse(x + side * 22, y + 40, 7, 3.5, side * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // אור מסונן
      ctx.globalAlpha = 0.12 + Math.sin(t * 1.3) * 0.04;
      const ray = ctx.createLinearGradient(screenX, 0, screenX + side * 160, H * 0.7);
      ray.addColorStop(0, 'rgba(180,230,255,0.5)');
      ray.addColorStop(1, 'rgba(180,230,255,0)');
      ctx.fillStyle = ray;
      ctx.fillRect(side > 0 ? screenX : screenX - 160, 0, 160, H);
      ctx.restore();
    };

    // הקירות "נצמדים" לקצוות המסך — תחושת ערוץ
    drawWall(0, 1);
    drawWall(W, -1);

    // בועות עולות מקרקעית העולם
    ctx.save();
    for (let i = 0; i < 12; i++) {
      const wx = ((i * 530 + 200) % Math.max(1, this.map.pixelW));
      const sx = wx - camX;
      if (sx < -20 || sx > W + 20) continue;
      const phase = (t * 40 + i * 50) % (H + 60);
      const by = H - phase + (camY * 0.1);
      ctx.globalAlpha = 0.25;
      circle(ctx, sx, by, 1.5 + (i % 3) * 0.7, 'rgba(220,245,255,0.8)');
    }
    ctx.restore();
  }

  _drawWaterGateHints(ctx, camX, camY) {
    if (!this.hasShofar) return;
    for (const g of this.waterGates) {
      if (g.open) {
        // מעבר פתוח — זוהר קל
        const cx = g.x + g.w / 2 - camX;
        const cy = g.y + g.h / 2 - camY;
        glow(ctx, cx, cy, 40, '#a8e8ff', 0.25 + Math.sin(this.t * 8) * 0.1);
        continue;
      }
      if (!this.game.camera.isVisible(g.x, g.y, g.w, g.h)) continue;
      const cx = g.x + g.w / 2 - camX;
      const cy = g.y - camY - 10;
      const near = Math.abs(this.player.centerX - (g.x + g.w / 2)) < 120;
      if (near) {
        text(ctx, 'X — שׁוֹפָר', cx, cy + Math.sin(this.t * 3) * 3, {
          size: 13, color: '#a8e8ff', weight: '700',
        });
      }
    }
  }

  _drawFlood(ctx, W, H) {
    const level = this.water.floodLevel;
    const h = H * (0.25 + level * 0.55);
    ctx.save();
    const g = ctx.createLinearGradient(0, H - h, 0, H);
    g.addColorStop(0, 'rgba(40,120,170,0.15)');
    g.addColorStop(0.4, 'rgba(30,100,150,0.45)');
    g.addColorStop(1, 'rgba(20,70,110,0.72)');
    ctx.fillStyle = g;
    ctx.fillRect(0, H - h, W, h);

    // קו גל עליון
    ctx.strokeStyle = 'rgba(180,230,255,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 8) {
      const y = H - h + Math.sin(this.t * 4 + x * 0.05) * 4;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  _drawStorm(ctx, W, H) {
    const s = this.storm;

    // ערפל חול כתמתם
    ctx.save();
    ctx.globalAlpha = s.strength * 0.3;
    const g = ctx.createLinearGradient(W, 0, 0, 0);
    g.addColorStop(0, 'rgba(200,160,100,0.85)');
    g.addColorStop(1, 'rgba(200,160,100,0.1)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // גרגרי חול
    ctx.save();
    for (const p of s.particles) {
      ctx.globalAlpha = p.a * s.strength;
      // קו מתוח לפי המהירות — תחושת מהירות
      ctx.strokeStyle = '#e8d0a0';
      ctx.lineWidth = p.r;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.sp * 0.03 * s.strength, p.y);
      ctx.stroke();
    }
    ctx.restore();

    // חץ כיוון הרוח
    if (s.active) {
      ctx.save();
      ctx.globalAlpha = 0.4 + Math.sin(this.t * 6) * 0.2;
      text(ctx, '◄◄◄', W / 2, 110, { size: 20, color: '#e8c88a' });
      ctx.restore();
    }
  }

  /** חיווי "דבר איתי" מעל NPC */
  _interactHint(ctx, x, y, glyph) {
    const bob = Math.sin(this.t * 3) * 3;
    ctx.save();
    ctx.globalAlpha = 0.85;
    glow(ctx, x, y + bob, 18, '#ffd964', 0.4);
    text(ctx, glyph, x, y + bob, { size: 20, color: '#ffe9a8', weight: '700' });
    ctx.restore();
  }

  _deathOverlay(ctx, W, H) {
    const a = Math.min(0.65, this._respawnDelay * 0.7);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = '#2a0f0a';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    if (this._respawnDelay > 0.4) {
      text(ctx, 'נָפַלְתָּ', W / 2, H / 2 - 12, {
        size: 34, color: '#e8a090', weight: '700',
      });
      text(ctx, `נוֹתְרוּ ${Math.max(0, this.player.lives)} חַיִּים`, W / 2, H / 2 + 24, {
        size: 16, color: 'rgba(240,200,180,0.75)',
      });
    }
  }

  _pauseOverlay(ctx, W, H) {
    if(this.pausePanel==='controls'){drawControlsHelp(ctx,this.game,this.t,this.hasShofar);return;}
    if(this.pausePanel==='characters'){this.gallery.draw(ctx);return;}
    ctx.save();
    ctx.globalAlpha = 0.78;
    ctx.fillStyle = '#0a0806';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    drawParchment(ctx,W/2-220,86,440,392,true);
    text(ctx,'נחים רגע',W/2,127,{size:31,color:'#44321e',outline:null});
    text(ctx,this.meta.name,W/2,169,{size:18,color:'#755b32',outline:null});
    this.pauseButtons.items.forEach((b,i)=>drawSelectionButton(ctx,b,i===this.pauseButtons.focus||i===this.pauseButtons.hover));
  }
}
