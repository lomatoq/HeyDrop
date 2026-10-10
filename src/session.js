export class GameSession {
 constructor(){this.reset();}
 reset(){this.index=0;this.results=[];}
 record(round,score,distance){if(this.results[this.index])return false;this.results[this.index]={city:round.city,seed:round.seed,score,distance};}
 next(){if(this.index===4)this.reset();else this.index++;}
 get total(){return this.results.reduce((sum,r)=>sum+(r?.score||0),0);}
 get usedCities(){return this.results.filter(Boolean).map(r=>r.city);}
 get label(){return `Раунд ${this.index+1} / 5 · ${this.total.toLocaleString('ru-RU')} очков`;}
}
