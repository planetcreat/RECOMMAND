import test from 'node:test';import assert from 'node:assert/strict';
import {newLateState,decodeLate,reconstruct,canShare,loadLate,writeLate} from '../dist/late-state.js';
import {createLateBoss,tickLateBoss,hitLateBoss} from '../dist/late-combat.js';
import fs from 'node:fs';
import vm from 'node:vm';
import {clamp} from '../dist/math.js';
import {LATE_PLANETS} from '../dist/late-story.js';
import {Geometry} from '../dist/engine.js';

const worldSource=fs.readFileSync(new URL('../dist/late-game.js',import.meta.url),'utf8').replaceAll('\r\n','\n');

function stationPanels(){
 const start=worldSource.indexOf('function latePath(');
 const end=worldSource.indexOf('\nif(isSnow){\n // Bury the feet',start);
 assert(start>=0&&end>start);
 const panels=[];
 const lateArchitecture={quad(a,b,c,d){panels.push([a,b,c,d]);}};
 vm.runInNewContext(worldSource.slice(start,end),{isSnow:false,lateConfig:LATE_PLANETS.hwanseong,lateArchitecture,clamp});
 return panels;
}

test('station branch panels do not overlap the main corridor',()=>{
 const panels=stationPanels().map(points=>{
  const xs=points.map(point=>point[0]),zs=points.map(point=>point[2]);
  return [Math.min(...xs),Math.max(...xs),Math.min(...zs),Math.max(...zs)];
 }).filter(([, , ,maxZ])=>maxZ<=13);
 assert(panels.length>0);
 for(const [i,[minX,maxX,minZ,maxZ]] of panels.entries()){
  for(const [left,right,near,far] of panels.slice(i+1)){
   const overlapX=Math.min(maxX,right)-Math.max(minX,left);
   const overlapZ=Math.min(maxZ,far)-Math.max(minZ,near);
   assert(overlapX<1e-8||overlapZ<1e-8,'station panels overlap');
  }
 }
});

test('station corridor narrows at the south end and connects to the north approach',()=>{
 const panels=stationPanels(),points=panels.flat();
 const south=Math.max(...points.map(point=>point[2]));
 const outerXAt=z=>Math.max(...points.filter(point=>point[2]===z).map(point=>Math.abs(point[0])));
 assert.equal(south,16.5);
 assert(outerXAt(south)<outerXAt(13));
 assert(panels.some(panel=>{
  const xs=panel.map(point=>point[0]),zs=panel.map(point=>point[2]);
  return Math.min(...xs)<0&&Math.max(...xs)>0&&Math.min(...zs)<-42.6&&Math.max(...zs)>-42.6;
 }));
});

test('snow crystal roots and faces share a seam in both detail modes',()=>{
 const start=worldSource.indexOf('\nif(isSnow){\n // Bury the feet');
 const end=worldSource.indexOf('\nfor(const o of lateConfig.objects.filter',start);
 assert(start>=0&&end>start);
 for(const lateSoft of [false,true]){
  let faces=[];
  const formations=[];
  const lateArchitecture=new Geometry();
  lateArchitecture.quad=(...args)=>faces.push(args.slice(0,4));
  const lateObstacles={push(obstacle){formations.push({obstacle,faces});faces=[];}};
  vm.runInNewContext(worldSource.slice(start,end),{isSnow:true,lateSoft,lateConfig:LATE_PLANETS.mumyeong,lateArchitecture,lateObstacles});
  const crystals=formations.filter(({obstacle})=>obstacle.r===1.35);
  assert.equal(crystals.length,18);
  for(const {obstacle,faces} of crystals){
   const heights=[...new Set(faces.flat().map(point=>point[1]))].sort((a,b)=>a-b);
   assert.equal(heights.length,3,'crystal root and upper faces need a common height');
   const [root,seam,tip]=heights;
   assert(root<-.25);
   assert(tip>seam);
   const rim=lower=>new Set(faces.filter(face=>face.some(point=>point[1]===(lower?root:tip)))
    .flat().filter(point=>point[1]===seam).map(point=>point.join(',')));
   assert.equal(rim(true).size,lateSoft?4:6);
   assert.deepEqual(rim(true),rim(false));
   assert(faces.flat().filter(point=>point[1]===root).every(point=>
    Math.hypot(point[0]-obstacle.x,point[2]-obstacle.z)<1.51));
  }
 }
});

test('late chapters preserve separate records and reject fabricated endings',()=>{for(const planet of ['mumyeong','hwanseong']){const s=newLateState(planet);assert.deepEqual(decodeLate(JSON.stringify(s),planet),s);s.boss=true;assert.throws(()=>decodeLate(s,planet));}});
test('testimony comparisons require evidence and correct reasoning',()=>{const s=newLateState('mumyeong');assert(!reconstruct(s,0,0));s.arrived=true;s.heard=['keeper','walker','bell','footprints','archive'];assert(!reconstruct(s,0,1));assert(reconstruct(s,0,0));assert(reconstruct(s,1,1));assert(reconstruct(s,2,1));s.boss=true;s.ending='witness';assert.throws(()=>decodeLate(s,'mumyeong'));s.chime=s.asked=true;assert(decodeLate(s,'mumyeong'));});
test('shared ending requires actual earlier responses',()=>{const s=newLateState('hwanseong');s.boss=s.tomorrow=s.lumi=true;s.invited=[true,true,true];assert(!canShare(s,{garden:true,sea:false,snow:true}));assert(canShare(s,{garden:true,sea:true,snow:true}));});
test('failed load never mutates originals, and valid backup recovers',()=>{const data=new Map(),store={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};data.set('recommand-mumyeong-v1','broken');assert(loadLate(store,'mumyeong').error);assert.equal(data.get('recommand-mumyeong-v1'),'broken');const s=newLateState('mumyeong');data.set('recommand-mumyeong-v1.backup',JSON.stringify(s));assert.equal(loadLate(store,'mumyeong').source,'backup');writeLate(store,s);assert(decodeLate(data.get('recommand-mumyeong-v1'),'mumyeong'));});
test('late boss warnings, armor, cooldown and trials use simulation time',()=>{const p={x:9,z:-57,face:{x:0,z:-1}},b=createLateBoss('mumyeong');assert(!hitLateBoss(b,p,'slash'));tickLateBoss(b,p,.8);assert.equal(b.phase,'announce');tickLateBoss(b,p,.2);assert.equal(b.phase,'warn');const trial=createLateBoss('hwanseong',{},'garden');for(let i=0;i<2000&&trial.active;i++)tickLateBoss(trial,p,1/60);assert.equal(trial.phase,'trialWon');assert.equal(trial.hero,100);});

test('both late bosses are beatable through announced openings without fabricated victory',()=>{
 for(const planet of ['mumyeong','hwanseong']){
  const b=createLateBoss(planet,{garden:'boundary',sea:'locked',snow:'echo'}),p={x:10,z:-64,face:{x:-1,z:0}};let seconds=0,opens=0;
  for(let i=0;i<24000&&b.active;i++){
   if(b.phase==='open'){if(b.time<.02)opens++;p.x=3;p.z=-64;p.face={x:-1,z:0};hitLateBoss(b,p,'slash');hitLateBoss(b,p,'wave');}
   else{p.x=10;p.z=-64;}
   tickLateBoss(b,p,1/60);seconds+=1/60;
  }
  assert.equal(b.phase,'won',planet);assert.equal(b.hp,0);assert(b.hero>0);assert(opens>=2);assert(seconds<180);
 }
});
test('fake signals do not damage, real signals do, and death stops later ticks',()=>{
 const b=createLateBoss('mumyeong'),p={x:0,z:-57,face:{x:0,z:-1}};tickLateBoss(b,p,.91);
 const fake=b.hazards.find(h=>!h.real);p.x=fake.x;p.z=fake.z;tickLateBoss(b,p,1.7);assert.equal(b.hero,100);
 const c=createLateBoss('mumyeong'),q={x:0,z:-57};for(let i=0;i<20000&&c.active;i++)tickLateBoss(c,q,1/60);assert.equal(c.phase,'lost');assert.equal(c.hero,0);const snapshot=JSON.stringify(c);tickLateBoss(c,q,10);assert.equal(JSON.stringify(c),snapshot);
});
test('invalid tick durations cannot advance or hang the battle',()=>{const b=createLateBoss('hwanseong'),before=JSON.stringify(b);for(const dt of [NaN,Infinity,-1,0])tickLateBoss(b,{x:0,z:-57},dt);assert.equal(JSON.stringify(b),before);});

test('joint ending evaluates all eight combinations of real prior responses without inventing any',async()=>{
 const {journeySummary}=await import('../dist/late-state.js');const {TIDE_INITIAL}=await import('../dist/tide.js');
 for(let mask=0;mask<8;mask++){
  const entries=new Map();
  if(mask&1)entries.set('recommand-save-v1',JSON.stringify({v:1,state:{quest:2,seals:[true,true,true],memories:[true,true],boss:true,complete:true,ending:'rewrite',bond:true,fracture:true}}));
  if(mask&2){const sea=structuredClone(TIDE_INITIAL);sea.arrival=sea.introduced=sea.foregate=true;sea.gates=[true,true];sea.boss={defeated:true,rewritten:true};entries.set('recommand-swaehae-v1',JSON.stringify(sea));}
  if(mask&4){const mum=newLateState('mumyeong');mum.arrived=mum.chime=mum.asked=mum.boss=true;mum.heard=['keeper','walker','bell','footprints','archive'];mum.compared=[true,true,true];mum.ending='witness';entries.set('recommand-mumyeong-v1',JSON.stringify(mum));}
  const h=newLateState('hwanseong');h.arrived=h.boss=h.tomorrow=h.lumi=true;h.relays=h.invited=[true,true,true];const before=JSON.stringify([...entries]);assert.equal(canShare(h,journeySummary(k=>entries.get(k))),mask===7);assert.equal(JSON.stringify([...entries]),before);
 }
});
