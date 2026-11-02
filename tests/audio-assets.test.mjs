import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {PROLOGUE,BRIEFINGS} from '../dist/briefing.js';
test('seven required briefings have matching bundled MP3 files and no external audio request',()=>{
 const manifest=JSON.parse(fs.readFileSync(new URL('../dist/audio/narration.json',import.meta.url),'utf8'));
 const pages=[...PROLOGUE,...Object.values(BRIEFINGS).map(a=>a[0])];assert.equal(Object.keys(manifest).length,7);
 for(const page of pages){
  const clip=manifest[page.tag];assert(clip);assert([page.title+'. '+page.body+' '+page.goal,page.body+' '+page.goal].includes(clip.text));
  const bytes=fs.readFileSync(new URL('../dist/audio/'+clip.file,import.meta.url));assert(bytes.length>20000);assert(clip.duration>10&&clip.duration<40);
  assert.equal(bytes.includes(Buffer.from('Xing')),false); // CBR files need no stale batch seek table.
 }
 const html=fs.readFileSync(new URL('../release/PLAY-RECOMMAND.html',import.meta.url),'utf8');assert.equal((html.match(/data:audio\/mpeg;base64,/g)||[]).length,7);assert(!html.includes('speechSynthesis'));assert(!html.includes('ttsmaker-file.com'));
});
test('batch split metadata keeps each clip on its side of the inserted silences',()=>{
 const m=JSON.parse(fs.readFileSync(new URL('../dist/audio/narration.json',import.meta.url),'utf8'));
 const clips=Object.values(m).filter(c=>c.source);assert.equal(clips.length,6);
 for(let i=0;i<clips.length;i++){assert(Math.abs(clips[i].duration-(clips[i].sourceEnd-clips[i].sourceStart))<.001);if(i)assert(clips[i].sourceStart-clips[i-1].sourceEnd>4);}
});
