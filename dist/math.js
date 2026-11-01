// Pure gameplay math: no renderer dependency. x/z is the logical ground plane.
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function normalize(x,z){const n=Math.hypot(x,z);return n?{x:x/n,z:z/n}:{x:0,z:0};}
export function inSector(origin,target,facing,range=3.1,minDot=.25){const dx=target.x-origin.x,dz=target.z-origin.z,n=Math.hypot(dx,dz);return n<=range&&(n<1e-6||(dx*facing.x+dz*facing.z)/n>=minDot);}
export function bendHeight(x,y,z,cx,cz,k){return y-k*((x-cx)**2+(z-cz)**2);}
// Visual gravity follows the normal of the bent ground; logical x/z stays flat.
export function surfaceNormal(dx,dz,k){const x=2*k*dx,z=2*k*dz,n=Math.hypot(x,1,z);return[x/n,1/n,z/n];}
export function surfaceMeshPoint(x,y,z,cx,cz,k){const dx=x-cx,dz=z-cz,n=surfaceNormal(dx,dz,k);return[x+n[0]*y,-k*(dx*dx+dz*dz)+n[1]*y,z+n[2]*y];}
export function surfaceSpriteAxes(x,z,cx,cz,k){const up=surfaceNormal(x-cx,z-cz,k),right=[up[1]*.78-up[2]*.625,-up[0]*.78,up[0]*.625],n=Math.hypot(...right);return{up,right:n>1e-6?right.map(v=>v/n):[1,0,0]};}
export function resolveMove(p,dx,dz,obstacles,bound=79){const out={x:p.x,z:p.z},steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dz))/.16));const free=(x,z)=>obstacles.every(o=>Math.hypot(x-o.x,z-o.z)>o.r+.42);for(let i=0;i<steps;i++){const nx=clamp(out.x+dx/steps,-bound,bound);if(free(nx,out.z))out.x=nx;const nz=clamp(out.z+dz/steps,-bound,bound);if(free(out.x,nz))out.z=nz;}return out;}
export function seeded(seed=9273){return()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296;};}

// Presentation only: interpolate fixed simulation steps; never mutate collision or save data.
export class MotionPresenter{
 constructor(p){this.previous={x:p.x,z:p.z};this.camera={x:p.x,z:p.z};this.phase=0;this.gait=0;this.back=p.face?.z<-.2;this.clock=0;}
 capture(p){this.previous={x:p.x,z:p.z};}
 reset(p){this.previous={x:p.x,z:p.z};Object.assign(this.camera,{x:p.x,z:p.z});this.gait=0;}
 sample(p,alpha=1,dt=1/60,{frozen=false,dashing=false}={}){
  dt=clamp(Number.isFinite(dt)?dt:0,0,.15);alpha=clamp(Number.isFinite(alpha)?alpha:1,0,1);
  if(distance(this.previous,p)>8||distance(this.camera,p)>16)this.reset(p);
  const x=frozen?p.x:this.previous.x+(p.x-this.previous.x)*alpha,z=frozen?p.z:this.previous.z+(p.z-this.previous.z)*alpha;
  const speed=frozen?0:distance(p,this.previous)*60;
  this.gait+=(clamp(speed/6.2,0,1)-this.gait)*(1-Math.exp(-18*dt));
  if(!frozen){this.clock+=dt;this.phase+=speed*dt*1.45;}
  if(p.face?.z<-.28)this.back=true;else if(p.face?.z>.12)this.back=false;
  const follow=1-Math.exp(-12*dt);this.camera.x+=(x-this.camera.x)*follow;this.camera.z+=(z-this.camera.z)*follow;
  const stride=Math.sin(this.phase*2),idle=Math.sin(this.clock*1.8);
  return{x,z,cameraX:this.camera.x,cameraZ:this.camera.z,frame:(this.gait>.12?Math.floor(this.phase)%2:0)+(this.back?2:0),bob:this.gait*Math.abs(stride)*.045+(1-this.gait)*idle*.012,width:1+(dashing?.055:Math.cos(this.phase*2)*this.gait*.009),height:1-(dashing?.04:Math.abs(stride)*this.gait*.012),gait:this.gait};
 }
}
export function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0]);}
export function lookAt(eye,target){let z=[eye[0]-target[0],eye[1]-target[1],eye[2]-target[2]],n=Math.hypot(...z);z=z.map(v=>v/n);let x=[z[2],0,-z[0]];n=Math.hypot(...x);x=x.map(v=>v/n);const y=[z[1]*x[2]-z[2]*x[1],z[2]*x[0]-z[0]*x[2],z[0]*x[1]-z[1]*x[0]];return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-x.reduce((s,v,i)=>s+v*eye[i],0),-y.reduce((s,v,i)=>s+v*eye[i],0),-z.reduce((s,v,i)=>s+v*eye[i],0),1]);}

