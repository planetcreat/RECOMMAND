// Shared visual assets only: no gameplay state, collision or random stream is touched.
export const ART_KEYS={hero0:0,hero1:1,heroBack0:2,heroBack1:3,lumi:4,scout:5,naru:6,doha:7,slime0:8,slime1:9,slime2:10,worker:11,slime0b:12,slime1b:13,slime2b:14,elder:15};
export const PROP_KEYS={oak:0,pine:1,rock:2,lamp:3,arch:4,altar:5,portal:6,observatory:7,boat:8,stall:9,sluice:10,gauge:11,flowers:12,shrub:13,mushrooms:14,cargo:15};
export class WorldArt{
 constructor(renderer){this.r=renderer;this.actors=[];this.props=[];this.actorReady=false;this.propReady=false;this.failed=[];if(typeof Image==='undefined')return;this.load('./assets/actors-atlas.png',this.actors,ART_KEYS,[0,.255,.556,.78,1],[0,.25,.5,.75,1],'actors');this.load('./assets/environment-atlas.png',this.props,PROP_KEYS,[0,.275,.51,.76,1],[0,.27,.51,.79,1],'props');}
 load(src,target,keys,rows,cols,kind){const img=new Image();img.crossOrigin='anonymous';img.onload=()=>{try{const next=[];for(let i=0;i<16;i++){const row=Math.floor(i/4),col=i%4,x=Math.round(cols[col]*img.naturalWidth),y=Math.round(rows[row]*img.naturalHeight),w=Math.round(cols[col+1]*img.naturalWidth)-x,h=Math.round(rows[row+1]*img.naturalHeight)-y;next[i]=this.r.texture('world-art-'+kind+'-'+i,(c)=>{
  const cell=document.createElement('canvas');cell.width=w;cell.height=h;const ctx=cell.getContext('2d');ctx.drawImage(img,x,y,w,h,0,0,w,h);const pixels=ctx.getImageData(0,0,w,h).data;let left=w,right=0,top=h,bottom=0;
  for(let py=0;py<h;py++)for(let px=0;px<w;px++)if(pixels[(py*w+px)*4+3]>48){left=Math.min(left,px);right=Math.max(right,px);top=Math.min(top,py);bottom=Math.max(bottom,py);}
  if(right<left||bottom<top)return;const cw=right-left+1,ch=bottom-top+1,scale=Math.min(246/cw,246/ch),dw=cw*scale,dh=ch*scale;c.imageSmoothingEnabled=true;c.drawImage(cell,left,top,cw,ch,(256-dw)/2,254-dh,dw,dh);
 },256,256);}target.push(...next);this[kind==='actors'?'actorReady':'propReady']=true;}catch{this.failed.push(kind);}};img.onerror=()=>this.failed.push(kind);img.src=src;}
 actor(key,fallback){return this.actorReady?this.actors[ART_KEYS[key]]??fallback:fallback;}
 prop(key){return this.propReady?this.props[PROP_KEYS[key]]:null;}
 drawProp(key,x,y,z,size){const tex=this.prop(key);if(tex)this.r.sprite(tex,x,y,z,size,size);}
}
export function visualTerrain(x,z,planet='garden'){
 const n=Math.sin(x*.63+Math.sin(z*.22))*Math.cos(z*.39)+.35*Math.sin(x*1.7+z*1.3),b=Math.sin(x*.11+z*.15);
 return planet==='harbor'?[.43+n*.025,.47+n*.025,.43+n*.02]:[.28+n*.025+b*.02,.46+n*.035+b*.025,.31+n*.025];
}
