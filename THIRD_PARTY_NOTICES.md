# V15 — third-party components and asset provenance

## Game artwork

The wooden parcel, its panels, straps, label, suspension lines and 12-panel canopy are newly authored procedural geometry/materials in src/cargo.js. No third-party hand mesh, skeleton, skin weights or motion-capture animation is loaded in V15. The earlier V11 hand assets remain in their original separate version.

The HeyDrop logo and postal-paper SVG texture in assets/ui are original authored vector artwork. The label is drawn into a canvas at runtime. No font binaries are included in the release.

## Libraries

Three.js 0.180.0 (MIT), including RoundedBoxGeometry and RoomEnvironment:
https://github.com/mrdoob/three
https://threejs.org/docs/pages/RoundedBoxGeometry.html

CesiumJS 1.133 (Apache-2.0):
https://github.com/CesiumGS/cesium
https://cesium.com/downloads/cesiumjs/releases/1.133/Build/Cesium/

Phosphor Icons 2.1.1 (MIT):
https://github.com/phosphor-icons/core

Nunito is loaded via Google Fonts. Font files are not packaged:
https://fonts.google.com/specimen/Nunito

## Imagery

Daytime satellite/aerial imagery is streamed from Esri World Imagery:
https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer
Credits supplied by the imagery provider remain visible. A publicly accessible endpoint is not a claim of unrestricted commercial redistribution rights; production use needs a provider-terms review.

Night imagery is the NASA/NOAA VIIRS CityLights 2012 composite, streamed through NASA GIBS:
https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_CityLights_2012/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg

This is historical low-resolution night-light imagery, not current weather or nighttime photographs of individual buildings. At low altitude daytime imagery receives stylized blue shading and sparse warm contrast-derived highlights, explicitly labelled as artistic lighting in the UI. These highlights are not measured street lights.

## Process references

The existing game-studio instructions read for this pass were three-webgl-game, game-ui-frontend and game-playtest. These are workflow guidance, not a separate graphics engine or a guarantee of subjective quality.
