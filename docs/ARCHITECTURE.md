# Florida Storm — ARCHITECTURE.md
### Technical specification for parallel implementation by seven engineers

*Version 1.1 — 2026-09-02 (revised after the architecture critique; the delta is in `docs/state-changelog.md`). Companion: `docs/DESIGN.md` (the experience and every threshold; §16 is the frozen ID registry). Research: `docs/research/meteorology.md` (M), `florida-home.md` (H), `tech-3d.md` (T), `audio-devices.md` (A). Stack: Three.js r170 (ES modules from npm, `three/addons/*`), Vite 6, plain JavaScript ES modules with JSDoc, plain DOM/CSS, Web Audio, `speechSynthesis`, `node --test`, `playwright-core` + Chromium SwiftShader for headless screenshots. No TypeScript, no UI framework, no asset files.*

This document is the contract. Seven engineers own seven directories (§1); the schema (§3), the update order (§4), the event list (§5) and the module APIs (§6) are frozen at the end of week 1 and change only through `docs/state-changelog.md` with the core owner's sign-off. Every module can be built and tested against the **stub storm** (§14.2) from day 2 without talking to anyone.

---

## 0. Laws of the codebase

1. **One state tree, one writer per slice.** `SimState` (§3) is a plain object graph owned by `core/`. Each top-level slice has exactly one writing module; everyone else reads. In debug mode non-owned slices are wrapped in `Proxy` objects that throw on write (`core/guard.js`), so a violation is a stack trace, not a review comment.
2. **Cross-slice writes go through owner-provided setters** (`house.api.*`, `utilities.api.*`, `devices.api.*`, …, §6). The interaction system never assigns into another module's slice.
3. **Continuous things are state; discrete things are events.** Wind speed is state. "The transformer blew" is a bus event emitted once by the owner that detected the edge. Nobody polls for edges in another slice.
4. **Two clocks** (DESIGN §2.3): sim time for the storm/house/utility models; real time for turbulence's fast processes, audio, animation, the player, the pet. Failure integrals use the deterministic envelopes and 10-sim-minute buckets so results are warp-exact.
5. **Deterministic by construction.** All randomness comes from `core/rng.js` streams forked by name from the scenario seed; `Math.random` is banned by a lint grep in CI; **the storm, utilities, house and hood advance together in fixed 5-sim-second sub-steps**; nothing that is hashed may read a real-time field (`uInst`, `uG3`, `dirInstDeg`, `windLoadPa`, `mesovortex`, `player.*`); a state hash is logged every 60 sim-seconds and on every bus event in headless mode and two runs must match. Render-side systems (the debris field, wobble, particles) are cosmetic and write no state.
6. **Budgets are contracts** (§10): each module's file header states its JS-ms, draw-call, triangle and audio-node budgets; CI asserts the structural ones.
7. **Never add or remove lights at runtime; toggle intensity.** **`render/` owns every `THREE.Light`; `world/` registers fixture descriptors only.** The compiled set (hemi, ambient, sun, 8 pooled points, the flashlight spot, ≤ 4 rect lights) exists after `init` and is never changed; both power states are pre-compiled at load. A shader recompile at the outage is the worst possible hitch, and CI asserts that no `Light` is constructed after `init`.
8. **Ledgers have one owner** (DESIGN §6.12): water in `utilities.water`, fridge and pool in `house`, breakers/fuel in `utilities`, phone and radio batteries in `devices`, hand-light batteries in `objects`. `objects.*` holds placement, carry, open/on and nothing that another module integrates.
9. **Text is the source of truth for speech.** Subtitles always (`ui.api.subtitle`, unbudgeted); `speechSynthesis` is decoration; the seven literary captions (`ui.api.caption`) are a separate, budgeted channel.

---

## 1. Folder layout and ownership (seven engineers; a directory has exactly one owner)

```
/src
  main.js                              E1   bootstrap: menu → app; quality detection; window.__sim
  core/                                E1   state.js schema.js guard.js events.js bus.js clock.js sleep.js rng.js
                                            loop.js input.js quality.js save.js debug.js hash.js
  player/                              E1   controller.js collision.js doors.js interact.js carry.js
  objects/                             E1   catalog.js behaviours/*.js (one file per object family)
  life/                                E1   pet.js neighbours.js wildlife.js
  details/                             E1   engine.js catalogue.js (the 180 predicates of DESIGN §12)
  scenario/                            E1   tasks.js chapters.js endings.js presets.js
  storm/                               E2   holland.js track.js bands.js turbulence.js rain.js light.js thermal.js
                                            flood.js lightning.js forecast.js sun.js cues.js predict.js stub.js index.js
  house/                               E3   structure.js openings.js garage.js cage.js roof.js intrusion.js
                                            pressure.js thermal.js co.js ledgers.js api.js index.js
  utilities/                           E3   power.js generator.js cell.js water.js media.js county.js api.js index.js
  hood/                                E3   houses.js trees.js transformers.js debrisSources.js debris.js (the impact model)
                                            dressing.js (state → prop pose table of DESIGN §4.2) index.js   (simulation side)
  world/                               E4   plan.js build/{walls,floors,roof,openings,shutters,props}.js props/*.js
                                            neighbourhood.js vegetation.js terrain.js colliders.js roomOf.js registry.js
  textures/                            E4   noise.js normal.js tiler.js stucco.js drywall.js tile.js wood.js shingle.js
                                            soffit.js concrete.js asphalt.js turf.js screen.js fabric.js metal.js decals.js
  render/                              E5   renderer.js sky.js lighting.js exposure.js rain.js glass.js fog.js
                                            vegetationWind.js debris.js (cosmetic field, reads hood.impactQueue) structureFx.js waterFx.js decalsFx.js
                                            powerLights.js transformerFlash.js lightning.js flashlight.js camera.js
                                            animation.js (doors, fans, shutters, pet, neighbours) post.js sync.js
  audio/                               E6   context.js buffers.js buses.js occlusion.js facades.js wind.js rain.js
                                            drips.js structure.js impacts.js thunder.js machines.js outage.js
                                            biophony.js ears.js tones.js same.js wea.js speech.js speakers.js mix.js
  devices/                             E7   phone/{ui,lock,messages,weather,radar,cone,station,outage,ring,camera,settings}.js
                                            tv/{channel,segments,crawl,eas,meteorologist}.js nwr.js console.js
                                            barometer.js thermostat.js ups.js modem.js screens.js (DeviceScreen base)
  alerts/                              E7   scheduler.js products.js wea.js nwr.js tv.js texts.js index.js
  content/                             E7   advisories.js hls.js eww.js tor.js weaTexts.js crawl.js meteorologist.js
                                            texts.js journalLines.js neighbourLines.js
  ui/                                  E7   hud.js prompts.js captions.js menus.js setup.js pause.js timeControls.js
                                            scrubBar.js sleepDialog.js journal.js chapters.js endCard.js styles.css
/test
  core/*.test.js storm/*.test.js house/*.test.js utilities/*.test.js alerts/*.test.js
  audio/*.test.js details/*.test.js    (owner = module owner; harness by E1)
/scripts
  screenshots.mjs scenarios.json soak.mjs lint-random.mjs budgets.mjs     E1
/docs
  DESIGN.md ARCHITECTURE.md audit.md state-changelog.md research/*
```

| Owner | Role | Owns (writes) | State slices written |
|---|---|---|---|
| **E1 core** | integration lead; loop, clock, bus, RNG, guard, harness; player & interaction; objects; pet/neighbours; details engine; tasks/chapters/endings | `main.js core/ player/ objects/ life/ details/ scenario/ scripts/ test/` harness | `meta clock player objects life tasks details log debug` |
| **E2 storm** | the physics: Holland, track, bands, turbulence, rain, light, thermal, flood, lightning, forecast, cues, predictions, the stub | `storm/` | `storm local cues` |
| **E3 house** | house structure/water/thermal/CO, utilities (power, generator, cell, water, media, county), neighbourhood simulation | `house/ utilities/ hood/` | `house utilities hood` |
| **E4 world** | plan, procedural geometry, props, neighbourhood geometry, vegetation geometry, terrain, colliders, roomOf, canvas textures/materials, fixture *descriptors* (no lights) | `world/ textures/` | none (builds scene objects; exposes registries) |
| **E5 render** | renderer, sky, lighting (owns every `THREE.Light`), exposure, rain, glass, fog, vegetation wind, the cosmetic debris field, structure/water/decal FX, power lights, flashes, camera, animation sync, post | `render/` | none (reads state; emits nothing that the sim consumes — `debug:screenshotReady` only) |
| **E6 audio** | the Web Audio graph, tones, SAME/WEA, speech manager | `audio/` | none |
| **E7 devices** | phone/TV/NWR/console screens, the alerts scheduler and products, all content, HUD/menus/journal/end card | `devices/ alerts/ content/ ui/` | `alerts devices` |

Shared read-only contracts, frozen end of week 1: `core/schema.js` (E1), `core/events.js` (E1), `storm/cues.js` outputs (E2), `world/plan.js` (E4), **the ID registry of DESIGN §16** (object ids, socket ids, fixture ids, prop mesh ids, `extra` keys, impact surfaces, tiers — exported as `core/ids.js` by E1 and asserted against `objects/catalog.js` and `world/registry.js` in CI), `scenario/presets.js` (E1 with E2). A schema change requires a `docs/state-changelog.md` entry and E1's sign-off; consumers are updated by their owners in the same week.

---

## 2. Coordinate conventions

| Item | Convention |
|---|---|
| Units | metres, seconds, m/s, hPa, mm/h, °C, lux, degrees (compass) in state; radians only inside shaders. |
| World axes | Three.js: **+X east, +Y up, +Z south** (right-handed: east × up = south). |
| Origin | the north-west corner of the slab at finished-floor level: `(0, 0, 0)`. Slab spans `x ∈ [0, 14.0]`, `z ∈ [0, 19.8]`. Street to the east (x > 21.6); pond to the west (x < −20). Grade −0.30 at the slab edge; street crown −0.45; swale −0.80; pond −1.5. |
| Compass | azimuth θ clockwise from north: `dir(θ) = (sin θ, 0, −cos θ)`. North = −Z, east = +X. `dirFromDeg` is the meteorological "from" direction; the air moves toward `dirFromDeg + 180`. `windToward = dir(dirFromDeg + 180) · speed`. |
| Storm frame | `storm/` works in km ENU with the **house centre** `(7.0, 9.9)` as the origin: `xE` east, `yN` north. Position angle `phiDeg` of the house relative to the centre is math convention (CCW from east). Conversion to world (only `render/debris.js` and the radar need it): `worldX = 7.0 + 1000·xE`, `worldZ = 9.9 − 1000·yN`. |
| Façade sectors | 8 sectors of 45° centred on N, NE, E, SE, S, SW, W, NW; index `sector = round(θ/45) mod 8`. Façade normals: N 0°, E 90°, S 180°, W 270°. |
| Time | `simTime` seconds since 2026-09-02T00:00:00−04:00; `tRel` hours relative to `T0` (136 800 s = Thu 14:00 on the reference; `T0 = dayStart(0) + landfallHour·3600` in general). Sun position from lat **27.21° N, lon 82.47° W**, UTC−4 (solar noon 13:30; sunset ≈ 19:45; sunrise ≈ 07:12; civil dawn ≈ 06:45 — `storm.api.sunAt()` is the only authority and emits `storm:sunset` / `storm:sunrise` / `storm:civilDawn`). `clock.dayIndex = floor((simTime − dayStart(0))/86400)` with `dayStart(0)` the midnight beginning the landfall day (Thu = 0, Fri = 1 …); `clock.isNight = sun.elDeg < −6`. |
| Wind uniform | `render/` owns one `Vector4 uWind = (toward.x·uInst, 0, toward.z·uInst, realTime)` shared by every wind-driven material (T §1). |
| Rooms | `roomOf(point)` (E4) returns a `roomId` from DESIGN §3.3 or `'lanai' | 'cage' | 'outside' | 'nguyenFoyer'`. |

---
## 3. The single state tree — `core/schema.js` (JSDoc typedefs; the frozen contract)

Every field below exists at startup with a valid default (no `undefined`); numbers are finite; arrays are pre-sized. A field's owner is the slice owner in §1. Fields marked *real* advance with real time; everything else with sim time.

```js
/** @typedef {Object} SimState
 *  @property {Meta}      meta       // E1 core/state.js
 *  @property {Clock}     clock      // E1 core/clock.js
 *  @property {Storm}     storm      // E2 storm/index.js
 *  @property {Local}     local      // E2 storm/index.js — conditions at the house this tick
 *  @property {Cues}      cues       // E2 storm/cues.js — derived scalars (DESIGN §5.2)
 *  @property {House}     house      // E3 house/index.js
 *  @property {Utilities} utilities  // E3 utilities/index.js
 *  @property {Hood}      hood       // E3 hood/index.js
 *  @property {Alerts}    alerts     // E7 alerts/index.js
 *  @property {Devices}   devices    // E7 devices/*.js (one file per key)
 *  @property {Player}    player     // E1 player/controller.js
 *  @property {Object<string, ObjectState>} objects   // E1 objects/catalog.js
 *  @property {Life}      life       // E1 life/*.js
 *  @property {Tasks}     tasks      // E1 scenario/tasks.js
 *  @property {Details}   details    // E1 details/engine.js
 *  @property {JournalLine[]} log    // E1, appended only via core.api.journal()
 *  @property {Debug}     debug      // E1 core/debug.js
 */

/** @typedef {Object} Meta
 *  @property {string} stormName        // 'Leah'
 *  @property {string} basinId          // 'AL122026'
 *  @property {string} presetId         // 'leah-ref' | 'compact-cat4' | 'large-cat2' | 'slow-cat1' | 'nearmiss-cat3' | 'cat5'
 *  @property {number} seed             // uint32
 *  @property {'auto'|'low'|'high'} quality
 *  @property {boolean} headless
 *  @property {HouseOptions} options
 *  @property {string} schemaVersion    // '1.0'
 */
/** @typedef {Object} HouseOptions
 *  @property {boolean} bracedGarageKitInstalled @property {boolean} impactWindows
 *  @property {'overhead'|'underground'} service @property {boolean} generatorOwned
 *  @property {'dog'|'cat'|'none'} pet @property {boolean} canalFront
 *  @property {number} landfallHour @property {number} trackOffsetKm @property {number} forwardSpeedKmh
 *  @property {'standard'|'full'|'highlights'|'custom'} pacing
 */

/** @typedef {Object} Clock
 *  @property {number} simTime          // s since 2026-09-02T00:00−04:00
 *  @property {number} realTime         // s since app start (real)
 *  @property {number} tRel             // h relative to T0 = 136800 s
 *  @property {number} dtSim            // this frame's sim seconds (after clamping)
 *  @property {number} dtReal           // this frame's real seconds (clamped ≤ 0.1)
 *  @property {number} speed            // effective dtSim/dtReal this frame
 *  @property {number|null} requestedSpeed   // 1|3|12|60|300 or null = auto
 *  @property {boolean} autoPace
 *  @property {string} tier             // 'prep'|'gap'|'band'|'ts'|'hurricane'|'eyewall'|'eye'|'subsiding'|'aftermathDay'|'aftermathNight'|'moment'|'hold'|'carry'|'device'
 *  @property {number} momentSlowUntilReal   // realTime; 0 if none
 *  @property {string|null} momentId
 *  @property {boolean} sleeping @property {number} sleepUntilSim @property {string|null} sleepTarget
 *  @property {boolean} paused
 *  @property {StormPhase} phase        // mirror of local.phase from the previous frame (hysteretic)
 *  @property {number} phaseSinceSim
 *  @property {number} dayIndex         // floor((simTime − dayStart0)/86400); Thu = 0, Fri = 1 …
 *  @property {number} dayStart0        // simTime of the midnight beginning the landfall day
 *  @property {number} hour             // local clock hour (0–23.99), for the two calendar-keyed items only
 *  @property {boolean} isNight         // sun.elDeg < −6
 *  @property {number} startSim         // the scenario's start (preset-dependent, DESIGN §1.1)
 *  @property {number|null} firstLightSim   // first civil dawn after phase == aftermath, once known
 */
/** @typedef {'prep'|'bands'|'ts'|'hurricane'|'eyewallFront'|'eye'|'eyewallBack'|'hurricaneBack'|'subsiding'|'aftermath'} StormPhase */

/** @typedef {Object} Storm
 *  @property {{xE:number, yN:number}} centre   // km, house centre at origin
 *  @property {number} headingDeg @property {number} vtMs
 *  @property {number} vmaxMarineMs                 // current (decays after landfall)
 *  @property {number} vmaxLandfallMs @property {number} pcHpa @property {number} pnHpa
 *  @property {number} rmwM @property {number} B
 *  @property {boolean} overLand @property {number|null} landfallSim
 *  @property {{px:number, py:number, nx:number, ny:number}} coast   // a point and the landward unit normal, km ENU
 *  @property {Band[]} bands
 *  @property {number} rKm @property {number} phiDeg    // house relative to centre, math convention
 *  @property {number|null} approachDirDeg              // 10-min dirFrom recorded when phase first became 'ts'
 *  @property {Forecast} forecast                       // the latest issued forecast (truth + error)
 *  @property {TrackPoint[]} track                      // truth track samples every 1 h, for the radar/cone history
 *  @property {{eyeEntered:boolean, eyeExited:boolean, reversalFired:boolean}} flags
 */
/** @typedef {Object} Band
 *  @property {string} id @property {'eyewall'|'principal'|'outer'} kind
 *  @property {number} r0M @property {number} widthM @property {number} intensity
 *  @property {number} omegaDegPerH @property {number} extentDeg @property {number} phaseDeg
 *  @property {number} cellPeriodM @property {number} cellAmp @property {number} kSpiral
 */
/** @typedef {Object} Forecast
 *  @property {number} issuedSim @property {number} advisoryNumber
 *  @property {{leadH:number, xE:number, yN:number, vmaxKt:number, pcHpa:number, coneNmi:number}[]} points  // leads 0,12,24,36,48,60,72
 *  @property {number} errorDirDeg @property {number} shiftKm     // displacement of the 24-h point vs the previous forecast
 */
/** @typedef {{simTime:number, xE:number, yN:number, vmaxMs:number, pcHpa:number}} TrackPoint */

/** @typedef {Object} Local
 *  @property {number} uMarine                                      // Holland+asymmetry before exposure (Saffir–Simpson value)
 *  @property {number} uMean @property {number} u1m @property {number} uGustEnv @property {number} uStruct
 *  @property {number} uInst @property {number} uG3                 // real
 *  @property {number} dirFromDeg @property {number} dirInstDeg     // dirInstDeg real
 *  @property {number} pHpa @property {number} dPdtHpaPerH
 *  @property {number} rainMmPerH @property {number[]} rainWallMmPerH   // 8 sectors, incl. the 0.1·R lee term
 *  @property {number} rainAngleDeg @property {number} rainTotalMm @property {number} rainRecentMm   // last 3 h
 *  @property {number} bandRain @property {number} bandWind          // bandWind from non-eyewall bands only (1.0–1.5)
 *  @property {number} bandFrontM                                    // distance to the nearest approaching band's leading edge; 1e6 if none
 *  @property {number} tAirC @property {number} tdC @property {number} rhOut
 *  @property {number} illumLux @property {number} visibilityM @property {number} cloudFrac @property {number} cloudBaseM
 *  @property {number} eyeFactor @property {number} reversal
 *  @property {{distM:number, azDeg:number, simTime:number}|null} lightning   // the most recent flash (≤ 2 s old) else null
 *  @property {number} lightningRatePerMin
 *  @property {number} surgeM @property {number} swaleWaterM @property {number} streetWaterM @property {number} pondRiseM
 *  @property {{azDeg:number, elDeg:number}} sun
 *  @property {StormPhase} phase @property {number} rKm @property {number} phiDeg
 *  @property {number} mesovortex          // real; 0 or the current excursion fraction
 */

/** @typedef {Object} Cues
 *  @property {number} windLoadPa            // real (uInst²) — cosmetic consumers only
 *  @property {number} windLoadEnvPa         // sim (uGustEnv²) — every hashed consumer
 *  @property {number} roar @property {number} whistle @property {number} debrisRate   // debrisRate from uGustEnv
 *  @property {number[]} leakRate            // 8 sectors, L/h = roof.atticWaterL[i]/τ_attic
 *  @property {number} pushForceN @property {number} earPop @property {number} powerHazard
 *  @property {number} eyeFactor @property {number} reversal
 *  @property {number} heatIndexC @property {number} heatIndexOutC @property {number} wetness
 */

/** @typedef {Object} House
 *  @property {Object<string, Opening>} openings         // ids of DESIGN §3.4
 *  @property {Object<string, Door>} doors               // ids of DESIGN §3.5 (+ exterior doors mirror open/latched here)
 *  @property {GarageDoor} garageDoor @property {Cage} cage @property {Roof} roof
 *  @property {{pInsideHpa:number, pAtticHpa:number, dpRoomPa:Object<string, number>}} pressure   // dpRoomPa from windLoadEnvPa (sim)
 *  @property {{tInC:number, rhIn:number, tdInC:number, hvacOn:boolean, fanOn:boolean, sealed:number, tTargetC:number}} thermal
 *  @property {Object<string, CeilingLeak>} ceilingLeaks  // lp_* ids of DESIGN §3.6
 *  @property {Object<string, FloorWater>} floorWater     // keyed by opening id (thresholds/tracks) and lp id (drip puddles)
 *  @property {number[]} soffitIntegral                   // 8 sectors, mm·h of wall rain above 200
 *  @property {Fridge} fridge @property {Pool} pool        // ledgers (DESIGN §6.12)
 *  @property {number} coPpm @property {Object<string, number>} coPpmByRoom @property {number} coDose   // ppm·min above 100 at the player's room
 *  @property {number|null} eyeStartSim                   // simTime of storm:eyeEnter
 *  @property {number} mildew @property {number} damageScore
 */
/** @typedef {Object} Opening
 *  @property {string} id @property {'window'|'peep'|'slider'|'door'|'garage'|'screen'} kind
 *  @property {'N'|'E'|'S'|'W'} wall @property {number} facadeDeg @property {number} sector
 *  @property {boolean} shuttered @property {number} shutterProgress @property {number} fastening   // 0..1
 *  @property {number} panelsPlaced @property {number} panelsNeeded @property {boolean} braced
 *  @property {number} open @property {boolean} latched @property {boolean} locked
 *  @property {number} sandbagM @property {number} towelsL
 *  @property {number} bowEnvM                              // sim-time bow from windLoadEnvPa (hashed); render adds the wobble
 *  @property {1|2|3|4|0} intrusionTier                     // 0 none, 1 track/door, 2 sill, 3 soffit, 4 deck
 *  @property {boolean} failed @property {string|null} failCause @property {number} hazardAcc
 */
/** @typedef {{id:string, open:number, targetOpen:number, latched:boolean, locked:boolean, ripped:boolean, hingeSide:'L'|'R', swingInto:string, slamCount:number}} Door */
/** @typedef {{open:number, braced:boolean, pumpAmpEnv:number, load:number, threshold:number, buckled:boolean, failed:boolean, failedSim:number|null}} GarageDoor */
/** @typedef {Object} Cage
 *  @property {{id:string, nDeg:number, roof:boolean, torn:boolean, tornSim:number|null, threshold:number}[]} panels  // 24; bulge is render-side
 *  @property {0|1|2|3|4|5} stage @property {number} structThreshold @property {number} foldProgress
 *  @property {boolean} doorLatched @property {boolean} doorGone @property {number} stageSim
 */
/** @typedef {{shingleLoss:number[], deckExposed:boolean, anemometerAlive:boolean, anemometerLastGust:number, atticWaterL:number[]}} Roof   // shingleLoss per slope N,E,S,W; atticWaterL per façade sector (8), the reservoir of DESIGN §6.6 */
/** @typedef {{id:string, room:string, sector:number, active:boolean, activeSince:number|null, rateLph:number, tier:0|1|2|3, litresDelivered:number, stainM2:number, unbucketedH:number, sag:number, collapsed:boolean, bucket:string|null, bucketL:number}} CeilingLeak */
/** @typedef {{id:string, room:string, litres:number, poolM2:number}} FloorWater */
/** @typedef {{open:boolean, coldest:boolean, iceMakerOn:boolean, frozenBags:number, freezerReserveH:number, fridgeReserveH:number, coldReserveH:number, openCount:number, purged:boolean, smell:number, iceDumped:boolean}} Fridge */
/** @typedef {{levelM:number, valveOpen:boolean, pumpOn:boolean, pumpBurnt:boolean, colour:number, overtopping:boolean}} Pool */

/** @typedef {Object} Utilities
 *  @property {Power} power @property {Generator} generator @property {Water} water
 *  @property {Cell} cell @property {Media} media @property {County} county
 */
/** @typedef {Object} Power
 *  @property {boolean} on @property {number} hazardE @property {number} hazardEFail @property {boolean} brownout
 *  @property {number} flickerCount @property {number} lastFlickerSim @property {number|null} lostSim
 *  @property {number} hoursSinceOutage                     // 0 while on
 *  @property {number|null} restoredSim @property {number} restoreScheduledSim @property {boolean} transformerFlashed
 *  @property {'transformer'|'feeder'|null} cause @property {number[]} flickerThresholdsCrossed
 *  @property {{main:boolean, ac:boolean, waterHeater:boolean, poolPump:boolean, range:boolean, garage:boolean, kitchen:boolean, bedrooms:boolean, lights:boolean}} breakers
 */
/** @typedef {{placement:'none'|'garage'|'lanai'|'driveway', running:boolean, fuelL:number, cansL:number[], hoursRun:number, circuits:string[], pullAttempts:number, startedSim:number|null}} Generator */   // circuits ⊂ ['fridge','fan','tv','chargers','lamp','router']
/** @typedef {{fillL:number, capacityL:number, tapOn:boolean, drainTaped:boolean}} WaterContainer */
/** @typedef {Object} Water
 *  @property {number} pressure @property {number|null} plantLostSim
 *  @property {Object<string, WaterContainer>} containers   // tubHall 150, tubMaster 210, washer 60, jug_1..6 3.8, pots 2×8, bottles 24×0.5
 *  @property {number} storedL                               // Σ containers (derived each sub-step)
 *  @property {number} usedL @property {number} heaterWarmL
 *  @property {boolean} boilNotice @property {number|null} boilIssuedSim @property {number|null} boilLiftedSim
 */
/** @typedef {Object} Cell
 *  @property {'LTE'|'LTE2'|'LTE1'|'SOS'|'NONE'|'1X'} state
 *  @property {boolean} towerOn @property {number} towerBatteryH @property {number|null} towerLostGridSim @property {number|null} towerDarkSim
 *  @property {boolean} dataOn @property {boolean} smsOn        // smsOn === towerOn; WEA deliverable === towerOn
 *  @property {number|null} restoreSim @property {number} cowSim @property {number} lte1Sim @property {number} normalSim
 *  @property {Message[]} outbox @property {Message[]} held @property {boolean} sosSeen
 */
/** @typedef {{id:string, thread:string, from:string, text:string, sentSim:number, deliveredSim:number|null, failed:boolean, read:boolean, photo:string|null, isWea:boolean}} Message */
/** @typedef {{cableOn:boolean, nodeLostSim:number|null, wifiOn:boolean, antennaOk:boolean, landlineOn:boolean}} Media */
/** @typedef {{outageFraction:number, curfew:boolean, curfewSinceSim:number|null, restoreFraction:number, podOpen:boolean, cowUp:boolean, trafficLightsOn:boolean}} County */

/** @typedef {Object} Hood
 *  @property {Object<string, HoodHouse>} houses         // 'nguyen','bergstrom','ray','marcus','denise','bulb1','bulb2','boatguy'
 *  @property {Object<string, Tree>} trees               // 'queen1','queen2','sabal1','foxtail','rayOak','bergQueen1','bergQueen2','bergFicus',...
 *  @property {Object<string, Transformer>} transformers // 'sandpiperW' (mirrors utilities.power), 'sandpiperE', 'bulb', 'egret', 'pond' (DESIGN §4.1)
 *  @property {boolean} cableNodeDown @property {boolean} streetlightsOn @property {boolean} fountainOn
 *  @property {boolean} stopSignBent @property {boolean} mailboxGone
 *  @property {Impact[]} impactQueue                     // this bucket's scheduled impacts, sorted by simTime (DESIGN §6.15)
 *  @property {{propId:string, pose:string, pos:number[], class:string, simTime:number}[]} grounded   // settled large debris → poses of DESIGN §4.2
 *  @property {number} debrisPileM3 @property {number} damage       // 0..1 aggregate neighbourhood damage (feeds debrisRate)
 */
/** @typedef {{id:string, pos:number[], houses:string[], hazardE:number, hazardEFail:number, failed:boolean, failedSim:number|null, flashed:boolean}} Transformer */
/** @typedef {{simTime:number, surface:string, class:string, energyJ:number, pos:number[], fired:boolean}} Impact */   // surface ∈ DESIGN §6.15
/** @typedef {{id:string, shuttered:boolean, shuttering:boolean, evacuated:boolean, shingleLoss:number, deckExposed:boolean, garageFailed:boolean, garageFailedHalf:'front'|'back'|null, cageStage:number, genOn:boolean, genSchedule:[number,number][]|null, tarp:boolean, lastDark:boolean, lightsOn:boolean, plywoodFlown:boolean, ringOn:boolean, flagUp:boolean, trampolineGone:boolean, boatRolled:boolean, liftTilted:boolean, powerOn:boolean}} HoodHouse */
/** @typedef {{id:string, kind:'queen'|'sabal'|'foxtail'|'royal'|'oak'|'ficus'|'hedge', pos:number[], bend:number, frondLoss:number, limbsLost:number, fallen:boolean, fallDirDeg:number, fallSim:number|null}} Tree */

/** @typedef {Object} Alerts
 *  @property {Advisory[]} advisories @property {Product[]} active @property {Object<string, number>} issued   // productId → simTime
 *  @property {Product[]} weaLog @property {Product[]} nwrQueue @property {string[]} tvCrawl
 *  @property {number} nextAdvisorySim @property {number} nextIntermediateSim @property {boolean} tcuHourly @property {boolean} torWatch
 */
/** @typedef {{number:number, issuedSim:number, kind:'full'|'intermediate'|'tcu', text:string, forecast:Forecast, shiftKm:number}} Advisory */
/** @typedef {Object} Product
 *  @property {string} id @property {'HUW'|'SSW'|'TOA'|'TOR'|'HLS'|'EWW'|'FFW'|'CEM'|'HEAT'|'EYE'} kind
 *  @property {number} issuedSim @property {number} expiresSim @property {string} sameHeader @property {boolean} wat
 *  @property {string} nwrText @property {string|null} weaText @property {boolean} weaDelivered @property {string|null} crawlLine
 *  @property {boolean} moment
 */

/** @typedef {Object} Devices
 *  @property {Phone} phone @property {TV} tv @property {TV} tvKitchen @property {NWR} nwr @property {Console} console
 *  @property {{alive:boolean, display:string}} thermostat @property {{onBattery:boolean, beeping:boolean, minutesLeft:number, unplugged:boolean}} ups
 *  @property {{power:boolean, ds:boolean, us:boolean, online:boolean}} modem
 */
/** @typedef {Object} Phone
 *  @property {number} battery @property {boolean} screenOn @property {boolean} up @property {string} app
 *  @property {boolean} wifi @property {Object<string, Message[]>} threads @property {number} unread
 *  @property {Product[]} alertHistory @property {Product|null} weaActive @property {string[]} gallery
 *  @property {boolean} flashlight @property {boolean} lowPowerPrompted @property {boolean} onSurface @property {number[]} pos
 *  @property {boolean} alertsEnabled @property {{lastFrameSim:number, stale:boolean}} radar @property {string|null} ringLastClip
 */
/** @typedef {{on:boolean, channel:5|7|9|0, volume:number, muted:boolean, contentKey:string, segment:string, macroblock:number, noSignal:boolean, easActive:boolean, antenna:boolean}} TV */
/** @typedef {{on:boolean, state:'OFF'|'STANDBY'|'ALERT'|'WEATHER'|'BATTERY', volume:number, channel:number, batteryH:number, sameActive:boolean, currentProduct:string|null, eventList:{code:string, sim:number}[], hiss:number, backlightUntilReal:number, pos:number[], room:string}} NWR */
/** @typedef {Object} Console
 *  @property {number} wind @property {number} gust @property {number} gustHigh @property {number} gustHighSim @property {number} dirDeg
 *  @property {number} pHpa @property {number} pInHg @property {'upup'|'up'|'flat'|'down'|'downdown'} trend @property {boolean} stormIcon
 *  @property {Float32Array} pHistory        // 288 × 5-min samples (24 h)
 *  @property {number} rainRate @property {number} rainTotal @property {number} tIn @property {number} rhIn
 *  @property {number} tOut @property {number} rhOut @property {number} tdOut @property {boolean} outdoorOnline @property {boolean} backlight
 */

/** @typedef {Object} Player
 *  @property {number[]} pos @property {number} yaw @property {number} pitch
 *  @property {string} room @property {boolean} outdoors @property {boolean} crouching @property {boolean} sprinting
 *  @property {boolean} down @property {number} downSinceReal @property {number} injury   // coDose lives in house.coDose
 *  @property {string} yardSector                       // 'frontYard'|'backYard'|'driveway'|'street'|'' — for the impact hit roll
 *  @property {boolean} inLee                           // downwind of the house within 6 m
 *  @property {{id:string, count:number}|null} carrying @property {Object<string, number>} pockets
 *  @property {boolean} helmet @property {boolean} shoes @property {number} earsMuffled @property {boolean} flashlightOn
 *  @property {boolean} phoneUp @property {boolean} sleeping @property {number} wet @property {string|null} lookingAt
 *  @property {number} speedMul @property {string|null} holdingVerb @property {number} holdProgress
 */
/** @typedef {{id:string, kind:string, room:string, pos:number[], rotY:number, state:string, on:boolean, open:boolean, fill:number, secured:boolean, socket:string|null, count:number, battery:number, extra:Object<string, number|string|boolean>}} ObjectState */   // ids, kinds and the permitted `extra` keys: DESIGN §16.1; no integrated ledgers here (Law 8)

/** @typedef {Object} Life
 *  @property {Pet} pet
 *  @property {Object<string, {id:string, visible:boolean, where:string, said:Object<string, boolean>}>} neighbours
 *  @property {{frogs:number, crickets:number, birds:number, cicadas:number, mosquitoes:number, buzzards:number, flockActive:boolean}} wildlife
 */
/** @typedef {{kind:'dog'|'cat'|'none', state:'sleep'|'watch'|'alert'|'hide'|'panic'|'carried'|'leashed'|'eye'|'eat', pos:number[], targetPos:number[], fear:number, fearTarget:number, panicUntilReal:number, lastSeenSim:number, observed:boolean, fedCount:number, walkedCount:number, panting:number}} Pet */
/** @typedef {{list:{id:string, title:string, phase:'prep'|'aftermath', done:boolean, doneSim:number|null, progress:number}[]}} Tasks */
/** @typedef {{fired:Object<string, number>, firedHashed:Object<string, number>, captionsUsed:number, lastEvalSim:number}} Details */   // firedHashed excludes entries tagged [P]/[R]/[S] (DESIGN §12)
/** @typedef {{simTime:number, text:string, kind:'event'|'player'|'alert'|'detail'}} JournalLine */
/** @typedef {{frameMs:Object<string, number>, drawCalls:number, triangles:number, programs:number, textureBytes:number, hash:string, nanPaths:string[]}} Debug */
```

---

## 4. The frame: update order, clocks, sub-steps, flush points

```
 1  input.poll()                                E1   → ctx.input (intents; never state)
 2  clock.update()                              E1   tier (auto-pace, moment, hold, carry, device), sleep, dtSim = clamp(speed·dtReal)
 3–6 SIM BLOCK, sub-stepped together (core/loop.js owns the accumulator; fixed 5-sim-s sub-steps, max 200/frame;
     beyond that the clock clamps dtSim to 1000 s). For each sub-step h = 5 s:
 3     storm.step(h)                            E2   track, intensity, field, bands, rain, light, thermal, flood, lightning → storm, local (sim fields), cues
 4     utilities.step(h)                        E3   power (hazard integral, flickers, outage, restoration), generator, cell, water, media, county
 5     house.step(h)                            E3   loads, 10-min bucket rolls, intrusion ladder + attic reservoir, leaks, pressure, thermal, CO, fridge/pool ledgers
 6     hood.step(h)                             E3   neighbour houses, trees, transformers, cable node, debris sources, THE IMPACT MODEL (emits hood:debrisImpact)
       (during sleep / headless advance: bus.flushSim() after every sub-step so an interrupting event ends the sleep at
        this exact sub-step; in normal play the sim-block events are queued and delivered at step 8)
     then storm.updateRealtime(dtReal)          E2   the real-time turbulence stack (uInst, uG3, dirInstDeg, mesovortex) and cues.windLoadPa/roar/whistle
 7  alerts.update(dtSim)                        E7   advisory schedule, forecast, condition products, WEA gating, NWR queue, crawl (per frame; reads the sim block's final state)
 8  bus.flush()                                       ← events from 3–7 delivered now, in emission order
 9  life.update(dtSim, dtReal)                  E1   pet FSM (real-time motion, sim-time needs), neighbours, wildlife densities
10  player.update(dtReal) + interact.update()   E1   capsule physics, wind push, doors, raycast, holds; calls owner setters only
11  objects.update(dtSim)                       E1   object placement/carry/open/on states and hand-light batteries ONLY (Law 8 — no fills, fuel, cold reserve)
12  tasks.update(); details.update(4 Hz); scenario.update()   E1   task predicates, catalogue predicates, chapters, endings
13  devices.update(dtSim, dtReal)               E7   phone battery/banks/threads/WEA, TV segments, NWR state machine + batteries, console
14  bus.flush()                                       ← events from 9–13
15  render.update(dtReal)                       E5   sync scene from state; the cosmetic debris field (reads hood.impactQueue, emits nothing);
                                                      light-pool allocation; effects; renderer.render()
16  audio.update(dtReal)                        E6   parameter smoothing (setTargetAtTime), stochastic one-shots ≤ 300 ms ahead, event one-shots
17  ui.update()                                 E7   DOM ≤ 4 Hz except prompts/captions/progress ring
18  debug.sample(); hash every 5 sim-s in headless
```

Rules:

- **`dtReal`** is clamped to 0.1 s (tab switches). **`dtSim = speed·dtReal`**, additionally clamped so that ≤ 200 sim sub-steps run per frame (1000 sim-s); sleep runs the loop with rendering, audio and UI suspended and `speed ≤ 3600` (60 sim-s = 12 sub-steps per iteration at 60 Hz).
- **The sim block is one accumulator** (`core/loop.js`): `storm.step`, `utilities.step`, `house.step`, `hood.step` are called in that order for every 5-s sub-step, so every hazard integral, every bucket-max and every reservoir sees the same 5-s samples at 1× and at 3600×. Cost: 12 sub-steps at 60×, 200 at ≥ 1000× (§10). `alerts` runs per frame because its products are minute-granular.
- **Reads happen after writes for the frame**: a module that needs a previous-frame value keeps it privately (e.g. `render/` keeps last `power.on` to detect nothing — it listens to `power:lost` instead).
- **Bus semantics** (`core/bus.js`): `bus.on(name, fn)`, `bus.off`, `bus.emit(name, payload)` queues `{name, simTime, realTime, ...payload}`; `bus.flush()` delivers queued events synchronously in order; an event emitted *during* a flush is queued for the next flush (no re-entrancy). Two flushes per frame (steps 8 and 14). **During sleep and headless advance** the loop calls `bus.flushSim()` after every sub-step — it delivers only to *sim-side* listeners (`storm`, `utilities`, `house`, `hood`, `alerts`, `clock`, `devices`) and lets `clock/sleep.js` end the sleep at the exact sub-step; the remaining listeners get the same events at the next step 8/14 flush. Nothing is emitted from step 15 any more.
- **Warp exactness**: sim-time models may only use `dtSim`, `uGustEnv`, `uStruct`, `u1m`, `dirFromDeg`, `windLoadEnvPa` and other sim-time fields; slow processes (thermal, batteries, tub fill, cold reserve, the attic reservoir) advance analytically over the sub-step; failure rolls use the bucket rule (§8.1). The unit test in §13.4 enforces this for every slice in the sim block.
- **Two clocks** in `storm/turbulence.js`: the 180-s OU process steps with `dtSim` inside the sim block; the 2.5-s and 20-s processes, the direction jitter (τ 8 s) and mesovortex events step with `dtReal` at a fixed 60-Hz sub-step accumulator in `storm.updateRealtime`. `uInst`, `uG3`, `dirInstDeg`, `mesovortex` are the only real-time fields in `local`; `windLoadPa`, `roar`, `whistle`, `pushForceN` the only real-time cues.
- **Phase detection** lives in `storm/index.js` (writes `local.phase`); the clock mirrors it with hysteresis one frame later.
- During **sleep**: steps 2–8 and 11–13 run; 9–10 and 15–17 are skipped; `devices` accumulates messages; the first interrupting event (§5, column *wake*) ends the sleep at the sub-step where it fired. **Every wake event is emitted inside the sim block** (storm, utilities, house, hood, alerts) — nothing in the wake column comes from `life`, `render` or `audio`.

---

## 5. The event bus — every event, payload, emitter, and who listens

Names are frozen in `core/events.js` as constants (`EV.POWER_LOST = 'power:lost'`). Payload fields are in addition to `{simTime, realTime}`. **M** = moment (drops to 1× for 20 real s). **W** = interrupts sleep.

| Event | Payload | Emitter → typical listeners | M | W |
|---|---|---|---|---|
| `clock:phase` | `{from, to}` | clock → ui, audio, scenario, details | | |
| `clock:tier` | `{from, to, speed}` | clock → ui, render (particle scaling) | | |
| `clock:sleepStart` / `clock:sleepEnd` | `{untilSim, target}` / `{reason, eventName}` | clock → ui, audio, devices | | |
| `clock:moment` | `{id, untilReal}` | clock → ui | | |
| `storm:phaseChanged` | `{from, to}` | storm → clock, alerts, life, details | | |
| `storm:bandEnter` / `storm:bandExit` | `{bandId, kind}` | storm → audio, render, details, alerts | | |
| `storm:lightning` | `{distM, azDeg}` | storm → render, audio | | |
| `storm:mesovortex` | `{amp, durS}` | storm → audio, render, details | | |
| `storm:eyeEnter` / `storm:eyeExit` | `{}` | storm → clock, house (`eyeStartSim`), audio, render, life, alerts, details | M | W |
| `storm:windReversal` | `{fromDeg, toDeg}` | storm → house, render, audio, details. **Rule:** the first sub-step with `reversal ≥ 0.5` after `storm:eyeExit`; on off-track presets the first `reversal ≥ 0.5` ever; emitted at most once | M | W |
| `storm:landfall` | `{simTime}` | storm → alerts (landfall TCU), details | | |
| `storm:sunset` / `storm:sunrise` / `storm:civilDawn` / `storm:civilDusk` | `{simTime}` | storm (`sun.js`) → clock (soft moment on the prep-day sunset), alerts, content, details, life | soft (sunset, prep) | |
| `storm:advisoryDue` | `{number, kind}` | storm (scheduler tick) → alerts | | |
| `power:flicker` | `{n}` | utilities → render, audio, devices, details | | |
| `power:brownout` | `{on}` | utilities → render, audio | | |
| `power:transformerFlash` | `{pos}` | utilities → render, audio, details | M | W |
| `power:lost` | `{cause}` | utilities → everything | M | W |
| `power:restored` | `{}` | utilities → everything | M | |
| `gen:started` / `gen:stopped` / `gen:fuelLow` / `gen:pullFailed` | `{placement}` | utilities → audio, render, ui | | |
| `cell:stateChanged` | `{from, to}` | utilities → devices, alerts, details | | |
| `cell:messagesDelivered` | `{ids, burst}` | utilities → devices, audio | | |
| `cell:restore` | `{}` | utilities → devices, details | | |
| `water:pressureLost` / `water:pressureBack` | `{}` | utilities → objects, devices, details | | |
| `water:boilNotice` / `water:boilLifted` | `{}` | utilities → alerts, devices | | |
| `media:cableLost` / `media:wifiLost` | `{}` | utilities → devices | | |
| `county:curfew` / `county:pod` / `county:cow` | `{on}` | utilities → alerts, hood, details | | |
| `house:openingFailed` | `{id, cause}` | house → render, audio, life, player, details | M | W |
| `house:sliderUnlatch` | `{id}` | house → render, audio | | |
| `house:doorRipped` / `house:doorSlam` | `{id}` | house / player → render, audio | | |
| `house:garageBuckle` / `house:garageFailed` | `{}` | house → render, audio, details | M | W |
| `house:cagePanelTear` | `{panelId}` | house → render, audio | | |
| `house:cageStage` | `{stage}` | house → render, audio, details | M (stage 4) | W (≥ 4) |
| `house:shingleLoss` | `{slope, fraction}` | house → render | | |
| `house:leakStarted` / `house:leakTier` | `{lpId, tier}` | house → render, audio, details | | |
| `house:ceilingSag` / `house:ceilingCollapse` | `{lpId}` | house → render, audio, details | M (collapse) | W |
| `house:intrusion` | `{openingId, tier}` | house → render, audio | | |
| `house:earPop` | `{sign}` | house → audio, ui, life | M (first) | |
| `house:atticWhump` | `{}` | house → audio, render | | |
| `house:bucketOverflow` | `{lpId}` | house → render, audio | | |
| `house:detectorChirp` | `{detectorId}` | house (`hoursSinceOutage ≥ 4 && isNight`, once; suppressed if the battery was pulled) → audio, details | | W |
| `house:coAlarm` / `house:coDose` | `{ppm}` / `{dose}` | house → audio, ui, scenario | | W |
| `hood:treeLimb` / `hood:treeFallen` | `{treeId, dirDeg}` | hood → render, audio, details | M (fallen) | |
| `hood:neighbourShutter` / `hood:evacuated` / `hood:genOn` / `hood:genOff` / `hood:plywoodFlown` | `{houseId}` | hood → render, audio, content | | |
| `hood:transformerFlash` | `{id, pos, distM}` | hood (poles other than the house's, DESIGN §4.1) → render (sky flash), audio (delayed crack), content (Marcus/Denise texts), details | | |
| `hood:cableNodeDown` / `hood:streetlights` | `{}` / `{on}` | hood → devices / render | | |
| `hood:debrisImpact` | `{surface, class, energyJ, pos}` | **hood (`debris.js`, the sim-side impact model, DESIGN §6.15)** → house, audio, life, details, player, devices (Ring) | | W (> 40 J on a house surface) |
| `hood:grounded` | `{propId, pose, pos, class}` | hood → render (dressing pose), details | | |
| `alert:issued` | `{product}` | alerts → devices, ui, details | **not a moment** | |
| `alert:wea` | `{product}` | alerts (after `towerOn` gating) → devices, audio, life | M | W |
| `alert:nwr` | `{product, wat}` | alerts → devices, audio | | W (wat) |
| `alert:tv` | `{segment, line}` | alerts → devices | | |
| `alert:advisory` | `{advisory}` | alerts → devices, details | | |
| `npc:say` | `{who, text, pos}` | life → audio (speech), ui (caption) | | |
| `pet:state` | `{from, to}` | life → render, audio, details | | **no** (life does not run during sleep; the impulse events are the interrupts) |
| `player:roomChange` | `{from, to}` | player → audio, render, devices | | |
| `player:outdoors` | `{outdoors}` | player → audio, render | | |
| `player:knockedDown` / `player:up` | `{gust}` | player → render, audio, ui | | |
| `player:injury` | `{value}` | player → render, scenario | | |
| `player:sleep` / `player:wake` | `{untilSim}` / `{reason}` | player → clock | | |
| `interact:use` / `interact:pickup` / `interact:drop` / `interact:holdStart` / `interact:holdEnd` | `{id, verb}` | interact → clock (hold tier), objects, tasks, details | | |
| `object:changed` | `{id, state}` | objects → render, audio, tasks | | |
| `task:done` / `task:available` | `{id}` | tasks → ui, audio | | |
| `detail:fired` | `{id, channel}` | details → the presenting module, ui (journal) | | |
| `game:chapter` | `{id}` | scenario → ui, save | | |
| `game:end` | `{reason, card}` | scenario → ui, audio | | |
| `device:tvChannel` / `device:phoneApp` / `device:nwrState` / `device:photo` | `{...}` | devices → audio, tasks | | |
| `debug:screenshotReady` | `{}` | render → harness | | |

Emitter rule: every event in the **W** column is emitted from steps 3–7 (the sim block or alerts). Every event whose emitter is `render`, `audio`, `life`, `player`, `interact` or `ui` is cosmetic or player-side and is never read by a hashed slice.

---
## 6. Module APIs (what each module exposes and consumes)

Every module directory exports from its `index.js`:

```js
export function init(ctx)                 // build internal state, register bus listeners, create scene/audio objects
export function update(ctx, dtReal, dtSim) // its slot in §4; may write only its own slice
export function dispose()
export const api = { ... }                // owner-provided setters and queries (below); the ONLY cross-slice write path
```

`ctx = { state, bus, rng, clock, three: { renderer, scene, camera }, audio: { ctx, buses }, quality, headless, world: worldRegistry, objects: objectRegistry, input }`. `rng` is the master generator; each module calls `ctx.rng.fork('<module>')` once in `init` and never elsewhere.

### 6.1 core (E1) — `core/*.js`
- `clock.api.requestSpeed(n|null)`, `clock.api.toggleAutoPace()`, `clock.api.startMoment(id, realSeconds = 20)`, `clock.api.sleepUntil({eventId|simTime, reason})`, `clock.api.skipToNext()` (uses `storm.api.predict()`, never past `eyewall*`/`eye`), `clock.api.pause(bool)`.
- `core.api.journal(text, kind)` appends to `state.log`.
- `core.api.endRun(reason: 'firstLight'|'injury'|'co', cardData)`; `core.api.snapshot()` / `restore(json)` (chapters, harness).
- `rng.fork(name) → { next(), nextFloat(), range(a,b), normal(mu,sigma), hash01(...keys) }` (mulberry32 seeded by `fnv1a(seed, name)`; `hash01` is stateless and used for bucket rolls).
- `bus` (§4), `guard.freezeExcept(state, ownedSlices)` in debug.
- `hash.stateHash(state)` → FNV-1a hex over canonical JSON of `storm, local (sim-time fields only), house, utilities, hood (without impactQueue[].fired), alerts.issued, details.firedHashed`. Excluded by construction: `local.{uInst, uG3, dirInstDeg, mesovortex}`, `cues.{windLoadPa, roar, whistle, pushForceN}`, `player.*`, `life.*`, `objects.*`, `devices.*`, `details.fired` entries tagged [P]/[R]/[S], and every render-side quantity (bulge, wobble, particle state), which is never stored.
- `core/ids.js` — the DESIGN §16 registry as data (`OBJECT_IDS`, `SOCKET_IDS`, `FIXTURE_IDS`, `LEAK_POINTS`, `IMPACT_SURFACES`, `ROOM_IDS`, `EXTRA_KEYS`); `objects/catalog.js`, `world/registry.js` and `details/catalogue.js` are asserted against it in CI.
- `objects.api.use(objectId, verb)` and `objects.api.place(objectId, socketId)` — run an interactable's verb or placement **without the raycast or the player** (they call the same owner setters `Interactable.use` would); used by the harness scripts and tests.

### 6.2 storm (E2) — `storm/index.js`
- `api.setScenario(preset, options, seed)` (re-derives everything; called by setup and the harness).
- `api.windAt(worldPos: Vector3) → { toward: Vector3 (unit), speed: number }` — the instantaneous wind at a world position using the log profile `u(z) = u10·ln(z/0.03)/ln(10/0.03)` plus `ImprovedNoise` spatial turbulence (`(pos·0.1, realTime·0.5)`, ±15 %); shielding is *not* modelled here (house-side shielding lives in the house/debris consumers).
- `api.rainAt(worldPos) → mm/h` (uniform, = `local.rainMmPerH`, but keeps the door open for spatial variation).
- `api.bandFieldAt(xE_km, yN_km, simTime = now) → { rainMult, windMult }` — for the radar/TV: evaluates the same band field at any point of the storm-relative plane.
- `api.rcliper(rKm) → mm/h` mean rate; `api.radarFrame(canvas, centreKm, spanKm, simTime)` draws reflectivity (`dBZ = 23 + 16·log10(R)`) — implemented here so the radar *is* the model.
- `api.predict() → PredictedEvent[]` `{id:'nextBand'|'tsOnset'|'powerRisk'|'hurricaneOnset'|'eyewall'|'eye'|'backEyewall'|'belowTs'|'firstLight'|'nextAdvisory', simTime, label}` computed by integrating the deterministic track forward (band rotation included); `powerRisk` uses the median bucket of the survival curve from `utilities.api.powerSurvival()`.
- `api.forecast(issuedSim, advisoryNumber) → Forecast` — truth + deterministic error (§7.9).
- `api.setStub(table)` — replaces the model with playback of `docs/research/meteorology.md §11` (linear interpolation between rows; turbulence still real); used from day 2 by every other team.
- `api.sunAt(simTime) → {azDeg, elDeg}` (NOAA solar position for 27.21° N, 82.47° W; the only authority for dawn/dusk), `api.nextSunEvent(kind, fromSim) → simTime` (`'sunset'|'sunrise'|'civilDawn'|'civilDusk'`), `api.firstLightAfter(simTime)`.
- `api.eyewallCoastSim() → number|null` — the predicted sim time at which the r = 1.4·RMW annulus first touches `storm.coast` (for the EWW rule).

### 6.3 house (E3) — `house/api.js` (all setters validate and no-op with a returned `{ok:false, reason}` when physically blocked)
`placePanel(openingId, nuts)`, `removePanel(openingId)`, `setShutter(openingId, closed)` (accordion), `setBrace(openingId, bool)`, `setDoor(id, {open?, latched?, locked?})` (applies the wind rules of DESIGN §10.1 using `uGustEnv` for anything that changes hashed state, and returns the outcome: `'opened'|'held'|'ripped'|'slammed'`), `setGarageDoor({open})`, `setGarageBrace(bool)`, `placeSandbag(doorId)`, `placeTowel(id)`, `wringTowel(id)`, `placeBucket(lpId, containerId)`, `emptyBucket(lpId) → litres` (the caller pours them into a `utilities.water` container or the lanai), `setFridgeOpen(bool)`, `setIceMaker(bool)`, `setFridgeColdest(bool)`, `addFrozenBags(n)`, `purgeFridge()`, `setPoolValve(open)`, `setAttic(open)`, `roomPressurePa(roomId)`, `openingLoad(openingId) → {load, threshold}` (debug), `coRate()`, `coPpmAt(roomId)`. **Removed in 1.1** (moved to `utilities.api`): `setTap`, `flushToilet`, `fillContainer`, `setBreaker`.

### 6.4 utilities (E3) — `utilities/api.js`
`generator.place(where)`, `generator.fuel(canIndex)` (pours a can; `cansL[i]` → `fuelL`), `generator.pull() → 'started'|'failed'`, `generator.stop()`, `generator.plug(circuits[])`, `powerSurvival() → {bucketSim, p}[]` (for `predict` and the sleep dialogue), `setBreaker(id, on)`, **`water.setTap(containerId, on)`, `water.fillContainer(id, litres)`, `water.drawWater(litres, purpose: 'flush'|'wash'|'drink'|'pet') → litres drawn`, `water.tapeDrain(id)`, `water.flushToilet(toiletId) → 'flushed'|'noWater'`**, `sendText(thread, text) → Message` (queues; delivery depends on the cell state; marks `failed` while `!smsOn`), `markRead(thread)`, `holdMessage(msg)` (called by alerts/content for scripted inbound texts), `cellState()`, `transformer(id) → Transformer` (read).

### 6.5 hood (E3) — `hood/index.js`
`api.debrisSources() → {pos:number[], class:string, remaining:number, threshold:number}[]` (the impact model and the cosmetic field both read this), `api.house(id)`, `api.tree(id)`, `api.impactsDue(untilSim) → Impact[]` (the renderer's read of `impactQueue` for bodies it must spawn in time), `api.pose(propId) → {pose, pos, dirDeg}` (the dressing table of DESIGN §4.2 evaluated from state; render calls it per prop per frame). **Removed in 1.1:** `reportGrounded` — grounding is decided by the sim (`hood.grounded[]`, `hood:grounded`).

### 6.6 world (E4) — `world/index.js`
- `build(ctx) → { root: Group, registry }` — builds everything static from `plan.js` and the neighbourhood table; called once. **Creates no `THREE.Light`.**
- `registry = { rooms: {id → {polygon, floorY, ceilingY, fixtureIds: string[], windowIds: string[]}}, fixtures: {id → {room, pos, color, kind: 'point'|'rect'|'emissive', windowId?, powerCircuit?}}, colliders: Box3[] (+ `grid` broadphase), openings: {id → {frame, glass, shutter, door (pivot Group), tracks: Vector3[]}}, doors: {id → pivot Group}, props: {id → Group} (every DESIGN §16.1 object id and every §4.2 prop id, with authored poses `Group.userData.poses[name]`), sockets: {id → {pos, kind, room, accepts: string[]}} (DESIGN §16.2), leakPoints: {lpId → {pos, room}}, leakDecalAnchors, mast, transformerPoles: {id → Group}, streetlights, pond, pool, cage: {beams: InstancedMesh, panels: InstancedMesh, door}, garageDoorMesh, sliders, vegetation: {byKind: InstancedMesh}, terrain, flood: Mesh, materials: {name → Material} }`.
- `roomOf(point: Vector3) → roomId` (point-in-polygon with a 0.5-m grid cache); `yardSectorOf(point) → 'frontYard'|'backYard'|'driveway'|'street'|''`.
- `materials.uniforms = { uWind, uWet, uPowerOn, uFlash, uTime }` shared objects (owned here, *written* by render).
- `textures.get(name) → CanvasTexture` (memoised; `IndexedDB` cache of the `ImageBitmap` keyed by `name + seed + version`).
- `plan` export: `{ lines, rooms, openings, doors, roofs, lots, trees, sockets, leakPoints, fixtures, adjacency }` — the data of DESIGN §3 and §16; `adjacency[roomId] = [{roomId, doorId|null}]` (null = cased opening), used by audio occlusion (doors between the player and the exterior), CO spread and pressure coupling.

### 6.7 render (E5) — `render/index.js`
`api.setCamera(pos, yaw, pitch)`, `api.setQuality('low'|'auto'|'high')`, `api.stats() → {calls, triangles, programs, textureBytes, lights}`, `api.flash({pos, color, intensity, durationMs, pulses})`, `api.screenshotReady() → Promise<void>` (resolves after `renderer.compile()` for both power states and two warm frames; emits `debug:screenshotReady`), `api.captureCanvas() → dataURL` (for the phone camera and Ring), `api.resize()`.

### 6.8 audio (E6) — `audio/index.js`
`api.unlock()` (first gesture), `api.playTone(kind: 'wea'|'wat'|'same'|'eas'|'sms'|'push'|'lowBatt'|'ring'|'ups'|'smoke'|'co'|'microwave'|'fridge'|'consoleAlarm', deviceId, opts)` → promise, `api.speak(deviceId, text, profile: 'nwr'|'tv'|'neighbour'|'phone', priority: 0..3) → Promise` (chunked; subtitles via `ui.api.subtitle`, never `caption`; priority 3 WEA/NWR warning > 2 TV event line > 1 neighbour > 0 NWR routine cycle, which yields at chunk boundaries and resumes), `api.cancelSpeech(deviceId)`, `api.oneShot(kind, params)` (thunder, impact, creak, transformer, cageRip, cageFold, glassBreak, doorSlam, treeCrack, scream, whoop), `api.setBus(name, gain)`, `api.setOcclusion(profileId)` (normally derived from `player.room` internally), `api.introspect() → {standingNodes, activeOneShots, generatorsActive, hrtfPanners}`, `api.renderSame(header) → AudioBuffer` (pure; unit-tested offline).

### 6.9 devices / alerts / ui (E7)
- `devices.api.raisePhone(bool)`, `setApp(app)`, `charge(source: 'wall'|'bank'|'marcus'|'car'|null)`, `useBank()`, `takePhoto(tag)`, `reply(thread, choiceIndex)`, `tv.setPower(which, on)`, `tv.setChannel(which, ch)`, `nwr.setPower(on)`, `nwr.press(button)`, `nwr.setBatteries(n)`, `console.read() → Console`, `barometer.tap()`.
- `alerts.api.issue(product)` (harness/tests), `current() → Product[]`, `advisoryText(n)`, `forecast()`, `crawl() → string[]`, `scheduleInbound(message, atSim)`.
- `ui.api.prompt(text|null)`, `holdProgress(0..1|null)`, `caption(text, seconds)` (the seven literary captions; refuses beyond the 12-caption budget — a console error in debug), **`subtitle(deviceId, text|null)`** (speech subtitles, one line per device with an icon, unbudgeted), `openSleepDialog(events) → Promise<choice>`, `confirmSkip(label) → Promise<bool>`, `showCard(data)`, `chapters()`, `journal()`, `notify(text)` (phone banner), `setDebug(fields)`.
- `devices.api.nwr.setBatteries(n)` writes `devices.nwr.batteryH`; `devices.api.charge/useBank` write `devices.phone.{battery, banks}` — the only writers of those ledgers.
- **Interactable contract** (owned by E1, implemented per object family in `objects/behaviours/*.js`, meshes resolved through `world.registry.props`):
  ```js
  /** @typedef {Object} Interactable
   *  @property {string} id
   *  @property {string[]} meshIds
   *  @property {(state:SimState) => {verb:string, label:string, holdS:number, enabled:boolean, reason?:string}[]} verbs
   *  @property {(state:SimState, ctx, verb:string) => void} use          // calls owner setters; never assigns foreign slices
   *  @property {{kind:string, count:number}|null} carryable
   */
  ```

---

## 7. The storm model — formulas and constants (E2; `storm/`; pure JS, node-testable)

All in km/ENU with the house centre as the origin; velocities m/s; pressures hPa. Constants: `rho = 1.15`, `f = 6.6e-5 s⁻¹` (27.3° N), `e = 2.718…`.

### 7.1 Track and intensity (`track.js`)
- Centre: `centre(t) = house − vt·(T0 − t)·(sin θm, cos θm)` (km, with vt in km/s), modified by the heading OU wobble (τ = 2 h, σ = 4°, stream `'storm'`) integrated so the closest approach still occurs at T0 at the configured `trackOffsetKm` (the wobble is applied as a lateral offset `w(t)` with `w(T0) = 0`).
- `rKm`, `phiDeg = atan2(yN_house − yN_c, xE_house − xE_c)` (math convention).
- Landfall: when `(centre − coast.p)·coast.n ≥ 0` → `overLand = true`, `landfallSim = t`. Coast: `p = (−3.18, −3.18)`, `n = (0.940, 0.342)` (bearing 340°/160°, 4 km from the house).
- Intensity: `vmaxMarine(t)` = preset trend over water (reference: 95 kt at T−33 → 100 kt at T−12, hold), then Kaplan–DeMaria after landfall with `Vb = 26.7 kt`, `α = 0.05 h⁻¹`, `R = 1`: `V(t) = Vb + (Vland − Vb)·exp(−α·(t − tland))`. `ΔP(t) = ΔP0·(V(t)/V0)²`, `pc = pn − ΔP`. `B` is the preset value, clamped `[1.0, 2.2]`.

### 7.2 Symmetric wind (`holland.js`)
- `x = rmw / max(r, 0.5 km)`; `Vsym = vmaxMarine·sqrt(x^B·exp(1 − x^B))`.
- **Eye override** (resolved): for `r < rmw`, `Vsym *= 0.15 + 0.85·smoothstep(0.35·rmw, 0.85·rmw, r)`.
- Pressure: `P = pc + ΔP·exp(−x^B)` + OU jitter (σ 0.3 hPa, τ 30 s, sim time). `dPdt` = 60-s smoothed derivative (hPa/h).

### 7.3 Direction, inflow, asymmetry, exposure, bands
- Inflow angle `α(r) = 10 + 12·min(r/rmw, 1) + 8·clamp((r − rmw)/(4·rmw), 0, 1)` degrees, **+10 over land (always, the house is on land)**.
- Tangential "toward" azimuth (math) `= φ + 90 + α`; vector `Vvec = Vsym·(cos, sin)` of that angle.
- Motion asymmetry: `a(r) = 0.55·(2·r·rmw)/(r² + rmw²)`; add `a·vt·(cos, sin)(θm_math + 20°)` where `θm_math = 90 − headingDeg`.
- `Vmar = |Vvec|`; `dirFromDeg = (270 − atan2deg(Vvec.y, Vvec.x)) mod 360` (compass "from").
- Exposure `kExp[sector(dirFromDeg)]` = `[N 0.80, NE 0.78, E 0.78, SE 0.78, S 0.78, SW 0.82, W 0.85, NW 0.85]`.
- Band field (`bands.js`): bands in storm-relative polar coordinates with log spirals `r(θ) = r0·exp(k·θ)`, `k = tan 15° = 0.268`; reference set: eyewall annulus (`rmw ± 0.4·rmw`, I = 3.0), principal band (`r0 = 2.2·rmw` at θ = 0, width 30 km, I = 1.3, ω = 0, extent 300°), outer bands `r0 = 120 / 210 / 320 km`, widths 20 / 28 / 35 km, I = 1.0 / 0.8 / 0.6, ω = 25 / 30 / 35 °/h, extents 220 / 180 / 150°, cellular noise period 25 km, amplitude ±60 % (value noise along the band advected at 40 km/h). Cross-band profile: sharp inner rise over 3 km, Gaussian core, stratiform tail 15 km. `bandRain = Σ profiles` (clamped 0–5, **including** the eyewall annulus — it is what the radar and the rain see); **`bandWind = 1 + 0.5·clamp(bandRainOuter/3, 0, 1)` where `bandRainOuter` sums the principal and outer bands only** (the eyewall's gustiness is G = 1.65 plus the mesovortex process, so `bandWind = 1` inside 1.4 rmw and no band multiplier compounds with the core), with the squall shape (30–120 s rise, +10–20° veer via a direction offset, −3 °C·bandRain/5). `bandFrontM` = distance along the storm-relative rotation from the house to the leading (sharp) edge of the nearest band whose edge is approaching, in metres.
- `uMarine = Vmar`; `u1m = Vmar·kExp·(1 + 0.25·(bandWind − 1))`; `uMean` = 1-h running mean; **`uGustEnv = G·u1m·bandWind`**, `G = 1.55` (1.65 for `r < 1.4·rmw`) — the squall's +30–60 % of M §2.3 lives in the envelope; **`uStruct = 1.38·u1m·(0.6 + 0.4·bandWind)`**. Reference checks: band 1 (bandRain 1.0 → bandWind 1.17) at `u1m` 8.7 → `uGustEnv` 15.8; band 2 (1.17) at 10.8 → 19.6 (crosses the 18 m/s flicker threshold); front RMW (bandWind 1) at 40.1 → `uGustEnv` 66.2, `uStruct` 55.3.

### 7.4 Turbulence (`turbulence.js`, the two clocks)
Three OU processes on the relative fluctuation: τ = 2.5 s (real), 20 s (real), 180 s (sim), variances 0.35 / 0.45 / 0.20 of `Iu²`, `Iu = 0.28` (0.30 inside 1.4 rmw); update `x += (−x/τ)·dt + σ·sqrt(2·dt/τ)·N(0,1)` (stream `'turb'`, 60-Hz sub-steps for the real processes); `uInst = max(0, u1m·(1 + Σx))` clamped `≤ 2.2·u1m`; `uG3` = max over a 3-s ring buffer. Direction jitter OU τ = 8 s, σ = 9° (real). Mesovortex events when `r < 1.3·rmw`: Poisson 1/600 s, +25 %, 15 s, 2-s attack / 5-s decay (real). Rainband squall cells modulate `uInst` by `bandWind` (already in `u1m`). Statistics to reproduce (tests §13.3): gusts 2–5 s, envelopes 10–30 s, strong-gust interval 20–60 s, lulls to 0.6·U every 1–3 min lasting 5–20 s.

### 7.5 Rain (`rain.js`)
R-CLIPER (M §4.1) mean `T(r)` from `vmaxKt`; `R = T(r)·asym(φ)·bandRain·cell(t)` with `asym = 1 + 0.3·cos(φ − θm_math − 45°)` outside the eyewall; eyewall region `0.6–1.4·rmw`: `R = (60 … 100)·(Vsym/vmax)²` mm/h; inside `0.6·rmw` ramp to 0 by `0.4·rmw` (× the eye clearing). **`rainWall[i] = R·(max(0, u1m·cos(dirFrom − n_i))/7 + 0.1)`** (the 0.1 is lee wetting, DESIGN §3.4). `rainAngleDeg = atan(u1m/7)`. Accumulate `rainTotalMm`, `rainRecentMm` (3-h window).

### 7.6 Light, sky, visibility, thermal (`light.js`, `thermal.js`)
- Clear-sky illuminance `E0 = 110 000·max(0, sin(el))^1.2 + twilight(el)` lux (twilight: 400 lux at el = 0 → 1 at el = −6 → 0.001 at −18).
- `cloudFrac(r)` synoptic: 0.2 for r > 600 km, 0.6 at 400, 0.9 at 250, 1.0 for r < 150 (linear between). **Optical depth (revised so the core is as dark as DESIGN says):** `optDepth = 1.8·cloudFrac² + 2.0·min(1, bandRain/3) + 2.2·min(1, R/60) + 0.8·clamp((u1m − 25)/20, 0, 1)` (the last term is spray and scud); `illumLux = max(E0·exp(−optDepth), 100·(E0 > 1000 ? 1 : E0/1000))` then blended toward **`0.25·E0`** by `eyeFactor` (the eye keeps a high canopy). Reference values: prep afternoon (cloudFrac 0.6) ≈ 50 000 lux; between bands at night 0; band 2 at noon-equivalent ≈ 5 000; **front eyewall at noon (τ ≈ 6.4–6.6, E0 ≈ 93 000) ≈ 130–160 lux**; T−2 < 500 (test §13.5); dark dawn Thursday ≈ 80 lux at 07:15 and ≈ 500 at 08:00; eye at 14:00 ≈ 23 000 lux.
- `cloudBaseM`: 8000 (cirrus) → 1500 (bands) → 250 (core) by the same breakpoints; **`visibilityM = (3.912/β) / (1 + (u1m/22)²)`** with `β = 0.31·R^0.64 km⁻¹` (R > 0.5 else 20 km), floor 50 m — spray is continuous with wind rather than a step at 35 m/s. Reference: ≈ 19 km on the prep day, ≈ 505 m at T−4 (R 40, u1m 25.7), ≈ 190 m at T−1.5 (R 80, u1m 38.5), 20 km in the eye.
- `eyeFactor = 1 − smoothstep(0.30·rmw, 0.80·rmw, r)`.
- `tAirC` = diurnal base (prep 26 night / 33 day; core 26; aftermath 26 / 34) − `3·bandRain/5` + **`4·eyeFactor`** (the eye is 30 °C at 90 % RH → `heatIndexOutC` ≈ 41); `tdC` 24–25 (23 after T+8); `rhOut` from T and Td.
- `sun.js`: NOAA solar position for 27.21° N, 82.47° W; emits `storm:sunrise`, `storm:sunset`, `storm:civilDawn`, `storm:civilDusk` at the sub-step of the crossing; `clock.firstLightSim` is set from `civilDawn` once `phase == aftermath`.
- Lightning (`lightning.js`): Poisson per minute = `bandFactor × rate(r, quadrant)`: outer bands (200–350 km, right of track) 0.5–3 /min, principal 0.1–0.5, eyewall 0–0.1 with a 15 % chance (per seed) of a 20-min outbreak at 1–3 /min; each flash gets `distM` (5–25 km, nearer inside bands) and `azDeg` (toward the band).

### 7.7 Surge and freshwater (`flood.js`)
`surgeM = Smax·lowpass(clamp(Uon·|Uon|/Uref², −0.3, 1), τ = 75 min)` with `Uon` = onshore (from W) component; `Smax = 0` reference, 1.0 canal-front. Street bucket per DESIGN §6.8: `excess = max(0, R − capacity)`, `capacity = 50 mm/h` (25 once clogged), `swaleWaterM += 0.08·excess·dt/25` up to 0.8 then `streetWaterM`, drain τ 3 h. `pondRiseM = min(1.2, rainTotalMm/200)` (+ surge).

### 7.8 Cues (`cues.js`) — the formulas of DESIGN §5.2, evaluated after `local`.

### 7.9 Forecast error (`forecast.js`)
At each advisory (issued at `ta`), for lead `L ∈ {0, 12, 24, 36, 48, 60, 72}` h: `point = truth(ta + L) + e(L)·dir(ta)` with `e(L) = 100·(L/48)^0.8` km capped at `L = 72` (30 at 12 h, 55 at 24 h, 100 at 48 h), `dir(ta)` = unit vector at angle `seedAngle + 30°·sin(2π·ta/36 h)`; intensity `vmaxKt + 5·(L/24)·sign(seed)`; `coneNmi` = `[0, 26, 39, 52, 65, 78, 91]`. `shiftKm` = displacement of the 24-h point vs the previous advisory.

### 7.10 Predictions (`predict.js`)
Integrate the deterministic track and the band rotation forward from `now` in 5-min steps up to 72 h; record the first crossing of each predicate (DESIGN §2.5, house-level thresholds); `powerRisk` from the survival curve; `firstLight` = the first civil dawn after the predicted `u1m < 12 && tRel > 6`; `nextAdvisory` from the cadence; `eyewallCoast` = the first step at which `r_coast ≤ 1.4·rmw` (for the EWW).

---

## 8. House and utility models (E3; `house/`, `utilities/`, `hood/`; pure JS)

### 8.1 The bucket rule (implemented once in `house/structure.js` and reused by utilities/hood)
```
bucket k = floor(simTime/600)
integral components: H_c += hazard_c(state)·dtSim   ;  fail when 1 − exp(−H_c) ≥ u_c,   u_c = hash01(seed, c)
per-bucket components: at the first sub-step of bucket k compute p_c,k from the bucket's peak envelope;
                       fail when p_c,k ≥ hash01(seed, c, k)
thresholds N(μ,σ): drawn once per component in init from stream 'damage'
```
Hazards read only sim-time fields (`uGustEnv`, `uStruct`, `u1m`, `dirFromDeg`, `rainWall`, `reversal`). Envelope values used for a bucket are the sub-step values summed (integral) or the bucket max (per-bucket).

### 8.2 Component formulas (DESIGN §6 is normative; this is the computational form)
- **Grid**: `hazardE += powerHazard·h`; brownout when `hazardE ≥ 0.3·hazardEFail`; outage when `hazardE ≥ hazardEFail = −ln(1 − u_power)` or `uGustEnv ≥ 45`. Flickers: the threshold list `[18,22,26,30,33,36]` on `uGustEnv` (each once) plus Poisson `4·powerHazard` per sub-step (stream `'utilities'` via bucket hashes: `hash01(seed,'flicker',k) < 1 − exp(−4·∫h)`) **plus the band-gust-front channel: Poisson 0.5/h while `bandRain ≥ 1 && uGustEnv > 14`** (bucket hash `'flickerBand'`). Transformer flash on outage with p 0.6 (overhead). `hoursSinceOutage = (simTime − lostSim)/3600` while off. Restoration `restoreScheduledSim = dayStart(5) + 16.2 h + (u − 0.5)·2 d` overhead / `dayStart(3) + …` underground (`u` from `hash01(seed,'restore')`). `breakers` gate the loads: `acOn = on && breakers.main && breakers.ac`, pool pump `breakers.poolPump`, water heater `breakers.waterHeater`.
- **Garage door**: `load = uStruct·max(0, cos(dirFrom − 90°))`; `pumpAmpEnv = 0.03·clamp(windLoadEnvPa·cos/2500, 0, 1)` (render adds `0.01·windLoadPa/2500` of real-time wobble, not stored); buckle when `load ≥ threshold − 2`; fail when `load ≥ threshold` (checked per bucket on the bucket max; **threshold `N(57,4)` unbraced / `N(66,4)` braced** — DESIGN §6.4; acceptance 30–40 % / < 5 %).
- **Cage**: per panel `load_i = uGustEnv·shield_i·max(0.3, |cos(dirFrom − n_i)|)`, `shield_i = roof ? 1 : (|angleDiff(dirFrom, 90°)| ≤ 60° ? 0.7 : 1)`; torn when `load_i ≥ threshold_i` (bucket max). Stage 1 when `uGustEnv > 20`; 2 at the first tear; 3 when torn/loaded ≥ 0.6; 4 when stage ≥ 3 and `uGustEnv·shield_struct ≥ structThreshold` (bucket max); 5 six seconds later (real time, `foldProgress` 0→1). Panel bulge is a render-side function of `windLoadPa` and is not stored.
- **Openings**: per bucket `p = 6e-4·max(0, uStruct·cos_face − 30)·(1 + 2·hood.damage)·mult`, `mult = shuttered ? 0.08·(1 + 3·(1 − fastening)) : 1` (× 0.03 impact windows; × 3 if the grill is in `hood.impactQueue`/`debrisSources` on that façade's upwind side). `bowEnvM = 0.02·windLoadEnvPa·cos_face/1000·(braced ? 0.5 : 1)` for sliders (0 when lee); unlatch p 0.08/bucket when `bowEnvM > 0.03`.
- **Intrusion** (tiers per DESIGN §6.6): thresholds on `rainWall[sector(opening)]`: tier 1 track 60 / door 90, tier 2 sill 170 (bare) / 300 (shuttered); litres `+= 0.005·max(0, rainWall − threshold)·h/3600` L per opening (0.5 L/h per 100 mm/h excess), minus towels (2 L each); `poolM2 = 0.075·litres` (1.5 m² at 20 L). `soffitIntegral[i] += max(0, rainWall[i] − 200)·h/3600`; tier 3 for a façade at 30 mm·h; tier 4 when `shingleLoss[slope] > 0.15`. **Attic reservoir:** while a façade is at tier ≥ 3, `atticWaterL[i] += 0.15·max(0, rainWall[i] − 200)·(1 + 4·shingleLoss[slope])·h/3600`; leak points of that façade become eligible at tier 3 (the first at eligibility, the second when `atticWaterL[i]` doubles from the value at first eligibility); each active point drains `rateLph = (atticWaterL[i]/τ_attic)/nActive`, `τ_attic = 10 h`, and `atticWaterL[i] −= Σ rateLph·h/3600`; leak tier 1 below 0.5 L/h, 2 above; bucket captures until 10 L then `house:bucketOverflow` and the puddle grows; `litresDelivered += rateLph·h/3600`; `stainM2 = 0.05·litresDelivered`; `unbucketedH` accumulates while `rateLph ≥ 0.2 && !bucket` (sag at 6 h → tier 3, `house:ceilingSag`) and, at the lower gate `rateLph ≥ 0.1`, collapse at 24 h (`house:ceilingCollapse`). `mildew` starts 24 h after any leak reaches tier 2.
- **Roof**: own `shingleLoss[slope] += 0.002·max(0, uStruct − 42)²·h/3600` on the windward slope (`slope` from `dirFrom`); anemometer death p 0.3/bucket while `uStruct > 45`.
- **Pressure**: `pInsideHpa` relaxes to `pHpa` with τ 20 s (τ 2 s with a failed opening or garage); `pAtticHpa` τ 60 s (2 s after a garage/opening failure); **`dpRoomPa[room] = 100·(pInside − pHpa) + windLoadEnvPa·cos_face·(0.015 + 0.25·openFrac + 1.0·(failedOpeningInRoom || (garageFailed && adjacentToGarage)))`** where `openFrac` is the fraction of the room's exterior openings with `open > 0.2` (a sealed CBS house leaks only a few Pa — 39 Pa at the eyewall envelope — so doors rattle but do not slam until something is open or has failed); unlatched door drift/slam at |dp| > 40 (`house:doorSlam`, hashed via `doors[id].slamCount`); render adds the real-time rattle from `windLoadPa` without touching `open`.
- **Thermal**: `tIn += (tTarget − tIn)·(1 − exp(−h/τ))`, τ = 3 h (hvac off), **`tTarget = tAirC + 3.0·sealed + 2·clamp(sun.elDeg/45, 0, 1)·(1 − 0.7·cloudFrac) + 0.5·genAdjacent`**, `sealed = hvacOn ? 0 : clamp(1 − openFracHouse·2, 0, 1)` (1 when all openings are shut); hvac on (`acOn`): τ 20 min toward 24 °C. `rhIn → 90 %` with τ 2 h when hvac off. `heatIndexC`/`heatIndexOutC` by Rothfusz in `storm/cues.js`.
- **CO**: `coPpmByRoom[garage] += rate(placement, garageOpen)·h/60 − coPpm·decay·h/60`, spread along `plan.adjacency` through open doors (halving per step); `coPpm = coPpmByRoom[player.room]` (a read of `player.room`); **`house.coDose += max(0, coPpm − 100)·h/60`**; alarm per UL 2034 (unless `objects.detector_hall.battery == 0`); `house:coDose` at every 500; collapse (`scenario/endings.js` reads `house.coDose ≥ 4500`).
- **Cell**: tower `hazardE` with its own `u` (stream `'utilities'`, key `'tower'`); on the tower's grid outage `towerBatteryH = N(3.5, 0.75)` counts down; `towerOn = false` at zero → `towerDarkSim`; `dataOn = towerOn && !(u1m > 20 for 30 min, p 0.9 per bucket)`; `smsOn = towerOn`; transient `NONE` while `towerOn && u1m > 45` (bucket hash p 0.5); `state` per the ladder; `restoreSim = max(dayStart(1) + 12 h, towerDarkSim + 24 h)` keeps `SOS` at least until then; `cowSim = dayStart(3) + 11 h` → `1X`; `lte1Sim = dayStart(4) + 9 h`; `normalSim = dayStart(8) + 9 h`. Held messages deliver in a burst on any transition to a state with `smsOn`; `sendText` while `!smsOn` marks `failed` (the phone shows "Not Delivered"); `sosSeen` is set on the first `SOS`.
- **Water**: `pressure = exp(−(t − plantLostSim)/12 h)` after the plant's own outage (`hash01(seed,'plant')` in T−7…T−3); `containers[id].fillL += 0.21·pressure·h` L/s-equivalent while `tapOn` (12 min for a 150-L tub at full pressure), stops below 0.3; `storedL = Σ fillL`; `drawWater` takes from the largest container; drain seep 10 %/day unless `drainTaped`; `heaterWarmL` decays over 24 h after the outage or when `breakers.waterHeater` is off; boil notice when `pressure < 0.5`; return ramp `dayStart(2) + 2 h → dayStart(3) + 2 h`; lifted `dayStart(10) + 10 h`.
- **Media**: cable node hazard = the county logistic below evaluated 1 h early; `cableOn = false` 40 min after the node's outage; `wifiOn = (power.on || generator.circuits.includes('router')) && modemAlive`; antenna always ok.
- **County**: **`outageFraction = max(outageFraction, 1/(1 + exp(−(uGustEnv − 27)/4.5)))`** (a ratchet on the house's envelope as the county proxy; ≈ 0.1 at T−12, 0.45 at T−7, 0.93 at T−4); `restoreFraction` 0 → 0.5 (day 3) → 0.9 (day 8) → 0.99 (day 14) and `outageFraction` follows `1 − restoreFraction` from day 1; curfew from `T0 + 7 h` nightly 21–06 until `dayStart(7) + 6 h`; POD `dayStart(2) + 10 h`; COW `dayStart(3) + 11 h`; traffic lights `dayStart(6) + 8 h`.
- **Hood — houses and trees**: each neighbour house runs the same opening/garage/cage/roof models with its own thresholds and prep state (`shuttered`, `plywood`; the Bergstrom garage door `N(53,4)`, `garageFailedHalf` from `reversal` at failure); trees: `bend ∝ windLoad` (render), queen frond loss above `uGustEnv 28`, limbs `uStruct > 35` (p 0.2/bucket), uproot when `uStruct > 40 && rainTotalMm > 150` (p 0.15/bucket) with `fallDirDeg = dirFrom + 180`; `damage` = weighted mean of neighbour damage (feeds `debrisRate`); `debrisPileM3` grows from `grounded[]` and from the settled field at `u1m < 12`.
- **Hood — transformers** (`transformers.js`): for each pole of DESIGN §4.1 except the house's, `hazardE += powerHazard·h` with its own `u` (`hash01(seed,'xfmr',id)`); on failure `failed = true`, its `houses[].powerOn = false`, its streetlight span dark, and with p 0.6 `hood:transformerFlash {id, pos, distM}`; `sandpiperW` mirrors `utilities.power`; all poles go dark at `power:lost` (the feeder). Ray's Generac: `hood:genOn ray` 10 s after the first of `power:lost` / `sandpiperE.failed`.
- **Hood — the impact model** (`debris.js`, DESIGN §6.15): at the first sub-step of bucket `k`, for each surface `s`: `λ_s = debrisRate·exposure_s·area_s·source_s` (per second); `n = poisson(λ_s·600, hash01(seed,'impact',s,k))`; each of the `n` impacts gets `simTime = 600k + 600·hash01(seed,'impact',s,k,j,'t')`, a class from the source mix by `hash01(…,'c')`, its energy and a landing `pos` on the surface; all are pushed to `impactQueue`. Each sub-step emits every queued impact with `simTime ≤ now` (`fired = true`) and applies: opening hazard (`hazardAcc`), `damage`, `debrisPileM3`, `grounded[]` for large classes (with the pose of DESIGN §4.2), the cage's stage-5 roof impact (2 000 J, queued by `house:cageStage {5}`). `λ = 0` while `eyeFactor > 0.8`. `impactQueue` is trimmed at the bucket boundary (fired entries dropped) so the hash is stable.

---
## 9. Procedural asset strategy (E4 geometry and textures; E5 shaders)

- **Plan as data → meshes.** `world/plan.js` is the data of DESIGN §3 (wall centre-lines with openings as ranges, room polygons, roofs, lots, trees, sockets, leak points). `build/walls.js` makes each wall segment a `THREE.Shape` with holes → `ExtrudeGeometry` (`bevelEnabled:false`, holes wound opposite, door holes extended 1 cm below the floor line); exterior walls are two half-thickness slabs (stucco outside, drywall inside) with the reveal faces in a trim material via geometry groups. Floors/ceilings are `ShapeGeometry` per room polygon; baseboards are thin box runs minus door widths. All static geometry is merged **per material per room** (`BufferGeometryUtils.mergeGeometries` after `applyMatrix4`), `matrixAutoUpdate=false`, bounding spheres computed, so rooms behind the player frustum-cull. Target ≤ 12 merged meshes per room group, ≤ 14 materials for the house.
- **Roofs**: three hip roofs by hand (6 triangles each, per T §4), fascia rings, vented-soffit quads, ridge caps, gutters (half-cylinders); a windward-slope `InstancedMesh` of shingle tabs 5 mm above the surface that convert to debris and leave a felt decal.
- **Props**: factory functions returning a `Group` of primitives sharing ≤ 2 materials, merged per material, each registering an AABB collider and (if interactive) an `Interactable`; ~120 in the house, ~25 per neighbour house exterior; `InstancedMesh` for anything repeated ≥ 8× (chairs, bottles, panels, pavers, screen panels, streetlights, mailboxes, hedge blobs, fronds).
- **Neighbour houses**: the same plan mirrored/recoloured (`scale.x = −1` with winding flipped and normals recomputed) — 2 variants × 3 stucco × 2 roof colours; beyond 120 m flat boxes.
- **Vegetation**: sabal (cylinder trunk + 20–30 folded frond planes), queen (thin trunk + feather fronds), foxtail, oak (trunk + 4 limb cylinders + canopy icosahedra), hedges (icosahedron blobs), grass cards near the camera (GPU tier only); `aFlex` attribute per vertex; all `InstancedMesh` per species.
- **Textures** (`textures/*.js`): every material is `MeshStandardMaterial` with canvas-generated maps at load (≤ 2.5 s; cached in IndexedDB as `ImageBitmap` keyed by name+seed+version): value-noise/fBm via `ImprovedNoise`, `heightToNormal` Sobel, `tiler(size, w, h, grout, jitter)`; recipes per T §5 (stucco, drywall/knockdown, porcelain tile 0.457 m with veining, bath tile, wood grain, granite speckle, architectural shingles 0.14 m rows, vented soffit, broom-finish concrete, asphalt, St Augustine turf, screen mesh (alphaTest), fabric, brushed steel, painted block, decals). Sizes 512² default, 1024² floor/shingles, 256² noise; `SRGBColorSpace` on colour maps only; anisotropy 8 (4 on SwiftShader). Device screens are `CanvasTexture`s at 512 × 288 (TV), 256 × 512 (phone), 128 × 64 (radio), 320 × 240 (console), updated only when content changes (`needsUpdate` ≤ 10 Hz).
- **Shared uniforms** (`world.materials.uniforms`): `uWind` (Vector4: toward·uInst, real time), `uWet`, `uPowerOn`, `uFlash`, `uTime`; injected via `onBeforeCompile` into `begin_vertex` (wind bend, garage/slider/screen deformation) and after `roughnessmap_fragment` (wetness) with a shared `customProgramCacheKey` so variants share programs.
- **Lighting recipe** (E5 — `render/lighting.js` constructs every light in `init` and nothing constructs one later): `HemisphereLight` (sky colour from the dome zenith) + `AmbientLight 0.12` + one sun `DirectionalLight` with a 30 × 30 m orthographic shadow fitted to the lot (2048² GPU / 1024² SwiftShader, `normalBias 0.02`, `autoUpdate=false`, refreshed every frame outdoors and every third frame indoors) + **≤ 4 `RectAreaLight`s** (2 on low; `RectAreaLightUniformsLib.init()` before the first render) re-positioned to the `fix_win_*` descriptors of the current room and its neighbours + **exactly 8 `PointLight`s** (re-positioned, never created; intensity 0 when idle) + the flashlight `SpotLight` (512² shadow, cookie). **Pool allocation** (`render/powerLights.js`, per frame, hysteresis 0.5 s): candidates are every `registry.fixtures` descriptor that is currently lit (grid·switch·circuit, or a lit candle/lantern, the phone glow, TV bleed, the nearest streetlight, a transformer flash within 30 m), scored by priority class then by distance to the camera; the top 8 get a point light, the rest are emissive-only with the vertex-baked bounce × `uPowerOn`. Priorities: transformer flash > candles/lanterns in the player's room > phone glow > TV bleed > fixtures of the current room > fixtures of adjacent rooms > the nearest streetlight. Vertex-colour bake at build: fixture falloff and wall-junction AO, multiplied by `uPowerOn`. Fake contact shadows as gradient cards. `renderer.compile()` at load for power-on and power-off, indoors and outdoors. The compiled light set is therefore 16 objects, 14 in the fragment loops (1 dir + 8 point + 1 spot + 4 rect), and `MeshStandardMaterial` programs are shared across the whole scene.
- **Glass**: alpha-blended `MeshPhysicalMaterial` (no `transmission`), env map = a 64² `CubeCamera` of the sky layer every 2 s; per-pane rain shader (T §8.2); shutter-behind-glass swap when closed.
- **Sky**: one back-side sphere with the storm dome shader (T §10.1), 3 cloud layers from the 256² noise texture, `uFlash`, stars, the eyewall stadium band; feeds `scene.fog.color` and the hemisphere colour.
- **Rain/splash/debris/water/wet**: per T §10.3–10.8 with the counts of §10 below; debris is CPU kinematic (log profile + `ImprovedNoise`), instanced per class, capped, never inter-colliding, despawning outside an 80-m volume.
- **Audio assets**: none — three noise buffers, SAME bursts pre-rendered per event code (≤ 8 buffers), everything else synthesised on demand (A).

---

## 10. Performance budgets (per frame, 1080p × 1.0 DPR, Intel Iris Xe, 60 fps; written into file headers; structural ones asserted in CI)

| Module | JS ms | Draw calls | Triangles | Other |
|---|---|---|---|---|
| core + clock + tasks + details + scenario | 0.3 | — | — | details predicates at 4 Hz |
| storm (5-s sub-steps, ≤ 12/frame at 60×) | 0.3 | — | — | 200 sub-steps only at 1000×+ (headless/sleep) |
| house + utilities + hood (sub-stepped with the storm: ≤ 12 sub-steps/frame at 60×, ≤ 0.025 ms per sub-step; ≤ 5 ms per frame at 1000× headless) | 0.3 | — | — | the impact model draws once per bucket, not per sub-step |
| player + interaction + life | 0.4 | — | — | ≤ 60 AABBs after broadphase |
| world (per-room merged house, neighbourhood merged/BatchedMesh, instanced vegetation) | 0.3 | 110 | 320 k | rooms cull individually |
| render effects (rain 10 k in one call, splashes 400, debris 300 in ≤ 10 calls, water 3, decals ≤ 40, sky 1, glass ≤ 10) | 2.5 | 60 | 120 k | GPU ≈ 9 ms |
| lighting/materials | — | — | — | ≤ 40 programs; **16 light objects compiled and fixed (hemi, ambient, sun, 8 points, flashlight spot, 4 rect), 14 in the fragment loops; `lights ≤ 16`, `pointLights == 8`, `rectLights ≤ 4`, zero `Light` constructions after `init`**; ≤ 2 shadow casters, never both (sun shadow off when `illumLux < 500` or `sun.el < 0`) |
| audio | 1.0 | — | — | ≈ 34 standing nodes (28 low); ≤ 6 HRTF; ≤ 48 simultaneous sources; 2 convolvers |
| devices (canvases ≤ 10 Hz) | 0.5 | 4 | — | |
| ui (DOM ≤ 4 Hz) | 0.2 | — | — | |
| **Total** | **≤ 6.0 ms** | **≤ 200** | **≤ 500 k** | textures ≤ 60 MB; heap growth < 50 MB per hour |

Quality tiers: `high` (post-processing, 10 k rain, grass, 2048² PCF-soft), `auto` (no grass, bloom on if the GPU is discrete), `low`/SwiftShader (no composer; 2 500 rain, 150 splashes, 80 debris, 1024² basic shadow, 3-octave sky, anisotropy 4, DOM vignette, 30 fps cap). A runtime governor halves particle budgets when frame time > 20 ms for 30 consecutive frames and restores them after 300 good frames; particle density is also scaled by `visibilityM` and by `clock.speed` (25 % above 60×).

---

## 11. Determinism and randomness

- `core/rng.js`: `mulberry32` seeded by `fnv1a32(seed + ':' + streamName)`; streams `'storm'`, `'turb'`, `'damage'`, `'utilities'`, `'hood'`, `'alerts'`, `'details'`, `'life'`, `'fx'`, `'audio'`, `'textures'`. FX and audio streams never influence sim streams. `hash01(seed, ...keys)` is a stateless FNV-1a → uniform for bucket rolls and per-component thresholds.
- `Math.random` is banned (`scripts/lint-random.mjs` greps `src/` and fails CI; the only exception is `audio/buffers.js`'s noise buffer generation, which also uses the `'audio'` stream — so no exception at all).
- `scripts/soak.mjs` and the harness log `hash.stateHash(state)` **every 60 sim-s and on every bus event** (≈ 60 hashes per sim-hour plus events, rather than 700/s at 3600×); two runs with the same seed and preset must produce identical hash logs (test §13.7). The hash excludes every real-time and player-side field (§6.1) — and, by construction, nothing hashed reads one: house structural values come from `uGustEnv`/`uStruct`/`windLoadEnvPa`, impacts from the sim-side model, the details' hashed set from sim envelopes. The player can change the *world* (shutters, buckets, doors) and therefore the hash between two *interactive* runs; the determinism gate compares headless runs with identical scripts.
- Texture generation is seeded; screenshot goldens quote the seed and the schema version.

---

## 12. The headless test harness

### 12.1 Launch
`vite build` then `vite preview --port 4173`; `scripts/screenshots.mjs` launches `playwright-core` Chromium (pinned 1.49.1) with `--headless=new --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --disable-gpu-vsync --disable-frame-rate-limit --autoplay-policy=no-user-gesture-required`, viewport 1280 × 720, DPR 1.

### 12.2 URL parameters (parsed in `main.js`; all optional)
`?seed=7&preset=leah-ref&name=Leah&offset=0&vt=20&hour=14&t=-1.25&pos=great&yaw=270&pitch=0&speed=0&quality=low&headless=1&script=<id>&stub=1&pet=dog&braced=0&service=overhead&photosens=0`
- `t` (hours relative to T0) or `sim=<seconds>`: the app advances deterministically from the scenario start to that time in 5-s sub-steps with rendering off (steps 2–8, 11–13, with `bus.flushSim()` per sub-step), applying the `script` actions at their sim times **through `objects.api.use/place` and the owner setters** (no raycast, no player step), then renders. `hour=` re-anchors T0 (`T0 = dayStart(0) + hour·3600`) and every content anchor follows it (DESIGN §9.6).
- `pos` a room id or `x,y,z`; `yaw`/`pitch` degrees; `speed=0` pauses the clock after arrival.
- `headless=1` disables pointer lock (`requestPointerLock` rejects in headless), forces captions-only speech, `quality=low`, DPR 1, and exposes `window.__sim`.
- `stub=1` uses the storm playback stub (for consumer teams' own scenarios).

### 12.3 `window.__sim`
```js
window.__sim = {
  ready: Promise<void>,                    // resolves after build, compile(both power states), 2 warm frames
  state,                                   // live reference (read-only in headless; guard active)
  advance(simSeconds, realStepS = 1/60),   // steps the loop deterministically (real time advances realStepS per sim frame at the current speed)
  advanceTo(tRelHours | {sim}),            // as above to a target
  advanceUntil(eventName, maxSimS),        // runs until the bus emits the event (or throws) — used for 'power:transformerFlash'
  setCamera(pos, yawDeg, pitchDeg), setPlayer({room|pos, yaw, pitch, crouch}),
  run(scriptId),                           // executes a named action script from scripts/scenarios.json: each step is
                                           //   {atSim|atTRel, use:[objectId, verb]} | {place:[objectId, socketId]} | {setPlayer:{...}}
                                           //   → objects.api.use / objects.api.place (§6.1), which call the owner setters directly
  render(),                                // one frame
  snapshot(): string,                      // canonical JSON of the sim slices
  stats(): {calls, triangles, programs, textureBytes, lights, jsMs: {module: ms}, audio: {...}},
  hash(): string,
  events(): {name, simTime, payload}[],    // the bus log since start (headless keeps it)
  quality(tier)
}
```

### 12.4 Scenario table (`scripts/scenarios.json`; 27 scenarios; each writes `test/screenshots/<id>.png` and `<id>.state.json`)

Every scenario records the **seed it is validated on** (`"seed": 7` unless stated); event-triggered scenarios that depend on a seeded outcome (`transformer`, `eye-street`'s Bergstrom door, `cage-collapse`) state the seed on which the event occurs and CI runs them on that seed only.

| id | t (h) / trigger | pos → look | script | assertions (ROI statistics via a small pure-JS PNG decoder; state via `state.json`) |
|---|---|---|---|---|
| prep-dawn | −32 | foyer → E (through the open front door) | none | mean luminance 0.35–0.65; `utilities.power.on`; halo ROI brighter than surround |
| prep-shutters-half | −27 | front yard → W | `place` 9 panels via `objects.api.place` | 9 openings `shuttered`; prompt DOM present; `clock.tier == 'hold'` during the script |
| tv-cone | −30 | great room → TV | none | TV canvas non-black; cone polygon pixels present; advisory number 21 in state |
| sunset | −18.3 (`storm:sunset` on the reference) | lanai → W | none | warm hue dominant (R > B by 0.15 in the sky ROI); `local.sun.elDeg ∈ [−1, 1]` |
| band1-night | −16 | peep window → N | none | `local.rainMmPerH > 10`; streetlight lit; rain-streak variance in the window ROI > threshold |
| gap-wetstreet | −14 | street → S | none | `cues.wetness > 0.5`, `R < 1`, specular highlights under the streetlight |
| phone-wea | first `alert:wea` | phone up | `advanceUntil('alert:wea')` | WEA banner DOM present; text matches the TOR template; `devices.phone.alertHistory.length ≥ 4` |
| ts-dawn | −8 | lanai → cage | none | `house.cage.stage ≥ 1`; ≥ 1 panel torn by −6 in 80 % of seeds (asserted at seed 7) |
| flicker | next `power:flicker` after −7.5 | kitchen → microwave | `advanceUntil('power:flicker')` | microwave shows 0:00; luminance 30 % of the previous frame at the flicker frame |
| transformer | `power:transformerFlash` + 0.05 s (seed 7 flashes; seed 3 is the no-flash control) | laundry → peep window | `advanceUntil('power:transformerFlash')` | green-cyan peak pixel in the window ROI; next frame `power.on == false` |
| distant-flash | first `hood:transformerFlash` + 0.1 s (seed 7) | driveway → N | `advanceUntil('hood:transformerFlash')` | green tint in the sky ROI toward the pole's azimuth; no local point light active (`stats().lights` unchanged) |
| dark-noon | −2 | front hall, flashlight on | none | mean luminance < 0.08 outside the flashlight cone; `illumLux < 300` |
| eyewall-outside | −1.25 | driveway → E | none | `visibilityM < 400`; `uInst > 35`; player position delta over 60 frames > 0.5 m (pushed); debris instance count > 40 |
| garage-pump | −1.5 | garage → door | none | garage-door vertex displacement > 0.02 m; `garageDoor.pumpAmpEnv > 0.01` |
| front-door-bulge | −1.5 | foyer → front door | none | `openings.door_front.intrusionTier ≥ 1`; `floorWater.door_front.litres > 0`; doormat decal present; `openings.slider_great_W.bowEnvM == 0` (lee) |
| slider-bow | +0.85 | great room → slider | none | `openings.slider_great_W.bowEnvM > 0.02`; `reversal > 0.5`; intrusion decal area at the track > 0 |
| leak-bucket | −1 | foyer → up | `place` bucket_1 at `sock_bucket_lp_foyer_can` | `ceilingLeaks.lp_foyer_can.bucket`; `roof.atticWaterL[E] > 5`; drip particles present |
| eye-sky | 0 | back yard → up | none | sky ROI blue > red; `eyeFactor > 0.9`; `pHpa` within 1 of 950.0; sun shadow present |
| eye-street | −0.1 | street → S | none | bird instances > 0; `hood.houses.bergstrom.garageFailed` and `berg_garageDoor` posed `inYourYard` (seed 7); `ray_oak` pose matches `hood.trees.rayOak` |
| back-eyewall-hit | +0.8 | master → slider | none | `reversal > 0.9`; `floorWater.slider_master_W.litres` increasing and `slider_great_W` too (both W); `floorWater.door_front` not increasing |
| cage-collapse | first `house:cageStage {5}` (seed 7: after the reversal) | lanai → cage | `advanceUntil('house:cageStage')` | `cage.stage == 5`; `hood.grounded[]` has cage pieces in the pool; a 2 000-J `roof` impact in the event log |
| flood | +3 | street → N | none | water plane above the swale bottom; `swaleWaterM > 0.3` |
| night-generators | +8 | driveway → E | none | `power.on == false`; `audio.generatorsActive ≥ 2`; luminance < 0.02 except Ray's windows ROI; `house.thermal.tInC > 28.5` |
| aftermath-dawn | +16.8 (`clock.firstLightSim` on the reference) | front door → E | none | `local.sun.elDeg ∈ [−6, −3]`; sky ROI luminance > 0.1; debris instances ≥ 150; `hood.houses.bergstrom.deckExposed`; tarps 0 (too early) |
| aftermath-day3 | `dayStart(3) + 12 h` (Sun 12:00) | street → S | none | `cow_trailer` present; `kerbPile_*` instances > 0; `cell.state == '1X'`; `ceilingLeaks.lp_foyer_can.rateLph > 0` (still dripping) |
| endcard | `clock.firstLightSim` + step | — | `run('sitOnStep')` (`setPlayer` to the step, `use frontStep sit`) | end-card DOM populated; all numeric fields finite; `tasks` count matches the script |
| night-eye | 0 with `hour=2` | back yard → up | none | `eyeFactor > 0.9`; `clock.isNight`; stars ROI has bright pixels; every content anchor's `tRel` equals the reference run's (see §13.7) |

Goldens (`test/screenshots/golden/`) are regenerated only with `--update`; CI compares mean absolute difference < 2 % and treats goldens as **advisory** — the ROI statistics and `state.json` assertions are the gate (SwiftShader dithering differs across versions). The suite runs ≤ 8 min in CI (10 warm frames per scenario, 4 parallel workers).

### 12.5 Soak and structural CI
- `scripts/soak.mjs`: 300× full arc (T−32 → T+17) headless with `stub=0`: no exceptions; no `NaN`/`Infinity` anywhere in the sim slices (walked every 10 sim-min); heap growth < 50 MB; event counts in range (`power:transformerFlash` 0–1; `hood:transformerFlash` 1–4; **exactly one** final `power:lost`; ≥ 1 `house:leakStarted`; ≥ 1 `house:ceilingSag` when no bucket script runs; 12–30 `house:earPop`; `hood:debrisImpact` 200–2 000; exactly one `storm:eyeEnter` and one `storm:windReversal` on the reference preset; zero `storm:eyeEnter` on `nearmiss-cat3`; `pet` never in `panic` for > 3 sim-min continuously at 1× over a 20-min sample); the details engine fired ≥ 95 % of the entries **not tagged [P]/[R]/[S]** (DESIGN §12), and every [S] entry fired in ≥ 20 % of seeds 1–20.
- `scripts/budgets.mjs`: at six `t` values (−30, −12, −1.25, 0, +1, +16.8) run 300 fixed-dt frames and assert `stats()`: `calls ≤ 200`, `triangles ≤ 500k`, `programs ≤ 40`, `textureBytes ≤ 60 MB`, **`lights ≤ 16`, `pointLights == 8`, `rectLights ≤ 4`, `lightsCreatedAfterInit == 0`** (a counter patched onto `THREE.Light`'s constructor in debug builds), per-module `jsMs` within the §10 table (fps itself is not asserted on a GPU-less runner).
- Determinism: two soak runs with seed 7 produce identical hash logs; a `quality=low` and a `quality=high` run produce identical hash logs (the cosmetic field cannot touch state); `lint-random.mjs` passes; `scripts/ids.mjs` asserts `objects/catalog.js`, `world/registry.js` and the details' trigger paths against `core/ids.js`.

---

## 13. Unit tests (`node --test test/`; pure modules, no DOM; owners write their own; E1 owns the runner and fixtures)

### 13.1 Holland profile (`test/storm/holland.test.js`) — reference preset (Vmax 51.4 m/s, Pc 950, Pn 1012, RMW 25 km, B 1.5)
| r (km) | expected `Vsym` (m/s) | expected `P` (hPa) |
|---|---|---|
| 0.5 | < 0.5 | 950.0 ± 0.05 |
| 10 | 23.3 ± 0.3 → **4.1 ± 0.3 after the eye override** | 951.2 ± 0.1 |
| 15 | 42.4 ± 0.4 → 24.4 ± 0.5 after the override | 957.2 ± 0.1 |
| 20 | 49.8 ± 0.4 → 48.6 ± 0.5 | 965.3 ± 0.1 |
| 25 | 51.4 ± 0.05 (the maximum) | 972.8 ± 0.1 |
| 40 | 46.5 ± 0.4 | 987.8 ± 0.1 |
| 50 | 42.2 ± 0.4 | 993.5 ± 0.1 |
| 100 | 28.2 ± 0.3 | 1004.7 ± 0.1 |
| 200 | 17.4 ± 0.2 | 1009.3 ± 0.1 |
| 720 | < 8 | 1011.6 ± 0.1 |
Also: monotone decrease for r > RMW; `P` monotone in r; B clamp `[1.0, 2.2]`; R34/R50/R64 (marine 17.5/25.7/32.9 m/s) at 200 ± 20 / 115 ± 12 / 80 ± 8 km.

### 13.2 Direction and exposure (`direction.test.js`)
On-track approach at r = 200 km: `dirFromDeg` in 100–115° (ESE); departure at r = 200 km: 280–295° (WNW); the veer across the passage exceeds 150°; `reversal` reaches 1 within 30 sim-min of `storm:eyeExit` on the reference preset and `storm:windReversal` fires exactly once, after `storm:eyeExit`; `+20 km` offset: veers monotonically (clockwise), peak `u1m` ≥ 8 % above the `−20 km` run (right-side asymmetry); `−20 km`: backs; `nearmiss-cat3` never sets `eyeFactor > 0.05` and fires `storm:windReversal` at its first `reversal ≥ 0.5`; `kExp` returns 0.85 for 285° and 0.78 for 110°; back-RMW `u1m` (0.85 × 94.5 kt) exceeds front-RMW `u1m` (0.78 × 100 kt) — 41.3 vs 40.1 m/s ± 0.3 (`bandWind` = 1 inside 1.4 RMW by construction, so no band factor enters); `uGustEnv/u1m` = 1.65 at the RMW and `1.55·bandWind` in the principal band; `uMarine` at the front RMW = 51.4 ± 0.3.

### 13.3 Turbulence (`turbulence.test.js`)
At `u1m = 40` over 10⁵ real sub-steps: mean(`uInst`)/`u1m` = 1.00 ± 0.02; `G(3 s / 1 min)` = 1.45–1.65; `Iu` 0.25–0.31; strong-gust (> 1.3·U) interval 20–60 s; lulls to 0.6·U every 1–3 min lasting 5–20 s; spectral variance split within 10 % of 0.35/0.45/0.20; identical series for identical seeds; the real-time statistics are invariant when `speed` is 1× vs 120× (the 180-s process differs, the fast ones do not).

### 13.4 Warp exactness (`warp.test.js`, E1+E3)
Run T−10 → T+4 with frame `dtSim = 1 s` and with frame `dtSim = 600 s` (both with real dt fixed at 1/60 s; the sim block sub-steps at 5 s in both, so the 600-s frame runs 120 sub-steps): `power.hazardE`, `house.soffitIntegral`, `roof.atticWaterL`, `local.rainTotalMm`, `house.thermal.tInC`, `utilities.water.containers.tubHall.fillL`, `house.fridge.coldReserveH`, `utilities.generator.fuelL`, `devices.phone.battery`, `utilities.county.outageFraction` within 2 %; **identical** failure outcomes (the same components fail in the same buckets — grid, tower, garage, every cage panel, every opening, the anemometer, every transformer, every impact in `hood:debrisImpact`'s log) for seed 7 and seeds 1–20; identical `house:doorSlam` counts; identical event logs from the sim block (names, `simTime` to the sub-step).

### 13.5 Bands, rain, timeline (`bands.test.js`, `timeline.test.js`)
Time-averaged rain over T−18 … T−4 within ±25 % of the R-CLIPER mean; ≥ 2 distinct band passages (`storm:bandEnter`) before T−10; eyewall rate 50–100 mm/h; storm total 250 ± 40 mm at 20 km/h, ≈ doubles at 10 km/h; band spacing at r = 150 km between 40 and 120 min. **Phases are house-level:** `phase == ts` from T−7.0 ± 0.7 h (`u1m ≥ 17`); `phase == hurricane` from T−2.5 ± 0.4 (`u1m ≥ 33`) and `eyewallFront` from T−1.75 ± 0.3 (r ≤ 1.4 RMW); `uMarine ≥ 33` at T−4.0 ± 0.4 (a product time, not a phase); `eyeFactor > 0.5` for 75–90 min and `u1m < 8` for 40–55 min on track; `illumLux < 500` at T−2 (noon), < 300 at T−1.25, and > 10 000 at T−0.4; `illumLux` at T−6.75 (07:15 Thu) < 150 and at T−6 (08:00) 300–800; `dPdt` 15–30 hPa/h somewhere in T−2 … T−0.5; pressure minimum within 0.5 hPa of 950.0 at T0 ± 3 min; visibility < 300 m at T−1.5 and 350–700 m at T−4; `storm:sunset` on the prep day at T−18.25 ± 0.1 h and `storm:civilDawn` on Friday at T+16.75 ± 0.1 h; `uGustEnv ≥ 18` first occurs before T−11; `uGustEnv > 14 && bandRain ≥ 1` is true for ≥ 30 sim-min during band 1.

### 13.6 House and utilities (`house/*.test.js`, `utilities/*.test.js`)
Monte Carlo over seeds 1–200 on the reference preset: outage median in T−7 … T−4 and 95 % before T−2; ≥ 3 flickers before the outage in every seed and a band-1 flicker in 25–55 % of seeds; **unbraced garage failure 30–40 %, braced < 5 %** (thresholds N(57,4)/N(66,4)); the Bergstrom door fails in 55–85 % of seeds and, when it fails in the front half, `hood.grounded[]` holds `berg_garageDoor` posed `inYourYard`; cage stage 5 in > 95 % of seeds, and in > 60 % of those only after `storm:windReversal`; bare `peep_laundry_N` failure 14–22 %, shuttered 0.5–3 %; closing all shutters cuts the intrusion litres by ≥ 60 %; `slider_great_W.bowEnvM == 0` for all of T−7 … T0 and > 0.02 somewhere in T+0.5 … T+1.5; the east soffit integral reaches 30 mm·h at T−2.4 ± 0.4 and `lp_foyer_can` is active by T−2.0; `roof.atticWaterL[E]` peaks at 15–35 L and `lp_foyer_can.rateLph > 0.05` at T+24 h; with no bucket ever placed, `house:ceilingSag` fires and `house:ceilingCollapse` fires before T+30; with a bucket placed at T−1, neither fires; two tubs = 360 L (`utilities.water.storedL`) and the flush ledger empties in 36 flushes; a bucket under an active leak keeps `floorWater[lp].litres == 0` until `house:bucketOverflow`; **`tInC` after 6 h in a sealed house at `tAirC = 30`, no sun, from 24 is 30.9 ± 0.3** (exponential toward 33, τ 3 h) and on the reference run `tInC ≥ 28.5` by T+8; `dpRoomPa` in a sealed windward room never exceeds 40 Pa below `uGustEnv` 66 and exceeds it within one sub-step of `house:openingFailed` in that room; CO in a closed garage reaches the alarm curve within 8 min of the generator starting and `house.coDose` (not `player.*`) reaches 4 500 in 28 ± 3 min of standing in it; cell: `smsOn === towerOn` always, `dataOn` false while `smsOn` true for ≥ 1 h in ≥ 90 % of seeds, WEA suppressed iff `!towerOn`, the EWW WEA delivered in 55–85 % of seeds, the tower dark at T−2.4 ± 1.2 (median across seeds within T−3.5 … T−1.5); the held burst on restore is ordered by `sentSim`; SOS lasts ≥ 24 h; `cowSim` renders as Sunday 11:00 and `restoreScheduledSim` as Tuesday 16:12 ± 1 d on the reference; `county.outageFraction` at T−12 / T−7 / T−4 is 0.05–0.15 / 0.35–0.55 / ≥ 0.85; every `hood.transformers[id]` fails at most once and 1–4 `hood:transformerFlash` per run in ≥ 90 % of seeds; boil notice only if pressure ever < 0.5; the water plant loses pressure to < 0.05 between T+12 and T+36; the impact model at a fixed state yields `hood:debrisImpact` counts within Poisson bounds of `Σλ_s·600` per bucket and the identical list at every `dtSim`.

### 13.7 Alerts, tones, details, core
- `alerts`: the warning is active at sim start; advisories issue on the 05/11/17/23 cadence with intermediates and hourly TCUs from T−6, numbered from the first full advisory at or before `clock.startSim` (#21 on the reference); **the EWW issues 50–70 min before `storm.api.eyewallCoastSim()`** (≈ T−3.1 on the reference) and never when marine Vmax < 100 kt; a second EWW issues at `storm:eyeEnter` + 10 min; TOR count over seeds 1–50 on-track is 1–6 (mean ≈ 3); the forecast 24-h point error is 55 ± 5 km; consecutive `shiftKm` are non-zero; HLS follows every advisory within 1 h; the "Not Delivered" flag is set on the first `sendText` after `cell:stateChanged → SOS` and never before.
- **Content anchors** (`content/*.test.js`): running the reference preset and `hour=2` (night eye) and `vt=8`, every content item's *issued* `tRel` matches across the three runs within 5 min for `tRel`-anchored items and exactly for event-anchored items; the sunset photos follow `storm:sunset` in all three; the calendar-keyed items (garbage reminder, advisory cadence, curfew hours) are the only rows whose `tRel` differs.
- `same.test.js`: the encoded header `ZCZC-WXR-EWW-012115-012081+0300-2461455-KHB32/NWS-` round-trips through a reference AFSK decoder (bit timing 520.83 baud, mark 2083.3 / space 1562.5 Hz, LSB-first, 16 × 0xAB); burst length 1.21 ± 0.02 s; the WAT is 1050 ± 1 Hz by FFT over an offline render; **WEA**: spectral peaks at 853 and 960 Hz; on/off pattern 2.0 / 0.5 / 1.0 / 0.5 / 1.0 s, repeated once after 0.5 s (envelope edges within 10 ms).
- `details.test.js`: unique ids; every trigger references existing schema paths **or ID-registry ids** (schema walk over §3 + `core/ids.js`); every entry is tagged or reads no real-time/player field (a static grep of the predicate source against the excluded-field list); a 48-h dry run at 600-s steps fires ≥ 95 % of untagged entries; `captionsUsed ≤ 12`; `details.firedHashed` is identical across two runs.
- `core`: the clock never exceeds the sub-step clamp; auto-pace transitions are hysteretic (no flapping on a synthetic 1-h wind ramp); the wind cap holds `speed ≤ 10` whenever `u1m ≥ 26`; `bus` delivers in order and only at flush, and `flushSim` delivers only to sim-side listeners; sleeping through the eye is interrupted by `storm:eyeEnter` at the exact sub-step; a sleep started at T−3 is interrupted by `house:garageFailed` on a seed where the door fails, at that sub-step; skip across `power:lost` lands at `power:lost`; `hash` is identical across two runs; `guard` throws on a foreign write (including `house → player.coDose`, which no longer exists); `objects.api.use/place` produce the same state as the equivalent `Interactable.use`.
- `life`: with `roar = 1` held for 30 real minutes and no impulses the pet never enters `panic`; an `alert:wea` impulse from `hide` enters `panic` and returns to `hide` within 120 s.
- `render` (jsdom + a stub renderer): `stats().lights == 16` after `init` and after 10 000 frames across every power state and room; the pool allocation never assigns the same fixture twice; `hood.impactQueue` entries due within flight time each get one spawned body.
- `audio` (OfflineAudioContext): wind RMS and spectral centroid rise monotonically with `u1m` from 10 to 50; the eye transition falls ≥ 30 dB over 8 sim-min; standing node count ≤ 34 after 60 s of running; HRTF panner count never exceeds 6 with 12 candidate sources; the UI bus bypasses the ear filter (a 1-kHz UI click keeps its level when the ear LPF is at 1.2 kHz); the speech queue lets a priority-2 line pre-empt the routine NWR cycle within one chunk.

---

## 14. Integration plan

### 14.1 Milestones (8 weeks; Friday integration through the screenshot suite)
- **W1** — E1 lands `schema.js`, `events.js`, `ids.js` (the DESIGN §16 registry), `bus.js` (with `flushSim`), `clock.js` (`dayIndex`, `isNight`, the wind and scenic caps), `rng.js`, `guard.js`, the sub-stepped loop and `window.__sim`; E4 lands `plan.js` (with `adjacency` and `fixtures`) and a grey-box walkable house with colliders/`roomOf`; E2 lands the **stub** (§14.2), `sun.js` and the Holland/track core with §13.1–13.2 tests; E3 lands the ledger skeletons (`utilities.water.containers`, `house.fridge`, `house.pool`, `power.breakers`) so E1's object behaviours have setters to call; E7 lands the DOM shell (setup, pause, prompts, `subtitle`). *Everyone codes against the typedefs, the registry and the stub from day 2.*
- **W2** — real storm model + turbulence + bands + tests (E2); power/cell/water models (E3); textures and materials sprint (E4); sky, lighting, rain, exposure (E5); noise buffers, wind/rain engine, occlusion (E6); phone + WEA + NWR + alerts scheduler (E7); controller + interaction registry + shutters/tubs (E1).
- **W3** — house structure: openings, garage, cage, intrusion, leaks (E3); debris, glass, structure FX, decals (E5); tones, SAME, speech manager, outage beat (E6); TV + console + content (E7); objects catalogue, carry, sleep dialogue, pet (E1). First full-arc soak.
- **W4** — neighbourhood geometry/vegetation (E4); flood/pond/pool water, transformer/lightning, power lights (E5); machines/biophony/aftermath sounds (E6); radar/cone/forecast on phone and TV, journal, chapters (E7); tasks and endings (E1). Golden screenshots frozen for W1–W4 scenarios.
- **W5** — eye and reversal polish (E2/E5/E6); aftermath model and dressing (E3/E5); details catalogue pass 1 (all owners; `docs/audit.md` lines opened per detail).
- **W6** — details catalogue pass 2; the Highlights preset; presets other than the reference validated (no-eye path, night eye, canal-front).
- **W7** — performance pass to the §10 table on Iris Xe; SwiftShader path; soak/budget CI green; accessibility options.
- **W8** — playtests against the pacing bar; audio listening pass per phase; bug bash; the audit is complete (a detail without a proof is removed, not shipped).

### 14.2 The stub storm (E2, day 2)
`storm/stub.js` plays back the hour-by-hour table of `docs/research/meteorology.md §11` (house-level columns) with linear interpolation in `tRel`, computes `local.*` from the interpolated values (direction, pressure, rain, illuminance from the §7.6 formula, `uMarine = u1m/kExp`, `uGustEnv`/`uStruct` from §7.3, `bandFrontM` from the table's band times), uses the real `sun.js`, runs the real turbulence stack on top, and emits the phase/eye/reversal/sun events at the table's times. It supports `offset`, `vt` (time scaling) and `hour` crudely. Every consumer must run unchanged against the stub and the real model; the screenshot suite runs against both until W4.

### 14.3 Working rules
- A PR touches one owner's directory; cross-directory needs are an issue tagged to the owner, or a `state-changelog.md` entry approved by E1.
- File headers carry: owner, state slices written, cues/events consumed, budget line.
- `npm test` (unit), `npm run shots` (screenshots), `npm run soak`, `npm run budgets`, `npm run lint:random` all run in CI on every PR; the screenshot goldens are advisory, the assertions are blocking.
- Debug builds run with `guard` proxies on and a per-module ms overlay (`?debug=1`).
- The realism audit (`docs/audit.md`) is the definition of done for DESIGN §12.

### 14.4 Cut list (ranked; cut from the bottom only)
1. The Nguyens' walkable foyer (replace with a door prompt + photo). 2. The sitcom channel. 3. Grass cards. 4. Screen-space droplets. 5. Bloom. 6. The bird flock (keep the audio). 7. Neighbour NPC figures (keep voices and texts). 8. The Ring feed (keep the notifications). Never cut: the radar loop from the band field, the two-clock turbulence, the WEA/SAME exact tones, the peep window, the sleep dialogue, the reversal.

---

## 15. Implementation work packages

One package per module directory. **Owned paths** are exclusive; **exports** are the exact public surface (`index.js` always also exports `init`, `update`/`step`, `dispose`, `api`); **reads** and **writes** are state slices (writes are exclusive per Law 1; setters listed are the only foreign write path into the slice); **events** are from §5; the **acceptance checklist** is what must be green before the package is called done. Budgets are the §10 row for the module. Every package can be built against the stub storm (§14.2), the ID registry (`core/ids.js`) and the typedefs from day 2.

### WP-1 core (E1) — `src/main.js`, `src/core/`
- **Owned paths:** `main.js`, `core/{state,schema,ids,guard,events,bus,clock,sleep,rng,loop,input,quality,save,debug,hash}.js`.
- **Exports:** `core/state.js: createState(meta) → SimState`; `core/schema.js`: the typedefs of §3 (JSDoc) + `SCHEMA_VERSION`; `core/ids.js`: `OBJECT_IDS, SOCKET_IDS, FIXTURE_IDS, PROP_IDS, LEAK_POINTS, IMPACT_SURFACES, ROOM_IDS, YARD_SECTORS, EXTRA_KEYS, INTRUSION_TIERS, LEAK_TIERS`; `core/events.js: EV` (frozen names) + `WAKE_EVENTS`, `MOMENT_EVENTS`, `SOFT_MOMENT_EVENTS`; `core/bus.js: createBus() → {on, off, emit, flush, flushSim, log}`; `core/clock.js: clock.api.{requestSpeed, toggleAutoPace, startMoment, startSoftMoment, sleepUntil, skipToNext, pause}` and the tier machine (§4 step 2; tiers of DESIGN §2.2 including the wind cap and the scenic cap; `dayIndex`, `dayStart0`, `hour`, `isNight`, `startSim`, `firstLightSim`); `core/sleep.js` (the interrupt list = `WAKE_EVENTS`, the 8-h cap, `flushSim` per sub-step); `core/rng.js: createRng(seed) → {fork(name), hash01(...keys)}`; `core/loop.js: runFrame(ctx, dtReal)` and `advanceSim(ctx, simSeconds)` (the sub-stepped sim block of §4 steps 3–6); `core/hash.js: stateHash(state)`; `core/guard.js: freezeExcept(state, slices)`; `core/save.js: snapshot()/restore(json)`; `core/api.js: {journal, endRun, snapshot, restore}`; `main.js` exposes `window.__sim` (§12.3) and parses §12.2.
- **Reads:** everything (the loop); the clock reads `local.{phase, u1m, eyeFactor, bandRain, sun}`, `player.{outdoors, carrying, phoneUp, holdingVerb}`, `life.wildlife.flockActive`, active `npc:say`.
- **Writes:** `meta`, `clock`, `log`, `debug`.
- **Emits:** `clock:phase`, `clock:tier`, `clock:sleepStart/End`, `clock:moment`, `game:chapter` (via scenario), `debug:*`. **Consumes:** every `WAKE_EVENTS`/`MOMENT_EVENTS` member, `storm:phaseChanged`, `storm:sunset` (soft moment), `player:sleep/wake`, `interact:holdStart/End`.
- **Acceptance:** §13.7 `core` items; §13.4 warp test passes for every slice in the sim block; `guard` throws on any foreign write in debug; `hash` identical across two headless runs and across `quality=low/high`; `scripts/ids.mjs` green; `advanceSim(600)` performs 120 sub-steps calling `storm/utilities/house/hood.step` in order; sleep ends at the emitting sub-step; skip never lands past `eyewall*`/`eye`; the wind cap and scenic cap hold; Standard/Full run-length estimates of DESIGN §2.2 within ±15 % on a scripted headless play-through.

### WP-2 player (E1) — `src/player/`
- **Owned paths:** `player/{controller,collision,doors,interact,carry}.js`.
- **Exports:** `player.api.{setPose(pos, yaw, pitch), setRoom(roomId), teleport(roomId|pos), sleepAt(objectId), wake(reason)}`; `interact.api.{current() → Interactable|null, use(verb), beginHold/endHold}`.
- **Reads:** `local.{uInst, uG3, dirInstDeg}`, `cues.pushForceN`, `house.doors/openings/garageDoor`, `world.registry.{colliders, sockets, props}`, `objects.*`, `hood.impactQueue` (for the hit roll), `clock.tier`.
- **Writes:** `player` (only). Foreign writes only via `house.api.*`, `utilities.api.*`, `devices.api.*`, `objects.api.*`.
- **Emits:** `player:roomChange`, `player:outdoors`, `player:knockedDown/up`, `player:injury`, `player:sleep/wake`, `interact:use/pickup/drop/holdStart/holdEnd`, `house:doorSlam` (player-caused). **Consumes:** `hood:debrisImpact` (yard-sector hit roll, stream `'life'`), `house:openingFailed` (injury roll in-room), `house:coDose`.
- **Acceptance:** capsule never penetrates a collider at 4.5 m/s across the plan; ≤ 60 AABBs after broadphase; door wind rules of DESIGN §10.1 (held / ripped / slammed outcomes) reproduced in a unit test with synthetic `uGustEnv`; knock-down at `uG3 > 50` with 3-s recovery; injury reaches 1.0 in 60–120 s in the open at the back-eyewall onset and > 3 min in the lee; `player.coDose` does not exist; headless `setPlayer` and `objects.api.use` do not require this module's frame step.

### WP-3 objects (E1) — `src/objects/`
- **Owned paths:** `objects/catalog.js`, `objects/behaviours/*.js` (one per kind of DESIGN §16.1), `objects/api.js`.
- **Exports:** `catalog: Object<string, Interactable>` (exactly `OBJECT_IDS`); `objects.api.{use(objectId, verb), place(objectId, socketId), state(id)}`.
- **Reads:** `house.*`, `utilities.*`, `devices.*`, `local.u1m` (the "wind has this now" block), `player.carrying`, `world.registry.sockets`.
- **Writes:** `objects` (placement, `open`, `on`, `secured`, `socket`, `count`, hand-light `battery`, `extra` keys of §16.1 only).
- **Emits:** `object:changed`. **Consumes:** `power:flicker` (clears `clockSet`), `power:lost/restored`, `water:pressureLost`, `interact:*`.
- **Acceptance:** every catalogue id has a behaviour and a prop mesh (`scripts/ids.mjs`); no behaviour assigns into a foreign slice (guard test); every DESIGN §10.2 row maps to a `verbs()`/`use()` pair with the stated hold time and setter; `objects.api.use('tap_tubHall','on')` fills `utilities.water.containers.tubHall` at the same rate as the interactive path; the panel/nut arithmetic (19 panels, 76 nuts, `fastening = n/4`) is unit-tested.

### WP-4 life (E1) — `src/life/`
- **Owned paths:** `life/{pet,neighbours,wildlife}.js`.
- **Exports:** `life.api.{pet.call(), pet.pet(), pet.pickUp(), pet.leash(), pet.feed(), pet.walk(), neighbour.say(who, lineId)}`.
- **Reads:** `cues.{roar, whistle, eyeFactor}`, `local.{uInst, u1m, tAirC}`, `house.thermal.tInC`, `house.openings` (shuttered fraction), `utilities.power.on`, `clock.isNight`, `player.pos` (frustum test), `hood.houses`.
- **Writes:** `life`.
- **Emits:** `pet:state`, `npc:say`. **Consumes:** `hood:debrisImpact`, `alert:wea`, `storm:lightning`, `house:openingFailed`, `house:garageFailed`, `storm:eyeEnter/Exit`, `clock:phase`, `storm:sunset/civilDusk` (crickets), `storm:bandExit` (frogs 20–40 min later).
- **Acceptance:** the fear relaxation model of DESIGN §11.1 with the panic statistic (< 8 % of hurricane-wind minutes, ≤ 3 min continuous); relocation only when unobserved > 5 s; the `eye` state appears at the slider within 60 s of `eyeFactor > 0.6 && uInst < 8`; `pet:state` is never in `WAKE_EVENTS`; neighbour lines fire once each by phase and never overlap the speech queue's priority rules.

### WP-5 details (E1) — `src/details/`
- **Owned paths:** `details/{engine,catalogue}.js`, `docs/audit.md`.
- **Exports:** `catalogue: {id, channel, tags: ('P'|'R'|'S')[], repeat, trigger(state, bus) → boolean, present?: string}[]` (180 entries of DESIGN §12); `details.api.{fired(id), reset()}`.
- **Reads:** any sim-time path named in a trigger; tagged entries may read `player.*`/real-time fields.
- **Writes:** `details` (`fired`, `firedHashed`, `captionsUsed`).
- **Emits:** `detail:fired {id, channel}`; journal lines via `core.api.journal`. **Consumes:** every bus event a trigger names.
- **Acceptance:** §13.7 `details.test.js`; the tag audit grep; `captionsUsed ≤ 12` with exactly the seven C-entries able to call `ui.api.caption`; the 48-h dry run at 600-s steps fires ≥ 95 % of untagged entries on seeds 1–5; `docs/audit.md` has a proof line per entry by W8.

### WP-6 scenario (E1) — `src/scenario/`
- **Owned paths:** `scenario/{tasks,chapters,endings,presets}.js`, `scripts/{screenshots,soak,budgets,lint-random,ids}.mjs`, `scripts/scenarios.json`, `test/` harness.
- **Exports:** `presets: {id → StormPreset + startTRel}`; `tasks.api.{list(), complete(id)}`; `chapters.api.{list(), restart(id)}`; `endings.api.check()`.
- **Reads:** `house.{coDose, openings, cage, garageDoor, roof, fridge}`, `utilities.*`, `player.injury`, `clock.*`, `details.fired`, `log`.
- **Writes:** `tasks`; `meta.presetId/options` at setup.
- **Emits:** `task:done/available`, `game:chapter`, `game:end`. **Consumes:** `player:injury`, `house:coDose`, `interact:use frontStep`, `clock:phase`.
- **Acceptance:** the 14 prep tasks and 8 aftermath tasks tick from state only; chapter restart replays the seed to an identical hash; `game:end` fires for `injury ≥ 1`, `house.coDose ≥ 4500` and the front step in `aftermath` after `clock.firstLightSim`; the end card's fields are all finite on every scenario; `startTRel` follows DESIGN §1.1 for `vt = 8` (T−56) and `vt = 20` (T−32); §12.4/12.5 scripts run green in CI with the scenario seeds recorded.

### WP-7 storm (E2) — `src/storm/`
- **Owned paths:** `storm/{holland,track,bands,turbulence,rain,light,thermal,flood,lightning,forecast,sun,cues,predict,stub,index}.js`.
- **Exports:** `api.{setScenario, windAt, rainAt, bandFieldAt, rcliper, radarFrame, predict, forecast, setStub, sunAt, nextSunEvent, firstLightAfter, eyewallCoastSim}`; `step(h)` (sim block) and `updateRealtime(dtReal)`; pure functions `holland.vsym(r, preset)`, `holland.pressure(r, preset)`, `light.illuminance(...)`, `light.visibility(...)`, `sun.position(simTime, lat, lon)`.
- **Reads:** `meta.options`, `clock.{simTime, dtSim, dtReal}`, `house.thermal` (for `cues.heatIndexC`), `utilities.api.powerSurvival()` (predict), `player.outdoors` is **not** read (both heat indices are published).
- **Writes:** `storm`, `local`, `cues`.
- **Emits:** `storm:phaseChanged`, `storm:bandEnter/Exit`, `storm:lightning`, `storm:mesovortex` (real-time), `storm:eyeEnter/Exit`, `storm:windReversal` (rule in §5), `storm:landfall`, `storm:sunrise/sunset/civilDawn/civilDusk`, `storm:advisoryDue`. **Consumes:** none (the storm listens to nobody).
- **Acceptance:** §13.1, §13.2, §13.3, §13.5 in full; the illuminance reference values of §7.6; `sunAt` within 0.3° of NOAA for Sep 2–4 2026 at the lot; `predict()` phase times within 10 min of the actual run; `bandWind == 1` for `r < 1.4 rmw`; `uGustEnv/u1m` per §7.3; the stub reproduces the M §11 table columns within 5 % and emits the same event set as the real model.

### WP-8 house (E3) — `src/house/`
- **Owned paths:** `house/{structure,openings,garage,cage,roof,intrusion,pressure,thermal,co,ledgers,api,index}.js`.
- **Exports:** `house.api` (§6.3); `step(h)`; pure `structure.bucketRoll(seed, component, k)`, `intrusion.tiers(rainWall)`, `thermal.target(...)`, `pressure.roomDp(...)`.
- **Reads:** `local.{u1m, uGustEnv, uStruct, dirFromDeg, rainWallMmPerH, pHpa, dPdtHpaPerH, tAirC, cloudFrac, sun, eyeFactor, reversal, streetWaterM}`, `cues.{windLoadEnvPa, powerHazard, debrisRate, leakRate}`, `utilities.{power.on, power.breakers, generator}`, `hood.{damage, impactQueue}`, `player.room` (CO dose, pressure prompt), `objects.detector_hall.battery`, `plan.adjacency`, `clock.dayIndex/isNight`.
- **Writes:** `house`.
- **Emits:** `house:openingFailed`, `house:sliderUnlatch`, `house:doorRipped/doorSlam` (wind-caused), `house:garageBuckle/garageFailed`, `house:cagePanelTear`, `house:cageStage`, `house:shingleLoss`, `house:leakStarted/leakTier`, `house:ceilingSag/ceilingCollapse`, `house:intrusion`, `house:earPop`, `house:atticWhump`, `house:bucketOverflow`, `house:detectorChirp`, `house:coAlarm/coDose`. **Consumes:** `storm:eyeEnter` (`eyeStartSim`), `storm:windReversal`, `hood:debrisImpact` (opening hazard, roof), `power:lost/restored` (fridge, thermal, detector clock).
- **Acceptance:** §13.4 for every house field; §13.6 house items (garage 30–40 % / < 5 %, cage, bare-glass, intrusion litres, the attic reservoir numbers, sag/collapse reachability, the thermal 30.9 ± 0.3 and `tInC ≥ 28.5` by T+8, `dpRoomPa` bounds, CO/`house.coDose`); no read of `uInst`/`uG3`/`windLoadPa` anywhere in `house/` (a CI grep); `bowEnvM == 0` on lee openings; the fridge and pool ledgers match DESIGN §6.12 arithmetic; every setter returns `{ok, reason}` and no-ops when blocked.

### WP-9 utilities (E3) — `src/utilities/`
- **Owned paths:** `utilities/{power,generator,cell,water,media,county,api,index}.js`.
- **Exports:** `utilities.api` (§6.4); `step(h)`; pure `power.survivalCurve(preset, seed)`, `county.outageFraction(uGustEnv)`, `cell.ladder(flags)`.
- **Reads:** `local.{u1m, uGustEnv, bandRain, rainMmPerH}`, `cues.powerHazard`, `clock.{dayIndex, dayStart0, isNight, simTime}`, `meta.options.service`, `hood.transformers` (Ray's Generac timing is hood's; utilities only owns the house feeder).
- **Writes:** `utilities`.
- **Emits:** `power:flicker/brownout/transformerFlash/lost/restored`, `gen:*`, `cell:stateChanged/messagesDelivered/restore`, `water:pressureLost/pressureBack/boilNotice/boilLifted`, `media:cableLost/wifiLost`, `county:curfew/pod/cow`. **Consumes:** `alert:issued` (crawl feed for `county`), `interact:*` via the api only.
- **Acceptance:** §13.6 utilities items (outage window, flickers incl. the band channel, tower battery and `smsOn === towerOn`, WEA gating by `towerOn`, the EWW delivery fraction, the "Not Delivered" rule, `cowSim`/`restoreScheduledSim` day arithmetic, `outageFraction` values, water containers and the 36-flush ledger, breakers gating loads, `router` on the generator circuit list); `hoursSinceOutage` drives `house:detectorChirp` timing; §13.4 for `hazardE`, `fuelL`, `containers`, `outageFraction`.

### WP-10 hood (E3) — `src/hood/`
- **Owned paths:** `hood/{houses,trees,transformers,debrisSources,debris,dressing,index}.js`.
- **Exports:** `hood.api.{debrisSources, house, tree, impactsDue, pose}`; `step(h)`; pure `debris.bucketImpacts(seed, k, rates)`, `dressing.poseFor(propId, state)`.
- **Reads:** `local.*` (sim fields), `cues.{debrisRate, powerHazard}`, `house.cage.stage` (the roof impact), `utilities.power.{on, cause}`, `clock.dayIndex`, `meta.options`.
- **Writes:** `hood`.
- **Emits:** `hood:treeLimb/treeFallen`, `hood:neighbourShutter/evacuated/genOn/genOff/plywoodFlown`, `hood:transformerFlash`, `hood:cableNodeDown`, `hood:streetlights`, `hood:debrisImpact`, `hood:grounded`. **Consumes:** `power:lost/restored`, `house:cageStage`, `storm:windReversal`, `storm:eyeEnter`, `county:cow/pod`.
- **Acceptance:** the impact model reproduces the identical `hood:debrisImpact` list at every `dtSim` and quality (§13.4, §12.5 determinism); Poisson counts within bounds; `λ = 0` in the eye; the Bergstrom door statistics of §13.6; 1–4 `hood:transformerFlash` per run; `pose()` returns a pose for every prop id of DESIGN §4.2 (`scripts/ids.mjs`); `grounded[]` contains the door/bins/chair entries the §12.4 scenarios assert; Ray's Generac fires 10 s after the first of `power:lost`/`sandpiperE.failed`; no `Math.random`, no read of real-time fields.

### WP-11 alerts + content (E7) — `src/alerts/`, `src/content/`
- **Owned paths:** `alerts/{scheduler,products,wea,nwr,tv,texts,index}.js`, `content/{advisories,hls,eww,tor,weaTexts,crawl,meteorologist,texts,journalLines,neighbourLines}.js`.
- **Exports:** `alerts.api.{issue, current, advisoryText, forecast, crawl, scheduleInbound}`; content modules export arrays of `{id, anchor: {tRel}|{event, offsetMin}|{calendar}, condition?(state), render(state) → string, thread?, from?}`; `content/anchors.js: resolve(anchor, state) → simTime|null`.
- **Reads:** `local.{uMarine, u1m, rainMmPerH, rainTotalMm, r}`, `storm.{forecast, track, coast, flags}`, `storm.api.{predict, forecast, eyewallCoastSim}`, `utilities.{cell.towerOn, cell.smsOn, county, water.boilNotice}`, `hood.transformers`, `clock.*`.
- **Writes:** `alerts`; texts are handed to `utilities.api.holdMessage/sendText` (utilities owns delivery).
- **Emits:** `alert:issued`, `alert:wea` (after `towerOn` gating), `alert:nwr`, `alert:tv`, `alert:advisory`. **Consumes:** `storm:advisoryDue`, `storm:landfall`, `storm:eyeEnter`, `storm:sunset`, `storm:bandEnter`, `hood:transformerFlash`, `hood:evacuated`, `power:lost/restored`, `cell:stateChanged/restore`, `county:*`, `water:boilNotice/boilLifted`.
- **Acceptance:** §13.7 `alerts` and content-anchor tests (reference vs `hour=2` vs `vt=8`); the EWW rule (50–70 min before the annulus reaches the coast) and the second EWW; TOR rate; every DESIGN §9.6 row has an anchor and renders with `${…}` filled; `alert:issued` is not a moment; the SAME header strings match §13.7 byte-for-byte; no clock-string literal in `content/` outside the three calendar items (a CI grep for `/\b\d{1,2}:\d{2}\b/`).

### WP-12 devices (E7) — `src/devices/`
- **Owned paths:** `devices/phone/*.js`, `devices/tv/*.js`, `devices/{nwr,console,barometer,thermostat,ups,modem,screens}.js`.
- **Exports:** `devices.api` (§6.9 incl. `charge`, `useBank`, `nwr.setBatteries`); `DeviceScreen` base (`draw(ctx, state)`, `dirty`, `≤ 10 Hz`).
- **Reads:** `local.*`, `alerts.*`, `utilities.{cell, power, media, county, generator.circuits}`, `storm.api.{radarFrame, bandFieldAt}`, `house.thermal`, `roof.anemometerAlive`, `hood.impactQueue` (Ring), `objects.*.on` (screens off with switches).
- **Writes:** `devices`.
- **Emits:** `device:tvChannel/phoneApp/nwrState/photo`. **Consumes:** `alert:*`, `cell:*`, `power:*`, `hood:debrisImpact` (Ring "Person detected" on `frontYard` > 40 J), `hood:cableNodeDown`, `clock:sleepEnd` (lock-screen summary).
- **Acceptance:** §13.4 for `phone.battery`; the battery table of DESIGN §9.1 in a unit test; WEA takeover only when `towerOn`; the NWR state machine incl. BATTERY mode and `batteryH`; the console freezes on the anemometer's death; radar frames are produced from `bandFieldAt` (pixel test vs a stub band); all canvases update ≤ 10 Hz; the lock screen after a sleep lists every event that fired.

### WP-13 ui (E7) — `src/ui/`
- **Owned paths:** `ui/{hud,prompts,captions,subtitles,menus,setup,pause,timeControls,scrubBar,sleepDialog,journal,chapters,endCard,styles.css}.js`.
- **Exports:** `ui.api` (§6.9 incl. `subtitle`).
- **Reads:** `clock.*`, `player.{holdingVerb, holdProgress, phoneUp}`, `details.captionsUsed`, `log`, `tasks`, `meta`, `storm.api.predict()` (sleep dialogue).
- **Writes:** none (DOM only); `meta.options` through setup before `init`.
- **Emits:** none directly (calls `clock.api`, `core.api`). **Consumes:** `clock:*`, `detail:fired` (journal), `task:*`, `game:*`, `alert:wea` (banner), `npc:say` (subtitle).
- **Acceptance:** DOM updates ≤ 4 Hz except prompts/captions/subtitles/progress ring; `caption` refuses the 13th call in debug; `subtitle` is unbudgeted; the sleep dialogue lists model-predicted events with clock renderings; the scrub bar is forward-only; every DOM string is sourced from `content/` or state; headless mode renders every screen without voices.

### WP-14 world + textures (E4) — `src/world/`, `src/textures/`
- **Owned paths:** `world/{plan,neighbourhood,vegetation,terrain,colliders,roomOf,registry,index}.js`, `world/build/*.js`, `world/props/*.js`, `textures/*.js`.
- **Exports:** `world.build(ctx) → {root, registry}`, `world.plan`, `world.roomOf`, `world.yardSectorOf`, `world.materials.uniforms`, `textures.get(name)`.
- **Reads:** `meta.seed` (texture noise), nothing else at build; nothing per frame (E4 has no update step).
- **Writes:** none. **Creates no `THREE.Light`.**
- **Emits/consumes:** none.
- **Acceptance:** `plan.js` reproduces DESIGN §3.2–3.7 (lines within 0.05 m, every opening/door/socket/leak-point/fixture id of §16, `adjacency` for every door and cased opening); `registry.props` covers every §16.1 object id and every §4.2 prop id with authored poses; `registry.fixtures` covers §16.3; `roomOf` correct for 1 000 sampled points; ≤ 12 merged meshes per room group, ≤ 14 house materials, ≤ 110 draw calls and 320 k triangles for the world row; textures generated ≤ 2.5 s and cached; `scripts/ids.mjs` green; Roof B spans x 0 → 7.5 with 0.6 m eaves.

### WP-15 render (E5) — `src/render/`
- **Owned paths:** `render/{renderer,sky,lighting,exposure,rain,glass,fog,vegetationWind,debris,structureFx,waterFx,decalsFx,powerLights,transformerFlash,lightning,flashlight,camera,animation,post,sync,index}.js`.
- **Exports:** `render.api.{setCamera, setQuality, stats, flash, screenshotReady, captureCanvas, resize}`.
- **Reads:** `local.*` (incl. real-time fields), `cues.*`, `house.*`, `utilities.{power, generator}`, `hood.{impactQueue, grounded, houses, trees, transformers}` via `hood.api.{impactsDue, pose}`, `objects.*`, `life.*`, `player.*`, `world.registry.*`.
- **Writes:** none (scene graph and `world.materials.uniforms` only).
- **Emits:** `debug:screenshotReady`. **Consumes:** `power:*`, `hood:transformerFlash`, `storm:lightning`, `house:*` (poses/decals), `hood:debrisImpact` (body arrival), `hood:grounded`, `hood:treeFallen`, `clock:tier`.
- **Acceptance:** `stats().lights == 16` forever (`lightsCreatedAfterInit == 0`), `pointLights == 8`, `rectLights ≤ 4`; the pool allocator's priority order; §10 budgets at the six `t` values; every §12.4 screenshot assertion in its ROI; the cosmetic debris field writes no state and spawns one body per due impact; wobble terms come from `windLoadPa` and structural poses from `house.*` env fields; `hash` unaffected by `quality`; `renderer.compile()` for both power states before `ready` resolves; the distant transformer flash uses no point light beyond 30 m.

### WP-16 audio (E6) — `src/audio/`
- **Owned paths:** `audio/{context,buffers,buses,occlusion,facades,wind,rain,drips,structure,impacts,thunder,machines,outage,biophony,ears,tones,same,wea,speech,speakers,mix,index}.js`.
- **Exports:** `audio.api.{unlock, playTone, speak(priority), cancelSpeech, oneShot, setBus, setOcclusion, introspect, renderSame}`.
- **Reads:** `local.{uInst, dirInstDeg, rainMmPerH, rainWallMmPerH, lightning, eyeFactor, reversal, tAirC}`, `cues.{roar, whistle, earPop, wetness}`, `house.{ceilingLeaks, doors, openings, cage, garageDoor, floorWater, thermal}`, `utilities.*`, `hood.{houses, transformers}`, `life.*`, `player.{room, pos, yaw, earsMuffled}`, `plan.adjacency` (doors between the player and the exterior), `devices.{nwr, tv, phone}`.
- **Writes:** none.
- **Emits:** none. **Consumes:** every one-shot-bearing event of §5 (`power:*`, `house:*`, `hood:*`, `storm:lightning/mesovortex/eyeEnter/Exit`, `alert:wea/nwr`, `cell:messagesDelivered`, `npc:say`, `pet:state`, `player:roomChange/outdoors`, `interact:*`, `object:changed`, `detail:fired`).
- **Acceptance:** §13.7 `audio` items incl. the HRTF eviction, the ear-filter placement and the speech priority queue; ≤ 34 standing nodes (28 low); the outage beat sequence of DESIGN §8.6; WEA/SAME/WAT tones bit-exact per §13.7; `speak` never calls `ui.api.caption`; occlusion profile follows `player.room` and door count from `adjacency`; no `Math.random` (noise buffers from the `'audio'` stream).

### WP-17 test harness and CI (E1, with each owner's tests) — `test/`, `scripts/`
- **Owned paths:** `test/{core,storm,house,utilities,hood,alerts,content,audio,details,life,render}/*.test.js` (each owner writes their directory; E1 owns fixtures and the runner), `scripts/*.mjs`, `test/screenshots/golden/`.
- **Exports:** `test/fixtures/{stubState, refPreset, runHeadless(opts)}`.
- **Acceptance:** `npm test`, `npm run shots`, `npm run soak`, `npm run budgets`, `npm run lint:random`, `npm run ids` all green on a GPU-less runner in ≤ 8 min for screenshots; every §12.4 scenario records its seed; the determinism gate compares two seed-7 soak hash logs and a low/high quality pair; the §13.4 warp test covers every sim-block slice.

### Module list (for the workflow orchestrator)

| Module | Owner | Responsibility (one line) | Owned paths |
|---|---|---|---|
| core | E1 | state tree, schema, ID registry, bus (`flushSim`), clock/tiers/caps, sleep/skip, RNG, sub-stepped loop, hash, guard, `window.__sim` | `src/main.js`, `src/core/` |
| player | E1 | first-person controller, collision, door wind rules, interaction raycast/holds, carry, the impact hit roll | `src/player/` |
| objects | E1 | the interactable catalogue (DESIGN §16.1), behaviours calling owner setters, `objects.api.use/place` | `src/objects/` |
| life | E1 | the pet FSM (relaxation fear model), neighbours' lines, wildlife densities | `src/life/` |
| details | E1 | the 180-entry catalogue with [P]/[R]/[S] tags, the 4-Hz engine, the audit | `src/details/`, `docs/audit.md` |
| scenario | E1 | presets and start time, tasks, chapters, endings, harness scripts | `src/scenario/`, `scripts/`, `test/` harness |
| storm | E2 | Holland/track/bands/turbulence/rain/light/thermal/flood/lightning/forecast/sun/cues/predict/stub; writes `storm, local, cues` | `src/storm/` |
| house | E3 | openings, garage, cage, roof, intrusion ladder + attic reservoir, pressure, thermal, CO dose, fridge/pool ledgers; `house.api` | `src/house/` |
| utilities | E3 | grid/breakers/flickers/outage/restoration, generator + cans, cell ladder (`smsOn === towerOn`), water containers, media, county logistic; `utilities.api` | `src/utilities/` |
| hood | E3 | neighbour houses, trees, the street's transformers, debris sources, the deterministic impact model, grounding, the dressing-pose table | `src/hood/` |
| alerts+content | E7 | advisory cadence, products (EWW coast rule), WEA gating by `towerOn`, NWR queue, crawl; every text/line with a T0-relative anchor | `src/alerts/`, `src/content/` |
| devices | E7 | phone (battery/banks ledger), TVs, NWR (batteries), console, barometer, thermostat, UPS, modem screens | `src/devices/` |
| ui | E7 | HUD, prompts, captions (budgeted) and subtitles (unbudgeted), menus, setup, pause, sleep dialogue, scrub bar, journal, chapters, end card | `src/ui/` |
| world+textures | E4 | plan data (+ adjacency, fixtures), procedural geometry, props with poses, sockets, colliders, `roomOf`, canvas textures; no lights | `src/world/`, `src/textures/` |
| render | E5 | renderer, sky, all lights (fixed pool of 16), exposure, rain, glass, fog, vegetation wind, cosmetic debris, structure/water/decal FX, flashes, camera, animation, post | `src/render/` |
| audio | E6 | Web Audio graph, HRTF eviction, occlusion, wind/rain/drips/structure/impacts/thunder/machines/outage/biophony/ears, exact tones, SAME/WEA, prioritised speech | `src/audio/` |

*End of ARCHITECTURE.md.*
