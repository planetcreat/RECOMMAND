import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const [sampleDirectory,ffmpeg='ffmpeg',planet]=process.argv.slice(2);
if(!sampleDirectory)throw Error('Usage: node render-music.mjs <VSCO sample directory> [ffmpeg] [planet]');
const rate=32000;
const instruments={
 piano:{notes:[[57,'piano-low'],[69,'piano-high']],pan:-.28,attack:.012,release:.55},
 harp:{notes:[[48,'harp-low'],[62,'harp-high']],pan:.4,attack:.008,release:.43},
 cello:{notes:[[38,'cello-low'],[48,'cello-mid'],[55,'cello-high']],pan:-.18,attack:.27,release:.7},
 flute:{notes:[[69,'flute-mid'],[76,'flute-high']],pan:.24,attack:.095,release:.32},
 glock:{notes:[[84,'glock']],pan:.38,attack:.009,release:1.2}
};

// Each bar holds a bass note, a chord voicing, and melody events [beat, note, duration].
const pieces={
 yuon:{bpm:82,beats:4,lead:'flute',keys:'piano',space:.19,bars:[
  [41,[53,57,64],[[.75,69,.7],[1.75,72,.75],[2.8,74,1.05]]],
  [40,[52,55,60],[[0,72,1.35],[2.45,67,.9]]],
  [38,[50,53,65],[[.5,69,.95],[1.85,65,.65],[3,62,.7]]],
  [43,[55,58,65],[[.2,65,1.2],[2.05,67,1.5]]],
  [46,[53,57,62],[[0,72,.9],[1.25,74,.8],[2.4,77,1.35]]],
  [45,[52,57,60],[[0,76,1.35],[2.2,72,1.45]]],
  [43,[50,58,62],[[.45,70,.95],[2,69,.7],[3,65,.7]]],
  [48,[52,58,64],[[.25,67,1.3],[2,64,1.5]]],
  [38,[50,57,65],[[1,69,1],[2.35,74,1.3]]],
  [46,[53,57,60],[[.15,72,1.3],[2.05,70,1.15]]],
  [48,[52,55,62],[[.3,67,1.5],[2.3,64,1.25]]],
  [41,[53,57,60],[[0,65,2.75]]]
 ]},
 swaehae:{bpm:58,beats:2,lead:'cello',keys:'harp',space:.22,bars:[
  [38,[50,53,57],[[.12,57,1.1],[1.4,53,.48]]],
  [36,[48,52,55],[[0,52,.9],[1.12,55,.72]]],
  [46,[50,53,57],[[.25,58,1.45]]],
  [45,[52,57,60],[[0,57,.7],[1.05,52,.82]]],
  [38,[50,53,60],[[.12,60,.95],[1.25,62,.58]]],
  [43,[50,55,58],[[.05,58,1.2],[1.4,55,.46]]],
  [46,[53,58,62],[[.35,65,1.43]]],
  [45,[52,55,61],[[.25,61,1.45]]],
  [38,[50,53,57],[[.05,57,.8],[1.1,53,.75]]],
  [36,[48,55,58],[[.33,55,1.4]]],
  [43,[50,55,58],[[.12,53,.9],[1.18,55,.55]]],
  [38,[50,53,57],[[.1,50,1.55]]]
 ]},
 mumyeong:{bpm:57,beats:3,lead:'piano',keys:'harp',space:.31,bars:[
  [40,[52,59,66],[[.45,71,.95],[1.87,66,.9]]],
  [36,[48,55,62],[[.75,74,1.1]]],
  [43,[55,59,62],[[.25,71,.87],[1.58,67,1.15]]],
  [45,[52,57,64],[[.7,64,1.55]]],
  [40,[52,59,67],[[1,76,1.46]]],
  [36,[48,55,64],[[.3,74,1.35],[1.9,71,.75]]],
  [43,[55,59,66],[[.45,67,1.4]]],
  [38,[50,57,64],[[.7,69,1.85]]],
  [40,[52,59,66],[[.45,71,1.05],[2,76,.82]]],
  [36,[48,55,62],[[.25,74,1.9]]],
  [45,[52,57,64],[[.3,69,1.2],[1.8,66,.8]]],
  [40,[52,59,64],[[.2,64,2.18]]]
 ]},
 hwanseong:{bpm:52,beats:4,lead:'piano',keys:null,space:.43,bars:[
  [36,[48,55,62],[[1.1,67,1.3]]],
  [36,[48,55,63],[[.72,70,1.5]]],
  [32,[44,55,62],[]],
  [31,[43,50,62],[[.5,65,1.35],[2.4,62,1.1]]],
  [36,[48,55,62],[[.85,67,1.2],[2.68,63,.98]]],
  [37,[49,56,63],[[1.15,68,2]]],
  [41,[53,60,67],[]],
  [36,[48,55,58],[[.78,62,2.45]]],
  [32,[44,55,63],[[.68,70,1.4]]],
  [34,[46,53,60],[[1.6,65,1.65]]],
  [31,[43,50,62],[[1.1,62,1.8]]],
  [36,[48,55,62],[]]
 ]}
};

function convert(args,input){
 const result=spawnSync(ffmpeg,args,{input,maxBuffer:32*1024*1024,windowsHide:true});
 if(result.error)throw result.error;
 if(result.status!==0)throw Error(result.stderr.toString());
 return result.stdout;
}

if(planet&&!Object.hasOwn(pieces,planet))throw Error('Unknown music planet: '+planet);

for(const instrument of Object.values(instruments)){
 instrument.samples=instrument.notes.map(([midi,file])=>{
  const raw=convert(['-v','error','-i',path.join(sampleDirectory,file+'.wav'),'-ac','1','-ar',String(rate),'-f','f32le','pipe:1']);
  const data=new Float32Array(raw.buffer,raw.byteOffset,raw.length/4);
  let peak=0;
  for(const value of data)peak=Math.max(peak,Math.abs(value));
  const onset=Math.max(0,data.findIndex(value=>Math.abs(value)>peak*.022)-Math.round(rate*.018));
  return {midi,data:data.subarray(onset),scale:.65/peak};
 });
}

function arrangement(name,score){
 const beat=60/score.bpm,events=[];
 let clock=0;
 for(const [bar,[bass,chord,melody]] of score.bars.entries()){
  const localBeat=beat*(1+.027*Math.sin(bar*1.7));
  const play=(instrument,midi,at,length,velocity,extraPan=0)=>{
   const spread=.965+.045*Math.cos(events.length*2.13);
   events.push({instrument,midi,start:clock+at*localBeat,seconds:length*localBeat,velocity:velocity*spread,extraPan});
  };
  const last=bar===score.bars.length-1;
  play('cello',bass,.03,score.beats-(last?.7:.25),name==='hwanseong'?.32:.19);
  if(score.keys){
   const rhythm=name==='swaehae'?[.02,.68,1.36]:name==='mumyeong'?[.16,1.78]:[.03,1.13,2.28,3.24];
   for(let i=0;i<rhythm.length-(last?1:0);i++){
    play(score.keys,chord[(bar+i)%chord.length],rhythm[i],name==='yuon'?.98:1.14,i===0?.23:.13);
   }
  }
  for(const [time,note,length] of melody){
   play(score.lead,note,time,length,name==='hwanseong'?.29:.32);
  }
  if(name==='hwanseong'){
   play('cello',chord[1],.32,score.beats-.75,.18,.36);
   if(bar%3!==2&&!last)play('cello',chord[2],1.05,2.25,.095,-.27);
   if(bar===3||bar===7)play('harp',chord[0]+12,2.78,.9,.15,.19);
   if(bar===5||bar===9)play('glock',chord[2]+12,2.5,1,.085,.16);
  }else if(!last&&bar%3===2){
   play(name==='mumyeong'?'glock':'piano',chord[2]+12,score.beats-.63,.52,.13);
  }
  clock+=localBeat*score.beats;
 }
 if(name==='hwanseong'){
  // The closing and opening bars share C. Let the bowed note carry across them.
  events.push({instrument:'cello',midi:48,start:clock-.94,seconds:1.65,velocity:.21,extraPan:.12});
 }
 return {events,samples:Math.round(clock*rate)};
}

function mix(name,score){
 const {events,samples}=arrangement(name,score);
 const left=new Float32Array(samples),right=new Float32Array(samples);
 for(const note of events){
  const voice=instruments[note.instrument],sample=voice.samples.reduce((a,b)=>
   Math.abs(a.midi-note.midi)<Math.abs(b.midi-note.midi)?a:b);
  const ratio=2**((note.midi-sample.midi)/12);
  const length=Math.min(Math.floor((sample.data.length-1)/ratio),Math.round((note.seconds+voice.release)*rate));
  const pan=Math.max(-.9,Math.min(.9,voice.pan+note.extraPan));
  const lGain=Math.sqrt((1-pan)/2)*sample.scale*note.velocity,rGain=Math.sqrt((1+pan)/2)*sample.scale*note.velocity;
  const start=Math.round(note.start*rate),fadeIn=voice.attack*rate,fadeOut=Math.min(length*.6,voice.release*rate);
  let filtered=0;
  const color=name==='hwanseong'?.31:note.instrument==='glock'?.41:.72;
  for(let i=0;i<length;i++){
   const pos=i*ratio,k=Math.floor(pos),fraction=pos-k;
   const value=sample.data[k]*(1-fraction)+sample.data[k+1]*fraction;
   filtered+=color*(value-filtered);
   const envelope=Math.min(1,i/fadeIn,(length-i)/fadeOut);
   const index=(start+i)%samples;
   left[index]+=filtered*envelope*lGain;
   right[index]+=filtered*envelope*rGain;
  }
 }
 const master=new Float32Array(samples*2),taps=[.043,.071,.102,.147,.219,.307,.419,.587,.751,.964].map(t=>Math.round(t*rate));
 let sum=0,peak=0,leftTail=0,rightTail=0;
 const warmup=name==='hwanseong'?128:0;
 for(let i=-warmup;i<samples;i++){
  let a=0,b=0;
  for(const [j,tap] of taps.entries()){
   const index=(i+samples-tap)%samples,gain=1-j*.07;
   a+=(j%2?left[index]:right[index])*gain;
   b+=(j%2?right[index]:left[index])*gain;
  }
  leftTail+=.16*(a-leftTail);rightTail+=.16*(b-rightTail);
  if(i<0)continue;
  const l=left[i]+leftTail*score.space*.2,r=right[i]+rightTail*score.space*.2;
  master[i*2]=l;master[i*2+1]=r;sum+=l*l+r*r;peak=Math.max(peak,Math.abs(l),Math.abs(r));
 }
 const gain=Math.min(.072/Math.sqrt(sum/master.length),.58/peak);
 // Pad only the encoder boundary; the instruments and room tail remain continuous.
 const edge=Math.round(rate*(name==='hwanseong'?.005:.014));
 for(let i=0;i<samples;i++){
  const fade=Math.min(1,i/edge,(samples-1-i)/edge);
  master[i*2]*=gain*fade;master[i*2+1]*=gain*fade;
 }
 return {master,samples,peak:peak*gain,rms:Math.sqrt(sum/master.length)*gain};
}

const output=new URL('./dist/audio/music/',import.meta.url);
fs.mkdirSync(output,{recursive:true});
for(const [name,score] of Object.entries(pieces)){
 if(planet&&name!==planet)continue;
 const {master,samples,peak,rms}=mix(name,score);
 const file=new URL(name+'.ogg',output);
 const encoded=convert(['-v','error','-f','f32le','-ar',String(rate),'-ac','2','-i','pipe:0',
  '-c:a','libopus','-b:a','96k','-f','ogg','pipe:1'],Buffer.from(master.buffer));
 fs.writeFileSync(file,encoded);
 console.log(name,(samples/rate).toFixed(1)+'s',encoded.length+'B','peak='+peak.toFixed(3),'rms='+rms.toFixed(3));
}
