import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const outputs=['RECOMMAND.html','SWAEHAE.html','MUMYEONG.html','HWANSEONG.html'];
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
