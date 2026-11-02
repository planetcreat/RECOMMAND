import fs from 'node:fs';import vm from 'node:vm';
import {PROLOGUE,BRIEFINGS} from './dist/briefing.js';
const entries=[['yuon','RECOMMAND.html','유온'],['swaehae','SWAEHAE.html','쇄해'],['mumyeong','MUMYEONG.html','무명'],['hwanseong','HWANSEONG.html','환성']];
const chapters={},assets=[];
for(const [name,file]of entries){
 let html=fs.readFileSync('release/'+file,'utf8');
 html=html.replaceAll("location.href='SWAEHAE.html'","parent.postMessage({type:'recommand-switch',chapter:'swaehae'},'*')");
 html=html.replaceAll("location.href='MUMYEONG.html'","parent.postMessage({type:'recommand-switch',chapter:'mumyeong'},'*')");
 html=html.replace('href="RECOMMAND.html"','href="#" data-return-yuon');
 html=html.replace(/data:image\/png;base64,[A-Za-z0-9+/=]+/g,uri=>{let i=assets.indexOf(uri);if(i<0){i=assets.length;assets.push(uri);}return '__RECOMMAND_ASSET_'+i+'__';});
 const bridge=`<script>window.addEventListener('recommand-ready',()=>parent.postMessage({type:'recommand-child-ready',chapter:${JSON.stringify(name)}},'*'));window.addEventListener('error',e=>parent.postMessage({type:'recommand-child-error',chapter:${JSON.stringify(name)},message:e.message||'게임 구성 파일을 읽을 수 없습니다.'},'*'));document.addEventListener('click',e=>{if(e.target.closest('[data-return-yuon]')){e.preventDefault();parent.postMessage({type:'recommand-switch',chapter:'yuon'},'*');}});<\/script>`;
 chapters[name]=html.replace('<body>','<body>'+bridge);
}
const names=Object.fromEntries(entries.map(([id,,name])=>[id,name]));
const version=JSON.parse(fs.readFileSync('package.json','utf8')).version;
const read=p=>fs.readFileSync('dist/'+p,'utf8');
const narrationClips={};
const narrationManifest=JSON.parse(read('audio/narration.json'));
for(const [tag,clip] of Object.entries(narrationManifest)){
 const page=[...PROLOGUE,...Object.values(BRIEFINGS).flat()].find(p=>p.tag===tag);
 if(!page||![page.title+'. '+page.body+' '+page.goal,page.body+' '+page.goal].includes(clip.text))throw Error('Outdated narration: '+tag);
 if(!/^[a-z0-9-]+\.mp3$/.test(clip.file))throw Error('Invalid narration filename');
 const bytes=fs.readFileSync('dist/audio/'+clip.file);
 narrationClips[tag]='data:audio/mpeg;base64,'+bytes.toString('base64');
}
const runtime=['save.js','tide.js','late-state.js','journey-backup.js','journey-backup-ui.js'].map(f=>read(f).replace(/^import .*;\r?\n/gm,'').replace(/\bexport /g,'')).join('\n')+'\n'+read('narration.js').replace(/\bexport /g,'')+'\n'+read('music.js').replace(/\bexport /g,'')+'\n'+read('briefing.js').replace(/\bexport /g,'')+'\n'+read('launcher.js').replace(/^import .*;\r?\n/gm,'');
const script=`const chapters=${JSON.stringify(chapters)},assets=${JSON.stringify(assets)},names=${JSON.stringify(names)},version=${JSON.stringify(version)},narrationClips=${JSON.stringify(narrationClips)};\n`+runtime;
new vm.Script(script);
const buttons=entries.map(([id,,name])=>`<button data-chapter="${id}" disabled>${name}</button>`).join('');
const html=`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="네 행성을 탐험하고, 오래된 명령을 다시 쓰는 2.5D 액션 어드벤처."><title>RE:COMMAND ${version} · 네 행성</title><style>${read('launcher.css')}</style></head><body>
<header><strong>RE:COMMAND · ${version}</strong><nav aria-label="행성 이동">${buttons}<button id="journeyHelp" disabled>여정 안내</button><button id="journeyBackupOpen">진행 보관</button></nav></header>
<main id="welcome" class="welcome"><p class="eyebrow">네 행성 · 하나의 항로</p><h1>RE:COMMAND</h1><p>숨을 남긴 정원, 길을 닫은 바다, 이름을 지운 설원.<br>그리고 목소리가 돌아오는 궤도.</p><p>기록자 루미와 함께 주민의 이야기를 듣고,<br>별을 지키던 오래된 명령을 다시 선택하는 여정.</p><div class="chapters">${buttons}</div><p class="hint">처음이라면 <b>유온</b>에서 시작하세요. 짧은 이야기와 진행 안내가 먼저 나옵니다.<br>기존 기록이 있다면 해당 행성에서 <b>기억 이어가기</b>를 선택하세요.</p><p class="hint">WASD 이동 · E 대화·조사 · J 검격 · L 파동 · K / Space 회피<br>진행은 각 행성에서 자동 저장됩니다. 같은 브라우저·주소에서 이어서 플레이하세요.</p></main>
<details class="audioSettings"><summary>배경음악</summary><div><button id="musicToggle" aria-pressed="false">음악 켜기</button><label for="musicVolume">음량</label><input id="musicVolume" type="range" min="0" max="100" value="35"><small id="musicStatus" role="status"></small></div></details>
<iframe id="gameFrame" title="RE:COMMAND 게임" hidden allow="fullscreen"></iframe>
<div id="launcherStatus" role="status" hidden><span id="loadMessage"></span><button id="loadRetry">다시 열기</button></div>
<dialog id="briefing" aria-labelledby="briefTitle" aria-describedby="briefBody briefGoal"><div class="briefVisual" aria-hidden="true"><div class="orbit"></div><div class="briefPlanets"><i class="planet"></i><i class="planet"></i><i class="planet"></i><i class="planet"></i></div></div><section class="briefText"><p id="briefTag"></p><h2 id="briefTitle" tabindex="-1"></h2><p id="briefBody"></p><p id="briefGoal"></p><div class="briefAudio"><button id="briefVoice">음성 듣기</button><small id="voiceStatus"></small></div></section><footer class="briefFooter"><button id="briefSkip">안내 건너뛰기</button><div><button id="briefBack">이전</button><span id="briefCount" aria-live="polite"></span><button id="briefNext">다음</button></div></footer><p class="briefNote">상단의 ‘여정 안내’에서 다시 볼 수 있습니다. 안내를 넘겨도 게임 진행은 바뀌지 않습니다.</p></dialog>
<dialog id="journeyBackup" aria-labelledby="backupTitle"><section class="backupPanel"><h2 id="backupTitle">네 행성 진행 보관</h2><p>현재 브라우저의 네 행성 기록을 한 파일로 보관합니다. 안내·음악 설정과 다른 사이트의 정보는 포함하지 않습니다.</p><div class="backupActions"><button id="backupExport">전체 기록 내보내기</button><label for="backupFile">통합 백업 파일 선택</label><input id="backupFile" type="file" accept=".json,application/json"></div><pre id="backupPreview"></pre><p id="backupStatus" role="status"></p><button id="backupApply" disabled>확인한 기록으로 복원</button><button id="backupUndo" disabled>직전 복원 되돌리기</button><div id="backupUndoConfirm" hidden><p>직전 통합 복원을 실행하기 전의 기록으로 돌아갑니다. 그 뒤의 진행도 바뀝니다. 현재 기록은 먼저 내보내서 보관할 수 있습니다.</p><button id="backupUndoApply">복원 전 기록으로 돌아가기</button><button id="backupUndoCancel">되돌리기 취소</button></div><button id="backupClose">닫기</button></section></dialog>
<script>${script.replace(/<\/script/gi,'<\\/script')}</script></body></html>`;
fs.writeFileSync('release/PLAY-RECOMMAND.html',html);console.log('Launcher:',Buffer.byteLength(html),'bytes; shared atlases:',assets.length);
