import test from 'node:test';
import assert from 'node:assert/strict';
import {boot} from './harness.mjs';
import {JOURNEY_KEYS,applyJourneyRestore,undoJourneyRestore} from '../dist/journey-backup.js';
import fs from 'node:fs';
import vm from 'node:vm';
import {installBackupBridge} from '../dist/backup-bridge.js';
import {TIDE_INITIAL} from '../dist/tide.js';
import {newLateState,writeLate} from '../dist/late-state.js';

test('old child pagehide cannot overwrite parent restore or its undo',()=>{
 const h=boot({embedded:true}),key=JOURNEY_KEYS.yuon;
 const store={getItem:k=>h.storage.get(k)??null,setItem:(k,v)=>h.storage.set(k,v),removeItem:k=>h.storage.delete(k)};
 h.a.start();const initial=store.getItem(key);
 h.a.player.z=5;h.a.save();const moved=store.getItem(key);
 h.parentMessage({type:'recommand-backup-lock',request:1});assert.equal(h.parentMessages.at(-1).ok,true);
 applyJourneyRestore(store,{entries:[{planet:'yuon',key,raw:initial}]});
 h.pagehide();assert.equal(store.getItem(key),initial,'unloading the old iframe must preserve restored data');
 undoJourneyRestore(store);h.pagehide();assert.equal(store.getItem(key),moved,'old unload must also preserve undo');
 h.parentMessage({type:'recommand-backup-unlock'});h.a.player.z=4;h.a.save();
 assert.equal(JSON.parse(store.getItem(key)).player.z,4,'ordinary saves resume when backup is cancelled');
});

for(const planet of ['swaehae','mumyeong','hwanseong'])test(planet+' real save handler preserves restore and undo while the old child is locked',()=>{
 const storage=new Map(),key=JOURNEY_KEYS[planet],events={},parent={postMessage(){}};
 const store={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
 const sea=planet==='swaehae',source=fs.readFileSync(new URL('../dist/'+(sea?'swaehae':'late-game')+'.js',import.meta.url),'utf8');
 const start=source.indexOf('function '+(sea?'saveSea':'lateSave')+'('),end=source.indexOf('function '+(sea?'seaTalk':'lateTalk')+'(',start);
 const box={JSON,Math,localStorage:store,SEA_SAVE:key,backupCanSave:()=>true,seaState:structuredClone(TIDE_INITIAL),seaSaveFailed:false,lateStarted:true,lateArena:null,lateState:newLateState(sea?'mumyeong':planet),latePlayer:{x:0,z:10,hp:100},lateSaveError:false,writeLate,lateToast(){}};
 vm.createContext(box);vm.runInContext(source.slice(start,end),box);
 const save=sea?()=>{box.saveSea();return!box.seaSaveFailed;}:()=>box.lateSave();
 const change=()=>{if(sea)box.seaState.introduced=true;else box.latePlayer.x=1;};
 save();const initial=store.getItem(key);change();save();const changed=store.getItem(key);assert.notEqual(changed,initial);
 box.backupCanSave=installBackupBridge({window:{addEventListener:(k,f)=>events[k]=f},parent,chapter:planet,flush:save,pause(){},resume(){}});
 const send=type=>events.message({source:parent,data:{type,request:1}});
 send('recommand-backup-lock');applyJourneyRestore(store,{entries:[{planet,key,raw:initial}]});
 save();assert.equal(store.getItem(key),initial,'old chapter save must not overwrite restored record');
 undoJourneyRestore(store);save();assert.equal(store.getItem(key),changed);
 send('recommand-backup-unlock');save();assert.equal(store.getItem(key),changed);
});
