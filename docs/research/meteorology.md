# Hurricane Meteorology for a Fixed-Point ("At Home") Simulation

Implementation-oriented reference for the Florida Storm project. Everything here is written so that a
simulation module can compute, every frame, the conditions at ONE point (the house) as a parametric
hurricane passes. Values are in SI unless stated; conversions: 1 kt = 0.5144 m/s = 1.151 mph;
1 hPa (mb) = 0.02953 inHg; 1 in = 25.4 mm.

Sources: Holland (1980, 2008), Willoughby & Rahn (2004), Willoughby et al. (2006), Vickery & Skerlj (2005),
Vickery & Wadhera (2008), Powell et al. (1996, 2003), Zhang & Uhlhorn (2012), Tuleya et al. (2007, R-CLIPER),
Lonfat et al. (2004), Kaplan & DeMaria (1995), Molinari et al. (1994/1999), Cecil & Zipser (2002),
Zhang et al. (2012, landfall lightning), Schultz & Cecil (2009, TC tornadoes), NHC/NWS product
directives (NWSI 10-601/10-604/10-605), NOAA NWR SAME spec (NWSI 10-1712), and NHC Tropical
Cyclone Reports for Charley (2004), Wilma (2005), Irma (2017), Michael (2018), Ian (2022), Idalia (2023),
Helene/Milton (2024). Web access was available and a handful of the numbers below were spot-checked
online (Holland B defaults, EWW criteria, gust-factor ranges, R-CLIPER structure, lightning/tornado
quadrant statistics); the remainder is from the author's domain knowledge and should be treated as
"good defaults", not as citations of a specific page.

---

## 0. Design summary (the ten numbers to remember)

| Quantity | Default for the reference Cat 3 scenario |
|---|---|
| Vmax (1-min sustained, 10 m, marine exposure) | 100 kt = 51.4 m/s = 115 mph |
| Central pressure Pc / environmental Pn | 950 hPa / 1012 hPa (ΔP = 62 hPa) |
| Radius of maximum wind RMW | 25 km |
| Holland B | 1.5 (derive from Vmax, ΔP; clamp 1.0–2.2) |
| Forward speed Vt | 20 km/h = 5.6 m/s = 10.8 kt |
| Inflow angle | 20° at RMW over water, +10° over land, up to 35° at large r |
| Land/suburban reduction of sustained wind (vs marine) | ×0.78 (open land ×0.88) |
| 3-s gust factor over suburban terrain (vs 1-min sustained there) | 1.55–1.65 (turbulence intensity ≈ 0.28) |
| Eye diameter (calm region) / eye time at 20 km/h | ~35 km wall-to-wall, ~16 km "calm" → ~50 min calm, ~75 min "in the eye" |
| Rain: eyewall instantaneous / band / between bands | 50–100 mm/h / 15–40 mm/h / 0–3 mm/h |

Storm name default: **Leah** (the 2026 "L" name; an early-September storm in a normal season is around
the K–M letters). Make it selectable from the 2026 list.

---

## 1. The parametric wind field

### 1.1 Holland (1980) profile

Pressure:

    P(r) = Pc + ΔP · exp( -(RMW / r)^B ),      ΔP = Pn - Pc

Gradient wind (cyclostrophic + Coriolis):

    Vg(r) = sqrt( (B·ΔP/ρ) · (RMW/r)^B · exp(-(RMW/r)^B) + (r·f/2)² ) - r·f/2

with ρ = 1.15 kg/m³, f = 2Ω sin(lat) = 6.6e-5 s⁻¹ at 27°N, ΔP in Pa. Vg peaks at r = RMW:

    Vg,max ≈ sqrt( B·ΔP / (ρ·e) )

The normalized shape, which is what you should actually use once Vmax is specified directly:

    V(r) / Vmax = sqrt( x^B · exp(1 - x^B) ),   x = RMW / r

(the Coriolis term is a ~2–4% correction at r > 200 km; include it or ignore it).

**Recommended parameterisation** (avoids the Holland wind-pressure inconsistency): the storm state carries
`Vmax_marine` (10-m, 1-min, over water), `Pc`, `Pn`, `RMW`. Derive B once per state update:

    Vg,max = Vmax_marine / 0.85           (surface-to-gradient over water: 0.80–0.90)
    B = clamp( ρ · e · Vg,max² / ΔP , 1.0, 2.2 )

Reference example: Vmax 51.4 m/s → Vg,max = 60.5 → B = 1.15·2.718·3660/6200 = 1.85. That is at the high
end; using ρ = 1.10 and 0.90 gives B ≈ 1.5. Either is defensible; **B = 1.5** is used in the worked example
because it gives a slightly broader (and more typical Gulf-landfall) wind radii set.

### 1.2 Typical values by category (Atlantic/Gulf, near landfall)

| Category | Vmax kt (mph) | Pc hPa (typical range) | RMW km (typical) | B | R64 km | R50 km | R34 km |
|---|---|---|---|---|---|---|---|
| TS | 34–63 (39–73) | 995–1005 | 50–100 | 0.9–1.2 | — | 0–60 | 100–250 |
| Cat 1 | 64–82 (74–95) | 980–994 | 40–60 | 1.0–1.3 | 30–50 | 60–110 | 150–300 |
| Cat 2 | 83–95 (96–110) | 965–979 | 30–50 | 1.1–1.5 | 40–70 | 80–130 | 180–320 |
| Cat 3 | 96–112 (111–129) | 945–964 | 20–40 | 1.3–1.8 | 50–90 | 100–150 | 200–350 |
| Cat 4 | 113–136 (130–156) | 920–944 | 15–30 | 1.5–2.0 | 60–110 | 110–170 | 220–370 |
| Cat 5 | ≥137 (≥157) | <920 | 10–25 | 1.6–2.2 | 70–120 | 120–190 | 250–400 |

Empirical RMW (Willoughby et al. 2006, eq. 7a): `RMW_km = 46.4 · exp(-0.0155·Vmax_ms + 0.0169·lat_deg)`.
At Vmax = 51 m/s, lat 27°: 33 km. Compact Gulf storms (Charley 2004, Ian's eye ~40 km wide) sit at 15–25 km.

Empirical B (Vickery & Wadhera 2008): `B = 1.833 - 0.326·sqrt(f·RMW_m)` (f in s⁻¹, RMW in m) plus intensity
dependence; the practical range is 1.0 (large, weak) to 2.2 (small, intense). B controls how fast winds fall
off outside the eyewall: with B = 1.0 the storm is "broad"; with B = 2.0 the eyewall is a knife-edge and
winds collapse outside it.

Pressure–wind relationship (Atlantic, for when only one is specified):
`Vmax_kt ≈ 6.7·(1010 - Pc)^0.644` (Atkinson–Holliday), or the table above. For Cat 3 at 100 kt, Pc ≈ 950–955 hPa.

### 1.3 Gradient → surface, water vs land, suburban roughness

The Holland Vg is a gradient-level (~1–2 km) wind. Reduction to 10 m:

| Exposure | z0 (m) | 10-m sustained ÷ gradient | 10-m sustained ÷ marine 10-m |
|---|---|---|---|
| Open water (marine) | 0.001–0.01 (rises with wind) | 0.80–0.90 (use 0.85) | 1.00 |
| Open land (airport, grass) | 0.03 | 0.70–0.75 | 0.85–0.90 |
| Suburban, 1-story houses, trees | 0.25–0.4 | 0.60–0.65 | 0.75–0.80 |
| Urban/forest | 0.8–1.5 | 0.50–0.55 | 0.60–0.65 |

Log-law form: `V(z)/V(z_ref) = ln(z/z0) / ln(z_ref/z0)`; a 3 m eave height in suburbia sees ~0.80 of the 10-m
value. **Default: house-level sustained = 0.78 × marine sustained; peak 3-s gust ≈ 1.25 × marine sustained
≈ 1.6 × suburban sustained.** Note the Saffir–Simpson category refers to the marine-exposure value, so a
"Cat 3" house in a subdivision measures ~75–90 kt sustained on a rooftop anemometer, but gusts of 125–145 kt.

Inland decay after landfall (Kaplan & DeMaria 1995):
`V(t) = Vb + (R·V0 - Vb)·exp(-α·t)`, Vb = 26.7 kt, R = 0.9, α = 0.095 h⁻¹, t hours after landfall.
The reference house is within ~5 km of the coast, so use this only for the back half (t from 0.5 h): the
back eyewall is ~3–5% weaker than the front one for that reason alone.

### 1.4 Inflow angle

Surface wind is not purely tangential; it spirals in. Zhang & Uhlhorn (2012) mean over water: ~22°, smaller
near the eyewall (10–20° at r ≤ RMW), increasing to 30–40° at r > 3 RMW. Over land add ~10° (friction).

    alpha(r) = 10° + 12°·min(r/RMW, 1) + 8°·clamp((r - RMW)/(4·RMW), 0, 1)   (over water)
    alpha_land = alpha + 10°

For a house at position angle φ (math convention, degrees CCW from east) relative to the centre, the
velocity direction (math, "toward") is `φ + 90° + alpha`; the meteorological "from" direction is
`compass_from = (270° - (φ + 90° + alpha)) mod 360 = (180° - φ - alpha) mod 360`.
Sanity checks: house due north of centre (φ = 90°) → wind from 90° - alpha ≈ from ENE; due south (φ = 270°)
→ from 270° - alpha ≈ from WSW.

### 1.5 Motion asymmetry

The forward motion adds to winds on the right of the track and subtracts on the left (NH). Do not add the
full translation vector; the accepted correction is 50–60% of it, rotated ~20° cyclonically ahead of the
motion direction:

    V_vec(r, φ) = V_sym(r)·t̂(r, φ)  +  a(r)·Vt·ê(θ_motion + 20°),    a(r) = 0.55 · (2·r·RMW)/(r² + RMW²)

(the last factor keeps the asymmetry from swamping the weak outer winds and eye). With Vt = 5.6 m/s the
right-front quadrant runs ~3 m/s (6 kt) stronger than the symmetric value and the left side ~3 m/s weaker;
at Vt = 25 km/h (Ian-like) the difference is ±4 m/s; a 15 kt (28 km/h) mover produces a marked
right-side bias that forecasters describe as "the dirty side". The maximum wind is in the right-front
quadrant; the maximum rain and tornado threat is also there (Section 5–6).

### 1.6 When do TS / hurricane winds begin at the house?

Given the symmetric profile, invert V(r) = 17.5 m/s (34 kt), 25.7 m/s (50 kt), 32.9 m/s (64 kt) for R34, R50,
R64 (numerically, bisection on r > RMW). Time-to-onset for a house on the track: `t = (R - d_now)/Vt`.
For the reference storm (B = 1.5, RMW 25 km, Vmax 100 kt, marine): R34 ≈ 200 km, R50 ≈ 115 km,
R64 ≈ 80 km. At 20 km/h these arrive at **T-10 h, T-5.75 h, T-4 h** (marine-exposure values). At the house
(×0.78) the same thresholds are crossed later: 34 kt suburban sustained at T-6.5 h, 64 kt at T-2.6 h, but
gusts to 34 kt begin ~T-13 h and gusts to hurricane force ~T-4.5 h. Halving the forward speed doubles every
duration; a 10 km/h crawler (Harvey/Sally-like) spends 8 h in hurricane-force conditions at the house.

Rule of thumb for size scaling: R34 ≈ 4–8 RMW for B ≈ 1.5 (larger multiple for smaller B).

### 1.7 Wind direction through an eye passage

Directions below are meteorological "from" directions for a storm moving toward the NE (045°), Gulf-coast
landfall on a west-facing coast (Sarasota/Fort Myers/Tampa Bay style); alpha_land = 30°.

| House position relative to track | Approach | At closest approach | Departure | Turning sense |
|---|---|---|---|---|
| On the track | ESE–E (100–115°) | Calm in eye, direction flips 180° within minutes | WNW–W (280–295°) | Abrupt reversal |
| Right of track (SE side), offset d | ENE → E → SE | S (onshore) | SW → W | Veers (clockwise) continuously, total ~180° |
| Left of track (NW side), offset d | E → NE → N | NW | W → WSW | Backs (counter-clockwise) |

Rate of turn for offset d and forward speed Vt: the position angle changes fastest at closest approach,
`dφ/dt = Vt·d/(d² + (Vt·t)²)`; for d = 10 km and Vt = 20 km/h the direction turns at ~115°/h near T0
(the sim should evaluate direction from geometry each frame; do not script it).

For the on-track case the reversal is the signature moment: the ESE wind dies over 10–15 minutes as the
inner edge of the eyewall passes, there are 30–60 minutes of light and variable winds (5–15 kt, shifting
through S and SW), then the back eyewall arrives from the WNW in about 5–10 minutes, often as a single
"wall" of wind and rain. Debris that was blown against the east side of the house is now hurled back across
the yard; shutters that held on the east side now take the load on the west side; things that were sheltered
are now exposed.

### 1.8 Wind-related sensory cues by speed (suburban, sustained / gust)

| Sustained kt (mph) | Gusts kt | What is happening at the house |
|---|---|---|
| 15–20 (17–23) | 25–30 | Palm fronds rustling continuously; wind audible at windows; screen enclosure hums |
| 25–30 (29–35) | 40 | Fronds streaming; small twigs down; walking awkward; hose-like sound around eaves |
| 35–45 (40–52) | 55–65 | TS force: palm fronds tearing, loose objects tumbling, garbage cans over, pool screen panels bulging/tearing, first power flickers, rain horizontal |
| 50–60 (58–69) | 75–85 | Large branches snap, weak trees (laurel oak, ficus, Australian pine) start falling, screen enclosures collapse, roof edge shingles lift, roar like a freight train begins, transformer flashes |
| 64–80 (74–92) | 95–115 | Cat 1–2 equiv at house: shingle loss, soffit/vinyl siding stripped, garage doors buckling (biggest risk), fences flat, gutters gone, "the walls hum", windows flex, doors pulse |
| 80–100 (92–115) | 120–140 | Cat 3 equiv: roof sheathing loss on weak roofs, trees snapped/uprooted en masse, lanai structures gone, pool cages destroyed, debris impacts (pieces of roof, tiles) every few seconds, deafening sustained roar with high-pitched whistle |
| 100+ (115+) | 145+ | Cat 4: structural damage to older CBS homes, concrete tile roofs stripped, cars shifted, block walls fail, signs/light poles down |

---

## 2. Gustiness and turbulence

### 2.1 Gust factors

Gust factor G = (peak gust over duration t_g) / (mean over T). Standard neutral-boundary-layer theory works
for hurricanes (Vickery & Skerlj 2005; Powell et al. 1996): `G(t_g, T) ≈ 1 + g·Iu`, with turbulence intensity
`Iu ≈ 1/ln(z/z0)` at height z and peak factor g depending on t_g/T.

| Terrain | z0 m | Iu at 10 m | G(3 s / 1 min) | G(3 s / 10 min) | G(3 s / 1 h) | G(1 min / 10 min) |
|---|---|---|---|---|---|---|
| Open water | 0.002–0.01 | 0.13–0.16 | 1.20–1.25 | 1.30–1.38 | 1.40–1.45 | 1.08 |
| Open land | 0.03 | 0.17–0.19 | 1.28–1.33 | 1.45–1.50 | 1.52–1.55 (Durst) | 1.12 |
| Suburban | 0.3 | 0.27–0.30 | 1.45–1.55 | 1.65–1.75 | 1.80–1.90 | 1.15–1.20 |
| Wooded/urban | 1.0 | 0.35–0.45 | 1.55–1.70 | 1.85–2.10 | 2.0–2.3 | 1.20–1.25 |

Observed eyewall gust factors exceed these by 5–15% (convective downdrafts, mesovortices). **Defaults:
Iu = 0.28, G(3 s/1 min) = 1.55 in the bands rising to 1.65 in the eyewall.**

### 2.2 Recommended turbulence generator

Use a sum of sines driven by a von Kármán longitudinal spectrum, plus an Ornstein–Uhlenbeck (OU) fine-scale
process. Both are cheap and give the right look/sound.

Von Kármán spectrum (per unit frequency):

    S(f) = 4·σu²·(L/U) / (1 + 70.8·(f·L/U)²)^(5/6),    σu = Iu·U,   L = 100–150 m (suburban, 10 m)

Sum of N = 24 sines with log-spaced frequencies f_i from 0.003 Hz to 2 Hz:

    u'(t) = Σ sqrt(2·S(f_i)·Δf_i) · cos(2π·f_i·t + ψ_i),   ψ_i random, refreshed when U changes by >10%

Alternative: three stacked OU processes with time constants τ = 2.5 s (gust micro-structure), 20 s
(gust/lull), 180 s (squall-scale), variances 0.35, 0.45, 0.20 of σu² respectively. OU update per frame:

    x += (-x/τ)·dt + σ·sqrt(2·dt/τ)·N(0,1)

Then `V_inst = max(0, U_mean·(1 + Σ x_k))` and clamp to `≤ 2.2·U_mean`. Note the spectrum is Lagrangian in
time at a fixed point — frozen turbulence with advection at U, which is exactly what a house experiences.

Useful statistics to reproduce (suburban, U = 40 m/s):
- Individual gust peaks last **2–5 s**; the "gust envelope" (a burst of gusts) lasts 10–30 s.
- Time between strong gusts (>1.3 U): **20–60 s**.
- Lulls to 0.6 U occur every 1–3 minutes and last 5–20 s (these are when people run outside to check things — and get hurt).
- Gust "climb" is fast (1–2 s), decay is slower (3–5 s); model with an asymmetric envelope if using explicit gust events.
- Direction fluctuates ±15° (σ ≈ 8–10°) on the 2–20 s scale; lateral turbulence intensity Iv ≈ 0.75 Iu.

### 2.3 Squalls inside rainbands

A rainband cell at the house looks like: wind rises 30–60% above the band-mean over 30–120 s, rain rate
jumps ×3–5, direction veers 10–20° with the gust front, temperature drops 2–4 °C, and it lasts 5–15 minutes
before winds relax to ~80% of pre-squall for a few minutes. Cells are spaced 15–40 km along a band (i.e.
every 20–60 minutes as the band sweeps over the house at 30–60 km/h band-relative motion). Between bands
the wind mean drops 20–35% and rain almost stops. Implement as a 1-D "band profile" (Section 5) that
multiplies both wind mean and rain rate.

Eyewall mesovortices (Cat 3+): brief (10–30 s) wind excursions of +20–35% over the local mean, every
5–15 minutes while under the eyewall; these are the "worst gusts" that fail garage doors.

---

## 3. Pressure

- Holland pressure profile: `P(r) = Pc + ΔP·exp(-(RMW/r)^B)`. At r = RMW, P = Pc + ΔP/e (≈37% of the drop remains); at r = 3 RMW ~82% of the drop remains.
- Reference profile (Pc 950, Pn 1012, RMW 25, B 1.5): r = 720 km 1011.6; 400 km 1011.0; 200 km 1009.3; 130 km 1007.0; 100 km 1004.7; 75 km 1001.2; 50 km 993.5; 40 km 987.8; 25 km 972.8; 20 km 965.3; 15 km 957.2; 10 km 951.2; 0 km 950.0.
- **Rates**: outer region 0.3–1 hPa/h (barely perceptible; the barometer tendency arrow turns down at T-24 to T-18); 2–4 hPa/h inside 100 km; **15–30 hPa/h under the eyewall** (1 hPa every 2–4 minutes — Charley 2004 and Michael 2018 stations logged >1 hPa/min briefly); minimum in the eye; symmetrical rise afterward. Total fall at the house for the reference storm: 62 hPa from 1012 to 950 over ~14 h, of which ~40 hPa occurs in the final 2.5 h.
- Typical minima observed at Florida homes: Cat 1 985–995; Cat 2 970–980; Cat 3 950–965 (Ian at Fort Myers ~947, Idalia ~950 offshore, Charley 941 at Punta Gorda); Cat 4 935–950 (Michael 919 at Tyndall; Milton at landfall ~954 after weakening).
- **Ears**: the ear feels a pressure change of ~2–3 hPa if it happens within a minute or two (equivalent to 20–25 m of altitude change). At 20–30 hPa/h people report continuous ear popping/fullness, headaches, doors "breathing", closed interior doors being hard to open, toilet water sloshing, and a "whump" when the house pressurises through a broken window. Inside the eye the pressure is steady and ears equalise; the second eyewall repeats it in reverse. Implement: an "ear discomfort" scalar = |dP/dt| smoothed over 60 s, thresholds 3 hPa/h (noticeable), 10 hPa/h (frequent popping), 20 hPa/h (continuous, painful for some).
- **Home weather station display**: consumer consoles (Davis Vantage, Ambient, AcuRite) show inHg to 2 decimals (0.01 inHg = 0.34 hPa) or hPa to 0.1, update every 1–2 min, show a 3-h tendency arrow (NWS categories: rising/falling rapidly ≥ 2.0 hPa/3 h, slowly < 1.0 hPa/3 h) and a "storm" icon when the 3-h fall exceeds ~4–6 hPa. Sea-level pressure at a 5 m elevation site ≈ station + 0.6 hPa. Reference displays: 1012 hPa = 29.88 inHg; 1000 = 29.53; 980 = 28.94; 960 = 28.35; 950 = 28.05; 940 = 27.76. Many consoles have a lower display limit around 27.5 inHg/930 hPa — fine. The console also shows a pressure history graph (24 h bar chart) that becomes a dramatic V during the passage.

---

## 4. Rain

### 4.1 Radial mean rain rate (R-CLIPER, Tuleya et al. 2007)

Azimuthally averaged rain rate T(r), in inches/day (multiply by 1.058 for mm/h):

    U  = 1 + (Vmax_kt - 35)/33
    T0 = -1.10 + 3.96·U   (centre)          Tm = -1.60 + 6.81·U   (peak)
    rm = 64.5 - 13.0·U   (km, peak radius)   re = 150 - 16.0·U    (km, e-folding)
    T(r) = T0 + (Tm - T0)·(r/rm)   for r < rm
    T(r) = Tm·exp(-(r - rm)/re)    for r ≥ rm

Reference Cat 3 (100 kt): U = 2.97; T0 = 10.7 in/day = 11.3 mm/h; Tm = 18.6 in/day = 19.7 mm/h; rm = 26 km;
re = 102 km. Mean rates: r = 75 km 12.2 mm/h; 130 km 7.1; 200 km 3.6; 300 km 1.3; 400 km 0.5.
These are means over time and azimuth — the sim must modulate them with band structure (below): inside a
band multiply by 2.5–5, between bands by 0–0.2, so that the time-average over a few hours matches. R-CLIPER
underestimates peaks; instantaneous eyewall rates of **50–100 mm/h** (2–4 in/h), and 25–75 mm/h in principal
band cells, are routine. Storm totals at a house near the track: 150–300 mm (6–12 in) for a 20 km/h mover;
400–600 mm (16–24 in) for a 10 km/h mover; Ian 2022 produced 10–20 in over central Florida.

Asymmetry: the rain maximum is in the front quadrants before landfall and shifts to the left-front/onshore
side after; the right-rear quadrant is driest. Multiply by `1 + 0.3·cos(φ - θ_motion - 45°)` outside the eyewall.

### 4.2 Spiral rainband geometry

- Bands lie along logarithmic spirals: `r(θ) = r0·exp(k·θ)` with crossing angle 10–25° to circles, i.e. `k = tan(15°) ≈ 0.27` (θ in radians, θ increasing cyclonically outward-going in the NH — the bands trail clockwise outward when viewed from above, i.e. they spiral in counter-clockwise).
- Count: typically **3–6 distinct bands** outside the eyewall: an inner "principal band" 1.5–3 RMW out (often near-stationary relative to the storm and quasi-continuous, 200–500 km long), then 2–4 outer/secondary bands at 100–350 km that rotate around the storm at roughly the mean tangential flow (30–60 km/h) and are often broken into cells.
- Band width (rain > 5 mm/h): 15–40 km; gap width: 30–80 km; the outermost bands can be 100 km+ apart. Rain rate profile across a band: sharp rise on the inner (convective) edge in 2–5 km, cellular peak, stratiform tail on the outer edge over 10–20 km. A band passing over the house at 20 km/h relative motion = 45–120 minutes of rain, gaps = 1.5–4 h between the earliest bands, shrinking to 20–40 minutes and then none as the core arrives.
- Between bands: rain 0–3 mm/h, cloud base lifts, brightness rises 2–4× (sun may glint through at T-18 to T-12), wind drops by a third, people go out to finish shutters — the classic "false calm" before the next band. Bands are more distinct on the periphery; inside ~1.5 RMW the "moat" is narrow and rain is essentially continuous.
- Implementation: define M bands in storm-relative polar coordinates as log spirals with per-band r0 (at θ = 0), width w, intensity multiplier I (0.6–1.0 for outer bands, 1.3 for the principal band), angular extent (120–360°), and a slow rotation rate ω (0 for the principal band, 20–40°/h for outer bands). For the house at (r, φ_rel), compute the perpendicular distance to each spiral and sum Gaussian-ish profiles; the eyewall is band 0 as an annulus at RMW ± 0.4 RMW with I = 2.5–4. Add a 1-D cellular noise along each band for individual cells (spatial period 25 km, amplitude ±60%).

### 4.3 Wind-driven rain

Rain inclination from vertical: `tan(θ) = U_wind / w_t`, with fall speed w_t ≈ 6–9 m/s for 2–4 mm drops (use 7 m/s;
storm rain is dominated by many small drops, 1–2 mm, w_t 4–6 m/s, which is why it looks like fog blown
sideways). At U = 15 m/s the rain is at 65°; at 30 m/s 77°; at 45 m/s 81° — effectively horizontal.
Windward walls receive `R_wall ≈ R·U/w_t` mm/h equivalent: at 50 mm/h and 40 m/s that is ~290 mm/h of
water hitting the wall, which is what drives water through window frames, weep holes, door thresholds and
soffit vents ("wind-driven rain intrusion"). Rain spatter/spray reduces window visibility more than rain
rate alone. Sea spray adds a salt haze near the coast at hurricane force.

Drop impact sound level scales roughly with `R·U²`; the eyewall's rain-on-window sound is white-noise like
and continuous, bands are pulsed.

---

## 5. The eye

- **Diameter**: 15–70 km (10–40 nmi); Gulf landfalls: Charley 2004 ~10 km (pinhole), Ian 2022 ~40–50 km, Michael 2018 ~30 km, Wilma 2005 at landfall ~90 km (annular/large). Default eye (cloud-free/rain-free region) ≈ 1.4 RMW wall-to-wall ⇒ 35 km for RMW 25 km; the "calm" (< 20 kt) region is ~0.6 RMW ⇒ 15 km.
- **Duration at a point on the track**: `t_eye = D_eye / Vt` → 35 km / 20 km/h = **105 min "in the eye"** (rain stops, winds falling), of which ~**45–50 min** is calm-ish; at 10 km/h it doubles; Charley's eye gave Punta Gorda ~20 minutes. Off-track by d, the chord length is `2·sqrt((D/2)² - d²)`; beyond d > D/2 there is no eye, just a gradual veer with the worst winds sustained through the middle.
- **Sequence at the house** (reference storm): under the front eyewall (T-1.9 h to T-0.9 h) sky is black-grey, rain horizontal, visibility 50–150 m, sustained 80–95 kt at the house with 130+ kt gusts. From T-0.9 h the rain rate collapses within 5–10 min from 60 mm/h to a fine drizzle, wind falls from 80 kt to 25 kt in about 15 minutes (people describe "someone turned it off"), then to 5–10 kt shifting. Cloud cover breaks from the overhead outward: first a lighter grey, then ragged low cloud with blue holes, then (in ~40% of Cat 3+ cases with a clear eye) direct sunlight and blue sky overhead, or at night, stars and the moon, with the towering eyewall visible as a stadium wall of cloud all around, lit on the sunward side. Illuminance jumps from a few hundred lux to 10,000–40,000 lux at midday. Temperature rises 2–5 °C (subsidence warming plus sun), humidity stays 85–95%, the air is described as "thick, warm, dead still, smelling of vegetation, salt and gasoline". Sounds: the roar stops; dripping from every surface, running water in gutters/streets, sirens far away, birds (grackles, mockingbirds, gulls, sometimes hundreds of seabirds and migrating birds trapped in the eye, circling), dogs barking, neighbours' voices, generators starting, the ticking of the cooling house, a distant continuous rumble from the eyewall on the horizon. Pressure is at its minimum and steady (the ear relief is noticeable). Debris everywhere; standing water; people step outside, take photos, and are warned by NWS/media not to.
- **Back eyewall onset**: the western wall approaches at Vt; from the house it is a dark grey-blue wall with a lowered ragged base; a rising hiss is heard 1–3 minutes before it arrives; wind goes from 10 kt to 60+ kt in **3–8 minutes**, from the opposite direction, with rain at full intensity within a minute. This is the most dangerous moment of the storm for people outdoors. The back eyewall is typically 5–10% weaker in sustained wind at a coastal house (weakening + friction) but is perceived as worse because the house's already-damaged, previously-lee side is now windward and everything loose has been re-mobilised.

---

## 6. Lightning, thunder, tornadoes

- **Eyewall lightning is rare.** Flash densities in the inner core are 1–2 orders of magnitude below continental thunderstorms; in most hurricanes you will see a handful of flashes per hour in the eyewall at most, though "eyewall outbreaks" (dozens/min) occur during rapid intensification or landfall-induced convective bursts (Zhang et al. 2012). A weak maximum inside 40 km, a distinct minimum at 80–100 km, and the **strong maximum at 210–290 km in the outer bands**, concentrated in the right-front and right-rear quadrants (Molinari et al. 1994/1999; Cecil & Zipser 2002). Defaults: outer bands (200–350 km, right-of-track) 0.5–3 flashes/min visible-from-house; principal band 0.1–0.5/min; eyewall 0–0.1/min with a 15% chance of a 20-minute outbreak at 1–3/min.
- **Thunder audibility**: ~15–25 km in quiet conditions; under a rainband with 40 kt wind and 30 mm/h rain, thunder is masked beyond ~5–8 km; in the eyewall it is essentially inaudible. Distant flashes on the horizon at night (T-30 to T-12) with no thunder ("heat lightning" look) are a realistic pre-storm cue. Flash-to-bang delay = distance/343 m/s.
- **Tornadoes**: 20–40% of Florida-landfalling TCs produce at least one; big outbreaks are 40–120 (Ivan 2004 118 across the SE; Milton 2024 46 in Florida in the day before landfall). They occur predominantly in the **right-front quadrant, 100–500 km from the centre, in the outer bands, most in daylight (13–19 local)**, EF0–EF1 (90%), occasionally EF2–EF3 (Milton). Rates: for a Cat 3 landfall the right-front sector sees ~1 tornado warning per county every 2–4 h during the 18 h before landfall. Radar signatures are small, short-lived (10–20 min), and warnings have 5–15 min lead time. A house on or left of the track gets mostly the *warnings* on the phone and NWR, not the tornado; a house right of track (south/east side of an NE-moving storm) has a small but real risk. Tornado Warning text (WEA): "National Weather Service: TORNADO WARNING in this area until 3:45 PM EDT. Take shelter now in a basement or an interior room on the lowest floor of a sturdy building. If you are outdoors, in a mobile home, or in a vehicle, move to the closest substantial shelter and protect yourself from flying debris." A "Tornado Warning ... radar indicated rotation ... this is a dangerous situation" follows on NWR.

---

## 7. Sky, light, visibility, and sound cues over the timeline

| Phase (distance from centre, reference storm) | Sky | Midday illuminance (lux) | Cloud base | Notes |
|---|---|---|---|---|
| T-48 to T-30 (>600 km) | Hazy sun, cirrus outflow streaks fanning from the SW, halo around sun/moon, spectacular orange-red sunsets, altocumulus at dawn; sea breeze normal but swells on the beach | 60,000–100,000 | none / 8–12 km cirrus | "Beautiful day before the storm"; long-period swell 12–15 s arrives; rip-current statements |
| T-30 to T-18 (600–360 km) | Cirrostratus thickening to altostratus; sun as a bright disc then a smear; first outer band as a dark line on the SW horizon; distant lightning at night | 20,000–50,000 | 5–7 km | Wind picks up 10–20 kt from the E/ESE, gusty; pelicans/seabirds flying inland; frogs loud; air very humid |
| T-18 to T-10 (360–200 km) | Broken to overcast stratocumulus with 2–3 fast bands passing: 30–60 min of heavy rain, 1–3 h of dim, breezy, breaking sky between | 5,000–15,000 between bands; 1,000–3,000 in bands | 1–2 km, ragged 300–600 m in bands | Squalls to 40–50 kt; power flickers; scud clouds racing NW; last time to safely go outside |
| T-10 to T-4 (200–80 km) | Overcast, low ragged nimbostratus, near-continuous rain; sky a uniform dark grey; dusk-like at noon | 500–2,000 | 200–400 m | TS-force winds; roar established; debris flying; power out for most by T-6 |
| T-4 to T-1 (80–20 km) | Sky black-grey to greenish-grey; visibility 100–300 m in rain and spray; horizontal rain; occasional lightning; transformer flashes (blue-green) light the sky | 100–500 | 100–200 m | Hurricane force; eyewall arrives T-2 |
| Eye (T-0.9 to T+0.9) | Breaking to clear overhead; stadium-effect walls; sun / stars; light and shadow return | 10,000–40,000 (day) | eyewall edge cloud 1–2 km up to 12+ km | See Section 5 |
| T+1 to T+4 | Same as T-4 to T-1, wind reversed, then slowly brightening | 100–2,000 | 100–400 m | Worst surge on west-facing coast now |
| T+4 to T+10 | Overcast breaking to bands; bright gaps; rain showers; wind 25–40 kt from W/NW falling | 5,000–20,000 | 500–1,500 m | Rainbow possible; wind still dangerous for climbing ladders |
| T+10 to T+24 | Scattered cumulus, sunny, dry-slot air; brilliant clear evening; stars | 80,000–100,000 | cumulus 1 km | Post-storm heat: 32–35 °C, no power, dew point 24 °C; helicopters, chainsaws |

Visibility in rain (Atlas/Marshall–Palmer): extinction `β = 0.31·R^0.64 km⁻¹` (R in mm/h), `Vis = 3.912/β`:
R = 5 → 5.6 km; 10 → 2.9 km; 25 → 1.6 km; 50 → 1.0 km; 100 → 0.66 km. Then multiply by 0.3–0.5 for spray
and low cloud/darkness at U > 35 m/s: eyewall visibility 100–250 m, sometimes < 50 m in spray near the water.
Fog-like "white-out" of the far end of the street is a good cue.

Sound: the hurricane roar is broadband with a peak in the 100–400 Hz range plus a higher-pitched whistle
(800–3000 Hz) from eaves, screens and power lines that appears above ~50 kt; overall loudness at an interior
room climbs from ~45 dBA (TS) to 70–85 dBA (major hurricane eyewall). Debris impacts on the roof/shutters
are the most reported memory; second is the "freight train"/"jet engine" continuous roar; third is the
sudden silence of the eye.

---

## 8. Storm surge and inland freshwater flooding

- **Geometry**: surge is driven by onshore wind stress (∝ U²) and shallow shelf bathymetry (the West Florida shelf is wide and shallow, so surge is large: 8–15 ft in Cat 3–4 landfalls; Ian produced ~13–15 ft at Fort Myers Beach; Helene 2024 as an offshore Cat 4 gave 6–8 ft at Tampa Bay and 15 ft at Keaton Beach). On a **west-facing Gulf coast with a storm moving NE**, the right-front quadrant winds (S–SW–W) are onshore. A house on/near the track therefore sees: a modest pre-storm rise from the outer S-SE flow, a *drawdown* (water sucked out of canals and bays, exposed mud, boats on the bottom) during the offshore ESE winds T-6 to T-1 — famously seen in Tampa Bay before Irma and Ian — then, once the eye passes and winds turn WNW, the **surge floods in over 1–3 h, peaking around T+1 to T+3 h**, and drains over 3–6 h. Houses well right of the track (south of an NE track) get the surge before and during the peak winds, with no drawdown.
- **Timing model**: `η(t) = η_tide(t) + S_max · smooth(w(t))` where `w(t) = clamp(U_onshore(t)·|U_onshore(t)| / U_ref², -0.3, 1)` (negative values give drawdown) low-pass filtered with a 60–90 min time constant (water takes time to move). Add a 20–40 cm wave-setup term proportional to significant wave height. Tide range on the Gulf coast is small (0.5–0.9 m) but a high tide at T+2 adds ~0.4 m.
- **Water at the house**: a subdivision 2–5 km inland at 2–3 m elevation and outside evacuation Zone A/B sees no marine surge in a Cat 3 but gets canal/retention-pond backup and street ponding. Provide a `surge_at_house` parameter (default 0 for the "inland" scenario, optional 0.3–1 m for a canal-front scenario) so water intrusion under doors can be driven.
- **Freshwater street flooding**: FDOT/county drainage designs for 25-year storms handle ~50–75 mm/h for 1 h; when sustained rain exceeds ~40 mm/h for 30+ min streets pond to kerb depth (10–15 cm); at 75+ mm/h for an hour, water reaches driveways and garage thresholds in low lots (20–30 cm); with clogged inlets (debris, palm fronds) treat capacity as halved after T-6 h. Rate of rise: ~5–10 cm per 25 mm of excess rain; drains within 2–8 h after rain stops if the pond/canal outfall is not surcharged. Retention ponds: designed to rise 0.6–1.2 m; they overflow onto the adjacent street/yard when the storm total exceeds 200–250 mm in 24 h; pond fountains stop when power fails; ponds "smell" for days.
- Ten to twenty inches (250–500 mm) falls only when the storm crawls (Vt ≤ 10 km/h), stalls, or the house is in the left-front "training band" position for many hours (Ian in Orange/Seminole counties). At 20 km/h expect 200–300 mm at the house: nuisance flooding of streets and lanai, garage floor wet, roof leaks — but not deep inundation.
- Flood-related products: Flash Flood Warning (county WFO, WEA-eligible when tagged CONSIDERABLE/CATASTROPHIC), Flash Flood Emergency (rare), Areal Flood Warning for river/canal flooding days later, boil-water notices after utility power/pressure loss (issued by the utility; lasts 48–96 h until two clean samples).

---

## 9. Temperature, humidity, dew point

Early September, Gulf-coast Florida (Sarasota–Fort Myers–Tampa):

| Phase | Air temp °C (°F) | Dew point °C | RH | Notes |
|---|---|---|---|---|
| Prep day (T-36 to T-24) | 31–33 (88–92) day, 25–26 night | 24–25 | 65–80% | Heat index 38–41 °C; stagnant morning, afternoon sea breeze cut off by the easterly flow |
| Outer bands (T-24 to T-10) | 27–30 (81–86); drops to 24–25 in each band | 24–25 | 80–95% | Rain-cooled outflow; muggy, warm rain (~25 °C) |
| Core (T-10 to T-1) | 25–27 (77–81) | 24–25 | 95–100% | Saturated; house interior climbs to 28–30 °C without AC, everything damp |
| Eye | 27–31 (81–88) | 24–26 | 80–95% | Warm and eerily still; direct sun if clear |
| Back side (T+1 to T+8) | 25–27 | 23–24 | 90–100% | |
| Aftermath day 1–3 | 33–35 (92–95) day, 25–27 night | 23–24 | 55–70% day | Dry-slot subsidence and clear skies; heat index 40–43 °C; no power ⇒ indoor 32–34 °C, mould within 48 h; the "post-storm heat" is the most complained-about aftermath condition |

Sea surface temperature 29–30 °C; the rain itself is 24–26 °C. Wet-bulb near 25 °C during the storm; at
night in the eye the air feels warm on wet skin.

---

## 10. NHC / NWS product cadence and wording

### 10.1 NHC products and times (EDT = UTC-4)

| Product | Issued | Content |
|---|---|---|
| Public Advisory (TCP) | 5 AM, 11 AM, 5 PM, 11 PM EDT (09/15/21/03 UTC) | Headline, summary block, watches/warnings, discussion & outlook, hazards affecting land |
| Intermediate Public Advisory | 2 AM, 8 AM, 2 PM, 8 PM (when coastal watches/warnings are in effect; NHC often goes to *hourly* Tropical Cyclone Updates for a landfalling hurricane, "position estimates") | Same structure, shorter |
| Forecast/Advisory (TCM) | with each full advisory | Coordinates, wind radii (34/50/64 kt by quadrant), forecast points 12/24/36/48/60/72/96/120 h |
| Forecast Discussion (TCD) | with each full advisory | Forecaster reasoning, key messages |
| Wind Speed Probabilities | with each full advisory | Cumulative probabilities of 34/50/64 kt at named points, e.g. "Fort Myers 64 kt: 42%" |
| Tropical Cyclone Update (TCU) | as needed, often every hour near landfall | "…LEAH MAKES LANDFALL NEAR …", "eyewall moving onshore", pressure/wind updates from recon |
| Key Messages graphic | with advisories | 3–5 bullet points |

Watch/warning lead times (defined relative to the onset of *tropical-storm-force* winds, since that is when
prep becomes unsafe): **Hurricane/Tropical Storm Watch = 48 h; Warning = 36 h**; Storm Surge Watch/Warning
follow the same lead times. For the reference storm (TS-force marine at T-10 h): watch issued ~T-58 h,
warning ~T-46 h — i.e. both happen before the sim's "prep day" begins, so the sim can start (T-36 h) with a
Hurricane Warning already in effect and use the advisories to ratchet up the forecast intensity/track.

### 10.2 Local NWS products (WFO Tampa Bay/Ruskin = TBW, Miami = MFL, Melbourne = MLB, Tallahassee = TAE, Jacksonville = JAX, Key West = KEY)

| Product | When | Criteria / notes |
|---|---|---|
| Hurricane Local Statement (HLS) | Within ~1 h after each NHC advisory while watches/warnings are up | Headline, "NEW INFORMATION", "AREAS AFFECTED", "WATCHES AND WARNINGS", "PRECAUTIONARY/PREPAREDNESS ACTIONS", per-hazard sections (Wind, Surge, Flooding Rain, Tornadoes) each with "Potential impacts" in the tiers **Extreme / Devastating / Extensive / Limited / Little to None**, and threat wording like "PLAN: ... PREPARE: ... ACT: ..." |
| Extreme Wind Warning (EWW) | When sustained winds ≥ **115 mph (100 kt, Cat 3+) are expected within 1 hour**, typically for the eyewall over a polygon; valid 2–3 h | EAS/SAME code EWW, WEA: "Extreme Wind Warning this area until 3:15 PM EDT. Take shelter in an interior room now. -NWS". For the reference storm (marine Vmax 100 kt): issued ~T-3 h, though NWS practice for a borderline Cat 3 varies; issue it when forecast marine Vmax ≥ 100 kt and the house lies within RMW + 10 km of the forecast track. |
| Tornado Warning (TOR) | 5–15 min lead, 30–45 min duration, polygon | WEA "Tornado Warning in this area til 2:45 PM EDT. Take shelter now. Check local media. -NWS"; NWR with 1050 Hz tone |
| Flash Flood Warning (FFW) | When rain rates exceed local thresholds (2–3 in/h or 4–6 in/3 h) | WEA only if "considerable" or "catastrophic" damage tag; NWR otherwise |
| Storm Surge Warning (SSW) | With NHC advisory | WEA-eligible since 2017 |
| Hurricane Warning (HUW) | Initial issuance | WEA "Hurricane Warning this area til … -NWS" |
| Special Weather Statement / Special Marine Warning | as needed | |
| Post-storm: Heat Advisory, Beach Hazards, Air Quality (generator fumes) | day 1–3 | |

WEA (phone) alerts: the loud 8-second buzz ("attention signal": alternating 853 Hz + 960 Hz square-ish tones, three 1-s bursts pattern) plus 2 s vibration; delivered by cell tower — **so they stop when towers lose power/backhaul (typically from T-4 h onward)**, which itself is a detail: the phone shows "SOS"/"No Service" or 1 bar, then nothing. Text length ≤ 360 characters.

NOAA Weather Radio SAME (for audio synthesis): preamble 16 × 0xAB, then `ZCZC-ORG-EEE-PSSCCC(-PSSCCC…)+TTTT-JJJHHMM-LLLLLLLL-` sent three times, AFSK 520.83 baud, mark 2083.3 Hz, space 1562.5 Hz, ~1 s bursts separated by 1 s; then the 1050 Hz attention tone (or 853+960 Hz EAS two-tone) for 8–10 s; then the voice message ("Paul"/"Tom" synthetic voice); then `NNNN` end-of-message three times. Event codes: HUW hurricane warning, HUA watch, HLS hurricane statement, EWW extreme wind, TOR tornado, TOA tornado watch, FFW flash flood warning, FFS flash flood statement, SSW surge warning, TRW/TRA tropical storm, CEM civil emergency (curfews, boil-water), EVI evacuation immediate, SVR severe thunderstorm, RWT required weekly test (Wednesdays 11–12). Location codes for Gulf-coast counties: Sarasota 012115, Charlotte 012015, Lee 012071, Manatee 012081, Pinellas 012103, Hillsborough 012057, Pasco 012101. ORG is WXR for NWS. NWR transmits 24/7 on 162.400–162.550 MHz; in the reference scenario it stays on the air (transmitters have generators) — a realistic detail is the crackle/static as the antenna sways and the station occasionally drops out.

### 10.3 Saffir–Simpson thresholds (1-min sustained)

| | kt | mph | km/h |
|---|---|---|---|
| Tropical Storm | 34–63 | 39–73 | 63–118 |
| Cat 1 | 64–82 | 74–95 | 119–153 |
| Cat 2 | 83–95 | 96–110 | 154–177 |
| Cat 3 (major) | 96–112 | 111–129 | 178–208 |
| Cat 4 | 113–136 | 130–156 | 209–251 |
| Cat 5 | ≥137 | ≥157 | ≥252 |

### 10.4 Public advisory text skeleton

    BULLETIN
    Hurricane Leah Advisory Number  18
    NWS National Hurricane Center Miami FL       AL122026
    500 AM EDT Thu Sep 10 2026

    ...LEAH STRENGTHENS INTO A MAJOR HURRICANE OVER THE EASTERN GULF...
    ...LIFE-THREATENING STORM SURGE, DESTRUCTIVE WINDS, AND FLOODING RAINFALL
    EXPECTED ALONG THE SOUTHWEST FLORIDA COAST TODAY...

    SUMMARY OF 500 AM EDT...0900 UTC...INFORMATION
    ----------------------------------------------
    LOCATION...25.6N 84.0W
    ABOUT 140 MI...225 KM SW OF SARASOTA FLORIDA
    ABOUT 120 MI...195 KM WSW OF FORT MYERS FLORIDA
    MAXIMUM SUSTAINED WINDS...115 MPH...185 KM/H
    PRESENT MOVEMENT...NE OR 45 DEGREES AT 12 MPH...19 KM/H
    MINIMUM CENTRAL PRESSURE...950 MB...28.05 INCHES

    WATCHES AND WARNINGS
    --------------------
    CHANGES WITH THIS ADVISORY:
    None.
    SUMMARY OF WATCHES AND WARNINGS IN EFFECT:
    A Storm Surge Warning is in effect for...
    * Bonita Beach to the Suwannee River, including Tampa Bay and Charlotte Harbor
    A Hurricane Warning is in effect for...
    * Chokoloskee to the Suwannee River
    ...
    A Hurricane Warning means that hurricane conditions are expected somewhere within
    the warning area. Preparations to protect life and property should be rushed to
    completion.

    DISCUSSION AND OUTLOOK
    ----------------------
    At 500 AM EDT (0900 UTC), the eye of Hurricane Leah was located near latitude
    25.6 North, longitude 84.0 West. Leah is moving toward the northeast near 12 mph
    (19 km/h)... On the forecast track, the center of Leah will make landfall along
    the southwest coast of Florida this afternoon...
    Maximum sustained winds are near 115 mph (185 km/h) with higher gusts. Leah is a
    category 3 hurricane on the Saffir-Simpson Hurricane Wind Scale. Some additional
    strengthening is possible before landfall...
    Hurricane-force winds extend outward up to 45 miles (75 km) from the center and
    tropical-storm-force winds extend outward up to 125 miles (205 km).
    The estimated minimum central pressure is 950 mb (28.05 inches).

    HAZARDS AFFECTING LAND
    ----------------------
    Key messages for Leah can be found in the Tropical Cyclone Discussion under AWIPS
    header MIATCDAT2 and WMO header WTNT42 KNHC...
    STORM SURGE: The combination of a life-threatening storm surge and the tide will
    cause normally dry areas near the coast to be flooded by rising waters moving
    inland from the shoreline. The water could reach the following heights above
    ground somewhere in the indicated areas if the peak surge occurs at the time of
    high tide...
    Englewood to Bonita Beach including Charlotte Harbor...10-15 ft
    ...
    WIND: Hurricane conditions are expected in the hurricane warning area beginning
    this morning...
    RAINFALL: Leah is expected to produce rainfall totals of 6 to 12 inches, with
    isolated totals up to 18 inches, across the Florida Peninsula through Friday...
    TORNADOES: A few tornadoes are possible today across central and southern Florida.
    SURF: Swells generated by Leah...

    NEXT ADVISORY
    -------------
    Next intermediate advisory at 800 AM EDT.
    Next complete advisory at 1100 AM EDT.

    $$
    Forecaster Beven

Landfall update wording: "...EYE OF LEAH MAKING LANDFALL NEAR ENGLEWOOD FLORIDA... a National Ocean Service
station at Venice recently reported a sustained wind of 78 mph and a gust to 104 mph ... a pressure of
952 mb (28.11 inches) was measured in the eye by a NOAA Hurricane Hunter aircraft."

Media voice phrases worth having: "the dirty side of the storm", "do not go outside during the eye",
"hide from the wind, run from the water", "the worst is yet to come", "Extreme Wind Warning — this is like a
tornado warning for the eyewall", "hunker down", "curfew from dusk to dawn", "boil water notice", "call 911
only for life-threatening emergencies — crews cannot respond above 45 mph".

### 10.5 Forward speed and timeline duration

Durations scale as 1/Vt. Typical Gulf landfall speeds 10–25 km/h (6–14 mph). Fast (Charley, 35 km/h):
hurricane-force winds for 2–3 h, eye 15–20 min; slow (Sally 2020, 5–8 km/h): TS-force for 24+ h and
20–30 inches of rain. Expose `forwardSpeed` as a scenario slider (8–35 km/h) and derive everything else.

---

## 11. Worked timeline: Cat 3, RMW 25 km, Vt 20 km/h, eye directly over the house

Assumptions: storm moving NE (045°), landfall ~5 km SW of the house, closest approach T0 = 14:00 EDT.
Marine Vmax 100 kt; house-level sustained = 0.78 × marine (front side, over land) and 0.85 × marine (back
side, winds off the Gulf); house gust = 1.6 × house sustained (1.65 in eyewall). Pc 950, Pn 1012, B 1.5.
"Dir" = meteorological from-direction at the house. Rain = instantaneous rate at the house given the band
schedule (mean-rate column from R-CLIPER for comparison). Illuminance is at the stated clock time.

| T (h) | Clock | r (km) | Marine sust kt | House sust kt (mph) | House gust kt (mph) | Dir | P (hPa / inHg) | Rain mm/h (mean) | Sky / state |
|---|---|---|---|---|---|---|---|---|---|
| -36 | 02:00 D-1 | 720 | 13 | 8 (9) | 14 | E | 1011.6 / 29.87 | 0 (0.1) | Clear, stars, cirrus; muggy 26 °C |
| -33 | 05:00 | 660 | 14 | 9 | 15 | E | 1011.4 | 0 | Cirrus fan at dawn, red sunrise; NHC 5 AM advisory |
| -30 | 08:00 | 600 | 15 | 10 (12) | 16 | ESE | 1011.3 | 0 (0.15) | Hazy sun, halo; 29 °C; prep day: shutters, water, fuel lines |
| -27 | 11:00 | 540 | 16 | 11 | 18 | ESE | 1011.2 | 0 | Cirrostratus; 32 °C; 11 AM advisory: Cat 3 forecast at landfall |
| -24 | 14:00 D-1 | 480 | 18 | 12 (14) | 20 | ESE | 1011.1 / 29.86 | 0 (0.3) | Milky overcast thin altostratus, sun a disc; swells; 33 °C |
| -21 | 17:00 | 420 | 20 | 14 | 24 | ESE | 1010.9 | 0–2 | Altostratus, first dark band on the SW horizon; birds inland; 5 PM advisory |
| -18 | 20:00 | 360 | 22 | 16 (18) | 28 | ESE | 1010.8 / 29.85 | 0 (0.7) | Dusk overcast, band 1 approaching; distant lightning to the SW |
| -16 | 22:00 | 320 | 24 | 17 | 30 | ESE | 1010.6 | 15–25 in band 1 (1 h) | First squall: gusts 35 kt, heavy rain, lightning; first power flicker |
| -14 | 00:00 D | 280 | 26 | 19 (22) | 32 | ESE | 1010.2 | 0–1 | Gap: breaks in cloud, wet street, breezy; 11 PM advisory intermediate at 2 AM |
| -12 | 02:00 | 240 | 29 | 21 (24) | 36 | ESE | 1009.8 / 29.82 | 20–35 in band 2 (1.5 h) | Overcast; squall gusts 45 kt; tornado watch out for counties right of track |
| -10 | 04:00 | 200 | 34 | 25 (29) | 42 | ESE | 1009.3 | 2–5 (3.6) | TS-force marine begins; ragged low cloud; barometer "falling" |
| -9 | 05:00 | 180 | 36 | 27 | 45 | ESE | 1008.8 | 25–40 principal band cells | 5 AM advisory; gusts 45–50 kt; screen panels tearing; pool overflowing |
| -8 | 06:00 | 160 | 40 | 30 (35) | 50 | ESE | 1008.3 | 10–20 (5.3) | Dark dawn, 500 lux; rain nearly continuous now; garbage cans away |
| -7 | 07:00 | 140 | 44 | 33 (38) | 55 | ESE | 1007.5 | 15–30 | TS force at the house; roar begins; power flickering repeatedly |
| -6 | 08:00 | 120 | 48 | 37 (43) | 62 | ESE | 1006.5 / 29.72 | 20–30 (7.7) | Power out (most likely window T-7 to T-4); transformer flashes; NWR HLS |
| -5 | 09:00 | 100 | 55 | 43 (49) | 70 | ESE | 1004.7 | 25–40 | Branches down; fences down; water under garage door; cell service degrading |
| -4 | 10:00 | 80 | 64 | 50 (58) | 82 | ESE | 1001.2 / 29.57 | 30–45 (12) | Hurricane force (marine) begins; shingles lift; visibility 300 m; EWW likely issued ~T-3 |
| -3 | 11:00 | 60 | 76 | 59 (68) | 96 | ESE | 997.3 | 35–50 | Trees snapping; lanai cage gone; roof leaks start; 11 AM advisory/TCU "landfall imminent" |
| -2.5 | 11:30 | 50 | 82 | 64 (74) | 105 | ESE | 993.5 | 40–60 | Hurricane force at the house; sustained roar; pressure falling 8 hPa/h |
| -2 | 12:00 | 40 | 90 | 70 (81) | 116 | ESE→E | 987.8 / 29.17 | 50–80 (17) | Front eyewall arrives; darkness (150 lux); debris impacts; ears popping |
| -1.5 | 12:30 | 30 | 98 | 76 (88) | 128 | E | 979.6 | 60–100 | Peak winds; pressure falling 20 hPa/h; garage door/window at risk |
| -1.25 | 12:45 | 25 | 100 | 78 (90) | 130 | E/ENE | 972.8 / 28.73 | 60–100 (19.7) | RMW: maximum; mesovortex gusts 140+ |
| -1 | 13:00 | 20 | 97 | 75 | 125→60 | ENE | 965.3 | 60→10 | Inner edge of eyewall: rain quits within minutes, wind collapsing |
| -0.75 | 13:15 | 15 | 82 | 45→25 | 70→40 | NE, variable | 957.2 | 2 | Sky brightening, ragged cloud, patches of blue |
| -0.5 | 13:30 | 10 | 45 | 15 | 25 | variable | 951.2 / 28.09 | 0 | In the eye: sun, stillness, birds, dripping; 30 °C; 20,000 lux |
| 0 | 14:00 | 0 | ~5 | 3–8 | 12 | light/variable | 950.0 / 28.05 | 0 | Pressure minimum; eyewall visible as a ring of cloud; "eerie" |
| +0.5 | 14:30 | 10 | 45 | 15→30 | 25→50 | SW→W | 951.2 | 0→5 | Back eyewall visible to the W; hiss; sky darkening in 5 min |
| +0.75 | 14:45 | 15 | 82 | 65 | 105 | WNW | 957.2 | 30→80 | Back eyewall slams in from the opposite direction in 5–8 min |
| +1 | 15:00 | 20 | 95 | 78 (90) | 128 | WNW | 965.3 / 28.51 | 60–100 | Onshore winds: surge rising fast in coastal zones; previously-lee side now takes the load |
| +1.25 | 15:15 | 25 | 97 | 80 (92) | 132 | WNW | 972.8 | 60–100 | Back RMW: peak of back side (marine 0.97 × 100 due to weakening; onshore exposure 0.85 makes house winds slightly higher than front) |
| +2 | 16:00 | 40 | 86 | 72 (83) | 118 | WNW | 987.8 | 50–70 | Surge peak T+1.5 to T+3 at the coast; pressure rising 20 hPa/h; ears again |
| +3 | 17:00 | 60 | 72 | 60 (69) | 96 | W | 997.3 / 29.45 | 30–50 | Still hurricane force at house; 5 PM advisory: "Leah moving inland, weakening" |
| +4 | 18:00 | 80 | 60 | 49 (56) | 78 | W | 1001.2 | 20–35 | Below hurricane force at the house; brief brightening; first lulls |
| +5 | 19:00 | 100 | 51 | 42 | 66 | W | 1004.7 | 10–25 | TS force; sunset glow under the cloud deck to the W; rainbow possible |
| +6 | 20:00 | 120 | 45 | 37 (43) | 58 | W/WNW | 1006.5 / 29.72 | 5–15 (7.7) | Dusk; scattered bands; sirens; first neighbours out |
| +8 | 22:00 | 160 | 38 | 30 | 48 | WNW | 1008.3 | 0–10 bands | Rain in bands only; stars in gaps; generators; curfew begins |
| +10 | 00:00 D+1 | 200 | 32 | 25 (29) | 40 | NW | 1009.3 | 0–5 | Below TS force at house; wind noisy but safe indoors; ponds full |
| +12 | 02:00 | 240 | 28 | 21 | 34 | NW | 1009.8 / 29.82 | 0–2 | Mostly clear, breezy, humid; helicopters begin at dawn |
| +15 | 05:00 | 300 | 24 | 17 | 28 | NW | 1010.5 | 0 | Clear dawn; first light reveals damage |
| +18 | 08:00 D+1 | 360 | 21 | 14 (16) | 24 | NW/N | 1010.8 / 29.85 | 0 | Sunny, 28 °C already, heading to 34 °C; chainsaws, boil-water notice, no power |

Cumulative rain at the house: ~35 mm by T-10, ~120 mm by T-2, ~230 mm by T+4, ~250 mm storm total (10 in).

---

## 12. Recommended simulation state and update equations

State per storm (updated when the scenario clock advances; interpolate between forecast/track points):
`lat, lon` (or local x, y in km), `heading θ_m`, `Vt`, `Vmax_marine`, `Pc`, `Pn`, `RMW`, `B` (derived),
band list, `landfallTime`.

House inputs: `x_h, y_h`, terrain exposure by upwind sector (8 sectors; e.g. W/NW = "open/water",
E/SE = "suburban"), elevation, distance to coast, surge zone.

Per simulation step (dt_sim, typically 1–60 s of storm time per frame at the chosen speed):

1. Storm position: `x_c += Vt·sin(θ_m)·dt`, `y_c += Vt·cos(θ_m)·dt`. Relative vector `d = (x_h - x_c, y_h - y_c)`, `r = |d|`, `φ = atan2(d_y, d_x)`.
2. Intensity: over water hold or trend toward forecast; after landfall apply Kaplan–DeMaria decay to `Vmax_marine`; recompute `Pc` from the pressure–wind relation (or hold ΔP and let B change) and `B`.
3. Symmetric wind: `V_sym = Vmax_marine·sqrt(x^B·exp(1 - x^B))`, x = RMW/max(r, 0.5 km). Direction: `toward = φ + 90° + alpha(r, land)`.
4. Asymmetry: add `0.55·Vt·(2·r·RMW/(r² + RMW²))` in direction `θ_m + 20°` (vector sum). `V_mar = |vector|`, direction from the vector.
5. Exposure: `V_house = V_mar·k_exp(sector(dir))`, with `k_exp` = 0.78 suburban, 0.88 open, 0.95–1.0 water-fetch.
6. Band factor: `b = bandProfile(r, φ - θ_m, t)` ∈ [0.65, 1.5] for wind, `b_rain` ∈ [0, 5]. `U = V_house·(1 + 0.25·(b - 1))`.
7. Turbulence: `U_inst = U·(1 + Σ x_k)` from the OU stack (Section 2.2), τ = 2.5, 20, 180 s, σ² split 0.35/0.45/0.20 of `Iu²`, Iu = 0.28 (0.30 in the eyewall). Direction jitter: OU with τ = 8 s, σ = 9°. Mesovortex events when r < 1.3 RMW: Poisson rate 1/600 s, amplitude +25%, duration 15 s.
8. Pressure: `P = Pc + ΔP·exp(-(RMW/r)^B)` plus small turbulent term (±0.3 hPa, τ = 30 s). Keep `dP/dt` smoothed (60 s) for ear/door cues.
9. Rain: `R = T_rcliper(r)·asym(φ)·b_rain·cellNoise(t)`; eyewall region (0.6–1.4 RMW) uses `R = 60–100 mm/h·(V_sym/Vmax)²`; inside 0.6 RMW ramp to 0 by 0.4 RMW. Rain angle from `U_inst`. Accumulate `rainTotal`.
10. Light: base sky illuminance from sun elevation; multiply by cloud transmittance `τ_cloud = exp(-(0.6·optDepthFromBands + 2.2·rainFactor))` with a floor of 100 lux at noon under the eyewall; eye clearing factor = smoothstep on `(0.9·RMW - r)/(0.3·RMW)`. Cloud base and visibility from rain rate (Section 7).
11. Temperature/dew point: piecewise by phase (Section 9), with band cooling `-3 °C·b_rain/5` and eye warming `+3 °C·eyeFactor`.
12. Surge/flood: onshore wind stress filter and rain-excess ponding (Section 8).
13. Lightning: Poisson with rate from the radial/quadrant table (Section 6) × band factor.
14. Products/alerts: scheduler keyed to clock time (advisories) and to conditions (EWW when forecast marine Vmax ≥ 100 kt and time-to-eyewall ≤ 1 h; TOR random in right-front bands; FFW when 1-h rain > 50 mm or 3-h > 100 mm); WEA delivery gated by cell-tower state (fails at U_house > ~50 kt sustained for > 30 min with probability rising to 90%); NWR always on.

Derived cues for other modules: `windLoad = U_inst²` (structure creaks, shutter rattle, garage door flex),
`debrisRate ∝ max(0, U_inst - 20)^2`, `roofLeakRate ∝ R·U_inst`, `powerFailureHazard ∝ (U_inst - 25)⁺·(1 + treeFactor)`,
`earPop = |dP/dt|`, `roarLevel = 20·log10(U_inst/1)` mapped to mixer gain, `eyeFactor` for bird/silence ambience.

Compressed-time note: when the sim clock runs faster than 60×, the OU processes should be updated at a fixed
real-time rate (e.g. 30 Hz with the storm-time dt for the slow processes only), otherwise gusts blur out.
Keep the fast OU (τ = 2.5 s) in real time always — the ear hears real seconds.

---

## 13. Scenario presets (for the storm selector)

| Preset | Vmax kt | Pc | RMW km | B | Vt km/h | Track offset | Character |
|---|---|---|---|---|---|---|---|
| "Leah" reference | 100 | 950 | 25 | 1.5 | 20 | 0 (eye overhead) | Full arc with eye (default) |
| Compact Cat 4 (Charley-like) | 130 | 941 | 12 | 2.0 | 35 | 0 | Brutal but brief; 15-min eye |
| Large Cat 2 (Irma-Tampa-like) | 90 | 965 | 45 | 1.1 | 22 | +30 km right | No eye at house; 8-h veer; big surge |
| Slow Cat 1 (Sally-like) | 75 | 975 | 40 | 1.2 | 8 | -20 km left | 30 h of TS winds, 20 in rain, flooding |
| Near-miss Cat 3 | 105 | 948 | 30 | 1.6 | 18 | +70 km right | Cat 1 conditions, tornado warnings, surge, no eye |
| Cat 5 (Michael-like) | 140 | 919 | 20 | 1.9 | 22 | 0 | Structural failure scenario |

Category thresholds applied to *marine* Vmax; report both marine and house-level values in the debug HUD.
