// Exact phrases only: never replace an ambiguous Hebrew word inside every sentence.
// Keys in SPEECH_OVERRIDES are stable profile-text IDs shown in pronunciation.html.
export const SPEECH_OVERRIDES = {};
export const MANUAL_AUDIO = {};
const LABELS = {'זהב':'זָהָב','נחושת':'נְחֹשֶׁת','עצי שיטים':'עֲצֵי שִׁטִּים','זית':'זַיִת','שמן':'שֶׁמֶן','מנורה':'מְנוֹרָה'};
export function spokenTextFor(id, displayText) {
  const override=SPEECH_OVERRIDES[id];
  return typeof override==='string'&&override.trim()?override:LABELS[displayText]||displayText;
}
export function manualAudioFor(id) {
  const file=MANUAL_AUDIO[id];
  return typeof file==='string'&&/^[a-zA-Z0-9_-][a-zA-Z0-9._-]*\.mp3$/.test(file)?file:null;
}
