// Isolated browser fixture server. Never use the ordinary gameplay origin.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {boot} from './harness.mjs';
import {snapshot,decode} from '../dist/save.js';
import {TIDE_INITIAL,decodeTide} from '../dist/tide.js';
import {newLateState,decodeLate,journeySummary,canShare} from '../dist/late-state.js';
const h=boot(),u=h.a.state();
Object.assign(u,{quest:2,seals:[true,true,true],memories:[true,true],boss:true,complete:true,ending:'rewrite',bond:true,fracture:true});
for(const e of h.a.enemies)e.hp=0;
const yuon=snapshot(u,h.a.player,h.a.enemies,[]);decode(yuon,h.a.enemies);
const sea=structuredClone(TIDE_INITIAL);Object.assign(sea,{arrival:true,introduced:true,gates:[true,true],observations:[true,true,true],foregate:true,boat:{met:true,stage:'complete',elapsed:14},boss:{defeated:true,rewritten:true}});decodeTide(sea);
const snow=newLateState('mumyeong');Object.assign(snow,{arrived:true,heard:['keeper','walker','bell','footprints','archive'],compared:[true,true,true],chime:true,asked:true,boss:true,ending:'witness'});decodeLate(snow,'mumyeong');
const orbit=newLateState('hwanseong');Object.assign(orbit,{arrived:true,relays:[true,true,true],invited:[true,true,true],tomorrow:true,lumi:true,boss:true,player:{x:0,z:-42,hp:100}});decodeLate(orbit,'hwanseong');
const fixtures={'recommand-save-v1':JSON.stringify(yuon),'recommand-swaehae-v1':JSON.stringify(sea),'recommand-mumyeong-v1':JSON.stringify(snow),'recommand-hwanseong-v1':JSON.stringify(orbit)};
if(!canShare(orbit,journeySummary(k=>fixtures[k])))throw Error('Invalid shared-ending fixture');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const qa=`<!doctype html><html lang="ko"><meta charset="utf-8"><title>RE:COMMAND 공동 결말 · 격리 검증</title><style>body{margin:0;background:#152536;color:#f3e5bc;font:14px sans-serif}header{height:38px;padding:0 15px;display:flex;align-items:center;gap:12px;background:#563c36}button{padding:5px 12px}iframe{border:0;width:100%;height:calc(100vh - 38px)}main{padding:40px;line-height:2}</style><header>검증 전용 · 합성 진행 기록 · 실제 플레이 저장과 분리<button id="resume">테스트 기록 이어서 열기</button></header><main id="intro"><h1>공동 결말 연출 검증</h1><p>이 주소(4181)에만 네 행성의 검증용 저장 기록을 넣습니다.<br>4173 및 기존 웹 주소의 진행은 변경하지 않습니다.</p><button id="seed">합성 기록으로 검증 시작</button></main><iframe id="qaGame" title="공동 결말 검증 게임" hidden></iframe><script>const fixtures=${JSON.stringify(fixtures)};function open(){document.getElementById('intro').hidden=true;const f=document.getElementById('qaGame');f.hidden=false;f.src='/release/PLAY-RECOMMAND.html';}document.getElementById('resume').onclick=open;document.getElementById('seed').onclick=()=>{if(location.port!=='4181')throw Error('Wrong test origin');for(const [key,value]of Object.entries(fixtures))localStorage.setItem(key,value);open();};</script></html>`;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png'};
http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1:4181');if(url.pathname==='/qa'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(qa);return;}
 const f=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!f.startsWith(root+path.sep)||!url.pathname.startsWith('/release/')){res.writeHead(403).end();return;}
 fs.readFile(f,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});res.end(e?'Not found':b);});
}).listen(4181,'127.0.0.1',()=>console.log('Isolated synthetic QA: http://127.0.0.1:4181/qa'));
