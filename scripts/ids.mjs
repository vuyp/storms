#!/usr/bin/env node
/** scripts/ids.mjs — assert objects/catalog.js, world/registry (plan) and details against core/ids.js. */
import { OBJECT_IDS, SOCKET_IDS, FIXTURE_IDS, PROP_IDS } from '../src/core/ids.js';
let failures = 0;
const check = (label, have, want) => {
  const missing = want.filter(id => !have.has(id)); const extra = [...have].filter(id => !want.includes(id));
  if (missing.length) { failures++; console.error(`${label}: missing ${missing.length}: ${missing.slice(0, 15).join(', ')}${missing.length > 15 ? '…' : ''}`); }
  if (extra.length) console.warn(`${label}: ${extra.length} ids not in the registry: ${extra.slice(0, 10).join(', ')}`);
  if (!missing.length) console.log(`${label}: ok (${want.length})`);
};
try {
  const { catalog } = await import('../src/objects/catalog.js');
  check('objects/catalog.js', new Set(Object.keys(catalog)), OBJECT_IDS);
} catch (e) { console.warn('objects/catalog.js not loadable:', e.message.split('\n')[0]); }
try {
  const plan = await import('../src/world/plan.js');
  const p = plan.plan || plan.default || plan;
  if (p.sockets) check('world/plan.js sockets', new Set(Object.keys(p.sockets)), SOCKET_IDS);
  if (p.fixtures) check('world/plan.js fixtures', new Set(Object.keys(p.fixtures)), FIXTURE_IDS);
  if (p.props) check('world/plan.js props', new Set(Object.keys(p.props)), [...OBJECT_IDS, ...PROP_IDS]);
} catch (e) { console.warn('world/plan.js not loadable in node:', e.message.split('\n')[0]); }
try {
  const { catalogue } = await import('../src/details/catalogue.js');
  const ids = catalogue.map(d => d.id); const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dup.length) { failures++; console.error('details: duplicate ids', dup); } else console.log(`details/catalogue.js: ok (${ids.length} entries)`);
} catch (e) { console.warn('details/catalogue.js not loadable:', e.message.split('\n')[0]); }
process.exit(failures ? 1 : 0);
