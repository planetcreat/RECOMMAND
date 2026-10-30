(function(){
 let ready=false,panel=null;
 function fail(message){if(!panel){panel=document.createElement('section');panel.id='loadFailure';panel.setAttribute('role','alert');panel.style.cssText='position:fixed;inset:20% 8% auto;z-index:99999;padding:24px;border:1px solid #ddbe79;background:#102d3ff5;color:#f4ead0;font:15px/1.8 sans-serif;box-shadow:0 20px 80px #0008';const h=document.createElement('h2');h.textContent='게임을 불러오지 못했어요';const p=document.createElement('p');p.id='loadFailureReason';const b=document.createElement('button');b.textContent='다시 불러오기';b.style.cssText='padding:10px 18px;background:#ead69e;color:#143442;border:0;border-radius:5px';b.onclick=()=>location.reload();panel.append(h,p,b);document.body.append(panel);}document.getElementById('loadFailureReason').textContent=message;}
 window.addEventListener('recommand-ready',()=>{ready=true;panel?.remove();panel=null;document.documentElement.dataset.recommandReady='true';});
 window.addEventListener('error',e=>{if(ready)return;const script=e.target?.tagName==='SCRIPT';fail(script?'게임 구성 파일을 받을 수 없습니다. 다운로드한 PLAY-RECOMMAND.html을 Chrome 또는 Edge에서 열어 주세요.':'게임 시작 중 오류가 발생했습니다. 다시 불러와도 같으면 표시된 오류를 알려 주세요. '+(e.message||''));},true);
 window.addEventListener('unhandledrejection',e=>{if(!ready)fail('게임 시작을 완료하지 못했습니다. '+String(e.reason?.message||e.reason||''));});
 setTimeout(()=>{if(!ready)fail('게임을 불러오는 데 시간이 걸리고 있습니다. 연결을 확인하거나 다운로드한 PLAY-RECOMMAND.html을 브라우저에서 열어 주세요.');},15000);
 if(location.protocol==='file:'&&document.querySelector('script[type="module"][src]'))fail('이 파일은 여러 구성 파일을 사용하는 웹용 실행 파일입니다. release 폴더의 PLAY-RECOMMAND.html 또는 RECOMMAND.html을 열어 주세요.');
})();
