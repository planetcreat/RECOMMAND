import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {setImmediate as settle} from 'node:timers/promises';
import {PlanetMusic,PLANET_TRACKS,readMusicSettings} from '../dist/music.js';

function harness(){
 const ramps=[],sources=[],delays=[],decoded=[];
 const holds=new Map(),failures=[];
 const param=()=>({value:0,cancelScheduledValues(){},setTargetAtTime(v,t,c){ramps.push({v,t,c});}});
 const ctx={
  currentTime:0,destination:{},state:'suspended',
  async resume(){this.state='running';},
  async suspend(){this.state='suspended';},
  async decodeAudioData(bytes){
   const chapter=new TextDecoder().decode(bytes);
   decoded.push(chapter);
   if(holds.has(chapter))await holds.get(chapter);
   return {chapter};
  },
  createGain(){return{gain:param(),connect(){},disconnect(){}};},
  createBufferSource(){
   const source={connect(){},disconnect(){},start(){this.started=true;},stop(){this.stopped=true;}};
   sources.push(source);
   return source;
  }
 };
 const clips=Object.fromEntries(Object.keys(PLANET_TRACKS).map(chapter=>[chapter,btoa(chapter)]));
 let created=0;
 const music=new PlanetMusic({clips,contextFactory(){created++;return ctx;},delay:f=>delays.push(f),onError:()=>failures.push('error')});
 return{music,ctx,ramps,sources,delays,decoded,holds,failures,get created(){return created;}};
}

test('four distinct Opus recordings are embedded byte-for-byte in the offline launcher',()=>{
 const launcher=fs.readFileSync(new URL('../release/PLAY-RECOMMAND.html',import.meta.url),'utf8');
 const embedded=JSON.parse(launcher.match(/,musicClips=(\{[^\r\n]+\});/)[1]);
 assert.deepEqual(Object.keys(embedded),Object.keys(PLANET_TRACKS));
 const tracks=Object.keys(embedded).map(chapter=>{
  const file=fs.readFileSync(new URL('../dist/audio/music/'+chapter+'.ogg',import.meta.url));
  assert.equal(file.toString('ascii',0,4),'OggS');
  assert(file.includes('OpusHead'));
  assert(Buffer.from(embedded[chapter],'base64').equals(file));
  return file.length;
 });
 assert.equal(new Set(tracks).size,4);
});

test('music waits for enable, loops decoded recordings, crossfades and caches revisited chapters',async()=>{
 const h=harness();h.music.select('mumyeong');assert.equal(h.created,0);
 assert.equal(await h.music.enable(true),true);
 const first=h.music.track;
 assert.equal(first.source.buffer.chapter,'mumyeong');
 assert(first.source.loop&&first.source.started);
 h.music.select('swaehae');await settle();
 assert.equal(h.music.track.source.buffer.chapter,'swaehae');
 assert(h.ramps.some(r=>r.v===0&&r.c===.3));
 assert.equal(h.delays.length,1);h.delays.shift()();assert(first.source.stopped);
 h.music.select('mumyeong');await settle();
 assert.deepEqual(h.decoded,['mumyeong','swaehae']);
 await h.music.enable(false);assert.equal(h.music.track,null);
});

test('hiding stops playback, restoring resumes, narration ducks and volume clamps',async()=>{
 const h=harness();await h.music.enable(true);h.music.setVolume(.5);h.music.duck(true);assert.equal(h.ramps.at(-1).v,.12);
 await h.music.visibility(true);
 assert.equal(h.ctx.state,'suspended');assert.equal(h.music.track,null);
 await h.music.visibility(false);
 assert.equal(h.ctx.state,'running');assert(h.music.track.source.started);
 h.music.duck(false);h.music.setVolume(9);assert.equal(h.music.volume,1);
 h.music.setVolume(NaN);assert.equal(h.music.volume,1);
});

test('late-decoding music cannot start after a fast switch or after turning music off',async()=>{
 const h=harness();
 let first,second;
 h.holds.set('swaehae',new Promise(resolve=>{first=resolve;}));
 h.holds.set('mumyeong',new Promise(resolve=>{second=resolve;}));
 await h.music.enable(true);
 h.music.select('swaehae');h.music.select('hwanseong');await settle();
 first();await settle();assert.equal(h.music.track.chapter,'hwanseong');
 h.music.select('mumyeong');await h.music.enable(false);
 second();await settle();assert.equal(h.music.track,null);
 assert.deepEqual(h.sources.map(source=>source.buffer.chapter),['yuon','hwanseong']);
});

test('turning off during resume prevents playback and unavailable audio fails safely',async()=>{
 const h=harness();let resolve;h.ctx.resume=()=>new Promise(r=>{resolve=r;});
 const enabling=h.music.enable(true);await h.music.enable(false);resolve();await enabling;
 assert.equal(h.sources.length,0);
 const bad=harness();bad.ctx.decodeAudioData=async()=>{throw Error('decode failed');};
 assert.equal(await bad.music.enable(true),false);assert.equal(bad.failures.length,1);assert.equal(bad.music.enabled,false);
});

test('settings survive blocked or malformed storage without touching game saves',()=>{
 assert.deepEqual(readMusicSettings(()=>{throw Error('blocked');}),{enabled:false,volume:.35});
 assert.deepEqual(readMusicSettings(()=>'null'),{enabled:false,volume:.35});
 assert.deepEqual(readMusicSettings(()=>'invalid'),{enabled:false,volume:.35});
 assert.deepEqual(readMusicSettings(()=>'{"enabled":true,"volume":-1}'),{enabled:true,volume:0});
});
