import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// A separate origin for an ordinary, from-scratch playthrough. No save fixtures or reset API.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../release');
const page=`<!doctype html><html lang="ko"><meta charset="utf-8"><title>RE:COMMAND · 새 여정 연속 검증</title><style>html,body{margin:0;height:100%;background:#152536;color:#f3e5bc;font:14px sans-serif}header{height:32px;display:flex;align-items:center;padding:0 14px;background:#34493d}iframe{display:block;border:0;width:100%;height:calc(100% - 32px)}</style><header>연속 플레이 검증 · 새 기록 · 합성 진행 없음 · 기존 플레이 저장과 분리</header><iframe title="새 여정 연속 검증" id="journeyGame" src="/PLAY-RECOMMAND.html"></iframe></html>`;
http.createServer((req,res)=>{
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1:4182').pathname);}catch{res.writeHead(400).end();return;}
 if(pathname==='/qa'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(page);return;}
 const target=path.resolve(root,'.'+pathname);
 if(!target.startsWith(root+path.sep)||path.extname(target)!=='.html'){res.writeHead(403).end();return;}
 fs.readFile(target,(error,data)=>{res.writeHead(error?404:200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(error?'Not found':data);});
}).listen(4182,'127.0.0.1',()=>console.log('From-scratch journey QA: http://127.0.0.1:4182/qa'));
