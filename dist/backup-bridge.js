export const CHAPTER_SAVE_CONFLICT='다른 탭에서 이 행성의 저장이 변경됐습니다. 이 탭의 자동 저장을 중단했습니다. 최신 탭에서 이어가거나 게임을 다시 열어 주세요.';

// Compare against the last primary record seen by this session before rotating backups.
export function chapterSaveGuard(read,key){
 let expected;
 try{expected=read(key)??null;}catch{}
 function check(){
  if(expected===undefined)throw Error('게임을 열 때 기존 저장을 확인할 수 없었습니다.');
  if((read(key)??null)!==expected){
   const error=Error(CHAPTER_SAVE_CONFLICT);
   error.code='RECOMMAND_SAVE_CONFLICT';
   throw error;
  }
 }
 return {check,write(commit){check();expected=commit();}};
}

// Parent launcher asks for a save checkpoint while its modal is open.
export function installBackupBridge({window,parent,chapter,flush,pause,resume}){
 if(!parent||parent===window)return()=>true;
 let held=null,flushing=false;
 window.addEventListener('message',e=>{
  if(e.source!==parent||!e.data)return;
  if(e.data.type==='recommand-backup-lock'){
   if(!held)held={previous:pause()};let ok=false;flushing=true;try{ok=flush()===true;}catch{}finally{flushing=false;}
   parent.postMessage({type:'recommand-backup-ready',chapter,request:e.data.request,ok},'*');
  }else if(e.data.type==='recommand-backup-unlock'&&held){const previous=held.previous;held=null;resume(previous);}
 });
 // Keep the outgoing iframe's blur/pagehide/autosave handlers from replacing
 // restored records. Only an explicit parent checkpoint may write while held.
 return()=>held===null||flushing;
}
