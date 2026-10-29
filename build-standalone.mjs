import fs from 'node:fs';import vm from 'node:vm';
const read=p=>fs.readFileSync(p,'utf8');
let html=read('dist/index.html').replace(/<a[^>]+data-online-only[^>]*>[\s\S]*?<\/a>/g,'');
const source=['math.js','story.js','content.js','save.js','engine.js','software.js','game.js'].map(f=>read('dist/'+f).replace(/^import .*;\r?\n/gm,'').replace(/\bexport /g,'')).join('\n');
new vm.Script(source);
html=html.replace('<link rel="stylesheet" href="style.css">',()=>'<style>'+read('dist/style.css')+'</style>');
html=html.replace('<script type="module" src="game.js"></script>',()=>'<script type="module">'+source.replace(/<\/script/gi,'<\\/script')+'</script>');
html=html.replace('href="LEARNING.md" download',()=> 'href="data:text/plain;charset=utf-8,'+encodeURIComponent(read('dist/LEARNING.md'))+'" download="RECOMMAND-LEARNING.md"');
if(/<script[^>]+src=/i.test(html))throw Error('External script remains');
fs.mkdirSync('release',{recursive:true});fs.writeFileSync('release/RECOMMAND.html',html);console.log('Offline build:',Buffer.byteLength(html),'bytes');

