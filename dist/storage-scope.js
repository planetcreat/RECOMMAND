// QA uses a disjoint, explicitly named save space.
export function createScopedStorage(store,scope){
 if(!/^[a-z0-9-]{1,48}$/.test(scope))throw new Error('Invalid QA save scope');
 const prefix='recommand-qa:'+scope+':';
 const keys=()=>Array.from({length:store.length},(_,i)=>store.key(i)).filter(k=>k?.startsWith(prefix));
 return{
  get length(){return keys().length;},
  key(i){const key=keys()[i];return key===undefined?null:key.slice(prefix.length);},
  getItem(key){return store.getItem(prefix+String(key));},
  setItem(key,value){store.setItem(prefix+String(key),String(value));},
  removeItem(key){store.removeItem(prefix+String(key));},
  clear(){for(const key of keys())store.removeItem(key);}
 };
}

export function standaloneQa(document,location,store){
 const params=new URLSearchParams(location.search),names=params.getAll('qa');
 if(!names.length)return {storage:store,href:page=>page};
 const scope=names[0];
 if(names.length!==1||!/^[a-z0-9-]{1,48}$/.test(scope)){
  document.documentElement.dataset.qaBlocked='true';
  const notice=document.createElement('main');
  notice.id='qaAddressError';
  notice.setAttribute('role','alert');
  notice.style.cssText='max-width:32rem;margin:12vh auto 0;padding:24px;color:#f4ead0;font:16px/1.7 var(--ui-font,sans-serif)';
  const title=document.createElement('h1'),help=document.createElement('p');
  title.textContent='QA 주소를 확인해 주세요';
  help.textContent='주소 끝에 ?qa=이름을 한 번만 붙여 주세요. 이름은 영문 소문자, 숫자, 하이픈을 사용해 1~48자로 입력할 수 있습니다.';
  notice.append(title,help);
  document.body.replaceChildren(notice);
  return null;
 }
 const renderers=params.getAll('renderer');
 const software=renderers.length===1&&renderers[0]==='software';
 document.documentElement.dataset.qaScope=scope;
 if(software)document.documentElement.dataset.qaRenderer='software';
 const href=page=>page+'?qa='+scope+(software?'&renderer=software':'');
 for(const link of document.querySelectorAll('a[href$=".html"]'))link.setAttribute('href',href(link.getAttribute('href')));
 const notice=document.createElement('p');
 notice.setAttribute('role','status');
 notice.style.cssText='position:fixed;bottom:0;right:0;z-index:30;margin:0;padding:6px 12px;background:#233b49;color:#f4e7b0;font:12px var(--ui-font);pointer-events:none';
 notice.textContent='별도 검증 저장 · '+scope+(software?' · CPU 3D':'');
 document.body.append(notice);
 return {storage:createScopedStorage(store,scope),href};
}

export function chapterDocument(html,assets,scope='',software=false){
 let result=html.replace(/__RECOMMAND_ASSET_(\d+)__/g,(_,i)=>assets[Number(i)]);
 if(scope){
  if(!/^[a-z0-9-]{1,48}$/.test(scope))throw new Error('Invalid QA save scope');
  const bootstrap='const recommandScopedStorage=('+createScopedStorage.toString()+')(window.localStorage,'+JSON.stringify(scope)+');\n';
  const renderer=software?' data-qa-renderer="software"':'';
  result=result.replace(/<html\b/,()=>'<html data-qa-scope="'+scope+'"'+renderer);
  result=result.replace('<script type="module">',()=>'<script type="module">'+bootstrap);
 }
 return result;
}
