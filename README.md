# HeyDrop · POST! — V16 prototype

![HeyDrop cover](assets/marketing/hey-drop-cover.png)

Remember an address, find it again on a spinning Earth, and deliver a parcel from the sky.

`index.html` is the current V16 build. `baseline-v13.html`, `baseline-v14.html`, and `baseline-v15.html` preserve earlier versions for comparison. This is a playable prototype for evaluating flight feel, not a claim of release readiness.

## Run locally

- **Desktop:** run `Start-HeyPals.cmd`, then open [the local game](http://127.0.0.1:8797/).
- **Phone on the same Wi-Fi network:** run `Start-HeyPals-Mobile.cmd`, then open `http://<computer-local-IP>:8798/`. Keep the server window open. Your network and firewall must allow the connection.
- **Requirements:** Node.js and an internet connection for Cesium, Three.js, fonts, and satellite imagery. Opening the HTML file directly does not start the required Web Workers.
- **Development:** run `npm ci`, then `npm run build`.
- **Tests:** run `npm test`; with the local server running, run `npm run test:browser`. Browser tests use installed Chrome. The main smoke test supports `CHROME_PATH`.

The launcher filenames retain their original HeyPals names.

## How to play

Study the destination and its surroundings, locate it on the globe, and send the parcel. A session has five deliveries, worth up to 25,000 points. Replaying a round is practice: the score from the first attempt remains. Continuing after the fifth result starts a new session. Search is untimed by default; settings can enable a 24-second selection limit.

By default, the camera visits two decoy locations for about two seconds each after showing the destination. All three are shown from 900 metres. Flights between them are continuous. If imagery is not ready, the game waits up to three seconds, then skips that stop. Settings also offer a mode without decoys.

Drag the globe, use WASD or the arrow keys, or use the on-screen stick. During flight, dragging applies steering rather than moving the map directly; releasing removes that input. Tapping during flight no longer moves the parcel to a selected point.

The delivery button begins descent. Holding the button or an empty part of the screen smoothly accelerates the fall. Releasing a hold neither selects a location nor opens the parachute. You can open the canopy below 1,700 metres and release the parcel below 300 metres. Automatic canopy deployment is enabled by default. Pausing stops the simulation.

A normal automatic descent takes about 50 seconds; sustained acceleration reduces it to about 19 seconds. The final drop duration depends on release height. Audio and visual effects share one motion signal, and the canopy updates once per rendered frame.

## Locations

The catalogue contains 32 places: 16 original cities and 16 landmarks with small random landing areas. The landmarks are Mont-Saint-Michel, Palmanova, Giza, the Taj Mahal, Angkor Wat, Brasília, Registan, Petra, Dubrovnik, St Mark's Square, Versailles, the Colosseum, the Acropolis, Himeji Castle, Chichén Itzá, and Florence Cathedral.

Coordinates, visual clues, and UNESCO source links are in `src/locations.js`. Landmark coordinates are hand-authored; satellite coverage and image quality vary.

## Architecture

| Responsibility | Source |
|---|---|
| Phases, coordinates, speed, and landing | `src/simulation.js` |
| Memory distraction route | `src/memory-route.js` |
| Clouds, night treatment, and atmospheric effects | `src/atmosphere.js`, `src/effects.js` |
| Five-round scoring and replays | `src/session.js` |
| Locations and sources | `src/locations.js` |
| Pacing and loading budgets | `src/tuning.js` |
| Decoded tiles, priorities, retries, and eviction | `src/tile-cache.js` |
| Cesium imagery adapter | `src/imagery-cache.js` |
| Globe, camera, and destination imagery readiness | `src/globe.js` |
| Shared camera projection and local world frame | `src/flight-frame.js` |
| Gradual imagery refinement | `src/map-transitions.js`, `src/texture-dissolve.js` |
| Cargo rendering and visual inertia | `src/cargo.js` |
| Pointer input, touch, and hold acceleration | `src/planet-input.js` |
| Application integration and UI | `src/main.js`, `src/style.css`, `index.template.html` |

The simulation owns gameplay state. Cargo animation springs do not change the landing location. In V16, Cesium and Three share a camera projection and a local coordinate frame. Cargo size and position follow that common projection. The raised canopy and suspended crate form one rig; the released crate follows the simulation's height toward the selected ground point.

Loading allows up to eight active requests, including at most two background requests. Visible tiles promote an existing request's priority. Both imagery layers share deduplication. Cancelled preparation cannot pin data from an old round again. The cache holds at most 420 decoded images and 160 parent fragments; Cesium's GPU cache is separate. Round readiness checks the prepared destination imagery rather than geometry detail. If the network fails, the player can explicitly continue with the available map.

`FrameMetrics` records raw frame intervals, including stalls, before simulation-step clamping. Loading statistics separate queue time from time to a decoded image; they do not isolate network transfer or GPU upload time.

## Measurements and validation

The V13/V14 comparison used local headless Chrome at 1280×800, seed 7241, Barcelona, with separate browser contexts:

| Metric | V13 | V14 |
|---|---:|---:|
| Destination preparation after starting | 9.55 s | 1.33 s |
| Tile requests by destination readiness | 830 | 73 |
| Background route | 811 tiles | 41 tiles |
| Automatic descent through result | 105.57 s | 49.73 s |
| p95 frame interval during the test flight | 20.8 ms | 16.7 ms |

These results describe one repeatable scenario, not guaranteed frame rates on every phone. Headless measurements do not replace physical-device testing. The satellite service and the connection remain external constraints.

Historical reports are in `tests/v14/performance.json` and `tests/v14/smoke.json`. `tests/domain-v14.cjs` covers 1,584 deterministic landmark rounds, timed and untimed search, landing, scoring, request deduplication, priorities, and preparation cancellation. `tests/recovery-touch-v14.cjs` covers failed detail tiles and touch scrolling in panels. Screenshots are stored in `tests/v14` and `tests/cargo`.

V15 validation covered smooth hold acceleration, bounded waiting for decoy imagery, mobile settings, and 15 weather/viewport combinations without shader errors. Supporting research is in `research/v15-game-design.md`, `research/v15-graphics.md`, and `research/v15-ui.md`.

V16 shared-camera validation covers 1440×900, 390×844, 320×568, and 844×390. The same world points project in Cesium and Three within 0.1 pixel. The release camera stays fixed while the cargo follows simulation height. The two canvases do not share a depth buffer; the current scene uses a surface without 3D buildings.

The V15/V16 comparison recorded 2,880 frame samples over eight short runs of the same route. Warm startup was 560/556 ms; cold startup was 1,405/821 ms. Cold startup depends on the network and does not establish a general speed improvement. Both versions made 61 requests before destination readiness. No sampled frame exceeded 50 ms. These desktop headless results do not establish phone performance.

Current validation commands include `npm test`, `npm run test:browser`, `node tests/cargo-shared-camera.cjs`, and `node tests/graphics-v15.cjs`. The shared-camera test supersedes the older cargo perspective test for V16.

## Visual treatment and remaining checks

Clouds use the Earth's surface and actual camera. Wind affects the flight path. Fog and weather change visibility during descent without hiding the destination during memorisation. At high altitude, night mode uses VIIRS imagery. Close to the surface, it uses an artistic darkening and warm accents over daytime imagery, not photographs of streets at night. The HeyDrop logo, POST! sticker, and paper texture are compact original SVG assets.

A manual playtest on a physical iPhone and Android device is still needed; Safari has not been validated. Map service terms need review before commercial deployment. The texture transition adapter uses Cesium 1.133 internals and has a simpler fallback. Upgrade Cesium together with the relevant visual regression checks.

Sources include the [Cesium Globe API](https://cesium.com/learn/cesiumjs/ref-doc/Globe.html), [UNESCO: Palmanova and the Venetian defensive works](https://whc.unesco.org/en/list/1533/), [Mont-Saint-Michel](https://whc.unesco.org/en/list/80/), and [Brasília](https://whc.unesco.org/en/list/445/). Further links are in the location catalogue. See `THIRD_PARTY_NOTICES.md` for licences and attribution.

## Packaging and private testing

`npm run pack` creates `dist/HeyDrop-V16-itch.zip`, containing `index.html` at the root, two runtime SVG assets, and attribution. It is intended for upload as an HTML game on itch.io with browser play enabled. For a private test, select Restricted access and set your own password. Internet access is required for externally hosted libraries, fonts, and satellite imagery. See itch.io's [HTML5 upload guide](https://itch.io/docs/creators/html5) and [access control guide](https://itch.io/docs/creators/access-control).

- Repository: [lomatoq/HeyDrop](https://github.com/lomatoq/HeyDrop)
- Test ZIP release: [V16 prototype](https://github.com/lomatoq/HeyDrop/releases/tag/v16-prototype)
- Restricted itch.io page: [HeyDrop](https://lomatoq.itch.io/heydrop)

GitHub Actions validates and packages the game on pushes to `main`. Automatic itch.io deployment is not configured.

The itch.io page has been created with Restricted visibility. **The HTML archive has not yet been uploaded, and the password has not been set.** The browser extension requires permission to access local files, and the owner must enter the password. The embedded game will not run on itch.io until the ZIP is uploaded.

Players can already copy a link to a specific destination and its settings. Synchronous rooms, a shared spectator view, and an ePals API are not implemented. A possible next step is a reproducible round sequence shared through a session code, followed by server-side scoring and rooms. The simulation can then remain common to the browser version and future mobile wrappers.
