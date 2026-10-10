# HeyDrop location catalogue: sources, license and review status

## Attribution to display with the game

Location names and site coordinates: UNESCO DataHub, World Heritage List (whc001), CC BY-SA 4.0. Selection, theme tags and game formatting adapted by HeyDrop. Machu Picchu and Statue of Liberty monument coordinates: Wikidata, CC0.

Dataset: https://data.unesco.org/explore/dataset/whc001/
License: https://creativecommons.org/licenses/by-sa/4.0/
Wikidata license: https://www.wikidata.org/wiki/Wikidata:Licensing
Monument records: https://www.wikidata.org/wiki/Q676203 and https://www.wikidata.org/wiki/Q9202

## Data license

The imported UNESCO DataHub facts and the adapted catalogue data in src/catalogue-data.json are distributed under Creative Commons Attribution-ShareAlike 4.0 International. Credit UNESCO, link the dataset and license, identify the changes, and retain the same license when redistributing adapted catalogue data. The two Wikidata coordinate substitutions are CC0. This notice concerns the data; it does not relicense the application code or satellite imagery.

The source's explicit dataset license field says CC BY-SA 4.0 and links the license above. Its description also links the WHC website's syndication terms, which contain different restrictions. Both are preserved in unesco-whc001-metadata.json so this ambiguity is visible, not silently represented as an unconditional permission from the website. This import uses the DataHub dataset's explicit CC license, not the WHC XML syndication feed. No UNESCO photographs, logos or descriptive paragraphs have been imported.

## Reproduction and provenance

Retrieved 2026-10-10 from the official API:
https://data.unesco.org/api/explore/v2.1/catalog/datasets/whc001/exports/json?select=id_no%2Cname_en%2Ccoordinates%2Ccategory%2Cstates_names%2Ciso_codes%2Cregion

- unesco-whc001-source.json: unmodified selected fact fields, 1,273 records.
- unesco-whc001-metadata.json: publisher and license metadata saved from the official API.
- Q676203.json and Q9202.json: Wikidata monument coordinate facts and source identifiers.
- catalogue-selection-report.json: counts, rejected coordinate records, source checksum.
- ../build-catalogue.py: deterministic offline selection; run python scripts/build-catalogue.py.

The app contains 500 entries: 16 existing authored targets retained with compatible IDs and 484 new sourced records. Source selection balances five UNESCO regions and prioritizes named monuments, archaeological places and specifically selected smaller settlements. Themes are editorial game categories inferred from names and a documented whitelist; they are not UNESCO classifications, population claims or a strict periodization of history. The small-towns theme includes villages and smaller historic settlements; no live population threshold is claimed.

## Coordinate and imagery quality

All 500 targets use radius 0: selection never jitters away from a source point. New source coordinates are checked for finite latitude/longitude, supported map range, identity and exact agreement with the saved source. These checks do NOT establish that a roof, entrance or landmark is visible at every chosen coordinate. UNESCO points can represent extensive or serial properties. Those records carry coordinateScope: site-representative and imageryStatus: unreviewed. The 16 previous targets retain legacy-curated status, not a new claim of comprehensive imagery approval.

Machu Picchu uses the Wikidata citadel coordinate rather than UNESCO's broader sanctuary reference point. Statue of Liberty uses the Wikidata statue coordinate. They carry coordinateScope: monument-point but still require imagery review like the other new records.

An editor should preview a new point, move it to the recognizable feature if needed, and record review before calling a pack imagery-verified. The application must not advertise all 500 as visually checked.
