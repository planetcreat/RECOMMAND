import {decode} from './save.js';
import {decodeTide} from './tide.js';
import {decodeLate} from './late-state.js';
export const JOURNEY_KEYS={yuon:'recommand-save-v1',swaehae:'recommand-swaehae-v1',mumyeong:'recommand-mumyeong-v1',hwanseong:'recommand-hwanseong-v1'};
export const JOURNEY_RESTORE_KEY='recommand-journey-restore-v1';
export const JOURNEY_STORAGE_KEYS=Object.values(JOURNEY_KEYS).flatMap(k=>[k,k+'.backup',k+'.unreadable']);
// Only IDs and health limits are needed for validation. Keep legacy raw data intact:
// the actual chapter supplies its real enemy home positions when it loads v1 saves.
export const JOURNEY_ENEMIES=[...Array.from({length:9},(_,id)=>({id,max:48})),{id:99,max:300},...Array.from({length:5},(_,i)=>({id:20+i,max:36}))].map(e=>({...e,home:{x:0,z:0}}));
function object(v){return v&&typeof v==='object'&&!Array.isArray(v);}
function rawValue(v){return v===null||typeof v==='string'&&v.length<=1000000;}
function exactKeys(v,keys){return object(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));}
export function validateJourneyRecord(planet,raw){
 if(typeof raw!=='string'||!raw.length||raw.length>1000000)throw Error('기록의 크기나 형식이 올바르지 않습니다.');
 if(planet==='yuon')return decode(raw,JOURNEY_ENEMIES);
 if(planet==='swaehae')return decodeTide(raw);
 if(planet==='mumyeong'||planet==='hwanseong')return decodeLate(raw,planet);
 throw Error('알 수 없는 행성입니다.');
}
export function readJourneyRecords(store){return Object.fromEntries(JOURNEY_STORAGE_KEYS.map(k=>[k,store.getItem(k)]));}
export function createJourneyBackup(store,createdAt=new Date().toISOString()){
 return{format:'RECOMMAND-JOURNEY',v:1,createdAt,records:readJourneyRecords(store)};
}
export function decodeJourneyBackup(raw){
 if(typeof raw!=='string'||raw.length>4000000)throw Error('4MB 이하의 통합 백업 파일을 선택해 주세요.');
 const data=JSON.parse(raw);
 if(!exactKeys(data,['format','v','createdAt','records'])||data.format!=='RECOMMAND-JOURNEY'||data.v!==1||typeof data.createdAt!=='string'||data.createdAt.length>80||!exactKeys(data.records,JOURNEY_STORAGE_KEYS)||!Object.values(data.records).every(rawValue))throw Error('RE:COMMAND 통합 백업 파일이 아닙니다.');
 const entries=[],rows=[];
 for(const [planet,key]of Object.entries(JOURNEY_KEYS)){
  const primary=data.records[key],backup=data.records[key+'.backup'];let selected=null,source=null;
  for(const [raw,kind]of [[primary,'primary'],[backup,'backup']]){if(raw===null)continue;try{validateJourneyRecord(planet,raw);selected=raw;source=kind;break;}catch{}}
  if(selected!==null){entries.push({planet,key,raw:selected,source});rows.push({planet,status:source==='backup'?'이전 자동 저장으로 복원':'기록 있음'});}
  else if(primary!==null||backup!==null)throw Error(planet+'의 주 기록과 이전 자동 저장을 검증하지 못했습니다. 기존 기록은 바꾸지 않았습니다.');
  else rows.push({planet,status:'기록 없음 · 현재 기록 유지'});
 }
 if(!entries.length)throw Error('복원할 수 있는 행성 기록이 없습니다. 원본 보관 파일은 그대로 유지해 주세요.');
 return{createdAt:data.createdAt,entries,rows};
}
function snapshotValid(s){return exactKeys(s,JOURNEY_STORAGE_KEYS)&&Object.values(s).every(rawValue);}
function readTransaction(store){
 const raw=store.getItem(JOURNEY_RESTORE_KEY);if(raw===null)return null;
 const t=JSON.parse(raw);
 if(!object(t)||t.format!=='RECOMMAND-RESTORE'||t.v!==1||!['pending','applied','rolledBack'].includes(t.status)||!snapshotValid(t.before)||!snapshotValid(t.after))throw Error('직전 복원 기록을 확인하지 못했습니다. 현재 저장을 지우지 말고 파일로 보관해 주세요.');
 return t;
}
function writeRecords(store,records){for(const key of JOURNEY_STORAGE_KEYS){if(records[key]===null)store.removeItem(key);else store.setItem(key,records[key]);}}
export function recoverJourneyRestore(store){
 const t=readTransaction(store);if(!t||t.status!=='pending')return false;
 writeRecords(store,t.before);store.setItem(JOURNEY_RESTORE_KEY,JSON.stringify({...t,status:'rolledBack'}));return true;
}
export function applyJourneyRestore(store,plan){
 if(!plan?.entries?.length)throw Error('먼저 백업 파일을 확인해 주세요.');
 // Revalidate at the mutation boundary; never trust a caller-built preview plan.
 const seen=new Set();for(const e of plan.entries){if(e.key!==JOURNEY_KEYS[e.planet]||seen.has(e.key))throw Error('복원 목록이 올바르지 않습니다.');validateJourneyRecord(e.planet,e.raw);seen.add(e.key);}
 const before=readJourneyRecords(store),after={...before};
 for(const e of plan.entries){
  const old=before[e.key];if(old!==null&&old!==e.raw){let valid=false;try{validateJourneyRecord(e.planet,old);valid=true;}catch{}after[e.key+(valid?'.backup':'.unreadable')]=old;}
  after[e.key]=e.raw;
 }
 return commitJourneyRecords(store,before,after);
}
function commitJourneyRecords(store,before,after){
 if(!snapshotValid(before)||!snapshotValid(after))throw Error('현재 기록의 크기를 확인하지 못했습니다. 먼저 원본 백업을 보관해 주세요.');
 if(readTransaction(store)?.status==='pending')throw Error('중단된 복원부터 복구해 주세요. 기존 복원 기록은 유지했습니다.');
 const t={format:'RECOMMAND-RESTORE',v:1,status:'pending',before,after};
 // A durable before-image must exist before any chapter key can change.
 store.setItem(JOURNEY_RESTORE_KEY,JSON.stringify(t));
 try{writeRecords(store,after);store.setItem(JOURNEY_RESTORE_KEY,JSON.stringify({...t,status:'applied'}));return true;}
 catch{
  try{writeRecords(store,before);store.setItem(JOURNEY_RESTORE_KEY,JSON.stringify({...t,status:'rolledBack'}));}
  catch{throw Error('저장소 쓰기가 중단됐습니다. 게임을 새로 시작하지 말고 저장소 접근을 복구한 뒤 다시 여세요. 중단 전 기록으로 복구를 시도합니다.');}
  throw Error('복원에 실패해 기존 기록으로 되돌렸습니다. 저장 공간과 브라우저 설정을 확인해 주세요.');
 }
}
export function canUndoJourneyRestore(store){return readTransaction(store)?.status==='applied';}
export function undoJourneyRestore(store){
 const t=readTransaction(store);if(t?.status!=='applied')throw Error('되돌릴 복원 기록이 없습니다.');
 return commitJourneyRecords(store,readJourneyRecords(store),t.before);
}
