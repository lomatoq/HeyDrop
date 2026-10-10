const {chromium}=require('../../HeyPals_MemoryDrop_V6/node_modules/playwright-core');
const fs=require('fs'),path=require('path');
(async()=>{
 const out=path.join(__dirname,'alignment');fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1200,height:800}});
 page.on('pageerror',e=>console.log(e.message));
 await page.goto('http://127.0.0.1:8797/?qa#s=7241&c=barcelona');
 await page.waitForFunction(()=>window.__qa?.snapshot().ready,null,{timeout:60000});
 await page.evaluate(()=>{
  app.debugFreezeSimulation=true;
  __qa.setState({phase:'context',h:35000,lat:41.3892265398,lon:2.169293501,t:2});
 });
 await page.waitForTimeout(4000);
 await page.screenshot({path:path.join(out,'01-with-ancestor.png')});
 await page.evaluate(()=>app.world.dissolve.allowAncestor=false);
 await page.waitForTimeout(1000);
 await page.screenshot({path:path.join(out,'02-without-ancestor.png')});
 const orient=await page.evaluate(async()=>{
  const cache=app.world.dissolve.cache,x=1036,y=764,z=11;
  const im=await cache.request(x,y,z),raw=new Image();raw.crossOrigin='anonymous';
  await new Promise((a,b)=>{raw.onload=a;raw.onerror=b;raw.src='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/'+z+'/'+y+'/'+x;});
  const pixel=(image,flip)=>{
   const c=document.createElement('canvas');c.width=c.height=256;
   const g=c.getContext('2d');if(flip){g.translate(0,256);g.scale(1,-1);}
   g.drawImage(image,0,0);return g.getImageData(0,0,256,256).data;
  };
  const a=pixel(im,false),b=pixel(raw,false),c=pixel(im,true);
  let same=0,flipped=0;
  for(let i=0;i<a.length;i+=4){same+=Math.abs(a[i]-b[i]);flipped+=Math.abs(c[i]-b[i]);}
  return {bitmap:im instanceof ImageBitmap,same:same/(256*256),flipped:flipped/(256*256)};
 });
 console.log('ORIENTATION',JSON.stringify(orient));
 console.log('MAP',JSON.stringify(await page.evaluate(()=>app.world.dissolve.snapshot())));
 await browser.close();
})().catch(e=>console.log(e.stack));
