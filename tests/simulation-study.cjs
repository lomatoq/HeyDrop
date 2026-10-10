const fs=require('fs'),path=require('path'),esbuild=require('../../HeyPals_MemoryDrop_V6/node_modules/esbuild');
const root=path.join(__dirname,'..');esbuild.buildSync({entryPoints:[path.join(root,'src','simulation.js')],bundle:true,platform:'node',format:'cjs',outfile:path.join(__dirname,'simulation-bundle.cjs')});
const {Simulation,makeRound}=require('./simulation-bundle.cjs');
const checks=[],check=(name,pass,detail=null)=>{checks.push({name,pass:!!pass,detail});console.log(pass?'PASS':'FAIL',name,JSON.stringify(detail))};
const sim=new Simulation();sim.round=makeRound(7241,'barcelona');sim.begin();for(let i=0;i<605;i++)sim.step(1/120);const rows=[];while(sim.s.phase==='context'){rows.push({t:sim.s.t,h:sim.s.h,aim:[...sim.s.aim],up:[...sim.s.up]});sim.step(1/120)}
check('Outbound function advances at every simulation tick',rows.slice(1).every((r,i)=>r.h>rows[i].h));
check('Outbound duration is 5.2 seconds, not a 13 second guided tour',rows.at(-1).t>5.18&&rows.at(-1).t<5.22,rows.at(-1).t);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
check('Fixed outgoing anchor does not start shuffling while showing the city',rows.every(r=>Math.abs(dot(r.aim,sim.round.answer)-1)<1e-8));
check('Outgoing north-up orientation does not rotate while teaching location',rows.every(r=>Math.abs(dot(r.up,rows[0].up)-1)<1e-8));
check('No pauses at level boundaries',rows.slice(1).every((r,i)=>Math.log(r.h/rows[i].h)>.014));
while(sim.s.phase!=='orbit')sim.step(1/120);
check('Shuffle still moves to a different hemisphere',dot(sim.s.aim,sim.round.answer)<.4);
sim.pick(-22.9748,-43.1896);for(let i=0;i<120;i++)sim.step(1/120);sim.descend();for(let i=0;i<24000&&sim.s.phase!=='result';i++)sim.step(1/120);
check('Brazil selection survives to contact for a Barcelona answer',sim.s.contact&&Math.abs(sim.s.lat+22.9748)<1e-7&&sim.s.distance>8e6,sim.s.distance);
check('Finished result has no ground movement',sim.s.contact&&sim.s.horizontalSpeed===0&&sim.s.airSpeed===0);
const report={summary:{passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length},checks};fs.writeFileSync(path.join(__dirname,'simulation-report.json'),JSON.stringify(report,null,2));if(report.summary.failed)process.exitCode=1;
