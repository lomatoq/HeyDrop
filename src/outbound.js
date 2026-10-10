import {clamp,mix} from './core.js';
// One continuous pullback, no keyframe holds and no stepped easing between scales.
export const OUTBOUND_END=5.2;
export function outboundHeight(t){return Math.exp(mix(Math.log(900),Math.log(11000000),clamp(t/OUTBOUND_END)));}
export function outboundInfo(t){const h=outboundHeight(t),index=h<4000?0:h<30000?1:h<300000?2:h<2800000?3:4;return {index,title:['Address','Neighborhood','City','Continent','Earth'][index],note:'North is up · the address stays in the center',progress:clamp(t/OUTBOUND_END)};}
