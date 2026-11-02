import test from 'node:test';import assert from 'node:assert/strict';
import {launcherHarness} from './launcher-harness.mjs';import {installBackupBridge} from '../dist/backup-bridge.js';
import {TIDE_INITIAL} from '../dist/tide.js';import {JOURNEY_KEYS,createJourneyBackup} from '../dist/journey-backup.js';
const archive=()=>JSON.stringify(createJourneyBackup({getItem:k=>k===JOURNEY_KEYS.swaehae?JSON.stringify(TIDE_INITIAL):null}));
test('preview does not write saves; explicit restore preserves absent planets and is undoable',async()=>{
 const h=launcherHarness();h.elements.journeyBackupOpen.onclick();const file={size:archive().length,text:async()=>archive()};h.elements.backupFile.files=[file];await h.elements.backupFile.onchange();assert.equal(h.storage.size,1);assert.equal(h.elements.backupApply.disabled,false);assert.match(h.elements.backupPreview.textContent,/쇄해 · 기록 있음/);assert(!h.elements.backupPreview.textContent.includes('boss'));
 h.elements.backupApply.onclick();assert.equal(h.storage.get(JOURNEY_KEYS.yuon),'existing-user-save');assert(h.storage.has(JOURNEY_KEYS.swaehae));assert.equal(h.elements.journeyBackup.open,false);
 h.elements.journeyBackupOpen.onclick();h.elements.backupUndo.onclick();assert.equal(h.elements.backupUndoConfirm.hidden,false);assert(h.storage.has(JOURNEY_KEYS.swaehae));h.elements.backupUndoApply.onclick();assert.equal(h.storage.has(JOURNEY_KEYS.swaehae),false);assert.equal(h.storage.get(JOURNEY_KEYS.yuon),'existing-user-save');
});
test('only matching child checkpoint unlocks backup controls; closing releases child',()=>{
 const h=launcherHarness({seenAll:true});h.buttons[0].onclick();h.events.message({source:h.elements.gameFrame.contentWindow,data:{type:'recommand-child-ready',chapter:'yuon'}});h.elements.journeyBackupOpen.onclick();const request=h.messages.at(-1).request;assert.equal(h.elements.backupExport.disabled,true);
 const ack={type:'recommand-backup-ready',chapter:'yuon',request,ok:true};h.events.message({source:{},data:ack});assert.equal(h.elements.backupExport.disabled,true);h.events.message({source:h.elements.gameFrame.contentWindow,data:{...ack,request:request-1}});assert.equal(h.elements.backupExport.disabled,true);h.events.message({source:h.elements.gameFrame.contentWindow,data:ack});assert.equal(h.elements.backupExport.disabled,false);h.elements.backupClose.onclick();assert.equal(h.messages.at(-1).type,'recommand-backup-unlock');
});
test('closing modal during file read ignores delayed result; blocked storage still permits gameplay',async()=>{
 const h=launcherHarness();h.elements.journeyBackupOpen.onclick();let resolve;h.elements.backupFile.files=[{size:30,text:()=>new Promise(r=>resolve=r)}];const reading=h.elements.backupFile.onchange();h.elements.backupClose.onclick();resolve(archive());await reading;assert.equal(h.elements.backupApply.disabled,true);assert.equal(h.storage.size,1);
 const blocked=launcherHarness({failStorage:true});assert.equal(blocked.elements.journeyBackupOpen.disabled,true);blocked.buttons[0].onclick();assert.equal(blocked.elements.briefing.open,true);
});
test('child checkpoint holds input once and restores prior pause state, rejecting foreign messages',()=>{
 let listener,paused=false,pauses=0,flushes=0;const messages=[],parent={postMessage:d=>messages.push(d)},window={addEventListener:(k,f)=>listener=f};
 installBackupBridge({window,parent,chapter:'yuon',flush:()=>{flushes++;return true;},pause:()=>{pauses++;const p=paused;paused=true;return p;},resume:p=>paused=p});
 listener({source:{},data:{type:'recommand-backup-lock'}});assert.equal(pauses,0);for(const request of[1,2])listener({source:parent,data:{type:'recommand-backup-lock',request}});assert.equal(pauses,1);assert.equal(flushes,2);assert.equal(messages[1].request,2);assert.equal(paused,true);listener({source:parent,data:{type:'recommand-backup-unlock'}});assert.equal(paused,false);
});
