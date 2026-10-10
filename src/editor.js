import {validatePack,encodePack,decodePack,MAX_PLACES,MAX_PLAY_PLACES} from './custom-pack.js';
import {LANDMARKS} from './locations.js';

const $=id=>document.getElementById(id),DRAFT_KEY='heydrop-route-editor-v1';
let places=[],selectedId=null,placing=true,viewer=null,markers=new Map(),playToken=null,mapReady=false,toastTimer,serial=0,storageAvailable=true;
const selected=()=>places.find(p=>p.id===selectedId);
const currentPack=()=>({version:1,places});
const positionText=p=>`${p.lat.toFixed(5)}°, ${p.lon.toFixed(5)}°`;
const validPoint=p=>Number.isFinite(p?.lat)&&Number.isFinite(p?.lon)&&Math.abs(p.lat)<=85&&Math.abs(p.lon)<=180;
function toast(message){$('editorToast').textContent=message;$('editorToast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('editorToast').hidden=true,4200);}
function routeError(message=''){$('routeError').textContent=message;$('routeError').hidden=!message;}
function saveDraft(pack){
 try{localStorage.setItem(DRAFT_KEY,JSON.stringify({...pack,editorSelected:selectedId}));storageAvailable=true;}
 catch{storageAvailable=false;}
 $('draftState').textContent=storageAvailable?'Saved on this device':'Draft storage unavailable — export a copy';$('draftState').classList.toggle('unsaved',!storageAvailable);
}
function restoreDraft(){
 try{
  const value=localStorage.getItem(DRAFT_KEY);if(!value)return;
  if(value.length>128*1024)throw Error('The saved draft is too large.');
  const raw=JSON.parse(value),pack=raw.version===1&&Array.isArray(raw.places)&&!raw.places.length?{version:1,places:[]}:validatePack(raw);
  places=pack.places;selectedId=places.some(p=>p.id===raw.editorSelected)?raw.editorSelected:places[0]?.id||null;placing=!places.length;
 }catch(error){
  // Restricted storage and a corrupt draft must not prevent map editing.
  storageAvailable=false;$('draftState').textContent='Saved draft unavailable — export to keep a copy';$('draftState').classList.add('unsaved');toast('The saved draft could not be restored. You can start a route or import a JSON file.');
 }
}
function refreshValidation({save=true}={}){
 playToken=null;$('exportButton').disabled=true;$('playButton').disabled=true;$('addButton').disabled=places.length>=MAX_PLACES;$('fitRoute').disabled=!mapReady||!places.some(validPoint);
 if(!places.length){routeError();if(save)saveDraft({version:1,places:[]});return;}
 let pack;
 try{pack=validatePack(currentPack());routeError();$('exportButton').disabled=false;if(save)saveDraft(pack);}
 catch(error){routeError(error.message);$('draftState').textContent='Finish this edit to save your draft';$('draftState').classList.add('unsaved');return;}
 try{playToken=encodePack(pack);$('playButton').disabled=false;$('routeLimit').textContent=`${places.length} ${places.length===1?'location':'locations'}, played in this order. Play links support up to ${MAX_PLAY_PLACES}.`;}
 catch(error){$('routeLimit').textContent=error.message;}
}
function makeButton(label,text,action,id){const button=document.createElement('button');button.type='button';button.textContent=text;button.setAttribute('aria-label',label);button.dataset.action=action;button.dataset.id=id;return button;}
function renderList(){
 $('placeCount').textContent=`${places.length} / ${MAX_PLACES}`;$('emptyRoute').hidden=!!places.length;
 const fragment=document.createDocumentFragment();
 places.forEach((place,index)=>{
  const li=document.createElement('li');li.className='route-row'+(place.id===selectedId?' is-selected':'');
  const button=makeButton(`Edit location ${index+1}: ${place.name||'Unnamed location'}`,'','select',place.id);button.className='stop-select';button.setAttribute('aria-pressed',String(place.id===selectedId));
  const number=document.createElement('span');number.className='stop-number';number.textContent=String(index+1);
  const title=document.createElement('span');title.className='stop-title';const name=document.createElement('strong');name.textContent=place.name||'Unnamed location';const coordinates=document.createElement('small');coordinates.textContent=validPoint(place)?positionText(place):'Finish the coordinates';title.append(name,coordinates);button.append(number,title);
  const reorder=document.createElement('div');reorder.className='reorder-buttons';const up=makeButton(`Move ${place.name||'this location'} earlier`,'↑','up',place.id),down=makeButton(`Move ${place.name||'this location'} later`,'↓','down',place.id);up.disabled=index===0;down.disabled=index===places.length-1;reorder.append(up,down);li.append(button,reorder);fragment.append(li);
 });
 $('routeList').replaceChildren(fragment);
}
function refreshForm(){
 const place=selected();$('placeForm').hidden=!place;
 if(place){$('editHeading').textContent=`Location ${places.indexOf(place)+1}`;$('placeName').value=place.name;$('placeHint').value=place.hint;$('placeLat').value=Number.isFinite(place.lat)?place.lat:'';$('placeLon').value=Number.isFinite(place.lon)?place.lon:'';}
 refreshInstruction();
}
function refreshInstruction(){
 const place=selected();$('mapInstruction').textContent=placing?'Click the map to add a location':`Click the map to move ${place?.name||'this location'}`;
 $('selectedCoordinates').textContent=place&&validPoint(place)?positionText(place):'An exact address. No random offset.';
}
function renderMarkers(){
 if(!viewer)return;const C=window.Cesium;viewer.entities.removeAll();markers.clear();
 places.forEach((place,index)=>{if(!validPoint(place))return;const active=place.id===selectedId,entity=viewer.entities.add({id:place.id,position:C.Cartesian3.fromDegrees(place.lon,place.lat),point:{pixelSize:active?19:14,color:C.Color.fromCssColorString(active?'#fa6ba3':'#ffdf79'),outlineColor:C.Color.WHITE,outlineWidth:3,disableDepthTestDistance:Number.POSITIVE_INFINITY},label:{text:String(index+1),font:'bold 12px sans-serif',fillColor:C.Color.fromCssColorString('#342547'),pixelOffset:new C.Cartesian2(0,-25),style:C.LabelStyle.FILL_AND_OUTLINE,outlineColor:C.Color.WHITE,outlineWidth:4,disableDepthTestDistance:Number.POSITIVE_INFINITY}});markers.set(place.id,entity);});
 viewer.scene.requestRender();
}
function focusPoint(place){if(!viewer||!mapReady||!validPoint(place))return;viewer.camera.flyTo({destination:window.Cesium.Cartesian3.fromDegrees(place.lon,place.lat,1400),orientation:{heading:0,pitch:-Math.PI/2,roll:0},duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:.8});}
function choose(id,{fly=true}={}){selectedId=id;placing=false;renderList();refreshForm();renderMarkers();if(fly)focusPoint(selected());}
function addLocation(lat,lon,name,hint=''){
 if(places.length>=MAX_PLACES){toast(`Your route already has ${MAX_PLACES} locations. Remove one before adding another.`);return;}
 if(!validPoint({lat,lon})){toast('Choose a point between 85° south and 85° north.');return;}
 const id=`custom-${Date.now().toString(36)}-${(++serial).toString(36)}`;
 places.push({id,name:name||`Location ${places.length+1}`,lat,lon,hint,radius:0,tags:['custom']});choose(id,{fly:false});refreshValidation();
 if(innerWidth<=700)$('placeForm').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'nearest'});
}
function beginPlacement(){if(places.length>=MAX_PLACES)return;placing=true;selectedId=null;renderList();refreshForm();renderMarkers();$('editorMap').scrollIntoView({behavior:'smooth',block:'nearest'});toast('Click a new spot on the map to add a location.');}
function removeSelected(){const index=places.findIndex(p=>p.id===selectedId);if(index<0)return;places.splice(index,1);selectedId=places[Math.min(index,places.length-1)]?.id||null;placing=!places.length;renderList();refreshForm();renderMarkers();refreshValidation();}
function fitRoute(){
 if(!viewer||!mapReady)return;const valid=places.filter(validPoint);if(!valid.length)return;if(valid.length===1){focusPoint(valid[0]);return;}
 void viewer.flyTo([...markers.values()],{duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:1});
}
function downloadPack(){
 try{const pack=validatePack(currentPack()),blob=new Blob([JSON.stringify(pack,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='heydrop-route.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Route exported. Keep the JSON file as your copy.');}
 catch(error){routeError(error.message);}
}
async function importPack(file){
 if(!file)return;
 try{if(file.size>128*1024)throw Error('This file is too large. Route JSON files must be under 128 KB.');let value;try{value=JSON.parse(await file.text());}catch{throw Error('This file is not valid JSON. Choose an exported HeyDrop route.');}const pack=validatePack(value);places=pack.places;selectedId=places[0].id;placing=false;renderList();refreshForm();renderMarkers();refreshValidation();fitRoute();toast(`Imported ${places.length} locations. Your draft has been replaced.`);}
 catch(error){routeError(error.message);}
 finally{$('importFile').value='';}
}
function searchLandmarks(){
 const query=$('landmarkSearch').value.trim().toLocaleLowerCase('en');$('landmarkResults').replaceChildren();$('landmarkResults').hidden=query.length<2;if(query.length<2)return;
 const results=LANDMARKS.filter(place=>`${place.name} ${place.hint||''} ${(place.tags||[]).join(' ')}`.toLocaleLowerCase('en').includes(query)).slice(0,6);
 if(!results.length){const note=document.createElement('p');note.textContent='No matching landmarks. You can still pick any point on the map.';$('landmarkResults').append(note);return;}
 for(const place of results){const button=document.createElement('button');button.type='button';button.disabled=places.length>=MAX_PLACES;const name=document.createElement('strong'),hint=document.createElement('small');name.textContent=place.name;hint.textContent='Add to route';button.append(name,hint);button.addEventListener('click',()=>{addLocation(place.lat,place.lon,place.name,place.hint||'');focusPoint(selected());$('landmarkSearch').value='';$('landmarkResults').hidden=true;});$('landmarkResults').append(button);}
}
function mapFailure(message){$('mapStatus').hidden=false;$('mapStatus').classList.add('failed');$('mapStatusText').textContent=message;$('retryMap').hidden=false;}
async function initMap(){
 if(location.protocol==='file:')return;
 const C=window.Cesium;if(!C){mapFailure(window.editorBootError||'The map could not load. Check your connection and retry.');return;}
 try{
  C.Ion.defaultAccessToken='';viewer=new C.Viewer('editorMap',{baseLayer:false,baseLayerPicker:false,geocoder:false,animation:false,timeline:false,homeButton:false,navigationHelpButton:false,sceneModePicker:false,fullscreenButton:false,infoBox:false,selectionIndicator:false,requestRenderMode:true,maximumRenderTimeChange:Infinity,scene3DOnly:true,contextOptions:{webgl:{antialias:false}}});
  viewer.resolutionScale=Math.min(devicePixelRatio||1,1.5);viewer.scene.globe.baseColor=C.Color.fromCssColorString('#173755');viewer.scene.screenSpaceCameraController.enableTilt=false;viewer.scene.screenSpaceCameraController.enableLook=false;viewer.scene.screenSpaceCameraController.minimumZoomDistance=70;viewer.scene.screenSpaceCameraController.maximumZoomDistance=22000000;
  viewer.camera.setView({destination:C.Cartesian3.fromDegrees(10,30,14000000),orientation:{heading:0,pitch:-Math.PI/2,roll:0}});
  viewer.scene.renderError.addEventListener((_scene,error)=>mapFailure(`The map stopped rendering. ${error?.message||'Please retry.'}`));
  const source=await C.ArcGisMapServerImageryProvider.fromUrl('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',{enablePickFeatures:false});
  let errors=0;source.errorEvent.addEventListener(error=>{error.retry=error.timesRetried<1;if(++errors>=5)mapFailure('Satellite imagery is unavailable. Your route is safe; check your connection and retry.');});
  viewer.imageryLayers.addImageryProvider(source);mapReady=true;$('mapStatus').hidden=true;$('zoomIn').disabled=$('zoomOut').disabled=false;renderMarkers();refreshValidation({save:false});
  const handler=new C.ScreenSpaceEventHandler(viewer.scene.canvas);handler.setInputAction(event=>{
   const picked=viewer.scene.pick(event.position);if(!placing&&picked?.id&&markers.has(picked.id.id)){choose(picked.id.id,{fly:false});return;}
   const hit=viewer.camera.pickEllipsoid(event.position,C.Ellipsoid.WGS84);if(!hit)return;const geo=C.Cartographic.fromCartesian(hit),lat=C.Math.toDegrees(geo.latitude),lon=C.Math.toDegrees(geo.longitude);
   if(!validPoint({lat,lon})){toast('Choose a point between 85° south and 85° north.');return;}
   if(placing||!selected())addLocation(lat,lon);else{Object.assign(selected(),{lat,lon});renderList();refreshForm();renderMarkers();refreshValidation();}
  },C.ScreenSpaceEventType.LEFT_CLICK);
  if(places.length)fitRoute();else viewer.scene.requestRender();
 }catch(error){mapFailure(`The satellite map could not start. ${error?.message||'Check your connection and retry.'}`);}
}

$('addButton').addEventListener('click',beginPlacement);$('removeButton').addEventListener('click',removeSelected);$('viewPoint').addEventListener('click',()=>focusPoint(selected()));$('fitRoute').addEventListener('click',fitRoute);
$('routeList').addEventListener('click',event=>{const button=event.target.closest('button[data-action]');if(!button)return;const index=places.findIndex(p=>p.id===button.dataset.id);if(index<0)return;if(button.dataset.action==='select'){choose(button.dataset.id);return;}const other=index+(button.dataset.action==='up'?-1:1);if(other<0||other>=places.length)return;[places[index],places[other]]=[places[other],places[index]];renderList();refreshForm();renderMarkers();refreshValidation();$('routeList').querySelector(`[data-id="${button.dataset.id}"][data-action="${button.dataset.action}"]`)?.focus();});
$('placeForm').addEventListener('submit',event=>event.preventDefault());
for(const id of ['placeName','placeHint','placeLat','placeLon'])$(id).addEventListener('input',()=>{const place=selected();if(!place)return;place.name=$('placeName').value;place.hint=$('placeHint').value;place.lat=$('placeLat').value.trim()===''?NaN:Number($('placeLat').value);place.lon=$('placeLon').value.trim()===''?NaN:Number($('placeLon').value);renderList();refreshInstruction();if(id==='placeLat'||id==='placeLon')renderMarkers();refreshValidation();});
$('importButton').addEventListener('click',()=>$('importFile').click());$('importFile').addEventListener('change',()=>void importPack($('importFile').files[0]));$('exportButton').addEventListener('click',downloadPack);
$('playButton').addEventListener('click',()=>{try{const token=encodePack(currentPack()),url=new URL('./index.html',location.href);url.hash=new URLSearchParams({pack:token}).toString();location.assign(url.href);}catch(error){routeError(error.message);}});
$('landmarkSearch').addEventListener('input',searchLandmarks);$('retryMap').addEventListener('click',()=>location.reload());
$('zoomIn').addEventListener('click',()=>{if(viewer){viewer.camera.zoomIn(viewer.camera.positionCartographic.height*.45);viewer.scene.requestRender();}});$('zoomOut').addEventListener('click',()=>{if(viewer){viewer.camera.zoomOut(Math.max(50,viewer.camera.positionCartographic.height*.65));viewer.scene.requestRender();}});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&placing&&places.length){choose(places[0].id,{fly:false});toast('Pin placement cancelled.');}});
addEventListener('beforeunload',event=>{if(places.length&&$('exportButton').disabled){event.preventDefault();event.returnValue='';}});
restoreDraft();
const incoming=new URLSearchParams(location.hash.slice(1)).get('pack');if(incoming){try{const pack=decodePack(incoming);places=pack.places;selectedId=places[0].id;placing=false;}catch(error){toast(error.message);}}
renderList();refreshForm();refreshValidation({save:false});void initMap();
