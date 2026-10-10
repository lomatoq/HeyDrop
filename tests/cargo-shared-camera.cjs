const {chromium}=require('playwright-core');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});
 await page.goto('http://127.0.0.1:8797/?qa#s=7241&c=barcelona');await page.waitForFunction(()=>window.__qa?.snapshot().ready,null,{timeout:60000});
 const rows=[];
 for(const [width,height] of [[1440,900],[390,844],[320,568],[844,390]]){
  await page.setViewportSize({width,height});
  const row=await page.evaluate(()=>{
   app.resize();app.debugFreezeSimulation=true;app.sim.config.motion=false;
   __qa.setState({phase:'canopy',lat:41.39,lon:2.17,h:280,chute:1,t:3,airSpeed:28,contact:false,landTime:0,inputX:0,inputY:0,turb:0});
   const c=app.cargo,w=app.world;c.reset();for(let i=0;i<90;i++){w.update(app.sim.s,app.sim.config,1/60);c.update(app.sim.s,1/60,app.sim.config)}c.scene.updateMatrixWorld(true);
   const bounds=group=>{const b={left:Infinity,right:-Infinity,top:Infinity,bottom:-Infinity},v=c.camera.position.clone();group.traverse(o=>{if(!o.geometry)return;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld).project(c.camera);const x=(v.x*.5+.5)*innerWidth,y=(.5-v.y*.5)*innerHeight;b.left=Math.min(b.left,x);b.right=Math.max(b.right,x);b.top=Math.min(b.top,y);b.bottom=Math.max(b.bottom,y)}});return b};
   const projection=[];for(const p of [[0,0,0],[10,0,-12],[-20,0,15],[0,280,0],[1.15,286,-.5]]){const cesium=w.frame.projectLocal(w.viewer.scene,...p),three=c.camera.position.clone().set(...p).project(c.camera),screen={x:(three.x*.5+.5)*innerWidth,y:(.5-three.y*.5)*innerHeight};projection.push({point:p,error:Math.hypot(cesium.x-screen.x,cesium.y-screen.y)});}
   const calm={body:bounds(c.body),canopy:bounds(c.canopy)},steering=[];
   app.sim.config.motion=true;for(const input of [-1,1]){app.sim.s.inputX=input;app.sim.s.inputY=input*.7;app.sim.s.turb=.8;for(let i=0;i<120;i++)c.update(app.sim.s,1/60,app.sim.config);c.scene.updateMatrixWorld(true);steering.push(bounds(c.canopy));}
   app.sim.s.inputX=app.sim.s.inputY=app.sim.s.turb=0;for(let i=0;i<120;i++)c.update(app.sim.s,1/60,app.sim.config);c.render();
   const aim=w.frame.projectLocal(w.viewer.scene,0,0,0);
   return {width:innerWidth,height:innerHeight,...calm,steering,projection,aim,stats:c.stats,camera:c.camera.position.toArray(),pose:w.frame.pose,projectionMatrix:w.frame.projection};
  });
  await page.waitForTimeout(2000);await page.screenshot({path:`tests/cargo/v16-${width}x${height}.png`});console.log(JSON.stringify(row));
  assert.equal(row.stats.view,'shared-world');assert.ok(Math.abs(row.stats.localPosition[1]-280.84)<.01);assert.ok(Math.hypot(row.aim.x-width/2,row.aim.y-height/2)<1);
  assert.ok(Math.max(...row.projection.map(p=>p.error))<.1,'Cesium/Three projection mismatch');
  for(const b of [row.canopy,...row.steering]){assert.ok(b.left>=0&&b.right<=width,'canopy width');assert.ok(b.top>=0&&b.bottom<height*.85,'canopy height');assert.ok(b.left>width/2+12||b.top>height/2+12||b.bottom<height/2-12,'aim occluded');}
  rows.push(row);
 }
 const landing=await page.evaluate(()=>{
  const s=app.sim.s,w=app.world,c=app.cargo;__qa.setState({phase:'canopy',h:280,chute:1,contact:false,landTime:0});for(let i=0;i<10;i++){w.update(s,app.sim.config,1/60);c.update(s,1/60,app.sim.config)}
  const duration=Math.sqrt(2*280/80);Object.assign(s,{phase:'land',dropStart:280,dropDuration:duration,landTime:0});const rows=[];
  for(const t of [0,.25,.5,.75,1]){Object.assign(s,{h:280*(1-t*t),landTime:t*duration,contact:t===1,contactTime:0});w.update(s,app.sim.config,1/60);c.update(s,1/60,app.sim.config);const pos=w.viewer.camera.positionWC;rows.push({t,height:c.body.position.y,camera:[pos.x,pos.y,pos.z],screen:c.stats.screen});}return rows;
 });
 for(const row of landing){assert.ok(Math.abs(row.height-(280*(1-row.t*row.t)+.84))<.001);assert.ok(Math.hypot(...row.camera.map((v,i)=>v-landing[0].camera[i]))<.001,'release camera moved');}
 assert.deepEqual(errors,[]);fs.writeFileSync('tests/cargo/v16-camera-report.json',JSON.stringify({rows,landing},null,2));console.log('PASS shared camera, bounds, steering and ballistic release');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
