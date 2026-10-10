const assert=require('node:assert/strict'),path=require('node:path'),Module=require('node:module'),esbuild=require('esbuild');
const output=esbuild.buildSync({entryPoints:[path.join(__dirname,'../src/custom-pack.js')],bundle:true,write:false,platform:'node',format:'cjs'}),compiled=new Module('custom-pack');compiled._compile(output.outputFiles[0].text,'custom-pack');
const {validatePack,encodePack,decodePack,MAX_PACK_TOKEN}=compiled.exports;
const place=(i=0)=>({id:`point-${i}`,name:`Place ${i}`,lat:48.8566+i*.001,lon:2.3522,hint:'Find the river',radius:100,tags:['external']});
const pack={version:1,places:[place(),{...place(1),name:'東京 · Łódź · 📨',hint:'A café by the château'}]};
const clean=validatePack(pack),token=encodePack(pack);assert.deepEqual(decodePack(token),clean);assert(/^[a-zA-Z0-9_-]+$/.test(token));assert.equal(clean.places[0].radius,0);assert.deepEqual(clean.places[0].tags,['custom']);assert.equal(clean.places[0].id,'custom-point-0');assert.equal(pack.places[0].radius,100);assert.deepEqual(validatePack(clean),clean);
const noId={version:1,places:[{name:'  Exact point  ',lat:0,lon:-180}]};assert.deepEqual(validatePack(noId),validatePack(noId));assert.equal(validatePack(noId).places[0].name,'Exact point');
for(const value of [null,[],{}, {version:2,places:[place()]},{version:1,places:[]},{version:1,places:Array.from({length:51},(_,i)=>place(i))}])assert.throws(()=>validatePack(value));
for(const patch of [{lat:NaN},{lat:Infinity},{lat:85.001},{lat:'45'},{lon:181},{lon:-Infinity},{name:''},{name:'x'.repeat(81)},{hint:'x'.repeat(241)},{id:'<script>'}])assert.throws(()=>validatePack({version:1,places:[{...place(),...patch}]}));
assert.throws(()=>validatePack({version:1,places:[place(),place()]}),/different ID/);
const fifty={version:1,places:Array.from({length:50},(_,i)=>place(i))};assert.equal(validatePack(fifty).places.length,50);assert.throws(()=>encodePack(fifty),/20 locations/);
const twenty={version:1,places:Array.from({length:20},(_,i)=>place(i))};assert.equal(decodePack(encodePack(twenty)).places.length,20);
const oversized={version:1,places:Array.from({length:20},(_,i)=>({...place(i),name:'界'.repeat(80),hint:'界'.repeat(240)}))};assert.throws(()=>encodePack(oversized),/too long/);
for(const bad of ['',null,'***','a','a'.repeat(MAX_PACK_TOKEN+1),Buffer.from('{').toString('base64url'),Buffer.from([255]).toString('base64url')])assert.throws(()=>decodePack(bad));
assert.throws(()=>decodePack(Buffer.from(JSON.stringify(fifty)).toString('base64url')),/20 locations/);
const boundary={version:1,places:[{name:'North edge',lat:85,lon:180},{name:'South edge',lat:-85,lon:-180}]};assert.deepEqual(decodePack(encodePack(boundary)),validatePack(boundary));
// Includes the catalogue import without creating or modifying a release bundle.
esbuild.buildSync({entryPoints:[path.join(__dirname,'../src/editor.js')],bundle:true,write:false,format:'esm',platform:'browser'});
console.log(JSON.stringify({pass:true,checks:['UTF-8 base64url round-trip','strict numeric geographic bounds','name and hint bounds','unique normalized IDs','exact radius and custom tags','no caller mutation','50-location JSON / 20-location play limit','URL budget','malformed and unsupported payloads','editor imports and syntax']}));
