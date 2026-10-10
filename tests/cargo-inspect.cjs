const {chromium}=require('../../HeyPals_MemoryDrop_V6/node_modules/playwright-core');
const fs=require('fs'),path=require('path');
(async()=>{
 const out=path.join(__dirname,'cargo');fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 page.on('pageerror',e=>console.log('ERROR',e.message));
 page.on('console',e=>{if(e.type()==='error')console.log('CONSOLE',e.text())});
 await page.goto('http://127.0.0.1:8797/?qa#s=7241&c=barcelona');
 await page.waitForFunction(()=>window.__qa?.snapshot().ready,null,{timeout:60000});
 await page.evaluate(()=>{app.debugFreezeSimulation=true;__qa.setState({phase:'freefall',h:1600,lat:41.39,lon:2.17,t:4,airSpeed:60,chute:0})});
 await page.waitForTimeout(4000);
 await page.screenshot({path:path.join(out,'01-overhead.png')});
 console.log('OVERHEAD',JSON.stringify(await page.evaluate(()=>app.cargo.stats)));
 await page.evaluate(()=>__qa.setState({phase:'canopy',h:280,chute:1,t:3,airSpeed:28}));
 await page.waitForTimeout(3000);
 await page.screenshot({path:path.join(out,'02-canopy.png')});
 console.log('CANOPY',JSON.stringify(await page.evaluate(()=>app.cargo.stats)));
 await page.evaluate(()=>{app.sim.s.inputX=.8;app.sim.s.turb=.7});
 await page.waitForTimeout(1000);
 await page.screenshot({path:path.join(out,'03-swing.png')});
 await page.evaluate(()=>{app.sim.s.landTime=0;app.sim.s.inputX=0;app.sim.release();app.debugFreezeSimulation=true});
 for(const t of [0,.15,.35,.55,.85,1.1]){
  await page.evaluate(t=>{app.sim.s.landTime=t;app.sim.s.t=t;app.cargo.update(app.sim.s,1/60,app.sim.config)},t);
  await page.waitForTimeout(120);await page.screenshot({path:path.join(out,'release-'+t+'.png')});
 }
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>{app.cargo.reset();__qa.setState({phase:'freefall',h:1500,t:3,chute:0,landTime:0,contact:false});});
 await page.waitForTimeout(1000);await page.screenshot({path:path.join(out,'phone-overhead.png')});
 await page.evaluate(()=>__qa.setState({phase:'canopy',h:280,chute:1,t:3}));
 await page.waitForTimeout(1200);await page.screenshot({path:path.join(out,'phone-canopy.png')});
 console.log('PHONE',JSON.stringify(await page.evaluate(()=>app.cargo.stats)));
 await browser.close();
})().catch(e=>{console.log(e.stack);process.exitCode=1});
