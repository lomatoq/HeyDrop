import {CITIES,random,clamp,mix} from './core.js';
import * as G from './geo-math.js';

export const DISTRACTION = Object.freeze({travel:1.1, hold:2, altitude:900, count:2});
export const DISTRACTION_END = DISTRACTION.travel*3 + DISTRACTION.hold*2;
const ease=t=>{t=clamp(t);return t*t*t*(t*(t*6-15)+10);};

export function makeDecoys(seed,answer,city){
 const rng=random(seed^0x19fb08a3),pool=CITIES.filter(c=>c[0]!==city&&G.angle(answer,G.unit(c[2],c[3]))>.18),selected=[];
 while(selected.length<2&&pool.length){const [c]=pool.splice(Math.floor(rng()*pool.length),1);selected.push({city:c[0],aim:G.unit(c[2],c[3])});}
 return selected;
}

// A geography-preserving camera path: travel above the globe, then settle over a decoy.
// No change to the true answer or the eventual player-selected landing coordinate.
export function memoryView(round,time){
 const points=[{aim:round.answer,h:11000000},...round.decoys.map(p=>({...p,h:DISTRACTION.altitude})),{aim:round.start,h:11000000}];
 let t=Math.max(0,time);
 for(let i=0;i<3;i++){
  const a=points[i],b=points[i+1];
  if(t<DISTRACTION.travel){
   const f=ease(t/DISTRACTION.travel),apex=Math.max(a.h,b.h,900000,G.angle(a.aim,b.aim)*G.R*.65);
   const h=f<.5?Math.exp(mix(Math.log(a.h),Math.log(apex),ease(f*2))):Math.exp(mix(Math.log(apex),Math.log(b.h),ease(f*2-1)));
   return {aim:G.slerp(a.aim,b.aim,f),h,index:Math.min(i+1,2),moving:true,progress:clamp(time/DISTRACTION_END)};
  }
  t-=DISTRACTION.travel;
  if(i<2){if(t<DISTRACTION.hold)return {...b,index:i+1,moving:false,holdEnd:DISTRACTION.travel*(i+1)+DISTRACTION.hold*(i+1),progress:clamp(time/DISTRACTION_END)};t-=DISTRACTION.hold;}
 }
 return {...points[3],index:2,moving:false,progress:1};
}
