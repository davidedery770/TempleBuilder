import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { buildLevel01 } from '../src/data/level01.js';
import { buildLevel03 } from '../src/data/level03.js';
import { buildLevel04 } from '../src/data/level04.js';
import { buildLevel05 } from '../src/data/level05.js';
import { buildLevel06 } from '../src/data/level06.js';
import { MemoryGame } from '../src/minigames/memory.js';
import { PlanningMazeGame } from '../src/minigames/planningMaze.js';
import { HeartGame } from '../src/minigames/heart.js';
import { MatchingGame, MATCHING_CUES } from '../src/minigames/matching.js';
import { WATER_CUES } from '../src/minigames/waterChannels.js';
import { PRESS_CUES } from '../src/minigames/olivePress.js';
import { spokenTextFor, manualAudioFor } from '../src/data/pronunciation.js';
import { BUILD_PARTS } from '../src/data/level02.js';
import { MATERIALS, MATERIAL_GROUPS } from '../src/data/materials.js';
import { CODEX } from '../src/data/codex.js';
import { TRIVIA } from '../src/data/trivia.js';
import { VOICE_PROFILES, voiceId, profileForSpeaker, WEAVING_TEXT, SHOFAR_TEXT,
  constructionNotes, REBUILD_TEXT, QUIZ_END, SORT_END, cardTexts } from '../src/data/voiceText.js';

const root = new URL('../', import.meta.url), entries = new Map();
function add(profile, text) {
  if (!text || !/[\u05d0-\u05ea]/.test(text)) return;
  const id = voiceId(profile, text);
  const spokenText=spokenTextFor(id,text),manualFile=manualAudioFor(id);
  const signature = createHash('sha256').update(JSON.stringify({ text:spokenText, ...VOICE_PROFILES[profile], normalization: 1 })).digest('hex');
  if (entries.has(id) && entries.get(id).signature !== signature) throw Error('Voice ID collision: ' + id);
  entries.set(id, { id, profile, text, spokenText, manualFile, ...VOICE_PROFILES[profile], signature, file: manualFile||`${id}-${signature.slice(0, 12)}.mp3` });
}
for (const builder of [buildLevel01, buildLevel03, buildLevel04, buildLevel05, buildLevel06]) {
  const level = builder();
  for (const npc of level.npcs) for (const text of npc.lines) add(profileForSpeaker(npc.name), text);
  for (const station of level.stations) {
    const profile = profileForSpeaker(station.params.speaker);
    const LearningGame = { memory: MemoryGame, planningMaze: PlanningMazeGame, heart: HeartGame }[station.kind];
    if (LearningGame) for (const text of new LearningGame({}, { ...station.params, levelId: level.id }).getVoiceLines()) add(profile, text);
    if(station.kind==='matching')for(const text of new MatchingGame({},station.params).getVoiceLines())add(profile,text);
    if(station.kind==='waterChannels')for(const text of WATER_CUES)add(profile,text);
    if(station.kind==='olivePress')for(const text of PRESS_CUES)add(profile,text);
    if (station.kind === 'trivia') {
      for (const q of TRIVIA[level.id] || []) {
        for (const text of [q.q, ...q.options, q.explain]) add(profile, text);
      }
      for (const text of [...QUIZ_END, 'נָכוֹן!', 'כִּמְעַט — הַתְּשׁוּבָה הַנְּכוֹנָה מְסֻמֶּנֶת']) add(profile, text);
    }
    if (station.kind === 'sorting') {
      for (const m of MATERIALS) add(profile, m.name);
      for (const g of Object.values(MATERIAL_GROUPS)) add(profile, g.label);
      for (const text of [...SORT_END, 'נָכוֹן!', 'הַזְּמַן אָזַל', 'לֹא בְּדִיּוּק']) add(profile, text);
    }
  }
}
for(const text of [...WATER_CUES,...PRESS_CUES])add('workshop',text);
for(const text of [...MATCHING_CUES,...new MatchingGame({}).getVoiceLines()])add('elder',text);
// Default debug mini-games use the same elder casting as a nameless station.
for (const m of MATERIALS) add('elder', m.name);
for (const g of Object.values(MATERIAL_GROUPS)) add('elder', g.label);
for (const text of [...SORT_END, 'נָכוֹן!', 'הַזְּמַן אָזַל', 'לֹא בְּדִיּוּק']) add('elder', text);
for (const text of Object.values(WEAVING_TEXT)) add('weaver', text);
for (const text of Object.values(SHOFAR_TEXT)) add('yehoshua', text);
for (const Mini of [MemoryGame, PlanningMazeGame, HeartGame]) for (const levelId of [1,3,4,5,6]) {
  for (const text of new Mini({}, { levelId }).getVoiceLines()) add('elder', text);
}
for (const card of CODEX.filter(c => c.level <= 6)) for (const text of cardTexts(card)) add('narrator', text);
add('narrator', 'הַשָּׁלָב הֻשְׁלַם');
for (const text of [...constructionNotes('plan'), ...constructionNotes('3d'), REBUILD_TEXT]) add('workshop', text);
// Literal workshop messages are extracted from their displayed source, not retyped.
const construction = await readFile(new URL('src/scenes/construction.js', root), 'utf8');
for (const match of construction.matchAll(/'([^'\r\n]*[\u0590-\u05ff][^'\r\n]*)'/g)) add('workshop', match[1]);
for (const p of BUILD_PARTS) {
  for (const text of [p.name, p.quote, p.hint, 'נוסף למשכן: ' + p.name,
    'עוד לא במיקום המתאים. ' + p.hint, 'גוררים אל סימון התכלת. ' + p.hint]) add('workshop', text);
}
const folder = new URL('assets/audio/voices/', root);
await mkdir(folder, { recursive: true });
const manifest = { version: 1, profiles: VOICE_PROFILES, lines: [...entries.values()] };
await writeFile(new URL('manifest.json', folder), JSON.stringify(manifest, null, 2) + '\n');
await writeFile(new URL('src/data/voiceManifest.js', root),
  '// Generated by tools/prepare-voices.mjs. Local playback only.\nexport const VOICE_FILES = ' +
  JSON.stringify(Object.fromEntries(manifest.lines.map(e => [e.id, e.file])), null, 2) + ';\n');
console.log(`Prepared ${entries.size} local speech clips across ${Object.keys(VOICE_PROFILES).length} voice profiles.`);
