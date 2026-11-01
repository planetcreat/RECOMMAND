import {PROLOGUE,BRIEFINGS,BRIEFING_KEY,readBriefingSeen,pendingBriefing} from './briefing.js';
import {PlanetMusic,PLANET_SCORES,MUSIC_KEY,readMusicSettings} from './music.js';
import {NarrationPlayer} from './narration.js';
// chapters, assets and names are embedded by build-launcher.mjs.
const frame=document.getElementById('gameFrame'),status=document.getElementById('launcherStatus'),modal=document.getElementById('briefing');
const seen=readBriefingSeen(k=>localStorage.getItem(k));let selected=null,loadTimer,pages=[],pageIndex=0,pendingChapter=null,replaying=false,voiceOn=false;
const musicPrefs=readMusicSettings(k=>localStorage.getItem(k));
const music=new PlanetMusic({contextFactory:()=>new (window.AudioContext||window.webkitAudioContext)(),repeat:(f,ms)=>window.setInterval(f,ms),cancel:id=>window.clearInterval(id),delay:(f,ms)=>setTimeout(f,ms),onError:()=>{document.getElementById('musicStatus').textContent='음악을 재생할 수 없습니다. 음악 켜기를 다시 눌러 주세요.';document.getElementById('musicToggle').textContent='음악 켜기';}});
music.setVolume(musicPrefs.volume);
const musicToggle=document.getElementById('musicToggle'),musicVolume=document.getElementById('musicVolume');
musicVolume.value=Math.round(musicPrefs.volume*100);
function saveMusic(){try{localStorage.setItem(MUSIC_KEY,JSON.stringify({enabled:music.enabled,volume:music.volume}));}catch{}}
function musicLabel(){musicToggle.textContent=music.enabled?'음악 끄기':'음악 켜기';musicToggle.setAttribute?.('aria-pressed',String(music.enabled));document.getElementById('musicStatus').textContent=(music.enabled?'재생 · ':'선택한 곡 · ')+PLANET_SCORES[music.chapter].title;}
musicLabel();
musicToggle.onclick=async()=>{musicPrefs.enabled=false;const ok=await music.enable(!music.enabled);if(ok)musicLabel();saveMusic();};
musicVolume.oninput=()=>{music.setVolume(Number(musicVolume.value)/100);saveMusic();};
function selectMusic(chapter){music.select(chapter);if(musicPrefs.enabled&&!music.enabled){musicPrefs.enabled=false;void music.enable(true).then(ok=>{if(ok)musicLabel();});}musicLabel();}
function setStatus(message){status.hidden=false;document.getElementById('loadMessage').textContent=message;}
function loadChapter(name){selected=name;clearTimeout(loadTimer);setStatus('행성을 여는 중입니다…');document.getElementById('welcome').hidden=true;frame.hidden=false;frame.srcdoc=chapters[name].replace(/__RECOMMAND_ASSET_(\d+)__/g,(_,i)=>assets[Number(i)]);document.title=names[name]+' · RE:COMMAND '+version;loadTimer=setTimeout(()=>setStatus('시작이 지연되고 있습니다. Chrome 또는 Edge에서 실행하거나 다시 열기를 눌러 주세요.'),15000);}
function openChapter(name){if(!Object.hasOwn(chapters,name))return;selectMusic(name);const next=pendingBriefing(name,seen);if(next.length){showBriefing(next,name,false);return;}loadChapter(name);}
const narrator=new NarrationPlayer({makeAudio:src=>new window.Audio(src),duck:v=>music.duck(v),status:state=>{document.getElementById('voiceStatus').textContent=state==='playing'?'한국어 나레이션을 재생 중입니다.':state==='ended'?'음성 안내를 마쳤습니다.':'음성을 재생하지 못했습니다. 글로 계속할 수 있습니다.';}});
function cancelVoice(){narrator.stop();}
function voiceAvailability(){const available=typeof window.Audio==='function'&&!!narrationClips[pages[pageIndex]?.tag];document.getElementById('briefVoice').disabled=!available;document.getElementById('briefVoice').textContent=voiceOn?'음성 끄기':'음성 듣기';document.getElementById('voiceStatus').textContent=available?'선택하면 내장된 한국어 나레이션을 재생합니다.':'이 장면의 나레이션은 준비 중입니다. 글로 안내합니다.';return available;}
function narrate(){cancelVoice();const available=voiceAvailability();if(voiceOn&&available&&modal.open)void narrator.play(narrationClips[pages[pageIndex].tag]);}
function renderBriefing(){const p=pages[pageIndex];document.getElementById('briefTag').textContent=p.tag;document.getElementById('briefTitle').textContent=p.title;document.getElementById('briefBody').textContent=p.body;document.getElementById('briefGoal').textContent=p.goal;document.getElementById('briefCount').textContent=(pageIndex+1)+' / '+pages.length;document.getElementById('briefBack').disabled=pageIndex===0;document.getElementById('briefNext').textContent=pageIndex===pages.length-1?(replaying?'안내 닫기':names[pendingChapter]+(pendingChapter==='swaehae'?'로':'으로')+' 출발'):'다음';document.getElementById('briefTitle').focus();narrate();}
function showBriefing(next,chapter,replay){cancelVoice();pages=next;pageIndex=0;pendingChapter=chapter;replaying=replay;modal.dataset.chapter=chapter||'yuon';voiceAvailability();modal.showModal();renderBriefing();}
function finishBriefing(){cancelVoice();modal.close();if(!replaying){seen.intro=true;seen[pendingChapter]=true;try{localStorage.setItem(BRIEFING_KEY,JSON.stringify(seen));}catch{}loadChapter(pendingChapter);}else document.getElementById('journeyHelp').focus();}
document.getElementById('briefNext').onclick=()=>{if(pageIndex===pages.length-1)finishBriefing();else{pageIndex++;renderBriefing();}};
document.getElementById('briefBack').onclick=()=>{if(pageIndex){pageIndex--;renderBriefing();}};
document.getElementById('briefSkip').onclick=finishBriefing;
document.getElementById('briefVoice').onclick=()=>{voiceOn=!voiceOn;document.getElementById('briefVoice').textContent=voiceOn?'음성 끄기':'음성 듣기';narrate();};
modal.addEventListener('cancel',e=>{e.preventDefault();finishBriefing();});
document.getElementById('journeyHelp').onclick=()=>showBriefing([...PROLOGUE,...(BRIEFINGS[selected]||[])],selected||'yuon',true);
document.getElementById('loadRetry').onclick=()=>{if(selected)loadChapter(selected);};
for(const button of document.querySelectorAll('[data-chapter]')){button.onclick=()=>openChapter(button.dataset.chapter);button.disabled=false;}
document.getElementById('journeyHelp').disabled=false;
window.addEventListener('message',e=>{if(e.source!==frame.contentWindow||!e.data)return;if(e.data.type==='recommand-switch'){openChapter(e.data.chapter);return;}if(e.data.chapter!==selected)return;if(e.data.type==='recommand-child-ready'){clearTimeout(loadTimer);status.hidden=true;frame.focus();}if(e.data.type==='recommand-child-error'){clearTimeout(loadTimer);setStatus('불러오기 실패: '+e.data.message);}});
window.addEventListener('pagehide',()=>{cancelVoice();void music.visibility(true);});document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelVoice();void music.visibility(document.hidden);});
