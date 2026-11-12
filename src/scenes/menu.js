/**
 * menu.js — מסך הפתיחה.
 */

import { text } from '../core/art.js';
import { ENTRY_BUTTONS, loadEntryArt, drawEntryBackdrop, drawEntryButton } from '../core/entryArt.js';
import { niqqud } from '../core/niqqud.js';

export class MenuScene {
  constructor() {
    this.index = 0;
    this.t = 0;
    this.items = [];
    this.art = null;
    this.artFailed = false;
    this._artRequest = loadEntryArt(image => { this.art = image; }, () => { this.artFailed = true; });
    this.touchMenu = null;
  }

  enter() {
    this.t = 0;
    this.index = 0;

    const save = this.game.save;
    const hasProgress = save.data.unlocked > 1 || save.relicCount > 0;

    this.items = [
      { label: hasProgress ? 'הַמְשֵׁךְ בַּמַּסָּע' : 'הַתְחֵל אֶת הַמַּסָּע', action: 'levels' },
      { label: 'בְּחִירַת שָׁלָב', action: 'levels' },
      { label: 'מוּזֵיאוֹן הַמִּקְדָּשׁ', action: 'museum' },
    ];

    if (hasProgress) {
      this.items.push({ label: 'אִפּוּס הִתְקַדְּמוּת', action: 'reset' });
    }

    this._syncTouchMenu();
    this.game._resize?.();
  }

  update(dt) {
    this.t += dt;
    const { input, audio } = this.game;

    this._syncTouchMenu();

    if (this.scenes.transitioning) return;

    if (input.pressed('down')) {
      this.index = (this.index + 1) % this.items.length;
      audio.menuMove();
    }
    if (input.pressed('up')) {
      this.index = (this.index - 1 + this.items.length) % this.items.length;
      audio.menuMove();
    }

    // עכבר: ריחוף בוחר, לחיצה מפעילה
    let clickedIdx = -1;
    this.items.forEach((_, i) => {
      const r = this._itemRect(i);
      if (!this.game.touch?.enabled && input.over(r.x, r.y, r.w, r.h)) {
        input.cursor = 'pointer';
        if (input.pointerMoved) this.index = i;
        if (input.clicked) clickedIdx = i;
      }
    });
    if (clickedIdx >= 0) {
      this.index = clickedIdx;
      audio.menuPick();
      this._activate(this.items[clickedIdx].action);
      return;
    }

    if (input.pressed('confirm') || input.pressed('jump')) {
      audio.menuPick();
      this._activate(this.items[this.index].action);
    }
  }

  _activate(action) {
    switch (action) {
      case 'levels':
        this.scenes.go('levels');
        break;
      case 'museum':
        this.scenes.go('museum');
        break;
      case 'reset':
        this.game.save.reset();
        this.enter();   // בונה מחדש את התפריט
        break;
    }
  }

  _itemRect(index) { return ENTRY_BUTTONS[index]; }

  exit() {
    if (typeof document !== 'undefined') document.body.classList.remove('tb-entry-menu');
    if (this.touchMenu) {
      if (this.touchMenu.contains(document.activeElement)) document.activeElement.blur();
      this.touchMenu.hidden = true;
    }
  }

  _syncTouchMenu() {
    if (!this.game.touch?.enabled || typeof document === 'undefined') {
      if (this.touchMenu) this.touchMenu.hidden = true;
      if (typeof document !== 'undefined') document.body.classList.remove('tb-entry-menu');
      return;
    }
    document.body.classList.add('tb-entry-menu');
    document.body.style.setProperty('--entry-space', this.items.length > 3 ? '160px' : '116px');
    if (!this.touchMenu) {
      this.touchMenu = document.createElement('nav');
      this.touchMenu.id = 'entry-menu-controls';
      this.touchMenu.dir = 'rtl';
      this.touchMenu.setAttribute('aria-label', 'תפריט ראשי');
      document.body.appendChild(this.touchMenu);
    }
    this.touchMenu.hidden = false;
    this.touchMenu.dataset.count = String(this.items.length);
    const signature = this.items.map(item => item.label).join('|');
    if (signature === this._touchSignature) return;
    this._touchSignature = signature;
    this.touchMenu.replaceChildren();
    this.items.forEach((item, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.menuIndex = String(i);
      button.className = i === 0 ? 'entry-primary' : i === 3 ? 'entry-reset' : '';
      button.textContent = niqqud(item.label);
      button.addEventListener('keydown', e => {
        if (e.code === 'Space' || e.code === 'Enter') e.stopPropagation();
      });
      button.addEventListener('click', () => {
        if (this.scenes.transitioning) return;
        this.index = i;
        this.game.audio.unlock?.();
        this.game.audio.menuPick();
        this._activate(this.items[i].action);
      });
      this.touchMenu.appendChild(button);
    });
  }

  draw(ctx) {
    const W = this.game.width, H = this.game.height;
    drawEntryBackdrop(ctx, this.art, W, H, this.t);
    text(ctx, 'בּוֹנֵה הַמִּקְדָּשׁ', W / 2, H * 73 / 540, {
      size: 45, color: '#3c210c', weight: '700', outline: '#e8c990', outlineWidth: 1,
      font: '"Times New Roman", "Arial Hebrew", serif',
    });
    if (!this.art) text(ctx, 'מִמִּדְבַּר סִינַי עַד יְרוּשָׁלַיִם', W / 2, 133,
      { size: 17, color: '#fff2cf', outlineWidth: 2 });
    if (!this.game.touch?.enabled) {
      this.items.forEach((item, i) => drawEntryButton(ctx, this._itemRect(i), item.label, i === this.index, i === 0));
      text(ctx, 'עכבר או ↑↓ לבחירה · Enter לאישור', W / 2, H - 12,
        { size: 11, color: '#c3d4dc', outline: null });
    } else {
      text(ctx, 'מסע מהמשכן במדבר עד ירושלים', W / 2, 430,
        { size: 21, color: '#fff1c9', outline: null });
      text(ctx, 'בחרו פעולה בכפתורים שמתחת לאיור', W / 2, 466,
        { size: 16, color: '#d1dfe4', outline: null });
    }
    if (this.game.save.relicCount > 0) {
      text(ctx, `כְּלֵי קֹדֶשׁ שֶׁנֶּאֶסְפוּ: ${this.game.save.relicCount} מִתּוֹךְ 14`,
        W / 2, this.game.touch?.enabled ? 503 : 389,
        { size: 12, color: '#e7d5ad', outlineWidth: 1 });
    }
  }
}
