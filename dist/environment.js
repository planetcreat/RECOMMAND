import {seeded} from './math.js';
export function decorateGarden(g,{height,pathDistance,landmarks,obstacles,routes=[],soft=false}){
 const random=seeded(90315),TAU=Math.PI*2,lamps=[];
 const clear=(x,z,r=3)=>pathDistance(x,z)>3.4&&landmarks.every(p=>Math.hypot(x-p.x,z-p.z)>(p.clearance||r));
 // Separate decorative seed: adding a flower cannot move a tree, enemy, or story clue.
 for(let i=0;i<(soft?350:850);i++){const x=random()*110-55,z=random()*110-81;if(!clear(x,z,3))continue;const y=height(x,z),v=random();
  if(v<.58){const color=[[.85,.77,.48],[.76,.55,.65],[.55,.78,.7]][i%3];for(let j=0;j<3;j++){const a=j/3*TAU,px=x+Math.cos(a)*.24,pz=z+Math.sin(a)*.24;g.cone(px,y,pz,.026,.33,[.25,.43,.29],3);g.cone(px,y+.28,pz,.11,.1,color,5,.06);}}
  else if(v<.83){g.cone(x,y,z,.38,.25,[.21,.4,.29],5);g.cone(x+.21,y+.1,z+.11,.24,.26,[.32,.5,.34],5);}
  else{g.cone(x,y,z,.14,.25,[.62,.58,.43],5,.1);g.disc(x,y+.25,z,.29,[.68,.35,.32],7);g.disc(x+.2,y+.13,z+.18,.18,[.78,.56,.38],6);}
 }
 // Dense planted edges lead the eye along the winding path, leaving its center clear.
 for(const [a,b]of routes){const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),nx=-dz/len,nz=dx/len;for(let t=1;t<len;t+=3.5)for(const side of[-1,1]){const x=a[0]+dx*t/len+nx*side*3.5,z=a[1]+dz*t/len+nz*side*3.5;if(!landmarks.every(p=>Math.hypot(x-p.x,z-p.z)>(p.clearance||3.2)))continue;const y=height(x,z);g.cone(x,y,z,.85,.55,[.22,.43,.3],6);g.cone(x+.42,y+.15,z+.2,.55,.5,[.32,.52,.35],5);for(let j=0;j<4;j++){const angle=j/4*TAU,px=x+Math.cos(angle)*.65,pz=z+Math.sin(angle)*.65;g.cone(px,y+.35,pz,.12,.16,j%2?[.85,.72,.42]:[.75,.56,.65],5,.06);}}}
 for(const [x,z]of[[-5,-7],[7,-14],[-24,-15],[-12,-28],[17,-25],[28,-38],[-20,-47],[3,-59],[20,-64]]){
  const y=height(x,z);g.cone(x,y,z,.19,2.1,[.27,.32,.27],6,.12);g.cone(x,y+2.1,z,.33,.13,[.56,.53,.35],6,.38);g.cone(x,y+2.23,z,.21,.46,[.91,.77,.4],6,.21);g.cone(x,y+2.69,z,.37,.25,[.3,.4,.32],6);lamps.push({x,z,y:y+2.35});obstacles.push({x,z,r:.23});
 }
 // Broken survey arches and weathered masonry frame the route rather than obscure its markers.
 for(const [x,z]of[[-8,-17],[29,-29],[-25,-51],[24,-74]]){if(!clear(x,z,5))continue;const y=height(x,z);for(const dx of[-1.3,1.3]){g.cone(x+dx,y,z,.42,2.7,[.4,.49,.41],5,.34);g.cone(x+dx,y+2.7,z,.52,.22,[.54,.6,.48],5,.5);obstacles.push({x:x+dx,z,r:.48});}g.quad([x-1.7,y+2.85,z-.35],[x+1.7,y+2.65,z-.35],[x+1.7,y+3.05,z+.35],[x-1.7,y+3.25,z+.35],[.46,.54,.43]);}
 for(let i=0;i<28;i++){const x=random()*100-50,z=random()*90-76;if(!clear(x,z,5))continue;const y=height(x,z);g.cone(x,y,z,.6,.32,[.33,.4,.34],5,.45);g.cone(x+.22,y+.3,z+.1,.3,.17,[.43,.53,.36],5);}
 // The arrival garden receives a ring of stone tiles and low flower beds.
 for(let i=0;i<24;i++){const a=i/24*TAU,x=Math.cos(a)*5.7,z=11+Math.sin(a)*5.7,y=height(x,z);g.cone(x,y,z,.32,.09,[.54,.57,.43],4,.31);if(i%3===0){g.cone(x,y+.1,z,.3,.24,[.37,.55,.35],6);g.cone(x,y+.31,z,.15,.12,[.89,.73,.44],5);}}
 return lamps;
}
