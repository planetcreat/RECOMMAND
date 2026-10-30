import {Renderer,Geometry} from './engine.js';
import {SoftwareRenderer} from './software.js';
import {WorldArt} from './art.js';
import {CombatVFX} from './vfx.js';
import {clamp,distance,normalize,resolveMove} from './math.js';
import {LATE_PLANETS,RELAY_TEXT} from './late-story.js';
import {LATE_KEYS,newLateState,decodeLate,noteEvidence,reconstruct,canEnterLateBoss,canWitness,journeySummary,canShare,loadLate,writeLate} from './late-state.js';
import {LATE_BOSS_CENTER,LATE_DEVICE,createLateBoss,tickLateBoss,hitLateBoss,dashLateBoss,divertLateBoss,latePhaseText} from './late-combat.js';
import {makeLateBossModel} from './late-models.js';

const lateEl=id=>document.getElementById(id),latePlanet=document.documentElement.dataset.planet,lateConfig=LATE_PLANETS[latePlanet],isSnow=latePlanet==='mumyeong';
if(!lateConfig)throw Error('행성 구성을 읽을 수 없습니다.');
document.documentElement.style.setProperty('--accent',lateConfig.color);
let lateRenderer;
try{lateRenderer=new Renderer(lateEl('lateWorld'));lateRenderer.backend='webgl';}
catch{const c=document.createElement('canvas');c.id='lateWorld';c.tabIndex=0;c.setAttribute('aria-label',lateConfig.name+'의 휘어진 세계');lateEl('lateWorld').replaceWith(c);lateRenderer=new SoftwareRenderer(c);}
const lateSoft=lateRenderer.backend==='software';if(lateSoft)Geometry.lowDetail=true;
const lateArt=new WorldArt(lateRenderer),lateVFX=new CombatVFX(lateRenderer,()=>0),lateKeys=new Set(),lateEffects=[],lateObstacles=[];
const lateLoad=loadLate(localStorage,latePlanet);
let lateState=lateLoad.state||newLateState(latePlanet),lateStarted=false,latePaused=false,lateDialogue=null,lateOverlay=false,lateArena=null,lateClock=0,lateAutosave=0,lateToastClock=0,lateHUDClock=0,lateSaveError=false;
let latePracticeMode=false,lateTrialReturn=null,lateImportPending=null;
const latePlayer={x:lateState.player.x,z:lateState.player.z,hp:lateState.player.hp,face:{x:0,z:-1},walk:0,dash:0,dashing:0,inv:0,slash:0,wave:0};
const lateCamera={x:latePlayer.x,z:latePlayer.z};
function lateSet(id,text){const e=lateEl(id);if(e.textContent!==String(text))e.textContent=String(text);}
function lateToast(text){lateSet('lateToast',text);lateEl('lateToast').hidden=false;lateToastClock=5;}
function lateJourney(){return journeySummary(key=>{try{return localStorage.getItem(key);}catch{return null;}});}
function lateSave(){
 if(!lateStarted)return false;
 if(!lateArena)lateState.player={x:latePlayer.x,z:latePlayer.z,hp:Math.max(1,latePlayer.hp)};
 try{writeLate(localStorage,lateState);lateSaveError=false;return true;}catch(e){if(!lateSaveError)lateToast('자동 저장을 사용할 수 없습니다. 진행 보관에서 파일로 남겨 주세요.');lateSaveError=true;return false;}
}
function lateTalk(title,lines,after=null,choices=null,tag=null){
 lateKeys.clear();lateDialogue={title,lines,index:0,after,choices};lateEl('lateDialogue').hidden=false;lateSet('dialogTag',tag||lateConfig.roman.toUpperCase()+' · FIELD RECORD');lateRenderDialogue();
}
function lateButton(parent,label,handler,primary=false){const b=document.createElement('button');b.textContent=label;if(primary)b.className='primary';b.onclick=handler;parent.append(b);return b;}
function lateRenderDialogue(){
 const d=lateDialogue;if(!d)return;lateSet('lateSpeaker',d.title);lateSet('lateText',d.lines[d.index]);lateSet('latePage',(d.index+1)+' / '+d.lines.length);
 lateEl('lateChoices').replaceChildren();const choices=d.choices&&d.index===d.lines.length-1;lateEl('lateNext').hidden=!!choices;
 if(choices){for(const c of d.choices)lateButton(lateEl('lateChoices'),c.label,()=>{lateCloseTalk();c.action();},c.primary);lateEl('lateChoices').firstElementChild?.focus();}
 else lateEl('lateNext').focus();
}
function lateCloseTalk(){lateDialogue=null;lateEl('lateDialogue').hidden=true;lateKeys.clear();lateEl('lateWorld').focus();}
function lateAdvance(){if(!lateDialogue||lateDialogue.choices&&lateDialogue.index===lateDialogue.lines.length-1)return;const d=lateDialogue;if(++d.index<d.lines.length)lateRenderDialogue();else{lateCloseTalk();d.after?.();lateSave();lateUpdateHUD();}}
function lateStart(load){
 if(lateStarted)return;
 if(load&&!lateLoad.state){lateToast(lateLoad.error?'기록 확인: '+lateLoad.error:'이 주소에는 저장된 '+lateConfig.name+' 기록이 없습니다.');return;}
 if(!load){let exists=false;try{exists=!!localStorage.getItem(LATE_KEYS[latePlanet]);}catch{}
  if(exists&&!confirm('이 행성에서 새 여정을 시작하면 기존 진행을 바꿉니다. 원본은 진행 보관에서 먼저 내보낼 수 있습니다. 계속할까요?'))return;
  lateState=newLateState(latePlanet);Object.assign(latePlayer,{x:0,z:10,hp:100});
 }
 lateStarted=true;lateEl('lateStart').hidden=true;lateCamera.x=latePlayer.x;lateCamera.z=latePlayer.z;
 if(!lateState.arrived)lateTalk(lateConfig.name+' · '+lateConfig.subtitle,lateConfig.arrival,()=>{lateState.arrived=true;lateSave();});
 else{lateEl('lateWorld').focus();if(lateLoad.source==='backup')lateToast('이전 자동 저장으로 복구했습니다. 기존 원본은 진행 보관에서 내보낼 수 있습니다.');}
 lateSave();lateUpdateHUD();
}
function lateTravel(chapter){lateSave();if(window.parent!==window)parent.postMessage({type:'recommand-switch',chapter},'*');else location.href=(chapter==='yuon'?'index':chapter)+'.html';}
function lateNearest(){return lateConfig.objects.filter(o=>o.kind!=='secret'&&distance(o,latePlayer)<3.5&&(o.kind!=='portal'||lateState.ending)).sort((a,b)=>distance(a,latePlayer)-distance(b,latePlayer))[0];}
function lateSecret(){return lateConfig.objects.find(o=>o.kind==='secret'&&distance(o,latePlayer)<1.7);}
function lateInteract(){
 if(!lateStarted||latePaused||lateOverlay)return;if(lateDialogue){lateAdvance();return;}
 if(lateArena){
  if(lateArena.active){if(divertLateBoss(lateArena,latePlayer,isSnow?lateState.compared[1]:lateState.relays[1]))lateToast('갈라진 원 · 역류 우회 성공');return;}
  return;
 }
 const secret=lateSecret();if(secret){lateInteractSecret(secret);return;}
 const o=lateNearest();if(!o)return;
 if(o.kind==='portal'){lateTravelMenu();return;}
 if(isSnow)lateSnowInteract(o);else lateOrbitInteract(o);
}
function lateSnowInteract(o){
 const e=lateConfig.evidence[o.id];
 if(e){lateTalk(e.title,e.lines,()=>{noteEvidence(lateState,o.id);lateSave();});return;}
 if(o.id==='weave'){lateBoard();return;}
 if(o.id==='lumi'){
  if(lateState.chime&&!lateState.asked)lateTalk('루미 · 작은 종의 대답',['루미는 종을 쥔 당신의 손을 바라본다. “누군가 돌아왔다는 걸, 이름 없이도 알 수 있었네요.”'],null,[{label:'루미, 어디에 남고 싶어?',primary:true,action:()=>lateTalk('루미가 고른 자리',['“오늘은 여기요. 두 사람이 서로의 기억을 말하는 걸 끝까지 듣고 싶어요.”','주인공은 종을 내려놓고 옆에 앉는다.\n작은 종의 약속 · 이름을 되찾기보다 오늘의 대답을 기억한다.'],()=>{lateState.asked=true;lateSave();})},{label:'종탑으로 먼저 가자',action:()=>lateToast('루미는 종을 잠시 더 바라본다.')}]);
  else lateTalk('루미',[lateState.asked?'“오늘의 대답은 오늘 남길게요. 내일은 또 달라도 괜찮죠?”':'“둘 다 거짓말을 하는 것 같지는 않아요. 보고 싶었던 장면을 먼저 기억한 걸지도 몰라요.”']);return;
 }
 if(o.id==='gate'){
  if(!canEnterLateBoss(lateState)){lateTalk('백면의 문',['[서로 충돌하는 기록 감지.]\n기억을 겹치는 자리에서 세 모순을 대조하면 문을 통과할 수 있다.','증언을 지우거나 한 사람을 가짜로 정할 필요는 없다. 장면이 실제로 무엇을 남겼는지 비교하자.']);return;}
  if(lateState.boss){lateSnowEnding();return;}
  lateTalk(lateConfig.boss,['네벨: [일치하지 않는 기억은 존재하지 않은 것으로 보존한다.]','루미: “빛만 따라가지 마요. 진짜 무게는 눈에 흔적을 남겼어요.”','전투 · J 검격 / L 파동 / K·Space 회피\n푸른 바닥 자국이 있는 공격을 피하고, 가면이 열릴 때 공격하세요.'],()=>lateEnterArena());
 }
}
function lateBoard(){
 const choices=lateConfig.reconstructions.map((r,i)=>({label:(lateState.compared[i]?'✓ ':'')+r.title,action:()=>lateCompare(i)}));choices.push({label:'잠시 떠나기',action:()=>{}});
 lateTalk('기억을 겹치는 자리',['같은 밤을 말하는 증언과 남아 있는 장면을 겹친다.\n대조는 사람을 지우는 일이 아니라, 서로 다르게 기억한 이유를 남기는 일이다.'],null,choices);
}
function lateCompare(i){
 const r=lateConfig.reconstructions[i],missing=r.need.filter(id=>!lateState.heard.includes(id));
 if(missing.length){lateTalk(r.title,['아직 대조할 장면이 충분하지 않다.\n확인할 기록: '+missing.map(id=>lateConfig.evidence[id].title).join(' · ')],lateBoard);return;}
 lateTalk(r.title,[r.question],null,r.choices.map((label,answer)=>({label,action:()=>{
  const ok=reconstruct(lateState,i,answer);lateSave();lateTalk(ok?'서로 다른 기억을 잇다':'장면을 다시 바라보기',[ok?r.explanation:'그 설명으로는 남아 있는 장면을 모두 설명할 수 없다.\n'+r.explanation],lateBoard);
 }})));
}
function lateInteractSecret(o){
 if(isSnow){
  if(!lateState.compared.every(Boolean)){lateTalk('눈 아래 작은 소리',['작은 종이 바람에 흔들린다. 누구의 이름도 새겨져 있지 않다.']);return;}
  lateTalk('히든 발견 · 누구도 부르지 않은 이름',['돌아온 발자국이 이 자리에서 멈춰 있다. 종 안쪽에 작은 글씨가 남아 있다.','“내 이름 대신, 돌아왔다는 소리를 기억해 줘.”','루미는 종소리가 그칠 때까지 기다린다. 무슨 말을 해야 하는지 알려 주기보다 어디에 머물고 싶은지 물을 수 있을 것 같다.'],()=>{lateState.chime=true;lateSave();});
 }else{
  lateTalk('내일을 위한 빈 의자',['관리핵의 중심에서 벗어난 작은 의자다. 그 앞에는 명령 입력란 대신 비어 있는 질문 한 줄이 있다.'],null,[{label:'내일은 어디로 가고 싶어?',primary:true,action:()=>lateTalk('루미 · 아직 정하지 않은 내일',['“오늘은 여기 남고 싶어요. 다 끝나는 걸 보고 싶거든요.”','“내일은 또 물어봐 줘요.”'],()=>{lateState.tomorrow=true;lateState.lumi=true;lateSave();})},{label:'지금은 관리핵으로 가자',action:()=>lateToast('질문은 빈 의자 앞에 남아 있다.')}]);
 }
}
function lateOrbitInteract(o){
 const index=['garden','sea','snow'].indexOf(o.id);
 if(index>=0){lateRelay(index);return;}
 if(o.id==='lumi'){lateTalk('루미 · 돌아오는 목소리',['“여기서는 우리가 했던 일이 그대로 돌아와요. 위험한 것도, 누군가에게 물어봤던 것도요.”','“아직 연결되지 않은 목소리라면, 제가 대신 대답하지 않을게요. 항로는 열어 둘 수 있잖아요.”']);return;}
 if(o.id==='assembly'){
  const j=lateJourney(),names=['유온','쇄해','무명'];lateTalk('응답의 원탁',[
   names.map((name,i)=>name+' · '+(j[['garden','sea','snow'][i]]?'주민의 응답 회선 연결':j.completed[i]?'아직 여행자에게 남은 결정':'이 항로에서 확인된 완료 기록 없음')).join('\n'),
   '응답대의 시험은 이전 명령이 어떤 공격으로 돌아오는지 보여 준다. 시험을 마친 뒤 회선을 주민에게 돌릴지 선택할 수 있다.\n도착하지 않은 응답을 동의로 바꾸지는 않는다.'
  ],null,[{label:'항로를 살펴보기',action:lateTravelMenu},{label:'지금의 응답을 듣고 떠나기',action:()=>{}}]);return;
 }
 if(o.id==='gate'){
  if(!canEnterLateBoss(lateState)){lateTalk('최초 명령의 관리핵',['세 응답대가 아직 동기화되지 않았다. 유온·쇄해·무명의 반응 시험을 직접 통과하자.','세 시험 모두 공격을 피하고 빈틈이 끝날 때까지 버티면 완료된다. 시험 중 기록을 잃지 않는다.']);return;}
  if(lateState.boss){lateFinalChoice();return;}
  lateTalk(lateConfig.boss,['관리핵: [명령권자 귀환 확인. 과거 명령을 순서대로 실행한다.]','유온의 세 파동 → 쇄해의 토출과 회수 → 무명의 진짜 흔적.\n반응은 앞선 행성에 남긴 명령에 따라 달라진다.','주인공: “이번에는 멈추는 것만으로 끝내지 않겠어.”'],()=>lateEnterArena());
 }
}
function lateRelay(index){
 const key=['garden','sea','snow'][index],r=RELAY_TEXT[key];
 const choices=[{label:lateState.relays[index]?'반응 시험 다시 하기':'반응 시험 시작',primary:true,action:()=>lateEnterTrial(key,index)}];
 if(lateState.relays[index])choices.push({label:'응답 회선 선택하기',action:()=>lateRelayChoice(index)});
 choices.push({label:'나중에 돌아오기',action:()=>{}});
 const journey=lateJourney(),variant=key==='garden'?(journey.garden?'주민에게 열어 둔 회선이 중심의 파동을 고정한다.':'고정된 보호 경계가 마지막 파동에 바깥 감시원을 더한다.'):key==='sea'?(journey.patterns.sea==='return'?'되돌림 홈의 서쪽 회선은 이미 열린 길이다.':'닫힌 항로의 회수는 세 홈 모두를 덮는다.'):journey.patterns.snow==='trace'?'대조한 흔적이 진짜 신호의 자국을 푸르게 남긴다.':'이름으로 걸러진 신호에는 더 많은 밝은 잔상이 섞인다.';
 lateTalk(r.title,[r.test+'\n\n이 항로의 반응: '+variant],null,choices,'ORBIT RESPONSE · '+key.toUpperCase());
}
function lateRelayChoice(index){
 const key=['garden','sea','snow'][index],r=RELAY_TEXT[key];
 lateTalk(r.title,[r.question],null,r.choices.map((label,i)=>({label,primary:i===0,action:()=>{
  const valid=lateJourney()[key];lateState.invited[index]=i===0;lateSave();
  lateTalk(r.title,[i===0?(valid?'응답 회선이 주민에게 돌아갔다. 앞선 행성에서 직접 들은 대답이 수신된다.':'질문을 보냈다. 이 항로에는 아직 그 행성의 자발적 응답이 연결되지 않았다.\n회선은 열어 두며, 관리핵이 대답을 대신 채우지 않는다.'):'기존 관리 경로를 유지했다. 다시 찾아와 회선을 바꿀 수 있다.']);
 }})));
}
function lateEnterTrial(key,index){lateTrialReturn={x:latePlayer.x,z:latePlayer.z,index};lateEnterArena(key);}
function lateEnterArena(trial=null,practice=false){
 lateKeys.clear();lateSave();latePracticeMode=practice;lateArena=createLateBoss(latePlanet,lateJourney().patterns,trial);latePlayer.x=0;latePlayer.z=-57;latePlayer.hp=100;latePlayer.face={x:0,z:-1};lateEffects.length=0;lateCamera.x=0;lateCamera.z=-58;lateUpdateHUD();lateEl('lateWorld').focus();
}
function lateLeaveArena(){
 const trial=lateArena?.trial;lateArena=null;lateEffects.length=0;lateKeys.clear();latePlayer.hp=100;
 if(trial&&lateTrialReturn){latePlayer.x=lateTrialReturn.x;latePlayer.z=lateTrialReturn.z;}else{latePlayer.x=0;latePlayer.z=-38;}
 lateTrialReturn=null;lateCamera.x=latePlayer.x;lateCamera.z=latePlayer.z;lateUpdateHUD();
}
function lateSnowEnding(){
 const choices=[{label:'주민의 기록을 복원한다',action:()=>lateFinish('restore')}];
 if(canWitness(lateState))choices.push({label:'이름 없이도 서로의 말을 기억한다',primary:true,action:()=>lateFinish('witness')});
 choices.push({label:'아직 이 설원에 더 머무른다',action:()=>{}});
 lateTalk('무명 · 이름과 목소리',['이름을 되찾아 다시 통제할 수도 있었다. 그러나 주민의 기억을 듣기 위해 그 이름을 돌려받을 필요는 없다.'],null,choices);
}
function lateFinalChoice(){
 const choices=[{label:'공격 명령을 멈추고 응답을 기다린다',action:()=>lateFinish('guarded')}];
 if(canShare(lateState,lateJourney()))choices.push({label:'각자의 내일은, 각자의 선택으로',primary:true,action:()=>lateFinish('shared')});
 choices.push({label:'아직 듣지 못한 목소리에게 돌아간다',action:lateTravelMenu});
 lateTalk('환성 · 최종 명령',['관리핵: “최종 명령을 입력하십시오.”\n루미는 당신의 대답을 대신하지 않고 기다린다.'],null,choices,'FINAL COMMAND');
}
function lateFinish(ending){
 // Revalidate the optional route at the action, including any changed prior save.
 if(ending==='shared'&&!canShare(lateState,lateJourney())||ending==='witness'&&!canWitness(lateState))return;
 lateTalk(lateConfig.name+' · '+(ending==='shared'?'RE:COMMAND':'새로운 문장'),lateConfig.endings[ending],()=>{
  lateState.ending=ending;lateSave();lateShowEnding();
 },null,'A CHOICE TO KEEP');
}
function lateShowEnding(){
 lateOverlay=true;lateKeys.clear();lateEl('endingSplash').hidden=false;
 lateSet('endingTitle',isSnow?(lateState.ending==='witness'?'이름 없이 부르는 사이':'지워지지 않는 흔적'):(lateState.ending==='shared'?'내일은 또 물어봐 줘요':'대답을 기다리는 사람'));
 lateSet('endingText',isSnow?'지워진 이름의 설원에서 서로 다른 기억을 함께 남겼습니다.\n궤도로 이어지는 항로가 열렸습니다.':'유온의 숨, 쇄해의 길, 무명의 이름, 환성의 목소리.\n이야기의 끝에서도 항로는 닫히지 않습니다.');
 lateEl('endingExplore').focus();lateUpdateHUD();
}
function lateTravelMenu(){
 const names={yuon:'유온 · 남겨진 숨의 정원',swaehae:'쇄해 · 닫힌 길의 바다',mumyeong:'무명 · 지워진 이름의 설원',hwanseong:'환성 · 돌아온 목소리의 궤도'};
 lateTalk('네 행성의 항로',['각 행성의 기록은 같은 브라우저 주소에서 이어집니다. 아직 듣지 못한 대답이 있다면 돌아갈 수 있습니다.'],null,[...Object.entries(names).filter(([k])=>k!==latePlanet).map(([chapter,label])=>({label,action:()=>lateTravel(chapter)})),{label:'여기 머무르기',action:()=>{}}]);
}
function lateAttack(kind){
 if(!lateStarted||latePaused||lateDialogue||lateOverlay)return;
 if(lateArena){if(!hitLateBoss(lateArena,latePlayer,kind))return;}
 else{const k=kind==='slash'?'slash':'wave';if(latePlayer[k]>0)return;latePlayer[k]=kind==='slash'?.38:3.5;}
 lateEffects.push({kind,x:latePlayer.x,z:latePlayer.z,angle:Math.atan2(latePlayer.face.z,latePlayer.face.x),life:kind==='slash'?.32:.75,max:kind==='slash'?.32:.75});
}
function lateDash(){if(!lateStarted||latePaused||lateDialogue||lateOverlay)return;if(lateArena){dashLateBoss(lateArena);return;}if(latePlayer.dash>0)return;latePlayer.dash=1.15;latePlayer.dashing=.19;latePlayer.inv=.3;}
function lateTick(dt){
 lateClock+=dt;if(lateToastClock>0){lateToastClock-=dt;if(lateToastClock<=0)lateEl('lateToast').hidden=true;}
 if(!lateStarted||latePaused||lateDialogue||lateOverlay)return;
 for(const key of['dash','dashing','inv','slash','wave'])latePlayer[key]=Math.max(0,latePlayer[key]-dt);
 if(lateArena){
  tickLateBoss(lateArena,latePlayer,dt);latePlayer.hp=lateArena.hero;
  if(lateArena.phase==='lost'){const trial=lateArena.trial;lateLeaveArena();lateTalk('돌아오는 길',lateConfig.defeat,()=>lateSave());if(trial)lateToast('시험을 다시 시작할 수 있습니다.');return;}
  if(lateArena.phase==='trialWon'){const index=lateTrialReturn.index;lateState.relays[index]=true;lateLeaveArena();lateSave();lateRelayChoice(index);return;}
  if(lateArena.phase==='won'){
   const practice=latePracticeMode;lateLeaveArena();if(practice){lateToast('보스 연습 완료 · 기존 결말과 기록은 유지됩니다.');return;}
   lateState.boss=true;lateSave();lateTalk(lateConfig.boss,lateConfig.victory,isSnow?lateSnowEnding:lateFinalChoice);return;
  }
 }
 let dx=Number(lateKeys.has('d')||lateKeys.has('arrowright'))-Number(lateKeys.has('a')||lateKeys.has('arrowleft')),dz=Number(lateKeys.has('s')||lateKeys.has('arrowdown'))-Number(lateKeys.has('w')||lateKeys.has('arrowup')),d=normalize(dx,dz);
 if(dx||dz){latePlayer.face=d;latePlayer.walk+=dt*9;}else if((lateArena?.dashing||latePlayer.dashing)>0)d=latePlayer.face;
 const speed=(lateArena?.dashing||latePlayer.dashing)>0?18:6.2;
 const obstacles=lateArena?[{...LATE_BOSS_CENTER,r:1.5}]:lateObstacles;
 const p=resolveMove(latePlayer,d.x*speed*dt,d.z*speed*dt,obstacles);latePlayer.x=p.x;latePlayer.z=p.z;
 if(lateArena){const x=p.x,z=p.z+64,len=Math.hypot(x,z),scale=len>11.4?11.4/len:1;latePlayer.x=x*scale;latePlayer.z=-64+z*scale;}
 else{latePlayer.x=clamp(p.x,-26,26);latePlayer.z=clamp(p.z,-46,18);latePlayer.hp=Math.min(100,latePlayer.hp+dt*3);}
 if(lateKeys.has('j'))lateAttack('slash');
 for(let i=lateEffects.length-1;i>=0;i--)if((lateEffects[i].life-=dt)<=0)lateEffects.splice(i,1);
 if((lateAutosave+=dt)>=6){lateAutosave=0;lateSave();}
}

const lateTerrain=new Geometry(),lateArchitecture=new Geometry();
for(let x=-60;x<60;x+=3)for(let z=-96;z<35;z+=3){
 const n=Math.sin(x*.17+z*.25)*.023+Math.cos(z*.31-x*.3)*.015;
 const col=isSnow?[.7+n,.79+n,.83+n]:Math.abs(x)<27&&z<22?[.25+n,.25+n,.37+n]:[.08+n*.3,.13+n*.3,.23+n*.3];
 lateTerrain.quad([x,0,z],[x+3,0,z],[x+3,0,z+3],[x,0,z+3],col);
}
function latePath(x,z,w,h){for(let px=x-w/2;px<x+w/2;px+=1.25)for(let pz=z-h/2;pz<z+h/2;pz+=1.5){const c=isSnow?[.48,.6,.66]:[.48,.43,.55];lateArchitecture.quad([px,.07,pz],[Math.min(px+1.19,x+w/2),.07,pz],[Math.min(px+1.19,x+w/2),.07,Math.min(pz+1.43,z+h/2)],[px,.07,Math.min(pz+1.43,z+h/2)],c);}}
latePath(0,-13,4.5,59);
for(const o of lateConfig.objects){if(o.kind==='secret'||o.kind==='portal')continue;latePath(o.x/2,o.z,Math.abs(o.x)+4,2.6);}
if(isSnow){
 for(const side of[-1,1])for(let i=0;i<9;i++){
  const x=side*(20+i%2*3),z=14-i*6.5;lateArchitecture.cone(x,0,z,1.5,.65,[.43,.56,.63],6,1.2);lateArchitecture.cone(x,.65,z,2,5.1,[.67,.79,.83],7,.12);
  lateObstacles.push({x,z,r:1.35});
 }
 for(const [x,z]of[[-18,5],[18,-5],[-19,-19],[19,-30]]){
  lateArchitecture.cone(x,0,z,2.4,3.2,[.44,.55,.61],4,2.4);lateArchitecture.cone(x,3.2,z,3,2,[.85,.9,.91],4);lateArchitecture.cone(x,1,z+1.7,.4,1.5,[.23,.37,.45],4,.4);lateObstacles.push({x,z,r:2.1});
 }
}else{
 for(const side of[-1,1])for(let i=0;i<10;i++){
  const x=side*24,z=15-i*6.5;lateArchitecture.cone(x,0,z,.6,1.1,[.35,.32,.46],6,.4);lateArchitecture.cone(x,1.1,z,.2,3.6,[.79,.66,.44],7,.1);lateArchitecture.cone(x,4.7,z,.45,.65,[.73,.67,.91],8);lateObstacles.push({x,z,r:.6});
 }
 for(const o of lateConfig.objects.filter(o=>o.kind==='relay')){
  lateArchitecture.ring(o.x,.1,o.z,3.7,[.68,.58,.83],48,.08);lateArchitecture.cone(o.x,0,o.z,1.3,1.1,[.34,.3,.46],8,.9);
 }
}
for(const o of lateConfig.objects.filter(o=>['echo','console','gate'].includes(o.kind))){
 if(o.kind==='gate')continue;
 lateArchitecture.cone(o.x,0,o.z,.9,o.kind==='console'?.8:1.7,isSnow?[.51,.64,.71]:[.43,.36,.56],7,.55);lateObstacles.push({x:o.x,z:o.z,r:.7});
}
const lateTerrainMesh=lateRenderer.upload(lateTerrain),lateArchitectureMesh=lateRenderer.upload(lateArchitecture);
const lateFallback=lateRenderer.texture('late-fallback-actor',c=>{
 c.fillStyle='#20304066';c.beginPath();c.ellipse(64,119,27,6,0,0,Math.PI*2);c.fill();c.fillStyle=isSnow?'#536c89':'#76608e';c.beginPath();c.moveTo(43,45);c.lineTo(85,45);c.lineTo(96,111);c.lineTo(32,111);c.fill();c.fillStyle='#e0cfb5';c.beginPath();c.ellipse(64,29,18,23,0,0,Math.PI*2);c.fill();c.fillStyle='#25354a';c.fillRect(43,5,42,16);
});
const lateLabelTextures=new Map();
for(const o of lateConfig.objects){if(o.kind==='secret')continue;lateLabelTextures.set(o.id,lateRenderer.texture('late-label-'+o.id,c=>{c.font='20px Malgun Gothic';c.textAlign='center';c.shadowColor='#132034';c.shadowBlur=7;c.fillStyle=isSnow?'#29485d':'#ece4cf';if(isSnow){c.shadowColor='#fff';c.shadowBlur=5;}c.fillText(o.name,256,36);},512,64));}
function lateGroundDetails(){
 const g=new Geometry(),c=isSnow?[.59,.79,.88]:[.77,.64,.93];
 for(const o of lateConfig.objects){
  if(o.kind==='portal'&&!lateState.ending)continue;
  if(o.kind==='secret'){
   if(isSnow){g.cone(o.x,.4,o.z,.2,.35,[.83,.71,.43],8,.07);g.ring(o.x,.07,o.z,.5,[.81,.86,.84],20,.04);}
   else{g.cone(o.x,.05,o.z,.9,.5,[.55,.46,.65],4,.9);g.cone(o.x,.5,o.z-.5,.8,.7,[.63,.52,.72],4,.8);}continue;
  }
  if(o.kind==='gate'||o.kind==='portal'){
   const active=o.kind==='portal'||canEnterLateBoss(lateState);g.ring(o.x,.09,o.z,3,[.7,.72,.8],48,.12);
   for(const side of[-1,1]){g.cone(o.x+side*2.5,0,o.z,.5,4.4,isSnow?[.62,.73,.8]:[.47,.4,.61],7,.32);g.cone(o.x+side*2.5,4.4,o.z,.55,.6,[.84,.74,.5],7);}
   for(let i=0;i<14;i++){const a=i/13*Math.PI;g.cone(o.x+Math.cos(a)*2.5,4.2+Math.sin(a)*2.1,o.z,.29,.45,active?c:[.4,.47,.58],6,.24);}
  }
  if(o.kind==='echo'){g.ring(o.x,1.8,o.z,.7,c,32,.09);g.cone(o.x,1.85,o.z,.19,.65,[.85,.88,.8],5);}
  if(o.kind==='console'){g.ring(o.x,.91,o.z,1.25,[.81,.74,.56],40,.07);g.cone(o.x,1,o.z,.14,.65,c,5);}
  if(o.kind==='relay'){
   const index=['garden','sea','snow'].indexOf(o.id),complete=lateState.relays[index];
   for(let k=0;k<3;k++){const a=lateClock*.3+k*Math.PI*2/3;g.cone(o.x+Math.cos(a)*1.7,1.8+Math.sin(a*2)*.3,o.z+Math.sin(a)*1.7,.25,.7,complete?[.59,.93,.82]:c,6);}
   g.ring(o.x,1.2,o.z,1.25,complete?[.57,.92,.8]:[.72,.64,.87],40,.12);
  }
 }
 // Particle positions are deterministic presentation, independent of the gameplay clock and random state.
 for(let i=0;i<(lateSoft?28:65);i++){
  const x=latePlayer.x+Math.sin(i*7.13)*23+Math.sin(lateClock*.18+i)*.6,z=latePlayer.z+Math.cos(i*4.71)*25,y=isSnow?1+(i*1.37+18-lateClock*.65)%12:3+(i*.73)%9;
  if(isSnow)g.cone(x,y,z,.035,.065,[.94,.96,.97],3);else g.cone(x,y+Math.sin(lateClock*.6+i)*.3,z,.04,.08,[.88,.79,.99],4);
 }
 lateRenderer.drawDynamic(g);
 for(const o of lateConfig.objects){
  if(o.kind==='npc')lateRenderer.sprite(lateArt.actor(o.actor,lateFallback),o.x,0,o.z,1.85,2.6);
  if(o.kind==='secret'||o.kind==='portal'&&!lateState.ending)continue;
  if(distance(o,latePlayer)<17)lateRenderer.sprite(lateLabelTextures.get(o.id),o.x,o.kind==='gate'?6.9:o.kind==='npc'?3.4:2.7,o.z,5.9,.72);
 }
 if(isSnow){for(const [x,z]of[[-18,5],[18,-5],[-19,-19],[19,-30]])lateArt.drawProp('cargo',x+3.4,0,z+1,2);for(const side of[-1,1])for(let i=0;i<5;i++)lateArt.drawProp('rock',side*18,0,-3-i*10,2.3);}
}
function lateArenaDraw(){
 const b=lateArena,g=new Geometry(),colors=isSnow?[.61,.79,.9]:[.72,.57,.9];
 g.ring(0,.1,-64,12,colors,64,.18);g.ring(0,.13,-64,9.2,[.48,.58,.7],64,.05);
 for(let i=0;i<12;i++){const a=i*Math.PI/6;g.cone(Math.cos(a)*12,.1,-64+Math.sin(a)*12,.34,2.1,i%3?colors:[.87,.74,.47],7,.14);}
 const d=LATE_DEVICE;g.cone(d.x,.1,d.z,.65,.8,[.57,.55,.54],7,.42);g.ring(d.x,.14,d.z,1.3,b.diverted?[.4,.94,.78]:[.87,.74,.46],32,.09,.35,Math.PI*2-.35);
 if(['warn','strike','returnWarn','returnStrike'].includes(b.phase))for(const h of b.hazards){
  const attacking=b.phase==='strike'||b.phase==='returnStrike';
  if(!h.real){for(let i=0;i<8;i++)g.ring(h.x,2.1+Math.sin(lateClock*2)*.2,h.z,h.r,[.8,.88,.96],24,.04,i*Math.PI/4,i*Math.PI/4+.3);continue;}
  g.disc(h.x,.09,h.z,.42,[.19,.37,.51],20);g.ring(h.x,.17,h.z,h.r,attacking?[1,.48,.35]:b.pattern==='snow'||b.pattern==='echo'?[.24,.62,.91]:[.95,.65,.42],48,attacking?.2:.1);
  const fraction=b.phase==='returnWarn'?b.time/2.6:b.time/1.65;
  if(!attacking)g.ring(h.x,.18,h.z,Math.max(.1,h.r*clamp(fraction,0,1)),[.67,.82,.9],32,.045);
  else for(let i=0;i<12;i++){const a=i/12*Math.PI*2;g.cone(h.x+Math.cos(a)*h.r,.15,h.z+Math.sin(a)*h.r,.1,1.1,[.64,.85,.97],5);}
 }
 lateRenderer.drawDynamic(g);
 lateRenderer.drawDynamic(makeLateBossModel(isSnow?'mumyeong':'hwanseong',0,0,-64,lateClock,b,lateSoft));
 if((b.pattern==='snow'||b.pattern==='echo')&&b.phase==='warn')for(const h of b.hazards.filter(h=>!h.real))lateRenderer.sprite(lateArt.actor('elder',lateFallback),h.x,.5,h.z,2.4,3.3,.25);
}
function lateDraw(){
 const dx=latePlayer.x-lateCamera.x,dz=latePlayer.z-lateCamera.z;
 // Rendering follows a separate camera; simulation and collision use the unmodified player position.
 lateCamera.x+=dx*.12;lateCamera.z+=dz*.12;
 lateRenderer.begin(lateCamera.x,lateCamera.z,.011);lateRenderer.mesh(lateTerrainMesh);
 if(lateArena)lateArenaDraw();else{lateRenderer.mesh(lateArchitectureMesh);lateGroundDetails();}
 const walking=lateKeys.size>0&&!lateDialogue&&!latePaused&&!lateOverlay,back=latePlayer.face.z<-.2,frame=(walking?Math.floor(latePlayer.walk)%2:0)+(back?2:0),bob=walking?Math.sin(latePlayer.walk*2)*.035:Math.sin(lateClock*1.8)*.012;
 const inv=lateArena?.inv||latePlayer.inv;
 lateRenderer.sprite(lateArt.actor(['hero0','hero1','heroBack0','heroBack1'][frame],lateFallback),latePlayer.x,bob,latePlayer.z,1.9,2.65,inv>0&&Math.sin(lateClock*35)>0?.5:1);
 lateVFX.draw(lateEffects,[],lateClock);lateRenderer.finish();
}
function lateMapDraw(){
 const c=lateEl('lateMap').getContext('2d');if(!c)return;c.clearRect(0,0,180,180);c.fillStyle=isSnow?'#213a5077':'#161a3488';c.beginPath();c.arc(90,90,83,0,Math.PI*2);c.fill();
 const point=(x,z)=>[90+x*2.4,24+(z+46)*2.04];c.strokeStyle='#c2d9dd33';c.beginPath();c.moveTo(...point(0,16));c.lineTo(...point(0,-44));c.stroke();
 for(const o of lateConfig.objects){if(o.kind==='secret'||o.kind==='portal'&&!lateState.ending)continue;const[x,y]=point(o.x,o.z);c.fillStyle=o.kind==='npc'?'#e3d2a8':lateState.heard.includes(o.id)?'#9bcfc7':'#bedce6';c.beginPath();c.arc(x,y,o.kind==='gate'?4:2.6,0,Math.PI*2);c.fill();}
 const[x,y]=point(latePlayer.x,latePlayer.z);c.fillStyle='#fff3c5';c.beginPath();c.arc(x,y,3.3,0,Math.PI*2);c.fill();c.font='10px sans-serif';c.textAlign='center';c.fillStyle='#c8d9dd';c.fillText('N',90,15);
}
function lateUpdateHUD(){
 const arena=!!lateArena;lateEl('lateBossHud').hidden=!arena;lateEl('lateObjective').hidden=arena;lateEl('lateMap').hidden=arena;lateEl('lateQuest').hidden=arena||!(isSnow?lateState.chime:lateState.tomorrow);
 lateEl('latePractice').hidden=!lateState.boss||arena;lateSet('latePause',latePaused?'계속하기':'일시정지');
 if(arena){const b=lateArena;lateSet('lateBossName',b.trial?RELAY_TEXT[b.trial].title+' · 반응 시험':lateConfig.boss);lateEl('lateBossHealth').style.width=(b.hp/b.max*100)+'%';lateEl('lateHeroHealth').style.width=b.hero+'%';lateSet('lateBossNumbers',b.trial?'노출 종료까지 생존 · 여행자 '+b.hero+' / 100':b.hp+' / '+b.max+' · 여행자 '+b.hero+' / 100');lateSet('lateBossPhase',latePhaseText(b));lateSet('lateBossMessage',b.trial?'공격할 필요 없이 반응 한 주기를 피하면 시험을 통과합니다.':b.message||'바닥에 자국이 남는 원을 피하고, 명령핵이 열릴 때 공격하세요.');lateSet('lateBossSkills','J 검격 · L 파동 '+(b.wave>0?b.wave.toFixed(1)+'초':'준비')+' · K 회피 '+(b.dash>0?b.dash.toFixed(1)+'초':'준비'));lateSet('latePrompt',distance(latePlayer,LATE_DEVICE)<3.1?'E · 갈라진 원 / 회수 예고 때 우회':'');return;}
 let objective,hint;
 if(isSnow){objective=lateState.ending?'무명 완료 · 환성으로 이어지는 항로':lateState.boss?'백면의 문에서 남은 말을 선택하세요.':lateState.compared.every(Boolean)?'백면의 문으로 향하세요.':lateState.heard.length>=2?'증언과 장면을 기억의 자리에서 대조하세요.':'시온과 하제의 증언을 들어 보세요.';hint='증언 '+lateState.heard.filter(x=>['keeper','walker'].includes(x)).length+' / 2 · 과거 장면 '+lateState.heard.filter(x=>!['keeper','walker'].includes(x)).length+' / 3\n대조 '+lateState.compared.filter(Boolean).length+' / 3';}
 else{const j=lateJourney();objective=lateState.ending?'환성 완료 · 내일을 위한 열린 항로':lateState.boss?'관리핵에서 최종 명령을 선택하세요.':lateState.relays.every(Boolean)?'최초 명령의 관리핵으로 향하세요.':'세 응답대에서 앞선 명령의 반응을 시험하세요.';hint='반응 시험 '+lateState.relays.filter(Boolean).length+' / 3 · 응답 회선 '+['garden','sea','snow'].filter((k,i)=>j[k]&&lateState.invited[i]).length+' / 3\n현재 기록을 바꾸면 귀환 후 반응에도 반영됩니다.';}
 lateSet('objectiveText',objective);lateSet('objectiveHint',hint+(lateSaveError?'\n자동 저장 불가 · 진행 보관을 사용하세요.':''));
 [...lateEl('progressDots').children].forEach((e,i)=>e.classList.toggle('done',(isSnow?lateState.compared:lateState.relays)[i]));
 lateSet('questName',isSnow?'누구도 부르지 않은 이름':'내일을 위한 빈 의자');lateSet('questHint',isSnow?(lateState.asked?'작은 종의 약속 · 오늘의 대답을 기억한다.':'루미에게 어디에 머물고 싶은지 물어보자.'):'“내일은 또 물어봐 줘요.”');
 const o=lateNearest();lateSet('latePrompt',lateDialogue||lateOverlay?'':o?'E · '+o.name:'');lateMapDraw();
}

function latePauseToggle(){if(!lateStarted||lateDialogue||lateOverlay)return;latePaused=!latePaused;lateKeys.clear();lateUpdateHUD();lateEl('lateWorld').focus();}
function lateOpenJournal(){
 if(lateDialogue||lateOverlay||!lateStarted)return;lateOverlay=true;lateKeys.clear();const box=lateEl('journalEntries');box.replaceChildren();
 const entries=isSnow?lateState.heard.map(id=>lateConfig.evidence[id]):['garden','sea','snow'].map((key,i)=>({title:RELAY_TEXT[key].title,lines:[lateState.relays[i]?RELAY_TEXT[key].test:'반응 시험을 아직 마치지 않았다.',lateState.invited[i]?(lateJourney()[key]?'주민의 응답 회선이 연결되었다.':'질문을 보내고 응답을 기다리고 있다.'):'기존 관리 회선 유지 중.']}));
 if(isSnow)lateState.compared.forEach((v,i)=>{if(v)entries.push({title:'대조 · '+lateConfig.reconstructions[i].title,lines:[lateConfig.reconstructions[i].explanation]});});
 if(lateState.chime)entries.push({title:'누구도 부르지 않은 이름',lines:[lateState.asked?'“나를 알아보지 못해도 괜찮아. 오늘의 대답부터 기억해 줄래?”':'작은 종에 이름 대신 돌아왔다는 소리를 남겼다.']});
 if(lateState.tomorrow)entries.push({title:'내일을 위한 빈 의자',lines:['루미: “오늘은 여기 남고 싶어요. 내일은 또 물어봐 줘요.”']});
 if(!entries.length)entries.push({title:'첫 발자국',lines:['아직 직접 들은 증언이 없다. 사람에게 말을 걸고 남아 있는 장면을 조사하자.']});
 for(const e of entries){const card=document.createElement('article');card.className='journal-entry';const title=document.createElement('h3'),p=document.createElement('p');title.textContent=e.title;p.textContent=e.lines.join('\n\n');card.append(title,p);box.append(card);}
 lateEl('lateJournal').hidden=false;lateEl('closeLateJournal').focus();
}
function lateCloseOverlay(id){lateEl(id).hidden=true;lateOverlay=false;lateKeys.clear();lateEl('lateWorld').focus();lateUpdateHUD();}
function lateDownload(name,data){const url=URL.createObjectURL(new Blob([data],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
function lateOpenFiles(){if(lateDialogue||lateOverlay||lateArena)return;lateOverlay=true;lateKeys.clear();lateEl('lateFilePanel').hidden=false;lateSet('lateFileStatus','다른 주소에서 진행을 이어가려면 내보낸 파일을 이곳에서 가져오세요.');lateEl('lateImportChoices').replaceChildren();lateEl('closeLateFiles').focus();}
lateEl('lateContinue').onclick=()=>lateStart(true);lateEl('lateNew').onclick=()=>lateStart(false);lateEl('lateNext').onclick=lateAdvance;
lateEl('lateInteract').onclick=lateInteract;lateEl('lateSlash').onclick=()=>lateAttack('slash');lateEl('lateWave').onclick=()=>lateAttack('wave');lateEl('lateDash').onclick=lateDash;
lateEl('latePause').onclick=latePauseToggle;lateEl('lateRecords').onclick=lateOpenJournal;lateEl('closeLateJournal').onclick=()=>lateCloseOverlay('lateJournal');lateEl('lateFiles').onclick=lateOpenFiles;lateEl('closeLateFiles').onclick=()=>{lateImportPending=null;lateCloseOverlay('lateFilePanel');};
lateEl('latePractice').onclick=()=>{if(!lateState.boss||lateDialogue||lateOverlay)return;lateEnterArena(null,true);};
lateEl('endingExplore').onclick=()=>lateCloseOverlay('endingSplash');lateEl('endingTravel').onclick=()=>{lateCloseOverlay('endingSplash');if(isSnow)lateTravel('hwanseong');else lateTravelMenu();};
lateEl('lateExport').onclick=()=>{if(!lateStarted&&!lateLoad.state){lateSet('lateFileStatus','아직 시작한 진행이 없습니다. 저장 원본 보관을 사용하세요.');return;}lateSave();lateDownload('RECOMMAND-'+latePlanet+'-save.json',JSON.stringify(lateState,null,2));lateSet('lateFileStatus','현재 행성의 진행 파일을 내보냈습니다.');};
lateEl('lateExportRaw').onclick=()=>{
 try{const entries={};for(const suffix of['','.backup','.unreadable'])entries[suffix||'primary']=localStorage.getItem(LATE_KEYS[latePlanet]+suffix);lateDownload('RECOMMAND-'+latePlanet+'-originals.json',JSON.stringify({format:'RECOMMAND-RECOVERY',planet:latePlanet,entries},null,2));lateSet('lateFileStatus','저장 원본과 백업을 변경 없이 보관했습니다.');}catch(e){lateSet('lateFileStatus','저장소 접근 실패: '+e.message);}
};
lateEl('lateImport').onclick=()=>lateEl('lateSaveFile').click();
lateEl('lateSaveFile').onchange=async e=>{
 const file=e.target.files?.[0];if(!file)return;
 try{
  if(file.size>500000)throw Error('파일이 너무 큽니다.');const data=JSON.parse(await file.text());
  if(data.format==='RECOMMAND-RECOVERY'){let valid=null;for(const key of['primary','.backup']){try{if(data.entries?.[key]){valid=decodeLate(data.entries[key],latePlanet);break;}}catch{}}if(!valid)throw Error('원본과 백업에서 유효한 진행을 찾지 못했습니다. 원본은 변경하지 않았습니다.');lateImportPending=valid;}
  else lateImportPending=decodeLate(data,latePlanet);
  lateSet('lateFileStatus','이 파일의 진행으로 현재 행성을 교체할까요? 기존의 읽을 수 있는 진행은 자동 백업됩니다.');const choices=lateEl('lateImportChoices');choices.replaceChildren();
  lateButton(choices,'교체하여 가져오기',()=>{
   const previous=lateState;try{writeLate(localStorage,lateImportPending);lateState=lateImportPending;lateImportPending=null;lateStarted=true;Object.assign(latePlayer,lateState.player);lateCamera.x=latePlayer.x;lateCamera.z=latePlayer.z;lateEl('lateStart').hidden=true;lateEl('lateImportChoices').replaceChildren();lateSet('lateFileStatus','가져왔습니다. 돌아가기를 누르면 이어집니다.');lateUpdateHUD();}catch(err){lateState=previous;lateSet('lateFileStatus','저장 실패: '+err.message+' · 기존 화면의 진행을 유지합니다.');}
  },true);lateButton(choices,'취소',()=>{lateImportPending=null;choices.replaceChildren();lateSet('lateFileStatus','취소했습니다. 기존 진행을 유지합니다.');});
 }catch(err){lateImportPending=null;lateEl('lateImportChoices').replaceChildren();lateSet('lateFileStatus','가져오기 실패: '+err.message);}
 e.target.value='';
};
for(const b of document.querySelectorAll('[data-late-key]')){
 b.onpointerdown=e=>{if(!lateStarted||latePaused||lateDialogue||lateOverlay)return;e.preventDefault();b.setPointerCapture(e.pointerId);lateKeys.add(b.dataset.lateKey);};
 b.onpointerup=b.onpointercancel=b.onlostpointercapture=()=>lateKeys.delete(b.dataset.lateKey);
}
document.querySelector('[data-previous]').onclick=e=>{e.preventDefault();lateTravel(lateConfig.previous);};
addEventListener('keydown',e=>{
 const k=e.key.toLowerCase();if(e.target?.tagName==='INPUT')return;
 if(['BUTTON','A'].includes(e.target?.tagName)&&['enter',' '].includes(k))return;
 if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();if(e.repeat)return;
 if(k==='escape'){
  if(lateImportPending){lateImportPending=null;lateEl('lateImportChoices').replaceChildren();return;}
  if(lateOverlay){for(const id of['lateJournal','lateFilePanel','endingSplash'])if(!lateEl(id).hidden){lateCloseOverlay(id);return;}}latePauseToggle();return;
 }
 if(lateOverlay)return;if(k==='e'||k==='enter'&&lateDialogue){lateInteract();return;}
 if(!lateStarted||latePaused||lateDialogue)return;
 if(k==='m'){lateEl('lateMap').classList.toggle('hidden');return;}
 if(k==='k'||k===' '){lateDash();return;}if(k==='l'){lateAttack('wave');return;}lateKeys.add(k);if(k==='j')lateAttack('slash');
});
addEventListener('keyup',e=>lateKeys.delete(e.key.toLowerCase()));
function lateSuspend(){lateKeys.clear();if(lateStarted&&!lateDialogue&&!lateOverlay)latePaused=true;lateSave();lateUpdateHUD();}
addEventListener('blur',lateSuspend);document.addEventListener('visibilitychange',()=>{if(document.hidden)lateSuspend();});addEventListener('pagehide',lateSave);
lateEl('lateWorld').addEventListener('webglcontextlost',e=>{e.preventDefault();latePaused=true;lateSave();lateToast('화면 연결이 중단되었습니다. 진행은 보관했으며 새로고침 후 이어갈 수 있습니다.');});
if(!lateLoad.state)lateEl('lateContinue').hidden=true;
lateSet('saveNotice',lateLoad.error?'기록 확인: '+lateLoad.error+'\n기존 원본은 삭제하지 않았습니다. 상단 진행 보관에서 원본을 남길 수 있습니다.':lateLoad.state?(lateLoad.source==='backup'?'이전 자동 저장을 발견했습니다. 기억 이어가기로 복구합니다.':'이 행성의 저장된 여정을 발견했습니다.'):'이 주소에 저장된 '+lateConfig.name+' 기록이 없습니다. 앞선 행성의 기록은 유지됩니다.');
lateUpdateHUD();
let latePrevious=performance.now(),lateAccumulator=0;
function lateLoop(now){
 const dt=clamp((now-latePrevious)/1000,0,.15);latePrevious=now;lateAccumulator+=dt;let n=0;
 while(lateAccumulator>=1/60&&n++<9){lateTick(1/60);lateAccumulator-=1/60;}
 if(n>=9)lateAccumulator=0;lateDraw();
 if((lateHUDClock+=dt)>=.1){lateHUDClock=0;lateUpdateHUD();}
 requestAnimationFrame(lateLoop);
}
requestAnimationFrame(lateLoop);window.dispatchEvent(new Event('recommand-ready'));
