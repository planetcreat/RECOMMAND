import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {newLateState,decodeLate,revealTravelerName,acceptTravelerName,travelerName,readTravelerName} from '../dist/late-state.js';
import {NAME_RECORD,NAME_ACCEPTANCE} from '../dist/late-story.js';
function snow(){const s=newLateState('mumyeong');s.arrived=true;s.heard=['keeper','walker','bell','footprints','archive'];return s;}
test('name is discovered only after all required comparisons and accepted after boss without hidden rewards',()=>{
 const s=snow();assert(!revealTravelerName(s));assert(!acceptTravelerName(s));assert.equal(travelerName(s),'이름 없는 여행자');s.compared=[true,true,true];assert(revealTravelerName(s));assert(!acceptTravelerName(s));assert.equal(travelerName(s),'이름 없는 여행자');s.boss=true;assert(acceptTravelerName(s));assert.equal(travelerName(decodeLate(s,'mumyeong')),'이든');assert.equal(s.asked,false);assert.equal(s.chime,false);assert.equal(s.ending,null);
});
test('legacy saves retain existing ending and rewards without granting unseen name scene',()=>{
 const s=snow();s.compared=[true,true,true];s.boss=true;s.ending='restore';delete s.nameAccepted;delete s.nameRevealed;const migrated=decodeLate(s,'mumyeong');assert.equal(migrated.ending,'restore');assert.equal(migrated.nameAccepted,false);assert.equal(migrated.nameRevealed,false);
 for(const flags of[{nameRevealed:true,nameAccepted:true},{nameRevealed:'yes'},{nameAccepted:true}])assert.throws(()=>decodeLate({...newLateState('mumyeong'),...flags},'mumyeong'));
});
test('all chapter name readers respect validated current history and backup fallback',()=>{
 const s=snow();s.compared=[true,true,true];s.boss=true;revealTravelerName(s);acceptTravelerName(s);const data=new Map([['recommand-mumyeong-v1',JSON.stringify(s)]]);assert.equal(readTravelerName(k=>data.get(k)),'이든');data.set('recommand-mumyeong-v1',JSON.stringify(newLateState('mumyeong')));data.set('recommand-mumyeong-v1.backup',JSON.stringify(s));assert.equal(readTravelerName(k=>data.get(k)),'이름 없는 여행자');data.set('recommand-mumyeong-v1','broken');assert.equal(readTravelerName(k=>data.get(k)),'이든');assert.equal(readTravelerName(()=>{throw Error('blocked');}),'이름 없는 여행자');
});
test('actual scene handlers record discovery only after the full dialogue and preserve optional flags',()=>{
 const source=fs.readFileSync(new URL('../dist/late-game.js',import.meta.url),'utf8');const sceneCode=source.slice(source.indexOf('function lateNameReveal('),source.indexOf('function lateSnowEnding('));
 const state=snow();state.compared=[true,true,true];state.boss=true;let current,done=0;const box={isSnow:true,lateState:state,NAME_RECORD,NAME_ACCEPTANCE,revealTravelerName,acceptTravelerName,lateTalk(title,lines,after){current={title,lines,after};},lateSave(){},lateUpdateHUD(){}};vm.createContext(box);vm.runInContext(sceneCode,box);box.lateNameAcceptance(()=>done++);assert.equal(current.lines,NAME_RECORD);assert.equal(state.nameRevealed,false);current.after();assert.equal(state.nameRevealed,true);assert.equal(state.nameAccepted,false);assert.equal(current.lines,NAME_ACCEPTANCE);current.after();assert.equal(state.nameAccepted,true);assert.equal(done,1);assert.equal(state.chime,false);assert.equal(state.asked,false);box.lateNameAcceptance(()=>done++);assert.equal(done,2);
 assert(source.includes('lateNameReveal(lateBoard)'));assert(source.includes('if(!lateState.nameAccepted){lateNameAcceptance(lateSnowEnding);return;}'));
});
