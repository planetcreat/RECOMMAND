import {Geometry} from './engine.js';
const BOSS_TAU=Math.PI*2;
export function bossPose(kind,clock,state={}){const ease=v=>{const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t);},phase=state.phase||'',t=state.time||0,charge=phase==='returnWarn'?ease(t/2.8):phase==='back'?1-ease(t/.7):0,wind=state.wind>0?ease(1-state.wind/(state.pulse?.65:1.1)):state.sequence?1:Math.exp(-Math.max(0,2.8-(state.cd||0))*7)*(state.cd>2.1?1:0),opening=phase==='open'?ease(t/.45):phase==='won'?1:phase==='outWarn'&&state.cycle>1?1-ease(t/.35):0;return{breath:Math.sin(clock*2.2)*.045,sway:Math.sin(clock*.8)*.08,arms:kind==='ormun'?Math.sin(clock*1.4)*.12+wind*.8:Math.sin(clock*1.8)*.09+charge*.7,open:kind==='belrok'?opening:0,pressure:charge,hit:Math.max(0,state.hit||state.shieldFlash||0)};}
// Smooth vertex lighting on ellipsoids, then deform/rotate articulated parts in world space.
function bossBall(g,x,y,z,rx,ry,rz,color,rotation=0,detail=12){
 const lat=Math.max(4,Math.floor(detail*.65)),ca=Math.cos(rotation),sa=Math.sin(rotation);
 const point=(i,j)=>{const a=i/detail*BOSS_TAU,b=j/lat*Math.PI,nx=Math.sin(b)*Math.cos(a),ny=Math.cos(b),nz=Math.sin(b)*Math.sin(a),px=nx*rx,py=ny*ry,shade=.62+.34*Math.max(0,-nx*.35+ny*.65+nz*.65);return[x+px*ca-py*sa,y+px*sa+py*ca,z+nz*rz,...color.map(c=>Math.min(1,c*shade))];};
 for(let j=0;j<lat;j++)for(let i=0;i<detail;i++){const a=point(i,j),b=point(i+1,j),c=point(i+1,j+1),d=point(i,j+1);g.data.push(...a,...b,...c,...a,...c,...d);}
}
function bossTube(g,points,r,color,detail){for(let i=0;i<points.length;i++){const p=points[i];bossBall(g,...p,r,r,r,color,0,detail);}}
function bossRing(g,x,y,z,r,tube,col,spin=0,detail=24){const sides=6,point=(i,j)=>{const a=i/detail*BOSS_TAU+spin,b=j/sides*BOSS_TAU,nx=Math.cos(a)*Math.cos(b),ny=Math.sin(a)*Math.cos(b),nz=Math.sin(b),shade=.65+.3*Math.max(0,ny*.6+nz*.7-nx*.25);return[x+Math.cos(a)*(r+tube*Math.cos(b)),y+Math.sin(a)*(r+tube*Math.cos(b)),z+tube*Math.sin(b),...col.map(c=>c*shade)];};for(let i=0;i<detail;i++)for(let j=0;j<sides;j++){const a=point(i,j),b=point(i+1,j),c=point(i+1,j+1),d=point(i,j+1);g.data.push(...a,...b,...c,...a,...c,...d);}}
export function makeBossModel(kind,x,y,z,clock,state={},soft=false){
 const g=new Geometry(),p=bossPose(kind,clock,state),n=soft?8:14,Y=y+p.breath;
 if(kind==='ormun'){
  const stone=[.48,.65,.53],dark=[.23,.37,.31],moss=[.34,.53,.32],gold=[.94,.78,.4];
  for(const side of[-1,1]){bossBall(g,x+side*.84,Y+.5,z,.67,.62,.86,dark,p.sway*side,n);bossBall(g,x+side*.8,Y+1.05,z,.48,.65,.55,stone,side*.1,n);bossBall(g,x+side*1.53,Y+2.35+p.arms*.4,z,.68,.82,.65,moss,side*(.15+p.arms*.3),n);bossBall(g,x+side*1.85,Y+1.6+p.arms*.8,z+.1,.5,.9,.5,stone,side*(.18+p.arms*.55),n);bossBall(g,x+side*2,Y+1+p.arms*1.2,z+.2,.62,.45,.6,dark,0,n);}
  bossBall(g,x,Y+2,z,1.3,1.55,.94,stone,p.sway,n+2);bossBall(g,x,Y+3.45,z,.98,.85,.84,moss,-p.sway,n+2);bossBall(g,x,Y+3.3,z+.73,.85,.39,.2,dark,0,n);
  for(const side of[-1,1]){bossBall(g,x+side*.38,Y+3.42,z+.91,.12,.16,.07,[1,.87,.45],0,8);bossTube(g,Array.from({length:7},(_,i)=>[x+side*(.7+i*.06),Y+2.7-i*.28,z+.71+Math.sin(i)*.05]),.08,dark,6);}
  bossBall(g,x,Y+2,z+.93,.36,.48,.15,gold,0,n);for(let i=0;i<7;i++){const a=i/7*BOSS_TAU;bossBall(g,x+Math.cos(a)*.8,Y+4.03+Math.sin(i*2)*.15,z+Math.sin(a)*.5,.3,.45,.28,moss,i*.3,8);}
  bossRing(g,x,Y+2,z+1.05,.5,.08,[.69,.79,.54],0,soft?12:24);
  for(let i=0;i<9;i++){const a=i/9*BOSS_TAU;bossBall(g,x+Math.cos(a)*1.12,Y+2+Math.sin(a)*1.05,z+.73,.22,.34,.14,i%2?moss:dark,a,8);}
  for(let i=0;i<3;i++)g.cone(x+(i-1)*.63,Y+4.1,z,.22,.7+Math.sin(clock*2+i)*.05,[.67,.87,.71],6);
 }else{
  const teal=[.19,.43,.46],copper=[.7,.48,.25],brass=[.91,.73,.41],iron=[.25,.37,.4],light=p.open?[.55,1,.88]:[.2,.61,.67];
  for(const side of[-1,1]){bossBall(g,x+side*.73,Y+.4,z+.17,.64,.42,.8,iron,0,n);bossBall(g,x+side*.73,Y+.95,z,.42,.65,.48,copper,side*.06,n);bossBall(g,x+side*1.42,Y+2.7,z,.57,.62,.65,brass,0,n);bossBall(g,x+side*1.75,Y+2.15+p.arms*.5,z,.43,.75,.42,teal,side*(.2+p.arms*.5),n);bossBall(g,x+side*1.94,Y+1.55+p.arms,z+.12,.57,.5,.52,iron,side*.2,n);bossTube(g,Array.from({length:8},(_,i)=>[x+side*(1.18+.13*Math.sin(i*.5)),Y+1.6+i*.28,z-.4]),.13,copper,8);}
  bossBall(g,x,Y+2.2,z,1.23,1.5,.95,teal,p.sway*.3,n+4);bossBall(g,x,Y+3.61,z,1.06,.96,.9,copper,0,n+4);bossBall(g,x,Y+3.44,z+.82,.84,.27,.12,brass,0,n);bossBall(g,x,Y+3.46,z+.94,.66,.12,.04,[.55,.97,.91],0,n);
  bossBall(g,x,Y+2.25,z+.9,.75,.78,.16,brass,0,n+4);bossBall(g,x,Y+2.25,z+1.06,.59,.61,.08,light,0,n+4);
  const dial=(p.pressure*2-1)*1.1;bossTube(g,Array.from({length:6},(_,i)=>[x+Math.sin(dial)*i*.07,Y+2.25+Math.cos(dial)*i*.07,z+1.17]),.035,[.98,.91,.68],6);
  for(const side of[-1,1]){const slide=.3+p.open*.5;bossBall(g,x+side*slide,Y+2.3,z+.95,.24,.74,.24,copper,side*(.08+p.open*.42),n);bossBall(g,x+side*.8,Y+4.13,z-.1,.13,.65,.13,iron,side*.08,8);}
  for(let i=0;i<8;i++){const a=i/8*BOSS_TAU;bossBall(g,x+Math.cos(a)*.95,Y+2.25+Math.sin(a)*1.12,z+.68,.09,.09,.09,brass,0,6);}
  bossRing(g,x,Y+2.25,z+1.08,.66,.095,brass,0,soft?12:28);bossRing(g,x,Y+3.48,z+.91,.77,.045,copper,0,soft?12:24);
  for(const side of[-1,1]){bossBall(g,x+side*.9,Y+2.25,z-.75,.43,1.25,.45,iron,0,n);bossRing(g,x+side*1.46,Y+2.75,z+.54,.28,.065,copper,clock*.35*side,soft?10:18);for(let i=0;i<6;i++){const a=i*Math.PI/3;bossBall(g,x+side*1.46+Math.cos(a)*.29,Y+2.75+Math.sin(a)*.29,z+.57,.055,.055,.07,brass,0,6);}}
  for(let i=0;i<10;i++){const a=i/10*BOSS_TAU;bossBall(g,x+Math.cos(a)*.87,Y+3.67+Math.sin(a)*.3,z+.47,.055,.055,.06,brass,0,6);}
 }
 // Enlarge the visual silhouette without touching combat distances or collision.
 const scale=1.2;for(let i=0;i<g.data.length;i+=6){g.data[i]=x+(g.data[i]-x)*scale;g.data[i+1]=y+(g.data[i+1]-y)*scale;g.data[i+2]=z+(g.data[i+2]-z)*scale;}
 return g;
}
