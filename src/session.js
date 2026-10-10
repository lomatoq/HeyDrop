export class GameSession {
 constructor(){this.reset();}
 reset(){this.index=0;this.results=[];this.route=null;this.rules=null;this.practice=false;this.started=false;}
 setRoute(route,rules){this.reset();this.route=route;this.rules={...rules};}
 get size(){return this.route?.length||5;}
 get finished(){return this.index===this.size-1;}
 record(round,score,distance){if(this.results[this.index])return false;this.results[this.index]={city:round.city,seed:round.seed,score,distance};}
 next(){if(this.finished)this.reset();else{this.index++;this.started=false;this.practice=false;}}
 get total(){return this.results.reduce((sum,r)=>sum+(r?.score||0),0);}
 get usedCities(){return this.results.filter(Boolean).map(r=>r.city);}
 get label(){return `Delivery ${this.index+1} / ${this.size} · ${this.total.toLocaleString('en-US')} points`;}
}
