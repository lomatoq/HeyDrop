"""Build the offline HeyDrop catalogue from the saved public UNESCO DataHub snapshot.
No network is required to reproduce this selection. Source facts are not imagery approval.
"""
from pathlib import Path
import json,re,html,math,collections,hashlib
ROOT=Path(__file__).resolve().parents[1]
source=json.loads((ROOT/'scripts/data/unesco-whc001-source.json').read_text(encoding='utf-8'))
LEGACY={'80','1533','86','252','668','445','603','326','95','394','83','91','404','661','483','174'}
# Explicit editorial selection of villages/smaller heritage settlements; no population claim.
SMALL=set('401 861 734 1324 1002 973 535 731 206 1367 890 993 124 618 983 611 781 741 873 55 1214 26 599 1658 479 762 974 942 1399 1055 1525 973 847 732 750 265 873 1310 522 1028 902 828 789 621 617 550 255 80 1533 95'.split())
ANCIENT=set('86 87 88 89 326 404 483 274 37 114 23 22 20 138 132 149 163 164 201 202 190 183 184 344 330 366 373 367 414 415 430 411 393 434 517 575 631 675 664 659 744 791 780 836 831 849 560 825 514 886 939 941 987 1006 989 481 1061 1135 1145 1192 1293 1336 1352 1363 1396 1405 1411 1444 1517 1502 1532 1587 1592 1593 1599 1631 1632 1662 1663 1667 1687 1700 1712 1718 1725 1744 13'.split())
SPECIAL={'274':('machu-picchu','Q676203'),'307':('statue-of-liberty','Q9202')}

def clean(value):return re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]+>','',value))).strip()
def tags(d):
 name=d['name_en'].lower();ident=d['id_no'];out=[]
 if d['category'] in ['Cultural','Mixed']:out+=['landmarks']
 if d['category'] in ['Natural','Mixed']:out+=['nature']
 if ident in ANCIENT or re.search(r'prehistor|pre-hispanic|roman (?:empire|theat|monument)|neolithic|megalith',name):out+=['ancient']
 if ident in SMALL:out+=['small-towns']
 if re.search(r'island|isle|isole|atoll|archipelago',name) or ident in ['307','80','394','1264','908','186','1']:out+=['islands']
 if re.search(r'coast|bay\b|lagoon|harbour|harbor|port town|maritime|reef|mangrove',name) or ident in ['307','95','394','80','26','599','451','741','1399','1055']:out+=['coastal']
 return list(dict.fromkeys(out or ['landmarks']))

def priority(d):
 n=d['name_en'].lower();score=0
 if d['id_no'] in SMALL:score+=90
 if d['id_no'] in ANCIENT:score+=60
 if re.search(r'castle|palace|cathedral|temple|monastery|abbey|mosque|fortress|pyramid|statue|tower|aqueduct|amphitheatre|opera house|garden|fort\b|sanctuary',n):score+=40
 if re.search(r'historic (?:centre|center)|old town|village|historic town',n):score+=25
 if re.search(r'island|volcano|waterfall|falls|crater|mount |mountain|canyon|reef',n):score+=15
 if re.search(r'serial|frontiers|routes|forests|protected areas|ecosystem|reserves|corridor',n):score-=55
 return (-score,clean(d['name_en']),int(d['id_no']))

valid=[];rejected=[]
for d in source:
 c=d.get('coordinates')
 if not c or not all(isinstance(c.get(k),(int,float)) and math.isfinite(c[k]) for k in ['lat','lon']) or abs(c['lat'])>85 or abs(c['lon'])>180 or (c['lat']==0 and c['lon']==0):
  rejected.append(d['id_no']);continue
 if d['id_no'] not in LEGACY:valid.append(d)
# Broad geographic spread through round-robin source regions, then recognizable site names.
byregion=collections.defaultdict(list)
for d in valid:byregion[d['region']].append(d)
for pool in byregion.values():pool.sort(key=priority)
selected={d['id_no']:d for d in valid if d['id_no'] in SMALL or d['id_no'] in SPECIAL}
while len(selected)<484:
 progressed=False
 for region in sorted(byregion):
  pool=byregion[region]
  while pool and pool[0]['id_no'] in selected:pool.pop(0)
  if pool and len(selected)<484:
   d=pool.pop(0);selected[d['id_no']]=d;progressed=True
 if not progressed:raise RuntimeError('Not enough coordinate records')
entries=[]
for ident,d in selected.items():
 c=d['coordinates'];e={'id':'whc-'+ident,'name':clean(d['name_en']),'lat':c['lat'],'lon':c['lon'],'sourceId':ident,'country':', '.join(d['states_names'] or []),'countryCode':d['iso_codes'] or '','region':d['region'],'category':d['category'],'tags':tags(d)}
 if ident in SPECIAL:
  key,q=SPECIAL[ident];point=json.loads((ROOT/('scripts/data/'+q+'.json')).read_text());coord=point['coordinates'][0]
  e.update(id=key,name=point['name'],lat=coord['latitude'],lon=coord['longitude'],coordinateSource=point['source'],coordinateScope='monument-point',coordinateLicense='CC0-1.0')
 entries.append(e)
entries.sort(key=lambda e:e['name'])
(ROOT/'src/catalogue-data.json').write_text(json.dumps(entries,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
report={'generatedEntries':len(entries),'legacyEntries':16,'total':len(entries)+16,'sourceRecords':len(source),'rejectedMissingOrInvalidCoordinates':rejected,'themeCounts':dict(collections.Counter(t for e in entries for t in e['tags'])),'regionCounts':dict(collections.Counter(e['region'] for e in entries)),'countries':len({country for d in selected.values() for country in (d['states_names'] or [])}),'imageryReview':'New records remain unreviewed; coordinate validation does not establish recognizable imagery.','sourceSha256':hashlib.sha256((ROOT/'scripts/data/unesco-whc001-source.json').read_bytes()).hexdigest()}
(ROOT/'scripts/data/catalogue-selection-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
