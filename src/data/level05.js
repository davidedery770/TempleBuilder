import { TILE } from '../game/tilemap.js';

const COLS=360,ROWS=20;
const TERRAIN=[[0,38,15],[39,58,14],[59,88,13],[89,106,15],[110,139,14],
  [140,168,12],[169,192,14],[196,226,15],[227,248,14],[249,278,12],
  [279,302,14],[303,325,15],[326,359,14]];
const surface=c=>TERRAIN.find(([a,b])=>c>=a&&c<=b)[2];
const pos=(c,h=0)=>({x:c*TILE,y:surface(c)*TILE-h});
export function buildLevel05(){
  const action=Array.from({length:ROWS},()=>Array(COLS).fill('.'));
  const back=Array.from({length:ROWS},()=>Array(COLS).fill('.'));
  const front=Array.from({length:ROWS},()=>Array(COLS).fill('.'));
  for(const [a,b,r] of TERRAIN)for(let c=a;c<=b;c++){
    for(let y=r;y<ROWS;y++)action[y][c]='#';
    if(c%5===0)front[r-1][c]='g';
  }
  // Low rescue ledges make missed ravine jumps recoverable rather than fatal.
  for(const [a,b] of [[107,109],[193,195]])for(let c=a;c<=b;c++)action[17][c]='=';
  const trees=[74,153,266].map((c,i)=>({id:`olive_tree_${i+1}`,...pos(c),w:170,h:170}));
  for(const tree of trees){
    const c=tree.x/TILE,r=surface(c);
    for(let x=c-4;x<=c+7;x++)action[r-2][x]='=';
    for(let x=c;x<=c+3;x++)action[r-4][x]='=';
  }
  const olives=trees.flatMap(tree=>[-6,-2,2,6].map((offset,i)=>{
    const col=tree.x/TILE+offset;
    return {type:'olive',...pos(col,26+[0,64,128,64][i]),x:col*TILE+6,treeId:tree.id};
  }));
  const gateTiles=[];
  for(let row=10;row<=14;row++)for(const col of [205,206]){
    action[row][col]='H';gateTiles.push({col,row});
  }
  const human=(id,name,col,extra={})=>({id,name,...pos(col,56),w:30,h:56,robe:'#efe8d2',sash:'#79955a',...extra});
  return {
    id:5,cols:COLS,rows:ROWS,back:back.map(r=>r.join('')),action:action.map(r=>r.join('')),front:front.map(r=>r.join('')),
    spawn:pos(2,46),hideMaterials:true,orchard:{required:12,trees,gateTiles,requiresWater:true},maxSparks:3,
    npcs:[
      human('olive_intro','מוסק הזיתים',6,{cardId:'shiloh',lines:['ליד עץ לוחצים על אור או Enter למסיק. קופצים לענפים ואוספים את הזיתים!']}),
      human('hannah','חַנָּה',293,{robe:'#bca1ca',sash:'#796291',beard:false,veil:true,cardId:'hannah',lines:['כאן בשילה התפללתי אל ה׳. הוא שומע את תפילת הלב.']}),
    ],
    stations:[
      human('garden','שומר הגינה',200,{kind:'waterChannels',cardId:'shiloh_garden',params:{speaker:'מדריך הסדנה'},robe:'#b7c69c'}),
      human('olive_matching','מוסק הזיתים',120,{kind:'matching',cardId:'olive_oil',params:{title:'מה מכינים?',speaker:'מוסק הזיתים',pairs:[
        {id:'olive',label:'זית',icon:'olive'},{id:'oil',label:'שמן',icon:'oil'},{id:'menorah',label:'מנורה',icon:'menorah'},
      ]}}),
      human('shiloh_memory','מדריך כלי המשכן',46,{kind:'memory',cardId:'olive_oil',
        robe:'#a5cbd4',params:{speaker:'מדריך הסדנה'}}),
      human('shiloh_maze','מדריך המסיק',239,{kind:'planningMaze',cardId:'olive_oil',
        robe:'#a6c3b4',params:{speaker:'מדריך הסדנה'}}),
      human('hannah_heart','חַנָּה — תפילת הלב',305,{kind:'heart',
        robe:'#bca1ca',sash:'#796291',beard:false,veil:true,params:{speaker:'חַנָּה'}}),
    ],
    checkpoints:[35,91,142,186,223,283,330].map(c=>({...pos(c,34),w:34,h:34})),
    enemies:[[99,94,104],[175,170,182],[235,229,240],[313,306,320]].map(([c,a,b])=>({
      type:'fieldGuard',...pos(c,44),patrolLeft:a*TILE,patrolRight:(b+1)*TILE,
    })),
    pickups:[...olives,...[54,128,189,224,289,335].map(c=>({type:'health',...pos(c,26)})),
      ...trees.map(tree=>({type:'spark',x:tree.x+8,y:tree.y-190}))],
    challenge:{id:'shiloh_press',kind:'olivePress',...pos(344,100),w:64,h:100,params:{speaker:'מדריך הסדנה'}},
    exit:{...pos(355,96),w:56,h:96},
  };
}
