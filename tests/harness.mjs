import fs from 'node:fs';import vm from 'node:vm';
const read=f=>fs.readFileSync(new URL('../dist/'+f,import.meta.url),'utf8');
export function boot(){
 const ids=new Map(),all=[],storage=new Map(),events=new Map();let frame=null,now=0,confirmResult=true,storageFails=false;
 const ctx=new Proxy({createRadialGradient:()=>({addColorStop(){}})},{get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>(t[k]=v,true)});
 const doc={hidden:false,activeElement:null};
 class E{
 constructor(tag='div'){this.tagName=tag.toUpperCase();this._id='';this.children=[];this.parent=null;this.connected=false;this.style={};this.dataset={};this.value='';this.listeners={};this.classes=new Set();this.classList={add:s=>this.classes.add(s),remove:s=>this.classes.delete(s),contains:s=>this.classes.has(s),toggle:(s,v)=>{v??=!this.classes.has(s);v?this.classes.add(s):this.classes.delete(s);}};}
 set id(v){this._id=v;if(this.connected)ids.set(v,this);}get id(){return this._id;}
 append(...nodes){for(const n of nodes){n.remove();n.parent=this;this.children.push(n);n.connect(this.connected);}}
 connect(v){this.connected=v;if(this.id){if(v)ids.set(this.id,this);else ids.delete(this.id);}this.children.forEach(c=>c.connect(v));}
 remove(){if(this.parent){this.parent.children.splice(this.parent.children.indexOf(this),1);this.parent=null;}this.connect(false);}
 focus(){doc.activeElement=this;}addEventListener(t,f){(this.listeners[t]??=[]).push(f);}setPointerCapture(){}
 click(){if(this.disabled)return;this.onclick?.({target:this,preventDefault(){}});this.listeners.click?.forEach(f=>f({target:this}));}
 getContext(){return ctx;}
 }
 class Input extends E{}
 doc.body=new E('body');doc.body.connect(true);doc.createElement=t=>t==='input'?new Input(t):new E(t);doc.getElementById=id=>ids.get(id)||null;
 for(const m of read('index.html').matchAll(/<(canvas|button|input|div|main|aside|section|h1|h2|p|span|i|output|a)\b([^>]*)>/g)){const e=doc.createElement(m[1]),attr=m[2];e.id=attr.match(/\bid="([^"]+)"/)?.[1]||'';for(const k of['action','key']){const v=attr.match(new RegExp('data-'+k+'="([^"]+)"'))?.[1];if(v)e.dataset[k]=v;}for(const c of attr.match(/\bclass="([^"]+)"/)?.[1]?.split(' ')||[])e.classList.add(c);if(e.id||Object.keys(e.dataset).length){doc.body.append(e);all.push(e);}}
 ids.get('sealProgress').append(...Array.from({length:3},()=>new E('span')));
 for(const id of['speaker','dialogText','dialogNext'])ids.get('dialog').append(ids.get(id));
 doc.querySelectorAll=s=>s==='[data-action]'?all.filter(e=>e.dataset.action):all.filter(e=>e.dataset.key);
 doc.addEventListener=(t,f)=>{(events.get('doc:'+t)||events.set('doc:'+t,[]).get('doc:'+t)).push(f);};
 const sandbox={console,Math,JSON,Number,Array,Object,Float32Array,Map,Set,performance:{now:()=>now},innerWidth:1280,innerHeight:720,devicePixelRatio:1,HTMLInputElement:Input,document:doc,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>{if(storageFails)throw Error('quota');storage.set(k,v);},removeItem:k=>storage.delete(k)},confirm:()=>confirmResult,location:{reload(){}},addEventListener:(t,f)=>{if(!events.has(t))events.set(t,[]);events.get(t).push(f);},requestAnimationFrame:f=>frame=f};
 sandbox.window=sandbox;vm.createContext(sandbox);
 const stub='class Geometry{constructor(){this.data=[];}quad(){}tri(){}cone(){}ring(){}disc(){}}class Renderer{constructor(){this.gl={getError:()=>0};this.calls=0;}upload(g){return g;}texture(k){return k;}begin(){}mesh(){}drawDynamic(){}sprite(){}finish(){}}';
 const source=['math.js','story.js','content.js','save.js'].map(read).join('\n')+'\n'+stub+'\n'+read('game.js')+'\nthis.qa={player,state:()=>state,enemies,seals,memories,npc,fracture,obstacles,SCOUT,OLD_SURVEY,ECHO_SITES,BOSS,action,interact,advance,damageEnemy,takeDamage,start,tick,save,restore,draw,updateHUD,setStudy,finalChoice,journal:()=>journal,_dialog:()=>dialog};';
 vm.runInContext(source.replace(/^import .*;\r?\n/gm,'').replace(/\bexport /g,''),sandbox);
 return{a:sandbox.qa,storage,get:id=>ids.get(id)||null,confirm:v=>confirmResult=v,failStorage:v=>storageFails=v,
 emit:(key,type='keydown')=>events.get(type)?.forEach(f=>f({key,target:doc.activeElement,repeat:false,preventDefault(){}})),
 frames:(n,dt=1/60)=>{for(let i=0;i<n;i++){now+=dt*1000;const f=frame;frame=null;f?.(now);}}};
}
export function close(a){let n=0;while(a.state&&aDialog(a)&&!aDialog(a).choice&&n++<100)a.advance();}
function aDialog(a){return a._dialog?.();}
export function move(a,p){a.player.x=p.x+(p===a.fracture?1:1.6);a.player.z=p.z;}

