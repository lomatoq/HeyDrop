import {LANDMARKS} from './locations.js';
import {random} from './core.js';

export const THEMES = [
 ['all','World discoveries'],['ancient','Ancient worlds'],['small-towns','Small towns & villages'],
 ['landmarks','Famous landmarks'],['islands','Islands'],['nature','Wild places'],['coastal','Coasts & ports']
];
export function themePlaces(theme='all') {
 return LANDMARKS.filter(p=>theme==='all'||p.tags?.includes(theme));
}
// A shared seed selects the entire itinerary, never a fresh random next round.
export function makeRoute(seed,places,{ordered=false,count=5}={}) {
 if(!places.length)throw new Error('This collection has no locations.');
 const rng=random(seed),pool=[...places];
 if(!ordered)for(let i=pool.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
 return pool.slice(0,Math.min(count,pool.length)).map(p=>({placeId:p.id,seed:1+Math.floor(rng()*2147483646)}));
}
