export const PLANETS=[
{id:'yuon',name:'유온',roman:'Yuon',subtitle:'남겨진 숨의 정원',implemented:true},
{id:'swaehae',name:'쇄해',roman:'Swaehae',subtitle:'닫힌 길의 바다',implemented:true},
{id:'mumyeong',name:'무명',roman:'Mumyeong',subtitle:'지워진 이름의 설원',implemented:false},
{id:'hwanseong',name:'환성',roman:'Hwanseong',subtitle:'돌아온 목소리의 궤도',implemented:false}];
export const BOSS={name:'삼박의 문지기 · 오르문',windup:1.1,gap:.65,recovery:2.8,pulseRadii:[4.2,5.2,6.4],damage:16,engageRange:4.8,intelligence:'오르문은 한 번에 세 번 울린다. 마지막 파동이 가장 멀리 닿는다.\n세 번째까지 바깥으로 빠진 뒤 접근하라. 마지막 울림 뒤에는 긴 정적이 있다.'};
export const SCOUT={x:-7,z:-11,name:'이온 · 숲의 수리공'};
export const OLD_SURVEY={x:-4,z:4,name:'낡은 탐사 표석',text:'사전 탐사 17일차. 남쪽 진동목: 잔류 진동 없음. 북쪽 수호체: 휴면 유지. 추가 관측 의뢰 없음.\n기록 아래에는 오래된 관리 인장이 찍혀 있다.'};
export const ECHO_SITES=[{x:-8,z:-20,name:'남쪽 진동목',observation:'나무 안쪽이 세 번 울린다. 첫 번째보다 두 번째가, 두 번째보다 세 번째가 더 깊게 뿌리를 흔든다.'},{x:9,z:-29,name:'동쪽 진동목',observation:'울림이 세 번 끝나자 뿌리가 한동안 풀어진다. 수호자의 껍질도 그동안은 움직이지 않을 것 같다.'}];
export function beginPulseSequence(e){e.sequence=true;e.pulse=0;e.wind=BOSS.windup;}
export function advancePulseSequence(e,dt,onPulse){if(!e.sequence)return false;e.wind-=dt;while(e.sequence&&e.wind<=0){onPulse(BOSS.pulseRadii[e.pulse],e.pulse);if(!e.sequence)return true;e.pulse++;if(e.pulse===3){e.sequence=false;e.wind=0;e.cd=BOSS.recovery;}else e.wind+=BOSS.gap;}return true;}
export function canOfferSurvey(s){return s.seals?.[0]===true&&s.surveyRecord===true&&s.anomaly===true;}

