import test from 'node:test';import assert from 'node:assert/strict';
import {PlanetMusic,PLANET_SCORES,readMusicSettings} from '../dist/music.js';
function harness(){
 const ramps=[],notes=[],timers=new Map(),delays=[];let id=0;
 const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},cancelScheduledValues(){},setTargetAtTime(v,t,c){ramps.push({v,t,c});}});
 const ctx={currentTime:0,destination:{},state:'suspended',async resume(){this.state='running';},async suspend(){this.state='suspended';},createGain(){return{gain:param(),connect(){},disconnect(){}};},createOscillator(){const n={frequency:{value:0},connect(){},disconnect(){},start(t){notes.push({t,n});},stop(){}};return n;}};
 let created=0;const music=new PlanetMusic({contextFactory(){created++;return ctx;},repeat(f){timers.set(++id,f);return id;},cancel(id){timers.delete(id);},delay:f=>delays.push(f)});
 return{music,ctx,ramps,notes,timers,delays,get created(){return created;}};
}
test('four scores differ and all harmony/melody data is playable',()=>{
 assert.equal(new Set(Object.values(PLANET_SCORES).map(s=>JSON.stringify(s))).size,4);
 for(const s of Object.values(PLANET_SCORES)){assert(s.bpm>=50&&s.bpm<=100);assert.equal(s.chords.length,4);assert.equal(s.melody.length,16);assert(s.melody.every(n=>n===null||Number.isFinite(n)));}
});
test('audio starts only after enable, crossfades and bounds scheduling after stalled frame',async()=>{
 const h=harness();assert.equal(h.created,0);h.music.select('mumyeong');assert.equal(h.created,0);
 await h.music.enable(true);assert.equal(h.timers.size,1);assert(h.notes.length>0);const first=h.music.track;
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
