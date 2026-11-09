import fs from 'node:fs';import vm from 'node:vm';
export function launcherHarness({seenAll=false,failStorage=false,AudioClass,qaScope=''}={}){
 const html=fs.readFileSync(new URL('../release/PLAY-RECOMMAND.html',import.meta.url),'utf8'),code=html.match(/<script>([\s\S]*?)<\/script>/)[1];
 const elements={},events={},messages=[],storage=new Map([['recommand-save-v1','existing-user-save']]);
 if(seenAll)storage.set('recommand-briefing-v1',JSON.stringify({intro:true,yuon:true,swaehae:true,mumyeong:true,hwanseong:true}));
 const element=id=>elements[id]??=( {contentWindow:{postMessage:data=>messages.push(data)},dataset:{},events:{},textContent:'',focus(){this.focused=true;},addEventListener(k,f){this.events[k]=f;},showModal(){this.open=true;},close(){this.open=false;}} );
 const buttons=['yuon','swaehae','mumyeong','hwanseong'].map(chapter=>({dataset:{chapter}}));
 const box={structuredClone,URLSearchParams,document:{getElementById:element,querySelectorAll:()=>buttons,addEventListener:(k,f)=>events['document:'+k]=f},window:{location:{search:qaScope?'?qa='+qaScope:''},addEventListener:(k,f)=>events[k]=f},localStorage:{get length(){return storage.size;},key:i=>[...storage.keys()][i]??null,getItem(k){if(failStorage)throw Error('blocked');return storage.get(k)||null;},setItem(k,v){if(failStorage)throw Error('blocked');storage.set(k,v);},removeItem:k=>storage.delete(k)},setTimeout:()=>1,clearTimeout(){}};
 if(AudioClass)box.window.Audio=AudioClass;
 vm.createContext(box);vm.runInContext(code,box);return{html,code,elements,events,buttons,storage,messages};
}
