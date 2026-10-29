import test from 'node:test';import assert from 'node:assert/strict';
import {BELROK,createBelrok,startBelrok,tickBelrok,hitBelrok,divertBelrok,dashBelrok} from '../dist/belrok.js';
import {TIDE_INITIAL,decodeTide} from '../dist/tide.js';
const hero=()=>({x:0,z:-44,face:{x:0,z:-1}});
const advance=(b,p,seconds)=>{for(let t=0;t<seconds-1e-8;t+=1/60)tickBelrok(b,p,1/60);};
test('Belrok announces every hazard before firing and uses different return lanes',()=>{
 const b=createBelrok(),p=hero();startBelrok(b,p);const outward=b.hazards.map(h=>[h.x,h.z]);advance(b,p,1.7);assert.equal(b.bursts.length,0);advance(b,p,.2);assert.equal(b.bursts.length,8);advance(b,p,1.2);assert.equal(b.phase,'returnWarn');assert.notDeepEqual(b.hazards.map(h=>[h.x,h.z]),outward);assert(b.hazards.every(h=>h.r>0));
});
test('hidden diversion needs knowledge, proximity and the return warning window',()=>{
 const b=createBelrok(),p=hero();startBelrok(b,p);p.x=-9;p.z=-48;assert.equal(divertBelrok(b,p,true),false);advance(b,p,3.1);assert.equal(b.phase,'returnWarn');assert.equal(divertBelrok(b,p,false),false);p.x=0;assert.equal(divertBelrok(b,p,true),false);p.x=-9;assert.equal(divertBelrok(b,p,true),true);assert.equal(divertBelrok(b,p,true),false);b.bursts=[];advance(b,p,4);assert.equal(b.phase,'open');assert.equal(b.bursts.length,0);advance(b,p,4);assert.equal(b.phase,'open');
});
test('armor, attack direction, range and independent cooldowns are enforced',()=>{
 const b=createBelrok(),p=hero();startBelrok(b,p);p.z=-51;hitBelrok(b,p,'slash');assert.equal(b.hp,360);b.phase='open';b.slash=0;p.face.z=1;hitBelrok(b,p,'slash');assert.equal(b.hp,360);b.slash=0;p.face.z=-1;hitBelrok(b,p,'slash');assert.equal(b.hp,342);hitBelrok(b,p,'slash');assert.equal(b.hp,342);hitBelrok(b,p,'wave');assert.equal(b.hp,316);p.z=-44;b.slash=0;hitBelrok(b,p,'slash');assert.equal(b.hp,316);
});
test('circular hazards, invulnerability, dash and defeat stop later damage',()=>{
 const b=createBelrok(),p=hero();startBelrok(b,p);const h=b.hazards[0];p.x=h.x;p.z=h.z;advance(b,p,1.9);assert.equal(b.hero,78);advance(b,p,.1);assert.equal(b.hero,78);
 startBelrok(b,p);p.x=b.hazards[0].x;p.z=b.hazards[0].z;advance(b,p,1.75);assert.equal(dashBelrok(b),true);assert.equal(dashBelrok(b),false);advance(b,p,.15);assert.equal(b.hero,100);
 b.hero=0;advance(b,p,.02);assert.equal(b.phase,'lost');const clock=b.time;advance(b,p,10);assert.equal(b.time,clock);assert.equal(hitBelrok(b,p,'slash'),false);
});
test('both ordinary and hidden routes can defeat the boss without a hidden completion flag',()=>{
 for(const hidden of [false,true]){const b=createBelrok(),p=hero();startBelrok(b,p);let time=0;
  while(b.active&&time<180){
   if(b.phase==='open'){p.x=0;p.z=-51;p.face={x:0,z:-1};hitBelrok(b,p,'slash');hitBelrok(b,p,'wave');}
   else if(hidden&&b.phase==='returnWarn'){p.x=-9;p.z=-48;divertBelrok(b,p,true);}
   else if(b.phase==='lockWarn'||b.phase==='lock'){p.x=9;p.z=-54;}
   else{p.x=0;p.z=-44;}
   tickBelrok(b,p,1/60);time+=1/60;
  }assert.equal(b.phase,'won');assert.equal(b.hp,0);assert(b.hero>0);assert.equal(hitBelrok(b,p,'slash'),false);
 }
});
test('old saves migrate and impossible boss endings are rejected',()=>{
 const old=structuredClone(TIDE_INITIAL);delete old.boss;assert.deepEqual(decodeTide(old).boss,{defeated:false,rewritten:false});
 assert.throws(()=>decodeTide({...TIDE_INITIAL,boss:{defeated:true,rewritten:false}}));assert.throws(()=>decodeTide({...TIDE_INITIAL,introduced:true,foregate:true,boss:{defeated:false,rewritten:true}}));
 const s={...structuredClone(TIDE_INITIAL),introduced:true,foregate:true,boss:{defeated:true,rewritten:true}};assert.deepEqual(decodeTide(JSON.stringify(s)),s);
});
