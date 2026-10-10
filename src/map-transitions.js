import {clamp,damp} from './core.js';
import {ImageryCache,MipProvider} from './imagery-cache.js';
import {TextureDissolve} from './texture-dissolve.js';
const C=window.Cesium;
const EARTH=6371008.8,wrap=r=>((r+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;
// Project only a few points of the present and predicted ground footprint. This
// is a budgeted hint, never a replacement for Cesium's visible tile selection.
export function viewPrefetchJobs(source,view,velocity={lon:0,lat:0,alt:0}){
 const {lon,lat,alt,fovy,aspect,heading=0,rawLOD}=view,scheme=source.tilingScheme,jobs=[],seen=new Set();
 if(![lon,lat,alt,fovy,aspect,rawLOD].every(Number.isFinite)||alt<=0)return jobs;
 const ahead=.45,cosLat=Math.max(.09,Math.cos(lat)),halfY=Math.min(2000000,alt*Math.tan(fovy*.5)),halfX=Math.min(2000000,halfY*aspect);
 const east=velocity.lon*cosLat*ahead,north=velocity.lat*ahead,travel=Math.hypot(east,north),limit=Math.min(.08,Math.max(halfX,halfY)/EARTH*.8),scale=travel>limit?limit/travel:1;
 const future={lon:wrap(lon+east*scale/cosLat),lat:clamp(lat+north*scale,-1.4844,1.4844),alt:clamp(alt+velocity.alt*ahead,alt*.65,alt*1.15)};
 const maximum=Math.min(19,source.maximumLevel??19),currentZ=clamp(Math.ceil(rawLOD),0,maximum),futureZ=clamp(Math.ceil(rawLOD+Math.log2(alt/future.alt)),0,maximum),sin=Math.sin(heading),cos=Math.cos(heading);
 const add=(center,z,x,y)=>{const e=x*cos+y*sin,n=-x*sin+y*cos,point=new C.Cartographic(wrap(center.lon+e/(EARTH*Math.max(.09,Math.cos(center.lat)))),clamp(center.lat+n/EARTH,-1.4844,1.4844)),tile=scheme.positionToTileXY(point,z);if(!tile)return;const nx=scheme.getNumberOfXTilesAtLevel(z),ny=scheme.getNumberOfYTilesAtLevel(z),tx=(tile.x%nx+nx)%nx,key=`${z}/${tx}/${tile.y}`;if(tile.y<0||tile.y>=ny||seen.has(key)||jobs.length>=24)return;seen.add(key);jobs.push([tx,tile.y,z]);};
 add(future,futureZ,0,0);add(view,currentZ,0,0);
 for(const center of [future,view]){const z=center===future?futureZ:currentZ,f=center.alt/alt;for(const [x,y]of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]])add(center,z,x*halfX*f*.85,y*halfY*f*.85);}
 return jobs;
}
// Two persistent mip samplers. Parent + child share decoded source images.
export class MapDissolve {
 constructor(viewer,source){this.viewer=viewer;this.source=source;this.cache=new ImageryCache(source);this.time=0;this.rawLOD=2;this.phase='home';this.softness=0;this.received=0;this.lastImageAt=0;this.fadeCount=0;this.events=[];this.night=null;this.desired=2;this.base={cap:22,layer:new C.ImageryLayer(new MipProvider(source,this.cache,true),{alpha:1,maximumAnisotropy:4})};this.front={cap:22,layer:new C.ImageryLayer(new MipProvider(source,this.cache,false),{alpha:.99995,maximumAnisotropy:4})};viewer.imageryLayers.add(this.base.layer);viewer.imageryLayers.add(this.front.layer);this.next=null;this.textureFade=new TextureDissolve(this);this.prepareTask=null;}
 layers(){return [this.base.layer,this.front.layer]}
 desiredLevel(alt){return alt>650000?6:alt>65000?10:alt>14000?13:alt>2900?15:alt>700?17:19}
 prepare(round){if(this.preparingSeed===`${round.seed}/${round.city}`&&this.prepareTask&&!this.cache.prewarm.released)return this.prepareTask;this.preparingSeed=`${round.seed}/${round.city}`;this.cache.unpin();this.prepareTask=this.cache.warmTour(round,innerWidth/innerHeight);this.cache.warmDecoys(round);return this.prepareTask;}
 update(alt,dt,phase){
  this.time+=dt;const changed=this.phase!==phase;this.phase=phase;const cam=this.viewer.camera,g=cam.positionCartographic,lat=g?.latitude||0,canvas=this.viewer.scene.canvas,px=Math.min(canvas.height,1200),fovy=cam.frustum.fovy;
  const footprint=Math.max(1,2*alt*Math.tan(fovy*.5)),size=Math.cos(lat)*40075016.6856*px/(256*footprint);this.rawLOD=Math.log2(Math.max(1,size));this.desired=this.desiredLevel(alt);this.received=this.cache.received;
  const predictive=['orbit','entry','freefall','opening','canopy'].includes(phase);
  if(changed){this.cache.cancelBackground('motion');this.previousView=null;this.velocity={lon:0,lat:0,alt:0};}
  if(dt>0&&predictive&&g){
   const view={lon:g.longitude,lat,alt,fovy,aspect:canvas.width/Math.max(1,canvas.height),heading:cam.heading||0,rawLOD:this.rawLOD},previous=this.previousView;
   this.velocity??={lon:0,lat:0,alt:0};
   if(previous){const dx=wrap(view.lon-previous.lon),dy=view.lat-previous.lat;
    // Teleports and tab-resume gaps are not velocity. Longitude wraps at ±180°.
    if(dt>.15||Math.hypot(dx*Math.cos(lat),dy)>.15){this.velocity={lon:0,lat:0,alt:0};this.cache.cancelBackground('motion');}
    else{this.velocity.lon=damp(this.velocity.lon,dx/dt,8,dt);this.velocity.lat=damp(this.velocity.lat,dy/dt,8,dt);this.velocity.alt=damp(this.velocity.alt,(alt-previous.alt)/dt,8,dt);}
   }
   this.previousView=view;
   if(this.time-(this.lastAhead||-1)>.4){this.lastAhead=this.time;const jobs=this.cache.queue.filter(r=>r.priority>=3).length<24?viewPrefetchJobs(this.source,view,this.velocity):[];this.cache.replacePrefetch('motion',jobs);this.prediction={tiles:jobs.length,horizonSeconds:.45,velocity:{...this.velocity}};}
  }
  this.fadeCount=this.textureFade.blendedFrames;this.softness=damp(this.softness,0,8,dt);
 }
 get settled(){return this.viewer.scene.globe.tilesLoaded;}
 get tourReady(){return this.cache.prewarm.ready;}
 snapshot(){return {mode:'continuous-parent-child',cap:22,desired:this.desired,rawLOD:this.rawLOD,next:null,received:this.received,dissolves:this.fadeCount,softness:0,settled:this.settled,layers:2,prediction:this.prediction||null,cache:this.cache.snapshot(),textureFade:this.textureFade.snapshot()}}
}
