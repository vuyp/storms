# Florida Storm — Engineering-First Design Proposal

**Angle:** a clean, modular architecture that 6–8 engineers can implement in parallel with minimal coupling, wrapped around a single simulation state, a physically modelled storm, and a catalogue of realistic details that are all *derived from that state* rather than scripted.

**Companion research:** `docs/research/meteorology.md` (wind field, timeline numbers), `docs/research/florida-home.md` (house, lived experience, alerts), `docs/research/tech-3d.md` (Three.js r170 techniques, SwiftShader), `docs/research/audio-devices.md` (synthesis, device formats). This proposal takes those numbers as given and focuses on *how the software is organised so that every detail lands*.

---

## 0. Five design tenets

1. **One state, one writer per slice.** `SimState` is a plain object tree. Every slice (`storm`, `house`, `player`, `devices`, …) has exactly one module allowed to mutate it. Everyone else reads. There is no second copy of any fact.
2. **Everything is a function of state.** Rain streaks, shutter rattle, the TV crawl, the smell-of-mildew subtitle — each reads `state` every frame or subscribes to an event derived from state. No effect owns a timer that could drift from the storm.
3. **Discrete things are events; continuous things are state.** Wind speed is state. "Transformer blew" is an event. Modules never poll for edges; the owner of a slice detects the edge and emits once.
4. **Deterministic by construction.** A seeded RNG per subsystem, a fixed storm sub-step, and a `window.__sim.advance(seconds)` API make any moment reproducible for a headless screenshot.
5. **Budgets are contracts.** Each module has a CPU-ms, draw-call, triangle and audio-voice budget written into its file header. Exceeding it is a bug, not a tuning question.

---

## 1. The experience arc

### 1.1 Scenario

Hurricane **Leah** (2026 "L" name; selectable from the 2026 list in the main menu), a Category 3 at landfall (marine Vmax 100 kt / 51 m/s, Pc 950 hPa, Pn 1012 hPa, RMW 25 km, Holland B 1.5, forward speed 20 km/h on a 045° heading). The player's house is in "Sandpiper Cove", a 1990s Gulf Coast subdivision 15 km inland, Evacuation Zone C (not ordered to evacuate). The eye passes directly overhead. Closest approach **T0 = 14:00 EDT, Thursday 3 September 2026**. The simulation opens at **06:00 EDT Wednesday 2 September (T−32 h)** and ends at **20:00 EDT Friday 4 September (T+30 h)** — 62 sim-hours.

The player is a home-owner who has decided to shelter in place. There is no fail state and no score; there are **tasks** (a checklist that the game tracks and quietly rewards with fewer leaks, a working radio, a full tub) and **freedoms** (walk anywhere inside; go outside whenever you like, with escalating consequences; ignore every task and simply watch).

### 1.2 Time compression

Sim time advances at `speed ×` real time. Speeds: **1, 5, 10, 30, 120, 600×** plus **Auto-pace** (default), which chooses a tier from state:

| Auto-pace tier | Condition | Speed | Rationale |
|---|---|---|---|
| Quiet | house wind U < 12 m/s and no pending scripted moment | 30× | prep day, aftermath |
| Active | 12 ≤ U < 33 m/s | 10× | bands, TS winds |
| Core | U ≥ 33 m/s or \|T\| < 1.5 h | 10× | eyewall stays legible |
| Eye | eyeFactor > 0.5 | 5× | the calm is the centrepiece |
| Moment | a scripted moment fired (transformer, first ear pop, cage collapse, eye opening, back eyewall hit) | 1× for 20 real s, then ramps back over 10 s | never miss the beat |

Sleeping (bed, couch) or "Wait" (any chair) skips to the next scripted moment or wake condition (wind step-up, alert, leak start, dawn), capped at 8 sim-hours, with a 4-second fade and time-lapse audio. A full run at Auto-pace with sensible sleeping is **60–90 real minutes**; a "Highlights" menu preset (starts at T−16 h, sleeps automatically through lulls) is ~30 minutes.

Speed is never applied to the fast turbulence process or to audio: gusts and sound always happen in real seconds (research §12 note). Above 60× the renderer drops to 30 fps and particle density to 25 %.

### 1.3 Hour by hour (sim clock, EDT)

**Wednesday, prep day (T−32 → T−18)**
- 06:00 Wake. A/C hum, sunrise haze with a cirrus fan; TV on in the great room with the 5 AM advisory looping; phone shows the Nguyens' text ("you staying?"). Barometer 1011.3 hPa. Tasks unlocked: *Close shutters (10 panels + 2 accordions)*, *Fill bathtubs (2)*, *Fill water jugs*, *Charge devices*, *Bring in lanai furniture (6 items)*, *Bring in trash cans / potted plants / flag*, *Fuel the generator & cans*, *Park cars in garage*, *Freeze water bottles*, *Set fridge/freezer to coldest*, *Locate NOAA radio & batteries*, *Photograph rooms for insurance*, *Move valuables off floor*, *Sandbag the garage door*, *Brace the slider*.
- 11:00 NHC advisory upgrades the forecast to Cat 3 at landfall; **Hurricane Warning** replaces the watch; WEA "Hurricane Warning this area" (phone screams). Ray from across the street walks over (dialogue over the fence; he's staying, has a generator).
- 14:00 Milky overcast, 33 °C, the sun a disc. Distant swell rumble if you stand in the street and listen (heavily filtered). Kids on bikes next door; U-Haul-style loading; the Nguyens leave at 15:30 and text from the road.
- 17:00 First dark band on the SW horizon. Birds streaming inland (a single instanced flock passing NE). 5 PM advisory. Golden light through the last unshuttered window (the game nudges you to close it).
- 20:00 Dusk. Band 1 arrives 22:00: first squall, gusts 18 m/s, first **power flicker** (microwave clock resets to a blinking 0:00). Distant lightning. Bedtime is offered.

**Thursday, the storm (T−14 → T+10)**
- 00:00 Gap between bands: wet street glistening under streetlights, breezy. Intermediate advisory.
- 02:00 Band 2, gusts 23 m/s, Tornado Watch on the NWR. Bathroom door starts to shudder. Chance to fill any tub you forgot.
- 05:00 Principal band. Screen panels on the lanai cage begin to bulge and hum; the first tears at 07:00. Pool overflowing. Garbage cans (if not brought in) roll down the street.
- 07:00 TS force at the house (U ≥ 17 m/s). The roar begins. Repeated flickers. NWR issues the Hurricane Local Statement.
- 08:00 ± 1.5 h (state-driven, see §2.5) **Power fails**: transformer flash through the front shutters' slats, crack-boom, A/C stops mid-breath, fans coast down, the UPS shrieks. From now on the house is dark by day.
- 09:00 Branches down. Water fans under the garage man-door and the front door; towels. Cell data degrades (bars 2→1→SOS).
- 10:00 Hurricane force (marine) — U_house 26 m/s, gusts 42. Shingles lifting on the snowbird house next door. Visibility 300 m. Extreme Wind Warning WEA (if the phone still has service) and NWR.
- 11:30 Hurricane force at the house: 33 m/s sustained, gusts 54. Pressure falling 8 hPa/h — first ear pop. Cage collapse window opens (U_gust ≥ 48 m/s). Roof leak at the master can-light starts if U ≥ 41 m/s has persisted 30 min.
- 12:00–13:00 **Front eyewall.** 150 lux at noon. Debris impacts on the windward wall, garage door pumping, slider bowing. Peak 40 m/s sustained / 67 gust at 12:45.
- 13:00–13:15 Rain quits within minutes, wind collapses, sky brightens.
- 13:15–14:45 **The eye.** Sun, stillness, dripping, birds, frogs, a distant surf-roar all around, a car alarm cycling somewhere, Ray's generator across the street. Pressure minimum 950.0 at 14:00; the barometer photo moment. The player may go outside — the game lets them and warns via the NWR ("do not go outside, the back side is coming") and Ray shouting from his porch. The back eyewall is visible as a dark wall to the W/SW; it darkens the sky in five minutes.
- 14:45 **Back eyewall** hits from the WNW in 5–8 minutes. Wind reversal: the previously sheltered side of the house now takes the load — different windows leak, the master slider instead of the great-room slider, the lanai fan shreds, the back-side peak is slightly higher than the front. Ears pop the other way.
- 17:00 Still hurricane force. 5 PM advisory: "Leah moving inland, weakening."
- 18:00 Below hurricane force; first lulls; brief brightening.
- 19:00 TS force; sunset glow under the deck to the west; a rainbow is possible from the lanai.
- 20:00 Dusk, scattered bands, first sirens, first neighbours out with flashlights. County curfew 20:00–06:00 via NWR/WEA.
- 22:00 Generators. Stars between bands. The house is 30 °C inside and the player is offered the tile floor to sleep on.

**Friday, aftermath (T+10 → T+30)**
- 02:00 Mostly clear, humid, NW breeze.
- 05:30 Dawn reveals damage. Helicopters. Chainsaws start at 07:00. Bucket-truck reversing beepers at 09:00.
- 08:00 Boil-water notice (NWR + text when SOS service returns to 1 bar at 10:00). Ice/water distribution announcement. Neighbours walking the street, group text alive again with photos.
- 12:00 34 °C. Mosquitoes by 18:00. The player's tasks flip to *Check the roof*, *Empty the buckets*, *Run the generator (fridge 2 h on, 2 h off)*, *Check on the Nguyens' house*, *Clear the driveway*, *Photograph damage*.
- 19:45 A bucket truck turns into the cul-de-sac. The ending is not "power returns" (it doesn't, for five days) — it is the sunset on Friday, the sound of the neighbourhood, and an **end card** rendered from the player's own state: rain total, minimum pressure, peak gust at the house, hours without power, litres of tub water used, number of leaks caught, what the cage did, what the roof did, what the player did in the eye. Then the sim continues in free-roam if the player wants.

---

## 2. The storm model and how state drives everything

### 2.1 Storm-scale model (module `storm/`)

Local ENU coordinates in kilometres with the house at the origin. A **track** is an array of `{t, x, y, vmaxMarine, pc, rmw}` control points interpolated with Catmull-Rom (position) and monotone cubic (intensity). Landfall decay uses Kaplan–DeMaria on `vmaxMarine` once the centre crosses the coast polyline. `B` is derived each step from `vmaxMarine` and ΔP, clamped 1.0–2.2.

Per fixed step (5 s of sim time):

1. `r`, `φ` from centre to house.
2. `V_sym = vmaxMarine·sqrt(x^B·exp(1−x^B))`, `x = RMW / max(r, 0.5)`.
3. Direction: cyclonic (counter-clockwise in NH) tangent plus inflow angle `α(r, land)` = 20° at RMW over water, +10° over land, up to 35° at large r.
4. Motion asymmetry: add `0.55·Vt·(2·r·RMW/(r²+RMW²))` toward `θ_m + 20°` as a vector.
5. Exposure: multiply by `k_exp[sector(dir)]`: 0.78 suburban (E/SE/S sectors), 0.88 open (N/NE), 0.95 water-fetch (W/NW/SW across the retention pond and open ground).
6. Band factor from the **rainband model** (§2.2): `b_wind ∈ [0.65, 1.5]`, `b_rain ∈ [0, 5]`.
7. Sustained `U = V_house·(1 + 0.25·(b_wind − 1))`.
8. Pressure `P = Pc + ΔP·exp(−(RMW/r)^B)` + OU noise (σ 0.3 hPa, τ 30 s); `dPdt` smoothed over 60 s.
9. Rain rate `R` from R-CLIPER(r) × azimuthal asymmetry × `b_rain` × cell noise; eyewall (0.6–1.4 RMW) 60–100 mm/h scaled by `(V_sym/Vmax)²`; ramps to 0 by 0.4 RMW. Rain angle from instantaneous wind.
10. `eyeFactor = smoothstep((0.9·RMW − r) / (0.3·RMW))`.
11. Illuminance, cloud base, visibility, temperature, dew point per research §7/§9.
12. Lightning Poisson rate by radius/quadrant × band factor.
13. Flood: rain-excess ponding (swale → street → garage curve) with 24-h recession; no surge at this house (Zone C) but the surge model exists for the "Irma-Tampa-like" preset and drives TV/radio content.

### 2.2 Rainbands

Three to five logarithmic spirals `r(θ) = r0·exp(k·θ)` co-rotating at 80 % of the local tangential speed, each with a width (8–25 km), a strength envelope that grows/decays over 2–4 h, and embedded 3–6 km "cells" from 2-D value noise advected along the band. `bandProfile(r, φ_rel, t)` returns the max over bands of a smooth bump. The **principal band** and the **eyewall ring** are special cases with fixed radii.

### 2.3 Turbulence (real-time, never compressed)

Ornstein–Uhlenbeck stack on `U`: τ = 2.5 s / 20 s / 180 s with variance split 0.35 / 0.45 / 0.20 of `Iu²`, `Iu = 0.28` (0.30 inside 1.4 RMW). Direction jitter OU τ = 8 s, σ 9°. Mesovortex events when `r < 1.3·RMW`: Poisson 1/600 s, +25 % for 15 s with a 3 s attack. `U_inst` and `gust3s` (rolling 3-s max) are published every frame. The 180-s process advances with sim-time dt; the 2.5-s and 20-s processes advance with real dt.

### 2.4 Derived cue vector (published in `state.storm.cues`)

Every consumer reads *only* these normalised cues rather than re-deriving physics:

| Cue | Formula | Consumers |
|---|---|---|
| `windLoad` | `(U_inst/50)²` clamped 0–1.5 | creaks, garage door, slider bow, shutter buzz, cage |
| `roar` | `20·log10(max(U_inst,1))` → 0–1 over 0–40 dB | wind synth master gain, subtitle "roar" tier |
| `debrisRate` | `max(0, U_inst − 20)² / 900` /s | debris spawner, impact sounds |
| `leakRate` | `R·U_inst / 2000` | roof/soffit leaks, slider track |
| `earPop` | `|dPdt|` in hPa/h; pop event each 4 hPa of accumulated change | audio pop + muffled filter + subtitle |
| `powerHazard` | `max(0, U_inst − 25)·(1 + treeFactor)` | power module failure integral |
| `eyeFactor` | §2.1 | ambience crossfade, sky clear, birds, frogs |
| `wetness` | 1 − exp(−cumulativeRain/20 mm), decays with sun | surface roughness, puddles |
| `dirRad` | wind from-direction | all directional effects |
| `reversal` | 0 before eye, 1 after back-eyewall onset (smooth over 10 min) | which windows leak, cage, lanai fan, streaks on glass |

### 2.5 State-driven failures (module `house/systems`)

Failures are **hazard integrals with seeded thresholds**, not clock times, so that a different preset or seed changes the story:

- **Power**: `E += powerHazard·dt`; flicker events when a gust exceeds a decreasing threshold (first at 18 m/s gust, then 22, 26, …); brownout at `E > 0.3·E_fail`; **outage when `E ≥ E_fail`** (`E_fail` seeded so the outage lands between T−9 h and T−3 h for the reference storm) or immediately on `gust3s > 45 m/s`. Underground-service option skips the transformer flash.
- **Lanai cage**: each of 24 screen panels has a tear threshold ~N(30, 4) m/s gust on its windward exposure; the structure has a collapse threshold ~N(48, 4) m/s and collapses into a pre-authored "folded" pose over 6 s (or on the first back-side gust if it survived the front).
- **Garage door**: pumping amplitude `∝ windLoad` when windward; buckle warning at gust 49 m/s, failure at 51 m/s unless braced (task) → attic pressurisation cues (hatch thump, ceiling flex).
- **Roof**: shingle-lift particles from 29 m/s gust; own-roof partial loss above 42 m/s gust; leak points activate by `leakRate` integral per point (6 candidate points authored in the plan; which fire depends on windward side and `reversal`).
- **Water intrusion ladder** (research §4.4) implemented as six ordered thresholds on `(R, U_inst, dir, reversal)`.
- **Cell service**: bars = f(U sustained, outage duration, random tower state); data dies at U > 26 m/s for 30 min with p→0.9; SMS survives one more hour; SOS-only until T+20 h; 1 bar at T+20 h.
- **Municipal water**: pressure 100 % → 40 % over T+2…T+12 h → boil-water notice at T+18 h.
- **Indoor climate**: `T_in → T_out` with τ = 3 h after outage; RH → 88 %.
- **Water heater**: 40 gal warm for 24 h after outage, decaying.

---

## 3. The house and the neighbourhood

### 3.1 Plan (interior clear dimensions, metres; from research tech-3d §2.1)

Slab 19.8 × 14.0 m including garage, 0.3 m above grade. Ceiling 2.85 m (tray +0.3 in master). Exterior CBS walls 0.25 m, interior 0.115 m. Coordinates: +X east, +Z south, origin at the NW slab corner; the street is to the north (front), lanai and retention pond to the south (rear).

| Room | W × D | Contents (all procedural primitives) |
|---|---|---|
| Garage (west front) | 6.1 × 6.4 | 2 cars (after task), 200 A panel, water heater, air handler, chest freezer, shelving with tubs, 4 fuel cans, generator on a dolly, tool wall, bike, roll-up door 4.9 × 2.13 with brace kit, man door to side yard, ladder, sandbags (task) |
| Laundry | 1.8 × 2.4 | Washer/dryer, utility sink, door to garage, hurricane kit bin, flashlight hook |
| Foyer | 1.8 × 2.4 | Front door 0.91 × 2.03 (inswing, sidelight), console table, key bowl, towel roll at threshold (task), coat hooks |
| Great room | 5.5 × 5.2 | 65" TV, sectional, coffee table, ceiling fan, triple slider 2.7 × 2.03 to lanai (accordion shutter), 2×4 brace (task), lamps, bookshelf, photo frames, cat tree |
| Kitchen | 4.0 × 3.6 | Island 2.4 × 0.9, fridge (door opens; contents warm), microwave (blinking clock), range, sink with window 0.9 × 1.2, coffee maker, cooler, water jugs, snacks pile, battery lantern |
| Dining nook | 3.0 × 3.0 | Table + 4 chairs, window 1.5 × 1.2, NOAA radio on the table (after task), phone charging pad |
| Hallway | 1.1 wide | Attic hatch 0.56 × 0.76 (thumps), smoke detector (chirps), thermostat, framed photos |
| Hall bath (interior) | 1.5 × 2.4 | Tub 1.5 × 0.75 (fillable), toilet (gurgles), vanity, no window — **the safe room** with mattress after T−3 h |
| Bedroom 2 (front W) | 3.4 × 3.4 | Bed, desk, UPS + router (beeps), window 0.9 × 1.2 (panel shutter) |
| Bedroom 3 / office (front W) | 3.4 × 3.2 | Desk, PC, filing cabinet, window 0.9 × 1.2, insurance folder |
| Master (east rear) | 4.6 × 4.3 | King bed, slider 1.8 × 2.03 to lanai, 2 windows, ceiling fan, can lights (leak point #1), dresser with weather-station console |
| Master closet | 2.4 × 2.0 | Interior, windowless, shelves; alternative safe room |
| Master bath | 3.6 × 2.7 | Garden tub 1.5 × 0.8 (fillable), shower, obscure window 0.6 × 0.6 sill 1.5 |
| Covered lanai | 6.0 × 3.0 | Ceiling fan, patio set (6 items to bring in), lanai lights, pool equipment pad, screen cage 9 × 7 × 3.2 m (24 panels), pool 4 × 8 × 1.1–1.8 m |

Six authored **leak points**: master can-light (E), great-room A/C register (S), hall smoke detector (attic centre), bedroom-2 window head (W), kitchen sink window sill (N), laundry ceiling (attic W). Windward-side selection uses `dirRad` and `reversal`.

### 3.2 Lot and street

Lot 24 × 38 m, setback 7.6 m, driveway 6 × 8 m, swale 1.5 m, street 7.3 m asphalt cul-de-sac. Front yard: 2 queen palms (thrash, strip), 1 sabal (folds, survives), 4 hedges (clusia), mailbox, irrigation controller box, HOA sign, LED cobra-head streetlight on a concrete pole (dies with power), overhead service with a **pole-mounted transformer at the NW lot corner** (the flash source, visible from the foyer sidelight and bedroom 3), storm inlet at the curb.

Neighbourhood (all `BatchedMesh`/merged, 7 variants of the same plan mirrored/recoloured): Ray & Linda across the street (flag, generator, porch light on a battery lantern), the Nguyens to the west (dog, bikes, they leave), the unshuttered **snowbird house to the east** (its screens and shingles become the debris that hits *your* house; Ring doorbell blinking blue), the boat-on-a-lift house across the pond, three more across. Retention pond 60 × 40 m behind with a fountain that dies with the power. A live oak on the east lot line that loses a limb onto the snowbird house's roof at gust > 45 m/s.

---

## 4. Visual effects list (module `effects/`, budgets in §9.6)

1. **Sky dome** with 3-octave fbm cloud deck, transmittance from `state.env.cloudOpticalDepth`, eye clearing via `eyeFactor`, sun disc, dawn/dusk gradient, stars in gaps.
2. **Rain**: one `InstancedMesh` of 20 000 streaks (2 500 in low quality) in a 12 m camera-following volume, sheared by wind vector, density ∝ `R`, plus 300 splash sprites on wet surfaces, plus **spray/mist** as a screen-space fog term ∝ `U_inst·R`.
3. **Rain on glass** per-window shader: droplet cells, streak direction from wind relative to the pane's normal, only active on windward panes and only when the shutter is open; interior fog on glass after outage (ΔT-driven).
4. **Wind-driven vegetation**: vertex-shader palm fronds (per-frond phase, amplitude ∝ `windLoad`, direction from `dirRad`, fold-up for sabal at high load), queen palm frond-strip events spawning debris; hedge sway; grass tuft shear (GPU only).
5. **Debris**: 300-body simple physics pool (fronds, shingles, screen panels, a trash can, a lawn chair, a road sign) spawned upwind at `debrisRate`, tumbling with drag; impacts against the house AABB raise `impact` events for audio/subtitle.
6. **Lanai cage**: 24 panel meshes with bulge (vertex offset ∝ load), tear (alpha mask + flapping edge strip), then whole-cage collapse morph.
7. **Garage door pumping** (vertex offset ∝ `windLoad`·windward), slider bow, attic hatch bounce, ceiling flex (subtle vertex noise on the ceiling mesh of windward rooms).
8. **Water intrusion**: dark decal "spread" meshes at slider track, thresholds and leak points, growing with the intrusion ladder; drip particles from leak points into buckets (if placed) or onto floor puddles; ceiling stain decal growth; sagging drywall belly morph.
9. **Flooding**: swale/street water plane with height from `state.env.streetWater`, ripple normal map from noise, garage floor sheen.
10. **Pool**: colour blue → tea-brown, level overtops, debris floating, cage pieces in it after collapse.
11. **Lighting states**: baked-looking room lights (emissive fixtures + 1 point light per occupied room), dimming/brownout, outage blackout; flashlight spot (512² shadow); lanterns; phone screen glow; TV screen emissive flicker; lightning flashes (directional light impulse + sky flash); **transformer flash** (blue-green point light behind the NW shutters, 2 pops, bloom on GPU path).
12. **Shutters**: panels and accordions with closed/open states, rattle micro-motion, water running on the inside face when windward.
13. **Wet surfaces**: roughness/darkening from `wetness`; drying over the aftermath day.
14. **Eye visuals**: sun shafts, ring of eyewall cloud on the horizon, dripping everywhere, steam off the driveway.
15. **Post-storm**: strewn debris field baked into instanced positions once wind < 12 m/s; downed limbs; snapped queen palm; bent stop sign; ceiling stain rings; mildew subtitle only.
16. **Post-processing (GPU only)**: bloom half-res, vignette, grain, screen wetness ≤ 20 droplets; DOM-gradient fallback on SwiftShader.

---

## 5. Audio design (module `audio/`, all synthesised)

**Graph**: master → limiter; buses: `wind`, `rain`, `house`, `devices`, `voice`, `ambience`, `impacts`; every bus passes an "indoor" filter chain (lowpass + gain) whose cutoff is a function of `roomOf(player)`, open doors/windows, shutter state and outage (the house is louder when the A/C stops). Reverb: two convolvers with generated impulse responses (tile-room 0.6 s, garage 1.2 s) selected by room.

**Wind**: three pink-noise layers bandpassed 100–800 Hz, 300–2 000 Hz, 1–4 kHz with gains from `roar` and `U_inst`; **whistles** = 4 resonant bandpass voices 600–2 500 Hz that fade in above 25 m/s, detuned by direction and stronger in windward rooms; gust envelopes come for free from `U_inst`. Outdoors the same graph with the indoor filter bypassed and a 3-D panner pointing upwind.

**Rain**: high-passed noise crackle on shutters and roof (density ∝ `R`), a deeper drum layer on the roof for `R > 40`, drips (granular clicks) at active leak points, spatialised.

**House**: creaks/pops (sparse transients, rate ∝ `windLoad²`, louder under the roof), shutter rattle (impulse train 8–20 Hz above 18 m/s), garage door whump (40–80 Hz + metallic ring, periodic with gusts), slider hiss, door suck, toilet gurgle on `earPop`, attic hatch thump, cage: rip / groan / crunch, debris impacts by class, glass-like ring for aluminium.

**Electrical**: A/C compressor 60 Hz + blower broadband, fridge cycle, fan whir, UPS beep, smoke-detector chirp, TV audio, microwave beep, generator drone (spatial, across the street), transformer crack-boom + arc buzz, lightning/thunder with distance delay from `state.env.lightning[]`.

**Eye**: crossfade to dripping, frog chorus, distant surf-roar (wind noise 200 Hz lowpass, all around), birds, a car alarm cycle, a helicopter is *not* here yet.

**Aftermath**: generators (N spatial voices), chainsaws (2-stroke with bogging), helicopters, backup beepers, a loudspeaker truck, mosquitoes at night, neighbours' voices (speechSynthesis with subtitles).

**Voice**: NOAA Weather Radio (SAME header tones 2 083.3/1 562.5 Hz FSK-style bursts ×3, 1 050 Hz attention tone 8 s, then speechSynthesis at rate 0.95 with the NWR text template; on-screen transcript always), TV meteorologist (speechSynthesis + lower-third text), WEA (the 853+960 Hz alert tone pattern, vibration API), phone voicemail. If `speechSynthesis` is unavailable, text-only with a synthesized "voice-like" noise burst.

**Ear pressure**: on `earPop` events a 200 ms lowpass sweep on master (cutoff 8 kHz → 1.2 kHz → 8 kHz) with a soft click; the "muffled" state can persist until the player "swallows" (interact prompt).

**Voice budget**: ≤ 48 simultaneous oscillators/noise sources, ≤ 3 convolvers, ≤ 1.0 ms/frame of JS on the audio thread's main-thread side. Audio starts only on the first user gesture (menu click).

---

## 6. Devices and UI (module `devices/` and `ui/`)

- **TV** (great room, needs power or nothing; cable dies with power, antenna mode on the battery TV in the kitchen): a canvas texture with a channel state machine — local news with the cone-of-uncertainty graphic drawn from `state.storm.track`, radar loop rendered from the rainband model, lower-third crawls (school closures, shelters, curfew), the meteorologist reading the current advisory. Channel button cycles 3 channels + off.
- **Phone** (always in hand, `Tab` to raise): lock screen with clock, battery (drains 4 %/h screen-on, 1 %/h off; charges from wall/UPS/generator), signal bars, WEA banners with the real wording, group text ("Sandpiper Cove Neighbors" — 40 members, timed and state-triggered messages, photos rendered from the sim itself), weather app (advisory text, forecast cone, radar), flashlight toggle, camera (saves a snapshot to a gallery — the insurance-photo task uses it), notes (task list mirror).
- **NOAA Weather Radio** (portable, battery): on/off, volume, SAME alerts with the tone sequence, automatic products keyed to conditions (HLS, EWW, TOR, FFW, curfew, boil-water) with the research §10 wording.
- **Home weather station** (console on the dresser + phone app): pressure with trend arrow and history sparkline over 24 h, wind speed/gust/direction (from the roof anemometer until it breaks at gust > 50 m/s), rain gauge total, indoor T/RH, outdoor T/RH. This is the "barometer photo" moment.
- **Thermostat** (hall): shows set point and indoor temperature; dead after outage.
- **Generator**: start/stop (pull-cord audio), fuel gauge (5 gal = 10 h), extension cord to fridge + one lamp + fan; CO detector chirps if run inside the garage with the door closed (lethal within 20 min → the only "you passed out" fail-safe, which fast-forwards to being woken by Ray).
- **HUD** (plain DOM): crosshair; interaction prompt; the *phone banner*; a slim bottom bar with sim clock, speed, and weather-station readouts (toggleable: "ambient" mode hides all HUD except prompts); subtitles for voice and for sensory cues you cannot render (smell, ear pressure, temperature) — short, italic, 3-second.
- **Time controls**: keys `[ ]` step speed, `T` toggles Auto-pace, `Enter` on a bed/chair sleeps/waits; a scrub bar in the pause menu shows the whole 62-h arc with phase markers and lets the player **jump forward only** (no rewinding; the past is committed state).
- **Menus**: main (storm select from 2026 names; preset table from research §13; seed; quality auto/low/high; motion-reduction toggle), pause (settings, task list, end-card preview), end card.

---

## 7. Interaction system and object list

**Player controller**: pointer lock, WASD, Shift sprint (1.4×), C crouch, E interact, Tab phone, F flashlight, capsule 0.35 m radius / 1.75 m height, eye height 1.65 m, walk speed 1.6 m/s, grid broadphase against ≤ 60 AABBs, door swing colliders, step-up 0.2 m (slab edge, lanai step, curb). Outdoors, wind pushes the player with force ∝ `U_inst²` (staggering above 30 m/s, knocked down above 45 m/s — brief black-out and a subtitle).

**Interactables** are `{id, mesh, verb(state), enabled(state), use(state, bus)}` objects registered in `interaction/registry.js`; the raycaster picks within 2.2 m; the prompt shows `verb`. Objects (the "what each does" list):

| Object | Interaction | Effect |
|---|---|---|
| Shutter panels (10) / accordion shutters (2) | close/open (outside only, 6 s each, blocked when U > 20 m/s) | window becomes dark, rain-on-glass off, leak thresholds ×0.3, interior 1 000 lux → 30 lux |
| Bathtubs (2) | turn on tap (fills in 8 sim-min), turn off | `state.house.water.tubLitres` +150 each; toilets flushable after pressure loss |
| Water jugs / bottles | fill at sink (while pressure > 0) | potable litres counter; drinking reduces "heat" subtitle frequency |
| Fridge / freezer | open/close; set coldest | contents temperature model (48 h freezer if unopened; each open adds 1 h) |
| Microwave / oven clocks | reset time | clears the blinking 0:00 until the next flicker |
| Lanai furniture (6), plants (3), trash cans (2), flag, mailbox flag | pick up & carry (one item), drop | removed from debris candidate list |
| Generator | wheel out, fuel, pull-start, plug cord | powers fridge circuit + 1 lamp + fan; fuel drain; CO hazard indoors |
| Fuel cans (4) | fill car / generator | fuel litres |
| Cars (2) | move into garage (cut to black 10 s) | protected; garage becomes cramped |
| Garage door brace | install (needs the kit on the shelf) | door failure threshold +9 m/s |
| Slider 2×4 brace | install | slider bow ×0.5, unlatch impossible |
| Towels (stack of 12) | place at threshold/sill | absorbs intrusion decal growth for 30 min each |
| Buckets (3) / pots | place under a leak | drip audio into bucket; floor puddle stops; must be emptied every 2 h at stream rate |
| Sandbags (6) | stack at garage door / front door | intrusion threshold +1 tier |
| Front door, interior doors, sliders, garage man door | open/close | sound occlusion, wind push through the house (door slams when open windward and downwind door open) |
| TV | power, channel | channel state machine |
| Lamps, switches, fans | on/off | lighting state (no effect after outage) |
| Flashlight, lanterns (2), candles (4), matches | pick up / place / switch | light sources; candle blows out in a draught |
| NOAA radio | pick up, on/off, volume | alerts |
| Phone charger / UPS | plug phone | battery |
| Weather station console | read | shows readouts, "screenshot" adds a gallery item |
| Attic hatch | pull down (only pre-storm and aftermath) | look into the attic: wet insulation, daylight through nail holes (aftermath) |
| Beds (3), couch, mattress in the hall bath | sleep / wait | time skip |
| Chairs | wait | time skip to next moment |
| Insurance folder, photo frames, cat | look / call the cat (it hides under the bed from T−6 h and reappears in the eye) | flavour + tasks |
| Ray (NPC across the street) | talk (only when U < 20 m/s) | dialogue lines by phase |
| Nguyens' house (aftermath) | check | photo message to the group text |
| Circuit panel | open, look | breakers; nothing to do but feel useful |
| Pool | look | level/colour |

---

## 8. The little-details catalogue (each with its trigger)

Notation: `U` = house sustained (m/s), `G` = 3-s gust, `R` = rain rate mm/h, `T` = hours from closest approach, `pw` = power on.

**Prep day**
1. Cirrus "fan" and a red sunrise — T ≤ −30, sun elevation < 10°.
2. Sun halo through cirrostratus — T −30…−24, sun elevation > 20°.
3. Outdoor heat shimmer on the driveway — T −27…−20, `T_out > 31 °C`.
4. Birds streaming inland (instanced flock, NE-bound) — T −22…−18, once per 40 sim-min.
5. Neighbours' shutters going up one house at a time (audible drill/panel clatter across the street) — T −30…−20.
6. Ray walks over and asks "you staying?" — T −29 ±0.5 and U < 10.
7. The Nguyens' SUV loads and leaves; kids wave — T −22.5.
8. Distant swell rumble audible only in the street with the wind synth quiet — T −26…−18.
9. Last golden-hour light through the one unshuttered window — every unshuttered window, sun elevation 5–15°.
10. Milky sky, the sun as a disc you can look at — T −25…−20.
11. Gas-station line sound-cue on the TV crawl "fuel shortages reported" — advisory T −27.
12. Group text fills with "we're staying / leaving" replies — T −30…−20, scheduled.
13. Snowbird house's Ring doorbell blinks blue all night — always, until `pw` fails.
14. Pool fountain across the pond on/off — dies with `pw`.
15. Freezer bottles clink as they freeze (if placed) — 3 h after placing.

**Bands and rising wind**
16. First squall darkens the room in seconds; lights look brighter — first band arrival.
17. Microwave clock blinks 0:00 after each flicker — every `power.flicker` event.
18. UPS single beep on flicker; continuous scream at outage until unplugged — power events.
19. Wet street glistening under the streetlight between bands — R = 0 after R > 5, night, `pw`.
20. A trash can rolls down the street and lodges in the swale — G > 15, only if not brought in.
21. Screen panels bulge and hum — G > 20, windward panels.
22. First panel rips with a zip — G > panel threshold (~30 ± 4).
23. Pool overtops; lanai pavers darken — cumulative R > 60 mm.
24. Palm fronds start streaming leeward, then stripping (queen) — U > 15 / G > 28.
25. Sabal palm folds up like an umbrella — U > 25.
26. Hedges lie flat — U > 22.
27. Door "suck" and weatherstrip hiss on gusts — G > 20 on the windward door.
28. Bathroom door shudders in its frame — G > 22.
29. Ceiling fans coast to a stop over 20 s at outage — outage event.
30. Cat disappears under the bed — U > 12; reappears in the eye; hides again at the back eyewall.
31. Tornado Watch on NWR with the SAME tones — scheduled T −12 in the right-front quadrant.
32. Distant lightning to the SW in the gap between bands — `lightning[]` with distance > 10 km.
33. Thunder delay matches distance (0.34 km/s) — every lightning event.
34. Rain sound changes character when you walk from tile room to garage (metal door) — `roomOf`.
35. Smoke detector chirps once at outage; chirps every 60 s once its ceiling leak point is wet — outage; leak point #3.
36. Streetlights die, the whole subdivision goes dark — outage (at night the darkest moment of the sim).
37. Neighbour's porch light stays on (battery lantern) — Ray's house, after outage.
38. Garbage-day reminder on the phone at 07:00 Thursday, absurdly — clock.
39. The phone's battery percentage becomes something you watch — screen-on drain.

**Power and pressure**
40. Brownout: lights orange, fridge groans, TV image shrinks — `E > 0.3·E_fail`.
41. Transformer flash lights the rain like a camera flash, blue-green, twice — outage event with overhead service.
42. Silence after outage makes the wind suddenly louder — indoor filter gain +4 dB on outage.
43. Fog forms on the inside of the glass as the house warms — after outage, ΔT > 4 °C, unshuttered panes.
44. Indoor temperature creeps up on the battery weather-station console while the thermostat display is dead — after outage, +1 °C per ~20 sim-min toward outdoor.
45. Ears pop — every 4 hPa; reversed direction in the eye and again on the back side (subtitle text changes: "your ears pop" / "your ears pop the other way").
46. Toilet water level rocks and gurgles — `earPop` events and `G > 35`.
47. Attic hatch lifts and thumps — G > 30 windward, and strongly after any envelope breach.
48. Front door bulges visibly — G > 38 windward.
49. Weather station pressure readout with a "falling rapidly" arrow; a photo moment at 28.05 inHg — `dPdt < −6 hPa/h`; minimum at T0.
50. Anemometer on the roof stops reporting after a 50 m/s gust — "--" on the console.

**Hurricane force and the eyewall**
51. Roar becomes continuous; you cannot hear the TV — roar > 0.8 → TV audio duck.
52. Whistles from the soffits on windward rooms — U > 25, room-specific.
53. Slider bows inward an inch or two; water line along the track — G > 30 windward, then intrusion tier 1.
54. Garage door oil-cans with a whump — windward and G > 30.
55. Shingles peel off the snowbird house and slap your wall — G > 29; impacts on the east wall.
56. Debris impacts: frond thud, shingle slap, aluminium ring — debris class hits.
57. Roof creaks and pops under the master tray ceiling — `windLoad²` rate, room under roof.
58. Water weeps at windward sills — U > 35 unshuttered windward.
59. Ceiling stain grows near the exterior wall; then a drip from the can-light — `leakRate` integral.
60. Bucket ping-ping-ping — bucket placed under an active leak.
61. Insulation dust in the drip — leak tier ≥ 3.
62. Cage groans, folds in slow motion, crunches into the pool — collapse event.
63. The lanai fan shreds, one blade flapping — G > 40 after cage collapse.
64. Live oak limb crashes onto the snowbird roof — G > 45, once.
65. Visibility drops to 300 m; the house across the street is a shape — R > 40 and U > 30.
66. Noon looks like dusk: 150 lux — eyewall cloud optical depth.
67. Mesovortex gust: a 15-s surge where everything gets louder and the house shudders — mesovortex events inside 1.3 RMW.
68. NWR Extreme Wind Warning with "treat this like a tornado warning" wording — EWW conditions.
69. WEA fails to arrive because service is gone; NWR still gets it — cell state.
70. The player is pushed sideways and can be knocked down outside — `U_inst²` force.

**The eye**
71. Rain stops within minutes; the roar drops; a hiss remains — inner eyewall edge.
72. Blue sky patches, then full sun; steam off the driveway — `eyeFactor` > 0.5.
73. Dripping from every edge; frogs; birds — eye ambience crossfade.
74. Ring of eyewall cloud all around the horizon, the back side visibly darker — sky dome eye mode.
75. Ray on his porch shouting "don't get comfortable" — eye + player outside.
76. Car alarm cycling somewhere down the street — eye, random house.
77. Pressure minimum displayed; NWR "the eye is passing over; the dangerous back side will arrive within the hour" — T0.
78. A hurt bird on the lanai pavers — eye, 40 % chance by seed.
79. The cat comes out — eye.
80. Sky darkens in five minutes; hiss becomes a roar from the *opposite* side — back eyewall onset.

**Back side, subsiding, night**
81. Wind reversal: the other slider leaks, the other windows weep, streaks on glass run the other way — `reversal`.
82. Back-side peak slightly higher than the front (water fetch across the pond) — exposure table.
83. Sunset glow under the cloud deck; a rainbow from the lanai — T +5, sun elevation 2–8°, R < 5 with sun behind.
84. First sirens — T +6.
85. Neighbours' flashlights bobbing in the street — T +6…+8, U < 18.
86. Generators start one by one; Ray's first — T +6.5 onwards.
87. Stars between bands; the darkest sky you've ever seen over a subdivision — night, `pw` off, R = 0.
88. Curfew notice on NWR and (if any bars) WEA — T +6.
89. Sleeping on the tile because the bedroom is 30 °C — bed prompt text changes to "too hot to sleep here; try the tile".
90. Mosquitoes at dusk — T +28 onward at night.

**Aftermath**
91. Dawn reveals the debris field; a shingle in the pool; the cage in a heap — T +15.5.
92. Helicopters — T +16 onward, 2 per hour.
93. Chainsaws in three directions, bogging as they cut — T +17.
94. Bucket-truck backup beepers — T +19.
95. Boil-water notice — T +18 via NWR; text arrives when bars return.
96. Water pressure drops to a trickle at the tap; the tub water matters — pressure curve.
97. Ceiling stain rings dry to yellow-brown; drywall sag remains — `wetness` decay on stains.
98. Mildew smell subtitle in the master — 24 h after the first leak tier ≥ 2.
99. Fridge contents warm; "don't open it" subtitle on the door prompt — contents model.
100. Ice/water distribution loudspeaker truck passes — T +26.
101. Group text floods with photos when SOS becomes 1 bar — T +20.
102. Bent stop sign, mailbox gone, the snowbird house's sheathing exposed — aftermath bake.
103. The bucket truck turning into the cul-de-sac at sunset; the end card — T +29.75.

(103 entries; all keyed to `SimState` fields or bus events, none to wall-clock timers.)

---

## 9. Software architecture

### 9.1 Modules and data flow

```
input ─▶ core/loop ─▶ core/clock ─▶ storm/* ─▶ scenario/* ─▶ house/systems ─▶ player+interaction
                                                                                    │
            render ◀─ ui/* ◀─ devices/* ◀─ audio/* ◀─ effects/* ◀─ world/* ◀────────┘
                      (all readers of state; writers of nothing outside their slice)
```

Every module exports `init(ctx)`, `update(ctx, dtReal, dtSim)` and (for renderables) `dispose()`. `ctx = { state, bus, rng, three: { renderer, scene, camera }, audio: { ctx, buses }, quality }`.

### 9.2 Single source of truth — `SimState` schema (JSDoc, `core/state.js`)

```js
/** @typedef {Object} SimState
 * @property {Meta}      meta      // owner: core/app.js
 * @property {Clock}     clock     // owner: core/clock.js
 * @property {Storm}     storm     // owner: storm/stormModel.js
 * @property {Env}       env       // owner: storm/environment.js
 * @property {House}     house     // owner: house/systems.js
 * @property {Player}    player    // owner: interaction/player.js
 * @property {Devices}   devices   // owner: devices/*.js (one file per key)
 * @property {Scenario}  scenario  // owner: scenario/director.js
 * @property {Tasks}     tasks     // owner: scenario/tasks.js
 * @property {Debug}     debug     // owner: core/debug.js
 */

/** @typedef {Object} Meta
 * @property {string} stormName        // 'Leah'
 * @property {string} presetId         // 'reference-cat3' | 'compact-cat4' | ...
 * @property {number} seed
 * @property {'auto'|'low'|'high'} quality
 * @property {boolean} headless
 */

/** @typedef {Object} Clock
 * @property {number} simTime          // seconds since epoch 2026-09-02T06:00:00-04:00
 * @property {number} tRel             // hours relative to closest approach (negative before)
 * @property {number} speed            // effective multiplier this frame
 * @property {number} requestedSpeed   // 1|5|10|30|120|600
 * @property {boolean} autoPace
 * @property {number} momentSlowUntil  // simTime; 0 if none
 * @property {boolean} sleeping
 * @property {number} sleepUntil
 * @property {number} dtSim            // this frame's sim seconds
 * @property {number} dtReal
 */

/** @typedef {Object} Storm
 * @property {{x:number,y:number}} center   // km, house at origin, +x east +y north
 * @property {number} headingDeg
 * @property {number} vt                     // m/s forward speed
 * @property {number} vmaxMarine             // m/s
 * @property {number} pc @property {number} pn @property {number} rmw @property {number} B
 * @property {number} r  @property {number} phiDeg      // house relative to centre
 * @property {number} U  @property {number} Uinst @property {number} gust3s
 * @property {number} dirRad                 // from-direction
 * @property {number} P  @property {number} dPdt           // hPa, hPa/h (60-s smoothed)
 * @property {number} R  @property {number} rainTotal      // mm/h, mm
 * @property {number} bandWind @property {number} bandRain
 * @property {number} eyeFactor
 * @property {number} reversal
 * @property {Band[]} bands
 * @property {Cues}   cues                   // §2.4
 * @property {'prep'|'bands'|'ts'|'hurricane'|'eyewall'|'eye'|'backEyewall'|'subsiding'|'aftermath'} phase
 */

/** @typedef {Object} Env
 * @property {number} sunElevDeg @property {number} sunAzDeg
 * @property {number} illuminanceLux @property {number} cloudOpticalDepth @property {number} cloudBaseM
 * @property {number} visibilityM
 * @property {number} tOut @property {number} rhOut @property {number} dewPoint
 * @property {number} streetWaterM @property {number} swaleWaterM @property {number} pondLevelM
 * @property {Lightning[]} lightning        // recent strikes {simTime, distKm, azDeg}
 * @property {number} wetness
 */

/** @typedef {Object} House
 * @property {Power} power        // {on, flickerCount, hazardE, hazardEFail, lastFlickerSim, outageSim, transformerFlashed, generator:{running,fuelL,circuits}}
 * @property {Water} water        // {pressureFrac, tubL:[n,n], jugsL, heaterWarmFrac, boilNotice}
 * @property {Climate} climate    // {tIn, rhIn, thermostatSet}
 * @property {Object<string,Shutter>} shutters   // id → {closed, closingProgress}
 * @property {Object<string,Opening>} openings   // doors/windows/sliders: {open, braced, sandbagged, towels, bow, windward}
 * @property {Object<string,LeakPoint>} leaks    // {active, tier, integral, bucket, stainRadius}
 * @property {Cage} cage          // {panels:[{torn,bulge}], collapsed, collapseProgress}
 * @property {Garage} garage      // {doorPump, braced, failed, carsIn, waterM}
 * @property {Roof} roof          // {shinglesLost, anemometerAlive}
 * @property {Object<string,boolean>} propsSecured  // lanai chairs etc.
 * @property {Cell} cell          // {bars, data, sms}
 * @property {Pool} pool          // {levelM, brown}
 * @property {Fridge} fridge      // {tFridge, tFreezer, opens}
 * @property {number} damageScore
 */

/** @typedef {Object} Player
 * @property {number[]} pos @property {number} yaw @property {number} pitch
 * @property {string} room           // 'great' | 'garage' | 'outside' | ...
 * @property {boolean} outside @property {boolean} knockedDown
 * @property {string|null} carrying  // interactable id
 * @property {string|null} lookingAt
 * @property {number} earsMuffled    // 0..1
 * @property {{flashlight:boolean, phoneUp:boolean}} ui
 */

/** @typedef {Object} Devices
 * @property {TV} tv           // {on, channel, contentKey}
 * @property {Phone} phone     // {batteryFrac, screenOn, bars, alerts:[], threads:{}, app, gallery:[]}
 * @property {Radio} radio     // {on, volume, batteryFrac, currentProduct, sameActive}
 * @property {Station} station // {p, pHistory:Float32Array(288), wind, gust, dir, rain, tIn, rhIn, tOut, rhOut}
 * @property {Lights} lights   // id → {on}
 */

/** @typedef {Object} Scenario
 * @property {Object<string,number>} fired   // momentId → simTime
 * @property {string|null} activeMoment
 * @property {Alert[]} alerts               // issued NWS/NHC products {id, simTime, kind, text}
 * @property {string[]} log                 // end-card material
 */
```

`Tasks` is `{ list: Task[] }` with `Task = {id, title, phase, done, doneSim, autoCheck(state)}`. The full file is ~250 lines and is the **first thing merged**; changing a typedef requires the owner's sign-off and a note in `docs/state-changelog.md`.

### 9.3 Update order (one frame)

1. `input.poll()` → `ctx.input` (owner H).
2. `clock.update()` — picks speed (Auto-pace tiers, moment slow, sleep), computes `dtSim` (owner A).
3. `storm.update()` — fixed sub-steps of 5 sim-s with an accumulator (max 200 sub-steps/frame; beyond that, the clock clamps `dtSim`), then the real-time OU stack, then `cues` (owner B).
4. `environment.update()` — sun, light, flood, lightning, temperature (owner B).
5. `scenario.director.update()` — evaluates moment predicates, alerts scheduler, NPC lines; emits `moment:*`, `alert:*` (owner A).
6. `house.systems.update()` — failure integrals, intrusion ladder, climate, water, cell (owner C). Emits `power:*`, `leak:*`, `cage:*`, `garage:*`, `impact:*` requests.
7. `player.update()` + `interaction.update()` — movement, raycast, interact; writes `state.player`, calls `interactable.use()` which may write *its owner's slice* through owner-provided setters (e.g. `house.api.closeShutter(id)`) (owner H).
8. `tasks.update()` — auto-check predicates (owner A).
9. `devices.update()` — TV/phone/radio/station read state, write their own slice (owner G).
10. `effects.update()` — all visual systems (owner E).
11. `world.update()` — vegetation/cage/door morphs, lighting states (owners C/D).
12. `audio.update()` — parameter smoothing, event-triggered one-shots (owner F).
13. `ui.update()` — DOM at ≤ 4 Hz except prompts/subtitles (owner G).
14. `renderer.render()`; `debug.sample()`.

Reads of state happen *after* all writes for the frame; a module that needs a previous-frame value keeps it privately. Bus events emitted during steps 3–7 are delivered synchronously at the end of step 7 (`bus.flush()`), so audio/effects always see the state that produced the event.

### 9.4 Event bus (`core/bus.js`)

`bus.on(name, fn)`, `bus.emit(name, payload)` (queued), `bus.flush()`. Names and payloads are frozen in `core/events.js` (JSDoc) — the contract between teams:

| Event | Payload | Emitter → typical listeners |
|---|---|---|
| `clock:phase` | `{from, to}` | clock → ui, audio, scenario |
| `clock:sleepStart` / `clock:sleepEnd` | `{until}` / `{reason}` | clock → ui, audio |
| `storm:earPop` | `{sign}` | storm → audio, ui |
| `storm:mesovortex` | `{amp, dur}` | storm → audio, effects |
| `storm:lightning` | `{distKm, azDeg}` | environment → effects, audio |
| `storm:eyeEnter` / `storm:eyeExit` | `{}` | storm → scenario, audio, effects |
| `power:flicker` / `power:brownout` / `power:outage` / `power:restore` | `{simTime, transformer:boolean}` | house → everything |
| `house:leakStart` / `house:leakTier` | `{id, tier}` | house → effects, audio, tasks |
| `house:intrusion` | `{openingId, tier}` | house → effects, audio |
| `house:cagePanelTear` / `house:cageCollapse` | `{panel}` / `{}` | house → world, audio, scenario |
| `house:garageDoorFail` / `house:sliderUnlatch` | `{}` | house → world, audio, effects |
| `house:debrisImpact` | `{class, wall, energy}` | effects (physics) → audio, house(damage) |
| `house:treeLimb` | `{treeId}` | house → world, audio |
| `house:cellChange` / `house:waterPressure` / `house:boilNotice` | `{bars,data,sms}` / `{frac}` | house → devices |
| `alert:issued` | `{kind:'HLS'|'EWW'|'TOR'|'FFW'|'WEA'|'CURFEW'|'BOIL', channels:['nwr','wea','tv'], text}` | scenario → devices |
| `moment:start` / `moment:end` | `{id}` | scenario → clock, ui, audio |
| `npc:say` | `{who, text, pos}` | scenario → audio(voice), ui |
| `interact:use` / `interact:pickup` / `interact:drop` | `{id}` | interaction → house/devices/tasks |
| `task:done` / `task:available` | `{id}` | tasks → ui, audio |
| `player:roomChange` / `player:outside` / `player:knockedDown` | `{from,to}` | player → audio, effects, ui |
| `device:tvChannel` / `device:phoneApp` / `device:radioToggle` | `{...}` | devices → audio |
| `debug:screenshotReady` | `{}` | loop → headless harness |

### 9.5 File/folder layout and ownership

One owner per directory; cross-directory edits go through a PR reviewed by the owner. Shared read-only contracts (`core/state.js`, `core/events.js`, `world/plan.js`, `storm/presets.js`) are owned by A and B and frozen after week 1.

```
/src
  main.js                       A   bootstrap, menu → app
  core/                         A   app.js loop.js clock.js state.js events.js bus.js rng.js quality.js debug.js input.js
  storm/                        B   holland.js track.js bands.js turbulence.js environment.js stormModel.js presets.js units.js
  scenario/                     A   director.js moments.js alerts.js products.js (NWS text templates) npc.js tasks.js timeline.js
  house/                        C   systems.js (failure integrals) api.js (owner-provided setters) intrusion.js climate.js cell.js
  world/                        C   plan.js build/{walls,floors,roof,openings,props}.js neighborhood.js vegetation.js cage.js colliders.js roomOf.js
  materials/                    D   textures/{stucco,tile,drywall,asphalt,shingle,wood,fabric,metal}.js materials.js sky.js lighting.js shaders/*.glsl.js
  effects/                      E   rain.js rainOnGlass.js spray.js debris.js flood.js leaks.js stains.js lightning.js transformer.js flashlight.js post.js vegetationAnim.js
  audio/                        F   engine.js buses.js synth/{noise,wind,rain,creaks,electrical,cage,impacts,thunder,eye,aftermath}.js voice.js same.js wea.js reverb.js
  devices/                      G   tv.js tvCanvas.js phone.js phoneApps.js radio.js station.js generator.js thermostat.js
  ui/                           G   hud.js prompts.js subtitles.js menus.js timeControls.js scrubBar.js endCard.js styles.css
  interaction/                  H   player.js controller.js raycast.js registry.js interactables/*.js (one file per object family) carry.js
/test                           A (+each owner writes tests for their module)
  storm/*.test.js  house/*.test.js  scenario/*.test.js  core/*.test.js
/scripts
  screenshots.mjs               A   Playwright headless runner
  scenarios.json                A   screenshot scenario table (§10.2)
/docs                           all
```

Engineers: **A** core+scenario+test harness (integration lead), **B** storm+environment, **C** house systems+world geometry, **D** materials/textures/sky/lighting, **E** effects, **F** audio, **G** devices+UI, **H** interaction+player. Optional 9th: neighbourhood/NPC/vegetation split from C.

**Parallelisation plan (4 weeks):**
- Week 1: A lands `state.js`, `events.js`, `bus.js`, `clock.js`, the loop, a grey-box house from `plan.js` (C), and a stub `storm/` that plays back the research §11 table (B). Every other team codes against the typedefs and the stub from day 2.
- Week 2: real storm model + unit tests (B); house systems (C); textures (D); rain/debris/lighting (E); wind/rain synth (F); phone+radio (G); controller+registry (H). Integration on Fridays via the screenshot suite.
- Week 3: failures/intrusion/cage (C+E), voice/SAME/WEA (F+G), moments/tasks/NPC (A), post/quality tiers (D+E).
- Week 4: polish, catalogue audit (each of the 103 details is a checkbox with an owner), performance pass, golden screenshots frozen.

### 9.6 Performance budgets (per frame, 1080p, Iris Xe, 60 fps target)

| Module | JS ms | Draw calls | Triangles | Notes |
|---|---|---|---|---|
| core+clock+scenario+tasks | 0.3 | — | — | predicates are cheap closures |
| storm (5-s sub-steps, ≤ 12/frame at 60×) | 0.3 | — | — | 200 sub-steps only at 600× |
| house systems | 0.2 | — | — | |
| player/interaction | 0.4 | — | — | ≤ 60 AABBs after grid broadphase |
| effects | 2.5 | 40 | 120 k | rain 20 k instances in one call; debris 300 in one call |
| world (house per-room merged, neighbourhood BatchedMesh, vegetation instanced) | 0.5 | 120 | 350 k | rooms cull individually |
| materials/lighting | — | — | — | ≤ 40 programs, pre-warmed for power-on/off |
| audio | 1.0 | — | — | ≤ 48 voices |
| devices (canvas TV/phone at 10 Hz) | 0.5 | 2 | — | |
| ui (DOM at 4 Hz + prompts) | 0.2 | — | — | |
| **Total** | **≤ 6 ms JS** | **≤ 200** | **≤ 500 k** | 9 ms GPU, 1.5 ms headroom |

Shadows: sun 2048² fitted to the lot, `autoUpdate=false`, refreshed every frame outdoors / every 3rd indoors; flashlight 512²; never both (sun shadow off when elevation < 0 or illuminance < 500 lux). Textures ≤ 60 MB, all canvas-generated at load (≤ 2.5 s on a laptop, cached to IndexedDB as ImageBitmap for repeat loads).

Quality tiers: `high` (post, 20 k rain, grass), `auto` (no grass, bloom), `low`/SwiftShader (no post, 2 500 rain, 80 debris, 1024² basic shadow, 3-octave sky).

---

## 10. Testing and verification

### 10.1 Unit tests (`node --test test/`, no DOM, pure modules)

Storm (owner B): Holland profile peaks at `r = RMW` with `V = Vmax` (±0.5 %); `V(0.5·RMW) < V(RMW) > V(2·RMW)`; pressure monotone in r and equals `Pc` at r=0, `Pn − ε` at 800 km; asymmetry adds ≤ `0.55·Vt` on the right side and subtracts on the left; wind direction at the house rotates through ≥ 150° across the reference eye passage and `reversal` becomes 1 within 30 min of eye exit; `eyeFactor` = 1 at r = 0 and 0 at r ≥ 0.9·RMW; turbulence statistics over 10⁶ real-seconds: mean ratio 1.00 ± 0.02, gust factor 1.55–1.65, spectral split within 10 % of 0.35/0.45/0.20; R-CLIPER total over the reference track = 250 ± 40 mm; Kaplan–DeMaria halves Vmax within ~11 h; track interpolation is C¹ and hits every control point; seeded determinism (two runs, same seed, identical state hash at every 5-s step); band profile continuous (finite difference < 0.05 per km).

House (owner C): the outage lands in T−9…T−3 h for 100 random seeds on the reference preset; braced garage door survives the reference storm in ≥ 95 % of seeds, unbraced fails in ≥ 60 %; closing all shutters reduces the intrusion integral by ≥ 60 %; a bucket under an active leak prevents `puddle` growth; cell bars monotone non-increasing until T+10.

Scenario (owner A): every moment fires exactly once in a 62-h fixed-dt run at 600×; alerts issue in the research §10 order; every task's `autoCheck` is satisfiable from state; the end card is fully populated.

Core: clock never advances more than the clamp; Auto-pace tier transitions are hysteretic (no flapping in a 1-h synthetic wind ramp); bus delivers queued events in order and only at flush.

### 10.2 Headless screenshot scenarios (`npm run shots`, Playwright + SwiftShader)

Chromium flags: `--headless=new --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --disable-gpu-vsync --disable-frame-rate-limit`. The page is opened with `?quality=low&headless=1&seed=7&preset=reference-cat3&t=<hours>&cam=<preset>&auto=<script>`. The app exposes `window.__sim = { state, advance(simSeconds, realStepMs=16.7), snapshot(), setCam(id), run(scriptId) }`. The harness waits for `debug:screenshotReady` (after `renderer.compile` and two warm frames), then captures `test/screenshots/<scenario>.png` at 1280×720 and writes `<scenario>.state.json`.

`scripts/scenarios.json` (22 scenarios):

| Id | t (h) | Camera | Auto-script | Assertion |
|---|---|---|---|---|
| prep-dawn | −32 | foyer→street | none | mean luminance 0.35–0.6; `power.on` |
| prep-shutters-half | −27 | front yard | close 5 shutters | 5 shutters `closed`; prompt visible |
| band1-night | −16 | great room slider | none | `R > 10`; streetlight lit; rain streaks present (variance in top-right ROI > threshold) |
| gap-wetstreet | −14 | street | none | `wetness > 0.5`, `R < 1` |
| ts-dawn | −8 | lanai | none | cage panels bulging; ≥ 1 torn |
| flicker | −7.2 | kitchen | advance to next `power:flicker` | microwave shows 0:00 texture |
| transformer | outage moment | bedroom 3 | advance to `power:outage` + 0.1 s | flash luminance spike vs previous frame ≥ 3×; then `power.on === false` |
| dark-house-noon | −3 | hallway | flashlight on | mean luminance < 0.08 outside the flashlight cone |
| eyewall-outside | −1.25 | driveway | none | `visibilityM < 400`; `Uinst > 35`; player pushed (pos delta) |
| slider-bow | −1.5 | great room | none | slider vertex offset > 0.02 m; intrusion decal area > 0 |
| leak-bucket | −1 | master | bucket placed | `leaks.master.bucket`; drip particles present |
| cage-collapse | first `house:cageCollapse` + 6 s | lanai | none | `cage.collapsed`; pool has cage pieces |
| eye-sky | 0 | lanai looking up | none | sky ROI mean blue channel > red; `eyeFactor > 0.9`; `P` ≈ 950 ± 1 |
| eye-street | −0.1 | street | none | sun shadow present; birds instanced count > 0 |
| back-eyewall-hit | +0.8 | master slider | none | `reversal > 0.9`; master slider intrusion > 0 and great-room slider not increasing |
| subsiding-sunset | +5 | lanai west | none | sun elevation 2–8°; warm hue ROI |
| night-generators | +8 | street | none | `power.on === false`; ≥ 2 generator voices active (audio graph introspection) |
| aftermath-dawn | +15.5 | driveway | none | debris instance count ≥ 150; snowbird sheathing exposed flag |
| aftermath-stains | +20 | master looking up | none | stain radius > 0.3 m |
| phone-wea | −27 | phone up | none | WEA banner DOM present; text matches template |
| tv-cone | −30 | TV close-up | none | TV canvas non-black; cone polygon drawn |
| endcard | +29.9 | — | none | end-card DOM populated; all numeric fields finite |

Assertions run on the PNG (ROI statistics via a tiny PNG decoder, no native deps) and on `state.json`. Golden images are compared with a per-pixel tolerance (mean abs diff < 2 %, allowing for SwiftShader dithering); a failure prints both images' paths. The whole suite runs in ≤ 6 minutes in CI (SwiftShader ≈ 2–10 fps, 10 warm frames each).

### 10.3 Performance CI

A Playwright run on a GPU-less runner is meaningless for fps, so performance is asserted structurally: `renderer.info.render.calls ≤ 200`, `triangles ≤ 500 k`, `programs.length ≤ 40`, texture bytes ≤ 60 MB, JS frame time (measured with `performance.now()` around `update()`) ≤ 6 ms averaged over 300 fixed-dt frames at each of six `t` values. Developers with a laptop run `npm run dev` with `?debug=1` to see the per-module ms overlay.

### 10.4 Determinism

Every RNG is `rng.fork('effects')` etc. from the master seed; `Math.random` is banned by a lint grep in CI. Audio uses its own fork so that visuals are bit-identical with audio muted. A `state hash` (FNV-1a over a canonical JSON of `storm`, `house`, `scenario.fired`) at every 5-s step is logged in headless mode; two runs must match.

---

## 11. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Procedural house looks like a grey box | Fatal to "polished" | Week-1 texture sprint (D) with a style sheet: knockdown drywall, 24" porcelain tile, stucco, shingle; baked vertex AO at build; props with bevels; the screenshot suite reviews composition every Friday |
| Storm model tuning takes over the schedule | Late integration | The §11 research table is the acceptance test; a playback stub decouples every other team from B |
| SwiftShader too slow for the suite | No CI | Low tier hard-caps everything; 10 warm frames; scenarios run in parallel workers; rain 2 500 |
| Shader recompiles when lights toggle | 200 ms hitches at the outage — the worst possible moment | Never add/remove lights; toggle intensity; pre-compile both states at load |
| Audio clipping/fatigue over 90 minutes | Players mute it | Master limiter, roar mapped in dB not linear, indoor filter, loudness meter in debug HUD; a "listening pass" checklist per phase |
| speechSynthesis missing or awful | Radio/TV feel broken | Text is primary; voice is garnish; synthesized "radio voice" noise burst fallback |
| Time compression makes the storm feel like a slideshow | Realism lost | Turbulence and audio in real seconds; Auto-pace tiers; moment slow-downs; never > 10× in the core |
| Coupling creep (modules reaching into each other's slices) | Parallel work collapses | Owner-only writes enforced by `Object.freeze` of non-owned slices in debug mode (proxies throw on write) |
| 103 details, each half-done | Death by a thousand cuts | Details are tracked as a checklist with owner + screenshot scenario; a detail is "done" only with its trigger test |
| Debris physics explodes | Visual absurdity | Simple drag model, capped speeds, despawn on leaving the 80 m volume, bodies never collide with each other |
| Player goes outside in the eyewall | Either nothing happens (fake) or it's a fail state (against brief) | Wind push, knock-down, blackout-and-wake-inside ("Ray dragged you back"); never a game-over |
| Scope | Everything | Week-3 cut list already ranked: grass, pool reflections, NPC walking animations, TV radar loop (static image fallback), attic interior |

---

## 12. What makes this proposal exceptional

1. **The storm is the author.** Nothing is keyframed: the outage, the cage, the leaks, which window weeps, when the cat hides — all are hazard integrals over a Holland wind field with seeded thresholds. Change the preset to the compact Cat 4 and a different, still-consistent story emerges with no new content.
2. **Owner-only state slices with frozen contracts** let eight people build in parallel from day two, against a stub that plays back the research timeline; integration is a Friday screenshot suite, not a month of merge pain.
3. **The cue vector** (`windLoad`, `roar`, `leakRate`, `earPop`, `reversal`, …) is the whole interface between physics and feel. Effects, audio and UI teams never touch meteorology; the meteorology team never touches shaders.
4. **Real seconds where the body lives, sim seconds where the storm lives.** Fast turbulence and audio are never time-compressed; gusts feel like gusts at 30×.
5. **Auto-pace and moment slow-downs** make a 62-hour arc land in 60–90 minutes without a single cut-scene.
6. **The wind reversal is a first-class state variable** that flips which slider leaks, which side of the house creaks, which way the streaks run on glass, and which windows the back-eyewall shreds — the single most under-modelled fact of real eye passages.
7. **A 22-scenario deterministic headless screenshot suite** with state assertions, plus determinism hashes, means "the transformer flash lights the rain" is a CI check, not a hope.
8. **103 catalogued details, each with a trigger predicate and an owner**, audited as a checklist.
9. **The end card is computed from the player's own state** (peak gust, minimum pressure, litres of tub water used, leaks caught, what happened in the eye), so every run ends with a personal weather record.
10. **Budgets are written into file headers** and asserted in CI structurally (draw calls, programs, JS ms), so 60 fps on an integrated GPU is a property of the codebase, not a late optimisation pass.
