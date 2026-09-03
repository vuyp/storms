#!/usr/bin/env node
// dev/shot.mjs — screenshot the world viewer: node dev/shot.mjs <baseUrl> <outDir> "name|query" ["name|query" …]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const [base = 'http://127.0.0.1:5200', out = 'shots/world', ...views] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: true,
  args: ['--headless=new', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning' || m.text().startsWith('[world]')) console.log('[page]', m.text().slice(0, 600)); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
const first = views[0] || 'default|pos=26,6,22';
await page.goto(`${base}/dev/world.html?${first.split('|')[1] || ''}`, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.__worldReady === true || window.__worldError, null, { timeout: 300000 });
if (await page.evaluate(() => window.__worldError)) { console.log('BUILD ERROR', await page.evaluate(() => window.__worldError)); await browser.close(); process.exit(1); }
for (const v of views.length ? views : [first]) {
  const [name, query = ''] = v.split('|');
  await page.evaluate((qs) => window.__world.view(Object.fromEntries(new URLSearchParams(qs))), query);
  await page.waitForFunction(() => window.__world.ready(), null, { timeout: 60000 });
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log(name, JSON.stringify(await page.evaluate(() => { const s = window.__world.stats(); return { calls: s.calls, tris: s.triangles, programs: s.programs }; })));
}
await browser.close();
