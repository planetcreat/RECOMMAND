import test from 'node:test';
import assert from 'node:assert/strict';
import {CharacterMotor,FixedStepClock,resolveMove} from '../dist/math.js';

test('swept circle cannot tunnel through a thin obstacle at dash speed',()=>{
 const p=resolveMove({x:-5,z:0},10,0,[{x:0,z:0,r:.15}]);
 assert(p.x<-.57);assert(p.x>-.571);assert.equal(p.z,0);
});
test('contact sliding is symmetric and repeated pressure does not penetrate',()=>{
 const obstacles=[{x:0,z:0,r:1}],a=resolveMove({x:-2,z:-1},3,1,obstacles),b=resolveMove({x:2,z:-1},-3,1,obstacles);
 assert(Math.abs(a.x+b.x)<1e-9);assert(Math.abs(a.z-b.z)<1e-9);
 let p={x:-2,z:0};for(let i=0;i<100;i++)p=resolveMove(p,.2,0,obstacles);
 assert(p.x<=-1.42);assert(p.x>=-1.421);
});
test('motor accelerates promptly, brakes within a short distance, and resets on teleport',()=>{
 const m=new CharacterMotor(),p={x:0,z:0},input={x:1,z:0};
 Object.assign(p,m.move(p,input,1/60));assert(p.x>0&&p.x<6.2/60);
 for(let i=0;i<30;i++)Object.assign(p,m.move(p,input,1/60));assert(m.vx>6.19);
 const before=p.x;for(let i=0;i<30;i++)Object.assign(p,m.move(p,{x:0,z:0},1/60));
 assert(p.x-before<.14);assert.equal(m.vx,0);
 p.x=20;m.move(p,{x:0,z:0},1/60);assert.equal(m.vx,0);
 m.stop(p);assert.equal(m.vz,0);
});
test('shared fixed clock gives equal motion across 30, 60, 144 Hz and uneven frames',()=>{
 const run=frames=>{const m=new CharacterMotor(),clock=new FixedStepClock(),p={x:0,z:0};let ticks=0;
  for(const dt of frames)clock.advance(dt,step=>{Object.assign(p,m.move(p,{x:1,z:1},step));ticks++;});return{p,ticks};};
 const baseline=run(Array(60).fill(1/60));
 for(const frames of [Array(30).fill(1/30),Array(144).fill(1/144),Array.from({length:60},(_,i)=>i%2?.025:1/120)]){
  const r=run(frames);assert.equal(r.ticks,60);assert(Math.hypot(r.p.x-baseline.p.x,r.p.z-baseline.p.z)<1e-9);
 }
});
test('hitch recovery bounds simulation work and preserves interpolation remainder',()=>{
 const clock=new FixedStepClock();let ticks=0;const first=clock.advance(.149,()=>ticks++);
 assert.equal(ticks,8);assert(first.alpha>0&&first.alpha<1);const r=clock.advance(2,()=>ticks++);
 assert.equal(r.steps,8);assert(clock.dropped>0);assert(r.alpha>=0&&r.alpha<1);
});
test('dash keeps its configured speed and motion data never enters save objects',()=>{
 const m=new CharacterMotor(),p={x:0,z:0,hp:100},before=JSON.stringify(p);
 const next=m.move(p,{x:0,z:-1},1/60,{speed:22,dashing:true});
 assert.equal(next.z,-22/60);assert.equal(JSON.stringify(p),before);
});
