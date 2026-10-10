// Bounded diagnostics use raw wall time: a long frame must not disappear behind dt clamping.
export class FrameMetrics {
 constructor(limit=360){this.limit=limit;this.samples=[];this.count=0;this.longFrames=0;}
 record(frameMs,simulationMs,worldMs,cargoMs){
  if(!Number.isFinite(frameMs)||frameMs<0)return;
  this.count++;if(frameMs>50)this.longFrames++;
  this.samples.push({frameMs,simulationMs,worldMs,cargoMs});
  if(this.samples.length>this.limit)this.samples.shift();
 }
 snapshot(){
  const metric=key=>{const values=this.samples.map(s=>s[key]).sort((a,b)=>a-b);return {p50:values[Math.floor(values.length*.5)]||0,p95:values[Math.min(values.length-1,Math.floor(values.length*.95))]||0,max:values.at(-1)||0};};
  return {count:this.count,longFrames:this.longFrames,window:this.samples.length,frame:metric('frameMs'),simulation:metric('simulationMs'),world:metric('worldMs'),cargo:metric('cargoMs')};
 }
}
