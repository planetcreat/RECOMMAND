import test from 'node:test';import assert from 'node:assert/strict';
import {PlanetMusic,PLANET_SCORES,readMusicSettings} from '../dist/music.js';
function harness(){
 const ramps=[],notes=[],timers=new Map(),delays=[];let id=0;
 const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},cancelScheduledValues(){},setTargetAtTime(v,t,c){ramps.push({v,t,c});}});
 const ctx={currentTime:0,destination:{},state:'suspended',async resume(){this.state='running';},async suspend(){this.state='suspended';},createGain(){return{gain:param(),connect(){},disconnect(){}};},createPeriodicWave(real,imag){return {real,imag};},createOscillator(){const n={frequency:{value:0},setPeriodicWave(wave){this.wave=wave;},connect(){},disconnect(){},start(t){notes.push({t,n});},stop(){}};return n;}};
 let created=0;const music=new PlanetMusic({contextFactory(){created++;return ctx;},repeat(f){timers.set(++id,f);return id;},cancel(id){timers.delete(id);},delay:f=>delays.push(f)});
 return{music,ctx,ramps,notes,timers,delays,get created(){return created;}};
}
test('four scores use different tempos and leads, and fit their meter',()=>{
 const scores=Object.values(PLANET_SCORES);
 assert.equal(new Set(scores.map(score=>score.bpm)).size,4);
 assert.equal(new Set(scores.map(score=>score.lead)).size,4);
 assert.equal(new Set(scores.map(score=>score.beats+'/'+score.division)).size,3);
 for(const score of scores){
  assert.equal(score.bars.length,8);
  for(const [bass,chord,melody] of score.bars){
   assert(Number.isFinite(bass)&&chord.length===4&&chord.every(Number.isFinite));
   for(const [slot,pitch,duration] of melody){
    assert(Number.isInteger(slot)&&slot>=0&&Number.isFinite(pitch));
    assert(duration>0&&slot/score.division+duration<=score.beats);
   }
  }
 }
});
test('audio starts only after enable, crossfades and bounds scheduling after stalled frame',async()=>{
 const h=harness();assert.equal(h.created,0);h.music.select('mumyeong');assert.equal(h.created,0);
 await h.music.enable(true);assert.equal(h.timers.size,1);assert(h.notes.length>0);const first=h.music.track;
 assert(h.notes.every(({n})=>n.wave?.imag[1]===1));
 h.music.select('swaehae');assert.notEqual(h.music.track,first);assert.equal(h.timers.size,1);assert.equal(h.delays.length,1);assert(h.ramps.some(r=>r.v===0&&r.c===.3));
 const before=h.notes.length;h.ctx.currentTime=3600;for(const tick of h.timers.values())tick();assert(h.notes.length-before<20);assert(h.music.track.next>=3600);assert(h.notes.slice(before).every(n=>n.t>=3600));
 await h.music.enable(false);assert.equal(h.timers.size,0);assert.equal(h.music.track,null);
});
test('hide stops scheduling, resume restarts once, narration ducks and volume clamps',async()=>{
 const h=harness();await h.music.enable(true);h.music.setVolume(.5);h.music.duck(true);assert.equal(h.ramps.at(-1).v,.12);
 await h.music.visibility(true);assert.equal(h.ctx.state,'suspended');assert.equal(h.timers.size,0);
 await h.music.visibility(false);assert.equal(h.ctx.state,'running');assert.equal(h.timers.size,1);h.music.duck(false);h.music.setVolume(9);assert.equal(h.music.volume,1);h.music.setVolume(NaN);assert.equal(h.music.volume,1);
});
test('turning off while resume is pending never starts music; missing audio fails safely',async()=>{
 const h=harness();let resolve;h.ctx.resume=()=>new Promise(r=>resolve=r);const enabling=h.music.enable(true);await h.music.enable(false);resolve();await enabling;assert.equal(h.timers.size,0);
 let errors=0;const m=new PlanetMusic({contextFactory(){throw Error('unsupported');},onError(){errors++;}});assert.equal(await m.enable(true),false);assert.equal(errors,1);assert.equal(m.enabled,false);
});
test('settings survive blocked or malformed storage without touching game saves',()=>{
 assert.deepEqual(readMusicSettings(()=>{throw Error('blocked');}),{enabled:false,volume:.35});assert.deepEqual(readMusicSettings(()=>'null'),{enabled:false,volume:.35});assert.deepEqual(readMusicSettings(()=>'invalid'),{enabled:false,volume:.35});assert.deepEqual(readMusicSettings(()=>'{"enabled":true,"volume":-1}'),{enabled:true,volume:0});
});

test('sixteen-bar arrangements develop, loop cleanly and schedule different instrumentation',()=>{
 const music=harness().music;
 const signatures=new Set();
 for(const score of Object.values(PLANET_SCORES)){
  const half=score.beats*score.division*score.bars.length;
  const arrangement=[];
  for(let step=0;step<half*2+1;step++){
   const time=step*60/score.bpm/score.division,notes=[];
   music.note=(_,pitch,start,length,volume,instrument)=>{
    assert(Number.isFinite(pitch)&&Number.isFinite(start)&&start>=time);
    assert(Number.isFinite(length)&&length>0&&volume>0&&volume<.1);
    notes.push([pitch,length,volume,instrument]);
   };
   music.step({score,step},time);
   assert(notes.length<=10);
   arrangement.push(notes);
  }
  const first=arrangement.slice(0,half).flat(),second=arrangement.slice(half,half*2).flat();
  assert(second.length>first.length);
  assert.deepEqual(arrangement[half*2],arrangement[0]);
  const instruments=new Set(second.map(note=>note[3]));
  assert(instruments.has(score.lead)&&instruments.has(score.pad)&&instruments.has(score.reply));
  signatures.add([...instruments].sort().join(','));
 }
 assert.equal(signatures.size,4);
});
