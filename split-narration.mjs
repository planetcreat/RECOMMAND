import fs from 'node:fs';
// Lossless splitting inside deliberately inserted five-second silent MP3 sections.
// Never estimates speech boundaries from the length of the Korean text.
const bytes=fs.readFileSync('dist/audio/journey-intros.mp3');
const job=JSON.parse(fs.readFileSync('docs/narration-next-batch.json','utf8'));
let p=0,time=0;const frames=[];
while(p+4<bytes.length){
 const h=bytes.readUInt32BE(p),version=(h>>>19)&3,layer=(h>>>17)&3,bi=(h>>>12)&15,si=(h>>>10)&3;
 if((h>>>21)!==2047||version===1||layer!==1||!bi||bi===15||si===3){if(frames.length)throw Error('Unexpected gap in MP3 frames');p++;continue;}
 if(version!==3||((h>>>6)&3)!==3)throw Error('Expected MPEG-1 Layer III mono');
 const rate=[44100,48000,32000][si],bitrate=[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320][bi]*1000;
 const length=Math.floor(144*bitrate/rate)+((h>>>9)&1),side=p+4+(((h>>>16)&1)?0:2);
 if(p+length>bytes.length)throw Error('Incomplete MP3 frame');
 const read=(bit,n)=>{let x=0;for(let i=0;i<n;i++)x=x*2+((bytes[side+((bit+i)>>3)]>>>(7-(bit+i)%8))&1);return x;};
 frames.push({offset:p,length,time,silent:read(18,12)===0&&read(77,12)===0});time+=1152/rate;p+=length;
}
const gaps=[];let start=null;
for(let i=0;i<=frames.length;i++){
 if(frames[i]?.silent){if(start===null)start=i;}
 else if(start!==null){const end=frames[i]?.time??time;if(end-frames[start].time>4.5)gaps.push({start:frames[start].time,end});start=null;}
}
if(gaps.length!==job.pages.length-1)throw Error('Expected exactly five inserted silent sections');
const names=['prologue-02','how-to-play','yuon-intro','swaehae-intro','mumyeong-intro','hwanseong-intro'];
const manifest=JSON.parse(fs.readFileSync('dist/audio/narration.json','utf8'));
for(let i=0;i<job.pages.length;i++){
 const start=i?gaps[i-1].end-.3:0,end=i<gaps.length?gaps[i].start+.3:time;
 const first=frames.findIndex(f=>f.time>=start),after=frames.findIndex(f=>f.time>=end);
 // Drop the original Xing/Info frame, whose duration describes the entire batch.
 const from=i===0&&bytes.subarray(frames[0].offset,frames[0].offset+frames[0].length).includes(Buffer.from('Info'))?1:first;
 const last=after<0?frames.length:after;
 const clip=bytes.subarray(frames[from].offset,last<frames.length?frames[last].offset:frames.at(-1).offset+frames.at(-1).length);
 fs.writeFileSync('dist/audio/'+names[i]+'.mp3',clip);
 manifest[job.pages[i].tag]={file:names[i]+'.mp3',provider:'TTSMaker',voice:job.voice,license:'https://ttsmaker.com/copyright_and_commercial_license_terms/ko',text:job.pages[i].text,duration:(frames[last]?.time??time)-frames[from].time,source:'journey-intros.mp3',sourceStart:frames[from].time,sourceEnd:frames[last]?.time??time};
}
fs.writeFileSync('dist/audio/narration.json',JSON.stringify(manifest,null,2)+'\n');
console.log('Split six clips at five encoded-silence gaps:',JSON.stringify(gaps));
