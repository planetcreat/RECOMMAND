import {JOURNEY_RESTORE_KEY,createJourneyBackup,decodeJourneyBackup,applyJourneyRestore,recoverJourneyRestore,canUndoJourneyRestore,undoJourneyRestore} from './journey-backup.js';
export function createJourneyBackupUI({document,window,store,frame,names,current,ready,reload,status}){
 const el=id=>document.getElementById(id),dialog=el('journeyBackup');let token=0,waiting=false,locked=false,plan=null,timer=null,blocked=false;
 const message=text=>{el('backupStatus').textContent=text;};
 function download(){
  try{const text=JSON.stringify(createJourneyBackup(store),null,2),blob=new Blob([text],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='RECOMMAND-journey-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message('통합 백업 파일 다운로드를 시작했습니다.');}
  catch{message('백업 파일을 만들지 못했습니다. 저장소 접근과 다운로드 설정을 확인해 주세요.');}
 }
 function controls(enabled){el('backupExport').disabled=!enabled;el('backupFile').disabled=!enabled;el('backupApply').disabled=true;try{el('backupUndo').disabled=!enabled||!canUndoJourneyRestore(store);}catch{el('backupUndo').disabled=true;}}
 function close(){
  token++;waiting=false;clearTimeout(timer);plan=null;
  if(locked&&!blocked){frame.contentWindow.postMessage({type:'recommand-backup-unlock'},'*');locked=false;}
  dialog.close();el('journeyBackupOpen').focus();
 }
 function lockedReady(ok){waiting=false;clearTimeout(timer);controls(ok);message(ok?'현재 기록을 백업하거나 통합 백업 파일을 선택하세요.': '현재 행성의 저장을 확인하지 못했습니다. 기록을 바꾸지 않았습니다. 안내를 닫고 행성의 진행 보관 기능을 확인해 주세요.');}
 el('journeyBackupOpen').onclick=()=>{
  if(blocked){status('중단된 복원을 복구하지 못했습니다. 저장 공간과 브라우저 저장소 접근을 확인한 뒤 다시 열어 주세요.');return;}
  if(current()&&!ready()){status('행성을 여는 중입니다. 시작을 마친 뒤 통합 진행 보관을 다시 열어 주세요.');return;}
  plan=null;el('backupPreview').textContent='';el('backupFile').value='';el('backupUndoConfirm').hidden=true;dialog.showModal();controls(false);
  if(current()){locked=true;waiting=true;const request=++token;message('현재 행성을 잠시 멈추고 진행 기록을 확인하는 중입니다.');frame.contentWindow.postMessage({type:'recommand-backup-lock',request},'*');timer=setTimeout(()=>{if(waiting&&request===token)lockedReady(false);},5000);}
  else lockedReady(true);
 };
 el('backupExport').onclick=download;
 el('backupFile').onchange=async()=>{
  const file=el('backupFile').files?.[0];plan=null;el('backupApply').disabled=true;el('backupPreview').textContent='';if(!file)return;
  const request=++token;
  try{if(file.size>4000000)throw Error('4MB 이하의 통합 백업 파일을 선택해 주세요.');const next=decodeJourneyBackup(await file.text());if(request!==token||!dialog.open)return;plan=next;el('backupPreview').textContent=next.rows.map(r=>names[r.planet]+' · '+r.status).join('\n');el('backupApply').disabled=false;message('파일을 확인했습니다. 복원하면 표시된 행성의 현재 기록을 바꿉니다. 파일에 없는 행성은 유지합니다. 바꾸기 전 원본은 직전 복원 되돌리기로 보관합니다.');}
  catch(e){if(request===token)message(e.message||'파일을 확인하지 못했습니다. 기존 기록은 바꾸지 않았습니다.');}
 };
 function applied(){const chapter=current();locked=false;dialog.close();plan=null;token++;if(chapter)reload(chapter);else status('진행 기록을 복원했습니다. 행성을 선택하고 기억 이어가기로 시작하세요.');message('진행 기록을 복원했습니다.');}
 function restoreFailed(e){message(e.message);el('backupApply').disabled=true;plan=null;try{recoverJourneyRestore(store);}catch{blocked=true;controls(false);frame.hidden=true;status('통합 복원이 중단됐습니다. 게임을 새로 시작하지 말고 저장소 접근을 복구한 뒤 이 실행판을 다시 열어 주세요.');}}
 el('backupApply').onclick=()=>{if(!plan)return;try{applyJourneyRestore(store,plan);applied();}catch(e){restoreFailed(e);}};
 el('backupUndo').onclick=()=>{el('backupUndoConfirm').hidden=false;el('backupUndoApply').focus();};
 el('backupUndoApply').onclick=()=>{try{undoJourneyRestore(store);el('backupUndoConfirm').hidden=true;applied();}catch(e){restoreFailed(e);}};
 el('backupUndoCancel').onclick=()=>{el('backupUndoConfirm').hidden=true;el('backupUndo').focus();};
 el('backupClose').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 let hasRecovery=false;
 try{hasRecovery=store.getItem(JOURNEY_RESTORE_KEY)!==null;if(hasRecovery&&recoverJourneyRestore(store))status('중단된 통합 복원을 취소하고, 복원 전 진행 기록으로 되돌렸습니다.');}
 catch(e){if(hasRecovery){blocked=true;status(e.message);}else el('journeyBackupOpen').disabled=true;}
 return{get blocked(){return blocked;},isOpen:()=>!!dialog.open,handleMessage(data){if(data.type!=='recommand-backup-ready')return false;if(waiting&&data.request===token&&data.chapter===current())lockedReady(data.ok===true);return true;}};
}
