import test from 'node:test';import assert from 'node:assert/strict';
import {WorldArt,ART_KEYS,PROP_KEYS,visualTerrain} from '../dist/art.js';
import {makeBossModel,bossPose} from '../dist/boss-models.js';
test('shared art falls back while loading and never changes gameplay inputs',()=>{
 const a=new WorldArt({});assert.equal(a.actor('hero0','old'),'old');assert.equal(a.prop('oak'),null);assert.equal(Object.keys(ART_KEYS).length,16);assert.equal(Object.keys(PROP_KEYS).length,16);
 const s={wind:.4,pulse:1,phase:'returnWarn',time:1,hit:.1},before=JSON.stringify(s);const mesh=makeBossModel('ormun',1,.2,-5,3,s);assert.equal(JSON.stringify(s),before);assert(mesh.data.every(Number.isFinite));
});
test('boss meshes have rounded volumetric geometry and bounded detail tiers',()=>{
 for(const kind of ['ormun','belrok']){const full=makeBossModel(kind,0,0,0,0,{phase:'open',time:1}),soft=makeBossModel(kind,0,0,0,0,{phase:'open',time:1},true);assert(full.data.length>soft.data.length);assert(full.data.length<350000);for(const g of [full,soft]){assert.equal(g.data.length%18,0);assert(g.data.every(Number.isFinite));let front=-Infinity,back=Infinity;for(let i=2;i<g.data.length;i+=6){front=Math.max(front,g.data[i]);back=Math.min(back,g.data[i]);}assert(front-back>1.5);}}
});
test('opening and recovery poses interpolate instead of switching doors instantly',()=>{
 const a=bossPose('belrok',2,{phase:'open',time:0}),b=bossPose('belrok',2,{phase:'open',time:.2}),c=bossPose('belrok',2,{phase:'open',time:.5});assert.equal(a.open,0);assert(b.open>0&&b.open<1);assert.equal(c.open,1);
 const late=bossPose('belrok',2,{phase:'returnWarn',time:2.8}),early=bossPose('belrok',2,{phase:'back',time:0});assert.equal(late.arms,early.arms);assert.equal(bossPose('belrok',2,{phase:'back',time:.7}).pressure,0);
});
test('atlas GPU failures preserve fallback art and request CORS',()=>{
 const previous=globalThis.Image,images=[];globalThis.Image=class{constructor(){images.push(this);}set src(v){this.naturalWidth=this.naturalHeight=1254;this.onload();}};
 try{const a=new WorldArt({texture(){throw Error('GPU unavailable');}});assert.equal(a.actorReady,false);assert.equal(a.propReady,false);assert.equal(a.failed.length,2);assert(images.every(i=>i.crossOrigin==='anonymous'));assert.equal(a.actor('hero0','fallback'),'fallback');}finally{if(previous===undefined)delete globalThis.Image;else globalThis.Image=previous;}
});
test('planet palettes vary smoothly without consuming randomness',()=>{for(const name of['garden','harbor']){const a=visualTerrain(2,3,name),b=visualTerrain(2.01,3,name);assert(a.every(x=>x>0&&x<1));assert(Math.max(...a.map((x,i)=>Math.abs(x-b[i])))<.01);}});
