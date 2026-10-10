const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try {
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE',e.message)});
 await page.goto('http://127.0.0.1:8797/?qa#s=7241&c=barcelona');
 await page.waitForFunction(()=>window.__qa?.snapshot().ready,null,{timeout:60000});
 const results=[];
 for(const [width,height] of [[1440,900],[390,844],[320,568],[844,390]]){
  await page.setViewportSize({width,height});
  const result=await page.evaluate(()=>{
   app.resize();app.debugFreezeSimulation=true;__qa.setState({phase:'canopy',lat:41.39,lon:2.17,h:280,chute:1,t:3,airSpeed:28});
   const c=app.cargo;c.reset();
   for(let i=0;i<180;i++)c.update(app.sim.s,1/60,app.sim.config);
   c.scene.updateMatrixWorld(true);
   const bounds=group=>{const b={left:Infinity,right:-Infinity,top:Infinity,bottom:-Infinity},v=c.camera.position.clone();group.traverse(o=>{if(!o.geometry)return;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld).project(c.camera);const x=(v.x*.5+.5)*innerWidth,y=(.5-v.y*.5)*innerHeight;b.left=Math.min(b.left,x);b.right=Math.max(b.right,x);b.top=Math.min(b.top,y);b.bottom=Math.max(b.bottom,y)}});return b};
   const steering=[];for(const input of [-1,1]){app.sim.s.inputX=input;app.sim.s.inputY=input*.7;app.sim.s.turb=.8;for(let i=0;i<180;i++)c.update(app.sim.s,1/60,app.sim.config);c.scene.updateMatrixWorld(true);steering.push(bounds(c.canopy));}app.sim.s.inputX=app.sim.s.inputY=app.sim.s.turb=0;for(let i=0;i<180;i++)c.update(app.sim.s,1/60,app.sim.config);c.scene.updateMatrixWorld(true);
   return {steering,width:innerWidth,height:innerHeight,view:c.stats.view,cameraAbove:c.stats.cameraAbove,cameraTilt:c.stats.cameraTilt,suspensionHeight:c.stats.suspensionHeight,body:bounds(c.body),canopy:bounds(c.canopy)};
  });
  await page.waitForTimeout(1800);
  await page.screenshot({path:`tests/cargo/v15-${width}x${height}.png`});
  console.log(JSON.stringify(result));
  assert.equal(result.cameraAbove,true);assert.ok(result.cameraTilt<=25);assert.ok(result.suspensionHeight>4);assert.equal(result.view,'near-nadir');
  assert.ok(result.canopy.left>width*.5+10,'canopy must leave aim visible');
  assert.ok(result.canopy.right<=width+1,'canopy must fit viewport');
  for(const b of result.steering){assert.ok(b.right<=width+1,'steering must fit viewport');assert.ok(b.left>width*.5+12||b.top>height*.5+12||b.bottom<height*.5-12,'steering must leave aim visible');}
  assert.ok(result.canopy.top>=0,'canopy must fit viewport vertically');
  assert.ok(result.body.bottom<height*.82,'crate must stay above action area');
  assert.ok(result.canopy.bottom>result.body.top,'near canopy should partly occlude load');
  assert.ok(result.body.bottom>result.canopy.bottom,'load should peek out below canopy');
  results.push(result);
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify(results,null,2));
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
