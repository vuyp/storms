# Integration notes — `src/house/` (WP-8, E3)

What the integrator and the sibling modules need to know about the house model. Nothing here requires a change in
`core/`; the items under *Requests* are suggestions for other owners.

## Contract as built

- `house/index.js` exports `init(ctx)`, `step(h)` (ARCHITECTURE §4 step 5), `update()` (a no-op — the house has no
  real-time process; the renderer animates from state), `dispose()`, `api` (a **stable object**: methods are installed by
  `init` and removed by `dispose`, so `ctx.modules.house.api` is the same reference before and after init), and the
  pure bucket-rule helpers `bucketOf, bucketRoll, componentU, integralFailed, thresholdFromHash, thresholdFromStream`
  (re-exported from `house/structure.js` for `utilities/` and `hood/`; also `glassLoadCoef, cosFace, absCos,
  angleDiffDeg, createBucketMax, bucketMaxUpdate, ADJACENCY, ROOM_FACADES, ROOM_OPENINGS, LEAK_POINTS_BY_SECTOR`).
- Pure exports for tests/consumers: `intrusion.tiers(rainWall, {kind, shuttered, soffitIntegral, shingleLoss})`,
  `thermal.target(tAirC, sealed, sunElDeg, cloudFrac, genAdjacent)`, `pressure.roomDp(...)`, `co.ul2034AlarmPpm(tMin)`.
- Every `house.api` setter returns `{ok, reason?}` and no-ops when blocked; `setDoor` also returns `outcome` and
  `holdS` (2 when a latched interior door sits across a > 40 Pa differential — the interaction layer applies the hold).
  `emptyBucket(lpId)` returns `{ok, litres}` (not a bare number) to keep the one return shape; `removeBucket(lpId)`
  is an extra for the pick-up verb. `setDoor` also accepts window ids (open/close a bare window after the storm,
  blocked above `u1m` 15) and `'door_garage_roll'` (delegates to `setGarageDoor`).
- `setFridgeOpen(open, compartment = 'fridge' | 'freezer' | 'both')`: the second argument picks which reserve pays
  the opening cost (20 min fridge / 1 h freezer). `objects/behaviours` should pass `'freezer'` for the freezer drawer.

## Event cadence (so audio/render know what to loop from state)

- `house:doorSlam {id, cause:'wind', to}` — interior doors on room-to-room |Δp| > 40 Pa (unlatched only), exterior
  unlatched doors on a > 25 m/s windward gust. The **cage screen door** emits one slam per banging *episode*
  (transition into `!cage.doorLatched && uGustEnv > 12`); audio should loop the banging from that state, not from
  events (an event per bang would be hundreds of hashed bus entries).
- `house:earPop {sign, dPdt}` — one per hPa of change while |dPdt| ≥ 8 hPa/h (≈ every 3 min at the eyewall's 20 hPa/h;
  ≈ 45 per side on the reference). Audio's own 40–120-s soft pops come from `cues.earPop`; the first event is the moment.
- `house:atticWhump` — once at every opening/garage failure, then once per 10-min bucket while the envelope is open and
  `windLoadEnvPa > 800`. Render's per-gust hatch lift uses `windLoadPa` and `pressure.pAtticHpa`.
- `house:shingleLoss {slope, fraction}` at every 0.05 of loss per slope (slopes 0 N, 1 E, 2 S, 3 W).
- `house:intrusion {openingId, tier}` is a ratchet (1 → 2 → 3 → 4, each once per opening); `house:leakTier` follows the
  current drip rate (2 → 1 as the reservoir drains, 3 is sticky).
- `house:cageStage {stage:5}` lands exactly two 5-s sub-steps after `{stage:4}` (the 6-s fold advances in sim time —
  `cage.foldProgress` is authoritative and hashed; render should tween its 6-s keyframe from `cage.stageSim` in real
  time; the stage-4 moment holds the clock at 1× so the two coincide in play).
- `house:detectorChirp` fires in the small hours (seeded 01:30–03:00) of the first night with `hoursSinceOutage ≥ 4`,
  not at the first dusk sub-step that satisfies the gate.

## Reads of other slices (optional chaining everywhere; the module runs with none of them present)

- `hood.impactQueue` is the **primary** impact path: every sub-step the house scans entries with `fired === true` and
  `simTime > lastSeen` and applies them (opening hazard, roof strips for ≥ 500 J). The `hood:debrisImpact` listener is a
  fallback used only for impacts *not* present in the queue (a hood that emits without queueing). Hood must keep fired
  entries in the queue until at least the next sub-step (it trims at bucket boundaries in its own step, which runs after
  `house.step`, so this holds).
- `hood.damage` (0–1) multiplies the bare-glass hazard by `(1 + 2·damage)`; the calibration below assumed it reaches
  ≈ 0.3–0.4 by the eyewall. If hood's weighted mean is much larger, bare-glass failures climb (they are ≈ 25–30 % for
  windward windows at 0.35).
- The grill rule: an unfired `hood.impactQueue` entry of class `'bin'` on an opening surface triples that opening's
  hazard for the bucket (the grill's `debrisClass` is `bin` in `core/ids.js`).
- `utilities.power.{on, breakers, hoursSinceOutage}`, `utilities.generator.{running, placement, circuits}` are read every
  sub-step (thermal, fridge, pool, CO, chirp). `power:lost/restored` listeners exist but only `power:restored` has an
  edge effect (the ice-maker dump).
- `objects.detector_hall / detector_garage`: battery is read as `extra.battery` (defaults to 1 in `createState`) with the
  top-level `battery` as the fallback — note `createState` gives fixed objects a top-level `battery` of **0**, so a
  consumer that reads only the top-level field would think every detector is dead. `extra.silencedUntilSim > simTime`
  suppresses the CO alarm.
- `player.room` is read for `house.coPpm` / `house.coDose` (the one permitted player read); `'lanai' | 'outside'` → 0.

## Calibration decisions (each recorded in the file header where it lives)

1. **Garage door** (`garage.js`): N(57, 4) unbraced / N(66, 4) braced as specified. On the §2.7 direction schedule
   (E at T−1.5, E/ENE at T−1.25) the bucket-max load is ≈ 55.1 m/s → 32–34 % / 0 % over 100–200 seeds. The fraction moves
   ≈ 8 points per 5° of RMW wind direction; if the real Holland inflow puts the front-RMW wind at ESE (≈ 106° by
   ARCHITECTURE §7.3's angles, load ≈ 53) the spec's "μ re-tuned by ≤ 2 m/s" clause applies (μ = 55 → ≈ 33 %). Please
   re-run `test/house/montecarlo.test.js`'s garage statistic against the real storm once E2 lands.
2. **Bare glass on side walls** (`structure.glassLoadCoef`): `max(cos Δ, 0.74·|sin Δ|)` with a lee taper. The spec's
   `cos_face` alone gives ≈ 0 % for the north-wall peep window in a storm whose wind is E then W, against its own 14–22 %
   acceptance; side walls carry the envelope's largest suction and the debris stream, so a suction coefficient is the
   physical reading. 0.74 → 18 % bare / 2.5 % shuttered on 100–200 seeds.
3. **Shingle loss coefficient** (`roof.js`): 0.0007 fraction/h per (m/s)² on the windward projection, saturating,
   instead of the quoted 0.002 — the quoted value strips 30–45 % of a hip in the reference eyewall and, through the
   attic intake's `(1 + 4·shingleLoss)`, puts the east reservoir at 40–55 L against the spec's own 15–35 L band (which is
   the intake at ≈ 1×). 0.0007 gives 7–11 % (a clipped six-nail architectural roof at a 55 m/s 10-s gust), the reservoir
   inside the band (29–34 L), tier 4 on the garage roof once the door is in (×3 there), and a bare deck in Cat 5.
   `ROOF_PARAMS` and `GLASS_PARAMS` are exported mutable objects for calibration.
4. **Thermal τ** (`thermal.js`): 4 h sealed (40 min with the bare windows open, 20 min on the A/C). DESIGN's τ = 3 h with
   the +3 °C sealed gain gives 31.8 °C after 6 h, not the 30.9 ± 0.3 it asserts; the gain is kept (the T+8 ≥ 28.5 °C
   reference needs it) and τ = 4 h reproduces 31.0.
5. **CO** (`co.js`): the spec's +40/+12 ppm·min⁻¹ sources with a 10 %/min garage-envelope leakage (closed) on top of the
   1 %/min sealed decay, so the closed garage settles near 360 ppm — the UL 2034 curve is crossed at ≈ 7 min and the
   4 500 ppm·min dose is reached at ≈ 28 min of standing in it (the spec's numbers; a literal +40/min with 1 %/min decay
   reaches the dose at 18 min). The alarm rule is "level ≥ the UL alarm concentration for the time since onset", which is
   what "reaches the alarm curve within 8 min" means arithmetically.
6. **Leak-point activation**: 2 L wick-through for the first point of a façade, then 12 L and 24 L ("the reservoir
   doubles"). Diagonal sectors' water drains half through each neighbouring cardinal's points.
7. **Ear pops** start at |dPdt| ≥ 8 hPa/h (the "frequent pops" band) so the first pop is at ≈ T−2.5 as §2.7 says;
   the 3-hPa/h "noticeable" band is left to the audio cue.
8. `dpRoomPa` includes the inside/outside lag term (≤ 12 Pa at 30 hPa/h); door slams use room *differences* so the
   common-mode lag cancels and a sealed house never slams a door (the design intent).

## Requests for other owners

- **E1 core (`state.js`)**: `OBJECTS` detectors get `battery: 1` at the top level (or consumers read `extra.battery`);
  the current default of 0 is a trap. Suggested change in `createState`'s object initialiser:
  `battery: o.battery ?? (o.kind === 'detector' ? 1 : 0)`.
- **E2 storm**: the house reads `local.rhOut` for the open-window humidity target; the stub should publish it (the
  typedef has it). Please make sure `cues.windLoadEnvPa` is evaluated after `local.uGustEnv` in the same sub-step.
- **E3 hood**: queue every impact in `hood.impactQueue` with `fired` flipped at emission and keep fired entries until the
  next sub-step (trim at bucket boundaries after firing). Queue the cage's 2 000-J roof impact from `house:cageStage {5}`.
- **E5 render**: bulge/wobble/pump wobble from `windLoadPa` are yours; the hashed envelopes are `garageDoor.pumpAmpEnv`,
  `openings[*].bowEnvM`, `cage.foldProgress`. Door animation reads `doors[id].open/targetOpen` (the sim sets both).
- **E6 audio**: loop the screen-door banging from `cage.doorLatched === false && uGustEnv > 12`; the CO alarm pattern
  (4 beeps, 5-s pause) from `house:coAlarm` until `coPpmByRoom[room] < 50`.
- **E1 objects**: `placePanel(openingId, nuts)` expects the nut count actually turned (0–4); `fastening` is the running
  mean over the placed panels. `placeSandbag('door_laundry_garage')` raises the *garage's* street-water threshold
  (DESIGN §6.1's "0.15 → 0.27 with bags"); the foyer's is `door_front`.
