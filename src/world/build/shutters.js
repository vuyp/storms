/**
 * world/build/shutters.js — aluminium panel shutters and the accordion (DESIGN §3.4, §6.1 task 1, §10.2;
 * T §8.4). Owner: E4 world+textures. Writes no state.
 *
 * Every panel-shuttered opening gets H/F tracks on the stucco and a `shutter` Group whose `userData.slots[i]`
 * is the placed pose of its i-th panel; the 19 panel objects are corrugated planes with their Sharpie label from
 * the atlas, homed in the garage rack, with `userData.poses.rack` and `userData.poses.placed`. The great-room
 * slider carries the accordion: two leaves of 12 chained blades, `shutter.userData.setProgress(t)` folds them.
 */
import * as THREE from 'three';
import { boxAt, box, place, rgb, merge, staticMesh, Collector, ensureAttrs } from './geo.js';
import { openings, sockets, DIM } from '../plan.js';
import { PANEL_TO_OPENING, PANEL_IDS, SOCKETS } from '../../core/ids.js';
import { result as texResult } from '../../textures/index.js';

const H = Math.PI / 2;
const ALU = [0.9, 0.9, 0.88];

/** A corrugated panel of size pw × ph with UVs into the atlas cell [u0,v0,u1,v1]; centred, normal +z. */
export function panelGeometry(pw, ph, cell) {
  const nx = 40;
  const g = new THREE.PlaneGeometry(pw, ph, nx, 1);
  const pos = g.attributes.position, uv = g.attributes.uv;
  const period = 0.083;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    pos.setZ(i, 0.011 * Math.cos((x / period) * Math.PI * 2));
    const u = uv.getX(i), v = uv.getY(i);
    uv.setXY(i, cell[0] + (cell[2] - cell[0]) * u, cell[1] + (cell[3] - cell[1]) * v);
  }
  g.computeVertexNormals();
  return ensureAttrs(g, { color: [1, 1, 1] });
}

/**
 * @param {object} ctx { mats, exteriorCollector, openingsBuilt, layout }
 * @returns {{panels:Object<string,THREE.Group>, accordion:THREE.Group}}
 */
export function buildShutters(ctx) {
  const { mats, exteriorCollector, openingsBuilt, layout } = ctx;
  const alu = rgb(ALU);
  const atlas = texResult('panelAtlas');
  const panels = {};
  const perOpening = {};
  for (const pid of PANEL_IDS) { const oid = PANEL_TO_OPENING[pid]; (perOpening[oid] = perOpening[oid] || []).push(pid); }

  for (const [oid, pids] of Object.entries(perOpening)) {
    const op = openings[oid];
    const built = openingsBuilt.openings[oid];
    const n = pids.length;
    const ph = op.h + 0.30;
    const shutter = new THREE.Group(); shutter.name = `shutter:${oid}`;
    const slots = [];
    const sock = sockets[`sock_panel_${oid}`];
    if (op.bay && built?.facetSlots) {
      // one panel per facet, in its own plane
      for (let i = 0; i < 3; i++) {
        const f = built.facetSlots[i];
        const pw = f.width + 0.1;
        const pos = new THREE.Vector3(f.centre[0] + f.normal[0] * 0.07, f.centre[1], f.centre[2] + f.normal[2] * 0.07);
        slots.push({ position: pos, rotation: new THREE.Euler(0, f.yaw, 0), pw, ph });
        // tracks per facet
        const yaw = f.yaw;
        for (const y of [op.sill - 0.12, op.head + 0.12]) {
          const tr = box(pw + 0.06, 0.045, 0.035, { color: alu });
          place(tr, f.centre[0] + f.normal[0] * 0.04, y, f.centre[2] + f.normal[2] * 0.04, yaw);
          exteriorCollector.add('alu', tr);
        }
      }
      shutter.position.set(built.frame.position.x, built.frame.position.y, built.frame.position.z);
    } else {
      const nrm = op.normal;
      const yaw = Math.atan2(nrm[0], nrm[2]);
      const along = op.plane.axis === 'z' ? [1, 0, 0] : [0, 0, 1];
      const span = op.w + 0.24;
      const pw = n === 1 ? span : span / n + 0.03;
      const step = n === 1 ? 0 : (span - pw) / (n - 1);
      const startU = -span / 2 + pw / 2;
      const cx = op.centre[0] + nrm[0] * (op.plane.t / 2 + 0.07), cz = op.centre[2] + nrm[2] * (op.plane.t / 2 + 0.07);
      const cy = (op.sill + op.head) / 2;
      for (let i = 0; i < n; i++) {
        const u = startU + i * step;
        const pos = new THREE.Vector3(cx + along[0] * u, cy, cz + along[2] * u);
        slots.push({ position: pos, rotation: new THREE.Euler(0, yaw, 0), pw, ph });
      }
      // H-track (top) and F-track (bottom) channels on the stucco, and the mounting studs
      const trackW = span + 0.1;
      for (const [y, tall] of [[op.sill - 0.13, 0.045], [op.head + 0.13, 0.06]]) {
        const tr = box(trackW, tall, 0.035, { color: alu });
        place(tr, op.centre[0] + nrm[0] * (op.plane.t / 2 + 0.03), y, op.centre[2] + nrm[2] * (op.plane.t / 2 + 0.03), yaw);
        exteriorCollector.add('alu', tr);
      }
      for (let k = 0; k < Math.max(2, Math.round(trackW / 0.3)); k++) {
        const u = -trackW / 2 + 0.08 + k * ((trackW - 0.16) / Math.max(1, Math.round(trackW / 0.3) - 1));
        for (const y of [op.sill - 0.13, op.head + 0.13]) {
          const stud = box(0.016, 0.016, 0.06, { color: rgb([0.6, 0.6, 0.62]) });
          place(stud, cx + along[0] * u - nrm[0] * 0.02, y, cz + along[2] * u - nrm[2] * 0.02, yaw);
          exteriorCollector.add('alu', stud);
        }
      }
      shutter.position.set(cx, cy, cz); shutter.rotation.y = yaw;
    }
    shutter.userData = { openingId: oid, panelIds: pids, slots, socket: sock?.id || null };
    if (built) built.shutter = shutter;

    // the panel objects
    pids.forEach((pid, i) => {
      const slot = slots[Math.min(i, slots.length - 1)];
      const cell = atlas.cells[pid];
      const g = panelGeometry(slot.pw, ph, cell);
      const mesh = new THREE.Mesh(g, mats.get('shutterAl'));
      mesh.name = `${pid}:panel`; mesh.castShadow = true; mesh.receiveShadow = true;
      const grp = new THREE.Group(); grp.name = pid; grp.add(mesh);
      const lay = layout[pid];
      const rack = lay.poses.rack;
      const tilt = rack.r[0];
      // the panel stands on the floor leaning back: centre = base + (ph/2)·(0, cos, −sin) rotated about x
      const rackP = [rack.p[0], rack.p[1] + Math.cos(tilt) * ph / 2, rack.p[2] - Math.sin(tilt) * ph / 2 * -1];
      grp.userData = {
        objectId: pid, kind: 'panel', opening: oid, label: lay.label, width: slot.pw, height: ph, slotIndex: i,
        poses: {
          home: { p: rackP, r: [tilt, 0, 0] }, rack: { p: rackP, r: [tilt, 0, 0] },
          placed: { p: [slot.position.x, slot.position.y, slot.position.z], r: [0, slot.rotation.y, 0] },
        },
        pose: 'rack',
      };
      grp.position.set(rackP[0], rackP[1], rackP[2]); grp.rotation.set(tilt, 0, 0);
      panels[pid] = grp;
    });
  }

  // the accordion on the great-room slider (two leaves × 12 blades)
  const accordion = buildAccordion(ctx);
  if (openingsBuilt.openings.slider_great_W) openingsBuilt.openings.slider_great_W.shutter = accordion;
  return { panels, accordion };
}

function buildAccordion({ mats, exteriorCollector }) {
  const op = openings.slider_great_W;
  const alu = rgb([0.93, 0.93, 0.9]);
  const nB = 12, bw = 0.14, bh = op.h + 0.24;
  const xOut = op.plane.exteriorFace - 0.12; // 12 cm off the stucco on the west wall
  const z0 = op.from - 0.06, z1 = op.to + 0.06;
  const yc = op.sill + op.h / 2;
  // tracks: head and sill channels, and the two stack housings at the jambs
  exteriorCollector.add('alu', boxAt(xOut - 0.06, op.head + 0.1, z0 - 0.2, xOut + 0.06, op.head + 0.17, z1 + 0.2, { color: alu }));
  exteriorCollector.add('alu', boxAt(xOut - 0.06, DIM.lanaiY, z0 - 0.2, xOut + 0.06, DIM.lanaiY + 0.05, z1 + 0.2, { color: alu }));
  exteriorCollector.add('alu', boxAt(xOut - 0.1, DIM.lanaiY, z0 - 0.2, xOut + 0.1, op.head + 0.1, z0 - 0.02, { color: alu }));
  exteriorCollector.add('alu', boxAt(xOut - 0.1, DIM.lanaiY, z1 + 0.02, xOut + 0.1, op.head + 0.1, z1 + 0.2, { color: alu }));
  const group = new THREE.Group(); group.name = 'shutter:slider_great_W';
  group.position.set(xOut, op.sill + 0.0, (z0 + z1) / 2);
  const leaves = [];
  const bladeGeom = box(bw, bh, 0.004, { color: [1, 1, 1] });
  bladeGeom.translate(bw / 2, bh / 2, 0);
  const uv = bladeGeom.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2.2, uv.getY(i));
  const mat = mats.get('corrugated');
  for (const [sign, zStart] of [[1, z0 - (z0 + z1) / 2], [-1, z1 - (z0 + z1) / 2]]) {
    const leaf = new THREE.Group(); leaf.name = `accordionLeaf:${sign > 0 ? 'L' : 'R'}`;
    leaf.position.set(0, 0, zStart);
    // local +x runs along the opening from the jamb: +z world for the left leaf, −z for the right
    leaf.rotation.y = sign > 0 ? -H : H;
    const blades = [];
    let parent = leaf;
    for (let i = 0; i < nB; i++) {
      const b = new THREE.Group(); b.name = `blade${i}`;
      const m = new THREE.Mesh(bladeGeom, mat); m.castShadow = true;
      b.add(m);
      b.position.set(i === 0 ? 0 : bw, 0, 0);
      parent.add(b); blades.push(b); parent = b;
    }
    leaf.userData = { blades, sign };
    group.add(leaf); leaves.push(leaf);
  }
  const setProgress = (t) => {
    t = Math.max(0, Math.min(1, t));
    const theta = (88 - 53 * t) * Math.PI / 180; // 88° stacked … 35° pleats when closed
    for (const leaf of leaves) {
      const bl = leaf.userData.blades;
      for (let i = 0; i < bl.length; i++) bl[i].rotation.y = (i === 0 ? -theta : (i % 2 ? 2 * theta : -2 * theta));
    }
    group.userData.progress = t;
  };
  group.userData = { openingId: 'slider_great_W', kind: 'accordion', leaves, setProgress, progress: 0, objectId: 'accordion_great', poses: { home: { p: [xOut, op.sill, (z0 + z1) / 2], r: [0, 0, 0] } }, pose: 'home' };
  setProgress(0);
  return group;
}
