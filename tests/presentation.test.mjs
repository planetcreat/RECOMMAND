import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {floorQuad,uprightQuad,effectFrame,CombatVFX,combatSpritePose} from '../dist/vfx.js';
import {effectGrid,Geometry} from '../dist/engine.js';
import {clamp} from '../dist/math.js';
import {TIDE_INITIAL,tideState,observeTide,tideIntel,decodeTide} from '../dist/tide.js';
test('world effect surfaces have real floor and vertical coordinates',()=>{const floor=floorQuad(3,.2,8,4,.5);assert.equal(floor.length,4);assert(floor.every(p=>p[1]===.2&&p.every(Number.isFinite)));const up=uprightQuad(3,.2,8,4,3,.5,.25);assert.equal(Math.max(...up.map(p=>p[1])),3.2);assert(Math.max(...up.map(p=>p[2]))>Math.min(...up.map(p=>p[2])));});
test('effect animation clamps to four atlas frames',()=>{assert.equal(effectFrame({life:1,max:1}),0);assert.equal(effectFrame({life:.5,max:1}),2);assert.equal(effectFrame({life:0,max:1}),3);assert.equal(effectFrame({life:-1,max:1}),3);});
test('combat sprite pose eases in and out and does not change gameplay effects',()=>{
 const neutral={width:1,height:1,opacity:1};
 const effect={kind:'slash',life:.32,max:.32};
 assert.deepEqual(combatSpritePose([effect],1,0,0,0),neutral);
 effect.life=.2;const snapshot={...effect};
 const start=combatSpritePose([effect],0,0,0,0),end=combatSpritePose([effect],1,0,0,0);
 assert(start.width>1&&end.width>1&&Math.abs(end.width-start.width)<.02);
 assert(end.height<1);
 assert.deepEqual(effect,snapshot);
 assert.deepEqual(combatSpritePose([{...effect,life:0}],1,0,0,0),neutral);
 assert.equal(combatSpritePose([],1,1,0,0).opacity,.65);
 assert(combatSpritePose([],1,.2,0,0).opacity>combatSpritePose([],1,.5,0,0).opacity);
 assert(combatSpritePose([],1,0,.002,.1).opacity>.99);
});
test('harbor water strips and crossings share vertices at each tide height',()=>{
 const source=fs.readFileSync(new URL('../dist/swaehae.js',import.meta.url),'utf8');
 const start=source.indexOf('const harborWaterStops='),end=source.indexOf('function seaDraw(',start);
 assert(start>=0&&end>start);
 const draw=vm.runInNewContext(source.slice(start,end)+'\ndrawHarborWater',{clamp});
 for(const [level,flow] of [[.04,-1],[.2,1],[.36,.3]]){
  const mesh=new Geometry();draw(mesh,level,3.1,flow);
  assert(mesh.data.every(Number.isFinite));
  const vertices=[];
  for(let i=0;i<mesh.data.length;i+=6)vertices.push(mesh.data.slice(i,i+6));
  assert(vertices.length<3000);
  for(const z of [-19.7,-19.05,8.3,8.95]){
   const row=vertices.filter(point=>point[2]===z);
   assert(row.some(([x])=>Math.abs(x)<.4),'water spans the crossing');
   const seam=row.find(([x])=>x>3.5&&x<4.4);
   assert(seam&&row.filter(point=>point.every((value,i)=>Math.abs(value-seam[i])<1e-9)).length>=4);
  }
 }
});
test('floor textures contain center vertices so curved terrain cannot bury a four-corner sheet',()=>{const grid=effectGrid(floorQuad(0,.4,0,6));assert.equal(grid.length,8*8*6*5);let center=false;for(let i=0;i<grid.length;i+=5){assert(grid.slice(i,i+5).every(Number.isFinite));if(grid[i]===0&&grid[i+2]===0){center=true;assert.equal(grid[i+1],.4);}}assert(center);});
test('presentation draws 3D wave geometry without mutating combat inputs',()=>{const effects=[{kind:'wave',x:0,z:0,life:.4,max:.75}],enemy=[{type:3,hp:100,wind:.7,pulse:0,x:2,z:-3}],before=JSON.stringify([effects,enemy]),quads=[];let vertices=0;const r={effect(t,p){quads.push(p);},texture(k){return k;},drawDynamic(g){vertices+=g.data.length;}};new CombatVFX(r).draw(effects,enemy,3);assert.equal(JSON.stringify([effects,enemy]),before);assert(quads.length>0);assert(vertices>0);assert(quads.flat(2).every(Number.isFinite));});
test('image redirects request CORS and rejected GPU texture uploads fall back safely',()=>{const previous=globalThis.Image;let image;globalThis.Image=class{constructor(){image=this;this.naturalWidth=this.naturalHeight=1024;}set src(value){this.onload();}};try{let vfx;assert.doesNotThrow(()=>{vfx=new CombatVFX({texture(){throw Error('tainted canvas');}});});assert.equal(image.crossOrigin,'anonymous');assert.equal(vfx.failed,true);assert.equal(vfx.ready,false);assert.deepEqual(vfx.atlasFrames,[]);}finally{if(previous===undefined)delete globalThis.Image;else globalThis.Image=previous;}});
test('all four gate configurations have distinct observable flow',()=>{assert.deepEqual([[false,false],[true,false],[false,true],[true,true]].map(tideState),['sealed','filling','draining','circulation']);});
test('tide intelligence needs three distinct experiments and survives save roundtrip',()=>{const s=structuredClone(TIDE_INITIAL);s.gates=[true,false];observeTide(s);observeTide(s);assert.equal(tideIntel(s),false);s.gates=[false,true];observeTide(s);s.gates=[true,true];observeTide(s);assert.equal(tideIntel(s),true);assert.deepEqual(decodeTide(JSON.stringify(s)),s);});
test('corrupt or impossible second chapter saves are rejected',()=>{assert.throws(()=>decodeTide({...TIDE_INITIAL,gates:[true]}));assert.throws(()=>decodeTide({...TIDE_INITIAL,foregate:true}));const s=decodeTide({...TIDE_INITIAL,introduced:true,foregate:true});assert.equal(s.foregate,true);});
test('both offline chapters contain the generated atlas and parse without external code',()=>{for(const file of['RECOMMAND.html','SWAEHAE.html']){const html=fs.readFileSync(new URL('../release/'+file,import.meta.url),'utf8');assert(html.includes('data:image/png;base64,'));assert(!/<script[^>]+src=|<link[^>]+href=/i.test(html));new vm.Script(html.match(/<script type="module">([\s\S]*?)<\/script>/)[1]);}const first=fs.readFileSync(new URL('../release/RECOMMAND.html',import.meta.url),'utf8');assert(first.includes("location.href=standaloneRun.href('SWAEHAE.html')"));});
