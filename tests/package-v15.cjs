const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8797/dist/hey-drop-v15/index.html?qa');
  await page.waitForFunction(()=>window.__qa?.snapshot().ready,null,{timeout:60000});
  assert(await page.locator('.brand-art').first().evaluate(e=>e.complete&&e.naturalWidth>0));
  await page.click('#start');
  await page.waitForFunction(()=>app.targetPrimed,null,{timeout:30000});
  assert.deepEqual(errors,[]);
  console.log('PASS packaged nested-path assets, application boot and target readiness');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
