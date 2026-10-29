// Pure gameplay math: no renderer dependency. x/z is the logical ground plane.
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function normalize(x,z){const n=Math.hypot(x,z);return n?{x:x/n,z:z/n}:{x:0,z:0};}
export function inSector(origin,target,facing,range=3.1,minDot=.25){const dx=target.x-origin.x,dz=target.z-origin.z,n=Math.hypot(dx,dz);return n<=range&&(n<1e-6||(dx*facing.x+dz*facing.z)/n>=minDot);}
export function bendHeight(x,y,z,cx,cz,k){return y-k*((x-cx)**2+(z-cz)**2);}
export function resolveMove(p,dx,dz,obstacles,bound=79){const out={x:p.x,z:p.z},steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dz))/.16));const free=(x,z)=>obstacles.every(o=>Math.hypot(x-o.x,z-o.z)>o.r+.42);for(let i=0;i<steps;i++){const nx=clamp(out.x+dx/steps,-bound,bound);if(free(nx,out.z))out.x=nx;const nz=clamp(out.z+dz/steps,-bound,bound);if(free(out.x,nz))out.z=nz;}return out;}
export function seeded(seed=9273){return()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296;};}
export function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0]);}
export function lookAt(eye,target){let z=[eye[0]-target[0],eye[1]-target[1],eye[2]-target[2]],n=Math.hypot(...z);z=z.map(v=>v/n);let x=[z[2],0,-z[0]];n=Math.hypot(...x);x=x.map(v=>v/n);const y=[z[1]*x[2]-z[2]*x[1],z[2]*x[0]-z[0]*x[2],z[0]*x[1]-z[1]*x[0]];return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-x.reduce((s,v,i)=>s+v*eye[i],0),-y.reduce((s,v,i)=>s+v*eye[i],0),-z.reduce((s,v,i)=>s+v*eye[i],0),1]);}

