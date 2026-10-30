import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {boot} from './harness.mjs';
test('single-file launcher parses, switches both embedded chapters and reports ready/errors',()=>{
 const html=fs.readFileSync(new URL('../release/PLAY-RECOMMAND.html',import.meta.url),'utf8'),code=html.match(/<script>([\s\S]*?)<\/script>/)[1];new vm.Script(code);
 const elements={gameFrame:{contentWindow:{},focus(){this.focused=true;}},launcherStatus:{},welcome:{}},events={},buttons=['yuon','swaehae'].map(chapter=>({dataset:{chapter}}));
 const box={document:{getElementById:id=>elements[id],querySelectorAll:()=>buttons},window:{addEventListener:(k,fn)=>events[k]=fn},setTimeout:()=>1,clearTimeout(){}};vm.createContext(box);vm.runInContext(code,box);
 buttons[0].onclick();let child=elements.gameFrame.srcdoc;assert(child.includes('parent.postMessage'));assert(!child.includes("location.href='SWAEHAE.html'"));assert(!/<script[^>]+src=|<link[^>]+href=/i.test(child));
 for(const m of child.matchAll(/<script(?: type="module")?>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
 events.message({source:{},data:{type:'recommand-switch',chapter:'swaehae'}});assert.equal(elements.gameFrame.srcdoc,child);
 events.message({source:elements.gameFrame.contentWindow,data:{type:'recommand-switch',chapter:'swaehae'}});child=elements.gameFrame.srcdoc;assert(child.includes('data-return-yuon'));assert(!/<script[^>]+src=|<link[^>]+href=/i.test(child));
 for(const m of child.matchAll(/<script(?: type="module")?>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
 events.message({source:elements.gameFrame.contentWindow,data:{type:'recommand-child-ready',chapter:'swaehae'}});assert.equal(elements.launcherStatus.hidden,true);
 events.message({source:elements.gameFrame.contentWindow,data:{type:'recommand-child-error',chapter:'swaehae',message:'test error'}});assert.equal(elements.launcherStatus.hidden,false);assert.match(elements.launcherStatus.textContent,/test error/);
 assert.equal((child.match(/data:image\/png;base64,/g)||[]).length,3);
});
test('boot guard shows load errors and clears the error panel when startup succeeds',()=>{
 const listeners={},ids={},root={dataset:{}},body={append(e){ids[e.id]=e;}};const document={documentElement:root,body,querySelector:()=>null,getElementById:id=>ids[id],createElement:()=>({style:{},setAttribute(){},append(...nodes){for(const n of nodes)if(n.id)ids[n.id]=n;},remove(){delete ids[this.id];}})};
 const box={window:{addEventListener:(k,fn)=>listeners[k]=fn},document,location:{protocol:'https:'},setTimeout:()=>1};vm.createContext(box);vm.runInContext(fs.readFileSync(new URL('../dist/boot.js',import.meta.url),'utf8'),box);
 listeners.error({target:{tagName:'SCRIPT'}});assert(ids.loadFailure);assert.match(ids.loadFailureReason.textContent,/PLAY-RECOMMAND/);listeners['recommand-ready']();assert.equal(root.dataset.recommandReady,'true');assert.equal(ids.loadFailure,undefined);
});
test('missing or invalid saves explain failure and never erase the existing save',()=>{
 const h=boot();h.a.start(true);assert.match(h.get('toast').textContent,/저장된 기록이 없습니다/);assert.equal(h.storage.size,0);
 h.storage.set('recommand-save-v1','{broken');h.a.start(true);assert.equal(h.storage.get('recommand-save-v1'),'{broken');assert.match(h.get('toast').textContent,/기록 확인/);
});
