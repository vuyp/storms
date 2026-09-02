# Riding Out a Major Hurricane at Home — Gulf Coast Florida Subdivision
### Domain reference for the "Florida Storm" simulation (house, prep, lived experience, devices, aftermath)

**Scope.** Everything an implementer needs to make the house, the prep days, the storm passage and the aftermath feel *lived-in* and *correct* for a CBS 3/2/2 in a Cape Coral / Port Charlotte / North Port / Sarasota / Tampa-Bay-area subdivision. Fictional storm; defaults assume a Cat 3–4 landfall to the south-west of the house so the house sits in the north/right-front quadrant and the eye passes overhead or just north (both eyewalls experienced, with wind reversal).

**Sources.** Light web verification was possible (NWS WEA 360-character templates and the Extreme Wind Warning text; NWS pages on NWR voices Paul/Donna/Tom and the 1050 Hz tone; LCEC/FPL Ian restoration timelines; a Cape Coral first-person Ian account; pool-cage prep guides). Everything else is domain knowledge from Charley (2004), Wilma (2005), Irma (2017), Ian (2022), Helene/Milton (2024) accounts, FEMA/NWS/NHC public materials, and Florida building practice. Where a number is a design default rather than a hard fact it is marked **(default)**.

---

## 1. The house and the lot

### 1.1 Construction (why it matters for the sim)
| Element | Typical spec | Storm behaviour to model |
|---|---|---|
| Walls | 8" concrete block (CBS), stucco outside, drywall on furring strips inside; painted pastel/beige/greige | Essentially immune to wind; transmits low-frequency thuds from debris; hairline stucco cracks after. Interior walls are wood/metal stud + drywall; the *interior* ceiling is what fails first if the roof leaks. |
| Roof | Hip roof (4 slopes; no gable ends — that's why Florida homes survive) 4:12–5:12 pitch, trusses 24" o.c., plywood/OSB deck, peel-and-stick underlayment (post-2007) or 30# felt, architectural asphalt shingles (or concrete/clay S-tile on nicer houses). Hurricane straps/clips at every truss. | Shingles start lifting at tabs ~70–90 mph gusts (older/3-tab first); ridge-vent cap goes; tiles start sliding/breaking ~100 mph and become missiles. Deck stays, water comes through nail holes in felt if shingles gone. Roof "breathes": you *hear* it creak and pop as trusses flex; visible drywall ceiling flex at the lanai-side rooms. |
| Soffits | Vinyl or aluminium vented soffit panels under the eaves (2' overhang), often poorly attached | **The #1 water-intrusion path** in real storms. At 90+ mph wind-driven rain is forced *up* through the soffit vents into the attic; panels pop out in gusts. Water appears as ceiling stains along exterior walls, drips from can lights and A/C supply registers, sags in drywall. |
| Attic | Blown-in fiberglass over drywall ceiling, ductwork (flex duct), air handler often in garage or a closet, pull-down ladder in hall or garage | Pressure drum. When a window or garage door fails the attic becomes pressurised — ceiling drywall lifts/pops at the joints, attic hatch bounces and thumps. Wet insulation => ceiling collapse ~24 h later. |
| Windows | Single-hung aluminium frame, tinted; either **impact-rated** (laminated; newer/post-Ian rebuilds) or ordinary + shutters | Ordinary glass + accordion/panel shutters is the classic. A shuttered house is *dark* — day looks like dusk; you live by lamplight from 24 h before landfall. |
| Sliding glass doors | Two or three-panel aluminium sliders from family room / master to lanai, 8' tall on newer houses | Weak point: they *flex visibly* (bow inward an inch or two) in gusts, they leak at the sill track first (water trickles in over the track and across tile), and they can unlatch/pop out of the track. Most owners shutter them (accordion or panels), some brace with 2x4 across. |
| Front door | Fiberglass, inswing (Florida code requires outswing on newer homes — good detail: newer house = outswing door, older = inswing that can blow in) with sidelights (sidelights get panels/shutters too) | Water comes under the threshold sweep in wind-driven rain; towels/sandbags. Door "sucks" against frame with pressure changes; audible hiss at the weatherstrip. |
| Garage door | 16' double, steel, unbraced on older homes; wind-rated with a vertical brace kit on better ones | **The classic failure**: the door pumps in and out ("oil-canning") with a metallic *whump-whump*, panels buckle, tracks pull, then it blows in — after which roof loss risk spikes. Braced door: still flexes and booms. |
| Floors | 18–24" porcelain tile throughout (some carpet in bedrooms on older houses), tile is cold/loud; area rugs | Water on tile shows as a spreading dark film; squeaky wet footsteps; towels everywhere. |
| Ceilings | 9'4" or 10' flat, knockdown texture, "tray" ceiling in master, recessed can lights | Drip sources: can lights, A/C registers, smoke detector (they chirp when wet/low battery), ceiling fans. |
| Ceiling fans | Every room + lanai (52" with light kit) | They keep spinning slowly from draughts after power loss; lanai fan thrashes and shreds. |
| HVAC | Split system; condenser on a concrete pad beside the house on a stand, air handler in garage or closet; thermostat set at 76–78 | The **dominant background sound of the house** (compressor hum outside, blower whoosh inside, the click of the relay). Its absence after outage is the loudest silence. Condenser can be blown off its pad or buried in debris. |
| Water heater | 40–50 gal electric in garage or closet | After outage: ~1 day of warm showers left. Good detail: "shower now while it's hot." |
| Plumbing | City water (Cape Coral/Charlotte: municipal; some on wells with electric pumps — well = no water after outage), septic vs sewer (sewer lift stations lose power → "limit flushing" notices) | Toilets gurgle/burp with pressure changes and when the sewer system is full; low pressure then boil-water notice. |
| Electric | 200 A panel in garage; overhead service from a pole-mounted transformer at the rear/side lot line (newer subdivisions: underground with a green pad-mounted transformer box in the front yard) | Overhead = flicker, brownout, transformer flash. Underground = more likely just goes out when the feeder does. |
| Lanai | Under-truss covered lanai + screened "pool cage" (aluminium extrusions, fiberglass screen; 12–20' tall "mansard" or "dome" cage), pavers, pool with a screen door, pool pump/heater on pad | **Cage failure is near-universal in ≥Cat 3.** Sequence: screen panels bulge and hum → screen tears in a panel with a *rip*, then panels go one by one with flapping/snapping → a cage beam bends, a crunching sound, the whole thing folds "in slow motion" → aluminium ends up in the pool or on the roof. Pool turns from blue to tea-brown with debris; water level overtops. |
| Lot | 80'×125' typical; front yard St Augustine turf, mulch beds, foundation hedges (clusia, podocarpus, ixora, croton, hibiscus), 2–4 palms, sometimes a live oak; irrigation with pop-up heads and a green rotor controller box; mailbox at the road (cluster mailbox in newer HOAs); driveway 2 cars wide with a "swale" (grassy ditch) at the street | Palm fronds shred and litter everything; oaks lose limbs / uproot in saturated soil; hedges flattened; mailboxes gone; swales and the street flood 6–18" in heavy bands. |
| Street | Cul-de-sac or grid with 60' ROW, curb or swale, storm inlet every ~200', "retention pond" (with a fountain, sometimes an alligator) behind the back row of lots, streetlights (LED cobra heads on concrete poles), stop signs, HOA sign at the entrance | Pond rises to the yards; streetlights are dead post-outage (dark subdivision = one of the eeriest details); stop signs bent flat. |

**Palms:** *Sabal (cabbage) palm* — native, tough, fronds fold up like a closed umbrella and it survives almost anything. *Queen palm* — tall, thin, fronds strip off; snaps or uproots. *Royal palm* — huge, self-cleaning; sheds 50-lb fronds that fall like spears and can pierce a roof. *Coconut palm* — coconuts become missiles; fronds thrash. *Foxtail/Christmas (Adonidia) palm* — small ornamental, shreds. *Live oak* — dense canopy catches wind, big limbs down, whole-tree uproot in flooded soil, roots lift sidewalks. *Ficus hedges* — go over as a wall.

### 1.2 Neighbourhood cast (defaults)
- **Across the street:** retired couple, "Ray & Linda", lived here 22 years; Ray puts up his panels the earliest and walks over to ask "you staying?". Generator owner. Flag on the house.
- **Next door left:** young family with a dog, "the Nguyens"; kids on bikes pre-storm; evacuate at T-24h and text "we're at my sister's in Orlando, can you check on the house?".
- **Next door right:** snowbird house, empty, unshuttered — its screens and shingles become debris that hits *your* house. Ring doorbell blinking blue.
- **Behind (across the pond):** the guy with the boat on a lift who spends T-48h strapping it down.
- **Group text:** HOA/"Sandpiper Cove Neighbors" WhatsApp/GroupMe with 40 members — the main social feed of the storm.

---

## 2. Object lists per room (props to model)

**Garage (2-car):** car(s) pulled in nose-first; second car in driveway if 2 cars + stuff; shelving with plastic totes; hurricane panels (corrugated aluminium, labelled with a Sharpie "MBR L", "KIT 2"), wing nuts in a coffee can; drill; ladder; portable generator (3500–7500 W, red/black) + 5-gal gas cans (red, 4–6 of them); propane tanks (20 lb); chest freezer; water heater; A/C air handler; electric panel; chest of tools; bikes on hooks; cooler(s); pressure washer; garden hose; bag of charcoal; sandbags; garage fridge with drinks; pull-down attic stair; wet-dry vac; a box fan; a mildew smell after.

**Kitchen:** granite counters; gas or electric range (electric, default — no cooking after outage except camp stove on the lanai); fridge with water/ice dispenser (**turn off ice maker**), freezer packed with gallon Ziplocs of frozen water; counters covered in: cases of bottled water, canned goods, bread, peanut butter, pop-tarts, chips, batteries, flashlights, candles, lighter, paper plates, paper towels, Sharpie, roll of duct tape, coffee maker + a thermos of coffee made the night before, French press / instant coffee, portable phone chargers charging, weather radio, a printed hurricane tracking chart from the grocery store, a manual can opener, gallon jugs of tap water, pitcher; kitchen TV (small) tuned to local news; dish drainer; sink full of dishes (done before landfall). **Post-storm:** "the fridge smell" when opened after 3 days; coolers on the floor; trash bags full.

**Family/great room:** big sectional; 65" TV on the wall (tuned to local coverage until the cable drops); sliders (shuttered → dark); ceiling fan; lamps; mattress dragged from a bedroom for the hallway; laundry basket of "important stuff"; the dog's bed; coffee table with laptop, tablet showing radar, phone on a battery bank; candles/lanterns; couch cushions; a bucket under a ceiling drip; towels rolled along the slider track; the wet-floor sheen.

**Master bedroom:** king bed, tray ceiling with fan, walk-in closet (**the** safe room: interior, no windows, mattress against the door), en-suite with a garden tub (**filled** — for flushing, not drinking), double vanity, shower; sliders to the lanai (shuttered); nightstand with a lantern.

**Bedroom 2 / 3:** guest room / office. Office: desk, printer, router/modem (blinking, then dead), UPS beeping when power goes.

**Hall bath (interior):** tub filled with water; bucket for flushing; candles; this + master closet + hall are the refuge zone.

**Laundry room:** washer (filled with ice as an extra cooler on some checklists), dryer, sink, litter box.

**Lanai:** patio table + 4 chairs, chaise lounges, grill (Weber propane), outdoor rug, potted plants, ceiling fans, a TV on the wall (some), pool toys — **all of this goes inside or in the pool** at T-24h. Pool pump on a timer; pool light; screen door.

**Front:** porch bench, potted plants, doormat, wreath, Ring doorbell, house-number plaque, coach lights, flag, mailbox, garbage/recycle bins (bring inside/garage), hurricane shutters on windows, flowers.

**Exterior mechanical:** A/C condenser; irrigation backflow preventer (the brass thing); electric meter with a padlock tag; cable/fiber NID box; hose reel; pool equipment.

---

## 3. The prep timeline (what people do, in order)

Timeline anchor: **landfall L**. Cone appears ~5 days out. Hurricane Watch is issued ~48 h before tropical-storm-force winds arrive; Hurricane Warning ~36 h before TS winds. TS winds typically arrive ~12–18 h before the eye. Evacuation orders come in zones (Zone A first — coast/canal areas — usually ~48 h out). The player is in Zone B/C or a non-evac zone and stays. **Compressed timeline default:** 5 days real → ~90–120 minutes of gameplay with sleep-skips.

| Time | What happens outside | What people do at home | Sim triggers |
|---|---|---|---|
| **L−120 h (day 1)** | Cone shows Florida west coast "in the cone"; grocery store water aisle already thin; gas lines start. Weather is *beautiful* — hot, blue, thunderstorms at 4 pm as usual. | Check supplies; "buy water and batteries just in case"; joke about it. Look for the shutter panels and wing nuts. Fill gas cans. | Phone: news push notifications. TV: cone at every top of hour. |
| **L−72 h** | Model spaghetti tightens; Hurricane Watch soon. Gas stations running out (bags on pump handles), Publix limits water to 2 cases. ATM lines. Home Depot out of plywood and generators. | Cash from ATM ($300–500); fill both cars; propane exchange; pick up prescriptions (Florida allows 30-day early refills under emergency); charge everything; freeze water in gallon Ziplocs/bottles; download offline maps/movies; photograph every room for insurance; put documents (passports, deeds, insurance policy) in a Ziploc/waterproof pouch. Buy ice. Trim what you can trim (too late, really). Laundry. | Neighbour Ray: "You staying?" text. HOA email: "Secure your lanai." |
| **L−48 h** | **Hurricane Warning issued.** Evacuation order for Zone A. Schools/county close tomorrow. First high clouds (cirrus outflow) — the sunset is *spectacular* and everyone posts it. Bridge/causeway closure warnings. Surge forecast in feet. Sandbag distribution at the county park (2-hour lines). | **Shutters go up** (the sound of the subdivision = drills and wing nuts and aluminium panels clattering, all day; neighbours helping each other with the tall ones). Bring in everything from the lanai (furniture into the pool or the garage). Trash bins into the garage. Lower the pool water 6–12" *(do not drain)*, add extra chlorine shock, pull the pump breaker on the day. Take down the hanging plants, wind chimes, flags. Park the cars in the garage nose-first; the extra car in the middle of the driveway away from trees. Test the generator; stage extension cords. Fridge/freezer to coldest. Fill more Ziplocs. Cook the perishables ("hurricane feast" — everything in the freezer gets grilled). | WEA: Hurricane Warning (some counties push). Radio alert. Nguyens leave. |
| **L−36 h** | Bands not here yet; **wind picking up, gusty**, more clouds, a hot heavy stillness between gusts. Birds are loud and then oddly gone. Gas stations mostly dry; stores close by evening. The last Publix run: they're out of bread, water, batteries, and there's a line to the back. | Fill the bathtubs (with a WaterBOB if you own one, else just fill — and tape/plug the drain); fill pots, pitchers, the washing machine; put towels at every door; sandbags at the garage-to-house door and the sliders; move valuables/photos off the floor and away from windows; move electronics off the floor; charge the battery banks again; wash all the dishes and clothes; final ice run; set up the safe room (closet/hall bath) with mattress, pillows, flashlight, helmets (bike helmets — genuinely recommended), shoes on. Make coffee for the morning into thermoses. Fill the cooler. Freeze more. Put the car keys/wallet/documents in the "go bag" anyway. Take the cage screen door off/tie it open (advice: remove screens to save the cage; nobody does). Turn off the ice maker. Move the pool cage furniture. | First outer-band shower with a gust to 35. |
| **L−24 h** | **Outer bands begin.** Squalls: 15 min of horizontal rain and 40–50 mph gusts, then sun. Tornado Watch issued for the whole region. County: "if you haven't left, shelter in place now." Bridges close at sustained 40 mph. TV wall-to-wall; NHC advisories every 3 h now, intermediate every hour. Barometer starts a visible slide. | Last look outside; take the "before" photos; check the roof from the yard; put the garage door brace in. Unplug the TV and computers? (Most don't until the flickers.) Eat a real meal. Tell the group chat "we're staying, wish us luck". Pets: crate/leash inside, litter box moved to the laundry, dog walked in a lull. Prescriptions in the go bag. | WEA: Tornado Watch (not pushed) then **Tornado Warning** (pushed — first WEA scream of the storm). Power flickers once. |
| **L−12 h** | **Tropical-storm-force sustained winds** (39+ mph), rain in sheets, cage screens humming, first shingles off the snowbird house, palm fronds down. Streets starting to pond at the swales. Power flickers repeatedly; the transformer down the street *pops*. Cell towers on battery. Emergency services announce they **stop responding** at sustained 40–45 mph. | Everyone's phone is the radar. Fill the thermoses. Pull the breaker to the pool pump and water heater? (some do). Shower ("last shower"). Kids to bed in the interior room. Look out through the one un-shuttered peep window, then stop looking. Stay off the lanai. | Possible outage here (**default: power out at L−9 h during a 60 mph gust, transformer flash** visible through the peep window). |
| **L−6 h → L** | Hurricane-force winds; eyewall approach; the sound goes from howl to roar to freight train. Debris strikes. Garage door pumping. Pressure dropping fast — ears. Extreme Wind Warning WEA at ~115+ mph expected. | Everyone in the hall/closet with mattresses; phones on 10% brightness; weather radio on; counting the gusts; dog panting. | Peak. |
| **L (eye)** | Wind drops to nothing in 10–15 min; rain stops; sunlight/stars; birds; dripping; you can hear the *generator across the street* and *car alarms* and the roar of the far eyewall like surf. 20–60 minutes long. | Go out and look (people do). Check the roof, the cage, the car. Neighbours emerge into the street shouting "you OK?". Nail down what you can; put towels back. **Get back inside before the wind returns from the opposite direction.** | Wind reversal. |
| **L+1 h → L+6 h** | Back eyewall, wind from the opposite side; things that survived the front side (the cage, the shutter on the *other* side of the house, the loosened shingles) go now. "The back side was worse." Then a long, slow decline; the rain keeps coming for hours; flood water peaks 2–6 h after the eye. | Same, tired. Mopping. Bailing the slider track with a dustpan. Checking ceilings by flashlight. | |
| **L+6 h → L+12 h** | Wind down to TS then gusty breeze; rain ending; the sky clears fast behind the storm; if it's night, an unbelievably dark and starry sky over a subdivision with no lights. Curfew announced. | Sleep in the heat with windows shut, then open the un-shuttered windows for a breeze; every mosquito comes in. | Aftermath phase. |

**Things people don't do (myths to *not* model as effective):** taping windows (does nothing; makes bigger shards), opening windows "to equalise pressure", draining the pool (empty pool pops out of the ground), running the generator in the garage (CO deaths every single storm), candles left burning (fires), sleeping in a room with a window even if shuttered.

---

## 4. The sensory reality, by wind speed

Reference: **sustained** speeds (1-min); gusts ≈ 1.3× sustained over land. Sound levels are for inside a shuttered CBS house.

| Sustained wind | Outside | Inside / house | Human |
|---|---|---|---|
| 20–30 mph (bands begin) | Palms sway, fronds flap and hiss; rain starts and stops; wind chimes (until removed); the cage screens *hum* softly. | Nothing much; occasional rattle of a loose panel; A/C still running. | Excitement, checking phone constantly. |
| 35–45 (TS) | Trees leaning in gusts, fronds tearing, rain horizontal in squalls; first debris (trash lids, screen panels from the empty house); ponding at swales; the roar has a *whooshing* pulse with each gust. Power flickers. Cage panels start to rip. | Wind noise becomes constant — a low *whoosh* with rising and falling gusts; rain drums on the shutters with a metallic patter; panels rattle; the sliders tick in their tracks. First water at the slider track. | Nervous jokes. |
| 50–65 | A steady roar; trees bent, small branches flying, palm crowns snapping around; can't stand outside; visibility 100 ft; shingles peel from older roofs; streetlights out/flickering; transformer flashes. | Whistling/organ-pipe tones start (wind across shutter edges, soffit vents, the chimney of the range hood vent, the dryer vent flap *clacking*). The house *ticks* and *pops*. Garage door begins to flex — a soft periodic *whump*. Water under the front door. Power fails (**default**). | "Here we go." Kids scared. Dog under the bed. |
| 75–95 (Cat 1) | A **howl** that doesn't stop; the pitch rises in gusts to a scream; everything flexible is horizontal; debris impacts every minute; cage goes; big limbs down; roofs shedding shingles; street is a river. Rain is white noise on top. | Shutters *boom* on impacts; the roof creaks in long groans; ceiling drywall visibly shivers; the attic hatch lifts and drops; doors rattle in their frames; toilet water rocks and gurgles; ears pop. Water at window sills, drips at can lights. Pitch black without lanterns; heat rising (85°F inside). | Retreat to the hall. Silence between people. |
| 100–120 (Cat 2–3) | **Freight train / jet engine** — a continuous roar you feel in your chest; you can't tell rain from wind; blue-green transformer flashes light the underside of the clouds; the snowbird house's roof goes in a sheet; a pool cage sails across the pond; the oak comes down with a crack you hear over the roar. | Everything shakes. Trusses *bang*. The garage door slams in and out, tracks screeching; a panel buckles with a *crunch*. Sliders bow inward; the sound of glass *straining*. Something big hits the roof (cage aluminium, a frond) — a sound like a car crash upstairs. Ceiling sag forms; drips become streams. Pressure changes make the interior doors slam and *suck*; ears hurt. | Fear. Sit with backs to the wall, helmets on. Pray/laugh. Phone: "Extreme Wind Warning". |
| 130–150 (Cat 4) | Nothing is describable; shingles and tiles gone from most roofs; garage doors in; some roofs off; trees stripped bare like winter; cars moved; water at the door. | If the garage door fails: the noise inside triples, the attic pressurises, the ceiling drywall lifts, insulation blows through the can lights, the house *breathes*. | Survival mode. |
| **Eye** | Wind → 0 within minutes; rain → dripping; light — a weird bright orange/pink or clear starlight; the eyewall visible as a black wall on every horizon; birds (seabirds circle in the eye — real); frogs immediately; the surf-like roar of the far wall; distant sirens? no — no sirens, nobody's coming; generators; car alarms; a neighbour's shouting. Steam rising. Pressure at minimum — ears feel full/ache. | Total silence except dripping and the dog. Sudden awareness of the damage: daylight where the cage was. | Everyone goes outside. Awe. The most-photographed moment. |
| **Back eyewall** | From dead calm to 100+ mph in ~10 minutes *from the opposite direction*. What was in the lee is now hit. Things pre-loosened go in the first gust. | Repeats, opposite side; water now enters at the *other* sliders/windows. | "This is worse." |
| Subsiding (TS → 25) | Rain continues for hours; wind down in steps; flood water still rising; then the sky breaks and there's a rainbow/sunset. | The house drips; fans slowly stop; the heat. | Exhaustion. Sleep in the hallway. |

### 4.1 The power going out (canonical sequence)
1. **Flicker** at L−20 h (band gust): lights dip for 200 ms, the TV reboots, the microwave clock resets to blinking 0:00, the UPS in the office *beeps* once, the A/C compressor thumps back on. Repeat 3–8 times over the next hours; each time the microwave/oven/coffee-maker clocks blink and someone resets them (or gives up).
2. **Brownout**: lights dim to orange for 1–3 s; the fridge compressor groans; fans slow; TV image shrinks.
3. **Transformer**: through the window a **blue-green flash** lights the rain like a giant camera flash, followed by a *crack-BOOM* and sometimes a sustained arc-buzz and a second flash; the sky glows green-white for a second. Then everything dies at once.
4. **Silence**: the A/C blower stops mid-breath; the fridge stops; the ceiling fans coast down over ~20 s; the router lights die; the UPS screams (continuous beeping until someone unplugs it); the smoke detectors chirp once; the lanai landscape lights die; the pool pump stops; the wind is *suddenly louder* because the house noises are gone.
5. **Dark**: pitch black in a shuttered house even at noon. Phone flashlights come on. Lanterns. Then the flashlight-on-the-ceiling glow.
6. **Heat**: inside temperature rises ~1°F every 10–15 minutes toward the outside 80–84°F; humidity to 85–90%; sweat; tile floors feel cool so people lie on them; sleeping is impossible.
7. **Water heater**: warm water for ~24 h; **well pump** (if any) dead immediately; municipal water pressure drops over ~12–36 h as lift stations and plants lose power; then the boil-water notice.

### 4.2 Pressure changes
Central pressure of a Cat 3–4 ~ 940–955 hPa; ambient ~1012 hPa before. A drop of 50–70 hPa over ~12 h = ~1,500–2,000 ft of altitude gain: ears pop; the pop reverses in the eye and again on the back side. Effects: doors "suck" shut and hiss around weatherstrips as gusts pass; interior doors bang from room-to-room pressure differences; the front door *bulges*; toilets gurgle and water levels rock; the attic hatch lifts; sinus/headache; the home weather station shows the plunge (people screenshot 28.0 in Hg). A cheap barometer in the sim HUD (weather station app) is a great detail.

### 4.3 Sounds to synthesise (glossary)
- Wind base: pink/brown noise, bandpassed 100–800 Hz, amplitude tied to sustained; **gust envelope** every 3–15 s with 1–3 s attack.
- **Whistles**: narrow resonant peaks (600–2,500 Hz) fading in above ~55 mph, random detune; from soffits/shutter gaps; strongest on windward rooms.
- **Shutter rattle**: metallic buzz (aluminium panels) — impulse train at 8–20 Hz, above 40 mph.
- **Rain on shutters**: dense high-passed noise crackle, intensity with rain rate; on tile roof a deeper drum.
- **House creaks/pops**: sparse random wood-crack transients (100–400 Hz thud + 2 kHz click) whose rate scales with gust strength; louder in bedrooms under the roof.
- **Garage door pump**: low *whump* (40–80 Hz) with metallic ring, periodic with gusts; becomes bang/screech before failure.
- **Debris impact**: thump/clang variants (frond = soft thud with rustle; shingle = flat slap; aluminium = ringing crash; branch = wood crack).
- **Transformer**: sharp crack + sub boom + 1–2 s arcing buzz (60 Hz harmonic rasp) + optional second pop.
- **Cage failure**: screen rip (zip of a tearing fabric, 0.5 s), aluminium groan (bending, 2–4 s low creak) then crunch and clatter.
- **Eye**: dripping water, frogs (chorus), a distant surf-roar (heavily lowpassed wind noise), a generator (2-stroke-like 60 Hz drone), a car alarm cycling, birds.
- **Post-storm**: generators (many, spatially placed), chainsaws (varying RPM, 2-stroke whine, bogging when cutting), helicopters, bucket-truck backup beepers, mosquitoes at night, a truck with a loudspeaker (ice/water distribution), the neighbor's radio.
- **Inside quiet**: A/C hum (compressor ~60 Hz + blower broadband) present until outage; fridge cycle; ceiling fan whir; a clock; the dog's nails on tile; the UPS beep; the weather radio.

### 4.4 Water intrusion ladder (trigger → visual)
| Trigger | Where | Visual |
|---|---|---|
| Rain rate ≥ 1 in/h + wind ≥ 40 from that side | Slider track (family room/master) | Dark line along the track, then a spreading pool 1–3 ft into the tile; towels darken. |
| Wind ≥ 50, windward side | Front door / garage-to-house door threshold | A fan of water under the door; the doormat floats. |
| Wind ≥ 70 | Window sills (windward) | Weeping at the sill; the shutter behind the glass is running with water. |
| Wind ≥ 80 for > 30 min | Soffit intrusion → attic | Ceiling stains grow (yellow-brown rings) near exterior walls; drips at can lights and A/C registers; a bucket appears. |
| Wind ≥ 100 or shingles gone | Roof deck | Streams; sagging drywall belly; insulation dust in the drip; collapse 6–24 h later. |
| Street flooding ≥ curb (heavy bands over hours; more if surge zone) | Garage | Water seeps under the garage door; the garage floor sheen; things on the floor get wet. |
| After the storm, first sunny day | Everything | Water stains dry to rings; mildew smell starts within 24–48 h. |

---

## 5. Devices, media and alerts (exact formats)

### 5.1 Wireless Emergency Alerts (WEA)
**Behaviour.** Delivered by cell broadcast (works even when data is dead, but *not* when the tower is fully down). Phone screams the **WEA tone**: a distinctive dual-tone pattern (853 Hz + 960 Hz, the same as EAS) — "*bzzt-bzzt-bzzt* … *bzzt-bzzt-bzzt*" roughly two groups of three short bursts, ~2 s each, at max volume even on silent (unless the user has disabled them in Settings > Notifications > Government Alerts / Emergency alerts) with a matching long-vibration pattern. iPhone: full-screen banner "Emergency Alert" (or "Extreme Alert"), white text on dark; Android: full-screen "Emergency alert" card with the header and an OK button. Everyone in the room's phone goes off *at once, slightly out of sync* — the classic detail. Cell towers run ~4–8 h on battery after grid loss (some with generators run days). Data goes first (LTE → 3G-like → "SOS"), then calls, then SMS is the last to work because it rides the signalling channel. Texts arrive in bursts hours late after service returns.

**Which alerts are pushed as WEA by NWS:** Tornado Warning, Flash Flood Warning (considerable/catastrophic tags), Hurricane Warning (issued once, 90-char header + 360 in newer phones), Storm Surge Warning, **Extreme Wind Warning**, Dust Storm, Tsunami. County EOC pushes evacuation orders, curfews, boil-water notices and shelter openings via IPAWS (as "Emergency Alert" or via opt-in systems like AlertLee / Alert Charlotte / Alert Sarasota — SMS/e-mail/app pushes).

**Sample texts (use verbatim; NWS templates; times are local):**

- Hurricane Warning (90): `NWS: HURRICANE WARNING this area. Check media and local authorities.`
- Hurricane Warning (360): `National Weather Service: A HURRICANE WARNING is in effect for this area. Hurricane conditions are expected within 36 hours. Complete preparations to protect life and property. Follow instructions from local officials.`
- Storm Surge Warning (360): `National Weather Service: A STORM SURGE WARNING is in effect for this area. Life-threatening inundation from rising water moving inland from the coastline is expected. Follow evacuation orders from local officials.`
- Tornado Warning (90): `NWS: TORNADO WARNING in this area til 3:45PM EDT. Take shelter now. Check local media.`
- Tornado Warning (360): `National Weather Service: TORNADO WARNING in this area until 3:45 PM EDT. Take shelter now in a basement or an interior room on the lowest floor of a sturdy building. If you are outdoors, in a mobile home, or in a vehicle, move to the closest substantial shelter and protect yourself from flying debris. Check media.`
- Flash Flood Warning (360): `National Weather Service: FLASH FLOOD WARNING in this area until 9:00 AM EDT. This is a dangerous and life-threatening situation. Do not attempt to travel unless you are fleeing an area subject to flooding or under an evacuation order. Turn around, don't drown.`
- Extreme Wind Warning (90): `NWS: EXTREME WIND WARNING this area til 11:35PM EDT. Take shelter now.`
- Extreme Wind Warning (360): `National Weather Service: An EXTREME WIND WARNING is in effect for this area for the immediate danger of life-threatening winds til 11:35PM EDT. Take cover NOW in an interior room of a sturdy building, away from windows. Protect your head from flying debris. Do NOT go out in the calm of the hurricane eye! Winds will quickly become dangerous again.`
- Evacuation (county, example style): `LEE COUNTY EMERGENCY ALERT: MANDATORY EVACUATION ordered for Zones A and B and all mobile/manufactured homes effective 7AM. Shelters open. Leave now. Info: leegov.com/storm 211`
- Shelter in place: `CHARLOTTE COUNTY EM: Tropical storm force winds have arrived. Emergency responders are no longer able to respond to calls. SHELTER IN PLACE NOW. Stay away from windows. Do not go out during the eye.`
- Curfew: `CITY OF CAPE CORAL: A curfew is in effect from 9 PM to 6 AM until further notice. Stay off the roads. Traffic signals are out - treat every intersection as a 4-way stop.`
- Boil water: `LEE COUNTY UTILITIES: PRECAUTIONARY BOIL WATER NOTICE in effect. Boil water for 1 minute before drinking, cooking, brushing teeth or making ice. Until further notice.`
- Post-storm CO warning (Florida DOH, real practice): `FL DEPT OF HEALTH: Generators kill. NEVER run a generator inside a home or garage, even with the door open. Keep it 20 ft from windows and doors.`

### 5.2 NOAA Weather Radio (NWR)
- Frequencies: 162.400–162.550 MHz. SWFL sites: Fort Myers (WXK67? — use "KHB39"-style call fictional), Tampa (KHB32 162.550), Sarasota, Naples. Player's receiver: a Midland WR-120 or the radio on a crank flashlight ("weather band"); "SAME" mode set to the county FIPS (Lee 012071, Charlotte 012015, Sarasota 012115, Hillsborough 012057, Pinellas 012103, Collier 012021).
- **Alert sequence**: (1) three bursts of **SAME header** — a harsh data-modem *brrrrrap* (AFSK, 520.83 baud, 1562.5/2083.3 Hz) ~1 s each, separated by 1 s silence; (2) the **1050 Hz attention tone** for 8–10 s (this is what wakes the receiver); (3) the voice message; (4) three short **EOM** bursts (*brrp brrp brrp*). Receiver: red "WARNING" LED, LCD shows `HURRICANE WARNING` / `TORNADO WARNING`, its own piercing siren before unmuting.
- **Voice**: current NWS synthetic voice is the "Paul" (NeoSpeech VoiceText; a flat, slightly nasal male) — older "Donna" (female) and "Tom" (male, DECtalk-ish) are retired but iconic; the speechSynthesis fallback should be a *flat, robotic, evenly paced* male voice. Cadence: reads everything including "…IN EFFECT UNTIL EIGHT PM EASTERN DAYLIGHT TIME…" Numbers are read digit-group style ("winds one hundred twenty miles per hour").
- **Routine cycle** (every ~5–7 min, when not alerting): station ID → current conditions ("At three PM, Punta Gorda, rain, seventy-nine degrees, wind north-east at thirty-two gusting to fifty-one, pressure twenty-nine point three one and falling rapidly") → hurricane local statement excerpts → forecast → tides → the hazardous weather outlook → repeat. During the storm the cycle is dominated by the Hurricane Local Statement (HLS) and tornado warnings.

**Sample NWR script (Hurricane Local Statement excerpt):**
```
THE NATIONAL WEATHER SERVICE IN TAMPA BAY RUSKIN HAS ISSUED A HURRICANE LOCAL STATEMENT.
THIS PRODUCT COVERS WEST CENTRAL AND SOUTHWEST FLORIDA.
HURRICANE PAULETTE IS FORECAST TO MAKE LANDFALL AS A MAJOR HURRICANE NEAR CHARLOTTE HARBOR THIS EVENING.
NEW INFORMATION: THE HURRICANE WARNING HAS BEEN EXTENDED NORTHWARD TO ... A STORM SURGE WARNING IS IN EFFECT FOR ... AN EXTREME WIND WARNING WILL BE ISSUED WHEN THE EYEWALL APPROACHES.
POTENTIAL IMPACTS: WIND. PROTECT AGAINST DEVASTATING WIND HAVING EXTREME IMPACTS ACROSS LEE, CHARLOTTE AND SARASOTA COUNTIES. STRUCTURAL DAMAGE TO STURDY BUILDINGS, SOME WITH COMPLETE ROOF AND WALL FAILURES. COMPLETE DESTRUCTION OF MOBILE HOMES. NUMEROUS LARGE TREES SNAPPED OR UPROOTED. NEARLY ALL POWER AND COMMUNICATION SERVICES WILL BE LOST FOR WEEKS.
PRECAUTIONARY PREPAREDNESS ACTIONS: NOW IS THE TIME TO SHELTER IN PLACE. IF YOU ARE IN A STURDY STRUCTURE, MOVE TO AN INTERIOR ROOM AWAY FROM WINDOWS. DO NOT VENTURE OUTSIDE DURING THE PASSAGE OF THE EYE. THE WINDS WILL RETURN SUDDENLY FROM THE OPPOSITE DIRECTION.
THE NEXT LOCAL STATEMENT WILL BE ISSUED BY THE NATIONAL WEATHER SERVICE IN TAMPA BAY RUSKIN AROUND EIGHT PM EDT, OR SOONER IF CONDITIONS WARRANT.
```

**Sample NHC advisory header (for the TV crawl / phone app):**
```
BULLETIN
Hurricane Paulette Advisory Number 18
NWS National Hurricane Center Miami FL   AL172026
500 PM EDT Wed Sep 09 2026

...EXTREMELY DANGEROUS CATEGORY 4 PAULETTE APPROACHING THE SOUTHWEST FLORIDA COAST...
...CATASTROPHIC STORM SURGE, WIND, AND FLOODING EXPECTED...

SUMMARY OF 500 PM EDT...2100 UTC...INFORMATION
LOCATION...26.3N 82.6W
ABOUT 35 MI...55 KM WSW OF FORT MYERS FLORIDA
MAXIMUM SUSTAINED WINDS...140 MPH...220 KM/H
PRESENT MOVEMENT...NNE OR 20 DEGREES AT 9 MPH...15 KM/H
MINIMUM CENTRAL PRESSURE...945 MB...27.91 INCHES
```
(Name choice: **Paulette** and **Marco/Nana** are the plausible mid-September names of the 2026 list; make it selectable.)

### 5.3 Local TV coverage (WINK / NBC2 / WFTX / WFLA / Bay News 9 flavour)
- "Wall-to-wall" from ~L−36 h: no commercials, the chief meteorologist in shirtsleeves who has "not slept", the 5-day cone, "spaghetti models", the "Euro vs GFS", the radar loop with the eye, the "First Alert Hurricane Tracker", surge maps, "Know your zone", reporters on the beach leaning into the wind in a station rain jacket while foam blows past, the sheriff and the county manager at the EOC podium, the "we will not be able to send help", the evacuation zone graphics, the shelter list crawl. Cable/fiber TV dies with the power (or before, when the node loses power); an **antenna** on a battery TV keeps going; the station streams on its app/YouTube until your data dies. Anchors say "hunker down", "shelter in place", "this is the time", "the back side of the storm", "wobble", "the dirty side", "the eyewall is on our doorstep".
- **Crawl lines (samples):** `HURRICANE WARNING: LEE, CHARLOTTE, SARASOTA, MANATEE, COLLIER, DESOTO` · `MANDATORY EVACUATION ZONES A AND B — LEE COUNTY` · `SHELTERS OPEN: ESTERO REC CENTER, HERTZ ARENA, ISLAND COAST HS` · `SANIBEL CAUSEWAY CLOSED` · `CAPE CORAL BRIDGE CLOSED — SUSTAINED WINDS 40 MPH` · `TORNADO WARNING: WESTERN CHARLOTTE COUNTY UNTIL 4:15 PM` · `LCEC: 178,000 CUSTOMERS WITHOUT POWER` · `FPL: 1.2 MILLION WITHOUT POWER STATEWIDE` · `CURFEW 9PM–6AM ALL OF LEE COUNTY` · `BOIL WATER NOTICE: CAPE CORAL, FORT MYERS, LEE COUNTY UTILITIES` · `DO NOT DRIVE THROUGH FLOODED ROADS` · `ICE & WATER DISTRIBUTION 9AM: HAMMOND STADIUM, NORTH FORT MYERS REC CENTER`.

### 5.4 Phone / apps / cameras
- Weather apps: radar (the RadarScope-style reflectivity loop), the NHC cone, a home-weather-station app (Tempest/Ambient/Davis — shows wind gust record, pressure plunge, rain total, "sensor offline" when the station blows off the roof), FPL/LCEC outage map (a spreading red blob; the estimated restoration time "Assessing" for days), Ring/doorbell cam (the outdoor view until the Wi-Fi dies; motion notifications "Person detected" when the cage hits the front yard — then "Offline"), Nextdoor/Facebook group posts ("Anyone else's water pressure low?"), the group text.
- **Group text samples**: `Ray: Y'all staying? Linda's doing lasagna at 5 if you want before it gets bad` · `Nguyen: We're at my sister's in Orlando. Can you check our roof after?? 🙏` · `Ray: Transformer on Sandpiper just blew, we're dark` · `Mom: CALL ME` · `Ray: In the eye. Cage is gone. Your shingles look ok from here` · `Ray: WIND BACK GET INSIDE` · (L+9 h) `Nguyen: ??? is the house ok` (delivered 6 hours late) · `Linda: Generator's running, come charge phones, coffee at 7` · `HOA: Please place vegetative debris at the curb separate from construction debris` · `Ray: Publix on Pine Island Rd open cash only, line to the road` · `FPL alert: Your estimated restoration time is 9/17 11:45 PM`.
- Phone HUD states: `LTE` → `LTE` with one bar and no data → `SOS` → `No Service` → intermittent `1x` → back. SMS "Not Delivered" red, then delivered in a burst.

### 5.5 Generators, light, ice
- **Portable generator** (5,500 W, gas): 70–80 dB at 20 ft; a raspy, load-modulated drone; runs 8–12 h per 5-gal tank; powered via **extension cords through a cracked window** (or a transfer switch / interlock kit on the panel for the prepared) to the fridge, a box fan, a window A/C or a portable A/C, phone chargers, the coffee maker. Placed on the lanai or driveway with a tarp/tent — **20 ft from openings**; the CO deaths happen when people put it in the garage "with the door open". Nights are a symphony of generators; "generator theft" rumours in the group chat; chain it to the A/C pad.
- **Whole-house standby** (Generac, propane) — Ray's house across the street: auto-starts 10 s after the outage with a distinctive crank-then-hum; his lights come on while the street is dark.
- Light: LED lanterns on the counters, headlamps, phone flashlights, candles (avoid), tea lights in the bathroom, the glow of a tablet; solar path lights brought inside (a real hack).
- Ice: a bag of ice lasts ~a day in a good cooler; freezer stays frozen ~48 h unopened; fridge is unsafe after 4 h — "when in doubt, throw it out"; the dry-ice/ice distribution "POD" (point of distribution) drive-through at the stadium; the Salvation Army/Red Cross meal trucks; the Cajun Navy; the bucket trucks.

---

## 6. Aftermath (L+6 h → L+14 days)

| When | What is seen / heard / felt |
|---|---|
| First light | Everyone walks out at once. The street is a carpet of green (shredded fronds/leaves), shingles, screen, aluminium cage framing, insulation, a trampoline, somebody's shed roof. The smell: wet vegetation, cut wood, salt, a hint of sewage, propane, and later mildew. It's hot already. Steam. Silence except generators and one chainsaw. The pool: brown, full of cage. Pool cage: folded like a dropped birdcage. Snowbird house: roof half gone, garage door in. Oak across the road on a car. Lines down, a pole leaning, the transformer hanging. Water still in the swales/ street a foot deep; a retention pond at the back doors. Stop sign flattened. Mailbox gone. Cars with shingles stuck to them. Neighbours in the street: hugs, "you OK?", the first stories, pictures on phones with no signal to send them. |
| Day 1 | No power, no water pressure (or a trickle), no cell (or SOS), no traffic lights, no gas, no stores. Curfew tonight. People cut a path down the street with chainsaws by noon; a guy with a skid steer; tarps on roofs by afternoon (blue tarps are the next 6 months' skyline); "FEMA blue roof". The heat is the enemy: 90°F, no breeze, no A/C, 100% humidity; sitting on the lanai in the shade with the last cold drinks. Mosquitoes explode at dusk. Warm beer. The grill for every meal. Bathing with the tub water and a cup. Flushing with a bucket. Fridge purge (the smell). The generator goes on at 6 pm. The sky at night: Milky Way over the subdivision; every house has one lantern in the window; a police cruiser doing curfew laps. Helicopters. |
| Day 2–3 | Cell service flickers back (a COW — cell on wheels — appears in the Publix parking lot); texts from the last 2 days arrive in one avalanche; the first "we're OK" gets out. FPL/LCEC trucks and out-of-state convoys (bucket trucks with Georgia and Michigan plates) stage at the mall; linemen become heroes. Boil-water notice everywhere. Ice/water POD lines, 1–2 hours in the car, National Guard hands over two bags of ice and two cases of water. Gas: Wawa opens with a 3-hour line, cash only, $50 limit, then a police officer at the pump. Publix opens "cash only, no refrigerated goods". Insurance adjuster calls start; contractors' flyers on the mailbox post; "roofers" from out of state. Debris piles grow at the curb. Screen and aluminium guys booked for 8 months. |
| Day 4–7 | Power returns street by street (the cheer when the A/C kicks on; some streets stay dark because the transformer/pole is gone — the "last dark house" is a real grief). Water pressure back, boil-water still on. Curfew lifted. Traffic lights back on the main roads (the generator ones first). Schools closed for 2 weeks. The mildew smell in the house; drywall cut out 2 ft up in flooded rooms; the ceiling stain that keeps growing; a fan on the wet carpet. Everybody's tired, everyone's hurt their back. Debris trucks with the claw arm. |
| Week 2+ | Boil-water lifted. FEMA registration. The pool company. Roof tarps flapping. "Ian tan". The empty shelves for months. The cage rebuilt in spring. Traffic-light timing wrong for weeks. |

**Restoration defaults (major hurricane, hardest-hit county):** power: 50% in 3 days, 90% in 7–8 days, 95% in 10 days, last houses 2–3 weeks; water: pressure back 1–3 days, boil-water 7–14 days; cell: SOS-only 1–2 days, usable but slow at day 3, normal by day 7–10; cable TV/internet: 5–14 days; traffic lights: 2–7 days; gas: 2–4 days; grocery: 2–3 days; curfew: 3–9 nights; schools: 2–3 weeks. For a Cat 1–2 scale all of these down ~3×.

---

## 7. The 120 little details (trigger → detail)

Legend: **W** = sustained wind mph at the house; **P** = pressure; **T** = time relative to landfall; **PWR** = grid power state; **RAIN** = rain rate.

| # | Trigger | Detail |
|---|---|---|
| 1 | T−120h, morning | The cone on the kitchen TV; the meteorologist says "it's too early to know". Blue sky, cicadas, a lawn mower somewhere. |
| 2 | T−120h | Publix water aisle: half-empty; the case limit sign. |
| 3 | T−96h | Gas station: bags on two pumps; a line of 8 cars. |
| 4 | T−72h | ATM withdrawal; "cash only" mindset begins. |
| 5 | T−72h | First neighbour with shutters up (Ray). The sound of a drill and wing nuts. |
| 6 | T−72h | Freezer: the first gallon Ziplocs of water go in, lying flat. |
| 7 | T−60h | Coconuts cut down from the palm ("they become cannonballs"). |
| 8 | T−48h | Hurricane Warning issued; TV chime; the phone push from the weather app; a text from Mom. |
| 9 | T−48h | All-day sound of the subdivision shuttering: aluminium panels clanging, drills, a truck with plywood. |
| 10 | T−48h | The house gets dark room by room as shutters go on; someone turns on every lamp at 2 pm. |
| 11 | T−48h | Lanai furniture dragged in; the chairs go in the pool ("sinks it, protects the cage"). |
| 12 | T−48h | Grill and propane tank into the garage (tank *outside* strictly, but everyone puts it in the garage). |
| 13 | T−48h | Trash and recycle bins into the garage — the garage is now full. |
| 14 | T−48h | Cars in the garage nose-first; the driveway is empty. |
| 15 | T−48h | Generator test: pull-cord, splutter, run for 5 minutes, neighbours nod at each other. |
| 16 | T−48h | Fridge turned to coldest; ice maker OFF (so it doesn't dump ice/water when power returns). |
| 17 | T−48h | "Hurricane feast": every steak in the freezer grilled; the neighbours over; beer. |
| 18 | T−40h | The sunset: high cirrus fanning from the SW, orange-pink and lurid; everybody posts it. |
| 19 | T−36h | Bathtubs filled; drain plugged with tape; a WaterBOB in one (a giant clear bladder). |
| 20 | T−36h | Pool level lowered 8" by backwashing; extra chlorine; pump breaker pulled the next day. |
| 21 | T−36h | Towels rolled at every door; a sandbag at the garage-to-house door. |
| 22 | T−36h | Photos of every room for insurance; documents into a Ziploc into the go-bag. |
| 23 | T−36h | Every device on a charger; three battery banks lined up on the counter. |
| 24 | T−36h | Laundry and dishes all done ("won't be able to for a week"). |
| 25 | T−30h | Birds are frantic and loud in the morning, then oddly absent by afternoon. |
| 26 | T−30h | The air: hot, dead still, heavy; the pool surface glassy; a gust out of nowhere. |
| 27 | T−28h | Publix closes at 6 pm; the sign on the door; the last customers carry bread. |
| 28 | T−24h | The first outer band: 10 minutes of sideways rain, the cage screen roars, then sun and steam. |
| 29 | T−24h | Tornado Watch crawl on TV; the meteorologist says "these bands can spin up quickly". |
| 30 | T−22h | First WEA (Tornado Warning): every phone in the house shrieks out of sync; the dog jumps. |
| 31 | T−20h | First flicker: lights dip, TV reboots, microwave clock blinking 0:00. |
| 32 | T−18h | Thermoses of coffee made "for the morning"; the coffee maker unplugged. |
| 33 | T−18h | Safe room built: mattress in the hall, pillows, bike helmets, shoes on, flashlight, the radio. |
| 34 | T−16h | Bridges close (crawl); "responders will not respond above 45 mph". |
| 35 | T−14h | Last shower ("while it's hot and the water's clean"). |
| 36 | T−14h | Pets: dog on a leash inside, cat in the bathroom with the litter; both panting. |
| 37 | T−12h / W35 | TS winds: constant whoosh; the cage screens hum; palm fronds whip; rain steady. |
| 38 | W40 | The dryer vent flap clacks; a loose shutter panel buzzes until someone tightens the wing nut from inside? (can't — it's outside; it buzzes all night). |
| 39 | W40 | Water appears at the family-room slider track; the first towel darkens. |
| 40 | W45 | Snowbird house's screen panels tear and flap; a piece lands in your yard. |
| 41 | W45 | Streets pond at the swales; the storm inlet gurgles and then backs up. |
| 42 | W50 | The transformer down the street pops (first blue flash, seen through the peep window); half the street goes dark; yours flickers and holds. |
| 43 | W55 | Whistling starts at the master soffit — a note that rises and falls with gusts. |
| 44 | W55 / PWR on | Brownout: lights orange, fridge groans, fan slows; then recovers. |
| 45 | **W60 (default outage)** | Transformer flash + BOOM; everything dies; A/C stops mid-breath; the UPS shrieks; fans coast down; sudden loud wind. |
| 46 | PWR off + 2 min | Phone flashlights; then lanterns; the "who has the lighter" scramble. |
| 47 | PWR off + 10 min | Ray's Generac cranks and hums; his coach lights are the only lights on the street. |
| 48 | PWR off + 30 min | Indoor temp starts climbing; the tile is cool; the dog lies on the tile. |
| 49 | PWR off + 1 h | Router dead → TV app dead → the antenna TV on batteries becomes the source (or the phone). |
| 50 | PWR off + 4 h | Fridge: "don't open it". Someone opens it. |
| 51 | PWR off | Smoke detectors chirp randomly (humidity); the UPS beep until unplugged. |
| 52 | W65 | Shingles start peeling from the neighbour's 3-tab roof; you hear the slaps. |
| 53 | W70 | Garage door begins to pump: a soft whump… whump… with the gusts; the brace creaks. |
| 54 | W70 | Front door: water under the threshold in a fan; the mat floats; the door hisses. |
| 55 | W75 | Cage: first panel rips (a zip), then the flapping; the screen door slams open and off. |
| 56 | W80 | Ceiling drip at the family-room can light; a pot goes under it; *plink* every 3 s. |
| 57 | W80 | The house pops and ticks; a long creak like a ship. |
| 58 | W85 | Debris hits the shutter: BANG — everyone jumps; then a tinkle. |
| 59 | P<985 | Ears pop; toilets gurgle; interior doors drift and slam. |
| 60 | W90 | The sliders bow in visibly; someone braces a 2x4 or just backs away. |
| 61 | W90 | Windows weep at the sills; the shuttered glass runs with water. |
| 62 | W95 | Queen palm snaps with a crack; its crown slides down the street. |
| 63 | W100 | Cage: crunch, groan, slow fold; a beam lands on the roof — a car-crash sound overhead. |
| 64 | W100 | Attic hatch lifts and slaps; insulation puffs from the can light. |
| 65 | W100 / T−3h | **Extreme Wind Warning** WEA: "Do NOT go out in the calm of the hurricane eye!" |
| 66 | W105 | The live oak across the street goes over onto Ray's car; the roots lift the sidewalk. |
| 67 | W110 | Garage door: a panel buckles with a crunch; the noise inside triples if it fails (branching event — default: braced door holds). |
| 68 | W110 | Streetlight pole cracks; a second and third transformer flash far off, lighting the clouds green. |
| 69 | W115 | Snowbird house roof sheathing peels off in a sheet and cartwheels into the pond. |
| 70 | W120 | Ceiling sag forms a belly; the drip becomes a stream; a bucket and a trash can. |
| 71 | W120 | Sound is a jet at takeoff; conversation impossible; the dog shakes. |
| 72 | T−30min | The rain becomes a solid grey; the roar peaks; then the gusts *lengthen* — the eye approaching. |
| 73 | **Eye onset** | In 5–10 minutes the wind dies; a sudden light; drips; frogs instantly; a bird. |
| 74 | Eye | Pressure at minimum; ears "full"; the barometer app screenshot (27.9 in). |
| 75 | Eye | Everyone outside. Steam off the pavement. The far eyewall is a black wall with a roar like surf. Sometimes stars/sun. |
| 76 | Eye | Neighbours shout across the street; "your cage is in my yard"; car alarms; a generator; a helicopter? no — nothing flies. |
| 77 | Eye | Someone drags the towels back, wedges the front door, checks the roof from the driveway. |
| 78 | Eye end | The first gust from the *opposite* direction — shouts of "get inside"; things previously sheltered now exposed. |
| 79 | Back eyewall | The other slider leaks now; the master shutter bangs; "this side is worse". |
| 80 | Back eyewall | A shingle sheet from your own roof goes; the felt flaps. |
| 81 | T+2h | Flood water at its peak in the swale; the retention pond on the back lawn at the lanai steps. |
| 82 | T+4h | Wind down to 60; rain still; the first exhausted sleep in the hallway. |
| 83 | T+6h | Wind 35; sky breaks; a rainbow / sunset; the temperature drops for an hour then climbs. |
| 84 | T+8h | Curfew WEA/text; police cruiser passes; the street is impassable anyway. |
| 85 | Night after | Total dark: no streetlights, no sky glow; the Milky Way; lantern in each window; the generator chorus; mosquitoes. |
| 86 | Night after | Windows opened (the un-shuttered ones): warm wet air, frogs, the drip, the smell of wet insulation. |
| 87 | Dawn | Everyone out at once; hugs; the green carpet; shingles everywhere; the folded cage. |
| 88 | Dawn | The oak on the car; the lines down (nobody touches them); the transformer hanging. |
| 89 | Dawn | Pool is brown; a lawn chair at the bottom; the pump silent. |
| 90 | Dawn | Lanai fan blades shredded; the outdoor TV cracked; the coach light gone. |
| 91 | Day 1 | First chainsaw at 7 am; by 9 there are five; someone cuts the road open. |
| 92 | Day 1 | Blue tarps go up on three roofs by noon; a ladder sound and a nail gun on a generator. |
| 93 | Day 1 | Heat: 90°F, no breeze; ice from the freezer Ziplocs into the cooler; warm beer. |
| 94 | Day 1 | Bucket-flush the toilet from the tub; wash with a cup. |
| 95 | Day 1 | Phone: "SOS". Texts "Not Delivered". Someone drives to the Publix lot and finds one bar. |
| 96 | Day 1 | Fridge purge at hour 30: the smell; the bags at the curb. |
| 97 | Day 1 | Ring camera's last clip: the cage hitting the yard at 2:14 am. |
| 98 | Day 1, evening | The generator goes on at dusk; the extension cord through the window; the box fan; everyone sits in front of it. |
| 99 | Day 1, night | Mosquitoes; citronella; the itch; the sound of a neighbour's generator dying at 3 am and the silence. |
| 100 | Day 2 | Texts arrive in an avalanche: 40 messages, timestamps two days old. |
| 101 | Day 2 | Bucket trucks with Georgia plates staging at the mall; people cheer at them. |
| 102 | Day 2 | Ice/water POD: 90-minute line; National Guard; two bags, two cases; "how are y'all doing". |
| 103 | Day 2 | Boil-water notice arrives by text; the pot on the camp stove. |
| 104 | Day 2 | Gas: Wawa line 2 hours; cash only; the police officer at the pump; $50 limit. |
| 105 | Day 2 | The insurance app: "claim received"; the adjuster's call from a 1-800 number. |
| 106 | Day 3 | Contractor flyers rubber-banded to the mailbox post; a "roofer" in an F-250 with out-of-state plates. |
| 107 | Day 3 | Debris piles at the curb: "vegetative" and "C&D" (construction) separated per the HOA text. |
| 108 | Day 3 | The ceiling stain has grown; the drywall sags; someone pokes it and water pours. |
| 109 | Day 3 | Mildew smell starts; the closet of wet clothes; the carpet in the guest room. |
| 110 | Day 4 | Cell service back at one bar; the first "we're OK" photo posts. |
| 111 | Day 5 | The crew truck on your street; the new transformer on the pole; the chatter on their radios. |
| 112 | Day 5, 4:12 pm | POWER: the A/C compressor thumps on, fans spin up, the fridge shudders, the microwave blinks 0:00, the whole street cheers; someone runs a hot shower. |
| 113 | Day 5 | The one house still dark (a downed service drop) — the neighbours run a cord over. |
| 114 | Day 6 | Traffic lights back on the main road; "4-way stop" etiquette ends with a horn. |
| 115 | Day 7 | Curfew lifted; Publix restocked; the water aisle full again. |
| 116 | Day 8 | Cable/Internet back; the router lights; Netflix; the group text goes quiet. |
| 117 | Day 10 | Boil-water lifted; running the taps for 5 minutes; flushing the fridge water line. |
| 118 | Day 14 | The debris claw truck; the mound is gone; the stump remains. |
| 119 | Week 3 | The pool guy; the cage estimate: "March, maybe". The blue tarps everywhere. |
| 120 | Whenever | The shutters stay up for two more weeks "because there's another one out there". |

---

## 8. Numeric defaults for the sim (summary)

| Parameter | Default | Note |
|---|---|---|
| Storm | Cat 4 at landfall, 140 mph, 945 hPa, RMW ~20 mi, forward 9 mph NNE, eye diameter ~25–30 mi | Ian-like; eye passes ~overhead → ~40–60 min calm |
| House location | NE of landfall point; 15 mi inland; not in surge zone; Zone C | Both eyewalls; front-side wind from NE→E→SE, back side from W→SW |
| Peak at house | Sustained 115–125, gusts 150–160 | |
| TS winds arrive | L−14 h | |
| Hurricane winds arrive | L−5 h | |
| Power out | L−9 h at a 60 mph gust with a transformer flash | 3–8 flickers before |
| Cell data gone | L−4 h; SMS to L−1 h; nothing L to L+36 h; SOS L+36 h; usable Day 3; normal Day 8 | |
| Cable TV/Internet | dies with power; back Day 8 | Antenna TV works throughout on battery |
| Indoor temp | 76 → +1°F/12 min after outage until = outdoor (82 night / 90 day) | |
| Pressure at house | 1012 → 950 hPa at eye; ear-pop events at ~10 hPa steps | |
| Rain | 12–18 in total; bands 1–3 in/h; eyewall 3–4 in/h | |
| Street water | swales flood at W45/1 h heavy rain; 12" in street at peak; recedes over 24 h | |
| Cage failure | first panel tear W60–75; collapse W95–110 (front side) or first gusts of the back side | |
| Shingle loss | neighbours' old roof from W65; own roof partial from W95; sheathing exposure at W120 on the snowbird house | |
| Garage door | pumping from W70; buckle warning W110; failure (if unbraced) W115 | |
| Ceiling leaks | can-light drip W80; stream W120; sag 6–24 h; collapse if untouched 48 h | |
| Water heater warm | 24 h after outage | |
| Freezer safe | 48 h unopened | |
| Tub water | 40 gal each — 2 tubs → ~10 days of flushing | |
| Generator | 5,500 W; 10 h per 5 gal; 4 cans = 4 nights | |
| Restoration | power 50%/3 d, 90%/8 d, house Day 5; water pressure Day 2; boil-water Day 10; curfew nights 1–7; grocery Day 3; gas Day 3; traffic lights Day 6 | |
| Gameplay compression | prep day 1 = 4 min/hr; storm core = 1 min real = 6 min sim (adjustable 0.5–20×); sleep skips to next event | |

---

## 9. Sources consulted (web) and provenance
- NWS Wireless Emergency Alert 360-character message templates (Extreme Wind Warning, Hurricane Warning text) — weather.gov WEA pages/PDF notices (pns18-33, scn19-43).
- NWS pages on NOAA Weather Radio SAME, the 1050 Hz attention tone, and the Paul/Donna/Tom voices (Weather Radio wiki, weather.gov NWR FAQ).
- LCEC and FPL Hurricane Ian restoration updates (Oct 2022): ~95% restoration in Lee/Collier by day 10; Lee County curfew rescinded Oct 7; Cape Coral boil-water notice in effect for ~2 weeks.
- First-person Cape Coral Ian account (florida-scout.com): eye passing north giving a "breather", back-side hurricane winds "for three hours", the slow-motion pool-cage collapse, TV/power loss, canal water rising.
- Everything else: expert knowledge of Florida building practice (FBC/HVHZ, hip roofs, CBS, soffit intrusion), NHC/NWS products, and widely reported resident experiences from Charley, Wilma, Irma, Ian, Helene and Milton.
