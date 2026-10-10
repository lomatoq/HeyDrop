const assert=require('node:assert/strict'),path=require('node:path'),Module=require('node:module'),esbuild=require('esbuild');
function load(file){const out=esbuild.buildSync({entryPoints:[path.join(__dirname,'..',file)],bundle:true,write:false,platform:'node',format:'cjs'}),m=new Module(file,module);m._compile(out.outputFiles[0].text,file);return m.exports;}
global.window={Cesium:{Request:class{cancel(){this.cancelled=true;}},Cartographic:class{constructor(longitude,latitude){Object.assign(this,{longitude,latitude});}}}};
const {ImageryCache}=load('src/tile-cache.js'),{viewPrefetchJobs}=load('src/map-transitions.js');
const image=()=>({width:256,height:256,close(){throw Error('Borrowed image must not be closed');}}),flush=()=>new Promise(setImmediate);
const scheme={getNumberOfXTilesAtLevel:z=>2**z,getNumberOfYTilesAtLevel:z=>2**z,positionToTileXY:(p,z)=>({x:Math.floor((p.longitude+Math.PI)/(2*Math.PI)*2**z),y:Math.floor((1-Math.asinh(Math.tan(p.latitude))/Math.PI)/2*2**z)})};
function controlled(){const pending=[];return {pending,tilingScheme:scheme,requestImage:(x,y,z,request)=>new Promise((resolve,reject)=>pending.push({x,y,z,request,resolve,reject}))};}
(async()=>{
 // Cancellation must settle even if a provider never responds to Request.cancel.
 const source=controlled(),cache=new ImageryCache(source),obsolete=cache.request(1,1,3,0,'motion');
 const rejected=assert.rejects(obsolete,{name:'AbortError'});cache.cancelBackground('motion');await rejected;await flush();
 assert.equal(source.pending[0].request.cancelled,true);assert.equal(cache.active,0);assert.equal(cache.backgroundActive,0);assert.equal(cache.failures,0);
 const replacement=cache.request(1,1,3,6),record=cache.tiles.get('3/1/1');source.pending[0].resolve(image());await flush();
 assert.equal(cache.tiles.get('3/1/1'),record);assert.equal(cache.received,0);source.pending[1].resolve(image());await replacement;await flush();assert.equal(cache.received,1);

 // Visible promotion protects an in-flight speculative request and its promise.
 const promotedSource=controlled(),promoted=new ImageryCache(promotedSource),a=promoted.request(2,2,4,0,'motion'),b=promoted.request(2,2,4,6);
 assert.equal(a,b);assert.equal(promoted.backgroundActive,0);promoted.cancelBackground();assert(!promotedSource.pending[0].request.cancelled);
 promotedSource.pending[0].resolve(image());await a;assert.equal(promoted.snapshot().promoted,1);

 // A motion replan cannot cancel a request also used by the authored tour.
 const sharedSource=controlled(),shared=new ImageryCache(sharedSource),tour=shared.request(3,3,4,1,'tour');shared.request(3,3,4,0,'motion');
 shared.replacePrefetch('motion',[[4,3,4]]);assert(!sharedSource.pending[0].request.cancelled);assert(shared.tiles.has('4/3/3'));
 const second=shared.tiles.get('4/4/3').promise;sharedSource.pending.forEach(r=>r.resolve(image()));await Promise.all([tour,second]);
 shared.cancelBackground();assert.equal(shared.tiles.size,2);assert.equal(shared.received,2);

 // Backpressure reserves capacity for visible requests and bounds queued work.
 const busySource=controlled(),busy=new ImageryCache(busySource),jobs=[];
 for(let i=0;i<130;i++)jobs.push(busy.request(i,0,8,0,'motion').catch(()=>null));
 assert.equal(busy.active,2);assert.equal(busy.queue.length,96);
 const visible=busy.request(200,0,8,6);assert.equal(busy.active,3);busy.cancelBackground('motion');await flush();
 assert.equal(busy.active,1);assert.equal(busy.queue.length,0);assert.equal(busy.cancelledActive,2);assert.equal(busy.cancelledQueued,96);
 busySource.pending.find(r=>r.x===200).resolve(image());await Promise.all([...jobs,visible]);

 const capSource=controlled(),cap=new ImageryCache(capSource),capJobs=Array.from({length:12},(_,i)=>cap.request(i,1,8,6));
 assert.equal(cap.active,8);assert.equal(cap.queue.length,4);capSource.pending.slice().forEach(r=>r.resolve(image()));await flush();
 assert.equal(cap.active,4);capSource.pending.slice(8).forEach(r=>r.resolve(image()));await Promise.all(capJobs);assert.equal(cap.active,0);

 // Tour release invalidates callbacks before they can repin cancelled work.
 const warmSource=controlled(),warm=new ImageryCache(warmSource),warming=warm.warmTour({lat:40,lon:15,seed:1},1);
 warm.warmDecoys({decoys:[{aim:[1,0,0]},{aim:[0,1,0]}]});
 for(const lon of [0,Math.PI/2]){const t=scheme.positionToTileXY({longitude:lon,latitude:0},17);assert(warm.tiles.has(`17/${t.x}/${t.y}`));}
 assert(warm.queue.length<=96);assert(warm.queue.filter(r=>r.owners.has('tour')).every(r=>r.priority===1));
 warm.releaseTour();await warming;await flush();assert.equal(warm.active,0);assert([...warm.tiles.values()].every(r=>!r.pin));assert.equal(warm.prewarm.ready,false);

 // Forward prediction covers a view footprint, wraps the dateline and cannot
 // exceed its admission budget or request outside valid Mercator tile rows.
 const map={tilingScheme:scheme,maximumLevel:18},view={lon:Math.PI-.0001,lat:.7,alt:900,fovy:1,aspect:1.8,heading:0,rawLOD:16.4};
 const still=viewPrefetchJobs(map,view),moving=viewPrefetchJobs(map,view,{lon:.03,lat:.002,alt:-1000});
 assert(still.length>1);assert(moving.length<=24);assert(moving.some(t=>t[2]===18));
 for(const [x,y,z]of moving){assert(x>=0&&x<2**z&&y>=0&&y<2**z);assert(z<=18);}
 assert.notDeepEqual(still,moving);assert.deepEqual(viewPrefetchJobs(map,{...view,alt:NaN}),[]);
 const portrait=viewPrefetchJobs(map,{...view,lon:0,aspect:.5}),landscape=viewPrefetchJobs(map,{...view,lon:0,aspect:2});assert.notDeepEqual(portrait,landscape);
 const timings=cache.snapshot().timing;assert.equal(timings.samples,1);assert(timings.queueMeanMs>=0&&timings.requestToDecodedMeanMs>=0);
 console.log(JSON.stringify({pass:true,checks:['active cancellation settles non-cooperative provider','late result cannot overwrite replacement','visible promotion protects shared request','tour and motion ownership','2 background / 8 total capacity and 96 queued budget','decoy sharp centres admitted before rings','released tour cannot pin','bounded forward footprint, descent LOD, dateline and aspect','bounded request-to-decoded and queue timing'],predictionTiles:moving.length}));
})().catch(e=>{console.error(e);process.exitCode=1});
