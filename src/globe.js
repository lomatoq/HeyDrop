import * as G from './geo-math.js';
import {clamp,mix,smooth,damp,TAU,WEATHER} from './core.js';
import {atmosphereShader} from './atmosphere.js';
import {MapDissolve} from './map-transitions.js';
import {FlightFrame,chaseOffset,dropDuration} from './flight-frame.js';
const C=window.Cesium;
const ESRI='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer';
const NIGHT='https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_CityLights_2012/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg';
export class GlobeWorld{
 constructor(){C.Ion.defaultAccessToken='';this.viewer=new C.Viewer('globe',{baseLayer:false,baseLayerPicker:false,animation:false,timeline:false,geocoder:false,homeButton:false,navigationHelpButton:false,sceneModePicker:false,fullscreenButton:false,infoBox:false,selectionIndicator:false,shouldAnimate:false,scene3DOnly:true,useDefaultRenderLoop:false,contextOptions:{webgl:{alpha:false,antialias:false,powerPreference:'high-performance',preserveDrawingBuffer:true}}});
 const v=this.viewer;v.scene.screenSpaceCameraController.enableInputs=false;v.scene.globe.baseColor=C.Color.fromCssColorString('#173755');v.scene.globe.maximumScreenSpaceError=2;v.scene.globe.tileCacheSize=220;v.scene.globe.preloadAncestors=true;v.scene.globe.preloadSiblings=false;v.scene.globe.loadingDescendantLimit=16;v.scene.globe.showGroundAtmosphere=true;v.scene.globe.enableLighting=false;v.scene.globe.depthTestAgainstTerrain=false;v.scene.fog.enabled=false;v.scene.highDynamicRange=false;v.scene.postProcessStages.fxaa.enabled=true;v.scene.backgroundColor=C.Color.fromCssColorString('#060b1b');v.scene.moon.show=false;v.scene.sun.show=false;v.scene.skyAtmosphere.show=true;v.scene.skyAtmosphere.saturationShift=-.2;
 this.frame=new FlightFrame();this.releaseCamera=null;this.lastPhase=null;this.pending=0;this.failures=0;this.nightLoaded=false;this.ready=false;this.cameraAltitude=11000000;this.heading=0;this.pitch=-Math.PI/2;this.camBank=0;this.cameraX=0;this.cameraZ=0;this.markerShown=false;this.cover=0;this.focusGeo=null;this.resultRelocated=false;v.scene.globe.tileLoadProgressEvent.addEventListener(n=>this.pending=n);v.scene.renderError.addEventListener((s,e)=>{console.error('GLOBE',e);this.fatal=e.message});this.createPost();
 }
 async init(){// Resolve Cesium's decode probe before tile requests can fail (Resource.fetchImage defers its blob handler until this probe completes).
 await C.Resource.supportsImageBitmapOptions?.();const source=await C.ArcGisMapServerImageryProvider.fromUrl(ESRI,{enablePickFeatures:false});source.errorEvent.addEventListener(e=>{this.failures++;e.retry=e.timesRetried<1});this.dissolve=new MapDissolve(this.viewer,source);this.day=this.dissolve.base.layer;
 const np=new C.UrlTemplateImageryProvider({url:NIGHT,tilingScheme:new C.WebMercatorTilingScheme(),minimumLevel:0,maximumLevel:8,tileWidth:256,tileHeight:256,credit:new C.Credit('NASA/NOAA · VIIRS night lights 2012 · ~500 m',true),enablePickFeatures:false});np.errorEvent.addEventListener(e=>{this.failures++;e.retry=e.timesRetried<1});const orig=np.requestImage.bind(np);np.requestImage=(...args)=>{const job=orig(...args);if(job?.then)return job.then(im=>{this.nightLoaded=true;return im});return job};this.night=this.viewer.imageryLayers.addImageryProvider(np);this.night.alpha=0;this.night.show=false;this.dissolve.night=this.night;this.ready=true;
 }
 setRound(round){this.round=round;this.releaseCamera=null;this.lastPhase=null;this.cameraX=this.cameraZ=0;this.resultRelocated=false;this.lastRound=round.seed;this.viewer.entities.removeAll();const pos=C.Cartesian3.fromDegrees(round.lon,round.lat,1);this.target=this.viewer.entities.add({position:pos,ellipse:{semiMajorAxis:25,semiMinorAxis:25,height:1,material:C.Color.fromCssColorString('#ffd260').withAlpha(.42),outline:true,outlineColor:C.Color.WHITE},show:false});this.targetPoint=this.viewer.entities.add({position:pos,point:{pixelSize:11,color:C.Color.fromCssColorString('#ff6988'),outlineColor:C.Color.WHITE,outlineWidth:3,disableDepthTestDistance:Number.POSITIVE_INFINITY},show:false});}
 xyToGeo(x,z){return {lon:this.round.lon+x/(111320*Math.cos(this.round.lat*Math.PI/180)),lat:this.round.lat+z/111320}}

 setEnvironment(config,s){if(!this.day)return;const night=config.time==='night',sunset=config.time==='sunset';this.night.show=night;this.night.alpha=night?mix(0,.99995,smooth(20000,180000,this.cameraAltitude)):0;for(const layer of this.dissolve.layers()){layer.brightness=sunset?.85:1;layer.gamma=night?.95:1;layer.hue=sunset?.025:0;layer.saturation=1.03;layer.contrast=1.035}this.viewer.scene.skyAtmosphere.hueShift=sunset?-.1:0;this.viewer.scene.skyAtmosphere.brightnessShift=night?-.38:.08;this.viewer.scene.skyAtmosphere.saturationShift=night?-.4:-.12;
 const u=this.post.uniforms,cam=this.viewer.camera,weather=WEATHER[config.weather]||WEATHER.clear;u.uTime=s.clock;u.uAlt=this.cameraAltitude;
 C.Cartesian3.multiplyByScalar(cam.positionWC,.001,u.uCamera);C.Cartesian3.clone(cam.directionWC,u.uForward);C.Cartesian3.clone(cam.rightWC,u.uRight);C.Cartesian3.clone(cam.upWC,u.uUp);
 u.uAspect=innerWidth/innerHeight;u.uTan=Math.tan(cam.frustum.fovy*.5);u.uNight=night?1:0;u.uWarm=sunset?1:0;u.uCloud=weather.cloud;u.uFog=weather.fog||weather.rain*.20||0;u.uSpeed=clamp(s.flightCue||0);u.uMotion=config.motion?1:0;u.uActive=['entry','freefall','opening','canopy'].includes(s.phase)?1:0;
 }
// Camera methods for global navigation. The active view follows player input only.
 resultView(s){
  const answer=this.round.answer,n=G.slerp(s.aim,answer,.5),up=G.north(n),east=G.norm(G.cross(up,n)),a=G.angle(s.aim,answer),d=G.distance(s.aim,answer),portrait=innerWidth<650;
  const delta=G.mul(G.add(s.aim,G.mul(answer,-1)),G.R),dx=Math.abs(G.dot(delta,east)),dy=Math.abs(G.dot(delta,up)),aspect=innerWidth/innerHeight,tan=Math.tan(60*Math.PI/360);
  const cx=portrait?.50:.35,cy=portrait?.315:.50,width=portrait?.70:.55,height=portrait?.21:.58;
  const curvature=G.R*(1/Math.max(.05,Math.cos(a*.5+Math.min(.045,a*.025)))-1);
  const alt=Math.max(750,dx/(2*tan*aspect*width)*1.25,dy/(2*tan*height)*1.25,curvature);
  return {n,up,alt:Math.min(alt,150000000),cx,cy,global:d>3000000,antipodal:a>2.85};
 }
 transitionCover(s,config={}){if(config.challenge==='shuffle'&&s.phase==='zoom')return 0;if(s.phase==='zoom')return smooth(1.05,1.5,s.t)*(1-smooth(2.35,3.05,s.t));if(s.phase==='land'){const contact=s.landTime-dropDuration(s);return smooth(.19,.34,contact)*(1-smooth(.52,.82,contact));}return 0;}
 pickAt(x,y){const cam=this.viewer.camera,p=cam.pickEllipsoid(new C.Cartesian2(x,y),C.Ellipsoid.WGS84);if(!p)return null;const g=C.Cartographic.fromCartesian(p);return {lat:C.Math.toDegrees(g.latitude),lon:C.Math.toDegrees(g.longitude)};}
 pixelScale(){const x=innerWidth*.5,y=innerHeight*.5,a=this.pickAt(x,y),b=this.pickAt(x+12,y);return a&&b?G.angle(G.unit(a.lat,a.lon),G.unit(b.lat,b.lon))/12:Math.min(.006,this.cameraAltitude/G.R/Math.max(200,innerHeight));}
 projectGeo(lat,lon){return C.SceneTransforms.worldToWindowCoordinates(this.viewer.scene,C.Cartesian3.fromDegrees(lon,lat,3));}
 projectUnit(n){const g=G.coord(n);return this.projectGeo(g.lat,g.lon);}
 update(s,config,dt){
  if(!this.round)return;const cam=this.viewer.camera,duration=dropDuration(s);this.frame.set(s.aim,s.up);let n=s.aim,up=s.up,alt=s.h,cx=.5,cy=.5;const after=['land','result'].includes(s.phase),air=['entry','freefall','opening','canopy'].includes(s.phase);this.cover=this.transitionCover(s,config);
  if(s.phase==='home'){n=this.round.start;up=G.north(n);alt=11000000;}
  if(after){if(s.landTime<duration+.39){alt=s.dropStart;}else{const view=this.resultView(s);n=view.n;up=view.up;alt=view.alt;cx=view.cx;cy=view.cy;if(!this.resultRelocated){this.cameraAltitude=alt;this.resultRelocated=true;}this.resultFrame=view;}}
  else {this.resultRelocated=false;this.releaseCamera=null;}
  const holding=after&&s.landTime<duration+.39;
  if(holding&&!this.releaseCamera&&['freefall','opening','canopy'].includes(this.lastPhase))this.releaseCamera={position:C.Cartesian3.clone(cam.positionWC),direction:C.Cartesian3.clone(cam.directionWC),up:C.Cartesian3.clone(cam.upWC)};
  const geo=G.coord(n);this.focusGeo=geo;this.cameraAim=[...n];this.heading=G.bearing(n,up);this.pitch=-Math.PI/2;this.camBank=0;
  const aspect=innerWidth/innerHeight,space=smooth(180000,2500000,this.cameraAltitude),vf=C.Math.toRadians(after?60:58),minF=C.Math.toRadians(55);let vertical=vf;if(after&&this.resultFrame?.global){const angularRadius=Math.asin(G.R/(G.R+this.cameraAltitude)),available=Math.min(aspect*(innerWidth<650?.72:.52),innerWidth<650?.22:.57)*.82;vertical=2*Math.atan(Math.tan(angularRadius)/available);}
  const flightFov=aspect>=1?2*Math.atan(Math.tan(vertical/2)*aspect):vertical,spaceFov=2*Math.atan(Math.tan(minF/2)*Math.max(aspect,1/aspect));cam.frustum.fov=after?flightFov:mix(flightFov,spaceFov,space);cam.frustum.xOffset=0;cam.frustum.yOffset=0;
  this.chase=chaseOffset(s,innerWidth,innerHeight,cam.frustum.fovy);
  const follow=(air||holding)?this.chase.blend:0,targetAltitude=Math.max(43,alt)+this.chase.y*follow;
  this.cameraAltitude=damp(this.cameraAltitude,targetAltitude,after?24:s.phase==='zoom'?20:13,dt);
  // Near the load the chase camera follows simulation height directly. A lag
  // here would change the cargo-camera distance by hundreds of metres in dives.
  if(follow)this.cameraAltitude=mix(this.cameraAltitude,targetAltitude,follow);
  const position=follow?this.frame.world(this.chase.x*follow,this.cameraAltitude,this.chase.z*follow):C.Cartesian3.fromDegrees(geo.lon,geo.lat,this.cameraAltitude),ground=follow?this.frame.origin:C.Cartesian3.fromDegrees(geo.lon,geo.lat,0);let direction=C.Cartesian3.normalize(C.Cartesian3.subtract(ground,position,new C.Cartesian3()),new C.Cartesian3());

  const t=Math.tan(cam.frustum.fovy*.5),east=G.norm(G.cross(up,n)),dx=(1-2*cx)*t*aspect,dy=(2*cy-1)*t;direction=C.Cartesian3.normalize(C.Cartesian3.add(direction,new C.Cartesian3(east[0]*dx+up[0]*dy,east[1]*dx+up[1]*dy,east[2]*dx+up[2]*dy),new C.Cartesian3()),new C.Cartesian3());
  const cameraUp=new C.Cartesian3(...up);C.Cartesian3.subtract(cameraUp,C.Cartesian3.multiplyByScalar(direction,C.Cartesian3.dot(cameraUp,direction),new C.Cartesian3()),cameraUp);C.Cartesian3.normalize(cameraUp,cameraUp);const pose=holding&&this.releaseCamera?this.releaseCamera:{position,direction,up:cameraUp};
  cam.setView({destination:pose.position,orientation:{direction:pose.direction,up:pose.up}});
  // Cesium's heading/pitch/roll round-trip becomes ambiguous near nadir.
  // Preserve the authored orthonormal vectors in its identity world transform.
  C.Cartesian3.clone(pose.direction,cam.direction);C.Cartesian3.clone(pose.up,cam.up);C.Cartesian3.cross(cam.direction,cam.up,cam.right);C.Cartesian3.normalize(cam.right,cam.right);
  if(holding&&this.releaseCamera)this.cameraAltitude=C.Cartographic.fromCartesian(this.releaseCamera.position).height;
  const before=s.phase==='brief'||(s.phase==='context'&&s.h<150000);this.markerShown=before||(after&&s.contact&&s.landTime>duration+.79);this.target.show=this.targetPoint.show=before;
  this.dissolve.update(this.cameraAltitude,dt,s.phase);this.setEnvironment(config,s);this.viewer.render();this.frame.capture(cam);this.lastPhase=s.phase;
 }

 resize(){this.viewer.resolutionScale=Math.min(window.devicePixelRatio||1,innerWidth<700?1:1.25);this.viewer.resize();this.viewer.scene.globe.maximumScreenSpaceError=innerWidth<700?3.5:2.5;}
 targetDetail(lat=this.round?.lat,lon=this.round?.lon){
  if(!this.dissolve||!this.round)return 0;
  const point=C.Cartographic.fromDegrees(lon,lat);let level=0;
  for(const tile of this.viewer.scene.globe._surface?._tilesToRender||[]){
   if(!C.Rectangle.contains(tile.rectangle,point))continue;
   for(const entry of tile.data?.imagery||[]){const image=entry.readyImagery;if(image?.imageryLayer===this.dissolve.front.layer&&(image.texture||image.textureWebMercator))level=Math.max(level,image.level);}
  }return level;
 }
 levels(){return (this.viewer.scene.globe._surface?._tilesToRender||[]).map(t=>t.level)}
 project(x,z){const g=this.xyToGeo(x,z);return C.SceneTransforms.worldToWindowCoordinates(this.viewer.scene,C.Cartesian3.fromDegrees(g.lon,g.lat,3))}
 createPost(){this.post=this.viewer.scene.postProcessStages.add(new C.PostProcessStage({name:'heydrop-atmosphere-v15',uniforms:{uTime:0,uAlt:11000000,uAspect:1.7,uTan:.5,uNight:0,uWarm:0,uCloud:.07,uFog:0,uSpeed:0,uMotion:1,uActive:0,uCamera:new C.Cartesian3(),uForward:new C.Cartesian3(),uRight:new C.Cartesian3(),uUp:new C.Cartesian3()},fragmentShader:atmosphereShader}));}
}
