import {perspective,lookAt} from './math.js';
// CPU projection fallback for devices without WebGL. Uses the same logical world and bend formula.
export class SoftwareRenderer{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});if(!this.ctx)throw Error('화면을 만들 수 없습니다.');this.backend='software';this.gl={getError:()=>0};this.textures=new Map();this.calls=0;this.queue=[];}
 upload(g){const chunks=new Map(),a=g.data;for(let i=0;i<a.length;i+=18){const x=(a[i]+a[i+6]+a[i+12])/3,z=(a[i+2]+a[i+8]+a[i+14])/3,cx=Math.floor(x/10),cz=Math.floor(z/10),key=cx+','+cz;if(!chunks.has(key))chunks.set(key,{x:cx*10+5,z:cz*10+5,data:[]});const chunk=chunks.get(key);for(let j=0;j<18;j++)chunk.data.push(a[i+j]);}return{chunks:[...chunks.values()].map(c=>({...c,data:new Float32Array(c.data)}))};}
 texture(key,draw,w=128,h=128){if(this.textures.has(key))return this.textures.get(key);const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);this.textures.set(key,c);return c;}
 begin(x,z,k){const c=this.canvas;const dpr=Math.min(devicePixelRatio||1,1);const w=Math.max(1,Math.floor(innerWidth*dpr)),h=Math.max(1,Math.floor(innerHeight*dpr));if(c.width!==w||c.height!==h){c.width=w;c.height=h;}this.width=w;this.height=h;this.center=[x,z];this.curve=k;this.view=lookAt([x,18,z+22],[x,0,z-1]);this.focal=h/(2*Math.tan(Math.PI/6));this.queue.length=0;this.calls=0;const sky=this.ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#233c50');sky.addColorStop(.5,'#577d82');sky.addColorStop(1,'#7d9890');this.ctx.fillStyle=sky;this.ctx.fillRect(0,0,w,h);}
 project(x,y,z){const v=this.view,by=y-this.curve*((x-this.center[0])**2+(z-this.center[1])**2);const depth=-(v[2]*x+v[6]*by+v[10]*z+v[14]);if(depth<=.3)return null;return{x:this.width/2+(v[0]*x+v[4]*by+v[8]*z+v[12])*this.focal/depth,y:this.height/2-(v[1]*x+v[5]*by+v[9]*z+v[13])*this.focal/depth,depth};}
 mesh(mesh){
 if(mesh.chunks){this.ground??=mesh;for(const chunk of mesh.chunks){if(Math.abs(chunk.x-this.center[0])>42||chunk.z-this.center[1]>30||chunk.z-this.center[1]<-48)continue;this.renderChunk(chunk.data,mesh===this.ground?0:1);}this.calls++;return;}this.renderChunk(mesh.data,1);this.calls++;}
 renderChunk(a,layer){
 for(let i=0;i<a.length;i+=18){
 const p=this.project(a[i],a[i+1],a[i+2]),q=this.project(a[i+6],a[i+7],a[i+8]),r=this.project(a[i+12],a[i+13],a[i+14]);
 if(!p||!q||!r)continue;
 if(Math.max(p.x,q.x,r.x)<0||Math.min(p.x,q.x,r.x)>this.width||Math.max(p.y,q.y,r.y)<0||Math.min(p.y,q.y,r.y)>this.height)continue;
 const depth=(p.depth+q.depth+r.depth)/3,t=Math.max(0,Math.min(1,(depth-36)/64)),fog=t*t*(3-2*t),sky=[.34,.49,.51];
 const col=[0,1,2].map(j=>Math.round(Math.max(0,Math.min(1,a[i+3+j]*(1-fog)+sky[j]*fog))*255));
 this.queue.push({type:0,layer,depth,p,q,r,color:'rgb('+col.join(',')+')'});
 }
 }
 drawDynamic(g){this.mesh({data:g.data});}
 sprite(texture,x,y,z,w,h,alpha=1){const p=this.project(x,y,z);if(!p)return;const scale=this.focal/p.depth,pw=w*scale,ph=h*scale;if(p.x+pw<0||p.x-pw>this.width||p.y<0||p.y-ph>this.height)return;this.queue.push({type:1,layer:1,depth:p.depth,texture,x:p.x-pw/2,y:p.y-ph,w:pw,h:ph,alpha});this.calls++;}
 effect(texture,points,alpha=1,additive=true){const p=points.map(v=>this.project(...v));if(p.some(v=>!v))return;this.queue.push({type:2,layer:1,depth:p.reduce((n,v)=>n+v.depth/4,0),texture,points:p,alpha,additive});this.calls++;}
 drawEffect(e){const c=this.ctx,w=e.texture.width,h=e.texture.height;const source=[[0,h],[w,h],[w,0],[0,0]];for(const ids of[[0,1,2],[0,2,3]]){const [a,b,d]=ids.map(i=>e.points[i]),[s,t,u]=ids.map(i=>source[i]);const den=s[0]*(t[1]-u[1])+t[0]*(u[1]-s[1])+u[0]*(s[1]-t[1]);if(!den)continue;const solve=k=>[(a[k]*(t[1]-u[1])+b[k]*(u[1]-s[1])+d[k]*(s[1]-t[1]))/den,(a[k]*(u[0]-t[0])+b[k]*(s[0]-u[0])+d[k]*(t[0]-s[0]))/den,(a[k]*(t[0]*u[1]-u[0]*t[1])+b[k]*(u[0]*s[1]-s[0]*u[1])+d[k]*(s[0]*t[1]-t[0]*s[1]))/den];const x=solve('x'),y=solve('y');c.save();c.globalAlpha=e.alpha;c.globalCompositeOperation=e.additive?'lighter':'source-over';c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.lineTo(d.x,d.y);c.closePath();c.clip();c.transform(x[0],y[0],x[1],y[1],x[2],y[2]);c.drawImage(e.texture,0,0);c.restore();}}
 finish(){const c=this.ctx;this.queue.sort((a,b)=>a.layer-b.layer||b.depth-a.depth);for(const e of this.queue){if(e.type===2)this.drawEffect(e);else if(e.type){c.globalAlpha=e.alpha;c.drawImage(e.texture,e.x,e.y,e.w,e.h);c.globalAlpha=1;}else{c.fillStyle=e.color;c.beginPath();c.moveTo(e.p.x,e.p.y);c.lineTo(e.q.x,e.q.y);c.lineTo(e.r.x,e.r.y);c.closePath();c.fill();}}}
}

