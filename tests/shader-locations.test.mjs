import test from 'node:test';
import assert from 'node:assert/strict';
import {Renderer} from '../dist/engine.js';

test('shader locations are queried once per linked program, including unused uniforms',()=>{
 const renderer=Object.create(Renderer.prototype);
 renderer.locations=new WeakMap();
 let queries=0;
 renderer.gl={
  getUniformLocation(){queries++;return null;},
  getAttribLocation(){queries++;return 0;},
 };
 for(const program of [{},{}]){
  for(let draw=0;draw<100;draw++){
   assert.equal(renderer.location(program,'uView'),null);
   assert.equal(renderer.location(program,'aPos',true),0);
  }
 }
 assert.equal(queries,4);
});
