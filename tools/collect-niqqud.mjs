import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { CODEX } from '../src/data/codex.js';
import { LEVELS, CHAPTERS } from '../src/data/levels.js';
import { TRIVIA } from '../src/data/trivia.js';
import { BUILD_PARTS } from '../src/data/level02.js';
import { buildLevel01 } from '../src/data/level01.js';
import { buildLevel03 } from '../src/data/level03.js';
import { buildLevel04 } from '../src/data/level04.js';
import { buildLevel05 } from '../src/data/level05.js';
import { buildLevel06 } from '../src/data/level06.js';
import { MATERIALS, MATERIAL_GROUPS } from '../src/data/materials.js';
const root=new URL('../',import.meta.url),texts=new Set();
const add=s=>{if(typeof s==='string'&&/[\u05d0-\u05ea]/.test(s))texts.add(s.replace(/\s+/g,' ').trim());};
function values(value){
  if(typeof value==='string')add(value);
  else if(value&&typeof value==='object')for(const item of Object.values(value))values(item);
}
function literals(source){
  for(let i=0;i<source.length;){
    if(source.startsWith('//',i)){i=source.indexOf('\n',i);if(i<0)break;continue;}
    if(source.startsWith('/*',i)){const end=source.indexOf('*/',i+2);i=end<0?source.length:end+2;continue;}
    const quote=source[i++];
    if(!['"',"'",'`'].includes(quote))continue;
    let raw='';
    while(i<source.length){
      const ch=source[i++];if(ch===quote)break;
      if(ch==='\\'&&i<source.length){raw+=ch+source[i++];}else raw+=ch;
    }
    const decoded=raw.replace(/\\u([0-9a-f]{4})/gi,(_,n)=>String.fromCharCode(parseInt(n,16)))
      .replace(/\\n|\\r|\\t/g,' ').replace(/\\(['"\\])/g,'$1');
    for(const part of decoded.split(/\$\{[^}]*\}/g))add(part);
  }
}
async function walk(folder){
  for(const entry of await readdir(folder,{withFileTypes:true})){
    if(['vendor','niqqud.generated.js','voiceManifest.js'].includes(entry.name))continue;
    const url=new URL(entry.name+(entry.isDirectory()?'/':''),folder);
    if(entry.isDirectory())await walk(url);
    else if(entry.name.endsWith('.js'))literals(await readFile(url,'utf8'));
  }
}
await walk(new URL('src/',root));
for(const value of [CODEX,LEVELS,CHAPTERS,TRIVIA,BUILD_PARTS,MATERIALS,MATERIAL_GROUPS,
  ...[buildLevel01,buildLevel03,buildLevel04,buildLevel05,buildLevel06].map(b=>b())])values(value);
await mkdir(new URL('tmp/',root),{recursive:true});
await writeFile(new URL('tmp/niqqud-sources.json',root),JSON.stringify([...texts],null,2)+'\n');
console.log(`Collected ${texts.size} authored Hebrew strings; only this text is sent during preparation, never player data.`);
