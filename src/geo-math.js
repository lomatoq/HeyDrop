// Sphere navigation for player-controlled Earth. No map renderer or answer lookup.
export const R=6371008.8, DEG=Math.PI/180;
export const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
export const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const add=(a,b)=>a.map((v,i)=>v+b[i]);
export const mul=(a,t)=>a.map(v=>v*t);
export const norm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l)};
export const bounded=(v,a,b)=>Math.max(a,Math.min(b,v));
export const unit=(lat,lon)=>{const a=lat*DEG,b=lon*DEG,c=Math.cos(a);return [c*Math.cos(b),c*Math.sin(b),Math.sin(a)]};
export const coord=n=>({lat:Math.asin(bounded(n[2],-1,1))/DEG,lon:Math.atan2(n[1],n[0])/DEG});
export const angle=(a,b)=>Math.atan2(Math.hypot(...cross(a,b)),bounded(dot(a,b),-1,1));
export const distance=(a,b)=>angle(a,b)*R;
export const north=n=>{const g=coord(n),a=g.lat*DEG,b=g.lon*DEG;return [-Math.sin(a)*Math.cos(b),-Math.sin(a)*Math.sin(b),Math.cos(a)]};
export function rotate(v,axis,radians){const c=Math.cos(radians),s=Math.sin(radians),k=dot(axis,v)*(1-c),cv=cross(axis,v);return v.map((x,i)=>x*c+cv[i]*s+axis[i]*k)}
export function rotor(a,b,f=1){const c=cross(a,b),l=Math.hypot(...c),rad=angle(a,b);let axis=l>1e-10?mul(c,1/l):norm(cross(a,Math.abs(a[2])<.9?[0,0,1]:[1,0,0]));return {axis,rad:rad*f}}
export function slerp(a,b,f){if(f<=0)return [...a];if(f>=1)return [...b];const q=rotor(a,b,f);return norm(rotate(a,q.axis,q.rad))}
export const bearing=(n,up)=>{const N=north(n),E=norm(cross(N,n));return Math.atan2(dot(up,E),dot(up,N))};
