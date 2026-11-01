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
