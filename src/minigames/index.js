/**
 * index.js — יוצר מיני-משחק לפי סוג.
 *
 * מיני-משחק חדש: קובץ שמייצא מחלקה עם update(dt,input,audio) / draw(ctx) /
 * finished / result, ורישום כאן. תחנות הידע בשלב (level0X.js) פשוט מציינות
 * kind ופרמטרים.
 */

import { TriviaGame } from './trivia.js';
import { SortingGame } from './sorting.js';
import { WeavingGame } from './weaving.js';
import { ShofarTimingGame } from './shofarTiming.js';
import { CraftGame } from './craft.js';
import { MatchingGame } from './matching.js';
import { WaterChannelsGame } from './waterChannels.js';
import { OlivePressGame } from './olivePress.js';
import { MemoryGame } from './memory.js';
import { PlanningMazeGame } from './planningMaze.js';
import { HeartGame } from './heart.js';
import { MenorahLightingGame } from './menorahLighting.js';
import { ShowbreadGame } from './showbread.js';
import { DreamChoiceGame } from './dreamChoice.js';
import { StoneFitGame } from './stoneFit.js';
import { LevitesGame } from './levites.js';

const KINDS = {
  trivia: TriviaGame,
  sorting: SortingGame,
  weaving: WeavingGame,
  shofarTiming: ShofarTimingGame,
  craft: CraftGame,
  matching: MatchingGame,
  waterChannels: WaterChannelsGame,
  olivePress: OlivePressGame,
  memory: MemoryGame,
  planningMaze: PlanningMazeGame,
  heart: HeartGame,
  menorahLighting: MenorahLightingGame,
  showbread: ShowbreadGame,
  dreamChoice: DreamChoiceGame,
  stoneFit: StoneFitGame,
  levites: LevitesGame,
};

/** @returns {object} מופע מיני-משחק */
export function createMiniGame(kind, params, game) {
  const Cls = KINDS[kind];
  if (!Cls) throw new Error(`מיני-משחק לא מוכר: ${kind}`);
  return new Cls(game, params);
}

export const MINIGAME_KINDS = Object.keys(KINDS);
