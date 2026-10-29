import {Geometry} from './engine.js';
// Presentation only. No collision, health, cooldown or gameplay random stream is touched.
export const FX_PALETTES={slash:[.65,.95,.86],wave:[.35,.85,.88],enemy:[.95,.3,.19],boss:[1,.65,.24]};
export function effectFrame(effect){return Math.min(3,Math.max(0,Math.floor((1-effect.life/effect.max)*4)));}
export function floorQuad(x,y,z,r,angle=0){const c=Math.cos(angle),s=Math.sin(angle);return[[-1,1],[1,1],[1,-1],[-1,-1]].map(([a,b])=>[x+(a*c-b*s)*r,y,z+(a*s+b*c)*r]);}
export function uprightQuad(x,y,z,w,h,angle=0,tilt=0){const c=Math.cos(angle),s=Math.sin(angle);return[[-.5,0],[.5,0],[.5,1],[-.5,1]].map(([a,b])=>[x+a*w*c+b*h*tilt*s,y+b*h,z+a*w*s-b*h*tilt*c]);}
export class CombatVFX{
 constructor(renderer,ground=()=>0){this.r=renderer;this.ground=ground;this.ready=false;this.atlasFrames=[];this.fallback=new Map();if(typeof Image==='undefined')return;const img=new Image();img.crossOrigin='anonymous';img.onload=()=>{try{const size=Math.min(img.naturalWidth,img.naturalHeight)/4;for(let row=0;row<4;row++)for(let frame=0;frame<4;frame++)this.atlasFrames[row*4+frame]=renderer.texture('combat-atlas-'+row+'-'+frame,c=>c.drawImage(img,frame*size+3,row*size+3,size-6,size-6,0,0,256,256),256,256);this.ready=true;}catch{this.failed=true;this.atlasFrames=[];}};img.onerror=()=>{this.failed=true;};img.src='./assets/combat-atlas.png';}
 texture(row,frame){if(this.ready)return this.atlasFrames[row*4+frame];const key=row+'-'+frame;if(!this.fallback.has(key))this.fallback.set(key,this.r.texture('vfx-fallback-'+key,c=>{const colors=['#b9ffe9','#61e9ef','#ff7655','#ffd082'];c.strokeStyle=colors[row];c.shadowColor=colors[row];c.shadowBlur=18;c.lineWidth=8;c.beginPath();c.arc(128,128,60+frame*9,row===0?-.8:0,row===0?2.5:Math.PI*2);c.stroke();},256,256));return this.fallback.get(key);}
 draw(effects,enemies=[],clock=0){if(typeof this.r.effect!=='function')return;const g=new Geometry(),TAU=Math.PI*2;g.alpha=.52;g.additive=true;
  for(const e of effects){if(!['slash','wave','enemy','impact'].includes(e.kind))continue;const t=Math.max(0,Math.min(1,1-e.life/e.max)),fade=Math.pow(1-t,.65),frame=effectFrame(e),y=this.ground(e.x,e.z)+.14;
   if(e.kind==='impact'){const tex=this.texture(e.boss?3:0,Math.min(3,frame));this.r.effect(tex,uprightQuad(e.x,y+.2,e.z,1.7+t,2+t,e.angle||0,.25),fade*.9);continue;}
   const isBoss=e.kind==='enemy'&&e.boss,row=e.water?1:e.kind==='slash'?0:e.kind==='wave'?1:isBoss?3:2,col=e.water?[.25,.85,1]:FX_PALETTES[isBoss?'boss':e.kind==='enemy'?'enemy':e.kind],tex=this.texture(row,frame);
   if(e.kind==='slash'){
    const a=e.angle||0,r=1.1+t*1.9,start=a-1.18+t*.8,end=start+1.8;
    for(let i=0;i<20;i++){const p=start+(end-start)*i/20,q=start+(end-start)*(i+1)/20,h=.35+Math.sin(i/20*Math.PI)*1.65*fade;g.quad([e.x+Math.cos(p)*r,y,e.z+Math.sin(p)*r],[e.x+Math.cos(q)*r,y,e.z+Math.sin(q)*r],[e.x+Math.cos(q)*(r-.2),y+h,e.z+Math.sin(q)*(r-.2)],[e.x+Math.cos(p)*(r-.2),y+h,e.z+Math.sin(p)*(r-.2)],col.map(v=>v*(.65+.35*fade)));}
    this.r.effect(tex,uprightQuad(e.x+Math.cos(a)*1.15,y,e.z+Math.sin(a)*1.15,4.3,2.8,a+Math.PI/2,.28),fade);
   }else if(e.kind==='wave'||isBoss){
    const radius=e.kind==='wave'?.65+t*5.35:e.r*(.94+t*.12),height=(isBoss?2.3:1.15)*Math.sin(Math.PI*(.12+t*.88));
    this.r.effect(tex,floorQuad(e.x,y+.22,e.z,radius*1.12,clock*.08),fade*(isBoss?.9:1));
    for(let i=0;i<40;i++){const a=i/40*TAU,b=(i+1)/40*TAU,ra=radius*(1+.025*Math.sin(i*3+t*8));g.quad([e.x+Math.cos(a)*ra,y,e.z+Math.sin(a)*ra],[e.x+Math.cos(b)*ra,y,e.z+Math.sin(b)*ra],[e.x+Math.cos(b)*(ra-.13),y+height*(.45+.55*Math.abs(Math.sin(i*1.7))),e.z+Math.sin(b)*(ra-.13)],[e.x+Math.cos(a)*(ra-.13),y+height*(.45+.55*Math.abs(Math.sin(i*1.7))),e.z+Math.sin(a)*(ra-.13)],col.map(v=>v*(.55+.45*fade)));}
    for(let i=0;i<(isBoss?12:8);i++){const a=i/12*TAU+t*.35,r=radius*(.5+.45*(i%3)/2);const x=e.x+Math.cos(a)*r,z=e.z+Math.sin(a)*r,h=Math.sin(Math.PI*t)*(isBoss?2.4:1.5);g.cone(x,y+h,z,.09+.08*fade,.25+.35*fade,col,4);if(i%3===0)this.r.effect(tex,uprightQuad(x,y,z,.65,1.5+h,a,.1),fade*.35);}
   }else{
    const a=e.angle||0;this.r.effect(tex,uprightQuad(e.x,y,e.z,3.5,2.8,a+Math.PI/2,.3),fade*.95);
    const n=e.variant===1?7:4;for(let i=0;i<n;i++){const a=i/n*TAU,r=.35+t*(e.r||1.6);g.cone(e.x+Math.cos(a)*r,y+Math.sin(t*Math.PI)*.3,e.z+Math.sin(a)*r,.16*(1-t)+.03,Math.sin(t*Math.PI)*(e.variant===1?1.7:.85),col,4);}
   }
   const sparks=isBoss?18:8;for(let i=0;i<sparks;i++){const a=i*2.399+(e.angle||0),r=t*(isBoss?e.r:2.6)*(0.4+(i%5)/8);g.cone(e.x+Math.cos(a)*r,y+Math.sin(Math.PI*t)*(1+(i%3)*.5),e.z+Math.sin(a)*r,.025+.035*fade,.08+.16*fade,col,3);}
  }
  // Energy gathers above the sprite; the exact hazard radius remains a plain floor ring.
  for(const e of enemies){if(e.hp<=0||e.wind<=0)continue;const boss=e.type===3,progress=boss?1-e.wind/(e.pulse?.65:1.1):1-e.wind/.48;const y=this.ground(e.x,e.z)+.3;for(let i=0;i<(boss?6:3);i++){const a=clock*(boss?2:4)+i*TAU/(boss?6:3),r=boss?1.9:0.7;g.cone(e.x+Math.cos(a)*r,y+(boss?2.2:1.2)+Math.sin(clock*7+i)*.15,e.z+Math.sin(a)*r,.06+.05*Math.max(0,progress),.22,boss?FX_PALETTES.boss:FX_PALETTES.enemy,4);}}
  if(g.data.length)this.r.drawDynamic(g);
 }
}
