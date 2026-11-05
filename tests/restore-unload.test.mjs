import test from 'node:test';
import assert from 'node:assert/strict';
import {boot} from './harness.mjs';
import {JOURNEY_KEYS,applyJourneyRestore,undoJourneyRestore} from '../dist/journey-backup.js';

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
