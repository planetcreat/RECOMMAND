// Plays bundled, pre-generated Korean audio. It never calls an online TTS endpoint.
export class NarrationPlayer{
 constructor({makeAudio,duck=()=>{},status=()=>{}}){this.makeAudio=makeAudio;this.duck=duck;this.status=status;this.generation=0;this.audio=null;}
 stop(){
  this.generation++;if(this.audio){this.audio.onplaying=this.audio.onended=this.audio.onerror=null;this.audio.pause();this.audio.removeAttribute('src');this.audio.load();this.audio=null;}this.duck(false);
 }
 async play(src){
  this.stop();if(!src)return false;const generation=this.generation;
  try{
   const audio=this.makeAudio(src);this.audio=audio;audio.volume=.9;
   audio.onplaying=()=>{if(generation===this.generation){this.duck(true);this.status('playing');}};
   audio.onended=()=>{if(generation===this.generation){this.duck(false);this.status('ended');}};
   audio.onerror=()=>{if(generation===this.generation){this.duck(false);this.status('error');}};
   await audio.play();return generation===this.generation;
  }catch{if(generation===this.generation){this.duck(false);this.status('error');}return false;}
 }
}
