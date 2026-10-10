import * as G from './geo-math.js';
import {clamp,smooth} from './simulation.js';
const $=id=>document.getElementById(id),C=window.Cesium;
const pop=t=>{t=clamp(t);const a=1.1;return 1+(a+1)*Math.pow(t-1,3)+a*Math.pow(t-1,2)};
const intersects=(a,b,pad=6)=>a.x<b.right+pad&&a.right>b.x-pad&&a.y<b.bottom+pad&&a.bottom>b.y-pad;
export class LandingReveal{
 constructor(){this.canvas=$('landingPath');this.ctx=this.canvas.getContext('2d');this.visible=false;const builder=new C.PinBuilder();$('landPinImage').src=builder.fromText('ГРУЗ',C.Color.fromCssColorString('#50c9b8'),74).toDataURL();$('targetPinImage').src=builder.fromText('ЦЕЛЬ',C.Color.fromCssColorString('#ef73a2'),74).toDataURL();this.resize();}
 resize(){this.w=innerWidth;this.h=innerHeight;const d=Math.min(devicePixelRatio||1,1.5);this.canvas.width=this.w*d;this.canvas.height=this.h*d;this.ctx.setTransform(d,0,0,d,0,0);}
 place(id,p,scale,alpha){const el=$(id);el.style.left=p.x+'px';el.style.top=p.y+'px';el.style.transform=`translate(-50%,-100%) scale(${Math.max(.001,scale)})`;el.style.opacity=String(alpha);}
 badgePosition(a,b,px,py,curve,close){
  const badge=$('mapDistance'),bw=badge.offsetWidth||76,bh=badge.offsetHeight||32,boxes=[];
  for(const id of close?['landPin']:['landPin','targetPin'])for(const child of $(id).children){const r=child.getBoundingClientRect();if(r.width>0&&r.height>0)boxes.push(r);}
  const card=$('result').getBoundingClientRect();if(card.width>0)boxes.push(card);
  const cx=(a.x+b.x)*.5,cy=(a.y+b.y)*.5;
  const candidates=close?[[a.x,Math.max(a.y,b.y)+34],[a.x+100,a.y-6],[a.x-100,a.y-6]]:[[cx+px*(curve+36),cy+py*(curve+36)],[cx-px*(curve+36),cy-py*(curve+36)]];
  candidates.push([cx,Math.max(a.y,b.y)+38],[cx,Math.min(a.y,b.y)-115]);
  for(const amount of [65,95,130])for(const sign of [-1,1])candidates.push([cx+px*amount*sign,cy+py*amount*sign]);
  let best=null,cost=Infinity;
  for(const [x0,y0]of candidates){const x=clamp(x0,bw*.5+12,this.w-bw*.5-12),y=clamp(y0,112+bh*.5,this.h-70-bh*.5);const rect={x:x-bw*.5,right:x+bw*.5,y:y-bh*.5,bottom:y+bh*.5};const penalty=boxes.reduce((n,b)=>n+(intersects(rect,b)?100000:0),0)+Math.hypot(x-cx,y-cy);if(penalty<cost){cost=penalty;best={x,y,rect};}}
  this.badgePlacement=best;return best;
 }
 update(s,world){
  const c=this.ctx;c.clearRect(0,0,this.w,this.h);
  const revealTime=s.landTime-(s.dropDuration||.86)+.86;
  const active=['land','result'].includes(s.phase)&&s.contact&&revealTime>1.65;
  this.visible=active;$('landingReveal').classList.toggle('hidden',!active);if(!active)return;
  const a=world.projectUnit(s.aim),b=world.projectUnit(world.round.answer);if(!a||!b)return;
  this.positions={land:{x:a.x,y:a.y},target:{x:b.x,y:b.y}};
  const sourceP=clamp((revealTime-1.65)/.4),targetP=clamp((revealTime-1.90)/.4),lineP=smooth(1.90,2.63,revealTime);
  const close=s.distance<35,dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,px=-dy/len,py=dx/len,curve=Math.min(30,len*.10);
  $('targetPin').style.display=close?'none':'flex';
  const landLabel=$('landPin').querySelector('span'),targetLabel=$('targetPin').querySelector('span');
  landLabel.textContent=close?'ПРАКТИЧЕСКИ В ЦЕЛЬ':'ТВОЯ ПОСЫЛКА';
  const near=!close&&len<170,shift=a.x>=b.x?32:-32;landLabel.style.transform=near?`translateX(${shift}px)`:'';targetLabel.style.transform=near?`translateX(${-shift}px)`:'';
  this.place('landPin',a,pop(sourceP),smooth(0,.25,sourceP));this.place('targetPin',b,pop(targetP),smooth(0,.25,targetP));
  // Endpoints remain the true game coordinates; the small bend improves readability.
  if(!close){const end=Math.max(1,Math.ceil(50*lineP)),points=[];for(let i=0;i<=end;i++){const t=Math.min(lineP,i/50);if(s.distance>250000){const pt=world.projectUnit(G.slerp(s.aim,world.round.answer,t));if(pt)points.push([pt.x,pt.y]);}else{points.push([a.x+dx*t+px*Math.sin(t*Math.PI)*curve,a.y+dy*t+py*Math.sin(t*Math.PI)*curve]);}}const draw=()=>{c.beginPath();c.moveTo(...points[0]);for(const p of points.slice(1))c.lineTo(...p);c.stroke();};c.lineCap='round';c.setLineDash([4,9]);c.strokeStyle='rgba(32,23,55,.45)';c.lineWidth=5;draw();c.strokeStyle='rgba(255,251,231,.96)';c.lineWidth=2.5;draw();c.setLineDash([]);}
  const badge=$('mapDistance');badge.textContent=s.distance>=1000?(s.distance/1000).toLocaleString('ru-RU',{maximumFractionDigits:s.distance<100000?2:0})+' км':Math.round(s.distance)+' м';
  const pos=this.badgePosition(a,b,px,py,curve,close);badge.style.left=pos.x+'px';badge.style.top=pos.y+'px';badge.style.opacity=String(smooth(2.3,2.7,revealTime));badge.style.transform=`translate(-50%,-50%) scale(${.86+.14*smooth(2.3,2.7,revealTime)})`;
 }
}
