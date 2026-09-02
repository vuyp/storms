# Florida Storm — Design Proposal A: "Realism First"

*One house, one storm, every effect a function of modelled state.*

Companion research: `docs/research/meteorology.md` (wind field, bands, pressure, timeline), `docs/research/florida-home.md` (construction, prep, devices, aftermath), `docs/research/tech-3d.md` (three.js r170 pipeline, budgets). This proposal cites those documents by section where it uses their numbers, and deliberately does not repeat their derivations.

**Thesis.** Nothing in this simulation is keyframed. There is a single storm model (Holland 1980 wind and pressure field on a moving track, R-CLIPER rain with spiral bands, a von Kármán/OU turbulence stack), a single house model (envelope loads, openings, water paths, thermal mass, utilities), and a single clock. Every light, sound, drip, flicker, text message, bird and chainsaw is derived from those models by explicit, testable functions. If the player moves the storm 30 km to the right in the setup menu, the whole experience re-derives itself: no eye, an 8-hour veer, an earlier surge, tornado warnings on the phone. That is what makes the details feel true rather than staged — and it is what makes the project implementable by eight people in parallel, because every module consumes the same state and nothing owns "the script".

---

## 1. The experience arc

### 1.1 Scenario

- **Storm:** Hurricane **Paulette** (AL172026), name selectable from the 2026 list. Reference preset: Vmax 100 kt marine (Cat 3), Pc 950 hPa, Pn 1012 hPa, RMW 25 km, B 1.5, forward 20 km/h toward 045°. Landfall 6 km SW of the house; closest approach at **14:00 EDT, Thursday 10 September 2026**. Track offset from the house is a slider (−80 … +80 km); the reference is 0 (eye overhead).
- **Place:** 4212 Sandpiper Cove, a 2003 CBS single-storey in a Gulf Coast subdivision 4 km inland at 3.2 m elevation, evacuation Zone C (not ordered). Pond behind the lot, cul-de-sac street in front. The house faces **east**; the lanai faces **west** over the pond. This orientation is load-bearing for the design: the storm's front half hits the front door and the front windows from the ESE; the back eyewall hits the sliders and the pool cage from the WNW. What survives the first half is what the second half attacks.
- **Player:** an adult who has decided to stay. There is no companion NPC inside the house (voices come through the phone, the radio, the TV and — in the eye and after — from the street). The household has a dog, "Biscuit", who reacts to the model (Section 8) and is the single strongest emotional barometer in the house.
- **Tone:** procedural documentary. No score, no objective markers over objects. The HUD is the phone in your hand and the devices in the house.

### 1.2 Clock, compression and the pacing curve

Sim time `t` is seconds since the scenario epoch (00:00 EDT, 9 Sep 2026). The storm's closest approach is `T0 = 14:00 on 10 Sep`; all phases are expressed as `T` = hours from T0. Compression `s = dt_sim / dt_real` is a **function of phase**, not a global constant, and the player may override it (0.5×–240×) or "sleep/skip to next event".

| Phase | T (h) | Sim duration | Standard pacing s | Real minutes | Full pacing s | Real minutes |
|---|---|---|---|---|---|---|
| Prep day | −30 → −18 | 12 h | 120× | 6 | 90× | 8 |
| Outer bands | −18 → −10 | 8 h | 48× | 10 | 30× | 16 |
| Tropical-storm winds | −10 → −4 | 6 h | 30× | 12 | 20× | 18 |
| Hurricane winds → front eyewall | −4 → −1 | 3 h | 13× | 14 | 8× | 22 |
| Eye | −1 → +0.75 | 1.75 h | 7× | 15 | 4× | 26 |
| Back eyewall → below hurricane force | +0.75 → +4 | 3.25 h | 14× | 14 | 8× | 24 |
| Subsiding | +4 → +12 | 8 h | 80× | 6 | 40× | 12 |
| Aftermath | +12 → +66 (+ optional days) | 54 h | 240× + skips | 6 | 120× + skips | 10 |
| **Total** | | | | **≈ 83 min** | | **≈ 136 min** |

Two invariants keep compressed time believable:

1. **Turbulence, audio, animation and the player run in real time.** The fast OU gust process (τ = 2.5 s), rain particles, shutter rattle, the dog, footsteps and the mouse never see `s`. Only the slow storm state (position, mean wind, pressure, rain-band phase, utilities, thermal) advances by `s·dt`. At 120× the wind still gusts every 20–60 real seconds; it just gets stronger between gusts faster than it should. Above 60× the two middle OU processes are also clamped to real time so the sound does not become a hiss (meteorology §12, compressed-time note).
2. **Sleep is a first-class action.** Lying down on the hallway mattress or a bed opens a "sleep until" dialogue listing upcoming model-predicted events (next band, TS onset, power-out risk window, eyewall, eye, first light) rather than clock times. Sleep is interrupted by any `alert:*` event, by `power:lost`, by a debris impact above 40 J, and by the eye. Waking shows the phone lock screen with everything that arrived.

### 1.3 Hour by hour (reference preset)

The numbers below are model outputs (meteorology §11); the sim does not contain this table, it produces it.

- **T−30 (08:00 Wed, prep day).** 29 °C, hazy sun with a 22° halo, cirrus fanning from the SW, ESE breeze 10 kt. The 8 AM advisory on the kitchen TV: Cat 3 forecast, hurricane warning up. The prep checklist (Section 7) is open: panels and wing nuts from the garage, every window shuttered while the neighbourhood sounds of drills and aluminium, lanai furniture into the pool, bins into the garage, cars nose-first, tubs filled, water frozen, everything charged, generator tested. Ray walks over at T−28: "You staying?" The Nguyens leave at T−26.
- **T−21 (17:00).** Altostratus; the sun a disc; the first dark band on the SW horizon. Birds loud, then gone by T−19. Wind 14 kt gusting 24. The best sunset of the year, and the group chat fills with photos of it.
- **T−18 → T−10 (outer bands).** Two bands cross the house (T−16 for ~1 h, T−12 for ~1.5 h): gusts 35–45 kt, rain 15–35 mm/h, lightning to the SW with 5–20 s thunder delays. First power flicker at T−16 (microwave clock → 0:00). Tornado watch at 02:00; a Tornado Warning WEA at T−11.5 wakes the house. Between bands the sky breaks and the street steams — the false calm, and the last safe chance to check outside.
- **T−10 → T−4 (TS winds).** Dark dawn, 500 lux at 07:00. Sustained 25→50 kt at the house, gusts 42→82. The roar establishes at ~T−7. Screen panels tear one at a time; the snowbird house sheds shingles from T−6. Flickers every 20–40 min; **power goes out in the T−7…T−4 hazard window** (median T−6.2) with a blue-green transformer flash through the un-shuttered laundry window and a crack-boom 0.4 s later. The A/C stops mid-breath; the fans coast for 20 s; the UPS screams. Interior temperature climbs 0.55 °C per 10 min. Water under the front door from T−5. Cell data drops to one bar; SMS still goes. NWR Hurricane Local Statement hourly.
- **T−4 → T−1 (hurricane winds, front eyewall).** Sustained 50→78 kt, gusts 82→130. Visibility 300→150 m; 150 lux at noon. Extreme Wind Warning WEA at T−3.1 (rule: forecast marine Vmax ≥ 100 kt and time-to-eyewall ≤ 1 h). Branches, then the live oak at the snowbird house at T−2.6. Roof leaks at the east-wall can lights from T−3. The garage door pumps from T−3.5; unbraced it has a 35% cumulative chance of failing before the eye, braced 4%. Pressure falls 8→20 hPa/h; ears; interior doors breathe. Mesovortex gusts every 5–15 min. The refuge is the hall and the master closet.
- **T−1 → T+0.75 (the eye).** In fifteen minutes the rain quits and the wind collapses from 75 kt to 15. Cloud breaks from the zenith outward; at T−0.5 the sun is out, 20,000 lux, 30 °C, dead still, pressure 951 and steady; ears equalise. Dripping everywhere; grackles, a gull, frogs; the far eyewall a surf-roar on every horizon, visible as a stadium wall of cloud. Ray's Generac is running. Neighbours in the street. You can go outside; the phone and the radio say not to. At T+0.5 the western wall darkens the sky in five minutes, a rising hiss precedes it by 1–3 minutes, and the wind returns from the WNW at 60+ kt within 3–8 min. Being outside then is the game's one true fail state (Section 1.5).
- **T+0.75 → T+4 (back eyewall).** Marginally stronger at this house because the WNW fetch is open pond and water (exposure 0.85 vs 0.78). The lanai cage, which held in the lee all morning, folds in the first ten minutes; the sliders bow and leak at the track; everything pre-loosened goes. Pressure rises 20 hPa/h — ears in the other direction. The street ponds to kerb depth; the pond reaches the back lot line at T+3. Below hurricane force by T+4 with the first lulls.
- **T+4 → T+12.** Sunset glow under the deck; a rainbow possible at T+5. Bands only after T+8; stars in the gaps; the subdivision black. Curfew WEA at 21:00. Generators start one by one. Mopping, bailing the slider track, checking ceilings by headlamp, sleeping in the hallway at 29 °C.
- **T+15 onward (first light, Friday).** The street is a carpet of green. Chainsaws by 09:00; helicopters; the boil-water notice; a COW cell tower on day 3; two days of texts arriving in one avalanche; power back on day 5 to a cheer from the street.

### 1.4 What the player does

The game never forces a task. It offers a **prep checklist** (Section 7) that is exactly what a Floridian does, and the model punishes omissions physically and proportionally: an unshuttered window has a real failure probability under load and debris; an unfilled tub means no flushing after the pressure drops; an un-braced garage door pumps and may go; an ice maker left on drips into the freezer drawer when the power returns; a generator started in the garage raises a CO scalar that greys the vision and ends the run. Freedoms: walk anywhere inside; go outside whenever the door physics allow (Section 7); look through the peep window; sleep; run the clock; open and read any device.

### 1.5 The ending

The arc ends at first light on Friday when the player steps out of the front door — the "reveal" the model has been building: a damage state that is entirely derived (which shingles are gone, whether the cage folded, where the oak fell, how deep the swale is, whether the snowbird's garage door is in your yard). A summary card ("Your storm") reports peak sustained/gust at the house with timestamps, minimum pressure, rain total, hours without power, water used, what failed and why, and the alerts received. Then the player chooses **Continue** (aftermath days with skips, restoration events, boil-water lifted, the last dark house) or **Try another storm** (presets from meteorology §13). Two exceptional endings exist and both are physical, not scripted: being outdoors when the back eyewall arrives (sustained > 45 kt; the player is knocked down, vision fades, the run ends with the card "You were outside when the wind came back"), and CO from a generator in the garage.

---

## 2. The storm model and how state drives everything

### 2.1 Storm core (owner: `src/storm/`)

Per storm tick (every real frame, with `dt_sim = s·dt_real`):

1. **Track**: `xc += Vt·sin(θm)·dt`, `yc += Vt·cos(θm)·dt` in a local metre frame centred on the house. Track wobble: an OU process on heading, τ = 2 h, σ = 4°, so the eye is not a straight line and the "wobble" the TV meteorologist mentions is real.
2. **Intensity**: hold marine Vmax until the centre crosses the coastline polygon, then Kaplan–DeMaria decay (meteorology §1.3). `Pc` derived from the wind–pressure relation; `B` re-derived (§1.1) and clamped 1.0–2.2.
3. **Symmetric wind** `V_sym(r)` via the normalised Holland profile; direction `φ + 90° + α(r)` with the inflow angle of §1.4 (+10° over land).
4. **Motion asymmetry** `0.55·Vt·2rRMW/(r²+RMW²)` toward `θm + 20°` (§1.5). Vector sum gives `V_mar` and `dir_from`.
5. **Exposure**: `k_exp(dir_from)` from an 8-sector table around the house (E/SE/S suburban 0.78, W/NW open pond + water fetch 0.85, N 0.80). This is where the back eyewall becomes physically worse for this lot.
6. **Band factor** `b_wind ∈ [0.65, 1.5]`, `b_rain ∈ [0, 5]` from the spiral-band field (§2.3 below).
7. **Turbulence** (real time): three OU processes τ = 2.5 / 20 / 180 s, variances 0.35/0.45/0.20 of `Iu²`, `Iu = 0.28` (0.30 inside 1.3 RMW); direction OU τ = 8 s, σ = 9°; mesovortex Poisson events (rate 1/600 s inside 1.3 RMW, +25%, 15 s, asymmetric envelope 2 s up / 5 s down). Output `U_inst`, `dir_inst`, and the derived 3-s gust `U_g3` (max over a 3-s ring buffer) and 1-min mean `U_1m`.
8. **Pressure** `P(r)` + OU jitter (±0.3 hPa, τ = 30 s); `dPdt_60s` smoothed.
9. **Rain** `R = T_rcliper(r)·asym(φ)·b_rain·cell(t)`, eyewall override `60–100 mm/h·(V_sym/Vmax)²`, ramp to 0 inside 0.4 RMW; `rainTotal += R·dt/3600`. Rain inclination `atan(U_inst/7)`. Wall-equivalent rate per façade `R_wall_i = R·max(0, U·cos(dir − n_i))/7`.
10. **Light and sky**: sun position from date/lat/lon (analytic solar geometry, ±0.5°); cloud transmittance `exp(−(0.6·τ_bands + 2.2·rainFactor))`, floor 100 lux at noon under the eyewall, eye clearing `smoothstep((0.9·RMW − r)/(0.3·RMW))`; visibility from the Marshall–Palmer extinction × 0.4 for spray above 35 m/s.
11. **Temperature / dew point** by phase (§9) with band cooling and eye warming.
12. **Surge and freshwater flooding** (§8): onshore-stress filter (τ = 75 min) for the surge scalar (0 for the reference lot; 0.3–1 m for the canal-front preset) and a rain-excess bucket for the street (capacity 50 mm/h, halved after T−6 h by inlet clogging; rise 8 cm per 25 mm excess; drain time constant 3 h).
13. **Lightning** Poisson from the radial/quadrant rate table (§6); each flash carries a distance and azimuth so thunder delay and direction are physical.
14. **Products and alerts** (Section 6): advisory scheduler keyed to clock; condition-keyed warnings (EWW, TOR, FFW); WEA delivery gated by the cell model.

### 2.2 The "conditions at the house" record

The storm module publishes one object per tick, `state.local` (schema in Section 9). All other modules read from it and only it — no module calls the Holland function. The fields are: `U_mean, U_inst, U_g3, dir_from, dir_inst, P, dPdt, R, R_wall[8], rainAngle, T_air, Td, illum_lux, visibility_m, cloudFrac, eyeFactor, bandFactor, lightningFlash?, surge_m, streetWater_m, rainTotal_mm, phase`.

### 2.3 Spiral rainbands

`M = 5` bands in storm-relative polar coordinates: band 0 is the eyewall annulus (RMW ± 0.4 RMW, I = 3.0); band 1 the principal band (r0 = 2.2 RMW at θ = 0, width 30 km, I = 1.3, ω = 0, extent 300°); bands 2–4 outer bands (r0 = 120/210/320 km, width 20–35 km, I 0.6–1.0, ω = 25–35°/h, extent 150–220°, cellular noise period 25 km, ±60%). For the house at `(r, φ_rel)` the perpendicular distance to each log-spiral (`k = tan 15°`) yields a Gaussian profile with a sharp inner edge (rise over 3 km) and a stratiform tail (15 km). `b_rain` is the sum; `b_wind = 1 + 0.5·clamp(b_rain/3, 0, 1)` with the squall shape of §2.3 (30–120 s rise, veer of 10–20°, 2–4 °C cooling). This is what produces the outer-band rhythm, the false calm, the tornado-warning bursts, and the fact that the 02:00 band is heavier than the 22:00 one.

### 2.4 State → effect mapping (the contract)

Every downstream effect declares the *scalar* it consumes. Examples of the derived cue table published alongside `state.local` by `src/storm/cues.js`:

| Cue | Formula | Consumers |
|---|---|---|
| `windLoad` | `0.5·1.2·U_inst²` (Pa) | structure creaks, shutter rattle, garage-door flex, slider bow, cage panels |
| `roar` | `20·log10(max(U_inst,1))` mapped 0–1 over 8–55 m/s | wind synth gain, interior loudness, speech masking |
| `whistle` | `clamp((U_inst − 25)/20, 0, 1)` | eave/soffit resonators, windward rooms only |
| `debrisRate` | `k·max(0, U_inst − 20)²·(1 + 0.6·neighbourDamage)` per second | debris spawner, impact audio, window-strike hazard |
| `leakRate_i` | `R_wall_i·soffitFactor·(1 + 4·shingleLoss_i)` | ceiling stains, drips at can lights, buckets |
| `pushForce` | `0.6·windLoad·A_player` | player controller outdoors (Section 7) |
| `earPop` | `|dPdt_60s|` thresholds 3 / 10 / 20 hPa/h | ear audio filter, HUD hint, door breathing |
| `powerHazard` | `λ0·exp(0.11·(U_g3 − 25))·(1 + treeFactor)` for `U_g3 > 25 m/s` (λ0 = 1/3600 s⁻¹) | grid model, flicker rate, transformer flash |
| `eyeFactor` | from §2.1 item 10 | bird chorus, silence mix, sky clearing, neighbour voices |
| `heatIndex` | Steadman from `T_in, RH_in` | HUD "feel", sweat sheen post-process, sleep quality |

The rule for engineers: *if you cannot name the scalar your effect reads, the effect is not allowed in the build.*

---

## 3. The house and the neighbourhood

### 3.1 Site and orientation

Local frame: x east (toward the street), y north, z up. Slab 14.0 m (E–W) × 19.8 m (N–S), finished floor at z = 0 (site elevation 3.2 m above sea level; the street crown is at z = −0.45, the swale bottom at −0.80, the pond surface at −1.5 normally). Lot 24 × 38 m; house set back 7.6 m from the right-of-way; driveway 6 × 8 m to the north-east; street 7.3 m wide with 1.5 m swales; 60 m cul-de-sac. The lanai (6.0 × 3.0 covered, under truss) and screened cage (9 × 7 × 3.2 m, mansard) sit on the west with a 4 × 8 m pool.

### 3.2 Floor plan (interior clear dimensions, metres; exterior walls 0.25, interior 0.115, ceiling 2.85)

The plan file `src/world/plan.js` is the single authority; the boxes below are the target, and the house engineer may shift walls ≤ 0.2 m to make the tiling exact.

```
        y=19.8 ──────────────────────────────────────────────── north
        │ NOOK 5.3×2.9        │PANTRY│     GARAGE 6.1×6.4      │
        │ (bay window N)      │      │  (roll-up door E,       │
        │─────────────────────│──────│   man door N, AHU,      │
        │ KITCHEN 5.3×3.4     │LAUND.│   water heater, panel)  │
        │ (window W)          │1.8×2.4│                         │
   W    │─────────────────────┴──────┴─────────────────────────│   E (street)
 lanai  │ GREAT ROOM 5.3×5.4  │ DINING 3.6×3.2  │ FOYER 2.4×1.8│ front door
 pool   │ (triple slider W)   │                 │ (door E +    │
 cage   │                     │                 │  sidelight)  │
        │─────────────────────┴───── FRONT HALL 8.1×1.2 ───────│
        │ MASTER BATH 3.6×2.9 │ M.CLOSET 2.4×2.9 │HALL│ BED 2   │
        │ (obscure window W)  │ (SAFE ROOM)      │BATH│ 3.4×3.3 │
        │─────────────────────│──────────────────│1.5×│ (win E) │
        │ MASTER BR 4.6×4.3   │ vestibule/linen  │2.4 │ BED 3   │
        │ (slider W, tray)    │                  │    │ 3.4×3.4 │
        │                     │    BEDROOM HALL 1.2 wide (N–S)  │ (win E)
        y=0 ─────────────────────────────────────────────────── south
        x=0                                                   x=14.0
```

| Room | Box (x0–x1, y0–y1) | Openings | Contents that the sim cares about |
|---|---|---|---|
| Garage | 7.65–13.75, 13.15–19.55 | 4.9 × 2.13 roll-up (E), 0.81 man door (N), steel door to laundry | Car nose-in; 6 shutter panels + coffee can of wing nuts; drill; ladder; 5.5 kW generator; 4 × 19 L gas cans; 2 propane tanks; chest freezer; water heater (190 L); air handler; 200 A panel with labelled breakers; garage fridge; wet/dry vac; box fan; sandbags (8); brace kit for the door; attic pull-down; coolers |
| Laundry | 5.65–7.45, 13.15–15.55 | doors to garage (E) and kitchen (S); the **one un-shuttered window** (0.6 × 0.6, high sill) — the "peep window" | Washer (fillable as a cooler), dryer with the clacking vent flap, sink, litter box, dog bowls |
| Pantry | 5.65–7.45, 15.65–17.55 | door W | Canned goods, water cases, batteries, paper goods, peanut butter |
| Kitchen | 0.25–5.55, 13.15–16.55 | window W 0.9 × 1.2 (shuttered) | Island; fridge with ice maker (switch), freezer of Ziploc ice; electric range; microwave (clock); coffee maker + thermoses; small TV; weather radio; charging bank; flashlights; manual can opener; gallon jugs; the printed tracking chart |
| Nook | 0.25–5.55, 16.65–19.55 | bay window N 1.5 × 1.2, window W | Table, laptop showing radar, tablet, HOA letter |
| Great room | 0.25–5.55, 7.65–13.05 | triple slider W 2.7 × 2.44 (accordion shutter) | Sectional, 65" TV, ceiling fan, lamps, hallway mattress staged here first, bucket, towels at the track, dog bed, candles/lanterns |
| Dining | 7.65–11.25, 9.85–13.05 | cased openings | Table with "the important stuff" basket, documents pouch, helmets |
| Foyer | 11.35–13.75, 9.85–11.65 | front door E 0.91 × 2.03 inswing (2003 house) + 0.3 sidelight (panelled) | Doormat that floats, towel roll, coat closet |
| Front hall | 5.65–13.75, 8.55–9.75 | attic hatch 0.56 × 0.76 at (9.0, 9.15) | Smoke detector, thermostat, the family photos |
| Bedroom hall | 6.45–7.55, 0.25–8.55 | — | The refuge: mattresses, pillows, lantern, radio, water, dog |
| Master bedroom | 0.25–4.85, 0.25–4.55 | slider W 1.8 × 2.03 (panels), tray ceiling | King bed, fan, nightstand lantern, phone charger |
| Master bath | 0.25–3.85, 4.65–7.55 | obscure window W 0.6 × 0.6 (sill 1.5) | Garden tub 1.5 × 0.8 (**fillable**, 210 L), shower, double vanity, toilet that gurgles |
| Master closet (safe room) | 3.95–6.35, 4.65–7.55 | one door | Mattress against the door, shoes on, helmets, documents |
| Hall bath | 7.65–9.15, 5.05–7.45 | none | Tub 1.5 × 0.75 (**fillable**, 150 L), bucket, candles |
| Bedroom 2 / office | 10.35–13.75, 3.75–7.05 | window E 0.9 × 1.2 (panels) | Desk, UPS that screams, router/modem, printer |
| Bedroom 3 | 10.35–13.75, 0.25–3.65 | window E 0.9 × 1.2 (panels) | Guest bed (its mattress goes to the hall), closet |
| Lanai / cage / pool | x < 0.25, 4.0–13.0 | screen door, 3 ceiling fans | Patio set (to the pool), grill, potted plants, pool pump pad, pool light, the cage itself (14 screen panels, 6 beams) |

Roof: hip, 4:12, 0.6 m eaves, architectural shingles, vented aluminium soffit, ridge vent; hurricane clips at every truss (so the roof deck stays; shingles and soffit are what fail). Exterior walls CBS + stucco (immune to wind; transmit thuds). Attic hatch and can lights are modelled leak/pressure ports.

### 3.3 Exterior and neighbourhood

- **Lot:** St Augustine turf, mulch beds, clusia hedge, 2 queen palms (front), 1 sabal palm (side), 1 live oak (south-east corner, 12 m), foxtail palm by the door, mailbox at the swale, irrigation heads, coach lights, Ring doorbell, flag bracket, A/C condenser on its pad (south side), backflow preventer, meter with a padlock tag, pool equipment pad.
- **Street:** cul-de-sac with 7 lots: Ray & Linda across (flag, Generac, panels up first), the Nguyens north (evacuate T−26; dog-bike-kids props disappear), the snowbird house south (unshuttered, 3-tab shingles from 1998, unbraced garage door — the debris source), three more houses on the bulb, and "the boat guy" across the pond with the lift. LED cobra-head streetlights on concrete poles (3), a pad-mount transformer for the underground loop plus **one overhead pole-mount transformer** at the rear lot line feeding the older south houses — that one is what flashes. Storm inlets every 60 m, a stop sign, the HOA sign, a retention pond with a fountain (stops when the power fails) behind the back row.
- **Vegetation is instanced and typed** (sabal survives; queen palms strip and one snaps at `U_g3 > 48 m/s` with saturated soil; the live oak drops limbs from 35 m/s and uproots with probability rising after 200 mm of rain and gusts > 50 m/s; hedges flatten at 30 m/s). Every plant's bend and fray is a function of `U_inst` and `dir_inst` in a vertex shader (tech-3d §10.4).

---

## 4. Visual effects (each with its driving state)

1. **Sky dome** — 3-octave fbm cloud deck with base height/opacity from `cloudFrac` and `R`; eye clearing radially from the zenith by `eyeFactor`; the eyewall "stadium wall" as a distant cylinder band lit on the sunward side; sun disc/halo by cloud optical depth; stars when `illum_lux < 5` and `cloudFrac < 0.4`.
2. **Sun/sky lighting** — directional + hemisphere intensities from `illum_lux`; exposure via a 4 s eye-adaptation filter, so stepping from the 150-lux interior into the eye's 20,000 lux whites out for two seconds.
3. **Rain** — 10 k instanced streaks in a 30 × 20 × 30 m box around the camera, velocity `(U_inst·dir_inst, −7)`, length ∝ speed, alpha ∝ `R`; 400 splashes; spray haze (fog density `0.0025 + R/2000`, plus a spray term above 35 m/s).
4. **Rain on glass** — per-window shader; droplet count from that façade's `R_wall_i`, run direction from gravity + wind; interior condensation when `T_in − Td_in < 2`.
5. **Vegetation** — vertex bend ∝ `U_inst²` with per-instance phase; frond fray/loss and tree-fall instance states.
6. **Debris** — up to 300 instanced bodies (fronds, screen panels, shingle tabs, cage extrusions, cans, a trampoline after T−3) spawned by `debrisRate` from upwind sources (the snowbird house contributes its shingles and cage); ballistic with drag; impacts raise events with energy. In the eye the debris field is static; after the reversal it is re-mobilised the other way.
7. **Structural motion** — garage-door flex ∝ low-passed `windLoad`; slider glass bow (2–4 cm at 60 m/s); ceiling drywall shiver; attic hatch bounce on `ΔP_attic` spikes; screen panels bulge then vanish; cage beams bend and fold through a 6-stage state machine.
8. **Shutters** — accordion and corrugated panels with rattle ∝ `windLoad`; each shuttered opening cuts that room's daylight.
9. **Water intrusion decals** — slider-track line → tile pool (area ∝ integrated leak), fan under the front door, sill weeping, ceiling stain rings, per-can-light drip emitters, sag morph after 6 h, insulation dust after roof loss; towels and sandbags absorb.
10. **Street and yard water** — a flood plane from `streetWater_m` over terrain noise (swales fill first), pond plane, ripples ∝ `U_inst`, wet-surface specular with a 2 h drying constant.
11. **Power-state lighting** — every fixture is `grid.on · switch.on`; flicker dips 200 ms; brownout 35% orange for 1–3 s; streetlights, pond fountain, the fridge light, the TV, Ray's Generac-lit windows 10 s after the outage.
12. **Transformer flash** — 60 ms blue-green point-light pulse at the pole with sky bounce; a second pop 1.2 s later 40% of the time.
13. **Lightning** — sky flash + directional fill from the flash azimuth; a branch sprite for 30% of flashes within 15 km.
14. **Fog/visibility** — exp2 fog from `visibility_m`; white-out of the far end of the street.
15. **Post-process (GPU only)** — half-res bloom, vignette, grain, ≤ 20 screen droplets outdoors fading over 4 s indoors, sweat sheen when `heatIndex > 38`, tunnel darkening at `earPop > 20`.
16. **Aftermath dressing** — settled debris, shingle decals, blue tarps on days 1–2, kerb piles from day 2, bucket truck and COW props days 3–5, mildew stain growth.

## 5. Audio design (Web Audio, fully synthesised)

**Graph.** One `AudioContext`; a bus per room polygon (12) with a generated convolver IR (exponential noise decay, RT60 0.35 s tile rooms, 0.55 s garage, 0.15 s closet) and an occlusion low-pass; an `outsideBus` reaching each room through per-opening transmission gains (open door 1.0, closed door 0.15, CBS wall 0.02, shuttered glass 0.12, bare glass 0.3, garage door 0.35, soffit/attic path 0.08). Outdoor sources use `PannerNode`s. The mix reads `state.local` and `state.house` every 50 ms.

**Wind engine** (always running): pink noise → three band-passes (120, 250, 600 Hz, Q 0.7) with gains from `roar` and `U_inst` ramped at 30 Hz; a bank of five resonant band-passes (700–2,600 Hz, Q 25, random detune walk) from `whistle`, panned to windward façades; a high-passed "hose" texture for 12–25 m/s; a 40–90 Hz sub-roar above 40 m/s.

**Rain engine**: granular impulse trains, density ∝ `R`, per-surface filters (shingle thud 300–1,200 Hz, aluminium shutter 2–6 kHz, glass tick, puddle plop), level ∝ `R·U²` on windward surfaces; continuous in the eyewall, pulsed in bands.

**Structure**: creak/pop transients with Poisson rate ∝ the gust derivative of `windLoad`; shutter rattle impulse train 8–20 Hz; garage-door oil-can (40–80 Hz whump with a metallic tail) on gust peaks, escalating to bang/screech with `garage.damage`; slider tick; dryer-vent flap; attic hatch thump; weatherstrip hiss from `dPdt`.

**Events**: debris impacts (four material families × energy), transformer (crack + sub boom + 60 Hz arc rasp), tree crack, cage rip/groan/crunch/clatter, window failure (crash + pressure whump + the noise floor tripling), distance-shaped thunder, the WEA tone (853 + 960 Hz, two groups of three), NWR SAME (AFSK 520.83 baud with the real preamble, 1,050 Hz attention tone, EOM bursts), UPS beep, smoke-detector chirp, phone vibration.

**Ambience by state**: A/C compressor and blower until `grid.on` fails; fridge cycle; fans; birds by `eyeFactor`, time of day and `U_mean < 8`; frogs after rain at night when `U_mean < 6`; crickets; mosquitoes at dusk post-storm; Ray's Generac spatialised 28 m ENE; portable generators appearing from T+5 as positioned sources; chainsaws (2-stroke with bog under load) rising through the first morning; helicopters; reversing beepers; the loudspeaker truck; neighbours' murmurs with `speechSynthesis` lines when close.

**Speech**: `speechSynthesis` for NWR (flat male, rate 0.9, pitch 0.8), the TV meteorologist and phone calls; captions always, because headless has no voices.

**Ears**: `earPop` above 10 hPa/h applies a 0.4 s low-pass dip and a soft pop every 40–120 s; above 20 hPa/h a continuous muffling; entering the eye ramps it off over 20 s.

## 6. Devices and UI

- **Phone (the HUD).** Held in the lower-right; raised with `Tab`. Lock screen with time, battery (drains 6%/h of screen-on, 1.5%/h idle; charge from the bank or the generator), signal state (`LTE` → 1 bar no data → `SOS` → `No Service` → `1x`) driven by the cell model (towers on battery 6 h after grid loss, then a Bernoulli failure with `U_g3`, restore on day 3). Apps: Messages (group chat + family + carrier "Not Delivered" then delivered-in-a-burst), Weather Radar (a fake reflectivity loop rendered from the rain-band field itself — so the radar *is* the model), NHC Cone, Home Weather Station app (wind/gust record, pressure plunge graph, rain total, "sensor offline" if the rooftop anemometer fails above 55 m/s with 30% probability), Outage Map (red blob growing from the model's outage fraction), Ring (front-yard camera feed until Wi-Fi dies; "Person detected" when the cage lands), Flashlight, Camera (takes real screenshots into a gallery for the ending). WEA alerts take over the screen with the tone; the phone vibrates in the hand.
- **TV (65" and kitchen).** A canvas-rendered fictional station "WGCX 9 First Alert" with a meteorologist (2-D stylised figure), the cone, a radar loop from the model, a lower-third crawl generated from the alert state and outage fraction, an EOC presser at T−28 and T−9, reporters "on the beach" with the model's marine wind and rain. Cable dies with the power (node battery 40 min) — the screen shows "No Signal"; the small kitchen TV has an antenna and works on the generator.
- **NOAA weather radio.** Midland-style with SAME set to the county; routine cycle every 6 min (station ID → observations synthesised from `state.local` at "Punta Gorda" → HLS excerpt → forecast → tides); alerts with the full SAME sequence; red WARNING LED; a battery model (3 × AA → 30 h).
- **Home weather station console.** Kitchen counter: wind/gust/direction (from the rooftop anemometer object), inHg to 0.01 with a 3 h tendency arrow and the 24 h bar graph that becomes a V; outdoor/indoor temperature and humidity; rain rate and daily total; "storm" icon at a 4 hPa/3 h fall. Backlight dies with the grid unless on batteries.
- **Wall barometer** (dining), thermostat (reads `T_in`, shows "COOL ON" until the outage), microwave and oven clocks (blink after every flicker; resettable), the UPS display, the fridge temperature display.
- **HUD proper.** Minimal: an interaction prompt, a small clock with the speed multiplier and phase name (top-left, can be hidden), the pointer-lock reticle. No health bars. A debug overlay (`F3`) shows the full `state.local` and `state.house` records, marine vs house winds, seed, frame time.
- **Menus.** Setup (storm name, preset, track offset slider, forward speed, landfall time of day, house options: braced garage door / impact windows / underground vs overhead service / generator owned / dog), pacing (Standard/Full/Custom), quality (Auto/Low), accessibility (captions on by default, alert volume, photosensitivity mode that caps flash intensity). Pause (`Esc`) with time controls: play, 0.5–240× dial, "sleep until…", "skip to next event". Ending card.

---

## 7. Interaction system and object list

**Player.** Pointer-lock look; WASD; `Shift` sprint, `C` crouch, `E` interact/hold, `Tab` phone, `F` flashlight/headlamp, `Space` unused (no jumping — it breaks the tone). Capsule r 0.3 m, eye 1.65 m, walk 2.6 m/s. Outdoors the controller adds `pushForce/mass` as an acceleration along `dir_inst`: walking upwind is impossible above 45 m/s, the player is knocked down above 50 m/s gust (screen drops to crouch height, 3 s recovery), and rain reduces the effective FOV via the screen-droplet layer. Doors have physics: an inswing front door slams open at > 25 m/s gust if unlatched, cannot be opened against > 20 m/s, is ripped from the hand > 30 m/s (a `door:ripped` event with a bang; the door then flails until re-caught).

**Object model.** Every interactive object is a JSON record (`src/objects/catalog.js`) with `id, room, pos, kind, states[], affordances[]` and a small behaviour module. The `Interact` system does a raycast (3 m) and shows the verb.

| Object | Interaction | What it changes |
|---|---|---|
| Shutter panels (garage) / window shutter slots | carry panel → window: hold `E` 4 s per panel (2 per window, 3 for the bay); accordion sliders: pull closed 3 s | `openings[i].shutter = true` → failure probability, light, transmission, rain-on-glass, sound |
| Garage door brace kit | install 6 s | `garage.braced` → failure model |
| Lanai furniture, grill, pots | carry to pool or garage | removes debris sources; grill in the garage is a CO hazard only if lit |
| Bins, flag, wind chimes, hanging plants | bring in | debris sources; wind-chime audio stops |
| Tubs (2), washer, pots, jugs | fill (tub 12 min sim; pauses if pressure < 0.3) | `water.stored_L` for flushing/washing after pressure loss |
| Ice maker switch, fridge/freezer dial | toggle | freezer drip on restoration; freezer keeps 48 h unopened, fridge safe 4 h — each opening resets a "cold reserve" |
| Ziploc bags / bottles → freezer | place | extends cold reserve 6 h each up to +24 h |
| Phone chargers, battery banks | plug | phone battery model |
| Generator | wheel out (lanai/driveway/garage), fill (19 L → 10 h), pull-start (fails 1 in 3 when tank < 5%), run extension cords to fridge/fan/TV/chargers | `power.gen` sources; noise; CO scalar if placed in the garage or < 6 m from an opening with the door open; fuel ledger |
| Breakers (pool pump, water heater, main) | flip | pump noise/pool overflow; water heater reserve; nothing if grid is down |
| Front door, garage man door, sliders, interior doors | open/close/lock | transmission, water paths, wind physics, pressure coupling |
| Garage roll-up | open/close (motor only with power; manual release cord) | debris/water exposure |
| Towels | place at any threshold or track (8 towels) | absorb 2 L each of intrusion before saturating (visual darkening) |
| Sandbags (8) | place at garage-house door, sliders, front door | raise threshold 12 cm for street water |
| Buckets (3) | place under a drip | capture; fills in 1/rate; overflow if ignored |
| Mattresses (2) | drag to hall / closet | refuge quality; sleep locations |
| Helmets, shoes | wear | injury roll on window failure while in that room |
| Peep window (laundry) | look | the only outside view until the eye; frames the transformer flash |
| TV, radios, weather console, thermostat, lights, fans, lanterns, candles | toggle/channel/volume | audio, light, battery/fuel ledgers; candles are a fire hazard if left under a drip-free fan-less ceiling for > 4 h unattended (a warning, not a fail) |
| Documents pouch, go-bag | pick up | ending card completeness |
| Dog | call, pet, leash, feed, walk (only when `U_mean < 12`) | dog stress scalar |
| Beds / hall mattress | sleep | the sleep dialogue |
| Camera (phone) | photograph | gallery on the ending card |
| Post-storm: chainsaw (Ray's), tarp, rake, bucket for flushing | use | aftermath tasks |

**Emergent consequences the object model guarantees:** shuttering only the east side means the sliders fail in the back eyewall; forgetting the laundry peep window leaves an unshuttered pane that fails with debris probability 18% over the storm; filling both tubs gives 360 L ≈ 9 days of flushing at 4 flushes/day; a generator outside with the cords through the cracked laundry window lets wind-driven rain in at that window.

---

## 8. The little-details catalogue (trigger → detail)

IDs are stable for tests; each is a one-line function of state.

**Prep day**
1. `phase=prep & t<10:00` — hazy sun with a 22° halo; cirrus fans from the SW.
2. `t≈19:45 prep` — the spectacular orange-red sunset; five photos of it arrive in the group chat.
3. `T−28` — Ray knocks: "You staying?"; his panels are already up (his house shows shuttered first).
4. `T−26` — the Nguyens' minivan leaves; their kids' bikes vanish from the lawn; text "can you check on the house after?".
5. `T−30…−20 & any neighbour shuttering` — the subdivision soundscape: drills, wing nuts, aluminium panels clattering, from several directions.
6. `windChimes.present & U>6` — chimes ring, faster with wind; a reason to bring them in.
7. `shutters up on a room` — that room goes dusk-dark at noon; lamp needed.
8. `pool lowered` — visible waterline ring 15 cm down the tile.
9. `T−24 & sea breeze absent` — hot, heavy stillness between gusts; heat index 39.
10. `T−21` — birds loud, then gone by T−19; pelicans fly inland over the pond.
11. `T−25` — HOA email: "secure your lanai"; `T−20` — county: "shelter in place if you have not left".

**Outer bands**
12. `b_rain>1 first time` — rain starts in a rush with a gust front; a 3 °C drop on the console.
13. `lightning flash` — flash then thunder delayed by distance/343 m/s; inaudible under > 30 kt at > 6 km.
14. `flicker event` — lights dip 200 ms; TV reboots; microwave/oven clocks blink 0:00; UPS beeps once; A/C compressor thumps back on.
15. `between bands` — brightness ×3, steam off the street, pool overflowing into deck drains.
16. `Tornado Warning issued & cell up` — every phone in the house (yours and the dog-walker's you hear across the street) goes off out of sync.
17. `screenPanel load > strength` — the first *rip* from the cage; the panel flaps until it tears free.
18. `U_g3>18 & bins outside` — the recycle bin goes over, then travels down the street.
19. `dew point 25 & AC off` — glass sweats inside; the tile is slick at the sliders.

**Tropical-storm winds**
20. `U_mean>17` — the roar's *pulse* with each gust; the cage screens hum.
21. `U_g3>25` — hose-like sound at eaves; small twigs down on the driveway.
22. `whistle>0` — organ-pipe tones start in the windward rooms; the range-hood vent flap clacks.
23. `snowbird.shingles & U_g3>33` — 3-tab shingles peel from next door and slap your east wall.
24. `powerHazard` — flickers cluster in gusts; brownouts dim to orange; fans slow audibly.
25. `power:lost` — the canonical sequence: A/C stops mid-breath, fridge stops, fans coast 20 s, router dies, UPS screams until unplugged, smoke detector chirps once, the wind is suddenly louder.
26. `power:lost & peep window` — the blue-green flash lights the rain; crack-boom 0.4 s later; a second pop sometimes.
27. `power:lost + 10 s` — Ray's Generac cranks and hums; his windows glow while the street is black.
28. `power:lost` — the pond fountain stops; streetlights out; the subdivision is dark.
29. `grid off & t>0` — indoor temperature climbs 0.55 °C/10 min; the thermostat screen is blank.
30. `grid off` — the water heater reserve: warm showers for ~24 h; the shower steams less over time.
31. `R_wall(E)>40 & front door` — a fan of water under the front door; the doormat floats; towels darken.
32. `cellTower battery < 0` — LTE → SOS; the radar app stalls on an old frame with a stale timestamp.
33. `SMS sent while no data` — "Not Delivered" in red; delivered in a burst hours later.
34. `U_g3>28 & queen palm` — fronds strip one by one and skid down the street.
35. `U_mean>20 & dog` — Biscuit under the bed; panting rate ∝ `roar`.
36. `swale water > 0.1` — the swales fill; the mailbox post stands in water.
37. `T−9 NWR` — the HLS reads "Do not venture outside during the passage of the eye".

**Hurricane winds and the front eyewall**
38. `windLoad & garage unbraced` — the door oil-cans: whump-whump at gust peaks, panels visibly pump 3 cm.
39. `garage.damage>0.6` — a panel buckles with a crunch; tracks screech.
40. `garage failed` — noise triples, attic pressurises, ceiling drywall lifts at joints, insulation dust blows through the can lights.
41. `U_g3>40` — the walls hum; sliders bow inward 2–4 cm; a glass-straining sound.
42. `dPdt>10 hPa/h` — interior doors breathe; the front door bulges; a hiss at the weatherstrip.
43. `dPdt>10` — toilet water rocks and gurgles; the attic hatch lifts and drops.
44. `earPop>10` — ear pops every 40–120 s; `>20` continuous fullness with a low-pass on all audio.
45. `leakRate(E)>0 for 30 min` — ceiling stain rings at the east wall; drip at the foyer can light; a smoke detector wet-chirps.
46. `debris impact E>40 J` — a thud you feel; the dog yelps; the shutters boom.
47. `oak.limb & U_g3>35` — a crack heard over the roar; on `oak.uproot` the sound is longer and the ground thuds.
48. `cage panels lost > 60% windward & U_g3>45` — the cage folds "in slow motion" with a groan and a crunch; aluminium lands in the pool.
49. `EWW issued` — the WEA "Do NOT go out in the calm of the hurricane eye!"; the phone screen is the only light in the hall.
50. `mesovortex` — the worst gust of the storm: the whole house bangs; a shingle tab decal appears on your own roof.
51. `T_in>29 & RH>85` — sweat sheen; people lie on the tile (the prompt to sit on the floor appears).
52. `window unshuttered & debris hazard roll` — glass crash, instant pressure whump, rain indoors, the noise floor triples; helmet/no-helmet injury roll.

**The eye**
53. `eyeFactor rising` — rain collapses to drizzle in 5–10 min; the wind "switches off" over 15 min.
54. `eyeFactor>0.6 & day` — cloud breaks from the zenith outward; blue holes; then direct sun and a shadow returns to the yard.
55. `eyeFactor>0.6 & night` — stars and the moon over a black subdivision; the eyewall lit on the moonward side.
56. `eyeFactor>0.8` — the stadium wall of cloud on every horizon; a distant continuous surf-roar.
57. `eyeFactor>0.6` — dripping from every surface; water running in the gutters and the street.
58. `eyeFactor>0.6` — birds: grackles, mockingbirds, a gull; hundreds of seabirds circling overhead.
59. `eyeFactor>0.6 & after rain` — frogs immediately; the hum of Ray's Generac; a car alarm cycling; neighbours' voices, "you OK?".
60. `eyeFactor>0.8` — 30 °C, dead still, "thick" air; temperature on the console rises 3 °C.
61. `eyeFactor>0.6` — pressure minimum steady at 950.0 / 28.05; ears equalise (audio un-muffles over 20 s).
62. `eye & player outdoors` — the damage reveal: daylight where the cage was; the oak down; shingles in the pool.
63. `Ray text in eye` — "Cage is gone. Your shingles look ok from here."
64. `T+0.5` — the western wall darkens the sky in 5 minutes; a rising hiss 1–3 min before the wind.
65. `back eyewall onset` — Ray: "WIND BACK GET INSIDE"; NWR: "the winds will return suddenly from the opposite direction".

**Back eyewall and subsiding**
66. `dir_from reversal` — debris that was against the east wall is hurled back across the yard.
67. `R_wall(W)>40` — the sliders leak at the track: a dark line, then a pool across the tile; bailing with a dustpan.
68. `cage survived front & U_g3(W)>45` — the cage goes now; "the back side was worse".
69. `dPdt rising>10` — ears pop the other way.
70. `streetWater>0.15` — water under the garage door; the garage floor sheen; things on the floor get wet; sandbags hold to 0.12.
71. `pond level > lot line` — the retention pond reaches the back yard; the pond "smells" on later days.
72. `T+4 lulls` — the first lulls; a brief brightening to the west.
73. `T+5 & sun elev>0 & R<5` — a rainbow to the east; sunset glow under the deck.
74. `curfew WEA 21:00` — "treat every intersection as a 4-way stop".
75. `T+6…+10` — generators start one by one at their real positions; a symphony of drones.
76. `wet drywall 6 h` — the ceiling sag forms; at 24 h a collapse if unbucketed; insulation on the floor.
77. `night & no grid` — mosquitoes at the un-shuttered window; the choice of heat or bugs.

**Aftermath**
78. `first light` — the street is a carpet of green; steam; the snowbird's garage door in your yard; stop sign flat; mailbox gone.
79. `T+15…+18` — chainsaws (count rises through the morning), a skid steer, helicopters.
80. `fridge opened after 4 h` — the smell; a "when in doubt, throw it out" prompt; trash bags.
81. `freezer reserve<0` — the Ziploc ice is water; the cooler is the fridge now.
82. `day 1 noon` — 34 °C, no breeze, heat index 41; tarps appear on neighbour roofs; the blue-roof skyline.
83. `boil-water notice` — utility push on the phone; the kitchen tap is a trickle then nothing, then pressure with a boil notice.
84. `day 2` — the loudspeaker truck: ice and water at the stadium; the group chat: "Publix cash only, line to the road".
85. `day 3` — the COW appears; 41 texts arrive at once, timestamped days ago; "CALL ME" from Mom.
86. `day 3–5` — bucket trucks with Georgia plates; reversing beepers; linemen at the pole.
87. `power restored` — the cheer from the street; the A/C kicks in; the microwave blinks 0:00; the ice maker (if left on) drips into the drawer.
88. `day 5+` — mildew smell scalar; the stain that keeps growing; the "last dark house" across the pond.

---

## 9. Software architecture

### 9.1 Principles

- **One state object**, plain data, owned by `src/core/state.js`; systems are pure-ish functions `update(state, dtSim, dtReal)` that mutate their own sub-tree only and emit events for cross-cutting changes.
- **Fixed update order** (below). No system reads another system's output from the same tick unless it is earlier in the order.
- **Two clocks**: `state.clock.simTime` (advances by `s·dtReal`) and `state.clock.realTime`. Systems receive both.
- **Determinism**: all randomness from `src/core/rng.js` (mulberry32 streams keyed by system name + seed). Turbulence uses the `'turb'` stream at a fixed 60 Hz sub-step so screenshots at a given seed and sim time are reproducible.
- **Event bus** for discrete happenings; state for continuous values. Events carry `simTime`, `realTime`, and a payload.
- **Testable core**: `src/storm/` and `src/house/` have no three.js or DOM imports and run under `node --test`.

### 9.2 State schema (JSDoc, `src/core/schema.js`)

```js
/** @typedef {Object} SimState
 *  @property {Clock} clock
 *  @property {Scenario} scenario
 *  @property {Storm} storm
 *  @property {Local} local           // conditions at the house this tick (Section 2.2)
 *  @property {Cues} cues             // derived scalars (Section 2.4)
 *  @property {House} house
 *  @property {Utilities} utilities
 *  @property {Environment} env
 *  @property {Player} player
 *  @property {Object<string, ObjectState>} objects
 *  @property {Alerts} alerts
 *  @property {Neighbourhood} hood
 *  @property {Settings} settings
 */

/** @typedef {Object} Clock
 *  @property {number} simTime   seconds since scenario epoch
 *  @property {number} realTime  seconds since start
 *  @property {number} speed     s = dtSim/dtReal
 *  @property {boolean} paused
 *  @property {'prep'|'bands'|'ts'|'hurricane'|'eyewallFront'|'eye'|'eyewallBack'|'subsiding'|'aftermath'} phase
 *  @property {number} tHours    hours relative to closest approach (negative before)
 */

/** @typedef {Object} Scenario
 *  @property {string} name           e.g. 'Paulette'
 *  @property {string} preset
 *  @property {number} seed
 *  @property {number} trackOffsetKm  + = house right of track
 *  @property {number} closestApproachSim  simTime of T0
 *  @property {{bracedGarage:boolean, impactWindows:boolean, overheadService:boolean, generator:boolean, dog:boolean, surgeAtHouseM:number}} house
 */

/** @typedef {Object} Storm
 *  @property {number} xc @property {number} yc   centre, metres in house frame
 *  @property {number} headingDeg @property {number} vtMs
 *  @property {number} vmaxMarineMs @property {number} pcHpa @property {number} pnHpa
 *  @property {number} rmwM @property {number} B
 *  @property {boolean} overLand @property {number} landfallSim
 *  @property {Band[]} bands
 *  @property {number} r  @property {number} phiDeg   house relative to centre
 */

/** @typedef {Object} Band
 *  @property {number} r0M @property {number} widthM @property {number} intensity
 *  @property {number} omegaDegPerH @property {number} extentDeg @property {number} phaseDeg
 */

/** @typedef {Object} Local
 *  @property {number} uMean @property {number} uInst @property {number} uG3 @property {number} u1m
 *  @property {number} dirFromDeg @property {number} dirInstDeg
 *  @property {number} pHpa @property {number} dPdtHpaPerH
 *  @property {number} rainMmPerH @property {number[]} rainWallMmPerH   8 sectors
 *  @property {number} rainAngleDeg @property {number} rainTotalMm
 *  @property {number} tAirC @property {number} tdC
 *  @property {number} illumLux @property {number} visibilityM @property {number} cloudFrac
 *  @property {number} eyeFactor @property {number} bandFactor
 *  @property {{distM:number, azDeg:number, simTime:number}|null} lightning
 *  @property {number} surgeM @property {number} streetWaterM @property {number} pondM
 *  @property {{azDeg:number, elDeg:number}} sun
 */

/** @typedef {Object} Cues
 *  @property {number} windLoadPa @property {number} roar @property {number} whistle
 *  @property {number} debrisRate @property {number[]} leakRate   per façade
 *  @property {number} pushForceN @property {number} earPop @property {number} powerHazard
 *  @property {number} eyeFactor @property {number} heatIndexC
 */

/** @typedef {Object} Opening
 *  @property {string} id @property {'window'|'slider'|'door'|'garage'|'peep'} kind
 *  @property {number} facadeDeg @property {boolean} shuttered @property {boolean} open @property {boolean} latched
 *  @property {number} damage   0..1 @property {boolean} failed
 *  @property {number} towelsL  absorbed litres remaining @property {number} sandbagM
 */

/** @typedef {Object} House
 *  @property {Object<string, Opening>} openings
 *  @property {{damage:number, braced:boolean, failed:boolean, flexM:number}} garageDoor
 *  @property {{shingleLoss:number[], soffitLoss:number[], deckExposed:boolean}} roof   per slope
 *  @property {{panelsLost:number, beamsFailed:number, stage:0|1|2|3|4|5}} cage
 *  @property {{pAtticHpa:number, pInsideHpa:number}} pressure
 *  @property {{tInC:number, rhIn:number, hvacOn:boolean}} thermal
 *  @property {Object<string, {stainM2:number, dripRate:number, sag:number, bucket:boolean}>} ceilingLeaks
 *  @property {Object<string, {poolM2:number}>} floorWater   by threshold id
 *  @property {number} coPpm
 *  @property {number} mildew
 */

/** @typedef {Object} Utilities
 *  @property {{on:boolean, lostSim:number|null, restoredSim:number|null, flickerCount:number, brownout:boolean, genOn:boolean, genFuelL:number, genPlacement:'none'|'garage'|'lanai'|'driveway', circuitsOnGen:string[]}} power
 *  @property {{pressure:number, storedL:number, heaterWarmL:number, boilNotice:boolean}} water
 *  @property {{state:'LTE'|'LTE1'|'SOS'|'NONE'|'1X', towerBatteryH:number, outbox:Message[], inbox:Message[]}} cell
 *  @property {{cableOn:boolean, wifiOn:boolean, antennaOk:boolean}} media
 *  @property {{outageFraction:number, curfew:boolean}} county
 */

/** @typedef {Object} Environment
 *  @property {number} wetness @property {number} birdActivity @property {number} frogActivity
 *  @property {{generators:number, chainsaws:number, helicopters:number, trucks:number}} aftermathSounds
 */

/** @typedef {Object} Player
 *  @property {number[]} pos @property {number} yaw @property {number} pitch
 *  @property {string} room @property {boolean} outdoors @property {boolean} down
 *  @property {boolean} helmet @property {boolean} shoes @property {number} wet
 *  @property {string|null} holding @property {{level:number, on:boolean}} flashlight
 *  @property {{battery:number, screenOn:boolean, app:string}} phone
 *  @property {'awake'|'sleeping'} sleep
 */

/** @typedef {Object} ObjectState
 *  @property {string} id @property {string} state @property {number[]} pos @property {number} fill @property {boolean} on
 */

/** @typedef {Object} Alerts
 *  @property {Advisory[]} advisories @property {Warning[]} active @property {WEA[]} weaLog @property {number} nextAdvisorySim
 */

/** @typedef {Object} Neighbourhood
 *  @property {Object<string, {shuttered:boolean, evacuated:boolean, shingleLoss:number, garageFailed:boolean, cageStage:number, genOn:boolean, tarp:boolean}>} houses
 *  @property {Object<string, {bend:number, frondLoss:number, limbsLost:number, fallen:boolean, fallDirDeg:number}>} trees
 *  @property {{flashSim:number|null, failed:boolean}} transformer
 *  @property {number} debrisPileM3
 */
```

### 9.3 Update order (per real frame)

1. `input` → player intents.
2. `clock` → `dtSim = speed·dtReal`; phase detection; sleep/skip handling (sleep runs the storm and house systems at up to 3,600× in 60 s sub-steps with rendering suspended until an interrupting event).
3. `storm.track/intensity` (sim dt) → `storm.field` (sim dt) → `storm.turbulence` (real dt, 60 Hz sub-steps) → `storm.rain/light/thermal/flood/lightning` → writes `state.local`.
4. `cues` → `state.cues`.
5. `utilities.power` (hazard, flicker, outage, generator, restoration) → `utilities.cell` → `utilities.water` → `utilities.media`.
6. `house.structure` (loads on openings, garage, cage, roof; failure rolls; pressure coupling) → `house.water` (intrusion ledgers, towels, buckets, ceiling) → `house.thermal` → `house.co`.
7. `hood` (neighbour houses, trees, transformer, debris sources).
8. `alerts` (advisory schedule, condition warnings, WEA gating, NWR queue, TV rundown).
9. `objects` (device states, ledgers, fill levels).
10. `player` (movement with push, doors, interaction, dog).
11. `audio.mix` (reads state; schedules event sounds from the bus).
12. `render.sync` (scene graph from state) → `renderer.render`.
13. `ui.sync` at 4 Hz (phone canvas, TV canvas, console, HUD).

### 9.4 Event bus (`src/core/events.js`)

`storm:phaseChanged {from,to}`, `storm:bandEnter/bandExit {band}`, `storm:lightning {distM, azDeg}`, `storm:mesovortex`, `storm:eyeEnter`, `storm:eyeExit`, `storm:windReversal {fromDeg, toDeg}`, `power:flicker`, `power:brownout {s}`, `power:lost {cause:'transformer'|'feeder'}`, `power:transformerFlash`, `power:restored`, `gen:started/stopped/fuelLow`, `cell:stateChanged`, `cell:messageDelivered {msg}`, `alert:wea {kind, text}`, `alert:nwr {kind, text}`, `alert:advisory {n}`, `alert:tv {segment}`, `house:openingFailed {id, cause}`, `house:garageBuckle`, `house:garageFailed`, `house:cageStage {stage}`, `house:shingleLoss {slope, n}`, `house:leakStarted {ceilingId}`, `house:ceilingSag/Collapse`, `house:doorRipped {id}`, `house:earPop`, `house:attic Whump`, `hood:treeLimb {tree}`, `hood:treeFallen {tree}`, `hood:neighbourText {from, text}`, `hood:debrisImpact {surface, energyJ}`, `water:pressureLost`, `water:boilNotice`, `player:enteredRoom {room}`, `player:outdoors {bool}`, `player:knockedDown`, `player:sleep {untilSim}`, `player:wake {reason}`, `object:changed {id, state}`, `dog:state {stress}`, `sim:ended {reason}`.

### 9.5 File layout and ownership (8 engineers; a file has exactly one owner)

```
src/
  main.js                      E1  bootstrap, loop, quality detection, window.__sim API
  core/  state.js schema.js events.js rng.js clock.js sleep.js        E1
  storm/ holland.js track.js bands.js turbulence.js rain.js light.js
         thermal.js flood.js lightning.js cues.js index.js            E2  (pure JS, node-testable)
  house/ structure.js openings.js garage.js cage.js roof.js
         water.js thermal.js pressure.js co.js index.js               E3  (pure JS)
  utilities/ power.js cell.js waterSupply.js media.js county.js       E3
  alerts/ schedule.js warnings.js wea.js nwr.js tv.js texts.js
         content/*.js (advisory/HLS/TV/text templates)                E4
  world/ plan.js houseGeometry.js roofGeometry.js props/*.js
         terrain.js neighbourhood.js vegetation.js textures/*.js      E5  (house, props, canvas textures)
  render/ renderer.js sky.js lighting.js rain.js glass.js debris.js
         waterFx.js structureFx.js post.js sync.js                    E6
  audio/ context.js buses.js wind.js rainSynth.js structure.js
         events.js ambience.js speech.js tones.js mix.js              E7
  player/ controls.js collision.js doors.js interact.js dog.js        E8
  objects/ catalog.js behaviours/*.js                                 E8
  ui/ hud.js phone/*.js tv/*.js radio.js console.js menus.js
      timeControls.js endingCard.js styles.css                       E4 (phone/tv/radio) + E8 (hud/menus)
test/  storm/*.test.js house/*.test.js utilities/*.test.js           owner = module owner
scripts/ screenshots.mjs scenarios.json                              E1
docs/
```

Interfaces are frozen first: `schema.js` (E1, week 1), `cues.js` outputs (E2), the event names (E1), `plan.js` (E5) and `catalog.js` (E8). Anyone may *read* any state; only the owner writes their sub-tree. Cross-module needs go through events or a schema change reviewed by E1.

**Milestones:** W1 schema + plan + storm core with unit tests + empty walkable house; W2 house geometry, lighting, power model, phone/WEA; W3 rain/wind/debris visuals, wind/rain audio, structure model; W4 water intrusion, cage/garage/roof failure, TV/NWR, sleep/skip; W5 eye/aftermath, neighbourhood, details pass against the catalogue (Section 8, each detail an issue with its ID); W6 performance, SwiftShader path, screenshot suite, polish.

---

## 10. Testing and verification

### 10.1 Unit tests (`node --test test/`)

- `holland.test.js`: `V(RMW) = Vmax` within 0.1%; monotone decrease outside RMW; `P(0) = Pc`, `P(∞) → Pn`; R34/R50/R64 for the reference storm within ±10% of 200/115/80 km; B clamp.
- `direction.test.js`: house on track → from-direction ESE (100–115°) on approach, WNW (280–295°) on departure; right-of-track veers monotonically; left-of-track backs; reversal event fires exactly once for offset 0 and never for offset > 0.7 RMW.
- `turbulence.test.js`: over 10⁵ sub-steps at U = 40 m/s, `G(3 s/1 min)` in 1.45–1.65, `Iu` in 0.25–0.31, strong-gust interval 20–60 s, lulls to 0.6 U every 1–3 min; identical output for identical seeds; real-time invariance under speed 1× vs 120×.
- `bands.test.js`: time-averaged rain over T−18…T−4 within ±25% of R-CLIPER mean; ≥ 2 distinct band passages before T−10; eyewall rate 50–100 mm/h; storm total 200–300 mm at Vt 20 km/h; halves Vt → total ≈ doubles.
- `pressure.test.js`: 15–30 hPa/h under the eyewall; `earPop` thresholds crossed in the expected order; minimum within 0.5 hPa of Pc.
- `timeline.test.js`: TS onset at the house T−7 ± 1 h, hurricane force T−2.6 ± 0.5 h, eye duration 90–110 min on track, illuminance < 500 lux at T−2 at noon, > 10,000 lux in the eye at 13:30.
- `power.test.js`: with seeds 1–200, outage time distribution median in T−7…T−4 and 95% before T−2; ≥ 3 flickers before outage; braced-door failure < 5%, unbraced 30–40% (Monte Carlo at the reference storm).
- `water.test.js`: two tubs = 360 L; flush ledger; slider intrusion only when `R_wall(W)` > 40; towel saturation.
- `cell.test.js`: WEA suppressed when `state = NONE`; SMS burst on restoration ordered by send time.
- `alerts.test.js`: EWW issued ≤ 1 h before eyewall and never for Vmax < 100 kt; advisory times on the 5/11/5/11 cadence with intermediates.
- `sleep.test.js`: sleeping through the eye is interrupted by `storm:eyeEnter`.

### 10.2 Headless screenshot scenarios (`scripts/screenshots.mjs`, playwright-core + SwiftShader flags)

The page exposes `window.__sim = { load(scenario), advanceTo(simTime), setCamera(pos, yaw, pitch), setPlayerState(...), step(dtReal), stats() }`. Each scenario sets seed 7, quality `low`, warms shaders, advances deterministically, renders one frame, saves `shots/<id>.png`, and asserts on cheap image statistics.

| id | Sim time / state | Camera | Assertions |
|---|---|---|---|
| prep-street | T−30 | driveway looking W at the house | mean luminance > 0.55; sky blue ratio |
| prep-halo | T−29 | looking at the sun | halo ring detectable |
| sunset | T−20.3 | lanai looking W | warm hue dominant |
| band-squall | T−16 mid-band | peep window | rain streaks present; lightning frame variant |
| flicker | `power:flicker` frame | kitchen | luminance 30% of the previous frame |
| outage-flash | `power:transformerFlash` frame | peep window | green-cyan peak pixel |
| dark-noon | T−2, 12:00 | great room, no lantern | mean luminance < 0.03 |
| eyewall-street | T−1.5 | front door open (forced) | visibility fog; debris count > 40 |
| garage-pump | T−1.5 | garage | door vertex displacement > 0.02 m |
| leak | T−1 | foyer looking up | stain decal + drip particles |
| eye-day | T0 | back yard | luminance > 0.5; sky clear at zenith; cloud wall at horizon |
| eye-night | T0 (preset night landfall) | back yard | stars visible |
| reversal-debris | T+0.8 | front yard looking E | debris velocity vector W→E |
| slider-leak | T+1.5 | great room | floor pool decal area > 0.5 m² |
| flood | T+3 | street | water plane above kerb |
| sunset-rainbow | T+5 | street looking E | arc detection (optional) |
| dark-street | T+8 | driveway | luminance < 0.02 except lantern windows |
| first-light | T+15.5 | front door | debris field; cage stage 5; oak fallen |
| aftermath-day3 | T+63 | street | COW/truck props; tarps |
| phone-wea / tv / radio / console | fixed | UI canvases | text OCR-free: pixel diff against golden |

Golden images are regenerated only by an explicit `--update` flag; CI compares perceptual hashes with a tolerance. The screenshot suite also records `stats()` (draw calls ≤ 250, triangles ≤ 600 k, JS ≤ 4 ms in a headless frame of the low path).

### 10.3 Realism audit

A `docs/audit.md` checklist maps each detail ID in Section 8 to its trigger, the state field it reads, and the test or screenshot that proves it. A detail without a proof is a bug.

---

## 11. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Physically faithful ≠ legible: the player may miss the eye or the outage because they are asleep or elsewhere | Sleep interrupts on model events; the phone and NWR narrate the model; the summary card explains what happened even if unseen |
| 60 fps on Iris Xe with 10 k rain + 300 debris + 12 lights | Budgets in tech-3d §11; per-room merged meshes; lights toggled by intensity, not presence; quality auto-detect; particle scaling by speed |
| SwiftShader path too slow for the screenshot suite | `?quality=low`: no post, 2.5 k rain, 80 debris, 3-octave sky, 1024² basic shadows; fixed-dt deterministic stepping; one render per shot |
| Turbulence at high compression sounds wrong | Fast OU always real time; middle OU clamped above 60×; verified by `turbulence.test.js` |
| speechSynthesis absent/unreliable | Captions always; voice optional; NWR/TV content is text first |
| Audio autoplay policy | Audio context starts on the first click (the pointer-lock click) |
| Emergent failure cascades feel unfair (window fails at T−3, run is miserable) | Failure probabilities are calibrated (unshuttered 18%, shuttered 1.5%); the prep checklist makes the risk visible; the ending card explains causality |
| Team blocking on the schema | Schema frozen in week 1; stub state generator (`state.fixtures.js`) lets render/audio/UI develop against canned trajectories |
| Content volume (TV/NWR/text scripts) | Templated generators from state (advisory skeleton in meteorology §10.4; texts keyed to events) rather than hand-written timelines |
| Photosensitivity (flashes) | Accessibility cap on flash intensity and rate |
| Scope creep in the aftermath | The aftermath is skip-driven with a small fixed set of restoration events; first light is the canonical ending |

---

## 12. What makes this proposal exceptional

1. **The radar app is the model.** The phone's reflectivity loop is rendered from the same band field that makes it rain on the roof; when you see the band hit the dot, it hits the house.
2. **Orientation as narrative.** Facing east means the front door leaks first and the lanai cage dies second; the story of "the back side was worse" emerges from an exposure table, not a script.
3. **Real-time gusts under compressed time.** A two-clock design keeps the sound and the shutters truthful at 120× while the barometer plunges.
4. **Probabilistic infrastructure.** Power, cell, water and the garage door fail from hazard functions of gust; every run's outage time, flicker count and damage list is different and defensible.
5. **Physical endings only.** No "mission failed": the back-eyewall knock-down and CO are consequences of the same forces the whole game models.
6. **A catalogue you can audit.** 88 details, each a one-line function of state with a test or a screenshot that proves it fires.
7. **A deterministic, headless-verifiable storm.** Seeds, fixed-dt stepping and a `window.__sim` API make screenshots and Monte Carlo tests part of CI.
8. **Ears, doors and toilets.** Pressure tendency drives audio filtering, door breathing and gurgles — the sensory channel most games ignore and every survivor remembers.
9. **The dog as barometer.** One stress scalar, driven by roar and impacts, expressed in position, panting and yelps, does more emotional work than any HUD.
10. **Parallelisable by construction.** Eight owners, one schema, one event list, pure-JS storm and house cores testable without a browser.
