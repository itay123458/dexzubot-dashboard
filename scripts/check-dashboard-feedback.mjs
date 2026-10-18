import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The only network destination is the synthetic fixture on loopback. Browser
// assets and writes are fulfilled here; no request can reach Discord or the Pi.
const fixtureOrigin = 'http://127.0.0.1:13301';
const origin = 'http://dashboard.test';
const root = fileURLToPath(new URL('../public/', import.meta.url));
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const response = await fetch(`${fixtureOrigin}/dashboard/api/state`);
assert.equal(response.status, 200, 'start the local synthetic dashboard fixture on port 13301');
const seed = await response.json();
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true });
let passed = 0;

async function setup(reducedMotion) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion, serviceWorkers: 'block' });
  const current = structuredClone(seed);
  current.workspace = { ...current.workspace, key: 'main', guildId: current.server.id, serverUpdateEnabled: true };
  current.server.members = 125;
  const errors = [], unexpected = [], writes = [];
  let failState = true, writeResponse;
  let stateReads = 0;
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== origin) {
      if (request.method() !== 'GET' || !['image', 'font', 'stylesheet'].includes(request.resourceType())) unexpected.push(request.method() + ' ' + url.origin + url.pathname);
      return route.fulfill({ status: 204, body: '' });
    }
    const json = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    if (url.pathname === '/dashboard/auth/session') return json({ public: false, owner: false });
    if (url.pathname.startsWith('/dashboard/auth/')) {
      unexpected.push('Unexpected auth request: ' + url.pathname);
      return json({ error: 'No authentication is performed by this check.' }, 403);
    }
    if (url.pathname.startsWith('/dashboard/api/')) {
      const endpoint = url.pathname.slice('/dashboard/api/'.length);
      if (request.method() !== 'GET') {
        writes.push({ endpoint, body: request.postDataJSON() });
        if (endpoint !== 'youtube' || !writeResponse) return json({ error: 'Unexpected test write' }, 400);
        const result = await writeResponse;
        return json(result.status === 200 ? { ok: true, alert: current.youtube } : { error: 'Synthetic save failed' }, result.status);
      }
      if (endpoint === 'guilds') return json({ guilds: [{ id: current.server.id, name: 'Synthetic QA Server', workspace: 'main', serverUpdateEnabled: true, multiServerEnabled: true }] });
      if (endpoint === 'state') {
        stateReads++;
        return json(failState ? { error: 'Synthetic first-load failure' } : current, failState ? 500 : 200);
      }
      // Feature panels use their existing local fixture responses unchanged.
      const local = await fetch(fixtureOrigin + url.pathname + url.search);
      return route.fulfill({ status: local.status, contentType: 'application/json', body: await local.text() });
    }
    if (request.method() !== 'GET') {
      unexpected.push('Non-API write: ' + request.method() + ' ' + url.pathname);
      return route.abort();
    }
    const relative = decodeURIComponent(url.pathname.replace(/^\/dashboard\//, '')) || 'index.html';
    const asset = path.resolve(root, relative);
    if (!asset.startsWith(path.resolve(root) + path.sep)) return route.abort();
    try {
      return await route.fulfill({ contentType: mime[path.extname(asset)] || 'application/octet-stream', body: await readFile(asset) });
    } catch (error) {
      unexpected.push('Missing fixture asset: ' + relative);
      return route.fulfill({ status: 404, body: 'Missing test asset' });
    }
  });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin + '/dashboard/', { waitUntil: 'networkidle' });
  return {
    context, page, current, errors, unexpected, writes,
    allowState() { failState = false; },
    get stateReads() { return stateReads; },
    holdWrite() {
      let finish;
      writeResponse = new Promise(resolve => { finish = resolve; });
      return status => finish({ status });
    },
  };
}

async function check(name, run) {
  await run();
  passed++;
  console.log('PASS: ' + name);
}

try {
  for (const reducedMotion of ['no-preference', 'reduce']) {
    const f = await setup(reducedMotion), { page } = f;
    const mode = reducedMotion === 'reduce' ? 'reduced motion' : 'normal motion';
    try {
      await check(`${mode}: failed initial load provides an accessible retry`, async () => {
        const alert = page.locator('#dashboard-load-error');
        await alert.waitFor({ state: 'visible' });
        assert.equal(await alert.getAttribute('role'), 'alert');
        assert.match(await alert.innerText(), /Synthetic first-load failure/);
        assert.equal(await alert.getByRole('button', { name: 'Try again' }).isEnabled(), true);
        assert.equal(await page.locator('#dashboard-main').getAttribute('aria-busy'), 'false');
        assert.equal(await page.locator('#metrics').getAttribute('aria-busy'), 'false');
        assert.equal(await page.locator('#dashboard-loading-status').isVisible(), false);
        assert.equal(await page.locator('#metrics .skeleton:visible').count(), 0, 'failure cannot leave perpetual skeletons');
      });

      await check(`${mode}: retry renders real metrics and removes the failure`, async () => {
        f.allowState();
        await page.locator('#dashboard-load-error').getByRole('button', { name: 'Try again' }).click();
        await page.waitForFunction(() => document.body.dataset.dashboardReady === 'true');
        await page.waitForFunction(() => document.querySelector('#metrics strong')?.textContent === '125');
        assert.equal(await page.locator('#dashboard-load-error').count(), 0);
        assert.equal(await page.locator('#metrics .metric').count(), 8);
        assert.equal(await page.locator('#metrics .skeleton').count(), 0);
        assert.equal(await page.locator('#dashboard-main').getAttribute('aria-busy'), 'false');
        assert.equal(await page.locator('#metrics').getAttribute('aria-busy'), 'false');
        assert.equal(await page.locator('#dashboard-main').evaluate(element => element === document.activeElement), true);
        assert.equal(f.stateReads, 2, 'one failed read followed by the explicit retry');
      });

      await check(`${mode}: changed metrics update without replaying count or entrance`, async () => {
        await page.evaluate(() => {
          window.__feedbackCountCalls = 0;
          window.__feedbackMetricNodes = [...document.querySelectorAll('#metrics .metric')];
          const motion = window.DexzuMotion;
          window.DexzuMotion = { ...motion, count(...args) { window.__feedbackCountCalls++; return motion.count(...args); } };
          window.__feedbackEntrances = [];
          new MutationObserver(records => {
            for (const record of records) {
              if (!record.oldValue?.includes('motion-enter') && record.target.classList.contains('motion-enter')) window.__feedbackEntrances.push(record.target.className);
            }
          }).observe(document.getElementById('metrics'), { attributes: true, attributeFilter: ['class'], attributeOldValue: true, subtree: true });
        });
        f.current.server.members = 246;
        await page.locator('#refresh-dashboard').click();
        await page.waitForFunction(() => document.querySelector('#metrics strong')?.textContent === '246');
        assert.deepEqual(await page.evaluate(() => ({ calls: window.__feedbackCountCalls, entrances: window.__feedbackEntrances, same: window.__feedbackMetricNodes.every((node, index) => node === document.querySelectorAll('#metrics .metric')[index]) })), { calls: 0, entrances: [], same: true });
      });

      await page.locator('[data-page="youtube"]').click();
      const button = page.locator('#save-youtube');
      const original = await button.evaluate(element => {
        window.__feedbackSaveIcon = element.querySelector('span');
        element.setAttribute('aria-label', 'Save alert configuration');
        return { html: element.innerHTML, text: element.textContent, aria: element.getAttribute('aria-label') };
      });
      await check(`${mode}: pending save retains its icon and confirms only on success`, async () => {
        await page.locator('#youtube-source').fill('https://www.youtube.com/@synthetic-saved');
        const finish = f.holdWrite();
        await button.click();
        await page.waitForFunction(() => document.getElementById('save-youtube').classList.contains('saving-feedback'));
        assert.match(await button.textContent(), /Saving\.\.\./);
        assert.equal(await button.isEnabled(), false);
        assert.equal(await button.getAttribute('aria-busy'), 'true');
        assert.equal(await button.evaluate(element => element.classList.contains('saved-feedback')), false);
        assert.equal(await button.evaluate(element => element.querySelector('span') === window.__feedbackSaveIcon), true);
        assert.equal(await page.locator('.youtube-config').evaluate(element => element.classList.contains('dirty')), true);
        finish(200);
        await page.waitForFunction(() => document.getElementById('save-youtube').classList.contains('saved-feedback'));
        assert.match(await button.textContent(), /Saved/);
        await page.waitForFunction(() => !document.querySelector('.youtube-config').classList.contains('dirty'));
        await page.waitForFunction(() => !document.getElementById('save-youtube').classList.contains('saved-feedback'));
        assert.equal(await button.innerHTML(), original.html);
        assert.equal(await button.getAttribute('aria-label'), original.aria);
        assert.equal(await button.getAttribute('aria-busy'), null);
        assert.equal(await button.isEnabled(), true);
        assert.equal(await button.evaluate(element => element.querySelector('span') === window.__feedbackSaveIcon), true);
      });

      await check(`${mode}: rejected save restores its label and keeps the draft dirty`, async () => {
        const draft = 'https://www.youtube.com/@synthetic-unsaved';
        await page.locator('#youtube-source').fill(draft);
        const finish = f.holdWrite();
        await button.click();
        await page.waitForFunction(() => document.getElementById('save-youtube').classList.contains('saving-feedback'));
        finish(500);
        await page.waitForFunction(() => !document.getElementById('save-youtube').disabled);
        assert.equal(await button.innerHTML(), original.html);
        assert.equal(await button.getAttribute('aria-label'), original.aria);
        assert.equal(await button.getAttribute('aria-busy'), null);
        assert.equal(await button.evaluate(element => element.classList.contains('saved-feedback')), false);
        assert.equal(await button.evaluate(element => element.querySelector('span') === window.__feedbackSaveIcon), true);
        assert.equal(await page.locator('#youtube-source').inputValue(), draft);
        assert.equal(await page.locator('.youtube-config').evaluate(element => element.classList.contains('dirty')), true);
        assert.equal(f.writes.length, 2);
      });
      assert.deepEqual(f.errors, [], 'no uncaught browser errors');
      assert.deepEqual(f.unexpected, [], 'all requests are expected fixture reads, mocked writes, or public assets');
    } finally {
      await f.context.close();
    }
  }
} finally {
  await browser.close();
}
console.log(`PASS: ${passed} dashboard feedback checks; browser requests mocked and fixture reads restricted to loopback.`);
