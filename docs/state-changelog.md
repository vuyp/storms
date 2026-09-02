# State / contract changelog

Every entry names the schema fields, APIs, events or ids that changed, the owner who made the change, and the documents that carry the normative text. Entries are appended; nothing is rewritten.

## 1.1 — 2026-09-02 — revision after the architecture critique (E1 sign-off; DESIGN.md 1.1, ARCHITECTURE.md 1.1)

### Blockers (contract changes every engineer must build against)

1. **Debris impacts are sim-side.** `hood/debris.js` (E3) owns a deterministic, bucket-hashed impact model (DESIGN §6.15). `hood:debrisImpact` is now emitted by `hood`, not `render`; `render/debris.js` is a cosmetic field that reads `hood.impactQueue` and writes no state. New: `hood.impactQueue: Impact[]`, `hood.grounded[]`, `hood:grounded`, `hood.api.impactsDue`, `hood.api.pose`; frozen impact-surface ids (DESIGN §6.15). Removed: `hood.api.reportGrounded`. Player injury rolls on the sim events (`player.yardSector`, `player.inLee`).
2. **One owner per ledger** (ARCH Law 8; DESIGN §6.12). Moved: tub/washer/jug fills and `storedL` → `utilities.water.containers` (setters `utilities.api.water.*`); fridge → `house.fridge`; pool → `house.pool`; breakers → `utilities.power.breakers` (`utilities.api.setBreaker`); gas cans → `utilities.generator.cansL[]`; CO dose → `house.coDose` (removed `player.coDose`). Removed from `house.api`: `setTap`, `flushToilet`, `fillContainer`, `setBreaker`. `objects.*` keeps placement/carry/open/on and hand-light batteries only; `ObjectState.open` added. **New frozen ID registry:** DESIGN §16 (object ids, socket ids, fixture ids, prop mesh ids, `extra` keys), exported as `core/ids.js` and asserted by `scripts/ids.mjs`.
3. **Phase thresholds are house-level `u1m`** (DESIGN §2.1); `local.uMarine` added for marine-keyed products; the pacing table, Full/Standard estimates and §12.4's header recomputed; the "≤ 10× while `u1m ≥ 26`" bar is now a hard **wind cap** tier, plus a **scenic cap** (prep, outdoors, low sun / NPC line / flock).
4. **Lights:** `world/` registers `registry.fixtures` descriptors only; `render/lighting.js` owns every `THREE.Light`; the compiled set is fixed at hemi + ambient + sun + 8 pooled points + flashlight spot + ≤ 4 rect (16 objects, 14 in the loops); candles/phone/TV/transformer flash/nearest streetlight are allocated from the 8-point pool by priority; `budgets.mjs` asserts `lights ≤ 16`, `pointLights == 8`, `rectLights ≤ 4`, `lightsCreatedAfterInit == 0`. `registry.rooms[].lights/rectLights` removed.
5. **The sim block is sub-stepped together:** `storm.step(h)`, `utilities.step(h)`, `house.step(h)`, `hood.step(h)` per 5-s sub-step in `core/loop.js`; `storm.updateRealtime(dtReal)` after; `bus.flushSim()` per sub-step during sleep/headless so any wake event ends the sleep at its sub-step. §13.4 now covers every sim-block slice.

### Majors

6. Garage door thresholds `N(57,4)` unbraced / `N(66,4)` braced (was 51/60); the Bergstrom door `N(53,4)` with `garageFailedHalf`. Acceptance 30–40 % / < 5 %.
7. Optical depth `1.8·cloudFrac² + 2.0·min(1,bandRain/3) + 2.2·min(1,R/60) + 0.8·clamp((u1m−25)/20)`; eye blend toward `0.25·E0`; visibility `(3.912/β)/(1 + (u1m/22)²)`; eye air +4 °C.
8. Solar geometry re-anchored to `storm.api.sunAt()` at **27.21° N, 82.47° W** (sunset ≈ 19:45 = T−18.25; civil dawn ≈ 06:45 = T+16.75; canonical window T−32 → T+17). New events `storm:sunrise/sunset/civilDawn/civilDusk`, `storm:landfall`; `clock.firstLightSim`; `storm:sunset` on the prep day is a *soft moment* (3× for 60 s). Place names: landfall "near Siesta Key", HLS/crawl "near Sarasota".
9. Slider/west-façade details moved to the back eyewall (d052/d069 re-keyed to the east side; the `slider-bow` scenario at +0.85; new `front-door-bulge` scenario at −1.5); `rainWall` gains a `0.1·R` lee term; `openings[].bowEnvM` (sim) replaces `bowM`; `garageDoor.pumpAmpEnv` replaces `pumpAmp`; cage `panels[].bulge` removed (render-side).
10. County outage is a ratcheting logistic `1/(1+exp(−(uGustEnv−27)/4.5))`; new `hood.transformers` (5 poles, DESIGN §4.1) with `hood:transformerFlash {id,pos,distM}` and the distant-flash effect (§7 #14b); Marcus/Denise/Ray night texts anchored to those events.
11. Cell: `dataOn = towerOn && !(u1m>20 for 30 min)`, `smsOn = towerOn`, WEA deliverable = `towerOn`; tower battery `N(3.5,0.75)` h; transient `NONE` only above 45 m/s; "Not Delivered" = first outbound after `cell:stateChanged → SOS`; EWW WEA delivered in ≈ 70 % of seeds (d102 tagged [S]). New fields `towerLostGridSim`, `lte1Sim`, `normalSim`, `sosSeen`.
12. Pet fear is a relaxation model with impulses (DESIGN §11.1); `pet:state` is no longer a sleep interrupt; new `Pet.fearTarget`, `panicUntilReal`.
13. Thermal target `tAirC + 3.0·sealed + roofGain + 0.5·genAdjacent`, `rhIn → 90 %`; `thermal.sealed`, `thermal.tTargetC` added; master-bed prompt and d149 at 28.5 °C; `cues.heatIndexOutC` added; d107 player-dependent on the outdoor value. §13.6 expectation 30.9 ± 0.3.
14. Intrusion through the **attic reservoir**: `roof.atticWaterL` is now `number[8]`; soffit threshold 200 mm/h; intake `0.15·max(0,rainWall−200)·(1+4·shingleLoss)`; drain `atticWaterL/10 h` through the façade's leak points; `CeilingLeak.{tier, litresDelivered, unbucketedH}`; sag after 6 un-bucketed drip-hours at ≥ 0.2 L/h, collapse after 24 at ≥ 0.1 L/h. `Opening.intrusionTier` (1–4) and leak tiers (1–3) enumerated.
15. Room pressure `100·(pInside−pHpa) + windLoadEnvPa·cos·(0.015 + 0.25·openFrac + 1.0·failed)`; new `cues.windLoadEnvPa` (sim); `windLoadPa` is cosmetic-only; `Door.slamCount`.
16. Every content item carries an **anchor** (`{tRel}` | `{event, offsetMin}` | `{calendar}`); `clock.startSim` is preset-dependent (`−max(32 h, (R34+250 km)/vt)`); advisory numbers count from the start; `hour=` re-anchors T0. Test: reference vs `hour=2` vs `vt=8` anchors agree.
17. Gust envelope carries the squall: `uGustEnv = G·u1m·bandWind`, `uStruct = 1.38·u1m·(0.6+0.4·bandWind)`, with `bandWind` from non-eyewall bands only (`= 1` inside 1.4 RMW); new flicker channel Poisson 0.5/h while `bandRain ≥ 1 && uGustEnv > 14`; `local.bandFrontM` added.
18. Hash/determinism: hash every 60 sim-s and on every bus event; `details.firedHashed`; catalogue entries tagged **[P]** playerDependent / **[R]** realtime / **[S]** seedConditional are excluded from the hash and the ≥ 95 % soak rule; ≈ 30 triggers rewritten to `uGustEnv`/`windLoadEnvPa`.
19. Day arithmetic: `clock.dayIndex`, `clock.dayStart0`, `clock.hour`, `clock.isNight`; restoration `dayStart(5)+16.2 h ± 1 d`, COW `dayStart(3)+11 h`, LTE1 `dayStart(4)+9 h`, normal `dayStart(8)+9 h`, traffic lights `dayStart(6)+8 h`, curfew lifted `dayStart(7)+6 h`, boil lifted `dayStart(10)+10 h`; `utilities.power.hoursSinceOutage`.
20. **Neighbourhood dressing table** (DESIGN §4.2): prop ids, lots, state paths/events, poses, days; `hood/dressing.js` + `hood.api.pose`; new `HoodHouse.{flagUp, trampolineGone, boatRolled, liftTilted, powerOn, garageFailedHalf}`, `hood.{stopSignBent, mailboxGone}`.

### Minors folded into the documents

21. `house.coDose` (was `player.coDose`); `house.coPpmByRoom` with spread along `plan.adjacency`.
22. Skip uses sleep semantics; only `alert:wea` is a moment (`alert:issued` is not); `house:detectorChirp` (sim-side, W) replaces the audio-side chirp interrupt.
23. EWW rule: eyewall annulus (1.4 RMW) reaching the coast within 60 min (`storm.api.eyewallCoastSim`); a second EWW at `storm:eyeEnter + 10 min`; TOR on-track rate 1/5 h.
24. Roof B footprint x 0 → 7.5 with 0.6 m eaves; lot coordinates 27.21° N 82.47° W.
25. `ui.api.subtitle(deviceId, text)` (unbudgeted) separated from `ui.api.caption`; `audio.api.speak(…, priority)` with a priority queue (WEA/NWR warning > TV event > neighbour > NWR routine cycle); ducking only while an utterance plays.
26. Schema gaps closed: `local.uMarine`, `local.bandFrontM`, `clock.dayIndex/isNight/hour/startSim/firstLightSim`, `house.eyeStartSim`, `utilities.cell.outbox` (references to `phone.outbox` removed), `plan.adjacency`, tier enumerations, impact surfaces, the `storm:windReversal` rule, `world.yardSectorOf`.
27. Pacing: scenic cap; soft moment for the sunset; TOR 1/5 h; Full ≈ 135 min, Standard ≈ 105 min, Highlights ≈ 45 min.
28. Audio: HRTF eviction order for the 6 panners; ear filter on the world sum only (UI bus bypasses it); `router` on the generator circuit list.
29. Harness: `objects.api.use/place`; scenarios record their validation seed; hashing cadence; new scenarios `distant-flash`, `front-door-bulge`, `night-eye`; `aftermath-dawn` at +16.8, `sunset` at −18.3, `aftermath-day3` at `dayStart(3)+12 h`.
30. ARCHITECTURE §15 "Implementation work packages" added (17 packages, module list).
