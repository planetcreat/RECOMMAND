import test from 'node:test';
import assert from 'node:assert/strict';
import {Geometry} from '../dist/engine.js';
import {buildGardenRoad} from '../dist/environment.js';
const routes=[[[0,11],[0,-10]],[[0,-10],[-19,-20]],[[-19,-20],[22,-33]]];
const height=(x,z)=>Math.sin(x*.13)*Math.cos(z*.11)*.18;
const terrain=()=>[.2,.4,.3];
test('road surface stays grounded and inside the existing cleared corridor',()=>{
 const original=JSON.stringify(routes),g=buildGardenRoad(new Geometry(),routes,{height,terrain});
 assert.equal(JSON.stringify(routes),original);
 for(let i=0;i<g.data.length;i+=6){const [x,y,z,...color]=g.data.slice(i,i+6);assert(g.data.slice(i,i+6).every(Number.isFinite));assert(Math.abs(y-height(x,z)-.018)<1e-9);assert(color.every(v=>v>=0&&v<=1));
 const distance=Math.min(...routes.map(([a,b])=>{const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);}));assert(distance<1.73);
 }
});
test('road generation is deterministic and low detail reduces geometry',()=>{
 const make=soft=>buildGardenRoad(new Geometry(),routes,{height,terrain,soft}).data;
 assert.deepEqual(make(false),make(false));assert(make(true).length<make(false).length*.5);
 assert(make(false).some((v,i)=>i%6>=3&&Math.abs(v-terrain()[i%6-3])<1e-9));
});
test('empty and zero-length roads produce no invalid geometry',()=>{
 assert.equal(buildGardenRoad(new Geometry(),[],{height,terrain}).data.length,0);
 assert.equal(buildGardenRoad(new Geometry(),[[[1,2],[1,2]]],{height,terrain}).data.length,0);
});
