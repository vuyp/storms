#!/usr/bin/env node
/**
 * scripts/screenshots.mjs — the headless harness (ARCHITECTURE §12).
 * Starts a Vite dev server (or uses --url), drives headless Chromium (SwiftShader) through window.__sim,
 * writes test/screenshots/<id>.png and <id>.state.json, and prints console errors.
 *
 *   node scripts/screenshots.mjs                      # every scenario in scripts/scenarios.json
 *   node scripts/screenshots.mjs --only eye-sky,flood # a subset
 *   node scripts/screenshots.mjs --custom "t=-1.25&pos=driveway&yaw=90" --out shots/x.png   # ad hoc
 *   node scripts/screenshots.mjs --url http://127.0.0.1:5173 ...   # reuse a running dev server
 * Options: --out <dir|file>  --width 1280 --height 720 --warm 10 --timeout 240000 --list --keep-server --headed
 */
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? (args[i + 1] ?? true) : d; };
const has = (k) => args.includes(`--${k}`);

const CHROME = process.env.CHROME_PATH || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux/chrome'].find(p => existsSync(p));
const WIDTH = Number(opt('width', 1280)), HEIGHT = Number(opt('height', 720));
const WARM = Number(opt('warm', 10));
const TIMEOUT = Number(opt('timeout', 240000));

export async function startServer(port = 0) {
  const { createServer } = await import('vite');
  const server = await createServer({ root: ROOT, logLevel: 'silent', server: { host: '127.0.0.1', port: port || 5199, strictPort: false, hmr: false } });
  await server.listen();
  const addr = server.httpServer.address();
  return { server, url: `http://127.0.0.1:${addr.port}` };
}

export async function launchBrowser({ headed = false } = {}) {
  return chromium.launch({
    executablePath: CHROME, headless: !headed,
    args: ['--headless=new', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--disable-frame-rate-limit',
      '--autoplay-policy=no-user-gesture-required', '--no-sandbox', '--disable-dev-shm-usage', '--mute-audio'],
  });
}

/** Run one scenario on a page. Returns {errors, logs, state, ms}. */
export async function runScenario(page, baseUrl, sc, outPng, outState) {
  const logs = [], errors = [];
  page.removeAllListeners('console'); page.removeAllListeners('pageerror');
  page.on('console', (m) => { const t = m.type(); const txt = m.text(); if (t === 'error' || t === 'warning') logs.push(`[${t}] ${txt}`); else if (t === 'log' && txt.startsWith('[')) logs.push(txt); });
  page.on('pageerror', (e) => errors.push(String(e && e.message || e)));
  const params = new URLSearchParams({ headless: '1', quality: 'low', ...(sc.params || {}) });
  if (sc.seed != null) params.set('seed', String(sc.seed));
  if (sc.t != null) params.set('t', String(sc.t));
  if (sc.pos) params.set('pos', sc.pos);
  if (sc.yaw != null) params.set('yaw', String(sc.yaw));
  if (sc.pitch != null) params.set('pitch', String(sc.pitch));
  if (sc.script) params.set('script', sc.script);
  if (sc.speed != null) params.set('speed', String(sc.speed)); else params.set('speed', '0');
  const url = `${baseUrl}/?${params.toString()}`;
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
  await page.waitForFunction(() => window.__sim && window.__sim.ready, null, { timeout: TIMEOUT });
  await page.evaluate(() => window.__sim.ready);
  if (sc.until) {
    const { event, predicate, maxSimS } = typeof sc.until === 'string' ? { event: sc.until } : sc.until;
    await page.evaluate(([event, predSrc, maxSimS]) => {
      const pred = predSrc ? new Function('e', `return (${predSrc})(e)`) : null;
      window.__sim.advanceUntil(event, maxSimS || 48 * 3600, pred);
      if (window.__sim.ctx.pendingScript) window.__sim.ctx.applyScriptUntil?.(window.__sim.state.clock.simTime);
    }, [event, predicate || null, maxSimS || null]);
    if (sc.afterS) await page.evaluate((s) => window.__sim.advance(s), sc.afterS);
    if (sc.postPos || sc.postYaw != null) await page.evaluate(([room, yaw, pitch]) => window.__sim.setPlayer({ room, yaw, pitch }), [sc.postPos || sc.pos, sc.postYaw ?? sc.yaw, sc.postPitch ?? sc.pitch ?? 0]);
  }
  if (sc.runScript) await page.evaluate((id) => window.__sim.run(id), sc.runScript);
  await page.evaluate(async (n) => { await window.__sim.screenshotReady(); window.__sim.frames(n); }, WARM);
  await page.screenshot({ path: outPng, fullPage: false });
  const snap = await page.evaluate(() => ({
    simTime: window.__sim.state.clock.simTime, tRel: window.__sim.state.clock.tRel, clock: window.__sim.formatClock(), phase: window.__sim.state.local.phase,
    local: window.__sim.state.local, cues: window.__sim.state.cues, house: window.__sim.state.house, utilities: window.__sim.state.utilities,
    hood: { ...window.__sim.state.hood, impactQueue: undefined }, alerts: { issued: window.__sim.state.alerts.issued, active: window.__sim.state.alerts.active },
    devices: { phone: { battery: window.__sim.state.devices.phone.battery, unread: window.__sim.state.devices.phone.unread, alertHistory: window.__sim.state.devices.phone.alertHistory.length },
      tv: window.__sim.state.devices.tv, nwr: window.__sim.state.devices.nwr.state, console: { ...window.__sim.state.devices.console, pHistory: undefined } },
    player: window.__sim.state.player, clockState: { tier: window.__sim.state.clock.tier, speed: window.__sim.state.clock.speed, dayIndex: window.__sim.state.clock.dayIndex, isNight: window.__sim.state.clock.isNight },
    stats: window.__sim.stats(), hash: window.__sim.hash(), errors: window.__sim.errors(), eventCounts: window.__sim.events().reduce((a, e) => (a[e.name] = (a[e.name] || 0) + 1, a), {}),
    lastEvents: window.__sim.events().slice(-40).map(e => [e.name, e.simTime]),
  }));
  writeFileSync(outState, JSON.stringify(snap, (k, v) => (v instanceof Float32Array ? Array.from(v) : v), 2));
  return { errors, logs, state: snap, ms: Date.now() - t0, url };
}

async function main() {
  const scenariosPath = join(ROOT, 'scripts', 'scenarios.json');
  const all = JSON.parse(readFileSync(scenariosPath, 'utf8'));
  let scenarios = all.scenarios;
  if (has('list')) { for (const s of scenarios) console.log(`${s.id.padEnd(22)} t=${s.t ?? s.until?.event ?? s.until ?? ''} pos=${s.pos || ''}`); return; }
  const custom = opt('custom', null);
  if (custom) scenarios = [{ id: opt('id', 'custom'), params: Object.fromEntries(new URLSearchParams(custom)) }];
  const only = opt('only', null);
  if (only) { const set = new Set(only.split(',')); scenarios = scenarios.filter(s => set.has(s.id)); }
  const outOpt = opt('out', null);
  let outDir = join(ROOT, 'test', 'screenshots');
  let single = null;
  if (outOpt) { if (outOpt.endsWith('.png')) { single = resolve(outOpt); outDir = dirname(single); } else outDir = resolve(outOpt); }
  mkdirSync(outDir, { recursive: true });

  let baseUrl = opt('url', null), server = null;
  if (!baseUrl) { const s = await startServer(); server = s.server; baseUrl = s.url; }
  const browser = await launchBrowser({ headed: has('headed') });
  const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  let failed = 0;
  const summary = [];
  for (const sc of scenarios) {
    const png = single || join(outDir, `${sc.id}.png`);
    const st = png.replace(/\.png$/, '.state.json');
    try {
      const r = await runScenario(page, baseUrl, sc, png, st);
      const errs = [...r.errors, ...r.state.errors.map(e => `${e.module}.${e.fn}: ${e.message}`)];
      const line = `${errs.length ? 'ERR ' : 'ok  '} ${sc.id.padEnd(22)} ${r.state.clock} tRel=${r.state.tRel.toFixed(2)} ${r.state.phase.padEnd(12)} u1m=${r.state.local.u1m.toFixed(1)} calls=${r.state.stats.calls ?? '?'} ${r.ms} ms → ${png}`;
      console.log(line); summary.push(line);
      for (const e of errs.slice(0, 8)) console.log(`      ${e}`);
      for (const l of r.logs.filter(l => l.startsWith('[error]')).slice(0, 6)) console.log(`      ${l}`);
      if (errs.length) failed++;
    } catch (err) {
      failed++; console.log(`FAIL ${sc.id}: ${err.message}`);
    }
  }
  await browser.close();
  if (server && !has('keep-server')) await server.close();
  console.log(`\n${scenarios.length - failed}/${scenarios.length} scenarios clean`);
  process.exit(failed && !has('no-fail') ? 1 : 0);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(err => { console.error(err); process.exit(2); });
