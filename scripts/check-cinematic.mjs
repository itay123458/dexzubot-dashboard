import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

// Run npm run build first. Every request is intercepted; this check never
// authenticates or sends a request to Discord, the Pi, or a live API.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(process.env.DASHBOARD_PAGES_DIST || fileURLToPath(new URL('../dist/', import.meta.url)));
const output = path.resolve(process.env.DASHBOARD_QA_OUTPUT || '.superpowers/cinematic-qa');
const site = 'https://itay123458.github.io/dexzubot-dashboard/';
const backend = 'https://ik.tailce7102.ts.net/dashboard/';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true });
const failures = [];
let passed = 0;

async function setup({ width = 1440, height = 1000, reducedMotion = 'no-preference', webgl = true, delayCore = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion, serviceWorkers: 'block' });
  const calls = [], errors = [], routeErrors = [], logins = [];
  let releaseCore, coreRequested;
  const coreGate = new Promise(resolve => { releaseCore = resolve; });
  const coreRequest = new Promise(resolve => { coreRequested = resolve; });
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    // The keyboard login test ends at an inert HTML fixture. No OAuth or API
    // traffic ever leaves the browser, including unexpected third-party URLs.
    if (url.origin === new URL(backend).origin && url.pathname === '/dashboard/auth/login') {
      logins.push(url.href);
      return route.fulfill({ contentType: 'text/html', body: '<p>Mock Discord sign-in</p>' });
    }
    if (url.origin !== new URL(site).origin || !url.pathname.startsWith(new URL(site).pathname)) {
      calls.push(url.origin + url.pathname);
      return route.abort('blockedbyclient');
    }
    const relative = decodeURIComponent(url.pathname.slice(new URL(site).pathname.length)) || 'index.html';
    if (relative === 'command-core.js' && delayCore) {
      coreRequested();
      await coreGate;
    }
    if (/^(api|auth)\//.test(relative)) {
      calls.push(relative);
      return route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"QA blocks all APIs"}' });
    }
    const asset = path.resolve(root, relative);
    if (!asset.startsWith(root + path.sep)) {
      routeErrors.push('Unsafe asset path: ' + relative);
      return route.abort();
    }
    try {
      return await route.fulfill({ contentType: mime[path.extname(asset)] || 'application/octet-stream', body: await readFile(asset) });
    } catch (error) {
      routeErrors.push(relative + ': ' + error.message);
      return route.fulfill({ status: 404, body: 'Missing fixture asset' });
    }
  });
  if (!webgl) await context.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return /^(webgl2?|experimental-webgl)$/i.test(type) ? null : getContext.call(this, type, ...args);
    };
  });
  const page = await context.newPage();
  page.setDefaultTimeout(6000);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(site, { waitUntil: delayCore ? 'domcontentloaded' : 'networkidle' });
  return { context, page, calls, errors, routeErrors, logins, coreRequest, releaseCore };
}

async function settle(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.waitForTimeout(200);
}

async function noOverflow(page, label) {
  const sizes = await page.evaluate(() => ({ width: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  assert.ok(sizes.document <= sizes.width + 1 && sizes.body <= sizes.width + 1, label + ': horizontal overflow ' + JSON.stringify(sizes));
}

async function publicGate(fixture) {
  const { page } = fixture;
  await page.locator('.command-story').waitFor({ state: 'visible' });
  await page.waitForTimeout(1000); // Capture the settled first-visit entrance, never a faded intermediate frame.
  assert.equal(await page.locator('#pages-signin').count(), 1, 'single existing sign-in gate');
  assert.equal(await page.locator('#pages-signin-button').count(), 1, 'single existing OAuth button');
  assert.equal(await page.locator('#pages-signin-button').getAttribute('type'), 'button');
  assert.equal(await page.locator('#pages-signin-status').getAttribute('role'), 'status');
  assert.equal(await page.locator('#pages-signin-status').getAttribute('aria-live'), 'polite');
  assert.equal(await page.locator('.app-shell').isVisible(), false, 'signed-out dashboard stays hidden');
  assert.equal(await page.evaluate(() => localStorage.getItem('dexzu.pages.session.v1')), null, 'no session seeded');
  assert.equal(await page.locator('.story-hero').isVisible(), true);
}

async function checkFixture(fixture) {
  assert.deepEqual(fixture.calls, [], 'public story must never request private APIs or third-party resources');
  assert.deepEqual(fixture.routeErrors, [], 'all built assets must resolve');
  assert.deepEqual(fixture.errors, [], 'no uncaught browser errors');
}

async function test(name, options, run) {
  let fixture;
  try {
    fixture = await setup(options);
    await publicGate(fixture);
    await run(fixture);
    await checkFixture(fixture);
    passed++;
    console.log('PASS: ' + name);
  } catch (error) {
    failures.push(name + ': ' + error.message);
    console.error('FAIL: ' + name + ': ' + error.message);
    if (fixture) await fixture.page.screenshot({ path: path.join(output, name + '-failure.png'), fullPage: true }).catch(() => {});
  } finally {
    await fixture?.context.close();
  }
}

async function stackedDemos(page, label) {
  const panels = page.locator('.story-demo');
  assert.equal(await panels.count(), 3, 'three feature samples');
  const boxes = [];
  for (let index = 0; index < 3; index++) {
    const panel = panels.nth(index);
    assert.ok((await panel.innerText()).trim().length > 30, 'sample has meaningful content');
    await panel.scrollIntoViewIfNeeded();
    await settle(page);
    assert.equal(await panel.isVisible(), true, label + ': sample visible');
    const state = await panel.evaluate(element => {
      const style = getComputedStyle(element), rect = element.getBoundingClientRect();
      return { top: rect.top + scrollY, bottom: rect.bottom + scrollY, opacity: Number(style.opacity), hidden: element.getAttribute('aria-hidden') };
    });
    assert.ok(state.opacity > 0.9, label + ': every sample is fully shown');
    assert.notEqual(state.hidden, 'true', label + ': sample is accessible');
    boxes.push(state);
    await noOverflow(page, label + ' sample ' + index);
  }
  assert.ok(boxes[1].top >= boxes[0].bottom - 1 && boxes[2].top >= boxes[1].bottom - 1, label + ': samples stack without overlap');
  assert.notEqual(await page.locator('.feature-stage').evaluate(element => getComputedStyle(element).position), 'sticky', label + ': no pinned feature stage');
}

async function expectCoreState(page, ready, label) {
  const host = page.locator('.command-story .command-core');
  await host.scrollIntoViewIfNeeded();
  if (ready) {
    await page.waitForFunction(() => document.querySelector('.command-story .command-core')?.dataset.coreReady === 'true');
    assert.equal(await host.locator('canvas').count(), 1, label + ': exactly one canvas per host');
    assert.equal(await host.locator('canvas').getAttribute('aria-hidden'), 'true', 'decorative WebGL stays out of the accessibility tree');
  } else {
    await page.waitForFunction(() => !document.querySelector('.command-story .command-core canvas'));
    assert.equal(await host.locator('canvas').count(), 0, label + ': canvases removed');
    assert.equal(await host.getAttribute('data-core-ready'), null, label + ': ready marker cleared');
    await host.locator('.core-fallback').waitFor({ state: 'visible' });
  }
}

async function supportsWebGL(page) {
  return page.evaluate(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  });
}

async function preferStatic(page, label) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await settle(page);
  await expectCoreState(page, false, label);
  await stackedDemos(page, label);
}

try {
  await test('desktop', {}, async ({ page }) => {
    await noOverflow(page, 'desktop hero');
    await page.screenshot({ path: path.join(output, 'cinematic-desktop.png') });
    const anchor = page.locator('a[href="#story-features"]').first();
    assert.equal(await anchor.count(), 1, 'native feature anchor exists');
    await anchor.focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => location.hash === '#story-features');
    await settle(page);
    assert.ok(await page.locator('#story-features').evaluate(element => Math.abs(element.getBoundingClientRect().top) < innerHeight), 'anchor reaches features');
    assert.equal(await page.locator('.feature-stage').evaluate(element => getComputedStyle(element).position), 'sticky', 'desktop feature stage pins briefly');
    assert.ok(await page.locator('#story-features').evaluate(element => element.getBoundingClientRect().height <= innerHeight * 4), 'feature pin is bounded to four viewports');
    const demos = page.locator('.story-demo');
    assert.equal(await demos.count(), 3);
    const buttons = page.locator('.story-step-button');
    assert.equal(await buttons.count(), 3);
    for (let index = 0; index < 3; index++) {
      const button = buttons.nth(index);
      await button.focus();
      await page.keyboard.press('Enter');
      await settle(page);
      assert.equal(await button.getAttribute('aria-pressed'), 'true', 'keyboard selects sample ' + index);
      assert.equal(await demos.nth(index).getAttribute('aria-hidden'), 'false', 'selected sample accessible');
      assert.ok((await demos.nth(index).innerText()).trim().length > 30);
      assert.equal(await demos.nth(index).isVisible(), true);
      await noOverflow(page, 'desktop sample ' + index);
    }
    // Scroll both ways to catch one-way reveal timelines or a captured wheel.
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await settle(page);
    const start = await page.locator('.command-story').getAttribute('data-progress');
    await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    await settle(page);
    const end = await page.locator('.command-story').getAttribute('data-progress');
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await settle(page);
    const returned = await page.locator('.command-story').getAttribute('data-progress');
    assert.ok(start !== null && end !== null && returned !== null, 'story exposes scroll progress');
    assert.ok(Number(end) > Number(start) + 0.5, 'scroll advances story');
    assert.ok(Math.abs(Number(returned) - Number(start)) < 0.05, 'reverse scroll restores story');
    await noOverflow(page, 'desktop return');
  });

  for (const width of [320, 390, 760]) await test('mobile-' + width, { width, height: 844 }, async ({ page }) => {
    await noOverflow(page, 'mobile hero');
    await page.screenshot({ path: path.join(output, 'cinematic-mobile-' + width + '.png') });
    await stackedDemos(page, 'mobile ' + width);
    await page.locator('#pages-signin-button').scrollIntoViewIfNeeded();
    await noOverflow(page, 'mobile connect');
    await page.screenshot({ path: path.join(output, 'cinematic-mobile-' + width + '-connect.png') });
  });

  await test('desktop-1024', { width: 1024, height: 900 }, async ({ page }) => {
    for (const selector of ['.story-hero', '#story-features', '#story-connect']) {
      await page.locator(selector).scrollIntoViewIfNeeded();
      await settle(page);
      await noOverflow(page, '1024px ' + selector);
    }
    await page.screenshot({ path: path.join(output, 'cinematic-desktop-1024.png') });
  });

  await test('short-viewport', { width: 1024, height: 600 }, async ({ page }) => {
    await noOverflow(page, 'short hero');
    await stackedDemos(page, 'short viewport');
    await page.locator('#pages-signin-button').scrollIntoViewIfNeeded();
    await noOverflow(page, 'short connect');
    await page.screenshot({ path: path.join(output, 'cinematic-short-viewport.png') });
  });

  await test('reduced-motion', { reducedMotion: 'reduce' }, async ({ page }) => {
    await page.locator('.command-story .core-fallback').waitFor({ state: 'visible' });
    assert.equal(await page.locator('.command-core canvas').count(), 0, 'reduced motion does not initialize WebGL');
    await stackedDemos(page, 'reduced motion');
    await page.screenshot({ path: path.join(output, 'cinematic-reduced-motion.png'), fullPage: true });
  });

  await test('webgl-disabled', { webgl: false }, async ({ page }) => {
    await page.locator('.command-story .command-core').scrollIntoViewIfNeeded();
    await page.locator('.command-story .core-fallback').waitFor({ state: 'visible' });
    const visible = await page.locator('.command-story .core-fallback').evaluate(element => Number(getComputedStyle(element).opacity) > 0.9);
    assert.equal(visible, true, 'fallback remains visible without a WebGL context');
    await noOverflow(page, 'WebGL fallback');
    await page.screenshot({ path: path.join(output, 'cinematic-webgl-fallback.png') });
  });

  await test('runtime-motion-preference', {}, async ({ page }) => {
    const webglAvailable = await supportsWebGL(page);
    if (webglAvailable) await expectCoreState(page, true, 'initial enhancement');
    await preferStatic(page, 'runtime reduced motion');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await settle(page);
    await page.locator('.command-story .command-core').scrollIntoViewIfNeeded();
    if (webglAvailable) await expectCoreState(page, true, 're-enabled enhancement');
    else console.log('INFO: WebGL unavailable; runtime preference checks cover static fallback.');
    await page.locator('#story-features').scrollIntoViewIfNeeded();
    await settle(page);
    assert.equal(await page.locator('.story-demo[aria-hidden="false"]').count(), 1, 'animated layout restores a single accessible active demo');
    assert.equal(await page.locator('.story-demo[aria-hidden="true"]').count(), 2, 'inactive animated demos leave accessibility tree');
    await noOverflow(page, 'runtime motion restored');
    await preferStatic(page, 'second runtime reduced motion');
  });

  await test('pending-core-preference-race', { delayCore: true }, async ({ page, coreRequest, releaseCore }) => {
    const host = page.locator('.command-story .command-core');
    await host.scrollIntoViewIfNeeded();
    await Promise.race([coreRequest, new Promise((_, reject) => setTimeout(() => reject(Error('Lazy WebGL module was not requested')), 6000))]);
    assert.equal(await page.evaluate(() => document.readyState !== 'loading'), true, 'module stays pending after DOMContentLoaded');
    assert.equal(await host.locator('canvas').count(), 0, 'no canvas before module response');
    await preferStatic(page, 'preference changed during pending import');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await host.scrollIntoViewIfNeeded();
    await settle(page); // Give the new observer time to await the same import.
    const webglAvailable = await supportsWebGL(page);
    releaseCore();
    await page.waitForLoadState('networkidle');
    await settle(page);
    if (webglAvailable) await expectCoreState(page, true, 'pending import resolved after preference round trip');
    else {
      assert.equal(await host.locator('canvas').count(), 0);
      await host.locator('.core-fallback').waitFor({ state: 'visible' });
      console.log('INFO: WebGL unavailable; pending import checks cover static fallback.');
    }
    await preferStatic(page, 'pending import cleanup');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await host.scrollIntoViewIfNeeded();
    if (webglAvailable) await expectCoreState(page, true, 'mount before pagehide');
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
    await expectCoreState(page, false, 'pagehide cleanup');
    // The auth transport reloads real bfcache restores. Use a regular lifecycle
    // event here to isolate the cinematic module's disposal and remounting.
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow')));
    await settle(page);
    if (webglAvailable) await expectCoreState(page, true, 'pageshow resumes with a single canvas');
    await noOverflow(page, 'pending import race');
  });

  await test('keyboard-oauth', { reducedMotion: 'reduce' }, async ({ page, logins }) => {
    const button = page.locator('#pages-signin-button');
    await button.scrollIntoViewIfNeeded();
    await button.focus();
    assert.equal(await button.evaluate(element => element === document.activeElement), true);
    await page.keyboard.press('Enter');
    await page.waitForURL(backend + 'auth/login?**');
    assert.equal(logins.length, 1, 'one existing OAuth handoff');
    const url = new URL(logins[0]);
    assert.equal(url.searchParams.get('pages'), '1');
    // Return to the public origin to read its sessionStorage. The backend
    // fixture cannot see the public origin's verifier or a user session.
    await page.goto(site, { waitUntil: 'networkidle' });
    const saved = await page.evaluate(() => sessionStorage.getItem('dexzu.pages.verifier.v1'));
    assert.match(saved || '', /^[A-Za-z0-9_-]{43}$/);
    assert.equal(url.searchParams.get('challenge'), createHash('sha256').update(saved).digest('base64url'), 'existing verifier challenge preserved');
    assert.equal(await page.evaluate(() => localStorage.getItem('dexzu.pages.session.v1')), null);
  });
} finally {
  await browser.close();
}

assert.deepEqual(failures, [], failures.join('\n'));
console.log(`PASS: ${passed} cinematic checks; all traffic mocked, no authenticated session or live APIs. Screenshots: ${output}`);
