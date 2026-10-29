const finite=(v,a,b)=>typeof v==='number'&&Number.isFinite(v)&&v>=a&&v<=b;
const bools=(a,n)=>Array.isArray(a)&&a.length===n&&a.every(x=>typeof x==='boolean');
export function snapshot(state,player,enemies,journal){return{format:'RECOMMAND',v:2,state:{...state,seals:[...state.seals],memories:[...state.memories],echoes:[...state.echoes]},player:{x:player.x,z:player.z,hp:player.hp,xp:player.xp},enemies:enemies.map(({id,x,z,hp})=>({id,x,z,hp})),journal:journal.map(e=>({name:e.name,lines:[...e.lines]}))};}
export function decode(raw,defs){
 const s=typeof raw==='string'?JSON.parse(raw):raw,st=s?.state,p=s?.player;
 if(![1,2].includes(s?.v)||!st||!bools(st.seals,3)||!bools(st.memories,2)||![0,1,2].includes(st.quest)||typeof st.boss!=='boolean'||typeof st.complete!=='boolean')throw Error('진행 정보가 손상되었습니다.');
 if(!p||!finite(p.x,-79,79)||!finite(p.z,-79,79)||!finite(p.hp,1,100)||!finite(p.xp,0,1e6))throw Error('캐릭터 정보가 손상되었습니다.');
 for(const k of ['bond','fracture','intel','surveyRecord','anomaly'])if(st[k]!==undefined&&typeof st[k]!=='boolean')throw Error('발견 정보가 손상되었습니다.');
 const sidequest=st.sidequest??0,echoes=st.echoes??[false,false];
 if(![0,1,2].includes(sidequest)||!bools(echoes,2))throw Error('의뢰 정보가 손상되었습니다.');
 if(st.seals.some(Boolean)&&st.quest===0||st.boss&&!st.seals.every(Boolean)||st.complete&&(!st.boss||st.quest!==2)||!st.complete&&st.quest===2)throw Error('진행 순서가 일치하지 않습니다.');
 if(st.anomaly&&!st.seals[0]||sidequest>0&&!(st.seals[0]&&st.surveyRecord&&st.anomaly)||sidequest===0&&echoes.some(Boolean)||sidequest===2&&(!echoes.every(Boolean)||!st.intel)||st.intel&&sidequest!==2)throw Error('의뢰의 선행 기록이 누락되었습니다.');
 const state={quest:st.quest,seals:[...st.seals],memories:[...st.memories],boss:st.boss,complete:st.complete,ending:st.complete?(st.ending||'preserve'):null,bond:!!st.bond,fracture:!!st.fracture,sidequest,echoes:[...echoes],intel:!!st.intel,surveyRecord:!!st.surveyRecord,anomaly:!!st.anomaly};
 if(state.ending&&!['preserve','rewrite'].includes(state.ending)||state.ending==='rewrite'&&!(state.memories.every(Boolean)&&state.bond&&state.fracture))throw Error('선택 정보가 손상되었습니다.');
 let enemies;
 if(s.v===2){if(s.format!=='RECOMMAND'||!Array.isArray(s.enemies)||s.enemies.length!==defs.length)throw Error('전투 기록이 손상되었습니다.');const seen=new Set();enemies=s.enemies.map(e=>{const d=defs.find(d=>d.id===e?.id);if(!d||seen.has(e.id)||!finite(e.x,-79,79)||!finite(e.z,-79,79)||!finite(e.hp,0,d.max))throw Error('적 정보가 손상되었습니다.');seen.add(e.id);return{id:e.id,x:e.x,z:e.z,hp:e.hp};});}
 else {if(!Array.isArray(s.dead)||s.dead.some(id=>!defs.some(d=>d.id===id)))throw Error('이전 전투 기록이 손상되었습니다.');enemies=defs.map(d=>({id:d.id,x:d.home.x,z:d.home.z,hp:s.dead.includes(d.id)?0:d.max}));}
 if(enemies.some(e=>e.id===99&&((e.hp===0)!==state.boss)||e.id<9&&state.seals[Math.floor(e.id/3)]&&e.hp>0))throw Error('전투와 제단의 기록이 일치하지 않습니다.');
 const journal=s.journal??[];if(!Array.isArray(journal)||journal.length>100||journal.some(e=>typeof e?.name!=='string'||e.name.length>100||!Array.isArray(e.lines)||!e.lines.length||e.lines.length>15||e.lines.some(l=>typeof l!=='string'||l.length>5000)))throw Error('대화 기록이 손상되었습니다.');
 return{state,player:{x:p.x,z:p.z,hp:p.hp,xp:p.xp},enemies,journal:journal.map(e=>({name:e.name,lines:[...e.lines]}))};
}

