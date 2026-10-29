// Deterministic combat model. Visuals consume these same circular hazard coordinates.
export const BELROK={x:0,z:-54,hp:360,device:{x:-9,z:-48},entry:{x:0,z:-44},radius:12};
export const BELROK_PHASES={outWarn:['토출 예고',1.8],out:['토출',1.2],returnWarn:['회수 예고 · 역류에 대비',2.8],back:['회수',1.2],lockWarn:['압력 봉쇄 예고',1.5],lock:['압력 봉쇄',1.5],open:['과압 방출 · 가슴 노출',3.4]};
export function createBelrok(){return{active:false,hp:BELROK.hp,hero:100,phase:'outWarn',time:0,cycle:0,diverted:false,invul:0,slash:0,wave:0,dash:0,dashing:0,hazards:[],bursts:[],message:'',shieldFlash:0};}
function patternBelrok(b,p){
 const make=(x,z,r,at=0)=>({x,z,r,at,done:false});
 if(b.phase==='outWarn')return Array.from({length:8},(_,i)=>{const a=i*Math.PI/4+b.cycle*.18;return make(Math.cos(a)*7,BELROK.z+Math.sin(a)*7,2.15);});
 if(b.phase==='returnWarn')return[-7,-3.5,0,3.5,7].map((x,i)=>make(x,BELROK.z+(i%2?-3:2),2.15));
 if(b.phase==='lockWarn')return[-1,0,1].map((v,i)=>make(Math.max(-10,Math.min(10,p.x+v*3)),Math.max(-64,Math.min(-44,p.z+v)),2.1,i*.38));
 return[];
}
function enterBelrok(b,phase,p){b.phase=phase;b.time=0;if(phase==='outWarn'){b.diverted=false;b.cycle++;}if(phase.endsWith('Warn'))b.hazards=patternBelrok(b,p);if(phase==='open')b.hazards=[];}
export function startBelrok(b,p){Object.assign(b,createBelrok(),{active:true});p.x=BELROK.entry.x;p.z=BELROK.entry.z;enterBelrok(b,'outWarn',p);}
export function divertBelrok(b,p,knowledge){
 if(!b.active||b.hero<=0||b.hp<=0)return false;
 if(Math.hypot(p.x-BELROK.device.x,p.z-BELROK.device.z)>3)return false;
 if(!knowledge){b.message='갈라진 원의 표식. 되돌림 수로의 작동 원리를 아직 모른다.';return false;}
 if(b.phase!=='returnWarn'||b.diverted){b.message='회수 예고 중에 장치를 열어야 역류를 우회시킬 수 있다.';return false;}
 b.diverted=true;b.message='되돌림 수로 개방 · 역류 우회 성공!';return true;
}
export function hitBelrok(b,p,kind){
 if(!b.active||b.hp<=0||b.hero<=0||!['slash','wave'].includes(kind)||b[kind]>0)return false;
 b[kind]=kind==='slash'?.38:5;
 const dx=BELROK.x-p.x,dz=BELROK.z-p.z,d=Math.hypot(dx,dz),range=kind==='slash'?3.8:6;
 if(d>range||kind==='slash'&&d>.01&&(dx*p.face.x+dz*p.face.z)/d<.15)return true;
 if(b.phase!=='open'){b.shieldFlash=.3;b.message='수압 장갑 · 과압 방출 때 가슴을 노려라.';return true;}
 b.hp=Math.max(0,b.hp-(kind==='slash'?18:26));if(b.hp===0){b.active=false;b.phase='won';b.hazards=[];b.bursts=[];b.message='봉쇄 장치 정지 · 가슴의 명령 장치를 조사하세요.';}return true;
}
export function dashBelrok(b){if(!b.active||b.hero<=0||b.dash>0)return false;b.dash=1.2;b.dashing=.18;b.invul=Math.max(b.invul,.28);return true;}
export function tickBelrok(b,p,dt){
 if(!b.active||!Number.isFinite(dt)||dt<=0)return;
 // Bound steps to preserve telegraph windows even after a slow frame.
 for(let left=Math.min(dt,.25);left>1e-9;){const d=Math.min(left,1/60);left-=d;
  for(const k of['invul','slash','wave','dash','dashing','shieldFlash'])b[k]=Math.max(0,b[k]-d);
  b.time+=d;const firing=['out','back','lock'].includes(b.phase);
  if(firing&&!(b.phase==='back'&&b.diverted))for(const h of b.hazards){
   if(b.time>=h.at&&!h.fired){h.fired=true;b.bursts.push({x:h.x,z:h.z,r:h.r,kind:b.phase});}
   if(b.time>=h.at&&b.time<h.at+.35&&b.invul<=0&&Math.hypot(p.x-h.x,p.z-h.z)<h.r+.35){b.hero=Math.max(0,b.hero-22);b.invul=.9;b.message='수압 충격 · 바닥 원의 바깥으로 회피하세요.';}
   if(b.time>=h.at+.35)h.done=true;
  }
  if(b.hero===0){b.active=false;b.phase='lost';b.hazards=[];b.bursts=[];return;}
  const duration=b.phase==='open'&&b.diverted?7.2:BELROK_PHASES[b.phase][1];
  if(b.time+1e-8>=duration){const next={outWarn:'out',out:'returnWarn',returnWarn:'back',back:b.diverted?'open':'lockWarn',lockWarn:'lock',lock:'open',open:'outWarn'}[b.phase];enterBelrok(b,next,p);}
 }
}
export function belrokPhaseText(b){return BELROK_PHASES[b.phase]?.[0]||({won:'명령 장치 조사 · E',lost:'항구로 귀환'}[b.phase]||'');}
export const BELROK_CLUE='나루: “갈라진 원은 정비 수로의 표식이에요. 문지기의 수압계가 거꾸로 꺾일 때, 회수 전에 그 장치를 열어요. 돌아오는 물이 옆길로 빠지면 가슴 덮개가 오래 열릴 거예요.”';
export const BELROK_ENDING=[
 '벨로크의 가슴 덮개 안에서 오래된 명령이 반복된다.\n[항로를 봉쇄하라. 안전은 정지된 상태로 유지한다.]',
 '나루: “문을 닫아서 살았어요. 하지만 언제까지 살아갈 길도 닫아야 하죠?”\n도하는 젖은 종이배를 두 손에 쥐고 기다린다.',
 '주인공이 명령을 다시 쓴다.\nRE:COMMAND — 돌아올 길을 지켜라.',
 '벨로크의 수압계가 천천히 가운데로 돌아온다. 제방 바깥의 문은 열리고, 되돌림 수로에는 작은 등불이 켜진다.\n[귀환 항로 보호. 출항 여부는 주민에게 위임.]',
 '나루: “오늘은 항구부터 손볼게요. 내일 배를 띄울지는…… 우리가 정하죠.”\n도하: “저는 한 번 더 띄워 볼래요.”',
 '쇄해 1막 완료 · 돌아오는 길\n수호자는 항로를 지키고, 사람들은 떠날 때를 고른다. 다음 행성의 항로는 후속 제작에서 이어집니다.'
];
