import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {clamp,mix,smooth,Spring} from './core.js';
import {CARGO_RIG as RIG,dropDuration} from './flight-frame.js';
const V=()=>new T.Vector3(),TAU=Math.PI*2;

export class CargoView {
 constructor(){
  this.renderer=new T.WebGLRenderer({canvas:document.getElementById('cargo'),alpha:true,antialias:true,powerPreference:'high-performance'});this.renderer.setClearColor(0,0);this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.89;
  this.scene=new T.Scene();this.camera=new T.PerspectiveCamera(46,1,.05,3000);this.camera.matrixAutoUpdate=false;

  this.scene.add(new T.HemisphereLight(0xeaf8ff,0x524365,1.05));this.key=new T.DirectionalLight(0xffdeb8,3.3);this.key.position.set(-4,6,8);this.scene.add(this.key);this.rim=new T.DirectionalLight(0xbdf6ee,2);this.rim.position.set(4,-1,-3);this.scene.add(this.rim);
  const pm=new T.PMREMGenerator(this.renderer),room=new RoomEnvironment();this.scene.environment=pm.fromScene(room,.02).texture;room.dispose();pm.dispose();
  this.body=new T.Group();this.canopy=new T.Group();this.lines=new T.Group();this.scene.add(this.body,this.canopy,this.lines);
  // This scene lives in GlobeWorld.frame. Both engines share the exact
  // camera/projection; the load is attached to a real point above the ellipsoid.
  this.scratch={a:V(),b:V(),v:V()};this.roll=new Spring(6.4,.64);this.pitch=new Spring(7,.72);this.yaw=new Spring(5,.82);this.deploySpring=new Spring(8,.60);this.alpha=0;this.ready=true;this.wireframe=false;
  this.makeTextures();this.makeBox();this.mergeBody();this.makeCanopy();this.makeLines();this.hidden();this.resize();this.lastPhase='home';this.stats={visible:false,bodyPixels:0};
 }
 mat(o){return new T.MeshPhysicalMaterial({roughness:.7,envMapIntensity:.35,transparent:true,...o})}
 round(parent,size,pos,mat,r=.045){const m=new T.Mesh(new RoundedBoxGeometry(...size,3,r),mat);m.position.set(...pos);parent.add(m);return m}
 texture(draw,size=512,color=true){const c=document.createElement('canvas');c.width=c.height=size;draw(c.getContext('2d'),size);const t=new T.CanvasTexture(c);if(color)t.colorSpace=T.SRGBColorSpace;t.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());return t}
 makeTextures(){
  this.woodTex=this.texture((c,n)=>{const grad=c.createLinearGradient(0,0,n,n);grad.addColorStop(0,'#d6a66c');grad.addColorStop(.5,'#c69255');grad.addColorStop(1,'#d3a266');c.fillStyle=grad;c.fillRect(0,0,n,n);let seed=19013;const r=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296};for(let i=0;i<550;i++){const y=r()*n;c.lineWidth=.3+r()*1.8;c.strokeStyle=`rgba(${i%3?88:240},${i%3?51:197},${i%3?31:134},${.025+r()*.08})`;c.beginPath();c.moveTo(-12,y);c.bezierCurveTo(n*.25,y+Math.sin(y*.033)*9,n*.65,y-7,n+12,y+2);c.stroke();}for(const [x,y]of [[142,186],[371,379]]){for(let k=0;k<7;k++){c.strokeStyle=`rgba(92,56,28,${.06-k*.006})`;c.lineWidth=1;c.beginPath();c.ellipse(x,y,7+k*7,1.7+k*.9,.035,0,TAU);c.stroke()}}});
  this.woodBump=this.texture((c,n)=>{c.fillStyle='#808080';c.fillRect(0,0,n,n);for(let y=0;y<n;y+=3){c.strokeStyle=y%9?'#757575':'#959595';c.lineWidth=.7;c.beginPath();c.moveTo(0,y);c.bezierCurveTo(n*.3,y+2,n*.7,y-1,n,y);c.stroke()}},256,false);
  this.fabric=this.texture((c,n)=>{c.fillStyle='#c9c9c9';c.fillRect(0,0,n,n);c.lineWidth=1;for(let i=0;i<n;i+=4){c.strokeStyle=i%32===0?'#727272':'#b2b2b2';c.beginPath();c.moveTo(i,0);c.lineTo(i,n);c.moveTo(0,i);c.lineTo(n,i);c.stroke();}c.strokeStyle='#e8e8e8';for(let i=1;i<n;i+=4){c.beginPath();c.moveTo(i,0);c.lineTo(i,n);c.stroke()}},256,false);this.fabric.wrapS=this.fabric.wrapT=T.RepeatWrapping;this.fabric.repeat.set(2,2);
  this.labelTex=this.texture((c,n)=>{c.fillStyle='#fff4d6';c.fillRect(0,0,n,n);c.strokeStyle='#e4cea6';c.lineWidth=14;c.strokeRect(5,5,n-10,n-10);c.fillStyle='#44304f';c.font='900 96px Nunito, sans-serif';c.textAlign='center';c.fillText('HeyDrop',n/2,155);c.fillStyle='#ee698f';c.fillRect(86,183,n-172,64);c.fillStyle='#fff4d6';c.font='900 40px sans-serif';c.fillText('AIR MAIL',n/2,230);c.fillStyle='#4a384b';c.font='bold 23px sans-serif';c.fillText('HANDLE WITH LOVE',n/2,288);for(let i=0;i<48;i++)if(i%3!==0)c.fillRect(66+i*8,337,i%2?3:5,53);c.font='bold 35px sans-serif';c.fillText('↑  ↑    013',n/2,455)});
 }
 makeBox(){
  const wood=this.mat({map:this.woodTex,bumpMap:this.woodBump,bumpScale:.018,roughness:.8}),frame=this.mat({color:0xd7ab74,bumpMap:this.woodBump,bumpScale:.008,roughness:.68}),dark=this.mat({color:0x493846,roughness:.78}),cap=this.mat({color:0x776098,roughness:.45,metalness:.14,clearcoat:.18}),strap=this.mat({color:0x34ad9c,bumpMap:this.fabric,bumpScale:.01,roughness:.8,sheen:.35}),metal=this.mat({color:0xeee3cb,metalness:.65,roughness:.32});
  this.round(this.body,[1.66,1.32,1.42],[0,0,0],dark,.075);
  for(let j=0;j<4;j++)for(const z of [-.722,.722])this.round(this.body,[1.63,.298,.045],[0,-.48+j*.321,z],wood,.014);
  for(let j=0;j<4;j++)for(const x of [-.838,.838]){const m=this.round(this.body,[1.39,.298,.045],[x,-.48+j*.321,0],wood,.014);m.rotation.y=Math.PI/2;}
  for(let j=0;j<4;j++)for(const y of [-.697,.697])this.round(this.body,[.394,.07,1.44],[-.615+j*.409,y,0],wood,.018);
  for(const y of [-.76,.76]){this.round(this.body,[1.88,.14,.14],[0,y,.755],frame);this.round(this.body,[1.88,.14,.14],[0,y,-.755],frame);this.round(this.body,[.14,.14,1.55],[-.866,y,0],frame);this.round(this.body,[.14,.14,1.55],[.866,y,0],frame)}
  for(const x of [-.81,.81])for(const z of [-.69,.69])this.round(this.body,[.15,1.45,.15],[x,0,z],frame,.03);
  for(const x of [-.85,.85])for(const y of [-.76,.76])for(const z of [-.745,.745])this.round(this.body,[.255,.23,.24],[x,y,z],cap,.052);
  for(const x of [-.48,.48]){for(const y of [-.79,.79])this.round(this.body,[.14,.045,1.65],[x,y,0],strap,.016);for(const z of [-.785,.785]){this.round(this.body,[.14,1.51,.045],[x,0,z],strap,.015);this.round(this.body,[.23,.23,.065],[x,.15,z*1.04],dark,.036);this.round(this.body,[.18,.165,.044],[x,.15,z*1.087],metal,.035);this.round(this.body,[.10,.098,.05],[x,.15,z*1.119],strap,.01);}}
  // Finish both sides so bank and release never expose a blank face.
  const brace=this.round(this.body,[1.77,.085,.15],[0,-.79,0],frame,.02);brace.rotation.y=.63;
  const labelMat=this.mat({map:this.labelTex,roughness:.9,envMapIntensity:.2});const front=new T.Mesh(new T.PlaneGeometry(.64,.64),labelMat);front.position.set(0,0,.751);this.body.add(front);const bottom=new T.Mesh(new T.PlaneGeometry(.55,.55),labelMat);bottom.position.set(.02,-.841,-.1);bottom.rotation.x=Math.PI/2;this.body.add(bottom);const lid=new T.Mesh(new T.PlaneGeometry(.58,.58),labelMat);lid.position.set(0,.837,0);lid.rotation.x=-Math.PI/2;this.body.add(lid);
  const boltGeo=new T.SphereGeometry(.031,8,6),bolts=new T.InstancedMesh(boltGeo,metal,32);let k=0;const o=new T.Object3D();for(const x of [-.84,.84])for(const y of [-.76,.76])for(const z of [-.873,.873]){o.position.set(x,y,z);o.scale.set(1,1,.42);o.updateMatrix();bolts.setMatrixAt(k++,o.matrix)}for(const x of [-.968,.968])for(const y of [-.76,.76])for(const z of [-.745,.745]){o.position.set(x,y,z);o.scale.set(.42,1,1);o.updateMatrix();bolts.setMatrixAt(k++,o.matrix)}bolts.count=k;this.body.add(bolts);
  for(const x of [-.93,.93])this.round(this.body,[.04,.13,.39],[x,.12,0],dark,.035);
  for(const x of [-.49,.49])for(const z of [-.52,.52]){const ring=new T.Mesh(new T.TorusGeometry(.057,.016,8,20),metal);ring.position.set(x,.9,z);ring.rotation.x=Math.PI/2;this.body.add(ring)}
 }
 mergeBody(){this.body.updateMatrixWorld(true);const batches=new Map();for(const m of [...this.body.children])if(m.isMesh&&!m.isInstancedMesh){const list=batches.get(m.material)||[];let g=m.geometry.clone().applyMatrix4(m.matrix);if(g.index){const indexed=g;g=g.toNonIndexed();indexed.dispose();}list.push(g);batches.set(m.material,list);this.body.remove(m);m.geometry.dispose();}for(const [mat,geos]of batches){const g=mergeGeometries(geos,false);if(!g)continue;const m=new T.Mesh(g,mat);m.frustumCulled=false;this.body.add(m);geos.forEach(g=>g.dispose());}}
 canopyPoint(gore,u,v){const theta=(gore+u)/12*TAU,r=(.09+v*.91)*RIG.radius;const billow=Math.sin(u*Math.PI)*Math.sin(v*Math.PI)*.052;const y=RIG.crown-1.02*Math.pow(v,1.75)+billow-.045*Math.cos(u*TAU)*Math.pow(v,5);return new T.Vector3(Math.cos(theta)*r,y,Math.sin(theta)*r);}
 makeCanopy(){
  this.panels=[];this.seams=[];const colors=[0x65e0c2,0x9cebd6,0xffe69a,0xffadb0,0xfff7df,0xc4b8ff,0x65e0c2,0x9cebd6,0xffe69a,0xffadb0,0xfff7df,0xc4b8ff];
  for(let k=0;k<12;k++){const verts=[],uv=[],idx=[],uN=10,vN=22;for(let i=0;i<=uN;i++)for(let j=0;j<=vN;j++){const q=this.canopyPoint(k,i/uN,j/vN);verts.push(...q.toArray());uv.push(i/uN,j/vN)}for(let i=0;i<uN;i++)for(let j=0;j<vN;j++){const a=i*(vN+1)+j,b=a+vN+1;idx.push(a,b,a+1,b,b+1,a+1)}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();const material=this.mat({color:colors[k],side:T.DoubleSide,roughness:.78,bumpMap:this.fabric,bumpScale:.009,sheen:.7,sheenRoughness:.75,sheenColor:0xffecdf,envMapIntensity:.25});const mesh=new T.Mesh(g,material);mesh.frustumCulled=false;this.canopy.add(mesh);this.panels.push({mesh,rest:new Float32Array(verts),k});
   const seamGeo=new T.BufferGeometry().setFromPoints(Array.from({length:28},(_,i)=>this.canopyPoint(k,0,i/27)));const seam=new T.Line(seamGeo,new T.LineBasicMaterial({color:0xfff0d2,transparent:true,opacity:.60}));this.canopy.add(seam);this.seams.push(seam);
  }
  const vent=new T.Mesh(new T.TorusGeometry(.198,.023,8,64),this.mat({color:0xeacbab,roughness:.8}));vent.rotation.x=Math.PI/2;vent.position.y=RIG.crown;this.canopy.add(vent);
  const skirtPts=[];for(let i=0;i<=192;i++)skirtPts.push(this.canopyPoint(Math.floor(i/16)%12,(i%16)/16,1));const skirt=new T.Line(new T.BufferGeometry().setFromPoints(skirtPts),new T.LineBasicMaterial({color:0xffefd5,transparent:true,opacity:.75}));this.canopy.add(skirt);this.seams.push(skirt);
 }
 makeLines(){this.cables=[];for(let i=0;i<12;i++){const a=i/12*TAU;const g=new T.BufferGeometry().setFromPoints(Array.from({length:12},V));const line=new T.Line(g,new T.LineBasicMaterial({color:0xfff3d9,transparent:true,opacity:.88}));line.frustumCulled=false;this.lines.add(line);this.cables.push({angle:a,line});}}
 hidden(){this.visible=false;this.body.visible=this.canopy.visible=this.lines.visible=false;}
 reset(){this.hidden();this.alpha=0;for(const q of [this.roll,this.pitch,this.yaw,this.deploySpring])q.reset();this.lastPhase='home';this.releaseHeight=null;this.body.scale.set(1,1,1);this.canopy.scale.set(1,1,1);}
 load(){return Promise.resolve(this)}
 syncCamera(){
  const frame=this.world?.frame;if(!frame?.ready)return false;
  const p=frame.pose,{a,b,v}=this.scratch;
  a.set(p.right.x,p.right.y,p.right.z);b.set(p.up.x,p.up.y,p.up.z);v.set(-p.direction.x,-p.direction.y,-p.direction.z);
  this.camera.matrixWorld.makeBasis(a,b,v);this.camera.matrixWorld.setPosition(p.position.x,p.position.y,p.position.z);
  this.camera.matrixWorld.decompose(this.camera.position,this.camera.quaternion,this.camera.scale);
  this.camera.matrix.copy(this.camera.matrixWorld);this.camera.matrixWorldInverse.copy(this.camera.matrixWorld).invert();
  this.camera.projectionMatrix.fromArray(frame.projection);this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();this.camera.fov=frame.fovy*180/Math.PI;
  return true;
 }
 update(s,dt,config){
  if(!this.syncCamera()){this.hidden();return;}
  const d=clamp(dt,0,1/30),land=s.phase==='land',flying=['freefall','opening','canopy'].includes(s.phase);const enter=flying?1-smooth(1700,2600,s.h):land?1:0;this.alpha=mix(this.alpha,enter,1-Math.exp(-d*8));if(!flying&&!land){this.hidden();this.lastPhase=s.phase;return;}
  const wind=config.motion?s.turb:0,input=clamp(s.inputX||0,-1,1),ch=clamp(s.chute),open=smooth(0,.9,ch);
  if(s.phase==='opening'&&this.lastPhase!=='opening')this.deploySpring.velocity=2.2;
  // The suspended load lags steering; opening gives one damped upward tug.
  const recoil=this.deploySpring.step(0,d),roll=this.roll.step(-input*mix(.16,.27,open)+wind*Math.sin(s.clock*2.3)*.055,d),pitch=this.pitch.step((s.inputY||0)*.13+wind*Math.cos(s.clock*1.7)*.035,d),yaw=this.yaw.step(-input*.10+wind*Math.sin(s.clock*.9)*.025,d);
  const release=land?s.landTime:0,duration=dropDuration(s),t=clamp(release/duration),contactTime=s.contact?Math.max(0,s.contactTime??release-duration):0;
  const alpha=this.alpha*(s.contact?1-smooth(.18,.36,contactTime):1);this.visible=alpha>.003;this.body.visible=this.visible;
  if(land&&this.lastPhase!=='land')this.releaseHeight=s.dropStart+RIG.halfHeight;
  const bounce=s.contact?Math.sin(contactTime*23)*Math.exp(-contactTime*16)*.08:0;
  this.body.position.set(land?0:roll*open*.45,Math.max(0,s.h)+RIG.halfHeight+bounce,land?0:pitch*open*.45);
  if(!land)this.body.position.y+=Math.sin(s.clock*2)*wind*.025+recoil*.65;
  this.body.rotation.set(.04+pitch+(land?.14*Math.sin(t*Math.PI):0),-.17+yaw+(land?t*.35:0),roll+(land?.10*Math.sin(t*Math.PI):0));this.body.scale.set(1,1,1);this.body.updateMatrixWorld(true);
  const canAlpha=alpha*smooth(.03,.19,ch)*(land?1-smooth(.08,.60,release):1);this.canopy.visible=this.lines.visible=canAlpha>.003;
  // Forward flight places the canopy modestly ahead of the suspended mass.
  // The offset is in metres (a ~17-degree suspension lean), never in pixels.
  this.canopy.position.set(1.15*open,(land?(this.releaseHeight??s.dropStart+RIG.halfHeight)+release*3:s.h+RIG.halfHeight),-.50*open);
  this.canopy.rotation.set(pitch*.2,-.17+yaw*.5,roll*.34+Math.sin(s.clock*1.5)*wind*.02);this.canopy.scale.set(mix(.1,1,open),mix(.03,1,open)+Math.max(0,recoil)*.12,mix(.1,1,open));this.canopy.updateMatrixWorld(true);
  if(this.canopy.visible)for(const panel of this.panels){const a=panel.mesh.geometry.attributes.position,r=panel.rest;for(let i=0;i<a.count;i++){const k=i*3,edge=smooth(1.0,2.1,Math.hypot(r[k],r[k+2]));a.setXYZ(i,r[k],r[k+1]+Math.sin(s.clock*7.2+panel.k*.9+r[k]*2)*.026*wind*edge,r[k+2]);}a.needsUpdate=true;}
  if(this.lines.visible)for(const q of this.cables){
   const signX=Math.cos(q.angle)>=0?1:-1,signZ=Math.sin(q.angle)>=0?1:-1,{a,b,v}=this.scratch;
   a.set(signX*.49,.91,signZ*.52).applyMatrix4(this.body.matrixWorld);
   b.set(Math.cos(q.angle)*RIG.radius,RIG.skirt,Math.sin(q.angle)*RIG.radius).applyMatrix4(this.canopy.matrixWorld);
   const attr=q.line.geometry.attributes.position,detach=land?smooth(.035,.14,release):0;
   for(let i=0;i<attr.count;i++){
    const f=i/(attr.count-1),sag=Math.sin(f*Math.PI);v.copy(a).lerp(b,f);
    if(detach){v.x=mix(v.x,b.x+signX*.10,detach);v.y=mix(v.y,b.y-2.2*(1-f),detach);v.z=mix(v.z,b.z+signZ*.10,detach);}
    v.y-=sag*(1-open)*.4;v.x+=sag*Math.sin(s.clock*5+q.angle)*wind*.012;attr.setXYZ(i,v.x,v.y,v.z);
   }
   attr.needsUpdate=true;q.line.material.opacity=canAlpha*.83;
  }
  const opacity=(group,a)=>group.traverse(o=>{if(o.isMesh){o.material.opacity=a;o.material.wireframe=this.wireframe;}if(o.isLine)o.material.opacity=a*.7});opacity(this.body,alpha);opacity(this.canopy,canAlpha);
  this.key.color.set(config.time==='night'?0x9bbfec:config.time==='sunset'?0xffb77b:0xffe1ba);this.key.intensity=config.time==='night'?1.5:2.6;this.rim.color.set(config.time==='sunset'?0xcbb4ff:0xbff2e9);this.lastPhase=s.phase;
  const center=this.body.position.clone().project(this.camera),depth=this.body.position.distanceTo(this.camera.position),focal=this.h/(2*Math.tan(this.world.frame.fovy*.5));
  this.stats={visible:this.visible,canopyVisible:this.canopy.visible,canopyInflation:open,detached:land,phase:s.phase,releaseDepth:depth,baseDepth:this.world.chase?.y||depth,bodyPixels:2.05*focal/depth,alpha,roll,pitch,physicalScale:this.body.scale.toArray(),screen:{x:(center.x*.5+.5)*this.w,y:(.5-center.y*.5)*this.h},localPosition:this.body.position.toArray(),cableCount:this.cables.length,canopyPanels:this.panels.length,view:'shared-world',suspensionHeight:RIG.skirt-.91,cameraAbove:this.camera.position.y>this.body.position.y,dropDuration:duration,dropProgress:t};
 }
 project(side){if(!this.visible)return null;const p=new T.Vector3(side==='L'?-.83:.83,-.6,.4).applyMatrix4(this.body.matrixWorld).project(this.camera);return {x:(p.x*.5+.5)*this.w,y:(.5-p.y*.5)*this.h}}
 render(){this.renderer.render(this.scene,this.camera)}
 resize(){this.w=innerWidth;this.h=innerHeight;this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,this.w<650?1.3:1.5));this.renderer.setSize(this.w,this.h,false);this.camera.aspect=this.w/this.h;}
}
