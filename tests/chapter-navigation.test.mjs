import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {standaloneQa} from '../dist/storage-scope.js';

const outputs=['RECOMMAND.html','SWAEHAE.html','MUMYEONG.html','HWANSEONG.html'];
test('standalone QA scopes saves and carries its renderer and name to the next file',()=>{
 const raw=new Map([['save','original']]);
 const store={getItem:key=>raw.get(key),setItem:(key,value)=>raw.set(key,value)};
 const link={href:'MUMYEONG.html',getAttribute(){return this.href;},setAttribute(_,value){this.href=value;}};
 const document={documentElement:{dataset:{}},querySelectorAll:()=>[link],
  createElement:()=>({setAttribute(){},style:{}}),body:{append(){}}};
 assert.equal(standaloneQa(document,{search:'?renderer=software'},store).storage,store);
 assert.deepEqual(document.documentElement.dataset,{});
 const qa=standaloneQa(document,{search:'?qa=deck&renderer=software'},store);
 qa.storage.setItem('save','isolated');
 assert.equal(qa.storage.getItem('save'),'isolated');
 assert.equal(raw.get('save'),'original');
 assert.equal(raw.get('recommand-qa:deck:save'),'isolated');
 assert.equal(document.documentElement.dataset.qaRenderer,'software');
 assert.equal(link.href,'MUMYEONG.html?qa=deck&renderer=software');
 assert.equal(qa.href('HWANSEONG.html'),'HWANSEONG.html?qa=deck&renderer=software');
});

test('invalid standalone QA replaces the entire game with Korean guidance before touching storage',()=>{
 for(const search of ['?qa=one&qa=two','?qa=','?qa=Uppercase']){
  let screen;
  const document={documentElement:{dataset:{}},createElement:()=>({setAttribute(){},style:{},append(...children){this.children=children;}}),
   body:{replaceChildren(value){screen=value;}}};
  const storage=new Proxy({}, {get(){assert.fail('Blocked QA page touched storage');}});
  assert.equal(standaloneQa(document,{search},storage),null);
  assert.equal(document.documentElement.dataset.qaBlocked,'true');
  assert.equal(screen.id,'qaAddressError');
  assert.match(screen.children[1].textContent,/\?qa=이름/);
 }
});

test('standalone previous-planet links point to shipped case-sensitive HTML files',()=>{
 for(const file of outputs){
  const html=fs.readFileSync(new URL('../release/'+file,import.meta.url),'utf8');
  for(const [,href]of html.matchAll(/href="([^"#:/]+\.html)"/g)){
   assert(fs.existsSync(new URL('../release/'+href,import.meta.url)),file+' points to missing '+href);
  }
 }
});

test('launcher previous-link bridge routes plain links and respects chapter-owned navigation',()=>{
 const html=fs.readFileSync(new URL('../release/PLAY-RECOMMAND.html',import.meta.url),'utf8');
 const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
 const chapters=JSON.parse(script.slice('const chapters='.length,script.indexOf(',assets=')));
 for(const [chapter,target]of [['swaehae','yuon'],['mumyeong','swaehae'],['hwanseong','mumyeong']]){
  const page=chapters[chapter];
  const bridge=[...page.matchAll(/<script>([\s\S]*?)<\/script>/g)].find(m=>m[1].includes('recommand-child-ready'))[1];
  let click,prevented=false;const messages=[];
  vm.runInNewContext(bridge,{window:{addEventListener(){}},document:{addEventListener:(type,f)=>{if(type==='click')click=f;}},parent:{postMessage:m=>messages.push(m)}});
  click({target:{closest:selector=>{
   if(selector==='[data-return-yuon]')return page.includes('data-return-yuon')?{}:null;
   if(selector==='[data-return-chapter]'){const match=page.match(/href="#" data-return-chapter="([a-z]+)"/);return match?{dataset:{returnChapter:match[1]}}:null;}
   throw Error('Unexpected delegated selector: '+selector);
  }},preventDefault:()=>prevented=true});
  assert(prevented,chapter+' previous link must stay inside the launcher');assert.equal(messages.length,1);assert.equal(messages[0].type,'recommand-switch');assert.equal(messages[0].chapter,target);
  messages.length=0;
  click({defaultPrevented:true,target:{closest:()=>({dataset:{returnChapter:target}})},preventDefault(){}});
  assert.equal(messages.length,0,'chapter dialogue/travel handlers retain control after preventDefault');
 }
});

test('shipped story transitions save and route inside the launcher or keep the standalone QA address',()=>{
 const html=fs.readFileSync(new URL('../release/PLAY-RECOMMAND.html',import.meta.url),'utf8');
 const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
 const chapters=JSON.parse(script.slice('const chapters='.length,script.indexOf(',assets=')));
 for(const [chapter,file,saveName,next,destination]of [
  ['yuon','RECOMMAND.html','save','swaehae','SWAEHAE.html'],
  ['swaehae','SWAEHAE.html','saveSea','mumyeong','MUMYEONG.html']
 ]){
  for(const embedded of [true,false]){
   const page=embedded?chapters[chapter]:fs.readFileSync(new URL('../release/'+file,import.meta.url),'utf8');
   const transition=page.match(new RegExp('(?:=>\\{)('+saveName+'\\(\\);[^\\r\\n]*?'+destination.replace('.','\\.')+"'\\);)"));
   assert(transition,chapter+' story callback missing from built artifact');
   const events=[],location={set href(value){events.push(value);}};
   const parent={postMessage(message){events.push(message.type+':'+message.chapter);}};
   const window={};window.parent=embedded?parent:window;
   const standaloneRun={href:target=>target+'?qa=journey&renderer=software'};
   vm.runInNewContext(transition[1],{window,parent,location,standaloneRun,[saveName]:()=>events.push('save')});
   assert.deepEqual(events,['save',embedded?'recommand-switch:'+next:destination+'?qa=journey&renderer=software']);
  }
 }
});
