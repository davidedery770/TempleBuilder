/** Original procedural motifs; numbers are scale degrees, null sustains a note. */
const _ = null;
const EASTERN = [0, 1, 4, 5, 7, 8, 10];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];

const CAMP_A = [
  4, _, 3, _, 2, _, 1, 0,   1, _, _, _, 2, _, _, _,
  3, _, 4, _, 5, _, 4, _,   3, _, 2, _, 1, _, 0, _,
];
const CAMP_B = [
  0, _, 2, _, 3, _, 4, _,   6, _, 5, 4, 3, _, _, _,
  2, _, 3, _, 1, _, 2, _,   1, _, 0, _, 4, _, 0, _,
];
const RIVER_A = [
  0, _, _, _, 2, _, 4, _,   3, _, _, _, 2, _, _, _,
  1, _, 2, _, 4, _, _, _,   5, _, 4, _, 2, _, _, _,
];
const RIVER_B = [
  4, _, _, _, 6, _, 5, _,   4, _, 2, _, 3, _, _, _,
  2, _, 1, _, 0, _, _, _,   2, _, 1, _, 0, _, _, _,
];
const HARVEST_A = [
  0, _, 2, 4, _, 2, 1, _,   2, _, 4, _, 5, _, 4, _,
  3, _, 2, 1, _, 0, 2, _,   4, _, 2, _, 1, _, 0, _,
];
const HARVEST_B = [
  4, _, 5, 7, _, 5, 4, _,   2, _, 3, _, 4, _, _, _,
  5, _, 4, 2, _, 1, 2, _,   3, _, 1, _, 0, _, _, _,
];

export const MUSIC_THEMES = {
  dedication: {
    label: 'חנוכת הבית — כי לעולם חסדו', bpm: 92, scale: MAJOR, tonic: 196,
    form: [[0,_,4,_,7,_,4,_,5,_,4,_,2,_,_,_,4,_,5,_,7,_,9,_,7,_,5,_,4,_,_,_],
      [7,_,_,9,7,_,5,_,4,_,5,_,4,_,2,_,0,_,2,_,4,_,2,_,1,_,_,_,0,_,_,_]],
    bass: [0,4,5,4,0,5,4,0], voice: 'triangle', lead: 0.066, echo: 0.018,
    bassGain: 0.045, drone: 0.018, noteLength: 0.82,
    arpeggio: [0,4,7,4,2,5,7,5], arpeggioGain: 0.02,
    drums: { beats: [0, 4], taps: [2, 6, 7], gain: 0.07, filter: 2000 },
  },
  lebanon: {
    label: 'הלבנון — ארזים, ים ואבן', bpm: 96, scale: MAJOR, tonic: 174.61,
    form: [[0,_,_,4,_,_,2,_,3,_,4,_,5,_,_,_,4,_,_,2,_,_,0,_,1,_,2,_,0,_,_,_],
      [4,_,_,5,_,_,7,_,5,_,4,_,2,_,_,_,3,_,_,4,_,_,2,_,1,_,_,_,0,_,_,_]],
    bass: [0,0,3,0,4,0,3,4], voice: 'triangle', lead: 0.064, echo: 0.016,
    bassGain: 0.045, drone: 0.016, noteLength: 0.8,
    arpeggio: [0,4,2,4,0,4,2,5], arpeggioGain: 0.018,
    drums: { beats: [0, 3, 6], taps: [4], gain: 0.065, filter: 1800 },
  },
  givon: {
    label: 'גבעון — חלום של עננים', bpm: 104, scale: MAJOR, tonic: 196,
    form: [[0,_,2,4,_,4,5,_,4,_,2,_,4,_,_,_,5,_,7,_,5,_,4,_,2,_,4,_,0,_,_,_],
      [4,_,5,7,_,7,9,_,7,_,5,_,4,_,_,_,2,_,4,_,5,_,4,_,2,_,1,_,0,_,_,_]],
    bass: [0,4,5,3,0,4,3,0], voice: 'triangle', lead: 0.066, echo: 0.014,
    bassGain: 0.04, drone: 0.012, noteLength: 0.7,
    arpeggio: [0,2,4,7,4,2,4,7], arpeggioGain: 0.02,
    drums: { beats: [0, 4], taps: [2, 6], gain: 0.07, filter: 2200 },
  },
  nob: {
    label: 'נוב — צעדים שקטים בשקיעה', bpm: 88, scale: MINOR, tonic: 155.56,
    form: [[0,_,_,2,3,_,2,_,0,_,_,_,4,_,3,_,2,_,3,_,2,_,0,_,1,_,_,_,0,_,_,_],
      [4,_,_,5,4,_,2,_,3,_,_,_,2,_,0,_,1,_,2,_,3,_,1,_,0,_,_,_,0,_,_,_]],
    bass: [0,0,3,0,4,0,3,0], voice: 'triangle', lead: 0.06, echo: 0.012,
    bassGain: 0.04, drone: 0.018, noteLength: 0.6,
    drums: { beats: [0, 4], taps: [6], gain: 0.06, filter: 1400 },
  },
  shilohCourt: {
    label: 'שילה — אור והקשבה', bpm: 68, scale: MINOR, tonic: 174.61,
    form: [[0,_,_,_,2,_,4,_,3,_,2,_,1,_,_,_,2,_,3,_,4,_,2,_,1,_,0,_,0,_,_,_],
      [4,_,_,_,5,_,4,_,2,_,3,_,2,_,_,_,1,_,2,_,3,_,1,_,0,_,_,_,0,_,_,_]],
    bass: [0,3,4,0,5,3,4,0], voice: 'sine', lead: 0.063, echo: 0.012,
    bassGain: 0.034, drone: 0.016, noteLength: 0.97, drums: null,
    arpeggio: [0,2,4,2,1,3,5,3], arpeggioGain: 0.016,
  },
  shiloh: {
    label:'שילה — בין עצי הזית',bpm:76,scale:MAJOR,tonic:174.61,
    form:[[0,_,4,_,2,_,_,_,3,_,2,_,1,_,0,_,2,_,4,_,5,_,4,_,2,_,1,_,0,_,_,_],
      [4,_,5,_,4,_,2,_,3,_,2,_,0,_,_,_,1,_,3,_,2,_,1,_,0,_,_,_,0,_,_,_]],
    bass:[0,3,4,0,5,3,4,0],voice:'sine',lead:0.067,echo:0.012,bassGain:0.035,drone:0.016,noteLength:0.94,
    arpeggio:[0,2,4,2,1,3,5,3],arpeggioGain:0.019,drums:null,
  },
  menu: {
    label: 'מנגינת המסע', bpm: 64, scale: EASTERN, tonic: 146.83,
    form: [CAMP_A, CAMP_A, CAMP_B, CAMP_A],
    bass: [0, 0, 4, 0, 3, 0, 4, 0], voice: 'triangle',
    lead: 0.065, echo: 0.016, bassGain: 0.05, drone: 0.025,
    noteLength: 0.96, drums: null,
  },
  desert: {
    label: 'מחנה ישראל — דרך במדבר', bpm: 84, scale: EASTERN, tonic: 146.83,
    form: [CAMP_A, CAMP_B, CAMP_A, CAMP_B],
    bass: [0, 0, 4, 0, 3, 0, 4, 0], voice: 'triangle',
    lead: 0.075, echo: 0.018, bassGain: 0.05, drone: 0.025,
    noteLength: 0.9,
    drums: { beats: [0, 4], taps: [3, 6, 7], gain: 0.095, filter: 2500 },
  },
  jordan: {
    label: 'מעבר הירדן — בין קירות המים', bpm: 72, scale: MINOR, tonic: 196,
    form: [RIVER_A, RIVER_B, RIVER_A, RIVER_B],
    bass: [0, 4, 5, 3, 0, 4, 1, 0], voice: 'sine',
    lead: 0.075, echo: 0.013, bassGain: 0.035, drone: 0.022,
    noteLength: 0.98, drums: null,
    arpeggio: [0, 4, 2, 4, 1, 4, 2, 4], arpeggioGain: 0.024,
  },
  gilgal: {
    label: 'גלגל — שמחת הקציר', bpm: 96, scale: MAJOR, tonic: 164.81,
    form: [HARVEST_A, HARVEST_B, HARVEST_A, HARVEST_B],
    bass: [0, 4, 3, 4, 0, 5, 4, 0], voice: 'triangle',
    lead: 0.068, echo: 0.012, bassGain: 0.045, drone: 0.018,
    noteLength: 0.72,
    drums: { beats: [0, 4], taps: [2, 5, 7], gain: 0.075, filter: 1900 },
  },
};

export function themeForScene(name, levelId = 1) {
  if (name === 'camp') return 'desert';
  if (name === 'construction') return 'sanctuary';
  if (name !== 'play') return 'menu';
  return ({ 1: 'desert', 2: 'sanctuary', 3: 'jordan', 4: 'gilgal', 5:'shiloh', 6:'shilohCourt', 7:'nob', 8:'givon', 9:'lebanon', 10:'dedication' })[levelId] || 'desert';
}
