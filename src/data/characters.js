// Cosmetic choices only: every character uses exactly the same player physics.
export const CHARACTERS = [
  {id:'bezalel',name:'בְּצַלְאֵל בֶּן אוּרִי',era:1,need:0,robe:'#e9d9ab',sash:'#1d5a8a',headColor:'#c3a87a',role:'artisan',prop:'hammer',beard:'#714629'},
  {id:'oholiav',name:'אָהֳלִיאָב בֶּן אֲחִיסָמָךְ',era:1,need:1,robe:'#d2b4d1',sash:'#7d4a8d',headColor:'#805797',role:'weaver',prop:'spool',beard:'#372a23'},
  {id:'moshe',name:'מֹשֶׁה רַבֵּנוּ',era:1,need:3,robe:'#eee8d7',sash:'#b69a4a',headwear:'hood',headColor:'#e8dfc7',role:'prophet',prop:'tablets',beard:'#fff8eb',longBeard:true},
  {id:'aharon',name:'אַהֲרֹן הַכֹּהֵן',era:1,need:5,robe:'#fff7dc',sash:'#ceab4e',headwear:'turban',role:'highPriest',prop:'censer',beard:'#e7ded0'},
  {id:'yehoshua',name:'יְהוֹשֻׁעַ בִּן נוּן',era:3,need:6,robe:'#c8d9be',sash:'#4d7553',headwear:'band',role:'leader',prop:'banner',beard:'#4f3023'},
  {id:'elazar',name:'אֶלְעָזָר הַכֹּהֵן',era:4,need:7,robe:'#fff6df',sash:'#b14d55',headwear:'turban',role:'highPriest',prop:'priestScroll',beard:'#372923'},
  {id:'eli',name:'עֵלִי הַכֹּהֵן',era:5,need:9,robe:'#e8e1c9',sash:'#9d7a3d',headwear:'turban',role:'highPriest',prop:'lamp',beard:'#f9f5ed',longBeard:true},
  {id:'shmuel',name:'שְׁמוּאֵל הַנָּבִיא',era:5,need:10,robe:'#87afc8',sash:'#345e83',headColor:'#56768c',role:'youngProphet',prop:'scroll'},
  {id:'hannah',name:'חַנָּה',era:5,need:8,robe:'#b28ac5',sash:'#695183',headColor:'#607ca5',role:'woman',prop:'prayer',veil:true},
  {id:'ahimelech',name:'אֲחִימֶלֶךְ',era:7,need:11,robe:'#efe6cf',sash:'#ae7953',headwear:'turban',role:'priest',prop:'bread',beard:'#64513c'},
  {id:'david',name:'דָּוִד הַמֶּלֶךְ',era:7,need:12,robe:'#a34738',sash:'#caa04b',headwear:'crown',role:'warriorKing',prop:'sword',beard:'#723b22'},
  {id:'shlomo',name:'שְׁלֹמֹה הַמֶּלֶךְ',era:8,need:13,robe:'#e9cd87',sash:'#8e527e',headwear:'crownTall',role:'royal',prop:'plan',beard:'#2b2420'},
  {id:'hiram',name:'חִירָם מֶלֶךְ צוֹר',era:9,need:14,robe:'#82509a',sash:'#c7a447',headwear:'crownBand',role:'royal',prop:'cedar',beard:'#2d2220'},
  {id:'yehuda',name:'יְהוּדָה הַמַּכַּבִּי',era:11,need:15,robe:'#b9cab0',sash:'#816c45',headwear:'band',role:'guard',prop:'shield',beard:'#352921'},
  {id:'hillel',name:'הִלֵּל הַזָּקֵן',era:12,need:16,robe:'#e9e0c8',sash:'#638c9e',headwear:'scholar',role:'scholar',prop:'torah',beard:'#fff7e5',longBeard:true},
  {id:'eliyahu',name:'אֵלִיָּהוּ הַנָּבִיא',era:13,need:17,robe:'#b28c61',sash:'#75543e',headwear:'hood',headColor:'#806043',role:'mantle',prop:'staff',beard:'#9d998c',longBeard:true},
];
export function characterStatus(character,save) {
  const d=save.data||save;
  const achievements=d.achievements&&typeof d.achievements==='object'&&!Array.isArray(d.achievements)?d.achievements:{};
  const count=Object.values(achievements).filter(a=>a?.success===true).length;
  const eraReady=(d.unlocked||1)>=character.era;
  return {unlocked:eraReady&&count>=character.need,count,
    reason:!eraReady?`בשלב ${character.era}`:`עוד ${Math.max(0,character.need-count)} אתגרים`};
}
export function selectedCharacter(save) {
  const c=CHARACTERS.find(c=>c.id===save.data.character);
  return c&&characterStatus(c,save).unlocked?c:CHARACTERS[0];
}
