/**
 * storage.js — שמירת התקדמות ב־localStorage.
 *
 * כל הגישה לקובץ השמירה עוברת כאן, כך שמעבר לשרת/ענן בעתיד
 * דורש שינוי בקובץ אחד בלבד.
 */

const KEY = 'templebuilder.save.v1';

function emptySave() {
  return {
    /** מספר השלב הגבוה ביותר שנפתח (1..14) */
    unlocked: 1,
    /** מזהי כלי הקודש שנאספו */
    relics: [],
    /** מזהי כרטיסיות Codex שנפתחו */
    codex: [],
    /** ניקוד שיא לכל שלב: { [levelId]: score } */
    scores: {},
    /** סה"כ תרומות שנאספו במצטבר */
    totalDonations: 0,
    /** סוגי תרומות שנאספו; לא כמויות חומר פיזיות */
    materials: [],
    construction: { placed: [], completed: false },
    camp: {},
    achievements: {},
    character: 'bezalel',
    materialCounts: {},
    currentLevel: null,
  };
}

export class SaveData {
  constructor() {
    this.data = emptySave();
    this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        // מיזוג עם ברירת המחדל — כך שהוספת שדה חדש בעתיד לא תשבור שמירות ישנות
        this.data = Object.assign(emptySave(), JSON.parse(raw));
        if(this.data.unlocked===4&&Array.isArray(this.data.relics)&&this.data.relics.includes('omer'))this.data.unlocked=5;
        if(this.data.unlocked===5&&Array.isArray(this.data.relics)&&this.data.relics.includes('oil'))this.data.unlocked=6;
        if(this.data.unlocked===6&&Array.isArray(this.data.relics)&&this.data.relics.includes('menorah'))this.data.unlocked=7;
        if(this.data.unlocked===7&&Array.isArray(this.data.relics)&&this.data.relics.includes('vestments'))this.data.unlocked=8;
        if(this.data.unlocked===8&&Array.isArray(this.data.relics)&&this.data.relics.includes('altar'))this.data.unlocked=9;
        if(this.data.unlocked===9&&Array.isArray(this.data.relics)&&this.data.relics.includes('cedars'))this.data.unlocked=10;
      }
    } catch (err) {
      console.warn('טעינת השמירה נכשלה, מתחילים מחדש:', err);
      this.data = emptySave();
    }
    return this.data;
  }

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch (err) {
      console.warn('שמירה נכשלה:', err);
    }
  }

  reset() {
    this.data = emptySave();
    this.save();
  }

  // ---- שאילתות ----

  isUnlocked(levelId) {
    return levelId <= this.data.unlocked;
  }

  hasRelic(relicId) {
    return this.data.relics.includes(relicId);
  }

  hasCodex(cardId) {
    return this.data.codex.includes(cardId);
  }

  bestScore(levelId) {
    return this.data.scores[levelId] || 0;
  }

  get relicCount() {
    return this.data.relics.length;
  }

  // ---- עדכונים ----

  unlockLevel(levelId) {
    if (levelId > this.data.unlocked) {
      this.data.unlocked = Math.min(levelId, 14);
      this.save();
    }
  }

  addRelic(relicId) {
    if (!relicId || this.hasRelic(relicId)) return false;
    this.data.relics.push(relicId);
    this.save();
    return true;
  }

  addCodex(cardId) {
    if (!cardId || this.hasCodex(cardId)) return false;
    this.data.codex.push(cardId);
    this.save();
    return true;
  }

  /** רושם ניקוד אם הוא גבוה מהשיא הקיים */
  recordScore(levelId, score) {
    if (score > this.bestScore(levelId)) {
      this.data.scores[levelId] = score;
      this.save();
      return true;
    }
    return false;
  }

  addDonations(amount) {
    this.data.totalDonations += amount;
    this.save();
  }

  addMaterials(ids) {
    this.data.materials = [...new Set([...(this.data.materials || []), ...ids])];
    this.save();
  }

  saveConstruction(placed, completed = false) {
    this.data.construction = { placed: [...placed], completed };
    this.save();
  }

  saveCamp(snapshot) {
    this.data.camp = snapshot;
    this.save();
  }

  awardChallenge(key, perfect = false) {
    if (typeof key !== 'string' || !/^[a-zA-Z0-9:_-]{1,100}$/.test(key)) return false;
    if (!this.data.achievements || typeof this.data.achievements !== 'object' || Array.isArray(this.data.achievements)) this.data.achievements = {};
    const old = this.data.achievements[key];
    if (old?.success && (!perfect || old.perfect)) return false;
    this.data.achievements[key] = { success: true, perfect: !!perfect || !!old?.perfect };
    this.save();
    return !old?.success;
  }

  addMaterialCount(id) {
    if (!this.data.materialCounts || typeof this.data.materialCounts !== 'object' || Array.isArray(this.data.materialCounts)) this.data.materialCounts = {};
    const old = this.data.materialCounts[id];
    this.data.materialCounts[id] = (Number.isSafeInteger(old) && old >= 0 ? old : 0) + 1;
    this.save();
  }

  rememberLevel(levelId) {
    if(!Number.isInteger(levelId)||levelId<1||levelId>14||this.data.currentLevel===levelId)return;
    this.data.currentLevel=levelId;
    this.save();
  }
}
