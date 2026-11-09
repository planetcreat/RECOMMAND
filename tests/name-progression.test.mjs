import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {LATE_KEYS,newLateState,decodeLate,writeLate,revealTravelerName,acceptTravelerName,travelerName} from '../dist/late-state.js';
import {LATE_PLANETS,NAME_RECORD,NAME_ACCEPTANCE} from '../dist/late-story.js';

// Run the real dialogue/start/travel/save handlers; replace only DOM and graphics.
const source=fs.readFileSync(new URL('../dist/late-game.js',import.meta.url),'utf8');
const section=(from,to)=>source.slice(source.indexOf(from),source.indexOf(to,source.indexOf(from)));
function legacyEnding(){
 const s=newLateState('mumyeong');Object.assign(s,{arrived:true,heard:['keeper','walker','bell','footprints','archive'],compared:[true,true,true],boss:true,ending:'restore'});return s;
}
function sceneHarness(saved=legacyEnding()){
 const key=LATE_KEYS.mumyeong,storage=new Map([[key,JSON.stringify(saved)]]),elements=new Map(),messages=[];
 const el=id=>{if(!elements.has(id))elements.set(id,{hidden:false,textContent:'',children:[],focus(){},replaceChildren(){this.children=[];},append(b){this.children.push(b);}});return elements.get(id);};
 const store={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
 const state=decodeLate(saved,'mumyeong'),parent={postMessage:m=>messages.push(m)};let shownName='이름 없는 여행자';
 const box={JSON,Math,NAME_RECORD,NAME_ACCEPTANCE,LATE_KEYS,writeLate,revealTravelerName,acceptTravelerName,newLateState,
  isSnow:true,latePlanet:'mumyeong',lateConfig:LATE_PLANETS.mumyeong,lateLoad:{state,source:'primary'},lateState:state,
  lateStarted:false,latePaused:false,lateDialogue:null,lateKeys:new Set(),lateCamera:{},latePlayer:{...state.player},lateArena:null,lateSaveError:false,backupCanSave:()=>true,
  localStorage:store,parent,window:{parent},document:{createElement:()=>({})},lateEl:el,lateSet:(id,value)=>{el(id).textContent=value;},lateToast(){},
  lateUpdateHUD(){shownName=travelerName(box.lateState);}};
 vm.createContext(box);
 vm.runInContext(section('function lateSave(','function lateTalk(')+section('function lateTalk(','function lateNearest(')+section('function lateNameReveal(','function lateSnowEnding('),box);
 return{box,messages,storage,el,name:()=>shownName,saved:()=>decodeLate(store.getItem(key),'mumyeong')};
}

test('legacy travel waits for every name page, saves acceptance, then changes planet once',()=>{
 const h=sceneHarness();h.box.lateStart(true);assert.equal(h.box.lateDialogue.lines,NAME_RECORD);
 h.box.lateTravel('hwanseong');assert.equal(h.messages.length,0);
 for(let i=0;i<NAME_RECORD.length;i++){
  assert.equal(h.saved().nameRevealed,false);assert.equal(h.name(),'이름 없는 여행자');h.box.lateAdvance();
 }
 assert.equal(h.saved().nameRevealed,true);assert.equal(h.saved().nameAccepted,false);assert.equal(h.box.lateDialogue.lines,NAME_ACCEPTANCE);
 for(let i=0;i<NAME_ACCEPTANCE.length;i++){
  assert.equal(h.saved().nameAccepted,false);assert.equal(h.messages.length,0);h.box.lateAdvance();
 }
 assert.equal(h.saved().nameAccepted,true);assert.equal(h.name(),'이든');assert.equal(h.messages.length,1);assert.equal(h.messages[0].chapter,'hwanseong');
 assert.equal(h.saved().ending,'restore');assert.equal(h.saved().chime,false);assert.equal(h.saved().asked,false);
});

test('interrupted name discovery restarts on continue without granting acceptance or hidden rewards',()=>{
 const h=sceneHarness();h.box.lateStart(true);h.box.lateAdvance();
 const partial=h.saved();assert.equal(partial.nameRevealed,false);assert.equal(partial.nameAccepted,false);
 const reload=sceneHarness(partial);reload.box.lateStart(true);assert.equal(reload.box.lateDialogue.index,0);assert.equal(reload.box.lateDialogue.lines,NAME_RECORD);
 for(let i=0;i<NAME_RECORD.length+NAME_ACCEPTANCE.length;i++)reload.box.lateAdvance();
 assert.equal(reload.saved().nameAccepted,true);assert.equal(reload.saved().ending,'restore');assert.equal(reload.saved().chime,false);assert.equal(reload.saved().asked,false);
 const accepted=sceneHarness(reload.saved());accepted.box.lateStart(true);assert.equal(accepted.box.lateDialogue,null);assert.equal(accepted.name(),'이든');
});
