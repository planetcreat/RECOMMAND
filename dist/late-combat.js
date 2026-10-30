import {distance,inSector} from './math.js';
export const LATE_BOSS_CENTER={x:0,z:-64};
export const LATE_DEVICE={x:-7,z:-59};
export const LATE_BOSS_HP={mumyeong:300,hwanseong:440};
export function createLateBoss(planet,patterns={},trial=null){return{planet,patterns:{...patterns},trial,hp:trial?100:LATE_BOSS_HP[planet],max:trial?100:LATE_BOSS_HP[planet],hero:100,active:true,phase:'announce',time:0,cycle:0,step:0,pattern:trial||(planet==='mumyeong'?'echo':'garden'),hazards:[],inv:0,slash:0,wave:0,dash:0,dashing:0,diverted:false,message:'',hit:0};}
function patternFor(b){if(b.trial)return b.trial;if(b.planet==='mumyeong')return'echo';return['garden','sea','snow'][b.cycle%3];}
function hazard(x,z,r,real=true){return{x,z,r,real,fired:false};}
function prepare(b,p){
 b.pattern=patternFor(b);b.diverted=false;b.step=0;
 if(b.pattern==='garden')b.hazards=[hazard(0,-64,4.2)];
 else if(b.pattern==='sea')b.hazards=[hazard(p.x,p.z,2.8),hazard(-6,-62,2.7),hazard(6,-62,2.7)];
 else{const a=b.cycle%2?-5:5;b.hazards=[hazard(p.x,p.z,2.6),hazard(a,-60,3,false),hazard(-a,-68,3,false)];if(b.planet==='hwanseong'&&b.patterns.snow!=='trace')b.hazards.push(hazard(0,-57,2.8,false));}
}
function setPhase(b,phase){b.phase=phase;b.time=0;}
export function latePhaseText(b){const n=b.pattern==='garden'?'유온 · 삼박':b.pattern==='sea'?'쇄해 · 역류':'무명 · 잔상';return b.phase==='announce'?n+' / 준비':b.phase==='warn'?n+' / 바닥 자국을 보세요':b.phase==='strike'?'공격 중 · 원 밖으로':b.phase==='returnWarn'?'회수 예고 · 안전한 홈이 바뀐다':b.phase==='returnStrike'?'역류 · 갈라진 원에서 우회':b.phase==='open'?'명령핵 노출 · 지금 공격':b.phase==='won'?'명령 정지':b.phase==='trialWon'?'응답 시험 완료':b.phase==='lost'?'항로로 돌아갑니다':'';}
function hurt(b,p,h){if(!h.real||b.inv>0||distance(p,h)>h.r)return;b.hero=Math.max(0,b.hero-18);b.inv=.85;if(b.hero===0){b.active=false;setPhase(b,'lost');}}
function fire(b,p){for(const h of b.hazards){if(!h.fired){h.fired=true;hurt(b,p,h);if(!b.active)break;}}}
export function tickLateBoss(b,p,dt){
 if(!b.active||!Number.isFinite(dt)||dt<=0)return;
 // Fixed substeps preserve warnings and collision even if a caller supplies a long frame.
 if(dt>.05){let t=dt;while(t>1e-8&&b.active){const d=Math.min(.05,t);tickLateBoss(b,p,d);t-=d;}return;}
 for(const k of['inv','slash','wave','dash','dashing','hit'])b[k]=Math.max(0,b[k]-dt);b.time+=dt;
 if(b.phase==='announce'&&b.time>=.9){prepare(b,p);setPhase(b,'warn');}
 else if(b.phase==='warn'&&b.time>=1.65){setPhase(b,'strike');fire(b,p);}
 else if(b.phase==='strike'&&b.time>=.3){
  if(b.pattern==='garden'&&b.step<2){b.step++;b.hazards=[hazard(0,-64,[4.2,5.2,6.4][b.step])];if(b.step===2&&b.patterns.garden!=='answer')b.hazards.push(hazard(7,-59,2));setPhase(b,'warn');b.time=.95;}
  else if(b.pattern==='sea'){b.hazards=[hazard(-6,-60,2.6),hazard(0,-65,2.8),hazard(6,-68,2.6)];if(b.patterns.sea==='return')b.hazards=b.hazards.filter(h=>h.x!==-6);setPhase(b,'returnWarn');}
  else setPhase(b,'open');
 }else if(b.phase==='returnWarn'&&b.time>=2.6){if(b.diverted)b.hazards=b.hazards.filter(h=>h.x!==-6);setPhase(b,'returnStrike');fire(b,p);}
 else if(b.phase==='returnStrike'&&b.time>=.35)setPhase(b,'open');
 else if(b.phase==='open'&&b.time>=(b.diverted?6.6:4.1)){
  if(b.trial){b.active=false;setPhase(b,'trialWon');}else{b.cycle++;b.pattern=patternFor(b);setPhase(b,'announce');}
 }
}
export function hitLateBoss(b,p,kind){
 if(!b.active||b.trial||b.phase!=='open'||(kind!=='slash'&&kind!=='wave'))return false;
 const cooldown=kind==='slash'?'slash':'wave',range=kind==='slash'?4.2:6.2;
 if(b[cooldown]>0||!inSector(p,LATE_BOSS_CENTER,p.face,range,-.1))return false;
 b[cooldown]=kind==='slash'?.38:3.5;b.hp=Math.max(0,b.hp-(kind==='slash'?18:32));b.hit=.2;
 if(b.hp===0){b.active=false;setPhase(b,'won');}return true;
}
export function dashLateBoss(b){if(!b.active||b.dash>0)return false;b.dash=1.15;b.dashing=.19;b.inv=Math.max(b.inv,.3);return true;}
export function divertLateBoss(b,p,knows){if(!b.active||!knows||b.phase!=='returnWarn'||distance(p,LATE_DEVICE)>3.1||b.diverted)return false;b.diverted=true;b.message='逆流 우회 · 서쪽 홈이 열리고 노출이 길어집니다.';return true;}
