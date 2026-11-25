// Original scores. A bar contains its bass MIDI pitch, chord voicing and melody events.
// Melody events are [subdivision, MIDI pitch, beats].
export const PLANET_SCORES={
 yuon:{title:'남겨진 숨',bpm:78,beats:4,division:2,lead:'flute',reply:'piano',texture:'piano',pad:'strings',
  bassSlots:[0],pattern:[[0,0],[2,2],[3,1],[5,3],[6,2]],drums:[],
  bars:[
   [38,[50,57,61,66],[[1,66,1],[3,69,1],[5,71,1.4]]],
   [37,[49,57,64,69],[[0,69,1.5],[3,64,.8],[5,66,1.2]]],
   [35,[47,54,57,62],[[0,66,1],[2,69,1],[4,73,1.6]]],
   [43,[55,59,62,66],[[0,71,1.5],[3,69,.7],[5,66,1.3]]],
   [40,[52,55,59,62],[[1,67,1],[3,71,1],[5,74,1.4]]],
   [38,[50,54,59,66],[[0,73,1.5],[4,71,1.4]]],
   [45,[52,55,61,64],[[0,69,1],[2,67,1],[4,64,1.8]]],
   [38,[50,57,62,66],[[0,66,1],[2,64,.8],[4,62,1.8]]]
  ]},
 swaehae:{title:'닻 아래의 물결',bpm:68,beats:2,division:3,lead:'reed',reply:'pluck',texture:'pluck',pad:'strings',
  bassSlots:[0,3],pattern:[[0,0],[2,2],[3,1],[5,3]],drums:[0,3],
  bars:[
   [38,[50,53,57,64],[[0,62,.85],[3,65,.6],[5,67,.3]]],
   [43,[50,55,59,62],[[0,67,1.2],[4,65,.6]]],
   [46,[53,57,62,65],[[1,65,.65],[3,69,.9]]],
   [45,[52,55,57,61],[[0,67,.9],[3,64,.85]]],
   [38,[50,57,60,65],[[0,69,.9],[3,72,.8]]],
   [43,[50,55,59,62],[[0,71,.9],[3,67,.85]]],
   [45,[52,55,57,61],[[0,65,.8],[3,64,.55],[5,61,.3]]],
   [38,[50,53,57,62],[[0,62,1.55]]]
  ]},
 mumyeong:{title:'눈에 남은 이름',bpm:56,beats:3,division:2,lead:'bell',reply:'cello',texture:'bell',pad:'strings',
  bassSlots:[0],pattern:[[1,1],[4,3]],drums:[],
  bars:[
   [38,[50,57,62,65],[[0,74,1.5],[4,69,.95]]],
   [46,[53,58,62,69],[[2,77,1.4]]],
   [41,[53,57,60,64],[[0,76,1.2],[3,72,1.3]]],
   [36,[48,55,62,64],[[1,67,1.7]]],
   [43,[50,55,58,65],[[0,70,1.3],[4,74,.95]]],
   [46,[53,58,62,65],[[1,77,1.25],[4,74,.9]]],
   [45,[52,55,57,61],[[0,73,1.9]]],
   [38,[50,57,62,65],[[0,74,2.5]]]
  ]},
 hwanseong:{title:'대답이 닿는 궤도',bpm:100,beats:4,division:2,lead:'horn',reply:'bell',texture:'pluck',pad:'choir',
  bassSlots:[0,4],pattern:[[0,0],[1,2],[2,1],[3,3],[4,0],[5,2],[6,1],[7,3]],drums:[0,4,7],
  bars:[
   [36,[48,55,60,64],[[0,60,1],[2,67,1],[4,72,1.75]]],
   [43,[50,55,59,67],[[0,71,1],[2,67,.85],[4,74,1.75]]],
   [45,[52,57,60,64],[[0,72,1.4],[3,69,.8],[5,76,1.35]]],
   [41,[53,60,64,69],[[0,76,1],[2,74,.85],[4,72,1.7]]],
   [38,[50,57,60,65],[[0,74,1],[2,77,1],[4,81,1.75]]],
   [41,[53,60,64,69],[[0,79,1],[2,76,.9],[4,77,1.65]]],
   [43,[53,55,59,62],[[0,74,1],[2,71,1],[4,67,1.6]]],
   [36,[48,55,60,64],[[0,72,3.4]]]
  ]}
};
// Harmonics, envelope in seconds, and sustain level for each synthesized instrument.
const TIMBRES={
 piano:{harmonics:[1,.38,.22,.12,.06],attack:.008,decay:.28,sustain:.27,release:.24},
 flute:{harmonics:[1,.13,.041,.017],attack:.10,decay:.25,sustain:.75,release:.19},
 pluck:{harmonics:[1,.56,.23,.16,.085,.047],attack:.01,decay:.19,sustain:.19,release:.18},
 reed:{harmonics:[1,.34,.46,.083,.17,.051],attack:.065,decay:.20,sustain:.62,release:.16},
 strings:{harmonics:[1,.43,.27,.20,.1,.073],attack:.38,decay:.42,sustain:.78,release:.63},
 cello:{harmonics:[1,.49,.28,.2,.105],attack:.14,decay:.35,sustain:.72,release:.46},
 bell:{harmonics:[1,.025,.41,.015,.21,.057],attack:.007,decay:.21,sustain:.25,release:.68},
 horn:{harmonics:[1,.53,.29,.16,.10,.06],attack:.115,decay:.22,sustain:.77,release:.34},
 choir:{harmonics:[1,.28,.12,.21,.17,.045],attack:.44,decay:.37,sustain:.81,release:.74},
 drum:{harmonics:[1,.09,.31,.05,.15],attack:.006,decay:.10,sustain:.13,release:.16}
};
export const MUSIC_KEY='recommand-music-v1';
export function readMusicSettings(read){
 try{const p=JSON.parse(read(MUSIC_KEY)||'{}');return{enabled:p?.enabled===true,volume:typeof p?.volume==='number'&&Number.isFinite(p.volume)?Math.max(0,Math.min(1,p.volume)):.35};}
 catch{return{enabled:false,volume:.35};}
}
export class PlanetMusic{
 constructor({contextFactory,repeat,cancel,delay,onError=()=>{}}){this.factory=contextFactory;this.repeat=repeat;this.cancel=cancel;this.delay=delay;this.onError=onError;this.volume=.35;this.enabled=false;this.hidden=false;this.ducked=false;this.chapter='yuon';this.epoch=0;this.waves=new Map();}
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
  const interval=60/score.bpm/score.division;
  const tick=()=>{if(this.track!==track)return;if(track.next<ctx.currentTime)track.next=ctx.currentTime+.05;while(track.next<ctx.currentTime+.3){this.step(track,track.next);track.next+=interval;track.step++;}};
  tick();this.timer=this.repeat(tick,100);
 }
 note(track,midi,time,length,volume,instrument){
  const ctx=this.context,timbre=TIMBRES[instrument],osc=ctx.createOscillator(),gain=ctx.createGain();
  if(!this.waves.has(instrument)){
   const harmonics=new Float32Array([0,...timbre.harmonics]);
   this.waves.set(instrument,ctx.createPeriodicWave(new Float32Array(harmonics.length),harmonics));
  }
  osc.setPeriodicWave(this.waves.get(instrument));
  osc.frequency.value=440*2**((midi-69)/12);
  const peak=time+Math.min(timbre.attack,length*.4),off=time+length;
  const settle=Math.min(peak+timbre.decay,off);
  gain.gain.setValueAtTime(0,time);
  gain.gain.linearRampToValueAtTime(volume,peak);
  gain.gain.exponentialRampToValueAtTime(volume*timbre.sustain,settle);
  gain.gain.setValueAtTime(volume*timbre.sustain,off);
  gain.gain.exponentialRampToValueAtTime(.0001,off+timbre.release);
  osc.connect(gain);gain.connect(track.bus);track.nodes.add(osc);
  osc.onended=()=>{track.nodes.delete(osc);osc.disconnect();gain.disconnect();};
  osc.start(time);osc.stop(off+timbre.release+.02);
 }
 step(track,time){
  const {score:s,step}=track,beat=60/s.bpm,barSteps=s.beats*s.division;
  const bar=Math.floor(step/barSteps),slot=step%barSteps,index=bar%s.bars.length;
  const [bass,chord,melody]=s.bars[index];
  const full=Math.floor(bar/s.bars.length)%2===1;
  const cadence=index===s.bars.length-1;
  if(slot===0){
   for(const note of chord.slice(0,full?4:2))this.note(track,note,time,beat*(s.beats-.12),full?.022:.016,s.pad);
  }
  if(s.bassSlots.includes(slot)&&!(cadence&&slot>0)){
   this.note(track,slot===0?bass:bass+7,time,beat*(s.bassSlots.length===1?s.beats-.55:.88),slot===0?.049:.033,'cello');
  }
  for(const [at,degree] of s.pattern){
   if(slot===at&&!(cadence&&slot>=barSteps/2)){
    const pitch=chord[degree]+(s.texture==='bell'?12:0);
    this.note(track,pitch,time,beat*(s.texture==='bell'?1.1:.6),slot%s.division===0?.029:.021,s.texture);
   }
  }
  for(const [at,pitch,duration] of melody){
   if(slot!==at)continue;
   this.note(track,pitch,time,beat*duration,full?.069:.057,s.lead);
   if(full&&slot%s.division===0){
    const replyPitch=s.reply==='cello'?chord[1]:pitch-(s.reply==='bell'?0:12);
    this.note(track,replyPitch,time+beat*.09,beat*duration*.82,.024,s.reply);
   }
  }
  if(full&&s.drums.includes(slot)&&!(cadence&&slot>0)){
   this.note(track,slot===0?33:43,time,beat*.28,slot===0?.056:.026,'drum');
  }
 }
}
