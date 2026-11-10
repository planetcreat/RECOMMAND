import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';
import {createScopedStorage,chapterDocument} from '../dist/storage-scope.js';
const rawStore=()=>{const data=new Map([['recommand-save-v1','real-user-progress']]);return{data,get length(){return data.size;},key:i=>[...data.keys()][i]??null,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};};
test('QA reads, writes, removals and clear cannot reach production or another QA scope',()=>{
 const raw=rawStore(),qa=createScopedStorage(raw,'motion'),other=createScopedStorage(raw,'other');
 assert.equal(qa.getItem('recommand-save-v1'),null);qa.setItem('recommand-save-v1','test');other.setItem('x','keep');
 assert.equal(qa.length,1);assert.equal(qa.key(0),'recommand-save-v1');assert.equal(qa.key(1),null);qa.clear();
 assert.equal(raw.getItem('recommand-save-v1'),'real-user-progress');assert.equal(other.getItem('x'),'keep');assert.equal(qa.length,0);
 assert.throws(()=>createScopedStorage(raw,'../../invalid'));
});
test('child frame uses exactly the parent QA namespace; ordinary launch is untouched',()=>{
 const html='<script type="module">localStorage.setItem("recommand-save-v1","qa-play");</script>',raw=rawStore();
 assert.equal(chapterDocument(html,[]),html);
 const child=chapterDocument(html,[],'motion');vm.runInNewContext(child.match(/<script type="module">([\s\S]*?)<\/script>/)[1],{window:{localStorage:raw}});
 assert.equal(raw.getItem('recommand-save-v1'),'real-user-progress');assert.equal(createScopedStorage(raw,'motion').getItem('recommand-save-v1'),'qa-play');
 assert.throws(()=>chapterDocument(html,[],'bad"scope'));
});

test('malformed QA links stop the built launcher before a save is selected',async()=>{
 const {launcherHarness}=await import('./launcher-harness.mjs');
 for(const search of ['?qa','?qa=','?qa=a&qa=b','?qa=bad%20name']){
  assert.throws(()=>launcherHarness({search}),/Invalid QA save scope/);
 }
});
