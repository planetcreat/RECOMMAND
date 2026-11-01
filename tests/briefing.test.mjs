import test from 'node:test';import assert from 'node:assert/strict';
import {PROLOGUE,BRIEFINGS,BRIEFING_KEY,readBriefingSeen,pendingBriefing} from '../dist/briefing.js';
import {launcherHarness} from './launcher-harness.mjs';
import fs from 'node:fs';
test('first journey explains context and first objective before loading gameplay',()=>{
 const h=launcherHarness();h.buttons[0].onclick();const e=h.elements;assert(e.briefing.open);assert.equal(e.gameFrame.srcdoc,undefined);assert.equal(e.briefCount.textContent,'1 / 5');
 for(let i=0;i<4;i++)e.briefNext.onclick();assert.match(e.briefNext.textContent,/유온/);assert(e.briefing.open);e.briefNext.onclick();assert.equal(e.briefing.open,false);assert(e.gameFrame.srcdoc.includes('heroBack0'));assert.equal(h.storage.get('recommand-save-v1'),'existing-user-save');
 const seen=JSON.parse(h.storage.get(BRIEFING_KEY));assert(seen.intro&&seen.yuon);assert.equal(seen.swaehae,undefined);
});
test('chapter travel shows its own briefing, and replay leaves gameplay and saves in place',()=>{
 const h=launcherHarness();h.buttons[0].onclick();h.elements.briefSkip.onclick();const first=h.elements.gameFrame.srcdoc;
 h.events.message({source:h.elements.gameFrame.contentWindow,data:{type:'recommand-switch',chapter:'swaehae'}});assert(h.elements.briefing.open);assert.equal(h.elements.gameFrame.srcdoc,first);assert.match(h.elements.briefTitle.textContent,/쇄해/);h.elements.briefSkip.onclick();const sea=h.elements.gameFrame.srcdoc;
 const before=JSON.stringify([...h.storage]);h.elements.journeyHelp.onclick();h.elements.briefNext.onclick();h.elements.briefBack.onclick();h.elements.briefSkip.onclick();assert.equal(h.elements.gameFrame.srcdoc,sea);assert.equal(JSON.stringify([...h.storage]),before);
});
test('blocked storage and unavailable speech never prevent starting or skipping',()=>{
 const h=launcherHarness({failStorage:true});h.buttons[0].onclick();assert.equal(h.elements.briefVoice.disabled,true);h.elements.briefSkip.onclick();assert(h.elements.gameFrame.srcdoc);assert.equal(h.storage.get('recommand-save-v1'),'existing-user-save');
});
test('briefing records are whitelisted, malformed records are harmless and the hero name stays unrevealed',()=>{
 for(const raw of['{bad','null','[]','42'])assert.deepEqual(readBriefingSeen(()=>raw),{});
 assert.deepEqual(readBriefingSeen(()=>'{"intro":true,"yuon":1,"arbitrary":true}'),{intro:true});assert.deepEqual(pendingBriefing('yuon',{intro:true,yuon:true}),[]);
 for(const chapter of Object.keys(BRIEFINGS))assert(BRIEFINGS[chapter].every(p=>p.title&&p.body&&p.goal));assert(!JSON.stringify([PROLOGUE,BRIEFINGS]).includes('이든'));
});

test('public guidance leaves boss intelligence and puzzle recipes to discovery',()=>{
 const guidance=JSON.stringify([PROLOGUE,BRIEFINGS]);
 for(const secret of['오르문','벨로크','네벨','아르케','물길이 순환하면','몸을 열었다','열린 틈','세 번의 파동','가짜 신호'])assert(!guidance.includes(secret),'Spoiler in briefing: '+secret);
 const readme=fs.readFileSync(new URL('../README.md',import.meta.url),'utf8');
 for(const secret of['세 번의 파동','몸이 열리는 때','물길이 순환하면'])assert(!readme.includes(secret),'Walkthrough in README: '+secret);
 for(const [chapter,person]of Object.entries({yuon:'루미',swaehae:'나루',mumyeong:'시온'}))assert(BRIEFINGS[chapter][0].goal.includes(person));
});
