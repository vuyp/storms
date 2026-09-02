# Procedural Audio, Voice and In-Home Device Simulation — Implementation Guide

*Florida Storm — hurricane-at-home simulation. Research/design document, 2026-09-02.*
*Scope: everything the player hears and every screen/device they can look at. No audio files, no textures from disk: all Web Audio API synthesis, all DOM/canvas UI.*

Sources checked online for the regulatory specs (WEA cadence: 47 CFR §10.520 via eCFR/FCC fact sheets; SAME AFSK: sigidwiki, Wikipedia, CML Micro CMX7031 app note; EWW criteria: NWS). Everything else (aeroacoustic timbre tables, node graphs, parameter values, scripts) is from domain expertise and should be treated as tuned starting points, not measured data.

---

## 0. Ground rules and budget

| Item | Default |
|---|---|
| `AudioContext` sample rate | Leave at hardware default (44.1/48 k). Never force a rate — resampling costs CPU on integrated hardware. |
| `latencyHint` | `'playback'` (larger buffer, fewer glitches; we are not a rhythm game). |
| Node budget | ~30 *always-alive* nodes. One-shots (thunder, impacts, beeps) are created, `start()`ed, and let die (`onended` → `disconnect()`), so they don't count against the standing budget. |
| Noise generation | One shared 4 s pink buffer, one 4 s brown buffer, one 2 s white buffer. Every noise source is an `AudioBufferSourceNode` with `loop=true`, started at a random `offset` so layers don't phase-lock. Buffers are generated once at startup (~0.5 M samples, < 20 ms). |
| Alternative | A single `AudioWorkletNode` ("StormWorklet") generating wind + rain in one process() call is the cheapest option (1 node, ~2% CPU). The guide below uses plain nodes because they work in every browser and are debuggable; a worklet port is a later optimisation. |
| Master chain | `busSum → DynamicsCompressor(limiter) → GainNode(masterVolume) → destination`. Limiter: `threshold -3 dB, knee 0, ratio 20, attack 0.003, release 0.12`. |
| Click avoidance | Never set `gain.value` directly on an audible node. Use `setTargetAtTime(v, t, τ)` (τ ≥ 0.01 s) or `linearRampToValueAtTime`. One-shots always get a 2–5 ms fade-in and a ramped tail. Loop buffers are generated with a 50 ms cross-fade at the seam (write the last 2205 samples as a linear cross-fade with the first 2205). |
| Unlocking | `AudioContext` starts `suspended`. On the first `pointerdown`/`keydown` on the title screen call `ctx.resume()` **and** speak an empty utterance (`speechSynthesis.speak(new SpeechSynthesisUtterance(''))`) to unlock TTS on Safari/iOS. Show a "Click to enter the house" gate so the gesture always happens. |
| Headless (SwiftShader) | Launch with `--autoplay-policy=no-user-gesture-required --use-fake-ui-for-media-stream`. Headless Chromium creates a real `AudioContext` with a null sink; it advances `currentTime` and runs the graph, so scheduling code must not throw when there is no output. Wrap `speechSynthesis` in a feature check — headless Linux has **zero voices**; the caption fallback must be the only path there. Visual state (screens, LEDs) must never depend on audio callbacks. |
| Loudness reference | Master target −18 dBFS RMS in the interior during hurricane winds; peaks limited at −1 dBFS. Everything below is stated as linear gain relative to a 0.5 "loud" reference. |

Signal input: the storm engine exposes a `StormState` struct updated every frame:
`wind10m (m/s)`, `gust (m/s)`, `windDir (deg)`, `rainRate (mm/h)`, `pressure (hPa)`, `dPdt (hPa/h)`, `eyeDistance (km)`, `inEye (bool)`, `lightningRate (/min)`, `powerOn`, `cableOn`, `cellBars (0-5)`, `waterOn`, `timeOfDay`, plus the player state `room`, `shuttersClosed`, `doorsOpen[]`, `position`, `facing`.

---

## 1. Noise sources (shared buffers)

```js
// white
for (i) w[i] = Math.random()*2-1;
// pink: Paul Kellet's economical 7-pole filter (−3 dB/oct, flat ±0.5 dB 10 Hz–20 kHz)
b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759; b2=0.96900*b2+w*0.1538520;
b3=0.86650*b3+w*0.3104856; b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
pink = (b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.11; b6 = w*0.115926;
// brown: leaky integrator (−6 dB/oct)
brown = (last + 0.02*w) / 1.02; last = brown; out = brown*3.5;
```

Normalise each buffer to peak 0.9. Seam cross-fade as above. Store as `ctx.createBuffer(1, n, ctx.sampleRate)` (mono — stereo width is added by the graph, not the buffer).

Make a helper `noise(kind, {loop:true, offset:random})` returning a started source. A source node costs almost nothing; the filters are the expensive part, so *share filters between layers where possible* rather than sharing sources.

---

## 2. Wind engine

Wind is 6 standing layers summed into the **outdoor bus**. Each layer's gain and filter frequency is a function of an *effective wind speed* `Ve = wind10m + gustEnvelope` (m/s), updated every 50 ms with `setTargetAtTime`.

### 2.1 Layers

| # | Layer | Source | Filter | Freq vs Ve | Gain vs Ve | What it represents |
|---|---|---|---|---|---|---|
| W1 | Rumble | brown | lowpass Q 0.7 | 60 Hz fixed; second lowpass 120 Hz | `0.0` below 25 m/s, then `((Ve−25)/30)^2 * 0.8` | The 100+ mph freight-train roar; body-felt, fills the house at Cat 3+. |
| W2 | Body | pink | bandpass Q 0.5 | `80 + 6·Ve` Hz | `min(1, (Ve/20)^1.6) * 0.6` | Broad steady roar. Dominant 15–40 m/s. |
| W3 | Hiss | white | highpass 1.5 kHz + lowpass 6 kHz | fixed | `min(1, Ve/40)^2 * 0.15` | Turbulent air over the roof/eaves, foliage. |
| W4 | Whistle A | white | bandpass Q 12 | LFO sweep 600–1400 Hz, LFO 0.15 Hz + 0.9 Hz jitter | `clamp((Ve−12)/25) * 0.12` at gust peaks only (multiply by gustEnvelope²) | Wind across window/shutter edges; classic ghostly whistle. |
| W5 | Whistle B / howl | white | bandpass Q 25 | `350 + 12·Ve` Hz, wobbled ±8 % by a 0.3 Hz LFO | `clamp((Ve−20)/30)^2 * 0.10` | The resonant howl through door/soffit gaps. |
| W6 | Flutter | pink | bandpass Q 3 @ 250 Hz | AM by a 7–14 Hz square-ish LFO (`OscillatorNode type 'square'` into a gain) | `clamp((Ve−25)/25) * 0.15` | Shutter/soffit/screen flapping; strong in the eyewall. |

Above ~50 m/s, add a **scream** one-shot: 1.5–3 kHz bandpass Q 30 on white, 0.5–2 s, triggered 1–3×/min at gust peaks. This is the sound survivors describe as "a jet engine that screams."

### 2.2 Timbre table (what the layers must add up to)

| Sustained wind | Character | Practical mix |
|---|---|---|
| 30 mph (13 m/s) | Gusty hiss, palm fronds rattling, occasional whistle. Between gusts nearly quiet. | W2 0.2, W3 0.05, W4 audible only in gusts. Gust factor 1.4. |
| 60 mph (27 m/s) | Continuous roar, whistling constant, doors thumping in frames, rain driven horizontally. | W1 0.05, W2 0.45, W3 0.1, W4/W5 0.08, W6 starting. Gust factor 1.35. |
| 90 mph (40 m/s) | Deep roar dominates; whistle becomes a howl; house creaks continuously; can't hear speech at a window. | W1 0.3, W2 0.6, W5 0.1, W6 0.1, screams every ~30 s. Gust factor 1.3. |
| 120+ mph (54 m/s) | Freight train. Low rumble shaking the slab; high scream; individual sounds merge into a wall. | W1 0.8, W2 0.6, W3 0.15, W5 0.1, W6 0.15, scream every 15 s, house-groan layer on. Gust factor 1.25 (gustier in absolute terms). |

### 2.3 Gust envelope

Take gusts from the physics (the wind field research doc will provide a gust factor and a turbulence model). Audio only needs `Ve`. Smooth it: rising `setTargetAtTime(v, t, 0.25)`, falling `τ = 0.9` (wind sound decays slower than it arrives). Add a tiny audio-rate roughness independent of physics: `gain *= 1 + 0.08·pinkLFO(0.5–3 Hz)` — implement as an extra `AudioBufferSourceNode` of brown noise at `playbackRate 0.002` feeding a gain's AudioParam (a 4 s buffer at that rate is a ~33-minute slow random walk, effectively free).

### 2.4 Indoor filtering (the *occlusion chain*)

The outdoor bus never reaches the master directly. It passes through **one** `BiquadFilterNode(lowpass)` + one `GainNode` whose targets depend on where the player is:

| Player situation | Lowpass cutoff | Level | Notes |
|---|---|---|---|
| Outside (lanai, driveway) | 20 kHz (bypass) | 1.0 | |
| Screened lanai, doors closed | 8 kHz | 0.85 | Screen adds a 2 kHz hiss (rain on screen, §3). |
| Interior room with windows, shutters **open** | 1.6 kHz, Q 0.7 | 0.35 | Single-pane sliding windows leak highs. Wind pressure on glass adds a 20–40 Hz thump layer at Ve > 35. |
| Same room, shutters **closed** (metal panels) | 700 Hz | 0.22 | Panels rattle: enable W6 duplicate at 180 Hz Q 4 routed to *indoor* bus, gain 0.06·gust². |
| Hallway / master closet / interior bath (the "safe room") | 350 Hz | 0.10 | Add 6 dB more attenuation per closed door between player and nearest exterior wall. Rumble W1 still fully audible (long wavelengths). |
| Garage (metal roll-up door) | 1.2 kHz | 0.5 | Door rattle layer §6.3. |

Door open/close transitions: ramp cutoff and gain over 0.3 s. Don't recompute the graph, just retarget the two AudioParams. Because every exterior sound goes through the same two nodes, occlusion costs 2 nodes total.

Stereo: the outdoor sum is split with a `StereoPannerNode` per *facade*. Cheaper approach for the budget: four outdoor "facade" gain nodes (N/E/S/W) each fed by the same wind sum, panned according to the player's facing; only the two loudest are active (the windward facade is +4 dB, leeward −6 dB). This is how the player hears the **wind reversal** after the eye: the roar moves from one side of the house to the other.

---

## 3. Rain

| Layer | Graph | Parameters |
|---|---|---|
| R1 Rain bed | white → bandpass 3 kHz Q 0.4 → gain | gain `min(1, rainRate/60)^0.6 * 0.35`. AM 4–8 Hz random ±15 % to give "sheets". |
| R2 Roof drum (tile/shingle, heard indoors) | brown → lowpass 400 Hz → gain | gain `min(1, rainRate/80)*0.25`; indoors this is what dominates. |
| R3 Impacts | random *click bursts*: 2–4 ms noise burst through bandpass (freq varies per surface) | rate `rainRate * 0.3 /s` per facade, capped at 40/s; above that the bed takes over. Implemented as one white source through a gain gated by `setValueAtTime` pairs scheduled 200 ms ahead. |
| R4 Wind-driven | R1 duplicate modulated by `gustEnvelope`; horizontal rain hits windows in bursts | gain `0.2 * gust² * min(1, rainRate/40)` |
| R5 Drip / leaks | resonant ping: sine at 1.2–2.8 kHz with exponential decay 40–120 ms, plus a 5 ms noise click | see §3.2 |

### 3.1 Surface timbre

| Surface | Filter for R3 impacts | Extra |
|---|---|---|
| Window glass | bandpass 2.5 kHz Q 5, 3 ms | Sharper "tick"; localised via HRTF at the window position. |
| Metal storm shutter (aluminium panel) | bandpass 900 Hz Q 2 + 3.5 kHz Q 6 (two taps), 6 ms; ring 30 ms | Loud, tinny drum. Once shutters close, rain is *louder* indoors at the windows — a nice detail. |
| Lanai screen | highpass 4 kHz hiss only, no impacts | Screens atomise rain; sound is a fine fizz. |
| Lanai roof (aluminium pan roof) | bandpass 600 Hz Q 1.5, 8 ms | The loudest thing on the lanai — pan roofs are deafening. |
| Concrete tile roof (interior) | R2 only | Muffled thrum. |
| Pooling water on the lanai / sidewalk | bandpass 1.5 kHz Q 3 with a 15 ms "plop" | Add after 20 mm accumulated. |

### 3.2 Roof leaks and dripping

A leak is a `DripSource` at a 3D position (ceiling of a bedroom, closet). Per drip: `OscillatorNode(sine, f)` with `f` chosen once per leak from 1.1–2.6 kHz (bucket/pot pitch), gain envelope `0 → 0.15 in 1 ms → exp decay τ 25 ms`, plus a 3 ms white click at 4 kHz. Interval: `base = 60/dripsPerMin` with ±30 % jitter; `dripsPerMin` grows with time since leak onset (5 → 60 over 40 minutes) and with rainRate. As a bucket fills, pitch drops ~20 % over 30 min (`f *= 0.8` linearly) — a satisfying detail. Later a *steady trickle* (white → bandpass 2 kHz Q 2, gain 0.03) replaces drips when a leak becomes a stream.

Water under the door: white → bandpass 1 kHz Q 1 → AM by 1–2 Hz (gain 0.04) at the door position; rises to a gurgle (add 250 Hz Q 5 layer) as flooding deepens.

---

## 4. Thunder

Thunder is a **one-shot** built from the shared brown+pink buffers each strike:

1. Flash time `t0` from the lightning system with distance `d` (km).
2. Delay = `d / 0.343 s/km` (3 s per km). Schedule at `t0 + delay`.
3. Envelope (gain node):
   - Near (< 2 km): `0 → 1 in 10 ms` (the *crack*: white → highpass 1.5 kHz, 60 ms, gain 0.9), then body.
   - Body: brown → lowpass `fc`, gain `1 → 0.4 (0.4 s) → 0.15 (1.5 s) → 0 (τ 2.5 s)`.
   - Rolling: 2–4 extra sub-bursts of the body at +0.6, +1.4, +2.9 s with random gains 0.3–0.6 (echoes from cloud/terrain). More sub-bursts when far.
4. Distance lowpass: `fc = 4000 / (1 + d)` Hz clamped to [60, 4000]; level `0.9 / (1 + 0.35·d)`.
5. Duration: `2 + 1.5·d` s capped at 12 s (far thunder rumbles longer).
6. Stereo: azimuth from the strike position → `StereoPanner`; for `d < 1` km pan is nearly centre (it's all around you).

Tropical-cyclone note: hurricanes have *little* lightning in the core; most lightning is in the outer rainbands. `lightningRate` should be highest during the outer-band stage (2–8 /min at times) and drop to near zero in the eyewall — players will notice this if the model is right. The eye itself may have distant flashes visible in the eyewall with soft, delayed rumbles.

---

## 5. Debris, impacts, house sounds

### 5.1 Debris impacts (one-shots, rate driven by `Ve`)

| Type | Synthesis | Trigger rate |
|---|---|---|
| Thump (branch, coconut, shingle on roof) | brown → lowpass 150 Hz, envelope 5 ms attack, τ 120 ms, gain 0.6; plus a 20 ms pink "scrape" tail | `0` under 20 m/s → `6/min` at 45 m/s → `20/min` at 60 m/s |
| Crack (snapping limb) | white → bandpass 2 kHz Q 2, 15 ms burst, followed by 3 shorter bursts within 80 ms | `2/min` at 30 m/s, `8/min` at 55 |
| Sheet metal / lanai panel | sine chirp 400→180 Hz over 200 ms + bandpass 900 Hz noise, τ 400 ms | when `Ve > 40` and lanai-damage event fires |
| Shutter strike (thing hits window shutter) | metal impulse: bandpass 800 Hz Q 8 + 2.4 kHz Q 10 on a 4 ms burst, τ 250 ms; gain 0.8; HRTF at the window | scripted by the damage system, ~5–10 during eyewall |
| Glass break (unshuttered window, rare) | 30 ms white burst → highpass 3 kHz; then 12–20 "shard" pings (sine 3–7 kHz τ 30 ms) over 0.8 s | damage event only |
| Roll / tumble (trash can) | pink → bandpass 300 Hz Q 2 with AM 3–6 Hz, 1.5 s, panned across the stereo field | outer bands / TS stage, 1–2 per 10 min |

### 5.2 House creaks and pops

- **Creak**: sine chirp `f: 180→260 Hz (rising) or 240→150 (falling)` over 300–900 ms, with a 6–10 Hz vibrato of ±3 %; waveform `'sawtooth'` through lowpass 1.2 kHz gives the stick-slip grit; gain 0.08–0.15 with a slow attack (100 ms). Rate proportional to `d(Ve)/dt` (creaks happen when the load *changes*), so schedule them at gust onsets and lulls: `p = 0.4` per gust event above 30 m/s.
- **Pop / tick** (truss nail, drywall): sine 900 Hz τ 8 ms + click; 1–4/min at Ve > 35, more during rapid pressure changes.
- **Roof groan** (Cat 3+): sawtooth 55–75 Hz sweep over 1.2 s, lowpass 200 Hz, gain 0.2, vibrato 4 Hz; only in W1-rumble conditions. Rate 1/min at 45 m/s → 4/min at 60.
- **Door in frame thud**: brown → lowpass 100 Hz, 60 ms, gain 0.5, when a gust hits the windward facade (0.2 probability per gust). Front door especially (entry doors shudder audibly in hurricanes).
- **Ear-popping pressure**: not a sound, but when `|dPdt| > 4 hPa/h` play a soft "ear squelch" (highpass 6 kHz noise, 25 ms, gain 0.05) every ~3 minutes and show a HUD note ("your ears pop") — corresponds to the 30–60 hPa fall in the eyewall.

### 5.3 Garage door rattle
Aluminium roll-up door: pink → bandpass 220 Hz Q 4 (panel drum) → AM by an 11–17 Hz irregular LFO (square LFO into a gain, LFO frequency jittered every 0.5 s); plus random metal ticks (bandpass 3 kHz, 3 ms). Gain `0.12·gust²` when in/near the garage. If the door fails (damage event), a long sheet-metal groan (sawtooth 90→40 Hz, 2 s) and W2 jumps +12 dB in the garage.

---

## 6. Machines, electrical, biophony

### 6.1 Transformer explosion (the green-blue flash)
Sequence at the pole position (HRTF, 40–120 m away):
1. **Bang**: brown → lowpass 300 Hz, 8 ms attack, τ 180 ms, gain 1.0; layered white highpass 2 kHz 30 ms (the "crack").
2. **Arc buzz**: sawtooth 120 Hz + 60 Hz (sum), through bandpass 900 Hz Q 1, AM with 0.4–1.2 s random gaps, 1–3 s total; gain 0.4 tremolo. Add white → bandpass 4 kHz Q 3 "sizzle" gain 0.15.
3. **Secondary pops**: 2–5 short bangs at half gain over 2 s.
4. Then the *power outage cue* (§6.5).
Distance lowpass: `fc = 3000/(1+d/100 m)`.

### 6.2 Generator (aftermath, neighbour's, ~30 m)
Portable 3600 RPM single-cylinder four-stroke: firing frequency **30 Hz** (one power stroke per two revolutions). Graph: `OscillatorNode('sawtooth', 30 Hz) → WaveShaper (soft clip) → lowpass 350 Hz Q 2 → gain` gives the chug; add pink → bandpass 1.8 kHz Q 1 (exhaust hiss, gain 0.08) and a **load wobble**: LFO 0.5–2 Hz ±3 % on frequency and ±20 % on gain (the governor hunting when a fridge compressor kicks in). Start-up: pull-cord sequence = 3 short brown thumps 0.3 s apart, then frequency ramps 12→30 Hz over 1.5 s. Inverter generators (quieter, 1800–3000 RPM variable) are optional: fundamental 15–25 Hz, gain −10 dB. HRTF-panned with distance lowpass. Outdoors 0.5; indoors through occlusion chain (it's a low drone that penetrates walls — deliberately make it audible at night).

### 6.3 Chainsaw
Two-stroke fires every revolution: idle ≈ 2800 RPM → **47 Hz**; cutting ≈ 9000–11 000 RPM → **150–185 Hz**; free-rev 13 000 → 217 Hz. `OscillatorNode('sawtooth')` + a second saw at 2× for rasp, → bandpass 700 Hz Q 0.8 → gain. Behaviour script: idle 2–6 s (freq 47 Hz ±4 % jitter at 8 Hz), rev to 200 Hz in 0.4 s, *load* when the chain bites: freq drops to 150 Hz with ±10 % rough modulation (random at 20 Hz), gain +3 dB, for 2–8 s, back to idle. Cut cycle repeats 5–15 times, then stops. Multiple saws around the neighbourhood after the storm: 1–3 concurrent at different distances (HRTF, lowpass by distance).

### 6.4 Crickets, frogs, birds
- **Crickets** (dusk/night, pre-storm and aftermath; silent in wind > 10 m/s and in rain): sine 4.2–4.8 kHz gated at 25–35 Hz pulse rate in trills of 0.3–0.5 s, 2–4 trills/s (field cricket chirp). Gain 0.03; 3–4 individuals at slightly different pitches and slightly different tempos (they will drift in and out of sync — realistic).
- **Tree frogs / toads** (Florida-specific, loud after rain): Southern toad trill = sine 1.9 kHz pulsed at 35 Hz for 3–8 s; green tree frog "quonk" = 500 Hz → 900 Hz chirp 80 ms, repeated every 0.5–1 s in choruses; Cuban tree frog = harsh rasp: sawtooth 700 Hz through bandpass 1.5 kHz, AM 30 Hz, 0.6 s. Chorus builds 20–40 min after rain stops; deafening the night after the storm.
- **Birds in the eye**: the eye is famous for sudden birdsong (and actual birds trapped in the eye). 2–6 chirp sources: sine FM sweeps 2.5→4.5 kHz over 60–120 ms in 3–7 note phrases; gain 0.04; only when `inEye && Ve < 8`. Also seagull-like cries (sawtooth 1.2 kHz with pitch bend down, 400 ms, lowpass 3 kHz) 1–2 per minute at distance.
- **Mosquitoes** (aftermath, evening): sine 600 Hz with ±5 % vibrato at 15 Hz, gain 0.02, panning that wanders around the head using HRTF; annoying and correct.

### 6.5 Appliance hums and the moment the power dies

| Device | Graph | Level indoors |
|---|---|---|
| Fridge | sine 120 Hz + sine 240 Hz (0.4) + sine 60 Hz (0.2) → gain 0.06; compressor click (brown 40 ms) on start; runs 15 min / off 20 min cycle | audible in kitchen only (HRTF, rolloff 1/d) |
| Ceiling fan | sine 120 Hz gain 0.02 (motor); pink → lowpass 800 Hz AM at blade-pass (`3 blades × 3.5 rev/s = 10.5 Hz`) gain 0.03; a faint 3.5 Hz tick if "wobble" flag | per-room |
| AC (air handler + outdoor condenser) | Indoors: pink → bandpass 500 Hz Q 0.5 gain 0.05 (vent rush) + sine 120 Hz 0.01. Outdoors near condenser: sine 60/120/180 Hz + fan whoosh (pink lowpass 600 Hz) gain 0.2 | condenser HRTF at its position on the side of the house |
| Bathroom exhaust fan | sine 120 Hz + pink lowpass 1.5 kHz, gain 0.05 | that bathroom only |
| Pool pump (lanai) | sine 120 Hz + white → bandpass 2 kHz (water) gain 0.08 | lanai |
| TV | speech (TTS) + a 15.7 kHz-ish "whine" is *not* present on modern TVs — omit; use faint pink noise floor 0.01 when on | living room |
| Microwave running | sine 60/120 Hz + pink lowpass 1 kHz gain 0.1, turntable 1 Hz AM | kitchen |

**The outage moment** (this is a key beat): at `powerOn → false`: all hums ramp to 0 with `setTargetAtTime(0, t, 0.08)`, then the AC air handler gets a 2.5 s *spin-down*: its pink layer sweeps lowpass 500 → 80 Hz while gain decays τ 0.8 s. Fridge compressor gives one soft "clunk" (brown 30 ms). Ceiling fan: 6–10 s spin-down (blade-pass LFO rate ramps 10.5 → 0 Hz, gain to 0). The **silence** that follows should be conspicuous: the house's noise floor drops from ~−45 dBFS to nothing, and the storm outside seems louder. Then, seconds later, a UPS/laptop charger begins beeping (§7.9) and the smoke detector may chirp once (some detectors chirp on power loss). Later the **flicker** phase before the final outage: brown-outs modelled as 100–400 ms gain dips to 0.3 on every hum with a 55 Hz (slightly slow) pitch shift, 2–6 flickers over 10 minutes, synchronised with the lighting.

Power restoration (aftermath, hours/days): everything starts at once — fridge clunk, AC 60 Hz hum ramping up over 1 s, microwave beep + clock flashing "12:00", smoke detector single chirp, and the neighbourhood cheers (optional voice one-shot via TTS is silly; just a distant "whoop": sine 600→900 Hz).

---

## 7. Alert and attention tones (exact specifications)

All alert tones are pure oscillators — they are *supposed* to sound synthetic. Route to the **devices bus**, each through its own tiny "speaker" filter so the same tone sounds different on the phone, the TV and the weather radio:

| Speaker model | Filter chain |
|---|---|
| Smartphone | highpass 600 Hz + peaking +6 dB @ 3 kHz Q 2 + lowpass 8 kHz; soft-clip WaveShaper at loud levels |
| Weather radio (small 2" speaker) | bandpass 300 Hz–4 kHz (two biquads), peaking +4 dB @ 1.2 kHz, mild distortion, plus **hiss floor** white → bandpass 3 kHz gain 0.01 when on |
| TV | highpass 120 Hz, lowpass 12 kHz, slight −3 dB @ 2.5 kHz |
| Smoke detector / microwave / fridge | piezo: bandpass at the tone frequency Q 3, no lowpass (piezos are piercing) |

### 7.1 EAS attention signal (TV / broadcast radio)
Two sines, **853 Hz and 960 Hz**, equal amplitude, summed (gain 0.5 each), duration **8 s minimum, 25 s maximum**; broadcasters typically use 8 s. The two frequencies beat at 107 Hz which is the characteristic harsh buzz — don't detune. Gate with 5 ms ramps. Preceded by the SAME header bursts (§7.4) and followed by the voice message, then the EOM bursts.

### 7.2 WEA (Wireless Emergency Alert) on the phone — 47 CFR §10.520
- Frequencies: **853 Hz + 960 Hz simultaneously** (polyphonic devices); monophonic fallback 960 Hz only.
- Cadence: **one 2.0 s tone, 0.5 s gap, 1.0 s tone, 0.5 s gap, 1.0 s tone**, then a 0.5 s gap and the **whole sequence repeated once** (total ≈ 10.5 s).
- Vibration cadence is the same pattern (2 s, 1 s, 1 s with 0.5 s gaps, repeated) — see §7.8 for the buzz sound and `navigator.vibrate([2000,500,1000,500,1000,500,2000,500,1000,500,1000])`.
- The phone plays it at full volume **even in silent mode** for Presidential/Imminent-threat alerts; in-game, WEA is the only sound that bypasses the "phone on silent" option. Amber Alerts use the same tone; hurricane products come as *Imminent Threat – Extreme/Severe* alerts.
- Schedule with `setValueAtTime` pairs on one gain node driving both oscillators; then show the banner (§10.1) at the first tone.

### 7.3 NOAA Weather Radio Warning Alarm Tone (WAT)
A **single 1050 Hz sine for 10 s** (spec range 8–10 s; NWS uses 10 s) following the SAME header bursts. Public-alert radios open squelch and blast this at full volume — in-game the radio jumps from standby (silent, LED green) to alarm (red LED, tone at gain 0.9 through the radio speaker model). Two seconds of silence, then the voice message (§8), then EOM.

### 7.4 SAME header bursts (AFSK) — how to synthesise convincingly
Spec (sigidwiki / NWS): **520.83 baud**, mark (1) = **2083.3 Hz**, space (0) = **1562.5 Hz**, i.e. exactly 4 cycles per bit for mark and 3 for space, continuous phase. Bytes are 8-bit ASCII (7-bit data, MSB 0), sent **LSB first**, no parity/stop bits. Header = preamble of **16 × 0xAB** then the text:

```
ZCZC-ORG-EEE-PSSCCC-PSSCCC+TTTT-JJJHHMM-LLLLLLLL-
```
Example for this project (Manatee, Sarasota, Hillsborough, Pinellas counties; KHB32 is the real Tampa NWR transmitter on 162.550 MHz; Julian day 246 = 3 Sep 2026):
```
ZCZC-WXR-HUW-012081-012115-012057-012103+0600-2461800-KHB32/NWS-
```
Event codes: `HUA` hurricane watch, `HUW` hurricane warning, `TRA/TRW` tropical storm, `SSA/SSW` storm surge, `EWW` extreme wind warning, `TOR` tornado warning, `FFW` flash flood warning, `RWT` required weekly test, `EOM` end. Each burst is sent **three times with a 1 s pause** between; header length ≈ (16 + 63) × 8 / 520.83 ≈ **1.21 s** per burst. EOM = preamble + `NNNN`, also three times.

Synthesis: it is easiest and click-free to render the burst into an `AudioBuffer` offline in JS:
```js
const br = 520.83, fs = ctx.sampleRate, spb = fs/br;   // samples per bit (~84.7 @ 44.1k)
let phase = 0; const out = [];
for (const byte of [...Array(16).fill(0xAB), ...text].map(c=>typeof c==='string'?c.charCodeAt(0):c))
  for (let b=0;b<8;b++){ const f = (byte>>b)&1 ? 2083.3 : 1562.5;
    const n = Math.round((bitIndex+1)*spb) - Math.round(bitIndex*spb);   // fractional-bit accounting
    for (let i=0;i<n;i++){ out.push(Math.sin(phase)); phase += 2*Math.PI*f/fs; } bitIndex++; }
```
Then apply a 10 ms fade in/out, play through the radio speaker model at gain 0.6. The FM-radio "feel" comes from the radio speaker filter and the background hiss; add a 2 ms muting click (brown burst, gain 0.2) when squelch opens. Real encoders sometimes have slight timing quirks but exact bit timing sounds right to the ear (the well-known "duck-fart" rasp comes from the 3/4-cycle frequency shift itself).

### 7.5 TV EAS presentation
On cable/broadcast TV: the SAME bursts (through the TV speaker model, gain 0.5), 8 s of 853+960 Hz, then a synthetic voice reading the text (TTS, "robotic" settings), while the screen shows the red/black EAS crawl (§10.2). Local stations often show the crawl *over* programming with a "duck" of the programme audio to −20 dB. Cable EAS "force-tunes" every channel to the same crawl — include this (the channel number changes by itself and the viewer can't change it back for 60 s).

### 7.6 Phone notification sounds
- **SMS / iMessage-like**: two-note marimba: sine 1319 Hz (E6) then 1760 Hz (A6), each 90 ms, τ 60 ms, 40 ms apart; second harmonic at 0.3 for woodiness; gain 0.4 through the phone speaker.
- **Weather app push** ("Hurricane Warning issued"): three-note ascending 880/1109/1319 Hz, 80 ms each.
- **Low battery (20 %, 10 %)**: single 1000 Hz 120 ms; on-screen banner.
- **Incoming call** (a relative calling): classic ring pattern 2 s on / 4 s off; tone = sine 1200 Hz with 25 Hz tremolo (old-phone style) or a marimba arpeggio; player can answer for a TTS line.
- **Emergency alert "silent" reminder**: none; WEA is loud.

### 7.7 Smoke detector low-battery chirp (the classic)
Piezo at **3.0–3.5 kHz** (use 3200 Hz), **~60–80 ms** single beep, **every 30–45 s** (use 35 s ±2), gain 0.5 through the piezo model, HRTF at the hallway ceiling. It starts at 2–3 a.m. of the aftermath night (battery drain accelerates in heat) — this is a beloved miserable detail. Player can interact with the detector on a chair to silence it (remove battery). Also model the **full alarm** T-3 pattern in case the player cooks with a camp stove indoors: 3 × (0.5 s on, 0.5 s off) then 1.5 s off, 3200 Hz square wave, gain 1.0, painful.

### 7.8 Phone vibration buzz
Eccentric-mass motor: `OscillatorNode('sawtooth', 175 Hz)` → lowpass 900 Hz → gain 0.15, with AM by 40 Hz sine (±30 %) and a pitch ramp 150 → 180 Hz over the first 60 ms (motor spin-up). If the phone lies on a table (state: `phoneOnSurface`), add brown → bandpass 200 Hz Q 3 gain 0.2 rattle — the "phone rattling on the counter" sound. Pattern per §7.2 for WEA; 300 ms single buzz for texts.

### 7.9 Other beeps
| Device | Tone | Pattern |
|---|---|---|
| Microwave done | 2.2 kHz square-ish (sine + 3rd harmonic 0.3) | 5 beeps: 150 ms on / 150 ms off; repeat reminder every 60 s until door opened |
| Microwave button press | 2.2 kHz 40 ms | per press |
| Fridge door-open alarm | 2.7 kHz | 3 beeps 200/200 ms every 30 s after 60 s open |
| UPS on battery | 2.8 kHz | 4 s period single 150 ms beep; on low battery 0.5 s period |
| Weather radio button | 1.5 kHz 40 ms | per press |
| Weather station low battery | none (silent); display shows an icon | |
| Carbon-monoxide alarm (generator misplaced by a neighbour, distant) | 3.1 kHz | 4 beeps, 5 s pause (T-4) |
| Car alarm (neighbour's, triggered by debris) | six alternating patterns, 800/1200 Hz sweep at 3 Hz etc. | 30 s bursts, 2–3 times during the eyewall |
| Landline dial tone (if house has one) | 350 + 440 Hz | continuous; goes dead with the cable |

---

## 8. Speech: NOAA Weather Radio, TV, phone calls

### 8.1 Using `speechSynthesis`
- **Voice selection**: `speechSynthesis.getVoices()` is empty until `voiceschanged` fires in Chrome; await it with a 1 s timeout. Preference order for the NWR "Paul" robot voice: a male en-US voice with `localService === true` (Windows "Microsoft David", macOS "Fred" or "Alex", Linux espeak — espeak actually sounds *closest* to the old NWR DECtalk voice). For the TV meteorologist pick a different (female) voice, `rate 1.05`, `pitch 1.0`.
- **NWR robot settings**: `rate 0.92, pitch 0.85`. Chrome ignores pitch for some remote voices — accept it. Insert commas to force the pause cadence ("This is the National Weather Service, in Tampa Bay Ruskin, Florida.").
- **Chunking**: Chrome cuts off utterances longer than ~15 s (a known bug) and `speechSynthesis` stalls after long text. Split scripts at sentence boundaries into ≤ 200-character utterances and queue them; call `speechSynthesis.resume()` every 10 s while speaking (the classic Chrome workaround). Keep a reference to the current utterance to prevent GC-related silence.
- **Cancellation**: `speechSynthesis.cancel()` when the radio is switched off, the TV changes channel, or a WEA interrupts; then re-queue. Keep a *single* speech manager so only one device talks at a time (they can *visually* both be talking; captions handle the second).
- **Autoplay**: TTS requires the same user-gesture unlock as audio; call `speak('')` inside the first gesture handler.
- **Routing**: TTS does **not** go through the Web Audio graph — you cannot filter, pan or duck it. Emulate: (a) duck the Web Audio devices bus by −6 dB while speaking; (b) scale `utterance.volume` (0–1) by the *distance* from the player to the radio/TV and by the occlusion state (doors) — recompute on each chunk boundary (volume can't change mid-utterance); (c) if the player leaves the room, pause with `speechSynthesis.pause()` … no — that sounds wrong; instead keep talking but drop `volume` to 0.15 on the next chunk.
- **Captions fallback (always on)**: every spoken line is also shown as a caption strip with the speaking device's icon ("NOAA Weather Radio:"). In headless/no-voice environments, captions advance on a timer at 14 characters/second to mimic speech duration; with voices, they advance on `onboundary`/`onend`.
- **Audible cue that it's a radio**: a 10 ms squelch click before and after each transmission; radio hiss floor at 0.01 while the voice plays.

### 8.2 NWR cadence and style
NWS radio products are read by a synthetic voice in a flat cadence, all caps in the source; use full sentences, "Tampa Bay Ruskin" (the WFO name), and the standard structure: *SAME bursts → WAT tone → "The National Weather Service in Tampa Bay Ruskin has issued/continues…" → what/where/when → impacts → precautionary statements → repeat of the header → EOM*. Times are stated as "eight fifteen PM EDT" — write numbers out in words for TTS.

### 8.3 Sample NWR scripts

**Script 1 — Hurricane Watch (pre-storm day, ~T−36 h)**
> *(SAME: ZCZC-WXR-HUA-012081-012115-012057-012103+0600-2451500-KHB32/NWS-)*
> *(1050 Hz, 10 s)*
> This is the National Weather Service, in Tampa Bay Ruskin, Florida. The National Hurricane Center in Miami has issued a Hurricane Watch, for coastal Manatee, coastal Sarasota, coastal Hillsborough, and Pinellas counties, until further notice. A Hurricane Watch means hurricane conditions are possible within the watch area, generally within forty-eight hours. Hurricane Hanna is located about three hundred and ten miles south southwest of Sarasota, and is moving north northwest at nine miles per hour. Maximum sustained winds are one hundred and five miles per hour. Hanna is forecast to strengthen, and could be a major hurricane before it approaches the west coast of Florida on Thursday. Tropical storm force winds could arrive along the coast as early as Wednesday night. Now is the time to complete preparations to protect life and property. Install storm shutters, secure loose outdoor objects, and fill your vehicles with fuel. If you live in an evacuation zone, listen to instructions from local officials. Stay tuned to NOAA Weather Radio for further updates. *(EOM)*

**Script 2 — Hurricane Warning with Storm Surge Warning (T−24 h)**
> *(SAME: ZCZC-WXR-HUW-012081-012115-012057-012103+0600-2461500-KHB32/NWS-)* *(WAT)*
> This is the National Weather Service, in Tampa Bay Ruskin, Florida. A Hurricane Warning, and a Storm Surge Warning, are now in effect for Manatee, Sarasota, Hillsborough, and Pinellas counties. A Hurricane Warning means hurricane conditions are expected somewhere within the warning area within thirty-six hours. Preparations to protect life and property should be rushed to completion. At four PM Eastern Daylight Time, the center of Hurricane Hanna was located near latitude twenty-five point eight north, longitude eighty-four point six west, about one hundred and eighty miles southwest of Sarasota. Hanna is moving toward the north northeast at twelve miles per hour. Maximum sustained winds have increased to one hundred and twenty miles per hour, with higher gusts. Hanna is a category three hurricane. Additional strengthening is possible before landfall. Life threatening storm surge of nine to thirteen feet above ground level is possible from Anna Maria Island to Englewood, if the peak surge occurs at the time of high tide. Hurricane force winds are expected to arrive after midnight tonight, with the worst conditions expected between four AM and ten AM Thursday. Rainfall totals of eight to twelve inches, with isolated amounts near twenty inches, will produce flash flooding. Tornadoes are possible in the outer rain bands. Persons in evacuation zones A and B should complete evacuation before winds reach tropical storm force. If you are sheltering in place, identify an interior room on the lowest floor away from windows, and remain there during the passage of the eyewall. Do not go outside during the eye. Winds will return suddenly from the opposite direction. *(EOM)*

**Script 3 — Extreme Wind Warning (issued ≤ 2 h before eyewall; sustained ≥ 115 mph expected)**
> *(SAME: ZCZC-WXR-EWW-012081-012115+0300-2470930-KHB32/NWS-)* *(WAT)*
> The National Weather Service in Tampa Bay Ruskin has issued an Extreme Wind Warning, for Manatee County, and Sarasota County, until eleven thirty AM Eastern Daylight Time. At nine thirty AM, National Weather Service Doppler radar and reconnaissance aircraft indicated the eyewall of Hurricane Hanna, with sustained winds of one hundred and twenty five miles per hour, and gusts over one hundred and fifty miles per hour, was approaching the coast near Longboat Key, moving north northeast at fourteen miles per hour. This is an extremely dangerous and life threatening situation. Take cover now. Treat this warning as if it were a tornado warning. Move immediately to an interior room, or the lowest floor of a sturdy building, away from windows. Do not venture outside during the passage of the eye. Winds will rapidly increase again from the opposite direction. *(EOM)*

### 8.4 TV meteorologist lines (TTS, female voice, rate 1.05)
Short lines 6–15 s each, fired by storm events, e.g. "You can see on First Alert Doppler the eyewall is now moving over Longboat Key — if you're in Manatee County, this is it, get to your safe room now." Keep 20–30 lines in a table keyed by phase; do not loop them.

---

## 9. Mixing architecture

```
[wind W1..W6, rain R1..R4, thunder, debris, machines-outdoor] ──► OUTDOOR SUM ──► occlusion LPF ──► occlusion gain ─┐
[creaks, drips, hums, water, indoor rattles]                   ──► INDOOR BUS ────────────────────────────────────────┤
[radio, TV, phone, beeps]  (each via its speaker model)        ──► DEVICES BUS ──► duck (−6 dB while TTS) ────────────┤
[HUD clicks, menu]                                             ──► UI BUS (bypasses occlusion, no panning) ───────────┤
                                                                                                                      ▼
                                                                                        MASTER SUM ──► Limiter ──► masterGain ──► destination
```

- **Standing node count** (target ≤ 30): 6 wind sources + 6 filters + 6 gains ≈ 18 → *reduce* by sharing: W3/W4/W5 share one white source; W2/W6 share a pink source; gust modulation via one gain feeding two layers. Realistic total: 3 sources, 6 filters, 8 gains, 2 LFO oscillators = 19 for wind; rain 2 sources/3 filters/3 gains = 8; occlusion 2; buses 4; limiter 1; → ~34 standing nodes before HRTF panners. If this exceeds the CPU budget on SwiftShader, drop W4 and R4 in a "low" audio quality setting.
- **HRTF budget**: `PannerNode` with `panningModel 'HRTF'` costs ~0.3 ms/frame each on a low-end CPU. Allow **6**: weather radio, TV, phone, generator, one "active leak", one "active window" (the window rain/impact source, re-targeted to whichever window is nearest the player). Everything else uses `'equalpower'` or `StereoPannerNode`. Set `distanceModel 'inverse', refDistance 1, rolloffFactor 1.5, maxDistance 60`. Update `AudioListener` via `positionX.setTargetAtTime(x, t, 0.02)` etc. every frame (never the deprecated `setPosition`, which zippers).
- **Facade panning for weather**: the four outdoor facade gains (N/E/S/W) approach in §2.4 gives directionality for wind and rain for 4 nodes total and handles the wind-reversal beat.
- **Ducking**: while TTS speaks, devices bus −6 dB (τ 0.05 s) and outdoor occlusion gain −3 dB (the player "listens"). While WEA tone plays, nothing else ducks (it should feel intrusive).
- **Scheduling**: a 100 ms `setInterval` "audio tick" reads `StormState`, updates AudioParams with `setTargetAtTime`, and schedules stochastic one-shots up to 300 ms ahead using `ctx.currentTime` (never `performance.now()`). Rates are Poisson: `if (Math.random() < rate*dt) fire()`. When the sim runs at 60× speed, event *rates* stay in audio-time (you hear one storm, not a sped-up one) but the envelopes follow the fast-moving state.
- **Sleep/skip**: fade the master to 0 in 0.5 s, keep the graph running (params jump to the new state), fade back in 1 s. Don't stop/start sources — restarting 20 sources causes a burst of GC and clicks.
- **Tab hidden**: browsers throttle timers; the audio graph keeps running, so the 100 ms tick moves to a `ScriptProcessor`-free approach: schedule the *next* tick from an `AudioBufferSourceNode.onended` of a 100 ms silent buffer (fires on the audio thread's clock) or simply accept a stale state while hidden.
- **Memory**: one-shot buffers for thunder are generated from the shared noise buffers by playing them through envelope nodes; never allocate per strike. Only SAME bursts (≈ 1.2 s each, 3 headers cached per event code) are pre-rendered buffers.
- **Mute/limiter safety**: `masterGain` defaults 0.8; a "Reduce loud sounds" accessibility toggle halves WEA/WAT/smoke-alarm gains and raises the limiter ratio to 12 with threshold −9 dB.

---

## 10. Devices to emulate on screen

All device screens are `<canvas>` textures (`CanvasTexture`, updated only when content changes — set `needsUpdate` once per second for clocks, on-event otherwise) mapped on the in-world prop, plus a full-screen DOM overlay when the player "picks up"/"focuses" the device (interact key). Same drawing code renders both.

### 10.1 Smartphone (DOM overlay, 390×844 CSS px, rounded; canvas in-world at 256×512)
- **Lock screen**: time (large), date "Thursday, September 3", weather widget (temp/condition icon from sim), stacked notification cards, battery % and **signal bars (0–5)** from `cellBars` (tower on generator: 2 bars → 1 → "SOS" during the eyewall → back to 1–2 bars after), a Wi-Fi icon that disappears with cable/power.
- **Battery model**: 100 % at day start; drain 4 %/h idle, 15 %/h when the screen is on/radar playing, 25 %/h when searching for signal (no bars). Charging while `powerOn`. Low-power mode prompt at 20 %. Player can charge from a power bank item (adds 60 %).
- **WEA banner**: full-screen takeover, "Emergency Alert" header in black on the iOS-like white card / Android red; the message body; "OK" button; the 853+960 cadence plays and the phone vibrates (§7.2/7.8). Stored in a notification history. Bypasses silent.
- **Weather app**: current conditions from the sim; hourly strip; a **radar loop**: the storm simulation already knows the rainband geometry, so render radar reflectivity procedurally on a canvas (dBZ colour ramp: 5 green → 30 yellow → 45 red → 60 magenta) as 6 frames covering the last hour, looping at 2 fps, with the county outlines drawn as simple polygons and a "You" dot. Apply grid noise and a slight polar sweep artefact. Cone-of-uncertainty graphic on the "Tracker" tab. The app shows "Updated 2 h ago" and a red "No connection" bar when `cellBars === 0`.
- **Messages app**: group chat "Cypress Landing Neighbors" + a family thread; messages (§11.4) arrive on the storm timeline with the SMS tone; while `cellBars === 0` messages queue with "Not Delivered" and flood in when service returns.
- **FPL outage map** (in the browser app): the utility's outage map look — county polygons, blue circles sized by customers out, a "Customers without power: 612,340" banner, "Estimated restoration: Assessing" then a date; it fails to load ("Unable to connect") at 0 bars. Use a generic "Florida Power & Light" style but *do not* reproduce the FPL logo; call it "FPL Power Tracker" or a fictional "Gulf Power & Light".
- **Flashlight** toggle (lights the room with a spotlight, drains 8 %/h) — very useful in the outage.
- **Clock/Alarm**, **Photos** (nice-to-have), **Settings → Emergency Alerts** toggle (lets the player disable non-mandatory alerts; Presidential cannot be disabled — accurate).

### 10.2 TV (canvas 1280×720 texture; DOM when focused)
- **Local news look**: fictional station "WGLF 7 First Alert Weather" (avoid real call signs). Layout: live radar loop full-screen, meteorologist silhouette/placeholder (a procedural avatar — plain shape with mouth animation on TTS `onboundary`), **lower-third** with name/title, top-left "LIVE" bug, top-right "HURRICANE HANNA — CAT 3", **cone graphic** rendered from the storm track (NHC style: white cone with black outline, forecast points at 12/24/36/48/72 h with S/H/M labels), a **crawl** at 30 px/s along the bottom (lines in §11.3), and a clock/temperature bug. "Team coverage" cuts every 90 s: switch between radar, cone, a "storm surge" graphic, a reporter-at-the-beach card, and a table of shelter locations.
- **EAS**: full-screen red header bar "EMERGENCY ALERT" on black with the message scrolling white on red; audio per §7.5; on cable, channel forced.
- **Signal loss**: when `cableOn → false` (typically at the same time as power or earlier: cable nodes lose power, ~T−2 h), the picture *macroblocks* for a few seconds (draw random 16×16 block displacement on the canvas, colour-band tearing), freezes, then "NO SIGNAL" bouncing logo on blue/black. The audio stutters (repeat the last 80 ms of TTS by re-speaking a chopped word — simplest: cancel TTS and play three 80 ms bursts of pink noise through the TV model) then silence.
- **Antenna alternative**: if the player has an antenna item, "Air 7.1" keeps working after cable dies, with breakup (macroblocking) at Ve > 35 m/s; needs the TV on battery/generator — practically only in the aftermath, where the crawl carries boil-water/curfew/distribution-site info.
- **Menu/no power**: black; a small red standby LED that goes out.

### 10.3 NOAA Weather Radio (Midland-style tabletop unit)
- Prop: 16-segment LCD (canvas 128×64), three LEDs — **green "STANDBY"**, **yellow "ADVISORY"**, **red "WARNING"** — and buttons `WEATHER/SNOOZE`, `MENU`, `SELECT`, `▲▼`. Backlight off unless a button is pressed (10 s) or on alert.
- States: `OFF` → `STANDBY` (silent, green LED) → `ALERT` (SAME decoded; LCD shows event name, e.g. "HURRICANE WARNING", red LED, WAT tone, voice) → `WEATHER` (continuous broadcast: cycles through "current conditions", "forecast", "marine", "hurricane local statement" segments, each a TTS chunk with a 0.5 s hiss gap) → battery mode when `powerOn=false` (LCD shows a battery icon; screen backlight dimmer; keeps working for days — it is the one device that never fails, which is the point).
- The LCD shows the received event list for 24 h ("HUW 04:00 PM", "EWW 09:31 AM"). Channel display "CH 7 162.550" (KHB32 Tampa).
- Reception: under Ve > 45 m/s and heavy rain, add intermittent hiss increases and dropouts (0.2–0.6 s gain 0 with hiss) — real but subtle.

### 10.4 Home weather station console (Davis/AcuRite-style)
Canvas 320×240 LCD with segments: **wind speed & direction compass rose** (10-s average and **gust** with high-of-day), **barometer** with trend arrows (`↑ ↓ ↓↓` based on `dPdt`; "STORM" icon below 980 hPa), **rain rate and daily total** (in/h, in), **temperature and humidity** indoor/outdoor, dew point, time. The outdoor sensor array (on the lanai roof/back fence) dies in the eyewall (`---` on all outdoor readings) — optional cruelty, ~40 % chance. Runs on batteries after the outage (backlight off). The barometer is the star of the eye: show 947 hPa with an "↓↓" arrow turning to "↑↑" as the eye passes. Console beeps (1.5 kHz, 40 ms) on high-wind alarm (user-set 58 mph).

### 10.5 Wall clock and thermostat
- **Analog wall clock**: sim time; loud tick only in silence (pre-storm night, the eye, aftermath): tick = 4 kHz click 3 ms + wood body brown 20 ms, gain 0.05, 1 Hz, HRTF at the wall.
- **Digital microwave/oven clock**: shows time; on outage → blank; on restore → blinks "12:00" until the player sets it (interactable).
- **Thermostat**: canvas 160×80. Displays "72 / Cool" and outdoor temp; when the AC runs the "COOL" snowflake is on. At outage: screen dead. If it's a battery thermostat it shows "72 → 78 → 84 → 88" as the house heats over the aftermath (0.8 °C/h daytime with shutters closed; indoor humidity climbs to 80 %+). Tie to the *post-storm heat* system: the sweat/fog vignette, and the temperature line in the weather station.

### 10.6 Other props
- Smart speaker (dead after outage), cable modem LEDs (power/DS/US/online — "online" goes off first), garage opener wall button (dead), doorbell camera (dead), car dash when the player checks the garage (fuel, "9/03 6:42 AM"), battery lantern and headlamp (procedural light).

---

## 11. Sample content

Storm: **Hurricane Hanna** (8th name on the 2026 list — plausible for early September; name is a settings field, rendered through every template as `${NAME}`). Setting: "Cypress Landing" subdivision, east Bradenton area, Manatee County, evacuation zone C, wind-borne-debris region. WFO: Tampa Bay Ruskin (TBW). NWR: KHB32 162.550 MHz. Landfall: near Longboat Key/Anna Maria Island, Thursday 3 Sep 2026 ~10:00 EDT as a Cat 3 (125 mph), eye ~25 mi wide passing over the house ~11:00–11:45.

### 11.1 NWR scripts — see §8.3 (watch, warning, extreme wind warning).

### 11.2 Five WEA messages (≤ 360 chars; the phone shows the header "Emergency Alert")
1. **Hurricane Warning (NWS, T−24 h)** — "National Weather Service: HURRICANE WARNING in effect for Manatee County until further notice. Hurricane Hanna expected to bring winds over 110 mph. Complete preparations now. Check weather.gov/tampabay or local media. -NWS Tampa Bay"
2. **Evacuation order (Manatee County EM, T−20 h)** — "MANATEE COUNTY EMERGENCY MGMT: MANDATORY EVACUATION ORDERED for Zones A and B and all mobile homes, effective 6 AM Wed. Shelters open. Info: 311 or mymanatee.org/hurricane. Zone C: stay alert."
3. **Tornado Warning (outer band, T−9 h)** — "National Weather Service: TORNADO WARNING in this area until 1:45 AM EDT. Take shelter now in a basement or an interior room on the lowest floor of a sturdy building. If you are outdoors, in a mobile home, or in a vehicle, move to the closest substantial shelter. -NWS"
4. **Extreme Wind Warning (T−1.5 h)** — "National Weather Service: EXTREME WIND WARNING for Manatee and Sarasota Counties until 11:30 AM EDT. Eyewall of Hurricane Hanna with 125 mph winds arriving. TAKE COVER NOW in an interior room. Treat like a tornado warning. -NWS Tampa Bay"
5. **Curfew / boil water (aftermath, T+8 h)** — "MANATEE COUNTY: Countywide CURFEW 7 PM to 6 AM until further notice. BOIL WATER NOTICE for all Manatee County Utilities customers. Stay off roads. Downed lines are LIVE. Call 911 for life-threatening emergencies only."

(Also fire a **Flash Flood Warning** and a **Storm Surge Warning** if the player has them enabled; and one **Amber-style test** on prep day is *not* realistic — skip. A "Presidential" alert is never used.)

### 11.3 Ten TV crawl lines
1. HURRICANE WARNING IN EFFECT FOR PINELLAS, HILLSBOROUGH, MANATEE AND SARASOTA COUNTIES • STORM SURGE WARNING ANNA MARIA ISLAND TO ENGLEWOOD •
2. MANDATORY EVACUATION: MANATEE ZONES A & B, SARASOTA ZONES A & B, PINELLAS ZONES A, B & C • ALL MOBILE AND MANUFACTURED HOMES • SHELTERS OPEN AT 8 AM •
3. SKYWAY BRIDGE CLOSED TO ALL TRAFFIC • I-275 HOWARD FRANKLAND BRIDGE CLOSING WHEN SUSTAINED WINDS REACH 40 MPH •
4. SAND BAG DISTRIBUTION ENDS 5 PM: BRADEN RIVER PARK, GT BRAY PARK, LAKEWOOD RANCH MAIN STREET • LIMIT 10 PER VEHICLE •
5. MANATEE COUNTY SCHOOLS CLOSED WED-FRI • SARASOTA COUNTY SCHOOLS CLOSED WED-FRI • SRQ AIRPORT CLOSES TO COMMERCIAL FLIGHTS 8 PM •
6. HANNA NOW CATEGORY 3 • 125 MPH • PRESSURE 950 MB • LANDFALL EXPECTED LONGBOAT KEY LATE MORNING THURSDAY • EYEWALL 8-9 AM MANATEE COAST •
7. EXTREME WIND WARNING — MANATEE, SARASOTA — TAKE COVER NOW IN AN INTERIOR ROOM • DO NOT GO OUTSIDE DURING THE EYE •
8. FIRST RESPONDERS SUSPEND CALLS WHEN WINDS EXCEED 45 MPH • 911 IS OPERATIONAL BUT RESPONSE MAY BE DELAYED •
9. 612,000 CUSTOMERS WITHOUT POWER IN THE BAY AREA • RESTORATION CREWS STAGED, ASSESSMENT BEGINS WHEN WINDS DROP BELOW 35 MPH •
10. BOIL WATER NOTICE: MANATEE COUNTY UTILITIES, BRADENTON, PALMETTO • CURFEW 7 PM-6 AM • POINTS OF DISTRIBUTION (WATER, ICE, TARPS) OPEN 10 AM AT BRADEN RIVER HS AND PALMETTO HS •

### 11.4 Twenty text messages (group chat "Cypress Landing Neighbors" + family thread)
Format: `[phase, sim-time] Sender: text`. Senders: **Denise** (next door, retired, stays), **Marcus** (across the street, has a generator), **Priya** (two doors down, evacuated to Orlando), **Mom** (family thread, in Georgia), **Ray** (HOA guy).

**Before**
1. `[prep, Tue 18:40] Denise:` Anyone have extra plywood? Lowe's on SR64 is out and the line at Home Depot is around the building
2. `[prep, Tue 19:05] Marcus:` I've got 2 sheets you can have Denise. Also tested the generator today, 8 hrs on a tank so I'm rationing. If anyone needs to charge phones after, come over
3. `[prep, Tue 21:12] Priya:` We're leaving for Orlando at 5am. Ray can you keep an eye on the house? Shutters are up. Key is with Denise
4. `[prep, Wed 07:30] Ray:` HOA reminder (last one, promise): bring in patio furniture, trash cans, and please don't leave anything in the pool cage. Insurance won't cover stuff that flies into someone else's roof
5. `[prep, Wed 09:15] Mom:` Are you SURE you're not leaving? Your cousin says the Weather Channel guy is in Bradenton and that's never good
6. `[prep, Wed 13:48] Marcus:` FPL truck just went through the neighborhood. Guy said they're pulling crews at 45 mph sustained. Fill your tubs tonight
7. `[prep, Wed 22:30] Denise:` Well. Shutters closed, tub full, cat is under the bed already. Rain bands are getting loud. Everybody stay safe. See you on the other side
**During**
8. `[outer bands, Thu 01:20] Priya:` Orlando is already getting squalls. Tornado warning in Manatee on my phone?? Is everyone ok
9. `[outer bands, Thu 01:24] Marcus:` We're fine, it's south of us. The transformer on 84th just blew, whole sky went green
10. `[TS winds, Thu 04:02] Denise:` Power's out here. Are you all out?
11. `[TS winds, Thu 04:03] Ray:` Out. Cable went an hour ago. Weather radio says eyewall on the coast around 8
12. `[hurricane winds, Thu 07:15] Mom:` I've been up all night watching the news. TEXT ME. I don't care what time
13. `[hurricane winds, Thu 07:40] Marcus:` Lost the lanai cage. Pieces of it are in the pool. Something hit the garage door hard, it's bowed but holding. Everyone in your safe rooms?
14. `[eyewall, Thu 09:50] Denise:` It sounds like a train. Water coming under the front door. I'm in the closet with the cat and the radio
15. `[eyewall, Thu 10:55] Ray:` (Not Delivered)  ← *shows as failed while cellBars = 0; delivered later*
16. `[eye, Thu 11:20] Marcus:` It's completely calm. I'm not going out there. Sun is actually out. The birds are going nuts. Second half in 20 min, other direction, DON'T go out
**After**
17. `[subsiding, Thu 16:30] Priya:` The house?? Ray?? Anyone?? News says Longboat is underwater
18. `[aftermath, Thu 17:10] Ray:` Priya your house is ok. Shingles gone on the back side, screen cage gone, big oak is down across the street. No one can get out of the neighborhood, three trees down at the entrance. Marcus has a chainsaw going
19. `[aftermath, Fri 08:05] Marcus:` Generator's running 7-10am and 6-9pm to save gas. Bring phones, I've got a power strip on the porch. Also boil water notice per the county so don't drink the tap
20. `[aftermath, Sat 14:40] Denise:` FPL says Tuesday for us. It's 91 in my house. Anyone want to go sit in the car with the AC on? I'll bring the Oreos I was saving

Delivery mechanics: messages arrive on the storm clock; the SMS tone plays at the phone's location (HRTF) — muffled if the phone is in another room; the lock-screen count badge increments; when `cellBars === 0` incoming messages are held and delivered in a burst when service returns (with the tone played once, not 6 times). Reading a thread marks it read. Replies are canned two-option choices (adds a small "you texted back" beat and lets Mom calm down).

---

## 12. Key numeric defaults (quick reference)

| Parameter | Default |
|---|---|
| Noise buffers | pink 4 s, brown 4 s, white 2 s, 50 ms seam cross-fade, peak 0.9 |
| Wind rumble W1 | brown → LPF 60 Hz; gain `((Ve−25)/30)^2·0.8` for Ve > 25 m/s |
| Wind body W2 | pink → BPF `80+6·Ve` Hz Q 0.5; gain `min(1,(Ve/20)^1.6)·0.6` |
| Whistle W4 / howl W5 | BPF Q 12 sweeping 600–1400 Hz at 0.15 Hz / BPF Q 25 at `350+12·Ve` Hz |
| Gust smoothing | τ rise 0.25 s, τ fall 0.9 s |
| Occlusion (shutters open / closed / safe room) | LPF 1.6 kHz ×0.35 / 700 Hz ×0.22 / 350 Hz ×0.10 |
| Rain bed | white → BPF 3 kHz Q 0.4, gain `min(1,rainRate/60)^0.6·0.35` |
| Roof leak drip | sine 1.1–2.6 kHz, τ 25 ms, 5 → 60 drips/min over 40 min |
| Thunder delay / LPF / level | 3 s per km; `4000/(1+d)` Hz; `0.9/(1+0.35d)` |
| Transformer bang | brown LPF 300 Hz, τ 180 ms + arc buzz 60/120 Hz sawtooth 1–3 s |
| Generator / chainsaw | 30 Hz sawtooth chug; 47 Hz idle → 150–185 Hz cutting |
| EAS attention | 853 + 960 Hz, 8 s (8–25 s allowed) |
| WEA | 853 + 960 Hz; 2 s, 0.5, 1 s, 0.5, 1 s; 0.5 gap; repeat once (≈10.5 s); same vibration cadence |
| NWR WAT | 1050 Hz, 10 s |
| SAME | 520.83 baud, mark 2083.3 Hz, space 1562.5 Hz, LSB-first, 16×0xAB preamble, 3 bursts, 1 s gaps, ≈1.21 s per burst |
| Smoke detector chirp | 3200 Hz, 70 ms, every 35 s; full alarm T-3 (3×0.5 s on/off, 1.5 s pause) |
| Microwave / fridge alarm / UPS | 2.2 kHz 5×150 ms / 2.7 kHz 3×200 ms per 30 s / 2.8 kHz every 4 s |
| Phone vibration | sawtooth 175 Hz, LPF 900 Hz, 40 Hz AM |
| TTS NWR voice | rate 0.92, pitch 0.85, chunks ≤ 200 chars, `resume()` every 10 s, captions at 14 chars/s fallback |
| Limiter | threshold −3 dB, ratio 20, knee 0, attack 3 ms, release 120 ms; master 0.8 |
| HRTF panners | max 6 (radio, TV, phone, generator, active leak, active window); others equalpower |
| Standing nodes | ≈ 34 (drop W4/R4 for "low" quality → 28) |
| Phone battery drain | 4 %/h idle, 15 %/h screen, 25 %/h no-signal search; 8 %/h flashlight |
| Cell signal | 4–5 bars prep → 2 outer bands → 1 TS winds → SOS/0 eyewall+eye → 1–2 aftermath |
| Post-storm indoor heat | +0.8 °C/h daytime with shutters closed, to 31–33 °C; RH → 80 % |

### Implementation order suggestion
1. Noise buffers + master/limiter + occlusion chain + wind W1/W2/W3 (hear the storm build) →
2. Rain bed + roof drum + facade panning →
3. Alert tones and SAME (pure functions, easy to unit-test by ear) + TTS manager with captions →
4. Phone/TV/radio canvases (share one `DeviceScreen` base class: canvas, dirty flag, texture, DOM mirror) →
5. One-shot library (thunder, debris, creaks, transformer) →
6. Hums and the outage moment →
7. Aftermath biophony/machines →
8. Polish: whistle sweeps, drips, shutter rattle, ear-pop, mosquito.
