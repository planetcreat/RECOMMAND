import fs from 'node:fs';import vm from 'node:vm';
const read=p=>fs.readFileSync(p,'utf8');
const atlas='data:image/png;base64,'+fs.readFileSync('dist/assets/combat-atlas.png').toString('base64');
function bundle(entry,modules,css,output){
 let html=read('dist/'+entry).replace(/<a[^>]+data-online-only[^>]*>[\s\S]*?<\/a>/g,'');
 let source=modules.map(f=>read('dist/'+f).replace(/^import .*;\r?\n/gm,'').replace(/\bexport /g,'')).join('\n');
 source=source.replace("img.src='./assets/combat-atlas.png';",()=>"img.src="+JSON.stringify(atlas)+';');
 if(entry==='index.html')source=source.replace("location.href='swaehae.html'","location.href='SWAEHAE.html'");
 new vm.Script(source);
 html=html.replace('<link rel="stylesheet" href="'+css+'">',()=>'<style>'+read('dist/'+css)+'</style>');
 html=html.replace(/<script type="module" src="[^"]+"><\/script>/,()=>'<script type="module">'+source.replace(/<\/script/gi,'<\\/script')+'</script>');
 html=html.replace('href="index.html"','href="RECOMMAND.html"');
 html=html.replace('href="LEARNING.md" download',()=> 'href="data:text/plain;charset=utf-8,'+encodeURIComponent(read('dist/LEARNING.md'))+'" download="RECOMMAND-LEARNING.md"');
 if(/<script[^>]+src=|<link[^>]+href=/i.test(html))throw Error('External code remains in '+output);
 fs.mkdirSync('release',{recursive:true});fs.writeFileSync('release/'+output,html);console.log(output+': '+Buffer.byteLength(html)+' bytes');
}
bundle('index.html',['math.js','story.js','content.js','save.js','engine.js','software.js','environment.js','vfx.js','game.js'],'style.css','RECOMMAND.html');
bundle('swaehae.html',['math.js','engine.js','software.js','vfx.js','tide.js','swaehae.js'],'chapter.css','SWAEHAE.html');

