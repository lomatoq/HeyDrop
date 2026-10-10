export const SCORE_ANCHORS = [[25,5000],[100,4500],[1000,3000],[100000,1400],[1000000,600],[10000000,50],[20100000,0]];
export function deliveryScore(distance,hard=false){
 const d=Math.max(0,Number.isFinite(distance)?distance:20100000);let accuracy=0;
 if(d<=25)accuracy=5000;
 else for(let i=1;i<SCORE_ANCHORS.length;i++){
  const [a,sa]=SCORE_ANCHORS[i-1],[b,sb]=SCORE_ANCHORS[i];
  if(d<=b){accuracy=Math.round(sa+(sb-sa)*Math.log(d/a)/Math.log(b/a));break;}
 }
 const score=hard?Math.round(accuracy*.75):accuracy;
 return {score,accuracy,penalty:accuracy-score,title:d<=25?'Special delivery!':d<=100?'Almost at the doorstep!':d<=1000?'In the neighborhood!':d<=20000?'In the local area!':d<=100000?'In the region!':'A long way from the address',
 explanation:`${accuracy.toLocaleString('en-US')} accuracy points${hard?` − ${accuracy-score} for landing without a parachute`:''}. A perfect delivery is within 25 m. Finding the area is the first step; the exact spot earns the full 5,000.`};
}
