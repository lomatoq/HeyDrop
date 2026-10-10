import {clamp,damp} from './core.js';

// An intentionally compressed gravity arc: 95 m takes 1.54 s; 300 m takes 2.74 s.
// The displayed height, cargo pose and contact event all use the same trajectory.
export const dropDuration=height=>clamp(Math.sqrt(2*Math.max(0,height)/80),1,3);
export const DROP_REVEAL_TIME=1.4;

export function updateFlightFeedback(s,previousHeight,dt){
 const flying=['entry','freefall','opening','canopy','land'].includes(s.phase)&&!s.contact;
 s.descentSpeed=flying&&dt>0?Math.max(0,(previousHeight-s.h)/dt):0;
 // Approximate map expansion rate. Metres/second alone is misleading across orbital
 // and street scales; the 120 m floor keeps the final approach finite and readable.
 s.visualSpeed=s.descentSpeed/(Math.max(0,(previousHeight+s.h)*.5)+120);
 const target=1-Math.exp(-s.visualSpeed*4);
 s.flightCue=flying?damp(s.flightCue||0,target,8,dt):0;
}
