import catalogue from './catalogue-data.json';
// Authored target centres, not random addresses. Radius is in metres.
// Sources describe the sites; coordinates target their visible satellite landmarks.
const LEGACY_LANDMARKS = [
 ['mont-saint-michel','Mont-Saint-Michel',48.6361,-1.5115,20,'An abbey on an island with a single causeway','80'],
 ['palmanova','Palmanova',45.9054,13.3092,40,'A town shaped like a nine-pointed star','1533'],
 ['giza','Pyramids of Giza',29.9792,31.1342,20,'Three pyramids where the desert meets the city','86'],
 ['taj-mahal','Taj Mahal',27.1751,78.0421,15,'A symmetrical garden beside a bend in the river','252'],
 ['angkor','Angkor Wat',13.4125,103.867,20,'A temple inside a rectangular moat','668'],
 ['brasilia','Brasilia',-15.7998,-47.8645,40,'The monumental axis of a city shaped like an airplane','445'],
 ['samarkand','Samarkand · Registan',39.6547,66.9758,15,'A square framed by three madrasas','603'],
 ['petra','Petra · Theater',30.3222,35.4467,15,'A stone amphitheater among desert canyons','326'],
 ['dubrovnik','Dubrovnik',42.6407,18.1105,25,'Old city walls on the Adriatic coast','95'],
 ['venezia-san-marco','Venice · St. Mark’s Square',45.4342,12.3388,15,'A square by the lagoon and a dense network of canals','394'],
 ['versailles','Versailles',48.8049,2.1204,20,'A palace and the geometry of an enormous park','83'],
 ['colosseum','Rome · Colosseum',41.8902,12.4922,15,'A stone oval among ancient city blocks','91'],
 ['acropolis','Acropolis of Athens',37.9715,23.7267,15,'Temples on a rocky hill within the city','404'],
 ['himeji','Himeji Castle',34.8394,134.6939,15,'A white castle, moats and concentric fortifications','661'],
 ['chichen-itza','Chichen Itza',20.6843,-88.5678,15,'A stepped pyramid in a jungle clearing','483'],
 ['florence','Florence · Duomo',43.7731,11.256,15,'A red dome amid tightly packed city blocks','174'],
].map(([id,name,lat,lon,radius,hint,unesco])=>({id,name,lat,lon,radius:0,hint,sourceId:unesco,source:`https://whc.unesco.org/en/list/${unesco}/`}));
const LEGACY_TAGS={
 'mont-saint-michel':['landmarks','small-towns','islands','coastal'],palmanova:['landmarks','small-towns'],giza:['landmarks','ancient'],
 'taj-mahal':['landmarks'],angkor:['landmarks'],brasilia:['landmarks'],samarkand:['landmarks'],petra:['landmarks','ancient'],
 dubrovnik:['landmarks','small-towns','coastal'],'venezia-san-marco':['landmarks','islands','coastal'],versailles:['landmarks'],
 colosseum:['landmarks','ancient'],acropolis:['landmarks','ancient'],himeji:['landmarks'],'chichen-itza':['landmarks','ancient'],florence:['landmarks']
};
export const CATALOGUE_PROVENANCE=Object.freeze({
 publisher:'UNESCO DataHub',dataset:'whc001',source:'https://data.unesco.org/explore/dataset/whc001/',
 license:'CC BY-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',retrieved:'2026-10-10',
 note:'Names and site coordinates from UNESCO DataHub; editorial selection and theme tags by HeyDrop. Imported imagery has not been individually reviewed. Machu Picchu and Statue of Liberty monument coordinates from Wikidata (CC0).'
});
export const LANDMARKS = [
 ...LEGACY_LANDMARKS.map(p=>({...p,tags:LEGACY_TAGS[p.id],coordinateStatus:'legacy-curated',coordinateScope:'monument-point',imageryStatus:'legacy-curated'})),
 ...catalogue.map(p=>({...p,radius:0,source:`https://whc.unesco.org/en/list/${p.sourceId}/`,hint:`${p.category} World Heritage site · ${p.country}`,
 coordinateSource:p.coordinateSource||CATALOGUE_PROVENANCE.source,coordinateStatus:'source-validated',coordinateScope:p.coordinateScope||'site-representative',imageryStatus:'unreviewed'}))
];
export const LOCATION_BY_ID = new Map(LANDMARKS.map(place=>[place.id,place]));
