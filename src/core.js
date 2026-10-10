import {LANDMARKS} from './locations.js';
// V10: input controls attitude and aerodynamic forces, never a target-seeking velocity.
export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const mix=(a,b,t)=>a+(b-a)*t;
export const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t)};
export const damp=(a,b,k,dt)=>mix(a,b,1-Math.exp(-k*dt));
export const TAU=Math.PI*2;
export const random=seed=>()=>{let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296};
export const CITIES=[['paris','Париж',48.8604,2.3343],['barcelona','Барселона',41.3891,2.1702],['warsaw','Варшава',52.233,21.0115],['amsterdam','Амстердам',52.3703,4.8936],['venice','Венеция',45.4345,12.3327],['rome','Рим',41.899,12.474],['london','Лондон',51.5067,-.1246],['lisbon','Лиссабон',38.7144,-9.1392],['tokyo','Токио',35.6862,139.7542],['nyc','Нью-Йорк',40.7342,-73.994],['sydney','Сидней',-33.8608,151.209],['rio','Рио-де-Жанейро',-22.9748,-43.1896],['chicago','Чикаго',41.8862,-87.6254],['singapore','Сингапур',1.299,103.853],['sanfrancisco','Сан-Франциско',37.7912,-122.4100],['copenhagen','Копенгаген',55.6781,12.5787],...LANDMARKS.map(p=>[p.id,p.name,p.lat,p.lon]) ];
export const WEATHER={fog:{label:'Туман',wind:3,gust:.10,cloud:.35,rain:0,fog:.8},clear:{label:'Солнечно',wind:2,gust:.06,cloud:.07,rain:0},cloudy:{label:'В облаках',wind:5,gust:.24,cloud:.48,rain:0},overcast:{label:'Сплошные облака',wind:7,gust:.38,cloud:.83,rain:0},rain:{label:'Дождь',wind:9,gust:.42,cloud:.62,rain:.7},storm:{label:'Гроза',wind:13,gust:.68,cloud:.76,rain:1},hurricane:{label:'Шквал',wind:18,gust:.95,cloud:.7,rain:.82}};
export class Spring{constructor(w=9,z=.82,v=0){this.w=w;this.z=z;this.value=v;this.velocity=0}step(target,dt,force=0){this.velocity+=(this.w*this.w*(target-this.value)-2*this.z*this.w*this.velocity+force)*dt;this.value+=this.velocity*dt;return this.value}reset(v=0){this.value=v;this.velocity=0}}
