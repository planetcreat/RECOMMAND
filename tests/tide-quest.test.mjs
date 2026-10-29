import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {TIDE_INITIAL,decodeTide,boatAction,tickBoat,boatPosition,BOAT_SECONDS} from '../dist/tide.js';
const initial=()=>structuredClone(TIDE_INITIAL);
const ready=()=>({...initial(),introduced:true,observations:[true,true,true]});
test('legacy tide saves migrate without losing main progress or aliasing defaults',()=>{
 const old={v:1,arrival:true,introduced:true,gates:[true,true],observations:[true,false,true],foregate:true};
 const a=decodeTide(old),b=decodeTide(old);a.boat.met=true;
 assert.equal(b.boat.met,false);assert.equal(TIDE_INITIAL.boat.met,false);assert.deepEqual(a.observations,old.observations);assert.equal(a.foregate,true);
});
test('hidden quest cannot skip discovery, safe repair, circulation or return',()=>{
 const s=initial();for(const a of ['chart','repair','launch','claim'])assert.equal(boatAction(s,a),false);
 boatAction(s,'meet');s.introduced=true;s.observations=[true,true,true];assert.equal(boatAction(s,'chart'),false);
 s.gates=[false,true];assert.equal(boatAction(s,'chart'),true);assert.equal(boatAction(s,'repair'),false);
 s.gates=[false,false];assert.equal(boatAction(s,'repair'),true);assert.equal(boatAction(s,'launch'),false);
 s.gates=[true,true];assert.equal(boatAction(s,'launch'),true);assert.equal(boatAction(s,'claim'),false);
 tickBoat(s,5);s.gates=[false,true];tickBoat(s,100);assert.equal(s.boat.elapsed,5);
 const loaded=decodeTide(JSON.stringify(s));loaded.gates=[true,true];assert.equal(tickBoat(loaded,100),true);
 assert.equal(loaded.boat.elapsed,BOAT_SECONDS);assert.equal(boatAction(loaded,'claim'),true);assert.equal(boatAction(loaded,'claim'),false);
 assert.deepEqual(decodeTide(JSON.stringify(loaded)),loaded);
});
test('boat follows a closed route with finite continuous positions',()=>{
 for(let t=0;t<=BOAT_SECONDS;t+=.05){const a=boatPosition(t),b=boatPosition(t+.01);assert(Object.values(a).every(Number.isFinite));assert(Math.hypot(a.x-b.x,a.z-b.z)<.06);}
 const a=boatPosition(0),b=boatPosition(BOAT_SECONDS);assert(Math.hypot(a.x-b.x,a.z-b.z)<1e-8);
});
test('invalid or fabricated boat rewards and timers are rejected',()=>{
 for(const boat of [null,{met:true,stage:'complete',elapsed:0},{met:false,stage:'charted',elapsed:0},{met:true,stage:'unknown',elapsed:2},{met:true,stage:'sailing',elapsed:Infinity}])assert.throws(()=>decodeTide({...ready(),boat}));
 assert.throws(()=>decodeTide({...initial(),boat:{met:true,stage:'complete',elapsed:14}}));
 const s=ready();s.boat={met:true,stage:'sailing',elapsed:2};s.gates=[true,true];tickBoat(s,NaN);tickBoat(s,-1);assert.equal(s.boat.elapsed,2);
});

// Execute the real chapter event handlers and render loop with only graphics/DOM stubbed.
function chapterBoot(saved){
 const read=p=>fs.readFileSync(new URL('../dist/'+p,import.meta.url),'utf8'),els=new Map(),storage=new Map(saved?[['recommand-swaehae-v1',JSON.stringify(saved)]]:[]),events={};
 for(const m of read('swaehae.html').matchAll(/id="([^"]+)"/g)){const classes=new Set();els.set(m[1],{textContent:'',classList:{add:s=>classes.add(s),remove:s=>classes.delete(s),toggle:(s,v)=>v?classes.add(s):classes.delete(s)},focus(){},classes});}
 const doc={getElementById:id=>els.get(id),querySelectorAll:()=>[],addEventListener:(k,f)=>events[k]=f};
 const box={console,structuredClone,Math,JSON,Number,Array,Object,Map,Set,document:doc,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},performance:{now:()=>0},requestAnimationFrame(){},addEventListener:(k,f)=>events[k]=f};box.window=box;vm.createContext(box);
 const graphics='class Geometry{constructor(){this.data=[];}quad(){}tri(){}cone(){}ring(){}}class Renderer{texture(k){return k;}upload(g){return g;}begin(){}mesh(){}drawDynamic(){}sprite(){}finish(){}}';
 const source=[read('math.js'),graphics,read('vfx.js'),read('tide.js'),read('swaehae.js'),'this.qa={state:seaState,player:seaPlayer,interact:seaInteract,advance:seaAdvance,tick:seaTick,draw:seaDraw,nearest:seaNearest,dialog:()=>seaDialog,pause:pauseSea};'].join('\n').replace(/^import .*;\r?\n/gm,'').replace(/\bexport /g,'');vm.runInContext(source,box);
 const close=()=>{let n=0;while(box.qa.dialog()&&n++<30)box.qa.advance();};
 return {a:box.qa,els,storage,close,blur:()=>events.blur(),visit:(x,z)=>{box.qa.player.x=x;box.qa.player.z=z;box.qa.interact();}};
}
test('real chapter: discover, repair, launch, pause, reload, return and claim once',()=>{
 const h=chapterBoot({...ready(),arrival:true}),s=h.a.state;
 h.visit(-8.5,-12);assert.equal(h.a.dialog(),null); // hidden before Do-ha
 h.visit(-6,9);h.close();assert.equal(s.boat.met,true);
 s.gates=[false,true];h.visit(-8.5,-12);h.close();assert.equal(s.boat.stage,'charted');
 h.visit(-8.5,-12);h.close();assert.equal(s.boat.stage,'charted');
 s.gates=[false,false];h.visit(-8.5,-12);h.close();assert.equal(s.boat.stage,'repaired');
 s.gates=[true,true];h.visit(-4.7,13);h.close();assert.equal(s.boat.stage,'sailing');
 h.a.tick(4);h.blur();h.a.tick(4);assert.equal(s.boat.elapsed,4);h.a.draw();
 const resumed=chapterBoot(JSON.parse(h.storage.get('recommand-swaehae-v1')));assert.equal(resumed.a.state.boat.elapsed,4); // blur saves mid-voyage progress
 const midway=chapterBoot(JSON.parse(JSON.stringify(s)));midway.a.tick(10);assert.equal(midway.a.state.boat.stage,'returned');
 midway.visit(-6,9);midway.close();assert.equal(midway.a.state.boat.stage,'complete');midway.a.draw();assert.match(midway.els.get('boatProgress').textContent,/물길의 기억/);
 midway.visit(-6,9);midway.close();assert.equal(midway.a.state.boat.stage,'complete');
 midway.visit(0,-32);assert(midway.a.dialog().lines.some(x=>x.includes('물길의 기억이 겹친다')));
});
