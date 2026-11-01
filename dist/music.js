// Original scores for the single-file edition. No network, samples or game-save access.
export const PLANET_SCORES={
 yuon:{title:'남겨진 숨',bpm:72,root:48,chords:[[0,4,7,11],[9,12,16,19],[5,9,12,16],[7,11,14,17]],melody:[12,null,16,19,null,16,14,null,12,16,null,19,23,null,19,16],tone:'triangle',air:.025},
 swaehae:{title:'닻 아래의 물결',bpm:66,root:45,chords:[[0,3,7,10],[5,8,12,15],[10,14,17,21],[7,10,14,17]],melody:[19,null,null,15,14,null,10,null,12,null,15,null,19,17,null,14],tone:'sine',air:.05},
 mumyeong:{title:'눈에 남은 이름',bpm:56,root:50,chords:[[0,3,7,14],[8,12,15,19],[5,8,12,19],[10,14,17,21]],melody:[24,null,null,null,19,null,22,null,15,null,null,14,12,null,19,null],tone:'sine',air:.012},
 hwanseong:{title:'대답이 닿는 궤도',bpm:80,root:48,chords:[[0,7,12,16],[5,12,16,19],[9,12,16,23],[7,14,17,24]],melody:[12,19,null,24,23,null,19,null,16,null,19,24,null,23,19,null],tone:'triangle',air:.018}
};
export const MUSIC_KEY='recommand-music-v1';
export function readMusicSettings(read){
 try{const p=JSON.parse(read(MUSIC_KEY)||'{}');return{enabled:p?.enabled===true,volume:typeof p?.volume==='number'&&Number.isFinite(p.volume)?Math.max(0,Math.min(1,p.volume)):.35};}
 catch{return{enabled:false,volume:.35};}
}
export class PlanetMusic{
 constructor({contextFactory,repeat,cancel,delay,onError=()=>{}}){this.factory=contextFactory;this.repeat=repeat;this.cancel=cancel;this.delay=delay;this.onError=onError;this.volume=.35;this.enabled=false;this.hidden=false;this.ducked=false;this.chapter='yuon';this.epoch=0;}
 async enable(value){
  this.enabled=!!value;const epoch=++this.epoch;
  if(!value){this.retire();return true;}
  try{
   if(!this.context){this.context=this.factory();this.master=this.context.createGain();this.master.gain.value=0;this.master.connect(this.context.destination);}
   if(!this.hidden)await this.context.resume();
   if(epoch!==this.epoch||!this.enabled)return true;
   this.level();if(!this.hidden)this.begin();return true;
  }catch{if(epoch===this.epoch){this.enabled=false;this.retire();this.onError();}return false;}
 }
 level(){if(this.master)this.master.gain.setTargetAtTime(this.enabled&&!this.hidden?this.volume*(this.ducked?.24:1):0,this.context.currentTime,.15);}
 setVolume(v){if(Number.isFinite(v))this.volume=Math.max(0,Math.min(1,v));this.level();}
 duck(v){this.ducked=!!v;this.level();}
 select(chapter){if(!Object.hasOwn(PLANET_SCORES,chapter)||chapter===this.chapter)return;this.chapter=chapter;this.retire();if(this.enabled&&!this.hidden&&this.context)this.begin();}
 async visibility(hidden){
  this.hidden=!!hidden;this.retire();this.level();
  if(!this.context)return;
  try{if(hidden)await this.context.suspend();else if(this.enabled){await this.context.resume();if(!this.hidden&&this.enabled){this.level();this.begin();}}}catch{this.onError();}
 }
 retire(){
  if(this.timer!==undefined){this.cancel(this.timer);this.timer=undefined;}
  const track=this.track;this.track=null;if(!track)return;
  const now=this.context.currentTime;track.bus.gain.cancelScheduledValues(now);track.bus.gain.setTargetAtTime(0,now,.3);
  this.delay(()=>{for(const node of track.nodes){try{node.stop();node.disconnect();}catch{}}track.bus.disconnect();},2200);
 }
 begin(){
  if(this.track||!this.enabled||this.hidden)return;
  const ctx=this.context,score=PLANET_SCORES[this.chapter],bus=ctx.createGain();bus.gain.value=0;bus.connect(this.master);bus.gain.setTargetAtTime(1,ctx.currentTime,.65);
  const track={bus,nodes:new Set(),step:0,next:ctx.currentTime+.06,score};this.track=track;
  const tick=()=>{if(this.track!==track)return;if(track.next<ctx.currentTime)track.next=ctx.currentTime+.05;while(track.next<ctx.currentTime+.3){this.step(track,track.next);track.next+=30/score.bpm;track.step++;}};
  tick();this.timer=this.repeat(tick,100);
 }
 note(track,midi,time,length,volume,type='sine',attack=.025){
  const ctx=this.context,osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=type;osc.frequency.value=440*2**((midi-69)/12);gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(volume,time+attack);gain.gain.exponentialRampToValueAtTime(.0001,time+length);osc.connect(gain);gain.connect(track.bus);track.nodes.add(osc);osc.onended=()=>{track.nodes.delete(osc);osc.disconnect();gain.disconnect();};osc.start(time);osc.stop(time+length+.03);
 }
 step(track,time){
  const s=track.score,n=track.step,beat=60/s.bpm,chord=s.chords[Math.floor(n/8)%s.chords.length];
  // Four-bar harmony, soft bass, an eight-bar melody and quiet upper harmonics.
  if(n%8===0){for(const v of chord)this.note(track,s.root+v,time,beat*4.5,.027,'sine',.45);this.note(track,s.root-12+chord[0],time,beat*3,.045,'sine',.12);}
  const melody=s.melody[n%s.melody.length];
  if(melody!==null){const variation=Math.floor(n/32)%2===1?-12:0;this.note(track,s.root+melody+variation,time,beat*1.8,.055,s.tone);this.note(track,s.root+melody+12+variation,time,beat*.9,s.air,'sine');}
  if(n%4===2)this.note(track,s.root+chord[(Math.floor(n/2))%chord.length]+12,time,beat*1.6,.025,'sine');
 }
}
