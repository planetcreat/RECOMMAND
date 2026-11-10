import test from 'node:test';import assert from 'node:assert/strict';
import {boot} from './harness.mjs';import {newLateState} from '../dist/late-state.js';import {TIDE_INITIAL} from '../dist/tide.js';
import {JOURNEY_KEYS as K,JOURNEY_STORAGE_KEYS as KEYS,JOURNEY_RESTORE_KEY as TX,JOURNEY_ENEMIES,createJourneyBackup,decodeJourneyBackup,applyJourneyRestore,recoverJourneyRestore,undoJourneyRestore} from '../dist/journey-backup.js';
function store(initial={}){const data=new Map(Object.entries(initial));return{data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};}
function garden(){const h=boot();h.a.start();h.a.save();return{raw:h.storage.get(K.yuon),enemies:h.a.enemies};}
function archive(initial){return JSON.stringify(createJourneyBackup(store(initial),'2026-11-02T00:00:00Z'));}
test('full four-planet roundtrip, exact old records retained and explicit undo',()=>{
 const u=garden(),defs=JOURNEY_ENEMIES.map(e=>[e.id,e.max]);assert.deepEqual(defs,JSON.parse(JSON.stringify(u.enemies.map(e=>[e.id,e.max]))));
 const incoming={[K.yuon]:u.raw,[K.swaehae]:JSON.stringify(TIDE_INITIAL),[K.mumyeong]:JSON.stringify(newLateState('mumyeong')),[K.hwanseong]:JSON.stringify(newLateState('hwanseong'))};
 const target=store({[K.yuon]:'original unreadable user record',[K.yuon+'.backup']:'original recovery copy'});const before=createJourneyBackup(target).records;
 const plan=decodeJourneyBackup(archive(incoming));assert.equal(plan.entries.length,4);applyJourneyRestore(target,plan);
 for(const [k,v]of Object.entries(incoming))assert.equal(target.getItem(k),v);
 assert.equal(target.getItem(K.yuon+'.unreadable'),'original unreadable user record');undoJourneyRestore(target);assert.deepEqual(createJourneyBackup(target).records,before);
});
test('partial backup leaves absent planets untouched; corrupt primary can use valid backup',()=>{
 const raw=JSON.stringify(TIDE_INITIAL),target=store({[K.mumyeong]:'untouched user record'});
 const plan=decodeJourneyBackup(archive({[K.swaehae]:'broken',[K.swaehae+'.backup']:raw}));assert.equal(plan.entries[0].source,'backup');applyJourneyRestore(target,plan);assert.equal(target.getItem(K.swaehae),raw);assert.equal(target.getItem(K.mumyeong),'untouched user record');
});
test('malformed or fabricated imports never mutate storage, including caller-built plans',()=>{
 const target=store({[K.yuon]:'keep me'});const original=[...target.data];
 for(const text of ['null','{}','{broken',archive({[K.swaehae]:'invalid'})])assert.throws(()=>decodeJourneyBackup(text));
 assert.throws(()=>applyJourneyRestore(target,{entries:[{planet:'swaehae',key:K.yuon,raw:JSON.stringify(TIDE_INITIAL)}]}));assert.deepEqual([...target.data],original);
 const bad=JSON.parse(archive({[K.swaehae]:JSON.stringify(TIDE_INITIAL)}));bad.records.auth='secret';assert.throws(()=>decodeJourneyBackup(JSON.stringify(bad)));
});
test('durable backup failure aborts before chapter writes; transient mid-write failure rolls back',()=>{
 const plan=decodeJourneyBackup(archive({[K.swaehae]:JSON.stringify(TIDE_INITIAL)})),target=store({[K.swaehae]:'original'});let writes=0;
 const set=target.setItem;target.setItem=(k,v)=>{writes++;throw Error('quota');};assert.throws(()=>applyJourneyRestore(target,plan));assert.equal(target.getItem(K.swaehae),'original');assert.equal(writes,1);
 target.setItem=(k,v)=>{if(k===K.swaehae&&v!=='original')throw Error('quota');return set(k,v);};assert.throws(()=>applyJourneyRestore(target,plan),/되돌렸습니다/);assert.equal(target.getItem(K.swaehae),'original');assert.equal(JSON.parse(target.getItem(TX)).status,'rolledBack');
});
test('interrupted restore retains write-ahead record and recovers before next game load',()=>{
 const plan=decodeJourneyBackup(archive({[K.swaehae]:JSON.stringify(TIDE_INITIAL)})),target=store({[K.yuon]:'old garden'}),set=target.setItem;let count=0;
 target.setItem=(k,v)=>{if(++count>=3)throw Error('storage disconnected');return set(k,v);};assert.throws(()=>applyJourneyRestore(target,plan),/중단/);assert.equal(JSON.parse(target.getItem(TX)).status,'pending');
 target.setItem=set;assert.equal(recoverJourneyRestore(target),true);assert.equal(target.getItem(K.yuon),'old garden');assert.equal(target.getItem(K.swaehae),null);assert.equal(recoverJourneyRestore(target),false);
});
test('export is read-only and preserves unreadable evidence without exporting unrelated browser data',()=>{
 const target=store({[K.yuon]:'broken',[K.yuon+'.unreadable']:'older broken',unrelated:'private'}),before=[...target.data],data=createJourneyBackup(target);
 assert.equal(data.records[K.yuon],'broken');assert.equal(data.records[K.yuon+'.unreadable'],'older broken');assert.equal(Object.keys(data.records).length,KEYS.length);assert(!('unrelated'in data.records));assert.deepEqual([...target.data],before);
});
