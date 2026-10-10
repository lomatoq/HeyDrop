// Portable route format. No renderer, storage or game state dependencies.
export const PACK_VERSION=1;
export const MAX_PLACES=50;
export const MAX_PLAY_PLACES=20;
export const MAX_PACK_TOKEN=16000;
const fail=message=>{throw new Error(message);};
function generatedId(place,index){
 let hash=2166136261;for(const char of `${place.name}|${place.lat}|${place.lon}`){hash^=char.codePointAt(0);hash=Math.imul(hash,16777619);}
 return `custom-${(hash>>>0).toString(36)}-${index+1}`;
}
export function validatePack(value){
 if(!value||typeof value!=='object'||Array.isArray(value))fail('Choose a route JSON object with a version and places list.');
 if(value.version!==PACK_VERSION)fail('This route version is not supported. Expected version 1.');
 if(!Array.isArray(value.places)||value.places.length<1)fail('Add at least one location to your route.');
 if(value.places.length>MAX_PLACES)fail(`A route can contain up to ${MAX_PLACES} locations.`);
 const ids=new Set(),places=value.places.map((place,index)=>{
  const label=`Location ${index+1}`;
  if(!place||typeof place!=='object'||Array.isArray(place))fail(`${label} must be a location object.`);
  if(typeof place.name!=='string'||!place.name.trim()||place.name.trim().length>80)fail(`${label}: enter a name between 1 and 80 characters.`);
  if(typeof place.lat!=='number'||!Number.isFinite(place.lat)||Math.abs(place.lat)>85)fail(`${label}: latitude must be a number between -85 and 85.`);
  if(typeof place.lon!=='number'||!Number.isFinite(place.lon)||Math.abs(place.lon)>180)fail(`${label}: longitude must be a number between -180 and 180.`);
  if(place.hint!==undefined&&(typeof place.hint!=='string'||place.hint.trim().length>240))fail(`${label}: the hint can contain up to 240 characters.`);
  if(place.id!==undefined&&(typeof place.id!=='string'||!/^[a-zA-Z0-9_-]{1,64}$/.test(place.id)))fail(`${label}: the ID must use 1–64 letters, numbers, hyphens or underscores.`);
  const id=place.id?(place.id.startsWith('custom-')?place.id:`custom-${place.id}`):generatedId(place,index);
  if(id.length>64)fail(`${label}: the ID is too long after its custom- prefix.`);
  if(ids.has(id))fail(`${label}: each location needs a different ID.`);ids.add(id);
  return {id,name:place.name.trim(),lat:place.lat,lon:place.lon,hint:(place.hint||'').trim(),radius:0,tags:['custom']};
 });
 return {version:PACK_VERSION,places};
}
export function encodePack(value){
 const pack=validatePack(value);
 if(pack.places.length>MAX_PLAY_PLACES)fail(`Play links support up to ${MAX_PLAY_PLACES} locations. Keep your full route as JSON and remove a few stops to play.`);
 const bytes=new TextEncoder().encode(JSON.stringify(pack));let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
 const token=btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 if(token.length>MAX_PACK_TOKEN)fail('This route is too long for a play link. Shorten its names or hints, or use fewer locations. Export JSON to keep the full route.');
 return token;
}
export function decodePack(token){
 if(typeof token!=='string'||!token||token.length>MAX_PACK_TOKEN||!/^[A-Za-z0-9_-]+$/.test(token)||token.length%4===1)fail('This route link is invalid or too long. Import the original route JSON in the editor.');
 let parsed;
 try{const binary=atob(token.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-token.length%4)%4)),bytes=Uint8Array.from(binary,char=>char.charCodeAt(0));parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
 catch{fail('This route link could not be read. Import the original route JSON in the editor.');}
 const pack=validatePack(parsed);
 if(pack.places.length>MAX_PLAY_PLACES)fail(`Play links support up to ${MAX_PLAY_PLACES} locations.`);
 return pack;
}
