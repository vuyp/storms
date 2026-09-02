# Three.js r170 Implementation Guide — Walkable Florida House + Hurricane Visuals (no asset files)

**Scope.** Code-level guidance for building the "Florida Storm" scene in Three.js **0.170.0** (verified in `node_modules/three/package.json`), WebGL2, plain ES modules under Vite 6. Everything is procedural: geometry from code, textures from canvas2D/shaders, no downloads. Companion documents: `florida-home.md` (domain/house detail), storm-physics and audio docs (separate).

**Sources.** Web access through the proxy worked for two searches (the r170 release notes / migration guide and the Chromium SwiftShader doc); the rest is verified directly against the installed r170 source (`examples/jsm/Addons.js` export map, `PointerLockControls.js`, `WebGLRenderer.js` defaults, `constants.js`) plus working knowledge of Three.js. Where a value is a design choice rather than a fact it is marked **(default)**.

---

## 1. Conventions and renderer setup

| Item | Decision |
|---|---|
| Units | **1 unit = 1 metre.** Y up. World origin at the house slab's front-left corner, +X east (along the street), +Z south (toward the street). Player eye height 1.65 m standing, 1.0 m crouched. |
| Renderer | `new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', stencil: false })`. `renderer.outputColorSpace` is already `SRGBColorSpace` in r170 (verified `_outputColorSpace = SRGBColorSpace`), leave it. `renderer.toneMapping = THREE.AgXToneMapping` **(default)** — AgX handles the huge dynamic range between a candle-lit shuttered room and a white overcast sky better than ACES, and it does not blow highlights to yellow. `toneMappingExposure` is the "eye adaptation" knob (see §8.4). `NeutralToneMapping` (Khronos) is the alternative if colours look desaturated. |
| Pixel ratio | `renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))`; under SwiftShader force `1`. |
| Shadows | `renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap` on hardware, `THREE.PCFShadowMap` (cheaper) when SwiftShader detected. |
| Camera | `PerspectiveCamera(70, aspect, 0.05, 400)`. Near 0.05 so the flashlight/phone held near the face does not clip. Logarithmic depth buffer **not** needed at these ranges. |
| Colour management | `THREE.ColorManagement.enabled` is `true` by default. Any colour you author as hex is interpreted as sRGB and converted to linear internally: `new THREE.Color(0xd8c9a8)` is correct. Canvas textures used as `map` / `emissiveMap` must be tagged `texture.colorSpace = THREE.SRGBColorSpace`; roughness/normal/AO/height canvases stay `NoColorSpace` (the default). Forgetting the tag is the #1 cause of "everything is washed out". |
| Time | Use `Timer` from `three/addons/misc/Timer.js` (r170 still ships it under addons, not `src/core`): `timer.update(); const dt = timer.getDelta()`. Clamp `dt` to 0.1 s so tab-switches do not launch the player through walls. |
| Imports | `import * as THREE from 'three'` and `import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'`. The `three/addons/*` alias maps to `examples/jsm/*` in `package.json` `exports` — do **not** use `three/examples/jsm/...`, which works but breaks the `Addons.js` barrel and confuses Vite pre-bundling. |

Scene-wide singletons worth creating first, because everything reads them:

```js
// wind.js — one shared wind state the storm model writes each frame
export const wind = {
  dir: new THREE.Vector3(1, 0, 0), // unit, horizontal, "blowing toward"
  speed: 0,        // m/s sustained (10 m height)
  gust: 0,         // m/s instantaneous
  rainRate: 0,     // mm/h
  uniform: { value: new THREE.Vector4(1, 0, 0, 0) }, // xyz dir * gust, w = time
};
```

Pass `wind.uniform` to every material's `onBeforeCompile` (palms, rain, debris, water, glass) so one `Vector4` drives the whole world.

---

## 2. Floor plan: sizes and the data → mesh pipeline

### 2.1 Sizing table (~170 m² living area 3/2/2 CBS home, single story)

Values are interior clear dimensions in metres; exterior CBS walls 0.25 m thick (8" block + stucco + furring/drywall), interior walls 0.115 m, ceiling 2.85 m (9'4"), tray ceiling in master +0.3 m. Overall slab ≈ 19.8 × 14.0 m including garage.

| Room | W × D (m) | Notes / openings |
|---|---|---|
| Foyer | 1.8 × 2.4 | Front door 0.91 × 2.03 (36"×80"), inswing on older house; sidelight 0.3 × 2.03 |
| Great room (family) | 5.5 × 5.2 | Triple slider to lanai 2.7 × 2.03 (or 2.44 tall), 65" TV wall, ceiling fan |
| Kitchen | 4.0 × 3.6 | Open to great room across an island 2.4 × 0.9 × 0.9 h; window over sink 0.9 × 1.2 |
| Dining/nook | 3.0 × 3.0 | Window 1.5 × 1.2 |
| Laundry | 1.8 × 2.4 | Door to garage 0.81 × 2.03 (fire-rated steel) |
| Master bedroom | 4.6 × 4.3 | Slider to lanai 1.8 × 2.03; tray ceiling; 2 windows 0.9 × 1.2 |
| Master closet (safe room) | 2.4 × 2.0 | Interior, no windows, single door |
| Master bath | 3.6 × 2.7 | Garden tub 1.5 × 0.8; shower 0.9 × 1.2; window 0.6 × 0.6 (obscure glass, high sill 1.5) |
| Bedroom 2 | 3.4 × 3.4 | Window 0.9 × 1.2; closet 1.5 × 0.6 |
| Bedroom 3 / office | 3.4 × 3.2 | Window 0.9 × 1.2 |
| Hall bath (interior) | 1.5 × 2.4 | Tub 1.5 × 0.75; no window |
| Hallway | 1.1 wide | Attic hatch 0.56 × 0.76 in hall ceiling |
| Garage | 6.1 × 6.4 | Roll-up door 4.9 × 2.13 (16'×7'), man door to side yard 0.81 × 2.03 |
| Covered lanai | 6.0 × 3.0 | Under truss; screen cage beyond 9 × 7 × 3.2 h; pool 4 × 8 m, 1.1–1.8 deep |
| Windows (all) | sill 0.9 m, head 2.1 m | Single-hung, 2 lites; shutter tracks 0.05 m outside stucco |

Lot 24 × 38 m (80'×125'); house set back 7.6 m from the right-of-way; driveway 6 × 8 m; street 7.3 m wide asphalt with 1.5 m grass swales; three neighbour houses each side and four across, plus a retention pond behind.

### 2.2 Plan as data

Author the plan once as JSON-ish JS; generate walls, floors, ceilings, baseboards, colliders, and nav zones from it. Walls are **centre-line segments** with a thickness; openings are ranges along the segment.

```js
export const plan = {
  ceiling: 2.85,
  walls: [
    { a: [0, 0], b: [19.8, 0], t: 0.25, ext: true,
      openings: [{ type: 'window', at: 3.0, w: 0.9, sill: 0.9, h: 1.2, id: 'br2' }, ...] },
    { a: [7.0, 0], b: [7.0, 5.2], t: 0.115, openings: [{ type: 'door', at: 1.2, w: 0.81, h: 2.03, id: 'hallbath' }] },
  ],
  rooms: [{ id: 'great', poly: [[7,0],[12.5,0],[12.5,5.2],[7,5.2]], floor: 'tile', ceil: 'knockdown', ...}],
};
```

From this: each wall → one `ExtrudeGeometry` from a `THREE.Shape` with holes (§3); each room polygon → `ShapeGeometry` floor + ceiling (flip normal), plus a baseboard strip (thin `BoxGeometry` runs along the polygon edges, 0.09 h × 0.012 t, minus door widths); each opening → a frame, a door or window mesh, a collider (doors) and a "hole" record for the `roomOf(point)` query.

`roomOf(p)`: point-in-polygon over `rooms[]` each frame for the player; it drives reverb, sound occlusion, which lights matter, which windows the rain-on-glass shader considers "near", and whether wind pushes the player.

---

## 3. Walls with openings — no CSG

Two viable approaches; use **A** for exterior/interior walls and **B** only for tiny bits.

**A. Shape with holes → `ExtrudeGeometry`.** Build the wall in its own 2D space (u along the wall, v up), punch rectangular holes for doors/windows with `shape.holes.push(new THREE.Path().setFromPoints(...))`, extrude by thickness `t` with `bevelEnabled: false`, then rotate/translate into world. The extrusion gives you the reveal (jamb) faces automatically, which is exactly what a door opening looks like. UV note: `ExtrudeGeometry` UVs are in shape units (metres) for the caps and along-perimeter for the sides — good enough because our textures are tiling; set `texture.repeat` to 1/tileSize and use `wrapS = wrapT = RepeatWrapping`. Winding: shape CCW, holes CW (or use `THREE.ShapeUtils.isClockWise` to flip) or the hole will fill.

```js
function wallGeometry(len, height, t, openings) {
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.lineTo(len, 0); s.lineTo(len, height); s.lineTo(0, height); s.closePath();
  for (const o of openings) {
    const y0 = o.type === 'door' ? -0.01 : o.sill; // door hole punches through the floor line
    const h = new THREE.Path();
    h.moveTo(o.at, y0); h.lineTo(o.at, y0 + o.h + (o.type==='door'?0.01:0));
    h.lineTo(o.at + o.w, y0 + o.h + (o.type==='door'?0.01:0)); h.lineTo(o.at + o.w, y0); h.closePath();
    s.holes.push(h);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 1 });
  g.translate(0, 0, -t / 2); // centre on the wall line
  return g;
}
```

Because the two faces of an exterior wall need different materials (stucco outside, drywall inside), extrude **two** half-thickness slabs back-to-back (outer slab material = stucco, inner slab = drywall) — the seam is inside the wall and invisible; the reveal faces get a third "painted trim" material via `geometry.groups` (ExtrudeGeometry already produces group 0 = caps, group 1 = sides; pass `[capMat, sideMat]`).

**B. Box composition.** For a wall with one opening: 4 boxes (left pier, right pier, header, sill). Fine for garage/lanai half-walls; it multiplies draw calls otherwise. Always merge with `BufferGeometryUtils.mergeGeometries` (from `three/addons/utils/BufferGeometryUtils.js`) per material after `applyMatrix4`.

**Merging policy.** Group all static house geometry by material into ≤ ~12 merged meshes (stucco, drywall, tile floor, carpet, ceiling, trim/baseboard, cabinets, roof shingles, soffit/fascia, concrete, glass, screens). Each merged mesh gets `matrixAutoUpdate = false` and a manually computed `boundingSphere`. Do the same for every neighbour house, scaling and recolouring the same plan (mirror in X with `scale.x = -1`; set `material.side` accordingly or flip winding — easier: build mirrored geometry with `geometry.scale(-1,1,1)` then `BufferGeometryUtils` computes nothing extra, but call `geometry.computeVertexNormals()` **after** flipping index winding, or you get inside-out lighting).

---

## 4. Hip roof geometry

A hip roof over a rectangle `L × W` at pitch `p` (rise/run, 4:12 → 0.333) with eave overhang `o` (0.6 m):

1. Eave rectangle: `(−o, −o)…(L+o, W+o)` at eave height `He = wallTop + 0.05`.
2. Ridge: runs along the long axis, length `L − W` (for W < L), at height `He + p·(W/2 + o)`, centred.
3. Faces: two trapezoids (long sides) + two triangles (hip ends). Build directly as a non-indexed `BufferGeometry` with hand-set positions/normals/uvs: 2 trapezoids × 2 tris + 2 tris = 6 triangles per simple roof.

For an L-shaped plan, decompose into two rectangles, build both hip roofs, and let them intersect — the interior-facing planes are hidden inside the attic volume, so no CSG needed. Add: fascia board (`BoxGeometry` ring along the eave, 0.2 h × 0.03 t), soffit (flat quad ring under the overhang, uses the "vented soffit" canvas texture), ridge cap (thin box along the ridge), a gutter (half-pipe `CylinderGeometry(0.06, 0.06, len, 8, 1, false, 0, Math.PI)`). Roof UVs: u along slope, v along run, scale 1 unit = 1 m so the shingle texture (0.9 m tile) repeats correctly.

Shingle loss during the storm (§10.7) uses a separate `InstancedMesh` of shingle tabs sitting 5 mm above the roof surface only on the windward slope — when a tab "lifts", swap its instance matrix into the debris system and paint a dark "missing shingle" decal (a `PlaneGeometry` with the felt texture) at its old location.

---

## 5. Procedural canvas textures

All materials use `MeshStandardMaterial` (metalness 0, roughness 0.5–0.95). Textures are generated once at startup into `<canvas>` elements → `CanvasTexture` (`generateMipmaps: true`, `anisotropy: renderer.capabilities.getMaxAnisotropy()`, capped at 4 on SwiftShader). Sizes: 512² for most, 1024² for floor tile and shingles, 256² for micro-noise. Total budget ≈ 25 textures, ≈ 30 MB GPU — fine.

Core helpers (write once):

- `noiseCanvas(size, octaves)` — value noise via a seeded PRNG (`mulberry32`) with `ImageData` fill; fBm by summing scaled copies. Use `ImprovedNoise` from `three/addons/math/ImprovedNoise.js` (Perlin) for the 2D fields — it is fast and deterministic.
- `heightToNormal(heightCanvas, strength)` — Sobel filter over the height `ImageData` → RGB normal map (`(nx*0.5+0.5, ny*0.5+0.5, nz)`). Set `material.normalScale` 0.3–0.8. This is the "normal-ish detail" that makes flat stucco and drywall read as real.
- `tiler(size, tileW, tileH, groutW, jitter)` — draws a grid of rectangles with per-tile colour jitter and grout lines; also returns a roughness canvas (grout rough, tile glossy) and height canvas (grout recessed).

| Surface | Colour map recipe | Height/normal | Roughness |
|---|---|---|---|
| Exterior stucco (knockdown/sand finish) | base beige/greige `#d9cbb2` + 3-octave noise ±6 % + sparse "dabs" (random ellipses, 2–8 px, slightly darker) | fBm noise + the dabs raised; normalScale 0.6 | 0.9 |
| Interior drywall (knockdown texture) | near-white `#efe9dd` + faint splotches (ellipses, alpha 0.05) | splotches raised, strength 0.25 | 0.85 |
| Ceiling knockdown | same as drywall, brighter | same | 0.9 |
| Porcelain floor tile 18" (0.457 m) | `tiler(1024, 0.457, 0.457, 0.004)`; each tile gets a marbled veining pass (2–3 low-alpha bezier curves) and ±4 % lightness jitter, base `#cfc3b0` | grout −1, tiles flat | tile 0.35 (0.15 when wet), grout 0.9 |
| Bathroom wall tile 12×24 | `tiler(512, 0.3, 0.6, 0.003)`, white/grey | grout | 0.3 |
| Wood (cabinets, doors, furniture) | stretched noise (scale x 1, y 24) → grain; ring bands via `sin(x*freq + noise)`; colours "espresso" `#3b2a1e`, "maple" `#b98a55`, "shaker white" `#f2efe8` | grain as height, strength 0.3 | 0.55 |
| Granite counter | dark base + high-frequency speckle (thousands of 1-px dots in 3 tones) + faint large noise | flat | 0.25 |
| Asphalt shingles (architectural) | rows 0.14 m high (≈ 5⅝" exposure), staggered tabs with random darker "shadow" tabs, base charcoal `#4a4744` with ±10 % jitter and granule speckle | row step edges raised | 0.95 |
| Vented soffit | white panels 0.3 m wide with rows of tiny slots every 0.1 m | slot lines recessed | 0.6 |
| Concrete (slab, driveway, sidewalk) | grey `#a8a49c` + fine noise + broom-finish lines (parallel light stripes) + control-joint lines every 3 m | joints recessed | 0.85 |
| Asphalt street | dark `#3a3a3c` + coarse aggregate speckle + faint tyre-lane brightening | — | 0.9 (0.4 wet) |
| St Augustine turf | green `#4d7a2f` + blade noise (short random strokes), patches of lighter/darker; drives a **vertex-displaced grass card** layer near the camera only | — | 0.8 |
| Fiberglass screen (cage/lanai) | transparent canvas, 1-px dark lines every 3 px both axes; `alphaTest: 0.5`, `transparent: true`, `depthWrite: false` | — | — |
| Fabric (sofa, bed) | base colour + very fine noise + weave lines | fine cross-hatch height | 0.95 |
| Brushed stainless (fridge) | horizontal 1-px streak noise | — | roughness map = the streaks, metalness 1.0 |
| Popcorn/texture on garage ceiling, painted block in garage | block `tiler(0.4, 0.2, 0.01)` in grey-white | mortar recessed | 0.9 |
| Decals: water stains, mildew, drip trails | radial gradient rings (brown, alpha) on transparent canvas, applied as `PlaneGeometry` decals `polygonOffset: true, polygonOffsetFactor: -1` | — | — |

Wetness (§10.9) is done in the shader, not by regenerating canvases.

---

## 6. Furniture and props from primitives

Rule: every prop is a small factory function returning a `Group` of `BoxGeometry` / `CylinderGeometry` / `SphereGeometry` / `LatheGeometry` / `TubeGeometry` parts sharing ≤ 2 materials, then **merged** into one geometry per material (`mergeGeometries` after `applyMatrix4` with each part's local transform). Add an AABB (`Box3`) to the collider list and an interaction record if interactive.

| Prop | Construction sketch |
|---|---|
| Sectional sofa | seat slab 2.4 × 0.45 × 0.9 + chaise, back boxes with 0.03 m rounded edges via `RoundedBoxGeometry` (`three/addons/geometries/RoundedBoxGeometry.js`), cushions = slightly smaller rounded boxes with random ±2° tilt, fabric material |
| Dining table + chairs | top box 1.8 × 0.04 × 0.9 at 0.75 h, 4 tapered legs (`CylinderGeometry(0.03, 0.045, 0.72, 8)`); chairs: seat box, 4 legs, back = 2 posts + 3 slats |
| Bed | frame box, mattress `RoundedBoxGeometry(1.93, 0.25, 1.52, 4, 0.06)`, pillows (rounded boxes squashed), duvet = `PlaneGeometry(…,20,20)` with vertex noise displacement, headboard box |
| Kitchen cabinets | runs of 0.6-deep boxes 0.9 h (base) and 0.3-deep 0.9 h (upper at 1.4 sill); doors = 0.02 thick inset boxes with a 0.01 groove (second box, darker); handles = `CylinderGeometry(0.005, 0.005, 0.12)`; granite top 0.03; island; fridge 0.9 × 1.78 × 0.8 with two doors and an ice/water dispenser recess; range 0.76 wide with 4 black `CylinderGeometry` burners and a control panel emissive strip |
| TV | 65" → 1.45 × 0.83 × 0.03 black box; screen = `PlaneGeometry` with a `CanvasTexture` that is **redrawn** each 0.5 s (news ticker, radar cone drawn from the storm model, colour bars/static when cable drops); `emissive` white, `emissiveMap = screen`, `emissiveIntensity` 1.5; light bleed = one `PointLight` (§8) tinted by the average screen colour |
| Ceiling fan | motor cylinder, 5 blade boxes (0.6 × 0.01 × 0.12) rotated 12°; `rotation.y += omega*dt` with omega easing to 0 over 40 s after power loss (drafts keep it slowly turning at 0.2 rad/s during the storm) |
| Lamps | base `LatheGeometry` profile, shade = open cone (`CylinderGeometry(0.15, 0.22, 0.3, 24, 1, true)`, `DoubleSide`, `emissive` warm when on), plus the room's baked light (§8) |
| Doors | slab box 0.035 thick, six-panel look via 6 inset boxes; knob; pivot `Group` at the hinge edge so `rotation.y` opens it |
| Windows | frame boxes (white aluminium), 2 sashes with muntin-free glass planes, screen plane outside, sill box |
| Shutters | accordion: 12 hinged blade boxes per side (0.09 wide, 0.004 thick) in a `Group` chain; panel: corrugated `PlaneGeometry(…, 40, 1)` with `sin` z-displacement, 0.6 m wide panels |
| Hurricane supplies | water case = box with `CanvasTexture` label; gas can (rounded box + spout cylinder, red); generator (box + fuel-tank rounded box + handle tube); coolers; flashlight (cylinder + `SpotLight` when carried); candles (cylinder + tiny `PointLight`, flicker); lantern; box fan; 5-gal buckets under drips |
| Vehicles | car: rounded box body + cabin rounded box + 4 `CylinderGeometry` wheels + emissive tail lights; enough at subdivision distance |
| Trash can (wheeled 95 gal) | tapered box, lid box, 2 wheels; becomes a debris body |
| Mailbox, streetlight, stop sign, transformer (pole-mounted cylinder or pad-mounted green box), A/C condenser (box + top fan grille disc + spinning blade disc), pool pump, hose reel, patio table/chairs | 1–4 primitives each |

Total ≈ 120 prop instances in the house; ≈ 25 per neighbour house (exterior only); use `InstancedMesh` for anything repeated ≥ 8 times (chairs, water bottles, shingles, fronds, pavers, screen panels, streetlights, mailboxes, hedge blobs).

---

## 7. Room lighting that looks baked and stays cheap

The goal is a soft, bounced-light interior with two or three real lights. Recipe **(default)**:

1. **`HemisphereLight(skyColor, groundColor, 0.35)`** — sky colour follows the sky dome zenith colour each frame; ground colour = tile/lawn tint. This is the "GI" that keeps ceilings from going black.
2. **`AmbientLight(0xffffff, 0.12)`** as a floor so shuttered rooms are never pure black (represent phone-glow/eyes adapting).
3. **Sun: one `DirectionalLight`** with a shadow camera fitted to the house + lanai only (orthographic 30 × 30 m, `shadow.mapSize 2048` on GPU / 1024 SwiftShader, `shadow.bias -0.0005`, `normalBias 0.02`). Intensity 3.0 clear day → 0.15 under the eyewall; colour warms and reddens near sunset.
4. **Window light**: for each window facing the sun, a `RectAreaLight` (import `RectAreaLightUniformsLib` from `three/addons/lights/RectAreaLightUniformsLib.js` and call `.init()` once) sized to the opening, aimed inward, intensity ∝ sky brightness and 0 when shuttered. Rect lights are per-fragment analytic and reasonably cheap (≤ 6 active). Only the two or three windows of the room the player is in (plus adjacent) are enabled.
5. **Fixture lights**: one `PointLight` per room, positioned at the fixture, `distance` = room diagonal × 1.2, `decay 2`, intensity ~6 (candela-ish in physically-correct mode which is now the only mode), warm 2700 K colour `0xffd1a3`. Only lights in the current room and its neighbours are non-zero; others sleep at 0 (still compiled into the shader — keep **total** point lights ≤ 8 to keep shader constant across rooms, avoiding recompiles; changing intensity does not recompile, adding/removing lights does).
6. **Emissive + fake bounce**: fixture housings, TV, lamp shades use `emissive`. Under each ceiling fixture, put a faint, large `PointLight` **or** simply a lightened vertex colour on the floor mesh under the fixture at bake time (vertex-colour "lightmap": tessellate floors 0.5 m and set per-vertex `color` from a cheap radiosity approximation — distance falloff from each fixture, darkening near walls). This gives the baked look at zero runtime cost. Toggle it by multiplying `vertexColors` with a "powerOn" uniform via `onBeforeCompile`.
7. Shadows: **only the sun casts** on GPU; interior lights do not cast (shadow maps for point lights are cube maps = 6 passes each). Fake contact shadows under furniture with dark-gradient `PlaneGeometry` decals (`Blur AO cards`, opacity 0.35) — exactly what makes furniture look grounded.
8. **Ambient occlusion**: none in post. Bake AO into vertex colour along wall-floor and wall-ceiling junctions (darken vertices within 0.3 m of a concave edge) — same vertex-colour channel as (6).

### 7.1 Power-out mode

- All fixture `PointLight.intensity → 0` with 60 ms flicker sequences (`intensity = base * (Math.random()>0.3)`) for brownouts; HVAC hum stops (audio doc).
- Vertex-colour "bake" multiplier → 0.
- **Flashlight**: a `SpotLight` parented to the camera (offset (0.15, −0.12, 0), angle 0.35 rad, penumbra 0.5, intensity 40, distance 25, `decay 2`, warm-white), **castShadow true** with `shadow.mapSize 512` — this is the one dynamic shadow allowed at night; it is what makes the dark house terrifying. Add a "cookie": `spot.map = CanvasTexture` of a soft ring pattern for a realistic hotspot (r170 supports `SpotLight.map`).
- **Phone screen**: tiny `PointLight` (intensity 0.4, distance 2.5) + emissive quad in the hand.
- **Candles/lanterns**: `PointLight` intensity `0.8 + 0.25·noise(t·9)` with position jitter ±5 mm; colour `0xffa64d`. Cap at 4 simultaneous candle lights; extra candles are emissive-only.
- **Lightning through windows**: the sun `DirectionalLight` is re-pointed to a random near-horizontal azimuth and its intensity spiked to 20–60 for 80–200 ms in 2–3 sub-flashes; hemisphere sky colour → bluish white; all window `RectAreaLight`s spike. Combined with a bright sky dome frame (§10.6). Cheap, and it casts real shadows of the mullions across the floor. Thunder scheduled at `distance/343 s` later (audio doc).

### 7.2 Exposure / eye adaptation

`renderer.toneMappingExposure` lerps toward a target: 1.0 outdoors day, 0.6 under the storm sky, 2.5 in a lit room, 6 in a dark room with a flashlight, 12 in candle-only. Time constant 2 s brighten / 0.5 s darken. This single scalar sells "stepping out of a shuttered house into the eye".

---

## 8. Windows, glass, rain on glass, shutters

### 8.1 Glass
`MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0, transmission: 0, transparent: true, opacity: 0.18, envMapIntensity: 1 })`. **Do not use `transmission`**: it requires rendering the scene into a transmission render target per frame (r170 does this automatically when any material has `transmission > 0`) — a full extra pass, and it is catastrophic under SwiftShader. Plain alpha-blended glass with a strong specular (`specularIntensity 1`, `ior 1.5`) plus an environment map looks right.

Environment map: generate a tiny procedural `PMREM` from the sky each few seconds: render the sky dome into a `WebGLCubeRenderTarget(64)` via `CubeCamera` (only the sky/clouds layer, via `camera.layers`), then `scene.environment = cubeTarget.texture` — that gives reflections that darken with the storm and flash with lightning. 64² × 6 is trivial. Interior-only reflections (the room reflected in dark glass at night) are approximated by a second static cube rendered once from the great room at startup, blended by `envMapIntensity` when it is darker outside than inside.

Tinted Florida windows: `color 0xbfc9c4`, opacity 0.3.

### 8.2 Rain on glass (per-window shader)

Screen-space droplets look fake indoors; use a **per-window material** (`ShaderMaterial` on the glass pane, one shared program, per-window uniforms via `onBeforeRender` or `material.clone()`):

- Grid of cells (e.g. 24 × 32 per pane); per cell a pseudo-random droplet with jittered position, radius, and a lifetime driven by `uTime`. Droplet = circle with `smoothstep`; inside, refract by sampling the "behind" colour with an offset normal (fake: sample a blurred copy of the sky/backdrop colour — for windows just offset the environment lookup; for visible refraction use `screen-space` `uBack` = the previous frame at reduced res only on GPU builds).
- **Streaks**: a second layer of elongated cells, stretched along `uStreakDir` = the wind vector projected onto the window plane (`dot(windDir, windowRight)`, `dot(windDir, windowUp)` — for a vertical pane wind pushes drops sideways and gravity pulls down; combine `vec2(windAlong * 0.6, -1.0)` normalised). Streaks scroll at `uSpeed ∝ rainRate`.
- Coverage ∝ `rainRate` and ∝ `max(0, dot(windDir, windowNormal))` (windward windows are hammered, leeward nearly dry) — this is the detail people notice.
- Output: `gl_FragColor = mix(glassColor, refracted, dropMask)` plus a small specular highlight per droplet; a "wet sheen" term lowers effective roughness for the environment lookup.
- Cost: pure math, ~40 instructions; fine on SwiftShader because only 6–10 panes are visible at once and they are small on screen.

### 8.3 Interior fog on glass
When the house is sealed and humid (post-outage, A/C dead, people breathing): a `uFog` uniform 0–1 that adds a `noise(uv·6)`-modulated white haze to the pane and boosts roughness, with a clear "wipe" region if the player interacts ("wipe the window") that re-fogs over 2 min.

### 8.4 Shutters
- **Accordion**: chain of 12 blades per side; closing animates `blade[i].rotation.y = ±(1 − t)·80°` with the group translating along the track; `t` eases over 8 s; sound sync. When closed, the window's `RectAreaLight` fades to 0, the glass pane material switches to an opaque dark-grey "shutter-behind-glass" look (from inside you see aluminium slats through the glass: a striped emissive-less material), and the room's daylight contribution drops to a slit-glow (thin emissive strips at the blade seams, `emissiveIntensity` ∝ outdoor brightness). Outside: corrugated white aluminium.
- **Panels**: player carries a panel (a mesh parented to the camera), walks to the tracks (interaction target), panel snaps in with a wing-nut sound; 3–5 panels per opening. Same darkness logic.
- Shuttered garage/slider: the slider flexes: vertex shader on the glass pane `z += sin(uTime·1.7)·gust·0.0004·(1−|uv−0.5|·2)` (bows an inch or two in the middle).

---

## 9. Player, collision, doors, interaction

**Controls**: `PointerLockControls(camera, renderer.domElement)`; `controls.lock()` on click of the overlay; use `controls.object` (r170: `getObject()` is deprecated, verified in source) — it is the camera. Keyboard state map; `controls.moveForward/moveRight` are fine but we do our own integration so collision can respond: compute desired velocity in camera-yaw space, then move the capsule, then `camera.position.copy(capsule.end)` minus eye offset.

**Collision — capsule vs AABBs (no physics engine)**:

```js
// capsule: p (feet), r = 0.3, h = 1.75 (standing) / 1.1 (crouch)
function resolve(p, r, boxes) {
  for (const b of boxes) {           // Box3 in world space; broadphase: uniform grid 2 m cells
    // clamp capsule axis point to box, test against sphere at nearest axis point
    const cy = THREE.MathUtils.clamp(b.min.y + (b.max.y-b.min.y)*0.5, p.y + r, p.y + h - r);
    const q = new THREE.Vector3(p.x, cy, p.z);
    const c = q.clone().clamp(b.min, b.max);
    const d = q.sub(c); const dist = d.length();
    if (dist < r) { p.add(d.multiplyScalar((r - dist) / dist)); p.y = Math.max(p.y, 0); }
  }
}
```

Iterate twice for corner stability. Walls come from the plan as one box per wall segment *between openings* (so doorways are naturally open). Furniture boxes come from prop factories. Low props (< 0.45 m: rugs, buckets, water cases) are stepped over: skip a box if `b.max.y < p.y + 0.45`. Doors: their AABB rotates with the door — recompute from the door's world `Box3` via `setFromObject` when it moves (cheap; few doors move at once).

**Doors**: pivot group at the hinge; state `angle`, `targetAngle`, `latched`. Open/close on interact with a 0.6 s ease. **Wind rules**: for an exterior door, the pressure force ∝ `gust²·dot(windDir, doorOutwardNormal)`. If the door is inswing and the wind pushes inward at gust > 25 m/s **(default)**, unlatched → it slams open (angle to max in 0.15 s, shudder). Attempting to open an outswing door against wind > 20 m/s fails: play a strain animation (2° then back) and tooltip "The wind is holding it shut". Opening into the wind at > 30 m/s: it rips from the hand and bangs the wall. Garage door: a separate "oil-canning" vertex shader on the panels (`z += sin(uTime·3 + uv.y·6)·gust·0.002`) and a fail state.

**Head bob / crouch**: bob = `sin(walkPhase)·0.035` vertical, `cos(walkPhase/2)·0.02` lateral, phase advances at `speed·2.3`; crouch lerps eye height 1.65 → 1.0 in 0.25 s and shrinks the capsule. Sprint 4.5 m/s, walk 2.6 m/s, crouch 1.3 m/s **(default)**. Outdoors in high wind: add `wind.dir · gust · 0.02` m/s to velocity (lean), random lateral shoves of 0.3 m at gust peaks, camera roll ±2°; above 45 m/s the player cannot walk upwind (net negative) — matches "can't stand up in it".

**Interaction**: `Raycaster` from camera centre, `far = 2.2`, tested only against a flat list of interactable meshes (not the whole scene; set `raycaster.layers` to an "interact" layer). Highlight: swap emissive to a faint `0x333333` on the hovered mesh (or an outline via a slightly scaled back-faced clone — cheaper than `OutlinePass`). Tooltip: a DOM element positioned at screen centre with the verb ("Close shutter", "Fill bathtub", "Turn on NOAA radio"). Hold-to-interact for long tasks (progress ring in DOM).

---

## 10. Outdoor systems

### 10.1 Sky dome
A `SphereGeometry(300, 32, 16)` with `side: BackSide`, `depthWrite: false`, rendered first (`renderOrder = -10`) and following the camera position. `ShaderMaterial`:

- Base gradient: three colours (zenith, horizon, ground) mixed by `pow(max(dir.y,0), 0.5)`; colours come from a **lookup by time of day and storm state** computed on CPU each frame (sun elevation → warm horizon at dusk; `overcast` 0–1 → desaturate and darken toward `#5a6068` at zenith / `#8a8f93` horizon; `rainRate` → further darkening and green-grey tint under the core, `#4b5a5e`).
- Sun disc: `smoothstep` around `dot(dir, sunDir)`, plus a glow term; hidden by `overcast`.
- **Cloud layers**: 2–3 procedural layers in the same shader using 3D `fbm` on `dir.xz / dir.y` (planar projection at heights 1.5 km cirrus, 600 m stratus/altostratus, 250 m scud). Each layer scrolls with its own velocity: `uv += windUniform.xz · speedFactor · time`, with the scud layer moving fastest (≈ 2 × surface gust) and with high contrast, ragged edges (`smoothstep(0.45, 0.7, fbm)`). Use `ImprovedNoise`-style GLSL (hash-based value noise, 4 octaves) — avoid `texture`-based noise since we have no image; but do **precompute** a 256² tileable noise `CanvasTexture` (RGB = three independent noise fields) and sample it in the shader instead of computing hash noise per octave — 4 texture taps vs 4×~30 ALU is the difference between SwiftShader running at 8 fps and 20 fps.
- Lightning: `uFlash` (0–1) adds a bluish white to the whole dome with a `fbm` cloud-illumination term so the cloud bottoms light up, plus a bolt drawn as a `Line2`/thin `TubeGeometry` polyline (random-walk segments, emissive white, 120 ms life) only for close strikes.
- The dome also feeds `scene.fog` colour: `fog.color` = the horizon colour so the world blends into the sky.

Rejected: `Sky` from `three/addons/objects/Sky.js` (verified present: turbidity/rayleigh/sunPosition uniforms) — it is a clear-sky Preetham model, great for the pre-storm day but it cannot go overcast. Option: use `Sky` for the clear-day baseline and blend our storm dome over it with `overcast` alpha. Simpler to own the whole shader.

### 10.2 Fog and visibility
`scene.fog = new THREE.FogExp2(color, density)` with `density = 0.0025 + rainRate/2000 + spray` **(default; 0 mm/h ≈ 400 m visibility, 50 mm/h ≈ 35 m, 100+ mm/h in the eyewall ≈ 20 m)**. Spray term ∝ `gust³` near the coast/pond. Interior objects should not be fogged when the player is inside with shutters closed — set `material.fog = false` on interior materials (fog is a material flag, resolved at compile time; keep two material sets).

### 10.3 Rain
`InstancedMesh` of thin quads (`PlaneGeometry(0.01, 0.35)`), **10 000 instances** on GPU / 2 500 on SwiftShader **(default)**, in a box 30 × 20 × 30 m around the camera that wraps (positions recomputed in the vertex shader from a per-instance seed, so the CPU never touches matrices after creation):

```glsl
// vertex: aSeed (vec3 0..1), uniform uTime, uWind (vec4), uCam (vec3), uBox (vec3), uRate
vec3 fall = vec3(uWind.x, -9.0, uWind.z);           // terminal velocity ~9 m/s + wind
vec3 p = aSeed * uBox; p += fall * uTime;            // integrate
p = mod(p - uCam + 0.5*uBox, uBox) - 0.5*uBox + uCam; // wrap around camera
// billboard the streak along the fall direction, facing the camera:
vec3 dir = normalize(fall); vec3 toCam = normalize(uCam - p);
vec3 side = normalize(cross(dir, toCam));
vec3 pos = p + side * position.x + dir * position.y * (1.0 + length(uWind.xz)*0.05); // longer streaks in wind
```

Fragment: soft vertical gradient alpha 0.25, brighter when `dot(lightDir, toCam)` (backlit) — this is what makes rain visible in the flashlight beam: pass the flashlight position/direction as uniforms and add `spotFactor * 0.8` to alpha. Density: instances with `aSeed.x > uRate` are collapsed to zero size (drawn but invisible; avoids rebuilding). Heavier near the camera: `size *= 1.0 + 2.0*exp(-dist/4)`. Do **not** render rain inside the house: rain quads test `uRoofBox` (the house AABB) and collapse when inside it — good enough with a single AABB plus the lanai roof box.

Splashes: a second `InstancedMesh` of 400 small rings/crown quads on the ground plane at random positions in a 12 m radius, each animating a 0.25 s scale-up/fade cycle in the vertex shader from its seed; rate ∝ `rainRate`. Roof-edge sheets: emissive-less alpha `PlaneGeometry` "curtains" under the eaves with scrolling streak texture when `rainRate > 40`. Wind-driven rain streams off the eaves horizontally at high wind (rotate the curtain plane toward `wind.dir`).

### 10.4 Wind-driven vegetation
**Shared vertex-shader bend** injected through `onBeforeCompile` into `MeshStandardMaterial` (so lighting/shadows/fog keep working):

```glsl
// uniforms: uWind (xyz dir*gust, w time); attributes: aFlex (0 trunk base .. 1 tip), instanceMatrix
float g = length(uWind.xyz);
float phase = uWind.w * (1.5 + g*0.08) + dot(worldBase.xz, vec2(0.7, 1.3));
float sway = g * 0.012 * (1.0 + 0.5*sin(phase) + 0.25*sin(phase*2.7+1.0));
vec3 bend = uWind.xyz / max(g, 0.001) * sway * aFlex * aFlex;   // quadratic: tips move most
transformed += bend; transformed.y -= length(bend) * 0.35 * aFlex;  // preserve length roughly
```

Add to `transformed` **before** the `#include <project_vertex>` chunk by replacing `#include <begin_vertex>`. Because `uWind.w` is time, everything thrashes in sync with gusts from the storm model.

- **Sabal palm**: trunk `CylinderGeometry(0.25, 0.35, 5, 8)` with boot-jack texture; crown = 20–30 fronds, each a `PlaneGeometry(0.4, 1.6, 1, 6)` folded into a V (offset vertices in local x by `|u−0.5|·0.15`), attached at random spherical angles; frond texture = canvas with leaflet strokes and alpha. `aFlex` = distance along frond; sabal fronds **fold up** in wind — add `bend` a second term that rotates fronds toward the wind axis when `g > 20`.
- **Queen palm**: taller thinner trunk (0.2 r × 8 m), feathery fronds (`PlaneGeometry` 0.5 × 3, alpha texture of a central rachis with leaflets), very high `aFlex`; above 35 m/s fronds detach (instance → debris) and the crown thins.
- **Hedges/shrubs**: `IcosahedronGeometry(0.6, 1)` blobs with a leaf canvas; `aFlex` = normalised height; they flatten (bend saturates at 0.4 m).
- **Grass**: only near the camera, 3 000 instanced crossed quads in a 15 m radius, high `aFlex`; skip on SwiftShader.
- All vegetation is `InstancedMesh` (one draw call per species), `castShadow` true only for palms.

### 10.5 Debris
A CPU particle system of rigid "bodies" (no rotation physics, just kinematics), `InstancedMesh` per debris class: shingle tab (0.3 × 0.01 × 0.45), frond, screen panel (1.5 × 2 quad, flapping in vertex shader), trash can, sheet of aluminium, branch, roofing felt strip, a "Ring doorbell"-sized small object. Per body: `pos, vel, angVel, quat, mass, dragArea`. Each frame: `vel += (g + drag·(windVel − vel)·|windVel − vel|·A/m) · dt`; `windVel` = the surface wind at that height (log profile: `u(z) = u10 · ln(z/0.03)/ln(10/0.03)`) + local turbulence noise (`ImprovedNoise` sampled at `(pos·0.1, t·0.5)`). Ground contact at y = 0 (or roof plane): bounce with restitution 0.2 and friction; bodies at rest despawn after 60 s unless within 20 m of the player. Spawn rate ∝ `max(0, gust − threshold)` with class-specific thresholds: fronds 15 m/s, trash cans 22, screen panels 25, shingles 30, aluminium 38 **(default)**. Cap 300 live bodies GPU / 80 SwiftShader. Debris impacts on the house trigger audio and a decal (scuff) on the stucco.

**Pool cage failure**: the cage is 3 `InstancedMesh`es (extrusion beams, screen panels, door). Each panel has `bulge` in the vertex shader (`sin` dome ∝ `gust²·dot(wind, normal)`); each has a strength; when the pressure exceeds it (random 25–40 m/s), the panel converts into a debris "screen panel" body with a tear animation (`alphaTest` threshold animates up over 0.4 s using a noise texture so it shreds from a point). When > 60 % of the windward panels are gone and gust > 45 m/s, the beam structure "folds": a scripted 3-s keyframe of the cage group rotating about its leeward base line (the one place scripting is fine because structural collapse is not modelled), then beams become large debris that lands in the pool.

### 10.6 Lightning and transformer flashes
Lightning: covered in §7.1/§10.1. Transformer arc-flash (blue-green): a `PointLight` at the pole-mounted transformer (`color 0x6bffd0`, intensity 300, distance 120) pulsed 3–6 times over 0.5 s at random intervals, plus a `Sprite` bloom-disc (`CanvasTexture` radial gradient, `AdditiveBlending`) that scales with the pulse, plus a brief sky-dome `uFlash` tinted green. Power state machine listens for this to trigger the outage. Neighbourhood streetlights are emissive discs + `PointLight`s (only the nearest 3 lit — the rest emissive only); all switch off on outage.

### 10.7 Water: puddles, street flooding, pool
One **water plane shader** used for three instances (street/swale flood plane, yard puddle patches, pool):

- `PlaneGeometry(80, 60, 1, 1)` for the flood plane at `y = floodLevel` (from the storm model: rises from −0.1 (below ground = invisible) to +0.35 m in the swale/street; yard high spots stay dry because the terrain plane has 0.1–0.3 m of vertex-noise elevation and the water plane is flat — the intersection produces natural puddle outlines).
- Fragment: normal from two scrolling noise texture taps (the same tileable 256² noise; scroll direction = wind; amplitude ∝ `gust`), plus **rain ripples**: procedural expanding rings from a hash grid (`fract(uv·16)`, ring radius = `fract(t + hash)`), density ∝ `rainRate`. Colour: `mix(muddyBrown, envReflection(reflect(viewDir, n)), fresnel)`; muddy brown darkens over the storm (tannin). Reflections use `scene.environment` (the sky cube from §8.1) — no planar `Reflector` (it doubles the scene render).
- Pool: same shader, colour `#2a8fbf` pre-storm, transitioning to tea-brown; `Reflector` **not** used; wind-driven ripples elongated along wind; debris floats: bodies in the pool volume get `y = poolLevel` and drift with wind at 0.3 × speed.
- Water under doors / on tile: interior puddle decals — flat `CircleGeometry` decals with the water shader in "thin film" mode (high fresnel, tile colour showing through, `roughness 0.05`), scale animated from 0 → 1.5 m over 20 min at the slider track and front door threshold; a dripping ceiling spawns a growing puddle under it and a "drip" `InstancedMesh` of 1-quad drops falling from the ceiling point (timed to the plink sound).

### 10.8 Wet surfaces
`onBeforeCompile` on every exterior `MeshStandardMaterial` (and the interior floor): uniform `uWet` (0–1, ∝ accumulated rain, drying after the storm over ~6 h game time under sun). In the fragment shader after `roughnessmap_fragment`: `roughnessFactor = mix(roughnessFactor, roughnessFactor*0.25, uWet * (1.0 - smoothstep(0.6, 0.9, normalWorld.y < 0.0 ? 0.0 : 1.0 - normalWorld.y)))` (upward-facing surfaces get wet; walls less so) and darken `diffuseColor.rgb *= 1.0 - 0.35*uWet` (wet materials are darker). That is the entire wet look and it is dramatic.

### 10.9 Terrain and neighbourhood
Ground: one `PlaneGeometry(260, 200, 130, 100)` with vertex-noise elevation (±0.25 m), a swale profile carved along the street lines (−0.35 m), and a retention pond depression behind the back lots (−1.5 m). Vertex colours choose lawn/dirt; the street and driveways are separate flat meshes 2 cm above (`polygonOffset` to avoid z-fighting). Sidewalk slabs, curbs (`BoxGeometry` runs). Neighbour houses: 2 plan variants (mirrored → 4 looks), 3 stucco colours, 2 roof colours; instanced accessories. Beyond 120 m: flat low boxes with a roof colour — behind the fog they read as houses.

---

## 11. Performance budget and SwiftShader

Targets **(default)**: ≤ 250 draw calls, ≤ 600 k triangles in view, ≤ 12 lights compiled in, ≤ 2 shadow-casting lights (sun + flashlight, never both: sun shadow off at night), texture memory ≤ 60 MB, 60 fps on Intel Iris Xe at 1080p × 1.0 DPR.

| Technique | Where |
|---|---|
| `InstancedMesh` | rain, splashes, debris, palms, hedges, grass, shingles, screen panels, streetlights, pavers, bottles, chairs |
| `BatchedMesh` (r170 has it) | consider for neighbour houses: one draw call for all house variants with per-instance geometry IDs; frustum-culls per instance internally. Nice-to-have; merged meshes are fine. |
| Merged static geometry | all house structure, per material |
| Frustum culling | on by default; keep `boundingSphere` accurate; the interior merged meshes should be per-room (not whole-house) so rooms behind you cull |
| Shadow budget | sun 2048² fitted to house+lanai only; flashlight 512²; `shadow.autoUpdate = false` on the sun with manual `needsUpdate = true` every 3rd frame when nothing moves (palms do move — update every frame outdoors, every 3rd indoors) |
| Material count | ≤ 40 unique programs; use `material.defines` sparingly; every new combination of lights/fog/shadow toggles causes a shader recompile → **pre-warm** by calling `renderer.compile(scene, camera)` at startup with power-on and power-off states both represented (toggle intensities, not presence) |
| Per-frame CPU | plan for ≤ 4 ms JS: debris (300 bodies), collision (≤ 60 boxes after grid broadphase), audio, storm model (cheap), DOM HUD updates throttled to 4 Hz |
| Sleep/fast-forward | when time speed > 20×, drop particle systems to 25 % and skip debris spawns, render at 30 fps |

**SwiftShader (headless Chromium, `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`)** — everything runs on CPU, expect **2–10 fps at 1280×720**; screenshots are still fine. Detect it via `renderer.getContext().getExtension('WEBGL_debug_renderer_info')` → `UNMASKED_RENDERER_WEBGL` contains "SwiftShader" (or `navigator.gpu` absent + `?quality=low` URL flag, which is the more robust approach for the screenshot script — pass `?quality=low&t=eyewall&seed=7`). What breaks or crawls:

- Fragment-shader cost is the bottleneck: full-screen passes (bloom, SSAO, GTAO, SSR, FXAA) can each cost 100+ ms. **Disable all post under SwiftShader**; render directly to canvas. Keep `antialias: true` (MSAA 4× is cheap-ish in SwiftShader; can disable if needed).
- Huge loops in shaders (8-octave fbm per pixel of sky) → reduce to 3 octaves + noise-texture taps; the sky dome covers the whole screen.
- `transmission`, `Reflector`, `CubeCamera` every frame — off (CubeCamera every 2 s is acceptable).
- Precision: SwiftShader is IEEE-correct, so no precision surprises; but `derivatives` (`dFdx`) and `textureGrad` are slower — avoid in the rain shader.
- Shadow maps: PCFSoft samples 9× — use `PCFShadowMap` or `BasicShadowMap` and 1024².
- Anisotropy > 4 slows sampling; mipmaps are fine.
- Instance counts: rain 2 500, debris 80, grass 0, splashes 150.
- Time: the screenshot script must drive the sim by a fixed `dt` (not wall clock) and call `renderer.render` on demand after warm-up, waiting for `renderer.compile` to finish; `requestAnimationFrame` under headless runs but at whatever rate SwiftShader manages — pass `--disable-frame-rate-limit`/`--disable-gpu-vsync` and set `timer.setTimescale` or a manual `advance(seconds)` API exposed on `window.__sim` for deterministic frames.
- The deprecation note in Chromium docs (SwiftShader **fallback** deprecated in Chrome 130+) matters: explicitly opt in with `--enable-unsafe-swiftshader`; do not rely on the automatic fallback. Playwright's bundled Chromium (project pins `playwright-core 1.49.1`) supports these flags.

---

## 12. Post-processing (optional, GPU only)

`EffectComposer` → `RenderPass` → `UnrealBloomPass(res/2, strength 0.25, radius 0.4, threshold 0.9)` → custom `ShaderPass` (vignette 0.25, screen-wetness, grain 0.02) → `OutputPass` (**required in r170**: when using the composer, the tone mapping and sRGB conversion move from the renderer's final step into `OutputPass`; without it the image is dark and linear). Bloom at half res costs ~1 ms on Iris Xe; it is what makes the transformer flash and lightning bloom. Screen wetness in the final pass: when the player is outdoors and `rainRate > 0`, a few animated droplet distortions (same droplet cell math as §8.2 in screen UV, refracting the frame) fading over 4 s after stepping inside; keep it subtle (max 20 droplets) — over-done screen droplets are the most common "game-y" tell. Fallback path (SwiftShader or `?quality=low`): no composer, vignette as a DOM overlay `radial-gradient` (free).

---

## 13. Three.js r170 pitfalls checklist

1. **Import paths**: `three/addons/...`, not `three/examples/jsm/...`; `Timer` is at `three/addons/misc/Timer.js`; `PointerLockControls.getObject()` deprecated → `controls.object`. `RectAreaLightUniformsLib.init()` must run before the first render or rect lights render black.
2. **Colour spaces**: tag every colour canvas `SRGBColorSpace`; data textures `NoColorSpace`. A `CanvasTexture` updated at runtime (TV, phone) needs `texture.needsUpdate = true` each redraw; keep those small (512 × 288).
3. **Physically-correct lights are mandatory** (`useLegacyLights` was removed in r165): point/spot intensity is in candela-ish units with `decay 2`, so numbers like 5–50 are normal; a `PointLight` with intensity 1 is nearly invisible.
4. **Tone mapping does not apply to `ShaderMaterial`** unless you include `#include <tonemapping_fragment>` and `#include <colorspace_fragment>` at the end of the fragment shader (and set `material.toneMapped = true`). Sky dome, rain, water shaders must include them or they will look flat/wrong next to standard materials.
5. **`onBeforeCompile` + `customProgramCacheKey`**: when you inject different code per material variant, return a distinct `customProgramCacheKey()` string or three.js will reuse the wrong program (verified in `Material.js` that the default key is `onBeforeCompile.toString()` — two closures with identical source but different captured uniforms share a program, which is actually what we want for the wind bend: share the program, keep uniforms per material via `shader.uniforms.uWind = wind.uniform` referencing the same object).
6. **Fog on ShaderMaterial** requires `fog: true` and the fog chunks (`fog_pars_fragment`, `fog_fragment`) and `fog_vertex`.
7. **Shadow acne vs peter-panning**: use `normalBias` (0.02–0.05) rather than large `bias`; thin walls (0.115 m) will leak shadows through with big biases.
8. **`InstancedMesh` frustum culling** uses the *base* geometry's bounding sphere — call `instancedMesh.computeBoundingSphere()` after setting matrices, or set `frustumCulled = false` for the rain/debris systems whose positions are computed in the shader.
9. **`ExtrudeGeometry` with holes**: hole winding must be opposite to the outer shape; degenerate holes touching the outer edge (a door hole that exactly reaches y = 0) produce bad triangulation — extend the hole 1 cm past the edge as in the snippet.
10. **Transparent sorting**: glass, screens, rain, water are all transparent; set explicit `renderOrder` (screens 1, glass 2, water 3, rain 5, sprites 6) and `depthWrite: false` for rain/splashes; `alphaTest` (not blending) for screen mesh and fronds so they write depth and sort correctly.
11. **`MeshPhysicalMaterial.transmission`** triggers an extra scene render pass whenever any such material is in the scene — avoid entirely.
12. **AgX/Neutral tone mapping plus a very bright emissive TV** can push to white; keep `emissiveIntensity` ≤ 2 for screens.
13. **Vite**: three is ESM; Vite pre-bundles it fine, but the addons barrel `three/addons` (the `Addons.js` file) pulls in *everything* — import specific files. For the headless screenshot run use `vite preview` of a production build (dev server's per-module requests are slow to first frame under Playwright).
14. **Pointer lock in headless**: `requestPointerLock` rejects in headless Chromium; the screenshot harness must bypass the lock overlay and drive the camera via `window.__sim.setCamera(pos, yaw, pitch)`.
15. **`devicePixelRatio` changes & `resize`**: update `camera.aspect`, `renderer.setSize`, composer size, and any `resolution` uniforms (rain streak width in pixels).
16. **Deterministic randomness**: seed everything (`mulberry32(seed)`) — textures, prop jitter, debris — so screenshots are reproducible and bug reports can quote a seed.
17. **Memory**: dispose canvases after upload if memory is tight (`texture.image = null` is not safe; just let them be GC'd once no longer referenced — do not keep them in a global array).

---

## 14. Key numeric defaults (summary)

| Parameter | Default |
|---|---|
| Scene units | metres; eye 1.65 m; crouch 1.0 m; capsule r 0.3 m |
| Move speeds | walk 2.6, sprint 4.5, crouch 1.3 m/s |
| House | 19.8 × 14.0 m slab incl. garage; ceiling 2.85 m; ext wall 0.25, int 0.115; roof 4:12, 0.6 m eave |
| Lot / street | 24 × 38 m lot; 7.3 m street; 1.5 m swales; house setback 7.6 m |
| Camera | 70° FOV, near 0.05, far 400 |
| Tone mapping | AgX, exposure 0.6 (storm outdoors) … 12 (candle-lit interior) |
| Lights | hemisphere 0.35, ambient 0.12, sun 3.0 → 0.15, room point 6 cd, flashlight spot 40 cd / 0.35 rad, candle 0.8 ± 0.25 |
| Shadows | sun 2048² (1024 SW), flashlight 512²; normalBias 0.02 |
| Fog | FogExp2 density 0.0025 + rainRate/2000 |
| Rain | 10 000 instances (2 500 SW); box 30 × 20 × 30 m; fall 9 m/s + wind; splashes 400 (150 SW) |
| Debris | cap 300 (80 SW); spawn thresholds fronds 15, cans 22, screens 25, shingles 30, aluminium 38 m/s |
| Door wind rules | slam open > 25 m/s gust inswing; cannot open against > 20 m/s; rips from hand > 30 m/s; cannot walk upwind > 45 m/s |
| Pool cage | panel strength 25–40 m/s; structural fold when > 60 % windward panels gone and gust > 45 m/s |
| Flood | plane rises −0.1 → +0.35 m; terrain noise ±0.25 m, swale −0.35 m, pond −1.5 m |
| Textures | 512² default, 1024² floor/shingles, 256² noise; anisotropy 8 (4 SW) |
| Budgets | ≤ 250 draw calls, ≤ 600 k tris, ≤ 12 lights, ≤ 2 shadow casters, ≤ 40 programs |
| Post | bloom 0.25 / 0.4 / 0.9 at half res + vignette 0.25 (GPU only); DOM vignette fallback |
| Env map | 64² cube from sky every 2 s |

Web sources consulted: [three.js r170 release](https://github.com/mrdoob/three.js/releases/tag/r170), [three.js Migration Guide](https://github.com/mrdoob/three.js/wiki/Migration-Guide), [PointerLockControls docs](https://threejs.org/docs/pages/PointerLockControls.html), [Chromium: Using Chromium with SwiftShader](https://chromium.googlesource.com/chromium/src/+/main/docs/gpu/swiftshader.md), [Intent to Remove: SwiftShader fallback](https://groups.google.com/a/chromium.org/g/blink-dev/c/yhFguWS_3pM).
