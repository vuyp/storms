#!/usr/bin/env node
/** scripts/lint-random.mjs — Math.random is banned in src/ (ARCHITECTURE §11). */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const bad = [];
function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(js|mjs)$/.test(f)) {
      const src = readFileSync(p, 'utf8').split('\n');
      src.forEach((line, i) => { if (/Math\.random\s*\(/.test(line) && !/lint-random:allow/.test(line)) bad.push(`${p}:${i + 1}: ${line.trim()}`); });
    }
  }
}
walk(ROOT);
if (bad.length) { console.error('Math.random() is banned in src/ (use ctx.rng.fork(name) or hash01):\n' + bad.join('\n')); process.exit(1); }
console.log('lint-random: ok');
