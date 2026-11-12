import { CHARACTERS, characterStatus } from '../data/characters.js';
import { drawPlayer, text } from './art.js';
import { drawSelectionBackdrop, drawParchment, drawSelectionButton } from './selectionArt.js';
import { ButtonSet } from './ui.js';
import { artTime } from './visualMotion.js';

export class CharacterGallery {
  constructor(game){this.game=game;this.page=0;this.focus=0;this.buttons=new ButtonSet();this.closed=false;this.t=0;}
  cards(){return CHARACTERS.slice(this.page*8,this.page*8+8);}
  rect(i){return {x:705-(i%4)*215,y:115+Math.floor(i/4)*160,w:195,h:142};}
  update(dt,input,audio){
    this.t+=dt;
    if(input.pressed('back')){this.closed=true;return;}
    if(input.pressed('right'))this.focus=(this.focus+7)%8;
    if(input.pressed('left'))this.focus=(this.focus+1)%8;
    if(input.pressed('down')||input.pressed('up'))this.focus=(this.focus+4)%8;
    this.buttons.set([
      {id:'back',x:710,y:460,w:180,h:46,label:'חזרה',size:19},
      {id:'page',x:60,y:460,w:210,h:46,label:this.page?'דמויות קודמות · C':'עוד דמויות · C',size:18},
    ]);
    const action=this.buttons.update(input);
    if(action==='back'){this.closed=true;return;}
    if(action==='page'||input.pressed('build')){this.page=1-this.page;this.focus=0;return;}
    this.cards().forEach((c,i)=>{
      const r=this.rect(i),hovered=input.over(r.x,r.y,r.w,r.h),status=characterStatus(c,this.game.save);
      if(hovered)input.cursor=status.unlocked?'pointer':'default';
      if((hovered&&input.clicked||i===this.focus&&input.pressed('confirm'))&&status.unlocked){
        this.focus=i;this.game.save.data.character=c.id;this.game.save.save();audio.menuPick();
      }
    });
  }
  draw(ctx){
    drawSelectionBackdrop(ctx,960,540);
    text(ctx,'הדמויות שלי',480,40,{size:30,color:'#fff1c8'});
    text(ctx,'אתגרים פותחים דמויות · אותן יכולות לכולם',480,78,{size:18,color:'#fff1d3'});
    this.cards().forEach((c,i)=>{
      const r=this.rect(i),status=characterStatus(c,this.game.save),selected=this.game.save.data.character===c.id;
      drawParchment(ctx,r.x,r.y,r.w,r.h,selected||i===this.focus);
      ctx.save();ctx.globalAlpha=status.unlocked?1:0.4;
      drawPlayer(ctx,r.x+80,r.y+14,34,66,{state:'idle',animTime:artTime(this.t),character:c});ctx.restore();
      text(ctx,c.name,r.x+r.w/2,r.y+94,{size:17,color:'#47341f',outline:null});
      text(ctx,selected?'✓ נבחרה':status.unlocked?'בחירה':`🔒 ${status.reason}`,r.x+r.w/2,r.y+121,
        {size:15,color:status.unlocked?'#236b61':'#685b4c',outline:null});
    });
    if(!this.game.save.data.character||this.game.save.data.character==='bezalel'){
      const i=this.cards().findIndex(c=>c.id==='oholiav'&&characterStatus(c,this.game.save).unlocked);
      if(i>=0){const r=this.rect(i);text(ctx,'☝',r.x+r.w-20,r.y+35+Math.sin(artTime(this.t)*3)*7,{size:30,color:'#1e6685',outline:null});}
    }
    this.buttons.items.forEach((b,i)=>drawSelectionButton(ctx,b,i===this.buttons.focus));
  }
}
