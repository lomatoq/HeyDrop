import {dropDuration,DROP_REVEAL_TIME,updateFlightFeedback} from './flight-feedback.js';
import {makeDecoys,memoryView,DISTRACTION_END} from './memory-route.js';
import {LOCATION_BY_ID} from './locations.js';
import {PACING} from './tuning.js';
import {OUTBOUND_END,outboundHeight} from './outbound.js';
import {clamp,mix,smooth,damp,TAU,random,CITIES,WEATHER,Spring} from './core.js';
import * as G from './geo-math.js';
export {clamp,mix,smooth,damp,TAU,random,CITIES,WEATHER,Spring};
export const ACTIVE=['orbit','entry','freefall','opening','canopy'];
export function makeRound(seed,city='random'){
 const r=random(seed),c=city==='random'?CITIES[Math.floor(r()*CITIES.length)]:CITIES.find(c=>c[0]===city)||CITIES[0];
 const place=LOCATION_BY_ID.get(c[0]),lat=c[2]+(r()-.5)*(place?place.radius*2:1600)/111320,lon=c[3]+(r()-.5)*(place?place.radius*2:1900)/(111320*Math.cos(c[2]*G.DEG)),answer=G.unit(lat,lon);
 const q=random(seed^0x68bd7819);let start;
 for(let i=0;i<100;i++){start=G.unit((q()-.5)*118,q()*360-180);const a=G.angle(start,answer);if(a>1.25&&a<2.75)break;}
 const spinSign=q()<.5?-1:1,spinTurns=1.1+q()*.6;
 return {seed,city:c[0],name:c[1],hint:place?.hint,source:place?.source,lat,lon,answer,start,startGeo:G.coord(start),spinSign,spinTurns,windAngle:q()*TAU,decoys:makeDecoys(seed,answer,c[0])};
}
export class Simulation{
 constructor(){this.config={weather:'clear',time:'day',auto:true,motion:true,sensitivity:1,timed:false,challenge:'shuffle'};this.round=makeRound(8245);this.roll=new Spring(10,.85);this.pitch=new Spring(10,.85);this.reset();}
 reset(){this.roll.reset();this.pitch.reset();this.seek=null;this.wheel={x:0,y:0};const n=[...this.round.start];this.s={phase:'home',t:0,clock:0,elapsed:0,aim:n,up:G.north(n),lat:G.coord(n).lat,lon:G.coord(n).lon,h:11000000,vy:0,x:0,z:0,vx:0,vz:0,ax:0,az:0,bank:0,pitch:0,yawRate:0,heading:0,rollVelocity:0,pitchVelocity:0,airSpeed:0,horizontalSpeed:0,forwardSpeed:0,chute:0,flare:0,inputX:0,inputY:0,wind:[0,0],turb:0,heat:0,landTime:0,contact:false,distance:0,hard:false,pathLength:0,turnX:0,turnY:0,angularTravel:0,orbitLeft:24,dragging:false,boost:0,boostHeld:0,descentMultiplier:1,windTravel:0,entryClock:0,descentSpeed:0,visualSpeed:0,flightCue:0,dropStart:95,dropDuration:dropDuration(95),dropProgress:0,contactTime:0};this.onPhase?.('home');}
 phase(name){this.s.phase=name;this.s.t=0;if(name==='zoom'){this.s.routeClock=0;this.s.decoyWait=0;this.s.decoySkipped=0;}this.onPhase?.(name);}
 begin(){this.reset();this.s.aim=[...this.round.answer];this.s.up=G.north(this.s.aim);this.s.h=900;this.syncGeo();this.phase('brief');}
 syncGeo(){const s=this.s,g=G.coord(s.aim);s.lat=g.lat;s.lon=g.lon;s.heading=G.bearing(s.aim,s.up);s.x=g.lon*111320*Math.cos(g.lat*G.DEG);s.z=g.lat*111320;}
 isActive(){return ACTIVE.includes(this.s.phase);}
 moveBy(dx,dy){const s=this.s;if(!this.isActive())return;const right=G.norm(G.cross(s.up,s.aim)),tangent=G.add(G.mul(right,dx),G.mul(s.up,dy)),a=Math.hypot(dx,dy);if(a<1e-12)return;const axis=G.norm(G.cross(s.aim,tangent));s.aim=G.norm(G.rotate(s.aim,axis,a));s.up=G.norm(G.rotate(s.up,axis,a));s.up=G.norm(G.add(s.up,G.mul(s.aim,-G.dot(s.up,s.aim))));s.angularTravel+=a;s.pathLength+=a*G.R;this.syncGeo();}
 // Used only for the coordinates the player actually clicked on the visible globe.
 pick(lat,lon){if(!this.isActive())return false;const s=this.s;this.seek={from:[...s.aim],up:[...s.up],to:G.unit(lat,lon),elapsed:0,duration:s.phase==='orbit'?.40:.24};s.turnX=s.turnY=0;this.wheel.x=this.wheel.y=0;return true;}
 drag(dx,dy,scale){if(!this.isActive())return;this.seek=null;this.moveBy(-dx*scale,dy*scale);this.s.inputX=clamp(-dx*.08,-1,1);this.s.inputY=clamp(-dy*.08,-1,1);this.s.turnX=this.s.turnY=0;}
 scroll(dx,dy,scale,vertical=false){if(!this.isActive())return;this.seek=null;this.wheel.x+=clamp((vertical?dx:dx+dy)*scale*.65,-.55,.55);this.wheel.y+=clamp((vertical?-dy:0)*scale*.65,-.55,.55);}
 descend(){if(this.s.phase!=='orbit')return false;this.s.entryStartH=this.s.h;this.s.entryClock=0;this.phase('entry');return true;}
 startDrop(hard=false){const s=this.s;s.dropStart=s.h;s.dropDuration=dropDuration(s.h);s.dropProgress=0;s.landTime=0;s.contactTime=0;s.contact=false;s.hard=hard;this.seek=null;s.turnX=s.turnY=0;this.wheel.x=this.wheel.y=0;this.phase('land');}
 release(){const s=this.s;if(s.phase!=='canopy'||s.h>300||s.h<0)return false;this.startDrop();return true;}
 deploy(){if(this.s.phase==='orbit')return this.descend();if(this.s.phase==='canopy')return this.release();const s=this.s;if(s.phase!=='freefall'||s.h>1700||s.h<100)return false;this.phase('opening');return true;}
 controlRate(){const s=this.s;return s.phase==='orbit'?.98:Math.min(.98,.68*s.h/(G.R+s.h));}
 control(dt,input){const s=this.s;let x=clamp(input.x||0,-1,1),y=clamp(input.y||0,-1,1),m=Math.hypot(x,y);if(m>1){x/=m;y/=m;}s.flare=damp(s.flare,input.brake?1:0,14,dt);const accelerate=input.boost&&['entry','freefall','opening','canopy'].includes(s.phase);s.boostHeld=accelerate?s.boostHeld+dt:0;s.boost=damp(s.boost,accelerate?smooth(0,2.8,s.boostHeld):0,accelerate?4:6,dt);s.descentMultiplier=1+s.boost*2;
 if(!s.dragging){s.inputX=x;s.inputY=y;}
 if(Math.abs(x)+Math.abs(y)>.03||input.brake){this.seek=null;}
 if(this.seek&&!s.dragging){const t=this.seek;t.elapsed+=dt;const f=smooth(0,t.duration,t.elapsed),q=G.rotor(t.from,t.to,f);s.aim=G.slerp(t.from,t.to,f);s.up=G.norm(G.rotate(t.up,q.axis,q.rad));if(f>=1)this.seek=null;this.syncGeo();}
 const rate=this.controlRate()*this.config.sensitivity*(1-s.flare*.78),response=input.brake?24:12;
 s.turnX=damp(s.turnX,x*rate,response,dt);s.turnY=damp(s.turnY,-y*rate,response,dt);
 if(!s.dragging&&!this.seek){const w=1-Math.exp(-dt*13),wx=this.wheel.x*w,wy=this.wheel.y*w;this.wheel.x-=wx;this.wheel.y-=wy;this.moveBy(s.turnX*dt+wx,s.turnY*dt+wy);}
 s.yawRate=rate>0?s.turnX/rate:0;s.bank=this.roll.step(clamp(s.inputX,-1,1)*.62,dt);s.pitch=this.pitch.step(-clamp(s.inputY,-1,1)*.5,dt);s.rollVelocity=this.roll.velocity;s.pitchVelocity=this.pitch.velocity;
 s.horizontalSpeed=Math.hypot(s.turnX,s.turnY)*G.R;s.vx=s.turnX*G.R;s.vz=s.turnY*G.R;
 }
 applyWind(dt,weather){
  const s=this.s;if(!['entry','freefall','opening','canopy'].includes(s.phase)||s.h>8500)return;
  const force=Math.max(0,weather.wind-2)*(1+.28*Math.sin(s.clock*1.7+this.round.windAngle))*(.35+.65*s.chute);
  if(!force)return;const north=G.north(s.aim),east=G.norm(G.cross(north,s.aim)),right=G.norm(G.cross(s.up,s.aim));
  const tangent=G.add(G.mul(east,Math.sin(this.round.windAngle)),G.mul(north,Math.cos(this.round.windAngle))),angle=force*dt/G.R;
  this.moveBy(G.dot(tangent,right)*angle,G.dot(tangent,s.up)*angle);s.windTravel+=force*dt;
 }
 step(dt,input={}){if(!(dt>0)||!Number.isFinite(dt))return;const previousHeight=this.s.h;this.integrate(dt,input);updateFlightFeedback(this.s,previousHeight,dt);}
 integrate(dt,input={}){const s=this.s;s.clock+=dt;s.t+=dt;const weather=WEATHER[this.config.weather];s.wind=[Math.sin(this.round.windAngle)*weather.wind,Math.cos(this.round.windAngle)*weather.wind];s.turb=weather.gust*(.5+.5*Math.sin(s.clock*.7)**2);
 if(s.phase==='home')return;
 if(s.phase==='brief'){if(s.t>=PACING.memory)this.phase('context');return;}
 if(s.phase==='context'){s.h=outboundHeight(s.t);s.aim=[...this.round.answer];s.up=G.north(s.aim);this.syncGeo();if(s.t>=OUTBOUND_END)this.phase('zoom');return;}
 if(s.phase==='zoom'&&this.config.challenge==='shuffle'){const view=memoryView(this.round,s.routeClock||0);s.aim=view.aim;s.h=view.h;s.up=G.north(s.aim);s.decoyIndex=view.index;s.decoyMoving=view.moving;s.decoyWaiting=!view.moving&&input.decoyReady===false;if(s.decoyWaiting){s.decoyWait+=dt;if(s.decoyWait>=3){s.routeClock=view.holdEnd+1e-6;s.decoySkipped++;s.decoyWait=0;}}else{s.routeClock+=dt;s.decoyWait=0;}this.syncGeo();if(s.routeClock>=DISTRACTION_END){s.aim=[...this.round.start];s.up=G.north(s.aim);s.h=11000000;this.syncGeo();this.phase('orbit');}return;}
 if(s.phase==='zoom'){s.h=11000000;const f=smooth(.4,2.8,s.t);s.aim=G.slerp(this.round.answer,this.round.start,f);s.up=G.rotate(G.north(s.aim),s.aim,this.config.motion?this.round.spinSign*TAU*.68*Math.sin(f*Math.PI):0);this.syncGeo();if(s.t>=3.25){s.aim=[...this.round.start];s.up=G.north(s.aim);this.syncGeo();this.phase('orbit');}return;}
 if(s.phase==='land'){s.landTime+=dt;const progress=clamp(s.landTime/s.dropDuration);s.dropProgress=progress*progress;s.h=s.dropStart*(1-s.dropProgress);s.bank=this.roll.step(0,dt);s.pitch=this.pitch.step(0,dt);if(s.landTime>=s.dropDuration&&!s.contact){s.contact=true;s.h=0;s.distance=G.distance(s.aim,this.round.answer);s.contactGeo={lat:s.lat,lon:s.lon};s.contactAim=[...s.aim];s.vx=s.vz=s.horizontalSpeed=s.airSpeed=0;this.onContact?.();}s.contactTime=Math.max(0,s.landTime-s.dropDuration);if(s.contactTime>=DROP_REVEAL_TIME)this.phase('result');return;}
 if(s.phase==='result'){s.landTime+=dt;s.contactTime=Math.max(0,s.landTime-s.dropDuration);return;}
 this.control(dt,input);this.applyWind(dt,weather);s.elapsed+=dt;
 if(s.phase==='orbit'){s.orbitLeft=this.config.timed?Math.max(0,PACING.orbit-s.t):Infinity;if(this.config.timed&&s.t>=PACING.orbit)this.descend();return;}
 if(s.phase==='entry'){s.entryClock=(s.entryClock||0)+dt*s.descentMultiplier;s.h=Math.exp(mix(Math.log(s.entryStartH||11000000),Math.log(24000),smooth(0,PACING.entry,s.entryClock)));s.airSpeed=70;s.heat=.2*Math.sin(smooth(0,PACING.entry,s.entryClock)*Math.PI);if(s.entryClock>=PACING.entry){s.h=24000;s.vy=65;this.phase('freefall');}return;}
 if(s.phase==='opening'){s.chute=smooth(.05,.9,s.t);if(s.t>=1){s.chute=1;this.phase('canopy');}}
 const ch=s.chute,rho=Math.max(.34,1.225*Math.exp(-s.h/9500));s.vy=clamp(s.vy+(mix(9.81-rho*.66*s.vy*s.vy/164,(28-s.vy)*6,ch))*dt,22,140);const compression=mix(1+Math.min(s.h,6500)/1500+Math.max(0,s.h-6500)/3500,1,ch);s.h=Math.max(0,s.h-s.vy*compression*mix(PACING.fall,1,ch)*mix(s.descentMultiplier,1+s.boost*.65,ch)*dt);s.airSpeed=s.vy;s.heat=smooth(12000,24000,s.h)*.18;
 if(this.config.auto&&s.phase==='freefall'&&s.h<=390)this.deploy();
 if(s.h<=95)this.startDrop(ch<.6);
 if(![s.lat,s.lon,s.h,...s.aim,...s.up].every(Number.isFinite))throw Error('Non-finite globe control state');
 }
}
