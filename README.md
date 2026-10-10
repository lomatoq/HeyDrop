# HeyDrop · POST! — V17

![HeyDrop cover](assets/marketing/hey-drop-cover.png)

Remember a place, spin the Earth, and deliver a parcel to the exact spot. Five-stop themed routes, real satellite imagery, parachute flight, and a route editor. The game and editor are in English.

## Play and create

- Run `Start-HeyPals.cmd`, then open http://127.0.0.1:8797/.
- Open http://127.0.0.1:8797/editor.html to create a route. Click the map or search the catalogue, name the stop, arrange the order, and choose **Play route**. Share the generated link with friends.
- The editor saves a draft on this device and imports/exports JSON. A saved file holds up to 50 places; a playable link holds up to 20, subject to a URL size limit. No account or upload server is required.
- For a phone on the same Wi-Fi, run `Start-HeyPals-Mobile.cmd` and open `http://<this-PC-local-IP>:8798/`. Internet is needed for map imagery and libraries. Physical-phone testing remains outstanding.

## What's new

- **500 named places**, including Machu Picchu, the Statue of Liberty, villages, ancient sites, islands, and natural areas. Game settings show collections rather than revealing individual destinations.
- Collections: Ancient worlds (85), Small towns & villages (48), Famous landmarks (431), Islands (30), Wild places (85), Coasts & ports (15). Tags overlap; these are not additive totals.
- **Reproducible routes:** a shared seed selects all five built-in stops. Custom routes play in the author's order. Weather, lighting, timer, and parachute rules are fixed for the route.
- **Orbit inertia:** release velocity comes from the last 100 ms of dragging, coasts smoothly, and stops on regrab. Stationary finger jitter no longer cancels acceleration. Input is cancelled when switching between globe navigation and flight.
- **Clear scoring:** results explain accuracy and any parachute penalty. Final results list every delivery. Restarting an unfinished attempt records zero for that slot; a later practice attempt cannot replace it.
- **Map preparation:** the home screen warms the actual first route stop; results prepare the next address and both decoys within the existing background request budget. Decoy preparation batches every mip through level 17, retains close-up rings until the tour ends, and reuses decoded tiles. Continuous parent/child tile blending and predictive view-footprint prefetch remain in use.

## Catalogue quality and attribution

The catalogue contains 16 previously authored locations and 484 imported source records. All destination radii are zero: the parcel targets the stored point rather than a random nearby street. The imported source coordinates have been validated against their source records, but **the satellite image at every imported point has not been manually reviewed**. A UNESCO site coordinate can represent a large property rather than a single visible monument. The editor lets authors inspect and adjust exact playable targets.

Location names and site coordinates: UNESCO DataHub, World Heritage List (whc001), CC BY-SA 4.0. Selection, theme tags and game formatting adapted by HeyDrop. Machu Picchu and Statue of Liberty monument coordinates: Wikidata, CC0.

See [catalogue provenance](scripts/data/CATALOGUE-PROVENANCE.md), [source snapshots](scripts/data/) and [selection script](scripts/build-catalogue.py). The catalogue license applies to the adapted data; it is not a blanket license statement for the whole game. Imagery attribution remains visible in the game.

## Controls and scoring

Drag or flick the globe, or use WASD / arrow keys. In flight, drag and hold to steer; hold still to accelerate. Shift / Precision slows lateral steering. Space performs the current flight action. Esc pauses. A normal descent takes about 49.7 seconds; sustained acceleration reduces it to about 19.3 seconds. Seven weather presets and day/sunset/night lighting are available.

Search is untimed by default; the optional timer allows 24 seconds. The memory challenge includes two decoy views. A perfect delivery earns 5,000 points within 25 m. Intermediate scores use a continuous logarithmic curve:

| Distance | Accuracy points |
|---|---:|
| 25 m or less | 5,000 |
| 100 m | 4,500 |
| 1 km | 3,000 |
| 10 km | 2,200 |
| 100 km | 1,400 |
| 1,000 km | 600 |

Landing without a parachute reduces the accuracy score by 25%, shown separately. Shared routes currently support informal playtesting and comparing results, not a server-verified competitive leaderboard. No public community catalogue or account system is implemented.

## Development

`npm ci`, `npm run build`, `npm test`. `npm run test:browser` checks the flight mechanics; `node tests/routes-browser-v17.cjs` checks route integration, custom pack playback, rules, recovery, and small-screen layout. Browser tests use Chrome; the route test accepts `CHROME_PATH`.

`python package-release.py` builds `dist/HeyDrop-V17-itch.zip` with the game, editor, and data attribution. `index.html` and `editor.bundle.js` are generated files. Edit the source and rebuild. The production game does not enable its QA controls unless opened with `?qa`.

| Module | Responsibility |
|---|---|
| `simulation.js`, `planet-input.js` | Flight state, controls, gesture ownership and inertia |
| `routes.js`, `session.js`, `scoring.js` | Collections, deterministic itineraries, attempts and scoring |
| `locations.js`, `catalogue-data.json` | Sourced locations and editorial tags |
| `custom-pack.js`, `editor.js` | Validated portable routes and map editor |
| `flight-frame.js`, `globe.js`, `cargo.js` | Shared camera frame and rendering |
| `tile-cache.js`, `map-transitions.js`, `texture-dissolve.js` | Image cache, preparation and LOD blending |
| `atmosphere.js`, `effects.js`, `audio.js` | Weather and flight feedback |

## Publishing status

Source and downloadable builds are published in https://github.com/lomatoq/HeyDrop. The itch.io page is https://lomatoq.itch.io/heydrop, currently restricted. Its English description and cover are saved; the V17 playable ZIP is uploaded and browser startup was verified on itch.io. Mobile-friendly fullscreen launch and password access are enabled. GitHub Actions builds a ZIP artifact; automatic itch deployment is not configured.

V17 is a playtest build. Automated checks are not evidence that every catalogue location is visually good or that the game performs well on every physical phone.
