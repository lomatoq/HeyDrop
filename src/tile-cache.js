import {STREAMING} from './tuning.js';
const C=window.Cesium;
// One owner for decoded imagery. Visible requests always outrank speculative work.
export class ImageryCache {
 constructor(source){this.source=source;this.tiles=new Map();this.parents=new Map();this.queue=[];this.active=0;this.backgroundActive=0;this.maxConcurrent=STREAMING.concurrent;this.maxDecoded=STREAMING.decoded;this.hits=0;this.received=0;this.failures=0;this.cancelled=0;this.cancelledActive=0;this.cancelledQueued=0;this.promoted=0;this.generation=0;this.prewarm={ready:false,done:0,total:0};this.timings=[];this.queuePeak=0;}
 key(x,y,z){return `${z}/${x}/${y}`;}
 request(x,y,z,priority=0,owner='background'){
  const key=this.key(x,y,z),known=this.tiles.get(key);
  if(known){this.hits++;known.used=performance.now();if(!known.image)known.owners.add(owner);if(priority>=3&&known.priority<3){this.promoted++;if(known.background){known.background=false;this.backgroundActive--;}}known.priority=Math.max(known.priority,priority);this.pump();return known.promise;}
  if(priority<3&&this.queue.filter(r=>r.priority<3).length>=STREAMING.queuedBackground)return Promise.reject(Error('Prefetch budget'));
  let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});
  const now=performance.now(),r={key,x,y,z,priority,promise,resolve,reject,image:null,used:now,queuedAt:now,tries:0,owners:new Set([owner]),cancelled:false};
  this.tiles.set(key,r);this.queue.push(r);this.queuePeak=Math.max(this.queuePeak,this.queue.length);this.pump();return promise;
 }
 pump(){
  this.queuePeak=Math.max(this.queuePeak,this.queue.length);
  this.queue.sort((a,b)=>b.priority-a.priority||a.z-b.z);
  while(this.active<this.maxConcurrent&&this.queue.length){
   const i=this.queue.findIndex(r=>r.priority>=3||this.backgroundActive<STREAMING.background);if(i<0)break;
   const r=this.queue.splice(i,1)[0];r.background=r.priority<3;r.startedAt=performance.now();r.inflight=true;this.active++;if(r.background)this.backgroundActive++;void this.load(r);
  }
 }
 async load(r){
  let timer;const request=r.request=new C.Request({throttle:false,throttleByServer:false});
  try{
   const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{request.cancel();reject(Error('Imagery timeout'));},12000);});
   // Our abort promise also settles providers that ignore Request.cancel(). A late
   // response cannot resolve the cancelled shared record or delete its replacement.
   const aborted=new Promise((_,reject)=>{r.abort=reject;});
   const im=await Promise.race([Promise.resolve(this.source.requestImage(r.x,r.y,r.z,request)),deadline,aborted]);
   if(r.cancelled)return;if(!im)throw Error('No decoded imagery');r.image=im;this.received++;this.timings.push({queueMs:r.startedAt-r.queuedAt,requestToDecodedMs:performance.now()-r.startedAt});if(this.timings.length>64)this.timings.shift();r.owners.clear();r.resolve(im);this.trim();
  }catch(e){if(r.cancelled)return;if(r.tries++<1&&r.priority>=3){r.queuedAt=performance.now();this.queue.push(r);}else{this.failures++;if(this.tiles.get(r.key)===r)this.tiles.delete(r.key);r.reject(e);}}
  finally{clearTimeout(timer);r.inflight=false;r.abort=null;r.request=null;this.active--;if(r.background){this.backgroundActive--;r.background=false;}this.pump();}
 }
 trim(){
  if(this.tiles.size<=this.maxDecoded)return;
  const candidates=[...this.tiles.values()].filter(r=>r.image&&!r.pin).sort((a,b)=>a.used-b.used);
  for(const r of candidates){if(this.tiles.size<=this.maxDecoded)break;this.tiles.delete(r.key);}
 }
 parent(x,y,z){
  if(z===0)return this.request(x,y,z,6);
  const key=this.key(x,y,z),old=this.parents.get(key);if(old)return old;
  const task=this.request(x>>1,y>>1,z-1,6).then(im=>{
   const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
   const w=im.width||256,h=im.height||256,flipped=typeof ImageBitmap!=='undefined'&&im instanceof ImageBitmap;
   if(flipped){g.translate(0,256);g.scale(1,-1);}
   g.drawImage(im,(x&1)*w*.5,(flipped?1-(y&1):(y&1))*h*.5,w*.5,h*.5,0,0,256,256);return c;
  }).catch(e=>{this.parents.delete(key);throw e;});
  this.parents.set(key,task);if(this.parents.size>STREAMING.parents)this.parents.delete(this.parents.keys().next().value);return task;
 }
 async warmTour(round,aspect){
  const generation=this.generation,scheme=this.source.tilingScheme,point=new C.Cartographic(round.lon*Math.PI/180,round.lat*Math.PI/180);
  const group=this.prewarm={ready:false,done:0,total:0,failed:0,seed:round.seed};const jobs=[],keys=new Set();
  // Small centre rings, spread over the route; never block starting the memory timer.
  for(let z=16;z>=0;z--){const t=scheme.positionToTileXY(point,z);if(!t)continue;const nx=scheme.getNumberOfXTilesAtLevel(z),ny=scheme.getNumberOfYTilesAtLevel(z),radius=z>=14?1:0;
   for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){const x=(t.x+dx+nx)%nx,y=t.y+dy,key=this.key(x,y,z);if(y<0||y>=ny||keys.has(key))continue;keys.add(key);jobs.push([x,y,z]);}
  }
  group.total=jobs.length;
  await Promise.all(jobs.map(([x,y,z])=>this.request(x,y,z,1,'tour').then(()=>{if(generation===this.generation){const r=this.tiles.get(this.key(x,y,z));if(r)r.pin=true;}},()=>group.failed++).finally(()=>group.done++)));
  if(generation===this.generation){group.ready=true;group.completedAt=performance.now();}return group;
 }
 warmDecoys(round){
  const scheme=this.source.tilingScheme,points=(round.decoys||[]).slice(0,2).map(place=>new C.Cartographic(Math.atan2(place.aim[1],place.aim[0]),Math.asin(Math.max(-1,Math.min(1,place.aim[2])))));
  // Admit both sharp centres before spending the existing queue budget on rings.
  // Target-tour requests retain priority 1; all decoys remain priority 0.
  for(const radius of [0,1])for(const z of [15,17,12,7])for(const point of points){const tile=scheme.positionToTileXY(point,z);if(!tile)continue;const nx=scheme.getNumberOfXTilesAtLevel(z),ny=scheme.getNumberOfYTilesAtLevel(z);for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){if(radius&&dx===0&&dy===0)continue;const y=tile.y+dy;if(y>=0&&y<ny)this.request((tile.x+dx+nx)%nx,y,z,0,'decoys').catch(()=>{});}}
 }
 releaseTour(){this.generation++;for(const r of this.tiles.values())r.pin=false;this.trim();this.prewarm.released=true;this.cancelBackground();}
 cancelBackground(owner,keep=new Set()){
  for(const r of this.tiles.values()){
   if(r.image||r.priority>=3||r.cancelled)continue;
   if(owner){if(!r.owners.has(owner)||keep.has(r.key))continue;r.owners.delete(owner);if(r.owners.size)continue;}
   r.cancelled=true;this.cancelled++;if(r.inflight)this.cancelledActive++;else this.cancelledQueued++;
   this.tiles.delete(r.key);const error=Error('Obsolete prefetch');error.name='AbortError';r.reject(error);r.abort?.(error);r.request?.cancel();
  }
  this.queue=this.queue.filter(r=>!r.cancelled);this.pump();
 }
 replacePrefetch(owner,jobs,priority=0){
  const keep=new Set(jobs.map(([x,y,z])=>this.key(x,y,z)));this.cancelBackground(owner,keep);
  for(const [x,y,z]of jobs)this.request(x,y,z,priority,owner).catch(()=>{});
 }
 unpin(){this.generation++;this.cancelBackground();for(const r of this.tiles.values())r.pin=false;this.prewarm.ready=false;}
 snapshot(){const mean=key=>this.timings.length?this.timings.reduce((n,t)=>n+t[key],0)/this.timings.length:0,sorted=this.timings.map(t=>t.requestToDecodedMs).sort((a,b)=>a-b);return {decoded:[...this.tiles.values()].filter(r=>r.image).length,queued:this.queue.length,queuedVisible:this.queue.filter(r=>r.priority>=3).length,queuePeak:this.queuePeak,oldestQueuedMs:this.queue.length?performance.now()-Math.min(...this.queue.map(r=>r.queuedAt)):0,active:this.active,backgroundActive:this.backgroundActive,hits:this.hits,received:this.received,failures:this.failures,cancelled:this.cancelled,cancelledActive:this.cancelledActive,cancelledQueued:this.cancelledQueued,promoted:this.promoted,timing:{scope:'last-64-successful-loads; includes network and image decode, excludes GPU upload',samples:this.timings.length,queueMeanMs:mean('queueMs'),requestToDecodedMeanMs:mean('requestToDecodedMs'),requestToDecodedP95Ms:sorted.length?sorted[Math.ceil(sorted.length*.95)-1]:0},prewarm:{...this.prewarm}};}
}
