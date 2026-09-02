# Florida Storm — DESIGN.md
### The complete experience and realism specification (final synthesis)

*Version 1.1 — 2026-09-02 (revision after the architecture critique; the list of changes is in `docs/state-changelog.md`). Companion: `docs/ARCHITECTURE.md` (schema, update order, events, ownership, tests, work packages). Research ground truth: `docs/research/meteorology.md` (M), `florida-home.md` (H), `tech-3d.md` (T), `audio-devices.md` (A). Where this document and the research disagree, this document wins because it records the resolved decision; where this document is silent, the research is the default.*

**Conventions that apply to every number in this document.** (1) Wind speeds are **house-level 1-minute means in m/s** (`local.u1m`) unless written "marine" or "gust"; the marine value is `local.uMarine` and gusts are `local.uGustEnv` (deterministic envelope) or `local.uInst`/`uG3` (real-time, cosmetic). (2) Every time in the narrative is stored in content and code as an **offset from T0** (closest approach) or from a named model event, and only *rendered* as a clock string; the clock strings in this document are the reference preset (T0 = Thu 14:00 EDT). The only clock-keyed items are calendar things: the NHC advisory cadence, the garbage-day reminder, the curfew hours. (3) Solar geometry for the lot (27.21° N, 82.47° W, EDT): solar noon 13:30, sunset Wed/Thu ≈ 19:45, sunrise ≈ 07:12, civil first light ≈ 06:45; `storm.api.sunAt()` is the authority and every dawn/dusk beat is keyed to it, never to a clock time. (4) "Day N" means `clock.dayIndex` (Thu = 0, Fri = 1, …); "night" means `clock.isNight` (`sun.elDeg < −6`).

This document is the single authority on **what the player experiences and why it is physically correct**. `ARCHITECTURE.md` is the single authority on **how the code is organised**. Every number here is either a modelled output (marked *model*) or a fixed design default (marked *default*). Engineers implement against both documents without further conversation; anything ambiguous is a bug in this document and is reported as such.

---

## 0. The five laws

1. **Nothing is keyframed.** One Holland (1980) wind/pressure field on a moving track, one rain-band field, one house model, one clock. Every light, sound, drip, flicker, text message, bird and chainsaw is a function of that state. If you cannot name the scalar your effect reads, the effect is not allowed in the build (`state.local.*`, `state.cues.*`, `state.house.*`, `state.utilities.*`, or a bus event derived from them — see ARCHITECTURE §3).
2. **Real seconds where the body lives, sim seconds where the storm lives.** Gusts, audio, animation, the pet, footsteps and the mouse never see the time-compression factor. The 180-s turbulence process advances with sim-time dt; the 2.5-s and 20-s processes advance with real dt. All *failure* models integrate sim time using the deterministic gust envelope, never the real-time stochastic gust, so a run at 300× and a run at 1× fail the same components in the same 10-sim-minute buckets for the same seed.
3. **The wind reversal is the plot.** The house faces **east**; the lanai and pool cage face **west** over a retention pond. The storm's front half (winds from the ESE) attacks the front door, the garage door and the bedroom windows; the back eyewall (from the WNW, over open water fetch with exposure 0.85 instead of 0.78) attacks the sliders and the cage. "The back side was worse" emerges from an exposure table and a shield factor, not a script.
4. **Show, don't caption.** Details fire wordlessly in the world. At most **12** captions exist in the whole game (§12.0 lists them). Smell, ear pressure and heat are expressed through audio filters, post-processing, the pet, and the devices — not subtitles.
5. **Consequence without punishment.** The prep checklist is what a Floridian does; every omission has a proportional physical consequence hours later. There is no score, no health bar and no "mission failed". Two endings are physical and rare (§15): injury from debris while knocked down outdoors, and carbon monoxide from a generator placed indoors. Chapters allow re-entry from any phase.

---

## 1. Scenario

### 1.1 The storm

| Parameter | Reference preset "Leah" (*default*) | Notes |
|---|---|---|
| Name | **Leah** (AL122026) — selectable from the 2026 list: Arthur, Bertha, Cristobal, Dolly, Edouard, Fay, Gonzalo, Hanna, Isaias, Josephine, Kyle, Leah, Marco, Nana, Omar, Paulette, Rene, Sally, Teddy, Vicky, Wilfred | Every template renders the name as `${NAME}`; the advisory basin number is `AL` + two-digit list index + `2026`. |
| Category at landfall | 3 (marine Vmax 100 kt = 51.4 m/s, 1-min, 10 m) | M §0. Saffir–Simpson is the marine value; the house measures ×0.78 (front) / ×0.85 (back). |
| Central / environmental pressure | 950 / 1012 hPa (ΔP 62) | M §3 profile values are the acceptance numbers. |
| RMW | 25 km | Eye (rain-free) ≈ 35 km wall-to-wall; calm core ≈ 15 km. |
| Holland B | **1.5, a fixed preset parameter** (clamped 1.0–2.2 for all presets) | Resolved: B is *not* re-derived per tick. |
| Forward motion | 20 km/h (5.56 m/s) toward 045° | Wobble: OU process on heading, τ = 2 h, σ = 4°. |
| Closest approach T0 | **Thursday 3 September 2026, 14:00 EDT**, eye directly over the house (track offset 0 km) | Track offset slider −80 … +80 km (positive = house right of track). |
| Landfall | 4.5 km SW of the house at T−0.22 h (13:46), "near Siesta Key", coastline bearing 340°/160°, 4 km from the house | Kaplan–DeMaria decay from landfall: Vb 26.7 kt, α = 0.05 h⁻¹ (M §1.3 with the research's "back side 3–5 % weaker" calibration; R = 1). |
| Sim window | Wed 2 Sep 06:00 (T−32 h) → Fri 4 Sep **06:45 first light (T+16.75 h)** canonical (the canonical window is T−32 → T+17); aftermath days 1–10 via skips | Epoch (simTime 0) = Wed 2 Sep 2026 00:00 EDT. **The start is preset-dependent:** `startTRel = −max(32 h, (R34 + 250 km)/vt)` so a slow storm (8 km/h → T−56) still opens outside its bands; the start clock is the first 06:00 at or before that. Highlights starts at T−16. "First light" = the first civil dawn (`sun.elDeg` crossing −6 upward) after `phase == aftermath` — Fri 06:45 for the reference, Fri 06:45 (T+28.75) for the night-eye option. |
| Products already in effect at start | Hurricane **Watch** since Tue 05:00 (T−57), Hurricane **Warning** and Storm Surge Warning since **Tue 17:00 (T−45)**, mandatory evacuation Zones A–B effective Wed 06:00 | Resolved (Judge 1): the warning is *already up* when the sim opens; the phone's alert history shows the Tuesday WEAs. |

Other presets (M §13) are exposed in the setup menu and re-derive the entire experience: Compact Cat 4 (130 kt, RMW 12, 35 km/h, 15-min eye), Large Cat 2 (90 kt, RMW 45, +30 km offset, no eye, 8-h veer), Slow Cat 1 (75 kt, RMW 40, 8 km/h, −20 km, 30 h of TS winds, 500 mm rain), Near-miss Cat 3 (+70 km, Cat 1 conditions, tornado warnings), Cat 5 (140 kt, 919 hPa).

### 1.2 The place

- **Address:** 4212 Sandpiper Cove, "Osprey Landing" (fictional), Sarasota County, Florida (SAME FIPS 012115). WFO **Tampa Bay Ruskin** (TBW). NOAA Weather Radio **KHB32, 162.550 MHz** ("CH 7").
- Latitude **27.21° N**, longitude **82.47° W** (south Sarasota, the Gulf Gate / Osprey corridor between Siesta Key and Nokomis — consistent with "4 km from the Gulf" and a landfall 4.5 km to the SW "near Siesta Key"). 4 km inland from the Gulf, finished floor 3.2 m above sea level. **Evacuation Zone C** — not ordered (A and B are). `surgeAtHouseM = 0` for the reference lot; a "canal-front" house option sets 0.3–1.0 m and moves the lot to Zone A (surge then arrives T+1 … T+3 h).
- A 2003 CBS single-storey 3/2/2 with den, hip roof, architectural shingles, vented aluminium soffit, ordinary single-hung windows plus aluminium panel shutters (accordion on the great-room slider), inswing fibreglass front door (2003 = pre-outswing code), 16-ft unbraced steel garage door with a brace kit on the shelf, overhead electric service from a pole-mounted transformer (house option: underground, pad-mount), municipal water and sewer.
- The lot is on a cul-de-sac that runs north–south; the street is **east** of the house; the retention pond is **west** behind the pool cage.

### 1.3 The cast (nobody is walkable except you; everyone else is a text, a voice through a wall, a flashlight in a window, or a chainsaw)

| Who | Where | Role in the model |
|---|---|---|
| **You** | 4212 | An adult who has decided to stay. No companion NPC indoors. |
| **Biscuit** | the house | Pet with a fear model (dog *default*; cat option). The emotional barometer (§11). |
| **Ray & Linda Kowalski** | across the street (east), 4215 | Retired, 22 years here, "rode out Charley". Panels up first. **Generac** whole-house standby (auto-starts 10 s after the outage). Flag. Ray walks over at T−28 ("You staying?"), shouts from his porch in the eye, runs the chainsaw Friday. Linda: lasagna at 5, coffee at 7. |
| **Tam & Priya Nguyen** | north, 4210 | Young family, dog, kids on bikes. Leave at **T−26** (minivan; the bikes vanish). "Key is under the turtle — can you check the house after?" |
| **The Bergstrom house** | south, 4214 | Snowbird house, empty, **unshuttered**, 1998 3-tab shingles, unbraced garage door, Ring doorbell blinking blue. **The debris source.** |
| **Marcus** | 4218, two doors north | Portable generator (rations it 7–10 and 18–21 after the storm), chainsaw, power strip on the porch: the phone-charging stop. |
| **Denise** | HOA board, 4220 | HOA texts ("secure your lanai", debris separation rules). |
| **Mom** | Georgia | Family thread. "Are you SURE?" → "TEXT ME" → "CALL ME" (delivered days late). |
| **"The boat guy"** | across the pond | Spends T−48 strapping the boat on the lift; the lift is later at 30°. |

### 1.4 House options (setup menu; each changes state, never script)

`bracedGarageKitInstalled` (default false — the kit is on the shelf and installing it is a task), `impactWindows` (false), `service` (`overhead` default / `underground`), `generatorOwned` (true), `pet` (`dog` / `cat` / `none`), `canalFront` (false), `landfallHour` (14 default; 2 gives a night eye), `trackOffsetKm` (0), `forwardSpeedKmh` (20), `preset`, `seed`.

Because every content time is a T0-relative offset (header convention 2), `landfallHour = 2` and `forwardSpeedKmh = 8` move the *clock* under the beats, not the beats under the storm: band 1 is still "the first band", the outage window is still T−7 … T−4, the sunset photos are still at sunset — on the night-eye option they simply land on Wednesday evening of a different storm day. ARCHITECTURE §13.7 tests that the reference beats keep their `tRel` under `landfallHour = 2`.

---

## 2. Time: the clock, compression, sleep and skip

### 2.1 Definitions

- `simTime` = seconds since Wed 2 Sep 2026 00:00 EDT. `tRel` = hours relative to closest approach (`(simTime − 136800)/3600`; negative before).
- `speed` = sim seconds per real second. Auto-pace (default) chooses `speed` from state (table below); the player may lock 1×, 3×, 12×, 60× or 300×.
- **Phase** is derived from state, never from the clock, and **every threshold is house-level `local.u1m` in m/s** (not the marine value — the marine value `local.uMarine` exists for products that need it: the 04:10 WEA, meteorologist line 7, the EWW rule, the debug HUD): `prep` (no `storm:bandEnter` yet and `u1m < 12`), `bands` (a band has crossed, `u1m < 17`), `ts` (17 ≤ `u1m` < 33 approaching), `hurricane` (`u1m` ≥ 33, r > 1.4 RMW), `eyewallFront` (r ≤ 1.4 RMW approaching, `eyeFactor` < 0.5), `eye` (`eyeFactor` ≥ 0.5), `eyewallBack` (r ≤ 1.4 RMW departing, `eyeFactor` < 0.5), `hurricaneBack` (`u1m` ≥ 33 departing, r > 1.4 RMW), `subsiding` (`u1m` < 33 departing), `aftermath` (`u1m` < 12 departing and `tRel` > 6). Off-track presets simply never enter `eye`. Reference timings that follow from the house-level convention: `ts` T−7.0 → T−2.5 (4.5 h), `hurricane` T−2.5 → T−1.75 (0.75 h), `eyewallFront` T−1.75 → T−0.69, `eye` T−0.69 → T+0.69, `eyewallBack` T+0.69 → T+1.75, `hurricaneBack` T+1.75 → T+2.4 (0.65 h; the decayed back side drops below 33 m/s sooner), `subsiding` T+2.4 → T+11, `aftermath` from T+11. Marine hurricane force reaches the house at T−4; that moment is a *product* (the 10:00 row of §2.7), not a phase change.

### 2.2 Auto-pace tiers (*default*; hysteresis 10 % on every threshold)

| Tier | Condition (evaluated on `state.local` / `state.cues`) | Speed | Real time in the reference run |
|---|---|---|---|
| Prep | `phase == prep` | 60× | 16 h (T−32 → band 1 at T−16) → 16 min, plus ≈ 3 min of scenic caps |
| Between bands | `phase == bands && bandRain < 1` | 30× | ≈ 6.5 h → 13 min |
| In a band | `phase == bands && bandRain ≥ 1` | 15× | ≈ 2.5 h → 10 min |
| TS winds | `phase == ts` | 20× (10× once the wind cap below bites at ≈ T−4.3) | 4.5 h → 2.7 h at 20× + 1.8 h at 10× ≈ 19 min |
| Hurricane winds | `phase in (hurricane, hurricaneBack)` | 10× | 0.75 h + 0.65 h → 9 min |
| Eyewalls | `phase in (eyewallFront, eyewallBack)` | 6× | 1.06 h + 1.06 h → 21 min |
| Eye | `phase == eye` | 4× (6× while `eyeFactor` 0.5–0.8) | 1.4 h → 18 min |
| Subsiding | `phase == subsiding` | 30× | 8.6 h → 17 min |
| Aftermath day / night | `phase == aftermath` and sun up / down | 60× / 120× | 5.75 h of night → 3 min; then skips dominate |
| **Wind cap** | `u1m ≥ 26` (any phase) | `min(auto, 10×)` | the pacing bar of the previous version, now a hard cap |
| **Scenic cap** | `player.outdoors && phase == prep && (sun.elDeg < 8 || any npc:say active || life.wildlife.flockActive)` | `min(auto, 10×)` | the sunset, Ray's walk-over, the Nguyens leaving and the inland flock are not time-lapsed while you stand in the driveway |
| **Moment** | a moment fired (§2.4) | **1× for 20 real s**, then ramps back over 10 s | never miss the beat |
| **Soft moment** | `storm:sunset` (prep day only) | 3× for 60 real s | the best sunset of the year lasts a minute |
| **Hold** | any hold-to-interact in progress | **1×** (the clock effectively pauses while you turn a wing nut) | prep is playable |
| Carry | player carrying an item | `min(auto, 5×)` | walking a panel feels physical |
| Device focus | phone/TV/radio raised full-screen | `min(auto, 3×)` | reading is real time |

Whole arc at Auto-pace with no sleeping ≈ **135 min ("Full")** (the tiers above plus ≈ 13 moments × 30 s); with sensible sleeping through the night bands and the subsiding evening ≈ **105 min ("Standard")**; the **"Highlights"** preset starts at T−16 h with prep already done (shutters on, tubs full, cars in) and auto-sleeps through lulls ≈ **45 min**. These are estimates recomputed from the house-level phase timings of §2.1; the pacing playtest bar is *no stretch longer than 4 real minutes without a new catalogue detail firing* (§12). The 13-real-minute calm of the eye at 4× is deliberate: the 19 eye details of §12.5 fill it.

Above 60× the renderer drops to 30 fps and particle density to 25 %; above 300× rendering is suspended (a dark time-lapse card with the clock, the barometer and the wind readout).

### 2.3 The two clocks (contract, quoted in code headers)

> The 180-s turbulence process advances with sim-time dt; the 2.5-s and 20-s processes advance with real dt. Audio parameter smoothing, one-shot scheduling, animation, the player, the pet and the mouse advance with real dt. All failure integrals (power, cage, garage, openings, roof, cell, water) advance with sim dt using the deterministic gust envelope `uGustEnv = G·U1m` and are quantised to 10-sim-minute buckets with seeded per-bucket rolls.

Consequence: at 60× the wind still gusts every 20–60 *real* seconds, and the barometer plunges a hPa every few real seconds; the shutters rattle at a believable rate while the storm progresses quickly.

### 2.4 Moments (slow-downs, not scripts)

A **moment** is a bus event flagged `moment:true` by its owner. It drops the clock to 1× for 20 real seconds. The list is closed: `power:lost`, `power:transformerFlash`, first `house:earPop` of the run, `house:cageStage {stage:4}` (fold), `house:garageFailed`, `house:openingFailed`, `storm:eyeEnter` (first `eyeFactor` ≥ 0.5), `storm:windReversal`, `storm:eyeExit`, `hood:treeFallen`, `house:ceilingCollapse`, `alert:wea` (any *delivered* WEA — `alert:issued` is **not** a moment, so a delivered alert produces one 1× window, not two), `power:restored`. A **soft moment** (`storm:sunset` on the prep day) drops to 3× for 60 real seconds. Moments never fire while sleeping (sleep is *interrupted* instead — §2.5). Overlapping moments extend the window; they never stack.

### 2.5 Sleep and wait

- **Where:** any bed, the sofa, the hall mattress (once placed), the hall tub (crouched), a chair (wait only). Prompt: `Z — Sleep` / `Z — Wait`. The master bedroom's prompt changes to *"Too hot to sleep here — try the tile"* when `house.thermal.tInC > 28.5` (sleep there still works but wakes every 90 sim-min).
- **Dialogue:** lists **model-predicted events** from `storm.api.predict()` with estimated clock times, never bare clock times: *next band*, *tropical-storm winds*, *power-out risk window*, *hurricane winds*, *eyewall*, *eye*, *back eyewall*, *below tropical-storm force*, *first light*, *next advisory*. The player picks one; sleep runs at up to 3600× with rendering suspended, audio faded (master to 0 in 0.5 s, back in 1 s), the storm and house models stepping in 5-s sub-steps.
- **Interrupts** (any of these wakes the player with a fade-in and a phone lock screen showing what arrived). Every interrupt is a **sim-side** event, because during sleep the render, audio, player and life steps do not run (ARCHITECTURE §4): any `alert:wea`, any `alert:nwr` with an attention tone, `power:lost`, `power:transformerFlash`, `hood:debrisImpact` with energy > 40 J on a house surface (emitted by the sim-side impact model of §6.15, so it fires during sleep), `house:openingFailed`, `house:garageFailed`, `house:ceilingCollapse`, `house:cageStage ≥ 4`, `storm:eyeEnter`, `storm:windReversal`, `house:detectorChirp` (the smoke-detector low-battery chirp on the aftermath night, once), and a hard cap of 8 sim-hours. The pet does **not** interrupt sleep: the events that would panic her are already on the list, and on waking she is in the state those events imply (§11.1). The loop breaks out of its sub-step accumulator at the sub-step in which the interrupting event fired, for house and utility events as well as storm events, so the wake time is exact.
- **Skip** (`N`) advances to the next predicted state change (band arrival, phase change, next text, next advisory) with a confirm ("Next: hurricane-force winds at the house, ≈ 40 sim-min") and **never past an eyewall or the eye**: if the next event is `eyewall` or `eye`, skip lands 10 sim-minutes before it. **Skip uses sleep semantics**: the same interrupt list applies, and a skip that crosses `power:lost` or a transformer flash lands *at* that event (the moment then plays at 1×), never silently past it. The pause menu's scrub bar shows the whole arc with phase markers and lets the player **jump forward only** (the past is committed state).
- **Diegetic skips:** the paperback on the nightstand and the deck of cards on the dining table each pass 20 sim-minutes at 20× (the room is rendered; the player sits).

### 2.6 What cannot be compressed away

Whatever the speed, these always run in real time and are never skipped: the transformer flash and the outage sequence (moment), the eye's onset and the reversal (moments), any WEA tone (the phone's 10.5-s cadence plays out), the SAME/WAT sequence when the radio is in the same room, the knock-down, and the front-step ending.

### 2.7 Hour by hour — reference preset, as the model produces it (M §11)

Sustained/gust are **house-level** (kt); pressure hPa; illuminance is at the stated clock time.

| tRel | Clock | r km | House sust / gust kt | Dir | P | Rain mm/h | What the player lives through |
|---|---|---|---|---|---|---|---|
| −32 | Wed 06:00 | 640 | 9 / 15 | E | 1011.4 | 0 | Wake. A/C hum. Cirrus fan, red sunrise, 26 °C, 1011 on the console. TV on the 5 AM advisory (#21): Cat 3 forecast, warning up since Tuesday. Fridge notepad = the checklist. Phone: Mom (06:12) "are you SURE", Tam's key photo, HOA. |
| −30…−24 | 08:00–14:00 | 600–480 | 10–12 / 16–20 | ESE | 1011.3–1011.1 | 0 | Prep day: hazy sun with a 22° halo, 29→33 °C, the subdivision sounds of drills and panels. Ray at T−28. The Nguyens leave at T−26. 11 AM advisory (#22): Cat 3 confirmed. Milky altostratus by 14:00; the sun a disc. |
| −21 | 17:00 | 420 | 14 / 24 | ESE | 1010.9 | 0–2 | First dark band on the SW horizon; birds stream inland; the 5 PM advisory (#23). Dinner at Ray & Linda's is offered by text. |
| −18.25 | 19:45 (`storm:sunset`) | 340 | 16 / 27 | ESE | 1010.8 | 0 | The best sunset of the year (cirrus lit orange-red under the altostratus edge; the sun sets at 19:45 by `sunAt()`); five photos of it land in the group chat over the next 20 minutes. A soft moment (3× for a minute). |
| −18…−16 | 20:00–22:00 | 340–320 | 16–17 / 28–35 | ESE | 1010.8–1010.6 | 15–25 in band 1 (~1 h) | Dusk overcast, then dark; distant lightning SW; **band 1** ≈ 22:00: first squall, the gust envelope jumps to ≈ 16 m/s (30–35 kt) at the gust front, rain in a rush; a first **flicker** at the band's gust front in ≈ 40 % of seeds (microwave 0:00). |
| −14 | 00:00 Thu | 280 | 19 / 32 | ESE | 1010.2 | 0–1 | Gap: wet street under the streetlights, breaks in the cloud, breezy; intermediate advisory 02:00. |
| −12 | 02:00 | 240 | 21 / 36 | ESE | 1009.8 | 20–35 in band 2 (~1.5 h) | **Band 2**: gusts 45 kt; Tornado Watch on NWR; a **Tornado Warning WEA** somewhere in T−13…−9 wakes the house. |
| −10 | 04:00 | 200 | 25 / 42 | ESE | 1009.3 | 2–5 | TS force marine begins; ragged low cloud; barometer "falling". County: shelter in place. |
| −9 | 05:00 | 180 | 27 / 45 | ESE | 1008.8 | 25–40 principal-band cells | 5 AM advisory (#25); screen panels start tearing; pool overflowing; the cans you forgot roll. |
| −8 | 06:00 | 160 | 30 / 50 | ESE | 1008.3 | 10–20 | Still full night (the sun is 13° below the horizon); rain nearly continuous; cell data thins to one bar. |
| −7 | 07:00 | 140 | 33 / 55 | ESE | 1007.5 | 15–30 | **TS force at the house**; the roar begins; flickers cluster; NWR Hurricane Local Statement. Garbage-day reminder on the phone, absurdly. **The dark dawn:** sunrise is 07:12 but the sky only goes charcoal — 80 lux at 07:15, 500 lux not until 08:00 (T−6); the streetlights stay on (photocell). |
| −7…−4 | 07:00–10:00 | 140–80 | 33–50 / 55–82 | ESE | 1007.5–1001.2 | 20–45 | **Power-out hazard window** (median T−5.9, 95 % before T−4.5): brownout, then the blue-green transformer flash through the laundry peep window, crack-boom 0.4 s later, the A/C stopping mid-breath, fans coasting, the UPS screaming. Ray's Generac cranks 10 s later. Water fans under the front door from ~T−5. |
| −4 | 10:00 | 80 | 50 / 82 | ESE | 1001.2 | 30–45 | Hurricane force **marine** (a product, not a phase change); snowbird shingles slap the east wall; visibility ≈ 500 m; branches down; the wind cap holds the clock at ≤ 10× from here. |
| −3.1 | 10:55 | 62 | 58 / 95 | ESE | 997.7 | 35–50 | **Extreme Wind Warning** (NWR always; WEA in ≈ 70 % of seeds — the tower is dark in the rest). Garage door pumping. Water at the bed-2 window head (bare) or running behind the shutter. |
| −2.5 | 11:30 | 50 | 64 / 105 | ESE | 993.5 | 40–60 | **Hurricane force at the house** (`phase == hurricane`). Pressure falling 8 → 17 hPa/h: first ear pops. Cage panels (walls and roof) tearing; the live oak's first limb. Rain on the east wall crosses the soffit threshold (200 mm/h wall-equivalent): the attic starts taking water. |
| −2…−1.25 | 12:00–12:45 | 40–25 | 70–78 / 116–130 | ESE→E→ENE | 987.8–972.8 | 50–100 | **Front eyewall.** 100–250 lux at noon (the sun is 60° up behind τ ≈ 6.5 of cloud, rain and spray). Mesovortex gusts every 5–15 min; the garage door's fate is decided (unbraced ≈ 35 %); the front door bulges in its frame; **first ceiling stain at the foyer can light ≈ 11:50**, dripping by 12:15; debris impacts every few seconds on the east wall and roof; toilets gurgle; ears continuous. The sliders are in the lee all morning — their turn is the back side. |
| −1 | 13:00 | 20 | 75 → 40 / 125→60 | ENE | 965.3 | 60 → 10 | Inner edge: rain quits within minutes, the wind "switches off" over 15 min. |
| −0.69 | 13:19 | 13.8 | ≈30 / 45 | NE, variable | 957 | 2 | **Eye enters** (`eyeFactor` 0.5): sky brightening from the zenith outward, blue holes. |
| −0.45…+0.45 | 13:33–14:27 | < 9 | 3–8 / 12 | light, backing S→SW | 951 → **950.0** → 951 | 0 | **The calm.** Sun, 20 000 lux, 30 °C, dead still, dripping, birds, frogs, the far eyewall as a stadium wall on every horizon with a surf-roar. Ray on his porch. You can go out; the radio and the phone say not to. |
| +0.5 | 14:30 | 10 | 15 → 30 / 25→50 | SW→W | 951.2 | 0 → 5 | The western wall darkens the sky in 5 min; a rising hiss 1–3 min ahead; "WIND BACK GET INSIDE". |
| +0.75…+1.25 | 14:45–15:15 | 15–25 | 65–80 / 105–132 | WNW | 957–973 | 30–100 | **Back eyewall** from the opposite side in 5–8 min. Exposure 0.85: the back peak (80 kt) is slightly *higher* than the front (78). The cage — which held in the lee all morning — folds in the first ten minutes; the sliders leak at the track; ears pop the other way. |
| +2…+4 | 16:00–18:00 | 40–80 | 72–49 / 118–78 | WNW→W | 987.8–1001.2 | 50–20 | Still hurricane force; the street ponds to kerb depth; the pond reaches the back lot line ~T+3; 5 PM advisory "moving inland, weakening"; first lulls at T+4. |
| +5…+6 | 19:00–20:00 | 100–120 | 42–37 / 66–58 | W | 1004.7–1006.5 | 10–25 | TS force; sunset glow under the deck; a rainbow to the east is possible; curfew (NWR CEM; WEA if bars). |
| +8…+12 | 22:00–02:00 | 160–240 | 30–21 / 48–34 | WNW→NW | 1008.3–1009.8 | bands only | Stars in the gaps over a black subdivision; generators start one by one; the house is 29 °C at 90 % RH (sealed, occupied, no A/C — §6.11) and the master bed says *try the tile*; the smoke detector chirps from ≈ 02:00 (`hoursSinceOutage ≥ 4 && isNight`); the foyer drip is still going from the attic reservoir; frogs deafening. |
| +16.75 | 06:45 Fri (civil dawn by `sunAt()`) | 335 | 16 / 26 | NW | 1010.7 | 0 | **First light.** The reveal. Canonical ending on the front step (§15). Sunrise proper at 07:12. |
| Day 1 → 10 | | | | | | | Aftermath by skips (§13): heat, chainsaws, tarps, boil-water, the COW on day 3, crews on day 4, power on day 5, boil-water lifted day 10. |

---
## 3. The house — 4212 Sandpiper Cove

### 3.1 World frame (binding for every module; see ARCHITECTURE §2)

Units are metres. **Y is up. +X is east (toward the street). +Z is south.** The origin is the **north-west corner of the slab at finished-floor level**, so every interior point has `0 ≤ x ≤ 14.0`, `0 ≤ z ≤ 19.8`, `y = 0` on the tile. Compass azimuth θ is measured clockwise from north; a horizontal unit vector for azimuth θ is `(sin θ, 0, −cos θ)`. Wind "from" direction `dirFrom` means the air moves toward `dirFrom + 180°`. Eye height 1.65 m standing, 1.0 m crouched.

Slab 14.0 (E–W) × 19.8 (N–S) including the garage, top of slab 0.30 m above grade. Exterior CBS walls 0.25 thick (inner faces at x = 0.25 / 13.75, z = 0.25 / 19.55). Interior walls 0.115 thick. Flat ceilings at 2.85 m (knockdown texture); tray ceiling in the master bedroom to 3.15 m; garage ceiling 2.85 (painted block walls, no drywall on the exterior block). Floors: 0.457 m porcelain tile throughout except carpet in bedrooms 2/3 and the den; sealed concrete in the garage; pavers on the lanai.

### 3.2 Wall centre-lines (the plan grid)

Interior walls are centred on these lines (faces at ±0.0575); exterior walls on x = 0.125, x = 13.875, z = 0.125, z = 19.675.

| Line | Value | Span and what it separates |
|---|---|---|
| x1 | 3.95 | z 11.3 → 15.2: master bath \| master closet (closet door at z 13.30–14.11) |
| x2 | 4.95 | z 15.2 → 19.675: master bedroom \| bedroom-hall E–W leg + AHU closet (master door at z 15.50–16.31) |
| x3 | 5.60 | z 0.125 → 6.7: nook/kitchen \| laundry, pantry (laundry door z 1.20–2.01; pantry door z 4.40–5.21); z 6.7 → 10.0: great room \| dining (cased opening z 7.20–9.60). **No wall** z 10.0 → 11.3 (great room opens to the front hall). |
| x4 | 6.50 | z 11.3 → 15.2: master closet \| bedroom hall; z 16.4 → 19.675: AHU closet \| den |
| x5 | 7.50 | z 0.125 → 6.7: laundry/pantry \| garage (steel fire door laundry→garage at z 1.40–2.21) |
| x6 | 7.70 | z 11.3 → 15.2: bedroom hall \| hall bath (door z 12.40–13.21) and linen closet (door z 14.10–14.91) |
| x7 | 10.40 | z 6.7 → 10.0: dining \| foyer (cased opening z 7.60–9.10); z 11.3 → 19.675: hall bath/linen/hall leg/den \| bedrooms 2–3 (bed-3 door at z 15.50–16.31). **No wall** z 10.0 → 11.3. |
| z1 | 3.00 | x 5.6 → 7.5: laundry \| pantry |
| z2 | 6.70 | x 5.6 → 13.875: laundry/pantry/garage \| dining/foyer. **No wall** in column A (kitchen is open to the great room). |
| z3 | 10.00 | x 5.6 → 10.4: dining \| front hall (cased opening x 7.00–9.00). **No wall** x 10.4 → 13.875 (foyer is open to the front hall). |
| z4 | 11.30 | x 3.95 → 6.5: master closet north wall; **gap x 6.5 → 7.7** (bedroom-hall entrance); x 7.7 → 13.875: hall bath north wall and bedroom 2 north wall (bed-2 door at x 11.20–12.01) |
| z5 | 12.20 | x 0.125 → 3.95: great room \| master bath |
| z6 | 13.815 | x 7.7 → 10.4: hall bath \| linen closet |
| z7 | 15.20 | x 0.125 → 3.95: master bath \| master bedroom (bath door x 2.50–3.31); x 3.95 → 6.5: master closet \| hall leg; **gap x 6.5 → 7.7**; x 7.7 → 10.4: linen \| hall leg; x 10.4 → 13.875: bedroom 2 \| bedroom 3 |
| z8 | 16.40 | x 4.95 → 10.4: hall E–W leg \| AHU closet (door x 5.30–6.11) and den (door x 8.00–8.81) |

The plan file (`src/world/plan.js`, owner E4) is generated from exactly these lines; the house engineer may move a line by ≤ 0.05 m to make tiling exact but may not add, remove or re-order rooms, openings or IDs.

### 3.3 Rooms (clear interior boxes; `roomOf()` polygons)

| `roomId` | Box x (W→E) × z (N→S) | Size | Ceiling | Floor | Openings and sim-relevant contents |
|---|---|---|---|---|---|
| `nook` | 0.25–5.5425 × 0.25–3.30 | 5.29 × 3.05 | 2.85 | tile | **Bay window N** (`win_nook_N`, 1.5 wide at x 1.80–3.30, three facets projecting 0.45 m, sill 0.9, head 2.1; 3 panels). Table + 4 chairs, laptop showing radar, tablet, the HOA letter, the printed tracking chart, the deck of cards (diegetic 20-min skip). Open to the kitchen (no wall). |
| `kitchen` | 0.25–5.5425 × 3.30–6.70 | 5.29 × 3.40 | 2.85 | tile | **Window W** over the sink (`win_kitchen_W`, z 4.30–5.20, sill 1.1; 2 panels). Island 2.4 × 0.9 at x 1.8–4.2, z 6.2–7.1 (straddles the open kitchen/great-room line). Fridge with ice-maker switch and freezer (Ziploc ice), electric range, microwave (clock), coffee maker + 2 thermoses, small antenna TV, NOAA radio (default home), weather-station console, charging bank ×2, flashlights ×2, headlamp, manual can opener, 6 gallon jugs, the junk drawer (8 spare wing nuts in a bag marked "shutter"), water cases ×4, canned goods pile, paper goods. Doors: `door_laundry_kitchen` (x3, z 1.20–2.01, opens into the nook side), `door_pantry` (x3, z 4.40–5.21). |
| `great` | polygon (0.25,6.70)–(5.5425,6.70)–(5.5425,11.2425)–(3.8925,11.2425)–(3.8925,12.1425)–(0.25,12.1425) | 5.29 × 4.5–5.4 | 2.85 | tile | **Triple slider W** (`slider_great_W`, z 8.00–10.70, 2.7 × 2.44, accordion shutter, 2×4 brace socket). Sectional, 65" TV on the east wall (x = 5.5, z 8.4), ceiling fan, 2 lamps, bookshelf, coffee table, dog bed, candles ×4, lantern ×2, bucket socket under the A/C supply register (leak point `lp_great_register` at (2.6, 7.4)), towel socket at the slider track, the paperback on the side table. Open to the kitchen (N), the dining (cased opening x3 z 7.2–9.6) and the front hall (E, z 10.06–11.24). |
| `laundry` | 5.6575–7.4425 × 0.25–2.9425 | 1.785 × 2.69 | 2.85 | tile | **The peep window N** (`peep_laundry_N`, x 6.25–6.85, 0.6 × 0.6, sill 1.5; 1 panel) — the one everyone forgets; the only outside view once shuttered; frames the transformer pole at (9.0, −3.0). Washer (fillable as a cooler, 60 L), dryer (vent flap on the north wall at x 5.9 — it clacks above 18 m/s), utility sink, litter box/dog bowls, hurricane-kit bin (6 AAs, duct tape, candles, lighter). Doors: to the kitchen/nook (x3), to the garage (`door_laundry_garage`, x5 z 1.40–2.21, steel, self-closing, sandbag socket on the garage side). |
| `pantry` | 5.6575–7.4425 × 3.0575–6.6425 | 1.785 × 3.585 | 2.85 | tile | Walk-in: canned goods, 4 more water cases, peanut butter, bread, chips, pop-tarts, batteries, paper plates. Door from the kitchen (x3). |
| `garage` | 7.5575–13.75 × 0.25–6.6425 | 6.19 × 6.39 | 2.85 | concrete | **Roll-up door E** (`door_garage_roll`, z 0.90–5.80, 4.9 × 2.13, unbraced; brace kit on the shelf; motor + manual release cord). **Man door N** (`door_garage_man`, x 12.50–13.31, outswing steel). Car (nose-in after the task; second car in the driveway), shutter rack with **19 labelled panels** ("NOOK 1-3", "KIT 1-2", "BR2 1-2", "BR3 1-2", "DEN 1-2", "MBR 1-2", "MBA", "MSL 1-3", "SIDELT", "LAUN"), coffee can of wing nuts (68), drill, 8-ft ladder, **5.5 kW generator** on a dolly (tank 19 L, empty at start), 4 × 19 L gas cans (2 full, 2 empty), 2 × 20 lb propane, chest freezer, 190 L electric water heater, 200 A panel (breakers: main, A/C, water heater, pool pump, range, garage, kitchen, bedrooms, lights), garage fridge, wet/dry vac, box fan, 8 sandbags, 3 buckets, coolers ×2, extension cords ×3, attic pull-down (x 10.5, z 3.0), CO/smoke detector on the ceiling, the trash and recycle bins once brought in. |
| `dining` | 5.6575–10.3425 × 6.7575–9.9425 | 4.685 × 3.185 | 2.85 | tile | Interior (no window). Table for 6 = the staging table: "the important stuff" basket, documents pouch, bike helmets ×2, the wall barometer (on the north wall), the cards. Cased openings W (great), S (front hall x 7.0–9.0), E (foyer). |
| `foyer` | 10.4575–13.75 × 6.7575–10.0575 | 3.29 × 3.3 | 2.85 | tile | **Front door E** (`door_front`, z 7.90–8.81, 0.91 × 2.03, **inswing**, deadbolt) + **sidelight** (`sidelight_foyer_E`, z 8.81–9.11, 0.3 × 2.03; 1 panel). Coat closet (prop, north wall), console table, key bowl, doormat that floats, towel socket, sandbag socket. Opens to the front hall (S) and the dining (W). Coach lights outside; Ring doorbell at z 7.7. |
| `frontHall` | 5.6575–13.75 × 10.0575–11.2425 | 8.09 × 1.185 | 2.85 | tile | Attic hatch 0.56 × 0.76 at (9.0, 10.65) (thumps); smoke/CO detector at (8.0, 10.65) ceiling; thermostat on the south wall at x 9.5; family photos. Opens W to the great room, E to the foyer, N to the dining; door to `bed2` (z4). Refuge position 1 (mattress socket at x 6.0–8.0). |
| `bedHall` | T-polygon (6.5575,11.2425)–(7.6425,11.2425)–(7.6425,15.2575)–(10.3425,15.2575)–(10.3425,16.3425)–(5.0075,16.3425)–(5.0075,15.2575)–(6.5575,15.2575) | 1.085 wide | 2.85 | tile | The safest walkable place with no exterior wall. Mattress socket 2 (N–S leg). Doors to: hall bath (x6), linen (x6), master bedroom (x2), bed 3 (x7), den (z8), AHU closet (z8). |
| `hallBath` | 7.7575–10.3425 × 11.3575–13.7575 | 2.585 × 2.4 | 2.85 | tile | **Interior, no window — safe room 1.** Tub 1.5 × 0.75 along the east wall (**fillable, 150 L**), toilet (gurgles), vanity, exhaust fan, candles socket, bucket. Crouch-in-the-tub position. Door from the bedroom hall. |
| `linen` | 7.7575–10.3425 × 13.8725–15.1425 | 2.585 × 1.27 | 2.85 | tile | 8 towels, sheets, first-aid kit, the second lantern. Door from the bedroom hall. |
| `masterBath` | 0.25–3.8925 × 12.2575–15.1425 | 3.64 × 2.885 | 2.85 | tile | **Obscure window W** (`win_mbath_W`, z 13.40–14.00, 0.6 × 0.6, sill 1.5; 1 panel). Garden tub 1.5 × 0.8 (**fillable, 210 L**), shower, double vanity, WC. Doors: to the master bedroom (z7), to the master closet (x1). |
| `masterCloset` | 4.0075–6.4425 × 11.3575–15.1425 | 2.435 × 3.785 | 2.85 | carpet | **Interior, windowless — safe room 2.** One door (from the master bath). Mattress-against-the-door socket, safe, documents box, go-bag. Reached hall → master → bath → closet. |
| `masterBR` | 0.25–4.8925 × 15.2575–19.55 | 4.64 × 4.29 | 3.15 tray | tile | **Slider W** (`slider_master_W`, z 15.50–17.30, 1.8 × 2.03; 3 panels), **window S** (`win_master_S`, x 2.00–2.90; 2 panels). King bed (sleep; the bed prompt changes when hot), nightstand lantern + charger, ceiling fan, dresser, the paperback, under-bed hiding spot (pet). Leak point `lp_master_can` at (1.2, 16.0) (can light near the west wall). Door from the hall leg (x2). |
| `ahuCloset` | 5.0075–6.4425 × 16.4575–19.55 | 1.435 × 3.09 | 2.85 | concrete | Air handler (the blower whoosh; relay click), return grille on the door, filter; attic access above (secondary). Door from the hall leg (z8). |
| `den` | 6.5575–10.3425 × 16.4575–19.55 | 3.785 × 3.09 | 2.85 | carpet | **Window S** (`win_den_S`, x 8.00–8.90; 2 panels). Desk, PC + **UPS** (beeps on flicker, screams on outage), router/modem (LEDs die "online" first), printer, insurance folder, filing cabinet. Leak point `lp_den_ceiling` at (8.5, 18.8) (attic south hip). Door from the hall leg (z8). |
| `bed2` | 10.4575–13.75 × 11.3575–15.1425 | 3.29 × 3.785 | 2.85 | carpet | **Window E** (`win_bed2_E`, z 12.80–13.70; 2 panels). Guest bed (sleep), dresser, plastic totes, reach-in closet (prop). Leak point `lp_bed2_head` (window head, wind-driven). Door from the front hall (z4). |
| `bed3` | 10.4575–13.75 × 15.2575–19.55 | 3.29 × 4.29 | 2.85 | carpet | **Window E** (`win_bed3_E`, z 16.90–17.80; 2 panels). Guest bed (its mattress is the one that goes to the hall), closet (prop), boxes. Door from the hall leg (x7). |
| `lanai` | −3.0–0 × 6.5–17.5 (covered, under truss) | 3.0 × 11.0 | 2.85 (pan roof beyond the truss line) | pavers | 3 ceiling fans (the westmost shreds), outdoor TV (cracks), patio table + 4 chairs, 2 chaises, Weber propane grill, 3 planters, outdoor rug, hose reel, wind chimes, pool toys, the outdoor-sensor mast at (−2.5, 6.8). All movable items are debris sources unless brought in or sunk in the pool. Leak: the lanai gutter corner sheets over at R > 25 mm/h. |
| `cage` | −9.0–0 × 6.0–18.0 (screen enclosure, 9 × 12 m, mansard: 3.2 m at the house, 2.6 m at the outer beam) | | | pavers/pool | 24 screen panels (8 W wall, 6 N, 6 S, 4 roof strips) each 1.5 × 2.6 (walls) or 2.25 × 12 (roof strips), 6 main beams, screen door at (−9.0, 7.0) (bangs until latched). Pool 4 × 8 at x −8.0 → −4.0, z 8.0 → 16.0, 1.1–1.8 deep, level 0 = deck − 0.15; pump/heater pad at (−2.0, 18.5); pool light. Pool level lowering task (15 cm). |
| `outside` | everything else | | | | The lot (§3.6), the street, the neighbourhood (§4). |

### 3.4 Exterior openings — the envelope table (owner E3 for state, E4 for geometry)

Façade normals: N = 0°, E = 90°, S = 180°, W = 270°. `k_exp` sector exposure (M §12.5, resolved): N 0.80, NE 0.78, E 0.78, SE 0.78, S 0.78, SW 0.82, W 0.85, NW 0.85 (the pond and open ground lie W/NW/SW).

| `openingId` | Wall / position | Size | Kind | Shutter | Fastenings | Notes |
|---|---|---|---|---|---|---|
| `win_nook_N` | N, x 1.80–3.30 (bay) | 1.5 × 1.2, sill 0.9 | window | 3 panels | 12 nuts | Blind cords swing at ΔP > 150 Pa. |
| `peep_laundry_N` | N, x 6.25–6.85 | 0.6 × 0.6, sill 1.5 | peep | 1 panel | 4 | Frames the transformer; 18 % failure hazard over the reference storm if left bare. |
| `door_garage_man` | N, x 12.50–13.31 | 0.81 × 2.03 | door (outswing, steel) | — | — | Wind rules §10.2. |
| `door_garage_roll` | E, z 0.90–5.80 | 4.9 × 2.13 | garage | — (brace kit) | — | Pumping, buckle, failure §6.4. Motor dead after outage; manual release. |
| `door_front` | E, z 7.90–8.81 | 0.91 × 2.03 | door (**inswing**) | — | — | Slams open > 25 m/s gust if unlatched; threshold fan at `R_wall(E)` ≥ 90. |
| `sidelight_foyer_E` | E, z 8.81–9.11 | 0.3 × 2.03 | window | 1 panel | 4 | Frames Ray's house and the oak. |
| `win_bed2_E` | E, z 12.80–13.70 | 0.9 × 1.2 | window | 2 panels | 8 | |
| `win_bed3_E` | E, z 16.90–17.80 | 0.9 × 1.2 | window | 2 panels | 8 | |
| `win_master_S` | S, x 2.00–2.90 | 0.9 × 1.2 | window | 2 panels | 8 | |
| `win_den_S` | S, x 8.00–8.90 | 0.9 × 1.2 | window | 2 panels | 8 | |
| `win_kitchen_W` | W, z 4.30–5.20 | 0.9 × 1.0, sill 1.1 | window | 2 panels | 8 | Over the sink. |
| `slider_great_W` | W, z 8.00–10.70 | 2.7 × 2.44 | slider | accordion (2 leaves, built-in) | — | Bows 2–4 cm at 60 m/s **when windward — i.e. in the back eyewall; in the front half it is a lee opening and only mists**; track seep at `R_wall(W)` ≥ 60; 2×4 brace socket halves the bow. |
| `win_mbath_W` | W, z 13.40–14.00 | 0.6 × 0.6, sill 1.5 | window | 1 panel | 4 | Obscure glass. |
| `slider_master_W` | W, z 15.50–17.30 | 1.8 × 2.03 | slider | 3 panels | 12 | Track seep as above. |
| `door_cage_screen` | cage NW corner (−9.0, 7.0) | 0.9 × 2.0 | screen door | — | — | Bangs at U > 12 m/s until latched; gone in the eye if `cage.stage ≥ 2`. |

Wall-equivalent rain per façade is `rainWall[i] = R·(max(0, u1m·cos(dirFrom − n_i))/7 + 0.1)`: the `0.1·R` term is lee-side wetting (splash and eddies), so lee glass is misted rather than bone-dry but never reaches a threshold (at R = 80 mm/h it is 8 mm/h-equivalent against a track threshold of 60).

Panel supply: 19 panels on the rack; 68 wing nuts in the coffee can (17 panels' worth) + 8 in the kitchen junk drawer. A panel placed with `n` nuts has `fastening = n/4`; below 1.0 it buzzes (audio) and its failure hazard is multiplied by `1 + 3·(1 − fastening)`.

### 3.5 Interior doors

All interior doors 0.81 × 2.03 hollow-core, six-panel, lever latch; state `{open 0..1, latched, targetOpen}`; they respond to interior pressure differences (§7.7): unlatched doors drift and slam at `|ΔP_room| > 40 Pa`, latched doors rattle and "breathe" at `dPdt > 10 hPa/h`.

`door_laundry_kitchen` (x3 z 1.20–2.01, hinge N, opens into the nook), `door_pantry` (x3 z 4.40–5.21, opens into the kitchen), `door_laundry_garage` (x5 z 1.40–2.21, steel, fire-rated, self-closing, opens into the laundry), `door_bed2` (z4 x 11.20–12.01, opens into bed 2), `door_hallBath` (x6 z 12.40–13.21, opens into the bath), `door_linen` (x6 z 14.10–14.91, bifold), `door_master` (x2 z 15.50–16.31, opens into the master), `door_masterBath` (z7 x 2.50–3.31, opens into the bath), `door_masterCloset` (x1 z 13.30–14.11, opens into the closet — the mattress goes against it from inside), `door_bed3` (x7 z 15.50–16.31, opens into bed 3), `door_den` (z8 x 8.00–8.81, opens into the den), `door_ahu` (z8 x 5.30–6.11, louvred). Cased openings (no door): great↔dining (x3, z 7.2–9.6), dining↔frontHall (z3, x 7.0–9.0), dining↔foyer (x7, z 7.6–9.1), great↔frontHall (x 5.6, z 10.06–11.24), frontHall↔bedHall (z 11.3, x 6.5–7.7), foyer↔frontHall (z 10.0, x 10.4–13.875), hallLeg↔bedHall N–S (z 15.2, x 6.5–7.7), kitchen↔great (z 6.7, x 0.125–5.6), nook↔kitchen (z 3.3).

### 3.6 Roof, attic, ceiling ports

Three intersecting hip roofs at 4:12 with 0.6 m eaves, eave height 3.05 m (T §4): **A** main, over x −3.0 → 14.0, z 6.7 → 19.8 (ridge E–W, 3.9 m long at 5.43 m; covers the lanai as an under-truss extension); **B** north wing, **x 0 → 7.5** (with the 0.6 m eaves, so the roof edge is at x = −0.6 over the side yard), z 0 → 6.7 (ridge E–W at 4.37 m); **C** garage, x 7.5 → 14.0, z 0 → 6.7 (near-pyramid at 4.33 m). Architectural shingles (own roof: tabs lift on the windward slope at `uStruct ≥ 42 m/s`; hurricane clips mean the deck never fails in Cat 3), ridge vents, vented aluminium soffit (the #1 water path: attic intrusion when the façade's wall-rain integral crosses its threshold, §6.6), gutters on the E and W eaves, fascia. The attic is a modelled volume — `house.pressure.pAtticHpa` and **`roof.atticWaterL[8]`, a per-façade water reservoir in the insulation** that the ceiling leak points drain over hours (§6.6) — not walkable; the hall hatch can be pushed up from the ladder (prep and aftermath only) to show 1.5 m of trusses, wet insulation and, after shingle loss, daylight through nail holes.

Six authored leak points (which ones activate depends on windward side, `reversal` and the roof/soffit integrals): `lp_foyer_can` (E soffit, foyer can light), `lp_bed2_head` (E, bed-2 window head), `lp_master_can` (W soffit, master can light), `lp_great_register` (W, great-room A/C supply register), `lp_den_ceiling` (S hip, den), `lp_hall_detector` (attic centre, the smoke detector — wet-chirps).

### 3.7 Lot and site elevations (y relative to the finished floor)

| Feature | Position (world x, z) / extent | y | Notes |
|---|---|---|---|
| Lot | x −16.4 → 21.6, z −2.1 → 21.9 (38 × 24 m) | | 2.1 m side yards; 7.6 m front setback from the right-of-way at x = 21.6. |
| Grade at slab | slab perimeter | −0.30 | Lawn ±0.15 m vertex noise; high spots stay dry. |
| Driveway | x 14.0 → 23.1, z 0.5 → 6.5 | −0.30 → −0.50 at the swale crossing (culvert) | Broom-finish concrete with control joints every 3 m; the second car parks here. |
| Front walk / porch | walk z 7.9–9.3 from x 14.0 to the drive; covered entry 2.0 × 3.0 at x 14.0–16.0, z 6.9–9.9 | −0.30 → −0.15 (one step up to the porch at −0.15, threshold at 0) | Bench, 2 pots, doormat, wreath. |
| Swale | x 21.6 → 23.1 (1.5 wide), full street length | bottom −0.80 | Fills first; storm inlets at (23.0, 14) and (23.0, 44). |
| Street | asphalt x 23.1 → 30.4 (7.3 wide), centre x 26.75, from z −50 (bulb) to z 75 (Egret Way) | crown −0.45 | Cul-de-sac bulb radius 12 m centred (26.75, −38). No kerb (swale street). |
| Mailbox | (22.0, 8.0) | | Post stands in water at swale > 0.1 m; gone in the back eyewall (seeded 60 %). |
| Overhead line | poles at (20.0, −2.5), **(9.0, −3.0) transformer pole**, (−4.0, −3.0) along the shared north lot line | | Service drop to the meter on the garage's north wall at (12.0, 0). `service = underground` replaces this with the pad-mount box at (22.5, 30) and no flash. |
| Streetlights | (31.5, −8), (31.5, 22), (31.5, 52), (26.75, −50) | 9 m LED cobra heads | Photocell: light early in a dark band (`illumLux < 40`); dead after the outage. |
| A/C condenser | pad (11.0–12.0, 20.2–21.0) | | Hum until outage; buried in fronds after. |
| Pool equipment | (−2.0, 18.5) | | Pump on a timer; breaker task. |
| Trees on the lot | queen palms (17.5, −0.5) and (17.5, 9.5); sabal palm (−12.5, 20.5); foxtail palm (15.5, 11.0); clusia hedge along the east wall x 14.3, z 1–19 (hedge blobs); mulch beds | | Queen: fronds strip at `uGustEnv > 28`, snaps at `uStruct > 48` with saturated soil; sabal folds and survives; hedges flatten at 30 m/s. |
| Pond | bank top x = −17.5 (y −0.5), water x ≤ −20.0, extent z −25 → +40 (60 × 65 m); fountain at (−50, 8) | normal −1.5; storm max rise +1.2 | Reaches the back lot line at +1.0; the lanai step at +1.2 (Slow Cat 1 preset). Fountain dies with the grid. |

---

## 4. The neighbourhood

A 150 × 150 m playable area with a 600 m LOD skirt of flat roof-coloured boxes behind fog. All houses are the same plan with two mirror variants, three stucco colours and two roof colours, built from `plan.js` and dressed per lot.

| Lot | Origin (x, z), facing | Owner | Storm behaviour (all state-driven) |
|---|---|---|---|
| **4212** | (0, 0), faces E | You | This document. |
| **4210** | (0, −26), faces E | Nguyens | Panels up by T−27. Minivan leaves at T−26 (`hood.houses.nguyen.evacuated`); kids' bikes and the dog vanish. Key under the turtle statue at their front door (aftermath task: enter the foyer/great room, photograph, send). |
| **4214** | (0, 24), faces E | Bergstroms (snowbird, empty) | **Unshuttered** 1998 3-tab shingles: loss begins at `uGustEnv ≥ 40 m/s` on the windward slope (≈ T−4.3) and reaches sheathing exposure at `uStruct ≥ 52`; unbraced, older garage door with threshold **`N(53, 4)`** on `uStruct·cos` (front-RMW load ≈ 55 → fails in ≈ 70 % of seeds; when it fails in the front half the wind carries it WNW across your side yard and it is in *your* back yard by the eye — prop `berg_garageDoor` pose `inYourYard`, §4.2); ficus hedge goes over as a wall at 35 m/s; screen cage panels are the first debris in your yard. Ring doorbell blinks blue until the outage. |
| **4215** | (34, −4), faces W | Ray & Linda | Panels up first (T−30 already). Flag (wraps its pole at 10 m/s; taken down at T−24). **Generac** on the north side: cranks 10 s after `power:lost`, runs the whole aftermath (HRTF source at (36, −6)). Coach lights the only lights on the street. Live oak in the front yard at (36.5, 4.0): limbs from `uStruct > 35`, uproot at `uStruct > 40` with saturated soil (`rainTotalMm > 150`), fall direction = downwind at failure: front half → into the street / Ray's car at (33, 6); back half → onto Ray's roof. Ray's chainsaw Friday 07:00. |
| **4218** | (0, −52), faces E (on the bulb) | Marcus | Portable generator on a 7–10 / 18–21 schedule from T+5; power strip on the porch = phone-charging stop (45 sim-min → +60 %). Chainsaw #2. |
| **4220** | (34, 22), faces W | Denise (HOA) | Plywood on two windows (flexes; one sheet flies at 33 m/s, seeded). |
| **4221 / 4223** | bulb | — | Filler houses; one has a trampoline (debris after T−3), one a boat on a trailer (rolls at 30 m/s). |
| **Across the pond** | (−95, 10), faces E | "The boat guy" | Boat on a lift: strapped at T−48 in the backstory; lift at 30° by the eye. |

Also: three streetlights + the bulb light; the pad-mount transformer box; storm inlets; a stop sign at the exit (bent flat at `uStruct > 45`); the HOA sign; the retention pond with its fountain; a 40-member group chat "Sandpiper Cove Neighbors".

Debris sources are typed and positioned so the wind direction decides what hits you: in the front half (from ESE) the Bergstrom house (south-east of you) feeds shingles, screen panels and its garage door into your east wall and roof; in the back half (from WNW) your own cage, the pond-side fronds and Ray's oak limbs come the other way. In the eye the debris field is static; after the reversal it is re-mobilised the other way (detail §12). **Impacts are decided by the sim** (§6.15: a deterministic, bucket-hashed impact model in `hood/`), and the visible bodies are a cosmetic field that the renderer times to land where the sim said.

### 4.1 The street's transformers (`hood.transformers`; overhead service only)

The subdivision is fed by one feeder along the east side of the street with pole-mounted transformers every few lots. Each pole has its own grid hazard (the §6.3 hazard with its own seed stream) and flashes with p 0.6 when it fails, so the street goes dark **piecewise** during the T−9 … T−4 window before the feeder itself dies at `power:lost`. Your own pole is `utilities.power` (its flash is `power:transformerFlash`); the others are `hood.transformers[id]` and emit `hood:transformerFlash {id, pos, distM}`.

| id | Pole position (x, z) | Serves | Narrative hook |
|---|---|---|---|
| `sandpiperW` | (9.0, −3.0) | 4212 (you), 4210, 4214 | = `utilities.power`; the peep-window flash. |
| `sandpiperE` | (32.0, 10.0) | 4215 (Ray), 4217 | Ray's "Still on" is true while this pole *and* the feeder are up; his Generac cranks at the first of `power:lost` / this pole's failure. |
| `bulb` | (26.75, −45) | 4218 (Marcus), 4221, 4223 | Marcus's "we're dark" texts. |
| `egret` | (32.0, 78) | 4220 (Denise), the north end, Egret Way | "The transformer on Egret just blew, whole sky went green" (Marcus, +4 min); "Power's out here" (Denise, +2 min after her pole dies). |
| `pond` | (−95, −20) | across the pond | A green flash on the far bank reflected in the pond. |

Effect of a distant flash (§7 #14b): the sky's `uFlash` tinted green-cyan and the cloud base lit from below at the pole's azimuth for 60–200 ms ×3–6, a thunder-like delayed crack (`distM/343` s), the pole's houses' windows and the streetlights on its span going dark; **no local point light** unless the pole is within 30 m (then the pooled point light of §7 #13). Soak expectation: 1–4 neighbourhood flashes per run, 0–1 for the house.

### 4.2 Neighbourhood dressing table (E4 builds every prop here; E5 poses it from the state path or event named)

Every entry is a static prop id in `world.registry.props`; "pose" names a transform preset E4 authors; "day" is `clock.dayIndex`. Where the trigger is a state path, E5 syncs the pose each frame; where it is an event, E5 listens once.

| Prop id | Lot / position | Shown or posed by | Poses | Day |
|---|---|---|---|---|
| `nguyen_minivan` | 4210 driveway (14, −22) | `hood.houses.nguyen.evacuated` | `parked` → `gone` (drives off north over 20 s on `hood:evacuated`) | prep |
| `nguyen_bikes` ×2, `nguyen_dog` | 4210 lawn | `!hood.houses.nguyen.evacuated` | shown / hidden | prep |
| `nguyen_turtle`, `nguyen_key` | 4210 front step (16, −20) | always / `objects.turtleKey.state` | key `under` → `taken` | aftermath |
| `nguyen_interior` (foyer + great-room shell, wind-up clock prop) | 4210 | `player.room == 'nguyenFoyer'` (cut-list item 1) | dry interior, `nguyen_limb` on their lanai when `hood.trees.bergQueen2.fallen` | aftermath |
| `ray_flag` | 4215 flagpole (36, −2) | `hood.houses.ray.flagUp` (down at T−24) | `flying` (cloth ∝ `uInst`) → `down` | prep |
| `ray_car` | 4215 driveway (33, 6) | `hood.trees.rayOak.fallen && fallDirDeg ∈ [200, 340]` | `intact` → `crushed` | eyewall → |
| `ray_oak` | (36.5, 4.0) | `hood.trees.rayOak.{limbsLost, fallen, fallDirDeg}` | limbs dropped one by one; `fallen`: pose `onCar` (fall dir W…NW) or `onRoof` (fall dir E…SE, back half) or `inStreet` | eyewall → |
| `ray_generac`, `ray_windowsLit` | 4215 north side (36, −6) | `hood.houses.ray.genOn` | emissive windows on | outage → |
| `ray_chainsaw_npc` | 4215 front yard | `npc:say ray` in aftermath / audio only | capsule figure at his porch | day 1 |
| `berg_ring` | 4214 front door | `hood.houses.bergstrom.ringOn` | blue LED emissive | prep–outage |
| `berg_cagePanels` | 4214 cage | `hood.houses.bergstrom.cageStage` | intact → torn → collapsed | ts → |
| `berg_shingles` (decals) | 4214 roof | `hood.houses.bergstrom.shingleLoss` | tab decals stripped from the windward slope | hurricane → |
| `berg_garageDoor` | 4214 → your back yard (−2, 12) | `hood.houses.bergstrom.garageFailed` (+ `hood.grounded[]` entry) | `closed` → `inYourYard` (front-half failure) or `inTheirDrive` (back-half failure) | eyewall → |
| `berg_ficus` | 4214 hedge line | `hood.trees.bergFicus.fallen` | upright → `overAsAWall` | ts → |
| `marcus_generator`, `marcus_strip` | 4218 porch (14, −50) | `hood.houses.marcus.genOn` / always | running (emissive, exhaust shimmer) | T+5 → |
| `denise_plywood` ×2 | 4220 windows | `hood.houses.denise.plywoodFlown` | `on` → `flexing` (∝ `uInst`) → `gone` | bands → |
| `bulb_trampoline`, `bulb_boat` | 4221 / 4223 | `hood.houses.bulb1.trampolineGone` (T−3), `hood.houses.bulb2.boatRolled` | shown → gone / rolled into the swale | hurricane → |
| `boatguy_lift` | across the pond (−95, 10) | `hood.houses.boatguy.liftTilted` | level → 30° | eye → |
| `stopSign` | entrance (32, 112) | `hood.stopSignBent` (`uStruct > 45`) | upright → flat | eyewall → |
| `mailbox` | (22.0, 8.0) | `hood.mailboxGone` (seeded 60 %, back eyewall) | shown → gone | back eyewall → |
| `bins_swale` | swale (22.3, 30) | `hood.grounded[]` entries of class `bin` | 1–3 bins lodged | bands → |
| `powerLines_down`, `pole_leaning`, `cone_onLine` | span (20, −2.5) → (32, 10) | `utilities.power.cause == 'transformer' \|\| hood.transformers.sandpiperE.failed` | drop sag → `down` (+ the cone from day 1 08:00) | aftermath |
| `tarp_*` ×3 | 4214, 4218, 4220 roofs | `hood.houses[id].tarp` (day 1 from 12:00, seeded order) | cloth plane flapping ∝ `uInst` | day 1 → |
| `kerbPile_*` (one per lot) | swale edge of each lot | `hood.debrisPileM3` (per lot share) | instanced pile scaled by m³; two piles (vegetative / C&D) from day 3 | day 2 → |
| `flyers` | mailbox post | `clock.dayIndex ≥ 3` | rubber-banded flyers | day 3 → |
| `cow_trailer` | entrance (40, 120) | `utilities.county.cowUp` | trailer + mast | day 3 → |
| `bucketTruck_main` / `bucketTruck_culdesac`, `crew_onPole`, `newTransformer` | main road (60, 130) / (26, 6) | `clock.dayIndex == 4` / `simTime ≥ restoreScheduledSim − 2 h` | staged / in the cul-de-sac with the crew on the pole | day 4 / 5 |
| `loudspeakerTruck` | street, drives the loop | `utilities.county.podOpen && !clock.isNight` (day 2) | pass-through animation | day 2 |
| `cruiser` | street | `utilities.county.curfew && isNight` | slow lap with a spotlight sweep, 2×/night | night → |
| `lastDarkHouse` (4217's windows) | 4217 | `hood.houses.bulb1.lastDark` after `power:restored` | windows stay dark; a cord across the lawn | day 5 → |
| `streetlights` ×4, `pondFountain` | §3.7 | `hood.streetlightsOn`, `hood.fountainOn` | emissive / fountain particles | — |
| `heron`, `dragonflies`, `flock`, `buzzards`, `eyeBirds` | pond bank / sky | `life.wildlife.*` | billboards | see §7 #19 |

The §12.7 entries reference these ids; a §12.7 entry whose prop is not in this table is a bug in this document.

---
## 5. The truth model — what every effect reads

The storm module publishes one record per tick, `state.local` (conditions at the house), and one derived record, `state.cues`. **No module outside `src/storm/` calls the Holland function.** Formulas and constants are the contract in ARCHITECTURE §7; this section states what they mean for the experience.

### 5.1 `state.local` (units in the name; all house-level, sim-time quantities unless marked *real*)

`uMarine` (the Holland/asymmetry value before exposure, m/s — Saffir–Simpson lives here), `uMean` (1-h running mean, m/s), `u1m` (1-min mean = "sustained", house-level: `uMarine·kExp·(1 + 0.25·(bandWind − 1))`), `uGustEnv` (deterministic gust envelope **`G·u1m·bandWind`**, G = 1.55 outside 1.4 RMW, 1.65 inside — the squall's +30–60 % gusts of M §2.3 live in the envelope, not in the mean), `uStruct` (`1.38·u1m·(0.6 + 0.4·bandWind)`, the 10-s structural gust), `uInst` (*real*, stochastic instantaneous), `uG3` (*real*, 3-s rolling max), `dirFromDeg` (10-min mean), `dirInstDeg` (*real*), `pHpa`, `dPdtHpaPerH` (60-s smoothed), `rainMmPerH`, `rainWallMmPerH[8]` (wall-equivalent rate per façade sector, `R·(max(0, U·cos(dir − n_i))/7 + 0.1)`), `rainAngleDeg` (from vertical, `atan(u1m/7)`), `rainTotalMm`, `bandRain` (0–5, includes the eyewall annulus), `bandWind` (1.0–1.5, **from the principal/outer bands only** — the eyewall's gustiness is carried by G and the mesovortex process, so `bandWind = 1` inside 1.4 RMW), `bandFrontM` (distance to the leading edge of the nearest approaching band, m; 1e6 when none), `tAirC`, `tdC`, `rhOut`, `illumLux`, `visibilityM`, `cloudFrac`, `cloudBaseM`, `eyeFactor`, `reversal`, `lightning` (`{distM, azDeg, simTime}` or null), `surgeM`, `swaleWaterM`, `streetWaterM`, `pondRiseM`, `sun {azDeg, elDeg}`, `phase`, `r` (km to the centre), `phiDeg`.

### 5.2 The cue table (the whole interface between physics and feel)

| Cue | Definition | Consumers (must cite it in their file header) |
|---|---|---|
| `windLoadPa` | `0.5·1.2·uInst²` (*real*, cosmetic) | creaks/pops rate, shutter rattle, garage-door pump *wobble*, slider bow *wobble*, cage panel bulge, ceiling shiver — **never anything that is hashed** |
| `windLoadEnvPa` | `0.5·1.2·uGustEnv²` (sim-time, deterministic) | everything structural and hashed: room pressure, door slams, `bowEnvM`, `pumpAmpEnv`, bare-glass and garage loads |
| `roar` | `clamp((20·log10(max(uInst,1)) − 18)/17, 0, 1)` → 0 at 8 m/s, 1 at 56 m/s | wind synth master gain, speech masking (TV/NWR duck), pet fear |
| `whistle` | `clamp((uInst − 25)/20, 0, 1)` | eave/soffit/shutter-gap resonators in windward rooms; dryer-vent flap |
| `debrisRate` | `0.0015·max(0, uGustEnv − 20)²·(1 + 0.6·hood.damage)` events/s (sim-time; the envelope, not `uInst`) | **the sim-side impact model** (§6.15: Poisson impacts per surface, bucket-hashed), impact audio, opening-strike hazard; the cosmetic body field visualises the same rate with `uInst` |
| `leakRate[i]` | `roof.atticWaterL[i]/τ_attic` L/h per façade (τ_attic = 10 h; the reservoir is filled while `rainWall[i] > 200` — §6.6) | ceiling stains, drips, buckets, sag; drips continue for hours after the rain because the insulation drains slowly |
| `pushForceN` | `0.6·windLoadPa·A` (A = 0.7 standing, 0.3 crouched) along `dirInst` | player controller outdoors: stagger > 30 m/s, cannot walk upwind > 45, knock-down at `uG3 > 50` |
| `earPop` | `|dPdtHpaPerH|`, thresholds 3 (noticeable) / 10 (frequent pops) / 20 (continuous fullness) | ear audio filter, door "breathing", toilet gurgle, pet |
| `powerHazard` | `(1/3600)·exp(0.11·(uGustEnv − 30))·(1 + treeFactor)` for `uGustEnv > 30`, else 0; treeFactor 0.3 overhead / 0 underground | grid failure integral, flicker/brownout rates, tower outage, the street's transformers |
| `eyeFactor` | `1 − smoothstep(0.30·RMW, 0.80·RMW, r)` | sky clearing, illuminance blend, silence mix, birds, frogs, neighbours' voices, auto-pace |
| `reversal` | `clamp((|Δdir| − 60°)/120°, 0, 1)`, Δdir = smallest angle between the 10-min `dirFrom` and the approach direction recorded when `phase` first became `ts`; smoothed over 10 sim-min | which façades leak, cage load, lanai fan, glass streak direction, debris re-mobilisation, façade audio gains |
| `heatIndexC` | Steadman/Rothfusz from `house.thermal.tInC`, `rhIn` (indoor) | sweat sheen post indoors, bed prompt, pet panting, water-drinking prompt |
| `heatIndexOutC` | the same from `local.tAirC`, `rhOut` (outdoor; ≈ 41 °C in the eye at 30 °C / 90 %, ≈ 41 on day 1) | sweat sheen when `player.outdoors`, the lanai "last cold drinks" prompt |
| `wetness` | `1 − exp(−rainRecentMm/20)`, decaying with τ 2 h under sun (elev > 20°), 8 h otherwise | surface roughness/darkening, puddles, drying stains |

The rule for engineers: **if you cannot name the scalar or event your effect reads, the effect is not allowed in the build.** `docs/audit.md` (E1, maintained through the project) maps every catalogue detail (§12) to its trigger, the state path it reads, and the test or screenshot that proves it. A detail without a proof is a bug.

---

## 6. Prep, consequence and failure — the models behind the checklist

### 6.1 The fridge notepad (the only "quest log"; it is a prop on the fridge and a mirror in the phone's Notes)

The list is in the player's handwriting with a coffee ring. Items tick themselves from state (`tasks.step` derives completion; nothing is "turned in"). Order is free. Each omission has exactly the consequence listed, produced by the models in §6.2–6.14.

| # | Task | Mechanics | Consequence of not doing it |
|---|---|---|---|
| 1 | **Shutter every window and the sliders** | Carry up to 4 panels from the garage rack (walk speed 2.6 → 1.9 m/s while carrying); place at the opening's tracks (hold `E` 2.5 s per panel, wing-nut clicks, the clock at 1×); accordion on the great slider: pull each leaf 3 s. Nuts: 68 in the can, 8 in the junk drawer. Cannot be done from outside once `u1m > 20 m/s` (the wind holds the panel; prompt "The wind has this now"). | Each unshuttered opening carries the bare-glass failure hazard (**≈ 18 % over the reference storm** vs 1.5 % shuttered; the peep window is the classic omission). Failure = glass crash, instant pressure whump, rain indoors, the room's noise floor ×3, water on the floor, attic pressurisation, and an injury roll if you are in that room without a helmet. An under-fastened panel buzzes all night and has ×(1 + 3·(1 − fastening)) hazard. |
| 2 | **Fill both tubs** (and the washer, pots, jugs) | Turn the tap (`E`, `utilities.api.water.setTap`); 12 sim-min per tub (the hold is not required — leave and come back); stops if `water.pressure < 0.3`. Tape over the drain (prop) or it seeps 10 %/day. All stored-water ledgers live in `utilities.water.containers` (§6.12). | No flushing after pressure loss (T+3 … T+12): toilets are unusable; the bucket-flush interaction is greyed "no water"; no washing; the ending card counts litres used. |
| 3 | **Bring in the lanai** — 6 chairs/table, 2 chaises, grill, 3 planters, hose reel, wind chimes, pool toys, the flag, the doormat, 2 bins | Carry one item (chairs may go into the pool: "sinks it, protects the cage"). Bins to the garage. | Every item left out becomes a debris body at its class threshold (chairs 22 m/s, planters 25, grill 30, bins 18). The grill dents Ray's truck (a text) or comes through *your* master slider (hazard ×3 on that opening). Wind chimes ring until 12 m/s then shred. |
| 4 | **Cars into the garage** | Walk the car in (10 s ride with the garage door chain rattle; no cut to black) — two cars, one fits; the second parks mid-driveway away from the palms. | The driveway car takes shingle dents, a queen-palm crown and the Bergstroms' garage door (visual + insurance photo); the car radio is a second NWR only if intact. |
| 5 | **Brace the garage door** (kit on the shelf) | Install: hold 6 s at the door's centre stile. | Unbraced failure threshold **N(57, 4)** m/s on `uStruct·cos` vs braced **N(66, 4)**: the front-RMW load is ≈ 54–55 m/s, so ≈ 35 % (Φ(−0.5)) vs ≈ 1 % in the reference front eyewall (§6.4; acceptance 30–40 % / < 5 %). Failure = noise ×3, attic pressurised, ceiling drywall lifts, insulation through the can lights, roof-damage hazard ×3, water and debris in the garage. |
| 6 | **Sandbags** (8) at the laundry–garage door and the front door | Carry one bag (1.4 m/s); stack 4 per threshold. | Street water enters the garage at `streetWaterM > 0.15` (0.27 with bags) and the foyer at 0.30 (0.42). |
| 7 | **Towels** (8, linen closet) at every threshold and slider track | Place; each absorbs 2 L then darkens and "saturates". | Intrusion pools spread across the tile (area ∝ integrated litres); slick floors; footsteps slap. |
| 8 | **Fridge/freezer to coldest, ice maker OFF, freeze 12 Ziplocs** | Dial, switch, place bags (3 h to freeze) — `house.api.setFridgeColdest / setIceMaker / addFrozenBags`; the ledger is `house.fridge.*` (§6.12). | Cold reserve: freezer 48 h unopened, fridge 4 h; each opening costs 1 h / 20 min; each frozen Ziploc +2 h (max +24). Ice maker left on → it dumps and drips into the drawer when power returns (day 5). |
| 9 | **Charge everything; find the AAs; test the NOAA radio** | Plug the phone, 2 banks, lantern, flashlight; put AAs in the radio; press WEATHER. | Phone dies in the eyewall without the banks (battery model §9.1); the radio is silent when the SAME burst comes at 03:30. |
| 10 | **Fuel the generator; fill the empty cans** | Pour from a can (19 L → 10 h run); 2 of 4 cans are full at start; the "gas station" is off-map (a T−72 backstory). | No generator later (or 20 h instead of 40). |
| 11 | **Set up the safe room** | Drag the bed-3 mattress to the hall (or the master closet), pillows, lantern, radio, water, helmets, shoes on. | Refuge quality: sleeping in the hall is uninterrupted by heat; helmets halve the injury roll; the mattress against the closet door is the "hunker" position. |
| 12 | **Insurance photos & documents** | Phone camera: one photo in each of 6 rooms; documents pouch into the go-bag. | The ending card's "documented" line; the aftermath insurance thread ("claim received") only if photos exist. |
| 13 | **Lower the pool 15 cm; pull the pump breaker** | Backwash valve (3 min sim, `house.api.setPoolValve`); breaker in the garage (`utilities.api.setBreaker('poolPump', false)`); the ledger is `house.pool.*`. | Pool overtops the lanai step earlier; the pump runs dry when the level drops and burns out (a click and a smell scalar — no caption). |
| 14 | **Text Mom and the group** | Reply choices (2–3, tone only). | Mom's texts escalate ("TEXT ME"); nothing else. |

Post-storm tasks appear on the notepad at first light: *check the roof*, *empty the buckets*, *run the generator (fridge 2 h on / 2 h off)*, *check the Nguyens' house*, *clear the driveway*, *photograph the damage*, *bucket-flush from the tub*, *charge at Marcus's*.

### 6.2 The bucket rule (applies to every failure model)

Every stochastic failure is decided per **10-sim-minute bucket** `k = floor(simTime / 600)`. The roll for component `c` in bucket `k` is `u = hash01(seed, c, k)` — the same number at any speed. A component fails in the first bucket where its cumulative hazard `H` satisfies `1 − exp(−H) ≥ u_c` (for integral-hazard components, one `u_c` per component drawn at start) or where a per-bucket probability `p_k ≥ u_{c,k}` (for per-bucket components). Hazards integrate **sim time** using `uGustEnv`/`uStruct` (deterministic envelopes), never `uInst`. Thresholds written `N(μ, σ)` are drawn once per component per seed at scenario start.

### 6.3 Power (`utilities.power`)

- Grid hazard integral `E += powerHazard·dt` (sim). **Brownout** phase when `E ≥ 0.3·E_fail` (`E_fail = −ln(1 − u_power)`): lights dim to 35 % orange for 1–3 s at random 4–12 min intervals; fridge groans; fans slow. **Outage** when `E ≥ E_fail`, or immediately when `uGustEnv ≥ 45 m/s`. Reference-storm acceptance: outage median in **T−7 … T−4**, 95 % before T−2, ≥ 3 flickers before the outage (Monte Carlo, seeds 1–200).
- **Flickers**: a 200-ms dip to 0 when `uGustEnv` first crosses 18, 22, 26, 30, 33, 36 m/s (the envelope now carries the squall multiplier, so band 2's gust front ≈ 20 m/s crosses the first thresholds around T−12), plus Poisson at rate `4·powerHazard` while the grid is up, **plus a band-gust-front channel: Poisson 0.5/h while `bandRain ≥ 1 && uGustEnv > 14`** (a distant tree on a line somewhere in the county) — this is the only way band 1 (`uGustEnv` ≈ 16) can dip the lights, and it does so in ≈ 40 % of seeds. Each flicker: TV reboots, microwave/oven clocks → blinking 0:00, UPS beeps once, A/C compressor thumps back on. Acceptance: ≥ 3 flickers before the outage in every seed (the threshold crossings alone guarantee it).
- **Transformer flash** (overhead service only): at the outage, 60 % of seeds; blue-green point light at the pole (9.0, −3.0) with a crack-BOOM 0.4 s later (distance 12 m → 35 ms, but the 0.4 s is the arc-then-bang sequence), a second pop 1.2 s later in 40 %; underground service → the feeder simply dies (no flash; the street goes dark at once). **The street's other poles** (§4.1) fail on their own hazards and flash the sky green from a distance — the T−12 … T−4 night has 1–4 of them.
- **Neighbourhood outage fraction** `county.outageFraction` is an explicit **ratcheting logistic on the county-wide gust envelope** (for which the house's `uGustEnv` is the proxy — the county is small against the storm): `f = max(f, 1/(1 + exp(−(uGustEnv − 27)/4.5)))`. Reference values: ≈ 0.1 at T−12, ≈ 0.45 at T−7, ≈ 0.93 at T−4, ≈ 1.0 at T−1 — the county loses power *before* the median house (T−5.9), which is the "lead" the previous version described in words. It drives the TV crawl numbers (`× 285 000`), meteorologist line 8 (`f > 0.3`, ≈ T−8.5), the outage-map blob and d071.
- **Ray's Generac** starts 10 s after the first of `power:lost` / `hood.transformers.sandpiperE.failed` (his house lights and coach lights on; a 30-Hz chug HRTF source). **Your generator**: placement `garage | lanai | driveway`, fuel ledger 19 L → 10 h at 50 % load, pull-start fails 1 in 3 when tank < 5 %, cords through the cracked laundry peep window (which then admits wind-driven rain at that opening) to a circuit list `fridge, fan, tv, chargers, lamp, router` (the router is on the list so `media.wifiOn` can be true on the generator — the cable itself is still dead); noise; **CO** per §6.13.
- **Restoration** (aftermath), in `clock.dayIndex` terms (Thu = 0): county fraction 0.5 at day 3, 0.9 at day 8; **your street at `dayStart(5) + 16.2 h ± 1 day`** = Tue 16:12 (overhead) or `dayStart(3) + 16.2 h ± 1 day` (underground); one house on the street stays dark (a downed service drop) — "the last dark house". At restoration: A/C thumps on, fans spin up, fridge shudders, microwave 0:00, the street cheers (a distant "whoop"), the ice maker dumps if left on.

### 6.4 Garage door (`house.garageDoor`)

Windward load `L = uStruct·max(0, cos(dirFrom − 90°))` (the door faces east); at the front RMW `uStruct` = 1.38 × 40.1 = 55.3 m/s and `dirFrom` ≈ E, so `L` ≈ 54–55. Pumping: the sim stores `pumpAmpEnv = 0.03·clamp(windLoadEnvPa·cos/2500, 0, 1)` (hashed, from the envelope) and the renderer adds the real-time wobble from `windLoadPa` (a soft whump at gust peaks, panels visibly pump 3 cm at 40 m/s); **buckle warning** at `L ≥ threshold − 2` (a crunch, tracks screech, `house:garageBuckle`); **failure** when `L ≥ threshold` in a bucket, threshold **`N(57, 4)` unbraced / `N(66, 4)` braced** (per-seed) → Φ((55 − 57)/4) ≈ 31–40 % depending on the bucket-max cosine, and Φ(−2.75) ≈ 0.3 % braced. Acceptance (ARCHITECTURE §13.6): 30–40 % / < 5 % over seeds 1–200; if the Monte Carlo lands outside, μ is re-tuned by ≤ 2 m/s and the value recorded here. After failure: the door is in, the garage is exposed (rain, debris), `house.pressure.pAtticHpa` couples to the outside (hatch bounces, ceiling lifts, insulation dust from the can lights), interior noise floor ×3 in the north wing, roof shingle hazard ×3, water at the laundry door regardless of sandbags.

### 6.5 Pool cage (`house.cage`)

24 panels, each with a normal `n_i` and a tear threshold `N(30, 4)` on its panel load `uGustEnv·shield·max(0.3, |cos(dirFrom − n_i)|)`; **shield** = 0.7 for wall panels when the wind comes over the house (dirFrom within ±60° of E), 1.0 otherwise; roof strips always 1.0. Structure collapse threshold `N(48, 4)` on `uGustEnv·shield_struct` (0.7 over-the-house, 1.0 otherwise) once ≥ 60 % of the loaded panels are gone. Six stages: 0 intact → 1 humming/bulging (`uGustEnv > 20`) → 2 first panel torn → 3 > 60 % panels gone → 4 folding (6-s scripted rotation about the leeward base line — the one place a keyframe is acceptable because structural collapse is not modelled) → 5 collapsed (beams in the pool and on the roof; `hood:debrisImpact` on the roof with 2000 J). Reference storm: panels tear through the front eyewall; the structure survives the lee (load 66 × 0.7 = 46 m/s ≈ 30 % collapse) and **folds in the first ten minutes of the back eyewall** (68 × 1.0). Weaker presets keep it; the Cat 2 preset shows the same story more slowly.

### 6.6 Openings and the water-intrusion ladder (`house.openings`, `house.floorWater`, `house.ceilingLeaks`)

- **Bare-glass failure** (unshuttered windows/sliders): per-bucket `p = 6e-4·max(0, uStruct·cos_face − 30)·(1 + 2·hood.damage)`, calibrated so the reference storm gives ≈ 18 % per bare opening; shuttered ×0.08 (panels can still be pierced, 1.5 %); impact windows ×0.03. Failure = `house:openingFailed {cause:'debris'|'pressure'}`.
- **Sliders** bow: the sim stores `bowEnvM = 0.02·windLoadEnvPa·cos_face/1000` (2–4 cm at 60 m/s envelope; hashed) when windward and unshuttered, and the renderer adds the gust wobble from `windLoadPa`; the 2×4 brace halves it and makes unlatching impossible; at `bowEnvM > 0.03` the latch pops (`house:sliderUnlatch`, 8 %/bucket) and the slider is a door in the wind. Both sliders face west, so this is a **back-eyewall** phenomenon (`reversal > 0.5`) — in the front half `cos_face ≤ 0` and `bowEnvM = 0`.
- **Water ladder** on the façade's wall-equivalent rate `rainWall[i]` (mm/h) — thresholds resolved from H §4.4 via `R_wall = R·(U·cos/7 + 0.1)`; **tiers are enumerated** as `house:intrusion {openingId, tier}`: **tier 1** slider/window track seep ≥ **60** (a dark line, then a pool 1–3 ft into the tile at 0.5 L/h per 100 mm/h excess) and door threshold fan ≥ **90** (front door; the doormat floats); **tier 2** sill weeping ≥ **170** (unshuttered) / **300** (shuttered — the shutter runs with water behind the glass); **tier 3** soffit/attic intrusion when `∫ max(0, rainWall − 200) dt ≥ 30 mm·h` on that façade (reference: the east façade crosses 200 at ≈ T−2.7 and the integral reaches 30 mm·h at ≈ T−2.2, 11:50); **tier 4** roof-deck streams once `roof.shingleLoss[slope] > 0.15` (intake ×5, insulation dust in the drip). Towels absorb 2 L each; buckets capture the drip until 10 L (overflow if ignored); sandbags raise the street-water thresholds by 0.12 m.
- **The attic reservoir** (why drips outlast the rain): while a façade is at tier ≥ 3, water enters its share of the insulation at `intakeLph[i] = 0.15·max(0, rainWall[i] − 200)·(1 + 4·roof.shingleLoss[slope])` (≈ 20–25 L on the east side through the front eyewall, more on the west in the back eyewall); `roof.atticWaterL[i]` then **drains through that façade's leak points at `rateLph = atticWaterL[i]/τ_attic`, τ_attic = 10 h** (insulation wicking), split between the façade's eligible points (the first at eligibility, the second when the reservoir doubles). So a 25-L reservoir drips at 2.5 L/h at 12:30, 1 L/h at 21:00, 0.25 L/h at noon Friday and is still darkening the ring on Sunday — "the ceiling stain that keeps growing". `stainM2 += 0.05·litres delivered`. Leak tiers (`house:leakTier {lpId, tier}`): **1** drip (< 0.5 L/h), **2** stream (≥ 0.5 L/h), **3** sag.
- **Ceiling sag** forms after **6 h of un-bucketed drip at ≥ 0.2 L/h** (`sag` 0 → 1 morph; the clock counts drip-hours from the reservoir, not rain-hours); **collapse** after **24 cumulative un-bucketed hours at ≥ 0.1 L/h** (a bucket's worth of water, insulation on the floor, daylight through the hole only if shingles are gone) — reachable only if the player never puts a bucket under the foyer or master drip, which is the point. Mildew scalar starts 24 h after any leak reaches tier ≥ 2.

### 6.7 Roof (`house.roof`)

Own architectural shingles: windward-slope loss rate `0.002·max(0, uStruct − 42)²` fraction/h; the snowbird house's 3-tab: `uGustEnv ≥ 40` (≈ T−4.3) with sheathing exposure at `uStruct ≥ 52`. The deck never fails on the player's house in Cat 3 (clips); it does on the Bergstroms' at 52 (a sheet cartwheels into the pond). Anemometer on the lanai mast: 30 % per bucket of dying once `uStruct > 45`; the console then freezes on its last reading forever.

### 6.8 Street and pond water (`local.swaleWaterM`, `streetWaterM`, `pondRiseM`)

Rain-excess bucket: drainage capacity 50 mm/h, **halved once `rainTotalMm > 80` and `u1m` has exceeded 20 m/s** (fronds clog the inlets); rise 8 cm per 25 mm of excess; drain time constant 3 h after rain stops. Swale fills first (0 → 0.8 m), then the street crown (`streetWaterM` measured above the crown), then driveways. Garage threshold 0.15 m (0.27 sandbagged), foyer 0.30 (0.42). Pond rise `∝` storm total (1.0 m at 200 mm; 1.2 max); reaches the back lot line at 1.0 (≈ T+3 in the reference), the lanai step at 1.2 (Slow Cat 1 only). Surge (`surgeM`) uses the onshore-stress filter τ = 75 min; 0 for the reference lot.

### 6.9 Cell service (`utilities.cell`)

The serving tower (3 km) has its own grid hazard (same model, own seed stream; typically fails T−7 … T−4), then **`N(3.5, 0.75)` h of battery** (H: 4–8 h is for generator-backed sites; this one has batteries only), then dark — so the tower goes dark in T−4.5 … T−0.5, median ≈ T−2.4. Three booleans drive the ladder and are physically ordered (research H: SMS and cell broadcast ride the signalling channel and are the *last* to go): **`dataOn = towerOn && !(u1m > 20 m/s for 30 min, p 0.9 per bucket)`**, **`smsOn = towerOn`**, **WEA deliverable = `towerOn`**. Ladder: `LTE` (5 bars) → `LTE2` (2 bars) at `u1m > 12` → `LTE1` (1 bar, **no data**; the radar app stalls on a stale frame, SMS still works) when `dataOn` drops → `NONE` intermittently while `u1m > 45` (tower up but the link is drowned) → `SOS` when the tower is dark → **`SOS` for ≥ 24 h** (T+36 h minimum; the county's towers are dark for days) → `1X` (a COW in the Publix lot, **`dayStart(3) + 11 h`**, Sunday 11:00, data at 1/10 speed) → `LTE1`/`LTE2` at `dayStart(4) + 9 h` → normal `dayStart(8) + 9 h`. Outbox: **the first outbound text after `cell:stateChanged → SOS`** (and every one after it) shows **"Not Delivered"** in red and goes out in a burst when a tier with SMS returns; inbound messages are held and delivered in one avalanche (41 at once on day 3, timestamped days ago; "CALL ME" from Mom). NWR always gets every product. Consequence for the Extreme Wind Warning at ≈ T−3.1: the WEA arrives in ≈ 70 % of seeds and is missed in ≈ 30 % (the tower was already dark); d102 and the ending card's "the one the phone missed" are therefore **seed-conditional** and are marked so in the soak rule.

### 6.10 Municipal water (`utilities.water`)

Pressure 1.0 until the plant/lift stations lose power (own seed, T−5 ± 2), then `exp(−(t − t0)/12 h)`: sputter and air in the lines below 0.3 (≈ T+3 … T+12), nothing below 0.05 (≈ T+12 … T+36); pressure returns over day 2 (T+36 → T+60 ramp); **boil-water notice** issued when pressure has fallen below 0.5 anywhere in the utility (T+6 … T+18) — NWR CEM immediately, text when a tier with SMS exists; lifted day 10. Tub water: 150 + 210 L = 360 L ≈ 9 days of flushing at 4 flushes/day (10 L each). Water heater: 190 L warm for ~24 h after the outage (the "last shower" prompt).

### 6.11 Indoor climate (`house.thermal`)

With the A/C dead, `tIn` relaxes toward a **target above the outdoor air** with **τ = 3 h** (never a constant rate): `tTarget = tAirC + 3.0·sealed + roofGain + 0.5·genAdjacent`, where `sealed` = 1 while the house is shuttered/closed with the A/C off (occupants, candles, the fridge's residual heat and no ventilation — H's "3–5 °C above outdoors at night"), `roofGain = 2·clamp(sun.elDeg/45, 0, 1)·(1 − 0.7·cloudFrac)` (the attic cooking the ceiling on a clear afternoon) and `genAdjacent` = 1 with the generator running on the lanai or in the garage. `rhIn → 90 %` (τ 2 h). Reference: from 24 °C at the T−5.9 outage with `tAirC` 26–27, the house is 28.5 °C by T+6, **29 °C by T+8** (the master-bed prompt, d149), 32–34 °C by day-1 noon (`tAir` 33–34 + roof gain); tile floors read 2 °C cooler (the "lie on the tile" prompt). With the box fan on the generator the *felt* heat index drops 2 °C. Windows opened after the storm (only bare ones) exchange air (τ 40 min; `sealed` → 0) and admit mosquitoes at dusk. Acceptance (ARCHITECTURE §13.6): sealed house, `tAirC` = 30, no sun, from 24 °C: 30.9 ± 0.3 °C after 6 h.

### 6.12 Cold reserve, fuel, water, batteries — **one owner per ledger**

Every physical ledger has exactly one writing module (ARCHITECTURE §3); `objects.*` keeps only placement, carry, open/closed and on/off state plus the batteries of hand-held lights. The table is the contract:

| Ledger | Lives at | Written by | Setters |
|---|---|---|---|
| Tub fills, washer, jugs, pots, bottles, taps, drain tape, `storedL` (the sum), `heaterWarmL` | `utilities.water.containers[id]`, `utilities.water.storedL/heaterWarmL` | E3 `utilities/water.js` | `utilities.api.water.setTap(id, on)`, `fillContainer(id, L)`, `drawWater(L, purpose)`, `tapeDrain(id)` |
| Fridge/freezer cold reserve, door open, coldest, ice maker, frozen bags, purge, smell | `house.fridge.*` | E3 `house/ledgers.js` | `house.api.setFridgeOpen`, `setFridgeColdest`, `setIceMaker`, `addFrozenBags(n)`, `purgeFridge()` |
| Pool level, pump, valve, colour, burnout | `house.pool.*` | E3 `house/ledgers.js` | `house.api.setPoolValve(open)`; the pump follows `utilities.power.breakers.poolPump && power.on` |
| Breakers (main, ac, waterHeater, poolPump, range, garage, kitchen, bedrooms, lights) | `utilities.power.breakers` | E3 `utilities/power.js` | `utilities.api.setBreaker(id, on)` |
| Generator fuel, gas cans, hours, circuits | `utilities.generator.{fuelL, cansL[4], hoursRun, circuits}` | E3 `utilities/generator.js` | `utilities.api.generator.*` |
| Phone battery, power banks | `devices.phone.{battery, banks[2]}` | E7 `devices/phone/*.js` | `devices.api.charge(source)`, `useBank(i)` |
| NWR batteries | `devices.nwr.batteryH` | E7 | `devices.api.nwr.setBatteries(n)` |
| Lantern / flashlight / headlamp / detector batteries | `objects[id].battery` | E1 `objects/behaviours/lights.js` | direct (own slice) |
| CO dose | `house.coDose` | E3 | — (read by `scenario/endings.js`) |

Freezer 48 h unopened, fridge 4 h; each opening −1 h / −20 min; Ziplocs +2 h each; generator 2-on/2-off routine holds the freezer indefinitely. Generator 19 L → 10 h; 4 cans = 4 nights. Phone: 2 %/h idle, 15 %/h screen-on, 25 %/h searching for signal, 8 %/h flashlight; 40 %/h on the wall while the grid or a generator circuit is up; banks 2 × 60 %; car 30 %/h on Friday. NWR: 3 × AA → 30 h; 6 spare AAs in the laundry bin. Lantern 30 h, flashlight 9 h, headlamp 12 h.

### 6.13 Carbon monoxide (`house.coPpm`) — the avoidable ending

Generator running: garage with the roll-up closed **+40 ppm/min**, roll-up open +12, lanai (< 6 m from an open opening) +3, driveway 0. Decay 5 %/min with an exterior door open, 1 %/min sealed; CO spreads to adjoining rooms along `plan.adjacency` through open doors (each open door halves the concentration per room step). The hall smoke/CO detector alarms (UL 2034 curve: 70 ppm for 60 min, 150 for 10 min, 400 for 4 min) — 4 beeps, 5-s pause, 3.1 kHz. **The dose is `house.coDose`** (E3 integrates `max(0, coPpm(player.room) − 100)·dt/60`, reading `player.room`), and `scenario/endings.js` (E1) reads it. Effects on the player: 100 ppm headache vignette pulse; 250 ppm grey vignette and slowed walk; **collapse at a 400 ppm·15 min dose (6 000 ppm·min above the 100-ppm floor → `house.coDose ≥ 4 500`)** → ending card "Carbon monoxide" (§15). The detector fires well before that, so the ending is a choice.

### 6.14 Injury (`player.injury`) — the other physical ending

Outdoors, `pushForceN/mass` is an acceleration: stagger above 30 m/s, cannot make headway upwind above 45, **knocked down at `uG3 > 50 m/s`** (view drops to crouch height, roll ±6°, 3-s recovery, crawl at 0.5 m/s downwind only). While down or outdoors above 40 m/s, the player module listens to the **sim-side impact events** of §6.15 whose surface is the player's current yard sector (`frontYard`, `backYard`, `driveway`, `street`) and rolls a hit (stream `'life'`: p 0.15 in the open, 0.05 in the lee of the house) → `injury += energyJ/400` (a frond 5 J, a shingle 20 J, a screen panel 40 J, a bin 120 J, aluminium 300 J; helmet halves it). Vision greys with `injury`; at `injury ≥ 1` the run ends with the card "You were outside when the wind came back" (§15). Reference back eyewall onset outdoors ≈ 90 s to reach 1.0 in the open, ≈ 4 min in the lee of the house — long enough to crawl back to a door; the front door cannot be opened against > 20 m/s from outside (it is a lee door in the back half, so it can). The player's injury is the only thing that depends on the cosmetic body field — and it does not: it depends on the hashed event stream, so quality tier and frame rate cannot change the ending.

### 6.15 The debris impact model (`hood/debris.js`, E3) — sim-side, deterministic, warp-exact

The old design had the renderer's particle field decide impacts; that made damage depend on the quality tier and the frame rate, and made the hash non-reproducible. Now:

- **Surfaces** (frozen ids): `roof`, every opening id of §3.4, `wall_N`, `wall_E`, `wall_S`, `wall_W`, `cage`, `pool`, `car2` (the driveway car), `frontYard`, `backYard`, `driveway`, `street`.
- **Rate per surface** (events per sim-second): `λ_s = debrisRate·exposure_s·area_s·source_s`, where `exposure_s = max(0.05, cos(dirFrom − n_s))` for façade surfaces (roof 0.6 always, yards by the side they lie on), `area_s` is the surface's area fraction of the house envelope, and `source_s` is the upwind supply from `hood.api.debrisSources()` (the Bergstrom house feeds the east side in the front half; your own cage and the pond fronds feed the west after the reversal; static in the eye: `λ = 0` while `eyeFactor > 0.8`).
- **Sampling**: at the first sub-step of each 10-sim-minute bucket `k` the model draws the bucket's impact list per surface with `hash01(seed, 'impact', surface, k, n)` (Poisson count from `λ_s·600`, then times and classes), writes it to `hood.impactQueue` (readable, sorted by `simTime`) and emits each `hood:debrisImpact {surface, class, energyJ, pos}` when the sim clock reaches it. Class and energy come from the source mix (frond 5 J, shingle 20 J, screen panel 40 J, bin 120 J, 2×4 250 J, aluminium extrusion 300 J, garage door 2 000 J). The cage's stage-5 collapse queues one 2 000-J `roof` impact.
- **Consequences** (all sim-side): opening-strike hazard (§6.6, the `× 3` grill rule uses the queued class), `hood.damage`, `hood.debrisPileM3`, `hood.grounded[]` (large bodies that stop in a named place: the Bergstrom door in your back yard, bins in the swale, a chair in the pool — the poses of §4.2), Ring "Person detected" (a `frontYard` event > 40 J), the sleep interrupt (> 40 J on a house surface), and the player-hit roll above.
- **The renderer** (`render/debris.js`) reads `hood.impactQueue` and, for each event due within its flight time at the current speed, spawns a body upwind timed to land on that surface; everything else it draws is the cosmetic wind-driven field (stream `'fx'`), which touches no state. At ≥ 300× nothing is drawn and nothing is lost.

---

## 7. Visual effects (each with its driving state; budgets per ARCHITECTURE §10)

| # | Effect | Driving state and thresholds | Notes / tier |
|---|---|---|---|
| 1 | **Sky dome** | `sun`, `cloudFrac`, `cloudBaseM`, `rainMmPerH`, `eyeFactor`, `illumLux`, `lightning` | One `ShaderMaterial`: gradient + 3 scrolling cloud layers from a 256² tileable noise texture (cirrus 1.5 km / altostratus 600 m / scud 250 m, scud speed 2× surface gust along `dirInst`); `overcast` desaturates toward #5a6068/#8a8f93, `rainMmPerH` darkens toward #4b5a5e (green-grey under the core); eye clearing radially from the zenith by `eyeFactor` with the **stadium wall**: a cylinder band 12 km up at r = 0.7 RMW lit on the sunward side; sun disc/halo by optical depth (22° halo on prep morning); stars when `illumLux < 5 && cloudFrac < 0.4`. 3 octaves under `quality=low`. |
| 2 | **Sun/sky lighting and eye adaptation** | `illumLux`, `sun`, `eyeFactor` | Hemisphere + ambient + one fitted sun `DirectionalLight` (3.0 clear → 0.15 under the eyewall); exposure lerps toward 1.0 outdoors day / 0.6 storm / 2.5 lit room / 6 dark room + flashlight / 12 candle-only with τ 2 s brighten, 0.5 s darken — stepping from the 150-lux hall into the eye's 20 000 lux whites out for two seconds. |
| 3 | **Rain** | `rainMmPerH`, `uInst`, `dirInst`, `visibilityM` | 10 000 instanced streaks (2 500 low) in a 30 × 20 × 30 m box wrapping the camera, fall (u·dir, −7), length ∝ speed, alpha ∝ rate; collapsed inside the house AABB and under the lanai roof; 400 splashes (150 low); eave curtains at R > 40 rotating toward the wind; backlit in the flashlight cone. Budget scaled by `visibilityM` (you cannot see 10 k drops in whiteout). |
| 4 | **Rain on glass** | `rainWall[facade]`, `dirInst`, `house.thermal` | Per-pane shader: droplet coverage ∝ that façade's wall rate, streak direction = gravity + wind projected on the pane (streaks run *up* the slider at 25 m/s from the W); interior fog when `tIn − tdIn < 2` with a hand-wipe interaction that re-fogs in 2 min; off when shuttered (the shutter-behind-glass look takes over). |
| 5 | **Fog / visibility** | `visibilityM` | `FogExp2`, density `3.912/visibilityM`; interior materials `fog:false`; white-out of the far end of the street at 300 m. |
| 6 | **Vegetation** | `uInst`, `dirInst`, per-tree state | Shared `onBeforeCompile` wind-bend (T §10.4): palms, hedges, grass (GPU only); queen fronds strip to debris at `uGustEnv > 28`; sabal folds up at 25; hedges saturate at 0.4 m; tree-fall swaps to a fallen pose on `hood:treeFallen` with a fall direction. |
| 7 | **Debris (cosmetic field)** | `hood.impactQueue`, `debrisRate`, `uInst`, `dirInst`, `reversal`, class thresholds | 300 CPU kinematic bodies (80 low), instanced per class (frond, shingle tab, screen panel, cage extrusion, bin, chair, felt strip, 2×4, trampoline after T−3, the Bergstroms' garage door), log wind profile + local noise, spawned upwind from typed sources; **impacts are not detected here** — the sim's impact model (§6.15) decides them and the renderer spawns a body timed to land where and when `hood.impactQueue` says (the body arrives as the event fires; the sound and the damage come from the event); static in the eye; re-mobilised the other way after the reversal; settled field baked from `hood.grounded[]` and the pile volumes when `u1m < 12` after the storm. Touches no state; stream `'fx'`. |
| 8 | **Structural motion** | `windLoadPa`, `reversal`, `house.garageDoor`, `house.openings`, `house.cage`, `house.pressure` | Garage-door oil-canning vertex shader (`z += sin(t·3 + uv.y·6)·gust·0.002`), buckle morph and failure pose; slider bow (`bow` m); ceiling drywall shiver in windward rooms (vertex noise 3 mm at `windLoad > 1500 Pa`); attic hatch lift/drop on `pAttic` spikes; screen panels bulge (`sin` dome ∝ `gust²·cos`), tear (alpha-noise threshold over 0.4 s from a corner), the cage fold (stage 4) and collapsed pose (stage 5); lanai fan blades bend upward after stage 3; the lanai screen door swings/bangs until latched. |
| 9 | **Shutters** | `house.openings[i].shuttered`, `fastening`, `windLoadPa` | Accordion: 12 blades per leaf animate over 8 s; panels: carried mesh snaps into tracks; closed → the window's `RectAreaLight` → 0, glass becomes the slat-striped shutter look with seam glow ∝ `illumLux`; rattle micro-motion ∝ `windLoad·(1 + 3·(1 − fastening))`; water runs down the inside face of a windward shutter at `rainWall ≥ 300`. |
| 10 | **Water intrusion decals** | `house.floorWater[thresholdId].litres`, `house.ceilingLeaks[lp].{stainM2, dripRate, sag}`, towels/buckets | Thin-film water shader on `CircleGeometry` decals growing with litres (0 → 1.5 m over 20 L); a fan under the front door; sill weeping streaks; ceiling stain rings (canvas radial gradients regenerated as they grow, yellow-brown, drying to rings with `wetness`); drip `InstancedMesh` timed to the plink; sag belly morph; collapse hole + insulation on the floor; towels darken; the doormat floats. |
| 11 | **Street, yard and pond water** | `swaleWaterM`, `streetWaterM`, `pondRiseM`, `uInst`, `rainMmPerH` | One water shader for the flood plane (over terrain noise so the swale fills first), puddles, the pond and the pool: scrolling normals along the wind, rain-ripple rings ∝ rate, fresnel to the sky cube; pool blue → tea-brown with the storm total; cage pieces and chairs float. |
| 12 | **Wet surfaces** | `wetness` | Roughness ×0.25 and albedo ×0.65 on upward-facing exterior surfaces and the interior floor near thresholds; dries under sun with τ 2 h. |
| 13 | **Power-state lighting** | `utilities.power.{on, brownout, flicker}`, `objects.*.on`, `generator.circuits`, `world.registry.fixtures` | **E5 owns every `THREE.Light`; E4 registers fixture *descriptors* only** (`registry.fixtures[id] = {room, pos, color, kind, windowId?}`). The compiled set is fixed at load and never changes: hemisphere + ambient + sun + **8 pooled `PointLight`s** + the flashlight `SpotLight` + **≤ 4 `RectAreaLight`s** (2 on low/SwiftShader) — 16 light objects, 14 in the fragment loops. Every fixture = grid·switch (or generator circuit); the 8 points are **allocated by priority each frame** (transformer flash > candles/lantern in the player's room > phone glow > TV bleed > fixtures of the current room > fixtures of adjacent rooms > the nearest streetlight; everything that loses the auction is emissive-only with the vertex-baked bounce × `uPowerOn`); flicker 200-ms dips; brownout 35 % orange; streetlights beyond the nearest, the pond fountain, the Bergstroms' Ring LED, Ray's windows after his Generac, the TV/phone/lantern/candle emissives; the flashlight `SpotLight` (512² shadow, cookie) is the only night shadow caster. CI: `lights ≤ 16`, `pointLights == 8`, `rectLights ≤ 4`, and no `Light` constructed after `init` (ARCHITECTURE §10). |
| 14 | **Transformer flash (yours)** | `power:transformerFlash` | 60-ms blue-green (#6bffd0) pulse ×3–6 over 0.5 s at (9.0, −3.0) from the pool's highest-priority point (intensity 300, distance 120), sprite bloom disc, sky `uFlash` tinted green, a second pop at +1.2 s in 40 %. Seen through the peep window, the nook bay (if bare), the garage man door, and as a green glow on the rain from anywhere outside. |
| 14b | **Distant transformer flash** | `hood:transformerFlash {id, pos, distM}` | No point light beyond 30 m: the sky's `uFlash` tinted green-cyan with the cloud base lit from below at the pole's azimuth (a 60–200 ms ×3–6 flicker in the dome shader), the rain briefly green on that side, that pole's houses' windows and the streetlights on its span going dark, and a thunder-like crack delayed `distM/343` s. H #42/#68: "the whole sky went green". Photosensitivity option caps it like lightning. |
| 15 | **Lightning** | `local.lightning {distM, azDeg}` | Sun light re-aimed to the flash azimuth near-horizontal, intensity 20–60 for 80–200 ms in 2–3 sub-flashes; hemisphere → bluish white; window rect lights spike; sky `uFlash`; a bolt polyline for 30 % of flashes within 15 km. Outer bands only (M §6 rates); near-zero in the eyewall. |
| 16 | **Camera** | `pushForceN`, `uG3`, `earPop`, `heatIndexC` / `heatIndexOutC`, `injury`, rain | Head bob (off under "reduce motion"), lean and lateral shoves at gust peaks outdoors, roll ±2° (±6° when down), ear-pop vignette pulse, sweat sheen when `(player.outdoors ? heatIndexOutC : heatIndexC) > 38`, tunnel darkening at `earPop > 20`, ≤ 20 screen droplets outdoors fading over 4 s inside (GPU tier only), CO grey vignette, injury grey. |
| 17 | **Post-processing (GPU tier only)** | — | Half-res bloom (0.25/0.4/0.9) so the flash and lightning bloom, vignette 0.25, grain 0.02, `OutputPass`. SwiftShader/low: no composer; DOM radial-gradient vignette. |
| 18 | **Aftermath dressing** | `phase == aftermath`, `clock.dayIndex`, `hood.*`, `utilities.county` — **every prop and its trigger is in the dressing table §4.2** | Settled debris field (≥ 150 instances from `hood.grounded[]`), shingle decals on the roof, the folded cage in/on the pool, `berg_garageDoor` in your yard, `ray_oak` on `ray_car`, `stopSign` flat, `tarp_*` on 2–3 roofs from day 1 noon (cloth planes flapping ∝ `uInst`), `kerbPile_*` growing from day 2, `cow_trailer` at the entrance on day 3, `bucketTruck_main` day 4 and `bucketTruck_culdesac` + `crew_onPole` day 5, the ceiling stain that keeps growing (§6.6), `lastDarkHouse` at night. |
| 19 | **Birds and wildlife** | `eyeFactor`, `phase`, time of day | 12–30 flocking billboards crossing the eye (seabirds circling at 200 m), grackles on the fence; a single instanced flock streaming inland at T−22 … −18; buzzards circling Friday; dragonflies over the pond on prep afternoon; frogs are audio only. |

---

## 8. Audio design (all Web Audio, fully synthesised; see A for node recipes)

### 8.1 Graph and budget

Three shared looped noise buffers (pink 4 s via the Kellet filter, brown 4 s leaky integrator, white 2 s) started at random offsets; **~34 standing nodes** (28 in `low`), one-shots created and let die; **≤ 6 HRTF panners with an eviction order** — candidates are scored every 0.5 s and the six highest hold a panner, the rest fall back to equal-power panning: (1) an alerting device (a WEA/SAME/CO alarm in progress), (2) the nearest loud machine (Ray's Generac, your generator, the condenser, a chainsaw), (3) the active leak with the highest drip rate, (4) the nearest window/opening of the player's room, (5) the NWR/TV/phone when speaking, (6) ambience sources (wind chimes, the wandering mosquito, an SMS at the phone's position). Master: bus sum → limiter (−3 dB, 20:1, 3 ms / 120 ms) → master gain 0.8 → destination. Loudness reference −18 dBFS RMS indoors in hurricane winds. Latency hint `'playback'`. Unlock on the title-screen click (plus an empty `speechSynthesis` utterance).

```
[wind W1–W6, rain R1–R4, thunder, debris, outdoor machines] → OUTDOOR SUM → 4 façade gains (N/E/S/W) → occlusion LPF → occlusion gain ─┐
[creaks, drips, hums, water, indoor rattles, pet]           → INDOOR BUS → room IR (2 convolvers A/B crossfaded on room change) ────────┤
[NWR, TV, phone, beeps]  (each through its speaker model)    → DEVICES BUS → duck −6 dB while TTS speaks ───────────────────────────────┤
                                                                                                    WORLD SUM → ear filter (§8.7) ──────────┐
[HUD clicks, menus]                                          → UI BUS (no occlusion, no panning, no ear filter) ───────────────────────────┤
                                                                                                                MASTER SUM → limiter → master
```

The ear filter sits on the world sum (outdoor + indoor + devices) only, so the UI stays crisp when your ears are full.

### 8.2 Wind (reads `uInst` smoothed: rise τ 0.25 s, fall τ 0.9 s; layers per A §2.1)

W1 rumble (brown, LPF 60 Hz; gain `((Ve−25)/30)²·0.8` above 25 m/s — the freight train you feel in the slab), W2 body (pink, BPF `80 + 6·Ve` Hz, `min(1,(Ve/20)^1.6)·0.6`), W3 hiss (white, 1.5–6 kHz, `min(1, Ve/40)²·0.15`), W4 whistle (white, BPF Q 12 sweeping 600–1400 Hz, only at gust peaks, from `whistle`), W5 howl (BPF Q 25 at `350 + 12·Ve`, `clamp((Ve−20)/30)²·0.10`), W6 flutter (pink BPF Q 3 at 250 Hz, AM 7–14 Hz square, `clamp((Ve−25)/25)·0.15`), plus the **scream** one-shot (1.5–3 kHz Q 30, 0.5–2 s) 1–3×/min above 50 m/s. Timbre targets: 13 m/s gusty hiss and fronds; 27 m/s continuous roar with constant whistle; 40 m/s deep roar, howl, continuous creaks; 54 m/s freight train + scream.

**Façade gains** (the reversal you *hear*): the outdoor sum feeds four gains panned by the player's facing; the façade the wind comes from is +4 dB, the lee −6 dB; through the eye the roar moves from the front of the house to the back.

### 8.3 Enclosure — the "where am I" filter (one LPF + one gain, retargeted over 0.3 s)

| Player situation | Cutoff | Level | Extra |
|---|---|---|---|
| Outside (driveway, yard, street) | 20 kHz | 1.0 | |
| Screened lanai / cage | 8 kHz | 0.85 | 2-kHz screen fizz for rain; pan-roof drum at 600 Hz (deafening) |
| Interior room with an exterior wall, shutters open | 1.6 kHz | 0.35 | 20–40 Hz glass thump above 35 m/s |
| Same, shutters closed | 700 Hz | 0.22 | panel rattle duplicate of W6 at 180 Hz Q 4, `0.06·gust²`, indoor bus |
| Garage | 1.2 kHz | 0.5 | roll-up door drum (§8.5) |
| Front hall, dining | 500 Hz | 0.16 | |
| **Bedroom hall, hall bath, master closet, linen, AHU closet** (no exterior wall) | 350 Hz | 0.10, −6 dB per closed door between the player and the nearest exterior wall | W1 rumble still fully audible — **the hall bath sounds safe**, which is why the player goes there without being told |

Door open/close only retargets the two params. After the outage the indoor noise floor drops from ≈ −45 dBFS to nothing and the occlusion gain is raised +4 dB for 30 s: the wind is *suddenly louder*.

### 8.4 Rain, water, drips

R1 bed (white BPF 3 kHz, `min(1, R/60)^0.6·0.35`, 4–8 Hz sheet AM), R2 roof drum (brown LPF 400 Hz, `min(1, R/80)·0.25`, dominant indoors), R3 impacts per surface (glass tick 2.5 kHz; aluminium shutter 900 Hz + 3.5 kHz ring 30 ms — rain is *louder* at the windows once shuttered; lanai screen fizz; pan roof 600 Hz), R4 wind-driven bursts (`0.2·gust²·min(1, R/40)`). Leaks: `DripSource` at each active leak point — sine 1.1–2.6 kHz τ 25 ms + 4-kHz click, 5 → 60 drips/min over 40 min, pitch **falling 20 % as the bucket fills**, a trickle layer when the leak becomes a stream. Water under the door: BPF 1 kHz AM 1–2 Hz at the threshold, a gurgle layer (250 Hz Q 5) as it deepens. Gutters warble at overflow. Pool overtopping: a sheet over the deck drains.

### 8.5 Structure and events (Poisson rates from state; one-shots reuse the noise buffers)

Creaks (sawtooth chirp 180→260 / 240→150 Hz, 6–10 Hz vibrato, scheduled at gust onsets and lulls with p 0.4 per gust > 30 m/s; louder under the roof), pops/ticks (900 Hz τ 8 ms, 1–4/min above 35, more with `earPop`), roof groans (55–75 Hz sawtooth sweep, Cat 3+), door-in-frame thuds on windward gusts (front door especially), shutter rattle impulse train 8–20 Hz above 18 m/s, slider tick, dryer-vent flap clack, attic hatch thump, weatherstrip hiss from `dPdt`, garage-door pump (pink BPF 220 Hz Q 4, AM 11–17 Hz irregular, `0.12·gust²`) escalating to bang/screech (`garageBuckle`) and a 2-s sheet-metal groan + W2 +12 dB at failure; debris impacts by class and energy (frond thud, shingle slap, aluminium ring, branch crack, bin roll); shutter strike (metal impulse at the window, HRTF); glass break (30-ms burst + 12–20 shard pings + the pressure whump = brown 60 ms at gain 1); tree crack/uproot (long); cage rip (0.5 s zip) / groan (2–4 s) / crunch and clatter; transformer (crack + sub boom + 1–3 s 60/120-Hz arc rasp + sizzle + secondary pops, distance LPF); thunder built per strike (delay `distM/343`, near crack + brown body + 2–4 rolling sub-bursts, `fc = 4000/(1+d_km)`, masked beyond 5–8 km under 20 m/s of wind and 30 mm/h).

### 8.6 Machines, appliances, the outage beat, biophony

Standing hums until the outage: A/C air handler (pink BPF 500 Hz + 120 Hz) and condenser (60/120/180 Hz + fan whoosh, HRTF at the south pad), fridge (120 + 240 + 60 Hz, 15-min/20-min cycle with a compressor clunk), ceiling fans (blade-pass AM 10.5 Hz), bathroom fan, pool pump (lanai), TV noise floor, microwave. **The outage moment**: all hums `setTargetAtTime(0, t, 0.08)`, the air handler's 2.5-s spin-down sweep 500 → 80 Hz, one fridge clunk, fans coasting 6–10 s (blade-pass LFO → 0), then conspicuous silence, then the UPS (2.8 kHz every 4 s, 0.5 s when low) until unplugged, one smoke-detector chirp. Brownouts: 100–400 ms dips to 0.3 on every hum with a 55-Hz sag. Restoration (day 5): everything at once + the microwave beep + the distant whoop.

Aftermath machines (all positioned): Ray's Generac (30-Hz sawtooth chug through a soft clip, load wobble), Marcus's portable and 3–6 more appearing T+6 … T+10 (a symphony of drones at night), chainsaws (47 Hz idle → 150–185 Hz cutting with bog, 1–3 concurrent, never seen), helicopters (two passes per hour from dawn day 1), bucket-truck reversing beepers (day 4–5), the loudspeaker truck (day 2), a police cruiser's curfew laps, car alarms triggered by debris (2–3 during the eyewall), the neighbour's generator dying at 3 a.m. and the silence after.

Biophony: crickets at dusk/night when `uInst < 10` and `R < 1` (3–4 individuals drifting in and out of sync); tree frogs and Southern toads building 20–40 min after rain stops, deafening the night after; **birds in the eye** (2–6 chirp sources when `eyeFactor > 0.6 && uInst < 8`: grackles, a mockingbird, gulls; hundreds of seabirds circling overhead visually); cicadas on prep morning; mosquitoes (600 Hz vibrato, wandering HRTF) at dusk in the aftermath; the pet (§11); neighbours' shouted lines in the eye and the street via `speechSynthesis` + captions ("You OK?", "Your cage is in my yard").

### 8.7 Ears

`earPop > 10 hPa/h`: a soft pop every 40–120 s (25-ms 6-kHz squelch) with a 0.4-s LPF dip; `> 20`: continuous muffling (master LPF 1.2 kHz) that persists until the player **swallows** (interact prompt on nothing, `E`) or 20 s after the eye's pressure steadies; in the back eyewall it reverses. The barometer photo moment coincides with the ears equalising.

### 8.8 Alert tones — exact (A §7; verified specs)

- **WEA** (phone): 853 + 960 Hz simultaneous, **2.0 s, 0.5 gap, 1.0 s, 0.5 gap, 1.0 s, 0.5 gap, then the whole sequence once more (≈ 10.5 s)**; vibration `[2000,500,1000,500,1000,500,2000,500,1000,500,1000]`; full volume even on silent; phone-speaker model (HPF 600 Hz, +6 dB @ 3 kHz, LPF 8 kHz, soft clip); rattle layer if the phone is on a counter.
- **NWR SAME**: AFSK **520.83 baud, mark 2083.3 Hz, space 1562.5 Hz, LSB-first, 16 × 0xAB preamble**, header `ZCZC-WXR-EEE-012115(-012081-012015)+TTTT-JJJHHMM-KHB32/NWS-` sent **3 × with 1-s gaps** (≈ 1.21 s per burst, rendered offline with continuous phase), then the **1050 Hz Warning Alarm Tone for 10 s**, 2 s silence, the voice, then `NNNN` × 3. Radio speaker model (300 Hz–4 kHz, +4 dB @ 1.2 kHz, hiss floor 0.01, squelch click).
- **EAS on TV**: SAME bursts through the TV model, 853 + 960 Hz for 8 s, TTS, crawl; cable force-tunes every channel for 60 s.
- Smoke detector low-battery chirp 3200 Hz 70 ms every 35 s (starts ≈ 02:00 on the aftermath night, 4 h after the outage at the earliest); CO alarm 3.1 kHz 4 beeps / 5 s; UPS 2.8 kHz; microwave 2.2 kHz; fridge-door alarm 2.7 kHz; weather-console high-wind beep 1.5 kHz at 26 m/s (58 mph); SMS two-note marimba; weather-app push three notes; low-battery 1 kHz; incoming call ring 2 s/4 s.

### 8.9 Speech

`speechSynthesis`, one manager, ≤ 200-char chunks, `resume()` every 10 s, `cancel()` on interrupts. NWR: a local male voice (espeak on Linux is closest to the old DECtalk), rate 0.92, pitch 0.85, commas for cadence, numbers in words; TV meteorologist: a different voice, rate 1.05; neighbours: rate 1.0, `volume` scaled by distance and doors on each chunk boundary. TTS cannot be routed through the graph: emulate distance with `utterance.volume` and duck the devices bus −6 dB **only while an utterance is actually playing**. **Subtitles are always on and are the source of truth**: headless Linux has zero voices, so subtitles advance at 14 chars/s; with voices they advance on `onboundary`/`onend`. Speech subtitles go through `ui.api.subtitle(deviceId, text)` — an iconed, per-device line that is **not** part of the 12-caption budget of §12.0 (`ui.api.caption` is reserved for the seven literary captions). Only one voice talks at a time, through a **priority queue**: WEA / NWR warning voice > TV event line (§9.6 g) > neighbour line > the NWR routine WEATHER cycle, which yields at chunk boundaries to anything higher and resumes where it left off; a lower-priority request waits (≤ 60 s, then shows its subtitle silently). The WEATHER cycle therefore never starves the meteorologist or Ray.

---
## 9. Devices and their content

All device screens are canvas textures on the in-world prop, mirrored to a DOM overlay when the device is raised (`Tab` for the phone; `E` on the TV/radio/console). The same drawing code renders both. Every screen state derives from `state.*`; the content below is the complete script, rendered through templates with `${NAME}`, `${COUNTY}`, times and numbers filled from state.

**The content-time rule (binding for `content/*.js`):** every item is stored with an `anchor` — either `{tRel: h}` (hours from T0) or `{event: 'storm:eyeEnter', offsetMin: 6}` (an offset from a named bus event) — and the clock string is rendered at run time. Clock times printed in this section are the reference preset's rendering. The only exceptions are calendar items: the NHC cadence (05/11/17/23 with intermediates; advisory *numbers* count from the first full advisory at or before the sim start, #21 for the reference), the garbage-day reminder (07:00 on `dayIndex 0`), and the curfew hours.

### 9.1 The phone (the HUD)

Held lower-right; raised full-screen with `Tab` (releases pointer lock; auto-pace ≤ 3×). 390 × 844 CSS px overlay; 256 × 512 canvas in-world.

- **Lock screen:** time, date "Wednesday, September 2", weather widget (temperature/condition icon from `local`), stacked notification cards, **battery %** and **signal** (`LTE ▂▄▆█`, `LTE ▂` "no data", `SOS`, `No Service`, `1x`) from `utilities.cell.state`, Wi-Fi icon (dies with the grid/cable). Battery starts at **71 %**.
- **WEA takeover:** full-screen "Emergency Alert" card, the 360-char body, OK; the cadence of §8.8 plays and the phone buzzes in the hand (or rattles on the counter); stored in Alert History. Bypasses silent. Only delivered while **`utilities.cell.towerOn`** (`state ∈ {LTE, LTE2, LTE1, NONE-transient}`; cell broadcast rides the signalling channel and survives the loss of data — §6.9).
- **Messages:** threads *Sandpiper Cove Neighbors* (40 members), *Mom*, *Tam Nguyen*, *Alert Sarasota* (county opt-in SMS), *Gulf Power & Light*, *Sarasota County Utilities*, *FL Dept of Health*. Typing indicators; the SMS marimba at the phone's position (muffled from another room); **"Not Delivered"** in red when sent without service; held inbound messages arrive in one burst with one tone; the badge counts unread. Reply choices: 2–3 canned options per prompt (tone only; §9.6 h).
- **Weather (First Alert app):** current conditions (from `local`, labelled "Sarasota-Bradenton"), an hourly strip from the *forecast* model (truth + error), **Radar**: a reflectivity loop rendered from `state.storm.bands` and the R-CLIPER field — `dBZ = 23 + 16·log10(R)` → colour ramp 5 green / 30 yellow / 45 red / 60 magenta, 6 frames over the last hour at 2 fps, county outlines, a "You" dot, grid noise and a polar-sweep artefact; **Tracker**: the NHC-style cone drawn from the *forecast* track with the error radii (§9.6 a), forecast points 12/24/36/48/72 h with S/H/M labels; **Advisories**: the current advisory text. Shows "Updated 2 h ago" and a red "No connection" bar when there is no data. *The radar is the model*: when you see the band hit the dot, it hits the house.
- **Home Station app:** mirrors the console (§9.4) — wind/gust record with the time, the 24-h pressure graph, rain total; "Sensor offline" when the anemometer dies; needs Wi-Fi → "Last update" freezes at the outage.
- **Outage Tracker ("Gulf Power & Light")** (fictional utility, no real logo): county polygons with blue circles sized from `county.outageFraction × 285 000` customers, "Customers without power", "Estimated restoration: Assessing" → a date on day 3; "Unable to connect" without data.
- **Ring:** the front-yard camera feed (a second render is *not* done — the feed is the sky-and-yard composite drawn on canvas from state: rain streaks, brightness, the transformer flash as a green frame) until Wi-Fi dies; "Person detected" events on every `hood:debrisImpact {surface:'frontYard', energyJ > 40}` (sim-side, so identical in every run); the last clip's timestamp is a detail.
- **Camera:** takes real screenshots into a gallery (the insurance task; the Nguyens' house; the ending card shows a strip).
- **Flashlight** (weak point light, 8 %/h), **Notes** (the notepad mirror), **Clock/Alarm** (the 07:00 garbage-day reminder Thursday), **Settings → Government Alerts** (Extreme/Severe/Amber toggles; Presidential cannot be disabled — accurate; the game politely discourages turning them off).
- **Battery model:** 2 %/h idle, 15 %/h screen-on, 25 %/h with no service (searching), 8 %/h flashlight; wall 40 %/h while the grid or a generator circuit is up; two banks × 60 %; Marcus's porch strip +60 % in 45 sim-min; the car 30 %/h Friday. Low-power prompt at 20 %; dies at 0 (the lock screen is the only light in the hall otherwise).

### 9.2 Television — "WGLF 7 First Alert Weather" (fictional station)

The 65" in the great room (cable; dies with the grid or before it) and the 19" kitchen TV (antenna "Air 7.1"; works on the generator). Channels: **7** local (WGLF), **5** a national weather channel (generic loop: national radar, "Tropical Update" bug), **9** a sitcom rerun with a synthesised laugh track (the 3 a.m. "why is this on" feeling), off.

- **Look:** live radar loop full-screen (the same rendering as the phone), a procedural meteorologist (a stylised figure with mouth animation on TTS boundaries; sleeves rolled after 23:00; the tie is gone by 03:00), lower-third name/title, "LIVE" bug, "HURRICANE ${NAME} — CAT 3" bug, clock/temperature bug, **the cone** from the forecast model, **the crawl** at 30 px/s along the bottom, generated from `state.alerts`, `county.outageFraction` and the shelter list. "Team coverage" cuts every 90 s: radar → cone → surge map (inundation shading by zone) → reporter card ("Sarasota Bay, live", leaning into the model's marine wind with foam) → shelters table → EOC podium (T−28 and T−9: the sheriff and the county administrator, TTS lines) → back to radar. Meteorologist lines (§9.6 g) fire on state events, never loop.
- **EAS:** on TOR/EWW the cable force-tunes every channel: red "EMERGENCY ALERT" header, the message scrolling white on red, SAME bursts + 8 s of 853/960 + TTS; programme audio ducked −20 dB; 60 s.
- **Signal loss:** the cable node has its own grid hazard (the county logistic of §6.3 evaluated 1 h early, own seed) and **40 min of battery** → typically dies ≈ T−6.5, *before* the house: the picture macroblocks (random 16-px block displacement, colour tearing) for 3 s, freezes, then "NO SIGNAL" bouncing on blue/black; audio stutters (three 80-ms pink bursts) then silence. Antenna TV: breakup at `uInst > 35` (`macroblock` ∝ `roar`), otherwise continuous — in the aftermath it carries the boil-water/curfew/POD crawl.
- **No power:** black; the standby LED dies; the kitchen TV on the generator circuit only.

### 9.3 NOAA Weather Radio (Midland-style tabletop, carriable)

16-segment LCD (canvas 128 × 64), three LEDs (green STANDBY, yellow ADVISORY, red WARNING), buttons WEATHER/SNOOZE, MENU, SELECT, ▲▼; backlight for 10 s on press or on alert. SAME set to **012115** (Sarasota); "CH 7 162.550". States: OFF → STANDBY (silent, green) → ALERT (SAME decoded: the LCD shows `HURRICANE WARNING` / `TORNADO WARNING` / `EXTREME WIND WARN`, red LED, the unit's own siren 2 s, then the WAT and the voice) → WEATHER (continuous broadcast: **station ID → current conditions synthesised from `state.local`** ("At three PM, Sarasota Bradenton Airport, heavy rain, seventy-eight degrees, wind east-southeast at forty-four gusting to sixty-eight, pressure twenty-nine point four four and falling rapidly") → the current Hurricane Local Statement → forecast → tides → the hazardous weather outlook → repeat every ≈ 6 min) → BATTERY mode when the grid is out (battery icon, dimmer backlight; 3 × AA → 30 h; the drawer has 6). The event list on the LCD keeps 24 h ("HUW 05:00 PM", "TOR 02:41 AM", "EWW 10:55 AM"). Reception: under `uInst > 45` and heavy rain, hiss rises and 0.2–0.6 s dropouts occur; the transmitter never goes off the air (it has a generator) — *the one device that never fails*. Products and SAME codes it receives (all also on the TV crawl): HUW (history), SSW (history), TOA Tornado Watch (`r < 350 km`, house on/right of track; ≈ T−13), TOR (Poisson **1/5 h** on-track in T−18 … T−4 — ≈ 3 expected, each a moment and a sleep interrupt; **1/1.5 h** right-of-track; 5–15 min lead, 30–45 min duration), HLS (within 1 h of every advisory), **EWW** (issued when `storm.api.predict()` has the eyewall annulus, r = 1.4 RMW, **reaching the coast point within 60 min** and marine Vmax ≥ 100 kt — the reference gives ≈ T−3.1, 10:55, for an annulus-on-the-coast at ≈ T−2.15; valid 3 h; **a second EWW is issued at `storm:eyeEnter` + 10 min, valid 3 h**, for the back eyewall, as NWS practice), FFW (1-h rain > 50 mm or 3-h > 100 mm), CEM curfew (T+7), CEM boil-water (when pressure < 0.5), the post-storm heat advisory (day 1).

### 9.4 Home weather-station console (kitchen counter; sensor mast on the lanai roof)

Canvas 320 × 240 LCD: wind speed and direction compass rose (10-s average and **gust with the high-of-day and its time**), **barometer** to 0.01 inHg / 0.1 hPa (1012 = 29.88; 1000 = 29.53; 980 = 28.94; 960 = 28.35; 950 = 28.05) with the NWS 3-h tendency arrow (`↑ ↓ ↓↓` from `dPdt`; "STORM" icon at a 4 hPa/3 h fall), the **24-h pressure bar graph that becomes a V**, rain rate and daily total (in/h, in), indoor/outdoor temperature and humidity, dew point, time. Updates every 60 s (sim). High-wind alarm beep at 58 mph. Battery-backed (backlight dies with the grid). The anemometer dies per §6.7 and the display **freezes on its last gust forever** — *the player's most honest instrument*. The barometer is the star of the eye: 28.05 in with `↓↓` turning to `↑↑` as the eye passes; sea-level pressure = station + 0.4 hPa for the 3.2-m site.

### 9.5 Other props with screens or states

Wall barometer in the dining room (needle tracks `pHpa`; **tapping it makes the needle jump** — people do this); thermostat (`72 / COOL` with the snowflake while the A/C runs; "— —" dead after the outage; the indoor temperature climbs on the console instead); microwave and oven clocks (blink 0:00 after every flicker; resettable; blink again on restoration); the UPS display (load %, "ON BATTERY", minutes remaining); fridge temperature display; cable modem LEDs (power/DS/US/online — "online" dies first at the node outage); smart speaker (dead); garage opener wall button (dead after the outage; the manual release cord works); Ring doorbell LED; the car dash when you park it ("9/02 10:42 AM", fuel ¾); the landline (no dial tone after the cable node dies).

### 9.6 Content (verbatim templates; the sim renders these through state)

#### (a) NHC public advisories (TV "advisory" segment, phone Advisories tab, NWR excerpts)

Advisory numbering: #21 at 05:00 Wed. Cadence: full advisories 05/11/17/23 EDT, intermediates 02/08/14/20, Tropical Cyclone Updates hourly from T−6 to T+2. The **forecast** in every product is the forecast model's output (truth + a deterministic error of 100 km at 48 h, 55 at 24 h, 30 at 12 h, direction rotating slowly with the seed) — so consecutive cones wobble and Mom texts "did you see it moved". Cone radii (2/3 probability) 26 / 39 / 52 / 65 / 78 / 91 nautical miles at 12 / 24 / 36 / 48 / 60 / 72 h.

```
BULLETIN
Hurricane ${NAME} Advisory Number  21
NWS National Hurricane Center Miami FL       AL122026
500 AM EDT Wed Sep 02 2026

...${NAME_UPPER} A DANGEROUS CATEGORY 3 HURRICANE OVER THE EASTERN GULF...
...LIFE-THREATENING STORM SURGE, DESTRUCTIVE WINDS, AND FLOODING RAINFALL
EXPECTED ALONG THE SOUTHWEST FLORIDA COAST THURSDAY...

SUMMARY OF 500 AM EDT...0900 UTC...INFORMATION
----------------------------------------------
LOCATION...23.1N 87.1W
ABOUT 410 MI...660 KM SW OF SARASOTA FLORIDA
ABOUT 375 MI...600 KM WSW OF FORT MYERS FLORIDA
MAXIMUM SUSTAINED WINDS...110 MPH...175 KM/H
PRESENT MOVEMENT...NE OR 45 DEGREES AT 12 MPH...19 KM/H
MINIMUM CENTRAL PRESSURE...955 MB...28.20 INCHES

WATCHES AND WARNINGS
--------------------
CHANGES WITH THIS ADVISORY:
None.
SUMMARY OF WATCHES AND WARNINGS IN EFFECT:
A Storm Surge Warning is in effect for...
* Bonita Beach to the Suwannee River, including Tampa Bay and Charlotte Harbor
A Hurricane Warning is in effect for...
* Chokoloskee to the Suwannee River
A Tropical Storm Warning is in effect for...
* South of Chokoloskee to Flamingo, and the Suwannee River to Indian Pass
A Hurricane Warning means that hurricane conditions are expected somewhere
within the warning area. Preparations to protect life and property should be
rushed to completion.

DISCUSSION AND OUTLOOK
----------------------
At 500 AM EDT (0900 UTC), the eye of Hurricane ${NAME} was located near
latitude 23.1 North, longitude 87.1 West. ${NAME} is moving toward the
northeast near 12 mph (19 km/h), and this motion is expected to continue
through Thursday. On the forecast track, the center of ${NAME} will make
landfall along the southwest coast of Florida Thursday afternoon.
Maximum sustained winds are near 110 mph (175 km/h) with higher gusts.
${NAME} is a category 3 hurricane on the Saffir-Simpson Hurricane Wind Scale.
Some strengthening is forecast today, and ${NAME} is expected to be a major
hurricane when it reaches the coast.
Hurricane-force winds extend outward up to 45 miles (75 km) from the center
and tropical-storm-force winds extend outward up to 125 miles (205 km).
The estimated minimum central pressure is 955 mb (28.20 inches).

HAZARDS AFFECTING LAND
----------------------
STORM SURGE: The combination of a life-threatening storm surge and the tide
will cause normally dry areas near the coast to be flooded by rising waters
moving inland from the shoreline. The water could reach the following heights
above ground somewhere in the indicated areas if the peak surge occurs at the
time of high tide...
Englewood to Anna Maria Island including Sarasota Bay...10-15 ft
Anna Maria Island to Tampa Bay including Tampa Bay...7-11 ft
Bonita Beach to Englewood including Charlotte Harbor...8-12 ft
WIND: Hurricane conditions are expected in the hurricane warning area
beginning Thursday morning, with tropical storm conditions beginning
Wednesday night.
RAINFALL: ${NAME} is expected to produce rainfall totals of 6 to 12 inches,
with isolated totals up to 18 inches, across the Florida Peninsula through
Friday. This rainfall will produce flash and urban flooding.
TORNADOES: A few tornadoes are possible Wednesday night and Thursday across
central and southern Florida.
SURF: Swells generated by ${NAME} will affect the west coast of Florida
through Friday and are likely to cause life-threatening surf and rip currents.

NEXT ADVISORY
-------------
Next intermediate advisory at 800 AM EDT.
Next complete advisory at 1100 AM EDT.

$$
Forecaster Beven
```

Subsequent advisories re-render the same template from state: #22 (11:00 Wed) 23.9N 86.3W, 335 mi SW, 115 mph, 950 mb, "...${NAME_UPPER} STRENGTHENS INTO A MAJOR HURRICANE..."; #25 (05:00 Thu) 26.1N 83.7W, 112 mi SW, 115 mph, 950 mb, "...EYEWALL EXPECTED TO REACH THE COAST BY MIDDAY..."; the **landfall update** (anchor `storm:landfall`, the reference's 13:46 Thu): "...EYE OF ${NAME_UPPER} MAKING LANDFALL NEAR SIESTA KEY FLORIDA... a National Ocean Service station at Sarasota recently reported a sustained wind of 78 mph and a gust to 104 mph ... a pressure of 951 mb (28.08 inches) was measured in the eye by a NOAA Hurricane Hunter aircraft."; 17:00 Thu "...${NAME_UPPER} MOVING INLAND AND WEAKENING..." with the observed house-level numbers folded into the "recent reports" line.

#### (b) NWR Hurricane Local Statement (first issued Tue; re-issued within 1 h of each advisory; this is the T−9 version, read by the flat voice with commas for cadence)

*(SAME: `ZCZC-WXR-HLS-012115-012081-012015+0600-2460900-KHB32/NWS-`; no WAT for an HLS unless it carries a new warning)*

> This is the National Weather Service, in Tampa Bay Ruskin, Florida. The National Weather Service in Tampa Bay Ruskin has issued a Hurricane Local Statement. This product covers west central and southwest Florida. Hurricane ${NAME} is forecast to make landfall as a major hurricane near Sarasota this afternoon. New information: an Extreme Wind Warning will be issued when the eyewall approaches the coast. A Tornado Watch remains in effect for Sarasota, Manatee and Charlotte counties until two PM. Potential impacts: wind. Protect against devastating wind having extreme impacts across coastal Sarasota, Manatee and Charlotte counties. Structural damage to sturdy buildings, some with complete roof and wall failures. Complete destruction of mobile homes. Numerous large trees snapped or uprooted. Nearly all power and communication services will be lost for weeks. Storm surge: protect against life threatening surge having extreme impacts along the coast from Anna Maria Island to Englewood. Flooding rain: protect against dangerous rainfall flooding having significant impacts across the area. Precautionary preparedness actions: now is the time to shelter in place. If you are in a sturdy structure, move to an interior room away from windows. Do not venture outside during the passage of the eye. The winds will return suddenly from the opposite direction. Emergency responders are no longer able to respond to calls until winds subside. The next local statement will be issued by the National Weather Service in Tampa Bay Ruskin around eight AM EDT, or sooner if conditions warrant.

#### (c) NWR Extreme Wind Warning (`EWW`, anchor: eyewall-on-the-coast − 60 min ≈ T−3.1, 10:55 Thu; WAT 10 s; re-issued at `storm:eyeEnter` + 10 min for the back eyewall with "the western eyewall")

*(SAME: `ZCZC-WXR-EWW-012115-012081+0300-2461455-KHB32/NWS-`)*

> The National Weather Service in Tampa Bay Ruskin has issued an Extreme Wind Warning, for Sarasota County, and Manatee County, until one fifty five PM Eastern Daylight Time. At ten fifty AM, National Weather Service Doppler radar and reconnaissance aircraft indicated the eyewall of Hurricane ${NAME}, with sustained winds of one hundred fifteen miles per hour, and gusts over one hundred forty miles per hour, was approaching the coast near Siesta Key, moving northeast at twelve miles per hour. This is an extremely dangerous and life threatening situation. Take cover now. Treat this warning as if it were a tornado warning. Move immediately to an interior room, or the lowest floor of a sturdy building, away from windows. Do not venture outside during the passage of the eye. Winds will rapidly increase again from the opposite direction.

#### (d) NWR Tornado Warning (`TOR`, WAT; issued by the Poisson rule with the time filled in)

> The National Weather Service in Tampa Bay Ruskin has issued a Tornado Warning for southern Sarasota County, until ${HHMM} AM Eastern Daylight Time. At ${HHMM}, National Weather Service Doppler radar indicated rotation in a rain band capable of producing a tornado, located near Venice, moving north at forty miles per hour. This is a dangerous situation. Take cover now. Move to an interior room on the lowest floor of a sturdy building. Avoid windows. Tornadoes in tropical systems form quickly, and may be obscured by rain.

Also generated from state: `TOA` ("A Tornado Watch is in effect for ... until two PM"), `FFW` ("Flash Flood Warning ... radar estimated four to six inches of rain have fallen ... turn around, don't drown"), `CEM` curfew and boil-water (county text read verbatim), the eye passage line ("The eye of ${NAME} is passing over portions of Sarasota County. Winds will return suddenly from the opposite direction within the hour."), the post-storm heat advisory, and routine current conditions.

#### (e) Wireless Emergency Alerts (phone; the 360-character bodies; header "Emergency Alert")

| Anchor (reference clock) | Text |
|---|---|
| T−45.0 (Tue 17:03, history) | `National Weather Service: A HURRICANE WARNING is in effect for this area. Hurricane conditions are expected within 36 hours. Complete preparations to protect life and property. Follow instructions from local officials.` |
| T−45.0 (Tue 17:03, history) | `National Weather Service: A STORM SURGE WARNING is in effect for this area. Life-threatening inundation from rising water moving inland from the coastline is expected. Follow evacuation orders from local officials.` |
| T−44.5 (Tue 17:30, history) | `SARASOTA COUNTY EMERGENCY MGMT: MANDATORY EVACUATION ORDERED for Zones A and B and all mobile/manufactured homes, effective 6 AM Wed. Shelters open at 8 AM. Zone C: prepare to shelter in place. Info: 311 or scgov.net/hurricane` |
| first `local.uMarine ≥ 17.5` + 10 min (≈ T−9.8, 04:10 Thu) | `SARASOTA COUNTY EM: Tropical storm force winds have arrived. Emergency responders are no longer able to respond to calls. SHELTER IN PLACE NOW. Stay away from windows. Do not go out during the eye.` |
| each `alert:issued TOR` (T−18 … T−4), while `towerOn` | `National Weather Service: TORNADO WARNING in this area until ${H:MM} AM EDT. Take shelter now in a basement or an interior room on the lowest floor of a sturdy building. If you are outdoors, in a mobile home, or in a vehicle, move to the closest substantial shelter and protect yourself from flying debris. Check media.` |
| `alert:issued EWW` (≈ T−3.1, 10:55 Thu), **delivered only while `towerOn` — ≈ 70 % of seeds** | `National Weather Service: An EXTREME WIND WARNING is in effect for this area for the immediate danger of life-threatening winds til ${expires} EDT. Take cover NOW in an interior room of a sturdy building, away from windows. Protect your head from flying debris. Do NOT go out in the calm of the hurricane eye! Winds will quickly become dangerous again.` |
| first FFW tagged considerable (≈ T+1), if `towerOn` | `National Weather Service: FLASH FLOOD WARNING in this area until ${expires} EDT. This is a dangerous and life-threatening situation. Do not attempt to travel unless you are fleeing an area subject to flooding or under an evacuation order. Turn around, don't drown.` |
| T+7, if `towerOn` (else SMS days later) | `SARASOTA COUNTY: A CURFEW is in effect from 9 PM to 6 AM until further notice. Stay off the roads. Traffic signals are out - treat every intersection as a 4-way stop. Downed lines are LIVE.` |
| SMS, when service returns | `SARASOTA COUNTY UTILITIES: PRECAUTIONARY BOIL WATER NOTICE in effect. Boil water for 1 minute before drinking, cooking, brushing teeth or making ice. Until further notice.` |
| SMS, day 1 → delivered day 3 | `FL DEPT OF HEALTH: Generators kill. NEVER run a generator inside a home or garage, even with the door open. Keep it 20 ft from windows and doors.` |
| SMS, day 3 | `Gulf Power & Light: Your estimated restoration time is 9/08 11:45 PM. Crews are working. Reply STATUS for updates.` |

#### (f) TV crawl lines (assembled from state; each in effect while its condition holds)

`HURRICANE WARNING: SARASOTA, MANATEE, CHARLOTTE, LEE, PINELLAS, HILLSBOROUGH` • `STORM SURGE WARNING ANNA MARIA ISLAND TO BONITA BEACH` • `MANDATORY EVACUATION: SARASOTA ZONES A & B • ALL MOBILE AND MANUFACTURED HOMES • SHELTERS OPEN 8 AM` • `SHELTERS: VENICE COMMUNITY CENTER, NORTH PORT HS, RIVERVIEW HS (PET FRIENDLY)` • `ALL STATIONS ON US-41 REPORTED OUT OF FUEL` (prep, after 12:00) • `SANDBAG DISTRIBUTION ENDS 5 PM: WELLFIELD PARK, NORTH PORT PUBLIC WORKS • LIMIT 10 PER VEHICLE` • `SARASOTA COUNTY SCHOOLS CLOSED WED-FRI • SRQ AIRPORT CLOSES 8 PM` • `SKYWAY BRIDGE CLOSED • I-75 CLOSING WHEN SUSTAINED WINDS REACH 40 MPH` (T−12) • `TORNADO WARNING: SOUTHERN SARASOTA COUNTY UNTIL ${H:MM}` (while TOR active) • `FIRST RESPONDERS SUSPEND CALLS WHEN WINDS EXCEED 45 MPH • 911 IS OPERATIONAL BUT RESPONSE MAY BE DELAYED` (T−10) • `${NAME_UPPER} NOW CATEGORY 3 • 115 MPH • PRESSURE 950 MB • LANDFALL EXPECTED NEAR SARASOTA EARLY THURSDAY AFTERNOON` • `EXTREME WIND WARNING — SARASOTA, MANATEE — TAKE COVER NOW IN AN INTERIOR ROOM • DO NOT GO OUTSIDE DURING THE EYE` • `${Math.round(outageFraction·285000)} CUSTOMERS WITHOUT POWER IN SARASOTA COUNTY • ${Math.round(state·1.2e6)} STATEWIDE • ASSESSMENT BEGINS WHEN WINDS DROP BELOW 35 MPH` • `CURFEW 9 PM–6 AM ALL OF SARASOTA COUNTY` • `BOIL WATER NOTICE: SARASOTA COUNTY UTILITIES, VENICE, NORTH PORT` • `DO NOT DRIVE THROUGH FLOODED ROADS` • `ICE & WATER DISTRIBUTION 10 AM: VENICE HS, NORTH PORT HS, TWIN LAKES PARK` (day 2).

#### (g) Meteorologist lines (TTS, fired once each by the named condition; captions always)

1. *advisory #21 on screen at start:* "Good morning. ${NAME} is a category three this morning, and the track has not moved much overnight — landfall Thursday afternoon somewhere between Englewood and Sarasota. If you're in A or B, today is the day."
2. *first band on radar (T−21):* "You can see the first outer band on First Alert Doppler off the coast now — those will start coming ashore after dark."
3. *forecast shift > 15 km at an advisory:* "The eleven o'clock has nudged the track a little ${eastOrWest} — that's a wobble, not a trend, but it matters for who gets the eye."
4. *band 1 at the house:* "That's the first band moving through the Venice area now — gusts to forty, forty-five, and this is a taste."
5. *TOA issued:* "A tornado watch is up for the whole region. These bands can spin up quickly, and you won't get much warning."
6. *first TOR:* "Tornado warning — southern Sarasota County — if that's you, interior room, now."
7. *marine TS onset (`local.uMarine ≥ 17.5`, T−10):* "Tropical-storm-force winds are on the coast. From here on, if you haven't left, you're staying. Hunker down."
8. *`county.outageFraction > 0.3` (≈ T−8.5):* "We're getting reports of widespread outages from Venice north — over eighty thousand customers now."
9. *r < 100 km:* "The eyewall is ninety minutes from the coast. This is the time. Get to your safe room and stay there."
10. *EWW issued:* "Extreme wind warning — this is the tornado-warning equivalent for the eyewall. Interior room, helmets if you have them, and do not come out in the eye."
11. *landfall TCU (`storm:landfall`):* "The Hurricane Center has ${NAME} making landfall right now near Siesta Key. If you're in Sarasota County, the eye is going to pass over you in the next hour, and I need you to hear me: when it goes calm, it is not over."
12. *eye (if the antenna TV is on):* "Some of you are in the eye right now. Enjoy the sky, take your photo from the door, and get back inside. The back side is coming, and it's coming from the west."
13. *back eyewall onset:* "And there it is — the back side of the eyewall coming ashore. This is the dirty side, folks."
14. *5 PM Thu advisory:* "${NAME} is inland and weakening, but we've still got hurricane-force gusts through sunset. Stay put."
15. *curfew:* "A countywide curfew starts at nine. Traffic lights are out. Treat every intersection as a four-way stop."
16–20 *(aftermath, antenna only):* boil-water, POD locations, "treat every line as live", the restoration estimate, "the cage guys are booked till March".

#### (h) Texts (group chat "Sandpiper Cove Neighbors" unless marked; every row has an **anchor** — a T0 offset or a named event — and the reference clock rendering in brackets; delivery per §6.9)

| Anchor (reference clock) | From | Text |
|---|---|---|
| T−43.3 (Tue 18:40, history) | Denise (HOA) | Anyone have extra plywood? Lowe's on 41 is out and the line at Home Depot is around the building |
| T−42.9 (Tue 19:05, history) | Marcus | I've got 2 sheets you can have Denise. Also tested the generator, 8 hrs on a tank so I'm rationing. If anyone needs to charge phones after, come over |
| T−40.8 (Tue 21:12, history) | Tam Nguyen | We're leaving for Orlando in the morning. Can someone keep an eye on the house? Shutters are up. Key is under the turtle |
| start + 12 min (Wed 06:12) | **Mom** | Are you SURE you're not leaving? Your cousin says the Weather Channel guy is in Sarasota and that's never good |
| T−30.5 (Wed 07:30) | Denise (HOA) | HOA reminder (last one, promise): bring in patio furniture, trash cans, and please don't leave anything in the pool cage. Insurance won't cover stuff that flies into someone else's roof |
| T−28.75 (Wed 09:15) | Linda | Lasagna at 5 if anyone wants a real meal before it gets bad. Ray's doing the last of the panels |
| T−24.2 (Wed 13:48) | Marcus | Power truck just went through. Guy said they're pulling crews at 45 mph sustained. Fill your tubs tonight |
| `hood:evacuated nguyen` + 2.4 h (Wed 15:35) | Tam Nguyen | On the road. I-75 is a parking lot at Sun City. Thanks for watching the house 🙏 |
| `storm:sunset` + 7 min (Wed 19:52) | Ray | (photo: the sunset) |
| `storm:sunset` + 8 … 25 min (Wed 19:53–20:10) | Linda, Denise, Marcus, +2 | (four more sunset photos) |
| first `storm:bandEnter` + 30 min (Wed 22:30) | Denise | Well. Shutters closed, tub full, cat is under the bed already. Rain bands are getting loud. Everybody stay safe. See you on the other side |
| first `alert:issued TOR` + 4 min (≈ Thu 01:20) | Tam Nguyen | Orlando is already getting squalls. Tornado warning in Sarasota on my phone?? Is everyone ok |
| first `hood:transformerFlash` (any pole but yours) + 4 min (≈ Thu 01:24) | Marcus | We're fine, it's south of us. The transformer on ${street} just blew, whole sky went green |
| `hood.transformers.egret.failed` + 2 min (≈ Thu 04:02) | Denise | Power's out here. Are you all out? |
| Denise's text + 1 min, only if `power.on && sandpiperE` still up (≈ Thu 04:03) | Ray | Still on. Cable went an hour ago. Weather radio says eyewall on the coast around noon |
| `power:lost` + 3 min | Ray | Transformer on Sandpiper just blew, we're dark. Genny's on if anyone needs it after |
| T−6.75 (Thu 07:15) | **Mom** | I've been up all night watching the news. TEXT ME. I don't care what time |
| `hood.houses.marcus.cageStage ≥ 3` + 5 min (≈ Thu 07:40) | Marcus | Lost the lanai cage. Pieces of it are in the pool. Something hit the garage door hard, it's bowed but holding. Everyone in your safe rooms? |
| T−4.2 (Thu 09:50), delivered only if `smsOn` | Denise | It sounds like a train. Water coming under the front door. I'm in the closet with the cat and the radio |
| T−3.1 (Thu 10:55), **held** until the day-3 burst if the tower is dark | Ray | Eyewall's on the coast per the radio. Everybody in? |
| any outbound reply after `cell:stateChanged → SOS` | **You** | *(shown "Not Delivered" in red; goes out in the day-3 burst)* |
| `storm:eyeEnter` + 6 min | Ray | In the eye. Cage is gone. Your shingles look ok from here |
| `storm:eyeEnter` + 8 min | Marcus | It's completely calm. Sun is actually out. The birds are going nuts. Second half in 20 min, other direction, DON'T go out |
| `storm:windReversal` − 3 min | Ray | WIND BACK GET INSIDE |
| T+2.5 (Thu 16:30, held) | Tam Nguyen | The house?? Ray?? Anyone?? News says Venice is underwater |
| T+3.2 (Thu 17:10, held) | Ray | Tam your house is ok from here. Shingles gone on the back side, screen cage gone, big oak is down on my car. No one can get out of the neighborhood, three trees down at the entrance |
| dayStart(1) + 7:05 (Fri 07:05) | Linda | Coffee at 7 on the porch, generator's on till 10. Bring phones |
| dayStart(1) + 8:05 (Fri 08:05) | Marcus | Generator's running 7-10am and 6-9pm to save gas. Bring phones, I've got a power strip on the porch. Also boil water notice per the county so don't drink the tap |
| dayStart(1) + 9:40 (Fri 09:40) | Denise (HOA) | Please place vegetative debris at the curb separate from construction debris. County pickup will not take mixed piles |
| dayStart(2) + 10:15 (Sat 10:15) | Ray | Publix on 41 open cash only, line to the road. No refrigerated anything |
| dayStart(2) + 14:40 (Sat 14:40) | Denise | GP&L says Tuesday for us. It's 91 in my house. Anyone want to go sit in the car with the AC on? I'll bring the Oreos I was saving |
| `cell:restore` (day 3) | **Mom** | CALL ME |
| `cell:restore` burst | (41 messages) | everything held since the tower went dark, timestamped when sent |
| `power:restored` + 1 min (day 5) | Ray | POWER!!! |
| `power:restored` + 25 min (day 5) | Linda | Hot shower. I could cry |

Rows anchored to the aftermath days use `dayStart(n)` = the midnight that begins `clock.dayIndex == n`; they are held by the cell model until a tier with SMS exists and then arrive in the burst, timestamped as above.

Reply choices (2–3 per prompt, e.g. to Mom at 06:12: "Staying. Zone C, block house, we're fine." / "I'll call you tonight." / "Mom."). Replies are logged in the journal and change nothing but Mom's next line.

#### (i) The journal (auto-written; `Q`)

Lines are written by the details engine and the alerts module at the sim time they happen, in plain past tense: "06:00 Woke up. Warning still up." "08:14 First panel on." "22:07 The lights dipped." "02:41 Tornado warning. Nothing came." "08:37 Power out." "10:15 Something hit the dining shutter." "13:19 The eye. Went out." "14:52 The cage went." "16:40 Bailing the slider track with a dustpan." "02:10 The smoke detector started chirping." "06:45 Went out to look." Chapters are the phase changes; the journal is the ending card's spine.

---
## 10. The player and every interactable object

### 10.1 Controls and body

| Input | Action |
|---|---|
| Mouse (pointer lock) | Look. FOV 70° (70–100 in options). |
| `W A S D` | Walk 2.6 m/s; `Shift` sprint 4.5 m/s (not while carrying); `C` crouch 1.3 m/s, eye 1.0 m (needed to look under the bed, to sit in the hall tub, to crawl when down). No jump. |
| `E` | Interact / hold-to-interact (progress ring; the clock at 1×). |
| `F` | Flashlight / headlamp toggle (when owned and charged). |
| `Tab` | Raise/lower the phone. `Q` journal & notepad. `Esc` pause. |
| `Z` | Sleep / wait at a valid prop. `N` skip to next event (confirm). `[` `]` speed step; `T` auto-pace toggle. `F3` debug overlay. |

Capsule r 0.3 m, h 1.75 (1.1 crouched), step-up 0.2 m (slab edge, lanai step, porch step), capsule-vs-AABB with a 2-m grid broadphase (≤ 60 boxes after broadphase), low props (< 0.45 m) are stepped over. Head bob (off under *reduce motion*). Footstep audio by floor material and `floorWater` (slaps on wet tile).

**Outdoors in wind** (`pushForceN` along `dirInst`): lean and a 0.3-m lateral shove at gust peaks; stagger above 30 m/s; no headway upwind above 45; **knock-down** at `uG3 > 50` (3-s recovery, crawl 0.5 m/s downwind only); injury per §6.14. Rain reduces the effective view via the droplet layer; the flashlight cone is full of streaks.

**Doors in wind** (exterior doors, per T §9, resolved): the inswing front door **slams open at gust > 25 m/s if unlatched**; **cannot be opened against > 20 m/s** (2° strain animation, prompt "The wind is holding it shut"); opening *into* the wind at > 30 m/s **rips it from the hand** (`house:doorRipped`, a bang, the door flails until re-caught with a 6-s hold); the lanai screen door bangs at 12 m/s until latched. Interior doors: unlatched doors drift/slam with `|ΔP_room| > 40 Pa`; latched doors rattle and breathe with `dPdt`; a latched door between the player and the pressurised attic/garage is hard to open (hold 2 s) after a garage failure.

**Carry**: one item in the hand socket (or a stack ≤ 4 panels / ≤ 2 sandbags); walk speed 1.9 (panels), 1.4 (sandbags), 2.2 (other). Place shows a ghost at valid sockets. Pockets hold small stacks (wing nuts, AAs, tape, keys).

### 10.2 The object table (every interactable; `objects.catalog.js`; `verb(state)` and `use()` per ARCHITECTURE §6.9)

| Object (count, room) | Verb(s), hold time | State written (owner setter) | What it changes / consequence |
|---|---|---|---|
| Shutter panels (19, garage rack) | Take (stack ≤ 4) → Place at an opening's tracks (2.5 s each) | `house.api.placePanel(openingId, nuts)` | `openings[id].shuttered`, `fastening`; darkness, transmission, rain-on-glass off, failure hazard ×0.08; blocked when `u1m > 20`. |
| Wing nuts (68 can + 8 drawer) | Take | pockets | Without enough nuts a panel is under-fastened (buzz, hazard ×(1+3(1−f))). |
| Accordion shutter (great slider, 2 leaves) | Pull closed / open (3 s per leaf, from the lanai) | `house.api.setShutter('slider_great_W', bool)` | As above. |
| 2×4 slider brace | Install / remove (4 s) | `openings.slider_great_W.braced` | Bow ×0.5; cannot unlatch. |
| Garage door brace kit (shelf) | Install (6 s at the door) | `house.garageDoor.braced` | Threshold 51 → 60. |
| Garage roll-up | Open/close (motor while `power.on`; manual release cord then lift 4 s) | `openings.door_garage_roll.open` | Debris/water exposure; must be closed for the cars. |
| Cars (2) | Drive into the garage (10-s ride) / park mid-driveway | `objects.car1/2.pos` | Protection; garage fills; car radio (NWR) and charging Friday. |
| Sandbags (8) | Take (≤ 2) → Stack at a threshold socket | `openings[door].sandbagM` (+0.03 each, max 0.12) | Street-water thresholds. |
| Towels (8, linen) | Take → Place at a threshold/track socket; wring out in a sink (resets 2 L) | `openings[id].towelsL` | Absorb 2 L each; darken. |
| Buckets (3) + stockpot | Place under a leak point; empty into a tub/sink (or the lanai) | `ceilingLeaks[lp].bucket`, `bucketL` | Captures drips (pitch falls as it fills); overflow at 10 L. |
| Tub taps (hall, master) | Turn on / off | `utilities.api.water.setTap('tubHall'|'tubMaster', on)` → `utilities.water.containers[id].fillL` | 12 sim-min to full; needs `water.pressure ≥ 0.3`. Drain tape (`tapeDrain`) prevents 10 %/day seep. |
| Toilets (2) | Flush (uses 10 L from the tank once, then from a bucket/tub if stored water exists) | `utilities.api.water.drawWater(10, 'flush')` | Greyed "no water" otherwise; gurgle on `earPop`. |
| Kitchen tap / jugs (6) / washer / pots | Fill (while pressure > 0) | `utilities.api.water.fillContainer(id, L)` (+3.8 per jug, +60 washer) | Sputters to air as pressure dies. |
| Fridge / freezer | Open/close; dial coldest; ice-maker switch | `house.api.setFridgeOpen / setFridgeColdest / setIceMaker` → `house.fridge.*` | Each open costs the reserve; the smell after 30 h; the drip at restoration. |
| Ziploc bags (12) / water bottles (24) | Place in the freezer (+2 h each) / take & drink (resets the heat-drink prompt) | `house.api.addFrozenBags(n)`; `objects.bottles.count` | |
| Microwave / oven clocks | Set time (3 s) | `objects.microwave.extra.clockSet` (E1; reset to false by `power:flicker`) | Blink 0:00 after every flicker. |
| Coffee maker | Brew (only with power; 4 sim-min) → thermoses | `objects.thermos_1.extra.hot` | The last pot at 08:30 Thursday is a moment for the player, not the model. |
| Phone chargers / power banks (2) | Plug phone; use bank | `devices.api.charge('wall'|'bank'|'marcus'|'car'|null)`, `devices.api.useBank(i)` → `devices.phone.{battery, banks}` | §9.1. |
| Generator | Wheel out (to lanai / driveway / garage), fill (from a can, 20 s), pull-start (3 pulls; fails 1 in 3 when tank < 5 %), stop, plug cords to the circuit list | `utilities.api.generator.{place, fuel, pull, stop, plug}` | Circuits live; fuel ledger; noise; **CO** §6.13. |
| Gas cans (4) | Take / pour into the generator or the car | `utilities.api.generator.fuel(canIndex)` → `utilities.generator.cansL[i]` | |
| Breaker panel | Flip: main, A/C, water heater, pool pump, range, garage, kitchen, bedrooms, lights | `utilities.api.setBreaker(id, on)` → `utilities.power.breakers` | Pool pump off = no burnout; water heater off = the reserve stops warming; nothing else after the outage. |
| Front door | Open/close/lock (wind rules §10.1) | `house.api.setDoor` | Transmission, water path, pressure coupling. |
| Garage man door, laundry–garage door, interior doors (12), sliders (2), screen door | Open/close/latch | `house.api.setDoor` | Occlusion, pressure, refuge; the mattress-against-the-closet-door needs the door closed. |
| Mattresses (bed 3's, the guest single) | Drag to the front hall / bedroom hall / closet socket (slow, 0.9 m/s) | `objects.mattress.socket` | Sleep locations; refuge quality. |
| Beds (3), sofa, hall mattress, hall tub (crouch), chairs, the front step | Sleep / wait / sit | `player.sleeping`, `clock.sleepUntil` | §2.5; the front step in `aftermath` ends the game. |
| Helmets (2), shoes | Wear | `player.helmet`, `shoes` | Injury ×0.5; shoes: no glass cuts on a failed-window floor (a limp for 10 min otherwise). |
| Lanai furniture (6), chaises (2), grill, planters (3), hose reel, wind chimes, pool toys, flag, doormat, bins (2) | Carry to the garage / sink in the pool / bring inside | `objects[id].secured` | Removed from the debris source list. |
| Pool valve / breaker | Backwash 3 min; breaker | `house.api.setPoolValve(open)` → `house.pool.levelM`; `utilities.api.setBreaker('poolPump', on)` | Overtop timing; pump burnout smell scalar. |
| TV (2), remote | Power, channel (7/5/9), volume, mute | `devices.tv` | §9.2. |
| NOAA radio | Take/carry, power, volume, channel, SNOOZE, batteries | `devices.nwr` | §9.3; carriable into the hall. |
| Weather console, wall barometer (tap), thermostat, UPS (unplug), modem, smoke/CO detector (silence from a chair; pull the battery), smart speaker | Read / tap / silence | `devices.*`, `objects.detector.battery` | §9.4–9.5; pulling the detector's battery removes the chirp *and* the CO alarm (a real trade-off). |
| Lamps (6), switches (14), ceiling fans (5), bathroom fans | Toggle | `objects[id].on` | Light/audio; nothing after the outage except on generator circuits. |
| Flashlight, headlamp, lanterns (2), candles (4), lighter | Take, place, toggle | `objects[id].{on, battery}` | Light sources; candles blow out in a draught (open door + wind > 8); a candle left under nothing for > 4 h unattended gets a warning caption? No — it simply gutters out (no fire model). |
| Attic hatch (hall ladder; garage pull-down) | Pull down and look (prep and aftermath only; blocked when `u1m > 15`) | `objects.atticHatch_hall.open` / `objects.atticPulldown_garage.open` (mirrored by `house.api.setAttic`) | Wet insulation, daylight through nail holes after shingle loss. |
| Documents pouch, go-bag, insurance folder, photo frames | Take / look | `objects.docs.inBag` | Ending card completeness. |
| Notepad (fridge), paperback, cards | Read (tick items) / read 20 min / play 20 min | diegetic skips | §2.5. |
| Wine bottle | Pour | nothing | No judgement. |
| Pet: Biscuit | Call, pet, pick up/carry, leash, feed (bowl), walk (only `u1m < 12`) | `life.pet` | §11. |
| Ray (across the street) | Talk (only when `u1m < 20`, both outdoors) | `life.neighbours.ray.lines` | Phase-keyed lines via TTS + caption. |
| The Nguyens' house (aftermath) | Take the key from under the turtle; enter the foyer/great room (look verbs); photograph; send | `tasks`, gallery | The "checked on the house" task; Tam's reply. |
| Marcus's porch strip (aftermath) | Charge (45 sim-min wait) | `devices.phone.battery` | +60 %. |
| Ray's chainsaw / tarp / rake (aftermath) | Use (clear the driveway 10 min; tarp the den ceiling from inside 3 min; rake) | `tasks` | Aftermath tasks. |
| Window (bare, aftermath) | Open for a breeze | `openings[id].open` | Air exchange τ 40 min; mosquitoes at dusk. |
| Fridge purge (aftermath, hour 30) | Bag the contents (2 min) | `house.api.purgeFridge()` → `house.fridge.purged` | The smell scalar stops growing; bags at the kerb. |

**Emergent consequences the object model guarantees:** shuttering only the east side means the sliders take the back eyewall bare; forgetting the peep window leaves an 18 % chance of a laundry-room crash; filling both tubs gives 360 L ≈ 9 days of flushing; a generator on the lanai with the cords through the cracked peep window lets wind-driven rain in at that window; sinking the chairs protects the cage panels from *those* chairs but not from the Bergstroms' door; pulling the detector battery to stop the chirp disables the CO alarm.

---

## 11. Biscuit and the neighbours

### 11.1 The pet (`life.pet`; dog *default*, cat optional; one FSM, two prop meshes and sound sets)

`fear ∈ [0,1]` is a **relaxation model, not an integrator** (the previous integrator saturated at panic within a minute of hurricane winds): `fear → target` with τ = 60 s real (τ = 20 s while `carried`/`leashed`), `target = 0.55·roar + 0.25·(1 − shutteredFraction)·whistle + 0.1·(isNight && !power.on)`, clamped to 1; **impulses** add instantly: +0.3 per `hood:debrisImpact` > 40 J on a house surface, +0.4 per `alert:wea` tone, +0.2 per `storm:lightning` < 3 km, +0.5 per `house:openingFailed`/`house:garageFailed`; petting subtracts 0.01/s. So in steady hurricane winds she sits at `hide` (target ≈ 0.6) and **panics only when an impulse pushes `fear > 0.85`**, then decays back to `hide` in ≈ 90 s. States: `sleep` → `watch` (stares at the slider when `uInst > 6`, tail flick) → `alert` (`fear > 0.3`: pacing between the player and the hall) → `hide` (`fear > 0.5`: under the master bed; the cat: the hall tub) → `panic` (bolts, yelps/yowls; **never wakes a sleeping player** — the impulse events are themselves the sleep interrupts, and `life.update` does not run during sleep, so on waking she is in `hide` with `fear` recomputed from the events that fired) → `carried`/`leashed` (the purr/pant is audible) → `eye` (`eyeFactor > 0.6 && uInst < 8`: **appears at the great-room slider looking out**, then follows the player outside; hides again at the first back-side gust) → `eat` (bowl) → `sleep` (aftermath, on the tile). **She relocates only when unobserved** (not in the camera frustum for > 5 s) — you find her somewhere new. Panting rate ∝ `fear`; a whine at `fear > 0.6` every 40–90 s (never more than one whine channel); she lies on the tile at `tInC > 28`. Needs: feed twice a day (the bowl), a walk in a lull (only `u1m < 12`); unmet needs only produce whining. Nothing bad can happen to her; she is under the bed when the window fails. Acceptance: over the reference storm at 1× the pet is in `panic` for < 8 % of the hurricane-wind minutes and never for more than 3 min continuously.

### 11.2 Neighbours (`life.neighbours`)

Exist as texts (§9.6 h), voices (TTS through walls and across the street when `u1m < 20`), lights (Ray's Generac windows), props (the minivan leaving, the flag coming down, plywood flapping), and machines (generators, chainsaws). Ray's lines by phase: prep ("You staying? We've got the generator if you need it after."), band gap ("That one had some teeth."), eye — from his porch ("Don't get comfortable. Forty minutes, maybe."), aftermath ("Your cage is in my yard. Coffee's on."). Neighbour NPC meshes are simple capsule figures shown only at their porches and the street in `prep`, `eye` and `aftermath`, never walking to you.

---

## 12. The little-details catalogue

Rules: each entry has a stable id (`d001`…), a trigger written against state paths or bus events, fires **once** unless marked *(repeat)*, and is presented by the named channel — **world** (geometry/props), **fx**, **audio**, **device** (phone/TV/radio/console), **pet**, **light**, **caption (C)**. The details engine evaluates predicates at 4 Hz in sim time and emits `detail:fired {id}`; the presenting module owns the effect and the journal line. Only the entries marked **C** may show text; there are 7 of the 12 permitted. `docs/audit.md` proves each.

**Trigger discipline (new in 1.1):** triggers are written against **sim-time envelopes** (`uGustEnv`, `windLoadEnvPa`, `u1m`, `uMean`) wherever the detail is a fact about the storm, so the fired set is identical across runs and quality tiers and can be hashed. An entry that genuinely depends on the player or on real-time turbulence carries a tag — **`[P]` playerDependent** (reads `player.*`, `interact:*`, `objects[*].open` by the player) or **`[R]` realtime** (reads `uInst`, `uG3`, `windLoadPa`, `dirInstDeg`) — and tagged entries are excluded from the state hash and from the soak's ≥ 95 % rule; **`[S]` seedConditional** marks entries that fire in some seeds by design (they are excluded from the 95 % rule but must fire in ≥ 20 % of seeds). Every state path in a trigger must exist in ARCHITECTURE §3 or the ID registry (§16); `details.test.js` walks them.

### 12.0 The captions (the complete list)
C1 `d020`, C2 `d066`, C3 `d093`, C4 `d129`, C5 `d118`, C6 `d139`, C7 `d112`.

### 12.1 Prep day (Wed 06:00 → 20:00)
- **d001** The TV is already on with the 5 AM advisory; the remote is on the bed — `clock.simTime == start` *(world/device)*
- **d002** A/C hum; the fridge cycles; the coffee pot is warm, brewed at 05:45 — `simTime < Wed 09:00 && power.on` *(audio/world)*
- **d003** Hazy sun with a **22° halo**; cirrus fanning from the SW — `phase == prep && local.cloudFrac < 0.4 && sun.elDeg > 20` *(fx)*
- **d004** Hard white glare, cicadas, a lawn mower somewhere far off — `phase == prep && sun.elDeg > 30` *(audio)*
- **d005** Mom, 06:12: "are you SURE" — `simTime ≥ Wed 06:12` *(device)*
- **d006** The notepad list in your handwriting with a coffee ring — `objects.notepad.read` *(world)*
- **d007** The subdivision soundscape: drills, wing nuts, aluminium panels clattering from three directions — `phase == prep && any(hood.houses[*].shuttering)` *(audio, repeat)*
- **d008** [P] Ray walks over: "You staying?" His panels are already up — `tRel ≥ −28 && player.outdoors && u1m < 10` *(world/audio)*
- **d009** The Nguyens' minivan leaves; the bikes vanish from the lawn; a text from the road — `hood.houses.nguyen.evacuated` *(world/device)*
- **d010** [P] One panel on the rack has "4210" in Sharpie — the Nguyens' — `player.lookingAt == 'panelRack'` *(world)*
- **d011** [P] The wing-nut can rattles short; the bag in the junk drawer says "shutter" — `objects.junkDrawer.open` *(world)*
- **d012** A room goes dusk-dark at noon as its panels go on; a lamp is needed — `openings[id].shuttered && sun.elDeg > 0` *(light, repeat per room)*
- **d013** Striped shutter-slot light on the floor that flickers with passing debris — `openings[id].shuttered && illumLux > 500` *(light)*
- **d014** The pool waterline ring 15 cm down the tile — `house.pool.levelM ≤ −0.15` *(world)*
- **d015** [R] Wind chimes: pleasant, then frantic, then audible from inside — `!objects.windChimes.secured && uInst > 5` *(audio, repeat)*
- **d016** [R] The flag wraps its pole — `hood.houses.ray.flagUp && uInst > 10` *(fx)*
- **d017** The Bergstroms' Ring doorbell blinks blue all night — `power.on` *(light)*
- **d018** The pond fountain across the water — `power.on` *(world/audio)*
- **d019** Dragonflies swarm over the pond; a heron on the bank — `phase == prep && simTime > Wed 15:00` *(fx)*
- **d020 (C1)** [P] First time outdoors in the easterly: *"The wind smells of the pond."* — `player.outdoors && u1m > 6` *(caption)*
- **d021** The milky sky; the sun is a disc you can look at — `tRel ∈ [−25, −20] && cloudFrac > 0.7` *(fx)*
- **d022** [P] Heat shimmer on the driveway — `tAirC > 31 && sun.elDeg > 40 && player.outdoors` *(fx)*
- **d023** [R] Hot, heavy stillness between gusts; the pool surface glassy; a gust out of nowhere — `tRel ∈ [−26, −20] && uMean < 4 && uG3 > 9` *(audio/fx)*
- **d024** Birds frantic and loud in the morning, then oddly absent; pelicans stream inland over the pond — `tRel ∈ [−22, −18]` (flock) then `tRel > −19` (silence) *(fx/audio)*
- **d025** The 11 AM advisory shifts the cone; Mom: "did you see it moved" — `alerts.advisories.last.shiftKm > 15` *(device)*
- **d026** The crawl: "ALL STATIONS ON US-41 REPORTED OUT OF FUEL" — `phase == prep && simTime > Wed 12:00` *(device)*
- **d027** Linda's lasagna text at 09:15; Ray & Linda's porch light on at dusk — `simTime ≥ Wed 09:15` *(device/light)*
- **d028** The first dark band as a line on the SW horizon — `tRel ≥ −21 && cloudFrac > 0.6` *(fx)*
- **d029** The sunset — cirrus lit orange-red; five photos in the group chat — `storm:sunset` with `tRel ∈ [−19, −17.5]` (the reference sunset is T−18.25; the photos follow the event by 7–25 min) *(fx/device)*
- **d030** The freezer bottles clink as they freeze — 3 h after placing *(audio)*
- **d031** Garage full: bins, chairs, the grill; the car nose-in; the driveway empty — task completion *(world)*

### 12.2 Outer bands and the night (Wed 20:00 → Thu 04:00)
- **d032** Rain arrives as a visible curtain up the street — `local.bandFrontM < 300` (band edge geometry) *(fx)*
- **d033** Rain starts in a rush with a gust front; the console drops 3 °C — `bandRain crosses 1 first time` *(fx/device)*
- **d034** Distant lightning to the SW with no thunder (the "heat lightning" look) — `local.lightning.distM > 15000 && clock.isNight` *(fx)*
- **d035** Thunder delayed by distance; inaudible under > 15 m/s beyond 6 km — every `storm:lightning` *(audio)*
- **d036** First flicker: lights dip 200 ms, the TV reboots, the microwave blinks 0:00, the UPS beeps once, the A/C compressor thumps back on — `power:flicker` *(light/audio/device, repeat)*
- **d037** Between bands: brightness ×3, steam off the street, the pool overflowing into the deck drains — `bandRain < 0.2 after > 1` *(fx)*
- **d038** Wet street glistening under the streetlights between bands — `wetness > 0.5 && rain < 1 && clock.isNight && power.on` *(fx)*
- **d039** Orange-grey lulls; frogs return between bands, quiet inside them — `phase == bands && rain < 2 && clock.isNight` *(audio, repeat)*
- **d040** Streetlights flicker; one lights early in a dark band (photocell) — `illumLux < 40 && sun.elDeg > 0` *(light)*
- **d041** The meteorologist's sleeves are rolled by 23:00; the tie is gone by 03:00 — `devices.tv.on && clock` *(device)*
- **d042** The sitcom channel's laugh track at 23:50 — `devices.tv.channel == 9` *(device/audio)*
- **d043** The Tornado Watch crawl; "these bands can spin up quickly" — `alerts.active has TOA` *(device)*
- **d044** The first WEA: every phone in the house shrieks slightly out of sync (yours, and the Bergstroms' forgotten tablet through the wall) — `alert:wea` *(audio/device)*
- **d045** [P] The first night WEA lights the bedroom ceiling if you are asleep — `alert:wea && player.sleeping` *(light)*
- **d046** SAME bursts wake the radio in the small hours — first `alert:nwr` with `wat` while `clock.isNight` *(audio/device)*
- **d047** The first transformer flash down the street (not yours) lights the rain and the cloud base green; that pole's span goes dark — first `hood:transformerFlash` (§4.1; 1–4 per run) *(fx/light)*
- **d048** The recycle bin you forgot goes over, then travels down the street and lodges in the swale — `!objects.bin_recycle.secured && uGustEnv > 18` (→ `hood.grounded[]` entry `bins_swale`) *(fx)*
- **d049** The cage screens hum at a rising pitch with each gust — `house.cage.stage ≥ 1` *(audio, repeat)*
- **d050** [R] The screen door bangs until you latch it — `uInst > 12 && !cage.doorLatched` *(audio, repeat)*
- **d051** Blind cords swing; the nook bay bows — `house.pressure.dpRoomPa.nook > 150` *(fx)*
- **d052** Water runs *up* the bed-2 window glass (bare) or streaks up the outside of its shutter — `rainWall[E] > 60 && uGustEnv > 25` *(fx)* — the east windows are windward in the front half; the sliders' turn is d136
- **d053** Glass sweats inside; the tile is slick at the sliders — `tdC > 24 && !hvacOn` *(fx)*
- **d054** [R] The dryer-vent flap clacks; a loose panel buzzes all night (you can't tighten it from inside) — `uInst > 18` / `fastening < 1` *(audio, repeat)*
- **d055** The Bergstroms' screen panels tear and flap; one lands in your yard — `hood.houses.bergstrom.cageStage ≥ 2` *(fx)*
- **d056** [S] A neighbour's plywood flaps, then flies — `hood.houses.denise.plywoodFlown` (`uGustEnv > 33`, seeded) *(fx)*
- **d057** [S] Ray: "Still on. Cable went an hour ago." — the §9.6 h row (only if Ray's poles are up when Denise's dies) *(device)*
- **d058** The phone drops to one bar with no data; the radar never finishes loading — `cell.state == LTE1` *(device)*
- **d059** The car alarm down the street runs its 30-s cycle in gusts (max 3) — `uGustEnv > 22` *(audio)*
- **d060** Biscuit stares at the slider, tail flicking — `life.pet.state == watch` *(pet)*

### 12.3 Tropical-storm winds (Thu 04:00 → 10:00)
- **d061** The roar's *pulse* with each gust; a hose-like sound at the eaves; small twigs on the driveway — `u1m > 17` / `uGustEnv > 25` *(audio/world)*
- **d062** Organ-pipe whistles start in the windward rooms; the range-hood vent flap clacks — `cues.whistle > 0` *(audio)*
- **d063** Shingles tick on the roof, then thrum; something slides — `u1m > 25` *(audio)*
- **d064** Queen-palm fronds strip one by one and skid down the street — `uGustEnv > 28` *(fx)*
- **d065** The sabal palm folds up like a closed umbrella — `u1m > 25` *(fx)*
- **d066 (C2)** The first ear pop: the mix closes and clicks open — *"—pop—"* — first `house:earPop` *(audio/caption)*
- **d067** Hedges lie flat; the ficus wall next door goes over — `u1m > 22` / `uGustEnv > 35` *(fx)*
- **d068** Flickers cluster in gusts; brownouts dim the lights orange; fans slow audibly — `power.brownout` *(light/audio)*
- **d069** The bed-2 window sill weeps (bare) or the shutter runs with water behind the glass (shuttered); the first towel on that sill darkens — `house:intrusion {win_bed2_E, tier 2}` *(fx)*
- **d070** The swales fill; the mailbox post stands in water; the inlet gurgles then backs up — `swaleWaterM > 0.1` *(fx/audio)*
- **d071** The TV crawl's customer count passes 80 000 and the meteorologist says so; the outage map's blob swallows Venice — `county.outageFraction > 0.3` *(device)*
- **d072** **The outage**: the A/C stops mid-breath, the fridge stops, the fans coast 20 s, the router dies, the UPS screams until unplugged, the smoke detector chirps once, and the wind is suddenly louder — `power:lost` *(audio/light/device)*
- **d073** Through the peep window: the blue-green flash lights the rain; crack-BOOM 0.4 s later; sometimes a second pop — `power:transformerFlash` *(fx/audio)*
- **d074** Ray's Generac cranks and hums 10 s later; his windows are the only light on the street — `power:lost + 10 s` *(audio/light)*
- **d075** The pond fountain stops; the streetlights die; the Bergstroms' Ring goes dark; the subdivision is black — `power:lost` *(world/light)*
- **d076** Phone flashlights, then lanterns; the "who has the lighter" scramble — `!power.on && illumLux(room) < 5` *(light)*
- **d077** The thermostat screen is blank; the console's indoor temperature starts climbing — `!power.on` *(device)*
- **d078** The tile is cool; Biscuit lies on it — `tInC > 28` (≈ T+5 with the sealed-house offset of §6.11) *(pet)*
- **d079** Warm showers for ~24 h: the "last shower" — `water.heaterWarmL > 0 && !power.on` *(world)*
- **d080** The cell tower's battery dies: LTE1 → SOS; the radar app stalls on a frame with a stale timestamp — `cell.state == SOS` *(device)*
- **d081** [P] A text sent with no service: "Not Delivered" in red — `utilities.cell.outbox[*].failed` *(device)*
- **d082** Garbage-day reminder on the phone at 07:00 Thursday, absurdly — `clock.dayIndex == 0 && clock.hour == 7` (calendar-keyed by design) *(device)*
- **d083** Water fans under the front door; the doormat floats; the door hisses at the weatherstrip — `rainWall[E] > 90` *(fx/audio)*
- **d084** The snowbird house's 3-tab shingles peel and slap your east wall — `hood.houses.bergstrom.shingleLoss > 0` *(fx/audio)*
- **d085** The NWR HLS: "Do not venture outside during the passage of the eye" — `alert:nwr HLS` *(device)*
- **d086** Biscuit is under the bed; her panting rate follows the roar — `life.pet.state == hide` *(pet)*
- **d087** Dale-style neighbour flashlight in Ray's window — `!power.on && illumLux < 100` *(light)*

### 12.4 Marine hurricane force, hurricane force at the house, and the front eyewall (Thu 10:00 → 13:00; `u1m` 26 → 40 m/s — the section spans the end of `ts`, `hurricane` and `eyewallFront`)
- **d088** The garage door oil-cans: whump-whump at gust peaks; panels visibly pump 3 cm — `house.garageDoor.pumpAmpEnv > 0.01` *(fx/audio)*
- **d089** The brace creaks (if installed); a panel buckles with a crunch and the tracks screech (if not) — `house:garageBuckle` *(audio)*
- **d090** Garage failure: the noise triples, the attic pressurises, ceiling drywall lifts at the joints, insulation dust puffs from the can lights, every open interior door slams in sequence — `house:garageFailed` *(audio/fx)*
- **d091** The walls hum; the east windows' shutters bow and a glass-straining sound comes from bed 2; the front door bulges in its frame — `windLoadEnvPa > 2000` *(fx/audio)*
- **d092** A glass walks to the counter edge and falls at the next big gust — `windLoadEnvPa > 2500` then `uGustEnv > 55` *(world/audio)*
- **d093 (C3)** Continuous ear fullness; interior doors breathe; the front door bulges; toilet water rocks and gurgles; the attic hatch lifts and drops — `earPop > 20` *(audio/fx)*; the caption *"Your ears pop the other way."* fires later at `storm:eyeEnter` *(caption)*
- **d094** Ceiling stain rings at the east wall; drip at the foyer can light; the smoke detector wet-chirps — `ceilingLeaks.lp_foyer_can.active` *(fx/audio)*
- **d095** First drip into the bucket; the pitch falls as it fills — `ceilingLeaks[lp].bucket` *(audio)*
- **d096** Coin-sized stain in the den grows to a dinner plate; the popcorn sags — `ceilingLeaks.lp_den_ceiling.stainM2 > 0.1` *(fx)*
- **d097** A debris impact you feel in your chest; Biscuit yelps; the shutters boom — `hood:debrisImpact energy > 40` *(audio/pet)*
- **d098** A shingle tab hits the bed-2 shutter — a gunshot crack; the pet bolts — `hood:debrisImpact surface == win_bed2_E` *(audio/pet)*
- **d099** The oak's first limb cracks over the roar; on uproot, a longer sound and the ground thuds — `hood:treeLimb` / `hood:treeFallen` *(audio/fx)*
- **d100** Cage panels rip one by one with a zip, then flap — `house:cagePanelTear` *(audio/fx, repeat)*
- **d101** The Extreme Wind Warning on the radio; the phone screen is the only light in the hall — `alert:nwr EWW` *(device/light)*
- **d102** [S] The WEA doesn't arrive because the tower is dark; the radio still gets it — `alert:issued EWW && !utilities.cell.towerOn` (≈ 30 % of seeds, §6.9) *(device)*
- **d103** [R] A mesovortex gust: the worst 15 s of the storm; the whole house bangs; a shingle-tab decal appears on your own roof — `storm:mesovortex` *(audio/fx)*
- **d104** Noon looks like dusk: 100–250 lux; the house across the street is a shape — `illumLux < 300 && sun.elDeg > 40` (≈ T−2.2 → T−0.9 with the §7.6 optical depth) *(fx)*
- **d105** The barometer needle passes STORMY and keeps going; the console shows `↓↓` and 28.7 — `pHpa < 970` *(device)*
- **d106** [S] The anemometer dies; the console freezes on its last gust forever — `roof.anemometerAlive == false` (p 0.3/bucket above 45 m/s — nearly every seed) *(device)*
- **d107** [P] Sweat sheen on the lanai in the eye or on day 1; the prompt to sit on the floor — `(player.outdoors ? heatIndexOutC : heatIndexC) > 38` (the eye's 30 °C / 90 % gives ≈ 41; indoors it needs day 1) *(fx)*
- **d108** Bare window fails: crash, pressure whump, rain indoors, the noise floor triples — `house:openingFailed` *(audio/fx)*
- **d109** Biscuit has moved from the bed to the tub without your seeing — `pet relocation while unobserved` *(pet)*
- **d110** Denise: "It sounds like a train"; Marcus: "Lost the lanai cage" — texts if any SMS path exists *(device)*
- **d111** Something heavy hits and slides off the roof; the hatch lifts — `hood:debrisImpact surface == roof && energy > 200` *(audio/fx)*
- **d112 (C7)** Generator in the garage: *"Headache. The garage smells of exhaust."* — `house.coPpm > 100` *(caption)*

### 12.5 The eye (≈ 13:19 → 14:41)
- **d113** Rain collapses to drizzle in 5–10 min; the wind "switches off" over 15 min; the drips are suddenly loud — `eyeFactor rising` *(audio/fx)*
- **d114** Cloud breaks from the zenith outward; blue holes; then direct sun and a shadow returns to the yard — `eyeFactor > 0.6 && !clock.isNight` *(fx)*
- **d115** Stars and the moon over a black subdivision; the eyewall lit on the moonward side — `eyeFactor > 0.6 && clock.isNight` (the `landfallHour = 2` option) *(fx)*
- **d116** The stadium wall on every horizon; a distant continuous surf-roar — `eyeFactor > 0.8` *(fx/audio)*
- **d117** Dripping from every surface; water running in the gutters and the street toward the pond — `eyeFactor > 0.6` *(audio/fx)*
- **d118 (C5)** [P] *"The air is thick, warm and dead still."* — `eyeFactor > 0.8 && player.outdoors` *(caption)*; the console rises 4 °C *(device)*
- **d119** Birds: grackles, a mockingbird from the fence, a gull; hundreds of seabirds circling overhead — `eyeFactor > 0.6 && uInst < 8` *(audio/fx)*
- **d120** Frogs immediately; Ray's Generac; a car alarm cycling; neighbours' voices — "You OK?" — `eyeFactor > 0.6` *(audio)*
- **d121** Steam off the pavement — `eyeFactor > 0.8 && wetness > 0.5 && sun.elDeg > 30` *(fx)*
- **d122** Pressure minimum, steady at 28.05 / 950.0; the ears equalise over 20 s; the only flat trend arrow in 30 hours — `|dPdt| < 1 && eyeFactor > 0.9` *(device/audio)*
- **d123** [P] The damage reveal: daylight where the cage panels were; `berg_garageDoor` in the yard; shingles in the pool; `ray_oak` on `ray_car` — `eyeFactor > 0.6 && player.outdoors` *(world)*
- **d124** Biscuit sits at the slider looking out, then follows you onto the lanai — `life.pet.state == eye` *(pet)*
- **d125** [P] Ray from his porch: "Don't get comfortable" — `eyeFactor > 0.6 && player.outdoors && simTime > house.eyeStartSim + 3 min` *(audio)*
- **d126** Ray: "In the eye. Cage is gone. Your shingles look ok from here" — eye + 6 min *(device)*
- **d127** NWR: "The eye of ${NAME} is passing over portions of Sarasota County…" — `alert:nwr eye` *(device)*
- **d128** The far wall visibly moving; the back eyewall audible before it is visible; a rising hiss — `eyeFactor falling && r increasing` *(fx/audio)*
- **d129 (C4)** Later, day 2: *"The master closet smells of mildew."* — `house.mildew > 0.3` *(caption)*
- **d130** "WIND BACK GET INSIDE" — `storm:windReversal − 3 min` *(device)*
- **d131** [P] Stay out too long: the first back-side gust knocks you sideways; the front door takes a 6-s hold to close — `reversal > 0.5 && player.outdoors` *(fx)*

### 12.6 Back eyewall and subsiding (14:41 → Fri 02:00)
- **d132** The east shutters go quiet; the lanai screams; the roar moves to the other side of the house — `reversal > 0.5` *(audio)*
- **d133** Debris that was against the east wall is hurled back across the yard — `reversal > 0.5` *(fx)*
- **d134** Rain comes the other way across a pond with whitecaps — `reversal > 0.5 && rainMmPerH > 20` *(fx)*
- **d135** The cage folds "in slow motion" with a groan and a crunch; aluminium lands in the pool and on the roof — `house:cageStage 4→5` *(fx/audio)*
- **d136** The sliders leak at the track: a dark line, then a pool across the tile; bailing with a dustpan; the great-room slider bows 2–4 cm — `rainWall[W] > 60 && reversal > 0.5` / `openings.slider_great_W.bowEnvM > 0.02` *(fx)*
- **d137** The master slider's shutter bangs; "this side is worse" — `reversal > 0.5 && windLoadEnvPa > 2000` *(audio)*
- **d138** Ears pop the other way (rising pressure) — `dPdt > 10` *(audio)*
- **d139 (C6)** [P] Opening the fridge after 30 h: *"The smell."* — `house.fridge.open && house.fridge.coldReserveH < 0 && utilities.power.hoursSinceOutage > 30` *(caption)*
- **d140** Water under the garage door; the garage floor sheen; things on the floor get wet; sandbags hold to 0.27 — `streetWaterM > 0.15` *(fx)*
- **d141** The retention pond reaches the back lot line — `pondRiseM > 1.0` *(fx)*
- **d142** A 2×4 through the hedge; a fence panel in the pool — `hood:debrisImpact {class:'2x4'}` on `wall_W`/`pool` *(fx)*
- **d143** Footsteps become slaps on wet tile — `floorWater[room].litres > 2` *(audio)*
- **d144** The first lulls; a brief brightening to the west — `tRel > 4 && u1m < 0.85·uMean && bandRain < 0.3` *(fx)*
- **d145** A rainbow to the east; sunset glow under the deck — `tRel ∈ [4.5, 6] && sun.elDeg ∈ [2, 8] && rainMmPerH < 5` (Thursday's sunset is 19:44 = T+5.7) *(fx)*
- **d146** Generators start one by one at their real positions; Ray's, Marcus's, three more — `hood.houses[*].genOn` per house seed in `tRel ∈ [5, 10]` *(audio)*
- **d147** Curfew: "treat every intersection as a 4-way stop"; a cruiser's spotlight sweeps the street later — `alert:issued CEM curfew` / `utilities.county.curfew && clock.isNight` *(device/light)*
- **d148** Stars between bands: the Milky Way over a subdivision with no lights; one lantern in each window — `clock.isNight && !power.on && rain < 1 && cloudFrac < 0.6` *(fx/light)*
- **d149** The house is 29 °C: the bed prompt changes; you sleep on the tile — `tInC > 28.5` (≈ T+7 by §6.11) *(world)*
- **d150** The smoke detector chirps every 35 s from ~02:00; you silence it from a chair — `house:detectorChirp` (`utilities.power.hoursSinceOutage > 4 && clock.isNight`, once) *(audio)*
- **d151** [P] Mosquitoes at the un-shuttered window: heat or bugs — `openings[id].open && clock.isNight && tRel > 6` *(audio)*
- **d152** A neighbour's generator dies at 3 a.m. and the silence is enormous — `hood:genOff` while `clock.isNight` *(audio)*
- **d153** Wet drywall: the ceiling sag forms after 6 h of un-bucketed drip; after 24 h it lets go — `house:ceilingSag` / `house:ceilingCollapse` (reachable via the attic reservoir of §6.6 only if no bucket is ever placed) *(fx)*
- **d154** Ceiling stains dry to yellow-brown rings — `ceilingLeaks[lp].rateLph < 0.05 && stainM2 > 0.2` *(fx)*

### 12.7 Aftermath (first light → day 10; props by id from the dressing table §4.2; "day N" = `clock.dayIndex`)
- **d155** Everyone out at once; the street is a carpet of green; steam; `berg_garageDoor` in your yard; `stopSign` flat; `mailbox` gone — `phase == aftermath && sun.elDeg > −6` (T+16.75 on the reference) *(world)*
- **d156** `powerLines_down`; `pole_leaning`; the transformer hanging; `cone_onLine` already on the line — `phase == aftermath && utilities.power.cause == 'transformer'` *(world)*
- **d157** The pool is brown; a lawn chair at the bottom; the pump silent; the cage folded like a dropped birdcage — `phase == aftermath && house.cage.stage == 5` *(world)*
- **d158** Lanai fan blades bent upward; the outdoor TV cracked; the coach light gone — `cage.stage ≥ 3` *(world)*
- **d159** `buzzards` circling by 08:00; a merciless clean sky — `phase == aftermath && sun.elDeg > 10 && cloudFrac < 0.3` *(fx)*
- **d160** Chainsaws: one at 07:00, five by 09:00, someone cuts the road open; a skid steer; helicopters N→S at 300 m twice an hour — `phase == aftermath && !clock.isNight` *(audio/fx)*
- **d161** `tarp_*` on three roofs by noon; a nail gun on a generator — `clock.dayIndex == 1 && sun.elDeg > 50` *(world/audio)*
- **d162** The heat: 34 °C, no breeze, heat index 41; the last cold drinks on the lanai; warm beer — `tAirC > 33` *(fx/world)*
- **d163** Bucket-flush from the tub; wash with a cup — `water.pressure < 0.05 && storedL > 0` *(world)*
- **d164** Ring's last clip: the cage hitting the yard at 14:52 — `devices.phone.ringLastClip` *(device)*
- **d165** [P] The Nguyens' house with the turtle key: `nguyen_limb` on their lanai, the interior dry, a wind-up clock ticking — `player.room == 'nguyenFoyer'` *(world/audio)*
- **d166** [P] `marcus_strip` charges your phone to 60 % in 45 sim-min — `interact:use marcusStrip` *(device)*
- **d167** Boil-water: the pot on the camp stove on the lanai; the tap a trickle, then air, then pressure with a notice — `water.boilNotice` *(device/world)*
- **d168** `loudspeakerTruck`: ice and water at Venice High — `utilities.county.podOpen && clock.dayIndex == 2 && !clock.isNight` *(audio)*
- **d169** The fridge purge; the bags at the kerb; the group chat: "Publix cash only, line to the road" — `clock.dayIndex == 2` *(world/device)*
- **d170** `cow_trailer` appears at the entrance; **41 texts arrive at once**, timestamped days ago; "CALL ME" from Mom — `cell:restore` *(world/device)*
- **d171** `flyers` rubber-banded to the mailbox post; a "roofer" with out-of-state plates — `clock.dayIndex ≥ 3` *(world)*
- **d172** `kerbPile_*`: vegetative and C&D separated per the HOA text — `clock.dayIndex ≥ 3 && hood.debrisPileM3 > 2` *(world)*
- **d173** `bucketTruck_main` with Georgia plates staging on the main road; reversing beepers; people cheer at them — `clock.dayIndex == 4` *(audio/world)*
- **d174** `bucketTruck_culdesac`, `crew_onPole`, `newTransformer`; radio chatter — `simTime ≥ utilities.power.restoreScheduledSim − 2 h` *(world/audio)*
- **d175** **POWER**: the A/C thumps on, fans spin up, the fridge shudders, the microwave blinks 0:00, the street cheers, someone runs a hot shower; the ice maker dumps if you left it on — `power:restored` *(audio/light/device)*
- **d176** `lastDarkHouse` — a downed service drop; the neighbours run a cord over — `power:restored && hood.houses.bulb1.lastDark && clock.isNight` *(light)*
- **d177** Traffic lights back on the main road (audio: the first horn) — `utilities.county.trafficLightsOn` (day 6) *(audio)*
- **d178** Cable and internet back: the router lights; the group chat goes quiet — `utilities.media.cableOn` again (day 8) *(device)*
- **d179** Boil-water lifted: running the taps for 5 minutes — `water:boilLifted` (day 10) *(device/world)*
- **d180** The shutters stay up "because there's another one out there" — the ending-card footnote *(device)*

*(180 entries; 7 captions; 16 tagged [P], 6 tagged [R], 4 tagged [S] — the remaining 154 are hashed and subject to the ≥ 95 % soak rule.)*

---

## 13. The aftermath

First light (T+16.75, Fri 06:45 — civil dawn from `sunAt()`) is the canonical ending point (§15). **Continue** enters the aftermath, a sequence of skip-driven days where the restoration model (§6.3, §6.9, §6.10) and the day-index predicates drive the details of §12.7. **Day arithmetic:** `clock.dayIndex = floor((simTime − dayStart(0))/86400)` with `dayStart(0)` = the midnight that begins the landfall day (Thu 00:00 = 86 400 s on the reference), so Fri = 1, Sat = 2, Sun = 3, Mon = 4, Tue = 5; `dayStart(n) = dayStart(0) + n·86400`; `clock.isNight = sun.elDeg < −6`. Scheduled utility events are written in these terms: restoration `dayStart(5) + 16.2 h ± 1 d` (Tue 16:12), COW `dayStart(3) + 11 h` (Sun 11:00), cell LTE1/2 `dayStart(4) + 9 h`, cable/cell normal `dayStart(8) + 9 h`, traffic lights `dayStart(6) + 8 h`, curfew lifted `dayStart(7) + 6 h`, boil-water lifted `dayStart(10) + 10 h`. Each day has a small task set, a distinct soundscape and one social event:

| Day | Weather | Utilities (reference; seeded ±1 day) | The day's shape |
|---|---|---|---|
| **1 (Fri)** | Clear, 28 → 34 °C, dew point 24, NW breeze fading; dry-slot sky; heat index 41 | No power; water a trickle → air; cell SOS; no cable; curfew 21:00–06:00 | Chainsaws by 07:00; tarps by noon; the generator ration (fridge 2 on / 2 off; the cords); bathing with the tub and a cup; the fridge purge at hour 30; Linda's coffee; the Nguyens' house; insurance photos; mosquitoes at dusk; the Milky Way; a cruiser's laps; the smoke detector. |
| **2 (Sat)** | 33 °C, afternoon cumulus | Water pressure returning (boil notice via NWR; text when SMS exists); cell SOS | The POD loudspeaker truck; Publix cash-only (a text); the group chat alive again in bursts; debris piles; the mildew caption. |
| **3 (Sun)** | 34 °C | **COW at 11:00**: cell 1x → texts avalanche; "CALL ME" | Bucket-truck convoys staging at the mall (heard, not seen); contractor flyers; the ceiling stain still growing (the attic reservoir at 0.05 L/h); Denise's Oreos. |
| **4 (Mon)** | | Cell 1–2 bars from 09:00; crews on the main road | Reversing beepers; the first "we're OK" photos get out. |
| **5 (Tue)** | | **Power restored 16:12 ± 1 day** (overhead) | The crew in the cul-de-sac from 14:12; the cheer; the hot shower; the last dark house. |
| **6–10** | | Traffic lights day 6; curfew lifted day 7; cable/cell normal day 8; boil-water lifted day 10 | A day per skip; the ending-card "Continue" returns to free roam at any time. |

The aftermath never returns to "normal": the cage estimate is "March, maybe", the shutters stay up, and the closing footnote reads the 2026 list's next name.

---

## 14. HUD, menus, options

- **HUD (plain DOM):** a dot reticle; the interaction prompt ("E — Open", "Hold E — Place panel", "F — Carry"); the phone banner (WEA/text badges); a bottom-right clock line "Thu 12:42 · 6× · Front eyewall" that fades to 30 % at 1×; the wind/pressure ribbon only while looking at the console or the barometer; captions (the 7, `ui.api.caption`) and speech subtitles (unbudgeted, iconed per device, `ui.api.subtitle`); a progress ring for holds. **No storm statistics on the HUD — the world is the HUD.** `F3` debug overlay: `state.local`, `state.cues`, marine vs house winds, seed, frame ms per module, draw calls, the state hash.
- **Setup:** storm name (2026 list), preset (6), track offset (−80 … +80 km), forward speed (8–35 km/h), landfall hour (0–23), the house options (§1.4), pacing (Standard / Full / Highlights / Custom speed lock), quality (Auto / Low / High), seed (with "random"), and a live cone preview that re-draws from the forecast model as sliders move.
- **Pause (`Esc`):** resume; time controls (play, 1/3/12/60/300×, auto-pace toggle, sleep-until…, skip, the **forward-only scrub bar** with phase markers); the notepad; chapters (restart from any reached phase: the seed is replayed deterministically to the chapter's snapshot); the journal; options; quit to setup.
- **Options:** mouse sensitivity, FOV, invert; audio buses (master, wind, devices, voice, alerts), "reduce loud sounds" (halves WEA/WAT/smoke-alarm gains, limiter −9 dB), captions size; **photosensitivity** (caps flash intensity to 30 % and rate to 1/s for lightning and the transformer); **reduce motion** (no head bob, no gust roll); colour-blind-safe radar palette; language of voices (browser list); quality tier; headless/debug URL parameters are documented in ARCHITECTURE §12.
- **Chapters:** Prep morning, Prep afternoon, First band, The night, Tropical-storm winds, Hurricane winds, Front eyewall, The eye, Back eyewall, Subsiding, The night after, First light, Day 2 … Day 10. Unlocked as reached; each stores a state snapshot.

---

## 15. Endings and the "Your storm" card

- **Canonical:** at first light Friday (civil dawn, 06:45 on the reference), sitting on the front step (`E` on the step in `aftermath`) fades on the chainsaw and the generator; the phone rings (Mom). The card reads the player's own state: peak sustained and gust at the house with times ("Peak gust 66 m/s / 147 mph at 12:51 PM"), minimum pressure and time ("950.0 hPa / 28.05 in at 2:00 PM"), rain total, hours without power "(and counting)", litres of tub water used, leaks caught / missed, what the cage did, what the garage door did, what the roof did, which windows were bare, what you did in the eye (from the journal), alerts received (and the one the phone missed), photos taken, tasks 12/14, the pet's worst minute, and the closing footnote. **Continue** (aftermath days) or **Try another storm** (presets).
- **"You were outside when the wind came back":** `player.injury ≥ 1` (§6.14) — the screen greys, the roar fades, the card shows the same weather record with the line "You were outside when the wind came back at 2:52 PM. Gust 61 m/s." **Restart from the chapter "The eye"** is offered first.
- **"Carbon monoxide":** the dose rule in §6.13 (`house.coDose ≥ 4 500`, read by `scenario/endings.js`) — the CO alarm has been sounding; the vignette closes; the card names the placement and the minutes. Restart from the previous chapter.
- Nothing else ends the run. Sleeping through the eye is *interrupted*, not missed; a failed window, a folded cage, a flooded garage and a collapsed ceiling are all just the storm.

---

## 16. Appendix — the ID registry (frozen with the schema at the end of week 1)

This is the list every engineer builds against from day 2: E1's `objects/catalog.js` exports exactly these object ids, E4's `world/plan.js` and `registry.props/sockets/fixtures` contain exactly these ids, E5 poses by them, E7's content references them, and `details.test.js` walks every trigger path against ARCHITECTURE §3 plus this appendix. Adding an id is a `docs/state-changelog.md` entry.

### 16.1 Object ids (`state.objects[id]`, E1) — `kind`, count, home room, and the per-object `extra` keys that predicates may read

| Object id(s) | kind | Home | Carryable | `extra` keys (all others use the base fields `on / open / fill / secured / socket / count / battery / state`) |
|---|---|---|---|---|
| `panel_nook_1..3`, `panel_kit_1..2`, `panel_br2_1..2`, `panel_br3_1..2`, `panel_den_1..2`, `panel_mbr_1..2`, `panel_mba`, `panel_msl_1..3`, `panel_sidelt`, `panel_laun` (19) | `panel` | garage rack | stack ≤ 4 | `label` (the Sharpie text; `panel_nook_2` reads "4210") |
| `wingnutCan` (68), `wingnutBag` (8) | `nuts` | garage / junk drawer | pocket | — |
| `accordion_great` | `accordion` | lanai side of `slider_great_W` | — | — (state in `house.openings.slider_great_W`) |
| `sliderBrace2x4`, `garageBraceKit` | `brace` | great room / garage shelf | 1 | — |
| `car1`, `car2` | `car` | driveway | ride | `parkedAt: 'driveway'\|'garage'`, `dented` |
| `sandbag_1..8` | `sandbag` | garage | stack ≤ 2 | — |
| `towel_1..8` | `towel` | linen closet | 1 | `wetL` (0–2) |
| `bucket_1..3`, `stockpot` | `bucket` | garage / kitchen | 1 | — (litres live in `house.ceilingLeaks[lp].bucketL`) |
| `tap_tubHall`, `tap_tubMaster`, `tap_kitchen`, `tap_washer`, `tap_utility` | `tap` | fixed | — | — (ledger in `utilities.water.containers`) |
| `jug_1..6`, `bottles` (count 24), `pots` (count 2) | `container` | kitchen / pantry | 1 / pocket | — |
| `toilet_hall`, `toilet_master` | `toilet` | fixed | — | `tankFull` |
| `fridge`, `fridgeGarage`, `freezerGarage` | `fridge` | fixed | — | — (ledger in `house.fridge`) |
| `ziplocs` (count 12) | `bags` | kitchen drawer | pocket | — |
| `microwave`, `oven` | `appliance` | kitchen | — | `clockSet: boolean` (false after every `power:flicker`) |
| `coffeeMaker`, `thermos_1..2` | `appliance` | kitchen | thermos 1 | `hot: boolean` |
| `charger_kitchen`, `charger_nightstand`, `bank_1..2` | `charger` | kitchen / master | bank 1 | — (battery ledgers in `devices.phone`) |
| `generator`, `gasCan_1..4`, `propane_1..2`, `cord_1..3` | `generator` family | garage | cans 1, cords 1 | — (ledgers in `utilities.generator`) |
| `breakerPanel` | `panel` | garage | — | — (state in `utilities.power.breakers`) |
| `door_front`, `door_garage_man`, `door_laundry_garage`, `door_laundry_kitchen`, `door_pantry`, `door_bed2`, `door_hallBath`, `door_linen`, `door_master`, `door_masterBath`, `door_masterCloset`, `door_bed3`, `door_den`, `door_ahu`, `slider_great_W`, `slider_master_W`, `door_cage_screen`, `door_garage_roll` | `door` (interactable proxies) | fixed | — | — (state in `house.doors` / `house.openings` / `house.garageDoor`) |
| `win_nook_N`, `peep_laundry_N`, `sidelight_foyer_E`, `win_bed2_E`, `win_bed3_E`, `win_master_S`, `win_den_S`, `win_kitchen_W`, `win_mbath_W` | `window` (interactable proxies: place panel / open after the storm) | fixed | — | — (state in `house.openings`) |
| `mattress_bed3`, `mattress_bed2` | `mattress` | bed 3 / bed 2 | drag | — |
| `bed_master`, `bed_bed2`, `bed_bed3`, `sofa`, `hallMattressSpot`, `tubHallSpot`, `chair_nook_1..4`, `chair_dining_1..6`, `frontStep` | `restSpot` | fixed | — | `lastSleptSim` |
| `helmet_1..2`, `shoes` | `wearable` | dining table / foyer | 1 | — |
| `lanaiChair_1..4`, `lanaiTable`, `chaise_1..2`, `grill`, `planter_1..3`, `hoseReel`, `windChimes`, `poolToys`, `outdoorRug`, `doormat`, `bin_trash`, `bin_recycle` | `loose` (debris source until `secured`) | lanai / porch / drive | 1 (table, grill and chaises drag) | `debrisClass`, `threshold` (chairs 22, planters 25, grill 30, bins 18, chimes 12) |
| `poolValve` | `valve` | pump pad | — | — (state in `house.pool`) |
| `tv_great`, `tv_kitchen`, `remote_great`, `nwr`, `console`, `barometerWall`, `thermostat`, `ups`, `modem`, `smartSpeaker`, `laptop`, `tablet` | `device` | see §3.3 | nwr, remote, tablet 1 | — (state in `devices.*`) |
| `detector_hall`, `detector_garage` | `detector` | ceilings | — | `battery`, `silencedUntilSim` |
| `lamp_great_1..2`, `lamp_nook`, `lamp_nightstand`, `lamp_bed2`, `lamp_den` (6) | `lamp` | rooms | — | — |
| `switch_nook`, `switch_kitchen`, `switch_great`, `switch_laundry`, `switch_pantry`, `switch_garage`, `switch_dining`, `switch_foyer`, `switch_frontHall`, `switch_bedHall`, `switch_hallBath`, `switch_masterBath`, `switch_masterBR`, `switch_den`, `switch_bed2`, `switch_bed3`, `switch_lanai`, `switch_coach` (18) | `switch` | walls | — | — |
| `fan_great`, `fan_master`, `fan_bed2`, `fan_bed3`, `fan_den`, `fan_lanai_1..3`, `bathFan_hall`, `bathFan_master` | `fan` | ceilings | — | `bent` (lanai fans after cage stage 3) |
| `flashlight_1..2`, `headlamp`, `lantern_1..2`, `candle_1..4`, `lighter` | `light` | kitchen drawer / linen / great room | 1 | `battery` (h), `lit` |
| `atticHatch_hall`, `atticPulldown_garage` | `hatch` | ceilings | — | — |
| `docsPouch`, `goBag`, `insuranceFolder`, `photoFrames` | `docs` | dining / den / hall | 1 | `inBag` |
| `notepad`, `paperback`, `cards`, `wine`, `hoaLetter`, `trackingChart` | `paper` | fridge / nightstand / table | paperback, cards 1 | `read: boolean` |
| `hurricaneKitBin`, `aaBatteries` (6), `ductTape` | `kit` | laundry | pocket | — |
| `junkDrawer` | `drawer` | kitchen | — | — (`open`) |
| `turtleKey`, `nguyenDoor`, `marcusStrip`, `chainsaw`, `tarp`, `rake` | `aftermath` | 4210 / 4218 / Ray | key pocket, tools 1 | `used` |
| `pet` (proxy for `life.pet`), `ray` (proxy for `life.neighbours.ray`) | `npc` | — | — | — |

Every object id doubles as its **prop mesh id** in `world.registry.props[id]` (a `Group`; multi-part props use `id + ':' + part`, e.g. `fridge:door`, `car1:body`). `Interactable.meshIds` lists exactly those.

### 16.2 Socket ids (`world.registry.sockets[id] = {pos, kind, room, accepts}`, E4)

| Socket id pattern | kind | Accepts | Where |
|---|---|---|---|
| `sock_panel_<openingId>` (13 — one per shuttered opening of §3.4, `sock_panel_win_nook_N` accepts 3, sliders/masters per their panel count) | `panel` | `panel` | the opening's tracks, outside |
| `sock_brace_slider_great_W`, `sock_brace_garage` | `brace` | `sliderBrace2x4` / `garageBraceKit` | inside the slider / the door's centre stile |
| `sock_sandbag_door_front`, `sock_sandbag_door_laundry_garage` (4 each) | `sandbag` | `sandbag` | thresholds |
| `sock_towel_door_front`, `sock_towel_slider_great_W`, `sock_towel_slider_master_W`, `sock_towel_door_garage_man`, `sock_towel_door_laundry_garage`, `sock_towel_win_bed2_E`, `sock_towel_win_bed3_E` | `towel` | `towel` | thresholds, tracks, the east sills |
| `sock_bucket_lp_foyer_can`, `sock_bucket_lp_bed2_head`, `sock_bucket_lp_master_can`, `sock_bucket_lp_great_register`, `sock_bucket_lp_den_ceiling`, `sock_bucket_lp_hall_detector` | `bucket` | `bucket`, `stockpot` | under each leak point |
| `sock_mattress_frontHall`, `sock_mattress_bedHall`, `sock_mattress_masterCloset` | `mattress` | `mattress` | refuge positions |
| `sock_gen_garage`, `sock_gen_lanai`, `sock_gen_driveway` | `generator` | `generator` | placements of §6.13 |
| `sock_car_garage`, `sock_car_driveway` | `car` | `car` | — |
| `sock_freezer` | `freezer` | `ziplocs`, `bottles` | fridge |
| `sock_pool_sink`, `sock_garage_store`, `sock_inside_store` | `store` | `loose` | the pool, the garage floor, the great room corner |
| `sock_candle_great`, `sock_candle_hallBath`, `sock_candle_masterBath`, `sock_candle_dining`, `sock_lantern_nightstand`, `sock_lantern_hall`, `sock_lantern_closet` | `light` | `light` | fixtures for candles/lanterns |
| `sock_nwr_kitchen`, `sock_nwr_bedHall`, `sock_nwr_hallBath`, `sock_nwr_masterCloset`, `sock_nwr_nightstand` | `device` | `nwr` | where the radio can live |
| `sock_phone_kitchen`, `sock_phone_nightstand`, `sock_phone_counter` | `phone` | phone | charger positions (the phone "on a surface" for the WEA rattle) |
| `sock_hand` | `hand` | anything carryable | the player's carry socket |
| `sock_kerb_bags`, `sock_kerb_pile` | `kerb` | fridge bags, debris | the swale edge |

### 16.3 Fixture ids (`world.registry.fixtures[id] = {room, pos, color, kind, windowId?}`, E4; lights are E5's)

Ceiling fixtures: `fix_nook`, `fix_kitchen_1..2`, `fix_great_fan`, `fix_laundry`, `fix_pantry`, `fix_garage_1..2`, `fix_dining`, `fix_foyer_can`, `fix_frontHall`, `fix_bedHall_1..2`, `fix_hallBath`, `fix_linen`, `fix_masterBath_1..2`, `fix_masterCloset`, `fix_master_fan`, `fix_master_can` (the leaking one), `fix_ahu`, `fix_den`, `fix_bed2`, `fix_bed3`, `fix_lanai_1..3`, `fix_coach_1..2`, `fix_pool`; lamps `fix_lamp_<lampId>`; window daylight descriptors `fix_win_<openingId>` (kind `rect`, `windowId`); device glow descriptors `fix_tv_great`, `fix_tv_kitchen`, `fix_phone` (follows the phone), `fix_candle_<socketId>`; street `fix_street_1..4`, `fix_fountain`, `fix_ringLed`, `fix_rayWindows`, `fix_transformer_<poleId>`.

### 16.4 Leak-point, surface, tier and room ids

Leak points: `lp_foyer_can`, `lp_bed2_head`, `lp_master_can`, `lp_great_register`, `lp_den_ceiling`, `lp_hall_detector` (§3.6). Impact surfaces: §6.15. Intrusion tiers 1–4 and leak tiers 1–3: §6.6. Rooms: the `roomId`s of §3.3 plus `lanai`, `cage`, `outside`, `nguyenFoyer`; yard sectors for the player-hit roll: `frontYard` (x > 14), `backYard` (x < 0), `driveway`, `street`. Adjacency (`plan.adjacency[roomId] = [{roomId, doorId|null}]`) is generated from §3.5's door list and cased openings.

*End of DESIGN.md.*
