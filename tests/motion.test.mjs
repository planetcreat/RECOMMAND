import test from 'node:test';
import assert from 'node:assert/strict';
import {MotionPresenter} from '../dist/math.js';

test('render interpolation never changes logical position, facing, cooldown or saves',()=>{
 const p={x:0,z:0,hp:100,face:{x:0,z:-1},dash:.8};const m=new MotionPresenter(p);m.capture(p);p.x=1;const before=JSON.stringify(p);
 const v=m.sample(p,.25,1/120);assert.equal(v.x,.25);assert.equal(v.z,0);assert.equal(JSON.stringify(p),before);
 assert.equal(m.sample(p,.75,1/120).x,.75);
});
test('camera damping has the same time response at 30, 60 and 144 Hz',()=>{
 const follow=hz=>{const p={x:0,z:0,face:{z:1}},m=new MotionPresenter(p);p.x=4;p.z=-3;m.capture(p);for(let i=0;i<hz;i++)m.sample(p,1,1/hz);return m.camera;};
 const a=follow(30);for(const hz of[60,144]){const b=follow(hz);assert(Math.abs(a.x-b.x)<1e-10);assert(Math.abs(a.z-b.z)<1e-10);}
});
test('teleports reset interpolation and camera without changing their shared reference',()=>{
 const p={x:0,z:0},m=new MotionPresenter(p),camera=m.camera;p.x=25;p.z=-64;const v=m.sample(p,.1,1/60);assert.equal(v.x,25);assert.equal(v.z,-64);assert.equal(m.camera,camera);assert.equal(camera.x,25);
});
test('blocked movement settles into idle and pause uses the exact logical position',()=>{
 const p={x:0,z:0,face:{x:0,z:-1}},m=new MotionPresenter(p);m.capture(p);p.z=-.1;m.sample(p,1,1/60);m.capture(p);
 let v;for(let i=0;i<120;i++)v=m.sample(p,.5,1/60);assert(v.gait<1e-6);assert.equal(v.frame,2);p.x=1;assert.equal(m.sample(p,.1,1/60,{frozen:true}).x,1);
});
test('facing hysteresis avoids front-back flicker near a diagonal boundary',()=>{
 const p={x:0,z:0,face:{z:-1}},m=new MotionPresenter(p);m.sample(p);p.face.z=-.05;assert.equal(m.sample(p).frame,2);p.face.z=.2;assert.equal(m.sample(p).frame,0);
});

test('dash holds the stride phase and eases the silhouette on entry and exit',()=>{
 const p={x:0,z:0},m=new MotionPresenter(p);
 m.capture(p);p.x=.1;m.sample(p);
 const phase=m.phase;
 m.capture(p);p.x+=.3;m.sample(p,1,1/60,{dashing:true});
 assert.equal(m.phase,phase);
 const entry=m.dashBlend;
 assert(entry>0 && entry<1);
 m.capture(p);m.sample(p);
 assert(m.dashBlend>0 && m.dashBlend<entry);
});

test('walking reversal waits for travel to reverse before changing silhouettes',()=>{
 const player={x:0,z:0,face:{z:1}};
 const motion=new MotionPresenter(player);
 function step(dz){
  motion.capture(player);
  player.z+=dz;
  return motion.sample(player);
 }
 for(let i=0;i<12;i++)step(.1);
 player.face.z=-1;
 assert(step(.03).frame<2);
 const turning=step(-.03);
 assert(turning.frame<2);
 assert(turning.width<.97);
 assert(step(-.08).frame>=2);
 motion.reset(player);
 assert.equal(motion.turn,1);
});

test('a moving camera target follows the same path at 30, 60 and 144 Hz',()=>{
 function follow(hz){
  const player={x:0,z:0},motion=new MotionPresenter(player);
  motion.sample(player,1,0);
  const checkpoints=[];
  for(const speed of [6.2,-6.2,22,0]){
   for(let frame=0;frame<hz/2;frame++){
    motion.capture(player);
    player.x+=speed/hz;
    player.z-=speed/(2*hz);
    motion.sample(player,1,1/hz);
   }
   checkpoints.push({...motion.camera});
  }
  return checkpoints;
 }
 const reference=follow(60);
 for(const hz of [30,144]){
  follow(hz).forEach((camera,i)=>{
   assert(Math.abs(reference[i].x-camera.x)<1e-10);
   assert(Math.abs(reference[i].z-camera.z)<1e-10);
  });
 }
});

test('footfalls follow displayed travel even when render intervals vary',()=>{
 const player={x:0,z:0},motion=new MotionPresenter(player);
 motion.capture(player);player.x=.1;
 motion.sample(player,.2,.012);
 motion.sample(player,.8,.003);
 assert(Math.abs(motion.phase-.08*1.45)<1e-12);
 const before=motion.phase;
 motion.sample(player,.8,.015);
 assert.equal(motion.phase,before);
 player.x=30;
 motion.sample(player,1,.016);
 assert.equal(motion.phase,0);
});
