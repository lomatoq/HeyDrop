const {chromium}=require('../../HeyPals_MemoryDrop_V6/node_modules/playwright-core');
const fs=require('fs'),path=require('path'),crypto=require('crypto');
(async()=>{
 const root=path.join(__dirname,'..'),out=path.join(__dirname,'delayed');fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1200,height:800}}),checks=[],errors=[];let delayed=0;
 const check=(name,pass,detail=null)=>{checks.push({name,pass:!!pass,detail});console.log(pass?'PASS':'FAIL',name,JSON.stringify(detail))};
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/MapServer/tile/**',async route=>{delayed++;await new Promise(r=>setTimeout(r,450));await route.continue();});
 try{
  await page.goto('http://127.0.0.1:8797/?qa#s=7241&c=barcelona');
  await page.waitForFunction(()=>window.__qa?.snapshot().ready,null,{timeout:60000});
  await page.evaluate(()=>{app.debugFreezeSimulation=true;__qa.setState({phase:'freefall',h:7500,lat:52.235,lon:21.02,airSpeed:65,chute:0,t:4});window.__samples=[];window.__timer=setInterval(()=>{const w=app.world;__samples.push({h:app.sim.s.h,cover:w.cover,...w.dissolve.snapshot()})},70)});
  await page.waitForTimeout(6000);await page.screenshot({path:path.join(out,'01-coarse-first.jpg'),type:'jpeg',quality:90});
  for(let i=0;i<=60;i++){await page.evaluate(i=>{app.sim.s.h=Math.exp(Math.log(7500)+(Math.log(1100)-Math.log(7500))*i/60)},i);await page.waitForTimeout(70);}
  await page.screenshot({path:path.join(out,'02-detail-transition.jpg'),type:'jpeg',quality:92});
  await page.waitForFunction(()=>app.world.viewer.scene.globe.tilesLoaded,null,{timeout:60000});
  await page.waitForTimeout(500);await page.screenshot({path:path.join(out,'03-detail-settled.jpg'),type:'jpeg',quality:92});
  const samples=await page.evaluate(()=>{clearInterval(__timer);return __samples});
  const last=samples.at(-1);fs.writeFileSync(path.join(out,'trace.json'),JSON.stringify(samples));
  check('Requests were delayed, never replaced with fixture images',delayed>30,delayed);
  check('Same two geographic mip layers persist under delayed network',samples.every(s=>s.layers===2&&s.next===null));
  check('No screen fade or artificial loading blur during player navigation',samples.every(s=>s.cover===0&&s.softness===0));
  check('Parent-child samples use gradual coefficients, not binary replacement',samples.some(s=>s.textureFade.sample.some(p=>p.a>.04&&p.a<.96)));
  check('Fine detail eventually resolves over independently selected Warsaw',Math.max(...Object.keys(last.textureFade.sourceLevels).map(Number))>=15&&last.settled,last.textureFade.sourceLevels);
  check('No sampler adapter failure with delayed real imagery',last.textureFade.failures===0,last.textureFade.failures);
  check('No JavaScript errors in delayed-network traversal',errors.length===0,errors);
 }catch(e){check('Delayed network run completes',false,e.stack);try{await page.screenshot({path:path.join(out,'FAILED.png')})}catch{}}
 const report={sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'index.html'))).digest('hex'),addedDelayMs:450,fixtures:false,delayed,summary:{passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length},checks,errors};fs.writeFileSync(path.join(__dirname,'delayed-report.json'),JSON.stringify(report,null,2));console.log('SUMMARY',JSON.stringify(report));await browser.close();
})().catch(e=>console.error(e.stack));
