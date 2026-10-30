import test from 'node:test';import assert from 'node:assert/strict';
import {newLateState,decodeLate,reconstruct,canShare,loadLate,writeLate} from '../dist/late-state.js';
import {createLateBoss,tickLateBoss,hitLateBoss} from '../dist/late-combat.js';
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
