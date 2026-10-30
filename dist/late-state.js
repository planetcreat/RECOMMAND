import {decodeTide} from './tide.js';
export const LATE_KEYS={mumyeong:'recommand-mumyeong-v1',hwanseong:'recommand-hwanseong-v1'};
const boolArray=(v,n)=>Array.isArray(v)&&v.length===n&&v.every(x=>typeof x==='boolean');
export function newLateState(planet){if(!LATE_KEYS[planet])throw Error('알 수 없는 행성입니다.');return{format:'RECOMMAND-LATE',v:1,planet,arrived:false,heard:[],compared:[false,false,false],chime:false,asked:false,relays:[false,false,false],invited:[false,false,false],tomorrow:false,lumi:false,boss:false,ending:null,player:{x:0,z:10,hp:100}};}
export function decodeLate(raw,planet){
 const s=typeof raw==='string'?JSON.parse(raw):raw;
 if(!s||s.format!=='RECOMMAND-LATE'||s.v!==1||s.planet!==planet||!LATE_KEYS[planet])throw Error('이 행성의 진행 파일이 아닙니다.');
 for(const key of ['arrived','chime','asked','tomorrow','lumi','boss'])if(typeof s[key]!=='boolean')throw Error('진행 기록이 손상되었습니다.');
 if(!Array.isArray(s.heard)||s.heard.length>5||new Set(s.heard).size!==s.heard.length||s.heard.some(x=>!['keeper','walker','bell','footprints','archive'].includes(x)))throw Error('증언 기록이 손상되었습니다.');
 if(!boolArray(s.compared,3)||!boolArray(s.relays,3)||!boolArray(s.invited,3))throw Error('대조·응답 기록이 손상되었습니다.');
 if(!s.player||!['x','z','hp'].every(k=>typeof s.player[k]==='number'&&Number.isFinite(s.player[k]))||Math.abs(s.player.x)>29||s.player.z< -48||s.player.z>19||s.player.hp<1||s.player.hp>100)throw Error('여행자 기록이 손상되었습니다.');
 if(planet==='mumyeong'){
  const needs=[['keeper','walker','bell'],['walker','footprints'],['keeper','archive']];
  if(s.compared.some((v,i)=>v&&!needs[i].every(x=>s.heard.includes(x)))||s.chime&&!s.compared.every(Boolean)||s.asked&&!s.chime||s.boss&&!s.compared.every(Boolean))throw Error('증언과 재구성의 순서가 일치하지 않습니다.');
  if(s.ending!==null&&!['restore','witness'].includes(s.ending)||s.ending&&!s.boss||s.ending==='witness'&&!(s.chime&&s.asked))throw Error('무명의 선택 기록이 일치하지 않습니다.');
 }else if(s.boss&&!s.relays.every(Boolean)||s.invited.some((v,i)=>v&&!s.relays[i])||s.ending!==null&&!['guarded','shared'].includes(s.ending)||s.ending&&!s.boss||s.ending==='shared'&&!(s.invited.every(Boolean)&&s.tomorrow&&s.lumi))throw Error('환성의 응답 기록이 일치하지 않습니다.');
 if(!s.arrived&&(s.heard.length||s.compared.some(Boolean)||s.relays.some(Boolean)||s.boss))throw Error('도착 이전의 기록이 섞여 있습니다.');
 return structuredClone(s);
}
export function noteEvidence(s,id){if(s.planet!=='mumyeong'||!['keeper','walker','bell','footprints','archive'].includes(id))return false;if(!s.heard.includes(id))s.heard.push(id);return true;}
export function reconstruct(s,index,answer){
 const needs=[['keeper','walker','bell'],['walker','footprints'],['keeper','archive']],answers=[0,1,1];
 if(s.planet!=='mumyeong'||!needs[index]?.every(id=>s.heard.includes(id))||answer!==answers[index])return false;s.compared[index]=true;return true;
}
export function canEnterLateBoss(s){return s.planet==='mumyeong'?s.compared.every(Boolean):s.relays.every(Boolean);}
export function canWitness(s){return s.planet==='mumyeong'&&s.boss&&s.chime&&s.asked;}
function parseObject(raw){try{const s=typeof raw==='string'?JSON.parse(raw):raw;return s&&typeof s==='object'?s:null;}catch{return null;}}
// Read only. A missing/invalid earlier chapter never becomes somebody's consent.
export function journeySummary(read){
 const u=parseObject(read('recommand-save-v1'));let sea=null,mum=null;
 try{const r=read('recommand-swaehae-v1');if(r)sea=decodeTide(r);}catch{}
 try{const r=read(LATE_KEYS.mumyeong);if(r)mum=decodeLate(r,'mumyeong');}catch{}
 const st=u?.state,validYuon=[1,2].includes(u?.v)&&boolArray(st?.seals,3)&&boolArray(st?.memories,2)&&st.boss===true&&st.complete===true&&st.quest===2&&st.seals.every(Boolean)&&['preserve','rewrite'].includes(st.ending);
 const garden=!!(validYuon&&st.ending==='rewrite'&&st.bond===true&&st.fracture===true&&st.memories.every(Boolean));
 return{garden,sea:!!sea?.boss.rewritten,snow:!!(mum?.ending==='witness'),completed:[!!validYuon,!!sea?.boss.rewritten,!!mum?.ending],patterns:{garden:garden?'answer':'boundary',sea:sea?.boat.stage==='complete'?'return':'locked',snow:mum?.compared.every(Boolean)?'trace':'echo'}};
}
export function canShare(s,journey){return s.planet==='hwanseong'&&s.boss&&s.invited.every(Boolean)&&s.tomorrow&&s.lumi&&journey.garden&&journey.sea&&journey.snow;}
export function loadLate(store,planet){
 const errors=[];for(const suffix of['','.backup']){try{const raw=store.getItem(LATE_KEYS[planet]+suffix);if(raw)return{state:decodeLate(raw,planet),source:suffix?'backup':'primary',error:null};}catch(e){errors.push(e.message);}}
 return{state:null,source:null,error:errors.length?errors.join(' / '):null};
}
export function writeLate(store,state){
 const next=JSON.stringify(decodeLate(state,state.planet)),key=LATE_KEYS[state.planet],old=store.getItem(key);
 if(old&&old!==next){let valid=true;try{decodeLate(old,state.planet);}catch{valid=false;}if(valid)store.setItem(key+'.backup',old);else store.setItem(key+'.unreadable',old);}
 store.setItem(key,next);return true;
}
