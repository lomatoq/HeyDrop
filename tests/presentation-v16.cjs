const assert=require('node:assert/strict'),Module=require('node:module'),esbuild=require('esbuild');
function load(file){const out=esbuild.buildSync({entryPoints:[file],bundle:true,write:false,platform:'node',format:'cjs'});const m=new Module(file,module);m._compile(out.outputFiles[0].text,file);return m.exports;}
const {FrameMetrics}=load('src/frame-metrics.js'),{GameSession}=load('src/session.js'),{memoryView,DISTRACTION}=load('src/memory-route.js');
const metric=new FrameMetrics(3);for(const ms of [16,18,120,20])metric.record(ms,1,5,2);
assert.equal(metric.snapshot().window,3);assert.equal(metric.snapshot().frame.max,120);assert.equal(metric.snapshot().longFrames,1);
const party=new GameSession(),round={seed:1,city:'rome'};party.record(round,1000,255000);party.record(round,5000,0);assert.equal(party.total,1000);party.next();party.record({seed:2,city:'paris'},2000,10000);assert.equal(party.total,3000);
const route={answer:[1,0,0],start:[0,1,0],decoys:[{aim:[0,0,1]},{aim:[-1,0,0]}]};
const view=memoryView(route,DISTRACTION.travel+.2);assert.equal(view.h,900);assert.equal(view.moving,false);
console.log('PASS raw long-frame accounting, bounded samples, practice preserves first attempt, matching memory scale');
