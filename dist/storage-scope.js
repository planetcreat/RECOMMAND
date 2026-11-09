// QA uses the same browser and renderer, but a disjoint, explicitly named save space.
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

export function chapterDocument(html,assets,scope=''){
 let result=html.replace(/__RECOMMAND_ASSET_(\d+)__/g,(_,i)=>assets[Number(i)]);
 if(scope){
  if(!/^[a-z0-9-]{1,48}$/.test(scope))throw new Error('Invalid QA save scope');
  const bootstrap='const localStorage=('+createScopedStorage.toString()+')(window.localStorage,'+JSON.stringify(scope)+');\n';
  result=result.replace(/<html\b/,()=>'<html data-qa-scope="'+scope+'"');
  result=result.replace('<script type="module">',()=>'<script type="module">'+bootstrap);
 }
 return result;
}
