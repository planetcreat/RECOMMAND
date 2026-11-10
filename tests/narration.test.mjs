import test from 'node:test';import assert from 'node:assert/strict';
import {NarrationPlayer} from '../dist/narration.js';
import {launcherHarness} from './launcher-harness.mjs';
test('page change stops old clip, ignores stale callbacks and releases source',async()=>{
 const clips=[],duck=[],status=[];
 const player=new NarrationPlayer({makeAudio(src){const a={src,async play(){},pause(){this.paused=true;},removeAttribute(){this.src=null;},load(){this.released=true;}};clips.push(a);return a;},duck:v=>duck.push(v),status:s=>status.push(s)});
 await player.play('data:audio/mpeg;base64,first');const old=clips[0],stale=old.onplaying;old.onplaying();assert.equal(duck.at(-1),true);
 await player.play('data:audio/mpeg;base64,second');assert(old.paused&&old.released);assert.equal(old.src,null);stale();assert.equal(duck.at(-1),false);
 clips[1].onplaying();assert.equal(duck.at(-1),true);clips[1].onended();assert.equal(duck.at(-1),false);assert.equal(status.at(-1),'ended');player.stop();
});
test('blocked playback restores background music and does not escape as rejection',async()=>{
 const states=[];const player=new NarrationPlayer({makeAudio:()=>({play:()=>Promise.reject(Error('blocked')),pause(){},removeAttribute(){},load(){}}),status:s=>states.push(s)});
 assert.equal(await player.play('test'),false);assert.equal(states.at(-1),'error');player.stop();assert.equal(await player.play(null),false);
});
test('launcher uses embedded narration and stops it on next page without changing user saves',async()=>{
 const clips=[];class Audio{constructor(src){this.src=src;clips.push(this);}async play(){this.onplaying();}pause(){this.paused=true;}removeAttribute(){this.src=null;}load(){}}
 const h=launcherHarness({AudioClass:Audio});h.buttons[0].onclick();assert.equal(h.elements.briefVoice.disabled,false);h.elements.briefVoice.onclick();await Promise.resolve();assert.equal(clips.length,1);assert.match(clips[0].src,/^data:audio\/mpeg;base64,/);h.elements.briefNext.onclick();assert.equal(clips[0].paused,true);assert.equal(h.elements.briefVoice.disabled,false);for(let i=0;i<3;i++)h.elements.briefNext.onclick();assert.equal(h.elements.briefVoice.disabled,true);assert.equal(h.storage.get('recommand-save-v1'),'existing-user-save');
});
