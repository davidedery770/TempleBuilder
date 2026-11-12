import { NIQQUD_PHRASES, NIQQUD_WORDS } from '../data/niqqud.generated.js';

export const stripNiqqud = s => String(s).normalize('NFD').replace(/[\u0591-\u05bd\u05bf-\u05c7]/g,'');
const marks=/[\u0591-\u05bd\u05bf-\u05c7]/;
const words=/[\u05d0-\u05ea][\u0591-\u05bd\u05bf-\u05c7\u05d0-\u05ea]*/g;
const cache=new Map();
export function niqqud(value) {
  const source=String(value??'');
  if(!/[\u05d0-\u05ea]/.test(source))return source;
  if(cache.has(source))return cache.get(source);
  const key=source.replace(/\s+/g,' ').trim();
  const output=NIQQUD_PHRASES[key]||source.replace(words,word=>marks.test(word)?word:NIQQUD_WORDS[word]||word);
  if(cache.size>1600)cache.clear();
  cache.set(source,output);
  return output;
}
