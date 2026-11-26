export const PLANET_TRACKS={
 yuon:'남겨진 숨',
 swaehae:'닻 아래의 물결',
 mumyeong:'눈에 남은 이름',
 hwanseong:'대답이 닿는 궤도'
};

export const MUSIC_KEY='recommand-music-v1';
export function readMusicSettings(read){
 try{const p=JSON.parse(read(MUSIC_KEY)||'{}');return{enabled:p?.enabled===true,volume:typeof p?.volume==='number'&&Number.isFinite(p.volume)?Math.max(0,Math.min(1,p.volume)):.35};}
 catch{return{enabled:false,volume:.35};}
}

export class PlanetMusic{
 constructor({contextFactory,clips,delay,onError=()=>{}}){
  this.factory=contextFactory;this.clips=clips;this.delay=delay;this.onError=onError;
  this.volume=.35;this.enabled=false;this.hidden=false;this.ducked=false;this.sceneLevel=1;this.chapter='yuon';
  this.epoch=0;this.buffers=new Map();
 }

 async enable(value){
  this.enabled=!!value;
  const epoch=++this.epoch;
  if(!value){this.retire();this.level();return true;}
  try{
   if(!this.context){
    this.context=this.factory();
    this.master=this.context.createGain();this.master.gain.value=0;this.master.connect(this.context.destination);
   }
   if(!this.hidden)await this.context.resume();
   if(epoch!==this.epoch||!this.enabled)return true;
   this.level();
   return this.hidden||await this.begin();
  }catch{
   if(epoch===this.epoch)this.fail();
   return false;
  }
 }

 level(){
  if(this.master)this.master.gain.setTargetAtTime(this.enabled&&!this.hidden?this.volume*this.sceneLevel*(this.ducked?.24:1):0,this.context.currentTime,.15);
 }
 setVolume(v){if(Number.isFinite(v))this.volume=Math.max(0,Math.min(1,v));this.level();}
 duck(v){this.ducked=!!v;this.level();}
 setSceneLevel(value){this.sceneLevel=value;this.level();}
 select(chapter){
  if(!Object.hasOwn(PLANET_TRACKS,chapter)||chapter===this.chapter)return;
  this.chapter=chapter;
  if(this.enabled&&!this.hidden&&this.context)void this.begin();
 }
 async visibility(hidden){
  this.hidden=!!hidden;
  this.retire();this.level();
  if(!this.context)return;
  try{
   if(hidden)await this.context.suspend();
   else if(this.enabled){
    await this.context.resume();
    if(!this.hidden&&this.enabled)await this.begin();
   }
  }catch{this.fail();}
 }

 fail(){
  this.enabled=false;this.retire();this.level();this.onError();
 }
 retire(){
  this.pending=null;
  const track=this.track;this.track=null;
  if(!track)return;
  const now=this.context.currentTime;
  track.bus.gain.cancelScheduledValues(now);
  track.bus.gain.setTargetAtTime(0,now,.3);
  this.delay(()=>{
   track.source.stop();track.source.disconnect();track.bus.disconnect();
  },1650);
 }

 buffer(chapter){
  if(!this.buffers.has(chapter)){
   const bytes=Uint8Array.from(atob(this.clips[chapter]),char=>char.charCodeAt(0));
   const decoded=this.context.decodeAudioData(bytes.buffer).catch(error=>{
    this.buffers.delete(chapter);throw error;
   });
   this.buffers.set(chapter,decoded);
  }
  return this.buffers.get(chapter);
 }
 async begin(){
  if(!this.enabled||this.hidden)return true;
  const chapter=this.chapter;
  if(this.track?.chapter===chapter){this.pending=null;return true;}
  const request={chapter};
  this.pending=request;
  try{
   const buffer=await this.buffer(chapter);
   if(this.pending!==request||!this.enabled||this.hidden)return true;
   const ctx=this.context,source=ctx.createBufferSource(),bus=ctx.createGain();
   source.buffer=buffer;source.loop=true;bus.gain.value=0;
   source.connect(bus);bus.connect(this.master);
   source.start();
   this.retire();
   this.track={chapter,source,bus};
   bus.gain.setTargetAtTime(1,ctx.currentTime,.6);
   return true;
  }catch{
   if(this.pending!==request)return true;
   this.fail();
   return false;
  }
 }
}
