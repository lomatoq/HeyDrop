const assert=require('node:assert/strict'),path=require('node:path'),Module=require('node:module'),esbuild=require('esbuild');
function load(file){const out=esbuild.buildSync({entryPoints:[path.join(__dirname,'..',file)],bundle:true,write:false,platform:'node',format:'cjs'}),m=new Module(file,module);m._compile(out.outputFiles[0].text,file);return m.exports;}
const {Simulation}=load('src/simulation.js'),{bindPlanetInput}=load('src/planet-input.js');
function orbit(){const s=new Simulation();s.phase('orbit');return s;}
function coast(hz,brake=false){const sim=orbit();sim.endDrag(.9,-.3);for(let i=0;i<hz*2;i++)sim.step(1/hz,{brake});return sim;}
const reference=coast(120);for(const hz of [30,60,144]){const s=coast(hz);assert(Math.hypot(...s.s.aim.map((v,i)=>v-reference.s.aim[i]))<1e-10,'coast depends on frame rate');assert(Math.abs(s.s.angularTravel-reference.s.angularTravel)<1e-10);}
assert(coast(120,true).s.angularTravel<reference.s.angularTravel*.25,'brake must reduce coast');
const capped=orbit();capped.endDrag(200,200);assert(Math.abs(Math.hypot(capped.orbitDrift.x,capped.orbitDrift.y)-1.6)<1e-10);capped.scroll(300,0,.001);assert.equal(capped.orbitDrift.x,0);for(let i=0;i<100;i++)capped.scroll(300,0,.001);assert(capped.wheel.x<=.75,'wheel backlog must be bounded');capped.control(1/60,{brake:true});assert.equal(capped.wheel.x,0);assert.equal(capped.s.angularTravel,0,'braking wheel must not dump backlog into movement');
capped.endDrag(1,0);capped.wheel.x=.3;capped.beginDrag();const before=[...capped.s.aim];capped.step(1/60);assert.deepEqual(capped.s.aim,before);assert.deepEqual(capped.orbitDrift,{x:0,y:0});assert.deepEqual(capped.wheel,{x:0,y:0});capped.descend();assert.equal(capped.s.dragging,false);assert.deepEqual(capped.orbitDrift,{x:0,y:0});
function fixture(phase='orbit'){
 const listeners={},area={addEventListener:(n,f)=>listeners[n]=f,setPointerCapture(){}},go={setPointerCapture(){}},timers=new Map();let timer=0;
 global.document={getElementById:id=>id==='globe'?area:go,querySelectorAll:()=>[]};global.innerHeight=800;global.setTimeout=f=>{timers.set(++timer,f);return timer};global.clearTimeout=id=>timers.delete(id);
 const sim=orbit();if(phase!=='orbit'){sim.phase(phase);sim.s.h=1000;}
 const app={ready:true,paused:false,modal:null,sim,world:{pixelScale:()=>.001,pickAt:()=>({lat:0,lon:0})},input:()=>({}),flashPick(){},flightDrag:{x:0,y:0}};bindPlanetInput(app);
 const event=(kind,x,y,time)=>listeners[kind]({clientX:x,clientY:y,timeStamp:time,pointerId:1,button:0,type:kind,preventDefault(){}});
 return {app,sim,event,timers};
}
let f=fixture();f.event('pointerdown',0,0,0);f.event('pointermove',100,0,200);f.event('pointermove',120,0,300);f.event('pointerup',120,0,300);assert(Math.abs(f.sim.orbitDrift.x+.2)<1e-10,'velocity must use last100ms, not whole drag');assert(Math.abs(f.sim.s.angularTravel-.12)<1e-10,'drag must include threshold displacement');
f.event('pointerdown',120,0,310);assert.equal(f.sim.orbitDrift.x,0,'regrab must stop drift immediately');f.event('pointermove',150,0,350);f.event('pointerup',150,0,550);assert(Math.abs(f.sim.orbitDrift.x)<1e-10,'paused release must not fling');
f=fixture('freefall');f.event('pointerdown',100,100,0);for(let i=1;i<=30;i++)f.event('pointermove',100+(i%2?1:-1),100,i*5);for(const cb of f.timers.values())cb();assert.equal(f.app.surfaceBoost,true,'stationary jitter must not cancel hold');assert.deepEqual(f.app.flightDrag,{x:0,y:0});f.event('pointerup',100,100,250);assert.equal(f.app.surfaceBoost,false);
f=fixture();f.event('pointerdown',0,0,0);f.event('pointermove',20,0,50);f.sim.descend();assert.equal(f.sim.s.dragging,false);f.event('pointermove',80,0,100);assert.deepEqual(f.app.flightDrag,{x:0,y:0},'orbit gesture must not become flight steering');assert.equal(f.app.surfaceBoost,false);f.event('pointerup',80,0,120);assert.equal(f.sim.seek,null);
f=fixture('freefall');f.event('pointerdown',100,100,0);for(const cb of f.timers.values())cb();f.sim.phase('opening');f.event('pointermove',101,100,300);assert.equal(f.app.surfaceBoost,true,'hold should survive flight phase changes');f.app.cancelGesture();assert.equal(f.app.surfaceBoost,false);
console.log(JSON.stringify({pass:true,coastHz:[30,60,120,144],velocityWindowMs:100,maxOrbitSpeed:1.6,controls:['direct drag','recent velocity','paused release','regrab','brake','stationary jitter','mode change','continuous flight hold']}));
