import test from 'node:test';import assert from 'node:assert/strict';
import {surfaceNormal,surfaceMeshPoint,surfaceSpriteAxes,lookAt} from '../dist/math.js';
import {WorldArt} from '../dist/art.js';import {SoftwareRenderer} from '../dist/software.js';
test('surface gravity is normal to both terrain tangents at every camera offset',()=>{
 for(const [x,z,k]of[[0,0,.012],[20,-25,.012],[-25,8,.025],[30,30,0]]){const n=surfaceNormal(x,z,k);assert(Math.abs(Math.hypot(...n)-1)<1e-12);assert(Math.abs(n[0]-2*k*x*n[1])<1e-12);assert(Math.abs(n[2]-2*k*z*n[1])<1e-12);assert(n[1]>0);}
});
test('a tree top tilts outward while its root stays on the bent surface',()=>{
 const root=surfaceMeshPoint(20,0,-10,0,0,.012),top=surfaceMeshPoint(20,5,-10,0,0,.012);assert.deepEqual(root,[20,-6,-10]);assert(top[0]>root[0]);assert(top[2]<root[2]);assert(Math.abs(Math.hypot(...top.map((v,i)=>v-root[i]))-5)<1e-12);
 assert.deepEqual(surfaceMeshPoint(20,5,-10,0,0,0),[20,5,-10]);
});
test('grounded sprite axes mirror across the planet and stay perpendicular',()=>{
 const a=surfaceSpriteAxes(20,-10,0,0,.012),b=surfaceSpriteAxes(-20,-10,0,0,.012);assert.equal(a.up[0],-b.up[0]);assert.equal(a.up[1],b.up[1]);assert(Math.abs(a.up.reduce((n,v,i)=>n+v*a.right[i],0))<1e-12);
 const flat=surfaceSpriteAxes(0,0,0,0,0);assert.deepEqual(flat.up,[0,1,0]);assert(flat.right.every((v,i)=>v===[1,0,0][i]));
});
test('world decoration requests ground alignment without changing actor billboards',()=>{
 const calls=[],art=new WorldArt({sprite:(...args)=>calls.push(args)});art.propReady=true;art.props[0]='oak';art.drawProp('oak',2,0,4,5);assert.equal(calls[0][7],true);assert.equal(art.actor('hero0','fallback'),'fallback');
});
test('CPU fallback draws a tilted textured tree and preserves ordinary sprites',()=>{
 const r=Object.create(SoftwareRenderer.prototype);Object.assign(r,{view:lookAt([0,18,22],[0,0,-1]),center:[0,0],curve:.012,width:1280,height:720,focal:720/(2*Math.tan(Math.PI/6)),queue:[],calls:0});
 const texture={width:256,height:256};r.sprite(texture,15,0,-10,4,6,1,true);assert.equal(r.queue.length,2);assert(r.queue.every(e=>e.type===2&&!e.additive&&e.points.every(p=>Object.values(p).every(Number.isFinite))));
 const bottom=r.queue[0].points.slice(0,2).reduce((n,p)=>n+p.x/2,0),top=r.queue[1].points.slice(1).reduce((n,p)=>n+p.x/2,0);assert(top>bottom);
 r.queue=[];r.sprite(texture,0,0,0,2,3);assert.equal(r.queue[0].type,1);
});
