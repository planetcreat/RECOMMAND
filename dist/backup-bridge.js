// Parent launcher asks for a save checkpoint while its modal is open.
export function installBackupBridge({window,parent,chapter,flush,pause,resume}){
 if(!parent||parent===window)return;
 let held=null;
 window.addEventListener('message',e=>{
  if(e.source!==parent||!e.data)return;
  if(e.data.type==='recommand-backup-lock'){
   if(!held)held={previous:pause()};let ok=false;try{ok=flush()===true;}catch{}
   parent.postMessage({type:'recommand-backup-ready',chapter,request:e.data.request,ok},'*');
  }else if(e.data.type==='recommand-backup-unlock'&&held){const previous=held.previous;held=null;resume(previous);}
 });
}
