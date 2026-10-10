// Screen hold and drag are mutually exclusive; releasing a hold never picks a new point.
export function bindPlanetInput(app) {
 const area=document.getElementById('globe');
 let pointer=null,last=null,start=null,moved=0,holding=false,dragging=false,holdTimer=null;
 const active=()=>app.ready&&!app.paused&&!app.modal&&app.sim.isActive();
 const falling=()=>['entry','freefall','opening','canopy'].includes(app.sim.s.phase);
 const stopHold=()=>{clearTimeout(holdTimer);holdTimer=null;app.surfaceBoost=false;};
 const reset=()=>{stopHold();pointer=null;last=start=null;holding=dragging=false;app.sim.s.dragging=false;app.flightDrag={x:0,y:0};};
 const release=e=>{
  if(pointer===null||e&&e.pointerId!==pointer)return;
  const click=!holding&&!dragging&&moved<8&&start&&e?.type==='pointerup';
  reset();
  if(click&&active()&&!falling()){const p=app.world.pickAt(e.clientX,e.clientY);if(p){app.sim.pick(p.lat,p.lon);app.lastClick={...p};app.flashPick(e.clientX,e.clientY);}}
 };
 area.addEventListener('pointerdown',e=>{
  if(!active()||pointer!==null||e.button>0)return;
  pointer=e.pointerId;area.setPointerCapture(pointer);start=last={x:e.clientX,y:e.clientY};moved=0;holding=dragging=false;
  app.sim.seek=null;app.sim.s.turnX=app.sim.s.turnY=0;
  if(falling())holdTimer=setTimeout(()=>{if(pointer!==null&&active()&&falling()&&!dragging){holding=true;app.surfaceBoost=true;}},220);
  e.preventDefault();
 });
 area.addEventListener('pointermove',e=>{
  if(e.pointerId!==pointer||!active())return;
  const dx=e.clientX-last.x,dy=e.clientY-last.y;moved+=Math.hypot(dx,dy);
  if(moved>10){dragging=true;stopHold();if(falling()){app.sim.s.dragging=false;const radius=72;let x=(e.clientX-start.x)/radius,y=(e.clientY-start.y)/radius;const len=Math.hypot(x,y);if(len>1){x/=len;y/=len;}app.flightDrag={x,y};}else{app.sim.s.dragging=true;const scale=app.world.pixelScale()*app.sim.config.sensitivity*(app.input().brake?.25:1);app.sim.drag(dx,dy,scale);}}
  last={x:e.clientX,y:e.clientY};e.preventDefault();
 });
 area.addEventListener('pointerup',release);
 area.addEventListener('pointercancel',e=>{if(e.pointerId===pointer)reset();});
 area.addEventListener('lostpointercapture',e=>{if(e.pointerId===pointer)reset();});
 area.addEventListener('wheel',e=>{if(!active())return;e.preventDefault();if(falling())return;const unit=e.deltaMode===1?16:e.deltaMode===2?innerHeight:1;app.sim.scroll(e.deltaX*unit,e.deltaY*unit,app.world.pixelScale(),e.shiftKey);},{passive:false});
 area.addEventListener('contextmenu',e=>e.preventDefault());
 for(const button of document.querySelectorAll('[data-rotate]')){const [x,y]=button.dataset.rotate.split(',').map(Number);button.onpointerdown=e=>{if(!active())return;button.setPointerCapture(e.pointerId);app.pad={x,y};};button.onpointerup=button.onpointercancel=button.onlostpointercapture=()=>app.pad={x:0,y:0};}
 const go=document.getElementById('chute');let buttonStarted=0,buttonPhase='',suppressClick=false;
 go.onclick=()=>{if(suppressClick){suppressClick=false;return;}if(!active())return;app.sim.deploy();};
 go.onpointerdown=e=>{if(!active())return;buttonStarted=performance.now();buttonPhase=app.sim.s.phase;suppressClick=false;if(['entry','freefall'].includes(buttonPhase)){app.boost=true;go.setPointerCapture(e.pointerId);}};
 const releaseButton=e=>{if(app.boost){suppressClick=e.type!=='pointerup'||performance.now()-buttonStarted>200||buttonPhase!==app.sim.s.phase;}app.boost=false;};
 go.onpointerup=go.onpointercancel=go.onlostpointercapture=releaseButton;
 app.cancelGesture=()=>{reset();app.boost=false;suppressClick=true;app.pad={x:0,y:0};};
}
