import {Geometry} from './engine.js';
const LATE_TAU=Math.PI*2;
function lateBall(g,x,y,z,rx,ry,rz,col,spin=0,n=12){
 const lat=6,cs=Math.cos(spin),sn=Math.sin(spin);
 const point=(i,j)=>{const a=i/n*LATE_TAU,b=j/lat*Math.PI,nx=Math.sin(b)*Math.cos(a),ny=Math.cos(b),nz=Math.sin(b)*Math.sin(a),shade=.68+.31*Math.max(0,ny*.6+nz*.65-nx*.3),px=nx*rx,py=ny*ry;return[x+px*cs-py*sn,y+px*sn+py*cs,z+nz*rz,...col.map(c=>c*shade)];};
 for(let i=0;i<n;i++)for(let j=0;j<lat;j++){const a=point(i,j),b=point(i+1,j),c=point(i+1,j+1),d=point(i,j+1);g.data.push(...a,...b,...c,...a,...c,...d);}
}
function lateOrbit(g,x,y,z,r,tube,col,spin,tilt,n){
 const point=(i,j)=>{const a=i/n*LATE_TAU+spin,b=j/5*LATE_TAU,px=Math.cos(a)*(r+tube*Math.cos(b)),py=Math.sin(a)*(r+tube*Math.cos(b)),pz=tube*Math.sin(b),c=Math.cos(tilt),s=Math.sin(tilt);return[x+px,y+py*c-pz*s,z+py*s+pz*c,...col];};
 for(let i=0;i<n;i++)for(let j=0;j<5;j++){const a=point(i,j),b=point(i+1,j),c=point(i+1,j+1),d=point(i,j+1);g.data.push(...a,...b,...c,...a,...c,...d);}
}
export function makeLateBossModel(planet,x,y,z,time,b={},soft=false){
 const g=new Geometry(),n=soft?8:14,breath=Math.sin(time*1.7)*.09,open=b.phase==='open'?Math.min(1,(b.time||0)*3):b.phase==='won'?1:0,charge=b.phase==='warn'?Math.min(1,(b.time||0)/1.65):0;
 if(planet==='mumyeong'){
  const ice=[.67,.82,.9],white=[.91,.94,.95],ink=[.19,.28,.43],gold=[.89,.71,.44],glow=open?[.5,1,.91]:[.45,.68,.91];
  lateBall(g,x,y+2.5+breath,z,1.35,1.7,.95,ink,Math.sin(time*.6)*.04,n);
  lateBall(g,x,y+3.65+breath,z+.48,1.15,1.28,.57,white,0,n);
  for(const side of[-1,1]){
   lateBall(g,x+side*.42,y+3.8+breath,z+1.02,.18,.13,.06,glow,side*.2,n);
   lateBall(g,x+side*1.15,y+2.7+breath+charge*.4,z,.48,.67,.5,ice,side*.4,n);
   lateBall(g,x+side*(1.7+charge*.3),y+2+breath+charge*.7,z+.25,.32,.85,.33,white,side*(.4+charge*.5),n);
   lateBall(g,x+side*.75,y+.55,z,.5,.7,.6,ice,side*.1,n);
   g.cone(x+side*.74,y+4.4+breath,z,.28,1.1,ice,6,.03);
   // The mask halves part slowly during the punish window.
   lateBall(g,x+side*(.28+open*.55),y+3.15+breath,z+.92,.28,.62,.18,white,side*open*.5,n);
  }
  lateBall(g,x,y+2.3+breath,z+.91,.3,.47,.14,glow,0,n);
  lateOrbit(g,x,y+3.65+breath,z+.3,1.63,.07,gold,time*.16,.25,soft?16:28);
  for(let i=0;i<5;i++){const a=i/5*LATE_TAU+time*.15;lateBall(g,x+Math.cos(a)*2.45,y+1.9+Math.sin(a)*.35,z+Math.sin(a)*1.1,.24,.37,.08,ice,a,6);}
 }else{
  const dark=[.29,.22,.43],gold=[.9,.71,.44],violet=[.64,.49,.82],light=open?[.7,1,.9]:[.68,.8,1];
  lateBall(g,x,y+2.5+breath,z,1.15,1.45,1.1,dark,time*.08,n);
  lateBall(g,x,y+2.5+breath,z+.8,.55,.72,.38,light,0,n);
  for(let k=0;k<3;k++)lateOrbit(g,x,y+2.6+breath,z,2.05+k*.23,.105,k===1?violet:gold,time*(.2+k*.07)*(k%2?-1:1),k*Math.PI/3+charge*.25,soft?18:32);
  for(let i=0;i<4;i++){const a=i/4*LATE_TAU+time*.2,rr=2.35+open*.55;lateBall(g,x+Math.cos(a)*rr,y+2.6+Math.sin(a)*rr,z+.2,.35,.35,.35,i===b.cycle%4?light:gold,0,n);}
  for(const side of[-1,1]){lateBall(g,x+side*1.35,y+.55,z,.56,.7,.6,dark,side*.2,n);lateBall(g,x+side*1.55,y+1.4,z,.34,.8,.36,gold,side*.3,n);}
  g.cone(x,y+4.3+breath,z,.55,.8,gold,8,.12);
 }
 return g;
}
