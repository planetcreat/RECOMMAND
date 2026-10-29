import {Renderer,Geometry} from './engine.js';
import {SoftwareRenderer} from './software.js';
import {snapshot,decode} from './save.js';
import {PLANETS,BOSS,SCOUT,OLD_SURVEY,ECHO_SITES,canOfferSurvey,beginPulseSequence,advancePulseSequence} from './content.js';
import {clamp,distance,normalize,inSector,resolveMove,seeded} from './math.js';
import {canRewrite,discoveredTriggers} from './story.js';
import {CombatVFX} from './vfx.js';
import {decorateGarden} from './environment.js';
const $=id=>document.getElementById(id),TAU=Math.PI*2,SAVE='recommand-save-v1';
let R;let hardwareWarning='';
try{R=new Renderer($('world'));R.backend='webgl';}catch(e){hardwareWarning=e.message;const canvas=document.createElement('canvas');canvas.id='world';canvas.tabIndex=0;canvas.setAttribute('aria-label','행성 탐험 게임');$('world').replaceWith(canvas);R=new SoftwareRenderer(canvas);}
const terrainRand=seeded(2872),SOFT=R.backend==='software';if(SOFT)Geometry.lowDetail=true;
const rand=seeded(2871), keys=new Set(), obstacles=[], particles=[], effects=[];
const player={x:0,z:7,hp:100,xp:0,face:{x:0,z:-1},attack:0,dash:0,skill:0,inv:0,walk:0,dashTime:0};
const npc={x:3,z:0},portal={x:0,z:11},fracture={x:9,z:-5};
const seals=[{x:-19,z:-20,name:'뿌리의 제단'},{x:22,z:-33,name:'바람의 제단'},{x:-14,z:-55,name:'기억의 제단'}];
const memories=[{x:22,z:-9,name:'쓰러진 기록석',text:'[이전 명령: 생태계 보존을 위해 거주민 접근을 차단한다.]\n차가운 문장 아래, 누군가 같은 필체로 덧붙였다.\n“보호와 감금은 무엇이 다른가?”'},{x:-32,z:-41,name:'낡은 관측기',text:'장치가 당신의 손에 반응한다.\n[명령권자 생체 서명 일치. 재명령 대기.]\n당신은 손을 뗀다. 처음 보는 장치인데, 사용법을 알고 있었다.'}];
let state={quest:0,seals:[false,false,false],memories:[false,false],bond:false,fracture:false,boss:false,complete:false,ending:null,sidequest:0,echoes:[false,false],intel:false,surveyRecord:false,anomaly:false},started=false,paused=false,study=false,dialog=null,curve=.012,debug=false,grid=false,mapBig=false,time=0,toastTime=0,lastSave=0;
let journal=[],storageWarning=false,contextLost=false;
let audio;function sound(freq=500,dur=.08,type='sine',gain=.035){try{audio??=new(window.AudioContext||window.webkitAudioContext)();const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(40,freq*.6),audio.currentTime+dur);g.gain.setValueAtTime(gain,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+dur);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+dur);}catch{}}
function toast(t){$('toast').textContent=t;toastTime=4;$('toast').style.opacity=1;}
function save(){
 if(!started)return false;
 try{const next=JSON.stringify(snapshot(state,player,enemies,journal)),previous=localStorage.getItem(SAVE);
 if(previous&&previous!==next){try{decode(previous,enemies);localStorage.setItem(SAVE+'.backup',previous);}catch{}}
 localStorage.setItem(SAVE,next);storageWarning=false;return true;
 }catch{if(!storageWarning)toast('자동 저장을 사용할 수 없습니다. 진행 내보내기로 보관해 주세요.');storageWarning=true;return false;}
}
function applySave(data){
 state=data.state;Object.assign(player,data.player);player.inv=1;player.attack=player.dash=player.skill=player.dashTime=0;keys.clear();effects.length=particles.length=0;journal=data.journal;
 for(const e of enemies){Object.assign(e,data.enemies.find(v=>v.id===e.id));e.wind=0;e.sequence=false;e.pulse=0;e.cd=1;e.hit=0;if(obstacles.some(o=>distance(e,o)<=o.r+.42)){e.x=e.home.x;e.z=e.home.z;}}
 if(obstacles.some(o=>distance(player,o)<=o.r+.42)){player.x=0;player.z=7;}
}
function restore(){
 for(const key of [SAVE,SAVE+'.backup']){try{const raw=localStorage.getItem(key);if(!raw)continue;const data=decode(raw,enemies);applySave(data);if(key.endsWith('.backup'))toast('이전 자동 저장으로 복구했습니다.');return true;}catch{}}
 return false;
}
function showDialog(name,lines,after,{record=true}={}){
 keys.clear();$('choices')?.remove();$('dialogNext').classList.remove('hidden');dialog={name,lines,index:0,after};$('speaker').textContent=name;$('dialogText').textContent=lines[0];$('dialog').classList.remove('hidden');
 if(record&&!journal.some(e=>e.name===name&&e.lines[0]===lines[0])){journal.push({name,lines:[...lines]});if(journal.length>100)journal.shift();save();}
 $('dialogNext').focus({preventScroll:true});
}
function advance(){if(!dialog||dialog.choice)return;if(++dialog.index<dialog.lines.length){$('dialogText').textContent=dialog.lines[dialog.index];sound(450,.035);}else{const cb=dialog.after;dialog=null;$('dialog').classList.add('hidden');cb?.();if(!dialog)$('world').focus({preventScroll:true});save();}}
function offerSurvey(){
 $('dialog').classList.remove('hidden');
 dialog={choice:true,name:'기록에 없던 울림',index:0};keys.clear();$('speaker').textContent='기록에 없던 울림';$('dialogText').textContent='오래된 기록에 없던 현상을 조사한다.';$('dialogNext').classList.add('hidden');
 const box=document.createElement('div');box.id='choices';
 for(const [text,accept] of [['두 진동목을 조사한다',true],['지금은 지나간다',false]]){const b=document.createElement('button');b.textContent=text;b.onclick=()=>{box.remove();$('dialogNext').classList.remove('hidden');$('dialog').classList.add('hidden');dialog=null;keys.clear();$('world').focus();if(accept){state.sidequest=1;save();toast('선택 의뢰 · 기록에 없던 울림');}};box.append(b);}
 $('dialog').append(box);box.children[0].focus();
}
function finalChoice(){
 $('choices')?.remove();
 dialog={choice:true,name:'재명령',index:0};keys.clear();$('speaker').textContent='RE:COMMAND · 명령권자 확인';
 $('dialogText').textContent=canRewrite(state)?'기록석의 빈 칸과 갈라진 연결부. 루미의 대답. 따로 남아 있던 기억들이 하나의 방법으로 이어진다.':'기존의 보호 명령이 떠오른다. 공격 지시를 멈출 권한은 남아 있다.';
 $('dialogNext').classList.add('hidden');$('dialog').classList.remove('hidden');
 const box=document.createElement('div');box.id='choices';
 const add=(text,enabled,fn)=>{const b=document.createElement('button');b.textContent=text;b.disabled=!enabled;b.onclick=()=>{box.remove();$('dialogNext').classList.remove('hidden');dialog=null;fn();};box.append(b);return b;};
 add('기존 보존 체계를 유지하고, 공격 명령만 중지한다',true,()=>finishEnding(false));
 if(canRewrite(state))add('루미와 함께 주민들의 의사를 연결해, 명령을 다시 쓴다',true,()=>finishEnding(true)).classList.add('alternative');
 add('아직 결정하지 않는다',true,()=>{$('dialog').classList.add('hidden');});
 $('dialog').append(box);box.children[0].focus({preventScroll:true});
}
function finishEnding(rewrite){
 state.complete=true;state.quest=2;state.ending=rewrite?'rewrite':'preserve';save();
 showDialog(rewrite?'새로운 명령 · 함께 결정한다':'남겨진 명령 · 안전한 정지',rewrite?[
 '루미가 말한다. “명령을 내리는 사람 말고, 대답을 듣는 사람이 되어 주면 안 돼요?”\n기록석의 빈 칸과 관측기의 회선이 하나의 방법으로 이어진다.',
 '[RE:COMMAND]\n“누구도 대신 결정하지 않는다. 각 정착지의 응답으로 보호 경계를 다시 정의한다.”\n지킬 수 있다는 확신 대신, 함께 책임질 방법을 택한다.',
 '루미는 당신의 손을 놓지 않는다.\n“다음 별에서는, 처음부터 물어봐요.”\n유온의 경계가 열렸다. — 대안 선택 완료'
 ]:[
 '[공격 명령 중지. 기존 보존 경계 유지.]\n숲의 생명들이 조용해진다. 주민들은 안전해졌지만, 숲 밖으로 나가는 문은 여전히 닫혀 있다.',
 '루미는 한동안 당신의 손을 바라본다.\n“이번에는 아무도 다치지 않았네요. 그런데…… 우리가 어디로 가고 싶은지는 안 물어보네요.”',
 '유온는 잠시 평온해졌다.\n관문 너머에서 다른 별의 신호가 들려온다.'
 ],()=>toast('첫 행성 구간 완료 · 관문에서 다음 별의 신호를 확인하세요.'));
}
const groundY=(x,z)=>Math.sin(x*.13)*Math.cos(z*.11)*.18;
const combatVFX=new CombatVFX(R,groundY);
const roads=[[[0,11],[0,-10]],[[0,-10],[-19,-20]],[[-19,-20],[22,-33]],[[22,-33],[-14,-55]],[[-14,-55],[13,-69]]];
function segmentDistance(x,z,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],t=clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz),0,1);return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);}
const pathDist=(x,z)=>Math.min(...roads.map(([a,b])=>segmentDistance(x,z,a,b)));
const ground=new Geometry(),props=new Geometry(),gridGeo=new Geometry();
const groundStep=SOFT?5:2;
for(let x=-95;x<95;x+=groundStep)for(let z=-95;z<95;z+=groundStep){
 const step=groundStep,p=pathDist(x+step/2,z+step/2),v=terrainRand()*.035,c=(!SOFT&&p<2.8)?[.43+v,.48+v,.32+v]:[.23+v,.39+v,.27+v];
 ground.quad([x,groundY(x,z),z],[x+step,groundY(x+step,z),z],[x+step,groundY(x+step,z+step),z+step],[x,groundY(x,z+step),z+step],c);
 if(x%5===0&&z%5===0){gridGeo.quad([x,.22,z],[x+.035,.22,z],[x+.035,.22,z+5],[x,.22,z+5],[.56,.67,.49]);gridGeo.quad([x,.22,z],[x+5,.22,z],[x+5,.22,z+.035],[x,.22,z+.035],[.56,.67,.49]);}
}
function shadow(g,x,z,r){g.disc(x,groundY(x,z)+.025,z,r,[.16,.29,.22]);}
for(let i=0;i<360;i++){
 const x=rand()*166-83,z=rand()*166-83;
 if(pathDist(x,z)<4||Math.hypot(x,z)<8||distance({x,z},fracture)<2.5||distance({x,z},SCOUT)<3||distance({x,z},OLD_SURVEY)<2.5||ECHO_SITES.some(e=>distance({x,z},e)<3)||seals.some(s=>distance({x,z},s)<6)||distance({x,z},{x:13,z:-69})<8||memories.some(s=>distance({x,z},s)<3))continue;
 const h=3+rand()*3,r=1+rand()*.9;obstacles.push({x,z,r:.6});shadow(props,x+.6,z+.5,r*1.1);
 props.cone(x,groundY(x,z),z,.24,h*.45,[.28,.28,.19],6,.17);
 const col=rand()>.3?[.18,.35,.28]:[.33,.44,.28];
 if(SOFT)props.cone(x,h*.22,z,r,h*.88,col,4);else{props.cone(x,h*.22,z,r,h*.64,col);props.cone(x,h*.47,z,r*.76,h*.53,col.map(v=>v*1.12));props.cone(x,h*.7,z,r*.49,h*.4,col.map(v=>v*1.23));}
}
for(let i=0;i<370;i++){const x=rand()*160-80,z=rand()*160-80;if(pathDist(x,z)<2||distance({x,z},OLD_SURVEY)<2||ECHO_SITES.some(e=>distance({x,z},e)<2))continue;const y=groundY(x,z);if(i%3===0){props.cone(x,y,z,.3+rand()*.45,.3+rand()*.5,[.37,.45,.39],5,.12);}else{const c=i%4===0?[.72,.68,.37]:[.31,.5,.32];props.cone(x,y,z,.13,.32,c,4);}}
for(const s of [...seals,...memories,...ECHO_SITES]){
 const y=groundY(s.x,s.z);if(ECHO_SITES.includes(s)){props.cone(s.x,y,s.z,.7,1.7,[.34,.32,.23],8,.46);props.disc(s.x,y+1.71,s.z,.39,[.13,.23,.19]);props.ring(s.x,y+1.72,s.z,.46,[.49,.47,.31],32,.08);obstacles.push({x:s.x,z:s.z,r:.8});continue;}props.cone(s.x,y,s.z,1.6,.22,[.37,.43,.36],8,1.5);props.cone(s.x,y+.22,s.z,.52,1.6,[.36,.51,.47],5,.34);props.cone(s.x,y+1.82,s.z,.34,.45,[.58,.72,.63],5);
 obstacles.push({x:s.x,z:s.z,r:.75});
}
props.disc(0,.08,11,3,[.35,.43,.36]);props.ring(0,.1,11,2.7,[.74,.73,.48],64,.12);
for(const x of[-2.6,2.6]){props.cone(x,.15,11,.5,3.5,[.38,.47,.4],6,.35);props.cone(x,3.65,11,.48,.8,[.66,.75,.51],6);obstacles.push({x,z:11,r:.5});}
props.cone(OLD_SURVEY.x,groundY(OLD_SURVEY.x,OLD_SURVEY.z),OLD_SURVEY.z,.9,.4,[.4,.47,.39],6,.8);obstacles.push({...OLD_SURVEY,r:.7});
const roadGeo=new Geometry();for(const[a,b]of roads){const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),nx=-dz/len*1.45,nz=dx/len*1.45;for(let t=0;t<len;t+=2){const t2=Math.min(len,t+2),point=(t,side)=>{const x=a[0]+dx*t/len+nx*side,z=a[1]+dz*t/len+nz*side;return[x,groundY(x,z)+.08,z];};roadGeo.quad(point(t,-1),point(t,1),point(t2,1),point(t2,-1),[.43,.48,.32]);}}const roadMesh=R.upload(roadGeo);
const gardenLamps=decorateGarden(props,{height:groundY,pathDistance:pathDist,routes:roads,landmarks:[npc,portal,fracture,SCOUT,OLD_SURVEY,...ECHO_SITES,...memories,...seals.map(p=>({...p,clearance:8})),{x:13,z:-69,clearance:9}],obstacles,soft:SOFT});
const worldMesh=R.upload(ground),propMesh=R.upload(props),gridMesh=R.upload(gridGeo);
// A quiet environmental clue: no marker, no label, no objective counter.
const brokenGeo=new Geometry();brokenGeo.cone(fracture.x,groundY(fracture.x,fracture.z),fracture.z,.62,.9,[.37,.45,.39],5,.4);
brokenGeo.quad([8.82,.92,-5.37],[8.88,.92,-5.37],[9.1,.92,-4.73],[9.04,.92,-4.73],[.22,.34,.31]);
const brokenMesh=R.upload(brokenGeo);obstacles.push({...fracture,r:.35});
function sprite(kind,variant=0,frame=0,back=false){
 return R.texture(kind+variant+'-'+frame+'-'+back,(c)=>{
 const ellipse=(x,y,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill();};
 if(kind==='hero'||kind==='npc'){
 const npc=kind==='npc',step=frame?4:-4;
 // Each cached canvas is a genuine transparent 2D sprite, billboarded in 3D.
 ellipse(64,116,25,7,'#153b3580');c.fillStyle='#23343b';c.fillRect(45,93,13,23+step*.4);c.fillRect(69,93,13,23-step*.4);
 c.fillStyle=npc?(variant?'#a38d68':'#bdb58c'):'#9db4a0';c.beginPath();c.moveTo(45,54);c.lineTo(83,54);c.lineTo(92,101);c.lineTo(37,101);c.closePath();c.fill();
 c.fillStyle=npc?'#5b8684':'#3e7071';c.beginPath();c.moveTo(48,56);c.lineTo(80,56);c.lineTo(85,96);c.lineTo(63,104);c.lineTo(39,96);c.fill();
 c.fillStyle='#c9af84';c.fillRect(33,67,11,23);c.fillRect(84,66,10,22);
 ellipse(64,39,24,26,'#243c42');ellipse(64,43,18,20,'#ecd3a2');
 c.fillStyle=npc?'#d3d6b8':'#263f46';c.beginPath();c.moveTo(40,34);c.lineTo(45,17);c.lineTo(72,12);c.lineTo(88,29);c.lineTo(80,45);c.lineTo(70,30);c.lineTo(61,40);c.lineTo(54,32);c.lineTo(44,46);c.fill();
 if(!back){c.fillStyle='#283e3e';c.fillRect(54,44,4,5);c.fillRect(71,44,4,5);}
 else{ellipse(64,37,21,23,npc?'#c9cfb3':'#263f46');}
 c.fillStyle='#e1ce83';c.fillRect(46,59,36,6);
 if(!npc){c.save();c.translate(92,70);c.rotate(-.4);c.fillStyle='#d4e5c8';c.fillRect(-3,-21,6,39);c.fillStyle='#b8a56f';c.fillRect(-10,17,20,5);c.fillStyle='#5d5145';c.fillRect(-3,22,6,11);c.restore();}
 else{c.fillStyle='#755f40';c.fillRect(99,32,5,78);ellipse(101,29,9,12,'#d9e6ad');}
 }else if(kind==='slime'){
 const colors=[['#315862','#759b96'],['#5c4e72','#aa88b0'],['#686d47','#a6b57b']][variant%3];
 ellipse(64,113,39,9,'#163d3580');ellipse(64,80+frame*2,38,30-frame*2,colors[0]);ellipse(61,73+frame*2,31,27-frame*2,colors[1]);ellipse(47,64,9,4,'#e2ebcd66');c.fillStyle='#233b3e';c.fillRect(47,79,6,8);c.fillRect(75,79,6,8);c.fillStyle='#ddc7a0';c.fillRect(58,94,12,3);
 c.fillStyle='#cc8cc3';c.beginPath();c.moveTo(76,52);c.lineTo(88,22);c.lineTo(98,53);c.fill();
 }else if(kind==='boss'){
 ellipse(64,119,43,7,'#143a3a80');c.fillStyle='#304d52';c.fillRect(32,85,19,31);c.fillRect(77,85,19,31);
 ellipse(64,69,38,39,'#5e7c72');ellipse(64,65,29,31,'#87a78f');c.fillStyle='#c5d7b0';c.fillRect(36,49,56,10);c.fillStyle='#e7cc8c';c.fillRect(45,52,8,5);c.fillRect(77,52,8,5);
 c.fillStyle='#364d49';c.fillRect(15,61,18,36);c.fillRect(96,61,18,36);
 for(const [x,y]of[[30,34],[95,30],[60,22]]){c.fillStyle='#91b89a';c.beginPath();c.moveTo(x-10,y+20);c.lineTo(x,y-18);c.lineTo(x+9,y+20);c.fill();}
 ellipse(65,78,8,10,'#ecd18c');
 }else if(kind==='glow'){const g=c.createRadialGradient(64,64,0,64,64,60);g.addColorStop(0,'#fff8ccee');g.addColorStop(.15,'#e7eeb399');g.addColorStop(1,'#c9edab00');c.fillStyle=g;c.fillRect(0,0,128,128);}
 });
}
const heroSprites=[sprite('hero',0,0,false),sprite('hero',0,1,false),sprite('hero',0,0,true),sprite('hero',0,1,true)],npcTex=sprite('npc'),scoutTex=sprite('npc',1),bossTex=sprite('boss'),glowTex=sprite('glow');
const slimeTextures=Array.from({length:3},(_,i)=>[sprite('slime',i,0),sprite('slime',i,1)]);
function label(text,color='#e8e5bd'){return R.texture('label'+text,(c,w,h)=>{c.font='500 22px "Malgun Gothic",sans-serif';c.textAlign='center';c.shadowColor='#0b2529';c.shadowBlur=5;c.fillStyle=color;c.fillText(text,w/2,34);},512,64);}
const labels={scout:label(SCOUT.name),survey:label(OLD_SURVEY.name),echoes:ECHO_SITES.map(e=>label(e.name)),npc:label('루미 · 기록자'),portal:label('별의 관문'),boss:label(BOSS.name,'#f0d39b'),seals:seals.map(s=>label(s.name)),memories:memories.map(s=>label(s.name))};
const enemies=[];
for(let i=0;i<3;i++)for(let j=0;j<3;j++){const a=j/3*TAU;enemies.push({id:i*3+j,x:seals[i].x+Math.cos(a)*4,z:seals[i].z+Math.sin(a)*4,home:{x:seals[i].x+Math.cos(a)*4,z:seals[i].z+Math.sin(a)*4},hp:48,max:48,type:i,wind:0,cd:.5,jitter:j,hit:0});}
const boss={id:99,x:13,z:-69,home:{x:13,z:-69},hp:300,max:300,type:3,wind:0,cd:2,hit:0};enemies.push(boss);
for(let i=0;i<5;i++){const x=(rand()-.5)*22,z=-8-rand()*12;enemies.push({id:20+i,x,z,home:{x,z},hp:36,max:36,type:0,wind:0,cd:1,jitter:i,hit:0});}
function burst(x,z,color,n=14){for(let i=0;i<n;i++){const a=rand()*TAU,s=1+rand()*3;particles.push({x,z,y:.6,vx:Math.cos(a)*s,vz:Math.sin(a)*s,vy:2+rand()*2,life:.5+rand()*.6,color});}}
function damageEnemy(e,amount){if(e.hp<=0)return;e.hp=Math.max(0,e.hp-amount);e.hit=.17;effects.push({kind:'impact',x:e.x,z:e.z,life:.32,max:.32,boss:e===boss,angle:Math.atan2(player.face.z,player.face.x)});burst(e.x,e.z,[.85,.79,.49],7);sound(180+rand()*100,.07,'triangle');if(!e.hp){player.xp+=e.type===3?100:15;player.hp=Math.min(100,player.hp+8);burst(e.x,e.z,[.65,.84,.6],20);if(e===boss){state.boss=true;toast('수호자의 명령이 멈췄다. 다가가 E로 기억을 확인하세요.');}else toast('기억의 빛 +15 · 생명력 +8');save();}}
function takeDamage(n){if(player.inv>0)return;player.hp-=n;player.inv=.85;sound(100,.2,'sawtooth',.025);burst(player.x,player.z,[.83,.4,.35],10);if(player.hp<=0){player.x=0;player.z=7;player.hp=100;player.dashTime=0;player.inv=1.5;keys.clear();boss.hp=state.boss?0:boss.max;for(const e of enemies){e.x=e.home.x;e.z=e.home.z;e.wind=0;e.sequence=false;e.pulse=0;e.cd=1;}toast('관문이 당신을 불러냈다. 기억은 사라지지 않았다.');save();}}
function action(name){
 if(name==='interact'){interact();return;}if(!started||paused||study||dialog||contextLost)return;
 if(name==='attack'&&player.attack<=0){player.attack=.38;const a=Math.atan2(player.face.z,player.face.x);effects.push({kind:'slash',x:player.x,z:player.z,angle:a,life:.32,max:.32});for(const e of enemies)if(e.hp>0&&(e!==boss||state.seals.every(Boolean))&&inSector(player,e,player.face))damageEnemy(e,20+Math.floor(player.xp/60)*2);sound(650,.07,'triangle');}
 if(name==='dash'&&player.dash<=0){player.dash=1.6;player.dashTime=.2;player.inv=Math.max(player.inv,.25);sound(300,.12,'sine');}
 if(name==='skill'&&player.skill<=0){player.skill=5;effects.push({kind:'wave',x:player.x,z:player.z,life:.75,max:.75});for(const e of enemies)if(e.hp>0&&(e!==boss||state.seals.every(Boolean))&&distance(player,e)<=6)damageEnemy(e,36);sound(750,.4,'sine');}
}
function nearest(){const all=[{...npc,kind:'npc',name:'루미'},{...SCOUT,kind:'scout',name:SCOUT.name},{...OLD_SURVEY,kind:'survey',name:OLD_SURVEY.name},...ECHO_SITES.map((s,i)=>({...s,kind:'echo',i})),{...portal,kind:'portal',name:'별의 관문'},...seals.map((s,i)=>({...s,kind:'seal',i})),...memories.map((s,i)=>({...s,kind:'memory',i})),{x:13,z:-69,kind:'boss',name:'수호자의 기억'}];if(distance(player,fracture)<1.3)all.push({...fracture,kind:'fracture',name:'갈라진 연결부'});return all.sort((a,b)=>distance(player,a)-distance(player,b)).find(o=>distance(player,o)<3.8);}
function interact(){
 if(!started||paused||study||contextLost)return;if(dialog){advance();return;}const o=nearest();if(!o)return;
 if(o.kind==='npc'){
 if(state.quest>0&&state.memories.some(Boolean)&&!state.bond){showDialog('루미 · 남겨진 대화',['기록을 봤군요. 당신은 제가 명령을 따르는 기록 장치라고 생각하나요?\n처음에는 저도 그렇게 생각했어요.','하지만 오늘은 숲의 소리보다 당신 발소리가 먼저 들렸어요.\n당신이 돌아오지 않을까 봐, 기록을 세 번이나 잘못 썼거든요.','당신은 목적지를 묻는 대신, 루미가 어디로 가고 싶은지 묻는다.\n“아직 모르겠어요. 같이 찾아도 되나요?”\n명령 목록에 없던 대답이 기록된다.'],()=>{state.bond=true;save();toast('루미와의 대화가 기억에 남았다.');});return;}
 if(state.quest===0)showDialog('루미 · 숲의 기록자',['깨어났군요. 이곳은 유온. 한때 스스로 숨 쉬던 별이었어요.\n지금은 수호 장치가 숲의 생명들을 공격하고 있어요.','길을 따라 세 제단을 찾아 주세요. 주변의 뒤틀린 생명을 진정시킨 뒤, 제단에 손을 대면 됩니다.\nJ 검격 · K/Space 회피 · L 별의 파동','이상하네요. 당신에게 처음 부탁하는 일인데……\n오래전에 같은 대답을 들은 것 같아요.'],()=>{state.quest=1;toast('세 제단을 정화하세요. 지도에서 금빛 마름모를 찾으세요.');});
 else showDialog('루미',[state.complete?'당신은 숲을 살렸어요. 하지만 다른 별들은 아직 이전의 명령 아래 잠들어 있어요.':state.seals.every(Boolean)?'북쪽, 오래된 수호자가 눈을 떴어요.\n먼저 공격 신호를 보고 피하세요. 커다란 원이 차오르면 충격파가 옵니다.':'세 제단은 길을 따라 이어져 있어요.\n숲 바깥의 기록도 살펴보세요. 제단과는 다른 진실이 남아 있을지 몰라요.']);
 }
 if(o.kind==='survey'){state.surveyRecord=true;showDialog(OLD_SURVEY.name,[OLD_SURVEY.text],save);}
 if(o.kind==='scout'){
 if(!state.sidequest){
 if(canOfferSurvey(state))showDialog(SCOUT.name,['표석에는 진동이 없다고 적혀 있는데, 제단을 복구한 뒤 세 번 울렸다고요?\n그 관측은 기존 순찰 기록에 없어요.','북쪽 문지기와 같은 박자일 수 있어요. 남쪽과 동쪽 진동목을 함께 비교하면 확인할 수 있겠어요.'],offerSurvey);
 else showDialog(SCOUT.name,['전 숲의 장치를 수리해요. 지금은 젖은 도구를 말리는 중이고요.','귀환의 정원에는 옛 탐사 표석이 있어요. 오래전부터 그 기록을 기준으로 숲을 돌봐 왔죠.']);
 }else if(state.echoes.every(Boolean))showDialog(SCOUT.name,['세 번 이어지는 파동이었군요. 마지막이 가장 멀리 닿고, 그 뒤에 뿌리가 느슨해져요.',BOSS.intelligence,'옛 이름이 “삼박의 문지기, 오르문”이래요.\n이 관측은 발견 기록에서 다시 읽을 수 있어요.'],()=>{state.sidequest=2;state.intel=true;save();toast('관측을 정리했다 · 오르문의 삼박');});
 else showDialog(SCOUT.name,['북서쪽 길가와 동쪽 길가의 진동목을 조사해 주세요.']);
 }
 if(o.kind==='echo'){
 if(!state.sidequest){if(o.i===0&&state.seals[0]){state.anomaly=true;showDialog(o.name,[state.surveyRecord?'나무 안쪽이 세 번 울린다. 바람도 없는데 뿌리가 움직인다.\n탐사 표석에는 “잔류 진동 없음”이라고 적혀 있었다.':'나무 안쪽이 세 번 울린다. 바람도 없는데 뿌리가 움직인다.\n원래 이런 나무였을까.'],save);}else showDialog(o.name,['작은 진동이 느껴지지만 일정한 박자로 이어지지는 않는다.']);return;}
 state.echoes[o.i]=true;showDialog(o.name,[ECHO_SITES[o.i].observation],()=>{save();if(state.echoes.every(Boolean))toast('두 관측이 모였다. 이온에게 돌아가 보자.');});
 }
 if(o.kind==='fracture'){
 if(!state.memories.every(Boolean)){showDialog('낡은 돌조각',['표면에 가느다란 틈이 있다. 오래된 돌이 갈라진 흔적처럼 보인다.\n틈 안쪽에는 빛이 닿지 않는다.']);return;}
 showDialog('갈라진 연결부',['기록석에 적힌 배선 방향이 떠오른다.\n돌처럼 보였던 것은, 바깥의 응답을 받도록 만들어진 낡은 연결부였다.','손끝으로 틈의 방향을 바꾸자 가느다란 신호가 돌아온다.\n명령을 보내는 선 옆에, 대답을 받을 선이 남아 있었다.'],()=>{state.fracture=true;save();toast('갈라진 연결부를 기억에 남겼다.');});
 }
 if(o.kind==='seal'){
 if(!state.quest){toast('먼저 귀환의 정원에서 루미와 대화하세요.');return;}
 if(state.seals[o.i]){toast('이미 정화한 제단입니다.');return;}
 if(enemies.some(e=>e.id>=o.i*3&&e.id<o.i*3+3&&e.hp>0)){toast('제단을 지키는 뒤틀린 생명 3체를 먼저 진정시키세요.');return;}
 state.seals[o.i]=true;player.hp=100;burst(o.x,o.z,[.85,.85,.55],36);sound(880,.5);save();
 showDialog(o.name,[['제단이 빛난다. 낯선 언어가 머릿속에서 문장으로 바뀐다.\n[명령권자 귀환 확인. 제1 연결 복구.]','바람이 돌아온다. 잎사귀가 흔들리며 사람의 목소리처럼 속삭인다.\n“이번에는…… 우리에게 물어봐 줄 건가요?”','세 제단의 빛이 북쪽으로 향한다.\n[보존 명령 재개 준비. 수호자 활성화.]\n복구한 것은 숲일까. 누군가의 명령일까.'][o.i]],()=>{if(state.seals.every(Boolean))toast('북쪽의 오래된 수호자를 찾아가세요.');});
 }
 if(o.kind==='memory'){state.memories[o.i]=true;showDialog(o.name,[memories[o.i].text]);save();}
 if(o.kind==='boss'){
 if(!state.seals.every(Boolean)){toast('세 제단의 연결이 끊겨 있다. 수호자는 잠들어 있다.');return;}
 if(!state.boss){toast('수호자의 공격 신호를 보고 회피하세요.');return;}
 showDialog('수호자의 마지막 기록',['[보존 명령 제0001호. 발령자: 당신.]\n[외부 간섭을 차단한다. 거주민의 이탈을 허용하지 않는다.]','수호자는 숲을 지키고 있었다. 당신이 명령한 방식으로.\n과거의 이유는 아직 알 수 없다. 하지만 지금의 선택은 당신에게 있다.'],finalChoice);
 }
 if(o.kind==='portal'){player.hp=100;if(!state.complete)showDialog('별의 관문',['관문이 희미한 온기를 전한다. 생명력이 회복되었다.\n멀리 세 별의 신호가 들린다. 지금은 유온의 목소리에 귀를 기울이자.']);else showDialog('쇄해로 이어지는 신호',['바람 사이로 물이 차오르는 소리가 들린다.\n“제방은 안전합니다. 출항은 허가되지 않았습니다.”','루미는 기록장을 덮는다.\n“이번에는, 문이 닫힌 이유부터 물어봐요.”\n다음 장: 쇄해 · 닫힌 길의 바다'],()=>{save();location.href='swaehae.html';});}
}
function setStudy(v){study=v;keys.clear();$('study').classList.toggle('hidden',!v);}
function togglePause(){if(!started||dialog||study)return;paused=!paused;keys.clear();$('pause').textContent=paused?'계속하기':'일시정지';if(paused)toast('일시정지 · 버튼 또는 Esc로 계속');}
function start(load=false){
 if(started)return;
 if(!load){let exists=false;try{exists=!!localStorage.getItem(SAVE);}catch{}if(exists&&!confirm('새 여정을 시작하면 자동 저장을 바꿉니다. 계속할까요?'))return;}
 if(load&&!restore()){toast('저장된 기억을 읽지 못했습니다. 진행 파일을 가져오거나 새 여정을 시작하세요.');return;}
 started=true;$('overlay').classList.add('hidden');save();sound(440,.2);updateHUD();$('world').focus();
}
$('start').onclick=()=>start();$('continue').onclick=()=>start(true);try{if(localStorage.getItem(SAVE))$('continue').classList.remove('hidden');}catch{}
$('learn').onclick=()=>setStudy(!study);$('closeStudy').onclick=()=>setStudy(false);$('pause').onclick=togglePause;$('dialogNext').onclick=advance;
$('brand').onclick=e=>{e.preventDefault();setStudy(!study);};
$('curve').oninput=e=>{curve=Number(e.target.value);$('curveValue').textContent=curve.toFixed(3);};
$('debug').onchange=e=>debug=e.target.checked;$('grid').onchange=e=>grid=e.target.checked;
$('journal').onclick=()=>{if(dialog||study)return;showDialog('발견 기록',journal.length?journal.map(e=>e.name+'\n\n'+e.lines.join('\n\n')):['아직 발견한 기록이 없습니다.'],undefined,{record:false});};
$('exportSave').onclick=()=>download('RECOMMAND-save.json',JSON.stringify(snapshot(state,player,enemies,journal),null,2),'application/json');
$('importSave').onclick=()=>$('saveFile').click();
$('saveFile').onchange=async e=>{
 const f=e.target.files?.[0];if(!f)return;
 try{
 if(f.size>500000)throw Error('파일이 너무 큽니다.');const data=decode(await f.text(),enemies);
 const accept=()=>{applySave(data);started=true;paused=true;$('overlay').classList.add('hidden');$('pause').textContent='계속하기';save();updateHUD();$('saveStatus').textContent='가져왔습니다. 원리 보기를 닫고 계속하기를 누르세요.';$('importDecision')?.remove();};
 $('importDecision')?.remove();
 if(started){const box=document.createElement('div');box.id='importDecision';const text=document.createElement('p');text.textContent='가져온 진행으로 교체할까요? 현재 자동 저장은 백업됩니다.';const yes=document.createElement('button');yes.textContent='교체하여 가져오기';yes.onclick=accept;const no=document.createElement('button');no.textContent='취소';no.onclick=()=>box.remove();box.append(text,yes,no);$('saveStatus').after(box);}
 else accept();
 }catch(err){$('saveStatus').textContent='가져오기 실패: '+err.message;}
 finally{e.target.value='';}
};

function download(name,data,type){const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
$('reset').onclick=()=>{if(confirm('저장된 탐험 진행을 초기화할까요?')){try{localStorage.removeItem(SAVE+'.backup');localStorage.removeItem(SAVE);}catch{}location.reload();}};
for(const b of document.querySelectorAll('[data-action]'))b.addEventListener('click',()=>{action(b.dataset.action);if(started&&!dialog&&!study)$('world').focus();});
for(const b of document.querySelectorAll('[data-key]')){b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.key);};b.onpointerup=b.onpointercancel=b.onlostpointercapture=()=>keys.delete(b.dataset.key);}
addEventListener('keydown',e=>{
 const k=e.key.toLowerCase();if(k==='f1'){e.preventDefault();setStudy(!study);return;}
 if(e.target instanceof HTMLInputElement||e.target?.isContentEditable)return;
 if(k==='escape'){e.preventDefault();if(study)setStudy(false);else if(dialog&&!dialog.choice)advance();else if(!dialog)togglePause();return;}
 if(e.repeat)return;
 if(dialog&&k==='tab'){e.preventDefault();const buttons=dialog.choice?[...$('choices').children]:[$('dialogNext')],i=buttons.indexOf(document.activeElement);buttons[(i+(e.shiftKey?-1:1)+buttons.length)%buttons.length].focus();return;}
 if(['BUTTON','A'].includes(e.target?.tagName)&&['enter',' '].includes(k))return;
 if(dialog){if(['e','enter'].includes(k)){e.preventDefault();advance();}return;}if(study||!started)return;
 if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();keys.add(k);
 if(k==='e')interact();if(k==='j')action('attack');if(k==='k'||k===' ')action('dash');if(k==='l')action('skill');
 if(k==='v')$('debug').checked=debug=!debug;
 if(k==='c'){curve=curve>0?0:.012;$('curve').value=curve;$('curveValue').textContent=curve.toFixed(3);}
 if(k==='m'){mapBig=!mapBig;$('minimap').style.width=mapBig?'min(70vw,420px)':'';$('minimap').style.height=mapBig?'min(70vw,420px)':'';}
});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>{keys.clear();if(started&&!paused&&!study&&!dialog)togglePause();save();});document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();if(started&&!paused&&!study&&!dialog)togglePause();save();}});
addEventListener('pagehide',save);
function tick(dt){
 time+=dt;if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('toast').style.opacity=0;}
 if(!started||paused||study||dialog||contextLost)return;
 for(const k of['attack','dash','skill','inv','dashTime'])player[k]=Math.max(0,player[k]-dt);
 let dx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),dz=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0),dir=normalize(dx,dz);
 if(dx||dz){player.face=dir;player.walk+=dt*9;}
 if(player.dashTime>0){dir=player.face;burst(player.x,player.z,[.55,.76,.73],1);}
 const speed=player.dashTime>0?22:6.2,m=resolveMove(player,dir.x*speed*dt,dir.z*speed*dt,obstacles);player.x=m.x;player.z=m.z;
 if(keys.has('j'))action('attack');
 for(const e of enemies){
 if(e.hp<=0)continue;e.hit=Math.max(0,e.hit-dt);if(e===boss&&!state.seals.every(Boolean))continue;
 e.cd=Math.max(0,e.cd-dt);const d=distance(player,e),isBoss=e===boss,range=isBoss?BOSS.engageRange:1.6;
 if(isBoss){
 if(advancePulseSequence(e,dt,radius=>{effects.push({kind:'enemy',boss:true,pulse:e.pulse,x:e.x,z:e.z,life:.6,max:.6,r:radius});if(distance(player,e)<=radius)takeDamage(BOSS.damage);}))continue;
 if(e.cd>0)continue;if(d<range){beginPulseSequence(e);continue;}
 }else{
 if(e.wind>0){e.wind-=dt;if(e.wind<=0){effects.push({kind:'enemy',variant:e.type,angle:Math.atan2(player.z-e.z,player.x-e.x),x:e.x,z:e.z,life:.48,max:.48,r:range});if(distance(player,e)<=range)takeDamage(10);e.cd=1.5;}continue;}
 if(d<range&&e.cd<=0){e.wind=.48;continue;}
 }
 const chase=d<(isBoss?18:10)&&distance(player,e.home)<(isBoss?25:15);
 const target=chase?player:e.home,n=normalize(target.x-e.x,target.z-e.z);
 if(distance(target,e)>(chase?range*.85:.25)){const pos=resolveMove(e,n.x*(isBoss?2.2:2.8)*dt,n.z*(isBoss?2.2:2.8)*dt,obstacles);e.x=pos.x;e.z=pos.z;}
 }
 for(let i=effects.length-1;i>=0;i--)if((effects[i].life-=dt)<=0)effects.splice(i,1);
 for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;p.x+=p.vx*dt;p.z+=p.vz*dt;p.y+=p.vy*dt;p.vy-=8*dt;if(p.life<=0)particles.splice(i,1);}
 if(time-lastSave>5){save();lastSave=time;}updateHUD();
}
function updateHUD(){
 $('world').dataset.playerX=player.x.toFixed(3);$('world').dataset.playerZ=player.z.toFixed(3);
 $('backend').textContent=R.backend==='software'?'호환 모드 · CPU 3D':'WebGL · GPU 3D';
 $('sideQuest').classList.toggle('hidden',!state.sidequest);$('sideQuestText').textContent=state.intel?'오르문의 관측을 발견 기록에 남겼다.':'진동목을 조사하고 이온에게 돌아가자. ('+state.echoes.filter(Boolean).length+'/2)';
 $('bossInfo').classList.toggle('hidden',!(boss.hp>0&&state.seals.every(Boolean)&&distance(player,boss)<23));$('bossName').textContent=BOSS.name;$('bossHealth').style.width=boss.hp/boss.max*100+'%';

 $('health').style.width=player.hp+'%';$('hpText').textContent=Math.ceil(player.hp)+' / 100';$('level').textContent='Lv. '+(1+Math.floor(player.xp/60));$('xp').style.width=(player.xp%60)/60*100+'%';
 $('cdAttack').style.width=player.attack/.38*100+'%';$('cdDash').style.width=player.dash/1.6*100+'%';$('cdSkill').style.width=player.skill/5*100+'%';
 const count=state.seals.filter(Boolean).length;
 $('questTitle').textContent=state.complete?(state.ending==='rewrite'?'함께 쓰는 명령':'유온의 조용한 밤'):state.boss?'수호자의 기억':count===3?'오래된 명령의 수호자':state.quest?'세 제단의 빛':'숲의 신호를 따라서';
 $('questText').textContent=state.complete?'귀환의 관문에서 다음 별의 신호를 확인하세요.':state.boss?'쓰러진 수호자에게 다가가 E로 조사하세요.':count===3?'북쪽의 수호자를 진정시키세요. 붉은 원을 피하세요.':state.quest?'길을 따라 제단을 찾아 주변의 적을 물리친 뒤 E로 정화하세요. ('+count+'/3)':'기록자 루미에게 다가가 E로 대화하세요.';
 [...$('sealProgress').children].forEach((e,i)=>e.classList.toggle('done',state.seals[i]));
 const o=nearest();$('interact').style.display=o&&(o.kind!=='fracture'||state.fracture)?'block':'none';$('interact').textContent=o?'E · '+o.name+' '+(['npc','scout'].includes(o.kind)?'대화':'조사'):'';
 $('location').textContent=player.z<-58?'명령의 잔해':player.z<-28?'잊힌 관측림':player.z<-10?'뒤틀린 뿌리길':'귀환의 정원';
}
function draw(){
 const camX=started?player.x:0,camZ=started?player.z:-1;R.begin(camX,camZ,curve);R.mesh(worldMesh);R.mesh(roadMesh);if(grid)R.mesh(gridMesh);R.mesh(propMesh);R.mesh(brokenMesh);
 const g=new Geometry(),visible=e=>Math.abs(e.x-camX)<48&&Math.abs(e.z-camZ)<58;
 shadow(g,player.x,player.z,.72);shadow(g,npc.x,npc.z,.7);
 for(const e of enemies)if(e.hp>0&&visible(e)){shadow(g,e.x,e.z,e===boss?1.8:.8);if(e.wind>0){const r=e===boss?BOSS.pulseRadii[e.pulse||0]:1.6,d=e===boss?(e.pulse?BOSS.gap:BOSS.windup):.48;g.ring(e.x,groundY(e.x,e.z)+.23,e.z,r,[.83,.39,.28],48,.12+clamp(1-e.wind/d,0,1)*.5);}if(debug)g.ring(e.x,.35,e.z,e===boss?1.4:.55,[.9,.4,.4],32,.07);}
 for(let i=0;i<3;i++){const s=seals[i],c=state.seals[i]?[.85,.82,.46]:[.45,.65,.56];g.ring(s.x,.35,s.z,2.1,c,48,.1);if(state.seals[i])g.ring(s.x,.38,s.z,2.35,c,48,.035);}
 for(const e of effects)if(e.kind==='enemy')g.ring(e.x,groundY(e.x,e.z)+.12,e.z,e.r,[.85,.45,.3],48,.11);
 if(debug){g.ring(player.x,.3,player.z,.42,[.55,.9,.9],32,.06);const a=Math.atan2(player.face.z,player.face.x);g.ring(player.x,.38,player.z,3.1,[.9,.8,.4],32,.045,a-Math.acos(.25),a+Math.acos(.25));}
 for(const p of particles)g.cone(p.x,Math.max(.1,p.y)+groundY(p.x,p.z),p.z,.045,.1,p.color,3);
 R.drawDynamic(g);
 combatVFX.draw(effects,enemies,time);
 for(const lamp of gardenLamps)if(visible(lamp))R.sprite(glowTex,lamp.x,lamp.y-.5,lamp.z,1.1,1.1,.35+Math.sin(time*2+lamp.x)*.05);
 if(state.memories.every(Boolean)&&Math.sin(time*.8)>.98)R.sprite(glowTex,fracture.x,.87,fracture.z,.15,.15,.35);
 const draws=[];
 draws.push(()=>R.sprite(scoutTex,SCOUT.x,groundY(SCOUT.x,SCOUT.z),SCOUT.z,1.9,2.5));draws.push(()=>R.sprite(labels.scout,SCOUT.x,3.1,SCOUT.z,5.5,.65));
 if(distance(player,OLD_SURVEY)<7)draws.push(()=>R.sprite(labels.survey,OLD_SURVEY.x,1.3,OLD_SURVEY.z,4.5,.55));
 if(state.sidequest===1)for(let i=0;i<2;i++){const s=ECHO_SITES[i];if(visible(s))draws.push(()=>R.sprite(labels.echoes[i],s.x,3,s.z,4.5,.6));}
 draws.push(()=>R.sprite(npcTex,npc.x,groundY(npc.x,npc.z),npc.z,1.9,2.5));
 draws.push(()=>R.sprite(labels.npc,npc.x,3.1,npc.z,5,.62));
 draws.push(()=>R.sprite(labels.portal,0,4.4,11,5,.62));
 for(let i=0;i<3;i++){const s=seals[i];if(!visible(s))continue;draws.push(()=>{R.sprite(glowTex,s.x,1.5+Math.sin(time*2)*.15,s.z,3,3,state.seals[i]?.85:.32);R.sprite(labels.seals[i],s.x,3.3,s.z,5,.62);});}
 for(let i=0;i<2;i++){const s=memories[i];if(visible(s))draws.push(()=>{R.sprite(glowTex,s.x,1.5,s.z,1.6,1.6,.5);R.sprite(labels.memories[i],s.x,3,s.z,5,.62);});}
 for(const e of enemies){if(e.hp<=0||!visible(e))continue;const isBoss=e===boss,w=isBoss?4.8:2.2,h=isBoss?5.2:2;draws.push(()=>{R.sprite(isBoss?bossTex:slimeTextures[e.type][Math.floor(time*4+(e.jitter||0))%2],e.x,groundY(e.x,e.z)+Math.sin(time*4)*.06,e.z,w,h,e.hit>0?.45:1);if(isBoss)R.sprite(labels.boss,e.x,6.1,e.z,6,.75);if(e.hp<e.max||e.wind>0){const tex=R.texture('hp'+e.id+'-'+Math.ceil(e.hp/10),c=>{c.fillStyle='#143632';c.fillRect(10,45,108,12);c.fillStyle=isBoss?'#dfb271':'#bfd495';c.fillRect(12,47,104*e.hp/e.max,8);});R.sprite(tex,e.x,h+.4,e.z,isBoss?4:2.6,.65);}});}
 const frame=(Math.floor(player.walk)%2)+(player.face.z<-.2?2:0);
 draws.push(()=>R.sprite(heroSprites[frame],player.x,groundY(player.x,player.z),player.z,1.9,2.6,player.inv>0&&Math.floor(time*16)%2?.45:1));
 // Alpha cutoff writes depth, so opaque sprite pixels occlude correctly with 3D trees.
 for(const d of draws)d();
 for(let i=0;i<26;i++){const x=camX+Math.sin(i*19.7+time*.09)*25,z=camZ+Math.cos(i*13.1+time*.08)*28;R.sprite(glowTex,x,1.5+Math.sin(time*.5+i),z,.25,.25,.55);}
 if(state.complete)R.sprite(glowTex,0,1,11,5,6,.8);
 R.finish();drawMap();
}
function drawMap(){
 const c=$('minimap').getContext('2d');c.clearRect(0,0,200,200);c.save();c.beginPath();c.arc(100,100,97,0,TAU);c.clip();c.fillStyle='#153a38';c.fillRect(0,0,200,200);
 const xy=(x,z)=>[100+x*.82,100+z*.82];
 c.strokeStyle='#79927466';c.lineWidth=3;for(const[a,b]of roads){c.beginPath();c.moveTo(...xy(...a));c.lineTo(...xy(...b));c.stroke();}
 c.font='9px sans-serif';c.textAlign='center';c.fillStyle='#c7cfa8';c.fillText('N',100,17);
 for(let i=0;i<3;i++){const[x,y]=xy(seals[i].x,seals[i].z);c.fillStyle=state.seals[i]?'#d5e3a0':'#d8bd79';c.save();c.translate(x,y);c.rotate(Math.PI/4);c.fillRect(-3,-3,6,6);c.restore();}
 for(let i=0;i<2;i++){const[x,y]=xy(memories[i].x,memories[i].z);c.fillStyle=state.memories[i]?'#859f91':'#9cdbd5';c.fillRect(x-2,y-2,4,4);}
 for(const e of enemies)if(e.hp>0){const[x,y]=xy(e.x,e.z);c.fillStyle=e===boss?'#e0aa7a':'#bd8177';c.beginPath();c.arc(x,y,e===boss?4:1.7,0,TAU);c.fill();}
 let[x,y]=xy(npc.x,npc.z);c.fillStyle='#e6dfaf';c.beginPath();c.arc(x,y,3,0,TAU);c.fill();
 [x,y]=xy(player.x,player.z);c.save();c.translate(x,y);c.rotate(-Math.atan2(player.face.x,player.face.z));c.fillStyle='#f4e7b0';c.beginPath();c.moveTo(0,6);c.lineTo(-4,-4);c.lineTo(4,-4);c.fill();c.restore();c.restore();
}
let previous=performance.now(),accumulator=0,frames=0,lastFPS=performance.now(),fps=0,renderMs=0;
function loop(now){accumulator+=clamp((now-previous)/1000,0,.15);previous=now;let steps=0;while(accumulator>=1/60&&steps<8){tick(1/60);accumulator-=1/60;steps++;}if(steps===8)accumulator=0;if(!contextLost){const before=performance.now();draw();renderMs=performance.now()-before;}frames++;if(now-lastFPS>1000){fps=Math.round(frames*1000/(now-lastFPS));frames=0;lastFPS=now;}$('fps').textContent=fps+' FPS · '+renderMs.toFixed(1)+' ms/render';requestAnimationFrame(loop);}requestAnimationFrame(loop);
$('world').addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;paused=true;save();showDialog('그래픽 연결 끊김',['진행을 저장했습니다. 계속을 누르면 게임을 다시 엽니다. 시작 화면에서 기억 이어가기를 선택하세요.'],()=>location.reload(),{record:false});});
// Read-only observability for QA. No gameplay cheats or mutable state exposed.
window.recommand={snapshot:()=>JSON.parse(JSON.stringify({player,state,started,paused,study,dialog:dialog?{name:dialog.name,index:dialog.index}:null,enemies:enemies.map(({id,x,z,hp,wind})=>({id,x,z,hp,wind})),curve,drawCalls:R.calls,backend:R.backend,fps,vfxReady:combatVFX.ready,vfxFailed:!!combatVFX.failed,storageWarning,contextLost}))};

