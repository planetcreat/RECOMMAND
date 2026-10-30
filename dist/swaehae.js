import {Renderer,Geometry} from './engine.js';
import {WorldArt,visualTerrain} from './art.js';
import {makeBossModel} from './boss-models.js';
import {SoftwareRenderer} from './software.js';
import {CombatVFX} from './vfx.js';
import {clamp,normalize,resolveMove,seeded,distance} from './math.js';
import {TIDE_INITIAL,tideState,tideDescription,observeTide,tideIntel,decodeTide,SWAEHAE_SCENES,boatAction,tickBoat,boatPosition,boatHint} from './tide.js';
import {BELROK,createBelrok,startBelrok,tickBelrok,hitBelrok,dashBelrok,divertBelrok,belrokPhaseText,BELROK_CLUE,BELROK_ENDING} from './belrok.js';
const el=id=>document.getElementById(id),SEA_SAVE='recommand-swaehae-v1';
let seaRenderer;try{seaRenderer=new Renderer(el('chapterWorld'));seaRenderer.backend='webgl';}catch{const c=document.createElement('canvas');c.id='chapterWorld';c.tabIndex=0;c.setAttribute('aria-label','쇄해의 제방 항구');el('chapterWorld').replaceWith(c);seaRenderer=new SoftwareRenderer(c);}
const seaArt=new WorldArt(seaRenderer);
const seaSoft=seaRenderer.backend==='software';if(seaSoft)Geometry.lowDetail=true;
const seaHeight=()=>0,seaVFX=new CombatVFX(seaRenderer,seaHeight),seaKeys=new Set(),seaEffects=[],seaObstacles=[],seaRandom=seeded(56241);
let seaState=structuredClone(TIDE_INITIAL),seaPaused=false,seaDialog=null,seaClock=0,seaCooldown=0,seaSaveFailed=false;
const seaPlayer={x:0,z:10,face:{x:0,z:-1},walk:0};
const seaBoss=createBelrok();let seaArena=false;
try{const raw=localStorage.getItem(SEA_SAVE);if(raw)seaState=decodeTide(raw);}catch{}
function saveSea(){try{localStorage.setItem(SEA_SAVE,JSON.stringify(seaState));seaSaveFailed=false;}catch{seaSaveFailed=true;}}
function seaTalk(title,lines,after){seaKeys.clear();seaDialog={title,lines,index:0,after};el('chapterSpeaker').textContent=title;el('chapterText').textContent=lines[0];el('chapterDialog').classList.remove('hidden');el('chapterNext').focus();}
function seaAdvance(){if(!seaDialog)return;if(++seaDialog.index<seaDialog.lines.length){el('chapterText').textContent=seaDialog.lines[seaDialog.index];return;}const cb=seaDialog.after;seaDialog=null;el('chapterDialog').classList.add('hidden');cb?.();saveSea();if(!seaDialog)el('chapterWorld').focus();}
const seaObjects=[{x:4,z:3,kind:'naru',name:'나루 · 제방지기'},{x:-6,z:9,kind:'child',name:'도하 · 작은 배의 주인'},{x:-12,z:-4,kind:'gate',index:0,name:'서쪽 저류 수문'},{x:12,z:-15,kind:'gate',index:1,name:'동쪽 배수 수문'},{x:0,z:-14,kind:'gauge',name:'중앙 수압계'},{x:0,z:-32,kind:'foregate',name:'문지기의 수문'},{x:-8.5,z:-12,kind:'return',name:'오래된 되돌림 수로'},{x:-4.7,z:13,kind:'launch',name:'작은 배의 선착장'}];
function seaVisible(o){return o.kind==='return'?(seaState.boat.stage!=='unknown'||seaState.boat.met&&tideIntel(seaState)&&tideState(seaState.gates)==='draining'):o.kind==='launch'?['repaired','sailing','returned','complete'].includes(seaState.boat.stage):true;}
function seaNearest(){return seaObjects.filter(o=>seaVisible(o)&&distance(o,seaPlayer)<3.7).sort((a,b)=>distance(a,seaPlayer)-distance(b,seaPlayer))[0];}
function seaInteract(){if(seaPaused)return;if(seaDialog){seaAdvance();return;}
 if(seaArena){
  if(seaBoss.active){divertBelrok(seaBoss,seaPlayer,seaState.boat.stage==='complete');return;}
  if(seaState.boss.defeated&&!seaState.boss.rewritten&&distance(seaPlayer,BELROK)<4){seaTalk('RE:COMMAND · 돌아올 길을 지켜라',BELROK_ENDING,()=>{seaState.boss.rewritten=true;saveSea();seaArena=false;seaPlayer.x=0;seaPlayer.z=10;seaEffects.length=0;});return;}
  if(distance(seaPlayer,BELROK.entry)<4){seaArena=false;seaPlayer.x=0;seaPlayer.z=-29;seaEffects.length=0;}return;
 }
 const o=seaNearest();if(!o)return;
 if(o.kind==='naru'){if(!seaState.introduced)seaTalk(o.name,SWAEHAE_SCENES.naru,()=>{seaState.introduced=true;saveSea();});else seaTalk(o.name,[seaState.boss.rewritten?'나루: “돌아올 길은 열어 두었어요. 언제 출항할지는 우리가 정할게요.”':seaState.boat.stage==='complete'?BELROK_CLUE:seaState.foregate?'“물을 내보내는 것과, 길을 열어 두는 건 다르죠. 문 너머에서도 그걸 잊지 말아요.”':tideIntel(seaState)?'“밀려날 때는 넓은 길이 위험하고, 돌아올 때는 좁은 홈이 위험해져요. 흐름이 바뀌는 순간 정비 통로를 살펴보세요.”':'“저류지만 열 때, 배수로만 열 때, 둘 다 열 때. 수압계에 직접 남긴 관측이 있나요? 같은 파도도 돌아오는 길은 달라요.”']);}
 if(o.kind==='child'){
  if(seaState.boat.stage==='returned')seaTalk('돌아오는 배',[
   '종이배가 도하의 손끝으로 돌아왔다. 접힌 돛에는 낯선 물때가 묻어 있지만, 배는 아직 물 위에 떠 있다.',
   '도하: “돌아왔어요! 이제 어디로 갔다 왔는지 물어볼 수 있겠네요.”\n루미: “목적지를 정해 주지 않아도, 돌아올 길을 만들어 줄 수는 있군요.”',
   '히든 퀘스트 「돌아오는 배」 완료\n물길의 기억 획득 · 밀려나는 물과 돌아오는 물은 서로 다른 홈을 따른다. 문지기 앞의 정비 수로에도 같은 표식이 있다.',BELROK_CLUE
  ],()=>{boatAction(seaState,'claim');saveSea();});
  else if(seaState.boat.stage==='complete')seaTalk(o.name,['도하: “다음에는 제가 띄울 거예요. 돌아올 길은 이제 아니까요.”\n물길의 기억은 발견 기록에 남아 있다.']);
  else if(seaState.boat.met)seaTalk(o.name,[boatHint(seaState)]);
  else seaTalk(o.name,[...SWAEHAE_SCENES.child,'도하: “돌아올 길이 있는지, 먼저 물을 봐 줄래요?”'],()=>{boatAction(seaState,'meet');saveSea();});
 }
 if(o.kind==='return'){
  if(seaState.boat.stage==='unknown'){if(boatAction(seaState,'chart')){saveSea();seaTalk('히든 퀘스트 발견 · 돌아오는 배',['빠져나간 물 아래에 갈라진 원의 표식이 나타났다. 세 관측의 눈금과 맞아떨어진다. 항구로 돌아오는 작은 수로다.','통로를 막은 돌과 묵은 밧줄이 보인다. 두 수문을 모두 닫아 물을 멈춘 뒤 수리하자.']);}}
  else if(seaState.boat.stage==='charted'){if(boatAction(seaState,'repair')){saveSea();seaTalk(o.name,['물살이 멎었다. 끼어 있던 돌을 빼고 묵은 밧줄을 걷어냈다. 되돌림 수로가 항구의 물길과 이어진다.','두 수문을 열어 순환을 회복한 뒤, 도하 옆 작은 선착장에서 종이배를 띄워 보자.']);}else seaTalk(o.name,['흐르는 물에 손을 넣기에는 위험하다. 서쪽과 동쪽 수문을 모두 닫은 뒤 수리하자.']);}
  else seaTalk(o.name,['복구된 홈을 따라 물이 돌아온다.\n'+boatHint(seaState)]);
 }
 if(o.kind==='launch'){
  if(seaState.boat.stage==='repaired'){if(boatAction(seaState,'launch')){saveSea();seaTalk('작은 배의 첫 항해',['도하가 종이배를 물 위에 내려놓았다. 배가 서쪽 홈을 따라 멀어진다.','수로를 따라 나갔다가 반대편 홈으로 돌아온다. 물이 순환하는 동안 항해가 이어진다.']);}else seaTalk(o.name,['물이 한쪽으로만 흐른다. 두 수문을 모두 열어 순환시킨 뒤 띄우자.']);}
  else seaTalk(o.name,[seaState.boat.stage==='returned'?'종이배가 무사히 돌아왔다. 도하에게 소식을 전하자.':boatHint(seaState)]);
 }
 if(o.kind==='gate'){if(!seaState.introduced){seaTalk(o.name,['레버에는 제방지기의 봉인이 걸려 있다. 먼저 나루와 이야기하자.']);return;}seaState.gates[o.index]=!seaState.gates[o.index];saveSea();seaTalk(o.name,[(seaState.gates[o.index]?'수문을 열었다.':'수문을 닫았다.')+'\n'+tideDescription(seaState.gates),'눈금의 변화는 중앙 수압계에서 기록할 수 있다.']);}
 if(o.kind==='gauge'){observeTide(seaState);saveSea();seaTalk(o.name,[tideDescription(seaState.gates),tideIntel(seaState)?'세 관측이 하나로 이어진다.\n같은 수로도 밀려갈 때와 되돌아올 때 물의 힘이 다르다. 보스가 흐름을 뒤집을 때, 안전한 곳도 바뀔 것이다.':'흐름을 바꾸어 다시 관측하면, 수로가 어느 방향으로 힘을 전달하는지 비교할 수 있다.']);}
 if(o.kind==='foregate'){if(!seaState.introduced)return;if(tideState(seaState.gates)!=='circulation'){seaTalk(o.name,['보행교가 들려 있다. 한쪽에 고인 수압 때문에 내릴 수 없다.\n저류지와 배수로를 함께 열어 물이 순환하게 해야 한다.']);return;}
  if(seaState.boss.rewritten){seaTalk('귀환 항로의 수호자',['벨로크: [귀환 항로 보호 중. 출항 여부는 주민에게 위임.]','문지기는 더 이상 항구를 가두지 않는다.']);return;}
  const enter=()=>{seaState.foregate=true;saveSea();seaArena=true;seaEffects.length=0;if(seaState.boss.defeated){seaBoss.active=false;seaBoss.hp=0;seaBoss.hero=100;seaBoss.phase='won';seaPlayer.x=0;seaPlayer.z=-50;}else startBelrok(seaBoss,seaPlayer);seaPlayer.face={x:0,z:-1};};
  seaTalk('역류의 문지기 · 벨로크',[...SWAEHAE_SCENES.foregate,...(seaState.boat.stage==='complete'?['물길의 기억이 겹친다. 종이배가 돌아왔던 홈과 같은 갈라진 원이다.\n'+BELROK_CLUE]:[]),'전장 진입 · 토출과 회수의 원을 피하고 과압 방출 때 공격하자.\nJ 검격 · L 파동 · K / Space 회피 · E 정비 장치'],enter);
 }
}
const seaGround=new Geometry(),seaProps=new Geometry(),seaBase=new Geometry();
for(let x=-55;x<55;x+=3)for(let z=-80;z<40;z+=3){const land=Math.abs(x)<20&&z<18&&z>-72,c=land?visualTerrain(x,z,'harbor'):[.13+.025*Math.sin(x*.2),.37,.44];seaGround.quad([x,0,z],[x+3,0,z],[x+3,0,z+3],[x,0,z+3],c);if(land)for(let k=seaGround.data.length-36;k<seaGround.data.length;k+=6){const col=visualTerrain(seaGround.data[k],seaGround.data[k+2],'harbor');for(let j=0;j<3;j++)seaGround.data[k+3+j]=col[j];}}
const seaRoad=(x,z,w,l)=>{for(let px=x-w/2;px<x+w/2;px+=1.1)for(let pz=z-l/2;pz<z+l/2;pz+=1.45){const ex=Math.min(px+1.04,x+w/2),ez=Math.min(pz+1.38,z+l/2),n=Math.sin(px*8+pz*3)*.035;seaBase.quad([px,.1,pz],[ex,.1,pz],[ex,.1,ez],[px,.1,ez],[.6+n,.59+n,.49+n]);}};seaRoad(0,-9,5,52);seaRoad(-6,-4,18,3);seaRoad(6,-15,18,3);
for(const x of[-20,20])for(let z=-43;z<18;z+=3){seaProps.cone(x,0,z,.65,.85,[.47,.5,.43],4,.6);seaObstacles.push({x,z,r:.6});}
for(const side of[-1,1])for(let z=-39;z<14;z+=7){const x=side*17;seaProps.cone(x,0,z,.18,2.7,[.28,.32,.29],6,.12);seaProps.cone(x,2.7,z,.34,.5,[.9,.74,.43],6,.24);seaProps.cone(x,3.2,z,.43,.25,[.28,.41,.4],6);seaObstacles.push({x,z,r:.3});}
for(const o of seaObjects){if(o.kind==='gate'){seaProps.cone(o.x,0,o.z,.9,.5,[.37,.45,.43],6,.8);seaProps.cone(o.x,.5,o.z,.19,1.6,[.63,.56,.37],6,.16);seaObstacles.push({x:o.x,z:o.z,r:.9});}else if(o.kind==='gauge'){seaProps.cone(o.x,0,o.z,.65,1.45,[.4,.51,.49],6,.45);seaProps.cone(o.x,1.45,o.z,.8,.12,[.75,.72,.48],8,.75);seaObstacles.push({x:o.x,z:o.z,r:.8});}}
// Docks, moored hulls, awnings, rope posts and layered masonry make the harbor feel inhabited.
for(const [x,z]of[[-26,6],[27,-7],[-27,-23],[27,-34]]){seaProps.cone(x,.1,z,2.3,.65,[.33,.28,.22],6,1.5);seaProps.cone(x,.7,z,.09,5,[.55,.48,.32],6,.06);seaProps.quad([x,.9,z],[x,5.5,z],[x+2.5,3.8,z],[x+2.5,1.2,z],[.78,.73,.54]);}
for(const [x,z]of[[-11,3],[10,7],[-12,-24],[10,-26]]){seaProps.cone(x,0,z,1.5,.6,[.34,.33,.27],4,1.5);for(const dx of[-1.4,1.4])seaProps.cone(x+dx,.5,z,.08,2.5,[.4,.37,.26],4);seaProps.quad([x-1.7,3.1,z-1.2],[x+1.7,3.1,z-1.2],[x+1.7,2.8,z+1.2],[x-1.7,2.8,z+1.2],[.43,.63,.6]);seaObstacles.push({x,z,r:1.4});}
for(let i=0;i<90;i++){const x=(seaRandom()>.5?1:-1)*(6+seaRandom()*9),z=seaRandom()*52-39;if(seaObjects.some(o=>distance({x,z},o)<4))continue;seaProps.cone(x,0,z,.2+seaRandom()*.25,.2+seaRandom()*.45,i%3?[.42,.45,.38]:[.68,.61,.43],5,.12);}
const seaGroundMesh=seaRenderer.upload(seaGround),seaPropsMesh=seaRenderer.upload(seaProps),seaBaseMesh=seaRenderer.upload(seaBase);
function seaSprite(key,color,hat=false){return seaRenderer.texture('sea-person-'+key,c=>{c.fillStyle='#102d3955';c.beginPath();c.ellipse(64,116,31,7,0,0,Math.PI*2);c.fill();c.fillStyle='#263b43';c.fillRect(44,92,15,23);c.fillRect(69,92,15,23);c.fillStyle=color;c.beginPath();c.moveTo(43,53);c.lineTo(85,53);c.lineTo(91,96);c.lineTo(36,96);c.fill();c.fillStyle='#e4c69c';c.beginPath();c.ellipse(64,37,20,24,0,0,Math.PI*2);c.fill();c.fillStyle=hat?'#bdad78':'#29414a';c.beginPath();c.ellipse(64,21,26,13,0,0,Math.PI*2);c.fill();if(hat)c.fillRect(31,27,66,7);c.fillStyle='#263c42';c.fillRect(53,38,4,5);c.fillRect(73,38,4,5);c.fillStyle='#dfc984';c.fillRect(42,58,45,5);});}
const seaHero=seaSprite('hero','#466974'),seaNaru=seaSprite('naru','#7e7860',true),seaChild=seaSprite('child','#8c8f60');
const seaLabels=seaObjects.map(o=>seaRenderer.texture('sea-label-'+o.kind+o.index,c=>{c.font='22px Malgun Gothic';c.textAlign='center';c.shadowColor='#0b2330';c.shadowBlur=5;c.fillStyle='#f0d9a2';c.fillText(o.name,256,36);},512,64));
const seaGlow=seaRenderer.texture('sea-glow',c=>{const a=c.createRadialGradient(64,64,0,64,64,60);a.addColorStop(0,'#fff0ba');a.addColorStop(.25,'#dac38299');a.addColorStop(1,'#e3ce9700');c.fillStyle=a;c.fillRect(0,0,128,128);});
function drawBelrokArena(){
 const g=new Geometry(),b=seaBoss,open=b.phase==='open'||seaState.boss.defeated;
 g.disc(0,.12,-54,12,[.28,.36,.36],64);g.ring(0,.15,-54,12,[.75,.66,.43],64,.17);
 for(const x of[-7,7])for(let z=-64;z<-43;z+=2)g.quad([x-.45,.16,z],[x+.45,.16,z],[x+.45,.16,z+2],[x-.45,.16,z+2],[.22,.49,.54]);
 for(let i=0;i<12;i++){const a=i*Math.PI/6,x=Math.cos(a)*12,z=-54+Math.sin(a)*12;g.cone(x,.1,z,.45,2.8,[.36,.48,.47],6,.3);g.cone(x,2.9,z,.24,.4,[.77,.71,.48],5);}
 const d=BELROK.device;g.cone(d.x,.2,d.z,.7,1.1,[.57,.56,.4],7,.5);g.ring(d.x,.22,d.z,1.4,b.diverted?[.4,.95,.8]:[.92,.77,.41],32,.1,.35,Math.PI*2-.35);
 // Broken-circle mark is shared with the repaired paper-boat channel.
 g.ring(d.x,1.32,d.z,.6,[.96,.87,.57],28,.1,.35,Math.PI*2-.35);
 for(const h of b.hazards){if(h.done)continue;g.ring(h.x,.24,h.z,h.r,b.diverted&&b.phase==='back'?[.3,.85,.72]:[1,.4,.24],40,.09);if(b.phase.endsWith('Warn')){const t=b.time/({outWarn:1.8,returnWarn:2.8,lockWarn:1.5}[b.phase]);g.ring(h.x,.245,h.z,Math.max(.1,h.r*t),[.86,.64,.36],32,.045);}}
 if(b.phase==='returnWarn')for(let i=0;i<6;i++){const a=i*Math.PI/3+seaClock;g.cone(Math.cos(a)*2,3.2+Math.sin(a*3)*.3,-54+Math.sin(a)*2,.12,.5,[.3,.85,.95],5);}
 seaRenderer.drawDynamic(g);seaVFX.draw(seaEffects,[],seaClock);
 seaRenderer.drawDynamic(makeBossModel('belrok',0,0,-54,seaClock,b,seaSoft));seaRenderer.sprite(seaArt.actor(['hero0','hero1','heroBack0','heroBack1'][(Math.floor(seaPlayer.walk)%2)+(seaPlayer.face.z<-.2?2:0)],seaHero),seaPlayer.x,0,seaPlayer.z,1.9,2.6,b.invul>0&&Math.sin(seaClock*40)>0?.45:1);seaRenderer.finish();
 el('chapterPrompt').textContent=b.active?(distance(seaPlayer,d)<3?'E · '+(seaState.boat.stage==='complete'?'갈라진 원 · 정비 장치':'낯선 정비 표식'):''):distance(seaPlayer,BELROK)<4&&!seaState.boss.rewritten?'E · 명령을 다시 쓰기':distance(seaPlayer,BELROK.entry)<4?'E · 항구로 돌아가기':'';
 el('bossName').textContent='역류의 문지기 · 벨로크';el('bossHealth').style.width=b.hp/BELROK.hp*100+'%';el('heroHealth').style.width=b.hero+'%';el('bossNumbers').textContent=b.hp+' / '+BELROK.hp+' · 여행자 '+b.hero+' / 100';el('bossPhase').textContent=belrokPhaseText(b)+(b.diverted?' · 우회 성공':'');el('bossMessage').textContent=b.message||'바닥의 원을 피하고, 과압 방출 때 가슴을 공격하세요.';el('bossSkills').textContent='J 검격 · L 파동 '+(b.wave>0?b.wave.toFixed(1)+'초':'준비')+' · K 회피 '+(b.dash>0?b.dash.toFixed(1)+'초':'준비');
}
function seaDraw(){el('seaPractice').classList.toggle('hidden',!seaState.boss.defeated||seaArena);el('bossHud').classList.toggle('hidden',!seaArena);el('harborObjective').classList.toggle('hidden',seaArena);el('boatQuest').classList.toggle('hidden',seaArena||!seaState.boat.met);seaRenderer.begin(seaPlayer.x,seaPlayer.z,.012);seaRenderer.mesh(seaGroundMesh);if(seaArena){drawBelrokArena();return;}seaRenderer.mesh(seaBaseMesh);if(!seaArt.propReady)seaRenderer.mesh(seaPropsMesh);const g=new Geometry(),status=tideState(seaState.gates),flow=status==='circulation'?1:status==='draining'?-1:0.3,waterY=status==='filling'?.36:status==='draining'?.04:.2;
 for(const x of[-4.7,4.7])for(let z=-38;z<13;z+=1.5){const dy=Math.sin(seaClock*3+z*.5)*.018;g.quad([x-.6,waterY+dy,z],[x+.6,waterY+dy,z],[x+.6,waterY+dy,z+1.5],[x-.6,waterY+dy,z+1.5],[.24,.58,.61]);const p=z+(seaClock*flow)%1.5;g.ring(x,waterY+.03,p,.32,[.61,.8,.74],8,.025);}
 for(const z of[-19,9])g.quad([-4.7,waterY,z-.6],[4.7,waterY,z-.6],[4.7,waterY,z+.6],[-4.7,waterY,z+.6],[.24,.58,.61]);
 for(let i=0;i<13;i++){const x=-3+i*.5,z=-24,y=status==='circulation'?.12:.3+Math.abs(x)*.65;g.cone(x,y,z,.21,.13,[.6,.57,.44],4,.2);}
 g.ring(0,.15,-32,3.3,[.64,.7,.58],48,.12);for(let i=0;i<8;i++){const a=i/8*Math.PI*2;g.cone(Math.cos(a)*3.3,.1,-32+Math.sin(a)*3.3,.35,2.1+(i%2)*.7,[.39,.49,.46],5,.26);}
 // The hidden channel is revealed by drained water; repairs and the paper boat persist.
 const returnSite=seaObjects.find(o=>o.kind==='return'),b=seaState.boat;
 if(seaVisible(returnSite)){g.ring(-8.5,.17,-12,1.25,[.9,.77,.46],24,.07,.35,Math.PI*2-.35);for(let i=0;i<5;i++)g.cone(-8.5+i*.65,.1,-12,.1,.12,[.89,.78,.5],3,.04);}
 if(['repaired','sailing','returned','complete'].includes(b.stage)){
  g.quad([-9,.13,-12.6],[-4.7,.13,-12.6],[-4.7,.13,-11.4],[-9,.13,-11.4],[.3,.58,.57]);
  for(let i=0;i<5;i++)g.cone(-4.7+i*.15,.2,12.1,.16,.15,[.7,.6,.4],4,.16);
 }
 if(['sailing','returned','complete'].includes(b.stage)){
  const p=boatPosition(b.elapsed),co=Math.cos(p.angle),si=Math.sin(p.angle),q=(x,y,z)=>[p.x+x*co-z*si,.48+y,p.z+x*si+z*co];
  g.tri(q(-.65,0,0),q(.65,0,0),q(0,.33,.38),[.95,.89,.68]);g.tri(q(.65,0,0),q(-.65,0,0),q(0,.33,-.38),[.75,.79,.68]);g.tri(q(-.35,.15,0),q(.35,.15,0),q(0,1.05,0),[1,.95,.78]);g.ring(p.x,.26,p.z,.65,[.69,.85,.79],18,.035);
 }
 seaRenderer.drawDynamic(g);seaVFX.draw(seaEffects,[],seaClock);seaRenderer.sprite(seaArt.actor(['hero0','hero1','heroBack0','heroBack1'][(Math.floor(seaPlayer.walk)%2)+(seaPlayer.face.z<-.2?2:0)],seaHero),seaPlayer.x,0,seaPlayer.z,1.9,2.6);seaRenderer.sprite(seaArt.actor('naru',seaNaru),4,0,3,1.9,2.6);seaRenderer.sprite(seaArt.actor('doha',seaChild),-6,0,9,1.5,2.05);
 for(const [x,z]of[[-26,6],[27,-7],[-27,-23],[27,-34]])seaArt.drawProp('boat',x,0,z,7);for(const [x,z]of[[-11,3],[10,7],[-12,-24],[10,-26]]){seaArt.drawProp('stall',x,0,z,4.5);seaArt.drawProp('cargo',x+2.8,0,z+1,2);}
 for(const side of[-1,1])for(let z=-39;z<14;z+=7)seaArt.drawProp('lamp',side*17,0,z,3.7);for(const o of seaObjects){if(o.kind==='gate')seaArt.drawProp('sluice',o.x,0,o.z,3.2);if(o.kind==='gauge')seaArt.drawProp('gauge',o.x,0,o.z,2.9);}
 for(let i=0;i<16;i++)for(const side of[-1,1])seaArt.drawProp(i%3?'shrub':'rock',side*(14.7+Math.sin(i)*.5),0,-39+i*3.3,1.8);seaArt.drawProp('arch',0,0,-32,5.5);
 seaObjects.forEach((o,i)=>{if(seaVisible(o))seaRenderer.sprite(seaLabels[i],o.x,o.kind==='gate'?3:3.2,o.z,5.5,.65);});for(const side of[-1,1])for(let z=-39;z<14;z+=7)seaRenderer.sprite(seaGlow,side*17,2.2,z,1.6,1.6,.5);seaRenderer.finish();
 const nearest=seaNearest();el('chapterPrompt').textContent=nearest&&!seaDialog?'E · '+nearest.name:'';el('tideStatus').textContent=tideDescription(seaState.gates);el('chapterRecord').textContent='수압 관측 '+seaState.observations.filter(Boolean).length+' / 3'+(tideIntel(seaState)?' · 역류 원리 발견':'')+(seaSaveFailed?' · 저장 불가':'');el('chapterObjective').textContent=seaState.boss.rewritten?'쇄해 1막 완료 · 돌아올 길을 지켜라.':seaState.boss.defeated?'문지기의 수문에서 남은 명령을 다시 쓰세요.':seaState.foregate?'북쪽 수문을 조사해 벨로크에 도전하세요.':!seaState.introduced?'제방지기 나루와 대화하세요.':status==='circulation'?'내려간 보행교를 건너 북쪽 수문을 조사하세요.':'두 수문의 흐름을 바꾸고 수압계를 관측하세요.';
 el('boatQuest').classList.toggle('hidden',!b.met);el('boatTitle').textContent=b.stage==='unknown'?'도하의 작은 부탁':b.stage==='complete'?'돌아오는 배 · 완료':'히든 퀘스트 · 돌아오는 배';el('boatHint').textContent=boatHint(seaState);el('boatProgress').textContent=b.stage==='sailing'?Math.floor(b.elapsed/14*100)+'%':b.stage==='complete'?'획득: 물길의 기억':'';
}
function seaTick(dt){if(seaPaused||seaDialog)return;if(seaArena){seaArenaTick(dt);return;}seaClock+=dt;if(tickBoat(seaState,dt))saveSea();seaCooldown=Math.max(0,seaCooldown-dt);let x=Number(seaKeys.has('d')||seaKeys.has('arrowright'))-Number(seaKeys.has('a')||seaKeys.has('arrowleft')),z=Number(seaKeys.has('s')||seaKeys.has('arrowdown'))-Number(seaKeys.has('w')||seaKeys.has('arrowup'));const d=normalize(x,z);if(x||z){seaPlayer.face=d;seaPlayer.walk+=dt*9;}const blockers=tideState(seaState.gates)==='circulation'?seaObstacles:[...seaObstacles,...Array.from({length:13},(_,i)=>({x:-3+i*.5,z:-24,r:.42}))];const p=resolveMove(seaPlayer,d.x*6.2*dt,d.z*6.2*dt,blockers);seaPlayer.x=clamp(p.x,-18.5,18.5);seaPlayer.z=clamp(p.z,-40,16);for(let i=seaEffects.length-1;i>=0;i--)if((seaEffects[i].life-=dt)<=0)seaEffects.splice(i,1);}
function seaAttack(kind){if(seaPaused||seaDialog)return;if(seaArena){if(!hitBelrok(seaBoss,seaPlayer,kind))return;}else{if(seaCooldown>0)return;seaCooldown=kind==='wave'?.75:.38;}seaEffects.push({kind,x:seaPlayer.x,z:seaPlayer.z,angle:Math.atan2(seaPlayer.face.z,seaPlayer.face.x),life:kind==='wave'?.75:.32,max:kind==='wave'?.75:.32});}
function seaArenaTick(dt){
 const b=seaBoss;seaClock+=dt;tickBelrok(b,seaPlayer,dt);
 if(b.phase==='lost'){seaArena=false;seaEffects.length=0;seaPlayer.x=0;seaPlayer.z=-29;seaKeys.clear();seaTalk('제방 앞에서 다시',['루미: “괜찮아요. 돌아오는 길은 남아 있어요.”\n히든 퀘스트와 관측 기록은 유지됩니다. 수문을 조사하면 체력을 회복한 상태로 재도전합니다.']);return;}
 if(b.phase==='won'&&!seaState.boss.defeated){seaState.boss.defeated=true;seaEffects.length=0;seaKeys.clear();saveSea();}
 let x=Number(seaKeys.has('d')||seaKeys.has('arrowright'))-Number(seaKeys.has('a')||seaKeys.has('arrowleft')),z=Number(seaKeys.has('s')||seaKeys.has('arrowdown'))-Number(seaKeys.has('w')||seaKeys.has('arrowup'));let d=normalize(x,z);if(x||z){seaPlayer.face=d;seaPlayer.walk+=dt*9;}else if(b.dashing>0)d=seaPlayer.face;
 const p=resolveMove(seaPlayer,d.x*(b.dashing>0?18:6.2)*dt,d.z*(b.dashing>0?18:6.2)*dt,[{x:0,z:-54,r:1.7}]),dx=p.x,dz=p.z+54,len=Math.hypot(dx,dz),factor=len>11.4?11.4/len:1;seaPlayer.x=dx*factor;seaPlayer.z=-54+dz*factor;
 if(seaKeys.has('j'))seaAttack('slash');
 for(const h of b.bursts.splice(0))seaEffects.push({kind:'enemy',boss:true,water:true,x:h.x,z:h.z,r:h.r,life:.65,max:.65});
 for(let i=seaEffects.length-1;i>=0;i--)if((seaEffects[i].life-=dt)<=0)seaEffects.splice(i,1);
}
function pauseSea(){seaPaused=!seaPaused;seaKeys.clear();el('chapterPause').textContent=seaPaused?'계속하기':'일시정지';}
el('chapterJournal').onclick=()=>{if(seaDialog||seaPaused||seaArena)return;const s=seaState,b=s.boat;seaTalk('쇄해 · 발견 기록',[
 '수압 관측 '+s.observations.filter(Boolean).length+' / 3\n'+s.observations.map((v,i)=>(v?'● ':'○ ')+['저류: 들어오는 물의 압력','배수: 되돌림 표식','순환: 물이 돌아오는 경로'][i]).join('\n'),
 b.met?(b.stage==='unknown'?'도하의 작은 부탁':'돌아오는 배')+'\n'+boatHint(s):'아직 주민들의 작은 부탁을 기록하지 않았다.',
 b.stage==='complete'?'물길의 기억\n'+BELROK_CLUE:'획득한 물길의 기억이 없다.'
]);};
el('seaSlash').onpointerdown=e=>{e.preventDefault();seaAttack('slash');};el('seaWave').onclick=()=>seaAttack('wave');el('seaDash').onclick=()=>{if(seaArena&&!seaDialog&&!seaPaused)dashBelrok(seaBoss);};
el('seaPractice').onclick=()=>{if(!seaState.boss.defeated||seaArena||seaDialog||seaPaused)return;seaArena=true;seaEffects.length=0;seaKeys.clear();startBelrok(seaBoss,seaPlayer);seaPlayer.face={x:0,z:-1};};
el('chapterPause').onclick=pauseSea;el('chapterNext').onclick=seaAdvance;el('chapterInteract').onclick=seaInteract;
for(const b of document.querySelectorAll('[data-sea-key]')){b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);seaKeys.add(b.dataset.seaKey);};b.onpointerup=b.onpointercancel=b.onlostpointercapture=()=>seaKeys.delete(b.dataset.seaKey);}
addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['BUTTON','A'].includes(e.target?.tagName)&&['enter',' '].includes(k))return;if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();if(e.repeat)return;if(k==='e'||k==='enter'&&seaDialog){seaInteract();return;}if(k==='escape'){pauseSea();return;}if(seaDialog)return;seaKeys.add(k);if(seaArena&&(k==='k'||k===' '))dashBelrok(seaBoss);if(k==='j')seaAttack('slash');if(k==='l')seaAttack('wave');});addEventListener('keyup',e=>seaKeys.delete(e.key.toLowerCase()));addEventListener('blur',()=>{seaKeys.clear();if(!seaPaused)pauseSea();saveSea();});document.addEventListener('visibilitychange',()=>{if(document.hidden){seaKeys.clear();if(!seaPaused)pauseSea();saveSea();}});addEventListener('pagehide',saveSea);
let seaPrevious=performance.now(),seaAccumulator=0;function seaLoop(now){seaAccumulator+=clamp((now-seaPrevious)/1000,0,.15);seaPrevious=now;let n=0;while(seaAccumulator>=1/60&&n++<8){seaTick(1/60);seaAccumulator-=1/60;}if(n>=8)seaAccumulator=0;seaDraw();requestAnimationFrame(seaLoop);}requestAnimationFrame(seaLoop);
if(!seaState.arrival)seaTalk('쇄해 · 닫힌 길의 바다',SWAEHAE_SCENES.arrival,()=>{seaState.arrival=true;saveSea();});
window.recommandSea={snapshot:()=>JSON.parse(JSON.stringify({state:seaState,player:seaPlayer,paused:seaPaused,tide:tideState(seaState.gates),vfxReady:seaVFX.ready,backend:seaRenderer.backend}))};

if(typeof window.dispatchEvent==='function')window.dispatchEvent(new Event('recommand-ready'));
