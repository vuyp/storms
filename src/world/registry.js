/**
 * world/registry.js — assembles the registry of ARCHITECTURE §6.6 from the builders' outputs and asserts it
 * against core/ids.js (every object/prop id has a Group, every socket/fixture/opening/door/leak point is
 * present). Owner: E4 world+textures. Writes no state.
 */
import * as THREE from 'three';
import { OBJECT_IDS, PROP_IDS, SOCKET_IDS, FIXTURE_IDS, OPENING_IDS, DOOR_IDS, LEAK_POINT_IDS, INTERIOR_ROOM_IDS, TREE_IDS, TRANSFORMER_IDS } from '../core/ids.js';
import { rooms, fixtures, sockets, leakPoints, openings as planOpenings, roomCentre, siteHeightAt, adjacency, lots } from './plan.js';

const WINDOW_KINDS = new Set(['window', 'peep', 'slider', 'screen', 'garage', 'door']);

/**
 * @param {object} parts everything the builders produced (see index.js)
 * @returns {object} the registry
 */
export function assembleRegistry(parts) {
  const { colliders, colliderMeta, grid, openings, doors, props, cage, terrain, veg, hood, roof, roomGroups, exteriorMeshes, mats, screens, instanced, glowMeshes, propParts, stats, pool } = parts;

  const roomsOut = {};
  for (const [id, r] of Object.entries(rooms)) {
    roomsOut[id] = {
      id, polygon: r.polygon.map(p => [...p]), rects: r.rects.map(p => [...p]), floorY: r.floorY, ceilingY: r.ceilingY, trayY: r.trayY ?? null,
      floor: r.floor, ceiling: r.ceiling, paint: r.paint, exterior: !!r.exterior,
      fixtureIds: Object.values(fixtures).filter(f => f.room === id).map(f => f.id),
      windowIds: Object.values(planOpenings).filter(o => o.room === id && WINDOW_KINDS.has(o.kind)).map(o => o.id),
      centre: roomCentre(id),
      group: roomGroups[id] || null,
      adjacent: (adjacency[id] || []).map(a => ({ ...a })),
    };
  }
  const fixturesOut = {};
  for (const [id, f] of Object.entries(fixtures)) fixturesOut[id] = { ...f, pos: [...f.pos], mesh: glowMeshes[id] instanceof THREE.Object3D ? glowMeshes[id] : null, link: glowMeshes[id] && !(glowMeshes[id] instanceof THREE.Object3D) ? glowMeshes[id] : null };
  const socketsOut = {};
  for (const [id, s] of Object.entries(sockets)) socketsOut[id] = { ...s, pos: [...s.pos], slots: s.slots ? s.slots.map(x => [...x]) : null, position: new THREE.Vector3(...s.pos) };
  const leaksOut = {}, anchors = {};
  for (const [id, lp] of Object.entries(leakPoints)) {
    leaksOut[id] = { ...lp, pos: [...lp.pos], position: new THREE.Vector3(...lp.pos) };
    anchors[id] = { room: lp.room, ceiling: new THREE.Vector3(...lp.ceiling), floor: new THREE.Vector3(...lp.floor), bucket: new THREE.Vector3(...lp.bucket), normal: new THREE.Vector3(...lp.normal), kind: lp.kind };
  }
  const openingsOut = {};
  for (const id of OPENING_IDS) {
    const b = openings[id] || {};
    const p = planOpenings[id];
    openingsOut[id] = {
      id, kind: p.kind, room: p.room, wall: p.wall, facadeDeg: p.facadeDeg, centre: [...p.centre], normal: [...p.normal], w: p.w, h: p.h, sill: p.sill, head: p.head, panels: p.panels || 0,
      frame: b.frame || null, glass: b.glass || null, shutter: b.shutter || null, door: b.door || null, tracks: b.tracks || [], facetSlots: b.facetSlots || null, unit: b.unit || p.unit || null,
    };
  }
  const registry = {
    rooms: roomsOut,
    fixtures: fixturesOut,
    colliders, colliderMeta, grid,
    openings: openingsOut,
    doors,
    props,
    sockets: socketsOut,
    leakPoints: leaksOut,
    leakDecalAnchors: anchors,
    mast: props.mast || null,
    transformerPoles: hood.transformerPoles,
    streetlights: hood.streetlights,
    pond: { water: terrain.pond.water, bankY: terrain.pond.bankY, waterY: terrain.pond.waterY, fountain: props.pondFountain || null, maxRise: terrain.pond.water.userData.maxRise },
    pool: { group: pool.group, water: pool.water, shell: pool.shell, light: pool.light, box: pool.box, waterY: pool.water.userData.baseY },
    cage: { group: cage.group, beams: cage.beams, panels: cage.panels, panelIds: cage.panelIds, door: doors.door_cage_screen || null },
    garageDoorMesh: openings.door_garage_roll?.garageDoorMesh || parts.garageDoorMesh || null,
    sliders: parts.sliders,
    vegetation: { byKind: veg.byKind, instances: veg.instances, proxies: veg.proxies, meshes: veg.meshes },
    terrain: { group: terrain.group, ground: terrain.ground, street: terrain.street, concrete: terrain.concrete, heightAt: terrain.heightAt, isPaved: terrain.isPaved, meshes: terrain.meshes },
    flood: terrain.flood,
    materials: Object.fromEntries(mats.all),
    uniforms: mats.uniforms,
    // extras (documented in docs/integration-notes/world.md)
    roomCentre: (id) => roomCentre(id),
    groundHeightAt: (x, z) => siteHeightAt(x, z),
    screens, instanced, glowMeshes, parts: propParts,
    roof: { slopes: roof.slopes, tabs: roof.tabs, ridgeY: roof.ridgeY },
    roomGroups, exteriorMeshes,
    neighbourhood: { group: hood.group, lotShutters: hood.lotShutters, wires: hood.wires, lod: hood.lodSkirt, nguyen: hood.nguyen, lots: hood.lots, roofSlopes: hood.roofSlopes, padMount: hood.padMount },
    lots: Object.fromEntries(lots.map(l => [l.id, { ...l, origin: [...l.origin] }])),
    stats,
  };
  return registry;
}

/** Assert the registry against the ID registry; returns a list of problems (empty when green). */
export function checkRegistry(registry) {
  const problems = [];
  for (const id of [...OBJECT_IDS, ...PROP_IDS]) { const g = registry.props[id]; if (!g) problems.push(`props: missing ${id}`); else if (!g.userData || !g.userData.poses) problems.push(`props: ${id} has no poses`); }
  for (const id of SOCKET_IDS) if (!registry.sockets[id]) problems.push(`sockets: missing ${id}`);
  for (const id of FIXTURE_IDS) if (!registry.fixtures[id]) problems.push(`fixtures: missing ${id}`);
  for (const id of OPENING_IDS) if (!registry.openings[id]) problems.push(`openings: missing ${id}`);
  for (const id of DOOR_IDS) if (!registry.doors[id]) problems.push(`doors: missing ${id}`);
  for (const id of LEAK_POINT_IDS) if (!registry.leakPoints[id]) problems.push(`leakPoints: missing ${id}`);
  for (const id of INTERIOR_ROOM_IDS) if (!registry.rooms[id]) problems.push(`rooms: missing ${id}`);
  for (const id of TREE_IDS) if (!registry.vegetation.instances[id]) problems.push(`vegetation: missing ${id}`);
  for (const id of TRANSFORMER_IDS) if (!registry.transformerPoles[id]) problems.push(`transformerPoles: missing ${id}`);
  if (!registry.cage.beams || !registry.cage.panels) problems.push('cage: beams/panels missing');
  if (!registry.garageDoorMesh) problems.push('garageDoorMesh missing');
  if (!registry.flood) problems.push('flood missing');
  return problems;
}
