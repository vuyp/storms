# Florida Storm — Design Proposal (Immersion-First)

**Working title:** *Hunker Down*
**Angle:** the player's minute-to-minute experience is the source of truth. Every system exists to produce a specific thing the player sees, hears, touches or does. Physics is the engine of atmosphere, not a feature in itself.
**Companions:** `docs/research/meteorology.md`, `florida-home.md`, `tech-3d.md`, `audio-devices.md` (this proposal defers to them on formulas, house construction, r170 idioms and audio synthesis recipes; it decides *what* and *why*).

**Pitch:** You are alone in a concrete-block house in a Gulf Coast subdivision with a cat, a phone at 71 %, and a Category 3 hurricane whose eye will pass directly over your roof in thirty hours. Nothing is scripted; everything is modelled; the dread is earned.

---

## 1. The Experience Arc

### 1.1 Scenario
- **Storm:** Hurricane **Hanna** (default; the 2026 list is selectable). Compact, intensifying Gulf storm: 950 hPa, 105 kt (54 m/s) 1-min sustained at landfall, Rmax 22 km, Holland B = 1.35, heading 025° at 6 m/s.
- **Place:** 14 Sandpiper Court, Heron Creek subdivision, fictional Osprey Landing, Sarasota County. 15 km inland, 3.6 m NAVD88, evacuation Zone D (not ordered; A–C are). Retention pond behind the house. Sheltering in place is plausible and common here — which is why the sister's "are you SURE?" texts land.
- **Player:** a 30-something adult living alone with **Biscuit**, a 9-year-old orange tabby. Sister **Jen** texts from Orlando. **Dale** across the street (retired, "rode out Charley") stays. **Marisol** next door evacuated to Ocala and asks you to check her house afterwards. No dialogue trees: NPCs exist as texts, a voice through a wall, a flashlight in a window, a chainsaw the next morning.
- **Track default:** the eye passes directly over the house. New-game sliders: closest approach (−40…+40 km; positive = right-front quadrant), intensity (Cat 1–4), forward speed (4–9 m/s). Everything downstream is derived, so a Cat 1 passing 30 km west is a genuinely different, quieter game.

### 1.2 Sim time and pacing
Sim time runs on an **auto-pacing curve** driven by storm state; the player can override (1×, 3×, 12×, 60×, 300×), **Sleep**, or **Skip to next event**. Sleep runs at 300× until an interrupt wakes you (WEA tone, gust > 30 m/s, the power dying, the cat). Skip advances to the next predicted state change (band arrival, phase change, next text) and never past an eyewall.

| Sim window (local, Wed 2 Sep → Fri 4 Sep 2026) | Phase | Sim | Auto speed | Real min |
|---|---|---|---|---|
| Wed 08:00–20:00 | Prep day | 12 h | 60× | 12 |
| Wed 20:00–Thu 02:00 | Outer bands | 6 h | 30× | 12 |
| Thu 02:00–08:00 | Tropical-storm winds (18–33 m/s) | 6 h | 30× / sleep 300× | ~8 |
| Thu 08:00–12:00 | Hurricane winds (33–45) | 4 h | 12× | 20 |
| Thu 12:00–13:30 | Front eyewall (45–52, gusts 62) | 1.5 h | 6× | 15 |
| Thu 13:30–14:25 | Eye (< 8) | 55 min | 3× | 18 |
| Thu 14:25–16:00 | Back eyewall, reversed | 1.6 h | 6× | 16 |
| Thu 16:00–Fri 02:00 | Subsiding | 10 h | 40× | 15 |
| Fri 02:00–07:00 | Night, hot, quiet | 5 h | sleep 300× | 1 |
| Fri 07:00–12:00 | Aftermath | 5 h | 60× | 5 |
| **Total** | | **~52 h** | | **~120 (25 at max speeds)** |

The 55-minute eye falls out of the model: calm core ≈ 0.9 × 2 Rmax ≈ 20 km at 6 m/s ≈ 3,300 s. Change Rmax and the eye changes; nothing is hand-timed.

### 1.3 Hour by hour
**Wed 08:00 — Prep day.** You wake in the master bedroom with the TV still on: 5 a.m. advisory, Hurricane Warning Englewood to Tampa Bay, cone centred on Sarasota. The fridge notepad carries a to-do list in your handwriting (the task list). Phone: three unread from Jen, one from Marisol with her spare-key photo. Outside: hazy cirrus, 31 °C, dead calm, 1009 hPa. You have free run of house, garage, yard and street and can do the tasks in any order:
1. Deploy 12 aluminium storm panels from the garage rack onto 11 windows + slider (carry, place, wingnuts click; interacting drops auto-pace to 1× so the act feels physical).
2. Fill both tubs (12 sim-min each; you can leave and return).
3. Bring in lanai furniture, grill, garbage cans, planters, the flag.
4. Freeze water bottles; fill the ice chest; set the fridge to coldest.
5. Charge phone, power bank, lantern; find AAs for the NOAA radio and test it.
6. Park the car in the garage (walk it in; the roll-up door's chain rattle).
7. Brace the garage door with the 2×4 kit (optional; raises its failure threshold from 42 to 50 m/s).
8. Stage carrier, litter box, documents box and go-bag in the hall bath (the safe room).
9. Cash — a reminder text; the ATM is "out of cash" on the crawl, so this task can only fail.
10. Text Jen back; text Marisol you have her key.

Unfinished tasks have modelled consequences: unshuttered east windows face 50 m/s; a grill left out becomes a debris impact on Dale's truck; an empty tub means no flushing on Friday.

**Wed 13:00–17:00.** A feeder band shows as a yellow line on the phone radar. The sky is hard white glare; cumulus towers to the SW. Dale is a silhouette by his mailbox ("u staying? I got a genny if u need to charge"). Neighbours load cars. 16:40: first gust front, 10 m/s, palms sway, a first shower steams off the driveway.

**Wed 20:00 — Outer bands.** Bands every 40–90 sim-min: 15 minutes of hard rain and 15 m/s gusts, then lulls with a strange orange dusk. Frogs go quiet in bands and resume between them. First flicker at 22:14 (lights dip 200 ms; microwave clock resets to blinking 12:00). The 22:00 advisory: 100 kt, "landfall near Venice Thursday afternoon."

**Thu 02:00 — Tropical-storm winds.** Sleep is broken at 01:12 by the first WEA (Flash Flood Warning) and at 03:30 by the NOAA radio SAME burst. Shutters tick; the lanai screen hums at a rising pitch; the garbage can you forgot skids down the driveway. Pressure 998 hPa, falling 1 hPa / 20 min. 04:50: transformer flash on Egret Way, a blue-green pulse through the north window; power dies 40 s, returns. Marisol: "made it to Ocala. Please be safe."

**Thu 08:00 — Hurricane winds.** Grey light through shutter slots. 08:37: the power dies for good. The silence of the AC is louder than the wind. Fridge stops; the house climbs from 24 °C toward 30 °C over six sim-hours. Cell: LTE → 3G → SOS. First roof leak: a coin-sized stain in bedroom 3 that spreads, then drips. Water seeps under the front door and slider. Lanai screens tear at 34 m/s and thrash. The garage door begins to oscillate audibly. 10:15: a shingle tab strikes the shuttered dining window — a gunshot crack.

**Thu 12:00 — Front eyewall.** 50 m/s sustained, gusts to 62. A jet roar that never moves. The house hums at ~40 Hz. Pressure drops 3 hPa per 10 min; your ears pop (the audio band-pass squeezes, then releases with a click). Shutter panels with missing wingnuts fail. Water is ankle-deep on the lanai and sheeting under the slider. The bedroom-3 ceiling sags, bulges, then dumps a bucket of water. Biscuit is under the bed, then in the hall tub. The design never forces you into the hall bath; it makes the great room frightening — the slider bows visibly, the sound peaks — and the hall bath sound safe.

**Thu 13:30 — Eye.** Over eight sim-minutes the wind falls from 45 to 5 m/s. Rain stops. Then the thing this project exists to deliver: **the sun comes out.** A stadium wall of cloud rises around the neighbourhood; blue overhead; gold, flat light; steam off the road; 952 hPa, ears pop again; 28 °C and silent except for water running everywhere and one mockingbird. Birds cross the sky, trapped. You can go outside: the yard is a lake, Marisol's oak is on her lanai, Dale waves from his porch ("eye. u got 40 min. check ur roof"). You can walk the street, tarp the bedroom-3 leak from inside, re-bolt shutters, right the grill. NWR says it plainly: "THE EYE OF HANNA IS PASSING OVER SARASOTA COUNTY. WINDS WILL RETURN SUDDENLY FROM THE OPPOSITE DIRECTION." The cloud wall to the SW visibly approaches. These are the tensest 18 real minutes in the game because you can see what is coming.

**Thu 14:25 — Back eyewall.** Wind returns from the WNW, 5 to 48 m/s in six sim-minutes. Now the lanai side takes it: the screen enclosure frame fails (aluminium members peel; pops, then a long scream); the slider, if unpanelled, shudders. The east shutters go quiet on the lee side. Rain drives west-to-east. An unbraced garage door buckles at 42 m/s (p = 0.4 per 10 sim-min), pressurising the house: interior doors slam in sequence, the attic hatch lifts and drops, roof-damage probability triples. A fence 2×4 spears through the hedge. The pond overtops; brown water reaches 12 cm at the lanai step.

**Thu 16:00 — Subsiding.** Winds fall through 33, then 18 m/s by 22:00. The house is 30 °C and 85 % humidity. Dale's generator starts at 18:20 and runs for the rest of the game. At 19:40 a tower returns: 14 texts arrive at once. The hall smoke detector starts chirping every 43 s. The night is black — no streetlights, no house lights — and full of frogs, the generator, dripping, one distant siren.

**Fri 07:00 — Aftermath.** Clean washed sky, 27 °C already. You walk the street: fallen palms, a downed line across Egret Way (county text: "TREAT ALL LINES AS LIVE"), blue tarps appearing, Dale's chainsaw, a helicopter. Boil-water WEA at 08:00; curfew notice. You check Marisol's house with her key (the oak in her lanai; interior dry; you photograph it and send it). The ending is a set of quiet acts: bucket-flush from the tub, perishables into the cooler, the insurance photos, feed the cat, sit on the front step. Sitting on the step in AFTERMATH ends the game: the phone rings (Jen). Fade on chainsaw and generator. A closing card reads the state: peak gust, minimum pressure, rain total, hours without power, damage list, tasks done.

### 1.4 Freedom and limits
Go anywhere on the lot at any time. Outdoors in eyewall winds is allowed but brutal: you are pushed, the camera shakes, hearing is a roar, rain blinds. Above 40 m/s you cannot open the front door against the wind from inside — the first time the game says "no," and it is true. About 140 interactables. No death, no fail state; the closing card and a dry house are the score.

---

## 2. Storm Model — and How State Drives Everything

**Wind field (Holland 1980 + asymmetry).** `Vg(r) = sqrt((B/ρ)(Pn−Pc)(Rmax/r)^B·exp(−(Rmax/r)^B) + (rf/2)²) − rf/2`, ρ = 1.15, f at 27.1° N, Pn = 1010 hPa. Surface wind = 0.85 Vg, then inland decay `exp(−0.012·km_inland)` (0.83 at 15 km). Asymmetry adds 0.6 × translation speed rotated 90° right of heading. Inflow angle 22° inside 1.5 Rmax, 30° outside. Wind direction at the house is geometric: with the house ahead of the centre it backs from ENE (Wed evening) to ESE (front eyewall), collapses in the eye, returns from WNW. **The front of the house takes the first half; the lanai takes the second.** That reversal is the plot.

**Pressure.** `P(r) = Pc + (Pn−Pc)·exp(−(Rmax/r)^B)`; Pc(t) deepens to 950 by 06:00 Thu and fills at 4 hPa/h after landfall at 11:10. `dP/dt` is a state field because ear-pops, the barometer needle and the station's trend arrow all read it; peak fall ≈ 0.3 hPa/min inside 1.3 Rmax.

**Track.** Six-hourly positions (like an advisory) with Catmull-Rom interpolation and a gentle right curve (020° → 035° over 24 h). The **forecast** shown on TV/phone is truth plus a deterministic error shrinking with lead time (100 km at 48 h, 55 at 24 h, 30 at 12 h), so the cone wobbles and the player lives through "it shifted east again."

**Gusts.** Instantaneous = sustained × G(t), G an Ornstein–Uhlenbeck process (mean 1, σ 0.13, τ 4 s) plus Poisson gust events (rate rising with V; amplitude 1.25–1.45 for 3–8 s, sharp attack, slow decay). 3-s gust factor ≈ 1.35 over suburban roughness, so 50 sustained yields 62–68 peaks. Gust events publish `wind:gust`; shutters, palms, debris, audio and camera shake all subscribe. Turbulence intensity is higher on the neighbourhood side than the open pond side, so the lanai sounds gustier.

**Rainbands.** Rain rate = radial base (60 mm/h in the eyewall annulus 0.8–1.3 Rmax, `(Rmax/r)^1.2` outside, 0 inside 0.85 Rmax) × a spiral field: two log-spiral arms at 18° crossing angle, Gaussian cross-section 8 km, 1.8× enhancement, 0.15× between arms, rotating with the storm. Bands sweep the house every 40–90 min in the outer region without any authoring. Cumulative rain drives gutters, pond level and yard depth (bucket model: inflow − 12 mm/h drainage; pond overtops at +0.35 m).

**Phases** are derived thresholds: PRE, BANDS, TS (18–33), HURRICANE (33–45), EYEWALL_FRONT (> 45, r falling), EYE (r < 0.85 Rmax), EYEWALL_BACK, HURRICANE_BACK, SUBSIDING (< 33, r rising), AFTERMATH (< 10, r rising).

**Threshold table (sustained 10-m wind → house effects):**

| m/s | Effects (probabilistic where noted) |
|---|---|
| 5 | Palms sway; lanai screen hums; wind chimes |
| 10 | Rain drifts; flag snaps; loose paper |
| 15 | Rain horizontal; bins move if out; flicker p = 0.02/min |
| 18 | Shutters tick; screen door bangs; roof ticking; outage p = 0.05/min |
| 25 | Shingle-lift accumulator starts; branches fall; transformer flash p = 0.03/min |
| 33 | Feeder trips (hard outage when accumulator crosses); screens tear; door seep begins |
| 38 | Roof leak #1; fence panels fail; lanai frame damage accumulates |
| 42 | Unbraced garage door fails (p 0.4 / 10 min); lanai frame collapse; shutters with fastening < 1 fail |
| 45 | Slider bows; interior pressure surges; attic hatch lifts |
| 50 | Unshuttered window fails (p 0.5 / 10 min); trees fail; roof damage accelerates |
| 55+ | Sheathing loss if the garage failed |

Damage is an accumulator per component: `damage += k·max(0, V−Vth)²·dt`, with failure when it crosses a per-game seeded threshold. A slower storm does more damage — true in reality, and free here.

---

## 3. House and Neighbourhood

### 3.1 14 Sandpiper Court
Single-storey, 1996, concrete block with stucco, hip roof at 5:12 with grey architectural shingles, 2.74 m ceilings (2.44 in bedrooms 2/3 and baths), 0.45 × 0.6 m ceramic tile except carpet in bedrooms, single-hung aluminium windows, a 2.4 m slider to the lanai, popcorn ceilings, split plan. Front faces **east** (street); lanai faces **west** (pond). Lot 15.2 × 36.6 m; footprint 18.9 m (E–W) × 13.4 m (N–S) including garage. Axes follow `tech-3d.md`: +X east, +Z south, origin at the slab's front-left corner.

| Room | W × D (m) | Location / notes | Key contents |
|---|---|---|---|
| Foyer | 1.8 × 3.0 | East; steel inswing door 0.9 × 2.03 with sidelight | Console (keys, mail), hooks, doormat |
| Great room | 5.5 × 6.0 | Centre-west, slider to lanai | Sectional, coffee table, 55" TV, cable box, ceiling fan, lamp, bookshelf, cat tree by the slider |
| Kitchen | 3.7 × 4.3 | NW, open across 2.4 m island | Fridge (ice/water door), range, microwave clock, dishwasher, sink with west window, junk drawer, pantry 0.9 × 1.5 |
| Dinette | 3.0 × 3.0 | West of kitchen, bay window | Table, 4 chairs, the notepad wall |
| Dining | 3.4 × 3.7 | Front, north of foyer | Table for 6 (becomes the supply staging table), china cabinet, east window |
| Laundry | 1.8 × 2.4 | Kitchen ↔ garage | Washer/dryer, utility sink, water heater, air-handler closet with attic hatch |
| Hall | 1.1 × 6.5 | North wing | Linen closet, smoke detector, thermostat, return grille, photos |
| Bedroom 2 | 3.4 × 3.7 | NE, east window | Guest bed, dresser, bins |
| Bedroom 3 / office | 3.4 × 3.4 | North window | Desk, PC + UPS, printer; **primary roof-leak site** (valley above) |
| Hall bath (safe room) | 1.5 × 2.7 | Interior, no window | Tub/shower (fills), toilet, vanity, exhaust fan |
| Master bedroom | 4.3 × 4.9 | South wing, S and E windows | King bed, nightstands (charger, book), dresser, TV, fan, the cat's under-bed spot |
| Master bath | 3.0 × 3.7 | SW | Garden tub (fills), shower, double vanity, WC, obscure west window |
| Master closet | 2.0 × 3.0 | Interior | Safe, document box, go-bag |
| Garage | 6.1 × 6.4 | NE; 4.9 × 2.1 roll-up facing east; man door to laundry; side door north | Car, panel rack (12 panels + wingnut jar), 2×4 brace kit, bench, ladder, breaker panel, water heater, chest freezer, cooler, bikes, half gas can, cords — **no generator, deliberately** |
| Lanai | 4.3 × 7.3 | West; 3.0 × 4.3 under roof, rest under 2.6 m screen enclosure | Table, chairs, grill, planters, fan, hose reel, wind chimes, station mast |

Eighteen hinged doors with latch and **pressure state** (they slam on interior pressure spikes and can be held). Eleven windows plus the slider, each with `shuttered`, `fastening` (0–1), `intact`, `flex`. The attic is a modelled volume (temperature, pressure, water), not walkable, but the hatch can be pushed up from the ladder to reveal a 1.5 m patch of trusses and wet insulation — because that is exactly what people do.

### 3.2 The neighbourhood
Sandpiper Court is a 9-house cul-de-sac off Egret Way: a 150 × 150 m playable area with a 600 m LOD skirt. Houses come from four plan archetypes with parametric stucco colours and roof types and per-house prep state (panels, plywood that flexes and in two cases flies, nothing). Three streetlights, a pad-mount box and the pole transformer on Egret Way (the flash source), mailboxes, a 40 × 70 m retention pond with rip-rap outfall, a live oak on Marisol's lot (fails at 44 m/s onto her lanai), 14 cabbage palms, 6 queen palms, 3 royals on the boulevard, viburnum hedges, a swing set, Dale's boat on a trailer (it rolls). Dale's house: panelled, porch light on his generator after 18:20, truck in the drive (dented by your grill if you left it out). All geometry procedural: extruded block walls with canvas-noise stucco normals, lofted hip roofs, parametric palms whose 9–14 frond planes bend in a vertex shader from a per-tree wind sample.

---

## 4. Visual Effects

1. **Sky**: analytic sky blended by phase with a 3-layer FBM cloud field scrolled by the wind vector — cirrus (prep), stratocumulus with dark bases (bands), ragged 200 m ceiling (core), the **eye stadium** (a ring mesh with noisy edges, sunlit tops, blue overhead with shafts), then clean blue with fair-weather cumulus.
2. **Lighting**: sun from date/time/latitude; colour temperature by phase; 22 interior lights on per-circuit power; flashlight (camera spot), lantern (carried warm flicker), phone glow, candles. One 2048 cascaded sun shadow; a 512 flashlight shadow; ≤ 6 shadowless points active via room-graph culling.
3. **Rain**: GPU-instanced streaks (16k outdoor, 3k per breached room), velocity = fall + wind, length ∝ speed, alpha ∝ rate; splash quads; gutter drip lines.
4. **Rain on windows**: per-pane droplet shader advected by wind angle with refraction; fogging from the indoor/outdoor temperature gap after the outage.
5. **Wetness**: roughness/darkening scalar per exterior surface; parallax puddles with ripple normals; a sheet of water on the lanai.
6. **Vegetation**: vertex-shader bend ∝ V², flutter ∝ gust, frond tearing above 40 m/s, hedge shiver.
7. **Debris**: 200-body pool (shingles, fronds, bin lid, screen mesh, paper, a 2×4), lift ∝ V², tumbling, spawned by thresholds and failures; impacts publish events.
8. **Lanai enclosure**: six 16 × 16 cloth grids (CPU springs) — hum, billow, tear from a corner, then frame members detach into debris.
9. **Structural flex**: slider bow ∝ ΔP, garage door oscillation and buckle, shutter rattle, attic hatch lift, bedroom-3 ceiling sag morph then collapse.
10. **Water intrusion**: growing seep decals, ceiling stains (canvas radial gradients regenerated as they grow), drip particles, per-room floor water planes (0–30 mm), yard/street flood plane rising to 12 cm with wind ripples.
11. **Lightning** (bands only, rarely in the core — realistic): ambient spike + emissive bolt; thunder delayed by distance / 343.
12. **Power**: per-circuit intensities; brown-out dip to 60 % for 200 ms; 3-cycle stutter; LED standby deaths; microwave 12:00; streetlights.
13. **Transformer flash**: 400 ms (0.4, 0.9, 1.0) area burst from the Egret Way pole seen through shutter slits, with a delayed "whump"; 2–4 per game.
14. **Eyewall whiteout**: fog density to 0.08/m, rain-tinted, 60 m visibility, noise-gusted.
15. **Heat**: post-storm ground shimmer, condensation on tile after the outage.
16. **Camera**: head-bob, wind push, gust shake, ear-pop vignette pulse, rain-on-lens outdoors.
17. **Night**: true dark after the outage — only Dale's generator porch light, your lantern, your flashlight.
18. **Birds**: 12–30 flocking billboards in the eye; buzzards circling Friday.
19. **Aftermath dressing**: debris scatter scaled by peak gust, fallen-pose palm swaps on `tree:fall`, blue tarp cloth, a catenary downed line, standing water that shrinks over hours.

Budget at 1080p integrated GPU: ≤ 350 draw calls, ≤ 600k visible triangles, one shadow map, particles on GPU, materials merged per room, portal-lite culling (current room + neighbours through open doors). `?quality=low` (also auto under SwiftShader) drops particles to 10 %, disables shadows and reduces sky steps.

---

## 5. Audio

All audio is a single Web Audio graph built once and parameterised every 50 ms from state. Buses (wind, rain, house, devices, voice, ambient, ui) → a **"where am I" filter** set by enclosure (outdoors 0 dB / 20 kHz; lanai −4 dB / 8 kHz; great room −14 dB / 2.5 kHz; hall bath −24 dB / 900 Hz — the hall bath *sounds* safe) → ear-pop band-pass driven by `dP/dt` → per-room synthetic IR convolver (decaying noise, 0.4 s) → limiter.

- **Wind**: broadband pink noise, gain ∝ V^1.8; 2–4 resonant band-passes (Q 12) drifting 180–900 Hz with gusts — the whistle through the shutters; brown-noise roar 40–120 Hz rising sharply above 40 m/s, plus a 40 Hz "house hum" above 45. Gusts add 1–2 s swells. The wind bus pans by wind direction relative to facing, so the back eyewall arrives from the other side of the stereo field.
- **Rain**: roof hiss (2–6 kHz noise through a comb filter), window clicks at rate ∝ R × facade exposure, gutter warble at overflow; the lanai roof is brighter than shingles.
- **House**: shutter rattle impulses ∝ gust, roof ticks above 18 m/s, creaks (0.3 s sweeps 60–300 Hz), door slams through the room IR, garage-door thrum at 0.6 Hz with metal overtones, lanai screen hum (sine 90–160 Hz ∝ V) with tearing bursts, drips whose pitch rises as the bucket fills.
- **Appliances** (all die at the outage — the absence is the effect): AC compressor 120 Hz + fan, air handler, fridge 55 Hz with relay click, ceiling fans, dishwasher, microwave. Smoke detector 3.2 kHz / 80 ms every 43 s from four hours after outage. UPS beeps.
- **Devices**: TV bed with speechSynthesis meteorologist under low-passed room tone and a "Breaking" chime; NWR with a 300–3,400 Hz radio filter, static rising as the tower weakens, and a **real SAME header** — AFSK at 520.83 baud, mark 2083.3 Hz / space 1562.5 Hz, three ZCZC bursts, 1050 Hz attention tone 8 s, NNNN EOM; phone WEA at 853 + 960 Hz in the standard 2 s-on / 1 s-off × 3 cadence plus a 140 Hz table buzz; text tone; low-battery chime.
- **Voice**: speechSynthesis (en-US, rate 0.95 TV / 0.9 NWR, sentence-chunked for flat NWR prosody). Captions always; when synthesis is unavailable (headless) captions carry the timing alone.
- **Life**: frogs (pulsed FM chirps, density ∝ wetness, silenced by rain > 10 mm/h or wind > 12), crickets, one mockingbird in the eye, gulls, a distant Doppler siren, a helicopter pass, Dale's generator (60 Hz sawtooth + 3.6 kHz chatter, forever), two chainsaws at different pitches 200–400 m away, one shouted "Y'all okay?" in the eye, the cat (formant meows, 4 variants; a 25 Hz AM purr when held).
- **Thunder**: band-limited burst convolved with a 3 s tail, distance low-pass and delay.
- **The eye**: the mix falls ~30 dB over eight sim-minutes; a high-pass opens; trickling water and your own footsteps become the loudest things. The return is a six-minute swell from the opposite side.

---

## 6. Devices and UI

- **TV** (great room, master): a 1024 × 576 canvas texture with channels — local "WSRQ 7" (procedural anchor silhouette, lower-thirds, the **cone rendered from the forecast module with real error radii**, a radar loop rendered from the rainband field, a crawl of shelters and closures updated each advisory), a national weather channel, a sitcom channel (for the 3 a.m. "why is this on" feeling), and "No Signal" after the cable node dies at 09:05 Thu. Remote: power, channel, volume, mute. Dead with the grid.
- **Phone** (Tab): DOM overlay. Battery 71 %, −2 %/sim-h idle, −6 %/h with screen and radar, +40 %/h while the grid lasts; one 80 % refill from the power bank. Signal from a cell model (tower backup 6 h after outage, then dark until 19:40 Thu). Apps: Messages (Jen, Dale, Marisol, County Alerts, Mom; typing indicators; red "!" delivery failures; 2–3 reply choices, tone only), Weather (radar from the band field, advisories), Camera (screenshots to a gallery — the insurance and Marisol tasks), Flashlight (weak), Clock, Settings (a WEA toggle the game politely discourages). WEA takes over the screen with tone and vibration.
- **NOAA Weather Radio** (kitchen counter, carriable): power, volume, seven channels (only 162.400 is yours), alert mode. Cycles current conditions, a hurricane local statement generated from state ("the eye may pass over portions of Sarasota County between 1 and 3 PM"), and SAME bursts when warnings issue. 20 sim-hours on three AAs; the drawer has six.
- **Home weather station** (console on the counter, mast on the lanai roof): canvas LCD with temp, humidity, pressure with 3-h trend and 24-h graph, wind/gust/direction until the anemometer dies at 47 m/s — after which the display freezes on its last reading — and rain. Battery-backed. The player's most honest instrument.
- **Breaker panel**, **barometer** (needle tracks state; tapping it makes the needle jump — a real thing people do), **thermostat** ("— —" when dead), **PC** (forecast page until the outage; UPS beeps three sim-min).
- **HUD**: dot reticle; interaction prompt ("E — Open", "Hold E — Fill tub", "F — Carry"); a bottom-right clock line ("Thu 12:42 · 6×") that fades at 1×; unread badge; a wind/pressure ribbon only while looking at the weather station. No storm stats on the HUD: the world is the HUD.
- **Time controls**: 1–5 speeds, T pause, hold Z at bed/sofa to Sleep, N to skip with a confirm ("Next: first hurricane-force gust, ~40 sim-min"). Auto-pace can be locked or resumed.
- **Menus**: Title (name, intensity, offset, speed sliders with a live cone preview; seed), Pause (mouse, FOV 70–100, buses, captions, quality, restart chapter), Chapters (unlocked as reached), Journal (fridge list + human-readable log: "08:37 Power out." "10:15 Something hit the dining shutter."), closing card.

---

## 7. Interaction System and Objects

**Mechanics.** Camera raycast, 2.2 m. Each `Interactable` declares verbs from {use, toggle, hold, carry, place, look}. Hold shows a duration bar and drops auto-pace to 1×. Carry attaches to a hand socket (one item; panels slow you from 2.6 to 1.6 m/s). Place shows a ghost at valid sockets. Pockets hold small stacks (AAs, wingnuts, tape). Doors swing and respond to pressure. Crouch (C) is needed to look under the bed and to sit in the hall tub — a legitimate, cosy place to ride out the eyewall (camera lowers, filter tightens, you can hold the cat).

**Objects (~140, by group):**
- *Envelope:* 11 windows (shutter socket, flex, break); slider (panel socket, bow); front door (wind-blocked > 40 m/s from inside; seep); garage roll-up (wall button, dead after outage; manual release cord; brace socket; failure); side and man doors; lanai screen door (bangs until you latch it — a small reward); 18 interior doors; attic hatch (ladder required).
- *Prep kit:* 12 panels; wingnut jar (four short — three are in the junk drawer in a bag marked "shutter"); 2×4 brace kit; ladder; duct tape (pointless on windows; the news says so later); tarp (interior cover for the bedroom-3 leak after collapse); two buckets and a stockpot (place under drips; pitch tracks level; empty into a sink or tub); six sandbags "from last year" (cut door seep 70 %); towels (absorb, then sodden).
- *Water:* two tub taps (12 sim-min, 250 L; enable "flush" on toilets after pressure is lost at 14:00 Thu); kitchen tap (sputter → air); fridge water/ice; ice chest; 24 bottles; freezer bottles.
- *Power and light:* 14 switches on circuits; lamp; flashlight (9 sim-h); lantern (30 sim-h, placeable); four candles + lighter (Jen: "no candles!!"); charger; power bank; breaker panel; thermostat; fans; remote; microwave (set the clock); fridge (each open after the outage costs the cold-clock 20 min — a note in your own hand says DON'T OPEN); chest freezer; coffee maker (the last pot at 08:30 is a moment).
- *Devices:* phone, NWR, station, barometer, PC, landline (no dial tone), smoke detector (pull the battery from a chair), door chime.
- *Life:* Biscuit (pick up, carry, carrier; FSM: sleep, watch, hide-bed, hide-tub, carried, carrier, eat, slider; ears flatten at gusts; bolts at the first slam); food/water bowls; litter box; the notepad (tick items); photos; a wine bottle (pours; no judgement); a paperback and cards (a diegetic 20× "pass twenty minutes"); bed (sleep); sofa (sit); the front step (sit; ending trigger).
- *Outside:* patio set, grill, planters, hose reel, flag, bins, mailbox, the car (park; radio is a second NWR; charges the phone Friday), bikes, Dale's boat trailer, Marisol's turtle statue and key, her front door and small interior (look verbs; camera task), the downed line (blocked, warned), fallen palms (walk around).

---

## 8. The Little-Details Catalogue

Format: **detail — trigger** (state paths in §9.2). The rules engine evaluates at 4 Hz; entries fire once unless marked *repeat*. Most fire silently in the world; captions are reserved for smell/touch and are rare.

**Prep day**
1. The TV is already on when you wake; the remote is on the bed — `t == start`.
2. The notepad list in your handwriting with a coffee ring — `t == start`.
3. The coffee pot is hot, brewed at 07:45 — `t < Wed 10:00`.
4. Jen, 06:12: "Zone D isn't mandatory but PLEASE come up" — `t == start`.
5. Marisol's photo of the turtle statue — `t == start`.
6. Hard white glare; cicadas — `phase == PRE && sunUp`.
7. Dragonflies swarm over the pond — `PRE && t > Wed 15:00`.
8. Dale waves if you look at him > 1.5 s — `PRE && lookingAt(dale)`.
9. The family two doors north loads a minivan with a roof box — `PRE && t < Wed 14:00`.
10. Crawl: "ALL STATIONS ON US-41 REPORTED OUT OF FUEL" — `PRE && t > Wed 12:00`.
11. One panel has a neighbour's house number in Sharpie — look at rack.
12. The wingnut jar rattles short; the junk drawer bag — open drawer.
13. Caption, once: the east wind smells of the pond — first outdoors after `V > 8`.
14. The first shower steams off the driveway — `firstRain && surfaceTemp > 35`.
15. A county "KNOW YOUR ZONE" flyer in the mailbox — open mailbox.
16. The car radio picks up NWR while you park — `carEngineOn`.
17. The flag wraps its pole — `V > 10 && flagOut`.
18. Wind chimes: pleasant, then frantic, then audible from inside — `V > 5` *repeat*.
19. Biscuit stares at the slider, tail flicking — `PRE && t > Wed 17:00`.
20. The 17:00 advisory shifts the cone 20 km east; Jen: "did you see it moved" — `forecast shift > 15 km`.

**Bands and night**
21. First flicker; the microwave blinks 12:00 until you set it — `power:flicker`.
22. The AC cycles harder as humidity climbs — `humidity > 85 && grid`.
23. Orange-grey lulls between bands; frogs return — `rain < 2 && night && BANDS`.
24. Streetlights flicker; one lights early in a dark band — `lux < threshold`.
25. Rain arrives as a visible curtain up the street — `bandFront < 300 m`.
26. The clogged lanai gutter corner sheets over — `rain > 25 mm/h`.
27. The meteorologist's lower-third reads "LIVE 11:34 PM" and his tie is gone — `t > Wed 23:00`.
28. The sitcom channel's laugh track at 23:50 — channel 9 && `phase >= BANDS`.
29. The 01:12 WEA lights the bedroom ceiling — `alert:wea && sleeping`.
30. SAME burst at 03:30 — `nwr:same`.
31. First transformer flash through the north window; the cat flattens — `transformer:flash`.
32. The bin you left out lodges in the hedge — `V > 15 && binOut`.
33. The screen hum changes pitch per gust — `V > 5` continuous.
34. The screen door bangs until latched — `V > 12 && !latched` *repeat*.
35. A neighbour's plywood flaps, then flies — `V > 33 && seedRoll`.
36. The dinette bay bows; blind cords swing — `ΔP > 150 Pa`.
37. 05:30: the phone drops to 3G; the radar never finishes loading — `cell.tier`.
38. A car alarm runs its 30 s cycle three times in gusts — `gust > 22` (max 3).
39. Water runs *up* the slider glass — `V > 25 && facadeExposed(W)`.
40. Marisol, 02:15: "made it to Ocala" — scheduled.

**Hurricane winds**
41. The power dies for good; the AC stops; silence — `power:outage(final)`.
42. The fridge sighs (compressor spin-down) — `power:outage`.
43. The UPS beeps every 10 s for three sim-min — `power:outage && pcOn`.
44. Fans coast down over 40 s — `power:outage`.
45. TV standby LED and cable-box clock die — `power:outage`.
46. Thermostat "— —"; indoor temp rises 1 °C per 70 sim-min — `!grid`.
47. Kitchen tap sputters to air at 14:00 Thu — `water.pressure == 0`.
48. The toilet flushes once more (tank); then it's the tub bucket — `!pressure && toilet.used`.
49. Shingles tick, then thrum; something slides on the roof — `V > 25`.
50. A shingle tab hits the dining shutter; the cat bolts — `debris:impact(dining)`.
51. The doormat darkens, then floats — `seep.front > 0.5 L`.
52. Coin-sized stain in bedroom 3 grows to a dinner plate; the popcorn sags — `leaks[0].stain`.
53. First drip into the office bin, pitch rising — `leak rate > 0.2 L/h && bucketPlaced`.
54. Striped grey shutter-slot light that flickers with debris — `shuttered && sunUp`.
55. The slider bows; the blind rattles against it — `ΔP > 300 Pa`.
56. The garage door "breathes" — `V > 35 && !braced`.
57. A screen panel tears from a corner and whips — `lanai.panelTear[i] > 0`.
58. The house hums; a glass walks to the counter edge and falls at the next big gust — `V > 45`, then `gust > 55`.
59. Ears pop; the mix closes then clicks open; caption "—pop—" — `|dPdt| > 0.25` *repeat* 6–9 min.
60. The cat has moved from bed to tub without your seeing — `V > 40 && cat.notObserved`.
61. Smoke-detector chirp every 43 s — `t − outageT > 4 h` *repeat*.
62. "SOS" only; texts fail with a red "!" — `cell.tier == SOS`.
63. The barometer needle passes STORMY and keeps going — `P < 970`.
64. The station shows gust 47 and freezes forever — `anemometer.destroyed`.
65. Marisol's oak falls: crack, crunch, a screen-mesh scream through the wall — `tree:fall(oak)`.
66. Something heavy hits and slides off the roof; the hatch lifts — `debris:impact(roof, mass > 5)`.
67. Garage failure slams every open door in sequence — `house:garageFail`.
68. Dale's flashlight in his window — `V > 33 && daylight < 0.3`.

**The eye**
69. Rain stops in ninety seconds; the drips are suddenly loud — `phase == EYE`.
70. Sun; gold light; steam off the street — `EYE && sunUp`.
71. The stadium wall, blue overhead, sunlit tops — `EYE`.
72. A dozen birds cross; a mockingbird sings from the fence — `EYE && t > eyeStart + 4 min`.
73. 952 hPa; ears pop the other way — `EYE`.
74. Biscuit sits at the slider looking out — `EYE && cat.state != carried`.
75. Dale waves; "eye. u got 40 min. check ur roof." — `EYE && t > eyeStart + 3 min`.
76. NWR: "THE EYE OF HANNA IS PASSING OVER…" — `EYE`.
77. The street is a lake with a current toward the pond — `EYE`.
78. The far wall is visibly moving; the back eyewall is audible before it is visible — `EYE && t > eyeEnd − 8 min`.
79. "Y'all okay?" from somewhere unseen — `EYE && outdoors`.
80. Station wind 2 m/s, trend flat — the only flat arrow in 30 hours — `EYE`.
81. The screen door you latched is gone — `EYE && lanai.frameDamage > 0.5`.
82. The lanai fan blades are bent upward — `EYE && frameDamage > 0.3`.
83. Stay out too long and the first back-eyewall gust knocks you sideways; the front door takes six seconds of hold to close — `EYEWALL_BACK && outdoors`.

**Back eyewall and subsiding**
84. The east shutters go quiet; the lanai screams — `phase == EYEWALL_BACK`.
85. Rain comes *the other way* across a pond with whitecaps — `EYEWALL_BACK`.
86. The frame fails member by member — `lanai:frameFail`.
87. Brown water reaches the lanai step — `pond.level > 0.35`.
88. A 2×4 through the hedge — `debris:spawn(2x4)`.
89. Footsteps become slaps on wet tile — `room.water > 2 mm`.
90. 30 °C inside; the phone says 31 % — `t > Thu 16:00 && !grid`.
91. Dale's generator starts and never stops — `t > Thu 18:20`.
92. 19:40: 14 texts at once; the phone buzzes itself off the counter — `cell:restore`.
93. County: "TREAT ALL DOWNED LINES AS LIVE. CURFEW 7PM–7AM." — `cell:restore`.
94. One far siren, Doppler — `SUBSIDING && night`.
95. Only Dale's porch light and your lantern exist on the street — `night && !grid`.
96. Frogs, deafening — `SUBSIDING && rain < 5 && night`.
97. You sleep on the sofa because the bedroom is a sauna; the detector wakes you — `sleep && t > Thu 22:00`.

**Aftermath**
98. Merciless clean dawn; buzzards by 08:00 — `AFTERMATH && sunUp`.
99. Boil-water WEA at 08:00 — only if `water.pressure` ever hit 0.
100. Two chainsaws start within ten minutes; you never see them — `t > Fri 07:30`.
101. A helicopter crosses N→S at 300 m — `t > Fri 09:00`.
102. Two blue tarps by 10:00 — `t > Fri 10:00`.
103. The downed line already has someone's traffic cone — `AFTERMATH`.
104. Marisol's house: the oak in her lanai, interior dry, a wind-up clock ticking — enter with key.
105. Freezer bottles still frozen; fridge 12 °C; the milk is gone — open fridge, `t > outageT + 20 h`.
106. The car starts; a local station on generator takes call-ins — `carEngineOn && AFTERMATH`.
107. Insurance photos: ceiling, lanai, fence; the gallery counts — `AFTERMATH`.
108. Dale's generator charges your phone to 60 % in 45 sim-min — walk over with it.
109. The closing card: "Peak gust 64 m/s at 12:51 PM. Lowest pressure 951.6 hPa at 1:58 PM. Rain 287 mm. Hours without power: 27 (and counting). Tasks: 9/10." — sit on the step.

---

## 9. Software Architecture

### 9.1 Principles
- **One plain-JS state object** owned by `core/state.js`; each field mutated only by its owning module inside the update order. Render and audio read, never write.
- **Deterministic**: one seeded RNG (`mulberry32`, per `tech-3d.md`) split into named streams (`storm`, `damage`, `details`, `cat`, `fx`) so FX jitter can never perturb damage, and `(seed, t)` reproduces a frame anywhere.
- **Events are notifications, not commands.** Persistent facts live in state; events carry the moment.
- **Warp-exact**: every sim function is `step(state, dtSim)`; storm/hazards substep at ≤ 5 sim-s; slow processes (temperature, batteries, tub fill) fast-forward analytically; failure rolls are quantised to 10-sim-min buckets so 300× and 1× agree.

### 9.2 State schema (JSDoc)
```js
/** @typedef {Object} SimState
 *  @property {Clock} clock
 *  @property {StormState} storm
 *  @property {EnvState} env            // conditions at the house, derived each tick
 *  @property {HouseState} house
 *  @property {UtilityState} utilities
 *  @property {DeviceState} devices
 *  @property {PlayerState} player
 *  @property {LifeState} life          // cat, neighbours, wildlife
 *  @property {TaskState} tasks
 *  @property {Record<string, boolean|number>} flags   // fired details, one-shots
 *  @property {string[]} log            // journal lines
 *  @property {number} seed
 */
/** @typedef {Object} Clock
 *  @property {number} simTime          // s since Wed 2 Sep 2026 00:00 local (UTC−4)
 *  @property {number} speed            // effective sim-s per real-s
 *  @property {number|null} lockedSpeed
 *  @property {boolean} paused
 *  @property {boolean} sleeping
 */
/** @typedef {'PRE'|'BANDS'|'TS'|'HURRICANE'|'EYEWALL_FRONT'|'EYE'|'EYEWALL_BACK'|'HURRICANE_BACK'|'SUBSIDING'|'AFTERMATH'} StormPhase */
/** @typedef {Object} StormState
 *  @property {string} name
 *  @property {{lat:number, lon:number}} center
 *  @property {number} heading @property {number} vt          // deg true, m/s
 *  @property {number} pc @property {number} pn               // hPa
 *  @property {number} rmax @property {number} B @property {number} vmax   // m, -, m/s
 *  @property {number} r @property {number} bearingFromCenter // house-relative
 *  @property {StormPhase} phase @property {number} phaseStartT
 *  @property {Forecast} forecast                             // cone used by TV/phone/NWR
 *  @property {TrackPoint[]} track
 */
/** @typedef {Object} EnvState
 *  @property {number} vSustained @property {number} vInst @property {number} gustFactor
 *  @property {number} windDir          // deg FROM
 *  @property {number} pressure @property {number} dPdt       // hPa, hPa/min
 *  @property {number} rainRate @property {number} rainTotal  // mm/h, mm
 *  @property {number} bandPhase        // 0..1 within spiral field
 *  @property {number} tempOut @property {number} humidity
 *  @property {number} sunAlt @property {number} sunAz
 *  @property {number} lightning        // strikes/min within 10 km
 *  @property {number} skyCover @property {number} visibility
 *  @property {number} yardWater @property {number} pondLevel // m
 */
/** @typedef {Object} HouseState
 *  @property {Record<RoomId, RoomState>} rooms
 *  @property {WindowState[]} windows   // 11 + slider
 *  @property {DoorState[]} doors
 *  @property {GarageDoorState} garageDoor
 *  @property {LanaiState} lanai
 *  @property {RoofState} roof
 *  @property {number} interiorPressureDelta   // Pa
 *  @property {number} tempIn @property {number} humidityIn
 *  @property {LeakState[]} leaks
 *  @property {{front:number, slider:number, garage:number}} seep   // L
 *  @property {Record<string, ObjectState>} objects  // every Interactable by id
 */
/** @typedef {Object} RoomState @property {number} water @property {number} temp @property {number} lux @property {boolean} lightOn @property {number} enclosure */
/** @typedef {Object} WindowState @property {string} id @property {'E'|'W'|'N'|'S'} facade @property {boolean} shuttered @property {number} fastening @property {boolean} intact @property {number} flex @property {number} damage */
/** @typedef {Object} GarageDoorState @property {boolean} open @property {boolean} braced @property {number} damage @property {boolean} failed @property {number} oscillation */
/** @typedef {Object} LanaiState @property {number[]} panelTear @property {number} frameDamage @property {boolean} frameFailed @property {boolean} doorLatched */
/** @typedef {Object} RoofState @property {number} damage @property {number} shinglesLost @property {boolean} sheathingLoss @property {number} atticWater */
/** @typedef {Object} LeakState @property {string} id @property {RoomId} room @property {number} rate @property {number} stain @property {string|null} bucket @property {boolean} collapsed */
/** @typedef {Object} UtilityState
 *  @property {{grid:boolean, flickerT:number, outageT:number|null, restoreT:number|null, feederDamage:number, transformerFlashes:number}} power
 *  @property {{pressure:number, boilNotice:boolean}} water
 *  @property {{tier:'LTE'|'3G'|'SOS'|'NONE', towerBattery:number, restoreT:number|null}} cell
 *  @property {{cable:boolean, nwrSignal:number}} broadcast
 */
/** @typedef {Object} DeviceState
 *  @property {{on:boolean, channel:number, volume:number, muted:boolean}} tv
 *  @property {{battery:number, screenOn:boolean, app:string, threads:Record<string, Message[]>, unread:number, wea:Alert[], gallery:string[], flashlight:boolean}} phone
 *  @property {{on:boolean, battery:number, channel:number, alertMode:boolean, queue:string[]}} nwr
 *  @property {{anemometerAlive:boolean, lastGust:number, history:number[]}} weatherStation
 *  @property {{battery:number, on:boolean}} flashlight
 *  @property {{battery:number, on:boolean, placedAt:string|null}} lantern
 *  @property {{tubMaster:number, tubHall:number, cooler:number, coldClock:number}} supplies
 */
/** @typedef {Object} PlayerState
 *  @property {[number,number,number]} pos @property {number} yaw @property {number} pitch
 *  @property {RoomId|'OUTSIDE'|'LANAI'|'GARAGE'} room
 *  @property {boolean} crouching @property {boolean} outdoors
 *  @property {string|null} carrying
 *  @property {Record<string, number>} pockets
 *  @property {number} earPressure      // lags env; drives pop
 *  @property {number} wetness
 */
/** @typedef {Object} LifeState
 *  @property {{state:'sleep'|'watch'|'hideBed'|'hideTub'|'carried'|'carrier'|'eat'|'slider', pos:[number,number,number], fear:number, lastSeenT:number}} cat
 *  @property {{dale:{visible:boolean, where:string, generatorOn:boolean}, marisol:{evacuated:boolean}}} neighbours
 *  @property {{frogs:number, birds:number, cicadas:number}} wildlife
 */
/** @typedef {Object} TaskState @property {{id:string, label:string, done:boolean, doneT:number|null}[]} list */
```

### 9.3 Update order (per real frame)
1. `input` — intents, UI actions, queued interactions.
2. `clock.step` — `dtSim = speed × dtReal`, capped at 600 sim-s per frame; substeps ≤ 5 sim-s for 3–6, analytic for 7–9.
3. `storm.step` — track position, Pc(t), r, bearing, phase.
4. `env.step` — Holland wind and direction, pressure, dP/dt, gust process, band field, rain totals, sun, temperature, yard/pond.
5. `hazards.step` — accumulators (windows, garage, lanai, roof, trees), failure rolls, interior pressure, leaks, seep, debris spawns.
6. `utilities.step` — grid, cell tier, water pressure, cable.
7. `house.step` — room temp/humidity, circuits, object states (tubs, buckets, cold clock, batteries).
8. `devices.step` — TV content, phone battery/messages/WEA, NWR queue, station history.
9. `life.step` — cat FSM, neighbours, wildlife densities.
10. `details.step` — rules engine at 4 Hz; flags, events, log lines.
11. `tasks.step` — completion derived from state.
12. `player.step` — capsule physics, wind push, room lookup, interaction resolution (the only input-driven mutation of object state).
13. `audio.update` and 14. `render.update` — read state, drain events, set parameters, draw.

Events queue during 3–12 and drain in 13–14 (and into the journal). Modules may subscribe for cheap reactions but act only inside their own step.

### 9.4 Event bus
`time:speed`, `time:sleepStart/End {reason}`, `storm:phase {from,to}`, `storm:advisory {forecast}`, `wind:gust {amp,dir,dur}`, `env:earPop {sign}`, `power:flicker {kind}`, `power:outage {final}`, `power:restore`, `transformer:flash {pos}`, `cell:tier`, `cell:restore`, `water:pressureLost`, `alert:wea {type,text}`, `nwr:same {code}`, `nwr:message {text}`, `tv:segment {channel,kind}`, `phone:text {thread,msg}`, `house:leak {id}`, `house:ceilingCollapse {id}`, `house:shutterFail {id}`, `house:windowBreak {id}`, `house:garageFail`, `house:doorSlam {id}`, `lanai:tear {panel}`, `lanai:frameFail`, `tree:fall {id}`, `debris:spawn {kind,pos}`, `debris:impact {target,mass}`, `pond:overtop`, `cat:state {from,to}`, `player:interact {id,verb}`, `player:room {from,to}`, `task:done {id}`, `detail:fired {id}`, `game:chapter {id}`, `game:end`.

### 9.5 Files and ownership (8 engineers; nobody edits another owner's files)
```
src/
  main.js                                            E1  bootstrap, loop, wiring
  core/  clock.js state.js rng.js eventBus.js scheduler.js save.js          E1
  storm/ holland.js track.js rainbands.js gusts.js phases.js forecast.js sun.js   E2
  hazards/ structural.js leaks.js flood.js debris.js trees.js               E2
  utilities/ powerGrid.js cell.js water.js broadcast.js                     E7
  world/house/ floorplan.js walls.js roof.js doors.js windows.js attic.js furniture/*.js   E3
  world/hood/ lots.js houses.js palms.js street.js pond.js props.js lod.js  E4
  textures/ noise.js stucco.js tile.js shingle.js wood.js fabric.js lcd.js  E5 (E3/E4 add files, never edit)
  fx/ sky.js clouds.js eyeWall.js rain.js windowRain.js wetness.js puddles.js vegetationWind.js
      cloth.js lightning.js powerLights.js transformerFlash.js waterPlanes.js stains.js camera.js birds.js   E5
  audio/ engine.js buses.js roomFilter.js wind.js rain.js house.js appliances.js
         same.js wea.js voice.js ambient.js life.js thunder.js              E6
  devices/ tv/{channel,cone,radar,crawl}.js phone/{ui,messages,apps}.js
           nwr.js weatherStation.js barometer.js thermostat.js pc.js       E7
  player/ controller.js physics.js interaction.js carry.js sockets.js      E8
  ui/ hud.js menus.js timeControls.js journal.js captions.js closingCard.js styles.css   E8
  life/ cat.js neighbours.js wildlife.js                                   E6 (behaviour; E5 renders)
  details/ engine.js                                                       E1
  details/catalogue/ prep.js bands.js core.js eye.js after.js              domain owners (E2 storm/hazard, E7 devices, E6 life, E8 player)
  content/ script.js  (texts, advisories, NWR/TV lines)                    E7
test/  storm.test.js hazards.test.js utilities.test.js same.test.js details.test.js   (node --test; module owner)
scripts/ screenshots.mjs  scenarios.json  golden/                          E1 (playwright-core)
```
Frozen on day 1: the `SimState` typedefs (E1), the `Interactable` contract (E8), `windAt(pos)` / `rainAt(pos)` accessors and the shared `wind.uniform` (E2/E5, per `tech-3d.md`), the texture registry (E5), and the event list. Every module exports `init(ctx)`, `step(state, dt)`, optional `dispose()`.

---

## 10. Testing and Verification

### 10.1 Unit tests (`node --test test/`, pure JS)
- **Holland**: V(Rmax) = Vmax ± 1 %; V monotonic either side of Rmax; V(∞) → 0; P(∞) = Pn, P(0) = Pc, dP/dr ≥ 0.
- **Reversal**: on-track wind direction before vs after closest approach differs by 180° ± 25°; +20 km offset peaks ≥ 10 % above −20 km (asymmetry).
- **Eye**: duration of `vSustained < 8` scales linearly with Rmax and inversely with Vt (± 5 %).
- **Gusts**: 10⁵ samples at V = 50: mean G ∈ [0.99, 1.02], P95 ∈ [1.25, 1.40], never negative; same seed → identical series.
- **Rainbands**: default-scenario total ∈ [220, 340] mm; band spacing at r = 150 km ∈ [40, 90] min.
- **Phases**: exact sequence for offset 0; no EYE at offset 35 km.
- **Warp consistency**: 2 h at dt = 1 s vs dt = 600 s → accumulators within 2 %, identical failure outcomes for the same seed.
- **Structural**: unbraced garage fails within 3 h at V = 45 with p ≥ 0.95; braced ≤ 0.15; a fully fastened shutter never fails below 60 m/s.
- **Utilities**: outage precedes EYEWALL_FRONT on all default seeds; cell NONE 6 h after outage; boil-water only if pressure hit 0.
- **SAME**: encoded `ZCZC-WXR-HUW-012115+0600-2451800-KTBW/NWS-` round-trips through a reference AFSK decoder; 16 × 0xAB preamble; attention tone 1050 ± 1 Hz by FFT on an offline render. **WEA**: peaks at 853 and 960 Hz; 2.0/1.0 s × 3.
- **Details engine**: unique ids; triggers reference only existing state paths (schema walk); a 52 h dry run at 600 s steps fires ≥ 95 % of non-player-dependent entries.
- **Audio** (OfflineAudioContext): wind RMS and spectral centroid rise monotonically with V; eye transition falls ≥ 30 dB over 8 sim-min.

### 10.2 Headless screenshots (`scripts/screenshots.mjs`, playwright-core Chromium, `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`, 1280 × 720, against `vite preview`)
The app accepts `?seed=&t=&pose=&speed=0&quality=low&nofx=` and exposes `window.__sim.ready` and `stepTo(t)`. Each scenario warms 30 frames then captures; SSIM ≥ 0.92 against goldens gates CI.

| # | Name | t | Pose | Asserts |
|---|---|---|---|---|
| 1 | prep-kitchen | Wed 08:05 | kitchen → notepad | list legible; TV on; sun |
| 2 | prep-street | Wed 13:00 | driveway → SW | towers; Dale; rack |
| 3 | band-dusk | Wed 20:30 | lanai → W | orange sky; rain curtain; pond ripples |
| 4 | night-flicker | Thu 03:00 (mid-flicker) | hall | lights 60 %; microwave 12:00 |
| 5 | transformer | event frame | bedroom 3 → N | blue-green flash |
| 6 | outage | Thu 08:40 | great room | dark; slits; TV off |
| 7 | leak | Thu 10:30 | bedroom 3 → up | stain; drips; bucket |
| 8 | eyewall-front | Thu 12:45 | great room → slider | bow; whiteout; water sheet |
| 9 | eye-yard | Thu 13:50 | yard → up | stadium; blue; birds |
| 10 | eye-street | Thu 13:55 | street → S | oak on lanai; flood; Dale |
| 11 | back-eyewall | Thu 14:50 | dinette → W | frame failed; rain W→E |
| 12 | night-after | Thu 22:00 | front window | black; Dale's porch light |
| 13 | morning | Fri 07:30 | driveway → N | tarps; debris; line; clear sky |
| 14 | closing | end | — | card values within model ranges |
| 15 | perf | Thu 12:45 | great room | `renderer.info`: ≤ 350 calls, ≤ 600k tris |

Plus a **soak**: 300× full arc headless, no exceptions, no NaN in state (walked every 10 sim-min), heap growth < 50 MB, event counts in range (2–4 transformer flashes, exactly one final outage, ≥ 1 leak, 12–30 ear pops).

---

## 11. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Particles tank integrated GPUs | GPU instancing; budget scaled by rain rate *and* visibility (you cannot see 16k drops in whiteout); indoor rain only at breaches; `quality=low`; a governor that halves budgets when frame time > 20 ms for 30 frames. |
| SwiftShader incompatibility / 2–10 fps | WebGL2 core only; instanced attributes rather than float textures; a CI shader-smoke scenario compiles every material; `nofx` for triage; screenshots step the sim, never wait on wall-clock. |
| Audio CPU | Noise pre-rendered into looped 4 s buffers with random offsets; one AudioWorklet for the OU process; automation at 20 Hz; ≤ 40 live nodes. |
| speechSynthesis absent, async or blocked | Captions are the source of truth; voice is decoration; the title click satisfies autoplay. |
| Warp breaks physics | Substep caps, analytic fast-forward, 10-min failure buckets, the warp test in §10.1. |
| Determinism drift across eight engineers | Named RNG streams; FX never touch sim streams; schema frozen day 1 with dev-mode validation. |
| Boring middle or too long | Loud phases slow, dull phases fast; reading/cards/sleep as diegetic skips; skip-to-event; playtest bar: no > 4 real-min stretch without a new detail. |
| Monotonous dread | Contrast by design: the warm prep morning, the beautiful eye, the kind aftermath. |
| Details read as a checklist | Most fire wordlessly in the world; ≤ 12 captions in the whole game. |
| Pointer lock vs overlays | Phone/menus release lock; ESC standardised in `ui/`; click-to-resume overlay. |
| Scope creep | §7 and §8 *are* the scope. Milestones: M1 grey-box + storm + time controls (wk 2); M2 wind/rain/audio/power (wk 4); M3 devices + details (wk 6); M4 eye/aftermath/polish (wk 8). |
| Meteorological error | Parameters per `meteorology.md` (Holland 1980, gust factors, NHC error stats); review against Ian 2022 / Charley 2004 observations for pressure-fall rates and durations. |

---

## 12. Why This Proposal Is Exceptional

1. **The wind reversal is the plot.** An east-facing house with a west lanai turns Holland (1980) plus a bearing into a two-act structure with the eye as an intermission you can walk out into. Nobody authors it; the physics writes it.
2. **Silence as the loudest effect.** The outage is designed around what disappears — AC, fridge, fans, the TV LED — and the eye around a 30 dB drop. The room filter makes the hall bath *sound* safe, so players go there without being told.
3. **The eye you can walk out into**: stadium cloud, gold light, trapped birds, a flooded street, a waving neighbour, a wall visibly approaching, timed by Rmax and forward speed.
4. **Sleep is unreliable.** Fast-forward is diegetic and interrupted by WEA, SAME, gusts and the cat: the storm night in fragments, the way people actually live it.
5. **Consequential prep without a fail state.** Panels, wingnuts, brace, tub, grill — each a physical act whose consequence arrives hours later. The closing card is the only score.
6. **Instruments that are honest and breakable**: an anemometer that dies at 47 m/s and freezes the display; a barometer you can tap; SAME as real AFSK; WEA at the real frequencies.
7. **A cat with a fear model**, not an animation — she relocates when you are not looking and reappears at the slider in the eye.
8. **109 details with grep-able triggers**, tested for reachability, logged in the journal when they fire.
9. **Deterministic by construction** — seeded, warp-exact, reproducible at `seed=7&t=Thu13:50` on every laptop and under SwiftShader — which is what lets eight people build one atmosphere in parallel.
10. **Kindness in the aftermath.** The last ten minutes are the neighbour's key, the generator's offer, the sister's call, the front step — because a simulation about dread earns its ending only if it also models relief.
